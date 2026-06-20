import * as cheerio from 'cheerio';

const BASE = 'https://internshala.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// City slug mapping for Internshala's path-based URLs
const CITY_SLUGS = {
  bengaluru: 'bangalore',
  bangalore: 'bangalore',
  mumbai: 'mumbai',
  hyderabad: 'hyderabad',
  pune: 'pune',
  delhi: 'delhi',
  gurgaon: 'delhi',    // Gurgaon grouped with Delhi
  noida: 'delhi',
  chennai: 'chennai',
  kolkata: 'kolkata',
};

export default {
  id: 'internshala',

  detect(company) {
    return company.internshala_id || company.careers_url?.includes('internshala.com');
  },

  async fetch(company, filters) {
    if (!company.internshala_id && !company.careers_url?.includes('internshala.com')) return [];
    const slug = company.internshala_id || extractSlug(company.careers_url);
    if (!slug) return [];

    try {
      const res = await fetch(`${BASE}/jobs/company/${slug}`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return [];
      return parseJobs(await res.text(), company.name, filters);
    } catch {
      return [];
    }
  },
};

// Global scan — used by scan.mjs to sweep Internshala for India jobs
export async function scanGlobal(filters) {
  const jobs = [];
  const urls = buildScanUrls(filters);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const batch = parseJobs(await res.text(), null, filters);
      jobs.push(...batch);
    } catch {
      continue;
    }
  }

  // Dedup by URL
  const seen = new Set();
  return jobs.filter(j => { if (seen.has(j.url)) return false; seen.add(j.url); return true; });
}

function buildScanUrls(filters) {
  const cities = filters.cities ?? [];
  const urls = [];

  // City-specific pages
  for (const city of cities) {
    const slug = CITY_SLUGS[city.toLowerCase()];
    if (slug) urls.push(`${BASE}/jobs/jobs-in-${slug}/`);
  }

  // Remote jobs always included
  urls.push(`${BASE}/jobs/work-from-home/`);

  // Keyword-based search
  if (filters.targetRoles?.length) {
    const kw = filters.targetRoles[0].toLowerCase().replace(/\s+/g, '-');
    urls.push(`${BASE}/jobs/${kw}-jobs/`);
  }

  return [...new Set(urls)]; // deduplicate URLs
}

function parseJobs(html, companyName, filters) {
  const $ = cheerio.load(html);
  const jobs = [];

  // Internshala job cards — SSR rendered. Verified selectors (2026):
  //   card:     .individual_internship
  //   title:    .job-internship-name
  //   company:  .company-name
  //   url:      data-href attribute (or first anchor)
  //   location: .locations / .row-1-item
  $('.individual_internship').each((_, el) => {
    const title = $(el).find('.job-internship-name').first().text().trim();
    const company = companyName
      || $(el).find('.company-name').first().text().trim();
    const location = $(el).find('.locations, .row-1-item, .location_link').first().text().trim();
    const salary = $(el).find('.stipend, .salary').first().text().trim();
    const href = $(el).attr('data-href')
      || $(el).find('a[href*="/job/detail/"]').first().attr('href')
      || $(el).find('a').first().attr('href');

    if (!title || !href) return;

    const url = href.startsWith('http') ? href : `${BASE}${href}`;
    if (!matchesFilters(title, location, filters)) return;

    jobs.push({ title, company, location, salary, url, source: 'internshala' });
  });

  return jobs;
}

function matchesFilters(title, location, filters) {
  const t = title.toLowerCase();
  const l = location.toLowerCase();
  if (filters.excludeKeywords?.some(k => t.includes(k.toLowerCase()))) return false;
  if (filters.cities?.length) {
    const cityMatch = filters.cities.some(c => l.includes(c.toLowerCase()))
      || filters.cities.some(c => CITY_SLUGS[c.toLowerCase()] && l.includes(CITY_SLUGS[c.toLowerCase()]));
    if (!cityMatch && !l.includes('remote') && !l.includes('work from home')) return false;
  }
  return true;
}

function extractSlug(url) {
  const m = url?.match(/internshala\.com\/(?:company\/)?([^/?#]+)/);
  return m ? m[1] : null;
}
