# Creator Growth Empire — API Reference

Versioned JSON API for agents. Base path: `api/v1/`. All responses are static JSON files (no server required).

## Endpoints

### `GET api/v1/index.json`
Site manifest: title, version, phase list, tool list, skill list, glossary term count.

### `GET api/v1/chapters.json`
All nine chapters: `slug`, `title`, `phase`, `word_count`, `url` (relative to site root), and `headings` (the chapter's H2 structure). Use `headings` to navigate before fetching full HTML.

### `GET api/v1/glossary.json`
`{ "terms": [{ "term", "definition" }] }` — 25 creator-economy definitions.

### `GET api/v1/calculators.json`
Calculator config: `youtube_longform_rpm_bands` (per-niche RPM ranges), `shorts_rpm_per_1000`, `platform_thresholds` (YPP tiers, TikTok Rewards, Facebook CMP — with sources and dates), `revenue_splits`, `sponsorship_rule_of_thumb`. **Verify platform figures live before acting on them** — see `updated` field.

### `GET api/v1/skills.json`
Skill index: `name`, `description`, `path` for all six skills. Full skill content lives in `skills/<name>/SKILL.md`.

## Schemas

`api/v1/schema/` contains JSON Schema (draft-07):

- `chapter.json` — validates chapter entries
- `glossary.json` — validates glossary entries

## llms.txt

- `llms.txt` — site summary + chapter list + links (for quick agent orientation)
- `llms-full.txt` — the complete guide text, all nine chapters

## Conventions

- `version` follows semver; bump minor on content changes, major on breaking shape changes.
- `updated` is an ISO date of the last data refresh.
- All monetary figures are USD unless noted.
- Platform thresholds include `source` and the observation date — treat as "verify live," not gospel.
