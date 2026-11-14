import React, { useState } from "react";
import "./style.css";
import WebsiteBuilder from "./WebsiteBuilder";
import MarketPilotChat from "./MarketPilotChat";

const sections = [
  { id: "overview", icon: "⌂", label: "Overview" },
  { id: "assistant", icon: "✳", label: "AI Assistant" },
  { id: "seo", icon: "⌕", label: "SEO Center" },
  { id: "meta", icon: "◉", label: "Meta Ads" },
  { id: "google", icon: "◎", label: "Google Ads" },
  { id: "knowledge", icon: "▤", label: "Knowledge Library" },
  { id: "website", icon: "▧", label: "Website Builder" },
];

const descriptions = {
  assistant: ["AI MARKETING", "Your marketing strategy workspace.", "AI connection pending."],
  seo: ["SEARCH ENGINE OPTIMIZATION", "Improve your visibility in search.", "Website audits, keyword research, local SEO, backlinks, and ranking analysis."],
  meta: ["META ADVERTISING", "Plan and manage your Facebook and Instagram campaigns.", "Campaign strategy, creative analysis, audience research, and performance tracking."],
  google: ["GOOGLE ADVERTISING", "Build more effective search campaigns.", "Keyword planning, campaign structure, ad copy, budget analysis, and optimization."],
  website: ["WEBSITE DEVELOPMENT", "Build and customize business websites.", "Create, edit, preview, and export websites."],
  knowledge: ["KNOWLEDGE BASE", "Your marketing intelligence library.", "Import and organize the research and training material that powers MarketPilot."],
};

export default function App() {
  const [active, setActive] = useState("overview");

  const current = sections.find(item => item.id === active);
  const detail = descriptions[active];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MarketPilot</div>
            <div className="brand-sub">MARKETING INTELLIGENCE</div>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          {sections.map(item => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? "selected" : ""}`}
              onClick={() => setActive(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === "assistant" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-indicator"><span /> LOCAL AI MODE</div>
          <div className="version">MARKETPILOT · VERSION 1.0</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> {current.label}</div>
          <div className="top-right">
            <span className="environment">LOCAL PREVIEW</span>
            <div className="avatar">MP</div>
          </div>
        </header>

        <div className="content">
          {active === "overview" ? (
            <>
              <div className="welcome">
                <div>
                  <div className="eyebrow">MARKETING COMMAND CENTER</div>
                  <h1>Welcome to MarketPilot.</h1>
                  <p>Your central workspace for marketing strategy, advertising, and growth.</p>
                </div>
                <div className="date-chip">YOUR WORKSPACE</div>
              </div>

              <div className="section-heading">PLATFORM OVERVIEW</div>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">AI ASSISTANT</div>
                  <div className="stat-value">Not connected</div>
                  <div className="stat-foot">AI provider setup pending</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">KNOWLEDGE SOURCES</div>
                  <div className="stat-value">Not connected</div>
                  <div className="stat-foot">Supabase setup required</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">AD PLATFORMS</div>
                  <div className="stat-value">0 connected</div>
                  <div className="stat-foot">Integrations coming next</div>
                </div>
              </div>

              <div className="section-heading">YOUR MARKETING TOOLS</div>
              <div className="tool-grid">
                {sections.slice(1).map(item => (
                  <button className="tool-card" key={item.id} onClick={() => setActive(item.id)}>
                    <div className="tool-icon">{item.icon}</div>
                    <div className="tool-title">{item.label}</div>
                    <div className="tool-description">{descriptions[item.id][1]}</div>
                    <div className="tool-open">OPEN WORKSPACE <span>→</span></div>
                  </button>
                ))}
              </div>

              <div className="notice">
                <div className="notice-icon">i</div>
                <div>
                  <strong>Initial setup required</strong>
                  <p>AI chat, saved knowledge, and advertising integrations are being prepared.</p>
                </div>
              </div>
            </>
          ) : active === "assistant" ? (
            <div className="workspace-page">
              <div className="eyebrow">AI MARKETING</div>
              <h1>MarketPilot AI</h1>
              <p className="page-description">Your marketing intelligence assistant.</p>
              <div className="workspace-panel">
                <div className="panel-symbol">✳</div>
                <h2>AI connection pending</h2>
                <p>The AI engine is not enabled in this prototype. The assistant will be available after cloud AI configuration.</p>
                <span className="coming-label">IN DEVELOPMENT</span>
              </div>
            </div>
          ) : active === "website" ? (
            <WebsiteBuilder />
          ) : (
            <div className="workspace-page">
              <div className="eyebrow">{detail[0]}</div>
              <h1>{current.label}</h1>
              <p className="page-description">{detail[1]}</p>
              <div className="workspace-panel">
                <div className="panel-symbol">{current.icon}</div>
                <h2>{active === "assistant" ? "AI connection required" : active === "knowledge" ? "Knowledge library connection required" : "Workspace ready for development"}</h2>
                <p>{detail[2]}</p>
                <span className="coming-label">CONFIGURATION PENDING</span>
              </div>
              <button className="back-button" onClick={() => setActive("overview")}>← Back to overview</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
