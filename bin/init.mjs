#!/usr/bin/env node
// NaukriClear CLI — init script
// Run: npx @naukriclear/cli init
// Clones the latest release into ./naukriclear-cli and sets it up.

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, cpSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// import.meta.dirname is Node 20.11+; derive it for Node 18 compatibility
const HERE = dirname(fileURLToPath(import.meta.url));

const REPO = 'https://github.com/naukriclear/cli';   // update when repo is live
const DIR  = 'naukriclear-cli';
const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

function log(msg)    { console.log(`  ${msg}`); }
function ok(msg)     { console.log(`  ${GREEN}✓${RESET}  ${msg}`); }
function info(msg)   { console.log(`  ${CYAN}→${RESET}  ${msg}`); }
function warn(msg)   { console.log(`  ${YELLOW}!${RESET}  ${msg}`); }
function step(title) { console.log(`\n${BOLD}${title}${RESET}`); }

async function main() {
  console.log(`
${BOLD}${CYAN}NaukriClear CLI — India-first AI job search pipeline${RESET}
${'─'.repeat(52)}
`);

  // ── 1. Clone or download ────────────────────────────────────────────────────
  step('Setting up NaukriClear CLI…');

  if (existsSync(DIR)) {
    warn(`Directory ./${DIR} already exists — skipping clone.`);
  } else {
    info(`Creating ./${DIR}/`);
    mkdirSync(DIR, { recursive: true });

    // Copy bundled files (when run via npx, HERE is the package's bin/ dir)
    const pkg = resolve(HERE, '..');
    copyDir(pkg, resolve(DIR));
    ok('Files copied');
  }

  const target = resolve(DIR);

  // ── 2. Install dependencies ──────────────────────────────────────────────────
  step('Installing dependencies…');
  const npm = spawnSync('npm', ['install', '--prefix', target, '--silent'], { stdio: 'inherit' });
  if (npm.status !== 0) {
    warn('npm install failed. Try running it manually: npm install');
  } else {
    ok('Dependencies installed');
  }

  // ── 3. Copy example configs if not present ───────────────────────────────────
  step('Setting up config files…');

  const cfgDir = join(target, 'config');
  mkdirSync(cfgDir, { recursive: true });
  mkdirSync(join(target, 'data'), { recursive: true });

  copyIfMissing(
    join(cfgDir, 'profile.example.yml'),
    join(cfgDir, 'profile.yml'),
    'config/profile.yml — fill in your name, target roles, and CTC'
  );
  copyIfMissing(
    join(cfgDir, 'portals.example.yml'),
    join(cfgDir, 'portals.yml'),
    'config/portals.yml — add companies to track'
  );

  // Create blank cv.md if missing
  const cvFile = join(target, 'cv.md');
  if (!existsSync(cvFile)) {
    writeFileSync(cvFile, '# My CV\n\nPaste your CV here in markdown format.\n');
    ok('cv.md created — paste your CV here');
  }

  // ── 4. Check Claude Code ─────────────────────────────────────────────────────
  step('Checking Claude Code…');
  const claudeCheck = spawnSync('claude', ['--version'], { stdio: 'pipe' });
  if (claudeCheck.status === 0) {
    ok(`Claude Code found: ${claudeCheck.stdout?.toString().trim()}`);
  } else {
    warn('Claude Code not found. Install it:');
    log('   npm install -g @anthropic-ai/claude-code');
  }

  // ── 5. Done ──────────────────────────────────────────────────────────────────
  console.log(`
${'─'.repeat(52)}
${GREEN}${BOLD}Ready!${RESET} Here's what to do next:

  ${CYAN}1.${RESET} Fill in your profile:
     ${BOLD}nano ${DIR}/config/profile.yml${RESET}
     → Set your name, target roles, CTC (in LPA), and NaukriClear API key

  ${CYAN}2.${RESET} Add companies to track:
     ${BOLD}nano ${DIR}/config/portals.yml${RESET}

  ${CYAN}3.${RESET} Open Claude Code in the CLI directory:
     ${BOLD}cd ${DIR} && claude${RESET}

  ${CYAN}4.${RESET} Inside Claude Code, run:
     ${BOLD}/nc scan${RESET}   — zero-token scan of all portals
     ${BOLD}/nc sync${RESET}   — push jobs to NaukriClear dashboard

  ${CYAN}5.${RESET} Open NaukriClear → Discover → Terminal Jobs to browse results.

  Get your API key: ${CYAN}https://naukriclear.com/settings${RESET}
${'─'.repeat(52)}
`);
}

function copyIfMissing(src, dest, label) {
  if (existsSync(dest)) {
    ok(`${label} — already exists`);
    return;
  }
  if (existsSync(src)) {
    copyFileSync(src, dest);
    ok(label);
  }
}

function copyDir(src, dest) {
  // Cross-platform recursive copy (works on Windows; no rsync dependency).
  const SKIP = new Set(['node_modules', '.git', 'bin']);
  cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const rel = s.slice(src.length + 1).split(/[\\/]/)[0];
      return !SKIP.has(rel);
    },
  });
}

main().catch(e => {
  console.error('\nSetup failed:', e.message);
  process.exit(1);
});
