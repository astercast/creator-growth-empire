# Agents — The Agent Surface

> This site is built to be used by agents, not just read by humans. Everything below — data, skills, tools, and full text — is machine-readable from static files. No API key, no server, no auth. Fetch and act.

## The surface at a glance

| What | Where | Format |
|---|---|---|
| Orientation | `llms.txt` | Chapters, tools, skills, reference — one screen |
| Full guide text | `llms-full.txt` | All 9 phases + reference, complete |
| API index | `api/v1/index.json` | Manifest: endpoints, version |
| Chapters | `api/v1/chapters.json` | 9 phases: id, title, word count, read time, path |
| Glossary | `api/v1/glossary.json` | Creator-economy terms + definitions |
| Calculators data | `api/v1/calculators.json` | RPM bands, thresholds, splits, 2026 rate card, usage-rights notes |
| Skill index | `api/v1/skills.json` | 10 skills: name, description, path |
| Case files | `api/v1/case-files.json` + `case-*.html` | 5 documented creator-business deconstructions: budget-grocery newsletter, Ben's Bites, faceless sleep-channel network, Mavwicks on TikTok Shop, cohort course — figures source-reported, never promises |
| Reference | `rate-card.html` + `api/v1/calculators.json` | The 2026 sponsorship rate card |
| Interactive tools | `quiz.html`, `calculator.html`, `planner.html`, `deal-analyzer.html`, `repurpose.html`, `api-explorer.html` | Human-facing; agents should use the API data behind them |
| API explorer | `api-explorer.html` | Browse every `api/v1` endpoint and preview JSON in-browser |

All endpoints are `GET` on static JSON. Base path: `api/v1/` (relative to the site root; the deployed site ships its own `api/` mirror, so the explorer works live too). Schemas: `api/v1/schema/` (JSON Schema draft-07).

## Skills — the executable layer

Ten skills live in `skills/<name>/SKILL.md`, indexed by `api/v1/skills.json`. Each skill has the same structure: Use when / Inputs / Procedure / Worked example / API references / Pitfalls.

| Skill | Use when |
|---|---|
| `niche-validation` | Validating a creator niche before committing — demand, competition, monetization, winnability scored in one pass |
| `hook-writing` | Writing and stress-testing video hooks — first 30 seconds (long-form) or first 2 seconds (short-form) |
| `thumbnail-teardown` | Diagnosing why a thumbnail underperforms and producing a redesign brief |
| `content-repurposing` | Turning one long-form video into a five-platform distribution package |
| `repurposing-sprint` | Executing the 5-platform SOP: one pillar → 5 mission cards (YouTube Day 0, Short Day +1, TikTok Day +2, Reel Day +3, Facebook Day +4) |
| `analytics-review` | Running the monthly analytics ritual — outliers, retention diagnosis, what to make more of |
| `sponsorship-pitch` | Building a sponsor outreach system — targeting, email, pricing, negotiation |
| `deal-negotiation` | Evaluating an offer against the 2026 rate card — benchmark, red-flag checklist, counter-offer worksheet |
| `rate-card-reader` | Looking up fair 2026 ranges for any tier/platform/deliverable from the rate-card data |
| `live-shopping-playbook` | Planning a TikTok live selling session — 60-minute run of show, flash-sale math, unit economics |

## Data freshness policy

- `api/v1/calculators.json` carries `version` (currently 1.1.0) and `updated` (currently 2026-10-11). Check these before quoting any platform number.
- Platform thresholds include their source and observation date — treat as **verify live**, not gospel. Platforms change rules constantly; the most dangerous number on the internet is a stale one.
- Rate-card figures are negotiation ranges compiled from 2026 agency benchmarks that disagree 2–3x within tiers — never present them as quotes.
- The guide's honesty policy: platform facts verified October 2026. Income ranges are illustrative, never promises. Business/tax content is educational — **not financial, legal, or tax advice**.

## Worked agent workflows

### 1. Evaluate a $5K sponsorship offer

Goal: give a creator a go/no-go with a counter-offer, in one pass.

1. `GET api/v1/calculators.json` → `sponsorship_rate_card_2026`. Creator: 60K YouTube subs → micro tier (10K–100K) → YouTube range **$1,000–$10,000**.
2. $5,000 is inside the band → fair, not strong. Implied CPM check: $5,000 ÷ 85K expected views × 1000 = **$58.82** vs the integrated-slot benchmark ($20–$35) — priced like a dedication, so the counter is justified.
3. Red flags from the offer's terms (perpetual usage? broad exclusivity? net-60?): price paid-ad usage +50–100% and exclusivity +25%+ as separate line items; counter net-30 with 50% upfront.
4. Build the counter per the `deal-negotiation` skill: base = top of range ($10,000) + line items. The interactive [Sponsor Deal Analyzer](deal-analyzer.html) runs the identical logic for humans.
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

## Conventions

- API `version` follows semver: minor on content changes, major on breaking shape changes.
- All monetary figures are USD unless noted.
- Full API reference: `API.md` at the repo root.
