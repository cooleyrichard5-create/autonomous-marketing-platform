import React, { useState } from "react";

export default function MarketPilotChat({ apiBase = "http://127.0.0.1:3000", accessToken = "local", business = {} }) {
  const [messages, setMessages] = useState([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(event) {
    event.preventDefault();
    const message = value.trim();
    if (!message || busy) return;
    const history = messages.slice(-10);
    setMessages([...messages, { role: "user", content: message }]);
    setValue(""); setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBase}/api/marketpilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ message, business, history })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      setMessages(current => [...current, { role: "assistant", content: data.reply, sources: data.sources || [] }]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="mp-chat">
      <h2>MarketPilot AI</h2>
      <p>Local Qwen AI for marketing strategy. Saved knowledge can be connected later.</p>
      <div aria-live="polite">
        {messages.map((m, i) => (
          <article key={i}>
            <strong>{m.role === "user" ? "You" : "MarketPilot"}</strong>
            <p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
            {m.sources?.length > 0 && <small>Knowledge used: {m.sources.map(s => s.source_url || s.title).filter(Boolean).join(" · ")}</small>}
          </article>
        ))}
      </div>
      <form onSubmit={send}>
        <textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Ask MarketPilot about your marketing…" rows={3} />
        <button disabled={busy || !value.trim()}>{busy ? "Thinking…" : "Send"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
