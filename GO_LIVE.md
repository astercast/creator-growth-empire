# GO_LIVE — Creator Growth Empire

> **LIVE-READY, NOT DEPLOYED.** Do not connect Vercel until the user approves.
> Two-track repo model (user's order 2026-10-11): this working repo is never
> deployed — Vercel deploys come from the `<repo>-live` release repo, synced
> only on the user's explicit "push/ship it".
> **Deploy method:** one-time CLI deploy (`vercel --prod`) from a local clone
> of the `-live` release repo. **No Git integration, ever** — Vercel must never
> auto-deploy this or any project on pushes. Future work stays GitHub-only in
> this working repo.

## 1. What deploys

One Vercel project: the static Creator Growth Empire frontend plus the
**Algorithm Watch** serverless backend (service `creator-algwatch`), one daily
cron. Contract: `~/workspace/server-program/ARCHITECTURE.md` (§§1–14).

**Functions** (zero npm dependencies; each explicit path carries
`{"maxDuration": 10}` — 2026-10-12: Vercel rejects empty `{}` entries
("Function must contain at least one property") and rejects any
`functions.*.runtime` value for Node, including `nodejs22.x` and `nodejs20.x`;
`runtime` is only for community runtimes like `vercel-php@0.5.2`. Node is
auto-detected from `api/` when the key is omitted. Function paths are
explicit, never globs):

| path | purpose |
|---|---|
| `/api/health` | §1.4 status: `status`, version, uptime, node, function roster, per-file data freshness, boolean-only checks. Never 5xx — degrades to `degraded`. |
| `/api/changes` | The "what changed" feed: `?platform=` (youtube\|tiktok\|instagram\|facebook\|x\|other\|all), `?since=` (ISO, default 90d), `?limit=` (1–200, default 50). Every entry carries `sources[]` + `confidence` (verified/single-source). |
| `/api/niches` | `niches.json` passthrough with `generated_at` freshness. |
| `/api/cron/algorithm-watch` | Daily job: fetches upstream RSS, keyword-gates, classifies, dedupes, prunes to the 90-day retention window, commits via `writeJsonIfChanged` only when the feed actually changed. |

**Static fallback twins** (served from `site/api/v1/`, always available even if
every function is down): `api/v1/changes.json`, `api/v1/niches.json`,
`api/v1/schema/*.json`.

**Cron:** `/api/cron/algorithm-watch` at `0 12 * * *` UTC (daily — Hobby minimum).

**Frontend contract:** every feed surface ships pre-rendered from its static
twin and calls the live function first (`assets/js/api-client.js`,
7s timeout). States: `live` (green) / `waking server…` (cyan) /
`cached · updated HH:MM` (amber) / hidden. The site never shows an error
state, spinner, or blank widget because the backend was cold or down.

## 2. Prerequisites

1. This repo pushed to GitHub (private).
2. Access to the user's Vercel account (Hobby).
3. Secrets generated:
   - `CRON_SECRET` — random ≥16 chars (e.g. `openssl rand -hex 32`).
   - `GITHUB_REPO_TOKEN` — fine-grained PAT, **contents:write on this repo
     only** — still pending the user's decision (§14.1 of the spec). The
     commit-back path is built but optional: without the token the cron runs
     read-only (it reports the would-be diff and commits nothing).

## 3. Hookup steps (exact clicks)

1. **vercel.com/new** → Import Git Repository → select the
   `creator-growth-empire-live` release repo (two-track model: the working
   repo is never deployed; the `-live` repo holds the release snapshot and
   is synced only on the user's explicit "push/ship it").
2. Framework Preset: **Other**.
   - Build Command: `python3 scripts/build.py` (pinned; runs ~2s, budget 60s)
   - Output Directory: `site`
   - Install Command: `echo 'no dependencies'`
3. Environment Variables (Production): `CRON_SECRET`,
   `GITHUB_REPO_TOKEN` (when the user approves it), `GITHUB_REPO`,
   `REPO_STATIC_PREFIX` (see §4).
4. **Build machine: Standard.** Dashboard → Project → Settings →
   Build & Deployment → Build Machine → **Standard**.
   **Never Turbo** — September 2026 Turbo CPU billed **$38.64**
   (invoice 1ZU1WJJS-0012). Turbo buys nothing on a static site.
5. **Deploy.** Open `/api/health` — assert `status:"ok"` (or `"degraded"`
   with reasons) and the `functions` roster
   `["health","changes","niches","cron/algorithm-watch"]`.
6. Dashboard → **Cron Jobs** — assert the one cron is listed with schedule
   `0 12 * * *`. Trigger it once manually (Functions → ⋯ → Test) with the
   secret in the `Authorization: Bearer <CRON_SECRET>` header; check the
   function logs for `[cron]` lines.
7. `curl` the roster and assert the envelope schema
   (`{ok, data, meta}` per §1.10):
   ```bash
   BASE=https://<project>.vercel.app
   curl -s $BASE/api/health | python3 -c "import json,sys; e=json.load(sys.stdin); assert e['ok'] is True"
   curl -s "$BASE/api/changes?limit=3" | python3 -c "import json,sys; e=json.load(sys.stdin); assert e['ok'] is True and len(e['data']['changes'])>0"
   curl -s $BASE/api/niches | python3 -c "import json,sys; e=json.load(sys.stdin); assert e['ok'] is True"
   curl -s $BASE/api/v1/changes.json | python3 -c "import json,sys; d=json.load(sys.stdin); assert len(d['changes'])>0"
   ```
8. **Disable test:** block `/api/*` (or stop the functions) → reload
   `what-changed.html` → assert the full pre-rendered feed shows with an
   honest amber `cached · updated HH:MM` badge. Zero blank widgets, zero
   console errors from `api-client.js`.

## 4. Env var table

| name | required? | where set | rotation notes |
|---|---|---|---|
| `CRON_SECRET` | **yes** (cron 401s fail-closed without it) | Vercel → Project → Settings → Environment Variables (Production). Vercel auto-sends `Authorization: Bearer <secret>` on cron invocations. | Regenerate with `openssl rand -hex 32`; update the Vercel var; no code change needed. ≥16 chars enforced. |
| `GITHUB_REPO_TOKEN` | no — pending user decision | Same place (Production). Fine-grained PAT, contents:write on this repo only. | Rotate in GitHub → update Vercel var. Without it the cron degrades to read-only. |
| `GITHUB_REPO` | no | Same place. `owner/repo` — target of the cron's commit-back. | Only meaningful with `GITHUB_REPO_TOKEN` set. |
| `REPO_STATIC_PREFIX` | no | Same place. Path prefix prepended to the commit-back target file (`api/v1/changes.json`). | Only meaningful with `GITHUB_REPO_TOKEN` set. |

No other secrets exist. Nothing secret is ever committed to the repo.

## 5. Hobby limits table

| resource | Hobby limit | our usage |
|---|---|---|
| Bandwidth | 100 GB/mo | static + small JSON; personal-use sites ≈ MBs |
| Build minutes | 6,000/mo | seconds per deploy; daily cron redeploys ≈ negligible |
| Function invocations | 100k/mo | edge cache absorbs reads (§1.6); ~1 cron + trickle |
| Function duration | 10s default (Hobby) | all functions designed ≤10s; no `maxDuration` overrides |
| Cron jobs | daily minimum cadence, UTC, ±60min window, prod only | 1 job, `0 12 * * *` UTC |
| Overage billing | **none — usage pauses instead of charging** | design stays far under limits; a pause is a visible signal, not a bill |

If any limit approaches 80%, the fix is *less* work (longer edge TTL,
smaller payloads) — never a plan upgrade without the user's explicit word.

## 6. Cold-start behavior

- First hit after a deploy (guaranteed cold): typically **1–3s** on Hobby.
- The browser client (`api-client.js`) races the live function with a **7s
  timeout**. A cold function usually still wins; a slow one loses cleanly.
- The first paint **never waits** for `/api/*`: `what-changed.html` ships
  pre-rendered, so the complete page is readable instantly. The badge reads
  `waking server…` while the fetch is in flight, flips to `live` when fresh
  data lands, or to `cached · updated HH:MM` on timeout.
- A cold function that takes 12s simply loses the race — the user saw a
  complete page the whole time. Pages never look broken.
- Budget (§12.4): first hit <10s (else the 7s timeout always loses —
  investigate), warm hit <1s. Measured Wave B on the local harness (fresh node
  process): `/api/health` first-hit **0.118s** / warm **0.028s**;
  `/api/changes` first-hit **0.276s** / warm **0.032s**. Real Vercel
  cold starts add container spin-up (typically 1–3s on Hobby) — the 7s client
  timeout keeps comfortable headroom either way; record the first preview
  deploy's numbers here.

## 7. Cron behavior

- **Daily, UTC, ±60min window**: `0 12 * * *` may fire any time 12:00–13:00 UTC.
- **Production deployments only.** Preview deploys don't run crons.
- **Best-effort delivery**: missed or duplicate invocations happen. The job is
  idempotent: a 60s duplicate-delivery cooldown, canonical-JSON compare, and
  `writeJsonIfChanged` (no change → no commit → no redeploy).
- **Failure alerting is logs-only.** Watch for `[cron]`-prefixed lines in the
  function logs.
- **What "no log in 48h" means**: the cron hasn't fired or the invocation
  failed before logging. Check Dashboard → Cron Jobs (is it listed? last run
  status?), then trigger manually with the secret and read the `[cron]` lines.
  If manual trigger 401s, `CRON_SECRET` is wrong or unset.
- **Auth**: without the correct `Authorization: Bearer <CRON_SECRET>` header
  the endpoint returns 401 `UNAUTHORIZED` — fail closed. Vercel sends the
  header automatically on scheduled runs.
- **What it does**: reads the current `changes.json`, fetches the upstream RSS
  feeds in parallel (4s each, `allSettled`), keyword-gates to
  algorithm/policy/monetization/legal, classifies category + platform, dedupes
  against existing entries (no synthetic entries — §6), prunes to the 90-day
  retention window, commits only on real change. Returns
  `{checked, changed, committed, sources_ok, new_changes[], retained}` with
  per-source `meta.upstream`.

## 8. Custom domain notes

- Add the domain in the Vercel dashboard → Domains; the `api/*` paths move
  with the domain automatically.
- Update any absolute URLs in `llms.txt`/sitemap if the domain changes
  (generated files — edit the source in `scripts/build.py`, then rebuild).
- The client code uses **relative** paths (`/api/changes`,
  `/api/v1/changes.json`), so no JS changes are needed for a domain move.

## 9. Rollback

1. `git revert` the offending commit → push → Vercel redeploys the previous
   good state automatically.
2. Functions are stateless; there is no data migration to undo. The feed data
   lives in the repo (`data/changes.json` → `api/v1/changes.json`), so
   reverting the repo reverts the data too.
3. If a bad cron commit landed in `data/changes.json`, revert that commit —
   the next scheduled run (or a manual trigger) rebuilds from the corrected
   file.

## 10. Cost rules

- **Build machine: Standard. Never Turbo.** September 2026 invoice
  1ZU1WJJS-0012: **$38.64** of Turbo build CPU across the user's projects.
  These are static sites with near-instant builds — Turbo buys nothing.
- `installCommand`: `echo 'no dependencies'` — zero npm packages, nothing to
  install, builds stay seconds-long.
- Static builds are the only builds. Function bundling is part of the static
  build (no separate build minutes).
- The Hobby limits table (§5) is the budget. Stay far under; a pause is a
  visible signal, never a bill. If any site approaches 80% of any limit, the
  fix is *less* work — never a plan upgrade without the user's explicit word.
- Never let automated loops hammer the repo with pushes — push volume, not
  build size, was the real cost driver in September.
