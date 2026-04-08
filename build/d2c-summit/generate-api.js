// D2C Summit — Blueprint API Generator
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
  M01: { name: 'Event Engine',            group: 'A', icon: '🔁', desc: 'Kernmodul — jedes andere Modul ist einem Event zugeordnet.',                                  version: 'v1.0', scope: 'MVP' },
  M02: { name: 'Programm-Manager',        group: 'A', icon: '🗓️', desc: 'Tagesplan — einmal erfassen, überall anzeigen (Website, My Summit, Admin).',                  version: 'v1.0', scope: 'MVP' },
  M03: { name: 'Speaker-Management',      group: 'A', icon: '🎤', desc: 'Speaker-Verwaltung im Admin — Self-Service Portal folgt Post-MVP.',                           version: 'v1.0', scope: 'MVP' },
  M04: { name: 'Unternehmens-Profile',    group: 'B', icon: '🏢', desc: 'Unternehmen als eigene Entität — Tickets und Teilnehmer einem Brand zuordnen.',               version: 'v1.2', scope: 'MVP' },
  M05: { name: 'Teilnehmer-Verwaltung',   group: 'B', icon: '👥', desc: 'Alle Attendees im Überblick — mit Unternehmens-Verknüpfung und Kommunikations-Status.',       version: 'v1.2', scope: 'MVP' },
  M06: { name: 'Ticket-System via Payrexx', group: 'B', icon: '💳', desc: 'Vollständiger Ticketkauf — Payrexx Checkout, QR-Code, Bestätigungsmail, Voucher.',          version: 'v1.0', scope: 'MVP' },
  M07: { name: 'Rollen & Rechte',         group: 'C', icon: '🔐', desc: 'Vollständige Berechtigungs-Architektur von Tag 1 — 7 Rollen, pro Event vergeben.',            version: 'v1.0', scope: 'MVP' },
  M08: { name: 'My Summit — Basis',       group: 'C', icon: '🪪', desc: 'Fundament des Teilnehmer-Portals — vollständiger Ausbau Post-MVP.',                           version: 'v1.0', scope: 'MVP' },
  M09: { name: 'Sponsor-Verwaltung',      group: 'C', icon: '⭐', desc: 'Sponsor-Pakete, Zuweisung und Website-Darstellung — über Unternehmens-Profile (M04).',        version: 'v1.0', scope: 'MVP' },
  M10: { name: 'Kommunikations-Basis',    group: 'D', icon: '📧', desc: 'Transaktionale Mails + gezielte Teilnehmer-Updates via Mailtrap.',                            version: 'v1.0', scope: 'MVP' },
  M11: { name: 'Statistiken',             group: 'D', icon: '📊', desc: 'Echtzeit-Überblick für den Organizer — Ticket-Sales und Check-in im MVP.',                    version: 'v1.0', scope: 'MVP' },
  M12: { name: 'Public Website',          group: 'E', icon: '🌐', desc: 'Vollständige öffentliche Eventseite — aus dem Backend gespeist, SSR, SEO-optimiert.',         version: 'v1.0', scope: 'MVP' },
  M13: { name: 'Check-in & Badge-Druck',  group: 'E', icon: '📱', desc: 'Zwei Einlass-Spuren + automatischer Etikettendruck via Brother QL-820NWB.',                  version: 'v1.3', scope: 'MVP' },
  M14: { name: 'Blog / News',             group: 'F', icon: '📰', desc: 'Content-Management für Artikel und Neuigkeiten rund um den Event.',                           version: 'v1.3', scope: 'Post-MVP' },
  M15: { name: 'Presse-Bereich',          group: 'F', icon: '📢', desc: 'Press Kit, Pressemitteilungen und Akkreditierungs-Workflow für Journalisten.',                 version: 'v1.3', scope: 'Post-MVP' },
  M16: { name: 'Location — KKL Luzern',  group: 'F', icon: '🏛️', desc: 'Anreise-Infos, Hotel-Empfehlungen und KKL-Fotos für Teilnehmer.',                            version: 'v1.3', scope: 'Post-MVP' },
  M17: { name: 'Kontakt & Formulare',     group: 'F', icon: '📬', desc: 'Kategorisiertes Kontaktformular + Anfragen-Verwaltung im Admin.',                             version: 'v1.3', scope: 'Post-MVP' },
  M18: { name: 'Foto-Galerie / Media-Archiv', group: 'F', icon: '📸', desc: 'Event-Fotogalerie mit Lightbox und Download für Teilnehmer.',                            version: 'v1.3', scope: 'Post-MVP' },
  M19: { name: 'Mehrsprachigkeit DE / EN', group: 'F', icon: '🌍', desc: 'Zweisprachige Website — Inhalte pro Sprache im Admin pflegbar.',                             version: 'v1.3', scope: 'Post-MVP' },
};

const GROUPS = {
  A: { label: 'Core Platform — Event, Programm & Speaker',   modules: ['M01','M02','M03'] },
  B: { label: 'Unternehmen & Teilnehmer',                    modules: ['M04','M05','M06'] },
  C: { label: 'Rollen, Admin & Portale',                     modules: ['M07','M08','M09'] },
  D: { label: 'Kommunikation & Statistiken',                 modules: ['M10','M11'] },
  E: { label: 'Frontends & Event-Tools',                     modules: ['M12','M13'] },
  F: { label: 'Post-MVP — Website, Content & Services',      modules: ['M14','M15','M16','M17','M18','M19'] },
};

const PHASES_META = [
  {
    id: 'P1', name: 'Foundation & Rollen-Architektur',
    goal: 'Projekt-Setup, Datenbankschema, alle 4 Domains aufgesetzt, Rollen-Middleware, Event-Grundgerüst',
    weeks: '1–2', week_start: 1, week_end: 2,
    story_ids: ['US-07-1','US-07-2','US-01-1','US-01-2'],
    modules_involved: ['M07','M01'],
    milestones: [{ label: 'Alle 4 Domains erreichbar, Rollen-Auth funktioniert, Event-Grundstruktur in DB', type: 'checkpoint' }]
  },
  {
    id: 'P2', name: 'Event-Branding, Programm, Speaker & Public Website',
    goal: 'Erste sichtbare Oberfläche — Website steht, Programm und Speaker öffentlich pflegbar',
    weeks: '3–4', week_start: 3, week_end: 4,
    story_ids: ['US-01-3','US-02-1','US-02-2','US-02-3','US-03-1','US-03-2','US-12-1','US-12-2','US-12-3','US-12-4','US-12-5'],
    modules_involved: ['M01','M02','M03','M12'],
    milestones: [{ label: 'Öffentliche Website live, Programm und Speaker sichtbar', type: 'checkpoint' }]
  },
  {
    id: 'P3', name: 'Unternehmen, Teilnehmer & Ticket-System',
    goal: 'Unternehmens-Profile, Teilnehmerverwaltung, vollständiger Payrexx-Checkout, Voucher',
    weeks: '5–6', week_start: 5, week_end: 6,
    story_ids: ['US-04-1','US-04-2','US-04-3','US-04-4','US-05-1','US-05-2','US-05-3','US-05-4','US-06-1','US-06-2','US-06-3','US-06-4','US-06-5'],
    modules_involved: ['M04','M05','M06'],
    milestones: [{ label: 'Ticket-Checkout vollständig, Payrexx aktiv, QR-Code-Mail läuft', type: 'checkpoint' }]
  },
  {
    id: 'P4', name: 'Sponsoren & Kommunikation',
    goal: 'Sponsor-Pakete, E-Mail-Automationen, Trigger-Mails',
    weeks: '7–8', week_start: 7, week_end: 8,
    story_ids: ['US-09-1','US-09-2','US-09-3','US-10-1','US-10-2','US-10-3'],
    modules_involved: ['M09','M10'],
    milestones: [{ label: 'Abnahme I — Plattform bis P4 abgenommen', type: 'acceptance', acceptance_number: 1 }]
  },
  {
    id: 'P5', name: 'My Summit, Statistiken & Check-in',
    goal: 'My Summit Portal, QR-Check-in, automatischer Badge-Druck, Live-Statistiken',
    weeks: '9–10', week_start: 9, week_end: 10,
    story_ids: ['US-08-1','US-08-2','US-08-3','US-11-1','US-11-2','US-13-1','US-13-2','US-13-3','US-13-4','US-13-5'],
    modules_involved: ['M08','M11','M13'],
    milestones: [{ label: 'My Summit live, Check-in und Badge-Druck produktiv getestet', type: 'checkpoint' }]
  },
  {
    id: 'P6', name: 'QA, Security-Hardening & Go-Live',
    goal: 'End-to-End-Tests, Security-Audit, Performance-Optimierung, finales Deployment auf Production',
    weeks: '11–12', week_start: 11, week_end: 12,
    story_ids: [],
    modules_involved: [],
    milestones: [{ label: 'Abnahme II — Go-Live', type: 'acceptance', acceptance_number: 2 }]
  },
];

const ROLES = [
  { id: 'super_admin',     label: 'Super Admin',     description: 'Vollzugriff auf alle Events und Systemkonfiguration. Legt andere Benutzer und Rollen an.',                                      domain_access: ['admin'],   story_ids: ['US-07-1','US-07-2'] },
  { id: 'organizer',       label: 'Organizer',        description: 'Verwaltet ein konkretes Event vollständig: Programm, Speaker, Teilnehmer, Tickets, E-Mails, Statistiken.',                       domain_access: ['admin'],   story_ids: ['US-01-1','US-01-2','US-01-3','US-02-1','US-02-2','US-03-1','US-03-2','US-04-1','US-04-2','US-04-3','US-04-4','US-05-1','US-05-2','US-05-3','US-05-4','US-06-1','US-06-4','US-06-5','US-09-1','US-09-2','US-10-1','US-10-2','US-10-3','US-11-1','US-11-2','US-13-4','US-13-5'] },
  { id: 'sponsor_manager', label: 'Sponsor Manager',  description: 'Verwaltet Sponsor-Pakete und Sponsor-Zuweisungen. Eingeschränkter Admin-Zugang.',                                               domain_access: ['admin'],   story_ids: ['US-09-1','US-09-2','US-09-3'] },
  { id: 'attendee',        label: 'Attendee',          description: 'Registrierter Teilnehmer mit Zugang zum My Summit Portal.',                                                                       domain_access: ['my'],      story_ids: ['US-08-1','US-08-2','US-08-3','US-06-2','US-06-3'] },
  { id: 'speaker',         label: 'Speaker',           description: 'Referent mit Zugang zum My Summit Portal für Profilpflege.',                                                                      domain_access: ['my'],      story_ids: ['US-03-3','US-08-1'] },
  { id: 'sponsor',         label: 'Sponsor',           description: 'Sponsor-Kontakt mit Zugang zum Sponsor-Portal im My Summit (Post-MVP).',                                                          domain_access: ['my'],      story_ids: ['US-09-4'] },
  { id: 'checkin',         label: 'Check-in',          description: 'Check-in-Personal am Registrationstisch. Zugriff ausschliesslich auf die Check-in Domain.',                                       domain_access: ['checkin'], story_ids: ['US-13-1','US-13-2','US-13-3','US-13-4','US-13-5'] },
];

const DOMAINS = [
  {
    id: 'public', label: 'Public Website', url: 'https://d2c-summit.ch',
    auth_required: false, allowed_roles: [],
    description: 'Öffentliche Event-Website ohne Authentifizierung. Homepage, Programm, Speaker, Sponsoren, FAQ, Ticketkauf.',
    story_ids: ['US-12-1','US-12-2','US-12-3','US-12-4','US-12-5','US-06-2','US-09-3']
  },
  {
    id: 'my', label: 'My Summit', url: 'https://my.d2c-summit.ch',
    auth_required: true, allowed_roles: ['attendee','speaker','sponsor'],
    description: 'Persönliches Portal für Teilnehmer, Speaker und Sponsoren. Login erforderlich, rollenbasierte Ansicht.',
    story_ids: ['US-08-1','US-08-2','US-08-3','US-08-4','US-08-5','US-03-3','US-09-4']
  },
  {
    id: 'admin', label: 'Admin Portal', url: 'https://admin.d2c-summit.ch',
    auth_required: true, allowed_roles: ['super_admin','organizer','sponsor_manager'],
    description: 'Vollständiges Admin-Backend. Event-Management, Teilnehmerverwaltung, Ticket-System, Kommunikation, Statistiken.',
    story_ids: ['US-01-1','US-01-2','US-01-3','US-02-1','US-02-2','US-03-1','US-03-2','US-04-1','US-04-2','US-04-3','US-04-4','US-05-1','US-05-2','US-05-3','US-05-4','US-06-1','US-06-4','US-06-5','US-07-1','US-07-2','US-09-1','US-09-2','US-10-1','US-10-2','US-10-3','US-11-1','US-11-2','US-13-4','US-13-5']
  },
  {
    id: 'checkin', label: 'Check-in Terminal', url: 'https://checkin.d2c-summit.ch',
    auth_required: true, allowed_roles: ['checkin'],
    description: 'Dedizierte Check-in-Oberfläche für Scanner und Self-Service-Kiosk. Minimales UI, optimiert für Tablet und USB-Scanner.',
    story_ids: ['US-13-1','US-13-2','US-13-3','US-13-4','US-13-5']
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

const mvpStories    = storiesArray.filter(s => s.scope === 'MVP');
const postMvpStories = storiesArray.filter(s => s.scope === 'Post-MVP');

// ─── Baue Module-Array ────────────────────────────────────────────────────────

const modulesArray = Object.entries(MODULES_META).map(([id, m]) => {
  const allIds     = storiesArray.filter(s => s.module_id === id).map(s => s.id);
  const mvpIds     = allIds.filter(sid => STORIES[sid] && STORIES[sid].scope === 'MVP');
  const postIds    = allIds.filter(sid => STORIES[sid] && STORIES[sid].scope === 'Post-MVP');
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

// ─── Output-Verzeichnis anlegen ───────────────────────────────────────────────

const OUT = path.join(__dirname, 'api', 'v1');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'api'), { recursive: true });

const GENERATED_AT = now();
const BASE_URL = 'https://courzly.github.io/build2scale/api/v1';

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
    total_weeks: 12,
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

// ─── 6. v1/index.json ─────────────────────────────────────────────────────────

write('index.json', {
  api: 'D2C Summit Platform Blueprint API',
  version: '1.0.0',
  blueprint_version: '1.6',
  generated_at: GENERATED_AT,
  base_url: BASE_URL,
  description: 'Statische Blueprint-API für die D2C Summit Platform. Alle Planungsdaten maschinenlesbar. Externes Design kann frei aufgelegt werden.',
  endpoints: {
    stories: `${BASE_URL}/stories.json`,
    modules: `${BASE_URL}/modules.json`,
    phases:  `${BASE_URL}/phases.json`,
    roles:   `${BASE_URL}/roles.json`,
    domains: `${BASE_URL}/domains.json`,
  },
  stats: {
    total_stories:    storiesArray.length,
    mvp_stories:      mvpStories.length,
    post_mvp_stories: postMvpStories.length,
    modules:          modulesArray.length,
    phases:           PHASES_META.length,
    roles:            ROLES.length,
    domains:          DOMAINS.length,
  },
});

// ─── 7. api/index.json (Root-Pointer) ─────────────────────────────────────────

const rootIndex = { latest: 'v1', v1: `${BASE_URL}/index.json` };
fs.writeFileSync(path.join(__dirname, 'api', 'index.json'), JSON.stringify(rootIndex, null, 2), 'utf8');
console.log('✓ api/index.json geschrieben');

console.log(`\n✅ API generiert — ${storiesArray.length} Stories, ${modulesArray.length} Module, ${PHASES_META.length} Phasen`);
console.log(`   → ${BASE_URL}/index.json`);
