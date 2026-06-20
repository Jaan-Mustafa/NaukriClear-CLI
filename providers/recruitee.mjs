// Recruitee provider — hits the public per-tenant offers API.
// No auth required. Auto-detects from <slug>.recruitee.com careers_url
// or explicit recruitee_id in portals.yml.

const RECRUITEE_HOST_RE = /^[a-z0-9][a-z0-9-]*\.recruitee\.com$/;

export default {
  id: 'recruitee',

  detect(company) {
    if (company.recruitee_id) return true;
    const url = company.careers_url || '';
    try {
      return RECRUITEE_HOST_RE.test(new URL(url).hostname);
    } catch {
      return false;
    }
  },

  async fetch(company, filters) {
    const apiUrl = resolveApiUrl(company);
    if (!apiUrl) return [];
    try {
      const res = await fetch(apiUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return parseOffers(json, company.name, filters);
    } catch {
      return [];
    }
  },
};

function resolveApiUrl(company) {
  if (company.recruitee_id) {
    return `https://${company.recruitee_id}.recruitee.com/api/offers/`;
  }
  try {
    const parsed = new URL(company.careers_url || '');
    if (RECRUITEE_HOST_RE.test(parsed.hostname)) {
      return `https://${parsed.hostname}/api/offers/`;
    }
  } catch {}
  return null;
}

function parseOffers(json, companyName, filters) {
  const offers = Array.isArray(json?.offers) ? json.offers : [];
  const jobs = [];
  for (const j of offers) {
    const city = j.city || '';
    const country = j.country || '';
    const remote = j.remote ? 'Remote' : '';
    const location = j.location || [city, country, remote].filter(Boolean).join(', ');

    // Validate URL — must be on recruitee.com subdomain
    let url = '';
    const rawUrl = j.careers_url || j.url || '';
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === 'https:' && RECRUITEE_HOST_RE.test(parsed.hostname)) {
          url = parsed.href;
        }
      } catch {}
    }
    if (!url) continue;

    const title = j.title || '';
    if (!matchesFilters(title, location, filters)) continue;
    jobs.push({ title, url, company: companyName, location, source: 'recruitee' });
  }
  return jobs;
}

function matchesFilters(title, location, filters) {
  const t = title.toLowerCase();
  const l = location.toLowerCase();
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
