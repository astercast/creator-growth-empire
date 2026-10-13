# LIVE_CHECKLIST — creator-growth-empire-live

The `-live` release repo (`astercast/creator-growth-empire-live`) is a
release snapshot of this working repo's built `site/`. Vercel deploys it
**once, via CLI** (`vercel --prod`) — no Git integration. This checklist
tracks what's wired in the live track.

## Snapshot contents (repo root = publish dir)

- Static frontend + `data/v1/` static API twins (pre-rendered data; the site
  never errors when functions are cold/down).
- Serverless functions, zero npm dependencies, **no `runtime` key** (4 total, ≤12 limit; explicit paths, never globs):

| path | purpose | env needed |
|---|---|---|
| `/api/health` | status/version/freshness, boolean-only checks. Never 5xx — degrades to `degraded` | none |
| `/api/changes` | "what changed" feed: `?platform=` `?since=` `?limit=`. Sources+confidence per entry | none |
| `/api/niches` | niches.json passthrough with `generated_at` freshness | none |
| `/api/cron/algorithm-watch` | daily refresh: bounded feed fetches (4s each, allSettled), keyword-gate, classify, dedupe, prune to 90-day window, commit only on change | `CRON_SECRET` (fail-closed) |
| `lib/` (cronauth, envelope, fetchx, github, ratelimit) | shared lib required by the functions — NOT functions | — |

## Cron

- `/api/cron/algorithm-watch` at `0 12 * * *` UTC (daily, Hobby minimum).

## Env vars (Vercel dashboard only, never committed)

| var | status |
|---|---|
| `CRON_SECRET` | required for cron route; generate ≥16 chars (`openssl rand -hex 32`) |
| `GITHUB_REPO_TOKEN` | optional; fine-grained PAT — cron commits feed changes. Absent → read-only fallback, static twins stay authoritative |
| `GITHUB_REPO` | optional; `owner/repo` the cron writes to |
| `REPO_STATIC_PREFIX` | optional |
| `SERVICE_USER_AGENT` | optional |

## Known-good status

- vercel.json parses; functions are the 4 explicit paths
  (`api/functions/health.js`, `api/functions/changes.js`,
  `api/functions/niches.js`, `api/functions/cron/algorithm-watch.js`), each
  `{"maxDuration": 10}` (matches the 10s Hobby execution limit; cron fetches
  are parallel 4s-bounded). A `rewrites` entry maps the cron path
  `/api/cron/algorithm-watch` to the real handler route
  `/api/functions/cron/algorithm-watch`.
- Vercel functions entries need ≥1 valid property — use `{"maxDuration": 10}`
  per explicit function path; never set runtime for Node (omit it); never
  broad globs (2026-10-12).
- No static .js data files under api/ ever — Vercel deploys every .js there
  as a function (functions map is not an allowlist); basename collisions
  (x.js + x.json) fail the build (2026-10-12). Audit 2026-10-12: clean —
  `api/` holds only `functions/*.js` (4 real handlers) and `lib/*.js`
  (shared helpers, not functions).
- Vercel never serves static files under api/ — all static data lives in
  data/v1/; only real function handlers under api/ (2026-10-12). The
  generator emits to `data/v1/`, the build mirrors it to `site/data/v1/`,
  and every frontend fetch + function reader + doc reference uses
  `data/v1/`, never `api/v1/`.
- Pre-built snapshot: `buildCommand` is an echo (no build step on Vercel);
  `installCommand` is an echo (no dependencies).
- Build machine: Standard, never Turbo.
- Last verified: 2026-10-12 (static pages 200, data/v1 JSON 200, functions
  node-syntax-checked). Algorithm Watch feed v1.7.0: 25 entries, all
  eight platform slots covered
  (YouTube/TikTok/Instagram/Facebook/X/Twitch/Kick/Other); Snapchat
  slot considered in 2.6 and not opened — no current source-backed
  Snapchat development met the logging bar (see WAVELOG 2.6);
  the 2.7 re-sweep (2026-10-13) logged nothing new — no
  post-October-12 development on any covered platform and no Kick
  KPP follow-up with published terms met the bar, feed unchanged
  at v1.7.0 / 25 entries (see WAVELOG 2.7);
  The 2.8 re-sweep (2026-10-13) logged nothing new — only recaps
  of already-logged programs, the already-held Kick Talks
  reassurance, and the July 31 Snapchat policy behind the
  still-closed slot surfaced, feed unchanged at v1.7.0 / 25
  entries (see WAVELOG 2.8);
  Tool 24, the Negotiation Script Builder, shipped with the 2.8
  rotation: word-for-word opener / anchor / concession ladder /
  walk-away for the four scenarios the Kit and Deal Room scripts
  cover, every line sourced, contract-flag-only scenarios
  excluded with reasons; `tests/negotiation-script-builder.test.js`
  runs in stage 6;
  Tool 23, the Rate Card Builder, shipped with the 2.7 rotation:
  every row priced from a named calculators v1.5.0 block with its
  reasoning shown, honest blanks and a labeled proxy where the data
  has no benchmark, the platform's Algorithm Watch entries under
  the card; `tests/rate-card-builder.test.js` runs in stage 6;
  `tests/algorithm-watch.test.js` and
  `tests/algorithm-watch-cron.test.js` (the exercised cron cycles:
  Twitch sponsorship classification/gating/dedupe/render, the
  Rotation 6 Twitch tag-feed source — Tubefilter's Twitch tag feed
  wired as the third upstream after a live probe — and the 2.5 Kick
  classification cycle into the new slot) run
  in validate.sh stage 6 alongside the Deal Room and Simulator suites.

## Track rule

This working repo is never deployed. The `-live` repo is re-synced only when
the user explicitly says "push" / "ship it".
