# NaukriClear CLI — Ideas to Beat career-ops

career-ops is polished, well-known, featured in Wired + Business Insider.
It scans ~45 companies, does AI evaluation, generates tailored CVs, cover letters.
Its weakness: it's generic/global and burns tokens on everything.

Our unfair advantage: **India-first** + **zero-token by default** + **NaukriClear API**.

---

## 🔴 Killer Features (career-ops cannot copy these easily)

### 1. Bond Clause Detector
career-ops has no concept of this. Indian service companies (Infosys, Wipro, HCL,
TCS, Capgemini) often bury 1–2 year bond clauses in offer letters that cost ₹1–2L
to break. We auto-scan JD text for bond signals: "training bond", "service agreement",
"recovery of training costs", "lock-in period". Flag it before the candidate wastes
time interviewing.

**Why it beats career-ops**: genuinely Indian problem, zero effort to implement,
massive goodwill with users who've been burned by this.

---

### 2. WhatsApp Job Digest
India runs on WhatsApp. A daily/weekly digest of new jobs sent via WhatsApp is more
useful than any dashboard for most Indian developers.

- Use Twilio WhatsApp API or WhatsApp Cloud API (free tier: 1000 conversations/month)
- Daily digest: "Good morning! 14 new Backend roles since yesterday."
- Instant alert: "🔴 Razorpay just posted SDE-2 Backend (GH)" — for priority companies
- Setup: `nc alerts whatsapp +91XXXXXXXXXX`

**Why it beats career-ops**: career-ops has no notification system at all. WhatsApp
penetration in India is ~95%. No CLI tool does this.

---

### 3. Auto-Score Without Burning Tokens
career-ops runs the AI on every job. We run a rule-based matcher first (free, instant),
AI only on request.

Rule-based scoring:
- Skills overlap: your stack (Go, Node, React) vs JD required skills → 0–40 pts
- Seniority match: detect "SDE-1", "2+ years", "senior" → ±20 pts
- Location match: Bengaluru/Remote vs your preference → ±15 pts
- Salary range match: if LPA mentioned in JD → ±15 pts
- Red flags (bond, notice >3 months, mass hiring) → penalty

Result: every job gets a score (0–100) without a single API call.

**Why it beats career-ops**: career-ops is token-heavy. We give instant scoring for
free. Students and freshers (big Indian audience) can't afford token costs.

---

### 4. LPA Salary Intelligence
career-ops thinks in USD. We think in LPA.

- Extract salary from JD: "12–18 LPA", "CTC upto 20L", "fixed + variable"
- Auto-filter below your target CTC (set in profile.yml)
- Market rate benchmark: "Razorpay SDE-2 typically pays 28–35 LPA (Glassdoor India)"
- ESOP/equity detection: flag companies offering ESOPs (high-signal for startups)
- Variable component warning: "OYO posts high fixed, but 30% is variable"

---

### 5. Referral Finder
"You know someone at this company" — the most powerful thing in Indian job hunting.

- Import LinkedIn connections CSV (Settings → Data export)
- When browsing jobs in dashboard, show "👥 3 connections at Razorpay"
- `nc referrals Razorpay` → list names + LinkedIn URLs
- Suggest referral message template

No tool does this. career-ops has zero referral concept. LinkedIn's own tools are
buried and don't integrate with a job pipeline.

---

## 🟡 Strong Differentiators (India-specific depth)

### 6. Job Freshness Filter
Most CLI scanners show old jobs. We timestamp every job at scan time.

- Filter dashboard by: Last 7 days / Last 30 days / All
- "Posted 3 days ago" badge on rows
- Auto-hide jobs older than 45 days (configurable)
- Alert if a priority company posts something within 24 hours

career-ops has no freshness concept — it scans and logs, you don't know how old jobs are.

---

### 7. WFH / Hybrid / WFO Classifier
Post-COVID, this is a dealbreaker for most Indian devs. We auto-detect from JD text.

- Signals: "work from office", "5 days a week", "remote-first", "hybrid 3 days",
  "Bengaluru office mandatory"
- Badge in dashboard: `🏠 Remote` / `🏢 WFO` / `↔️ Hybrid`
- Filter: show only remote-friendly roles

---

### 8. Duplicate Job Detection
Same job posted on Greenhouse AND LinkedIn AND Cutshort. We deduplicate by
(company + role title + date proximity), show ONE entry with source badges.

`Razorpay | SDE-2 Backend   [GH] [CS] [LI]`

career-ops has basic dedup by URL. We dedup by semantic similarity.

---

### 9. Indian Company Health Signals
Before applying, know if the company is stable.

- Funding: last round, amount, date (Crunchbase / Tracxn)
- Headcount trend: growing / flat / declining (LinkedIn)
- Glassdoor India rating (auto-fetch)
- Recent news: ET/Mint/Inc42 headlines for layoffs, pivots, leadership changes
- Blind India sentiment (community-sourced)

Command: `nc intel Meesho` → snapshot report in terminal

---

### 10. Auto-Apply to Greenhouse (with confirmation gate)
career-ops explicitly says it NEVER auto-applies. We do — with a confirmation step.

Greenhouse has a consistent form structure. We can:
1. Fill name, email, LinkedIn, resume PDF automatically
2. Pause and show you what it filled
3. You press Enter to submit, or edit first

This is the biggest time-saver in job hunting. One command → application submitted.
`nc apply https://boards.greenhouse.io/razorpay/jobs/123`

**Why it beats career-ops**: they can't do this (their explicit design choice).
We can, and it's their biggest missing feature by user requests.

---

## 🟢 Quality-of-Life Improvements

### 11. `nc doctor` Health Check
```
nc doctor

✓  Node.js 20.x
✓  config/profile.yml  (valid YAML, apiKey set)
✓  config/portals.yml  (38 companies, 0 errors)
✓  data/scan-history.tsv  (2,404 jobs)
✗  NaukriClear API  →  401 Unauthorized (check your apiKey)
✓  nc-dashboard binary  (built, v0.3.1)
```

---

### 12. `nc stats` Analytics
```
nc stats

Applications this month:  14 applied, 6 in review, 2 interviews, 1 offer
Best performing portal:   Greenhouse (38% response rate)
Most applied to:          Fintech (6), SaaS (4), E-comm (3)
Avg time to response:     8.3 days
Pipeline health:          🟡 Low (only 14 applications in 30 days)
```

---

### 13. Seniority Filter
Auto-detect JD seniority and filter to your level.

- "Fresher", "0–1 years" → Entry
- "SDE-1", "1–3 years" → Junior
- "SDE-2", "3–5 years" → Mid
- "Senior", "5+ years", "Tech Lead" → Senior

Filter in dashboard: only show roles matching your target level.

---

### 14. Scheduled Scans (GitHub Actions / cron)
Run `nc scan` automatically every morning without opening terminal.

```yaml
# .github/workflows/daily-scan.yml
on:
  schedule:
    - cron: '0 7 * * 1-5'   # 7 AM IST, Mon–Fri
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - run: node scan.mjs
```

We ship this template pre-built. career-ops has no automation setup.

---

### 15. Wellfound India / iimjobs / Hirist / Instahyre Providers
career-ops has Wellfound global. We add:
- Wellfound India (startup jobs, equity-heavy)
- iimjobs (mid-senior management roles)
- Hirist (tech-only jobs, well-indexed)
- Instahyre (AI-matched, good for Bengaluru)

Each is a new provider in `providers/` — same pattern as existing ones.

---

### 16. Shell Completions
```bash
nc <TAB>
scan    push    sync    review   apply   stats   doctor   alerts
```

Install: `nc completion zsh >> ~/.zshrc`

Small feature, big signal that the tool is polished.

---

### 17. npx Installer (like career-ops)
```bash
npx naukriclear init
```

One command setup. Clones, installs deps, walks through profile setup interactively.
Currently setup requires manual steps — this drops the barrier to zero.

---

### 18. Split-View Job Detail in Dashboard
Press `Enter` in the TUI → right panel opens with:
- Full job title + company
- Date posted + source
- Direct URL (copyable)
- Your match score
- WFH status, seniority level, LPA range
- Bond clause warning (if detected)
- Your notes field (editable inline)

---

## 🔵 Longer-Term / Community

### 19. Community ATS Database
Currently you manually add `greenhouse_id: razorpay` to portals.yml.
We crowdsource a `companies.json` database:

```json
{ "name": "Razorpay", "greenhouse_id": "razorpay", "city": "Bengaluru", "sector": "fintech" }
```

Anyone can `nc add-company Darwinbox` → opens a PR to the community database.
Search 500+ Indian companies by sector/city without manual config.

---

### 20. Interview Question Crowdsourcing
After your interview: `nc debrief Razorpay`
→ prompts you to log questions asked, difficulty, outcome.
→ stored locally + optionally shared (anonymized) to community database.
→ future users: `nc prep Razorpay` pulls real interview questions from the database.

career-ops generates interview prep from AI. We use real data from real interviews.

---

## Priority Order (what to build next)

| # | Feature | Effort | Impact | Beats career-ops? |
|---|---------|--------|--------|-------------------|
| 1 | Bond clause detector | Low | High | Yes — unique |
| 2 | Auto-score (rule-based) | Medium | High | Yes — free vs tokens |
| 3 | Job freshness filter | Low | Medium | Yes |
| 4 | WhatsApp alerts | Medium | High | Yes — unique |
| 5 | WFH/Hybrid classifier | Low | High | Yes |
| 6 | `nc doctor` + `nc stats` | Medium | Medium | Yes |
| 7 | LPA salary extraction | Medium | High | Yes — India-specific |
| 8 | Wellfound/Hirist/iimjobs | Medium | High | Partially |
| 9 | Auto-apply Greenhouse | High | Very High | Yes — they refuse to |
| 10 | Referral finder | High | Very High | Yes — unique |
| 11 | Shell completions | Low | Low | Polish |
| 12 | npx installer | Low | Medium | Parity |
| 13 | Community ATS database | High | High | Long-term moat |
