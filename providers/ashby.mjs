export default {
  id: 'ashby',

  detect(company) {
    return company.ashby_id || company.careers_url?.includes('ashbyhq.com');
  },

  async fetch(company, filters) {
    const id = company.ashby_id || extractId(company.careers_url);
    if (!id) return [];

    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${id}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];

    const { jobs = [] } = await res.json();
    return jobs
      .filter(j => matchesFilters(j, filters))
      .map(j => ({
        title: j.title,
        company: company.name,
        url: j.jobUrl,
        location: j.location ?? '',
        source: 'ashby',
      }));
  },
};

function extractId(url) {
  const m = url?.match(/ashbyhq\.com\/([^/?#]+)/);
  return m ? m[1] : null;
}

function matchesFilters(job, filters) {
  const title = job.title?.toLowerCase() ?? '';
  const location = (job.location ?? '').toLowerCase();

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
