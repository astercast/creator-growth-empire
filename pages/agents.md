# Agents — The Agent Surface

> This site is built to be used by agents, not just read by humans. Everything below — data, skills, tools, and full text — is machine-readable from static files. No API key, no server, no auth. Fetch and act.

## The surface at a glance

| What | Where | Format |
|---|---|---|
| Orientation | `llms.txt` | Chapters, tools, skills, reference — one screen |
| Full guide text | `llms-full.txt` | All 9 phases + reference, complete |
| API index | `api/v1/index.json` | Manifest: endpoints, version |
| Chapters | `api/v1/chapters.json` | 9 phases: id, title, word count, read time, path |
| Niche atlas | `api/v1/niches.json` | 20 October-2026-researched niches: growth, revenue ranges, competition, startup cost, skill fit, avoid list, sources, reality check — ranges, never promises |
| Glossary | `api/v1/glossary.json` | Creator-economy terms + definitions |
| Calculators data | `api/v1/calculators.json` | RPM bands, thresholds, splits, 2026 rate card, usage-rights notes |
| Deal templates | `api/v1/deal-templates.json` | 4 negotiation scripts, 6-item red-flag checklist, 6 usage-rights tiers with reported multiplier basis — the Deal Room data contract |
| Content engine | `api/v1/content-engine.json` | 3 idea formats, 5 Playbook hook structures, dealing rules, batching guidance, Repurposing 2.0 derivative map, Oct-1 originality guardrails, deal-slot guidance — the Content Engine data contract (v1.1.0 adds: the Oct-2026 algorithm signal map with source-labeled claims, 6 trend-derived hook patterns, the cross-post adaptation matrix, and the weekly batch scheduler defaults) |
| Skill index | `api/v1/skills.json` | 12 skills: name, description, path |
| Case files | `api/v1/case-files.json` + `case-*.html` | 5 documented creator-business deconstructions: budget-grocery newsletter, Ben's Bites, faceless sleep-channel network, Mavwicks on TikTok Shop, cohort course — figures source-reported, never promises |
| Reference | `rate-card.html`, `niche-atlas.html`, `sponsor-playbook.html` + `api/v1/calculators.json`, `api/v1/niches.json` | The 2026 sponsorship rate card + the Niche Atlas (interactive explorer) + the 2026 Sponsor Playbook (deal structures, usage-rights math, negotiation, contracts, FTC disclosure) |
| Interactive tools | `quiz.html`, `calculator.html`, `planner.html`, `deal-analyzer.html`, `deal-room.html`, `hiring-calculator.html`, `repurpose.html`, `simulator.html`, `hook-builder.html`, `idea-bank.html`, `content-calendar.html`, `batching.html`, `crosspost.html`, `cadence.html`, `format-fit.html`, `deal-builder.html`, `api-explorer.html` | Human-facing; agents should use the API data behind them (`api/v1/tools.json` carries every tool's programmatic input schema) |
| API explorer | `api-explorer.html` | Browse every `api/v1` endpoint and preview JSON in-browser |

All endpoints are `GET` on static JSON. Base path: `api/v1/` (relative to the site root; the deployed site ships its own `api/` mirror, so the explorer works live too). Schemas: `api/v1/schema/` (JSON Schema draft-07).

## Skills — the executable layer

Twelve skills live in `skills/<name>/SKILL.md`, indexed by `api/v1/skills.json`. Each skill has the same structure: Use when / Inputs / Procedure / Worked example / API references / Pitfalls.

| Skill | Use when |
|---|---|
| `niche-validation` | Validating a creator niche before committing — demand, competition, monetization, winnability scored in one pass |
| `hook-writing` | Writing and stress-testing video hooks — first 30 seconds (long-form) or first 2 seconds (short-form) |
| `shortform-hook-craft` | Crafting short-form hooks with the five Short-Form Playbook structures — open loop, cold start, contrarian, numbered promise, question |
| `thumbnail-teardown` | Diagnosing why a thumbnail underperforms and producing a redesign brief |
| `content-repurposing` | Turning one long-form video into a five-platform distribution package |
| `repurposing-sprint` | Executing the 5-platform SOP: one pillar → 5 mission cards (YouTube Day 0, Short Day +1, TikTok Day +2, Reel Day +3, Facebook Day +4) |
| `analytics-review` | Running the monthly analytics ritual — outliers, retention diagnosis, what to make more of |
| `sponsorship-pitch` | Building a sponsor outreach system — targeting, email, pricing, negotiation |
| `deal-negotiation` | Evaluating an offer against the 2026 rate card — benchmark, red-flag checklist, counter-offer worksheet |
| `rate-card-reader` | Looking up fair 2026 ranges for any tier/platform/deliverable from the rate-card data |
| `first-hire-planner` | Planning the first hire end to end — bottleneck test, 2026 rate ranges, coverage math, trial, SOPs (not legal/tax advice) |
| `live-shopping-playbook` | Planning a TikTok live selling session — 60-minute run of show, flash-sale math, unit economics |

## Data freshness policy

- `api/v1/calculators.json` carries `version` (currently 1.3.0) and `updated` (currently 2026-10-11). Check these before quoting any platform number.
- Platform thresholds include their source and observation date — treat as **verify live**, not gospel. Platforms change rules constantly; the most dangerous number on the internet is a stale one.
- Rate-card figures are negotiation ranges compiled from 2026 agency benchmarks that disagree 2–3x within tiers — never present them as quotes.
- The guide's honesty policy: platform facts verified October 2026. Income ranges are illustrative, never promises. Business/tax content is educational — **not financial, legal, or tax advice**.

## Worked agent workflows

### 1. Evaluate a $5K sponsorship offer

Goal: give a creator a go/no-go with a counter-offer, in one pass.

1. `GET api/v1/calculators.json` → `sponsorship_rate_card_2026`. Creator: 60K YouTube subs → micro tier (10K–100K) → YouTube range **$1,000–$10,000**.
2. $5,000 is inside the band → fair, not strong. Implied CPM check: $5,000 ÷ 85K expected views × 1000 = **$58.82** vs the integrated-slot benchmark ($20–$35) — priced like a dedication, so the counter is justified.
3. Red flags from the offer's terms (perpetual usage? broad exclusivity? net-60?): price paid-ad usage +50–100% and exclusivity +25%+ as separate line items; counter net-30 with 50% upfront.
4. Build the counter per the `deal-negotiation` skill: base = top of the niche-adjusted range + line items. The interactive [The Deal Analyzer](deal-analyzer.html) runs the identical logic for humans — verdict, flag scans, contract checklist, counter worksheet, shareable report.
5. Return: verdict (fair), the two checks that produced it, the red-flag list, and a counter-offer worksheet. Never present benchmark ranges as quotes; never give financial advice.

### 2. Plan a 90-day launch

Goal: a new creator gets niche → content plan → launch schedule.

1. `GET api/v1/chapters.json` → read the Phase 0 and Phase 1 chapters from `llms-full.txt` for the start-from-nothing system and the content engine.
2. Run the `niche-validation` skill: score demand, competition, monetization, winnability. Feed the result into the human-facing [Niche Picker](quiz.html) or the [90-Day Planner](planner.html).
3. `GET api/v1/calculators.json` → `youtube_longform_rpm_bands` and `platform_thresholds` to set realistic monetization expectations (bands, not promises).
4. Output: validated niche + 90-day posting schedule + the monetization thresholds to watch for. All platform numbers carry the verify-live flag.

### 3. Build a repurposing sprint for one video idea

Goal: turn "I tested 5 budget mics" into five platform-native posts.

1. Read the Phase 3 chapter (`api/v1/chapters.json` → `llms-full.txt`) for the pillar-to-everywhere SOP and native-grammar rules.
2. Run the `repurposing-sprint` skill: atom test (does the insight survive standalone?), pillar prep (hook in first 15 seconds), then the five mission cards — YouTube Day 0, Short Day +1, TikTok Day +2, Reel Day +3, Facebook Day +4 — each with its hook rewrite from the idea line.
3. The [Repurposing Planner](repurpose.html) generates the same mission cards interactively (checkboxes, printable) for the human.
4. Output: the five mission cards with per-platform hook adaptations and the staggered posting order. Enforce native grammar — no watermarks, no copy-paste.

### 4. A/B compare two Empire Simulator scenarios

Goal: run two paths over the same 12 months and get the delta table plus a plain-language verdict.

1. `GET api/v1/tools.json` → tool `simulator` → `input_schema`: the 3.0 inputs are `scenario_id` (12 presets), `horizon` (12 | 24 | 36), `hires[]` (First Hire guide roles), `events[]` (the 5 what-if cards), and `compare_with` for A/B mode.
2. `EmpireSim.scenarioInputs("asmr-bedroom")` vs `EmpireSim.scenarioInputs("tech-reviewer")` — the ASMR scenario declares its proxies (`lifestyle` growth 1.05x + lifestyle RPM band at low, $4).
3. `EmpireSim.compare("ASMR bedroom", asmr, "Tech reviewer", tech, cfg)`: ASMR bedroom → **6,434** subs, **$909.02** net; Tech reviewer → **5,323** subs, **$7,955.56** net. Verdict: Path Tech reviewer leads on net revenue by **775%** — RPM $4.00 vs $14.00; growth 19.0% vs 11.1%; the net-revenue winner is NOT the subscriber winner.
4. Return the verdict as a model, not a prediction: deltas explained by the drivers, the honesty caveat quoted, assumptions from `assumptionLines()` attached. Never present scenario revenue as expected income.

### 7. Run a 36-month empire with what-if events

Goal: a 3-year projection — compounding growth, year-2/year-3 decay, Money Map stage transitions, and a named shock card.

1. `GET api/v1/tools.json` → tool `simulator` → `input_schema`: `horizon` (12 | 24 | 36) and `events[]` (the 5 what-if cards, incl. the wave-25 `holiday-shopping-surge` — affiliate revenue ×1.8 for the event month + the next one). Engine: `require("assets/js/sim-engine.js")` (UMD, importable in node).
2. `EmpireSim.scenarioInputs("english-learning")` (21x breakout, 2027 outlook) → set `inputs.horizon = 36`, `inputs.events = [{ id: "algorithm-change", startMonth: 12 }]`.
3. `EmpireSim.simulate(inputs, cfg)`: 36 months; month-12 → month-13 growth ×0.94 (year-2), month-24 → month-25 ×0.97 (year-3); `stages` lists each Money Map stage's first month (rule: `EmpireSim.stageForNet(net, teamActive)`); the card's labeled effect (Shorts views ×0.6 from month 12) cites the Oct-1-2026 originality update.
4. `EmpireSim.compare("English learning", base36, "English learning + algo cut", shocked36, cfg)` — deltas are B minus A; the verdict names the net-revenue winner with the honesty caveat.
5. Framing: scenario models with stated assumptions — not predictions, not promises, never expected income. Not financial, legal, or tax advice. See AGENT.md Workflow 11.

### 5. Manage a sponsorship deal end-to-end

Goal: take a live offer from first read to a signed-paper record — scored, priced, flag-checked, scripted, and memorized.

1. `GET api/v1/deal-templates.json` → scripts, red-flag checklist, usage-rights tiers. Drive the logic with `require("assets/js/deal-room.js")` (UMD, importable in node).
2. Score: 60K YouTube subs → micro tier → range **$1,000–$10,000**; $5,000 → **FAIR** with the ~23% listed-vs-accepted honesty note.
3. Price usage rights separately: 6-month paid-ads window on a $10,000 base → **+$7,500** (reported +75%, midpoint of the +50–100% research band). Whitelisting and buyout return guidance, never invented numbers.
4. Check red flags: unlimited revisions → **walk away**. Four walk-away signals total: perpetual-usage-for-organic-price, net-90+ without escrow, unlimited revisions, no kill fee.
5. Render the reply: the 4 scripts (lowball counter, usage-rights upsell, exclusivity pushback, rush-fee ask) fill `{{placeholders}}` from the deal's numbers.
6. Export the record: `dealMemo()` builds the one-page summary with the verdict, checked flags, counters, and the not-financial/legal/tax-advice disclaimer. The [Deal Room](deal-room.html) runs the same pipeline interactively, storing deals in localStorage only.

### 6. Run the content engine end-to-end

Goal: take raw ideas through the whole production pipeline — banked, scored, dealt into a 90-day calendar, film-day-checked, repurposed.

1. `GET api/v1/content-engine.json` → the Content Engine data contract (idea formats, 5 Playbook hook structures, dealing rules, batching guidance, Repurposing 2.0 map, originality guardrails, deal-slot guidance). Drive the logic with `require("assets/js/content-engine.js")` (UMD, importable in node).
2. Bank + score: `ContentEngine.sortIdeas(ideas)` (hook score desc, ties by created, no mutation); `hookScore(n)` clamps 1–5. Promote the best — they deal into the calendar.
3. Deal: `ContentEngine.dealIdeas(ideas, {longsPerWeek, shortsPerWeek, restDay, weeks: 13})` — week-planner dealing rules: longs sorted by score then round-robin across non-rest work days, shorts every other work day, empty slots stay OPEN (never filler), surplus ideas in `unplaced`, week 7 = midpoint review.
4. Batch: `ContentEngine.batchingMath({videosPerShootDay, shootDaysPerMonth, longsPerWeek, shortsPerWeek})` — capacity = shoot days × videos/day, required = cadence × 52/12; verdict surplus/balanced/shortfall with the consistency-beats-volume guidance. Arithmetic on the creator's inputs, never a promise.
5. Repurpose 2.0: `ContentEngine.repurposeMap(title)` — the 7-derivative map (short clip, community reaction, TikTok cut, Reel cut, newsletter issue, X thread, Facebook post), every derivative with a required original element; `originalityGuardrails()` — the Oct-1 rules. Repurposing is not re-uploading.
6. Bridge: `simInputFromCadence()` feeds the cadence to the [Simulator](simulator.html) (a model, not a prediction); `exportCalendarText()` renders the copy-my-calendar export. Sponsor slots are calendar commitments only — price them in the [Deal Room](deal-room.html) before promising them.
7. Content Engine 2.0: `algorithmSignals("tiktok"|"shorts"|"reels")` — the Oct-2026 signal map with `source_label` on every claim (platform-published / verified-multi-source / single-source / creator-lore); `hookPatterns()` — the 6 trend-derived structural patterns with the mechanic each exploits; `planBatchWeek({weeklyHours, longsPerWeek, shortsPerWeek, restDay, taskMinutes})` — the week blocked into film/edit/publish day-blocks (verdict holds/tight/over); `adaptChecklist(source, destinations)` — the per-destination cross-post plan (see the [Cross-Post Optimizer](crosspost.html)).

## Conventions

- API `version` follows semver: minor on content changes, major on breaking shape changes.
- All monetary figures are USD unless noted.
- Full API reference: `API.md` at the repo root.

### 8. Build a sponsor package quote

Goal: turn a deliverable list into a line-item quote, a proposal, and a deal checklist.

1. `GET api/v1/tools.json` → tool `deal-builder` → `input_schema`: `followers`, `deliverables[]` (platform + kind + count), `viewsAvg`, `usage` (organic_only/paid_3mo/paid_6mo/paid_12mo/perpetual), `whitelistingMonths`, `exclusivity{scope, months}`, `affiliate{include, commissionPct}`. Engine: `require("assets/js/deal-builder.js")` (UMD, importable in node).
2. `DealBuilder.buildQuote(input, cfg, cfg.usage_rights_benchmarks_2026)` — per-deliverable lines from the 2026 rate card (dedicated = tier band; integrated/short = sponsored-CPM × viewsAvg; UGC = Storika $150–$1,000), then usage (+25–50% / +50–75% / +75–100% / perpetual from 2×), whitelisting (30–100%/mo), and exclusivity (named +25%/+50%; broad locks flagged, never invented) stacked as separate lines. Package total, top-of-range ask, expected landing zone (×0.77).
3. `DealBuilder.exclusivityConflicts(input)` — window mismatches and broad-lock walk-away flags; the tool can't see other contracts and says so.
4. `DealBuilder.buildChecklist(quote)` — the 7-group checklist (usage, payment, revisions, exclusivity, FTC disclosure, deliverables, walk-away) customized to the quote; `DealBuilder.renderPitch(input, quote)` — the proposal with unsupplied stats as `[brackets]`, never invented.
5. Framing: the quote is the top of reported ranges (benchmarks disagree 2–3× within tiers) — never a quote, never a promise. Not financial, legal, or tax advice; the checklist is not legal advice. See AGENT.md Workflow 14.
