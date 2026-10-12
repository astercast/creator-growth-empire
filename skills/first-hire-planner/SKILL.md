---
name: first-hire-planner
description: Plan a creator's first hire end to end — bottleneck test (editor vs VA vs designer vs ops), 2026 rate ranges, coverage math via the Hiring Cost Calculator logic, the 2-week paid trial, SOP templates, and contractor-vs-employee basics. Not legal or tax advice.
---

# First-Hire Planner

## Use when
- A creator asks "should I hire?" or "who should I hire first?" — Phase: The First Hire guide
- Pricing a specific hire (monthly cost, loaded cost, views needed to cover it)
- Building the trial task, rubric, or SOPs for a new contractor
- Driving the Hiring Cost Calculator's logic programmatically (input schema in `data/v1/tools.json`, tool `hiring-calculator`)

## Inputs
- The creator's bottleneck: what eats 8–10+ hours/week (editing, packaging, admin, managing)
- Current monthly long-form views + niche (for the coverage math)
- Role, billing model (hourly / per-video / monthly retainer), and quoted rate

## Procedure
1. **Run the bottleneck test.** Hire what blocks revenue, not what annoys you:
   - Editing eats the week and you post less than you want → **video editor** (the #1 time sink; removing it directly raises output)
   - Posting is consistent but packaging is weak → **thumbnail designer** (highest-leverage single asset on YouTube)
   - 10+ hrs/week on inbox, scheduling, comments, uploads → **virtual assistant** (cheapest hours to buy back)
   - 2+ hires and your week is management → **channel manager / ops**
   - Nothing eats 8–10 hrs/week yet → **not ready to hire.** Say so.
2. **Tie-break editor vs VA.** Editors unlock *output* (more or better videos); VAs unlock *time* (hours returned). Under ~$5K/month in channel revenue, output almost always wins.
3. **Run the coverage math** (Hiring Cost Calculator logic):
   - hourly → rate × hours/week × 52/12; per-video → rate × units/month; monthly → retainer
   - **Loaded cost = sticker × 1.15** (management time, revisions, payment fees)
   - Share of ad revenue = loaded ÷ mid-range ad revenue (monthly views × niche RPM band from `data/v1/calculators.json`)
   - Views needed to cover = loaded ÷ RPM band × 1000 (compute at both band ends)
   - **The hiring rule: cover 3 months of loaded cost from revenue before you sign.** Not a guarantee — a math check.
4. **Sanity-check the rate** against 2026 ranges: long-form edit $150–$500/video (premium $500–$800), hourly mid-level $50–$125/hr, retainer 4 vids/mo $800–$2,500, short-form clips $25–$150/clip, full-time remote editor (LatAm) $2,500–$3,000/mo. Ranges are market benchmarks, wide because the work varies wildly.
5. **Run the 2-week paid trial** (never hire on a portfolio alone): paid trial task + fixed rubric + a workflow-test week. Score the trial against the rubric, not vibes.
6. **Ship SOPs before day one.** The three copy-paste templates from the guide: editing handoff, thumbnail brief, upload checklist. A hire without SOPs is an expensive intern.
7. **Contractor-vs-employee reality check.** The line is decided by tax authorities (the three-factor test), not by what you call someone. W-9 before first payment; misclassification penalties are real. When in doubt, a 30-minute CPA or employment-attorney conversation beats a year of guesswork. **This is not legal or tax advice.**

## Worked example
Creator: 120K monthly views, education niche (RPM band ~$4–$12). Bottleneck: editing eats 15 hrs/week → hire an editor, per-video at $300, 4 videos/month.
- Sticker: $300 × 4 = **$1,200/mo**; loaded: $1,200 × 1.15 = **$1,380/mo**; annual $14.4K / $16.6K loaded
- Mid-range ad revenue: 120K/1000 × $8 = $960/mo → the hire is ~144% of current ad revenue — **do not hire yet** on ads alone (coverage fails), unless sponsor income covers the gap
- Views needed to cover: $1,380 ÷ $12 × 1000 = 115K (best case) … $1,380 ÷ $4 × 1000 = 345K (worst case)
- 3-month reserve: ~$4.1K in the bank from revenue first
- Verdict: math says wait or fund from sponsors; if sponsors pay $2K/mo, the trial can start.

## API references
- `GET data/v1/tools.json` → tool `hiring-calculator` → `input_schema` (the programmatic contract: role, billing_model, rate_usd, hours_per_week, units_per_month, monthly_views, niche)
- `GET data/v1/calculators.json` → `youtube_longform_rpm_bands` (coverage math needs the niche band)
- The First Hire guide page (`hiring.html`) — full 2026 rate tables, trial rubric, SOP templates, sources

## Pitfalls
- Hiring what annoys you instead of what blocks revenue — the bottleneck test exists for this.
- Quoting sticker cost without the 15% loaded overhead (management time, revision cycles, fees).
- Skipping the paid trial — portfolios are best-case reels; the trial is the actual job.
- Contractor agreements before SOPs — the contract can't fix an undefined workflow.
- Treating rate ranges as quotes — they're benchmarks that disagree 2–3x; niche, engagement, and quality move numbers.
- Anything here read as legal/tax advice — it isn't. Flag the CPA/attorney line every time.
