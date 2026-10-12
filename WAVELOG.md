# Creator Growth Empire — Wave Log

## Wave 24 — Empire Simulator 3.0: 36-month projections, what-if event cards, stage transitions (2026-10-11)

Engine v2.0.0: the simulator grows from a 12/24-month sandbox into a full 36-month planning instrument — multi-year compounding with honest decay, the five Money Map stages placed per month, and four toggleable what-if event cards with chapter-cited assumed effects. Plus three new scenarios from the 2027 outlook and a shared two-path outcome chart for A/B comparisons. Honesty contract intact throughout: no income promises; "not financial/legal/tax advice" copy preserved; every event multiplier is the engine's labeled assumption, never platform data; every 36-month number is a scenario model, never a prediction.

What shipped:
1. **36-month projections** (`assets/js/sim-engine.js` — `horizon` now 12/24/36, clamped at 36; hire `startMonth` and `digital_start_month` clamps extended to 36): year-2 decay ×0.94/mo after month 12 (unchanged), new year-3 decay ×0.97/mo after month 24 — growth slows, stays positive, never collapses (plateau, not collapse). Q4 uplift months 34–36. 12-month math is byte-identical to v1 (all wave-13 pins still pass unmodified).
2. **What-if event cards** (`DEFAULTS.eventCards`, 4 cards; `inputs.events = [{id, startMonth}]`, `normalizeEvents()`): **algorithm change** (Shorts views ×0.6 from the card month — the Oct-1-2026 originality update, per the algorithm signal map); **viral hit** (event month long views ×10, subs get a one-time +8% lift only, next month ×1.5 tail — the reality check is in the card copy: virality spikes views, not loyalty); **burnout break** (2 months: growth 0%, subs −0.5%/mo drift, views ×0.3 back-catalog); **policy change** (Feb-2027 YPP rules: rolling-90d Shorts views under 10M ⇒ Shorts ads $0 that month, long-form pays as usual — the YPP checker's floor logic, monthly application). Each card names its assumed effect + chapter basis; per-month records carry `eventsActive[]`, `shortsFloorBlocked`, `viralMonth`.
3. **Money Map stage transitions**: `stageForNet(net, teamActive)` (exported, single source — the UI and tests use it): net <$100 ⇒ stage 0, <$1K ⇒ 1, <$10K ⇒ 2, ≥$10K ⇒ 3, team + ≥$10K ⇒ 4. Every month gets a `stage`; `res.stages` lists each stage's first month; `endStage` on the export. Stage journey stickers on the results page, a Stage column in the ledger, and the stage journey in `exportPlan()`.
4. **Three new 2027-outlook scenarios** (library 9→12): `sleep-ambient` (case file: Fortune-verified $40–60K/mo network, Dec 2025 + 2027 outlook "stable, 14x breakout" with the Jan-2026 enforcement caveats; lifestyle proxies declared, from-scratch planning assumptions only); `english-learning` (OutlierKit 21x breakout, $18–22 CPM — sits above the education RPM band, so `rpmLevel: high` = the band's honest $10 ceiling, stated in the source line); `senior-health` (OutlierKit 19x breakout, ultra-low competition; 31% of mini-drama viewers are 45–64, Ampere). Verified 36-month runs: english-learning net $17,172 baseline vs $17,045 with the month-12 algorithm cut (long-form-heavy — the cut bites hardest where Shorts ARE the business: betrayal-dramas $3,447 → $2,633, −24%).
5. **Strategy compare 3.0**: the horizon select drives both paths (12/24/36); new shared net-revenue chart (two lines, A=acid / B=coral, one clock) above the delta table; assumptions panels for both sides unchanged and always visible. `compare()` needed no shape change — deltas stay B minus A at any horizon.
6. **UI**: horizon selector replaces the 24-month checkbox; event cards render from the engine's card library (copy can never drift from the math); the assumptions drawer lists year-2/year-3 decay, all four card effects, and the stage rule; end-stage joins the stat grid; ⚡ marks event months in the ledger. ARIA/ keyboard/ prefers-reduced-motion conventions unchanged.
7. **Agentic surface**: `api/v1/tools.json` simulator record — description (12–36 months), `input_schema` (12 scenario ids, horizon enum [12,24,36], `events[]` with the 4-card enum + `start_month`, hire/digital clamps at 36), output contract (36-mo P&L, stages, events), drive notes (`normalizeEvents()`, `stageForNet()`); AGENT.md — new **Workflow 11** (the full 36-month + what-if run, executed against the real files: month-13 ×0.94, month-25 ×0.97, stage transitions, ×0.6 Shorts cut, B-minus-A compare) + the tool-drive row (12/24/36, `events[]`) + workflow-4 input updates (12 presets); pages/agents.md — workflow 4 updated (12 presets, 3.0 inputs) + new workflow 7 (36-month + what-if); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: the cards are simulator inputs, driven via the engine + Workflow 11; no existing skill owns scenario stress-testing, and the schema + workflow cover agentic use.

**Tests**: `tests/sim-engine.test.js` 84→**166 assertions** — §36-month projections (pinned decay math month-13/25/36, growth positive at month 36, year-3 Q4 months 34–36, horizon cap now 36, hire clamp at 36), §stage transitions (all four boundary pins incl. the $100/$10K exact-boundary checks, team+net⇒4, transitions only rise, endStage consistency, the five Money Map names), §what-if events (per-card effect pins with views-per-sub normalization where compounding applies: algo ×0.6 + long-form untouched + start-month pinning, viral 10x / +8% subs / 1.5x tail / views-per-sub back to 1x after, burnout exactly 2 months + −0.5% drift + ×0.3 view rate, policy floor blocks small-scale Shorts ads but spares long-form and clears above 10M/90d; unknown-id drop, startMonth default/clamp), §compare on 36 months (same clock, B-minus-A, "over 36 months" verdict), §new scenarios (12 presets, each simulates 12 finite months on a real RPM band, 2027-outlook/case-file source citations); `tests/agent-workflows.test.js` 88→**104 assertions** (wf4: 12 scenario presets, horizon 12|24|36 + `events` in the schema; new wf11 block executing AGENT.md Workflow 11 against the real JSONs — card library discovery, decay pins, stage-boundary pins, ×0.6 cut, 36-month compare, exportPlan stage journey + event line). Wired into `validate.sh` stage 6 (existing entries).

Validation: `scripts/build.py` clean (9 chapters, 18 tools, 12 skills, 9 case files, 17,224 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the extended simulator input schema with `events`, 0 broken links (2,693 checked), byte-identical rebuild on the committed tree, 166 sim + 78 deal-room + 111 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 104 agent-workflow assertions).

Commit: 15ffa6f (local) → d0622df031ebaaa5095efcea35af099775a1ef39 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-24 files in the recursive tree).

## Wave 23 — Content Engine 2.0 (2026-10-11)

Engine v1.1.0 + data contract v1.1.0: the Oct-2026 algorithm research integrated as a source-labeled signal map, six trend-derived hook patterns, an interactive weekly batch scheduler, and a new Cross-Post Optimizer tool (#18) — all wired through `ContentEngine.*`, the API, and the agentic surface. Honesty contract intact throughout: no income promises; "not financial/legal/tax advice" copy preserved everywhere; RPM/CPM-adjacent figures stay creator-reported with source labels; every algorithm claim carries `source_label` (platform-published / verified-multi-source / single-source / creator-lore) so agents and readers know what weight to give it.

**Research (wave-fuel Mission A, read 2026-10-11 — integrated, every claim labeled):**
- TikTok hierarchy re-verified as three-source consensus (Hootsuite, Vamp, fivebbc): completion + watch time dominate → rewatches/shares/saves → quality-weighted comments → likes declining; interest graph, not social graph; TikTok-as-search-engine (Vamp, fivebbc); platform-published: no reused/unoriginal/engagement-bait recommendations (viral.app citing TikTok docs, Sept 2026). Single-source/lore items explicitly flagged: 40–50% weight estimate (DMA), watch-time-per-impression beating raw views (DMA), 300–500 test pool (marketing_brain SKILL.md), 3s→5s qualified-view shift (virvid.ai).
- YouTube Shorts Oct-1-2026 update (platform-published: Rene Ritchie, Creator Insider + TeamYouTube community post; reported multi-source via Social Media Today, Storyboard18, readus247): channel-level reach cut for re-uploaded/aggregator content, originals prioritized, recommendations-only (payouts unchanged), commentary/unique-edits carve-out; May-2026 AI disclosure enforcement — labeled photorealistic AI gets normal distribution, undisclosed faces reduced recommendations/removal (Ritchie via aituber). Shorts search filters (Dataslayer/MeltedStories, single-source) and retention thresholds ~65%/~50% (Dataslayer, creator lore) flagged as such.
- Reels ranking (Mosseri-stated = platform-published via Virvid/CreatorFlow): sends per reach #1 > watch time > completion/rewatches > likes per reach > comments; the "sends are 3–5x a like" number debunked as invented (CreatorFlow); ~100 scored for Reels chaining (SocialPilot citing Meta, single-source); >3min not pushed to non-followers + 7–30s sweet spot (orangemonke, single-source); TikTok watermarks deprioritized (FlowShorts, single-source).
- Trend formats (SocialPilot Sept 25–Oct 5, New Engen, Later Oct 2, MediaNug 10/1, Virlo): Ramalama Costume Walk (430.7K videos), Patient Zero edits (149.3K), Be OK happy-dance-over-chaos, Text From "-A" (53.5K), cozy-fall jazz beds (5 of Metricool's Oct-1 top-10 sounds), upside-down before/afters — used as *structural patterns with mechanics*, never trend-chasing.

What shipped:
1. **Algorithm signal map** (`algorithm_signals` in `data/content-engine.json` v1.1.0; `ContentEngine.algorithmSignals(platform)`): 3 platforms, rank-ordered hierarchies + mechanics, every claim with `source` + `source_label`. Phase 3 chapter refreshed with the same labels (TikTok lore caveats, Reels single-source flags) and a new "algorithm cheat sheet (Oct 2026)" index-card table linking the Cross-Post Optimizer. The Short-Form Playbook's existing sourced sections were already current — no rewrite needed.
2. **Hook Library 2.0** (`hook_patterns`, 6 records; `ContentEngine.hookPatterns()`): Costume Reveal Walk, Leaving Edit, Joy Contrast, Hidden Confession, Cozy Bed, Upside-Down Flip — each with formula, the mechanic it exploits (completion/sends/rewatches/watch time/saves/shares), its Oct-2026 spotted-in source, and an adapt-don't-copy line. New static section on the Hook Builder page; machine-readable in the API. "Structures, not sounds" framing + honesty note (patterns improve odds, never guarantee views).
3. **Weekly batch scheduler** (`batching_scheduler` defaults; `ContentEngine.planBatchWeek({weeklyHours, longsPerWeek, shortsPerWeek, restDay, taskMinutes})`): weekly hours blocked into film/edit/publish day-blocks (8h/day cap, blocks in order, rest day non-negotiable), verdict holds/tight/over with lever guidance, pure arithmetic on the creator's inputs. New section on the Batching Planner page (tool #13) with optional per-task-minute overrides; defaults explicitly labeled adjustable starting estimates, not benchmarks.
4. **Cross-Post Optimizer** (`pages/crosspost.html` → `site/crosspost.html`, tool #18; `ContentEngine.adaptChecklist(source, destinations)` + `assets/js/crosspost-ui.js`): source + destination pickers → per-destination adaptation cards (hook rework, captions, CTA, audio rights, disclosure labels, grammar notes) with tick-off checklists + progress, the 6 universal checks, the Oct-1 channel-level gate callout, and a photorealistic-AI disclosure reminder. Data: `adaptation_matrix` (4 platform grammars, 12 source→destination rule sets, 6 universal checks, the gate). No-JS fallback summarizes the universal rules.
5. **Agentic surface**: `api/v1/tools.json` 18th record with draft-07 `CrossPostInput` schema (`source_platform`, `destinations[]`, `photorealistic_ai`) + output contract + drive notes; batching `input_schema` extended with `weekly_hours`/`rest_day`/`task_minutes`; `api/v1/content-engine.json` v1.1.0 mirrored to `site/api/v1/`; `api/v1/schema/content-engine.json` extended for the 4 new blocks (generated by build.py); `api/v1/index.json` tool counts + content-engine description updated (17→18); AGENT.md (18 tools; new **Workflow 10** driving the optimizer via `adaptChecklist()`; Workflow 6 gained the 2.0 extras; Cross-Post Optimizer row in the tool-drive table); API.md (18 tools, 10 workflows, content-engine v1.1.0 endpoint); `pages/agents.md` (surface table + workflow 7th step); README (18 tools listed); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: the `content-repurposing` skill owns the pillar-to-everywhere SOP (the optimizer is its per-destination checklist UI), `hook-writing` owns hook craft; the tools.json record + Workflow 10 cover agentic use.

**Tests**: `tests/content-engine.test.js` 49→**111 assertions** — new §7 planBatchWeek pinned fixtures (default-minutes 20h week → 14h required / film 4.5 + edit 8.25 + publish 1.25 / Mon–Thu dealing with the 8h cap; over/tight/holds verdicts incl. −9h slack; custom task minutes; rest-day shift; NaN/negative clamping; blocks sum to required), §8 hook patterns (6 ids, mechanic/spotted_in/source presence, engine↔data content match, structures-not-trends framing, no-prediction honesty note), §9 adaptChecklist (all 12 rule sets resolve with 3+ substantive changes, engine↔data byte-match per rule set, watermark rule on tiktok→reels, AI-disclosure rule on tiktok→shorts, universal checks + gate, unknown-source/unknown-dest/self-dest/case-insensitivity edges), §10 algorithm signals (3 platforms, rank ordering, all four source_labels valid, TikTok hierarchy = verified consensus, Shorts Oct-1 + disclosure rules platform-published, Reels sends #1 + 3–5x debunk, engine↔data match, disclaimer intact); `tests/agent-workflows.test.js` 79→**88 assertions** (wf2: 18 tools + crosspost schema-field check; new wf10 block executing AGENT.md Workflow 10 against the real JSONs — 2-card plan, disclosure/watermark rule pins, engine↔data byte-match, gate, edge cases). Wired into `validate.sh` stage 6 (existing entries).

Validation: `scripts/build.py` clean (9 chapters, 18 tools, 12 skills, 9 case files, 17,224 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the extended content-engine doc, 0 broken links (2,693 checked), byte-identical rebuild on the committed tree, 84 sim + 78 deal-room + 111 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 88 agent-workflow assertions).

Commit: 1a09e6d (local) → 22b2a562bbac554c7498a4a04bcf7d7746237309 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-23 files in the recursive tree).

## Wave 22 — Deal Room 2.0: The Outreach Center (2026-10-11)

Tool #17: the outbound half of the Deal Room — a sponsor outreach command center with a localStorage pitch pipeline, an honest pitch email generator, an interactive "what should I charge?" rate calculator wired to the re-verified 2026 rate card, and a contract red-flag checklist with plain-language risk summaries. Honesty contract intact throughout: no income promises, no invented stats (every pitch number is a [bracketed] placeholder the creator fills), usage rights stay separate line items, and the "not financial/legal/tax advice" copy — plus a prominent NOT-legal-advice line on the contract checklist — is everywhere it needs to be.

**Research (re-verified today, Oct 11, 2026 — rate-card figures, per brief):**
- The site's tier table confirmed against a fresh AIR Media-Tech crawl (updated ~1 day ago): nano/micro/macro/mega YouTube $200–$1K / $1K–$10K / $10K–$50K / $50K–$300K+, IG Reel median $22.40 CPM, integrated slot $20–$35 — identical to our `sponsorship_rate_card_2026`.
- "Creators list rates ~23% above what they accept" reconfirmed via projectcasting (InfluenceFlow 2026, 1,347 creator profiles; nano gap biggest at 28%) — the 0.23 constant stands.
- "41% offer package discounts on 3+ posts" reconfirmed via the same source — carried into the quote guidance.
- Platform multipliers (YouTube ~1.7× Instagram, TikTok ~0.85×) checked against Oct-2026 tables (RZLT/InfluenceFlow: TikTok 10–25% lower per-piece; AIR tables show YouTube ~1.7–2× IG) — consistent, kept labeled as wave-1 research rather than a fresh benchmark.
- The deliverable-CPM bands already in data (`youtube_integrated_slot` $20–$35, `ig_sponsored_reel_median` $22.40, rule-of-thumb dedicated $20–$50) all still current per the AIR/projectcasting pieces; projectcasting's "price the usage separately — always" reinforces the line-item architecture.

What shipped:
1. **Outreach pipeline tracker** (`pages/outreach.html` §1 → `site/outreach.html`, localStorage `cge.outreach.deals.v1` — never transmitted): brand, contact name, email, date pitched, status (pitched → replied → negotiating → signed → passed), one 7-day follow-up date, notes. Pipeline stats (contacted, response rate, active deals, signed/close rate — with the "~5% reply rate is normal" note from the sponsorship-pitch skill) and follow-up reminders (overdue / due today / upcoming buckets, signed+passed auto-excluded). Advance/remove actions, aria-live confirmations, keyboard-native.
2. **Pitch email generator** (§2): 3 templates in `data/deal-templates.json` v1.1.0 — cold pitch (under 120 words, from the skill's subject/body procedure), the one 7-day nudge (permission line "no reply needed — I won't write again"), warm intro. Placeholder fields render data-driven from each template's `placeholders[]`; unfilled [brackets] stay visible in the output and trigger a warning (never invent stats); copy-to-clipboard with fallback; every template carries `grounded_in` + `honesty_note`; anti-spam contract on-page (one targeted email per brand, one nudge, never bulk).
3. **"What should I charge?" rate calculator** (§3): followers → tier → 2026 rate-card range; top-of-range quote point with the 23% expected-close math (~$7,700 on a $10,000 open); implied-CPM cross-check against the deliverable band (integrated $20–$35 reported / dedicated $20–$50 rule-of-thumb labeled as such / short-form $10–$30 or the $22.40 IG median); the 41% bundle-discount guidance and the 1.7×/0.85× cross-platform note; usage-rights explicitly excluded from the total (separate line items, link to the Deal Room). Ranges only, disclaimer attached.
4. **Contract red-flag checklist** (§4): 10 new contract-specific flags in `deal-templates.json` v1.1.0 (IP assignment, one-sided termination, vague "all media" usage grants, auto-renewing exclusivity, view-guarantee clawbacks, one-sided morality clauses, missing payment schedules, open approval, missing FTC language, scope-creep language) — additive to the Deal Room's 6 offer red flags, not a duplicate. Interactive scoring (any walk_away flag or 3+ points → "don't sign as written") with a per-item plain-language fix and a prominent NOT-legal-advice disclaimer (contracts above $500 deserve a real lawyer's eyes, per the deal-negotiation skill). Persisted to localStorage.
5. **Engine** (`assets/js/outreach.js`, UMD — browser + `require()`-able in node): `validDeal`, `pipelineStats`, `dueFollowUps`, `quoteCalc`, `renderPitch`, `contractRisk` (+ `tierOf`/`nice`/`fmt` helpers, `LISTED_VS_ACCEPTED = 0.23`); UI wiring in `assets/js/outreach-ui.js` (pure-math-free). The Deal Room page gained a cross-link to the Outreach Center.
6. **Agentic surface**: `api/v1/tools.json` 17th record with draft-07 `OutreachInput` schema (pipeline + quote + pitch + contract fields) + full output contract + drive notes; `api/v1/deal-templates.json` v1.1.0 mirrored to `site/api/v1/`; `api/v1/schema/deal-templates.json` extended for the new keys (hand-maintained); `api/v1/index.json` deal-templates description + records note updated (16→17 tool counts everywhere: tools hub, index page, tools endpoint, llms.txt); AGENT.md (17 tools, new **Workflow 9** driving the full outbound loop via `Outreach.*`, Outreach Center row in the tool-drive table); API.md (17 tools, deal-templates shape v1.1.0); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: the `sponsorship-pitch` skill owns the outbound procedure (targeting, email, pricing, pipeline), `deal-negotiation` owns offer evaluation, `rate-card-reader` owns rate lookup; the Outreach Center is their executable UI + the tools.json record and Workflow 9 cover agentic use.

**Tests**: new `tests/outreach.test.js` (**92 assertions** — data contract (3 templates, 10 flags, no hard $ amounts in any template body, cold pitch ≤120 words, nudge permission line), validDeal incl. email sanity, pipelineStats over a pinned 10-deal fixture (40% response / 10% close), dueFollowUps buckets vs a fixed "now" (signed/passed/dateless excluded), quoteCalc against the REAL rate card (tier boundaries at 9,999/10,000/999,999/1,000,000; micro/YouTube $1,000–$10,000 → $10,000 quote → $7,700 expected close; implied CPM 250 flagged above the $20–$35 band; dedicated uses the labeled rule-of-thumb band; IG short uses the $22.40 median; no-views → no invented CPM), renderPitch placeholder honesty, contractRisk scoring incl. 2 walk_away pins + point math + unknown-id tolerance + NOT-legal-advice disclaimer); wired into `validate.sh` stage 6; `agent-workflows.test.js` wf2 updated 16→17 tools + outreach schema-field check, new wf8 block for AGENT.md Workflow 9 (79 assertions total, incl. the pinned $10,000/$7,700/250-CPM walk-through against the real JSONs).

Validation: `scripts/build.py` clean (9 chapters, 17 tools, 12 skills, 9 case files, 16,844 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the extended deal-templates doc, 0 broken links (2,626 checked), byte-identical rebuild on the committed tree, 84 sim + 78 deal-room + 49 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 79 agent-workflow assertions).

Commit: b366a1ed12f61f83cb511f5865d67ca078db18e9 (local) → 94633616a3052d65da72a6732cb3898991972336 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-22 files in the recursive tree).

## Wave 21 — YPP 2027 Eligibility Checker + monetization chapter refresh (2026-10-11)

Tool #16: an interactive current-vs-2027 YPP eligibility checker, plus the monetization chapter rewritten around the confirmed Feb-2027 rule sets, two documented YPP case files, and the full agentic-surface update. Every figure sourced; honesty contract intact (no income promises; "not financial/legal/tax advice" copy preserved).

**Research (verified today, Oct 11, 2026):**
- 2027 YPP changes reconfirmed against a fresh crawl — multi-source and consistent (AIR Media-Tech, AuditSocials, Tablet News, GSMDome, Eastleigh Voice, passionfru.it; announced by YouTube Aug 10, 2026 via official blog + Creator Insider video w/ Amjad Hanif): new applicants 1,000 subs + **8,000** qualified watch hours/365d **or** 20M qualified Shorts views/90d; the **10M qualified Shorts views/90d Shorts Creator Pool + Shorts Premium floor, checked monthly** (below it: stay in YPP, long-form keeps paying, Shorts pay stops that month); partner activity test (1,000 hours/365d OR 1M Shorts views/90d OR 2 longs / 5 Shorts per 90d, 90-day recovery window); fan-funding tier unchanged; updated terms due Jan 31, 2027; applications reaching YouTube by 23:59 UTC Jan 31, 2027 judged at the old 4,000-hour bar (AIR partner-support team). New detail this wave: activity-test legs, terms deadline, below-floor incentives (Shopping bonuses, brand-deal incentives, trend boosts), Premium Lite expansion, revenue shares unchanged (55% / 45% / 70%).
- Current rules re-verified (YouTube published eligibility via AIR guide ~Oct 10, 2026 + multi-source press): 1,000 subs + 4,000 hours/12mo OR 10M Shorts/90d; fan-funding 500 subs + 3 uploads/90d + 3,000 hours OR 3M Shorts; qualitative "inauthentic content" gate (Jul 2025); ~1-month review.
- Oct-1-2026 Shorts originality update re-confirmed (Rene Ritchie via Creator Insider; TechJuice, Digital Trends, ppc.land, Search Engine Journal): recommendations deprioritize re-uploaded clips; VO-narration/minor-edits/template-changes don't count as original.
- RPM refresh: OutlierKit Sep-2026 table (personal finance $10–25, legal & tax $8–22, AI & tech $4–11, gaming $2–4, entertainment $1–3) with AIR's 300-channel medians as the honest counterweight (education & science $10.22, entertainment $2.43, gaming $2.05, kids $0.33, business & finance $2.01 on 3 channels).

What shipped:
1. **YPP 2027 Eligibility Checker** (`assets/js/ypp-checker.js` + `pages/ypp-checker.html` → `site/ypp-checker.html`, TOOL 16, own stylesheet `assets/css/yppchecker.css`) — UMD engine (browser + node) like the video-doctor: `validInput()` / `check()` / `RULES` with per-rule-set source strings. Inputs: subs, watch hours/12mo, Shorts views/90d, uploads/90d, originality, format mix. Output: current-rules verdict vs 2027-rules verdict side by side (per-check pass/fail), fan-funding tier, the 10M Shorts floor check, the partner activity test, gap math (incl. per-day rates), the shorter-walk note, the Oct-2026 originality warning when repurposed/reposted content with Shorts is in play, and a chapter-grounded close-the-gap plan (Phase 1/2/4, Hook Builder, Video Doctor, Planner, Playbook, Money Map — all links verified real). The "at-or-above bar" case yields the second-gate step (qualitative review + Studio checklist), not gap steps. Aria-live results, keyboard-native form, localStorage last-input, full no-JS fallback (both rule sets in one paragraph each), prefers-reduced-motion honored, every verdict carries the verify-live-in-Studio disclaimer.
2. **Monetization chapter refresh** (`content/phase-5-monetization-stack.md` → rebuilt): Layer-1 RPM table rewritten from the Oct-2026 data (OutlierKit table + AIR medians + breakout multiples, all creator-reported); the "watch-time is the real gate" paragraph replaced with the two-rule-set comparison table + the Shorts-only-channels triple-squeeze warning (avoid-list + two new case files linked) + the checker cross-link; checklist gained the checker, Deal Room, Niche Atlas, and Money Map items; new inline Money Map / Niche Atlas cross-link paragraph.
3. **Two new case files** (documented industry arcs from reporting, no invented creators): `case-clippers-squeeze.md` (Kenya's clip industry: KSh 130–520/1K views, KSh 130K–520K per piece via Kenyan Mirror; Oct-1 reach cut via TechJuice/Digital Trends/SEJ; the $1.4M-in-five-weeks boom via Clownfish TV; the Feb-2027 floor as the second squeeze) and `case-shorts-floor.md` (the monthly 10M floor as a subscription: ~111K views/day, below-floor stack of sponsors/affiliates/Shopping/memberships, Jan-31 terms deadline, the broadcasters' "marketing tool, not a revenue line" posture via Barrett Media). Both follow the case-file structure (arc, revenue stack, 3 decisions, steal, NOT-copy, sources).
4. **Agentic surface**: `api/v1/tools.json` 16th record with draft-07 `YPPCheckerInput` schema (`subs`, `watchHours`, `shortsViews`, `uploads90d`, `originality`, `formatMix`) + full output contract + drive notes; `api/v1/index.json` tools endpoint description (fourteen→sixteen); AGENT.md (9 phases, 16 tools, 12 skills, 9 case files; new **Workflow 8** driving the checker via `YppChecker.check()`; ypp-checker row in the tool-drive table); API.md (all nine case files, updated list); llms.txt/llms-full.txt regenerated (16 tools, 9 case files, AGENT.md workflows 8). No new skill — no genuine gap (the tools.json record, Workflow 8, and drive-table row cover agentic use; none of the 12 skills overlaps).

**Tests**: new `tests/ypp-checker.test.js` (**84 assertions** — input validation incl. NaN/negatives, all threshold pins (4K/8K hours, 10M/20M shorts, 10M floor, activity legs, fan-funding unchanged), 6 pinned fixtures of current-vs-2027 verdicts with gap math, exact-boundary checks (9,999,999 misses by 1; exactly 4K hours passes current), originality-warning gating, plan link-target validity, honesty contract enforced in-test (disclaimer present, no guarantee language, no income-promise phrasing, both rule sets carry sources)); wired into `validate.sh` stage 6; `agent-workflows.test.js` wf2 updated 15→16 tools + ypp-checker schema-field check (67→68 assertions).

Validation: `scripts/build.py` clean; `scripts/validate.sh` **8/8 GREEN** (27 JS files node --check, 31 JSON files parse, draft-07 schemas, 0 broken links (2,561 checked), byte-identical rebuild, 84 sim + 78 deal-room + 49 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker engine assertions, 68 agent-workflow assertions).

Commit: f266741 (local) → a7b31ddb3d12655073779034f53cee5b7f063f45 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-21 files in the recursive tree).

## Wave 20 — Niche Atlas 2.0: the 2027 Niche Outlook (2026-10-11)

Fresh research (observed Oct 11, 2026) integrated as a full "2027 outlook" layer on the Niche Atlas — the research mission the task brief specified, every figure verified, single-source items flagged, honesty contract intact.

**Research (sourced, verified today):**
- TubeAI/AIR channel-growth figures reconfirmed against a fresh crawl (kids 1.59%, ASMR 1.56%, creator economy 1.50%, challenges/stunts 1.47%, AI/ML 1.44%, true crime 1.34% — all-channel median 0.97%/mo).
- OutlierKit Sep-2026 refreshed RPM/CPM table: personal finance $10–25 RPM, legal & tax $8–22, AI & tech $4–11, gaming $2–4, entertainment $1–3; breakout multiples (AI tutorials 18x, betrayal/revenge 21x $20–25 CPM, English learning 21x $18–22, senior health 19x $14–18 ultra-low, video podcasts 15x $12–18, rural homesteading 16x $12–16, manhwa/webtoon recaps 5.8x $15–19, sleep 14x $16–20).
- AIR Media-Tech monetization statistics (fresh): median RPMs education & science $10.22, gaming $2.05, entertainment $2.43, kids $0.33 — included as the honest counterweight to advertiser-CPM lists (business & finance median only $2.01 on 3 channels, directional).
- 2027 YPP changes CONFIRMED multi-source (AIR, AuditSocials, Tablet News, GSMDome; announced Aug 10, 2026): from Feb 1, 2027, Shorts revenue sharing needs 10M qualified Shorts views per 90 days (checked monthly); new applicants 8K watch hours or 20M Shorts views.
- Oct-2026 Shorts originality update CONFIRMED multi-source (Digital Trends, ppc.land, Storyboard18, NeoTeo).
- 2027 platform priorities (Lia Haberman, single-source): YouTube — shopping, micro-dramas, custom feeds (Shorts Series); TikTok — creator-brand partnerships. Microdrama 6.5B H1-2026 views / ~$14B 2026 industry estimate (FastCompany, single-source, flagged).

What shipped:
1. **`data/niches.json` v2.0.0** (source of truth): per-niche `outlook_2027` (trajectory heating/stable/cooling + basis sentence + signal source ids — 10 heating, 6 stable, 4 cooling), per-niche `stream_fit` (ads/sponsorships/digital_products/POD: strong/moderate/weak — editorial, labeled as judgment), doc-level `outlook_2027` (6 platform signals + evidence note: trajectories are reads, not forecasts), 4 `breakout_spotlights` (video podcasts, rural homesteading, manhwa recaps, shorts series — single-source flags where applicable), 7 new sources, avoid list 6→7 (new: "Shorts-only channels chasing pool revenue (post-Feb-2027)"; clipping + kids entries gained `flag_2027` 2027-updates). Honesty contract in-data: no income-promise language, disclaimer in the note.
2. **Niche Atlas article** (`content/niche-atlas.md`): new "The 2027 outlook" section (trajectory table, platform signals, breakout spotlights, competition-vs-reward explainer, stream-fit matrix table), "The avoid list (2027 update)" rewrite, sources extended. Static tables so the page reads without JS.
3. **Explorer 2.0** (`assets/js/niche-atlas.js`): trajectory badges on every card + trajectory filter + "2027 outlook" default sort, "Competition vs reward" scatter (SVG, role=img + title/desc + a details/summary data-table alternative for screen readers), breakout spotlight cards, the stream-fit matrix table, a rendered Red-flag niches panel, and a 2027-outlook row in the head-to-head compare. All from the live JSON; new CSS in components.css (badges, scatter, matrix, reduced-motion-safe).
4. **"Pick my 2027 niche" quiz branch** (`assets/js/quiz.js` + JS-rendered mode toggle): 4 questions (2027 bet, format, risk tolerance, skill fit) scored against the atlas outlook layer — trajectory weight (heating +3/stable +1/cooling −2), breakout/search/underserved/evergreen signal matches, format fit (with the Feb-2027 Shorts-floor warning for shorts-first), risk alignment, atlas skill-fit. `OUTLOOK_2027` mirrors `data/niches.json` trajectories; `tests/niche-atlas.test.js` enforces sync (20/20 match).
5. **Money Map tie-in** (`pages/money-map.html`): a "Niche fit" block in all 5 stage playbooks — stage-appropriate niches per stage (heating low-cost lanes at Stage 0; small-audience-pays math + kids warning at Stage 1; niche→second-stream matching at Stage 2; niche sets the team at Stage 3; portfolio thinking at Stage 4), cross-linking the Atlas, Deal Room, simulator, and hiring calculator.
6. **Empire Simulator refresh**: new `ai-tutorials` scenario (9th; tech_software band $8–20, OutlierKit 18x/$15–22 CPM source, growth assumption labeled a planning input); refreshed sources on `betrayal-dramas` (21x, $20–25 CPM multi-source + Feb-2027 floor caveat), `tech-reviewer` (2026 sponsor CPMs $25–45), `personal-finance` (Sep-2026 RPM table $10–25). Assumptions still shown honestly in-page.
7. **Agentic surface**: `api/v1/index.json` niches endpoint description + freshness note rewritten (v2.0.0, outlook layer documented); generated draft-07 schemas extended (`niche.json`: `outlook_2027` + `stream_fit`; `niches.json` doc: `outlook_2027`, `breakout_spotlights`, `stream_fit_legend`); `tools.json` quiz record carries the 2027-branch input schema (`q271`–`q274` optional) + drive notes; AGENT.md (niches row + Niche Picker row) and API.md (niches shape incl. all new fields) updated; llms.txt/llms-full.txt regenerated. No new skill — no genuine gap (the quiz branch, explorer, and API rows cover it).

**Tests**: new `tests/niche-atlas.test.js` (144 assertions — 20 records × outlook/stream-fit/source checks, avoid-list red flags, spotlights, platform signals, honesty contract, quiz.js trajectory sync); wired into `validate.sh` stage 6; `agent-workflows.test.js` wf4 updated 8→9 scenarios (sim + schema enum). Validation: `scripts/build.py` clean; `scripts/validate.sh` **8/8 GREEN** (26 JS files node --check, 31 JSON files parse, draft-07 schemas incl. the extended niche/niches pair, 0 broken links (2,393 checked), byte-identical rebuild on the committed tree, 84 sim + 78 deal-room + 49 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas engine assertions, 67 agent-workflow assertions).

Commit: 6902365772360df05e2f06e68330092867859429 (local) → 72965bceba579c9bf7ae61013f000cf7053e2a24 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-20 files in the recursive tree).

## Wave 19 — The Analytics Decoder (2026-10-11)

The missing analytics-reading pillar: a video troubleshooter, a metrics
glossary chapter, and a retention-curve reader — all diagnostic logic drawn
from the site's existing chapters, every threshold labeled as a
creator-reported rule of thumb, never platform gospel. Now 15 tools total.

What shipped:
1. **Diagnose My Video tool** (`pages/video-doctor.html` +
   `assets/js/video-doctor.js` → `site/video-doctor.html`, TOOL 15) —
   symptom picker (8 symptoms: low CTR, early drop-off, great retention but
   no subs, sawtooth, single cliff, Shorts-no-crossover, flat-low,
   end-collapse) → ranked likely causes → chapter-grounded fixes with
   read-next links. Engine is UMD (browser + node): `validInput()` /
   `diagnose()` / `SYMPTOMS` dataset. Context-aware: tuition-phase caveat
   under 50 videos, completion-rate note for CTR on swipe feeds, bridge note
   for Shorts-crossover diagnosed from long-form. Symptom radio cards with
   arrow-key radiogroup support, aria-live results, localStorage last-input,
   full no-JS fallback (all 8 symptoms, one line each). Own stylesheet
   `assets/css/videodoctor.css`.
2. **The Metrics Glossary chapter** (`content/metrics-glossary.md` →
   `site/metrics-glossary.html`, 3rd Reference page): CTR, AVD, retention
   curves, traffic sources, returning vs new viewers, Shorts feed vs browse
   — what each metric means, what "good" looks like as reported ranges
   (flagged creator-reported, never platform-published), when each lies,
   plus "what NOT to watch (yet)", a stage-appropriate-metrics table (Money
   Map cross-link: beginners shouldn't obsess over CTR), and a "your numbers
   vs the Simulator's assumptions" section.
3. **Retention-curve reader** — five sketched SVG patterns
   (`METRICS_CURVE_MOUNT` in build.py, styles in components.css): cliff at
   start (hook/packaging), sawtooth (re-hooks vs pacing), single cliff (one
   bad section), end collapse (normal unless before 50%), flat low (topic
   mismatch / tuition phase). Static hand-drawn polylines — no data behind
   them, "read the shape, never the numbers"; each with aria-label +
   figcaption.
4. **Cross-links**: Playbook "Your next move" → Metrics Glossary +
   Video Doctor; Money Map stage 0/1 playbooks → stage-appropriate metrics;
   Simulator assumptions → Metrics Glossary (read your real graph before
   tuning the model) + Video Doctor; Phase 2 analytics section → both new
   pages. `data/glossary.json` gained 4 terms (Traffic sources, Returning
   viewers, Shorts feed, Browse traffic) → 30 terms.
5. **API surface**: `api/v1/tools.json` 15th record with draft-07
   `VideoDoctorInput` schema (symptom/platform/experience enums);
   llms.txt lists 15 tools + Glossary; llms-full.txt carries the new
   reference marker.

**Tests**: new `tests/video-doctor.test.js` (184 assertions — input
validation, all-8-symptom diagnosis shape, link targets all real site
pages, honesty contract enforced in-test: "rule of thumb" /
"creator-reported" present, no platform-published claims, no guarantee
language, tuition/platform context notes); `agent-workflows.test.js`
wf2 updated 14→15 tools; `validate.sh` stage 6 runs the new suite.

Validation: `scripts/build.py` clean (9 chapters, 15 tools, 12 skills,
7 case files, 16,208 words); `scripts/validate.sh` **8/8 GREEN** (26 JS
files node --check, JSON parse, draft-07 schemas, 0 broken links (2,377
checked), byte-identical rebuild, 80 sim + 78 deal-room + 49 content-engine
+ 44 money-map + 184 video-doctor engine assertions, 67 agent-workflow
assertions).

Commit: c03655a3426cdfc3a9640239f5b6e9ea01a13161 (local) → d91b715adfe7551738d9c7b426a6f72631a9672e (pushed 2026-10-11, remote tree verified via GitHub API).

## Wave 18 — The Money Map (2026-10-11)

The capstone page tying the whole empire together: $0 → first $100 → $1K/mo →
$10K/mo → company. Now 14 tools total.

What shipped:
1. **The Money Map tool** (`pages/money-map.html` + `assets/js/money-map.js`
   → `site/money-map.html`, TOOL 14) — the "Where am I?" quiz (7 questions:
   platform, audience, monthly revenue, cadence, team, bottleneck, revenue
   streams) places the creator on the map and generates a personalized
   3-move roadmap. Placement is anchored on the creator's own reported
   revenue band ($0→stage 0, $1–99→stage 1, $100–999→stage 2, $1K–9,999→
   stage 3, $10K+→stage 4); a 100K+ audience at base stage ≤ 2 bumps +1 with
   an `audience-ahead` note, employees at stage ≤ 2 add a `team-ahead` note.
   Answers persist in localStorage; nothing leaves the device.
2. **Five stage playbooks** — The Start Line ($0), First $100, The Engine Runs
   ($1K/mo), The Business ($10K/mo), The Company. Each: the goal (framed as
   "creators at this stage typically focus on X" — never income promises),
   the 3 moves that matter (wired to the right tool/chapter: Niche Atlas →
   Content Engine → Simulator → Deal Room → First Hire), the trap to avoid
   (with the honest framing from each source chapter: tool-collecting,
   sponsor-chasing without leverage, single-stream fragility, hiring before
   the math works, scaling what broke you), and "graduate when" criteria.
   Static HTML so the page reads fully without JavaScript.
3. **Interactive map visual** — the journey as a 5-node path (`<ol>` of
   anchor links, fully keyboard/noscript accessible; vertical on mobile,
   horizontal on desktop); clicking a node opens its playbook. Progress is
   self-marked per stage (localStorage `cge.moneymap.v1`), never
   auto-detected. Reduced-motion respected.
4. **Cross-links from every pillar page** — a "See where this fits on the
   Money Map" ribbon at the end of all 9 phase chapters (generated by
   build.py), plus the tools-hub "Pick by job" section and the footer Tools
   nav. AGENT.md gained Workflow 7 (place a creator on the map via API);
   README counts updated 13 → 14.

Validation: `scripts/validate.sh` **8/8 GREEN** (24 JS files node --check,
JSON parse, draft-07 schemas, 0 broken links (2,216 checked), byte-identical
rebuild, 80 sim + 78 deal-room + 49 content-engine + 44 money-map engine
assertions, 67 agent-workflow assertions).

Commit: b01afa3 (local) → f6e67b4f90f491d207e060f2e5d0bc2d11c8714a (pushed 2026-10-11, remote tree verified via GitHub API).

## Wave 13 — Empire Simulator 2.0 (2026-10-11)

What shipped:
1. **Scenario library** (`assets/js/sim-engine.js` → `SCENARIOS`, 6 presets):
   ASMR Bedroom Channel (Case File: Sleep Channels, ASMR→lifestyle proxies
   declared), Tech Reviewer (tech band $8–$20 + 2–3x sponsor rule), Betrayal
   Mini-Dramas (entertainment band, Shorts-first cadence), Home Cooking
   Channel (Case File: Ben's Bites), Personal Finance / Zero to Budget (Case
   File: PTYA, finance band $8–$35), Fitness Coach (health band $4–$10). Each
   is a named, loadable config with source attribution; one-click "Load
   scenario" on the page (`EmpireSim.scenarioInputs(id)` for agents).
2. **Comparison mode** — `EmpireSim.compare(nameA, inputsA, nameB, inputsB, cfg)`:
   same clock, deltas ALWAYS B-minus-A, plain-language verdict naming the
   net-revenue winner, the drivers (RPM, growth, team spend), the
   "subscribers are not income" note, and the honesty caveat. Page UI:
   scenario/custom selects per side, side-by-side cards, delta table, verdict
   panel, and the assumptions panel rendered with every comparison — never hidden.
3. **Team hiring layer** — wave 10's First Hire guide wired into the sim:
   editor ($1,400/mo preset, +1 long-form/wk, quality +12%), thumbnail
   designer ($120/mo, quality +8%), VA ($900/mo, +0.5 long-form/wk); start
   month + monthly cost adjustable, first active month at 50% (ramp-up,
   labeled). Month-by-month P&L: gross, team cost, net — in the ledger table
   and stat cards. Backwards compatible: no hires → byte-identical math to v1.
4. **Year 2 scaling** — optional 24-month horizon with the diminishing-returns
   curve (monthly growth decays ×0.94/mo after month 12, honestly labeled as
   our curve), Q4 uplift in months 22–24, generalized charts/milestones.
5. **"Copy my empire plan"** — `EmpireSim.exportPlan()`: scenario, hires,
   horizon-end numbers (subs, gross, team spend, net, best month),
   milestones, the full assumptions list, and the "model, not a prediction /
   not financial, legal, or tax advice" disclaimers.

Engine (`sim-engine.js`) stays UMD/node-testable. Honesty contract intact:
ranges and stated assumptions everywhere, no income promises, disclaimers
visible on-page and in exports.

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN**
(15 JS files node --check, JSON parse, draft-07 schemas, 0 broken links,
byte-identical rebuild, **71 sim assertions**, llms.txt counts fresh,
**36 agent-workflow assertions**). AGENT.md gained Workflow 4 (ASMR bedroom vs
Tech reviewer — executed numbers: 6,434 vs 5,323 subs; $909.02 vs $7,955.56
net; Tech reviewer leads by 775%); `api/v1/tools.json` simulator
`input_schema` extended (`scenario_id`, `horizon`, `hires[]`,
`compare_with`); llms.txt tool bullets now carry descriptions (2.0 features);
`pages/agents.md` gained worked workflow 4.

Commit: bf4f914fc5a9bb459d09252c01d14e6286ce47eb (pushed 2026-10-11).

## Wave 12 — Agent API excellence pass (2026-10-11)

What shipped:
1. **`api/v1/index.json` — full self-describing manifest.** Replaced the sparse
   path-dict with an endpoint-record list: every endpoint carries `id`, `kind`
   (`json`|`html`|`directory`), `path`/`paths`/`files`, `description`, `schema`
   URL, ISO-8601 UTC `updated`, `records` count, `deprecated` +
   `deprecation_note` (none active), and `freshness_note` where relevant
   (calculators: verify platform figures live). Covers chapters, glossary,
   calculators, skills, case-files, tools, reference-pages, tool-pages, and a
   `schemas` directory record listing all 11 schema files.
2. **New `api/v1/tools.json` endpoint** — all 9 tools with programmatic
   `input_schema` (JSON Schema draft-07), `output` description, and
   `drive_notes` (formulas + the shipped JS file to replicate). Generated from
   a new `TOOLS_API` table in `scripts/build.py`; faithfully mirrors each
   tool's actual inputs (verified against the tool JS).
3. **New `AGENT.md`** (repo root) — "how an agent uses this site": base URL
   pattern (`api/v1/` relative; no auth/keys/rate limits), endpoint table with
   example requests, **3 end-to-end worked workflows** (WF1: $5K offer for a
   50K-sub tech channel → FAIR, implied CPM $125 vs $20–$35 integrated
   benchmark, $15K counter; WF2: 90-day cooking-channel launch → 13 long-form
   + 39 shorts = 52 pieces, YPP 1K subs + 4K watch hours, TikTok food RPM
   $0.60–$1.30; WF3: ASMR sim scenario → month-12 subs 3,468, 12-mo $43.12,
   proxies declared explicitly), rate/expectation notes (static JSON,
   freshness dates, verify-live flags), per-tool drive table, honesty rules.
4. **JSON Schema draft-07 for every endpoint** — 11 schemas now (was 4): added
   `index.json`, `chapters.json` (doc), `skills.json` (doc), `skill.json`
   (record), `case-files.json` (doc), `tools.json` (doc), `tool.json`
   (record). Doc wrappers use relative `$ref` into per-record schemas.
5. **Shared conventions in API.md** — the canonical cross-site block added
   verbatim; endpoint docs rewritten to match actual payloads (old text
   described chapter fields that don't exist); glossary count fixed 25→26.
6. **Skills gap-fill (10→12)** — `shortform-hook-craft` (Hook Builder +
   Short-Form Playbook: 5 structures, retention editing, anti-hook checklist)
   and `first-hire-planner` (hiring guide + calculator: bottleneck test, 2026
   rate ranges, coverage math, 2-week trial, SOPs, contractor-vs-employee —
   not legal/tax advice), both in the standard Use-when/Inputs/Procedure/
   Worked-example/API-references/Pitfalls format.
7. **API Explorer polished** — now discovers endpoints from the new manifest
   shape (all 7 JSON endpoints + all 11 schemas from the manifest's `files[]`,
   record counts in descriptions), shows a manifest version/updated line, and
   the static fallback covers everything incl. case-files + tools.
8. **Freshness fixes** — `pages/agents.md`: calculators version 1.1.0→1.2.0,
   skills 10→12 (+2 table rows), interactive-tools row gained hiring-calculator
   + hook-builder; `llms.txt` regenerated via `scripts/build.py` — new
   **Guides & Playbooks** section (The First Hire + Short-Form Playbook,
   previously unlisted), `tools.json` + `schema/` in the API section, `AGENT.md`
   in the Agents section; hiring MARKDOWN_PAGES title/badge swap fixed (page
   title was rendering "Guide", now "The First Hire"); README agentic layer
   updated (was "3 tools, 6 skills").

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 12 skills, 5 case
files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (14 JS files,
21 JSON files, schema validation incl. $ref resolution + manifest/schema-set
coherence, 0 broken of 1,587 links, byte-identical rebuild, 16/16 sim
assertions, llms counts fresh, **20/20 agent-workflow assertions** — the 3
AGENT.md workflows executed against the real `api/v1/` JSON files + the
shipped UMD sim engine in node).

Existing payload shapes untouched (site JS + sim engine read them); only the
manifest shape changed, with the API Explorer updated to match.

Commit: db5e941cff923ed9dc11c8fd9f74d491e89e9226 (pushed 2026-10-11; local 3a5fa41).

---

## Wave 11 — deep content: "The Short-Form Playbook" (2026-10-11)

What shipped:
1. **New chapter `pages/shortform-playbook.md` → `site/shortform-playbook.html`** (MARKDOWN_PAGES, badge "Playbook", 3,012 words): "The Short-Form Playbook" — grounded in the wave-7 fuel research (sourced Oct 2026): why short-form is a different game (interest-graph not social-graph; test-pool cascade; watch-time-per-impression), **5 hook structures** (Open Loop, Cold Start, Contrarian Take, Numbered Promise, Question-as-Hook — craft formulas, flagged as craft), retention editing (cut density, burned-in captions as TikTok search index, pattern interrupts, loopability, mid-video re-hooks), platform playbooks (TikTok: completion-rate optimization + keyword-search lever + series formats; YouTube Shorts: Oct 1 2026 originality update — channel-level re-upload reach cut, recommendations-only, re-evaluation on original; May 2026 AI-disclosure rule — labels don't hurt, undisclosed photorealistic AI reduced/removed; Shorts→long-form funneling; Reels: Mosseri's sends-per-reach #1 hierarchy + sends-per-reach engineering + DM test; 7–30s discovery and >3min-not-pushed-to-non-followers both flagged single-source), posting cadence (honest: no peer-reviewed cadence science — consistency beats volume, Phase 1 baseline, anti-volume warning), series formats that compound (numbered series, recurring characters, serialized mini-dramas — cross-links the trend-machine's Oracle at github.com/astercast/trend-machine for launch-into-rising-topics), what kills reach (re-uploads, watermarks, undisclosed AI, long Reels to cold audiences, engagement bait, inconsistent volume). Every platform claim sourced or flagged single-source; no income promises, no earnings figures.
2. **New tool: Hook Builder** (`pages/hook-builder.html` + `assets/js/hook-builder.js`, TOOLS/TOOL_HUB_META/TOOL_SCRIPTS wired — CONTENT group, 🎣 icon): 5 hook structures as flip-through cards — topic input → 5 filmed-ready hook variants, one per card; card = structure name, description, your hook, formula, worked example, delivery tip, copy-to-clipboard button. ARIA (region/slide roles, numbered dots with aria-current, polite live announcer "Card N of 5"), full keyboard (arrows/Home/End + buttons), focus-visible outlines, reduced-motion media query, mobile-first deck CSS appended to assets/css/components.css. nav_active = tools.html; linked from the Playbook chapter and Phase 3's repurposing SOP.
3. **Cross-links** — Phase 1 hooks bullet → Playbook; Phase 2 originality-update section → Playbook; Phase 3 repurposing SOP → Hook Builder tool. Index "All 9 tools →"; llms.txt "All nine tools"; api/v1/index.json tools[] regenerated (hook-builder.html included); llms-full.txt carries the full Playbook chapter.

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 10 skills, 5 case files, 16,153 words); rebuild committed, then `scripts/validate.sh` **7/7 GREEN** (13 JS files incl. hook-builder.js node --check, 0 broken of ~1,5xx links, byte-identical rebuild, 16/16 sim assertions, llms counts fresh — 9 phases, 9 tools, 5 case files, 10 skills).

Commit: e7192b5 (pushed 2026-10-11).

---

History reconstruction (waves 1–2, logged 2026-10-11):

- **Wave 1: 9 chapters + 3 tools + 6 skills + API; design overhaul v2 — completed 2026-10-11**
  (9-phase content ~13,600 words, niche quiz, revenue calculator, 90-day planner, 6 skills,
  api/v1 + llms.txt/llms-full.txt, "Empire Briefing" v2 design.)

---

## Wave 2 — research integration (2026-10-11)

Research source: `~/workspace/research_notes/ai-film-deep-2026-20261011-2154/` (Mission 4 —
creator economy 2026, read Oct 11, 2026). All platform figures sourced in the research notes;
single-source claims flagged in-page.

What shipped:
1. **Phase 5 monetization chapter updated** — TikTok Creator Rewards RPMs $0.40–$2.00/1K
   qualified views (5–10x YouTube Shorts $0.04–$0.50; 1-min+ original-only; eligibility
   10K followers + 100K views/30d + 18+); Meta Creator Fast Track (Mar 2026: $1K/$3K per mo,
   US/Canada, 3-mo cap); Facebook Content Monetization merged program; Instagram has NO
   standing Reels bonus; sponsorships dwarf platform payouts ($20–$35 CPM integrated slot
   vs ~$2.30 ad RPM; IG sponsored Reel median $22.40 CPM); 7-figure pattern (5+ stacked
   streams + owned audience; newsletter ~$670K/yr; Ben's Bites 7 figures in <9 months solo);
   TikTok live shopping +60% YoY H1 2026, affiliate engagement 5.2% (160% above IG);
   watch-time is the real gate; Jan 2026 YouTube enforcement wave flagged as reported.
2. **New 2026 rate card reference page** (`content/rate-card.md` → `site/rate-card.html`) —
   sponsorship negotiation ranges by tier/platform, platform multipliers (YT 1.7x IG,
   TikTok 0.85x), sponsored CPMs, negotiation data (~23% above accepted), usage rights as
   the most-neglected line item. `build.py` gained a `REFERENCE_PAGES` list (rendered like
   chapters, excluded from the 9-phase index count); Phase 5 links to it.
3. **Phase 7 business chapter updated** — S-corp election at ~$50–75K net profit; default
   LLC = Schedule C + 15.3% SE tax on everything; ~$5.9K/yr saved on $120K at 60% salary;
   2026 SS wage base $184,500; 20% QBI permanent under OBBBA; not-tax-advice disclaimer
   stays prominent (top of phase). Phase 6 POD section got the Printful playbook bits
   (30–60% margins, samples, 7–12s clips, 1-hr+ lives).
4. **`data/calculators.json` v1.1.0 (updated 2026-10-11)** — niche RPM bands aligned to
   research (low $1.50–$4 / mid $4–$10 / high $8–$20 / music $0.75–$1.65; Q4 +40–80% vs Q1),
   Shorts RPM [0.04, 0.50] with tiers, TikTok RPM [0.40, 2.00] with per-niche bands,
   `sponsorship_rate_card_2026` block, usage-rights negotiation note. **2027 YPP threshold
   claim RE-VERIFIED via fresh search: CONFIRMED multi-source** (YouTube announced Aug 10,
   2026; Cartoon Brew, Tech Times, Hypebeast, AIR Media-Tech, Music Business Worldwide;
   official Help page) — old "vidIQ single-source" flag removed; Phase 2 chapter updated.
5. Rebuilt via `scripts/build.py` (9 chapters, 3 tools, 6 skills, ~14.6K words);
   llms.txt/llms-full.txt now list the Reference page; API index exposes `references`.

Commit: 1f87d372d9c669addb9aa1ea398aa0084ebf3bfa (pushed 2026-10-11, base 1d3f82a; parallel pipeline commits carried over via base_tree).

---

## Wave 3 — interactive tools (2026-10-11)

Two new interactive tools (vanilla JS, ARIA + keyboard support, print styles,
Empire Briefing v2 design language). Now 5 tools total.

What shipped:
1. **Sponsor Deal Analyzer** (`pages/deal-analyzer.html` + `assets/js/deal-analyzer.js`
   → `site/deal-analyzer.html`) — input: platform, follower count, deliverable type
   (integrated slot / dedicated video / short-form), offered pay, usage-rights terms,
   whitelisting, exclusivity, payment terms. Output: verdict against the
   `sponsorship_rate_card_2026` ranges in `data/calculators.json` (tier lookup +
   implied-CPM check vs sponsored-CPM benchmarks; underpaid / fair / strong),
   red-flag checklist (unlimited/perpetual usage, perpetual whitelisting, broad
   exclusivity, net-60+), and a counter-offer worksheet (quote at top of range,
   usage rights priced separately +50–100%, exclusivity +25%+, ~23% negotiation
   buffer). Framed as a negotiation aid, not financial advice.
2. **Repurposing Planner** (`pages/repurpose.html` + `assets/js/repurpose.js` →
   `site/repurpose.html`) — input: one content idea + source format (long video /
   stream / podcast). Output: atom-test self-score (run the full SOP vs pillar-only),
   pillar-prep card adapted to source format, and five mission-card checklists
   (YouTube Day 0, Short Day +1, TikTok Day +2, IG Reel Day +3, Facebook Day +4)
   with per-platform hook adaptations generated from the idea text, native-grammar
   format notes from the Phase 3 SOP, and staggered posting order. Checkboxes toggle
   done-state; print button for the mission cards.
3. **Build wiring made tool-agnostic** — `build.py` nav / tool pages / script tags /
   API index `tools` / `llms.txt` Tools section are now all generated from the single
   `TOOLS` list (all three were hardcoded for the original 3 tools); index hero stats
   and footer nav updated to 5 tools.
4. **Cross-links** — Phase 3 (repurposing SOP → Repurposing Planner), Phase 5
   (negotiation section → Sponsor Deal Analyzer), rate-card page → Deal Analyzer.

Validation: `scripts/build.py` rebuilds clean (9 chapters, 5 tools, 6 skills,
14,734 words); `node --check` passes on all 6 JS files; local link check on the
built site: 561 refs, 0 broken; all JSON valid. One build-time bug caught by
`node --check` (mismatched quotes in deal-analyzer.js) and fixed before push.
JS logic smoke-tested under node with a stubbed DOM (verdicts, red flags,
counter-offer math, mission cards, atom test all PASS).

Commit: d20903862dfb3dda932c497c0c615a3b24eac1a4 (pushed 2026-10-11, base 3b1ec58;
parallel pipeline commits carried over via base_tree).

---

## Wave 4 — agentic/API/skills expansion (2026-10-11)

The site is now agent-actionable end to end: data, executable skills, an agent
landing page, and an in-browser API playground. All platform figures come from
existing 2026 research — nothing new invented; income figures stay illustrative,
never promises; "not financial/legal/tax advice" intact.

What shipped:
1. **4 new skills** (same Use when / Inputs / Procedure / Worked example / API
   references / Pitfalls format; all reference real `api/v1` endpoints):
   `deal-negotiation` (benchmark an offer vs the rate card, red-flag checklist,
   counter-offer worksheet — drives the deal-analyzer logic),
   `rate-card-reader` (tier/platform/deliverable range lookup from
   `calculators.json`, ~23% listing buffer, package-discount layer),
   `live-shopping-playbook` (TikTok live selling from the Phase 6 POD research:
   60-min run of show, flash-sale margin math, own-the-customer-data loop),
   `repurposing-sprint` (execute the 5-platform SOP: atom test, pillar prep,
   YouTube Day 0 → Short Day +1 → TikTok Day +2 → Reel Day +3 → Facebook Day +4).
   Skills index regenerated: **10 skills**.
2. **Agents landing page** (`pages/agents.md` → `site/agents.html`, new
   `MARKDOWN_PAGES` renderer in build.py): full agentic surface — `api/v1`
   endpoint table (chapters, glossary, calculators, skills, tools, references),
   `llms.txt`/`llms-full.txt`, all 10 skills with use-when summaries, data
   freshness policy (`updated`/`version` fields, verify-live flags, rate-card
   caveats), and 3 worked agent workflows (evaluate a $5K sponsorship offer,
   plan a 90-day launch, build a repurposing sprint for one video idea).
   Linked from nav + footer.
3. **API explorer** (`pages/api-explorer.html` + `assets/js/api-explorer.js`,
   new 6th tool): browses `api/v1` endpoints (self-discovered from
   `index.json`, static fallback), fetches relative paths, pretty-prints JSON
   in-browser; client-side only, graceful failure states. Build now mirrors
   `api/v1/` into `site/api/v1/` so the deployed site serves its own API —
   the explorer works live with no server. Hero/index stats updated 5→6 tools.
4. **API index** gained the `skills` endpoint key; `API.md` updated (ten
   skills, explorer + deploy-mirror docs); `GO_LIVE.md` documents the
   site-side api mirror; `llms.txt`/`llms-full.txt` regenerated with an
   ## Agents section (agents page, explorer, llms files).

Validation: `scripts/build.py` clean (9 chapters, 6 tools, 10 skills,
14,734 words); `node --check` on all 8 JS files PASS; all 11 JSON files valid;
internal link check across site/: 706 refs, 0 broken; skills/index.json = 10.

Commit: a489b8d3ed9e493d26406e113245f316778c39b6 (pushed 2026-10-11, base 23b5ecf;
remote main ref confirmed via GitHub API; parallel pipeline commits carried over via base_tree).

---

## Wave 5 — Empire Case Files (2026-10-11)

5 documented creator-business deconstructions as `pages/case-*.md` → `site/case-*.html`
(new entries in the `MARKDOWN_PAGES` renderer; chained end-nav case→case→agents; violet
"Case File" badge). Each file: the arc (0 → scale), a revenue-stack breakdown table, the 3
decisions that mattered, what to steal (actionable), what NOT to copy (context), and
sources with URLs. Every figure is source-reported (interviews, Fortune-verified records,
founder statements) and flagged where self-reported — framed as "what happened," never
as income promises.

What shipped:
1. `case-budget-grocery` — The Budget-Grocery Newsletter: viral 2023 grocery video → 3M+
   followers → seven-figure stack; paid newsletter ~$670K/yr as the primary line on a
   2-person team (source: the creator's own "5 Revenue Streams of a $1M+ Creator Business"
   interview + transcript).
2. `case-bens-bites` — Ben Tossell: 7-figure AI-education business, 10,000+ students in
   <9 months; newsletter top-of-funnel → paid education products; honest note that the
   "one person" core had a small team behind it (sources: Behind the Craft interview,
   creatoreconomy.so takeaways, bensbites.com/about).
3. `case-sleep-channels` — Adavia Davis: Fortune-verified (Dec 2025) faceless network,
   $40K–$60K/mo (~$700K/yr), 5 channels, "Boring History" 6-hour sleep documentaries,
   Claude + ElevenLabs pipeline (~$60/video, ~85% margins); "what NOT to copy" centers
   YouTube's 2025–2026 AI-content enforcement (sources: Fortune profile via UNILAD Tech
   and Newsy Today write-ups).
4. `case-mavwicks` — Mavwicks Fragrances on TikTok Shop: Megan Reep, ~$300–400K/yr
   before → $32M in the first year on TikTok Shop; founder-on-camera lives as
   entertainment events (sources: Modern Retail + Digiday, Jun 2026).
5. `case-ptya` — Ali Abdaal's Part-Time YouTuber Academy: cohort course as the primary
   line ($1.3M maker revenue 2021; $5M combined with the Kit email engine; $528K in 4
   days from one automation); the list, not the platform, as the business (sources:
   Digiday 2021, Kit case study 2026).
6. **Discovery**: "Empire Case Files" card section on the index (violet phase-cards),
   hero sticker, footer CASE FILES nav, cross-links from Phase 5 ("The 7-figure pattern")
   and Phase 8 ("Empire patterns").
7. **API**: new `case-files` endpoint (`api/v1/case-files.json`) in the index manifest,
   + `api/v1/schema/case-file.json`; `API.md` documents the endpoint and schema;
   `pages/agents.md` surface table gained the Case Files row; `llms.txt` gained a
   ## Case Files section (+ api reference) and `llms-full.txt` picked up all five case
   pages automatically.

Validation: `scripts/build.py` clean (9 chapters, 6 tools, 10 skills, 5 case files,
14,848 words); `node --check` on all JS files PASS; all api/v1 JSON + schemas valid;
internal link check across site/: 986 refs, 0 broken; 0 broken anchors.

Commit: 87eb943abdc3a72eb05a7eb786f21ec38985fc06 (pushed 2026-10-11; remote main ref
confirmed via GitHub API; all 13 case-file paths present on remote main). Note: the
first push attempt (308b7b18) silently dropped untracked files — gh-push.py only pushes
`git ls-files` tracked paths — so the case pages/API JSON were committed locally and
pushed in this follow-up. Lesson: always `git add -A` before gh-push.py.

---

## Wave 6 — FLAGSHIP: Empire Simulator (2026-10-11)

The "craziest products" mandate: a 12-month channel growth simulator — the most fun
page on the site, all client-side, all from the site's real 2026 numbers, honest
about being a model.

What shipped:
1. **`assets/js/sim-engine.js`** — pure, DOM-free simulation engine (UMD: browser
   `window.EmpireSim` + node `module.exports`). Month-by-month for 12 months:
   subs compound via base growth × niche factor × cadence factor × quality
   multiplier (all shown); views = subs × views-per-sub per format; ad revenue =
   views/1000 × niche RPM band (low/mid/high selectable) with Q4 uplift on
   months 10–12 (default +60%, slider 40–80% per research); sponsors kick in at
   1K/10K/100K/1M subs using `sponsorship_rate_card_2026` YouTube per-video ranges
   × the researched niche multiplier (finance/tech 2–3×, entertainment lower —
   sourced from the rate-card rule of thumb); affiliates and digital product
   (toggleable, conservative conversion assumptions, launch month selectable).
   YPP ad-revenue gate at 1,000 subs (watch-hours gate noted as not modeled).
2. **`assets/js/simulator.js` + `pages/simulator.html`** — game-HUD tool page
   (TOOL // 07): niche dropdown fed live from `data/calculators.json` RPM bands,
   starting subs, long-form/shorts cadence, quality level (labeled assumption),
   monetization toggles; assumptions drawer (growth-rate slider, RPM low/mid/high,
   Q4 slider, digital price + every fixed assumption listed and sourced);
   outputs: SVG subscriber curve + SVG revenue-stacked-by-stream chart (static,
   responsive, labelled, aria-described), month-by-month ledger table, empire
   milestones timeline ("First $1K month: Month 7" style — computed, celebrated
   with sticker-bomb badges), end-of-year empire stats card, "Share my empire"
   (copies a text summary), and a big coral banner: "A MODEL, NOT A PREDICTION —
   change the assumptions, change the empire."
3. **Discovery**: nav entry ("Simulator"), footer TOOLS link, index Command Center
   card + hero counts 6→7, `pages/agents.md` tool table, cross-links from Phase 2
   (niche selection), Phase 5 (monetization checklist), Phase 8 (scale); `llms.txt`
   tools section; API tools list auto-updated. `build.py` TOOL_SCRIPTS now supports
   multiple scripts per tool (engine + wiring).
4. **A11y/perf**: semantic HTML, native `<details>`/`<fieldset>`/`<table>`,
   aria-live results, keyboard-focusable drawer summary, reduced-motion-safe
   (static SVGs, no animation), mobile-first grid.

Validation: `scripts/build.py` clean (9 chapters, **7 tools**, 10 skills, 5 case
files, 14,947 words); `node --check` on sim-engine.js + simulator.js PASS;
internal link check 0 broken; `tests/sim-engine.test.js` ALL PASS under node —
cadence monotonicity, finance ≥ gaming at equal inputs, Q4 uplift flag + per-sub
uplift on months 10–12 only, sponsor tiers nano/micro/macro/mega at 5K/50K/200K/2M
subs, digital toggle + launch month; plus a stubbed-DOM smoke test of the full
render path (form → engine → SVG charts → table → milestones) PASS.
Sanity tuning note: the first test run had gaming out-earning finance because the
niche-growth compounding gap swamped the RPM gap in niche-independent streams
(digital/sponsors) — fixed by applying the researched sponsor niche multiplier
(finance/tech 2–3×), which is grounded in the rate-card rule of thumb, not invented.

---

## Wave 7 — research fuel integration: niches + platform rules (2026-10-11)

Research source: `~/workspace/research_notes/wave-fuel-2026-20261011-2355/` (Missions A/C,
read Oct 11, 2026). All figures sourced in the research notes; single-source claims flagged
in-page. No income promises — CPM/RPM as creator-reported ranges. "Not financial advice" intact.

What shipped:
1. **Phase 0 "2026 niche landscape" section** — research-backed niche intelligence:
   fastest channel growth (TubeAI/AIR: kids 1.59%, ASMR 1.56%, creator economy 1.50%,
   challenges/stunts 1.47%, AI/ML 1.44%, true crime 1.34%); search growth (OutlierKit: AI
   tools +340% at $8–20 CPM, no-code/automation +220% most underserved, Gen Z finance
   +180% at $18–45, cybersecurity +160%); breakout formats (betrayal/revenge 21x at
   $20–25 CPM low competition, English-learning podcasts 21x, senior health 19x ultra-low
   competition); RPM reality (finance $8–35 vs gaming/entertainment $1–5, ~7x gap; kids
   content $0.33 RPM warning — ~3M views to earn $1,000); the <1% reality check (<1% of
   channels ever hit 100K subs — plan around 10K–30K loyal); clipping-channel warning
   (Oct 1 2026 Shorts update) and Jan 2026 AI-slop purge warning (16 channels, 4.7B views).
   Comparison table + machine-readable pointers to the new JSON blocks.
2. **Phase 2 YouTube update** — new "October 2026 Shorts originality update" section:
   channel-level reach cut for re-uploaded/aggregator content (announced by Rene Ritchie,
   Oct 1, 2026), clipping channels as the target, recommendations-only scope, and the May
   2026 AI-disclosure rule (labels don't hurt reach; undisclosed photorealistic AI gets
   reduced recommendations or removal).
3. **Phase 3 TikTok + Reels update** — TikTok signal hierarchy (completion/watch time
   dominant, rewatches/shares/saves next, comments quality-weighted, likes declining;
   interest-graph not social-graph; test-pool model; TikTok-as-search-engine keyword lever);
   Reels ranking per Mosseri (sends per reach #1, hierarchy sends > watch time >
   completion/rewatches > likes > comments), Reels >3min not pushed to non-followers
   (single-source, flagged), TikTok-watermark deprioritization.
4. **`data/calculators.json` v1.2.0 (2026-10-11)** — RPM bands updated to research:
   finance_investing [8,35] (was [8,20]), gaming [1,5] (was [1.5,4]),
   comedy_entertainment [1,5] (was [1.5,4]), new kids_content [0.33,0.33] floor;
   NEW `niche_growth_2026` block (channel growth %, search growth, breakout formats,
   RPM reality, reality checks — sourced, dated) and NEW `platform_rules_2026` block
   (TikTok / Shorts / Reels rules with sources and dates). Empire Simulator reads the
   same keys — verified working: kids_content 12-mo sim runs, finance band confirmed
   [8,35] live. Simulator niche dropdown gained "Kids Content" label.
5. **Rebuilt site + agent surfaces** — llms.txt/llms-full.txt regenerated (16,012 words,
   up from 14,947); api/v1/calculators.json carries both new blocks.

Validation: `scripts/build.py` clean (9 chapters, 7 tools, 10 skills, 5 case files);
`node --check` on sim-engine.js + simulator.js PASS; internal link check 0 broken;
`tests/sim-engine.test.js` ALL PASS under node (cadence monotonicity, finance ≥ gaming
at equal inputs, Q4 uplift months 10–12 only, sponsor tiers, model shape).

---

## Wave 8 — validation/hardening (2026-10-11)

One-command validation pipeline + the real issues it surfaced. No content changes
beyond the fixes below.

What shipped:
1. **`scripts/validate.sh`** — 7-stage pipeline (modeled on the film guide's /
   marvel's, adapted here): (1) `node --check` on all 11 source JS files
   (assets/js + tests); (2) JSON parse of every api/data/skills/scripts JSON;
   (3) draft-07 schema validation of chapters/case-files/glossary/calculators
   against api/v1/schema/, plus every record `path` resolving to a site/ page;
   (4) relative-link check across all site/ pages + pages/ fragments + JS
   fetch() literals + api/v1/index.json endpoints — 0 broken of 1,169 checked;
   (5) build reproducibility (`scripts/build.py` clean rebuild → zero git diff
   on site/, api/, llms.txt, llms-full.txt, skills/index.json); (6) the
   `tests/sim-engine.test.js` suite (16 assertions); (7) llms.txt freshness —
   9 phases / 7 tools / 1 reference / 5 case files / 10 skills match build.py,
   every section marker present in llms-full.txt. Non-zero exit on any failure.
2. **New `api/v1/schema/calculators.json`** (generated by build.py) — locks the
   data contract the sim engine, revenue calculator, and deal analyzer read:
   required blocks, RPM bands as 2-number arrays (finance_investing / gaming /
   kids_content required), niche_growth_2026 and platform_rules_2026 shapes.
3. **Real fixes found by the first run:**
   - `api/v1/index.json` `references` used a bare slug `"rate-card"` while
     `tools` used page filenames — now `"rate-card.html"`, consistent and
     site-root-resolvable (build.py one-liner).
   - **Build ordering bug:** the site/api/v1 mirror was copied BEFORE the
     schema files (and skills.json) were written, so a clean build shipped a
     mirror missing schema/case-file.json + schema/calculators.json —
     previously masked because incremental builds left stale copies behind.
     Mirror now copies after ALL api/v1 writes.
   - API Explorer listed only 2 of the 4 schema endpoints — added
     schema/case-file.json + schema/calculators.json to the static list.

Validation: first run 5/7 pass, caught the issues above; after fixes +
committed rebuild, **7/7 stages pass** (11 JS files, 13 JSON files, schema
clean, 0 broken links of 1,169, byte-identical rebuild, 16/16 sim assertions,
llms counts fresh).

---

## Wave 9 — navigation/design refinement: hubs, mobile QA, tool states (2026-10-11)

The site outgrew its nav (9 chapters, 7 tools, 10 skills, 5 case files, reference
pages). Navigation caught up — hub-first discovery, not more nav links.

What shipped:
1. **`site/tools.html` — Tools hub** (generated by build.py from `TOOLS` +
   new `TOOL_HUB_META`). All 7 tools as Empire Briefing v2 cards: icon tile,
   name, one-line "Use when", best-for tags, `BRIEF // 0N` index; grouped
   PLAN / MONEY / CONTENT (Niche Picker, 90-Day Planner, Empire Simulator /
   Revenue Calculator, Sponsor Deal Analyzer / Repurposing Planner, API Explorer).
2. **`site/case-files.html` — Case Files hub** (from `CASE_HUB`). Five cards
   with sourced revenue-stack thumbnails (the headline numbers + attribution:
   e.g. "$32M in year one on TikTok Shop" via Modern Retail/TikTok-shared data;
   "$40–60K/mo" Fortune-verified; "7 figures in under 9 months" self-reported),
   "X MIN READ", plus a comparison table (niche, primary revenue, team,
   timeline) in a `.table-wrap` scroller and a reported-not-audited honesty note.
3. **Nav consolidation** — desktop nav is now 5 hub-first links (Empire Map,
   Tools, Case Files, Glossary, Agents); the full per-tool list lives in the
   mobile nav and the footer. Tool pages highlight "Tools", case pages highlight
   "Case Files". Index section-heads gained "All 7 tools →" / "All 5 case files →".
   New `assets/css/hub.css` (brief card, empty/error states, `.section-more`,
   mobile fixes).
4. **Mobile QA at 390px** — real fixes, no screenshots available: nav-toggle and
   mobile nav links raised to ≥44px tap targets; `.hud-head` wraps instead of
   squeezing (simulator legend); range sliders get a 44px hit area; explorer
   endpoint rows lost their misplaced checkbox markers (endpoints aren't tasks)
   and wrap cleanly; comparison table scrolls horizontally via `.table-wrap`.
5. **Empty + error states** — every tool now ships a designed `.empty-state`
   ("Nothing brewing yet." + per-tool copy) in its results container; quiz reset
   restores it. Config-load failures (calculator, deal-analyzer) render the
   `.error-state` design with a working "Try again" retry button; repurpose's
   no-idea path uses it too. API Explorer: proper empty state behind the
   preview, loading row in the endpoint list, and a design-treated `role="alert"`
   failure panel that restores the empty state.

Validation: `scripts/build.py` clean (9 chapters, 7 tools, 10 skills, 5 case files);
rebuild committed, then `scripts/validate.sh` **7/7 GREEN** (11 JS files,
13 JSON files, 0 broken of 1,299 links, byte-identical rebuild, 16/16 sim
assertions, llms counts fresh).

---

## Wave 10 — deep content: "The First Hire" (2026-10-11)

Phases 7–8 covered business/scale but hiring was thin. This wave fixes that with
research-first sourcing.

What shipped:
1. **Research via browser.search** — 2026 freelance rates compiled Oct 2026:
   video editors (solopricing $150–$500/video typical, $200–$400 consistent,
   $500–$800 premium; retainers $800–$5K/mo by volume; LatAm dedicated
   $2.5–$3K/mo — floowitalent; cutjamm survey avg $27.55/hr); thumbnail
   designers (live Upwork postings $5–$40/thumbnail, $2–$3K/mo full-time
   equivalent); VAs (offshore $3–$12/hr, nearshore $8–$22/hr, US $25–$50/hr,
   managed plans $899–$1,699/mo — vantastaff/cherryassistant/remotescouts);
   where creators hire (Upwork, ytjobs.co, r/VideoEditing, creator Discords,
   own audience, Indeed — Oct 2026 remote editor listing $25.69–$50/hr);
   contractor-vs-employee basics (IRS three-factor test, W-9 before first
   payment, misclassification penalties — all flagged **not legal/tax advice**).
   The Creators Assistant's true-cost analysis (management time, revision
   overhead, replacement amortization) included as reported-not-audited.
2. **New guide page `pages/hiring.md` → `site/hiring.html`** (MARKDOWN_PAGES,
   badge "Guide", ~2,400 words): "The First Hire" — editor-vs-VA decision
   framework, sourced 2026 rate tables, where to find them, the 2-week trial
   method (paid trial task + fixed rubric + workflow-test week), **3 copy-paste
   SOP templates** (editing handoff, thumbnail brief, upload checklist),
   contractor agreement essentials + contractor-vs-employee reality check
   (not legal advice), and when NOT to hire yet. Sources section lists every
   benchmark. Cross-linked from Phases 7 and 8 (both chapters now point here).
3. **New tool: Hiring Cost Calculator** (`pages/hiring-calculator.html` +
   `assets/js/hiring-calculator.js`, TOOL_SCRIPTS wired) — inputs (role,
   billing model hourly/per-video/monthly, rate, hours/week, units/month,
   monthly views, niche RPM band from calculators.json) → monthly/annual cost
   (sticker vs +15% operating-overhead loaded), share of ad revenue, monthly
   views needed to cover, 3-month coverage reserve. Reuses calculator.js
   patterns (calc-grid, calc-out cards, empty/error states, data-retry
   delegation). Honest math, no income promises.
4. **Nav/hubs/llms** — TOOLS + TOOL_HUB_META (MONEY group, ⚒ icon) +
   MOBILE_NAV_LINKS + footer links; index "All 8 tools →"; llms.txt generator
   text updated ("All eight tools"); llms-full.txt carries the Guide.

Validation: `scripts/build.py` clean (9 chapters, 8 tools, 10 skills,
5 case files, 16,080 words); rebuild committed, then `scripts/validate.sh`
**7/7 GREEN** (12 JS files, 13 JSON files, 0 broken of 1,462 links,
byte-identical rebuild, 16/16 sim assertions, llms counts fresh).

Commit: 74ba71a10927959eac4363b137f438b26a6703c6 (pushed 2026-10-11).

## Wave 14 — Niche Atlas (2026-10-11)

What shipped (all traced to the wave-7 research notes at
`~/workspace/research_notes/wave-fuel-2026-20261011-2355/notes/mission-c-niches.md` —
no invented niches or numbers):
1. **New reference page "The Niche Atlas"** (`content/niche-atlas.md` →
   `site/niche-atlas.html`, registered in `REFERENCE_PAGES`): the <1%-of-
   channels-ever-reach-100K reality check front and center; channel growth
   rates (kids 1.59%, ASMR 1.56%, creator economy 1.50%, challenges/stunts
   1.47%, AI/ML 1.44%, true crime 1.34%); search growth (AI tools +340%
   $8–20 CPM, no-code/automation +220% "most underserved", Gen Z finance
   +180% $18–45, cybersecurity +160%); breakout formats (betrayal/revenge
   21x $20–25 CPM low competition, English learning 21x, senior health 19x
   ultra-low); finance $8–35 vs gaming/entertainment $1–5 RPM reality; the
   avoid list (clipping channels post-Oct-1-update, low-effort AI slop
   post-Jan-purge, kids-content $0.33 RPM trap, gambling/crypto + medical
   claims + news/politics on TikTok); sources + disclaimers intact.
2. **Interactive niche explorer** (`assets/js/niche-atlas.js`, mounted on the
   reference page): filter by revenue tier / competition / startup cost /
   skill fit, sort by channel growth / revenue midpoint / search growth /
   name, "compare two niches" head-to-head table with a plain-language
   verdict; every niche links to its chapter, the Niche Picker, and the
   simulator scenario / case file where one exists. Semantic HTML, labeled
   controls, aria-live result counts, keyboard-native, reduced-motion CSS,
   noscript fallback to the article's static tables.
3. **New API endpoint `api/v1/niches.json`** (source of truth
   `data/niches.json`, mirrored to `site/api/v1/`): 20 sourced niche
   records, 15-source bibliography with observation dates, the avoid list,
   the reality check, revenue-tier legend. Draft-07 schemas
   (`api/v1/schema/niches.json` doc + `niche.json` record), registered in
   the manifest with a freshness note. Documented in AGENT.md, API.md,
   `pages/agents.md`, and the `llms.txt` API section.
4. **Honesty contract intact**: every RPM/CPM figure a creator-reported
   range (never a point estimate), single-source claims flagged on each
   record, sorting uses labeled range midpoints (never presented as rates),
   no income promises, "not financial, legal, or tax advice" on-page and
   in the payload.

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (15 JS
files node --check, 25 JSON files parse, draft-07 schemas incl. the new
niches/niche pair, 0 broken of 1,654 links, byte-identical rebuild on the
committed tree, 72 sim assertions, 36 agent-workflow assertions, llms
counts fresh).

Commit: 03825a66508de380708ccce6fb0ce9d78f8cb88d (pushed 2026-10-11).

## Wave 15 — The Deal Room (2026-10-11)

What shipped (extends the wave-3 Sponsor Deal Analyzer into full sponsorship
deal management; every benchmark a reported 2026 range, never a quote):
1. **Deal tracker** (`pages/deal-room.html` → `site/deal-room.html`, the 10th
   tool): log offers (brand, platform, followers, deliverable, expected views,
   pay, usage rights, exclusivity, payment terms, timeline, notes) in
   localStorage only — no accounts, no network writes. Status pipeline
   offer → negotiating → signed → delivered → paid (advance buttons + status
   filter). Every deal scored against the 2026 rate card
   (fair/under/over + the ~23%-listed-above-accepted honesty note).
2. **Usage-rights pricing calculator**: base post fee × tier. Reported tiers
   flagged honestly — paid ads 30d +50%, 6mo +75%, 12mo +100% (the wave-2
   research band, each tier labeled reported/not-gospel); whitelisting and
   full buyout return guidance instead of invented multipliers (whitelisting
   priced as a user-set monthly line; buyout a 2.0× negotiation floor or
   refuse outright).
3. **Negotiation scripts** — lowball counter, usage-rights upsell, exclusivity
   pushback, rush-fee ask — all grounded in the rate-card chapter, rendered
   live from one context form, copy-to-clipboard with fallback + aria-live
   confirmation. The rush-fee script carries a fill-in rate: no research
   benchmark exists, and the data says so.
4. **Red-flag checklist** — the walk-away signals (net-90+ without escrow,
   unlimited revisions, perpetual usage for organic price, no kill fee) +
   perpetual whitelisting and broad exclusivity as majors; interactive scoring
   (any walk-away flag or 3+ points → walk away), persisted to localStorage.
5. **"Copy my deal memo"** — one-page deal summary (terms, rate-card score,
   checked flags, counters, disclaimer) from any logged deal: copy to
   clipboard or download .txt.
6. **New API endpoint `api/v1/deal-templates.json`** (source of truth
   `data/deal-templates.json`, mirrored to `site/api/v1/`): 4 scripts,
   6 red-flag items, 6 usage-rights tiers, scoring rules. Draft-07 doc schema
   (`api/v1/schema/deal-templates.json`), registered in the manifest
   (schemas count 13 → 14, freshness note on the endpoint). Documented in
   AGENT.md (Workflow 5 + programmatic-tools table), API.md, `pages/agents.md`
   (surface table + workflow 5), README, and the `llms.txt` API section.
7. **Deal Room engine** (`assets/js/deal-room.js`, UMD — browser +
   `require()`-able in node): `scoreOffer`, `priceUsage`, `redFlagScore`,
   `renderScript`, `dealMemo`, `tierOf`, `nice`, `fmt`; UI wiring in
   `assets/js/deal-room-ui.js` (pure-math-free, localStorage, clipboard).
   Registered as TOOLS entry 10 (MONEY group in the hub, "All 10 tools"
   everywhere) with a `tools.json` input schema + drive notes. The
   wave-3 deal analyzer page now cross-links to the Deal Room.

Validation: `scripts/build.py` clean (9 chapters, 10 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (18 JS
files node --check, JSON parse, draft-07 schemas incl. the new
deal-templates doc, 0 broken links, byte-identical rebuild on the committed
tree, 72 sim + **78 deal-room** engine assertions, 47 agent-workflow
assertions — incl. the new Workflow 5 against the real JSONs, llms counts
fresh).

Commit: ca56215f7f560cb300de11fccab5e1362905f2ae (pushed 2026-10-11).

## Wave 16 — The Content Engine (2026-10-11)

What shipped (the missing pillar: idea → production → repurposing, three new
interactive tools, 10 → 13):

1. **Idea Bank** (`pages/idea-bank.html` → `site/idea-bank.html`, tool 11):
   localStorage idea capture — title, format (long/short/community), niche
   tag (datalist from `api/v1/niches.json`, free text fallback), effort
   estimate, hook-strength self-score 1–5 scored against the five Short-Form
   Playbook hook structures (reference cards on-page, linked to the Hook
   Builder). Sort by score (ties FIFO) or newest, filter by format;
   "Promote to production" moves an idea into the content calendar's dealing
   pool. localStorage only, nothing leaves the browser.
2. **90-Day Content Calendar** (`pages/content-calendar.html`, tool 12):
   cadence input (X longs + Y shorts/week, rest day, 13 weeks) auto-deals
   the bank into a 90-day grid using the week-planner dealing rules — longs
   sort by hook score then round-robin across non-rest work days, shorts
   every other work day, rest day non-negotiable, week 7 midpoint review.
   Empty slots stay OPEN (never filler); surplus ideas return as backlog.
   Drag-and-drop + keyboard move (‹ › buttons, arrow keys), star-marked
   sponsor slots (calendar commitments only — price them in the Deal Room),
   "Copy my calendar" text export, and "Send cadence to Simulator"
   (copies `{longform_per_week, shorts_per_week}` for the Simulator — a model,
   not a prediction). Moves/sponsor marks persist per config in localStorage.
3. **Batching Planner** (`pages/batching.html`, tool 13): "film day" math —
   videos/shoot-day + shoot-days/month vs cadence × 52/12 (the honest month).
   Surplus/balanced/shortfall verdict with honest guidance and the
   consistency-beats-volume framing ("'I'll find the time' is not capacity").
   No promises: pure arithmetic on the creator's own inputs.
4. **Repurposing Pipeline 2.0**: extends the wave-3 planner in place
   (`assets/js/repurpose.js` now loads the shared engine). One long-form
   pillar in → the 7-derivative map (short clip, community reaction, TikTok
   cut, Reel cut, newsletter issue, X thread, Facebook post) — every
   derivative carries a **required original element**, plus the Oct-1
   originality guardrails (no identical re-uploads, fresh hooks, native
   grammar, written text derivatives, atom-test gate). Repurposing is not
   re-uploading.
5. **Content engine** (`assets/js/content-engine.js`, UMD — browser +
   `require()`-able in node): `hookScore`, `sortIdeas`, `filterIdeas`,
   `dealIdeas`, `batchingMath`, `repurposeMap`, `originalityGuardrails`,
   `simInputFromCadence`, `exportCalendarText`. UI scripts
   (`idea-bank-ui.js`, `content-calendar-ui.js`, `batching-ui.js`) are
   pure-math-free DOM/localStorage wiring. Honesty contract: the engine does
   arithmetic on the creator's inputs only — never promises views, revenue,
   or growth. A planning aid, not financial/legal/tax advice.
6. **New API endpoint `api/v1/content-engine.json`** (source of truth
   `data/content-engine.json`, mirrored to `site/api/v1/`): 3 idea formats,
   5 hook structures, dealing rules, batching guidance, the 2.0 derivative
   map, 5 guardrails, deal-slot guidance, simulator bridge. Draft-07 doc
   schema (`api/v1/schema/content-engine.json`, derivative/guardrail/hook ids
   cross-checked against the engine by the test suite), registered in the
   manifest (schemas count 14 → 15). Documented in AGENT.md (Workflow 6 +
   tools table), API.md (endpoint + schema list), `pages/agents.md`
   (surface table + workflow 6), README, and the `llms.txt` API section.

Cross-links: Idea Bank → Hook Builder (structures) + Niche Atlas (tags);
calendar → Simulator (cadence bridge) + Deal Room/rate card (sponsor slots);
batching → Planner + Simulator; repurposing 2.0 → Idea Bank + calendar.

Validation: `scripts/build.py` clean (9 chapters, 13 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (23 JS
files node --check, JSON parse, draft-07 schemas incl. the new
content-engine doc, 0 broken links (1,896 checked), byte-identical rebuild
on the committed tree, 72 sim + 78 deal-room + **49 content-engine** engine
assertions, 47 agent-workflow assertions — incl. the new Workflow 6 against
the real JSONs, llms counts fresh).

Commit: 868a16f (local) → d793f2d08b79e36ee8035cfabfbdc7aa4b1c3aeb (pushed 2026-10-11, remote tree verified via GitHub API).


## Wave 17 — Case files 6–7: The Poly Couple + Gibi ASMR (2026-10-11)

Deep sourced content wave. Two new case files in the existing format, both
with public, verifiable trajectories — zero invented numbers, zero income
claims (revenue is never stated or implied in either file):

1. **The Poly Couple** (`pages/case-poly-couple.md`) — Dana and the Wolf's
   serialized micro-drama, from the wave-7 21x breakout-format territory.
   Music covers → vlogs → a fictionalized-relationship shorts series;
   the Oatly casting (Lana Spring) and love-triangle arc shot it to
   popularity. Sourced numbers: nearly 400K YouTube subs, 10K+ consistent
   viewers/episode, hundreds of episodes deep (Trill Magazine, Oct 2026);
   the 11,000-view turning point and Electric Now pickup after TikTok
   discovery by Dean Devlin (Dope Interviews); series underway by ~2021
   (podcast archive, flagged as estimate). Takeaways tie to Playbook
   serialized-drama mechanics (numbered series, recurring characters),
   Niche Atlas betrayal-dramas card, Content Engine batching, and the new
   `serialized-mini-drama` simulator scenario.

2. **Gibi ASMR** (`pages/case-gibi-asmr.md`) — the ASMR case from the same
   territory. June 2016 channel creation, full-time from day one (took
   winter quarter off), 100K by Jan 2017, then public milestone dates:
   1M (Jun 7, 2018) → 5M (Jun 3, 2024), ~5.2M subs / 2.56B views /
   ~2,000 videos (SocialBlade, Oct 2026 — flagged verify-live). Mechanics:
   cosplay-convention crossover into roleplay ASMR, original + licensed
   characters, Twitch/sideways expansion, mainstream crossovers (Rooster
   Teeth, Polydor, Reese The Movie), then the talent-agency stack. Takeaways
   tie to Content Engine batching, Niche Atlas ASMR card, the new
   `asmr-roleplay` simulator scenario, and the avoid-list lesson (visible
   human creativity as the moat under the 2026 inauthentic-content
   enforcement).

**Simulator scenarios** (both case-modeled, proxies declared in
`nicheProxyNote`, labeled as planning assumptions not historical replays):
`serialized-mini-drama` (comedy_entertainment, 1 longform + 4 shorts/wk) and
`asmr-roleplay` (lifestyle proxy, 2 longform + 3 shorts/wk, sponsors on).
Scenario library now 8; the `scenario_id` enum in the simulator tool schema
grew 6 → 8, and the wf4 workflow tests were updated to match.

**Cross-links**: case-files hub (CASE_HUB + 7-file nav chain
ptya → poly-couple → gibi-asmr → agents), footer nav, home sticker
("7 case files"), Niche Atlas niche cards (betrayal-dramas →
case-poly-couple.html; asmr → case-gibi-asmr.html, simulator_scenario
pointers updated), Short-Form Playbook serialized mini-dramas bullet,
AGENT.md/README.md counts.

Validation: `scripts/build.py` clean (9 chapters, 13 tools, 12 skills,
7 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (23 JS
files node --check, JSON parse, draft-07 schemas, 0 broken links (2,076
checked), byte-identical rebuild, 80 sim + 78 deal-room + 49 content-engine
engine assertions, 59 agent-workflow assertions).

Commit: 8d903f5 (local) → 321ca1bfdb490ebb4a5a0516c01f578cd597bf3e (pushed 2026-10-11, remote tree verified via GitHub API).
