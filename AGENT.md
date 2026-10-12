# AGENT.md — How an agent uses Creator Growth Empire

> This site is a static machine-readable knowledge base for the creator
> business: 9 phases, 16 tools, 12 skills, 9 case files, and a versioned JSON
> API. No API key, no server, no auth, no rate limits. Fetch and act.
> Every workflow below was executed against the real `api/v1/` JSON files —> see `tests/agent-workflows.test.js` (run: `node tests/agent-workflows.test.js`).

## Base URL pattern

- **Base:** `api/v1/` relative to the site root.
- Works on any static host. The deployed site ships its own `api/` mirror, so
  the same relative paths work on the live site, on GitHub Pages, or from a
  local clone.
- **Manifest first:** `GET api/v1/index.json` lists every endpoint with its
  description, schema URL (`api/v1/schema/*.json`, JSON Schema draft-07),
  ISO-8601 UTC `updated` timestamp, record counts, and deprecation status.
  Start here; never hardcode endpoint paths.
- **Orientation:** `llms.txt` (one screen: phases, tools, guides, skills, API),
  `llms-full.txt` (complete guide text — all 9 phases + reference + guides).
- **Fetch pattern:** plain `GET` on static JSON. Example with curl:
  `curl https://<site>/api/v1/calculators.json` — or `fetch("api/v1/calculators.json")`
  from a page on the same host.

## Key endpoints (with example requests)

| Endpoint | What you get | Example |
|---|---|---|
| `GET api/v1/index.json` | Self-describing manifest: every endpoint, schema URL, `updated`, record counts | `curl …/api/v1/index.json` → pick `endpoints[].path` |
| `GET api/v1/chapters.json` | 9 phases: `id`, `phase`, `title`, `path`, `words`, `read_minutes` | Find `phase-5-monetization-stack`, then read its full text in `llms-full.txt` |
| `GET api/v1/niches.json` | The Niche Atlas v2.0.0: 20 researched niches (growth, revenue ranges, competition, startup cost, skill fit, avoid list, sources) + the 2027 outlook layer (`outlook_2027` trajectory badge + basis + signals per niche, `breakout_spotlights`, `outlook_2027.platform_signals`, `stream_fit` per niche) | `curl …/api/v1/niches.json` → filter `niches[]` by `revenue_tier`/`skill_fit`/`outlook_2027.trajectory`; read `stream_fit` for the right second revenue stream |
| `GET api/v1/glossary.json` | 26 creator-economy terms + definitions | Look up "RPM", "YPP", "whitelisting" before quoting them |
| `GET api/v1/calculators.json` | Per-niche RPM bands, Shorts RPM, platform thresholds w/ sources+dates, revenue splits, 2026 sponsorship rate card, 2026 research snapshots | The data contract every calculator and the sim engine read |
| `GET api/v1/skills.json` | 12 skills: `name`, `description`, `path` | `skills/deal-negotiation/SKILL.md` for the full procedure |
| `GET api/v1/case-files.json` | 9 creator-business deconstructions: `id`, `title`, `path`, `words`, `read_minutes` | Full text on the `case-*.html` pages |
| `GET api/v1/tools.json` | 16 tools with programmatic `input_schema` (draft-07), output description, `drive_notes` | Replicate any tool's logic without the UI |
| `GET api/v1/schema/<name>.json` | JSON Schema draft-07 for every endpoint (per-doc and per-record) | Validate before you trust a payload |

Skills are the executable layer: each `skills/<name>/SKILL.md` follows
**Use when / Inputs / Procedure / Worked example / API references / Pitfalls**.
Prefer running a skill over improvising the same task.

## End-to-end example workflows

### Workflow 1 — Evaluate a $5K sponsorship offer for a 50K-sub tech channel

Goal: verdict + counter-offer, using the rate card and the Sponsor Deal
Analyzer's logic — all via API.

1. `GET api/v1/calculators.json` → `sponsorship_rate_card_2026`.
   50K followers → `micro_10k_100k` tier → YouTube range **$1,000–$10,000**.
2. Offer **$5,000** is inside the band → verdict **FAIR** (not strong).
3. Implied-CPM check (integrated slot, 40K expected views):
   $5,000 ÷ 40,000 × 1000 = **$125 CPM** vs the `youtube_integrated_slot`
   benchmark **$20–$35** — priced like a *dedication*, so a counter is justified.
4. Offer terms: 30-day paid usage, no exclusivity, net-30.
   Red-flag scan: 30-day paid window → fine, but price it as a line item (+50%);
   net-30 → sane. No structural red flags.
5. Counter-offer worksheet (deal-analyzer math): base = top of range **$10,000**
   (creators list ~23% above what they accept) + paid-usage line item +50%
   (**$5,000**) → counter **$15,000**.
6. Return: verdict (FAIR), the two checks that produced it, the flag scan, and
   the worksheet. Benchmarks are negotiation ranges, never quotes.

### Workflow 2 — Plan a 90-day launch for a cooking channel

Goal: niche → content plan → launch schedule, with monetization gates.

1. `GET api/v1/chapters.json` → read Phase 0 (start-from-nothing system) and
   Phase 1 (content engine) from `llms-full.txt`.
2. `GET api/v1/tools.json` → tool `planner` → `input_schema`. Build the config:
   `{ longform_per_week: 1, shorts_per_week: 3, platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"], rest_day: 6 }`.
3. Replicate the planner's layout (same math as `assets/js/planner.js`):
   13 weeks → **13 long-form + 39 shorts = 52 pieces**, rest Sundays (analytics
   review only), week 7 flagged as the midpoint review, day-45 checkpoint:
   kill the worst format, double the best outlier.
4. `GET api/v1/calculators.json` → `platform_thresholds`:
   YouTube YPP full monetization = **1,000 subs + 4,000 watch hours/12mo**
   (or 10M Shorts views/90d); TikTok Creator Rewards food niche =
   **$0.60–$1.30 RPM** on qualified views (10K followers + 100K views/30d gate).
5. Output: validated niche + the 90-day schedule + the two monetization gates to
   watch. Every platform number carries the verify-live flag.

### Workflow 3 — Run an Empire Simulator scenario for ASMR

Goal: a 12-month growth + revenue model with every assumption named.

1. `GET api/v1/tools.json` → tool `simulator` → `input_schema` + `drive_notes`.
   The engine is `assets/js/sim-engine.js` (UMD — `require()` it in node):
   `simulate(inputs, cfg)` with `cfg` = `api/v1/calculators.json`.
2. ASMR is not a key in the engine's niche maps — declare proxies explicitly:
   `niche: "lifestyle"` (growth factor 1.05, closest supported key for ambient
   content) + `rpmLevel: "low"` (lifestyle band $4–$10 at the floor — ASMR is
   low-RPM). The engine needs a nonzero seed (growth compounds on subs):
   `startSubs: 500`.
3. Inputs: 2 long-form + 5 shorts/week, quality `solid`, growth 12%/mo,
   Q4 uplift 60%, ads on, sponsors/affiliates/digital off.
4. Verified result (executed against the real files): month-12 subs **3,468**,
   12-month ad total **$43.12**, milestones: **1K subs — ad revenue unlocks**.
   `meta` exposes every assumption: rpm $4, nicheGrowth 1.05, cadence 1.39x,
   monthly growth 17.5%.
5. Return the projection **as a model, not a prediction**: assumptions listed,
   proxies labeled, Q4 uplift flagged as adjustable. Never present scenario
   revenue as expected income.

> Wave 13: this hand-built config is now the engine's `asmr-bedroom` scenario —
> `EmpireSim.scenarioInputs("asmr-bedroom")` returns it, with five more presets
> (tech reviewer, betrayal mini-dramas, cooking, personal finance, fitness) in
> `EmpireSim.SCENARIOS`. The ASMR proxies are labeled inside the scenario.

### Workflow 4 — A/B compare two Empire Simulator scenarios (ASMR vs tech reviewer)

Goal: run two paths over the same 12 months, get the delta table and the
"which path wins and why" verdict — all via API.

1. `GET api/v1/tools.json` → tool `simulator` → `input_schema`: new wave-13
   inputs are `scenario_id` (enum of the 6 presets), `horizon` (12 | 24),
   `hires[]` (First Hire guide roles + costs), and `compare_with`
   (`{name_b, inputs_b}` for A/B mode).
2. Load both scenarios from the engine, declare proxies where they exist:
   `EmpireSim.scenarioInputs("asmr-bedroom")` (ASMR → `lifestyle` proxies,
   declared in the scenario) and `EmpireSim.scenarioInputs("tech-reviewer")`.
3. `EmpireSim.compare("ASMR bedroom", asmr, "Tech reviewer", tech, cfg)` —
   both run the same 12-month clock; every delta is **B minus A**.
4. Verified result (executed against the real files):
   ASMR bedroom → month-12 subs **6,434**, 12-month net **$909.02**
   (rpm $4, growth 19.0%/mo — more subs, low RPM);
   Tech reviewer → month-12 subs **5,323**, 12-month net **$7,955.56**
   (rpm $14, growth 11.1%/mo — fewer subs, high RPM).
   Verdict: **"Path Tech reviewer leads on net revenue over 12 months by 775%
   vs ASMR bedroom. Why: RPM $4.00 vs $14.00; monthly growth 19.0% vs 11.1%;
   note: the net-revenue winner is NOT the subscriber winner — subscribers are
   not income."**
5. Return the verdict **as a model, not a prediction**: deltas explained by
   the drivers (RPM band, growth, team spend), the honesty caveat quoted,
   assumptions from `assumptionLines()` attached. Never present scenario
   revenue as expected income.

### Workflow 5 — Manage a sponsorship deal end-to-end (The Deal Room)

Goal: take a live offer from first read to a signed-paper record — scored,
priced, flag-checked, scripted, and memorized — all via API.

1. `GET api/v1/deal-templates.json` → the Deal Room data contract: 4
   negotiation scripts, 6 red-flag items, 6 usage-rights tiers, and the
   scoring rules. Drive the logic with
   `require("assets/js/deal-room.js")` (UMD, importable in node).
2. Score the offer. `DealRoom.tierOf(60000)` → `micro_10k_100k`;
   `calculators.json` `per_video_or_post_by_tier` YouTube →
   **$1,000–$10,000**. `scoreOffer(5000, 1000, 10000)` → **FAIR** with the
   ~23% listed-vs-accepted honesty note.
3. Price usage rights as a separate line item. The offer asks for a 6-month
   paid-ads window: `priceUsage(10000, "paid_180", tiers)` → **+$7,500**
   (1.75×, reported +75% — midpoint of the wave-2 +50–100% research band),
   counter total **$17,500**. Whitelisting and buyout have no research-backed
   multiplier: the engine returns guidance, never a fake number.
4. Run the red-flag checklist. `redFlagScore(["unlimited_revisions"], flags)`
   → **walk away** — unlimited revisions is one of the four walk-away
   signals (with perpetual-usage-for-organic-price, net-90+ without escrow,
   and no kill fee).
5. Render the reply. `renderScript(lowball_counter, {brand, counter, …})`
   fills `{{placeholders}}` from the deal; unknown keys stay visible so
   nothing silently lies. Scripts: lowball counter, usage-rights upsell,
   exclusivity pushback, rush-fee ask (rush fee carries a fill-in rate —
   no research benchmark exists).
6. Export the record. `dealMemo(deal, scored, flags)` builds the one-page
   summary (terms, FAIR verdict, checked flags, counters) with the
   not-financial/legal/tax-advice disclaimer attached.

### Workflow 6 — Run the content engine end-to-end (idea → calendar → batching → repurposing)

Goal: take three raw ideas and walk the whole production pipeline — banked,
scored, dealt into a 90-day calendar, film-day-checked, and repurposed — all
via API.

1. `GET api/v1/content-engine.json` → the Content Engine data contract: 3 idea
   formats, the 5 Short-Form Playbook hook structures, dealing rules, batching
   guidance, the Repurposing 2.0 derivative map, and the Oct-1 originality
   guardrails. Drive the logic with
   `require("assets/js/content-engine.js")` (UMD, importable in node).
2. Bank and score. `ContentEngine.sortIdeas(ideas)` sorts by hook-strength
   score desc (ties by created, no mutation); `hookScore(n)` clamps to 1–5.
   The five structures (open loop, cold start, contrarian, numbered promise,
   question-as-hook) are the scoring rubric — craft formulas, not platform
   documentation.
3. Deal the calendar. `ContentEngine.dealIdeas(ideas, {longsPerWeek: 1,
   shortsPerWeek: 1, restDay: 6, weeks: 13})` — same dealing arithmetic as the
   90-Day Planner: longs sort by score then round-robin onto non-rest work
   days, shorts every other work day, rest day untouched, empty slots stay
   OPEN (never filler), surplus ideas return in `unplaced`. Week 7 carries
   the midpoint review.
4. Check the film-day math. `ContentEngine.batchingMath({videosPerShootDay: 1,
   shootDaysPerMonth: 2, longsPerWeek: 1, shortsPerWeek: 1})` → **shortfall**
   (2 longs/mo capacity vs 4.33 required) — the engine names the decision:
   add a shoot day, drop a slot, or merge formats. Consistency beats volume.
5. Repurpose 2.0. `ContentEngine.repurposeMap(title)` returns the 7-derivative
   map (short clip, community reaction, TikTok cut, Reel cut, newsletter
   issue, X thread, Facebook post) — every derivative carries a **required
   original element** (repurposing is not re-uploading); `originalityGuardrails()`
   returns the five Oct-1 rules (no identical re-uploads, fresh hooks,
   native grammar, written text derivatives, atom-test gate).
6. Bridge. `simInputFromCadence(longs, shorts)` returns `{longform_per_week,
   shorts_per_week}` for the Simulator (a model, not a prediction);
   `exportCalendarText(deal)` renders the copy-my-calendar text. Sponsor slots
   are calendar commitments only — price them in the Deal Room before
   promising them.

### Workflow 7 — Place a creator on the Money Map and generate their roadmap

Goal: take a creator's 7 answers and return their stage + 3-move roadmap —
all via API, no UI.

1. `GET api/v1/tools.json` → tool `money-map` → `input_schema`. Build the
   answer object: `{ platform, audience, revenue, cadence, team, bottleneck,
   streams }`. The `revenue` band is the honest anchor ($0 / $1–99 /
   $100–999 / $1K–9,999 / $10K+); audience and team only generate sanity
   notes, never a big jump.
2. Drive the logic with `require("assets/js/money-map.js")` (UMD, importable
   in node). `MoneyMap.placeStage(answers)` → `{ stage, note, baseStage }`:
   revenue bands map 0→0, 1-99→1, 100-999→2, 1k-9999→3, 10k-plus→4. A 100K+
   audience at base stage ≤ 2 bumps +1 with an `audience-ahead` note
   (monetize the attention); employees at stage ≤ 2 adds a `team-ahead` note
   (check the team math in the Hiring Cost Calculator).
3. `MoneyMap.roadmap(answers)` → `{ stage, note, moves[3], graduate, trap }`.
   Move 1 is always the stage's signature move (Niche Atlas → Revenue
   Calculator → Deal Room → First Hire → Simulator team P&L); moves 2–3 are
   bottleneck-driven, deduped. `MoneyMap.STAGES[i]` carries the full playbook:
   goal, 3 moves with tool/page/why, trap, graduate-when.
4. Example: YouTube, 10K–100K subs, $100–999/mo, multi-weekly, solo,
   monetization bottleneck, 1 stream → **Stage 2 (The Engine Runs)** →
   moves: Deal Room → Revenue Calculator → Sponsor Deal Analyzer;
   graduate-when: three consecutive $1K+ months from 2+ streams.
5. Framing rule (non-negotiable): stages describe what creators at that level
   **typically focus on** — never income promises, timelines, or guarantees.
   This is a planning aid, not financial, legal, or tax advice.

### Workflow 8 — Check YPP eligibility under both rule sets (current vs Feb 2027)

Goal: take a creator's channel stats and return their YPP verdict under the
current bar and the Feb-2027 bar, the gap math, and the close-the-gap plan —
all via API, no UI.

1. `GET api/v1/tools.json` → tool `ypp-checker` → `input_schema`. Build the
   input: `{ subs, watchHours, shortsViews, uploads90d, originality, formatMix }`.
   Example: `{ subs: 1200, watchHours: 6500, shortsViews: 5000000,
   uploads90d: 60, originality: "original", formatMix: "both" }`.
2. Drive the logic with `require("assets/js/ypp-checker.js")` (UMD, importable
   in node). `YppChecker.check(input)` → `{ now, y2027, originalityWarning,
   plan2027, shorterWalk, disclaimer }`. `RULES` pins both rule sets with
   source strings:
   - **Current (through Jan 31, 2027):** 1,000 subs + (4,000 qualified watch
     hours/12mo OR 10M qualified Shorts views/90d); fan-funding tier 500 subs +
     3 uploads/90d + (3,000 hours OR 3M Shorts).
   - **2027 (from Feb 1, 2027):** new applicants 1,000 subs + (8,000 hours/365d
     OR 20M Shorts views/90d); Shorts Creator Pool + Shorts Premium floor 10M
     qualified Shorts views/90d, checked monthly; partner activity test
     (1,000 hours/365d OR 1M Shorts views/90d OR 2 longs/5 Shorts per 90d);
     fan-funding tier unchanged. Sources: YouTube's Aug-10-2026 announcement
     via AIR Media-Tech, AuditSocials, Tablet News, GSMDome.
3. Read the verdicts: `now.full.eligible` / `y2027.full.eligible` (per-check
   pass/fail in `.checks[]`), the `hoursGap`/`shortsGap`/`subsGap` gap math,
   `y2027.shortsFloor` (inside/outside, gap in views), `y2027.activity`
   (partners), and `plan2027[]` — chapter-grounded steps with read-next links
   to real site pages. `originalityWarning` fires for repurposed/reposted
   content with Shorts in play (Oct-1-2026 Shorts originality update).
4. Framing rule (non-negotiable): thresholds are **YouTube-published /
   press-reported program rules**, not forecasts. They change — every verdict
   carries the verify-live-in-YouTube-Studio disclaimer. Educational aid, not
   financial, legal, or tax advice; never an income promise.

## Rate & expectation notes

- **Static JSON.** Nothing here is live: no request counts, no streaming, no
  server-side computation. Payloads are complete snapshots sized for
  client-side filtering.
- **Freshness dates.** Every payload states when it was generated
  (`updated`) and from what snapshot. `calculators.json` carries `version`
  (1.2.0) and `updated` (2026-10-11); platform thresholds carry their own
  `source` + observation date. **Treat undated numbers as stale.**
- **Verify-live flags.** Platform rules (YPP tiers, TikTok Rewards, Reels
  signals) change constantly — the manifest marks `calculators` with a
  `freshness_note`: verify against the platform before acting. The most
  dangerous number on the internet is a stale one.
- **Errors.** Static files can't return error bodies. A missing endpoint means
  a wrong path — re-read `index.json`. Empty results are `[]`, never `null`.
- **Versions.** `meta.version` semver on the manifest; breaking changes get a
  new `v2/` path, never a silent shape change.

## Driving the tools programmatically

Every tool's input contract is a JSON Schema (draft-07) in
`api/v1/tools.json` → `tools[].input_schema`, with `output` and `drive_notes`
explaining how to replicate the logic:

| Tool | Inputs (shape) | How to drive it |
|---|---|---|
| Niche Picker | 6 answers (`q1`–`q6`: interest, camera comfort, money-vs-audience, advantage, format, competition tolerance) + the **"Pick my 2027 niche" branch** (4 answers: 2027 bet, format, risk tolerance, skill fit — scored against the atlas outlook layer in `assets/js/quiz.js`) | Score via `assets/js/quiz.js` tag matching, or run the `niche-validation` skill |
| Revenue Calculator | `niche` (RPM-band key) + monthly long-form/shorts views + sponsor deals + sponsor views + affiliate $ | `views/1000 × RPM band` per stream from `calculators.json`; affiliate ±30% |
| 90-Day Planner | `longform_per_week` (0–7), `shorts_per_week` (0–21), `platforms[]`, `rest_day` (0–6) | Spread long-form across non-rest days, shorts 2 days apart, 13 weeks |
| Sponsor Deal Analyzer | `platform`, `deliverable`, `followers`, `offer_usd` + `usage_rights`, `whitelisting`, `exclusivity`, `payment_terms` | Followers → tier → rate-card range; counter = range top + line items (see Workflow 1) |
| The Deal Room | `brand`, `platform`, `followers`, `deliverable`, `expected_views`, `offer_usd`, `usage_rights`, `exclusivity`, `payment_terms`, `timeline`, `status` (offer → negotiating → signed → delivered → paid) | `require("assets/js/deal-room.js")` — `scoreOffer()` for the verdict, `priceUsage()` for usage line items (reported +50/+75/+100% band; no invented whitelisting/buyout multipliers), `redFlagScore()` for the checklist, `renderScript()` for the 4 negotiation scripts, `dealMemo()` for the one-page record; scripts + checklist + tiers from `api/v1/deal-templates.json` — see Workflow 5 |
| Hiring Cost Calculator | `role`, `billing_model`, `rate_usd` + hours/units/views/`niche` | Sticker → loaded ×1.15; coverage views = loaded ÷ RPM band × 1000; 3-month reserve rule |
| Repurposing Planner | `idea` (one sentence) + `source_format` | Atom test → pillar prep → 5 staggered mission cards (YT Day 0, Short +1, TikTok +2, Reel +3, FB +4) |
| Empire Simulator | `niche`, `startSubs`, cadence, `quality`, `growthRate`, `q4Uplift`, monetization toggles, `scenario_id`, `horizon` (12/24), `hires[]`, `compare_with` | `require("assets/js/sim-engine.js").simulate(inputs, calculatorsJson)` — plus `scenarioInputs(id)`, `compare(nameA,a,nameB,b,cfg)`, `assumptionLines()`, `exportPlan()` — see Workflows 3–4 |
| API Explorer | none (read-only browser over the API) | Skip the UI; fetch the endpoints directly |
| YPP 2027 Eligibility Checker | `subs`, `watchHours`, `shortsViews`, `uploads90d`, `originality` (original/repurposed/reposted), `formatMix` (longform/shorts/both) | `require("assets/js/ypp-checker.js")` — `check(i)` returns current-vs-2027 verdicts, Shorts floor, activity test, gap math, chapter-grounded plan — see Workflow 8 |
| Hook Builder | `topic` (one line) | One hook per Short-Form Playbook structure + the anti-hook checklist |

Full per-tool schemas, formulas, and honesty notes live in `tools.json`;
the UI pages (`quiz.html`, `calculator.html`, …) are the human front-end for
the same logic.

## Honesty rules for agents

- Income ranges are **illustrative, never promises**. Scenario outputs are
  models, never predictions. Rate-card figures are negotiation ranges compiled
  from benchmarks that disagree 2–3x — never present them as quotes.
- Case-file figures are **source-reported, not audited** — structures are
  proven, figures are directional.
- Business/tax content is educational — **not financial, legal, or tax advice**.
- Craft advice (hook structures, editing rules) is technique, **not platform
  documentation**. Platform claims carry sources and dates — verify live.
