#!/usr/bin/env node
/**
 * push-blueprint.js — Inner Circle Club
 *
 * Liest die generierten api/v1/*.json-Files und sendet den Blueprint
 * an die FlowSuite External Blueprint API.
 *
 * Usage:
 *   node push-blueprint.js --api-key fsk_live_xxxxx --project-id UUID
 *   node push-blueprint.js --api-key fsk_live_xxxxx --project-id UUID --dry-run
 *   node push-blueprint.js --api-key fsk_live_xxxxx --project-id UUID --name "Mein Blueprint"
 *
 * Alternativ via Env-Vars:
 *   FLOWSUITE_API_KEY=fsk_live_xxxxx PROJECT_ID=UUID node push-blueprint.js
 */

const fs = require('fs');
const path = require('path');

// .env laden — zuerst Projekt-Verzeichnis, dann Root (für geteilten API-Key)
function loadEnv(dir) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim();
  });
}
loadEnv(__dirname);                      // Inner-Circle/.env → PROJECT_ID
loadEnv(path.join(__dirname, '..'));     // Build2Scale/.env  → FLOWSUITE_API_KEY

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = 'https://flowsuite.go2flow.com/api/v1/external/blueprints';
const API_DIR  = path.join(__dirname, 'api', 'v1');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--api-key':    result.apiKey    = args[++i]; break;
      case '--project-id': result.projectId = args[++i]; break;
      case '--name':       result.name      = args[++i]; break;
      case '--dry-run':    result.dryRun    = true;      break;
      case '--list':       result.list      = true;      break;
      case '--get':        result.get       = args[++i]; break;
      default:
        if (args[i].startsWith('--')) {
          console.error(`Unbekanntes Flag: ${args[i]}`);
          process.exit(1);
        }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Load generated JSON files
// ---------------------------------------------------------------------------
function loadJson(filename) {
  const filepath = path.join(API_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Fehler: ${filepath} nicht gefunden. Zuerst 'node generate-api.js' ausführen.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function loadQuestions() {
  const qPath = path.join(__dirname, 'questions.json');
  if (!fs.existsSync(qPath)) return [];
  return JSON.parse(fs.readFileSync(qPath, 'utf8'));
}

function buildPayload({ projectId, name, blueprintVersion }) {
  const index   = loadJson('index.json');
  const sData   = loadJson('stories.json');
  const mData   = loadJson('modules.json');
  const pData   = loadJson('phases.json');
  const rData   = loadJson('roles.json');
  const dData   = loadJson('domains.json');

  // Stories — direkte Übernahme
  const stories = sData.stories;

  // Modules — group_id → group (Name aus groups-Array auflösen)
  const groupMap = {};
  (mData.groups || []).forEach(g => { groupMap[g.id] = g.label; });

  const modules = mData.modules.map(m => ({
    id:          m.id,
    label:       m.name,
    group:       groupMap[m.group_id] || m.group_id,
    icon:        m.icon,
    description: m.description,
    story_ids:   m.story_ids,
  }));

  // Phases — direkte Übernahme
  const phases = pData.phases;

  // Roles — direkte Übernahme
  const roles = rData.roles;

  // Domains — direkte Übernahme
  const domains = dData.domains;

  // Open Questions — aus questions.json (immer frisch lesen)
  const questions = loadQuestions();

  return {
    project_id:        projectId,
    name:              name || 'Inner Circle Club Blueprint',
    version:           index.version,
    blueprint_version: blueprintVersion || index.blueprint_version,
    stories,
    modules,
    phases,
    roles,
    domains,
    ...(questions.length ? { questions } : {}),
  };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function request(method, url, { apiKey, body } = {}) {
  const headers = {
    'X-API-Key':    apiKey,
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function cmdPush({ apiKey, projectId, name, dryRun }) {
  if (!apiKey)    { console.error('Fehler: --api-key fehlt (oder FLOWSUITE_API_KEY setzen)'); process.exit(1); }
  if (!projectId) { console.error('Fehler: --project-id fehlt (oder PROJECT_ID setzen)');     process.exit(1); }

  console.log('Blueprint zusammenstellen …');
  const index   = loadJson('index.json');
  const payload = buildPayload({ projectId, name, blueprintVersion: index.blueprint_version });

  // Summary
  console.log('\n--- Payload Summary ---');
  console.log(`  Name:              ${payload.name}`);
  console.log(`  Version:           ${payload.version}`);
  console.log(`  Blueprint Version: ${payload.blueprint_version}`);
  console.log(`  Project ID:        ${payload.project_id}`);
  console.log(`  Stories:           ${payload.stories.length}`);
  console.log(`  Modules:           ${payload.modules.length}`);
  console.log(`  Phases:            ${payload.phases.length}`);
  console.log(`  Roles:             ${payload.roles.length}`);
  console.log(`  Domains:           ${payload.domains.length}`);
  if (payload.questions) {
    const open     = payload.questions.filter(q => q.status === 'open').length;
    const answered = payload.questions.filter(q => q.status === 'answered').length;
    console.log(`  Open Questions:    ${payload.questions.length} (${open} offen, ${answered} beantwortet)`);
  }
  console.log('-----------------------\n');

  if (dryRun) {
    console.log('Dry-run aktiv — kein Request gesendet.');
    console.log('\nPayload (kompakt):');
    const compact = { ...payload, stories: `[${payload.stories.length} stories]`, modules: `[${payload.modules.length} modules]` };
    console.log(JSON.stringify(compact, null, 2));
    return;
  }

  console.log(`POST ${BASE_URL}`);
  const { status, ok, data } = await request('POST', BASE_URL, { apiKey, body: payload });

  if (ok) {
    const bp = data.data;
    console.log('\nErfolgreich gesendet!');
    console.log(`  Blueprint ID: ${bp.id}`);
    console.log(`  Status:       ${bp.status}`);
    console.log(`  Projekt:      ${bp.project?.identifier} — ${bp.project?.name}`);
    console.log(`  Stats:        ${JSON.stringify(bp.stats)}`);
    console.log(`  Created at:   ${bp.created_at}`);
  } else {
    console.error(`\nFehler ${status}:`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

async function cmdList({ apiKey, projectId }) {
  if (!apiKey) { console.error('Fehler: --api-key fehlt'); process.exit(1); }

  let url = BASE_URL;
  const params = new URLSearchParams();
  if (projectId) params.set('project_id', projectId);
  params.set('per_page', '20');
  const qs = params.toString();
  if (qs) url += '?' + qs;

  console.log(`GET ${url}`);
  const { status, ok, data } = await request('GET', url, { apiKey });

  if (ok) {
    const items = data.data || [];
    console.log(`\n${data.total ?? items.length} Blueprint(s) gefunden:\n`);
    items.forEach(bp => {
      console.log(`  [${bp.id}]`);
      console.log(`    Name:    ${bp.name} (v${bp.version} · Blueprint ${bp.blueprint_version})`);
      console.log(`    Status:  ${bp.status}`);
      console.log(`    Stories: ${bp.stats?.total_stories ?? '?'}`);
      console.log(`    Projekt: ${bp.project_id}`);
      console.log(`    Created: ${bp.created_at}`);
      console.log('');
    });
  } else {
    console.error(`Fehler ${status}:`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

async function cmdGet({ apiKey, id }) {
  if (!apiKey) { console.error('Fehler: --api-key fehlt'); process.exit(1); }

  const url = `${BASE_URL}/${id}`;
  console.log(`GET ${url}`);
  const { status, ok, data } = await request('GET', url, { apiKey });

  if (ok) {
    const bp = data.data;
    console.log(`\nBlueprint: ${bp.name}`);
    console.log(`  ID:        ${bp.id}`);
    console.log(`  Status:    ${bp.status}`);
    console.log(`  Version:   ${bp.version} · Blueprint ${bp.blueprint_version}`);
    console.log(`  Stories:   ${bp.stories?.length ?? bp.stats?.total_stories ?? '?'}`);
    console.log(`  Modules:   ${bp.modules?.length ?? bp.stats?.modules ?? '?'}`);
    console.log(`  Phases:    ${bp.phases?.length ?? bp.stats?.phases ?? '?'}`);
    console.log(`  Created:   ${bp.created_at}`);
    console.log(`  Updated:   ${bp.updated_at}`);
  } else {
    console.error(`Fehler ${status}:`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs();

  // Fallback auf Env-Vars
  const apiKey    = args.apiKey    || process.env.FLOWSUITE_API_KEY;
  const projectId = args.projectId || process.env.PROJECT_ID;

  if (args.list) {
    await cmdList({ apiKey, projectId });
  } else if (args.get) {
    await cmdGet({ apiKey, id: args.get });
  } else {
    await cmdPush({ apiKey, projectId, name: args.name, dryRun: args.dryRun });
  }
}

main().catch(err => {
  console.error('Unerwarteter Fehler:', err.message);
  process.exit(1);
});
