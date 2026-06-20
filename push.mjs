#!/usr/bin/env node
// push.mjs — Fetch latest jobs AND push them to NaukriClear in one step.
// Runs: scan (fetch new jobs → pipeline.md) → sync (push pipeline → NaukriClear)
// Forces the sync even if autoSync is disabled in profile.yml.
//
// Run: node push.mjs   (or /nc push inside Claude Code)

import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const node = process.execPath;

function run(script) {
  const result = spawnSync(node, [resolve(HERE, script)], { stdio: 'inherit' });
  return result.status === 0;
}

console.log('\n[nc push] Step 1/2 — Scanning portals for latest jobs…');
run('scan.mjs');

console.log('\n[nc push] Step 2/2 — Pushing everything to NaukriClear…');
const ok = run('sync.mjs');

if (ok) {
  console.log('\n[nc push] ✓ Done. Open NaukriClear → Discover → Terminal Jobs.');
} else {
  console.log('\n[nc push] Sync reported an issue — check the output above.');
}
