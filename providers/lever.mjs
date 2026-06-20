export default {
  id: 'lever',

  detect(company) {
    return company.lever_id || company.careers_url?.includes('jobs.lever.co');
  },

  async fetch(company, filters) {
    const id = company.lever_id || extractId(company.careers_url);
    if (!id) return [];

    const res = await fetch(`https://api.lever.co/v0/postings/${id}?mode=json`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];

    const jobs = await res.json();
    return (Array.isArray(jobs) ? jobs : [])
      .filter(j => matchesFilters(j, filters))
      .map(j => ({
        title: j.text,
        company: company.name,
        url: j.hostedUrl,
        location: j.categories?.location ?? '',
        source: 'lever',
      }));
  },
};

function extractId(url) {
  const m = url?.match(/jobs\.lever\.co\/([^/?#]+)/);
  return m ? m[1] : null;
}

function matchesFilters(job, filters) {
  const title = (job.text ?? '').toLowerCase();
  const location = (job.categories?.location ?? '').toLowerCase();

  if (filters.excludeKeywords?.some(k => title.includes(k.toLowerCase()))) return false;
  if (filters.cities?.length) {
    const cityMatch = filters.cities.some(c => location.includes(c.toLowerCase()));
    const isRemote = location.includes('remote');
    if (!cityMatch && !isRemote) return false;
  }
  if (filters.targetRoles?.length) {
    const roleKeywords = filters.targetRoles.flatMap(r => r.toLowerCase().split(/\s+/));
    const hasMatch = roleKeywords.some(k => title.includes(k));
    if (!hasMatch) return false;
  }
  return true;
}
