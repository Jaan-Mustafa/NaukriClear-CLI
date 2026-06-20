#!/usr/bin/env node
// sync.mjs — Push pipeline jobs to NaukriClear dashboard.
// Runs automatically after scan (if autoSync: true), or manually: node sync.mjs

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const PROFILE_FILE = resolve(ROOT, 'config/profile.yml');
const PIPELINE_FILE = resolve(ROOT, 'data/pipeline.md');
const NAUKRICLEAR_API = 'https://api.naukriclear.com';
const BATCH_SIZE = 50;

function parsePipeline() {
  if (!existsSync(PIPELINE_FILE)) return [];
  const jobs = [];
  for (const line of readFileSync(PIPELINE_FILE, 'utf8').split('\n')) {
    const m = line.match(/^- \[ \]\s+(https?:\/\/\S+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$/);
    if (!m) continue;
    jobs.push({ jobUrl: m[1], company: m[2].trim(), role: m[3].trim() });
  }
  return jobs;
}

async function pushBatch(evaluations, apiKey) {
  const res = await fetch(`${NAUKRICLEAR_API}/api/naukriclear-cli/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ evaluations }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function run(profile) {
  // Support both direct call (with profile object) and standalone script
  if (!profile) {
    const yaml = await import('js-yaml');
    const text = readFileSync(PROFILE_FILE, 'utf8');
    profile = yaml.default.load(text);
  }

  const apiKey = profile?.integrations?.naukriClear?.apiKey;
  if (!apiKey || apiKey === 'nc_your_token_here') {
    console.log('[nc sync] No API key configured. Add your NaukriClear token to config/profile.yml');
    console.log('          integrations:\n            naukriClear:\n              apiKey: "nc_your_token_here"');
    return;
  }

  const jobs = parsePipeline().filter(j => j.company?.trim());
  if (!jobs.length) {
    console.log('[nc sync] data/pipeline.md is empty — run node scan.mjs first.');
    return;
  }

  // Push all pipeline jobs every time — NaukriClear upserts by URL.
  // This ensures jobs deleted from the dashboard are re-added on next sync.
  console.log(`[nc sync] Pushing ${jobs.length} jobs to NaukriClear…`);
  const today = new Date().toISOString().slice(0, 10);
  let totalSynced = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const evaluations = batch.map(j => ({
      company: j.company,
      role: j.role,
      jobUrl: j.jobUrl,
      grade: null,
      score: null,
      status: 'pending',
      date: today,
      keywords: [],
    }));
    const result = await pushBatch(evaluations, apiKey);
    totalSynced += result.synced ?? batch.length;
  }

  console.log(`[nc sync] Done — ${totalSynced} jobs synced. Open NaukriClear → Discover → Terminal Jobs.`);
}

export default run;

// Run standalone if called directly
if (process.argv[1]?.endsWith('sync.mjs')) {
  run(null).catch(e => { console.error('[nc sync] Error:', e.message); process.exit(1); });
}
