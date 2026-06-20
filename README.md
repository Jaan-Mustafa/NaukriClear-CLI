# NaukriClear CLI

India-first AI job search pipeline — built for NaukriClear users.

Scans Indian job portals (Greenhouse, Ashby, Lever + more coming), scores jobs against your profile, and syncs everything to your NaukriClear dashboard automatically.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your profile
cp config/profile.example.yml config/profile.yml
cp config/portals.example.yml config/portals.yml
# Edit both files with your details

# 3. Open Claude Code here
claude

# 4. Inside Claude Code, run
/nc setup     # first time setup wizard
/nc scan      # scan all portals (zero tokens)
/nc sync      # push to NaukriClear dashboard
```

## Commands

| Command | Description |
|---|---|
| `/nc` | Show help + stats |
| `/nc scan` | Zero-token scan of all portals |
| `/nc {url or JD}` | Evaluate a job (6-block India scoring) |
| `/nc sync` | Push pipeline to NaukriClear |
| `/nc tracker` | Application pipeline summary |

## Where results appear

**NaukriClear → Discover → Terminal Jobs**

All scanned jobs appear there. Browse, filter by company/role, click to view JD, mark as Applied or Skip.

## Providers (Phase 1)

- Greenhouse ✅
- Ashby ✅  
- Lever ✅
- Naukri.com 🔜
- Instahyre 🔜
- Cutshort 🔜
- Wellfound India 🔜
- LinkedIn India 🔜

## Requirements

- Node.js 18+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- NaukriClear account (get your API token from Settings)
