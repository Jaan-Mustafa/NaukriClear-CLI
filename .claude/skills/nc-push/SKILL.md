---
name: nc-push
description: Fetch the latest jobs from all portals and push them to NaukriClear in one step
user_invocable: true
---

# /nc push

One command to fetch fresh jobs AND push them to your NaukriClear dashboard.

This runs `scan` then `sync` back-to-back:
1. **Scan** all portals (Greenhouse, Ashby, Lever, Cutshort, Internshala, Naukri) — zero tokens
2. **Push** every new job to NaukriClear → Discover → Terminal Jobs

Unlike `/nc scan`, this **always** pushes — even if `autoSync` is off in `config/profile.yml`.

## Running it

```bash
node push.mjs
```

Or inside Claude Code:
```
/nc push
```

## Steps the agent performs

1. Run `node push.mjs`
2. This executes `scan.mjs` (fetch new jobs → `data/pipeline.md`, dedup against `scan-history.tsv`)
3. Then executes `sync.mjs` (push new pipeline entries → NaukriClear API in batches of 50)
4. Report how many jobs were fetched and pushed

## Requirements

- `config/profile.yml` must exist with a valid NaukriClear API key:
  ```yaml
  integrations:
    naukriClear:
      apiKey: "nc_your_token_here"
      syncEnabled: true
  ```
- Get your token: NaukriClear → Settings → API Token

## Where results appear

NaukriClear → Discover → **Terminal Jobs** — all new jobs land as INTERESTED for you to review.
