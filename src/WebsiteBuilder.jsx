import React, { useState } from "react";

const initial = {
  name: "Your Business",
  city: "Your City, AR",
  phone: "(555) 555-5555",
  email: "info@example.com",
  color: "#1769aa",
  headline: "Professional Services You Can Trust",
  subheadline: "Quality work, honest service, and results you can count on.",
  about: "We help homeowners and businesses with dependable professional services. Contact us today for a free estimate.",
  services: "Professional Service One,Professional Service Two,Professional Service Three",
  seoTitle: "Professional Services | Your Business",
  seoDescription: "Contact Your Business for professional services in Your City. Request a free estimate today."
};

export default function WebsiteBuilder() {
  const [site, setSite] = useState(() => {
    try {
      return { ...initial, ...JSON.parse(localStorage.getItem("mp-site") || "{}") };
    } catch {
      return initial;
    }
  });
  const [tab, setTab] = useState("edit");
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    const next = { ...site, [key]: value };
    setSite(next);
    localStorage.setItem("mp-site", JSON.stringify(next));
    setSaved(true);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function makeWebsite() {
    const services = site.services.split(",").map(s => s.trim()).filter(Boolean);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(site.seoTitle)}</title>
<meta name="description" content="${escapeHtml(site.seoDescription)}">
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#202938;line-height:1.6}
header{background:white;padding:20px 7%;display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap}
.brand{font-size:23px;font-weight:bold;color:${site.color}}
header a,.btn{color:white;background:${site.color};padding:12px 20px;text-decoration:none;border-radius:6px}
.hero{background:linear-gradient(120deg,${site.color},#172d49);color:white;text-align:center;padding:100px 20px}
.hero h1{font-size:clamp(32px,5vw,54px);max-width:850px;margin:0 auto 15px}
.hero p{font-size:19px;max-width:700px;margin:0 auto 28px}
section{padding:65px 8%;text-align:center}.services{background:#f3f6f9}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:20px;margin-top:30px}
.card{background:white;padding:28px;border-radius:10px;box-shadow:0 4px 18px #00000010}
.contact{background:#172d49;color:white}
footer{text-align:center;padding:25px;background:#101d2d;color:white}
</style>
</head>
<body>
<header><div class="brand">${escapeHtml(site.name)}</div><a href="tel:${escapeHtml(site.phone)}">Call ${escapeHtml(site.phone)}</a></header>
<div class="hero"><h1>${escapeHtml(site.headline)}</h1><p>${escapeHtml(site.subheadline)}</p><a class="btn" href="tel:${escapeHtml(site.phone)}">Get a Free Estimate</a></div>
<section><h2>About ${escapeHtml(site.name)}</h2><p>${escapeHtml(site.about)}</p></section>
<section class="services"><h2>Our Services</h2><div class="cards">${services.map(s => `<div class="card"><h3>${escapeHtml(s)}</h3><p>Contact us to learn more about this service.</p></div>`).join("")}</div></section>
<section class="contact"><h2>Ready to Get Started?</h2><p>Serving ${escapeHtml(site.city)}</p><p>${escapeHtml(site.email)}</p><a class="btn" href="tel:${escapeHtml(site.phone)}">Contact Us</a></section>
<footer>© ${new Date().getFullYear()} ${escapeHtml(site.name)} · ${escapeHtml(site.city)}</footer>
</body></html>`;
  }

  function exportWebsite() {
    const blob = new Blob([makeWebsite()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marketpilot-website.html";
    link.click();
    URL.revokeObjectURL(url);
  }

  const fields = [
    ["name", "Business name"],
    ["city", "Service area / city"],
    ["phone", "Phone number"],
    ["email", "Email address"],
    ["headline", "Main headline"],
    ["subheadline", "Headline description"],
    ["about", "About the business"],
    ["services", "Services (separate with commas)"],
    ["seoTitle", "SEO page title"],
    ["seoDescription", "SEO meta description"]
  ];

  return (
    <div className="mp-builder">
      <style>{`
        .mp-builder{color:var(--text,#202938);width:100%}
        .mp-builder *{box-sizing:border-box}
        .mp-builder .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
        .mp-builder .tabs{display:flex;gap:8px;flex-wrap:wrap}
        .mp-builder button{border:1px solid #ccd3dc;border-radius:7px;padding:11px 15px;background:var(--card,#fff);color:inherit;font-weight:600;cursor:pointer}
        .mp-builder button.active,.mp-builder button.primary{background:#1769aa;color:white;border-color:#1769aa}
        .mp-builder .layout{display:grid;grid-template-columns:minmax(260px,380px) minmax(0,1fr);gap:20px}
        .mp-builder .panel{background:var(--card,#fff);border:1px solid var(--border,#ddd);border-radius:12px;padding:18px;min-width:0}
        .mp-builder label{display:block;font-size:13px;font-weight:600;margin:13px 0 5px}
        .mp-builder input,.mp-builder textarea{width:100%;padding:11px;border:1px solid #ccd3dc;border-radius:7px;font:inherit;background:var(--bg,#fff);color:inherit}
        .mp-builder textarea{min-height:75px;resize:vertical}
        .mp-builder .preview{width:100%;height:680px;border:1px solid #ccd3dc;border-radius:8px;background:white}
        .mp-builder .hint{font-size:13px;color:var(--muted,#687386)}
        .mp-builder .seo{background:#f2f6fb;color:#26374a;padding:14px;border-radius:8px;margin-top:12px;overflow-wrap:anywhere}
        @media(max-width:850px){.mp-builder .layout{grid-template-columns:1fr}.mp-builder .preview{height:600px}}
      `}</style>

      <div className="top">
        <div>
          <h1 style={{ margin: 0 }}>Website Builder</h1>
          <p className="hint">Build, customize, preview, and export a business website.</p>
        </div>
        <button className="primary" onClick={exportWebsite}>Export Website</button>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>Edit Website</button>
        <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>Live Preview</button>
        <button className={tab === "seo" ? "active" : ""} onClick={() => setTab("seo")}>SEO Settings</button>
      </div>

      {tab === "edit" && (
        <div className="layout">
          <div className="panel">
            <h3>Business Information</h3>
            {fields.slice(0, 8).map(([key, label]) => (
              <label key={key}>{label}
                {["about", "subheadline", "services"].includes(key)
                  ? <textarea value={site[key]} onChange={e => update(key, e.target.value)} />
                  : <input value={site[key]} onChange={e => update(key, e.target.value)} />}
              </label>
            ))}
            <label>Brand color
              <input type="color" value={site.color} onChange={e => update("color", e.target.value)} />
            </label>
            <p className="hint">{saved ? "Changes saved on this device." : "Changes save automatically on this device."}</p>
          </div>
          <div className="panel">
            <h3>Website Preview</h3>
            <iframe title="Website preview" className="preview" srcDoc={makeWebsite()} />
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="panel">
          <iframe title="Full website preview" className="preview" srcDoc={makeWebsite()} />
        </div>
      )}

      {tab === "seo" && (
        <div className="panel">
          <h2>Search Engine Optimization</h2>
          <p className="hint">These fields become the page title and meta description in your exported website.</p>
          {fields.slice(8).map(([key, label]) => (
            <label key={key}>{label}
              <textarea value={site[key]} onChange={e => update(key, e.target.value)} />
            </label>
          ))}
          <div className="seo">
            <div style={{ color: "#1769aa", fontSize: 19 }}>{site.seoTitle || "Page title"}</div>
            <div style={{ color: "#16834a", fontSize: 13 }}>{site.city}</div>
            <div>{site.seoDescription || "Your search description will appear here."}</div>
          </div>
          <p className="hint">{site.seoTitle.length} title characters · {site.seoDescription.length} description characters</p>
        </div>
      )}
    </div>
  );
}
