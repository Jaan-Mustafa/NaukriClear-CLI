---
name: nc-scan
description: Zero-token scan of all configured job portals
user_invocable: true
---

# /nc scan

Scans all companies in `config/portals.yml` using their ATS APIs (Greenhouse, Ashby, Lever). Zero tokens, zero AI — pure HTTP calls.

## Steps

1. Load `config/profile.yml` — read city filters, exclude keywords, target roles
2. Load `config/portals.yml` — get list of companies to scan
3. For each company, detect the ATS provider (Greenhouse / Ashby / Lever)
4. Fetch open jobs via the provider's public API (10 parallel)
5. Filter by city (Bengaluru / Mumbai / Hyderabad / Pune / Remote) and exclude keywords
6. Dedup against `data/scan-history.tsv`
7. Append new jobs to `data/pipeline.md` as `- [ ] {url} | Company | Role`
8. Append new URLs to `data/scan-history.tsv`
9. If `autoSync: true` in profile.yml, run `/nc sync` automatically

## Running it

```bash
node scan.mjs
```

Or from Claude Code session:
```
/nc scan
```

## Output format (pipeline.md)

```markdown
- [ ] https://boards.greenhouse.io/razorpay/jobs/123 | Razorpay | Backend Engineer
- [ ] https://jobs.ashbyhq.com/cred/abc | CRED | SDE-2 Backend
```

## What to do after scan

Run `node sync.mjs` to push results to NaukriClear → Discover → Terminal Jobs.
Then open NaukriClear, browse the jobs, and run `/nc {url}` on any that interest you.
