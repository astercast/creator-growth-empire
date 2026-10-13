# Creator Growth Empire — API Reference

Versioned JSON API for agents. Base path: `data/v1/`. All responses are static JSON files (no server required).

## Endpoints

### `GET data/v1/index.json`
Self-describing manifest: `name`, `version`, ISO-8601 UTC `updated`, `base`, and an `endpoints` array. Every endpoint record carries `id`, `kind` (`json` | `html` | `directory`), `path` (or `paths`/`files`), `description`, `schema` URL, `updated` timestamp, `records` count, `deprecated` + `deprecation_note`, and optional `freshness_note`. **Start here** — never hardcode endpoint paths.

### `GET data/v1/chapters.json`
`{ "chapters": [{ "id", "phase", "title", "path", "words", "read_minutes" }] }` — all nine phases. `path` is site-root-relative (e.g. `phase-0-start-from-nothing.html`). Full chapter text lives in `llms-full.txt` and the chapter pages.

### `GET data/v1/niches.json`
`{ "version": "2.0.0", "updated", "note", "sources": [...], "reality_check", "outlook_2027": { "summary", "platform_signals": [{ "signal", "source", "detail" }], "evidence_note" }, "breakout_spotlights": [{ "id", "name", "growth", "revenue", "competition", "why", "sources", "single_source" }], "stream_fit_legend", "niches": [{ "id", "name", "platforms", "summary", "channel_growth_monthly_pct", "search_growth_pct", "breakout_rate", "revenue_figures": [{ "kind": "CPM"|"RPM", "lo", "hi", "note" }], "revenue_tier", "competition", "startup_cost", "skill_fit", "chapter_links", "simulator_scenario", "case_file", "sources", "single_source", "caveats", "outlook_2027": { "trajectory": "heating"|"stable"|"cooling", "basis", "signals" }, "stream_fit": { "ads", "sponsorships", "digital_products", "pod" } }], "avoid_list" }` — the Niche Atlas v2.0.0: 20 October-2026-researched niches with the <1%-reach-100K reality check and a 7-item avoid list (red-flag niches, 2027-updated: clipping, kids-if-revenue-matters, AI slop, Shorts-only pool chasers, gambling/crypto, medical claims, news/politics on TikTok). Every record carries its sources and observation date; single-source claims are flagged on the record. Revenue figures are creator-reported ranges — ranges, never promises. Sorting uses range midpoints (a sorting convenience, not a rate). Trajectory badges are directional reads of October-2026 signals, not forecasts. **Not financial, legal, or tax advice.**

### `GET data/v1/glossary.json`
`{ "terms": [{ "term", "definition" }] }` — 26 creator-economy definitions.

### `GET data/v1/calculators.json`
Calculator config (v1.5.0): `youtube_longform_rpm_bands` (per-niche RPM ranges), `shorts_rpm_per_1000` + `shorts_rpm_niche_2026` (the Oct-2026 AIR 274-channel niche re-measure: 3–14% of long-form RPM), `platform_thresholds` (YPP tiers, TikTok Rewards — now incl. Mexico + the qualified-view definition, Facebook CMP — with sources and dates), `revenue_splits` (now incl. the Premium Lite 60%-of-net pool split), `sponsorship_rate_card_2026` (now incl. the holiday-2026 pricing note), `sponsorship_quoted_prices_2026` (new in v1.5.0: what creators actually quote — Cheerful Sep-2026 typical quoted prices by format + typical asks by follower band, basis **reported** from 905 asks / 298 offers / 2,356 rate-card lines; plus Click Analytic's Creator Pricing Report 2026 Instagram feed-post model, basis **modeled**, tiers cut differently and labeled as such), `sponsorship_rule_of_thumb`, `usage_rights_benchmarks_2026` (5 usage tiers as add-on % of base — 3mo +25–50%, 6mo +50–75%, 12mo +75–100%, perpetual from 2x base — plus whitelisting 30–100%/mo; projectcasting 2026), plus 2026 niche/platform research snapshots and the wave-25 `q4_seasonality_2026` / `tiktok_shop_2026` research blocks. The data contract the sim engine, revenue calculator, deal analyzer, deal room, and hiring calculator read. **Verify platform figures live before acting on them** — see the payload's own `version`/`updated` and each threshold's `source`.

### `GET data/v1/skills.json`
Skill index: `version`, `updated`, `skills: [{ "name", "description", "path" }]` for all twelve skills. Full skill content lives in `skills/<name>/SKILL.md`.

### `GET data/v1/case-files.json`
Case-file index: `version`, `updated`, `note`, `case_files: [{ "id", "badge", "title", "path", "words", "read_minutes" }]` for all nine documented creator-business deconstructions (budget-grocery newsletter, Ben's Bites, faceless sleep-channel network, Mavwicks on TikTok Shop, cohort course, the poly couple, Gibi ASMR, the clipping squeeze, the monthly Shorts floor). Full text on the `case-*.html` pages. Figures are source-reported, not audited — never present as promises.

### `GET data/v1/tools.json`
`{ "version", "updated", "note", "tools": [{ "id", "title", "description", "page", "input_schema", "output", "drive_notes" }] }` — all twenty-two interactive tools with programmatic input schemas (JSON Schema draft-07), output descriptions, and drive notes. Replicate any tool's logic without the UI; the `*.html` tool pages are the human front-end for the same logic.

### `GET data/v1/content-engine.json`
`{ "version", "updated", "disclaimer", "idea_formats", "hook_structures", "dealing_rules", "batching", "repurposing_2_0", "originality_guardrails", "deal_slots", "simulator_bridge", "algorithm_signals", "hook_patterns", "adaptation_matrix", "batching_scheduler", "source" }` — the Content Engine data contract (v1.1.0): 3 idea formats (long/short/community) with effort notes, the 5 Short-Form Playbook hook structures (open loop, cold start, contrarian, numbered promise, question-as-hook — craft formulas, not platform documentation), calendar dealing rules (same arithmetic as the 90-Day Planner), batching guidance (consistency-beats-volume), the Repurposing 2.0 derivative map (7 derivatives, each with its required original element — repurposing is not re-uploading), the Oct-1 originality guardrails (no identical re-uploads, fresh hooks, native grammar, written text derivatives, atom-test gate) — plus the 2.0 additions: `algorithm_signals` (the Oct-2026 TikTok/Shorts/Reels signal map, every claim carrying `source` + `source_label`: platform-published / verified-multi-source / single-source / creator-lore), `hook_patterns` (6 trend-derived structural hook patterns, each with the mechanic it exploits), `adaptation_matrix` (12 source→destination adaptation rule sets + 6 universal checks + the Oct-1 gate), and `batching_scheduler` (weekly-hours → film/edit/publish day-block defaults). Niche tags resolve against `data/v1/niches.json`. **A planning aid, not financial, legal, or tax advice.**

### `GET data/v1/deal-templates.json`
`{ "version" (1.2.0), "updated", "disclaimer", "usage_rights_tiers": [{ "id", "label", "description", "multiplier", "multiplier_label", "basis", "reported" }], "negotiation_scripts": [{ "id", "title", "when", "body", "tip", "grounded_in" }], "negotiation_kit_scripts": [{ "id", "title", "when", "subject", "body", "tip", "grounded_in" }], "red_flags": [{ "id", "title", "severity", "detail", "fix" }], "scoring": { "note", "rules" }, "pitch_templates": [{ "id", "title", "when", "subject", "body", "placeholders", "grounded_in", "honesty_note" }], "contract_flags": [{ "id", "title", "severity", "detail", "fix" }], "contract_scoring": { "note", "rules" } }` — the Deal Room + Outreach Center + Negotiation Kit data contract: 6 usage-rights tiers (organic / paid-30d / paid-6mo / paid-12mo / whitelisting / buyout) with reported-vs-definitional multiplier basis, 4 negotiation scripts with `{{placeholders}}`, 6 Negotiation Kit reply scripts (counter, lowball, exposure-only, usage rights, whitelisting, late payment — each with a subject line and `{{placeholders}}`), the red-flag checklist with severities (`walk_away` / `major` / `minor`) plus scoring rules, 3 honest pitch email templates (cold pitch, the one 7-day follow-up nudge, warm intro — `[bracketed]` placeholders, never invented stats, anti-spam honesty notes), and the 10-item contract red-flag checklist (IP assignment, one-sided termination, vague usage grants, auto-renewing exclusivity, view-guarantee clawbacks, one-sided morality clauses, missing payment schedules, open approval, missing FTC language, scope-creep language) with scoring rules. Multipliers are reported 2026 research ranges, never quotes. **Not financial, legal, or tax advice — and the contract checklist is not legal advice.**

## Live server functions (Algorithm Watch)

When the site is deployed with its serverless backend (see `GO_LIVE.md`),
these live under `/api/*` alongside the static `data/v1/` files. Every
function returns the standard `{ ok, data, meta }` envelope (contract:
`~/workspace/server-program/ARCHITECTURE.md` §§1–14); `meta.request_id`
is `req_xxxxxx`, `meta.source` is `live`, `meta.generated_at` is the
response time. Zero npm dependencies, `nodejs22.x`.

### `GET /api/health`
`{ ok, data: { status: "ok"|"degraded", service: "creator-algwatch", version,
started_at, uptime_s, node, functions: ["health","changes","niches",
"cron/algorithm-watch"], data_freshness: { "changes.json": { generated_at,
age_s, sla_s, within_sla }, "niches.json": {...} }, checks: {
static_fallback_present, cron_secret_configured, github_token_configured } },
meta }` — never 5xx; degrades to `degraded` with reasons instead.

### `GET /api/changes`
The "what changed" feed, newest-first. Query: `?platform=`
(youtube|tiktok|instagram|facebook|x|twitch|kick|other|all, default all), `?since=`
(ISO-8601, default 90 days ago = the retention window), `?limit=` (1–200,
default 50). `data: { changes: [{ id, platform, title, summary, detected_at,
announced_at, effective_at, category: algorithm|policy|monetization|legal,
confidence: verified|single-source, sources: [{ name, url }] }], total,
filters, feed_generated_at, disclaimer }`. `announced_at` / `effective_at`
are carried only where the day is actually known (null or absent
otherwise — the feed never rounds a month into a fake day). Feed v1.6.0
(2026-10-13) holds 24 entries and covers all eight platform slots:
YouTube, TikTok, Instagram, Facebook, X, Twitch, Kick, and Other (Spotify and
industry-wide changes log under Other). The 2.5 wave's coverage audit
gave Kick its own slot, opened with its September 2026 Partner Program
payout rewrite (per-stream rates replaced by a rolling calculation over
recent broadcasts, September's manual-calculation errors repaid through
Stripe; monetization, verified — Streams Charts + WIN.gg; no calendar
day or numeric rate published, so both date fields are null). The Twitch slot opened with the
August 20, 2026 expansion of Creator Sponsorships to Affiliates; the
2.2 wave added Meta's October 8, 2026 ban on TikTok/ByteDance ads in
seven countries (Reuters + Bloomberg, verified); the 2.3 wave resolved
the three items earlier waves held as near-misses — Facebook's expanded
two-link-post test (policy, verified), TikTok Smart+ Creative Selection
(monetization, verified; creator pay/opt-in terms still unpublished),
and Kenya's 5% withholding as actually applied per platform (legal,
verified) — each logged only once a second independent source firmed it
up; the 2.4 wave added X's September 2, 2026 payout-rail switch (U.S.
creator payouts moved from Stripe to X Money, mandatory for U.S.
creators; monetization, verified — TechCrunch + PYMNTS). 400 `BAD_INPUT` on bad params; 502
`UPSTREAM_UNAVAILABLE` if the feed file is unreadable. Static twin:
`data/v1/changes.json`. Human front-end: `what-changed.html` — pre-rendered
with a per-platform coverage panel; when both the live function and the
static twin fail, the page says so in words and presents its baked-in copy
as a dated published log, never as live data.

### `GET /api/niches`
`niches.json` passthrough with `generated_at` freshness surfaced. Static
twin: `data/v1/niches.json`.

### `GET /api/cron/algorithm-watch`
Daily job (`0 12 * * *` UTC, Vercel Cron). `CRON_SECRET`-gated — without the
correct `Authorization: Bearer <secret>` header it returns 401
`UNAUTHORIZED` (fail closed). Idempotent: 60s duplicate-delivery cooldown,
canonical-JSON compare, commits via `writeJsonIfChanged` only when the feed
actually changed (no change → no commit → no redeploy). Without
`GITHUB_REPO_TOKEN` it runs read-only and reports the would-be diff.
Returns `{ checked, changed, committed, sources_ok, new_changes[], retained }`
with per-source `meta.upstream`. Upstream sources (3): Tubefilter's main
feed, Social Media Today, and — since the 2.3 wave — Tubefilter's Twitch
tag feed (`tubefilter.com/tag/twitch/feed/`), wired after a live probe
showed the two general feeds carrying no Twitch stories while the tag
feed's current window was 12/12 Twitch-tagged; a dead source degrades
the envelope (`sources_ok` drops, the failure is named in the note)
rather than failing the run.

### The fallback contract (frontend)

Every feed surface ships **pre-rendered** from its static twin and calls the
live function first (`assets/js/api-client.js`, 7s timeout). Badge states:
`live` (green) / `waking server…` (cyan, fetch in flight — page already fully
readable) / `cached · updated HH:MM` (amber — server unreachable or live but
stale; the timestamp is the *data's* `generated_at`, never "now") / hidden
(both failed — pre-rendered content stays). `fetchWithFallback` never
rejects. The site never shows an error state, spinner, or blank widget
because the backend was cold or down. See `what-changed.html` for the
pattern in action.

### API Explorer (`api-explorer.html`)

A client-side playground: browses every `api/v1` endpoint (discovered from
`data/v1/index.json` — JSON endpoints plus every schema file, with record
counts in the descriptions; static fallback if unreachable), shows the
manifest version/updated line, fetches relative to the site root, and
pretty-prints JSON in-browser. Graceful failure states — failed fetches
surface a status message instead of breaking.

**Deploy note:** the build mirrors `data/v1/` into `site/data/v1/` so the
deployed site serves its own API — the explorer works wherever the site is
deployed, offline-safe, no server required.

## Schemas

`data/v1/schema/` contains JSON Schema (draft-07) — one per endpoint, per-doc and per-record:

- `index.json` — the manifest itself
- `chapters.json` — chapters doc; `chapter.json` — chapter record
- `niches.json` — niches doc; `niche.json` — niche record
- `glossary.json` — glossary doc (term records inline)
- `calculators.json` — the calculators data contract
- `skills.json` — skills doc; `skill.json` — skill record
- `case-files.json` — case-files doc; `case-file.json` — case-file record
- `tools.json` — tools doc; `tool.json` — tool record
- `deal-templates.json` — deal-room data contract (scripts, red-flag checklist, usage-rights tiers inline)
- `content-engine.json` — content-engine data contract v1.1.0 (idea formats, hook structures, dealing rules, batching guidance, repurposing-2.0 map, originality guardrails, deal slots, simulator bridge + algorithm_signals, hook_patterns, adaptation_matrix, batching_scheduler)

## llms.txt

- `llms.txt` — site summary + chapter list + tools + guides & playbooks + case files + skills + API surface (for quick agent orientation)
- `llms-full.txt` — the complete guide text, all chapters + reference + guides

## AGENT.md

`AGENT.md` (repo root) — how an agent uses this site: base URL pattern, key endpoints with example requests, 10 end-to-end worked workflows (sponsorship evaluation, 90-day launch, sim scenario, sim A/B, deal-room pipeline, content-engine pipeline, money map, YPP check, outreach campaign, cross-post adaptation), rate/expectation notes, per-tool programmatic input shapes, honesty rules. Every workflow is executed against the real `data/v1/` JSON files by `tests/agent-workflows.test.js`.

## Shared API conventions (all sites)
- Base: `data/v1/` relative to the site root. Works on any static host; no auth, no keys, no rate limits.
- Manifest: `data/v1/index.json` lists every endpoint with its schema URL, `updated` timestamp, and notes. Start here.
- Timestamps: ISO-8601 UTC (`2026-10-11T00:00:00Z`). Date-only fields are `YYYY-MM-DD`.
- Versions: `meta.version` semver on the manifest; breaking changes get a new `v2/` path, never a silent shape change.
- Errors: static files can't return error bodies. A missing endpoint means a wrong path — re-read `index.json`. Empty results are `[]`, never `null`. Every record carries its provenance (`source`, `observed`/`updated`).
- Pagination: not needed — payloads are complete snapshots sized for client-side filtering. If a future endpoint paginates, it will use `?page=` and document it here.
- Freshness: every payload states when it was generated and from what snapshot. Treat undated numbers as stale.

## Conventions

- `version` follows semver; bump minor on content changes, major on breaking shape changes.
- `updated` is an ISO date of the last data refresh (payload-level); the manifest uses ISO-8601 UTC timestamps.
- All monetary figures are USD unless noted.
- Platform thresholds include `source` and the observation date — treat as "verify live," not gospel.
