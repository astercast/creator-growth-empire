# Creator Growth Empire — API Reference

Versioned JSON API for agents. Base path: `api/v1/`. All responses are static JSON files (no server required).

## Endpoints

### `GET api/v1/index.json`
Self-describing manifest: `name`, `version`, ISO-8601 UTC `updated`, `base`, and an `endpoints` array. Every endpoint record carries `id`, `kind` (`json` | `html` | `directory`), `path` (or `paths`/`files`), `description`, `schema` URL, `updated` timestamp, `records` count, `deprecated` + `deprecation_note`, and optional `freshness_note`. **Start here** — never hardcode endpoint paths.

### `GET api/v1/chapters.json`
`{ "chapters": [{ "id", "phase", "title", "path", "words", "read_minutes" }] }` — all nine phases. `path` is site-root-relative (e.g. `phase-0-start-from-nothing.html`). Full chapter text lives in `llms-full.txt` and the chapter pages.

### `GET api/v1/niches.json`
`{ "version", "updated", "note", "sources": [...], "reality_check", "niches": [{ "id", "name", "platforms", "summary", "channel_growth_monthly_pct", "search_growth_pct", "breakout_rate", "revenue_figures": [{ "kind": "CPM"|"RPM", "lo", "hi", "note" }], "revenue_tier", "competition", "startup_cost", "skill_fit", "chapter_links", "simulator_scenario", "case_file", "sources", "single_source", "caveats" }], "avoid_list" }` — the Niche Atlas: 20 October-2026-researched niches with the <1%-reach-100K reality check and a 6-item avoid list. Every record carries its sources and observation date; single-source claims are flagged on the record. Revenue figures are creator-reported ranges — ranges, never promises. Sorting uses range midpoints (a sorting convenience, not a rate). **Not financial, legal, or tax advice.**

### `GET api/v1/glossary.json`
`{ "terms": [{ "term", "definition" }] }` — 26 creator-economy definitions.

### `GET api/v1/calculators.json`
Calculator config: `youtube_longform_rpm_bands` (per-niche RPM ranges), `shorts_rpm_per_1000`, `platform_thresholds` (YPP tiers, TikTok Rewards, Facebook CMP — with sources and dates), `revenue_splits`, `sponsorship_rate_card_2026`, `sponsorship_rule_of_thumb`, plus 2026 niche/platform research snapshots. The data contract the sim engine, revenue calculator, deal analyzer, and hiring calculator read. **Verify platform figures live before acting on them** — see the payload's own `version`/`updated` and each threshold's `source`.

### `GET api/v1/skills.json`
Skill index: `version`, `updated`, `skills: [{ "name", "description", "path" }]` for all twelve skills. Full skill content lives in `skills/<name>/SKILL.md`.

### `GET api/v1/case-files.json`
Case-file index: `version`, `updated`, `note`, `case_files: [{ "id", "badge", "title", "path", "words", "read_minutes" }]` for all five documented creator-business deconstructions (budget-grocery newsletter, Ben's Bites, faceless sleep-channel network, Mavwicks on TikTok Shop, cohort course). Full text on the `case-*.html` pages. Figures are source-reported, not audited — never present as promises.

### `GET api/v1/tools.json`
`{ "version", "updated", "note", "tools": [{ "id", "title", "description", "page", "input_schema", "output", "drive_notes" }] }` — all nine interactive tools with programmatic input schemas (JSON Schema draft-07), output descriptions, and drive notes. Replicate any tool's logic without the UI; the `*.html` tool pages are the human front-end for the same logic.

### API Explorer (`api-explorer.html`)

A client-side playground: browses every `api/v1` endpoint (discovered from
`api/v1/index.json` — JSON endpoints plus every schema file, with record
counts in the descriptions; static fallback if unreachable), shows the
manifest version/updated line, fetches relative to the site root, and
pretty-prints JSON in-browser. Graceful failure states — failed fetches
surface a status message instead of breaking.

**Deploy note:** the build mirrors `api/v1/` into `site/api/v1/` so the
deployed site serves its own API — the explorer works wherever the site is
deployed, offline-safe, no server required.

## Schemas

`api/v1/schema/` contains JSON Schema (draft-07) — one per endpoint, per-doc and per-record:

- `index.json` — the manifest itself
- `chapters.json` — chapters doc; `chapter.json` — chapter record
- `niches.json` — niches doc; `niche.json` — niche record
- `glossary.json` — glossary doc (term records inline)
- `calculators.json` — the calculators data contract
- `skills.json` — skills doc; `skill.json` — skill record
- `case-files.json` — case-files doc; `case-file.json` — case-file record
- `tools.json` — tools doc; `tool.json` — tool record

## llms.txt

- `llms.txt` — site summary + chapter list + tools + guides & playbooks + case files + skills + API surface (for quick agent orientation)
- `llms-full.txt` — the complete guide text, all chapters + reference + guides

## AGENT.md

`AGENT.md` (repo root) — how an agent uses this site: base URL pattern, key endpoints with example requests, 3 end-to-end worked workflows (sponsorship evaluation, 90-day launch, sim scenario), rate/expectation notes, per-tool programmatic input shapes, honesty rules. Every workflow is executed against the real `api/v1/` JSON files by `tests/agent-workflows.test.js`.

## Shared API conventions (all sites)
- Base: `api/v1/` relative to the site root. Works on any static host; no auth, no keys, no rate limits.
- Manifest: `api/v1/index.json` lists every endpoint with its schema URL, `updated` timestamp, and notes. Start here.
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
