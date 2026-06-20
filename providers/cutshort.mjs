import * as cheerio from 'cheerio';

const BASE = 'https://cutshort.io';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export default {
  id: 'cutshort',

  detect(company) {
    return company.cutshort_id || company.careers_url?.includes('cutshort.io');
  },

  async fetch(company, filters) {
    // If company has a specific cutshort URL, scrape their company page
    // Otherwise skip — cutshort is used as a global scan source via scan.mjs directly
    if (!company.cutshort_id && !company.careers_url?.includes('cutshort.io')) return [];

    const slug = company.cutshort_id || extractSlug(company.careers_url);
    if (!slug) return [];

    try {
      const url = `${BASE}/company/${slug}/jobs`;
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return [];

      const html = await res.text();
      return parseJobs(html, company.name, filters);
    } catch {
      return [];
    }
  },
};

export async function scanGlobal(filters, pages = 3) {
  const jobs = [];
  const seen = new Set();
  for (let page = 1; page <= pages; page++) {
    try {
      const url = buildSearchUrl(filters, page);
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) break;

      const html = await res.text();
      const batch = parseJobs(html, null, filters);
      // Cutshort's ?page=N can return identical content — stop once a page
      // yields no URLs we haven't already collected.
      const fresh = batch.filter(j => !seen.has(j.url));
      if (!fresh.length) break;
      fresh.forEach(j => seen.add(j.url));
      jobs.push(...fresh);
    } catch {
      break;
    }
  }
  return jobs;
}

function buildSearchUrl(filters, page) {
  const params = new URLSearchParams();
  if (filters.targetRoles?.length) params.set('query', filters.targetRoles[0]);
  if (filters.cities?.length) params.set('location', filters.cities[0]);
  if (page > 1) params.set('page', String(page));
  return `${BASE}/jobs?${params}`;
}

function parseJobs(html, companyName, filters) {
  const $ = cheerio.load(html);
  const byUrl = new Map();

  // Cutshort is a Next.js SPA. Job listings render as `/job/{slug}` anchors where
  // the slug encodes Title-Location-Company-ID. The same URL appears on several
  // anchors (title link, logo, "Apply now"); we dedupe by URL and prefer the
  // anchor whose text is a real title (not "Apply now" / empty).
  $('a[href*="/job/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const url = href.startsWith('http') ? href : `${BASE}${href}`;

    const text = $(el).text().trim();
    const slug = parseSlug(url);
    const title = (text && !/^apply\b/i.test(text)) ? text : slug;
    if (!title) return;

    // Cutshort encodes location in the slug (e.g. "...Mumbai-Myntra...").
    // Match the city filter against the whole slug rather than a parsed field.
    if (!matchesFilters(title, slug, filters)) return;
    if (!byUrl.has(url)) {
      const company = companyName || extractCompanyFromSlug(url) || 'Unknown';
      byUrl.set(url, { title, company, location: '', url, source: 'cutshort' });
    }
  });

  return [...byUrl.values()];
}

// Parse "/job/Sr-Engineering-Manager-Mumbai-Myntra-hwgJEJjM" → "Sr Engineering Manager Mumbai Myntra"
function parseSlug(url) {
  const m = url.match(/\/job\/([^/?#]+)/);
  if (!m) return '';
  const parts = m[1].split('-');
  parts.pop(); // drop the trailing ID
  return parts.join(' ');
}

function matchesFilters(title, location, filters) {
  const t = title.toLowerCase();
  const l = location.toLowerCase();
  if (filters.excludeKeywords?.some(k => t.includes(k.toLowerCase()))) return false;
  if (filters.cities?.length) {
    const cityMatch = filters.cities.some(c => l.includes(c.toLowerCase()));
    if (!cityMatch && !l.includes('remote')) return false;
  }
  return true;
}

function extractSlug(url) {
  const m = url?.match(/cutshort\.io\/(?:company\/)?([^/?#]+)/);
  return m ? m[1] : null;
}

// Extract company name from cutshort job slug: "/job/Role-City-CompanyName-ID"
// The segment before the trailing random ID tends to be the company name.
function extractCompanyFromSlug(url) {
  const m = url.match(/\/job\/([^/?#]+)/);
  if (!m) return null;
  const parts = m[1].split('-');
  if (parts.length < 3) return null;
  parts.pop(); // drop random ID
  // Heuristic: last 1-3 remaining parts are the company name
  return parts.slice(-2).join(' ');
}
