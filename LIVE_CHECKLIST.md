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
  `api/` held only `functions/*.js` (4 real handlers) and `lib/*.js`
  (shared helpers, not functions). **Re-audit 2026-10-13 (Release
  Engineer round-1 audit blocker, fixed):** the shared helpers moved
  OUT of `api/` entirely to top-level `lib/*.js` — under `api/` they
  would deploy as 5 unintended public endpoints on any live push.
  `api/` now holds ONLY `functions/*.js` (the 4 real handlers, incl.
  `functions/cron/algorithm-watch.js`); build.py copies `lib/` →
  `site/lib/` and rewrites the functions' lib-require depth for the
  served layout. Function count unchanged: **4 real functions**.
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
  The 2.9 re-sweep (2026-10-13) logged nothing new — a third
  consecutive verified negative, itemized per slot in WAVELOG 2.9:
  no post-October-12 development with published terms on any of
  the eight slots, the Kick KPP follow-up still has no first dated
  primary term (dates stay null), Snapchat slot still closed,
  feed unchanged at v1.7.0 / 25 entries;
  The 2.10 re-sweep (2026-10-13) logged nothing new — a fourth
  consecutive verified negative, itemized per slot in WAVELOG 2.10:
  no post-October-12 development with published terms on any of
  the eight slots, the Kick KPP follow-up still has no first dated
  primary term (dates stay null), Snapchat slot still closed,
  feed unchanged at v1.7.0 / 25 entries;
  Rotation 13 also adopted the Fleet Commons canonical
  server-toolkit into `lib/` (per-helper notes in WAVELOG) and
  shipped the placement pass through the generator (OG card,
  theme-color, HUD-reticle favicon set, root-relative canonicals,
  honest JSON-LD on index + tools hub, robots.txt; og:image stays
  relative until the GO_LIVE absolutize step runs against a real
  domain); `tests/placement.test.js` guards it in stage 6.
  Tool 26, the Follow-Through Queue, shipped with the 2.10
  rotation: the Deal Pipeline's stage-age nudges as one prioritized
  send list with each deal's Tool 24 script attached, composing
  Tools 25/24/23 with no math of its own; fully client-side (no
  new function — the free-tier audit below holds at 4 functions);
  `tests/follow-through.test.js` runs in stage 6;
  Tool 25, the Deal Pipeline, shipped with the 2.9 rotation: a
  six-stage board (lead → negotiating → terms set → live →
  invoiced → paid) composing Tool 23 pricing and Tool 24 scripts
  per deal, stage-age nudges, totals from entered deals only,
  demo deals labeled and excluded; fully client-side (no new
  function — the free-tier audit below holds at 4 functions);
  `tests/deal-pipeline.test.js` runs in stage 6;
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

## Free-tier / best-pattern audit (Rotation 12, 2026-10-13)

Traffic assumption (stated, not measured): ~5,000 site visits/month —
a small creator-guide site on Hobby. All estimates scale linearly;
the headroom below survives 10× that traffic.

- **Function count: 4 of the ≤12 cap** (`health`, `changes`, `niches`,
  `cron/algorithm-watch` — explicit paths in vercel.json, each
  `{"maxDuration": 10}`, no `runtime` key, zero npm dependencies).
  Tool 25 (Deal Pipeline) is fully client-side and added no function.
- **Estimated monthly invocations at that traffic:**
  - `/api/changes` ≈ 1,200 (What Changed visits + API Explorer +
    Deal Room digest loads; envelope sends `s-maxage=600,
    stale-while-revalidate=86400`, so edge cache absorbs most repeats
    and origin invocations run well below the request count).
  - `/api/niches` ≈ 600 (API Explorer + Niche Atlas loads; same SWR).
  - `/api/health` ≈ 820 (an hourly uptime probe = 720, plus manual
    checks ≈ 100).
  - `/api/cron/algorithm-watch` = **30** (one scheduled run/day,
    Hobby's daily-cron minimum). Each run makes 3 outbound feed
    fetches (not billable invocations) and at most one GitHub commit,
    only when the feed actually changed (`writeJsonIfChanged`).
  - **Total ≈ 2,650 origin invocations/month ≈ 2.7% of the Hobby
    100,000-invocation budget.** No other paid service is used:
  GitHub (repo storage + cron commits) and the three RSS upstreams
  are free at this volume, and builds are a pre-built echo on the
  Standard machine.
  - **Honest limit — the cron's invocation math:** the 30/month figure
    is arithmetic from the vercel.json schedule (`0 12 * * *` UTC),
    not an observed count. Vercel-side cron execution is **not
    observable from this repo** — no run logs or execution history
    live here. What is proven is test-level only:
    `tests/algorithm-watch-cron.test.js` (30/30) exercises the real
    handler's auth, gating, classification, dedupe, and degraded
    states against stubbed feeds. No live run is claimed.
- **Worst-case duration vs the 10s ceiling:** the three read handlers
  do one local JSON read + filter/sort — sub-second in practice
  (largest file is the 25-entry feed). The cron is the worst case by
  design: its three upstream fetches run in parallel
  (`Promise.allSettled`, 4s timeout each), so a fully hung upstream
  set costs ~4s, plus a GitHub read and a conditional write —
  **≈6s worst case, ~4s of headroom**. Nothing retries in a loop;
  a dead feed degrades the envelope (`sources_ok 2/3`, failure named)
  instead of extending the run.
- **First degradation point:** the cron, not the readers. If GitHub's
  API slows on the same run where all three feeds hang to their 4s
  timeout, the run approaches the 10s ceiling and can be cut off
  mid-commit — the feed then simply stays at its last committed
  state and the static twins keep serving (no user-facing failure,
  one missed refresh). Second: the per-instance rate limiter
  (60/min/IP on the public bucket) resets on cold start — documented
  best-effort in `lib/ratelimit.js`, not a security boundary.
- **Pattern alignment (checked this audit):** static-first (every
  page renders from the committed `data/v1/` twins; functions are an
  enhancement, never the only path); SWR caching on both layers —
  function envelopes already sent `s-maxage=600,
  stale-while-revalidate=86400`, and this audit **fixed the gap on
  the static layer**: vercel.json now sends the same SWR
  `Cache-Control` for `/data/*` (previously the twins carried only
  the security headers); precomputed JSON (the feed and all datasets
  are build-time artifacts, no request-time computation beyond
  filter/sort); request coalescing (the cron fetches its three
  upstreams once in parallel and commits only on change — no
  redeploy loop; the frontend loads its datasets with
  `Promise.allSettled`, one fetch per file); honest upstream-failure
  fallbacks (502 envelope naming the static fallback path; the What
  Changed page presents its baked-in copy as a dated published log,
  never as live); small handlers (63–272 lines, shared lib, no
  dependencies); health surfacing (`/api/health` never 5xx — it
  degrades to `degraded` with per-file freshness vs the 24h SLA,
  the Live Wire model).
- **Fixes shipped with this audit:** (1) the `/data/*` SWR header
  above; (2) API.md's stale "`nodejs22.x`" runtime claim corrected —
  no runtime is pinned (the pin is what Vercel rejects; see the
  known-good notes above). Nothing else in the function layer would
  break, throttle, or bill at the stated traffic or 10× it.

## Track rule

This working repo is never deployed. The `-live` repo is re-synced only when
the user explicitly says "push" / "ship it".
