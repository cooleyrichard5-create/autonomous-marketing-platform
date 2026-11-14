# MarketPilot — Knowledge Ingestion Upgrade

This package adds a URL/file knowledge importer and retrieval-augmented chat to the starter MarketPilot bot.

## What it does

- Imports readable public webpages from a URL.
- Extracts text from PDF, DOCX, TXT and Markdown uploads.
- Categorizes each source.
- Splits extracted content into overlapping sections.
- Creates embeddings with OpenAI `text-embedding-3-small`.
- Stores documents and searchable sections in Supabase with per-user row-level security.
- Retrieves relevant sections for each chat question.
- Shows saved sources in a Knowledge Library UI.
- Allows a user to delete an imported source and its chunks.

## What it does not do

- It does not automatically crawl an entire course website or bypass logins/paywalls.
- It does not reliably extract video/audio content or JavaScript-only pages.
- Scanned PDFs need OCR before import.
- It does not fine-tune the model; it retrieves relevant source passages at answer time.
- It does not connect to or make changes in Meta Ads, Google Ads, WordPress or Google Business Profile.
- It has not been deployed or end-to-end tested in your hosting environment.

## Setup

1. Install the dependencies with `npm install`.
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Copy `.env.example` to `.env` and fill in:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `APP_ORIGIN` (your dashboard origin)
5. Start the API with `npm start`.
6. Mount `src/KnowledgeLibrary.jsx` in the signed-in dashboard and pass the Supabase access token:
   ```jsx
   <KnowledgeLibrary apiBase="https://YOUR-API-HOST" accessToken={session.access_token} />
   ```
7. Mount `src/MarketPilotChat.jsx` and pass the same access token plus the current business profile:
   ```jsx
   <MarketPilotChat apiBase="https://YOUR-API-HOST" accessToken={session.access_token} business={businessProfile} />
   ```

## API endpoints

- `GET /api/marketpilot/health`
- `POST /api/marketpilot/knowledge/url` — JSON `{ "url": "...", "category": "SEO" }`
- `POST /api/marketpilot/knowledge/file` — multipart fields `file` and `category`
- `GET /api/marketpilot/knowledge`
- `DELETE /api/marketpilot/knowledge/:id`
- `POST /api/marketpilot/chat` — JSON `{ "message": "...", "business": {}, "history": [] }`

All knowledge and chat endpoints require `Authorization: Bearer <Supabase access token>`.

## Import limitations and safety

- URL import accepts public HTTP/HTTPS pages only, rejects local/private hostnames and follows at most four redirects.
- It reads static HTML/text; pages requiring a login, subscription, browser rendering or interactive session may fail.
- Maximum webpage size is 5 MB. Upload size defaults to 20 MB and can be changed with `MAX_UPLOAD_MB`.
- Only import material you have permission to use. Respect course terms, copyrights and website terms.
- Do not put Supabase service-role keys in the browser. This starter uses the anon key plus user JWT and database RLS.
- For production, add request rate limits, background jobs/queues, malware scanning, stronger SSRF/network egress controls, audit logging, retention controls, monitoring and automated tests.
- The backend must be hosted on a server that supports Node.js, outbound HTTPS and DNS resolution.

## Recommended next steps

1. Test importing one short public article and one small PDF.
2. Ask MarketPilot questions whose answers are in those sources and verify the citations.
3. Add deduplication, bulk URL import, source freshness checks and admin-curated shared knowledge.
4. Only after retrieval is reliable, begin read-only platform integrations.
