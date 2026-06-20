---
name: nc-sync
description: Push pipeline jobs and evaluations to NaukriClear dashboard
user_invocable: true
---

# /nc sync

Pushes all pending jobs from `data/pipeline.md` to your NaukriClear dashboard.
Also syncs any new evaluated entries from `data/applications.md`.

## Steps

1. Read `config/profile.yml` → get API key from `integrations.naukriClear.apiKey`
2. If key missing or `syncEnabled: false` → print setup instructions and stop
3. Read `.naukriclear-cursor` → get list of already-synced URLs
4. Parse `data/pipeline.md` → find unchecked `- [ ]` entries not yet synced
5. POST to `https://api.naukriclear.com/api/naukriclear-cli/sync` in batches of 50
6. Update `.naukriclear-cursor` with newly synced URLs
7. Print summary: synced / skipped

## Running it

```bash
node sync.mjs
```

Or from Claude Code:
```
/nc sync
```

## Where results appear

NaukriClear → Discover → **Terminal Jobs**

All jobs land as INTERESTED stage. You browse them in the NaukriClear UI, click the JD link, and decide what to do.

## Setup (if API key missing)

Add to `config/profile.yml`:
```yaml
integrations:
  naukriClear:
    apiKey: "nc_your_token_here"
    syncEnabled: true
    autoSync: true
```

Get your token: NaukriClear → Settings → API Token
