# Contributing to NaukriClear CLI

Thanks for wanting to contribute! This project is beginner-friendly — the most impactful thing you can do is add a new ATS provider or add companies to the portals list.

## Ways to contribute

| Contribution | Difficulty | Impact |
|---|---|---|
| Add companies to `portals.example.yml` | Easy | High |
| Fix a bug in an existing provider | Easy | High |
| Add a new ATS provider | Medium | Very High |
| Improve filtering logic | Medium | Medium |

---

## Setup

```bash
git clone https://github.com/YOUR_ORG/naukriclear-cli.git
cd naukriclear-cli
npm install
cp config/profile.example.yml config/profile.yml
cp config/portals.example.yml config/portals.yml
```

No build step. All files are plain ES modules (`.mjs`). Node 18+ required.

---

## Adding a company (easiest contribution)

If you know a company's ATS, open `config/portals.example.yml` and add an entry:

```yaml
# Find the ATS by visiting the company's careers page and checking the URL:
# boards.greenhouse.io/SLUG     → greenhouse_id: SLUG
# jobs.lever.co/SLUG            → lever_id: SLUG
# jobs.ashbyhq.com/SLUG         → ashby_id: SLUG
# careers.smartrecruiters.com/SLUG → smartrecruiters_id: SLUG
# SLUG.recruitee.com            → recruitee_id: SLUG
# apply.workable.com/SLUG       → workable_id: SLUG

- name: Company Name
  careers_url: https://company.com/careers
  greenhouse_id: companyslug
```

Then open a PR. No tests required for company additions.

---

## Adding a new ATS provider

This is the highest-impact contribution. Most Indian companies use Darwinbox, Keka, iCIMS, or Taleo — none of which are supported yet.

### Provider interface

Every provider is an ES module that exports a default object with two methods:

```js
// providers/myprovider.mjs
export default {
  id: 'myprovider',

  // Return true if this provider should handle this company
  detect(company) {
    return !!(company.myprovider_id || company.careers_url?.includes('myprovider.com'));
  },

  // Fetch and return jobs for this company
  async fetch(company, filters) {
    const slug = company.myprovider_id || extractSlug(company.careers_url);
    if (!slug) return [];

    const res = await fetch(`https://api.myprovider.com/jobs/${slug}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return data.jobs
      .filter(j => matchesFilters(j.title, j.location, filters))
      .map(j => ({
        title: j.title,
        company: company.name,
        location: j.location || '',
        url: j.url,
        source: 'myprovider',
      }));
  },
};
```

### The `filters` object

```js
filters = {
  cities: ['Bengaluru', 'Mumbai', 'Hyderabad', 'Remote', ...],
  excludeKeywords: ['intern', 'manager', ...],
  targetRoles: ['Software Engineer', 'Backend Engineer', ...],
}
```

Copy the `matchesFilters` helper from any existing provider (e.g. `providers/greenhouse.mjs`) — it handles all three filter types consistently.

### Registering the provider

Add your provider to the list in `scan.mjs`:

```js
const names = ['greenhouse', 'ashby', 'lever', 'workable', 'smartrecruiters', 'recruitee', 'cutshort', 'internshala', 'myprovider'];
```

### Testing your provider

```bash
node -e "
import('./providers/myprovider.mjs').then(async m => {
  const jobs = await m.default.fetch(
    { name: 'TestCompany', myprovider_id: 'testslug' },
    { cities: [], excludeKeywords: [], targetRoles: [] }
  );
  console.log(jobs.length, 'jobs');
  console.log(jobs[0]);
});
"
```

### PR checklist for a new provider

- [ ] `detect()` returns `true` for at least one field (`provider_id` or URL pattern)
- [ ] `fetch()` returns `[]` gracefully on errors (no throws)
- [ ] Each job has `{ title, company, location, url, source }`
- [ ] `url` is validated — must start with `https://` and be on the expected domain
- [ ] `matchesFilters` is applied before returning jobs
- [ ] At least one real company added to `portals.example.yml` as a test case

---

## PR guidelines

- Keep PRs focused — one provider or one set of companies per PR
- No new dependencies unless absolutely necessary (Node 18 built-in `fetch` covers most cases)
- Don't add error logging for normal failures (empty results, 404s) — silent is fine
- Match the existing code style: ESM, no TypeScript, no classes

---

## Reporting bugs

Use the [bug report template](../../issues/new?template=bug_report.yml). Include:
- Which provider is failing
- The company name and its ATS slug
- The error or unexpected output

---

## Questions?

Open a [discussion](../../discussions) or drop a comment on the relevant issue.
