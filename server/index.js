import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import ipaddr from "ipaddr.js";
import dns from "node:dns/promises";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const app = express();
app.use(cors({
  origin: process.env.APP_ORIGIN ? process.env.APP_ORIGIN.split(",").map(s => s.trim()) : true,
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
  }) : null;
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) : null;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";
const MAX_UPLOAD = (Number(process.env.MAX_UPLOAD_MB) || 20) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|docx|txt|md)$/i.test(file.originalname);
    cb(allowed ? null : new Error("Only PDF, DOCX, TXT and Markdown files are supported."), allowed);
  }
});

async function authenticate(req, res, next) {
  if (!supabase) {
    req.user = { id: "local-user", email: "local@marketpilot" };
    return next();
  }
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Sign in is required." });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Your session is invalid or expired." });
    req.user = data.user;
    next();
  } catch {
    res.status(401).json({ error: "Authentication failed." });
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitIntoChunks(text, maxChars = 6500, overlap = 650) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf("\n", end);
      if (boundary > start + maxChars * 0.55) end = boundary;
      else {
        const space = text.lastIndexOf(" ", end);
        if (space > start + maxChars * 0.55) end = space;
      }
    }
    const piece = text.slice(start, end).trim();
    if (piece.length > 80) chunks.push(piece);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function isPublicAddress(address) {
  try {
    const parsed = ipaddr.parse(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

async function assertPublicUrl(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public HTTP and HTTPS webpages can be imported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not accepted.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Private or local network addresses cannot be imported.");
  }
  if (ipaddr.isValid(host)) {
    if (!isPublicAddress(host)) throw new Error("Private network addresses cannot be imported.");
  } else {
    const records = await dns.lookup(host, { all: true });
    if (!records.length || records.some(record => !isPublicAddress(record.address))) {
      throw new Error("This hostname does not resolve exclusively to public IP addresses.");
    }
  }
  return url;
}

async function fetchPublicPage(rawUrl) {
  let current = rawUrl;
  for (let redirects = 0; redirects <= 4; redirects++) {
    const url = await assertPublicUrl(current);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "MarketPilotKnowledgeBot/1.0", "Accept": "text/html,application/xhtml+xml,text/plain" }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The page redirected without a destination.");
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) throw new Error(`The page returned HTTP ${response.status}.`);
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("text/plain") && !type.includes("application/xhtml")) {
      throw new Error("This link does not point to a readable webpage. Upload the document instead.");
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 5 * 1024 * 1024) throw new Error("The webpage is larger than the 5 MB import limit.");
    const body = await response.text();
    if (body.length > 5 * 1024 * 1024) throw new Error("The webpage is larger than the 5 MB import limit.");
    if (type.includes("text/plain")) return { text: cleanText(body), title: url.hostname, finalUrl: url.toString() };
    const $ = cheerio.load(body);
    const title = $("title").first().text().trim() || url.hostname;
    $("script,style,noscript,svg,nav,footer,header,form,iframe,aside").remove();
    let text = cleanText($("main").text() || $("article").text() || $("body").text());
    if (text.length < 300) {
      const dom = new JSDOM(body, { url: url.toString() });
      const article = new Readability(dom.window.document).parse();
      if (article?.textContent) text = cleanText(article.textContent);
      dom.window.close();
    }
    if (text.length < 150) throw new Error("Not enough readable text was found. The page may require a login or JavaScript rendering.");
    return { text, title, finalUrl: url.toString() };
  }
  throw new Error("The page redirected too many times.");
}

async function extractUpload(file) {
  const name = file.originalname || "uploaded-file";
  const ext = name.split(".").pop().toLowerCase();
  let text = "";
  if (ext === "pdf") {
    const parsed = await pdf(file.buffer);
    text = parsed.text;
  } else if (ext === "docx") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    text = parsed.value;
  } else {
    text = file.buffer.toString("utf8");
  }
  text = cleanText(text);
  if (text.length < 100) throw new Error("Not enough readable text was extracted from this file. Scanned PDFs may need OCR first.");
  return { title: name.replace(/\.[^.]+$/, ""), text };
}

async function createEmbedding(input) {
  const result = await openai.embeddings.create({ model: EMBEDDING_MODEL, input });
  return result.data[0].embedding;
}

async function saveKnowledge({ userId, title, sourceType, sourceUrl, category, text }) {
  const chunks = splitIntoChunks(text);
  if (!chunks.length) throw new Error("No usable text was found.");
  const { data: doc, error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      user_id: userId,
      title: title.slice(0, 300),
      source_type: sourceType,
      source_url: sourceUrl || null,
      category: category || "Uncategorized",
      status: "processing",
      character_count: text.length,
      chunk_count: chunks.length
    })
    .select("id")
    .single();
  if (docError) throw docError;

  try {
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      const embedded = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: batch });
      const rows = batch.map((content, j) => ({
        document_id: doc.id,
        user_id: userId,
        chunk_index: i + j,
        content,
        embedding: embedded.data[j].embedding
      }));
      const { error } = await supabase.from("knowledge_chunks").insert(rows);
      if (error) throw error;
    }
    const { error: updateError } = await supabase
      .from("knowledge_documents")
      .update({ status: "ready" })
      .eq("id", doc.id)
      .eq("user_id", userId);
    if (updateError) throw updateError;
    return { id: doc.id, title, category: category || "Uncategorized", chunks: chunks.length, characters: text.length, status: "ready" };
  } catch (error) {
    await supabase.from("knowledge_documents").update({ status: "failed" }).eq("id", doc.id).eq("user_id", userId);
    throw error;
  }
}

app.get("/api/marketpilot/health", (_req, res) => {
  res.json({ ok: true, service: "MarketPilot", knowledgeIngestion: true, retrieval: true });
});

app.post("/api/marketpilot/knowledge/url", authenticate, async (req, res) => {
  try {
    const { url, category } = req.body || {};
    if (!url || typeof url !== "string" || url.length > 2048) return res.status(400).json({ error: "Provide a valid webpage URL." });
    const page = await fetchPublicPage(url);
    const result = await saveKnowledge({
      userId: req.user.id, title: page.title, sourceType: "url",
      sourceUrl: page.finalUrl, category, text: page.text
    });
    res.status(201).json({ message: "Page extracted, indexed and saved.", document: result });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not import this webpage." });
  }
});

app.post("/api/marketpilot/knowledge/file", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a PDF, DOCX, TXT or Markdown file." });
    const extracted = await extractUpload(req.file);
    const result = await saveKnowledge({
      userId: req.user.id, title: extracted.title, sourceType: "file",
      sourceUrl: null, category: req.body.category, text: extracted.text
    });
    res.status(201).json({ message: "File extracted, indexed and saved.", document: result });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not import this file." });
  }
});

app.get("/api/marketpilot/knowledge", authenticate, async (req, res) => {
  const { data, error } = await supabase.from("knowledge_documents")
    .select("id,title,source_type,source_url,category,status,character_count,chunk_count,created_at")
    .eq("user_id", req.user.id).order("created_at", { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: "Could not load the knowledge library." });
  res.json({ documents: data || [] });
});

app.delete("/api/marketpilot/knowledge/:id", authenticate, async (req, res) => {
  const { error } = await supabase.from("knowledge_documents")
    .delete().eq("id", req.params.id).eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: "Could not delete this source." });
  res.json({ deleted: true });
});

async function retrieveKnowledge(userId, question, category = null) {
  if (!supabase) return [];
  const embedding = await createEmbedding(question);
  const { data, error } = await supabase.rpc("match_marketpilot_knowledge", {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: 7,
    filter_category: category
  });
  if (error) {
    console.error("Knowledge retrieval error:", error.message);
    return [];
  }
  return data || [];
}

app.post("/api/marketpilot/chat", authenticate, async (req, res) => {
  try {
    const { message, business, history = [] } = req.body || {};
    if (!message || typeof message !== "string" || message.length > 12000) {
      return res.status(400).json({ error: "Enter a message under 12,000 characters." });
    }
    const safeHistory = Array.isArray(history) ? history.slice(-10).filter(m =>
      m && ["user", "assistant"].includes(m.role) && typeof m.content === "string"
    ) : [];
    const matches = await retrieveKnowledge(req.user.id, message);
    const references = matches.map((item, i) =>
      `[${i + 1}] ${item.title || "Knowledge source"} | ${item.source_url || "Uploaded file"} | ${item.category || "Uncategorized"}\n${item.content}`
    ).join("\n\n");

    const system = `You are MarketPilot, a rigorous marketing strategy and operations assistant.
Use the business profile and retrieved knowledge when relevant. Do not claim to have accessed live ad accounts, websites, analytics or business profiles unless a connected tool actually supplied that data.
Do not claim to have executed changes. This version is advisory and can ingest knowledge, but it cannot publish ads or edit external platforms.
Distinguish verified facts, assumptions and recommendations. If retrieved sources conflict or appear outdated, say so. Cite retrieved source titles/URLs in concise source notes when they materially support your answer. Never invent source citations.
Prioritize measurable business outcomes: qualified leads, cost per lead, conversion rate, customer acquisition cost, revenue and gross profit. Avoid vanity metrics without context.
Business profile:\n${JSON.stringify(business || {}, null, 2)}
Retrieved knowledge excerpts (may be empty):\n${references || "No matching saved knowledge was retrieved."}`;

    const input = [
      ...safeHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: system },
          ...input
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama returned HTTP ${response.status}: ${detail}`);
    }

    const result = await response.json();
    res.json({
      reply: result.message?.content || "I could not generate a response.",
      sources: matches.map(m => ({ title: m.title, source_url: m.source_url, category: m.category })),
      model: OLLAMA_MODEL
    });
  } catch (error) {
    console.error("MarketPilot chat error:", error);
    res.status(500).json({ error: "MarketPilot could not process that request." });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "File exceeds the upload size limit." : error.message });
  res.status(400).json({ error: error.message || "Request failed." });
});


async function wordpressRequest(endpoint) {
  const site = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_APPLICATION_PASSWORD;

  if (!site || !username || !password || password.includes("PASTE_YOUR")) {
    throw new Error("WordPress credentials are not configured.");
  }

  const auth = Buffer.from(
    username + ":" + password.replace(/\s/g, "")
  ).toString("base64");

  const response = await fetch(
    site.replace(/\/$/, "") + "/wp-json/wp/v2/" + endpoint,
    { headers: { Authorization: "Basic " + auth } }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error("WordPress returned HTTP " + response.status);
  }

  return data;
}

app.get("/api/wordpress/status", async (_req, res) => {
  try {
    const user = await wordpressRequest("users/me");
    res.json({ connected: true, username: user.slug || user.name });
  } catch (error) {
    res.status(502).json({ connected: false, error: error.message });
  }
});

app.get("/api/wordpress/pages", async (_req, res) => {
  try {
    const pages = await wordpressRequest(
      "pages?per_page=50&_fields=id,title,slug,status,link,modified"
    );
    res.json({ pages });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`MarketPilot API listening on ${port}`));
