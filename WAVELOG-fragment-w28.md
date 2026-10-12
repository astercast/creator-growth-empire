# WAVELOG fragment — Wave 28 (to be merged into WAVELOG.md by the merge worker; do NOT append twice)

## Wave 28 — "The 2026 Platform Rules Bible" reference chapter + wayfinding craft layer (2026-10-11)

The densest reference page on the site: a 6,700-word single-page bible consolidating every platform rule that decides whether a creator's work gets seen and gets paid — the 2026 algorithm mechanics (YouTube/TikTok/Reels), the YPP 2027 rulebook, the Oct-1-2026 Shorts originality gate, the real RPM bands, FTC disclosure escalation, and the 2026 1099 tax change. Every figure carries a source-weight label (verified / single-source / platform-stated); honesty contract intact throughout (no income promises; "not financial, legal, or tax advice" copy present and pinned in-test).

**Research (integrated today, Oct 11, 2026 — genuinely new to the site, not a re-skin):**
- **Creator-economy scout (dispatched 20:10 PDT, reports landed):** 7 angle notes — algorithm changes (TikTok hierarchy, Social Pilot's no-change Aug/Sep 2026, Oracle US model, DSA minors, IG April 2026 originality rules), monetization rates (AIR 300-channel RPM medians + P25–P75, Tier-1 geography premiums, Lilach's regional Creator Rewards tiers, the top-10%-take-58% concentration), growing niches/formats (microdrama 6.5B H1 views, Shorts seasons/episodes Sept 2026, China AI-drama output, dubbing 6M viewers/day with the 4–10x professional-dubbing retention gap), creator tools (Made on YouTube Sept 23: Ask Studio mobile, draft feedback, research feed, dynamic thumbnails + 40M A/B tests + auto-swap, 3-cut video A/B from 2027, explain-why analytics, Gemini conversational editing, AI product auto-tagging, Shopping affiliate to 35 countries / 1.3M creators, voice+face likeness protection; IG Edits AI assistant Sept 30 + Meta One gate; 20M videos/day), brand deals (AIR agency compilation vs projectcasting 2–3x disagreement, Cheerful quoted medians IG Reel $1,800 / TikTok $2,000 / YT integration $3,000 / UGC $500, category sponsored CPMs, nano 6.23% vs macro 0.61% engagement), tax/legal (OBBBA $600→$2,000 1099-NEC/MISC from Jan 1 2026 + inflation indexing 2027+, royalties $10 exception, 24% backup withholding, 1099-K restored $20K/200txns for 2025 tax year, NEC+K double-reporting trap, IRS AI-filter scrutiny band [uncertain], X Money Sept 2026; FTC fines $51,744–$53,088/violation [uncertain], enforcement +40% in 2025 with individual creators targeted at scale first time, #ad-first + verbal + platform-label-insufficient rules [verified multi-source], "double disclosure" AI+paid [single-source], fake-reviews rule, UK DMCC 10% turnover [single-source]), Shorts original-content update (announcement scope, channel-level judgment, what's-original vs not-enough, recommendations-only-not-payouts, the four gaps — no start date / no re-evaluation / no appeal / no Studio indicator — clipping $1.4M context, panstag self-audit method).
- **Wave-fuel forward-looking research (landed earlier today):** TikTok three-source hierarchy + lore flags (40–50% weight, 300–500 test pool, 3s→5s qualified view), Shorts Oct-1 update via 6 outlets, Reels sends-#1 Mosseri-stated + 3–5x debunk, breakout-growth consensus (retention / shareability / originality / searchability / new containers), niche CPM/RPM cross-checks (OutlierKit Sep-2026, UTubeKit, Famety, upGrowth), the kids paradox (1.59% growth / $0.33 RPM), Jan-2026 inauthentic wave (16 channels, 4.7B views), Lilach's <1% reach-100K reality check.
- **Design domain:** the research coordinator's permanent web-craft domain completed round 1 at 20:18 PDT (`research_notes/web-craft-20261011-2014/` — report.md + 8 angle notes: design-trends, new-css, motion, typography, accessibility, performance, dataviz-storytelling, static-workflows; 20 site-mapped content ideas). Findings applied to this wave's wayfinding/CSS layer where they genuinely elevate a reference chapter (see "Design findings applied" below); deliberately-not-applied items documented with rationale in the fragment's §D. Wave 26's worker independently shipped a "design-craft layer" in `assets/css/components.css` (global `text-wrap: balance`, `:has()` focus, chart tokens) — wave 28's staged CSS is page-scoped under `.platform-rules`, so the two converge without conflict; the merge worker may dedupe the balance rule.

What shipped (this lane only — parallel lanes' files untouched):
1. **`content/platform-rules-bible.md`** (new, ~6,730 words — the longest page on the site; niche-atlas was 2,971): 13 content sections — §1 how to read (source labels + golden rule), §2 YouTube long-form 2026 (CTR/AVD mechanics, Aug-24-2026 public-view change, the Studio feedback loop, video A/B 2027), §3 Shorts original-content era (Oct-1 update in full + the 5-event 2026 timeline table + Shorts RPM + microdrama/dubbing/clipping), §4 YPP 2027 rulebook (current-vs-2027 thresholds table, 10M/90d monthly floor, activity test, Premium Lite 60%-vs-30% pool, May-2026 AI auto-labeling, Jan-2026 inauthentic wave), §5 RPM bands (AIR 300-channel medians table with P25–P75, cross-checks, seasonality + Q1 finance exception), §6 TikTok algorithm (verified hierarchy + lore flags), §7 TikTok money (Creator Rewards tiers + short-form payout comparison table + Shop H1 $50.3B GMV), §8 Reels sends economy (Mosseri hierarchy + 3–5x debunk + April 2026 rules + $0/view reality), §9 2026 platform tooling loop, §10 FTC disclosure escalation (NOT legal advice), §11 1099 tax change (NOT tax advice), §12 one-page cheat sheet, "What to do with this" (4 moves), 26-item Sources section. 5 data tables, 18 internal cross-links (all resolve to real site/ pages), static "What's inside" TOC list. Follows the reference-page markdown conventions (h1 + lede blockquote → hero, honesty banner, read-next link blocks).
2. **`assets/js/platform-rules-ui.js`** (new, 4.2KB, IIFE/"use strict" per site convention): progressive-enhancement wayfinding — adds the `platform-rules` + `platform-rules-page` scoping hooks, slugifies h2s into anchor ids, linkifies the static TOC (pairs by index, bails if counts mismatch), active-section highlighting via IntersectionObserver (`aria-current`, state not motion), rAF-throttled passive scroll-progress indicator. Never initiates motion itself: no `.animate()`, no `setInterval`, no JS smooth-scroll (left to CSS under `prefers-reduced-motion: no-preference`). No-ops silently if the expected elements are absent (pre-wire).
3. **`tests/platform-rules-bible.test.js`** (new, 47 assertions): structure pins (1 h1, 15 h2s, 11 numbered sections in order, 13-item TOC ↔ 13 content h2s), source-labeling discipline floors (≥40 single-source / ≥25 verified / ≥5 platform-stated; every numbered section carries ≥1 label), honesty contract (not-financial/legal/tax-advice line, no guarantee/income-promise phrasing, ranges-not-rates framing), all 18 internal links resolve to site/ pages, no in-page #anchors, no absolute URLs, table column-count consistency, freshness + ≥20-item sources, wayfinding-JS contracts (guards, passive listener, aria-current, page-scoped hooks, no self-initiated motion, CSS scroll-timeline feature-detection with JS fallback only when unsupported), lane discipline (no wave-26/27 references).
4. **Design findings applied** — the web-craft report (`research_notes/web-craft-20261011-2014/`, landed 20:18 PDT, i.e. mid-wave) was read in full and applied where it genuinely elevates this page; site identity untouched (dark-first theme, Archivo/Space Grotesk/JetBrains Mono, acid/coral/gold/violet tokens, existing `.table-wrap` scroll pattern):
   - *Typography* (report §4, verified): `text-wrap: balance` on headlines (Baseline 2024, safe), `text-wrap: pretty` on body as progressive enhancement (no Firefox), `font-variant-numeric: tabular-nums` on the data tables, `max-inline-size: 65ch` measure on prose — all page-scoped in the staged CSS (§D).
   - *Scroll-driven animation* (report §2, verified): the progress bar's primary mechanism is now CSS `animation-timeline: scroll()` — compositor-thread, zero jank — gated behind `prefers-reduced-motion: no-preference`; the JS installs its rAF width fallback only where `CSS.supports("animation-timeline: scroll()")` is false (near-zero-JS = INP protection, report §6).
   - *Wayfinding* (follow-up + report §1): static numbered TOC in the markdown (zero-JS readable) + runtime linkification with `aria-current` section tracking via IntersectionObserver; `scroll-margin-top` on anchored headings (WCAG 2.4.11 family); `:focus-visible` gold perimeter on TOC links; every section ends with read-next cross-links (18 total).
   - *Reduced motion as a variant* (report §3, verified): the JS never initiates motion (no `.animate()`, no `setInterval`, no JS smooth-scroll); state indicators (progress bar, `aria-current`) survive under reduced motion; the single transition is no-preference-gated.
   - *Native-first a11y* (report §5, verified): only `aria-label` + `aria-current` added — no ARIA-heavy widgets; TOC is plain anchor links (free keyboard behavior).
   - *Performance* (report §6): 4.2KB vanilla JS, passive listeners, no libraries, no scroll listener at all where the CSS timeline is supported; `content-visibility: auto` + `contain-intrinsic-size` staged for the table scroll regions.
   - *Deliberately not applied*: view transitions (no in-page state to smooth; cross-document VT is a site-wide MPA call — flagged for the fleet), reveal-on-scroll (would punish the TOC-jump reading pattern), kinetic typography / bento / scrollytelling (wrong genre — the report maps those to Film/Trend/Marvel/Artist), `<details>` accordions (would hide reference content). Full rationale in §D.

**Tests**: `node tests/platform-rules-bible.test.js` — **47/47 PASS**. `node --check` clean on the new JS. Full `scripts/validate.sh` status (run 2026-10-11 ~20:35 PDT): **14 passed, 1 failed — only stage 5** (build reproducibility). The stage-5 drift is entirely parallel-lane: wave 26's in-progress sources (`data/calculators.json`, `data/deal-templates.json`, `pages/deal-analyzer.html`, `assets/js/deal-analyzer.js`, `assets/js/deal-analyzer-ui.js`, `assets/js/sim-engine.js`, `assets/js/simulator.js`, plus their own `assets/css/components.css` design-craft layer — all uncommitted and actively being edited during this wave) regenerate drifted output (`api/v1/calculators.json`, `api/v1/deal-templates.json`, `site/deal-analyzer.html`, `site/assets/js/*`). Wave 28 adds no rendered output yet (the chapter is staged, unwired; its JS copies to `site/assets/js/` as an untracked file invisible to `git diff`), so it contributes zero tracked drift. The merge worker must run validate.sh green after all lanes land and wiring (§A–§D) is applied.

Validation note for the merge worker: wave 28's own suite is not yet in validate.sh's stage-6 loop (shared file — staged below instead of edited).

Commit: <LOCAL_HASH> (local) → <REMOTE_HASH> (pushed 2026-10-11, remote tree verified via GitHub API — wave-28 files present in the recursive tree).

---

# STAGED WIRING — for the merge worker (do NOT apply from any other lane's fragment)

Apply in order. After applying, run `python3 scripts/build.py` and `bash scripts/validate.sh` — all 8 stages must go green, then commit the generated output (site/, api/, llms.txt, llms-full.txt) together with the wiring.

### A. scripts/build.py — REFERENCE_PAGES entry

In `REFERENCE_PAGES` (after the metrics-glossary tuple), add:

```python
    ("platform-rules-bible", "content/platform-rules-bible.md", "Reference", "The 2026 Platform Rules Bible",
     ["assets/js/platform-rules-ui.js"]),
```

This single entry auto-wires: `site/platform-rules-bible.html` generation, the `reference-pages` endpoint in `api/v1/index.json` (paths + records count), the `## Reference` bullet in `llms.txt`, and the `# Reference: The 2026 Platform Rules Bible` marker in `llms-full.txt`. The 5th tuple element injects the wayfinding script tag (same mechanism as the Niche Atlas explorer).

Also update the `reference-pages` endpoint `description` string (~line 1447): it currently names only "(the 2026 sponsorship rate card, the Niche Atlas)" — it already omits the Metrics Glossary (pre-existing). Rewrite to name all four reference pages.

### B. scripts/validate.sh — stage-6 loop entry

In the stage-6 `for T in ...` list, append `tests/platform-rules-bible.test.js` (one token; keep the existing order otherwise).

### C. assets/js — already shipped

`assets/js/platform-rules-ui.js` is committed by wave 28. Nothing to add; build.py copies `assets/` → `site/assets/` on rebuild.

### D. Staged CSS craft block — append to assets/css/components.css (or a new linked stylesheet)

Page-scoped under `.platform-rules` / `.platform-rules-page` (hooks added at runtime by platform-rules-ui.js). Mobile-first; motion only under `no-preference`. Findings applied from `research_notes/web-craft-20261011-2014/` (report landed 20:18 PDT — after the first draft of this fragment; the CSS below supersedes the earlier version):

```css
/* ---- Wave 28: Platform Rules Bible craft (page-scoped; no other page affected) ----
   Web-craft findings applied (report 2026-10-11):
   - text-wrap: balance on headlines — Baseline 2024, safe to ship [verified]
   - text-wrap: pretty on body — progressive enhancement (no Firefox) [verified]
   - font-variant-numeric: tabular-nums on data tables [verified]
   - max-inline-size: 65ch measure on prose [verified]
   - scroll-driven animation-timeline for the progress bar — progressive
     enhancement (~85%, Firefox behind flag), compositor-thread, always gated
     behind prefers-reduced-motion [verified]
   - content-visibility: auto + contain-intrinsic-size on table scroll
     regions (long-page rendering cost, CLS<0.1 recipe) [single-source]
   - :focus-visible perimeter on TOC links; motion tokens; reduced-motion as
     a variant, not a kill switch (state indicators survive) [verified]
   Convergence note: wave 26's design-craft layer already ships global
   `h1,h2,h3 { text-wrap: balance }` — the scoped rule below is then redundant
   but harmless; the merge worker may dedupe. */

/* Long-form reference rhythm + anchored-heading offset (WCAG 2.4.11 scroll-padding family) */
.platform-rules h2 { margin-top: 3rem; scroll-margin-top: 4.5rem; text-wrap: balance; }
.platform-rules h3 { margin-top: 2rem; scroll-margin-top: 4.5rem; text-wrap: balance; }
.platform-rules p,
.platform-rules li { max-inline-size: 65ch; text-wrap: pretty; }

/* Rule callouts: body blockquotes (the lede blockquote is lifted into the hero by build.py) */
.platform-rules blockquote {
  border-left: 3px solid var(--gold);
  background: var(--bg-2);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
}
.platform-rules blockquote strong { color: var(--gold); }

/* Data tables: frame the scroll region, quiet header, tabular numerals,
   skip offscreen rendering cost on this 6,700-word page */
.platform-rules .table-wrap {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  margin: 1.5rem 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 320px;
}
.platform-rules .table-wrap thead th {
  background: var(--bg-3);
  white-space: nowrap;
}
.platform-rules .table-wrap td {
  font-variant-numeric: tabular-nums;
}

/* TOC: the static "What's inside" list, linkified at runtime */
.rules-toc { list-style: none; padding: 0; display: grid; gap: 0.4rem; margin: 1.5rem 0 2.5rem; }
.rules-toc a {
  display: block; padding: 0.6rem 0.9rem;
  border: 1px solid var(--line); border-radius: var(--radius-sm);
  color: var(--ink); text-decoration: none;
}
.rules-toc a:hover { border-color: var(--gold); }
.rules-toc a:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.rules-toc a[aria-current="true"] {
  border-color: var(--gold); border-left-width: 3px;
  background: var(--bg-2);
}
@media (min-width: 900px) {
  .rules-toc { grid-template-columns: 1fr 1fr; }
}

/* Scroll progress: thin state indicator. Primary = CSS scroll-driven
   animation (compositor thread); the JS rAF width fallback only installs
   where animation-timeline is unsupported (see platform-rules-ui.js). */
.rules-progress {
  position: fixed; top: 0; left: 0; right: 0; height: 3px;
  z-index: 60; pointer-events: none;
}
.rules-progress span {
  display: block; height: 100%; width: 100%;
  transform: scaleX(0); transform-origin: 0 50%;
  background: linear-gradient(90deg, var(--gold), var(--acid));
}
@media (prefers-reduced-motion: no-preference) {
  .platform-rules-page { scroll-behavior: smooth; }
  .rules-progress span {
    animation: rules-fill linear both;
    animation-timeline: scroll();
  }
}
@keyframes rules-fill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

Deliberately NOT applied (restraint is the craft call here — the follow-up demands "genuinely elevate", and the web-craft report itself says animation must earn its place):
- **View transitions**: same-document VT is Baseline, but a static reference page has no in-page state changes for it to smooth; cross-document VT is a *site-wide* MPA decision (report idea #6/#20), not a per-page call — flagged for the fleet, not staged here.
- **Reveal-on-scroll animations**: skipped on purpose — a reference bible gets TOC-jumped constantly; replaying entrances would punish the primary navigation pattern. The report's motion chapter agrees: ≤1 delight moment per view, and this page's delight budget is spent on the progress bar + TOC active state.
- **Kinetic typography / bento / scrollytelling**: wrong genre for a reference chapter; the report maps those to Film/Trend/Marvel/Artist sites, not Creator.
- **`<details name>` accordions**: would hide reference content behind interaction — against the page's job (everything readable, zero JS).

### E. Optional breadcrumb (shared template — merge worker's call)

The reference-page hero already carries the gold "Reference" badge and the chapter-nav has "← Back to The Empire Map". If a breadcrumb is wanted above the hero: `Empire Map / Reference / The 2026 Platform Rules Bible` using existing `.chapter-kicker` styles. Optional — the TOC + read-next links already cover wayfinding.

### F. Post-wire checklist for the merge worker

1. Apply A–D above (B is the only validate.sh edit; keep the loop order otherwise).
2. `python3 scripts/build.py` — expect: `site/platform-rules-bible.html` created, `site/assets/js/platform-rules-ui.js` copied, `api/v1/index.json` reference-pages endpoint gains the path + records 3→4, `llms.txt` gains the Reference bullet, `llms-full.txt` gains the marker. Build output should report 10 chapters / 4 reference pages (word count will rise by ~6,730).
3. `bash scripts/validate.sh` — all 8 stages green, including the new 47-assertion suite in stage 6 and the llms.txt Reference count check in stage 7 (build.REFERENCE_PAGES length 3→4).
4. Announce-worthy: this is the longest, densest reference page on the site — a legitimate announcement candidate (the brief's "worth announcing" bar).
5. Design follow-up: when the web-craft research report lands (`research_notes/web-craft-20261011-2014/`), run one more pass folding its findings into this page's staged CSS/JS.

### G. Known pre-existing conditions (not wave 28's to fix)

- Stage 5 currently fails on the committed tree because wave 26's uncommitted sources (`data/calculators.json`, `pages/deal-analyzer.html`, `assets/js/deal-analyzer.js`, `assets/js/deal-analyzer-ui.js`, `assets/js/sim-engine.js`) regenerate drifted output. Wave 28 contributes no drift (nothing it ships is rendered until §A is applied).
- The `reference-pages` endpoint description omits the Metrics Glossary (pre-existing copy drift); §A asks the merge worker to rewrite it for all four pages.
