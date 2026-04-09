import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const GITHUB_REPO = "g2fdaniel/build2scale";
const GITHUB_BRANCH = "master";

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function githubGet(path: string, pat: string) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubPut(path: string, content: string, message: string, sha: string | undefined, pat: string) {
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT failed for ${path}: ${await res.text()}`);
  return res.json();
}

// ─── HTML Templates ───────────────────────────────────────────────────────────

function buildIndexHtml(p: {
  name: string; slug: string; icon: string; color: string; colorRgb: string;
  laufzeit: string; budget: string; featureCount: number;
  problem: string; zielgruppe: string; hypothese: string;
  scopeItems: string; heuteItems: string; mitMvpItems: string; kpiRows: string;
}) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.name} — MVP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root { --dark: #0f1117; --darker: #080a0f; --card: #161b27; --card2: #1c2333; --accent: ${p.color}; --accent2: ${p.color}; --gold: #f59e0b; --green: #10b981; --red: #ef4444; --text: #e2e8f0; --muted: #64748b; --border: #1e2a3a; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--darker); color: var(--text); line-height: 1.6; }
.nav { background: rgba(8,10,15,0.95); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
.nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 40px; display: flex; align-items: center; gap: 8px; height: 52px; }
.nav-brand { text-decoration: none; display: flex; align-items: center; gap: 8px; margin-right: 12px; flex-shrink: 0; }
.nav-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent2); }
.nav-brand-text { font-size: 13px; font-weight: 700; color: var(--text); }
.nav-sep { color: var(--border); font-size: 18px; margin: 0 4px; }
.nav-links { display: flex; align-items: center; gap: 2px; }
.nav-link { text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--muted); }
.nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.nav-link.active { color: var(--accent2); background: rgba(${p.colorRgb},0.12); font-weight: 600; }
.theme-toggle { margin-left: auto; background: none; border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hero { background: linear-gradient(135deg, #0f1117 0%, rgba(${p.colorRgb},0.08) 50%, #0f1117 100%); border-bottom: 1px solid var(--border); padding: 56px 40px 44px; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; top: -50%; left: -20%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(${p.colorRgb},0.1) 0%, transparent 70%); pointer-events: none; }
.hero-inner { max-width: 1100px; margin: 0 auto; position: relative; }
.hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(${p.colorRgb},0.1); border: 1px solid rgba(${p.colorRgb},0.3); color: var(--accent2); padding: 6px 14px; border-radius: 100px; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 20px; }
.hero h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 14px; }
.hero h1 span { color: var(--accent2); }
.hero-sub { color: var(--muted); font-size: 15px; max-width: 600px; margin-bottom: 32px; line-height: 1.7; }
.metrics-row { display: flex; flex-wrap: wrap; gap: 12px; }
.metric-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px 24px; min-width: 150px; }
.metric-value { font-size: 26px; font-weight: 800; color: var(--accent2); letter-spacing: -0.02em; margin-bottom: 4px; }
.metric-value.gold { color: var(--gold); }
.metric-value.green { color: var(--green); }
.metric-label { font-size: 12px; color: var(--muted); }
.container { max-width: 1100px; margin: 0 auto; padding: 48px 40px; }
.section { margin-bottom: 52px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
.section-num { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(${p.colorRgb},0.15); border: 1px solid rgba(${p.colorRgb},0.3); border-radius: 8px; font-size: 13px; font-weight: 700; color: var(--accent2); flex-shrink: 0; }
.section-title { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
.frame-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.frame-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px 24px; }
.frame-card.full { grid-column: 1 / -1; }
.frame-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--accent2); margin-bottom: 10px; }
.frame-text { font-size: 14px; color: var(--text); line-height: 1.7; }
.frame-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.frame-list li { font-size: 13px; color: var(--muted); display: flex; gap: 8px; line-height: 1.5; }
.frame-list li::before { content: '→'; color: var(--accent2); flex-shrink: 0; font-weight: 700; }
.frame-list li strong { color: var(--text); }
.frame-card.hypothesis { border-color: rgba(${p.colorRgb},0.3); background: rgba(${p.colorRgb},0.04); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-box { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
.info-box.red { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.03); }
.info-box.green { border-color: rgba(16,185,129,0.2); background: rgba(16,185,129,0.03); }
.info-box-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
.info-box.red .info-box-label { color: var(--red); }
.info-box.green .info-box-label { color: var(--green); }
.info-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.info-list li { font-size: 13px; color: var(--muted); display: flex; gap: 8px; line-height: 1.5; }
.info-list li::before { flex-shrink: 0; font-weight: 700; }
.info-box.red .info-list li::before { content: '✗'; color: var(--red); }
.info-box.green .info-list li::before { content: '✓'; color: var(--green); }
.kpi-table-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 18px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); background: var(--card2); border-bottom: 1px solid var(--border); }
td { padding: 11px 18px; border-bottom: 1px solid rgba(30,42,58,0.5); vertical-align: top; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(255,255,255,0.02); }
td:last-child { color: var(--accent2); font-weight: 600; }
.nav-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.nav-card { display: flex; align-items: center; gap: 18px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px; text-decoration: none; color: var(--text); transition: border-color 0.15s, background 0.15s; }
.nav-card:hover { border-color: rgba(${p.colorRgb},0.4); background: var(--card2); }
.nav-card-icon { font-size: 24px; width: 52px; height: 52px; background: rgba(${p.colorRgb},0.1); border: 1px solid rgba(${p.colorRgb},0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nav-card-body { flex: 1; }
.nav-card-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.nav-card-sub { font-size: 12px; color: var(--muted); line-height: 1.5; }
.nav-card-arrow { color: var(--accent2); font-size: 18px; margin-left: auto; flex-shrink: 0; }
.footer { border-top: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 13px; }
.footer strong { color: var(--text); }
.footer-nav { display: flex; gap: 16px; }
.footer-nav a { text-decoration: none; color: var(--muted); }
.footer-nav a:hover { color: var(--accent2); }
body.light { --darker: #f8fafc; --dark: #f1f5f9; --card: #ffffff; --card2: #f8fafc; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; }
body.light .nav { background: rgba(255,255,255,0.95); }
body.light .hero { background: linear-gradient(135deg, #f8fafc 0%, rgba(${p.colorRgb},0.06) 50%, #f8fafc 100%); }
body.light th { background: #f1f5f9; }
@media (max-width: 768px) { .hero, .container, .footer { padding-left: 20px; padding-right: 20px; } .nav-inner { padding: 0 16px; } .two-col, .frame-grid { grid-template-columns: 1fr; } .metrics-row { flex-direction: column; } }
</style>
</head>
<body>
<script>if(localStorage.getItem('theme')==='light')document.body.classList.add('light');</script>
<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand"><div class="nav-brand-dot"></div><span class="nav-brand-text">${p.name}</span></a>
    <span class="nav-sep">|</span>
    <div class="nav-links">
      <a href="index.html" class="nav-link active">Übersicht</a>
      <a href="konzept.html" class="nav-link">Konzept</a>
      <a href="backlog.html" class="nav-link">Backlog</a>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()" id="theme-toggle-btn">☀️</button>
  </div>
</nav>
<div class="hero">
  <div class="hero-inner">
    <div class="hero-badge">${p.icon} MVP · Go 2 Flow · Build 2 Scale</div>
    <h1>${p.name.includes(" ") ? p.name.substring(0, p.name.lastIndexOf(" ")) + "<br><span>" + p.name.substring(p.name.lastIndexOf(" ") + 1) + "</span>" : p.name}</h1>
    <div class="hero-sub">${p.problem}</div>
    <div class="metrics-row">
      <div class="metric-card"><div class="metric-value">${p.laufzeit}</div><div class="metric-label">Lieferzeit</div></div>

      <div class="metric-card"><div class="metric-value">${p.featureCount}</div><div class="metric-label">Features im MVP</div></div>
    </div>
  </div>
</div>
<div class="container">
  <div class="section">
    <div class="section-header"><div class="section-num">01</div><h2 class="section-title">MVP Framing</h2></div>
    <div class="frame-grid">
      <div class="frame-card"><div class="frame-label">Problem</div><div class="frame-text">${p.problem}</div></div>
      <div class="frame-card"><div class="frame-label">Zielgruppe</div><div class="frame-text">${p.zielgruppe}</div></div>
      <div class="frame-card hypothesis full"><div class="frame-label">Hypothese</div><div class="frame-text">${p.hypothese}</div></div>
      <div class="frame-card full">
        <div class="frame-label">Wie wir das testen — Minimal Scope</div>
        <ul class="frame-list">
${p.scopeItems}
        </ul>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><div class="section-num">02</div><h2 class="section-title">Ausgangslage &amp; Lösung</h2></div>
    <div class="two-col">
      <div class="info-box red"><div class="info-box-label">Was heute fehlt</div><ul class="info-list">
${p.heuteItems}
      </ul></div>
      <div class="info-box green"><div class="info-box-label">Was Go 2 Flow baut</div><ul class="info-list">
${p.mitMvpItems}
      </ul></div>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><div class="section-num">03</div><h2 class="section-title">Erfolgsmessung — Wann ist der MVP erfolgreich?</h2></div>
    <div class="kpi-table-wrap">
      <table><thead><tr><th>KPI</th><th>Messung</th><th>Ziel MVP</th></tr></thead>
      <tbody>
${p.kpiRows}
      </tbody></table>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><div class="section-num">04</div><h2 class="section-title">Dokumente</h2></div>
    <div class="nav-cards">
      <a href="konzept.html" class="nav-card"><div class="nav-card-icon">📐</div><div class="nav-card-body"><div class="nav-card-title">Konzept &amp; Anforderungen</div><div class="nav-card-sub">Scope, Features mit Anforderungen — bestätigbar und kommentierbar</div></div><div class="nav-card-arrow">→</div></a>
      <a href="backlog.html" class="nav-card"><div class="nav-card-icon">📋</div><div class="nav-card-body"><div class="nav-card-title">Backlog &amp; User Stories</div><div class="nav-card-sub">Priorisierte User Stories für die Entwicklung</div></div><div class="nav-card-arrow">→</div></a>
    </div>
  </div>
</div>
<div class="footer">
  <strong>${p.name} — MVP</strong>
  <div class="footer-nav"><a href="konzept.html">Konzept →</a></div>
</div>
<script>
function toggleTheme(){var l=document.body.classList.toggle('light');localStorage.setItem('theme',l?'light':'dark');var b=document.getElementById('theme-toggle-btn');if(b)b.textContent=l?'🌙':'☀️';}
document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('theme-toggle-btn');if(b&&document.body.classList.contains('light'))b.textContent='🌙';});
</script>
</body>
</html>`;
}

function buildKonzeptHtml(p: {
  name: string; slug: string; color: string; colorRgb: string;
  scopeInItems: string; scopeOutItems: string;
}) {
  const SUPABASE_URL = "https://telbxreqdvgidknelhwv.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbGJ4cmVxZHZnaWRrbmVsaHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTg3ODMsImV4cCI6MjA4OTg3NDc4M30.Tio8pDdDPuawqGwJtHV6234WJUYuFn2y1RVDOM0Nf64";

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Konzept — ${p.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root { --dark: #0f1117; --darker: #080a0f; --card: #161b27; --card2: #1c2333; --accent: ${p.color}; --accent2: ${p.color}; --gold: #f59e0b; --green: #10b981; --red: #ef4444; --text: #e2e8f0; --muted: #64748b; --border: #1e2a3a; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--darker); color: var(--text); line-height: 1.6; }
.nav { background: rgba(8,10,15,0.95); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
.nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 40px; display: flex; align-items: center; gap: 8px; height: 52px; }
.nav-brand { text-decoration: none; display: flex; align-items: center; gap: 8px; margin-right: 12px; flex-shrink: 0; }
.nav-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent2); }
.nav-brand-text { font-size: 13px; font-weight: 700; color: var(--text); }
.nav-sep { color: var(--border); font-size: 18px; margin: 0 4px; }
.nav-links { display: flex; align-items: center; gap: 2px; }
.nav-link { text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--muted); }
.nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.nav-link.active { color: var(--accent2); background: rgba(${p.colorRgb},0.12); font-weight: 600; }
.theme-toggle { margin-left: auto; background: none; border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.page-hdr { background: linear-gradient(135deg, #0f1117 0%, rgba(${p.colorRgb},0.08) 50%, #0f1117 100%); border-bottom: 1px solid var(--border); padding: 36px 40px 28px; }
.page-hdr-inner { max-width: 1100px; margin: 0 auto; }
.page-bc { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
.page-bc a { color: var(--muted); text-decoration: none; }
.page-title { font-size: clamp(22px, 3vw, 34px); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px; }
.page-title span { color: var(--accent2); }
.page-sub { color: var(--muted); font-size: 14px; }
.container { max-width: 1100px; margin: 0 auto; padding: 48px 40px; }
.section { margin-bottom: 48px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
.section-num { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(${p.colorRgb},0.15); border: 1px solid rgba(${p.colorRgb},0.3); border-radius: 8px; font-size: 13px; font-weight: 700; color: var(--accent2); flex-shrink: 0; }
.section-title { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
.scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.scope-box { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px; }
.scope-box.in { border-color: rgba(16,185,129,0.2); background: rgba(16,185,129,0.03); }
.scope-box.out { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.03); }
.scope-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
.scope-box.in .scope-label { color: var(--green); }
.scope-box.out .scope-label { color: var(--red); }
.scope-list { list-style: none; display: flex; flex-direction: column; gap: 7px; }
.scope-list li { font-size: 12px; color: var(--muted); display: flex; gap: 7px; line-height: 1.5; }
.scope-box.in .scope-list li::before { content: '✓'; color: var(--green); flex-shrink: 0; font-weight: 700; }
.scope-box.out .scope-list li::before { content: '✗'; color: var(--red); flex-shrink: 0; font-weight: 700; }
.accordion { display: flex; flex-direction: column; gap: 10px; }
.acc-item { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: border-color 0.2s; }
.acc-item.open { border-color: rgba(${p.colorRgb},0.35); }
.acc-trigger { display: flex; align-items: center; gap: 16px; padding: 18px 22px; cursor: pointer; user-select: none; width: 100%; background: none; border: none; color: var(--text); text-align: left; }
.acc-trigger:hover { background: rgba(255,255,255,0.02); }
.acc-domain-icon { font-size: 20px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(${p.colorRgb},0.08); border: 1px solid rgba(${p.colorRgb},0.2); border-radius: 10px; flex-shrink: 0; }
.acc-domain-body { flex: 1; min-width: 0; }
.acc-domain-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.acc-domain-url { font-size: 11px; color: var(--accent2); font-family: monospace; }
.acc-meta { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.acc-count { font-size: 12px; color: var(--muted); }
.acc-chevron { color: var(--muted); font-size: 13px; transition: transform 0.25s; flex-shrink: 0; }
.acc-item.open .acc-chevron { transform: rotate(180deg); }
.acc-body { display: none; padding: 0 22px 22px; }
.acc-item.open .acc-body { display: block; }
.feat-group { margin-bottom: 18px; }
.feat-group:last-child { margin-bottom: 0; }
.feat-group-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--accent2); margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid rgba(${p.colorRgb},0.12); }
.feat-list { display: flex; flex-direction: column; gap: 5px; }
.feat-item { background: var(--card2); border: 1px solid rgba(255,255,255,0.04); border-radius: 9px; padding: 10px 12px; transition: border-color 0.15s; }
.feat-header { cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px; }
.feat-item:hover { border-color: rgba(${p.colorRgb},0.25); }
.feat-item.open { border-color: rgba(${p.colorRgb},0.3); background: rgba(${p.colorRgb},0.04); }
.feat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); flex-shrink: 0; }
.feat-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; }
.feat-chevron { font-size: 11px; color: var(--muted); flex-shrink: 0; transition: transform 0.2s; }
.feat-item.open .feat-chevron { transform: rotate(45deg); color: var(--accent2); }
.feat-detail { display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(${p.colorRgb},0.12); }
.feat-item.open .feat-detail { display: block; }
.feat-detail-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 5px; }
.req-list { list-style: none; display: flex; flex-direction: column; gap: 3px; }
.req-item { font-size: 12px; color: var(--muted); display: flex; flex-direction: column; line-height: 1.45; padding: 2px 0; }
.req-item.tbd { color: rgba(100,116,139,0.7); }
.req-row { display: flex; align-items: flex-start; gap: 6px; width: 100%; padding: 2px 0; }
.req-marker { font-size: 11px; flex-shrink: 0; cursor: pointer; color: rgba(${p.colorRgb},0.5); transition: color 0.15s, transform 0.1s; user-select: none; min-width: 10px; text-align: center; line-height: 1.45; }
.req-marker:hover { color: var(--accent2); transform: scale(1.3); }
.req-item.tbd .req-marker { color: var(--gold); }
.req-item.req-confirmed .req-marker { color: var(--green); }
.req-item.req-confirmed .req-text { color: var(--text); }
.req-text { flex: 1; min-width: 0; line-height: 1.45; }
.req-chat { flex-shrink: 0; font-size: 10px; color: rgba(100,116,139,0.2); cursor: pointer; padding: 1px 4px; border-radius: 4px; transition: all 0.1s; white-space: nowrap; line-height: 1.6; }
.req-chat:hover { color: var(--accent2); background: rgba(${p.colorRgb},0.08); }
.req-chat.has-comments { color: rgba(${p.colorRgb},0.65); }
.req-thread { display: none; margin: 4px 0 4px 16px; padding: 7px 10px; background: rgba(${p.colorRgb},0.03); border-left: 2px solid rgba(${p.colorRgb},0.18); border-radius: 0 6px 6px 0; }
.req-thread.open { display: block; }
.req-thread-comments { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.req-thread-msg { font-size: 11px; line-height: 1.5; }
.req-thread-author { font-weight: 700; color: var(--accent2); margin-right: 4px; }
.req-thread-time { color: rgba(100,116,139,0.4); margin-right: 5px; font-size: 10px; }
.req-thread-text { color: rgba(226,232,240,0.72); }
.req-thread-empty { display: block; font-size: 11px; color: rgba(100,116,139,0.4); font-style: italic; margin-bottom: 6px; }
.req-thread-input-row { display: flex; gap: 5px; }
.req-thread-input { flex: 1; background: var(--card2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 11px; color: var(--text); font-family: inherit; resize: none; min-height: 28px; }
.req-thread-input:focus { outline: none; border-color: rgba(${p.colorRgb},0.4); }
.req-thread-btn { padding: 4px 8px; background: rgba(${p.colorRgb},0.1); border: 1px solid rgba(${p.colorRgb},0.25); border-radius: 6px; color: var(--accent2); font-size: 13px; cursor: pointer; font-family: inherit; line-height: 1; }
.req-thread-btn:hover { background: rgba(${p.colorRgb},0.2); }
.author-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(${p.colorRgb},0.05); border: 1px solid rgba(${p.colorRgb},0.18); border-radius: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.author-bar-label { font-size: 12px; color: var(--muted); white-space: nowrap; }
.author-name-input { background: var(--card); border: 1px solid var(--border); border-radius: 7px; padding: 5px 10px; font-size: 12px; color: var(--text); font-family: inherit; width: 160px; }
.author-name-input:focus { outline: none; border-color: rgba(${p.colorRgb},0.4); }
.author-bar-hint { font-size: 11px; color: rgba(100,116,139,0.5); }
.footer { border-top: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 13px; }
.footer strong { color: var(--text); }
.footer-nav { display: flex; gap: 16px; }
.footer-nav a { text-decoration: none; color: var(--muted); }
.footer-nav a:hover { color: var(--accent2); }
body.light { --darker: #f8fafc; --dark: #f1f5f9; --card: #ffffff; --card2: #f8fafc; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; }
body.light .nav { background: rgba(255,255,255,0.95); }
body.light .page-hdr { background: linear-gradient(135deg, #f8fafc 0%, rgba(${p.colorRgb},0.06) 50%, #f8fafc 100%); }
body.light .feat-item { background: #f8fafc; border-color: #e2e8f0; }
body.light .req-thread-input { background: #f8fafc; border-color: #e2e8f0; }
body.light .author-name-input { background: #f8fafc; border-color: #e2e8f0; }
@media (max-width: 768px) { .page-hdr, .container, .footer { padding-left: 20px; padding-right: 20px; } .nav-inner { padding: 0 16px; } .scope-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<script>if(localStorage.getItem('theme')==='light')document.body.classList.add('light');</script>
<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand"><div class="nav-brand-dot"></div><span class="nav-brand-text">${p.name}</span></a>
    <span class="nav-sep">|</span>
    <div class="nav-links">
      <a href="index.html" class="nav-link">Übersicht</a>
      <a href="konzept.html" class="nav-link active">Konzept</a>
      <a href="backlog.html" class="nav-link">Backlog</a>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()" id="theme-toggle-btn">☀️</button>
  </div>
</nav>
<div class="page-hdr">
  <div class="page-hdr-inner">
    <div class="page-bc"><a href="index.html">${p.name}</a> / Konzept</div>
    <div class="page-title">Konzept &amp; <span>Anforderungen</span></div>
    <div class="page-sub">Scope, Features und Anforderungen — bestätigbar und kommentierbar</div>
  </div>
</div>
<div class="container">
  <div class="section">
    <div class="section-header"><div class="section-num">01</div><h2 class="section-title">Scope</h2></div>
    <div class="scope-grid">
      <div class="scope-box in"><div class="scope-label">Im Scope — Was wir bauen</div><ul class="scope-list">
${p.scopeInItems}
      </ul></div>
      <div class="scope-box out"><div class="scope-label">Nicht im Scope — Bewusst weggelassen</div><ul class="scope-list">
${p.scopeOutItems}
      </ul></div>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><div class="section-num">02</div><h2 class="section-title">Features &amp; Anforderungen</h2></div>
    <div id="accordion-root"><div style="color:var(--muted);font-size:14px;padding:20px 0;">Lade Features...</div></div>
  </div>
</div>
<div class="footer">
  <strong>${p.name} — Konzept</strong>
  <div class="footer-nav"><a href="index.html">← Übersicht</a><a href="backlog.html">Backlog →</a></div>
</div>
<script>
const PROJECT_SLUG = '${p.slug}';
const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

const _myInserts = new Set();
let _authorName = localStorage.getItem('b2s_author') || '';

async function loadProject() {
  const res = await fetch(SUPABASE_URL + '/rest/v1/projects?slug=eq.' + PROJECT_SLUG + '&select=id,name,slug,domains(id,name,icon,sort_order,features(id,name,sort_order,requirements(id,text,is_tbd,sort_order)))&order=domains.sort_order.asc', {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const data = await res.json();
  if (!data[0]) { document.getElementById('accordion-root').innerHTML = '<p style="color:var(--red)">Projekt nicht gefunden.</p>'; return; }
  const proj = data[0];
  const statusRes = await fetch(SUPABASE_URL + '/rest/v1/feature_status?project_id=eq.' + PROJECT_SLUG + '&select=feature_id,confirmed', {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const statusData = await statusRes.json();
  const statusMap = {};
  statusData.forEach(s => { statusMap[s.feature_id] = s.confirmed; });
  const commentsRes = await fetch(SUPABASE_URL + '/rest/v1/feature_comments?project_id=eq.' + PROJECT_SLUG + '&select=feature_id,id&order=created_at.asc', {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const commentsData = await commentsRes.json();
  const commentCountMap = {};
  commentsData.forEach(c => { commentCountMap[c.feature_id] = (commentCountMap[c.feature_id] || 0) + 1; });
  renderAccordion(proj, statusMap, commentCountMap);
  subscribeRealtime(proj);
}

function renderAccordion(proj, statusMap, commentCountMap) {
  const root = document.getElementById('accordion-root');
  root.className = 'accordion';
  const authorHtml = '<div class="author-bar"><span class="author-bar-label">Dein Name für Kommentare:</span><input class="author-name-input" id="author-name-input" placeholder="Vorname" value="' + _authorName + '" oninput="setAuthor(this.value)"><span class="author-bar-hint">Wird lokal gespeichert</span></div>';
  root.innerHTML = authorHtml + proj.domains.sort((a,b) => a.sort_order - b.sort_order).map(d => renderDomain(d, statusMap, commentCountMap)).join('');
}

function renderDomain(domain, statusMap, commentCountMap) {
  const featureCount = domain.features.reduce((n, f) => n + (f.requirements || []).length, 0);
  const featHtml = domain.features.sort((a,b) => a.sort_order - b.sort_order).map(f => renderFeature(f, statusMap, commentCountMap)).join('');
  return '<div class="acc-item" id="dom-' + domain.id + '"><button class="acc-trigger" onclick="toggleDomain(this)"><div class="acc-domain-icon">' + domain.icon + '</div><div class="acc-domain-body"><div class="acc-domain-name">' + domain.name + '</div><div class="acc-domain-url">' + PROJECT_SLUG + '/' + domain.name.toLowerCase().replace(/\\s+/g,'-') + '</div></div><div class="acc-meta"><span class="acc-count">' + featureCount + ' Anforderungen</span></div><span class="acc-chevron">▼</span></button><div class="acc-body"><div class="feat-group"><ul class="feat-list">' + featHtml + '</ul></div></div></div>';
}

function renderFeature(feat, statusMap, commentCountMap) {
  const reqs = (feat.requirements || []).sort((a,b) => a.sort_order - b.sort_order);
  const reqHtml = reqs.map(r => renderReq(r, feat.id, statusMap[feat.id])).join('');
  const commentCount = commentCountMap[feat.id] || 0;
  const chatClass = commentCount > 0 ? 'req-chat has-comments' : 'req-chat';
  const chatLabel = commentCount > 0 ? commentCount + ' 💬' : '💬';
  return '<li class="feat-item" id="feat-' + feat.id + '"><div class="feat-header" onclick="toggleFeat(this)"><div class="feat-dot"></div><span class="feat-name">' + feat.name + '</span><span class="' + chatClass + '" onclick="event.stopPropagation();toggleThread(\\'feat-thread-' + feat.id + '\\')" title="Kommentare">' + chatLabel + '</span><span class="feat-chevron">+</span></div><div class="feat-detail"><div class="feat-detail-title">Anforderungen</div><ul class="req-list">' + reqHtml + '</ul></div><div class="req-thread" id="feat-thread-' + feat.id + '"><div class="req-thread-comments" id="tc-' + feat.id + '"><span class="req-thread-empty">Noch keine Kommentare</span></div><div class="req-thread-input-row"><textarea class="req-thread-input" id="ti-' + feat.id + '" placeholder="Kommentar schreiben..." rows="1" onkeydown="handleCommentKey(event,\\''+feat.id+'\\')"></textarea><button class="req-thread-btn" onclick="submitComment(\\''+feat.id+'\\')">↑</button></div></div></li>';
}

function renderReq(req, featId, confirmed) {
  const isConfirmed = confirmed;
  const marker = req.is_tbd ? '?' : (isConfirmed ? '✓' : '–');
  const cls = 'req-item' + (req.is_tbd ? ' tbd' : '') + (isConfirmed && !req.is_tbd ? ' req-confirmed' : '');
  return '<li class="' + cls + '" id="req-' + req.id + '"><div class="req-row"><span class="req-marker" onclick="toggleConfirm(\\''+featId+'\\',\\''+req.id+'\\')" title="Bestätigen">' + marker + '</span><span class="req-text">' + req.text + '</span></div></li>';
}

function toggleDomain(btn) { btn.closest('.acc-item').classList.toggle('open'); }
function toggleFeat(el) { el.closest('.feat-item').classList.toggle('open'); }
function toggleThread(id) { document.getElementById(id)?.classList.toggle('open'); }
function setAuthor(v) { _authorName = v; localStorage.setItem('b2s_author', v); }

async function toggleConfirm(featId, reqId) {
  const current = document.getElementById('feat-' + featId)?.querySelector('.feat-item') ? true : false;
  const statusRes = await fetch(SUPABASE_URL + '/rest/v1/feature_status?feature_id=eq.' + featId + '&project_id=eq.' + PROJECT_SLUG, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const existing = await statusRes.json();
  const newVal = existing.length > 0 ? !existing[0].confirmed : true;
  const method = existing.length > 0 ? 'PATCH' : 'POST';
  const url = existing.length > 0
    ? SUPABASE_URL + '/rest/v1/feature_status?feature_id=eq.' + featId + '&project_id=eq.' + PROJECT_SLUG
    : SUPABASE_URL + '/rest/v1/feature_status';
  await fetch(url, {
    method,
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ feature_id: featId, project_id: PROJECT_SLUG, confirmed: newVal, updated_by: _authorName || 'Anonym', updated_at: new Date().toISOString() })
  });
  const featEl = document.getElementById('feat-' + featId);
  if (!featEl) return;
  featEl.querySelectorAll('.req-item').forEach(el => {
    if (!el.classList.contains('tbd')) {
      el.classList.toggle('req-confirmed', newVal);
      const m = el.querySelector('.req-marker');
      if (m) m.textContent = newVal ? '✓' : '–';
    }
  });
}

async function loadComments(featId) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/feature_comments?feature_id=eq.' + featId + '&project_id=eq.' + PROJECT_SLUG + '&order=created_at.asc', {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const comments = await res.json();
  renderComments(featId, comments);
}

function renderComments(featId, comments) {
  const container = document.getElementById('tc-' + featId);
  if (!container) return;
  if (!comments.length) { container.innerHTML = '<span class="req-thread-empty">Noch keine Kommentare</span>'; return; }
  container.innerHTML = comments.map(c => {
    const d = new Date(c.created_at);
    const time = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    return '<div class="req-thread-msg"><span class="req-thread-author">' + (c.author || 'Anonym') + '</span><span class="req-thread-time">' + time + '</span><span class="req-thread-text">' + c.content + '</span></div>';
  }).join('');
}

function handleCommentKey(e, featId) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(featId); } }

async function submitComment(featId) {
  const input = document.getElementById('ti-' + featId);
  if (!input || !input.value.trim()) return;
  const content = input.value.trim();
  input.value = '';
  const payload = { feature_id: featId, project_id: PROJECT_SLUG, author: _authorName || 'Anonym', content };
  const key = featId + '|' + content;
  _myInserts.add(key);
  await fetch(SUPABASE_URL + '/rest/v1/feature_comments', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload)
  });
  await loadComments(featId);
  updateChatBadge(featId);
}

function updateChatBadge(featId) {
  const featEl = document.getElementById('feat-' + featId);
  if (!featEl) return;
  const badge = featEl.querySelector('.req-chat');
  if (!badge) return;
  const tc = document.getElementById('tc-' + featId);
  const count = tc ? tc.querySelectorAll('.req-thread-msg').length : 0;
  badge.className = count > 0 ? 'req-chat has-comments' : 'req-chat';
  badge.textContent = count > 0 ? count + ' 💬' : '💬';
}

function subscribeRealtime(proj) {
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + SUPABASE_ANON_KEY + '&vsn=1.0.0';
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: 'realtime:*', event: 'phx_join', payload: {}, ref: null }));
    ws.send(JSON.stringify({ topic: 'realtime:public:feature_status', event: 'phx_join', payload: { config: { broadcast: { self: true }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: 'feature_status', filter: 'project_id=eq.' + PROJECT_SLUG }] } }, ref: null }));
    ws.send(JSON.stringify({ topic: 'realtime:public:feature_comments', event: 'phx_join', payload: { config: { broadcast: { self: true }, postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'feature_comments', filter: 'project_id=eq.' + PROJECT_SLUG }] } }, ref: null }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const r = msg.payload?.data?.record;
    if (!r) return;
    if (msg.topic === 'realtime:public:feature_status') {
      const featEl = document.getElementById('feat-' + r.feature_id);
      if (!featEl) return;
      featEl.querySelectorAll('.req-item').forEach(el => {
        if (!el.classList.contains('tbd')) {
          el.classList.toggle('req-confirmed', r.confirmed);
          const m = el.querySelector('.req-marker');
          if (m) m.textContent = r.confirmed ? '✓' : '–';
        }
      });
    }
    if (msg.topic === 'realtime:public:feature_comments') {
      const key = r.feature_id + '|' + r.content;
      if (_myInserts.has(key)) { _myInserts.delete(key); return; }
      loadComments(r.feature_id);
      updateChatBadge(r.feature_id);
    }
  };
  setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null })); }, 30000);
}

function toggleTheme(){var l=document.body.classList.toggle('light');localStorage.setItem('theme',l?'light':'dark');var b=document.getElementById('theme-toggle-btn');if(b)b.textContent=l?'🌙':'☀️';}
document.addEventListener('DOMContentLoaded',function(){
  var b=document.getElementById('theme-toggle-btn');
  if(b&&document.body.classList.contains('light'))b.textContent='🌙';
  loadProject();
  document.querySelectorAll('.req-thread').forEach(t => {
    t.addEventListener('show', () => loadComments(t.id.replace('feat-thread-','')));
  });
});
</script>
</body>
</html>`;
}

function buildBacklogHtml(p: { name: string; slug: string; color: string; colorRgb: string }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Backlog — ${p.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root { --dark: #0f1117; --darker: #080a0f; --card: #161b27; --card2: #1c2333; --accent: ${p.color}; --accent2: ${p.color}; --text: #e2e8f0; --muted: #64748b; --border: #1e2a3a; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: var(--darker); color: var(--text); }
.nav { background: rgba(8,10,15,0.95); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
.nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 40px; display: flex; align-items: center; gap: 8px; height: 52px; }
.nav-brand { text-decoration: none; display: flex; align-items: center; gap: 8px; margin-right: 12px; }
.nav-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent2); }
.nav-brand-text { font-size: 13px; font-weight: 700; color: var(--text); }
.nav-sep { color: var(--border); font-size: 18px; margin: 0 4px; }
.nav-links { display: flex; gap: 2px; }
.nav-link { text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--muted); }
.nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.nav-link.active { color: var(--accent2); background: rgba(${p.colorRgb},0.12); font-weight: 600; }
.theme-toggle { margin-left: auto; background: none; border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; }
.page-hdr { background: linear-gradient(135deg, #0f1117 0%, rgba(${p.colorRgb},0.08) 50%, #0f1117 100%); border-bottom: 1px solid var(--border); padding: 36px 40px 28px; }
.page-hdr-inner { max-width: 1100px; margin: 0 auto; }
.page-bc { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
.page-bc a { color: var(--muted); text-decoration: none; }
.page-title { font-size: clamp(22px, 3vw, 34px); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px; }
.page-title span { color: var(--accent2); }
.page-sub { color: var(--muted); font-size: 14px; }
.container { max-width: 1100px; margin: 0 auto; padding: 48px 40px; }
.placeholder { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 60px 40px; text-align: center; }
.placeholder-icon { font-size: 48px; margin-bottom: 16px; }
.placeholder-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.placeholder-sub { font-size: 14px; color: var(--muted); }
.footer { border-top: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 13px; }
.footer strong { color: var(--text); }
.footer-nav a { text-decoration: none; color: var(--muted); }
.footer-nav a:hover { color: var(--accent2); }
body.light { --darker: #f8fafc; --card: #ffffff; --card2: #f8fafc; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; }
body.light .nav { background: rgba(255,255,255,0.95); }
</style>
</head>
<body>
<script>if(localStorage.getItem('theme')==='light')document.body.classList.add('light');</script>
<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand"><div class="nav-brand-dot"></div><span class="nav-brand-text">${p.name}</span></a>
    <span class="nav-sep">|</span>
    <div class="nav-links">
      <a href="index.html" class="nav-link">Übersicht</a>
      <a href="konzept.html" class="nav-link">Konzept</a>
      <a href="backlog.html" class="nav-link active">Backlog</a>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()" id="theme-toggle-btn">☀️</button>
  </div>
</nav>
<div class="page-hdr">
  <div class="page-hdr-inner">
    <div class="page-bc"><a href="index.html">${p.name}</a> / Backlog</div>
    <div class="page-title">Backlog &amp; <span>User Stories</span></div>
    <div class="page-sub">Priorisierte User Stories für die Entwicklung</div>
  </div>
</div>
<div class="container">
  <div class="placeholder">
    <div class="placeholder-icon">📋</div>
    <div class="placeholder-title">Backlog wird aufgebaut</div>
    <div class="placeholder-sub">User Stories werden nach dem Kickoff-Termin gemeinsam definiert und priorisiert.</div>
  </div>
</div>
<div class="footer">
  <strong>${p.name} — Backlog</strong>
  <div class="footer-nav"><a href="konzept.html">← Konzept</a></div>
</div>
<script>
function toggleTheme(){var l=document.body.classList.toggle('light');localStorage.setItem('theme',l?'light':'dark');var b=document.getElementById('theme-toggle-btn');if(b)b.textContent=l?'🌙':'☀️';}
document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('theme-toggle-btn');if(b&&document.body.classList.contains('light'))b.textContent='🌙';});
</script>
</body>
</html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey !== Deno.env.get("ADMIN_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { slug, name, color, icon, laufzeit, budget, structured_data: sd } = await req.json();

    if (!slug || !name || !sd) throw new Error("slug, name und structured_data sind erforderlich");

    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const colorRgb = `${r},${g},${b}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const pat = Deno.env.get("GITHUB_PAT")!;

    // ── 1. Supabase: upsert project → get UUID ────────────────────────────────
    // Delete existing project with same slug first (cleanup from failed attempts)
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .single();
    if (existing) {
      // Cascade-delete domains → features → requirements
      const { data: existingDomains } = await supabase.from("domains").select("id").eq("project_id", existing.id);
      if (existingDomains && existingDomains.length > 0) {
        const domainIds = existingDomains.map((d: { id: string }) => d.id);
        const { data: existingFeatures } = await supabase.from("features").select("id").in("domain_id", domainIds);
        if (existingFeatures && existingFeatures.length > 0) {
          const featIds = existingFeatures.map((f: { id: string }) => f.id);
          await supabase.from("requirements").delete().in("feature_id", featIds);
          await supabase.from("features").delete().in("id", featIds);
        }
        await supabase.from("domains").delete().in("id", domainIds);
      }
      await supabase.from("projects").delete().eq("id", existing.id);
    }

    const { data: projRow, error: projErr } = await supabase
      .from("projects")
      .insert({ slug, name, color, icon })
      .select("id")
      .single();
    if (projErr || !projRow) throw new Error(`Project insert: ${projErr?.message}`);
    const projectId = projRow.id;

    // ── 2. Supabase: insert domains + features + requirements ──────────────────
    const features: Array<{ name: string; icon: string; requirements: string[] }> = sd.features || [];

    // Group: all in one domain if ≤5 features, else split Frontend/Backend
    const domainGroups: Array<{ name: string; icon: string; features: typeof features }> = [];
    if (features.length <= 5) {
      domainGroups.push({ name: "Features", icon: icon, features });
    } else {
      const mid = Math.ceil(features.length / 2);
      domainGroups.push({ name: "Frontend", icon: "🎨", features: features.slice(0, mid) });
      domainGroups.push({ name: "Backend", icon: "⚙️", features: features.slice(mid) });
    }

    const featureIdMap: Record<string, string> = {}; // name → id

    for (let di = 0; di < domainGroups.length; di++) {
      const dg = domainGroups[di];
      const domainSlug = dg.name.toLowerCase().replace(/\s+/g, "-");
      const { data: domain, error: domErr } = await supabase
        .from("domains")
        .insert({ project_id: projectId, slug: domainSlug, name: dg.name, icon: dg.icon, sort_order: di })
        .select("id")
        .single();
      if (domErr || !domain) throw new Error(`Domain insert: ${domErr?.message}`);

      for (let fi = 0; fi < dg.features.length; fi++) {
        const feat = dg.features[fi];
        const { data: featRow, error: featErr } = await supabase
          .from("features")
          .insert({ domain_id: domain.id, name: feat.name, sort_order: fi })
          .select("id")
          .single();
        if (featErr || !featRow) throw new Error(`Feature insert: ${featErr?.message}`);

        featureIdMap[feat.name] = featRow.id;

        const reqs = (feat.requirements || []).map((text: string, ri: number) => ({
          feature_id: featRow.id,
          text,
          sort_order: ri,
          is_tbd: false,
        }));
        if (reqs.length > 0) {
          const { error: reqErr } = await supabase.from("requirements").insert(reqs);
          if (reqErr) throw new Error(`Requirements insert: ${reqErr.message}`);
        }
      }
    }

    // ── 3. GitHub: commit HTML files ──────────────────────────────────────────
    const scopeItems = (sd.scope || []).map((s: string) => {
      const parts = s.split(":");
      if (parts.length > 1) return `          <li><strong>${parts[0].trim()}:</strong> ${parts.slice(1).join(":").trim()}</li>`;
      return `          <li><strong>${s}</strong></li>`;
    }).join("\n");

    const scopeInItems = (sd.scope || []).map((s: string) => `        <li>${s}</li>`).join("\n");
    const scopeOutItems = (sd.nicht_scope || []).map((s: string) => `        <li>${s}</li>`).join("\n");
    const heuteItems = (sd.heute || []).map((s: string) => `          <li>${s}</li>`).join("\n");
    const mitMvpItems = (sd.mit_mvp || []).map((s: string) => `          <li>${s}</li>`).join("\n");
    const kpiRows = (sd.kpis || []).map((k: { metrik: string; messung: string; ziel: string }) =>
      `          <tr><td><strong>${k.metrik}</strong></td><td>${k.messung}</td><td>${k.ziel}</td></tr>`
    ).join("\n");

    const indexHtml = buildIndexHtml({
      name, slug, icon, color, colorRgb,
      laufzeit: laufzeit || "—", budget: budget || "—",
      featureCount: features.length,
      problem: sd.problem || "", zielgruppe: sd.zielgruppe || "",
      hypothese: sd.hypothese || "",
      scopeItems, heuteItems, mitMvpItems, kpiRows,
    });

    const konzeptHtml = buildKonzeptHtml({ name, slug, color, colorRgb, scopeInItems, scopeOutItems });
    const backlogHtml = buildBacklogHtml({ name, slug, color, colorRgb });

    await githubPut(`mvp/${slug}/index.html`, indexHtml, `feat: ${name} — MVP Blueprint`, undefined, pat);
    await githubPut(`mvp/${slug}/konzept.html`, konzeptHtml, `feat: ${name} — Konzept`, undefined, pat);
    await githubPut(`mvp/${slug}/backlog.html`, backlogHtml, `feat: ${name} — Backlog Placeholder`, undefined, pat);

    // ── 4. Update projects.json ───────────────────────────────────────────────
    const projectsFile = await githubGet("projects.json", pat);
    if (projectsFile) {
      const current = JSON.parse(atob(projectsFile.content.replace(/\n/g, "")));
      current.push({ id: slug, name, type: "mvp", description: sd.problem?.substring(0, 100) || "", icon, path: `../mvp/${slug}/api/v1`, color });
      await githubPut("projects.json", JSON.stringify(current, null, 2) + "\n", `feat: ${name} in projects.json`, projectsFile.sha, pat);
    }

    const liveUrl = `https://g2fdaniel.github.io/build2scale/mvp/${slug}/`;
    return new Response(JSON.stringify({ success: true, url: liveUrl }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
