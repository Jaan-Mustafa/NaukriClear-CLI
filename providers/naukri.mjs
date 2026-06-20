// Naukri provider — logs in with email/password, then hits the job-search API directly.
// No browser / Playwright needed.
// Credentials: config/profile.yml → naukri.email + naukri.password

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const SEARCHES = [
  { keyword: 'backend engineer',      location: 'bangalore' },
  { keyword: 'software engineer',     location: 'bangalore' },
  { keyword: 'full stack developer',  location: 'bangalore' },
  { keyword: 'software developer',    location: 'hyderabad' },
  { keyword: 'backend developer',     location: 'mumbai' },
  { keyword: 'software engineer',     location: 'hyderabad' },
  { keyword: 'full stack engineer',   location: 'pune' },
];

export default {
  id: 'naukri',
  detect(company) {
    return !!(company.naukri_id || company.careers_url?.includes('naukri.com'));
  },
  async fetch() { return []; },  // global sweep handles Naukri
};

// Called by scan.mjs global sweeps — profile needed for credentials
export async function scanGlobal(filters, profile) {
  const email    = profile?.naukri?.email?.trim();
  const password = profile?.naukri?.password?.trim();

  if (!email || !password) {
    process.stdout.write('no credentials\n');
    process.stdout.write('  → Add naukri.email + naukri.password to config/profile.yml\n');
    return [];
  }

  let session;
  try {
    session = await login(email, password);
  } catch (e) {
    process.stdout.write(`login failed: ${e.message}\n`);
    return [];
  }

  return runSearches(session, filters);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await fetch('https://www.naukri.com/central-login-services/v1/login', {
    method: 'POST',
    headers: {
      accept:             'application/json',
      appid:              '105',
      clientid:           'd3skt0p',
      'content-type':     'application/json',
      referer:            'https://www.naukri.com/nlogin/login',
      systemid:           'jobseeker',
      'user-agent':       UA,
      'x-requested-with': 'XMLHttpRequest',
    },
    body: JSON.stringify({ username: email, password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 120)}`);
  }

  // Collect all Set-Cookie headers into a flat map
  const cookieMap = {};
  const rawCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=[^ ])/).filter(Boolean);

  for (const raw of rawCookies) {
    const [kv] = raw.split(';');
    const eq = kv.indexOf('=');
    if (eq < 0) continue;
    cookieMap[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
  }

  const token = cookieMap['nauk_at'];
  if (!token) throw new Error('nauk_at cookie missing — wrong credentials?');

  return { token, cookieHeader: Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ') };
}

// ── Searches ─────────────────────────────────────────────────────────────────

async function runSearches({ token, cookieHeader }, filters) {
  const all = [];
  const seen = new Set();

  for (const { keyword, location } of SEARCHES) {
    try {
      const jobs = await searchOnce(token, cookieHeader, keyword, location, filters, seen);
      all.push(...jobs);
    } catch {
      // silently skip failed searches
    }
  }

  return all;
}

async function searchOnce(token, cookieHeader, keyword, location, filters, seen) {
  const params = new URLSearchParams({
    noOfResults: '20',
    urlType:     'search_by_key_loc',
    searchType:  'adv',
    keyword,
    location,
    experience:  '0',
    sort:        '1',
  });

  const res = await fetch(`https://www.naukri.com/jobapi/v3/search?${params}`, {
    headers: {
      accept:        'application/json',
      appid:         '109',
      systemid:      '109',
      'user-agent':  UA,
      authorization: `Bearer ${token}`,
      cookie:        cookieHeader,
      referer:       `https://www.naukri.com/${keyword.replace(/\s+/g, '-')}-jobs-in-${location}`,
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) return [];
  const data = await res.json();

  const jobs = [];
  for (const j of data.jobDetails || []) {
    const url = j.jdURL
      ? (j.jdURL.startsWith('http') ? j.jdURL : `https://www.naukri.com${j.jdURL}`)
      : null;
    if (!url || seen.has(url)) continue;

    const title   = j.title || '';
    const company = j.companyName || '';
    const loc     = j.placeholders?.[0]?.label || location;

    if (!matchesFilters(title, loc, filters)) continue;
    seen.add(url);
    jobs.push({ title, company, location: loc, url, source: 'naukri' });
  }
  return jobs;
}

// ── Filter ───────────────────────────────────────────────────────────────────

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
