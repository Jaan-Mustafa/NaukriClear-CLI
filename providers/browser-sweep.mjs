// browser-sweep.mjs — Playwright-based job scanner for sites that block plain HTTP.
// Covers: Naukri, SmartRecruiters career pages.
// Strategy: launch headless:false browser (passes Cloudflare), intercept API responses.
//
// Run via scan.mjs when `browser_sweep: true` in portals.yml scan block,
// or called directly: node providers/browser-sweep.mjs

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const STEALTH_SCRIPT = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  window.chrome = { runtime: {} };
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US', 'en'] });
};

async function launchBrowser() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1280, height: 800 },
  });
  return { browser, ctx };
}

// ── Naukri ──────────────────────────────────────────────────────────────────

const NAUKRI_SEARCH_CONFIGS = [
  { keyword: 'software engineer', location: 'bangalore' },
  { keyword: 'backend engineer', location: 'bangalore' },
  { keyword: 'full stack developer', location: 'bangalore' },
  { keyword: 'software developer', location: 'hyderabad' },
  { keyword: 'backend developer', location: 'mumbai' },
];

async function scanNaukri(filters) {
  const { browser, ctx } = await launchBrowser();
  const jobs = [];
  const seen = new Set();

  try {
    const page = await ctx.newPage();
    await page.addInitScript(STEALTH_SCRIPT);

    // Warm up session on homepage first
    process.stdout.write('    [naukri] warming up session… ');
    await page.goto('https://www.naukri.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    process.stdout.write('done\n');

    for (const config of NAUKRI_SEARCH_CONFIGS) {
      const pending = [];   // track in-flight promises
      const intercepted = [];
      const handler = res => {
        if (process.env.NC_DEBUG && res.url().includes('naukri.com')) {
          console.log(`\n      [debug] response: ${res.status()} ${res.url().slice(0, 80)}`);
        }
        if (res.url().includes('/jobapi/v3/search') && res.status() === 200) {
          if (process.env.NC_DEBUG) console.log(`\n      [debug] INTERCEPTED job search response!`);
          const p = res.json().then(j => intercepted.push(j)).catch(() => {});
          pending.push(p);
        }
      };
      page.on('response', handler);

      const kw = config.keyword.replace(/\s+/g, '-');
      const url = `https://www.naukri.com/${kw}-jobs-in-${config.location}-0?experience=0&sort=1`;
      process.stdout.write(`    [naukri] ${config.keyword} in ${config.location}… `);
      if (process.env.NC_DEBUG) console.log(`\n      [debug] navigating to: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await page.waitForTimeout(3500);
      } catch {
        process.stdout.write('timeout\n');
        page.off('response', handler);
        continue;
      }

      // Wait for all in-flight response bodies to resolve before reading intercepted
      await Promise.allSettled(pending);
      page.off('response', handler);

      for (const data of intercepted) {
        const items = data.jobDetails || [];
        if (process.env.NC_DEBUG) console.log(`\n      [debug] data keys: ${Object.keys(data).join(', ')}`);
        if (process.env.NC_DEBUG) console.log(`      [debug] jobDetails count: ${items.length}`);
        if (process.env.NC_DEBUG && items.length > 0) {
          const sample = items[0];
          console.log(`      [debug] sample job keys: ${Object.keys(sample).join(', ')}`);
          console.log(`      [debug] sample title: ${sample.title}, jdURL: ${sample.jdURL?.slice(0, 60)}, placeholders: ${JSON.stringify(sample.placeholders?.[0])}`);
        }
        for (const j of items) {
          const jobUrl = j.jdURL
            ? (j.jdURL.startsWith('http') ? j.jdURL : `https://www.naukri.com${j.jdURL}`)
            : null;
          if (!jobUrl || seen.has(jobUrl)) continue;
          const title = j.title || '';
          const company = j.companyName || '';
          const location = j.placeholders?.[0]?.label || config.location;
          if (!matchesFilters(title, location, filters)) continue;
          seen.add(jobUrl);
          jobs.push({ title, company, location, url: jobUrl, source: 'naukri' });
        }
      }
      process.stdout.write(`${jobs.length} total\n`);
    }
  } finally {
    await browser.close();
  }
  return jobs;
}

// ── SmartRecruiters (browser fallback) ──────────────────────────────────────

async function scanSmartRecruiters(companies, filters) {
  if (!companies.length) return [];
  const { browser, ctx } = await launchBrowser();
  const jobs = [];

  try {
    const page = await ctx.newPage();
    await page.addInitScript(STEALTH_SCRIPT);

    for (const company of companies) {
      const slug = company.smartrecruiters_id;
      if (!slug) continue;

      const pending = [];
      const intercepted = [];
      const handler = res => {
        if (res.url().includes('api.smartrecruiters.com') && res.status() === 200) {
          const p = res.json().then(j => intercepted.push(j)).catch(() => {});
          pending.push(p);
        }
      };
      page.on('response', handler);

      process.stdout.write(`    [smartrecruiters] ${company.name}… `);
      try {
        await page.goto(`https://careers.smartrecruiters.com/${slug}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await page.waitForTimeout(3500);
      } catch {
        process.stdout.write('timeout\n');
        page.off('response', handler);
        continue;
      }
      await Promise.allSettled(pending);
      page.off('response', handler);

      for (const data of intercepted) {
        const items = data.content || [];
        for (const j of items) {
          const loc = j.location || {};
          const location = loc.fullLocation || [loc.city, loc.country].filter(Boolean).join(', ');
          const title = j.name || '';
          if (!matchesFilters(title, location, filters)) continue;

          let url = '';
          if (j.ref) {
            try {
              const p = new URL(j.ref);
              if (p.hostname === 'api.smartrecruiters.com') {
                url = 'https://jobs.smartrecruiters.com' + p.pathname.slice('/v1/companies'.length);
              }
            } catch {}
          }
          if (!url && j.id) url = `https://jobs.smartrecruiters.com/${slug}/${j.id}`;
          if (!url) continue;
          jobs.push({ title, company: company.name, location, url, source: 'smartrecruiters' });
        }
      }
      process.stdout.write(`${intercepted.reduce((s, d) => s + (d.content?.length || 0), 0)} jobs\n`);
    }
  } finally {
    await browser.close();
  }
  return jobs;
}

// ── Filter helper ────────────────────────────────────────────────────────────

function matchesFilters(title, location, filters) {
  const t = (title || '').toLowerCase();
  const l = (location || '').toLowerCase();
  if (filters.excludeKeywords?.some(k => t.includes(k.toLowerCase()))) return false;
  if (filters.cities?.length) {
    const cityMatch = filters.cities.some(c => l.includes(c.toLowerCase()));
    if (!cityMatch && !l.includes('remote')) return false;
  }
  if (filters.targetRoles?.length) {
    const roleKeywords = filters.targetRoles.flatMap(r => r.toLowerCase().split(/\s+/));
    if (!roleKeywords.some(k => t.includes(k))) return false;
  }
  return true;
}

// ── Exported sweep function (called by scan.mjs) ─────────────────────────────

export async function runBrowserSweep(filters, companies = []) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.log('  [browser-sweep] Playwright not installed — skipping.');
    console.log('  Run: npx playwright install chromium');
    return [];
  }

  const jobs = [];

  // Naukri sweep
  process.stdout.write('\n  ↻  naukri browser sweep…\n');
  try {
    const naukriJobs = await scanNaukri(filters);
    process.stdout.write(`  ✓  naukri — ${naukriJobs.length} jobs\n`);
    jobs.push(...naukriJobs);
  } catch (e) {
    process.stdout.write(`  ✗  naukri — ${e.message}\n`);
  }

  // SmartRecruiters browser fallback for companies in portals.yml
  const srCompanies = companies.filter(c => c.smartrecruiters_id);
  if (srCompanies.length) {
    process.stdout.write('\n  ↻  smartrecruiters browser sweep…\n');
    try {
      const srJobs = await scanSmartRecruiters(srCompanies, filters);
      process.stdout.write(`  ✓  smartrecruiters — ${srJobs.length} jobs\n`);
      jobs.push(...srJobs);
    } catch (e) {
      process.stdout.write(`  ✗  smartrecruiters — ${e.message}\n`);
    }
  }

  return jobs;
}

// ── Standalone run ────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('browser-sweep.mjs')) {
  const ROOT = process.cwd();
  const filters = {
    cities: ['Bengaluru', 'Bangalore', 'Hyderabad', 'Mumbai', 'Pune', 'Remote', 'Delhi NCR'],
    excludeKeywords: ['intern', 'iOS', 'Android', 'QA', 'manager'],
    targetRoles: ['Software Engineer', 'SDE', 'Backend Engineer', 'Full Stack Engineer', 'Frontend Engineer', 'Engineer', 'Developer'],
  };

  let companies = [];
  try {
    const yaml = await import('js-yaml');
    const portals = yaml.default.load(readFileSync(resolve(ROOT, 'config/portals.yml'), 'utf8'));
    companies = portals.companies || [];
  } catch {}

  const jobs = await runBrowserSweep(filters, companies);
  console.log(`\nTotal: ${jobs.length} jobs`);
  jobs.slice(0, 5).forEach(j => console.log(` - ${j.title} | ${j.company} | ${j.url}`));
}
