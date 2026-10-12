# Creator Growth Empire — Wave Log

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
