---
name: nc
description: NaukriClear CLI — India-first AI job search pipeline
user_invocable: true
---

# NaukriClear CLI (`/nc`)

Your India-first job search command center. All results sync automatically to your NaukriClear dashboard.

## Commands

```
/nc                        → Show this help + current stats
/nc push                   → Fetch latest jobs AND push them to NaukriClear (scan + sync)
/nc scan                   → Zero-token scan of all portals in config/portals.yml
/nc {paste a JD or URL}    → Evaluate a job — score it, match to your CV, get interview plan
/nc sync                   → Manually push pipeline jobs to NaukriClear
/nc tracker                → Show your application pipeline summary
/nc setup                  → First-time setup wizard
```

## Quick start

If this is your first time:
1. Run `/nc setup` — creates profile.yml, portals.yml, and cv.md interactively
2. Run `/nc scan` — scans all configured portals (zero tokens)
3. Open NaukriClear → Discover → Terminal Jobs to browse results

## How to use `/nc` with a job

Paste a JD URL or the raw job description text directly after `/nc`:

```
/nc https://jobs.lever.co/razorpay/abc123
/nc {paste full JD text here}
```

This runs the 6-block India evaluation:
- **A** Role summary (archetype, seniority, team)
- **B** CV match (JD requirement → your CV, gaps)
- **C** CTC & market rate (LPA benchmarks)
- **D** Company health (funding, Glassdoor India, Blind)
- **E** Interview plan (STAR stories, DSA focus)
- **F** Legitimacy gate (ghost job signals)

Score: 1–5 → converted to A (≥4.5) / B (≥4.0) / C (≥3.5) / D (≥3.0) / F (<3.0)

## Data files

| File | Purpose |
|---|---|
| `config/profile.yml` | Your identity — name, skills, target CTC in LPA, cities |
| `config/portals.yml` | Companies to scan |
| `cv.md` | Your CV in markdown |
| `data/pipeline.md` | Scanned jobs waiting for evaluation |
| `data/applications.md` | Evaluated + tracked applications |
| `data/scan-history.tsv` | Dedup log — prevents re-adding seen jobs |

## Important rules

- NEVER apply to a job without your explicit confirmation
- NEVER modify cv.md without your approval
- Recommend against jobs scoring < 3.5 / C grade
- Always verify CTC range against Glassdoor India and LinkedIn Salary before recommending
