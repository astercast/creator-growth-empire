# LIVE_CHECKLIST — creator-growth-empire-live

The `-live` release repo (`astercast/creator-growth-empire-live`) is a
release snapshot of this working repo's built `site/`. Vercel deploys it
**once, via CLI** (`vercel --prod`) — no Git integration. This checklist
tracks what's wired in the live track.

## Snapshot contents (repo root = publish dir)

- Static frontend + `api/v1/` static API twins (pre-rendered data; the site
  never errors when functions are cold/down).
- Serverless functions, `nodejs22.x`, zero npm dependencies (4 total, ≤12 limit):

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

- vercel.json parses; functions `api/**/*.js` → `nodejs22.x`; no `maxDuration`
  configured → 10s Hobby default applies (cron fetches are parallel 4s-bounded).
- Pre-built snapshot: `buildCommand` is an echo (no build step on Vercel);
  `installCommand` is an echo (no dependencies).
- Build machine: Standard, never Turbo.
- Last verified: 2026-10-12 (static pages 200, api/v1 JSON 200, functions
  node-syntax-checked).

## Track rule

This working repo is never deployed. The `-live` repo is re-synced only when
the user explicitly says "push" / "ship it".
