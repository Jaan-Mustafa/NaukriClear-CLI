export default {
  id: 'greenhouse',

  detect(company) {
    return company.greenhouse_id || company.careers_url?.includes('greenhouse.io');
  },

  async fetch(company, filters) {
    const id = company.greenhouse_id || extractId(company.careers_url);
    if (!id) return [];

    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=false`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];

    const { jobs = [] } = await res.json();
    return jobs
      .filter(j => matchesFilters(j, filters))
      .map(j => ({
        title: j.title,
        company: company.name,
        url: j.absolute_url,
        location: j.location?.name ?? '',
        source: 'greenhouse',
      }));
  },
};

function extractId(url) {
  const m = url?.match(/greenhouse\.io\/([^/?#]+)/);
  return m ? m[1] : null;
}

function matchesFilters(job, filters) {
  const title = job.title?.toLowerCase() ?? '';
  const location = job.location?.name?.toLowerCase() ?? '';

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
