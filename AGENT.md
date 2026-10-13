# AGENT.md — How an agent uses Creator Growth Empire

> This site is a static machine-readable knowledge base for the creator
> business: 9 phases, 22 tools, 12 skills, 9 case files, and a versioned JSON
> API. No API key, no server, no auth, no rate limits. Fetch and act.
> Every workflow below was executed against the real `data/v1/` JSON files —> see `tests/agent-workflows.test.js` (run: `node tests/agent-workflows.test.js`).

## Base URL pattern

- **Base:** `data/v1/` relative to the site root.
- Works on any static host. The deployed site ships its own `api/` mirror, so
  the same relative paths work on the live site, on GitHub Pages, or from a
  local clone.
- **Manifest first:** `GET data/v1/index.json` lists every endpoint with its
  description, schema URL (`data/v1/schema/*.json`, JSON Schema draft-07),
  ISO-8601 UTC `updated` timestamp, record counts, and deprecation status.
  Start here; never hardcode endpoint paths.
- **Orientation:** `llms.txt` (one screen: phases, tools, guides, skills, API),
  `llms-full.txt` (complete guide text — all 9 phases + reference + guides).
- **Fetch pattern:** plain `GET` on static JSON. Example with curl:
  `curl https://<site>/data/v1/calculators.json` — or `fetch("data/v1/calculators.json")`
  from a page on the same host.

## Key endpoints (with example requests)

| Endpoint | What you get | Example |
|---|---|---|
| `GET data/v1/index.json` | Self-describing manifest: every endpoint, schema URL, `updated`, record counts | `curl …/data/v1/index.json` → pick `endpoints[].path` |
| `GET data/v1/chapters.json` | 9 phases: `id`, `phase`, `title`, `path`, `words`, `read_minutes` | Find `phase-5-monetization-stack`, then read its full text in `llms-full.txt` |
| `GET data/v1/niches.json` | The Niche Atlas v2.1.0: 20 researched niches (growth, revenue ranges, competition, startup cost, skill fit, avoid list, sources) + the 2027 outlook layer (`outlook_2027` trajectory badge + basis + signals per niche, `breakout_spotlights`, `outlook_2027.platform_signals`, `stream_fit` per niche) + the 10 breakout-format dossiers (`breakout_format_dossiers`: signal, pay, competition, `entry_requirements`, `who_it_suits`, risks, `read_2027`, source weights) | `curl …/data/v1/niches.json` → filter `niches[]` by `revenue_tier`/`skill_fit`/`outlook_2027.trajectory`; read `stream_fit` for the right second revenue stream; read `breakout_format_dossiers[]` for the per-format deep files |
| `GET data/v1/glossary.json` | 26 creator-economy terms + definitions | Look up "RPM", "YPP", "whitelisting" before quoting them |
| `GET data/v1/calculators.json` | Per-niche RPM bands, Shorts RPM, platform thresholds w/ sources+dates, revenue splits, 2026 sponsorship rate card, 2026 research snapshots | The data contract every calculator and the sim engine read |
| `GET data/v1/skills.json` | 12 skills: `name`, `description`, `path` | `skills/deal-negotiation/SKILL.md` for the full procedure |
| `GET data/v1/case-files.json` | 9 creator-business deconstructions: `id`, `title`, `path`, `words`, `read_minutes` | Full text on the `case-*.html` pages |
| `GET data/v1/tools.json` | 21 tools with programmatic `input_schema` (draft-07), output description, `drive_notes` | Replicate any tool's logic without the UI |
| `GET data/v1/schema/<name>.json` | JSON Schema draft-07 for every endpoint (per-doc and per-record) | Validate before you trust a payload |

Skills are the executable layer: each `skills/<name>/SKILL.md` follows
**Use when / Inputs / Procedure / Worked example / API references / Pitfalls**.
Prefer running a skill over improvising the same task.

## End-to-end example workflows

### Workflow 1 — Evaluate a $5K sponsorship offer for a 50K-sub tech channel

Goal: verdict + counter-offer via The Deal Analyzer 2.0 engine — all via API.

1. `GET data/v1/calculators.json` → `sponsorship_rate_card_2026`.
   50K followers → `micro_10k_100k` tier → YouTube base range **$1,000–$10,000**.
2. Niche-adjust: tech ×2.5 (the simulator's `sponsorNicheMult`, same single
   source) → verdict range **$2,500–$25,000**. Offer **$5,000** is inside →
   verdict **FAIR**. The same $5K in gaming (×0.6 → $600–$6,000) also reads
   FAIR — niche moves the verdict, not the offer.
3. Implied-CPM check (dedicated video, 60K expected views):
   $5,000 ÷ 60,000 × 1000 = **$83.33 CPM** vs the dedicated band **$50–$90**
   (AIR agency-benchmark compilation, Oct 2026 — reported, not a rule of thumb).
   Inside. Category cross-check: B2B SaaS & AI sponsors pay ~**$46.50**/1K
   views → 60K views ≈ **$2,800** of category-rate value.
4. Offer terms: 3-month paid usage, no exclusivity, net-30.
   Red-flag scan: 3-month paid window → ok, but price it as a line item
   (+25–50% per the 2026 usage benchmarks); net-30 → sane.
   Contract answers (10 questions) map onto the wave-22 checklist
   (`data/v1/deal-templates.json` `contract_flags`); any `walk_away` flag or
   3+ points → don't sign. NOT legal advice.
5. Counter-offer worksheet (`DealAnalyzer.counterOffer`): base = top of the
   niche-adjusted range **$25,000** (creators list ~23% above what they accept;
   expected close ≈ $25,000 ÷ 1.23 ≈ **$20,000**) + 3-month paid-usage line
   item **$6,300–$13,000** → counter **$31,300–$38,000**. Usage rights are
   always separate line items — never folded into the post fee.
6. Return: verdict (FAIR), the checks that produced it, the flag scan, and
   the worksheet. Benchmarks are negotiation ranges, never quotes. Not
   financial, legal, or tax advice.

### Workflow 2 — Plan a 90-day launch for a cooking channel

Goal: niche → content plan → launch schedule, with monetization gates.

1. `GET data/v1/chapters.json` → read Phase 0 (start-from-nothing system) and
   Phase 1 (content engine) from `llms-full.txt`.
2. `GET data/v1/tools.json` → tool `planner` → `input_schema`. Build the config:
   `{ longform_per_week: 1, shorts_per_week: 3, platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"], rest_day: 6 }`.
3. Replicate the planner's layout (same math as `assets/js/planner.js`):
   13 weeks → **13 long-form + 39 shorts = 52 pieces**, rest Sundays (analytics
   review only), week 7 flagged as the midpoint review, day-45 checkpoint:
   kill the worst format, double the best outlier.
4. `GET data/v1/calculators.json` → `platform_thresholds`:
   YouTube YPP full monetization = **1,000 subs + 4,000 watch hours/12mo**
   (or 10M Shorts views/90d); TikTok Creator Rewards food niche =
   **$0.60–$1.30 RPM** on qualified views (10K followers + 100K views/30d gate).
5. Output: validated niche + the 90-day schedule + the two monetization gates to
   watch. Every platform number carries the verify-live flag.

### Workflow 3 — Run an Empire Simulator scenario for ASMR

Goal: a 12-month growth + revenue model with every assumption named (36-month runs and what-if events: Workflow 11).

1. `GET data/v1/tools.json` → tool `simulator` → `input_schema` + `drive_notes`.
   The engine is `assets/js/sim-engine.js` (UMD — `require()` it in node):
   `simulate(inputs, cfg)` with `cfg` = `data/v1/calculators.json`.
2. Wow wave 2: ASMR is now a REAL study niche — `niche: "asmr"` reads the
   `niche_rpm_2026` band $4–$10 (site lifestyle-band proxy, labeled) at
   `rpmLevel: "low"` ($4 — ASMR is low-RPM), and the TubeAI 1.56%/mo median
   rides along as context (never a multiplier). The engine needs a nonzero
   seed (growth compounds on subs): `startSubs: 500`.
3. Inputs: 2 long-form + 5 shorts/week, quality `solid`, growth 12%/mo,
   Q4 uplift 60%, ads on, sponsors/affiliates/digital off.
4. Verified result (executed against the real files): month-12 subs **3,184**,
   12-month ad total **$40.23**, milestones: **1K subs — ad revenue unlocks**.
   `meta` exposes every assumption: rpm $4 (basis: proxy), nicheMedianGrowth
   0.0156 (context, not a multiplier), cadence 1.39x, monthly growth 16.7%.
5. Return the projection **as a model, not a prediction**: assumptions listed,
   the proxy basis labeled, Q4 uplift flagged as adjustable. Never present
   scenario revenue as expected income.

> Wave 13: this hand-built config is now the engine's `asmr-bedroom` scenario —
> `EmpireSim.scenarioInputs("asmr-bedroom")` returns it, with five more presets
> (tech reviewer, betrayal mini-dramas, cooking, personal finance, fitness) in
> `EmpireSim.SCENARIOS`.
> Wave 24: the library is 12 presets — new: `sleep-ambient` (from the sleep
> channels case file + the 2027 outlook), `english-learning` (21x breakout,
> $18–22 CPM), `senior-health` (19x breakout, ultra-low competition).
> Wow wave 2 flagship: the niche picker shows the 10 real 2026 study niches
> (TubeAI/AIR medians + labeled RPM bands); platform mix (`publish_tiktok` /
> `publish_reels`) splits short-form output across Shorts/TikTok/Reels under
> their real rules; `realityChecks(inputs, res)` returns the kind hard truths;
> `moneyMapToInputs(answers)` feeds the Money Map quiz into starting stats.
> Wow wave 1: explicit UI runs fly the mission-control launch sequence
> (`assets/js/simulator-launch.js`, UMD): `SimLaunch.preflightChecks(inputs,
> {loaded, engineReady})` → four real gates; `SimLaunch.countdownSteps()`;
> `SimLaunch.telemetryFrames(res, stageNames)`; `SimLaunch.debriefFor(inputs,
> res, scenarioName, stageNames)`; each completed launch credits +25 XP to the
> Empire Climb journal via `MoneyMap.awardXP` (shared `cge.empireclimb.v1`
> store with the Money Map).

### Workflow 4 — A/B compare two Empire Simulator scenarios (ASMR vs tech reviewer)

Goal: run two paths over the same 12 months, get the delta table and the
"which path wins and why" verdict — all via API.

1. `GET data/v1/tools.json` → tool `simulator` → `input_schema`: new wave-13
   inputs are `scenario_id` (enum of the 12 presets), `horizon` (12 | 24 | 36),
   `hires[]` (First Hire guide roles + costs), `events[]` (the 5 what-if cards —
   see Workflow 11), and `compare_with`
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

### Workflow 5 — Manage a sponsorship deal end-to-end (The Deal Room 2.0)

Goal: take a live offer from first read to a signed-paper record — scored,
priced, flag-checked, scripted, and memorized — all via API.

1. `GET data/v1/deal-templates.json` → the Deal Room data contract: 4
   negotiation scripts, 6 red-flag items, 6 usage-rights tiers, and the
   scoring rules. Drive the logic with
   `require("assets/js/deal-room.js")` (UMD, importable in node).
2. Score the offer. `DealRoom.tierOf(60000)` → `micro_10k_100k`;
   `calculators.json` `per_video_or_post_by_tier` YouTube →
   **$1,000–$10,000**. `scoreOffer(5000, 1000, 10000)` → **FAIR** with the
   ~23% listed-vs-accepted honesty note. Deal Room 2.0: `scoreDeal(deal,
   rateCard)` does it in one call with the niche multiplier applied
   (parity-pinned with `DealAnalyzer.nicheMult`) — a 50K-sub tech channel's
   $5K offer reads against **$2,500–$25,000** and returns implied CPM
   **$83.33** at 60K expected views.
3. Check the quote against real negotiation data.
   `quotedPriceCheck(deal, calculators.sponsorship_quoted_prices_2026)`
   (calculators v1.5.0) → Cheerful's Sep-2026 typical quotes from 905 asks /
   298 offers / 2,356 rate-card lines (**reported**): TikTok video $2,000,
   video integration $3,000, Instagram Reel $1,800, UGC-no-posting $500;
   typical asks $450 (1K–10K followers) and $4,250 (250K+). Unmapped formats
   (e.g. YouTube dedicated) return null — never stretched. The same block
   carries Click Analytic's 2026 Instagram feed-post model, basis-labeled
   **modeled**, kept separate from the reported figures.
4. Price usage rights as a separate line item. The offer asks for a 6-month
   paid-ads window: `priceUsage(10000, "paid_180", tiers)` → **+$7,500**
   (1.75×, reported +75% — midpoint of the wave-2 +50–100% research band),
   counter total **$17,500**. Whitelisting and buyout have no research-backed
   multiplier: the engine returns guidance, never a fake number.
5. Run the red-flag checklist. `redFlagScore(["unlimited_revisions"], flags)`
   → **walk away** — unlimited revisions is one of the four walk-away
   signals (with perpetual-usage-for-organic-price, net-90+ without escrow,
   and no kill fee).
6. Render the reply. `renderScript(lowball_counter, {brand, counter, …})`
   fills `{{placeholders}}` from the deal; unknown keys stay visible so
   nothing silently lies. Scripts: lowball counter, usage-rights upsell,
   exclusivity pushback, rush-fee ask (rush fee carries a fill-in rate —
   no research benchmark exists).
7. Read the room. `pipelineSummary(deals, rateCard)` totals the creator's
   own pipeline (stage counts/sums, committed = signed+delivered+paid, paid
   total, verdict counts, underpaid deals still in offer/negotiating) — no
   invented close probabilities. `watchDigest(changesFeed, {days: 90})`
   builds the Algorithm Watch digest from `data/v1/changes.json`: newest
   first, dated, sourced, confidence-flagged, each entry with a curated
   deal note (this site's editorial read, labeled as such);
   `digestText(digest)` renders it as copy-ready plaintext. Feed v1.4.0
   holds 22 entries across all seven platform slots — the 2.3 wave
   resolved the three held near-misses (Facebook's expanded two-link-post
   test, TikTok Smart+ Creative Selection, and Kenya's 5% withholding
   scoped per platform) and wired Tubefilter's Twitch tag feed as the
   cron's third upstream; the 2.2 wave
   added Meta's October 8, 2026 ban on TikTok/ByteDance ads in seven
   countries; the 2.0 backfill
   added Facebook's March 2026 originality policy, X's Original Content
   Rewards (Revenue Sharing retired Sept 7, 2026; applications opened
   Sept 8), and Spotify's Partner Program expansion to 37 markets
   (announced Sept 17, effective Oct 20); the 2.1 wave gave Twitch its
   own slot (Creator Sponsorships opened to Affiliates Aug 20, 2026)
   and logged TikTok's 2026H2 Community Guidelines (effective Sept 24)
   and TikTok One Pay / One Plus (Sept 24) — and entries that carry
   `announced_at` / `effective_at` print those dates in the digest text
   alongside the logged date. The Deal Room page asks for
   `{days: 90, limit: 50}` so the digest shows the whole window.
8. Export the record. `dealMemo(deal, scored, flags)` builds the one-page
   summary (terms, FAIR verdict, checked flags, counters) with the
   not-financial/legal/tax-advice disclaimer attached.

### Workflow 6 — Run the content engine end-to-end (idea → calendar → batching → repurposing)

Goal: take three raw ideas and walk the whole production pipeline — banked,
scored, dealt into a 90-day calendar, film-day-checked, and repurposed — all
via API.

1. `GET data/v1/content-engine.json` → the Content Engine data contract: 3 idea
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
7. Content Engine 2.0 extras (same file, same import). `algorithmSignals("tiktok"|"shorts"|"reels")`
   returns the Oct-2026 signal map — hierarchy + mechanics, every claim carrying
   `source` and `source_label` (platform-published / verified-multi-source /
   single-source / creator-lore); treat anything below platform-published as
   guidance, not law. `hookPatterns()` returns the 6 trend-derived structural
   patterns (each with the mechanic it exploits — completion, sends, rewatches…).
   `planBatchWeek({weeklyHours, longsPerWeek, shortsPerWeek, restDay, taskMinutes})`
   blocks the week into film/edit/publish day-blocks (8h/day cap, rest day
   untouched) → verdict holds/tight/over with lever guidance; task-minute
   defaults are starting estimates, never benchmarks. All of it mirrors
   `data/v1/content-engine.json` (v1.1.0).

### Workflow 7 — Place a creator on the Money Map and generate their roadmap

Goal: take a creator's 7 answers and return their stage + 3-move roadmap —
all via API, no UI.

1. `GET data/v1/tools.json` → tool `money-map` → `input_schema`. Build the
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
   moves: Deal Room → Revenue Calculator → The Deal Analyzer;
   graduate-when: three consecutive $1K+ months from 2+ streams.
5. Framing rule (non-negotiable): stages describe what creators at that level
   **typically focus on** — never income promises, timelines, or guarantees.
   This is a planning aid, not financial, legal, or tax advice.
6. Wow wave 1 — the Empire Climb: the same UMD module carries the XP/rank
   economy. `MoneyMap.RANKS` (RECRUIT/CADET/OPERATIVE/COMMANDER/GENERAL, one
   per stage, chevron insignias), `RANK_THRESHOLDS` [0,100,275,500,775],
   `XP_AWARDS` {survey:50, move:25, stage:100, mission:25} —
   `MoneyMap.awardXP(store, key, amount, label)` is idempotent per key and
   returns `{awarded, total, rankBefore, rankAfter, rankedUp}`;
   `MoneyMap.revokeKey` undoes; `rankFor`/`nextRankInfo` map totals to ranks.
   XP is a work journal — missions cleared, stages closed — never money
   earned; no rank promises revenue.

### Workflow 8 — Check YPP eligibility under both rule sets (current vs Feb 2027)

Goal: take a creator's channel stats and return their YPP verdict under the
current bar and the Feb-2027 bar, the gap math, and the close-the-gap plan —
all via API, no UI.

1. `GET data/v1/tools.json` → tool `ypp-checker` → `input_schema`. Build the
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

### Workflow 9 — Run an outbound sponsor campaign (The Outreach Center)

Goal: take a creator's stats and a brand list, and run the whole outbound
loop — pipeline, pitch, quote, contract read — all via API, no UI.

1. `GET data/v1/tools.json` → tool `outreach` → `input_schema` (`OutreachInput`).
   Build the input: `{ brand, contactName, email, status, followUpDate,
   followers, platform, deliverable, expectedViews, pitchTemplate, pitchVars,
   contractFlags }`. Example: `{ brand: "Acme", followers: 50000,
   platform: "youtube", deliverable: "integrated", expectedViews: 40000,
   pitchTemplate: "cold_pitch", contractFlags: [] }`.
2. Drive the logic with `require("assets/js/outreach.js")` (UMD, importable
   in node) against `data/v1/calculators.json` (`sponsorship_rate_card_2026` +
   `sponsorship_rule_of_thumb`) and `data/v1/deal-templates.json`
   (`pitch_templates`, `contract_flags`):
   - **Pipeline.** `validDeal(d)` validates records; `pipelineStats(deals)` →
     `{ contacted, responded, activeDeals, signed, responseRate, closeRate }`
     with the ~5% normal-reply note; `dueFollowUps(deals, todayIso)` buckets
     the single 7-day nudges (overdue / due today / upcoming).
   - **Quote.** `quoteCalc(input, rateCard, ruleOfThumb)` → tier range
     (50K YouTube = micro **$1,000–$10,000**), top-of-range quote point
     **$10,000**, expected close ~$7,700 (the ~23% listed-vs-accepted math),
     and the CPM cross-check ($250 implied vs the $20–$35 integrated-slot
     band — dedication-level pricing on those views). Usage rights stay
     separate line items, priced in the Deal Room.
   - **Pitch.** `renderPitch(template, vars)` fills the 3 honest templates
     (cold pitch / the one 7-day nudge / warm intro); unfilled `[brackets]`
     stay visible so no stat is ever invented. Templates carry the
     anti-spam contract: one targeted email per brand, one nudge, then
     move on.
   - **Contract.** `contractRisk(ids, flags)` → per-item plain-language
     `fix` + a `clean` / `caution` / `dont_sign` verdict (any walk_away flag
     or 3+ points → don't sign as written).
3. Framing rule (non-negotiable): ranges are **reported 2026 benchmarks that
   disagree 2–3× within tiers**, never quotes; pitch stats are the creator's
   own real numbers or nothing; the contract summary is **not legal advice**
   (contracts above $500 deserve a real lawyer's eyes). Educational aid, not
   financial, legal, or tax advice; never an income promise.

### Workflow 10 — Adapt one clip for every platform (the Cross-Post Optimizer)

Goal: take a finished clip and build the per-destination adaptation plan —
aspect, captions, hooks, CTAs, disclosure labels — under the Oct-1
originality rules, all via API, no UI.

1. `GET data/v1/tools.json` → tool `crosspost` → `input_schema` (`CrossPostInput`).
   Build the input: `{ source_platform, destinations[], photorealistic_ai }`.
   Example: `{ source_platform: "tiktok", destinations: ["shorts", "reels"],
   photorealistic_ai: false }`.
2. Drive the logic with `require("assets/js/content-engine.js")` (UMD,
   importable in node) against `data/v1/content-engine.json` (`adaptation_matrix`):
   - **Plan.** `adaptChecklist(source_platform, destinations)` → per-destination
     cards (grammar note + ordered changes: hook rework, caption rewrite, CTA
     swap, audio rights, disclosure label); the source itself and unknown
     platforms are filtered out — `{ ok: false }` only on an unknown source.
   - **Gate.** Every plan carries the `gate` (Oct-1-2026: YouTube judges at the
     channel level; TikTok demotes reused content; Meta's March 2026 policy
     targets low-value reposts) plus the 6 `universal` checks (native uploads,
     no watermarks, 9:16, one original element minimum per destination,
     stagger posting).
   - **AI flag.** `photorealistic_ai: true` triggers the disclosure reminder:
     YouTube's AI-content label before upload — labeled gets normal
     distribution (Ritchie, May 2026); undisclosed photorealistic AI faces
     reduced recommendations or removal.
3. Framing rule (non-negotiable): checklists are **adaptation guidance under
   the platforms' stated 2026 rules** — never a promise of reach, views, or
   revenue. Platform rules change; verify live before acting on anything that
   matters. The `content-repurposing` skill owns the full pillar-to-everywhere
   SOP this tool plugs into. Planning aid, not financial, legal, or tax advice.

### Workflow 11 — Run a 36-month empire with what-if events (Simulator 3.0)

Goal: a 3-year projection with compounding growth, year-2/year-3 decay,
Money Map stage transitions, and a named shock card — all via API, no UI.

1. `GET data/v1/tools.json` → tool `simulator` → `input_schema`: `horizon`
   (12 | 24 | 36) and `events[]` (the 5 what-if cards with their assumed
   effects — incl. the wave-25 `holiday-shopping-surge`: affiliate revenue
   ×1.8 for the event month + the next one, the two-month holiday buying
   window). Engine: `require("assets/js/sim-engine.js")` (UMD).
2. Load a scenario: `EmpireSim.scenarioInputs("english-learning")`
   (the 2027-outlook 21x breakout niche), then set `inputs.horizon = 36`
   and `inputs.events = [{ id: "algorithm-change", startMonth: 12 }]` —
   the Oct-1-2026 Shorts reach-cut card landing at month 12.
3. `EmpireSim.simulate(inputs, cfg)` with `cfg` =
   `data/v1/calculators.json`. Verified result (executed against the real
   files): 36 months, month-12 → month-13 growth drops ×0.94 (the year-2
   curve), month-24 → month-25 ×0.97 (year-3), `stages` lists the first
   month each Money Map stage was reached (stage rule:
   `EmpireSim.stageForNet(net, teamActive)` — <$100 = 0, <$1K = 1,
   <$10K = 2, ≥$10K = 3, team + ≥$10K = 4), and `months[11].shortViews`
   is ×0.6 the no-event baseline (the card's labeled assumption).
4. Compare with the baseline: `EmpireSim.compare("English learning",
   base36, "English learning + algo cut", shocked36, cfg)` — deltas are
   **B minus A**, the verdict names the net-revenue winner with drivers
   and the honesty caveat. Verified: the event path ends lower on net,
   and the verdict says so in plain language.
5. Framing rule (non-negotiable): 36-month numbers are **scenario models
   with stated assumptions — not predictions, not promises, never
   expected income**. The cards' multipliers are the engine's labeled
   assumptions (each card cites its chapter basis); the platform rules
   they model (Oct-1 originality, Feb-2027 YPP) must be verified live.
   Not financial, legal, or tax advice.

### Workflow 12 — Run a full Deal Analyzer 2.0 evaluation

Goal: paste-the-terms → verdict + flag scans + contract checklist + counter
+ shareable report, all through the real engine (`require("assets/js/deal-analyzer.js")`
— UMD, the same code the page runs).

1. `GET data/v1/calculators.json` → `sponsorship_rate_card_2026` +
   `usage_rights_benchmarks_2026` (calculators v1.5.0); `GET data/v1/deal-templates.json`
   → `contract_flags` (the wave-22 checklist, 10 flags, single data source).
2. `DealAnalyzer.validInput({...})` — platform, deliverable, followers,
   expected views, offer, usage/whitelisting/exclusivity/payment terms,
   timeline, post count, niche, and the 10 contract-language answers. Validate
   first; the engine coerces and defaults (unknown platform → youtube, unknown
   niche → null — never stretched).
3. `evaluate(deal, rateCard)` → tier, niche-adjusted range, FAIR/UNDERPAID/
   STRONG verdict, implied-CPM position, category cross-check
   (AIR Oct-2026 CPMs where mapped; null where unmapped), expected close
   ($hi ÷ 1.23), cross-platform context. `offerTermFlags(deal)` → the
   usage/whitelisting/exclusivity/payment/timeline scan.
4. `mapTermsToFlags(deal)` maps the 10 answers onto flag ids;
   `contractRisk(ids, flags)` scores them (walk_away → don't sign; major 2pts,
   minor 1pt; 3+ → don't sign) — the identical scoring as the Outreach
   Center. A negotiation aid, NOT legal advice.
5. `counterOffer(deal, rateCard, benchmarks)` → line items (base + usage +
   whitelisting + exclusivity, each labeled benchmark/chapter/rule), honest
   2-significant-figure totals, open-ended `from $X` when perpetual usage is
   in play, the 3+ post bundle note (15–20% off typical + the 41% stat).
   `exportReport({brand, deal, evaluation, termFlags, contractRisk, counter})`
   → the copy/send plaintext. `compareDeals(A, B)` → side-by-side of two
   saved-deal snapshots (5 verdict rows + differing terms).
6. Framing rule: **benchmarks are negotiation ranges, never quotes; the
   report is a negotiation aid — not financial, legal, or tax advice.**

### Workflow 13 — "What would it take?" (goal solver)

Goal: invert the Empire Simulator — find the growth rate or cadence that
lands a target by a target month, via API.

1. `GET data/v1/calculators.json` as `cfg`; engine =
   `require("assets/js/sim-engine.js")`.
2. `EmpireSim.solveForGoal(inputs, cfg, {target: "subs"|"net"|"stage",
   value, month, variable: "growth"|"cadence"})` — integer binary search:
   growth = whole % (2–60), cadence = half-videos (0–14). Verified: 100K
   subs by month 18 from 1K subs → **23% base monthly growth**
   (re-simulation at 23% lands ≥100K at month 18 — the answer is always
   re-verified, never trusted from the search alone).
3. Honest edges, all labeled: already-there → short-circuit with the current
   projection; unreachable at max settings → `unreachable` with the max
   achievable stated; stage 4 without an active hire → `stage4_needs_team`
   (stage 4 = team + ≥$10K net — the rule, not the solver, decides).
4. Framing rule: the solver's answer is **the model's answer, not a promise**
   — hold every other input fixed, reality has variance. Pair it with the
   Lilach Bullock reality check the page shows (fewer than 1% of YouTube
   channels ever reach 100K subscribers — single source, labeled as such).
   Not financial, legal, or tax advice.

### Workflow 14 — Build a sponsor package quote (Deal Builder)

Goal: turn a deliverable list into a line-item quote, a proposal, and a
deal checklist — via API, against the real 2026 rate card.

1. `GET data/v1/calculators.json` as `cfg`; engine =
   `require("assets/js/deal-builder.js")`.
2. `DealBuilder.buildQuote({followers: 50000, deliverables: [{platform:
   "youtube", kind: "dedicated", count: 1}, {platform: "tiktok", kind:
   "short", count: 2}], viewsAvg: 25000, usage: "paid_3mo",
   whitelistingMonths: 1, exclusivity: {scope: "named", months: 1},
   affiliate: {include: true, commissionPct: 10}},
   cfg, cfg.usage_rights_benchmarks_2026)` → micro tier; dedicated line
   $1,000–$10,000 (tier band); 2× short at 25K views → 2 × ($500–$875)
   (sponsored-CPM anchoring); usage +25–50% as its own line;
   whitelisting 1 mo × 30–100%; named 30-day exclusivity +25%;
   package total with the top-of-range ask and the ~23% expected landing
   zone. Verified: expected close = total × 0.77, 2-sig-fig rounding.
3. `DealBuilder.exclusivityConflicts(input)` — window-mismatch and
   broad-lock checks (walk_away/flag/note levels); the tool can't see your
   other contracts and says so.
4. `DealBuilder.buildChecklist(quote)` — the 7-group checklist
   (usage, payment, revisions, exclusivity, FTC disclosure, deliverables,
   walk-away), customized to the quote's actual terms.
5. `DealBuilder.renderPitch(input, quote)` — the proposal email: real
   quote numbers in, every unsupplied stat stays a `[bracket]` (never
   invented). The human page is `deal-builder.html`; the deep layer is
   the 2026 Sponsor Playbook (`sponsor-playbook.html`).
6. Framing rule: the quote is the top of reported ranges, not a promise —
   benchmarks disagree 2–3× within tiers; verify against current
   creator rate reports before sending. Not financial, legal, or tax advice;
   the checklist is not legal advice.

### Workflow 15 — Build the counter, the reply, and the walk-away (Negotiation Kit)

Goal: take one live offer and produce the counter with its evidence, the
exact reply to send, and the walk-away number — via API, against the real
2026 rate-card data (calculators v1.5.0).

1. `GET data/v1/calculators.json` as `cfg`; `GET data/v1/deal-templates.json`
   for the reply scripts (v1.2.0 `negotiation_kit_scripts`); engine =
   `require("assets/js/negotiation-kit.js")` (UMD).
2. `NegotiationKit.buildCounter({brand: "Acme", platform: "youtube",
   deliverable: "integrated", followers: 50000, expectedViews: 60000,
   offer: 5000, niche: "tech_software", usage: "paid_6mo"}, cfg)` →
   micro tier, niche-adjusted range **$2,500–$25,000** (tech ×2.5), verdict
   **FAIR**; implied CPM **$83.33** — above the $20–$35 integrated band
   (reported); evidence: typical quote **$3,000** for a video integration
   (Cheerful Sep-2026, reported), no typical-ask band maps at 50K followers
   (null, never stretched). Counter: post fee **$25,000** (top of range) +
   paid 3–6-month usage line **$13,000–$19,000** (+50–75%, reported) →
   total **$38,000–$44,000**, expected landing zone **$29,000–$34,000**
   (the ~23% listed-vs-accepted math). Perpetual usage returns an
   open-ended total; broad category exclusivity returns a flag, never an
   invented multiplier; the Instagram modeled cross-check (Click Analytic
   2026) is returned separately with basis **modeled**.
3. `NegotiationKit.walkAwayPanel(input, deals, cfg)` with the creator's
   own Deal Room tracker records (4 deals: $500 offer / $5,000 signed /
   $2,000 + $3,000 paid) → rate floor **$2,500**, walk-away **$2,500**
   (no personal floor set), pipeline **$10,000 committed / $5,000 paid /
   $2,500 average paid / 1 still open**, stance **workable** on the $5,000
   offer. Arithmetic on the creator's numbers only — no close
   probabilities are invented.
4. `NegotiationKit.replyVars(counter)` carries the counter's numbers into
   the scripts; `renderReply(script, vars)` fills `{{placeholders}}` and
   leaves unsupplied ones visible. Six scripts: the counter, the lowball,
   exposure-only, usage rights, whitelisting, late payment.
   `exportBrief(counter, walk)` renders the one-page plaintext brief.
5. Framing rule: **a model, not a prediction** — the counter is built from
   reported ranges that disagree 2–3× within tiers, never presented as a
   guarantee of what a brand will pay. Not financial, legal, or tax advice.

## Rate & expectation notes

- **Static JSON.** Nothing here is live: no request counts, no streaming, no
  server-side computation. Payloads are complete snapshots sized for
  client-side filtering.
- **Freshness dates.** Every payload states when it was generated
  (`updated`) and from what snapshot. `calculators.json` carries `version`
  (1.5.0) and `updated` (2026-10-12); platform thresholds carry their own
  `source` + observation date. **Treat undated numbers as stale.** The 1.4.0
  block is `usage_rights_benchmarks_2026` (3mo +25–50% → perpetual from 2x
  base, whitelisting 30–100%/mo — projectcasting 2026 via the Q4 sweep);
  the 1.5.0 block is `sponsorship_quoted_prices_2026` (Cheerful Sep-2026
  reported asks/quotes + Click Analytic 2026 modeled Instagram cross-check,
  bases labeled).
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
`data/v1/tools.json` → `tools[].input_schema`, with `output` and `drive_notes`
explaining how to replicate the logic:

| Tool | Inputs (shape) | How to drive it |
|---|---|---|
| Niche Picker | 6 answers (`q1`–`q6`: interest, camera comfort, money-vs-audience, advantage, format, competition tolerance) + the **"Pick my 2027 niche" branch** (4 answers: 2027 bet, format, risk tolerance, skill fit — scored against the atlas outlook layer in `assets/js/quiz.js`) | Score via `assets/js/quiz.js` tag matching, or run the `niche-validation` skill |
| Revenue Calculator | `niche` (RPM-band key) + monthly long-form/shorts views + sponsor deals + sponsor views + affiliate $ | `views/1000 × RPM band` per stream from `calculators.json`; affiliate ±30% |
| 90-Day Planner | `longform_per_week` (0–7), `shorts_per_week` (0–21), `platforms[]`, `rest_day` (0–6) | Spread long-form across non-rest days, shorts 2 days apart, 13 weeks |
| The Deal Analyzer | `platform`, `deliverable`, `followers`, `offer_usd` + `niche`, `expected_views`, `usage_rights`, `whitelisting`, `exclusivity`, `payment_terms`, `timeline`, `post_count`, `contract{}` (10 answers) | `require("assets/js/deal-analyzer.js")` — `evaluate()` for the niche-adjusted verdict + implied-CPM + category cross-check, `offerTermFlags()` for the term scan, `mapTermsToFlags()` + `contractRisk()` for the wave-22 checklist, `counterOffer()` for the worksheet, `exportReport()` for the shareable report, `compareDeals()` for 2-deal comparison — see Workflows 1, 12 |
| The Deal Room | `brand`, `platform`, `followers`, `deliverable`, `expected_views`, `offer_usd`, `niche` (optional), `usage_rights`, `exclusivity`, `payment_terms`, `timeline`, `status` (offer → negotiating → signed → delivered → paid) | `require("assets/js/deal-room.js")` — `scoreOffer()` for the verdict, `scoreDeal()` for the niche-adjusted verdict + implied CPM, `quotedPriceCheck()` against the v1.5.0 quoted-prices block (reported Cheerful asks/quotes; modeled Click Analytic IG cross-check kept separate), `pipelineSummary()` for the creator's own stage totals, `rateCardTable()` for the full benchmark panel, `watchDigest()` + `digestText()` for the Algorithm Watch digest from `data/v1/changes.json`, `priceUsage()` for usage line items (reported +50/+75/+100% band; no invented whitelisting/buyout multipliers), `redFlagScore()` for the checklist, `renderScript()` for the 4 negotiation scripts, `dealMemo()` for the one-page record; scripts + checklist + tiers from `data/v1/deal-templates.json` — see Workflow 5 |
| Hiring Cost Calculator | `role`, `billing_model`, `rate_usd` + hours/units/views/`niche` | Sticker → loaded ×1.15; coverage views = loaded ÷ RPM band × 1000; 3-month reserve rule |
| Repurposing Planner | `idea` (one sentence) + `source_format` | Atom test → pillar prep → 5 staggered mission cards (YT Day 0, Short +1, TikTok +2, Reel +3, FB +4) |
| Empire Simulator | `niche` (10 real 2026 study keys), `startSubs`, cadence, `quality`, `growthRate` (1–40%), `q4Uplift`, monetization toggles, `publish_tiktok`, `publish_reels`, `short_mix`, `scenario_id`, `horizon` (12/24/36), `hires[]`, `events[]`, `compare_with` | `require("assets/js/sim-engine.js").simulate(inputs, calculatorsJson)` — plus `scenarioInputs(id)`, `compare(nameA,a,nameB,b,cfg)`, `assumptionLines()`, `exportPlan()`, `normalizeEvents()`, `stageForNet(net, teamActive)`, `solveForGoal(inputs, cfg, goal)`, `realityChecks(inputs, res)` (the kind hard truths), `moneyMapToInputs(answers)` (Money Map quiz → starting stats), `rpmBandForNiche(niche, cfg)` (labeled basis) — wow wave 2 flagship: niche/cadence/quality sliders, 10 real study niches with TubeAI/AIR medians as context (never multipliers), platform mix under the real Shorts/TikTok/Reels rules, animated watch-the-empire-build chart with milestone celebrations — see Workflows 3–4, 11, 13 |
| API Explorer | none (read-only browser over the API) | Skip the UI; fetch the endpoints directly |
| YPP 2027 Eligibility Checker | `subs`, `watchHours`, `shortsViews`, `uploads90d`, `originality` (original/repurposed/reposted), `formatMix` (longform/shorts/both) | `require("assets/js/ypp-checker.js")` — `check(i)` returns current-vs-2027 verdicts, Shorts floor, activity test, gap math, chapter-grounded plan — see Workflow 8 |
| Hook Builder | `topic` (one line) | One hook per Short-Form Playbook structure + the anti-hook checklist |
| The Outreach Center | `brand`, `contactName`, `email`, `status` (pitched → replied → negotiating → signed → passed), `followUpDate`, `followers`, `platform`, `deliverable`, `expectedViews`, `pitchTemplate` (cold_pitch/follow_up_nudge/warm_intro), `pitchVars{}`, `contractFlags[]` | `require("assets/js/outreach.js")` — `validDeal()` for pipeline records, `pipelineStats()` for response/close rates, `dueFollowUps()` for the one-nudge buckets, `quoteCalc()` for the tier range + CPM cross-check (top-of-range quote, ~23% expected-close math), `renderPitch()` for the 3 honest templates (unfilled `[brackets]` stay visible — never invent stats), `contractRisk()` for the checklist (any walk_away flag or 3+ points → don't sign); templates + contract flags from `data/v1/deal-templates.json` — see Workflow 9 |
| Cross-Post Optimizer | `source_platform` (tiktok/shorts/reels/facebook), `destinations[]`, `photorealistic_ai` (boolean) | `require("assets/js/content-engine.js")` — `adaptChecklist(source, dests)` → per-destination cards (hook rework, caption rewrite, CTA swap, audio rights, disclosure label) + 6 universal checks + the Oct-1 gate; matrix from `data/v1/content-engine.json` → `adaptation_matrix`; pairs with the `content-repurposing` skill — see Workflow 10 |
| Cadence Coach | `platforms`, `weeklyHours`, `longMins`, `shortMins`, `restDay`, `stage`, `priority` (longs/shorts/balanced) | `require("assets/js/cadence.js")` — `recommend(i)` → longs/week + shorts/week, holds/tight/over utilization, 7-day grid, Oct-2026 platform revenue realities, 2-week ramp — capacity math only, never a growth promise |
| Format Fit Finder | `experience` (teacher/tech/finance/legal/health/audio/writer/operator/none-yet), `weeklyHours`, `camera` (face/voice/hands/anything), `budget` (free/modest/real), `goal` (fast/mid/slow), `risk` (safe/balanced/bold) | `require("assets/js/format-fit.js")` — `recommend(i)` → 10 breakout formats ranked by axis scores (experience/camera/hours/budget/goal/risk = 13 max, strong ≥9), per-match why-it-fits, the catch from dossier risks, creator-reported pay ranges, first 3 moves, per-match + global mismatch flags — matching arithmetic, never a promise |
| Deal Builder | `followers`, `deliverables[]` (`platform` youtube/tiktok/instagram, `kind` dedicated/integrated/short/ugc, `count` 1–12), `viewsAvg`, `usage` (organic_only/paid_3mo/paid_6mo/paid_12mo/perpetual), `whitelistingMonths` (0–24), `exclusivity{scope, months}`, `affiliate{include, commissionPct}` | `require("assets/js/deal-builder.js")` — `buildQuote()` for the stacked line-item quote (usage/whitelisting/exclusivity as separate lines, expected close ×0.77), `exclusivityConflicts()` for window checks, `buildChecklist()` for the 7-group checklist, `renderPitch()` for the proposal ([brackets] for unsupplied stats); tier math parity-pinned with Outreach — see Workflow 14 |
| Negotiation Kit | `brand`, `platform`, `deliverable` (integrated/dedicated/short/ugc), `followers`, `offer` (0 = exposure-only), `expectedViews`, `niche`, `usage`, `whitelistingMonths`, `exclusivity{scope, months}`, `postCount`, `creatorFloor` + the creator's Deal Room deal records for the walk-away panel | `require("assets/js/negotiation-kit.js")` — `buildCounter(input, calculatorsJson)` for the niche-adjusted verdict + implied CPM + reported typical-quote/ask evidence (modeled IG cross-check kept separate, nulls where unmapped) + line-item counter + expected landing zone; `walkAwayPanel(input, deals, calculatorsJson)` for the floor + pipeline stance; `replyVars()` + `renderReply()` for the 6 kit scripts in `data/v1/deal-templates.json` (`negotiation_kit_scripts`); `exportBrief()` for the plaintext brief — see Workflow 15 |

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
