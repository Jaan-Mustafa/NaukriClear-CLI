#!/usr/bin/env node
// scan.mjs — Zero-token job scanner for NaukriClearCLI
// Hits ATS APIs directly (Greenhouse, Ashby, Lever) — no AI, no cost.
// Run: node scan.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const ROOT = process.cwd();
const PROFILE_FILE = resolve(ROOT, 'config/profile.yml');
const PORTALS_FILE = resolve(ROOT, 'config/portals.yml');
const PIPELINE_FILE = resolve(ROOT, 'data/pipeline.md');
const HISTORY_FILE = resolve(ROOT, 'data/scan-history.tsv');

async function loadYaml(path) {
  const text = readFileSync(path, 'utf8');
  try {
    const yaml = await import('js-yaml');
    return yaml.default.load(text);
  } catch {
    throw new Error(`Could not parse ${path}. Make sure js-yaml is installed: npm install`);
  }
}

// ── Providers ────────────────────────────────────────────────────────────────
async function loadProviders() {
  const names = ['greenhouse', 'ashby', 'lever', 'workable', 'smartrecruiters', 'recruitee', 'cutshort', 'internshala'];
  return Promise.all(
    names.map(n => import(`./providers/${n}.mjs`).then(m => m.default).catch(() => null))
  ).then(ps => ps.filter(Boolean));
}

async function runGlobalSweeps(filters) {
  const jobs = [];
  const sweeps = [
    ['cutshort', () => import('./providers/cutshort.mjs').then(m => m.scanGlobal(filters, 3))],
    ['internshala', () => import('./providers/internshala.mjs').then(m => m.scanGlobal(filters))],
  ];

  for (const [name, run] of sweeps) {
    try {
      process.stdout.write(`  ↻  ${name} global sweep… `);
      const batch = await run();
      process.stdout.write(`${batch.length} found\n`);
      jobs.push(...batch);
    } catch {
      process.stdout.write(`skipped\n`);
    }
  }
  return jobs;
}

// ── History (dedup) ──────────────────────────────────────────────────────────
function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return new Set();
  return new Set(
    readFileSync(HISTORY_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => line.split('\t')[0])
  );
}

function appendHistory(jobs) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = jobs.map(j => `${j.url}\tpending\t${today}\t${j.company}\t${j.title}`);
  const existing = existsSync(HISTORY_FILE) ? readFileSync(HISTORY_FILE, 'utf8') : '';
  writeFileSync(HISTORY_FILE, existing + lines.join('\n') + (lines.length ? '\n' : ''));
}

// ── Pipeline writer ──────────────────────────────────────────────────────────
function appendToPipeline(jobs) {
  if (!existsSync(dirname(PIPELINE_FILE))) mkdirSync(dirname(PIPELINE_FILE), { recursive: true });

  const header = `# Pipeline — Pending URLs\n\nPaste job URLs below as \`- [ ] {url}\` then run \`/nc evaluate\`.\n\n## Pending\n\n`;
  const existing = existsSync(PIPELINE_FILE) ? readFileSync(PIPELINE_FILE, 'utf8') : header;
  const newLines = jobs.map(j => `- [ ] ${j.url} | ${j.company} | ${j.title}`).join('\n');
  const updated = existing.trimEnd() + '\n' + newLines + '\n';
  writeFileSync(PIPELINE_FILE, updated);
}

// ── Concurrency helper ───────────────────────────────────────────────────────
async function withConcurrency(tasks, limit) {
  const results = [];
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const task = queue.shift();
      try { results.push(await task()); }
      catch { results.push([]); }
    }
  });
  await Promise.all(workers);
  return results.flat();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(PROFILE_FILE)) {
    console.error('[nc scan] config/profile.yml not found.');
    console.error('          Copy config/profile.example.yml → config/profile.yml and fill in your details.');
    process.exit(1);
  }
  if (!existsSync(PORTALS_FILE)) {
    console.error('[nc scan] config/portals.yml not found.');
    console.error('          Copy config/portals.example.yml → config/portals.yml and add companies to track.');
    process.exit(1);
  }

  const profile = await loadYaml(PROFILE_FILE);
  const portals = await loadYaml(PORTALS_FILE);
  const providers = await loadProviders();

  const filters = {
    cities: profile.target_roles?.cities ?? [],
    excludeKeywords: profile.target_roles?.exclude_keywords ?? [],
    targetRoles: profile.target_roles?.primary ?? [],
  };

  const companies = portals.companies ?? [];
  const concurrency = portals.scan?.concurrency ?? 10;
  const seen = loadHistory();

  console.log(`\n[nc scan] Scanning ${companies.length} companies…\n`);

  const tasks = companies.map(company => async () => {
    const provider = providers.find(p => p.detect(company));
    if (!provider) {
      console.log(`  ⚠  ${company.name} — no provider detected, skipping`);
      return [];
    }

    try {
      const jobs = await provider.fetch(company, filters);
      const fresh = jobs.filter(j => j.url && !seen.has(j.url));
      if (fresh.length) process.stdout.write(`  ✓  ${company.name} — ${fresh.length} new\n`);
      return fresh;
    } catch (e) {
      console.log(`  ✗  ${company.name} — ${e.message}`);
      return [];
    }
  });

  const companyJobs = await withConcurrency(tasks, concurrency);

  // Global sweeps — Cutshort, Internshala
  console.log(`\n[nc scan] Running India portal sweeps…\n`);
  const sweepJobs = await runGlobalSweeps(filters);

  const allJobs = [...companyJobs, ...sweepJobs];

  // Dedup against history AND within this run (two sources can surface one URL)
  const seenThisRun = new Set();
  const newJobs = allJobs.filter(j => {
    if (!j.url || seen.has(j.url) || seenThisRun.has(j.url)) return false;
    seenThisRun.add(j.url);
    return true;
  });

  console.log(`\n─────────────────────────────────────────────`);
  console.log(`  Company portals (ATS): ${companyJobs.length} jobs`);
  console.log(`  India sweeps (Cutshort / Internshala): ${sweepJobs.length} jobs`);
  console.log(`  New (after dedup): ${newJobs.length}`);
  console.log(`─────────────────────────────────────────────\n`);

  if (!newJobs.length) {
    console.log('[nc scan] No new jobs found. Try adding more companies to config/portals.yml');
    return;
  }

  appendToPipeline(newJobs);
  appendHistory(newJobs);
  console.log(`[nc scan] ${newJobs.length} jobs added to data/pipeline.md`);

  // Auto-sync to NaukriClear if enabled
  const syncEnabled = profile.integrations?.naukriClear?.autoSync;
  if (syncEnabled) {
    console.log('\n[nc scan] Auto-syncing to NaukriClear…');
    const { default: sync } = await import('./sync.mjs');
    await sync(profile);
  } else {
    console.log('\n[nc scan] Run `node sync.mjs` to push jobs to your NaukriClear dashboard.');
  }
}

main().catch(e => {
  console.error('[nc scan] Fatal error:', e.message);
  process.exit(1);
});
