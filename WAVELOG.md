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

Commit: <pending push>
