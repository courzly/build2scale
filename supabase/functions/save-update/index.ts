import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const GITHUB_REPO = "g2fdaniel/build2scale";
const GITHUB_BRANCH = "master";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey !== Deno.env.get("ADMIN_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { project_slug, diff, updated_structured_data } = await req.json();
    // updated_structured_data has same shape as create-project structured_data
    // (the admin UI merges the diff into the current data before calling this)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const pat = Deno.env.get("GITHUB_PAT")!;

    // 1. Get project UUID from slug
    const { data: projRow } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", project_slug)
      .single();
    if (!projRow) throw new Error(`Projekt nicht gefunden: ${project_slug}`);
    const projectId = projRow.id;

    // 2. Delete existing domains/features/requirements (cascade via project_id)
    const { data: existingDomains } = await supabase
      .from("domains")
      .select("id")
      .eq("project_id", projectId);

    if (existingDomains && existingDomains.length > 0) {
      const domainIds = existingDomains.map((d: { id: string }) => d.id);
      const { data: existingFeatures } = await supabase
        .from("features")
        .select("id")
        .in("domain_id", domainIds);

      if (existingFeatures && existingFeatures.length > 0) {
        const featIds = existingFeatures.map((f: { id: string }) => f.id);
        await supabase.from("requirements").delete().in("feature_id", featIds);
        await supabase.from("feature_status").delete().in("feature_id", featIds);
        await supabase.from("feature_comments").delete().in("feature_id", featIds);
        await supabase.from("features").delete().in("id", featIds);
      }
      await supabase.from("domains").delete().in("id", domainIds);
    }

    // 3. Re-insert features from updated_structured_data
    const features = updated_structured_data.features || [];
    if (features.length > 0) {
      const { data: domain, error: domErr } = await supabase
        .from("domains")
        .insert({ project_id: projectId, slug: "features", name: "Features", icon: "⚙️", sort_order: 1 })
        .select("id")
        .single();
      if (domErr || !domain) throw new Error(`Domain insert failed: ${domErr?.message}`);

      for (let fi = 0; fi < features.length; fi++) {
        const feat = features[fi];
        const { data: featRow, error: featErr } = await supabase
          .from("features")
          .insert({ domain_id: domain.id, name: feat.name, sort_order: fi })
          .select("id")
          .single();
        if (featErr || !featRow) throw new Error(`Feature insert failed: ${featErr?.message}`);

        const reqs = (feat.requirements || []).map((text: string, ri: number) => ({
          feature_id: featRow.id,
          text,
          sort_order: ri,
          is_tbd: false,
        }));
        if (reqs.length > 0) {
          const { error: reqErr } = await supabase.from("requirements").insert(reqs);
          if (reqErr) throw new Error(`Requirements insert failed: ${reqErr.message}`);
        }
      }
    }

    // 3. Update index.html on GitHub (rebuild from updated_structured_data)
    // Delegate HTML generation to a shared helper (same logic as create-project)
    // For now, we trigger the create-project logic by calling it internally
    // Since we can't easily share code between edge functions, we'll rebuild inline

    // Get current project metadata (name, color, icon etc.) from DB
    const { data: proj } = await supabase
      .from("projects")
      .select("name, color, icon")
      .eq("slug", project_slug)
      .single();

    if (proj) {
      const hex = proj.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const colorRgb = `${r},${g},${b}`;

      const sd = updated_structured_data;
      const scopeItems = (sd.scope || []).map((s: string) => `          <li><strong>${s.split(":")[0] || s}:</strong> ${s.split(":").slice(1).join(":").trim() || ""}</li>`).join("\n");
      const heuteItems = (sd.heute || []).map((s: string) => `          <li>${s}</li>`).join("\n");
      const mitMvpItems = (sd.mit_mvp || []).map((s: string) => `          <li>${s}</li>`).join("\n");
      const kpiRows = (sd.kpis || []).map((k: { metrik: string; messung: string; ziel: string }) =>
        `          <tr><td><strong>${k.metrik}</strong></td><td>${k.messung}</td><td>${k.ziel}</td></tr>`
      ).join("\n");

      const indexHtml = buildIndexHtml({
        name: proj.name, slug: project_slug, icon: proj.icon,
        color: proj.color, colorRgb, laufzeit: sd.laufzeit || "—",
        budget: sd.budget || "—", featureCount: features.length,
        problem: sd.problem, zielgruppe: sd.zielgruppe, hypothese: sd.hypothese,
        scopeItems, heuteItems, mitMvpItems, kpiRows,
      });

      const existingIndex = await githubGet(`mvp/${project_slug}/index.html`, pat);
      await githubPut(
        `mvp/${project_slug}/index.html`,
        indexHtml,
        `update: ${proj.name} — Blueprint aktualisiert`,
        existingIndex?.sha,
        pat
      );
    }

    return new Response(JSON.stringify({ success: true }), {
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

// Shared HTML builder (duplicated from create-project for edge function isolation)
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
    <h1>${p.name.split(" ").slice(0, -1).join(" ")}<br><span>${p.name.split(" ").slice(-1)[0]}</span></h1>
    <div class="hero-sub">${p.problem}</div>
    <div class="metrics-row">
      <div class="metric-card"><div class="metric-value">${p.laufzeit}</div><div class="metric-label">Lieferzeit</div></div>
      <div class="metric-card"><div class="metric-value gold">${p.budget}</div><div class="metric-label">Fixpreis Build</div></div>
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
