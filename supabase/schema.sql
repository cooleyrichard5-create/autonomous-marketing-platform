-- Run in the Supabase SQL Editor.
create extension if not exists vector;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('url','file')),
  source_url text,
  category text not null default 'Uncategorized',
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  character_count integer not null default 0,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_documents_user_created_idx
  on public.knowledge_documents(user_id, created_at desc);
create index if not exists knowledge_chunks_user_idx
  on public.knowledge_chunks(user_id);
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "Users manage their own knowledge documents" on public.knowledge_documents;
create policy "Users manage their own knowledge documents"
  on public.knowledge_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own knowledge chunks" on public.knowledge_chunks;
create policy "Users manage their own knowledge chunks"
  on public.knowledge_chunks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.match_marketpilot_knowledge(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 7,
  filter_category text default null
)
returns table (
  id bigint,
  document_id uuid,
  title text,
  source_url text,
  category text,
  content text,
  similarity float
)
language sql stable
security invoker
set search_path = public
as $$
  select
    kc.id,
    kd.id as document_id,
    kd.title,
    kd.source_url,
    kd.category,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kc.user_id = match_user_id
    and kd.user_id = match_user_id
    and kd.status = 'ready'
    and (filter_category is null or kd.category = filter_category)
  order by kc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

grant execute on function public.match_marketpilot_knowledge(vector, uuid, int, text) to authenticated;
