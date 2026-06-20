# NaukriClear CLI

**India-first job scanner for developers.** Hits ATS APIs directly — zero tokens, zero AI cost — and syncs results to your [NaukriClear](https://naukriclear.com) dashboard automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## What it does

1. **Scans** 38+ Indian companies across 6 ATS platforms in parallel
2. **Filters** by role, city, and keywords — no noise
3. **Syncs** new jobs to NaukriClear → Discover → Terminal Jobs
4. **Deduplicates** — never shows you the same job twice

No scraping. No AI tokens spent on scanning. Pure HTTP against public ATS APIs.

---

## Supported ATS Providers

| Provider | Companies covered | Detection |
|---|---|---|
| **Greenhouse** | Razorpay, Groww, Postman, BrowserStack, Freshworks, Zepto, Meesho, Blinkit, Khatabook, Zenoti, InMobi, Amagi, DailyHunt, Bluestone | `greenhouse_id` in portals.yml |
| **Ashby** | CRED, Setu, Decentro | `ashby_id` |
| **Lever** | PhonePe, Zeta, Mindtickle, Pocket FM, Porter, Clear, Flipkart | `lever_id` |
| **SmartRecruiters** | Swiggy, Zomato, Dream11, ShareChat, OYO, Nykaa, Delhivery, Urban Company, Cars24, BlackBuck, PharmEasy, Shiprocket, Pristyn Care, Ola Electric | `smartrecruiters_id` |
| **Workable** | Any company on `apply.workable.com` | `workable_id` or careers URL |
| **Recruitee** | Any company on `*.recruitee.com` | `recruitee_id` or careers URL |
| **Cutshort** | Global sweep across Indian tech companies | built-in |
| **Internshala** | Entry-level / fresher roles | built-in |

> Missing your target company? [Request it](../../issues/new?template=company_request.yml) or add it yourself in `config/portals.yml` and open a PR.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_ORG/naukriclear-cli.git
cd naukriclear-cli
npm install

# 2. Set up your profile
cp config/profile.example.yml config/profile.yml
cp config/portals.example.yml config/portals.yml
# Edit config/profile.yml — add your name, target roles, cities, NaukriClear API key
```

### With Claude Code (recommended)

```bash
claude        # open Claude Code in this directory
/nc scan      # scan all portals — zero AI tokens
/nc sync      # push to NaukriClear dashboard
```

### Without Claude Code

```bash
node scan.mjs   # scan + auto-sync (if autoSync: true in profile.yml)
node sync.mjs   # push pipeline manually
```

---

## Configuration

### `config/profile.yml`

```yaml
candidate:
  name: "Your Name"
  email: "you@example.com"

target_roles:
  primary:
    - "Software Engineer"
    - "Backend Engineer"
    - "SDE"
  cities:
    - Bengaluru
    - Hyderabad
    - Remote
  exclude_keywords:
    - intern
    - manager

integrations:
  naukriClear:
    apiKey: "nc_your_token_here"   # NaukriClear → Settings → API Token
    autoSync: true
```

### Adding companies to `config/portals.yml`

```yaml
companies:
  - name: YourTargetCompany
    greenhouse_id: yourcompany        # boards.greenhouse.io/yourcompany

  - name: AnotherCompany
    lever_id: anothercompany          # jobs.lever.co/anothercompany

  - name: SmartRecruitersCompany
    smartrecruiters_id: CompanySlug   # careers.smartrecruiters.com/CompanySlug
```

---

## Commands (Claude Code)

| Command | What it does |
|---|---|
| `/nc scan` | Scan all portals — zero tokens |
| `/nc sync` | Push pipeline → NaukriClear dashboard |
| `/nc push` | Scan + sync in one step |
| `/nc {url or JD text}` | Evaluate a job: CV match, CTC, company health, interview plan |
| `/nc tracker` | Application pipeline summary |

---

## Project Structure

```
providers/              # One file per ATS platform
  greenhouse.mjs
  ashby.mjs
  lever.mjs
  workable.mjs
  smartrecruiters.mjs
  recruitee.mjs
  cutshort.mjs
  internshala.mjs

config/
  profile.example.yml   # Copy to profile.yml and fill in your details
  portals.example.yml   # Copy to portals.yml — add/remove companies

scan.mjs                # Main scanner — runs all providers concurrently
sync.mjs                # Pushes pipeline.md to NaukriClear API
push.mjs                # scan + sync in one command
```

---

## Contributing

Contributions are very welcome — especially new ATS providers and more Indian companies. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide.

**Quick ways to contribute:**
- 🏢 [Request a company to be added](../../issues/new?template=company_request.yml)
- 🔌 [Request a new ATS provider](../../issues/new?template=provider_request.yml)
- 🐛 [Report a bug](../../issues/new?template=bug_report.yml)
- ✨ Open a PR — all skill levels welcome

---

## License

MIT — see [LICENSE](LICENSE).
