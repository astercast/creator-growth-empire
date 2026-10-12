# Creator Growth Empire — Wave Log

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
