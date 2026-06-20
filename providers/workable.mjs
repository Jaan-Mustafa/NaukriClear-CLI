// Workable provider — hits the public markdown feed at /<slug>/jobs.md.
// No auth required. Auto-detects from apply.workable.com careers_url
// or explicit workable_id in portals.yml.

export default {
  id: 'workable',

  detect(company) {
    return company.workable_id || company.careers_url?.includes('apply.workable.com');
  },

  async fetch(company, filters) {
    const slug = company.workable_id || extractSlug(company.careers_url);
    if (!slug) return [];

    const feedUrl = `https://apply.workable.com/${slug}/jobs.md`;
    try {
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) return [];
      const text = await res.text();
      return parseMarkdown(text, company.name, filters);
    } catch {
      return [];
    }
  },
};

function extractSlug(url) {
  const m = url?.match(/apply\.workable\.com\/([^/?#]+)/);
  return m ? m[1] : null;
}

// Workable's markdown feed table:
// | Title | Department | Location | Type | Salary | Posted | Details |
// Details cell contains [View](https://apply.workable.com/<slug>/jobs/view/<id>.md)
function parseMarkdown(text, companyName, filters) {
  const jobs = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|') || !line.includes('[View]')) continue;
    const cols = line.split('|').map(c => c.trim());
    if (cols.length < 8) continue;
    const title = cols[1];
    if (!title || title === 'Title') continue;
    const location = cols[3] || '';
    const urlMatch = line.match(/\[View\]\(([^)]+)\)/);
    if (!urlMatch) continue;
    let url = urlMatch[1];
    if (url.endsWith('.md')) url = url.slice(0, -3);
    if (!url.startsWith('https://apply.workable.com/')) continue;
    if (!matchesFilters(title, location, filters)) continue;
    jobs.push({ title, url, company: companyName, location, source: 'workable' });
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
