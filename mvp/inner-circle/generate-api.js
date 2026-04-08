// Inner Circle Club — Blueprint API Generator
// Liest stories.js und generiert alle JSON-Files nach api/v1/
// Ausführen: node generate-api.js

const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '');
}

function now() {
  return new Date().toISOString();
}

// ─── stories.js laden ─────────────────────────────────────────────────────────

const raw = fs.readFileSync(path.join(__dirname, 'stories.js'), 'utf8');

let STORIES;
try {
  const match = raw.match(/const STORIES\s*=\s*(\{[\s\S]+?\});\s*$/m);
  if (!match) throw new Error('Regex kein Match');
  STORIES = JSON.parse(match[1]);
} catch (e) {
  // Fallback: vm module für JS-Objekte mit trailing commas
  const vm = require('vm');
  try {
    // 'const' in vm.runInNewContext landet nicht im sandbox — daher ersetzen
    const modified = raw.replace(/^const STORIES\s*=/m, 'STORIES =');
    const sandbox = { STORIES: undefined };
    vm.runInNewContext(modified, sandbox);
    STORIES = sandbox.STORIES;
  } catch (e2) {
    throw new Error('stories.js konnte weder per JSON.parse noch vm geladen werden: ' + e2.message);
  }
}

console.log(`✓ stories.js geladen — ${Object.keys(STORIES).length} Stories`);

// ─── Statische Metadaten ──────────────────────────────────────────────────────

const MODULES_META = {
  M01: { name: 'Auth & Invitation',        group: 'A', icon: '🔐', desc: 'Gated Entry, Splash Page, Login, Passwort-Reset, Admin-Einladungen, Member-Referrals',                version: 'v1.0', scope: 'MVP' },
  M02: { name: 'Member Management',         group: 'A', icon: '👥', desc: 'Member-Verwaltung, Company-Zuordnung, Rabattstufen-Konfiguration',                                    version: 'v1.0', scope: 'MVP' },
  M03: { name: 'Produktfeed & Katalog',     group: 'B', icon: '🛍️', desc: 'Feed-Import (GM+CYS), Produktkatalog, Detailseite, Varianten als Colorpicker',                       version: 'v1.0', scope: 'MVP' },
  M04: { name: 'Club-Pricing',              group: 'B', icon: '🏷️', desc: 'UVP durchgestrichen, Club-Preis prominent, Company-Rabattstufen, Checkout-Integration',             version: 'v1.0', scope: 'MVP' },
  M05: { name: 'Checkout & Orders',         group: 'C', icon: '💳', desc: 'Warenkorb mit Club-Preisen, IceHawk-Checkout-Integration, Bestellhistorie',                          version: 'v1.0', scope: 'MVP' },
  M06: { name: 'Admin Backend',             group: 'C', icon: '⚙️', desc: '/marketing-api/inner-circle — Member, Companies, Einladungen, Dashboard-Kennzahlen',                version: 'v1.0', scope: 'MVP' },
  M07: { name: 'Wunschliste',               group: 'C', icon: '❤️', desc: 'Favoriten-Funktion — in DB persistiert, direkter Warenkorb-Button',                                  version: 'v1.0', scope: 'MVP' },
  M08: { name: 'Public Landing Page',       group: 'D', icon: '🌐', desc: 'Öffentliche Club-Bewerbungsseite mit Einladungs-CTA, SEO-optimiert',                                  version: 'v1.0', scope: 'MVP' },
};

const GROUPS = {
  A: { label: 'Auth, Invitation & Member Management',   modules: ['M01','M02'] },
  B: { label: 'Produkte, Katalog & Club-Pricing',        modules: ['M03','M04'] },
  C: { label: 'Checkout, Admin & Wunschliste',           modules: ['M05','M06','M07'] },
  D: { label: 'Public Landing Page',                     modules: ['M08'] },
};

const PHASES_META = [
  {
    id: 'P1', name: 'Foundation & Auth-System',
    goal: 'Projekt-Setup, DB-Schema, Gated Entry Middleware, Splash Page, Login, Invitation-System',
    weeks: '1–2', week_start: 1, week_end: 2,
    story_ids: ['US-01-1','US-01-2','US-01-3','US-01-4','US-01-5','US-01-6','US-01-7'],
    modules_involved: ['M01'],
    milestones: [{ label: 'Club-Login funktioniert, Einladungen können versendet und angenommen werden, alle Seiten hinter Middleware', type: 'checkpoint' }]
  },
  {
    id: 'P2', name: 'Member-Verwaltung, Produktkatalog & Club-Pricing',
    goal: 'Admin-Interface, Feed-Import, Produktanzeige mit Colorpicker, UVP/Club-Preis Darstellung',
    weeks: '3–4', week_start: 3, week_end: 4,
    story_ids: ['US-02-1','US-02-2','US-02-3','US-02-4','US-03-1','US-03-2','US-03-3','US-03-4','US-04-1','US-04-2','US-04-3','US-06-1'],
    modules_involved: ['M02','M03','M04','M06'],
    milestones: [{ label: 'Produktkatalog mit Club-Preisen vollständig, Admin-Backend für Member/Companies nutzbar', type: 'checkpoint' }]
  },
  {
    id: 'P3', name: 'Checkout, Wunschliste & Admin-Erweiterungen',
    goal: 'Warenkorb mit Club-Preisen, Checkout-Integration, Bestellhistorie, Wunschliste, Admin-Dashboard',
    weeks: '5–6', week_start: 5, week_end: 6,
    story_ids: ['US-05-1','US-05-2','US-05-3','US-06-2','US-06-3','US-07-1'],
    modules_involved: ['M05','M06','M07'],
    milestones: [{ label: 'Abnahme I — Vollständiger MVP-Core abgenommen: Auth, Produkte, Pricing, Checkout, Admin', type: 'acceptance', acceptance_number: 1 }]
  },
  {
    id: 'P4', name: 'Polish, Public Landing Page & Go-Live',
    goal: 'Public Landing Page, Admin-Dashboard, QA, Security-Check, finales Deployment',
    weeks: '7–8', week_start: 7, week_end: 8,
    story_ids: ['US-06-4','US-08-1','US-08-2'],
    modules_involved: ['M06','M08'],
    milestones: [{ label: 'Abnahme II — Go-Live: Inner Circle Club produktiv, Fortuneglobe nimmt ab', type: 'acceptance', acceptance_number: 2 }]
  },
];

const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Fortuneglobe Mitarbeiter mit vollständigem Zugriff auf das Inner Circle Backend. Verwaltet Member, Companies, Einladungen und Kennzahlen.',
    domain_access: ['admin-backend'],
    story_ids: ['US-01-4','US-02-1','US-02-2','US-02-3','US-02-4','US-06-1','US-06-2','US-06-3','US-06-4']
  },
  {
    id: 'member',
    label: 'Member',
    description: 'Eingeladenes Club-Mitglied mit Zugang zum Inner Circle Shop. Kann Produkte kaufen, Wunschliste führen und bis zu 5 Freunde einladen.',
    domain_access: ['club-shop'],
    story_ids: ['US-01-2','US-01-3','US-01-6','US-03-2','US-03-3','US-03-4','US-04-1','US-05-1','US-05-2','US-05-3','US-07-1']
  },
  {
    id: 'guest',
    label: 'Guest',
    description: 'Nicht eingeloggter Besucher — kein Zugriff auf Club-Inhalte. Wird zur Splash-Page weitergeleitet.',
    domain_access: ['public'],
    story_ids: ['US-01-1','US-01-7','US-08-1','US-08-2']
  },
];

const DOMAINS = [
  {
    id: 'club-shop', label: 'Inner Circle Club Shop', url: 'https://pierre-cardin.de/inner-circle',
    auth_required: true, allowed_roles: ['member'],
    description: 'Geschlossener Club-Shop — ausschliesslich für eingeloggte Members. Alle Seiten hinter Middleware.',
    story_ids: ['US-01-2','US-01-3','US-01-7','US-03-2','US-03-3','US-03-4','US-04-1','US-04-2','US-04-3','US-05-1','US-05-2','US-05-3','US-07-1']
  },
  {
    id: 'admin-backend', label: 'Admin Backend', url: 'https://pierre-cardin.de/marketing-api/inner-circle',
    auth_required: true, allowed_roles: ['admin'],
    description: 'Inner Circle Verwaltungsbereich — Member, Companies, Einladungen, Dashboard. Integriert in bestehenden Marketing-Tool-Bereich.',
    story_ids: ['US-01-4','US-02-1','US-02-2','US-02-3','US-02-4','US-06-1','US-06-2','US-06-3','US-06-4']
  },
  {
    id: 'public', label: 'Public Landing Page', url: 'https://pierre-cardin.de/inner-circle/club',
    auth_required: false, allowed_roles: [],
    description: 'Öffentliche Club-Bewerbungsseite — ohne Login zugänglich. SEO-optimiert, mit Einladungs-CTA.',
    story_ids: ['US-08-1','US-08-2']
  },
  {
    id: 'splash', label: 'Club Splash / Login', url: 'https://pierre-cardin.de/inner-circle/login',
    auth_required: false, allowed_roles: [],
    description: 'Club Splash Page und Login-Formular — 50/50 Split (Lifestyle-Bild + Login-Box). Ziel der Middleware-Weiterleitung.',
    story_ids: ['US-01-1','US-01-2','US-01-3','US-01-5']
  },
];

// ─── Baue Stories-Array ───────────────────────────────────────────────────────

const storiesArray = Object.entries(STORIES).map(([id, s]) => {
  const module_id = (s.mod || '').split(' ')[0];
  return {
    id,
    title: s.title || '',
    module_id,
    module_label: s.mod || '',
    scope: s.scope || 'MVP',
    phase: s.phase || null,
    size: s.size || null,
    story_html: s.story || '',
    story_text: stripHtml(s.story || ''),
    acceptance_criteria: s.ac || [],
    note: s.note || null,
  };
});

const mvpStories     = storiesArray.filter(s => s.scope === 'MVP');
const postMvpStories = storiesArray.filter(s => s.scope === 'Post-MVP');

// ─── Baue Module-Array ────────────────────────────────────────────────────────

const modulesArray = Object.entries(MODULES_META).map(([id, m]) => {
  const allIds  = storiesArray.filter(s => s.module_id === id).map(s => s.id);
  const mvpIds  = allIds.filter(sid => STORIES[sid] && STORIES[sid].scope === 'MVP');
  const postIds = allIds.filter(sid => STORIES[sid] && STORIES[sid].scope === 'Post-MVP');
  return {
    id,
    label: `${id} · ${m.name}`,
    name: m.name,
    group_id: m.group,
    icon: m.icon,
    description: m.desc,
    version: m.version,
    scope: m.scope,
    story_ids: allIds,
    mvp_story_ids: mvpIds,
    post_mvp_story_ids: postIds,
  };
});

// ─── Baue Gruppen ─────────────────────────────────────────────────────────────

const groupsArray = Object.entries(GROUPS).map(([id, g]) => ({ id, label: g.label, modules: g.modules }));

// ─── Open Questions laden ─────────────────────────────────────────────────────

let openQuestions = [];
const qPath = path.join(__dirname, 'questions.json');
if (fs.existsSync(qPath)) {
  openQuestions = JSON.parse(fs.readFileSync(qPath, 'utf8'));
  console.log(`✓ questions.json geladen — ${openQuestions.length} Fragen`);
}

// ─── Output-Verzeichnis anlegen ───────────────────────────────────────────────

const OUT = path.join(__dirname, 'api', 'v1');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'api'), { recursive: true });

const GENERATED_AT = now();
const BASE_URL = 'https://build2scale.go2flow.com/inner-circle/api/v1';

function write(filename, data) {
  const filepath = path.join(OUT, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ api/v1/${filename} geschrieben`);
}

// ─── 1. stories.json ──────────────────────────────────────────────────────────

write('stories.json', {
  meta: {
    count: storiesArray.length,
    mvp_count: mvpStories.length,
    post_mvp_count: postMvpStories.length,
    generated_at: GENERATED_AT,
  },
  stories: storiesArray,
});

// ─── 2. modules.json ──────────────────────────────────────────────────────────

write('modules.json', {
  meta: {
    count: modulesArray.length,
    generated_at: GENERATED_AT,
  },
  groups: groupsArray,
  modules: modulesArray,
});

// ─── 3. phases.json ───────────────────────────────────────────────────────────

const phasesWithCounts = PHASES_META.map(p => ({ ...p, story_count: p.story_ids.length }));

write('phases.json', {
  meta: {
    count: PHASES_META.length,
    total_weeks: 8,
    mvp_stories: mvpStories.length,
    generated_at: GENERATED_AT,
  },
  phases: phasesWithCounts,
});

// ─── 4. roles.json ────────────────────────────────────────────────────────────

write('roles.json', {
  meta: {
    count: ROLES.length,
    generated_at: GENERATED_AT,
  },
  roles: ROLES,
});

// ─── 5. domains.json ──────────────────────────────────────────────────────────

write('domains.json', {
  meta: {
    count: DOMAINS.length,
    generated_at: GENERATED_AT,
  },
  domains: DOMAINS,
});

// ─── 6. open-questions.json ───────────────────────────────────────────────────

if (openQuestions.length) {
  const openCount     = openQuestions.filter(q => q.status === 'open').length;
  const answeredCount = openQuestions.filter(q => q.status === 'answered').length;
  write('open-questions.json', {
    meta: {
      count: openQuestions.length,
      open_count: openCount,
      answered_count: answeredCount,
      generated_at: GENERATED_AT,
    },
    questions: openQuestions,
  });
}

// ─── 7. v1/index.json ─────────────────────────────────────────────────────────

write('index.json', {
  api: 'Inner Circle Club Blueprint API',
  version: '1.0.0',
  blueprint_version: '1.2',
  generated_at: GENERATED_AT,
  base_url: BASE_URL,
  description: 'Statische Blueprint-API für den Inner Circle Club. Alle Planungsdaten maschinenlesbar.',
  endpoints: {
    stories:        `${BASE_URL}/stories.json`,
    modules:        `${BASE_URL}/modules.json`,
    phases:         `${BASE_URL}/phases.json`,
    roles:          `${BASE_URL}/roles.json`,
    domains:        `${BASE_URL}/domains.json`,
    open_questions: `${BASE_URL}/open-questions.json`,
  },
  stats: {
    total_stories:    storiesArray.length,
    mvp_stories:      mvpStories.length,
    post_mvp_stories: postMvpStories.length,
    modules:          modulesArray.length,
    phases:           PHASES_META.length,
    roles:            ROLES.length,
    domains:          DOMAINS.length,
    open_questions:   openQuestions.length,
  },
});

// ─── 8. api/index.json (Root-Pointer) ─────────────────────────────────────────

const rootIndex = { latest: 'v1', v1: `${BASE_URL}/index.json` };
fs.writeFileSync(path.join(__dirname, 'api', 'index.json'), JSON.stringify(rootIndex, null, 2), 'utf8');
console.log('✓ api/index.json geschrieben');

console.log(`\n✅ API generiert — ${storiesArray.length} Stories, ${modulesArray.length} Module, ${PHASES_META.length} Phasen`);
console.log(`   → ${BASE_URL}/index.json`);
