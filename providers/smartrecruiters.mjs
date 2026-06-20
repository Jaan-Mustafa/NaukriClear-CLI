// SmartRecruiters provider — hits the public postings API.
// No auth required. Auto-detects from careers.smartrecruiters.com or
// jobs.smartrecruiters.com careers_url, or explicit smartrecruiters_id.

const SR_PAGE_SIZE = 100;
const SR_MAX_PAGES = 10; // cap at 1000 postings

export default {
  id: 'smartrecruiters',

  detect(company) {
    return company.smartrecruiters_id
      || company.careers_url?.includes('smartrecruiters.com');
  },

  async fetch(company, filters) {
    const slug = company.smartrecruiters_id || extractSlug(company.careers_url);
    if (!slug) return [];

    const all = [];
    for (let page = 0; page < SR_MAX_PAGES; page++) {
      const offset = page * SR_PAGE_SIZE;
      const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=${SR_PAGE_SIZE}&offset=${offset}&status=PUBLIC`;
      try {
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) break;
        const json = await res.json();
        const items = Array.isArray(json?.content) ? json.content : [];
        if (!items.length) break;
        const batch = items
          .map(j => parsePosting(j, company.name, slug))
          .filter(j => j.url && matchesFilters(j.title, j.location, filters));
        all.push(...batch);
        if (items.length < SR_PAGE_SIZE) break;
      } catch {
        break;
      }
    }
    return all;
  },
};

function extractSlug(url) {
  const m = url?.match(/smartrecruiters\.com\/([^/?#]+)/);
  return m ? m[1] : null;
}

function parsePosting(j, companyName, slug) {
  const loc = j.location || {};
  const fullLocation = loc.fullLocation
    || [loc.city, loc.region, loc.country].filter(Boolean).join(', ');
  const location = loc.remote ? [fullLocation, 'Remote'].filter(Boolean).join(', ') : fullLocation;

  // Rewrite api.smartrecruiters.com → jobs.smartrecruiters.com
  let url = '';
  if (typeof j.ref === 'string') {
    try {
      const parsed = new URL(j.ref);
      if (parsed.hostname === 'api.smartrecruiters.com'
          && parsed.pathname.startsWith('/v1/companies/')) {
        url = 'https://jobs.smartrecruiters.com' + parsed.pathname.slice('/v1/companies'.length);
      }
    } catch {}
  }
  if (!url && j.id && slug) {
    const titleSlug = (j.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    url = `https://jobs.smartrecruiters.com/${slug}/${j.id}-${titleSlug}`;
  }

  return { title: j.name || '', url, company: companyName, location, source: 'smartrecruiters' };
}

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
