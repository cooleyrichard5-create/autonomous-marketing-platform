import React, { useEffect, useState } from "react";

/**
 * Mount this component inside the signed-in MarketPilot dashboard.
 * Props:
 *   apiBase: backend origin, e.g. https://api.example.com
 *   accessToken: current Supabase access token
 */
export default function KnowledgeLibrary({ apiBase = "", accessToken }) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("SEO");
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const headers = { Authorization: `Bearer ${accessToken}` };

  async function refresh() {
    if (!accessToken) return;
    const response = await fetch(`${apiBase}/api/marketpilot/knowledge`, { headers });
    const data = await response.json();
    if (response.ok) setDocuments(data.documents || []);
    else setNotice(data.error || "Could not load library.");
  }

  useEffect(() => { refresh(); }, [accessToken, apiBase]);

  async function importUrl(event) {
    event.preventDefault();
    if (!url.trim()) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`${apiBase}/api/marketpilot/knowledge/url`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), category })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed.");
      setNotice(`Studied and saved: ${data.document.title} (${data.document.chunks} searchable sections).`);
      setUrl("");
      await refresh();
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function importFile(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      const response = await fetch(`${apiBase}/api/marketpilot/knowledge/file`, {
        method: "POST", headers, body: form
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setNotice(`Processed and saved: ${data.document.title} (${data.document.chunks} searchable sections).`);
      setFile(null);
      event.target.reset();
      await refresh();
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function removeDocument(id) {
    if (!window.confirm("Delete this source and its searchable content?")) return;
    const response = await fetch(`${apiBase}/api/marketpilot/knowledge/${id}`, { method: "DELETE", headers });
    const data = await response.json();
    if (!response.ok) setNotice(data.error || "Delete failed.");
    else { setNotice("Source deleted."); await refresh(); }
  }

  return (
    <section className="mp-knowledge">
      <header>
        <h2>MarketPilot Knowledge Library</h2>
        <p>Give MarketPilot trusted courses, articles and documentation. Imported material becomes searchable context for its marketing advice.</p>
      </header>

      <label>
        Subject
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {["SEO", "Meta Ads", "Google Ads", "WordPress", "Sales", "Marketing Foundations", "Analytics", "Other"].map(x =>
            <option key={x} value={x}>{x}</option>
          )}
        </select>
      </label>

      <form onSubmit={importUrl}>
        <label htmlFor="mp-url">Import a webpage URL</label>
        <input id="mp-url" type="url" required placeholder="https://example.com/marketing-guide" value={url} onChange={e => setUrl(e.target.value)} />
        <button disabled={busy || !accessToken}>{busy ? "Processing…" : "Read and save webpage"}</button>
      </form>

      <form onSubmit={importFile}>
        <label htmlFor="mp-file">Upload course material</label>
        <input id="mp-file" type="file" accept=".pdf,.docx,.txt,.md" onChange={e => setFile(e.target.files?.[0] || null)} />
        <small>PDF, DOCX, TXT or Markdown. Maximum size is configured by the server (20 MB by default).</small>
        <button disabled={busy || !file || !accessToken}>{busy ? "Processing…" : "Extract and save file"}</button>
      </form>

      {notice && <p role="status">{notice}</p>}

      <div>
        <h3>Saved sources ({documents.length})</h3>
        {documents.length === 0 ? <p>No sources imported yet.</p> : documents.map(doc => (
          <article key={doc.id} className="mp-knowledge-item">
            <div>
              <strong>{doc.title}</strong>
              <div>{doc.category} · {doc.source_type} · {doc.chunk_count} sections · {doc.status}</div>
              {doc.source_url && <a href={doc.source_url} target="_blank" rel="noreferrer">{doc.source_url}</a>}
            </div>
            <button type="button" onClick={() => removeDocument(doc.id)}>Delete</button>
          </article>
        ))}
      </div>
    </section>
  );
}
