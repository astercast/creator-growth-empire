# AGENT.md — How an agent uses Creator Growth Empire

> This site is a static machine-readable knowledge base for the creator
> business: 9 phases, 9 tools, 12 skills, 5 case files, and a versioned JSON
> API. No API key, no server, no auth, no rate limits. Fetch and act.
> Every workflow below was executed against the real `api/v1/` JSON files —
> see `tests/agent-workflows.test.js` (run: `node tests/agent-workflows.test.js`).

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
| `GET api/v1/glossary.json` | 26 creator-economy terms + definitions | Look up "RPM", "YPP", "whitelisting" before quoting them |
| `GET api/v1/calculators.json` | Per-niche RPM bands, Shorts RPM, platform thresholds w/ sources+dates, revenue splits, 2026 sponsorship rate card, 2026 research snapshots | The data contract every calculator and the sim engine read |
| `GET api/v1/skills.json` | 12 skills: `name`, `description`, `path` | `skills/deal-negotiation/SKILL.md` for the full procedure |
| `GET api/v1/case-files.json` | 5 creator-business deconstructions: `id`, `title`, `path`, `words`, `read_minutes` | Full text on the `case-*.html` pages |
| `GET api/v1/tools.json` | 9 tools with programmatic `input_schema` (draft-07), output description, `drive_notes` | Replicate any tool's logic without the UI |
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
| Niche Picker | 6 answers (`q1`–`q6`: interest, camera comfort, money-vs-audience, advantage, format, competition tolerance) | Score via `assets/js/quiz.js` tag matching, or run the `niche-validation` skill |
| Revenue Calculator | `niche` (RPM-band key) + monthly long-form/shorts views + sponsor deals + sponsor views + affiliate $ | `views/1000 × RPM band` per stream from `calculators.json`; affiliate ±30% |
| 90-Day Planner | `longform_per_week` (0–7), `shorts_per_week` (0–21), `platforms[]`, `rest_day` (0–6) | Spread long-form across non-rest days, shorts 2 days apart, 13 weeks |
| Sponsor Deal Analyzer | `platform`, `deliverable`, `followers`, `offer_usd` + `usage_rights`, `whitelisting`, `exclusivity`, `payment_terms` | Followers → tier → rate-card range; counter = range top + line items (see Workflow 1) |
| Hiring Cost Calculator | `role`, `billing_model`, `rate_usd` + hours/units/views/`niche` | Sticker → loaded ×1.15; coverage views = loaded ÷ RPM band × 1000; 3-month reserve rule |
| Repurposing Planner | `idea` (one sentence) + `source_format` | Atom test → pillar prep → 5 staggered mission cards (YT Day 0, Short +1, TikTok +2, Reel +3, FB +4) |
| Empire Simulator | `niche`, `startSubs`, cadence, `quality`, `growthRate`, `q4Uplift`, monetization toggles | `require("assets/js/sim-engine.js").simulate(inputs, calculatorsJson)` — see Workflow 3 |
| API Explorer | none (read-only browser over the API) | Skip the UI; fetch the endpoints directly |
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
