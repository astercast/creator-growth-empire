# Wave 27 — Cadence Coach: the Posting Cadence Optimizer (tool #20) (2026-10-11)

The flagship "how often should I post?" tool — the missing first link of the
cadence pipeline. Every other cadence-adjacent tool takes cadence as an
*input* (90-Day Planner schedules it, Batching Planner capacity-checks it,
Content Calendar deals into it, the Simulator models it); none of them
*recommends* one. Cadence Coach closes that gap: honest weekly hours +
formats + platforms → a sustainable weekly posting cadence, with a 7-day
schedule grid, per-platform Oct-2026 revenue realities, and a 2-week ramp
method. Engine is pure capacity arithmetic plus platform facts — it says
so on every output, because no peer-reviewed cadence science exists.

**Parallel-lane discipline:** wave 26 (Deal Analyzer #19 + Empire Simulator
4.0) is live on the same repo with uncommitted changes to
`assets/js/deal-analyzer.js`, `assets/js/sim-engine.js`,
`data/calculators.json`, `pages/deal-analyzer.html` (+ new
`assets/js/deal-analyzer-ui.js`). None of those files were read beyond
`git status` or touched. `scripts/build.py` / `scripts/validate.sh` /
`tests/agent-workflows.test.js` / `AGENT.md` / `README.md` / `API.md` /
`pages/agents.md` were deliberately NOT edited — the wiring is staged in
`MERGE-fragment-w27-tools.md` (blocks B1–B8, exact search/replace) for the
parent to apply after wave 26 merges. New files only.

**Research integrated (read 2026-10-11):**
- `~/workspace/research_notes/RESEARCH_LOG.md` + the fresh creator-economy
  scout report (`creator-economy-20261011-2010/report.md`, Oct-11-2026):
  TikTok Creator Rewards $0.40–$1.00/1K qualified views with the 1-min+
  qualifier [verified, AIR]; Reels $0 per view in 2026 [verified, AIR];
  Shorts $0.02–$0.20/1K views [verified, AIR]; Feb-2027 10M qualified
  Shorts views/90d floor checked monthly [multi-source]; Oct-1-2026
  originality rule — straight re-uploads lose reach [verified 6+ outlets];
  20M+ videos uploaded to YouTube/day (Mohan, Made on YouTube Sept 2026).
  Every platform note carries its source label; ranges are creator-reported,
  never promises. The report's "retention craft beats volume" thesis is the
  tool's framing line (consistency beats volume).
- **Web-craft design reports LANDED mid-wave** (`web-craft-20261011-2014/`
  + `web-craft-20261011-2025/`, read in full): applied to tool #20 —
  typography micro-craft (`text-wrap: balance` on result headings,
  `font-variant-numeric: tabular-nums` on stat numbers, 65ch measure on
  prose, `text-wrap: pretty` kept `@supports`-gated per the round-2
  Firefox dispute); same-document view transitions on results render
  (Baseline Oct 2025), gated on `prefers-reduced-motion: no-preference`
  with a plain-swap fallback; scroll-driven week-cell reveals
  (`animation-timeline: view()`, transform+opacity only, compositor),
  `@supports`-gated with the finished-visible state as CSS default
  (failure-mode rule) and no-preference gating; motion tokens
  (120/200ms, standard + decelerate easings); hand-rolled SVG utilization
  ring (angle-6 recipe — the number is the encoding, color redundant).
  Deliberately NOT applied: scroll progress bar (wave 28 owns that
  pattern on their page — no duplication), blur-reveal signature and
  kinetic type (wrong register for a utilitarian tool; restraint wins),
  font-pipeline changes (fleet-level decision, out of wave scope).
  Everything scoped to `.cc-*` / `#cc-results` — zero collision with wave
  28's `.platform-rules` scope (asserted in-test). Reduced-motion safe
  throughout; site identity untouched.

**Honesty contract:** no income promises, no growth promises — the engine
emits "Posting more never guarantees views, revenue, or growth" and
"no peer-reviewed cadence science exists"; per-piece minutes are labeled
"adjustable starting estimates, not benchmarks"; the 70%-of-max 2-week ramp
is labeled the tool's house method, not science; "not financial, legal, or
tax advice" on-page and in every output object. The test suite enforces
the contract (no guarantee / income-promise phrasing, disclaimer present).

What shipped (all new files):
1. **Engine** (`assets/js/cadence.js`, UMD — browser + node): `validInput()`,
   `capacityMath()` (production minutes = weeklyHours×60×(1−overheadPct);
   default 20% overhead reserve), `recommend()` (longs-first / shorts-first /
   balanced-50-50 allocation by per-piece minutes; utilization vs
   *production* minutes — holds ≤0.7, tight ≤0.95, over above; platform-note
   gating; tuition-phase caveat at Money Map stage 0; ramp = 70% of max,
   min 1), `dealWeek()` (longs spread evenly over non-rest days, shorts
   round-robin, rest day always empty). `PLATFORM_NOTES` carries the four
   Oct-2026 platform facts with source labels.
2. **UI** (`assets/js/cadence-ui.js`, pure-math-free): platform checkboxes,
   priority radios, honest-hours input, Money Map stage + rest-day selects,
   optional per-piece-minute overrides; results swap via same-document view
   transition gated on `prefers-reduced-motion: no-preference` (plain-swap
   fallback); hand-rolled SVG utilization ring (role=img, number as the
   encoding); aria-live results; localStorage `cge.cadence.v1` last-input
   restore; "Copy my cadence →" clipboard bridge
   (`{longform_per_week, shorts_per_week, rest_day}`) feeding the Planner /
   Simulator; error-state on invalid input.
3. **Page** (`pages/cadence.html`): form, empty-state, full `<noscript>`
   fallback (the honest one-paragraph version: the formula + platform facts),
   "The cadence pipeline" cross-link section (Batching → Planner → Calendar
   → Simulator), honesty footer. Own stylesheet `assets/css/cadence.css`
   (mobile-first week grid; `@supports`-guarded container-query week strip;
   web-craft layer: balance/tabular-nums/65ch/pretty-gated typography,
   motion tokens, scroll-driven cell reveals with visible-by-default
   failure mode — all `.cc-`-scoped, reduced-motion safe).
4. **Tests** (`tests/cadence.test.js`, **71 assertions** — validation,
   capacity pins (20h→960 prod mins→1 long/10 shorts), per-priority
   allocation pins, verdict-band pins, ramp bounds, dealWeek shape/spread/
   rest-day pins, platform-note gating, tuition/method notes, honesty
   contract, + a web-craft contract section: view-transition
   reduced-motion gating, scroll-reveal `@supports` gating + visible
   failure mode, balance/tabular-nums/65ch/pretty-gated CSS, SVG ring,
   no `.platform-rules` selector collision). Exit 0 standalone.
5. **`MERGE-fragment-w27-tools.md`** — the staged wiring (B1: TOOLS entry;
   B2: TOOL_HUB_META PLAN-group card; B3: TOOLS_API record with draft-07
   `CadenceInput` schema + drive notes; B4: TOOL_SCRIPTS; B5: TOOL_CSS;
   B6: tool-count strings; B7: validate.sh stage-6 suite line; B8:
   agent-workflows wf2 count + cadence schema pin) plus manual doc
   touch-ups (AGENT.md tool-drive row, README/API.md/agents.md counts).

**Merge-fragment proven in scratch:** the full B1–B8 set was applied to a
scratch copy of the tree (including wave 26's in-flight changes), then
`scripts/build.py` (clean — 9 chapters, 19 tools, 12 skills, 9 case files)
and `scripts/validate.sh` — **16 passed, 0 failed, ALL STAGES PASS**:
`site/cadence.html` renders as TOOL // 019 with both scripts + CSS wired
(incl. the web-craft layer); tools hub carries the Cadence Coach card;
`api/v1/tools.json` 19th record is cadence with the draft-07-validated
CadenceInput schema; llms.txt fresh; 0 broken links; byte-identical
rebuild; 71 cadence assertions in stage 6; agent workflows 105→106 with
the new wf2 cadence schema pin.

Validation (real tree, fragment NOT applied — the committed tree is
build-consistent without it): `scripts/build.py` untouched inputs;
`scripts/validate.sh` **8/8 GREEN** (JS syntax incl. the 2 new files, JSON
parse, draft-07 schemas, 0 broken links, byte-identical rebuild on the
committed tree, all existing engine suites green — cadence suite runs
standalone at 62/62 via `node tests/cadence.test.js`).

Design findings applied (per the new mandatory design input): both
web-craft reports read in full; applied — balance/tabular-nums/65ch/
pretty-gated typography, no-preference-gated same-document view
transitions, @supports-gated scroll-driven reveals with visible failure
mode, motion tokens, hand-rolled SVG ring; deliberately skipped — wave 28's
scroll progress bar (their pattern), blur-reveal/kinetic-type (wrong
register), font-pipeline changes (fleet scope). All `.cc-`-scoped; no
collision with wave 28's `.platform-rules` (asserted in-test).

Commit: 40cce22 (local) → b242b0abe94f91f906edf16a6e7d4b24cd65a99c (pushed 2026-10-11, remote tree verified via GitHub API).
Follow-up design-application commit: <local-hash2> → <remote-hash2>.
Merge attention needed: apply `MERGE-fragment-w27-tools.md` (B1–B8) after
wave 26 merges, then rebuild + revalidate; if wave 26 renumbered tools or
moved anchors, re-anchor per the fragment's notes. `WAVELOG.md` itself was
not touched per instructions — this fragment is the wave-27 entry.
