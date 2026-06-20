---
name: nc-evaluate
description: Evaluate a job — 6-block India-adapted scoring with CV match and interview plan
user_invocable: true
---

# /nc evaluate

Evaluates a job against your profile using a 6-block framework adapted for the Indian market.

## Input

Either paste a JD URL or raw JD text after `/nc`:
```
/nc https://jobs.lever.co/razorpay/abc
/nc {paste full job description}
```

## Evaluation blocks

### Block A — Role Summary
- Archetype: Backend SDE / Platform / Fullstack / DevOps / ML
- Seniority: SDE-1 / SDE-2 / SDE-3 / Lead / Staff / Principal
- Team size estimate, reporting structure
- Remote / hybrid / onsite policy
- FAANG-tier vs funded startup vs enterprise
- One-line TL;DR

### Block B — CV Match
Table format:
| JD Requirement | Your CV | Gap | Mitigation |
|---|---|---|---|
Read `cv.md` to fill this. Flag critical gaps (dealbreakers) vs minor gaps (addressable).

### Block C — CTC & Market Rate
- Estimate offered CTC range in LPA based on role + company + seniority
- Compare to your target (`compensation.target_ctc_lpa` from profile.yml)
- Reference: Glassdoor India, LinkedIn Salary Insights, Levels.fyi India
- Flag if role is underpaying vs market

### Block D — Company Health
- Funding stage and last round (if startup)
- Recent layoffs or hiring freezes (search web)
- Glassdoor India rating and key themes
- Blind sentiment (if available)
- Growth trajectory

### Block E — Interview Plan
- 5–8 STAR+R stories from cv.md mapped to JD keywords
- DSA topics likely to be asked based on company + role
- System design topics relevant to the role
- Behavioral themes based on company culture signals

### Block F — Legitimacy Gate
Check for ghost job signals:
- Posting age (> 60 days = yellow flag, > 90 days = red flag)
- Apply button functional
- Recruiter active on LinkedIn
- Description specificity (generic = suspicious)
- Recent layoffs at the company
- Same role reposted multiple times

Verdict: ✅ Proceed / ⚠️ Proceed with Caution / 🚫 Suspicious

## Scoring

Score each dimension 1–5:
- CV Match + Role Fit (40%)
- CTC alignment (20%)
- Company health (20%)
- Legitimacy (20%)

**Final score → Grade:**
| Score | Grade |
|---|---|
| ≥ 4.5 | A — Strong match, prioritize |
| ≥ 4.0 | B — Good fit, apply |
| ≥ 3.5 | C — Decent, apply if pipeline is thin |
| ≥ 3.0 | D — Weak fit, consider carefully |
| < 3.0 | F — Recommend against |

## After evaluation

- Ask user: "Apply, save for later, or skip?"
- If apply: add to `data/applications.md` with grade + score
- Sync to NaukriClear automatically (if autoSync enabled)
- NEVER submit an application without explicit user confirmation
