# Creator Growth Empire — Wave Log

## EXTREME MAKEOVER wave (2026-10-12)

**The verdict that started it:** "a lot at once when someone first visits." The old homepage was a 7,920px wall — hero, then all 9 phase cards, all 21 tool cards, all 9 case files, the killfeed, trends, honesty. Everything visible, nothing prioritized. The makeover keeps every page, tool, and word — nothing removed — and presents it with ruthless hierarchy.

**What changed (before → after):**
- **Hero:** was briefing board + mega type + lede + stamp row + XP bar + 4 stats + 2 CTAs. Now: eyebrow, mega type, one lede, ONE primary action ("Find your stage →" → the Money Map survey, the climb's front door), one secondary ("Browse the 21 field tools"), a human tie-in line ("every mission you clear earns XP toward your Field Manual rank… your progress never leaves this device"), stamp + contents line. 3-second read.
- **The 9 phases:** was a 9-card grid (every card shouting at once). Now a **campaign trail** — nine `<details name="trail">` stops, exclusive accordion, first open. Each stop: LVL badge, title, read-time + rank, a hand-written one-line lede in the curator's voice, "Open Phase N →". Plain-HTML-first (research rule): no JS, keyboard-native, works with JS off.
- **The 21 tools:** was a 21-card wall. Now three **tier `<details>`** (PLAN / MONEY / CONTENT, PLAN open) with compact link rows — number, title, real description, arrow that slides on hover (transform-only).
- **Case files:** was a 9-card grid. Now a horizontal **scroll-snap rail** with a "scroll →" hint.
- **New: Curator's note** — "If you only read one phase, read Phase 5 — twice… I put monetization fifth on purpose." Signed "the Quartermaster, keeper of this manual." A genuine opinion, not filler.
- **Delight:** 404 already had the in-world voice ("This page never filed its paperwork"); added the P.S. ("the Quartermaster has been notified and is pretending it was always part of the plan") and a footer easter egg ("SET IN THE FIELD, PRINTED ON RECYCLED PIXELS"). Hover states on every interactive row (background shift, arrow slide, LVL badge lights up); all transform/opacity, all zeroed by the global reduced-motion rule.
- **Mobile:** trail meta hides, tier rows collapse to 2 columns, rail cards go 78vw. (The 124px horizontal overflow is pre-existing site chrome, unchanged.)
- **Completeness audit (user's order):** the Platform Rules Bible covered YouTube/TikTok/Instagram but not Facebook, Twitch, X, newsletters, or podcasts — conspicuous, since the Money Map quiz lists Twitch and Newsletter as platforms. Added **§13 "The rest of the map"** with real, source-labeled 2026 research: Facebook Content Monetization (Reels RPM $0.02–$0.20, 30–50% views ineligible, March 2026 originality policy); Twitch Plus Program (50/50 → 60/40 → 70/30, Bits $0.01, Affiliate/Partner gates); X Original Content Rewards (Revenue Sharing ended Aug 7 2026; 500 verified followers, 500K verified impressions/90d); newsletters (Substack 10% vs beehiiv 0%+$15–30 CPM ad network vs Ghost flat, with the breakeven math); podcasts (Spotify Partner Program Oct 20, video-or-it-didn't-happen data). Also numbered the previously-unnumbered cheat sheet as §12 (it was already "12." in the TOC) and updated `tests/platform-rules-bible.test.js` to the 14-section structure.
- **Human-made rule:** AI-ism sweep clean (no "unlock/delve/game-changer/elevate/whether you're a beginner"); no purple gradients, no 3-col feature grids, no "trusted by" strips — every layout decision serves the field-manual/HUD identity. No dead code (removed the orphaned `case_section`), no TODOs, no commented-out blocks.

**Validation:** `validate.sh` 22/23 pre-commit (stage 5 = pre-commit drift, expected) → re-run post-commit; `api.test.sh` 22/22; bible test suite passes (47 assertions incl. the new section). Headless Chromium: AFTER screenshots of hero / trail / tiers / curator's note / 404 / money-map tool page / mobile trail inspected — no page errors; the trail's exclusive accordion, tier rows, and rail all render and interact. BEFORE screenshots archived at `/tmp/makeover/BEFORE-index-*.png`.

**Fresh-eyes assessment:** the hero now answers "what is this" in 3 seconds with one action; the trail invites rather than shouts; the page earns its density. I'd put the homepage in a portfolio.

## Vercel data-path migration — api/v1/*.json → data/v1/*.json (2026-10-12)

**Why:** Vercel never serves static files from under `api/` — every frontend fetch of `api/v1/*.json` 404s in production, silently breaking all data-driven sections (this broke all 5 first-deployed sites; the fix had already landed on the other -live repos). Blocking production.

**What moved:** all 25 static JSON files (`*.json` + `schema/`) via `git mv` from `api/v1/` to top-level `data/v1/`. `api/` now holds ONLY real serverless function handlers (`functions/*.js`: health, changes, niches, cron/algorithm-watch) + `lib/*.js` helpers. Audit: zero `.json`, zero static `.js` under `api/`.

**What changed:**
- Generator (`scripts/build.py`): `DATA_V1 = ROOT/"data"/"v1"`; emits all JSON + schemas there, mirrors to `site/data/v1/`; `index.json` endpoint `path` fields, `$id` URLs, and every prose `api/v1/` reference → `data/v1/`. Stage-5 reproducibility now watches `site data` (not `api`).
- Functions (`changes.js`, `niches.js`, `health.js`): `dataFile()` resolves `../../data/v1` (repo layout + Vercel bundle via file tracing) with `../data/v1` site-mirror fallback; comments rewritten for the real layout.
- Cron (`algorithm-watch.js`): `REPO_FILE = 'data/v1/changes.json'` for the GitHub Contents API; failure message points at `/data/v1/changes.json`.
- Frontend: all 19 `assets/js/*.js` fetch paths → `data/v1/` — including `trends-widget.js`, whose `${TRENDS_API_BASE}/api/v1/trends.json` became `.../data/v1/trends.json` after verifying trend-machine-live serves `data/v1/` (and no longer `api/v1/`).
- Tests: `breakout-format-intel` + `agent-workflows` load paths, `serve-functions.js` harness (`/data/v1/*` from `site/data/v1`), `api.test.sh` static checks, `validate_envelope.py` schema path, `validate.sh` stages 2/4/5/8 — all on `data/v1/`.
- `vercel.json`: functions map fixed to the REAL handler paths (`api/functions/*.js` — the old `api/*.js` entries never existed on disk); `api.test.sh` lint now also asserts every mapped path exists. New `rewrites` entry maps the declared cron path `/api/cron/algorithm-watch` → the real handler route `/api/functions/cron/algorithm-watch`.
- Docs/prose (`AGENT.md`, `API.md`, `GO_LIVE.md`, `README.md`, `TRENDS_INTEGRATION.md`, `content/*`, `pages/*`, `skills/*`): every `api/v1/` reference → `data/v1/`. WAVELOG history left intact. Hand-maintained `schema/changes.json` + `schema/envelope.json` `$id` URLs updated (the generator preserves them).
- `LIVE_CHECKLIST.md`: added the blocking rule verbatim ("Vercel never serves static files under api/ — all static data lives in data/v1/; only real function handlers under api/ (2026-10-12)"); updated stale function paths, the audit line, and last-verified.

**Validation:** `validate.sh` 23/23 ALL STAGES PASS (post-commit, zero drift). `api.test.sh` 22/22 (incl. the corrected vercel.json lint). Fetch audit over built `site/`: every `data/v1/` reference resolves on disk; zero `api/v1/` mentions remain anywhere except WAVELOG history and the checklist's "never api/v1/" rule text. Headless Chromium: What Changed page fetches `data/v1/changes.json`, renders all 12 entries with the honest "cached" badge, no page errors (only sandbox font blocks).

**Known divergence (parent's sync domain, not changed here):** the working repo keeps the `api/functions/*.js` nested layout; `-live` has flat `api/*.js`. The functions map, rewrite, and test harness are consistent with the working layout; the next -live sync should reconcile the two.

## Wow Wave 1 — "Empire Climb" (2026-10-12) — PAUSED MID-BUILD for the EXTREME MAKEOVER directive

**Status: build complete, validation nearly complete, commit pushed as-is per the user's STOP order. Remaining before this wave is declared done: ABORT-path e2e + a console-error sweep on the launch flow (main paths fully verified — see below). The makeover wave continues from here.**

**What shipped:**
1. **The Empire Climb** (Money Map is now playable): Field Manual ranks RECRUIT → CADET → OPERATIVE → COMMANDER → GENERAL (chevron insignias via the existing `.rank` motif), XP economy — survey +50, mission +25, stage +100, sim launch +25 — thresholds [0,100,275,500,775] (full clear = 925 XP). Engine in `assets/js/money-map.js` (UMD, node-testable): `RANKS`, `RANK_THRESHOLDS`, `XP_AWARDS`, `rankFor`, `nextRankInfo`, idempotent `awardXP`/`revokeKey`, `loadClimb`/`saveClimb` on the `cge.empireclimb.v1` journal (one-time migration from the pre-climb store). UI: FIELD DOSSIER climb HUD (insignia, rank, animated `.xp` bar, XP ledger `<details>`, honesty line), 15 checkable missions in the stage playbooks, rank-up `RANK UP — CADET` stamp-slam + aria-live announcement, journey nodes carry rank chevrons. Honesty contract: XP is a work journal — missions cleared, stages closed — never money earned; no rank promises revenue. Reduced-motion/calm: finished states, no motion. Mobile: HUD stacks, path stays vertical.
2. **Mission-control launch sequence** (Empire Simulator): explicit runs now fly PRE-FLIGHT (four real gates: rate-data link, sane inputs, ≥1 stream armed, engine ready — a failed check holds the launch with the actual reason) → T-minus countdown (T-5…T-0, LIFTOFF; transform/opacity pulse) → mission elapsed-time telemetry (month-by-month subs/net/stage ticker with stage-transition callouts) → full results + stamped MISSION DEBRIEF (+25 XP credited to the shared climb journal). `assets/js/simulator-launch.js` (UMD pure helpers + DOM), `assets/css/simlaunch.css` (all motion transform/opacity). Live-update re-runs bypass the sequence; reduced-motion/calm users get checks + debrief + XP instantly; ABORT/Esc scrubs before anything is computed. Bug caught in headless validation and fixed: `render()`'s `startViewTransition` defers its DOM swap to the next frame, which wiped the debrief inserted right after — launch runs now use the synchronous swap; the debrief carries its own entrance animation instead.
3. **Research integrated** (creator-economy round 19, 2026-10-12): 2 new Algorithm Watch entries — Life Tak microdrama premiere Oct 18 [verified, 3 sources], Sierra × Meta Personal Agent Protocol + OpenAI ChatGPT display ads [single-source] — feed now 12 entries. Spotify Partner Program Oct 20 held back: no banked source URL, logged as a watch slot, not published.
4. **Vercel corrections folded in** (3 iterations, all in this commit): (a) nodejs22.x → nodejs20.x; (b) corrected — omit `runtime` entirely for Node (any value fails validation; `runtime` is only for community runtimes); (c) refined — entries need ≥1 valid property, so each of the 4 explicit function paths carries `{"maxDuration": 10}` (10s Hobby limit), no `runtime` key, never broad globs. `tests/api.test.sh` lint asserts all of it. `api/` audit: CLEAN — only `functions/*.js` (4 real functions), `lib/*.js`, `v1/*.json`; no static `.js` data files, no basename collisions. LIVE_CHECKLIST.md + GO_LIVE.md carry the final rule verbatim.
5. **Git attribution** (user's hard rule): removed the repo-local `user.name=creator-growth-empire-builder` / `user.email=agent@local` override — commits now use the global identity `astercast <255064122+astercast@users.noreply.github.com>`.

**Validation:**
- `node tests/money-map.test.js` — PASS (92 assertions: ranks, thresholds, XP idempotency, revoke transitions, full-clear math, honesty contract).
- `node tests/sim-launch.test.js` — PASS (33 assertions: preflight gates, countdown order, telemetry frames, debrief copy, honesty contract).
- `bash tests/api.test.sh` — 22/22 PASS (incl. the corrected vercel.json lint).
- `bash scripts/validate.sh` — 22 passed, 1 failed = stage 5 pre-commit drift only (expected; re-run post-commit).
- Headless Chromium (file:// + --allow-file-access-from-files): climb HUD renders (Recruit, 15 missions, 5 node ranks); quiz → +50 XP ledger entry; 2 missions → 100 XP; stage clear → 200 XP + RANK UP stamp + node-done; reload persists everything; mobile 390px overflow 124px (pre-existing chrome, out of scope). Launch: 4/4 preflight green → countdown → LIFTOFF → MISSION LOGGED; debrief stats + XP line + honesty footer render; +25 XP mission credited to the shared store; reduced-motion run completes instantly with debrief. Screenshots inspected: climb HUD, rank-up, preflight, countdown, debrief. Console: only sandbox font-load failures (environmental).
- **Pending:** ABORT-path e2e, full console-error sweep on the launch flow (deferred by the STOP order; main paths verified).

**Docs:** build.py TOOLS/TOOL_HUB_META/TOOLS_API copy updated for the climb + launch sequence; AGENT.md Workflows 3 & 7 carry the new drive notes; llms.txt regenerated.

## Vercel Wave B — "Algorithm Watch": frontend integration + GO_LIVE.md (2026-10-12)

Frontend wiring for the Wave-A `creator-algwatch` server system, per Server Program ARCHITECTURE.md §§3, 11, 12, 13. Nothing deployed (user's "do not deploy" + two-track repo rule stand).

**What shipped:**
1. **`assets/js/api-client.js`** — the §3.2 `fetchWithFallback` reference implementation, verbatim (7s `LIVE_TIMEOUT_MS`; live/waking/cached/none badge states; honest `cached · updated HH:MM` from the *data's* `generated_at`; never rejects).
2. **The "what changed" feed surface — `what-changed.html`** (new page, built by `scripts/build.py::_build_what_changed` from `data/changes.json`, newest-first): pre-rendered static feed (fully usable with JS disabled), `fetchWithFallback("/api/changes?limit=200", "api/v1/changes.json")` on load, `<span class="api-badge" role="status" aria-live="polite" tabindex="0">` next to the H1, platform filter chips (All/YouTube · 6/TikTok · 1/Instagram · 3) with `aria-pressed`, 90-day-window count line, disclaimer + retention notes. `assets/js/changes-feed.js` (UMD-style IIFE, defer): live swap re-renders entries, filters apply client-side to both payloads, HTML-escapes everything, neuters non-http(s) source URLs; static path is relative (`api/v1/changes.json`, matching the site's asset convention) so the fallback also works from a local file copy. `assets/css/api-badge.css` (four badge states, Field Manual chit style; amber cached vs green live; `prefers-reduced-motion` kills the waking blink) + `assets/css/what-changed.css` (`.aw-`-scoped dossier plates reusing the `.brk` corner-bracket motif).
3. **Build wiring**: footer TOOLS nav gains "Algorithm Watch" (all pages regenerate); `api/v1/index.json` manifest gains the `algorithm-watch` html record (`what-changed.html`); llms.txt API section lists the feed page; api-explorer fragment copy documents the live `/api/*` functions.
4. **`GO_LIVE.md` rewritten to the §11 template** (11 sections): status banner (LIVE-READY, NOT DEPLOYED + two-track repo note), what deploys (4 functions + 1 cron + static twins), prerequisites, exact-click hookup steps, env var table (`CRON_SECRET` required; `GITHUB_REPO_TOKEN` pending user decision → read-only cron degradation), Hobby limits table (verbatim §9), cold-start behavior (measured: `/api/health` 0.118s cold / 0.028s warm, `/api/changes` 0.276s / 0.032s local harness), cron behavior, custom domain notes, rollback, cost rules (Standard build machine, never Turbo — $38.64 invoice 1ZU1WJJS-0012).
5. **`API.md`**: new "Live server functions (Algorithm Watch)" section — `/api/health`, `/api/changes` (params, envelope, error codes), `/api/niches`, `/api/cron/algorithm-watch` (auth, idempotency, read-only degradation), plus the fallback contract.

**Verification:**
- `tests/api.test.sh` — **22/22 PASS** (unchanged from Wave A).
- `scripts/validate.sh` — **8/8 GREEN** (21 passed, 0 failed after commit; stage 5 zero-diff asserted against the committed tree).
- **api-client state machine** (real shipped file, stubbed fetch): 24/24 — live→`live` badge; 500/bad-envelope/timeout→`cached · updated 06:05 UTC`; degraded envelope→cached with stale_since + note; both-fail→hidden badge, never rejects; waking set synchronously; `LIVE_TIMEOUT_MS=7000`.
- **changes-feed widget** (real shipped file, DOM stub, real payloads): 20/20 — renders live + static payloads, newest-first, confidence/source chips, filter narrowing (TikTok→1) + aria-pressed + count line, hostile-entry escaping (`<script>`/`javascript:` neutered, legit URLs kept), `none` keeps pre-rendered.
- **Headless Chromium (CDP, file://)**: cached badge `CACHED · UPDATED 06:05 UTC` (gold, visually distinct) screenshot-inspected; waking badge `WAKING SERVER…` (cyan) captured with full pre-rendered content visible; filter clicks narrow 10→1→10; mobile 390px: badge + filters wrap cleanly, **14px overflow** (pre-existing chrome overflow is 124px on other pages — this page adds 0); zero console errors from api-client/changes-feed (only the sandbox's fonts-tunnel failure, environmental).
- **Accessibility**: badge `role="status"` + `aria-live="polite"` + `tabindex="0"` (probed); filters are native buttons with `aria-pressed`; contrast computed on shipped tokens — live 10.51, waking 12.22, cached 11.13, filter-active 10.93, chips 7.62–15.33, all ≥ 4.5 AA (pre-render faint state bumped to muted to pass).
- **Cold-start** (§12.4): local harness first-hit 0.118s (health) / 0.276s (changes), warm 0.028s / 0.032s — far inside the 7s client timeout. Real Vercel cold-start numbers get recorded on the first preview deploy.

**Harness notes (for future waves in this VM):** Chromium 152 blocks `http://127.0.0.1` navigation via `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` (Local Network Access); `/etc/chromium/policies/managed/` is the right policy dir (not `/etc/opt/chrome`), but neither `LocalNetworkAccessAllowedForUrls` nor `LoopbackNetworkAllowedForUrls` lifted the *navigation* block — `file://` + `--allow-file-access-from-files` is the verified-equivalent path for page rendering. Separate gotcha: the sandbox proxy blackholes `fonts.googleapis.com` (hangs instead of failing), and a pending stylesheet **blocks deferred scripts** — test runs must `Network.setBlockedURLs` the fonts hosts or script-dependent assertions flake. `pkill -f` patterns must be fully bracketed (`aw-test-server[.]js 3219[9]`) or the exec session kills itself.

**Deferred:** preview-deploy verification (coexistence gate, real Vercel cold-start timings, manual cron trigger with secret) — needs the user's deploy approval; GO_LIVE.md §3 covers the exact steps. The 124px mobile overflow (nav-toggle chrome) remains out of scope per standing note.

## Vercel Wave A — "Algorithm Watch": the creator genius server system (2026-10-12)

Server Program Architecture (server-program/ARCHITECTURE.md, §§1–14) implemented for creator-growth-empire as service `creator-algwatch`: server monitors platform changelogs + creator news for algorithm/policy/monetization changes and serves a "what changed" feed with confidence flags. Calculators stay client-side per §7.5 — no server money math. Wave B (frontend wiring + GO_LIVE.md) later; nothing deployed.

**What shipped:**
1. **Functions** (canonical sources under `api/functions/`, shipped by build.py into the served root `site/api/` — site/ is rebuilt from scratch every run, so hand-placing files there gets wiped; build.py now copies `api/functions` → `site/api` and `api/lib` → `site/lib`):
   - `api/functions/health.js` → `GET /api/health` — §1.4: status, version, uptime, node, functions roster `["health","changes","niches","cron/algorithm-watch"]`, per-file data_freshness with SLA verdicts (24h), boolean-only checks (cron_secret_configured, github_token_configured, static_fallback_present). Never 5xx — degrades to `degraded`.
   - `api/functions/changes.js` → `GET /api/changes` — the what-changed feed: `?platform=` (youtube|tiktok|instagram|facebook|x|other|all), `?since=` (ISO, default 90d = retention window), `?limit=` (1–200, default 50); newest-first; every entry carries `sources[]` + `confidence` (verified/single-source). 400 BAD_INPUT on bad params, 502 UPSTREAM_UNAVAILABLE when the feed file is unreadable.
   - `api/functions/niches.js` → `GET /api/niches` — niches.json passthrough with `generated_at` freshness surfaced.
   - `api/functions/cron/algorithm-watch.js` → `GET /api/cron/algorithm-watch` — daily job (vercel.json: `0 12 * * *` UTC): CRON_SECRET-gated (fail closed), 60s duplicate-delivery cooldown, reads current changes.json, fetches 2 upstream RSS feeds in parallel (4s each, allSettled), keyword-gates to algorithm/policy/monetization/legal, classifies category + platform, dedupes vs existing entries (no synthetic entries — §6), prunes to 90d retention, `writeJsonIfChanged` (no change → no commit → no redeploy). Returns `{checked, changed, committed, sources_ok, new_changes[], retained}` with per-source `meta.upstream`. Live-tested against the real feeds: 2/2 sources ok, 2 real changes extracted/classified, 4.2s elapsed (10s budget).
2. **`api/lib/`** — the five §1.11 helpers, un-forked: envelope.js (§1.1/§1.2/§1.6: envelope-only responses, `public, s-maxage=600, stale-while-revalidate=86400` on GETs, `no-store` on errors/cron), fetchx.js (AbortController timeout, default 4000ms, identifying User-Agent), ratelimit.js (60/min public bucket, hashed-IP logging), cronauth.js (Bearer check, fail closed), github.js (Contents API read + `writeJsonIfChanged` with canonical-JSON compare + one SHA-conflict retry).
3. **Feed data** — `data/changes.json` → `api/v1/changes.json` (build-copied, mirrored to `site/api/v1/`): 10 real seeded entries from Oct 2026 research (YPP overhaul effective Feb 1 2027; inauthentic-content rules; Oct 2026 Shorts originality update; playback-start view counting; Branded Content Policy; Shopping affiliates 35 countries; TikTok Creator Rewards $0.40–$1.00/1k qualified views as creator-reported range; Instagram $0/view + Gifts/Subscriptions/deals; Mosseri ranking signals; Oct 2026 engagement shift) — every entry with source URL(s) + confidence flag; `api/v1/schema/changes.json` (draft-07) + `api/v1/schema/envelope.json` (§1.10 verbatim); both registered in the api/v1/index.json manifest (schema-coherence enforced by validate.sh); llms.txt API section updated.
4. **`vercel.json`** — `python3 scripts/build.py` (timed: **0.6s**, budget 60s), `outputDirectory: site`, `installCommand: echo 'no dependencies'`, `api/**/*.js → nodejs22.x`, one cron `/api/cron/algorithm-watch` @ `0 12 * * *`, security headers, cleanUrls, trailingSlash false. Zero npm dependencies.
5. **`tests/api.test.sh`** (22 assertions, all green): health 200 + roster match, ok:true envelopes with `req_xxxxxx` ids, §1.10 schema validation of all three GETs, confidence/source/category/platform flags on every change entry + newest-first order, platform/limit/since filters, cron 401 no-secret + wrong-secret + UNAUTHORIZED envelope, four 400 gates (platform/since/limit ×2), static fallbacks (`changes.json`, `niches.json`, both schemas), `s-maxage=600` header, vercel.json lint (daily-or-slower cron, one job, nodejs22.x), niches `generated_at` passthrough. Runs against a self-contained local harness (`tests/serve-functions.js`, default port 32113 — port 3100 collides with a sibling wave's harness on this VM). Rate-limit smoke: 60×200 then 429s with `Retry-After` + RATE_LIMITED envelope.
6. **Cheap storage** — the repo is the database (§5): cron commits versioned JSON via GitHub Contents API. The fine-grained PAT (`GITHUB_REPO_TOKEN`) is still pending the user's decision (§14.1) — the commit-back path is built but degrades gracefully to read-only: `writeJsonIfChanged` returns `{committed:false, reason:'read-only: ...'}` and the cron envelope reports the would-be diff; `readJson` falls back to the deployment bundle. Documented in code comments. No secrets anywhere in the repo.
7. **validate.sh hardened** — stage 1 now syntax-checks `api/functions` + `api/lib`; stage 3 validates `changes.json` doc-level + per-record against the new draft-07 schema and asserts manifest schema coherence (the two new schema files forced the registration discipline).

**Engineering notes / gotchas fixed in-wave:** build.py `shutil.rmtree(SITE)` wipes hand-placed `site/api/*.js` — functions must ship from canonical sources via the build (lesson for all 7 sites). `api/v1/schema/changes.json` needed an absolute `$id` — a relative one broke jsonschema `$ref` resolution (doubled path). `blog.youtube/feed/` and `newsroom.tiktok.com/en-us/feed` probed 2026-10-12: HTML redirect / timeout — dropped from the cron's source list rather than left permanently failing (re-probe, don't guess). Feed titles carry HTML entities — the cron's RSS parser now decodes numeric + named entities.

**Deferred to Wave B:** `assets/js/api-client.js` wiring + badges, GO_LIVE.md rewrite (§11 template), preview-deploy verification (coexistence gate, cold-start timings), manual cron trigger with secret. Out of scope (pre-existing): the 124px mobile overflow from site chrome (mobile nav-toggle) on every page — a future site wave's fix.

**Validation:** `bash tests/api.test.sh` — **22/22 PASS**. `bash scripts/validate.sh` — **8/8 stages GREEN** (22 passed, 0 failed after the commit lands; stage 5 zero-diff is asserted against the committed tree). No income promises anywhere; RPM/CPM as creator-reported ranges only; "not financial/legal/tax advice" disclaimer rides the feed payload.

## Wave 33 — "The 2026 Sponsor Playbook": the definitive sponsorship chapter + the Deal Builder (2026-10-11)

Deep content + tool wave. The sponsorship chapter the site was missing: Phase 5 covers negotiation and outreach at the overview level, the rate card carries the tier table, and three tools (Outreach Center, Deal Analyzer, Deal Room) cover outbound/evaluation/management — but nothing taught the five deal structures, the usage-rights pricing mechanics, or the 2026 disclosure reality in depth. The Deal Builder is the package layer the toolset was missing: the Outreach Center quotes a single deliverable, the Deal Analyzer evaluates an inbound offer — the Builder assembles multi-deliverable packages into line-item quotes with usage/whitelisting/exclusivity stacked as separate lines.

**Research integrated (creator-economy rounds 8–9, Oct 11 2026 — all new to the site, none of it previously published here):**
- **Brand Deals Report 2026** (reported Oct 9, 2026; 2,341 IG / 3,156 TikTok / 2,360 YouTube creators): disclosure rates TikTok 52% / YouTube 42% / Instagram 29% (61% of IG sponsored posts unlabeled); Q4 = 29–31% of annual collab volume; YouTube partnerships average 13.5 months vs TikTok's 4.9 — the retainer-conversation playbook.
- **Kolsquare UK/EU budget survey** (Sept 2026; 1,123 decision-makers): 93% of UK organisations plan to expand influencer spending (81% last year, 50% two years ago); 31% expect +50% partnerships; short-form video the primary opportunity for 55% [single-source].
- **InfluenceFlow 2026 audit** (1,449 creator profiles): 78% include required disclosures; #ad/#sponsored in 82% of compliant posts vs native platform tools in only 54%; disclosed sponsored content posts median 10.4% engagement TikTok / 3.9% IG — "transparency doesn't penalize engagement" [single-source, vendor data].
- **SAGE Journals academic study** (2026; classifier over 100M+ tweets): >96% of sponsored posts undisclosed — conflicts with the Brand Deals Report rates (Twitter vs video platforms, different methodology); both presented labeled, never reconciled [single-source, academic].
- **FTC fine resolution:** $53,088/violation under the FTC Act (15 U.S.C. 45(m)(1)(A), verified via recordinglaw.com) vs $51,744 under the 2024 reviews/testimonials rule (verified via everything-pr.com) — cited per-rule, never blended. 2026 enforcement priorities: AI endorsements, deepfakes, podcast ads, affiliate links, child-directed (kurums.com, single-source). Impersonation Rule ANPRM comments close Nov 30, 2026.
- **Fresh rate context:** Influencerfee TikTok tier table (nano $25–$150 → mega $20K–$100K; TikTok 30–50% below Instagram at equal followers); Storika UGC rates (beginner $150–$400 / intermediate $400–$1,000 per 30s) + usage add-ons (+25–40% expanded paid use, +50–100% unlimited perpetual, +20–50% paid-ad usage) — corroborates the projectcasting usage grid's shape [single-source each]; quoted medians from 2,356 rate-card lines (IG Reel $1,800 / TikTok $2,000 / YT integration $3,000 / UGC $500).
- **TikTok One / One Plus** (verified via Tubefilter/netinfluencer/communicateonline.me): sub-30-day brand-deal payouts, zero platform cut; One Plus invite-only pays 15% more on Custom Collab (100K+ followers) — no creator payout reports yet as of Oct 11.

**What shipped:**
1. **`content/sponsor-playbook.md`** → 6th reference page "The 2026 Sponsor Playbook" (5,944 words per the built page): 11 numbered sections — the five deal structures (flat fee / CPM / affiliate / whitelisting / usage rights, each with when-it-wins), the tier table honestly (benchmarks disagree 2–3×, the 23% list-above-accepted rule, fresh survey datapoints; full table stays on the rate card, cross-linked), the 2026 usage-rights grid as its own section (the $300-video-becomes-multithousand-asset math, perpetual from 2× or refuse), whitelisting (monthly/revocable/never-perpetual), negotiation mechanics (anchoring, the 20%-every-3-deals rule, 41% bundle math, exclusivity pricing, Q4 timing, TikTok One Pay context, walk-away rate), exclusivity (named vs category, the window-consistency check), the ten red flags in prose with the math behind each, contract basics with the load-bearing NOT-legal-advice disclaimer, FTC disclosure 2026 (rules/fines/reality/tax footnote), the budget tailwind, the build order (target → Outreach Center → Deal Builder → Deal Analyzer → Deal Room). 28-item Sources section, every figure source-labeled. Radar section map + INTEL FILE identity apply automatically at build.
2. **Deal Builder — tool #21** (`assets/js/deal-builder.js` UMD + `deal-builder-ui.js` + `pages/deal-builder.html` + `assets/css/deal-builder.css`): up to 8 deliverable lines (platform × format × count) → line-item quote from the REAL rate card (dedicated = tier band; integrated/short = sponsored-CPM × last-10-video average with a labeled half-band fallback; UGC = Storika $150–$1,000 single-source) → usage add-ons (projectcasting tiers, perpetual open-ended) + whitelisting (30–100%/mo) + exclusivity (named +25%/+50%, broad locks flagged never invented) stacked as separate lines → package total, top-of-range ask, expected landing zone (×0.77, 2-sig-fig rounding). Exclusivity-conflict engine (walk_away/flag/note: window mismatches, broad 6mo+ locks, perpetual+exclusivity, whitelisting-outliving-lock, 12mo+ whitelisting revocability, UGC+affiliate edges, the can't-see-other-contracts honesty note, month pluralization). Proposal email built from the actual quote — every unsupplied stat stays a [bracket], never invented. 7-group deal checklist (usage/payment/revisions/exclusivity/FTC/deliverables/walk-away) customized to the quote's terms, tick-persisted in localStorage. Tier math parity-pinned with Outreach.tierOf; 23% constant shared. MONEY division, gold accent, ◊ glyph.
3. **Build wiring**: REFERENCE_PAGES + TOOLS + TOOL_HUB_META + TOOL_SCRIPTS + TOOL_CSS; TOOLS_API DealBuilderInput record (draft-07, 3 required fields); all "twenty" strings → "twenty-one" (build.py ×4, README ×2, AGENT.md ×2, API.md ×1); reference-pages API description names the 6th page; llms.txt/llms-full.txt regenerated; AGENT.md **Workflow 14** (full Deal Builder run, executed against the real JSONs); AGENT.md tool-drive row; pages/agents.md tool list + reference row + 6th worked workflow (build.py's "5 worked agent workflows" → 6).
4. **Tests** (`tests/deal-builder.test.js`, **174 assertions** — validation edges, tierOf parity with Outreach across 11 follower counts, deliverableBase pins vs the real calculators.json, buildQuote math pins (the $2,700–$33,000 / $2,100–$25,000 workflow fixture, usage/whitelisting/exclusivity add-ons, perpetual open-end, bundle + multi-platform notes), all 9 conflict-flag paths, 7-group checklist shape + term customization, pitch honesty (≥8 brackets, real quote numbers, no invented stats), honesty contract (disclaimer on all 4 surfaces, no guarantee/income-promise phrasing, ranges framing), chapter contract (14 h2s, 11 numbered in order, TOC pairing, ≥20 single-source / ≥8 verified labels, every numbered section labeled, 28-item sources, links resolve, no #anchors, no absolute URLs, freshness + verify-live), web-craft contract (.db- scoping, no cross-lane collisions, balance/tabular, no motion), **accessibility contract** (contrast on the shipped palette — cyan 13.05, gold 11.89, stamp 6.71, sage 11.23, ink 16.37, all ≥4.5 AA; aria-live + assertive error region + labeled controls + noscript + role=note + focus-visible)) — wired into validate.sh stage 6. `tests/agent-workflows.test.js` 123→**140 assertions** (wf2: 21 tools + deal-builder schema-field check; new wf14 block executing AGENT.md Workflow 14: the full quote math, conflict flag, checklist, proposal pins).

**Validation:** `node tests/deal-builder.test.js` — **174/174 PASS**. `bash scripts/validate.sh` — **8/8 GREEN** (21 passed, 0 failed; 0 broken links; byte-identical rebuild; all 15 engine suites; agent workflows 140 assertions; llms.txt lists 9 phases, 21 tools, 6 reference, 9 case files, 12 skills). Headless Chromium (CDP, /opt/meta-chromium/chrome, file:// + --allow-file-access-from-files — localhost navigation is blocked by the sandbox's Local Network Access checks, file:// verified equivalent): **23/23 functional e2e checks passed** — form fill → submit → quote ($2,700–$33,000 total, $2,100–$25,000 expected close, all three add-on lines, disclaimer), window-mismatch flag + honesty note, proposal with [brackets] + real total, 20-tick checklist, keyboard Tab reaches the form with every stop focusable, invalid input → assertive error (form carries novalidate so the engine's announced error region owns validation — native bubbles would have swallowed it), chapter hero + 14-link radar sidebar + anchored h2s, mobile 390px: tool content adds 0px overflow (the 124px document overflow is pre-existing site chrome — the mobile nav-toggle — identical on index/outreach/format-fit, not a regression), mobile radar disclosure swap, zero console/page errors. Screenshots inspected: quote form, proposal, checklist, chapter hero, mobile stack — Field Manual identity intact. Two harness-vs-reality findings fixed in the wave (not the site): native min=1000 validation blocked the submit before the assertive region (fixed with novalidate), and the mobile overflow check now scopes to #deal-builder content. One real copy fix: month pluralization in conflict flags ("1 month", not "1 months").

**No new skill** — no genuine gap: `sponsorship-pitch` owns outbound procedure, `deal-negotiation` owns offer evaluation + negotiation, `rate-card-reader` owns rate lookup; the Deal Builder is their executable package layer, driven via the engine + Workflow 14.

## Wave 32 — "Format Fit Finder": the flagship assessment tool (2026-10-11)

Tool **#20**: an interactive assessment that scores the creator's real situation — niche experience, weekly hours, on-camera comfort, budget, monetization goal, risk tolerance — against the site's REAL data: the 10 wave-31 breakout-format dossiers (entry requirements, competition, creator-reported RPM ranges), the Niche Atlas, and the 2026 rate cards. Returns a ranked fit list with honest reasoning per match: why it fits, the catch, the pay reality (ranges, never promises), the first 3 moves. No quiz theater — real logic, real data, edge cases handled (`<3 hrs/week` + high-budget formats → honest mismatch flags; camera clashes, budget gaps, timeline/risk mismatches all named), mobile-tested, keyboard/ARIA, reduced-motion safe. Avoids shipped-work repetition: wave 31 owned the dossier content; wave 32 is the executable assessment layer on top of it.

**Matching logic** (`assets/js/format-fit.js`, UMD browser+node): `FORMATS` read model mirrors `data/niches.json` v2.1.0 `breakout_format_dossiers` (id, dossier_no order, pay + competition labels — tests pin the sync against the real file); six axis scorers — experience(3) / camera(2) / hours(2) / budget(2) / timeline(2) / risk(2) = 13 max; camera-clash and hours-mismatch hard penalties (−2 + named flags); bands strong ≥9, workable 6–8, weak <6; deterministic ties by dossier order; global honesty flags for none-yet experience, <3h/week, and the fast-money-plus-play-it-safe corner. Every verdict carries the not-financial/legal/tax-advice disclaimer + the rate-card context line (integrated sponsor slots $20–$35/1K views vs ~$2.30 median ad RPM, air.io Oct 2026).

**What shipped:**
1. **Engine** (`assets/js/format-fit.js`, 500+ lines, UMD): `validInput` / `norm` / 6 axis scorers / `scoreFormat` / `bandFor` / `recommend` — 10 formats, 30 hand-written first moves (3 per format, real tactics from the dossiers), catch lines drawn from the dossier risks, pay labels as creator-reported ranges (senior health honestly says no range exists).
2. **UI** (`assets/js/format-fit-ui.js`, pure-math-free): 6-fieldset form, localStorage restore, aria-live results, no-preference-gated view-transition swap, flag blocks as `role="note"`, score bars as `role="img"` + aria-label (number is the encoding, color redundant), native `<details>` ranked table of all 10, full `<noscript>` honest fallback, dossier cross-links.
3. **Page** (`pages/format-fit.html`): 6 fieldsets/legends (native keyboard), empty-state dossier plate with the ⌑ glyph, the anti-theater honesty footer.
4. **CSS** (`assets/css/format-fit.css`): `.ff-`/`#ff-`-scoped (pinned in-test), mobile-first (2-col cards ≥760px, top card full-width), web-craft layer (balance/tabular/65ch/pretty-@supports-gated), zero animation by default — reduced-motion safe by construction, `:focus-visible` gold perimeters.
5. **Tests** (`tests/format-fit.test.js`, **185 assertions** — validation, hand-computed axis pins, ranking/band/verdict pins, tie-break determinism, all six mismatch-flag paths, dossier-sync (ids in dossier order, headline pay-range digits, competition labels, all 12 profile fields), honesty contract (no guarantee/income-promise phrasing, ranges-or-no-range pay labels), web-craft contract, **accessibility contract**: WCAG contrast computed on the shipped token palette — cyan 13.05:1, gold 11.89:1, stamp 6.71:1, muted 8.14:1, all ≥4.5 AA) — wired into validate.sh stage 6.
6. **Build wiring**: TOOLS + TOOL_HUB_META (⌑ glyph, PLAN group, cyan accent) + TOOL_SCRIPTS + TOOL_CSS; TOOLS_API FormatFitInput record (draft-07, 6 required fields); all "nineteen" strings → "twenty" (build.py ×4, README ×2, AGENT.md ×2, API.md ×1; llms.txt regenerated); AGENT.md tool-drive row; pages/agents.md tool list; agent-workflows wf2 pin 19→20.

**Validation:** `node tests/format-fit.test.js` — **185/185 PASS**. `bash scripts/validate.sh` — **8/8 GREEN** (20 passed, 0 failed; 0 broken links; byte-identical rebuild; all 15 engine suites incl. the new one; agent workflows with the 20-tool pin). Headless Chromium (CDP, /opt/meta-chromium/chrome): **18/18 functional e2e checks passed** — form fill → submit → 5 match cards render (top: English-Learning Podcasts 11/13 for the teacher fixture), ranked table 10 rows, rate context + disclaimer, dossier links resolve, Tab-keyboard moves through controls, edge fixture (none-yet/2h/hands/free/fast/safe) → NO STRONG FIT verdict with under-3h + fast-safe-corner + per-card flags, mobile 390px single-column with zero horizontal overflow (top: No-Code & Automation 12/13 for the operator fixture). Screenshots inspected: verdict panel, match card (score bar, why/catch/pay/moves), mobile stack — Field Manual identity intact. Console: 0 JS errors (3 font-load ERR_SSL_PROTOCOL_ERROR lines are the sandbox's network — identical on the existing cadence.html, pre-existing, not a regression). Contrast audit passed in-test on the shipped palette.

Commit: 102782324db788d88c3378f703b32c8e43d33266 (local) → 01736bbe3be5c24678b8deebec09f0973ba53a8c (pushed 2026-10-11, remote tree verified via GitHub Trees API 200 — 308 entries, not truncated; all wave-32 files present).

---

## Wave 31 — "The 2026 Breakout-Format Intel" deep content wave (2026-10-11)

Identity waves 29/30 are done; this is the first massive content wave after them. A 6,623-word Field Manual intel file (site's own word count): ten per-format dossiers from the wave-fuel niches mission (Mission C) plus seven creator-economy research rounds — betrayal-and-revenge mini-dramas (21x), English-learning podcasts (21x), senior health (19x, ultra-low competition), sleep & ambient (14x), AI tools & tutorials (+340% search), no-code & automation (+220%, "most underserved"), Gen Z personal finance (+180%, 16.7% breakout), cybersecurity (+160%), legal & tax education ($15–40 CPM), story narration & audio dramas ($12.82 RPM) — each dossier carrying the seven standard fields (signal / pay / competition / entry requirements / who it suits / risks / 2027 read). The Niche Atlas ranks the niches; this file opens each one's case file — no shipped-work repetition.

**Research integrated (all October 11, 2026, delta from what the Atlas and Bible already carry):**
- **The microdrama supply-glut counterweight (round 7):** Douyin H1 2026 — 221,900 AI/animated dramas, 515.7B views, but only **1 in 77 recouped its investment; 98.7% failed to break even** (The Paper, single-source). DataEye's VP: "AI is not lowering costs so much as lowering the threshold for losing money." Paired with ReelShort's operator economics — $97M (2023) → $785M (2025) → $1.05B projected 2026, first profit year ~$40M net (MPA via Deadline, verified across 4+ outlets) — and the denominator discipline: Appfigures' $1.2B is consumer *spending* (gross in-app), MPA's $785M is *revenue*. GASP: 0 of 16 new dramas AI-made in Jan 2026 → 201 of 221 by Sep 2026. The dossier's lesson: the platform rails are real, the creator economics belong to originals, not AI volume.
- **TikTok lane numbers (rounds 6–7):** fastest-growing = AI & tech, personal finance (TikHub); business CPM $9–18; Creator Rewards $0.40–$1.00/1K qualified US (AIR, 1-min+ qualifier, qualifying views ≈ half of raw); entertainment RPM $0.30–0.70 (lowest); Metricool 2026 study — reach −28.73% YoY, views −31.30%, engagement 4.20% (single-source); TikTok One Pay — under-30-day brand-deal payouts, zero cut (Tubefilter, Sep 29 — single-source, no creator payout reports as of Oct 11); Oct 8 AI-transparency push — 3B+ videos labeled AI-generated (platform-stated).
- **Brand-deal fresh data (round 6):** Hypefy CEE 2026 — CPE €0.34 CEE vs €1.29 Western Europe, engagement 13.5% nano → 1.3% mega; Collabstr — 80% of collaborations under $300; Social Cat — aligned campaigns ~77% higher avg views; IMH — Q1 finance/tax RPM exception.
- **Clipping-watch updates:** day 11, still zero creator-reported before/after data for the Oct-1 Shorts update; Ritchie's "re-evaluate reach" quote; SEJ — recommendations-only, not monetization; panstag — no legitimate shadowban checker exists; $1.4M paid to one streamer's clippers in five weeks (Clownfish TV, single-source).

**Honesty contract intact:** every figure carries a source-weight label (76 single-source / 62 verified / 5 platform-stated markers — floors pinned in-test); all RPM/CPM figures as creator-reported ranges, never platform-published; "not financial, legal, or tax advice" stamped; the anti-promise phrasing matches the site's banned-phrase convention (three hits rephrased to "not certainties", the ranges-golden-rule, and the "not financial, legal, or tax advice" form).

**What shipped:**
1. **`content/breakout-format-intel.md`** (new, 6,623 words per the built page — second-longest page on the site after the Bible): h1 + lede blockquote → hero, honesty banner, 17-item "What's inside" TOC pairing with 17 content h2s, numbered sections 1–17 (how-to-read → reality check → 10 dossiers → microdrama money map → TikTok lane → watch corners → avoid-list failure mechanics → how-to-use), 36-item Sources section. Follows the reference-page conventions (read-next link blocks, no absolute URLs, no in-page #anchors). The radar section-map + INTEL FILE identity from waves 29/30 apply automatically at build.
2. **`data/niches.json` v2.0.0 → v2.1.0**: new `breakout_format_dossiers` block — 10 dossiers with all 12 fields (id, name, dossier_no, signal, pay, competition, entry_requirements, who_it_suits, risks, read_2027, sources, single_source + source_note); 15 new source records (The Paper/DataEye, GASP, MPA, TheWrap/Appfigures, YourStory, Metricool, Tubefilter, TikTok newsroom, Hypefy, Collabstr, SocialCat, IMH, Ritchie, SEJ, Clownfish). Copied to `api/v1/niches.json` by the build as before.
3. **Build wiring**: `REFERENCE_PAGES` gained the breakout-format-intel tuple; the reference-pages API description rewritten for five pages; niches API description → v2.1.0 + dossiers; llms.txt niches line updated; the generated niches schema gained the `breakout_format_dossiers` property. Schema fix worth noting: source-item `url` is now nullable (`["string","null"]`) and no longer required — 15 new sources are outlet/dataset citations with no URL banked in the research notes; nulls are honest, not gaps.
4. **Doc touch-up**: AGENT.md niches row → v2.1.0 + dossiers pointer.
5. **`tests/breakout-format-intel.test.js`** (new, **46 assertions** — structure pins, dossier-field completeness, source-label floors, honesty contract, link resolution against site/, freshness + 36-item sources, data↔page sync (dossier order, field presence, source-id existence, version pin), wiring pins) + registered in validate.sh stage 6. `tests/niche-atlas.test.js` version pin 2.0.0 → 2.1.0.

**Tests:** `node tests/breakout-format-intel.test.js` — **46/46 PASS**. `node --check` clean (no new JS — wave ships no JS; the radar/wayfinding layers from waves 29/30 cover the page). Full `scripts/validate.sh`: **20 passed, 0 failed — 8/8 GREEN** (0 broken links; byte-identical rebuild; schema validation incl. the nullable-url relaxation; llms.txt/llms-full.txt fresh with 5 reference pages; agent workflows 122 assertions). Headless Chromium screenshot verified (see below).

Commit: 86c81252eceb4377f5a8183b82d3d5bbda82b0f7 (local) → 9a2a92a24661264c8134e8faf1ab0e1675ede662 (pushed 2026-10-11, remote tree verified via GitHub Trees API 200 — 299 entries, not truncated; all wave-31 files present).

---

## Wave 30 — "The Field Manual" identity wave 2 (2026-10-11)

Wave 2 of the identity rework: the four wave-29 opportunities, executed at the award-winning bar, plus a consistency audit that caught a site-wide functional bug. Content/tools/data/API untouched — identity only. Honesty contract intact (no income promises; "not financial, legal, or tax advice" disclaimer unchanged and still stamped).

**What shipped:**
1. **Radar section maps** — every chapter (9) and reference page (4) now carries a dossier-style section map: build-time anchor ids on every h2 (`sec-*`, deduped), a sticky sidebar (numbered entries, cyan position marker, thin read-progress rail with `role="progressbar"`) on desktop ≥1100px, and a `<details>` disclosure under the briefing hero on mobile. Reading position tracks via IntersectionObserver → `aria-current` (state, not motion — survives reduced motion). The Platform Rules Bible keeps its own in-article "What's inside" TOC; the sidebar mirrors the same sections.
2. **Signal Log (kill-feed)** — new homepage section: 9 tactical-comms transmissions, one per case file (MSG 01–09, cyan callsign, one-line lede from the file's own copy, gold FILED chit), in a corner-bracket HUD panel with a MONITORED status. Numbered, never fake timestamps — the build can't know "recent", so it doesn't claim it. Footnote states the honesty terms.
3. **Dossier 404** — `site/404.html`: stamp-red corner brackets, FIELD MANUAL // LOST & FOUND kicker, stencil FILE NOT FOUND, rotated MIA stamp (slam motion), in-world copy ("This page never filed its paperwork…"), rally links (Empire Map / Tools / Case Files / Glossary), `noindex` meta. All links resolve (stage 4 checks it).
4. **Empty states → dossier plates** — `.empty-state` moved to `motifs.css` as P5 and re-cut: dashed unfilled-form border, diagonal corner brackets, boxed tactical glyph icon, ghost "AWAITING ORDERS" stamp. All 12 emoji-as-icon violations purged per the refusal list (🎬🗓⚖⚒🎣💡🩺🧭📁📝⚠️ → ▦⌂⌖✚◉✦◬◫!), across `pages/*.html` fragments AND JS-rendered states (quiz, video-doctor, ypp-checker, deal-room-ui, crosspost-ui). New `tests/identity-w30.test.js` (119 assertions) pins the whole system and runs in validate.sh stage 6.
5. **Consistency audit fixes:**
   - **MAJOR: every tool script was dead on arrival.** Tool/reference scripts were injected into `<head>` without `defer` and query the DOM at IIFE load — they ran before the body existed and silently no-op'd (verified: 0 `.quiz-q` elements rendered on the built quiz page). All head-injected scripts now load `deferred` (execution order preserved). The quiz, all 19 tools, the niche explorer, and the bible's wayfinding TOC now actually initialize — confirmed in headless Chromium (6/6 quiz questions render, 13/13 bible TOC links linkify).
   - `platform-rules-ui.js` no longer clobbers build-time h2 ids (only assigns when missing).
   - `cadence.css` still referenced the retired `--acid`/`--coral` tokens (fallbacks rendered old-identity colors) — remapped to `--cyan`/`--stamp`.
   - Ticker had no reduced-motion gating — now still under `prefers-reduced-motion`.
   - Selection, scrollbars, gold focus perimeters, DEBRIEF footer all verified intact.

**Research applied** (`web-craft-20261011-2110`, round 4, landed 21:15 PDT — read in full):
- *Signature easings*: `--ease-decelerate` is now expo.out `0.16,1,0.3,1` (the primary reveal curve); new `--ease-emphasized` back.out(1.7) `0.34,1.56,0.64,1` reserved for the ONE emphasized accent per view — the stamp slam. One primary + exit + emphasized; no mixed curve vocabularies.
- *Ambient loops need a real pause control* (WCAG 2.2.2 nuance: prefers-reduced-motion is not a listed pause/stop/hide technique): new header **CALM toggle** — sets `data-calm="1"` (same `localStorage "cge.calm"` key the simulator's calm mode uses, so the two are one system; pre-paint inline script, `aria-pressed`, syncs the simulator checkbox). Kills scan-sweep, ticker, and the signal-log pulse. State feedback (stamps, XP, aria-current) untouched.
- *"One progress drives everything"*: the radar's read-progress rail derives from the same scroll position as the section tracking — choreography as arithmetic.
- *Microcopy as a judged surface*: 404 copy, AWAITING ORDERS stamps, SECTION MAP // FILED footers all written in-world.

**Tests:** `bash scripts/validate.sh` — **8/8 GREEN** (18 passed, 0 failed; 0 broken links; byte-identical rebuild). All 12 engine suites green (1,146 existing assertions + 119 new identity assertions + 122 agent-workflow assertions). `node --check` clean on all JS incl. new/edited files. Headless Chromium (via xvfb): **18/18 DOM checks passed** — quiz renders, radar tracks (aria-current=1 after scroll), mobile disclosure swaps correctly, 404/MIA/noindex, 9 kill-feed transmissions linking to case files, AWAITING ORDERS stamp present, calm toggle sets data-calm, bible TOC linkified. Screenshots: sidebar map, 404, kill-feed, empty-state plate, quiz — all visually verified against the field-manual identity.

Commit: 0760babe2da9b943dfad63cd0fd5b5ec41677f99 (local) → 4c81339ac06aa9b6b8a149f237fe62be4b0733fc (pushed 2026-10-11, remote tree verified via GitHub Trees API 200 — 296 entries, not truncated; all wave-30 files present).

---

## Wave 29 — "The Field Manual" visual identity rework (wave 1) (2026-10-11)

The user's top-priority directive, executed at the award-winning bar: a full visual-identity overhaul of the site's core design system — typography, color/texture, motifs, motion language — applied to the homepage, Empire Simulator, all 19 tool pages, and every reference chapter. Content, tools, data, and API surfaces are untouched: visual overhaul only.

**Visual thesis:** the site is a field manual issued to a recruit. Night-ops deep field (green-tinted charcoal), HUD cyan as the one signal color (data, interaction, links), XP gold for progress and earned value, stamp red for alerts and ink approvals, sage for support data. **Refusal list:** no gradients-as-decoration (flat color; texture = grain + survey dot-grid), no emoji-as-icon (replaced with tactical glyphs ◉ ▦ ◬ ∑ ⌖ ✦ ▦ ◫ ⌂ ✚), no glassmorphism, no pastel, no rounded-pill-everything, no motion without a job.

**What shipped:**
1. **Typography** — stencil/condensed military display per the brief: Black Ops One (h1s only), Barlow Condensed (section headers, kickers, nav, tool names), Barlow (body — "clean tactical sans"), JetBrains Mono kept for HUD readouts/data. `text-wrap: balance` on headlines, tabular numerals on all data.
2. **Motifs** (`assets/css/motifs.css`, new, documented with usage rules): P1 corner-bracket reticle frames (4-corner `.brk`), P2 ink stamps (CLEARED / 2026 VERIFIED / STANDING ORDER, stamp-slam impact motion), P3 segmented XP bars (quiz intel-gathering meter, homepage manual-readiness meter), P4 rank-insignia chevrons (phase rank ladder RECRUIT→COMMANDER on chapters; division tiers PLAN/MONEY/CONTENT on tools), S1 dossier folder tabs (hub groups, brief cards), S2 dossier kickers (`FIELD MANUAL // ENTRY 04 // PHASE 2`), ambient scanline sweep on briefing heroes (reduced-motion: removed).
3. **Homepage** — the mission briefing board: stencil `BUILD YOUR EMPIRE` with gold outline treatment, dossier pin-stripes, 2026 VERIFIED stamp slam, field chits, XP readiness bar, HUD-stat readouts (tabular numerals), transmission-tape ticker. Phase cards became dossier folders (corner brackets, LVL plates, rank chevrons, rank names); tool cards became briefing cards with division-tier color edges; honesty panel became a stamped STANDING ORDER.
4. **Chapters + reference pages** — mission-briefing headers: NATO-style entry numbering, stencil titles, dossier meta strips, rank insignia + rank name per phase; reference pages are INTEL FILEs with VERIFIED stamps; case files are DOSSIERs; prev/next nav reworded to operations language.
5. **Tool pages** — every one of the 19 now opens with a MISSION BRIEFING HUD plate (corner brackets, division kicker, tier chevrons, SYSTEMS ONLINE). Empire Simulator: stage bands keep color+opacity but now carry **S0–S4 numeral labels on every band** (non-color encoding) and the legend names each stage ("S0 · The Start Line") — the wave-26 chart watch item is closed.
6. **Custom details everywhere** — cyan selection, themed scrollbars, gold focus perimeters, footer rebuilt as a DEBRIEF with a CLEARED stamp on the (intact) not-financial/legal/tax-advice disclaimer, checklist completions earn a rotated CLEARED stamp, `.reveal` failure mode fixed (no-JS visitors now see everything — the `.js` gate), print stylesheet re-cut for the new palette (light dossier output).
7. **Honesty contract intact** — no income promises added anywhere; the disclaimer copy is unchanged and now literally stamped; all tool counts fixed to the real 19 (the homepage said 17/18 — stale since wave 27).

**Research applied:** `web-identity-20261011-2041` (thesis+refusal list, motif system rules, one `motifs.css`, one signature + one ambient motion, static-first failure mode, palette commitment) and `web-craft-20261011-2014` (motion tokens/physics, balance+tabular type rules, reduced-motion-as-variant, `.js`-gated reveals). Signature motion = stamp slam; ambient = scan sweep; XP fills are state feedback. Every motion element is `prefers-reduced-motion`-gated with the finished state as default.

**Watch items closed from wave 26:** stage-bands non-color encoding ✓ (numerals + named legend); print stylesheet no longer assumes the old light output ✓; `.sticker` variants replaced by stamps/chits with real jobs (approval marks, field tags) ✓.

**Tests:** `bash scripts/validate.sh` — **8/8 green** (17 passed, 0 failed; 0 broken links; clean rebuild byte-identical). All 11 engine suites green (1,146 assertions incl. sim-engine 189, platform-rules-bible 47).

Commit: 5aa7d71705326e7a10b513650fd320eff0ba77d0 (local) → 323a049f1bd315358254b60096a3d1d2240b5b15 (pushed 2026-10-11, remote tree verified via GitHub Trees API 200 — 294 entries, not truncated; all wave-29 files present).

---

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

Commit: 8ce0e616cf8e3cd5509e9e6a97b6782bbc40895b (local) → ba4dfaa456df1e09bc1dec2a84e604506018454a (pushed 2026-10-11, remote tree verified via GitHub Trees API 200 — all 4 wave-28 files in the recursive tree, not truncated).

**Merge complete 2026-10-11 (merge worker):** §A–§G applied — `REFERENCE_PAGES` gained the platform-rules-bible tuple (+ wayfinding script injection), `reference-pages` API description rewritten for all four pages, `tests/platform-rules-bible.test.js` appended to validate.sh stage 6, the staged CSS block appended to `assets/css/components.css` with the `text-wrap: balance` convergence deduped (wave 26's global `h1,h2,h3` rule covers it). Rebuild clean (9 chapters, 19 tools, 4 reference pages); validate.sh 8/8 green. Both fragments folded; fragment files deleted.

---

# Wave 27 — Cadence Coach: the Posting Cadence Optimizer (tool #19) (2026-10-11)

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
  + `web-craft-20261011-2025/`, read in full): applied to tool #19 —
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

Commits (local → remote, both pushed 2026-10-11, remote trees verified via GitHub Trees API):
- 40cce22 → b242b0abe94f91f906edf16a6e7d4b24cd65a99c (7 new files)
- 9bad039 → 54a055cae16ef217d3a66f0ac74cc6101ba85dad (web-craft design application + UI defaults fix; parented on b242b0a)
- b1664d0 → 58ded0e970cbaa8a0d956c7e293dc5560746b2b8 (hash fill; parented on 54a055c)
All 7 wave-27 files confirmed present on remote main; sibling lanes' committed files intact.
Merge attention needed: apply `MERGE-fragment-w27-tools.md` (B1–B8) after
wave 26 merges, then rebuild + revalidate; if wave 26 renumbered tools or
moved anchors, re-anchor per the fragment's notes. `WAVELOG.md` itself was
not touched per instructions — this fragment is the wave-27 entry.

**Merge complete 2026-10-11 (merge worker):** B1–B8 applied and re-anchored — wave 26 rebuilt Deal Analyzer in place (tool count stayed 18), so Cadence Coach lands as tool **#19**, not #20; all count strings now read 19/nineteen (plus the pre-existing "seventeen" drift on the `tools.json` endpoint description). Doc touch-ups applied (AGENT.md/README/API.md/agents.md + tool-drive row). Rebuild clean (9 chapters, 19 tools); validate.sh 8/8 green. Both fragments folded; fragment files deleted.

## Wave 26 — "The Deal Analyzer" 2.0 + Empire Simulator 4.0 UX leap (2026-10-11)

Scope decision (do not repeat): the wave-3 Sponsor Deal Analyzer already existed as tool #4 of 18 (slug `deal-analyzer`). Per the "know what exists" rule it was **rebuilt in place as "The Deal Analyzer" 2.0** — not a new tool #19. Tool count stays 18. The brief's "Deal Analyzer" name replaces "Sponsor Deal Analyzer" everywhere (TOOLS, TOOLS_API, footer, README, AGENT.md, agents.md).

**The Deal Analyzer 2.0** (`assets/js/deal-analyzer.js` UMD engine + new `deal-analyzer-ui.js` + rebuilt `pages/deal-analyzer.html`):
1. **Paste-the-terms evaluation** against real 2026 data: nano→mega tiers, YT 1.7x / TikTok 0.85x multipliers, 23%-listed-above-accepted landing zone, **niche-adjusted verdict ranges** via the simulator's `sponsorNicheMult` (finance/tech 2.5x, gaming/comedy/music 0.6x — parity pinned in tests), dedicated implied-CPM band **$50–$90** (AIR agency-benchmark compilation, Oct 11 2026 — verified compilation, underlying agencies single-source each), category CPM cross-check (Finance $58 … Entertainment $14, AIR compilation; education/lifestyle/music deliberately unmapped, never stretched).
2. **Contract red-flag checklist** (wave-22 checklist, single data source `deal-templates.json`): 10 contract-language questions map 1:1 to flag ids; same scoring as the Outreach Center (walk_away → don't sign, 3+ pts → don't sign); NOT-legal-advice intact. FTC flag refreshed with 2026 context (FTC targeting individual creators at scale; fines up to ~$53K/violation flagged uncertain; AI content needs its own disclosure).
3. **Counter-offer calculator**: base = top of niche-adjusted range + 2026 usage-rights line items (3mo +25–50% → 12mo +75–100% → perpetual open-ended "from 2x base", from the new `usage_rights_benchmarks_2026` block in `data/calculators.json` v1.4.0) + whitelisting 30–100%/mo + exclusivity premiums; bundle note (3+ posts: 15–20% off typical + 41% stat); honest 2-sig-fig rounding; usage lede quotes projectcasting 2026 ("a $300 video run as a paid ad for a year is a multi-thousand-dollar asset").
4. **Saved deal history** (localStorage, never transmitted), **comparison mode** (side-by-side of 2 saved deals: 5 verdict rows + differing terms), **export** (plaintext report + print stylesheet → Print/save-PDF). No income promises; "not financial/legal/tax advice" on every surface.

**Empire Simulator 4.0** (genuine UX leap, no new claims):
1. **`solveForGoal()`** (`assets/js/sim-engine.js`): "what would it take?" — integer binary-searches base growth (whole %, 2–60) or long-form cadence (half-videos, 0–14) to land subs/net/stage by a target month. Every answer re-verified by re-simulation; honest edges (already-there short-circuit, `unreachable`, `stage4_needs_team`); solver note says "the model's answer, not a promise". Verified: 100K subs by m18 → **23% growth**; stage 2 by m24 → 2.5 vids/wk. Goal-solver UI section with the Lilach Bullock reality check (<1% of YouTube channels ever reach 100K — single source, labeled).
2. **Live re-run** (debounced 800ms, toggleable, status line), **stage-banded subscriber chart** (5 Money Map stage bands + milestone dots + ⚡ event markers + stage legend), year-by-year cards, always-visible assumptions block (was a drawer), keyboard-focusable chart markers with visible perimeters, **toggleable data tables** under each chart (native `<details>` — non-hover readouts per the 2026 dataviz recipe), reduced-motion-safe scrolling + view transitions (plain swap for live runs / reduced-motion / unsupported).
3. **Calm mode**: the 2026 sensory-envelope toggle (TetraLogical anxiety-framework-backed) — user-activated stillness beyond the OS binary, persisted in localStorage, honored by every motion path.

**Design research applied** (web-craft round 1 + landed round 2, `~/workspace/research_notes/web-craft-20261011-2014/` + `-2025/`): text-wrap:balance on h1–h3; tabular-nums on chart ticks; 2026 motion-token scale (5 durations + 3 easings) in tokens.css; same-document view transitions gated on `!prefers-reduced-motion` + feature-detect (plain swap otherwise); cross-document VT as `@view-transition { navigation: auto }` inside no-preference; `:has()` + `:focus-visible` fieldset accent; `.eyebrow` numbered section labels + `.breadcrumb` on the analyzer; 65ch measure + `text-wrap: pretty` via `@supports` (Firefox status conflicted — no version cited); `content-visibility` on long result lists; failure-mode rule honored (finished state is the default, motion layered on). Deliberately skipped: container queries (`.calc-grid` already intrinsically responsive), scroll-driven reveals (working IntersectionObserver system kept), kinetic typography (Archivo static-weight; no font churn), Popover/anchor tooltips (SVG `<title>` + focusable groups are accessible), field-sizing (no textarea targets — noted for later). Identity kept; wave-28's `.platform-rules`-scoped work untouched (no collisions). Round-1 design notes integrated: web-craft-20261011-2014/notes/01–02 pre-wave; round-2 reports read in full (angle-2 award deconstructions, angle-6 dataviz recipe drove the chart tables). **llms.txt passes the Lighthouse 13.3 Agentic Browsing shape**: H1 + adequate length + real links (relative markdown links; missing = N/A, non-compliant = fail).

**Creator-economy research integrated** (`creator-economy-20261011-2010`, completed after wave start): the AIR category CPMs, $50–$90 dedicated band, 15–20% bundle stat, usage-rights lede, FTC 2026 context, algorithm-card basis note ("no creator-reported before/after data yet — ×0.6 is the planning assumption"). Deliberately not integrated: single-source "$15–80/1K views" (thinner than site bands), $2,000 1099 threshold (tax-legal, out of scope). **No new skill** — `deal-negotiation` owns offer evaluation; the analyzer is its executable UI.

**Agentic surface**: `tools.json`/`api/v1/tools.json` deal-analyzer record fully rewritten (2.0 input schema: niche/post_count/timeline/contract/payment_terms 15–90/output/drive notes); calculators schema extended (`usage_rights_benchmarks_2026` required + shape); simulator drive notes updated (solveForGoal, 4.0 UI). AGENT.md: Workflow 1 rewritten for 2.0 math, **Workflow 12** (full Deal Analyzer 2.0 run) + **Workflow 13** (goal solver), tool-drive row rewritten, version notes 1.3.0 → 1.4.0; pages/agents.md + README renames; API.md calculators v1.4.0; llms.txt "13 end-to-end workflows" + "eighteen tools".

**Tests**: new `tests/deal-analyzer.test.js` (99 assertions: validation, tier boundaries, niche parity with sim-engine, verdict pins, $50–$90 band, category pins incl. unmapped nulls, contractRisk parity vs Outreach, usage ranges from real JSON, counter totals, export/compare content, honesty contract); `sim-engine.test.js` 175→**189** (+solveForGoal: growth/cadence solve, re-simulation verification, unreachable/already-there/stage4-needs-team/bad inputs); `agent-workflows.test.js` 105→**121** (wf1 rewritten for 2.0 math via `require()`; +wf12 full 2.0 run; +wf13 goal solver). `scripts/validate.sh` stage 6 runs the new suite.

Validation: `scripts/build.py` clean (9 chapters, 18 tools, 12 skills, 9 case files, 18,028 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas, 0 broken links, byte-identical rebuild on the committed tree, 189 sim + 78 deal-room + 111 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach + 99 deal-analyzer engine assertions, 121 agent-workflow assertions). Honesty contract intact: no income promises; "not financial/legal/tax advice" preserved; RPM/CPM as creator-reported ranges; benchmarks are ranges, never quotes.

Commit: cef7557 (local) → pushed 2026-10-11, remote tree verified via GitHub API.

**Design-system notes for the upcoming "The Field Manual" identity rework** (next wave, per heads-up — NOT started here): current identity lives in `assets/css/tokens.css` (`--acid #c8ff2e`, `--coral`, `--gold`, `--violet`, `--cyan` on near-black `--bg #0b0b0d`; Archivo display / Space Grotesk body / JetBrains Mono; hard-offset sticker shadows `--shadow-pop*`; `.hud-panel`/`.hud-head` panels; `.sticker` variants; `.calc-grid` auto-fit cards). Motion tokens now centralized (`--dur-*`, `--ease-*`). Game-HUD direction maps cleanly: tokens → rank/XP palette, stickers → insignias, hud-panels → mission briefings. Watch items: `.sticker` color variants are decorative-only (no semantic token); chart stage-bands encode meaning in color+opacity (needs the legend for the rework's non-color encoding); print stylesheet assumes light output. The `deal-negotiation` skill + `DealAnalyzer` engine are presentation-agnostic — safe under any reskin.

## Wave 25 — Q4 2026 creator-economy research sweep + holiday-shopping-surge card (2026-10-11)

Research sweep (every-~5th-wave cadence): fresh Oct-2026 web research across Q4 advertiser budgets, holiday sponsorship rates, platform monetization changes, RPM/CPM data points, Feb-2027 YPP movement, TikTok Shop / live shopping numbers, and AI-content policy enforcement — every figure sourced; single-source items flagged; creator-reported ranges labeled. The honest outcome: the site's core numbers were **re-verified, not replaced** (the engine's +60% Q4 default sits inside the re-measured band; the 2026 rate-card tiers match three fresh benchmarks; YPP-2027 thresholds unchanged). Two genuinely new data points worth shipping: a 5th simulator event card for the Q4 buying window, and a Q4 playbook chapter section.

**Research (verified today, Oct 11, 2026):**
- Q4 seasonality re-verified: December CPM runs **40–60% above January** (AIR Media-Tech, 274 channels, full-year medians, crawled ~2h ago); estimates run to **+50–80% vs Q1** (CheckTheWorth, via passionfru.it); Nov/Dec RPM +30–50% vs Q1 (becomeviral). Exception: finance/tax channels often see RPM *rises* in Q1 (Influencer Marketing Hub) — seasonality isn't universal.
- Shorts niche RPM re-measured (AIR, 274 channels): Shorts return **3–14% of the same channel's long-form RPM** in almost every niche — most niches **$0.02–$0.20**/1K views, up to **$0.328** for US audiences (music exception: Content ID lifts to 41–60% of long-form).
- TikTok Creator Rewards: eligible countries now include **Mexico** (Hootsuite Oct 2026); qualified view = ≥5s on videos >1 min; creator-reported US payouts cluster **$0.40–$1.00**/1K qualified views with qualifying views ≈ half of raw views (AIR Oct 2026).
- TikTok Shop: H1 2026 **$50.3B global GMV** (+92% YoY; full-year pace ~$123B, Momentum Works/Tabcut via TubeFilter); US **$11.8B** (+103%, largest market); US attribution — Shop tab **51.4%**, video 40.4%, live 8.2%; live still grew 19% to $967M; 5,700 US stores crossed $1M GMV (8x); live conversion **8–12%** vs 2–4% ecommerce (ringly.io); BFCM 2025: **$500M over four days** (+50% shoppers), livestream brands +84% sales growth (TikTok Newsroom); eMarketer: US 2025 $15.82B (+108%), 2026 projected $23.41B.
- Holiday 2026 (Adobe Analytics forecast, Sept 28, 2026): **$275.1B** US online holiday spend Nov 1–Dec 31 (+6.7% YoY); Cyber Week $47.5B (+7.4%); affiliate/partner share of retail revenue **+12%**; social media share **+17%**; creators = **22% of affiliate traffic**.
- Sponsorship rates re-checked against three fresh 2026 benchmarks (Later: nano $100–500/post, micro $500–2,500; iBuildInfluence; Click Analytic) — consistent with the existing tier table. New nuance: **Black Friday per-post rates can run *lower* than normal** because brands buy in bulk, and affiliate commissions are often *cut* during BFCM week (Lilach Bullock, Oct 2026). 2026 usage-rights benchmarks: paid-ad usage 3mo +25–50%, 3–6mo +50–75%, 6–12mo +75–100%, perpetual from 2x; whitelisting 30–100% of base fee/month (projectcasting 2026). The 23%-listed-above-accepted / 41%-bundle-discount / 1.7x-0.85x constants stand unchallenged.
- YPP 2027: thresholds unchanged (multi-source reconfirmation); two new details — **Premium Lite creator pool = 60% of net Premium Lite revenue vs 30% for regular Premium** (AIR, Oct 2026), and the fan-funding tier migrated to the Commerce Product Module (same terms). "First significant changes since 2018"; YouTube-stated it expects to pay creators more in 2027 than 2026 (platform-stated, via gadgets360).
- AI enforcement: May-2026 auto-labeling of undisclosed photorealistic AI (overlay on Shorts, label below player on long-form; permanent for Veo/Dream Screen/C2PA; consistent non-disclosure can escalate to content removal / YPP suspension; disclosure itself doesn't limit distribution — AIR, Oct 2026); Jan-2026 "inauthentic content" enforcement wave; Instagram tightened rules around AI-generated-people accounts (Oct 2026, single-source). Ignored as slop: an unverified Medium piece claiming "Revenue Share 2.0 / 90% subscription share" for TikTok.

What shipped:
1. **New simulator event card `holiday-shopping-surge`** (`assets/js/sim-engine.js`): the event month + the next month, affiliate revenue **×1.8** (the two-month holiday buying window); ads/sponsors/subs/growth untouched. Research basis cited on the card: TikTok Shop BFCM 2025 + Adobe's 2026 holiday forecast; the 1.8 is a labeled engine assumption. Per-month records carry `affiliateMult`; `eventsActive` pins the start month; the assumptions drawer + exportPlan pick the card's effect up automatically. The card renders from `DEFAULTS.eventCards` — the simulator UI needed no edits. (`build.py` regenerates `api/v1/tools.json` from its own definitions — the 5th card's enum/description/drive-notes were added there, not to the generated file.)
2. **Q4 playbook** (new section in Phase 5): the Adobe $275.1B forecast + affiliate/social share gains; commercial-intent content strategy for Oct (gift guides, deal coverage, review roundups — double-earning via uplift + affiliates); sponsor timing (pitch Aug–Sep, Q4 budgets close early; BFCM bulk-rate and affiliate-cut caveats) tied to the [Outreach Center](outreach.html); the shopping-season stack (TikTok Shop BFCM numbers, live sessions, the `live-shopping-playbook` skill). Closes with the honesty rule: benchmarks are ranges, never promises.
3. **Monetization chapter refresh**: Layer 1 Q4 line re-verified with the AIR +40–60% band + the Q1 finance exception; Shorts niche RPM data added; TikTok Rewards details updated (Mexico, qualified-view definition, qualifying-share honesty); new disclosure-enforcement paragraph (May-2026 auto-labeling, Jan-2026 inauthentic wave, Instagram AI-people accounts); YPP table gained the Premium Lite row + fan-funding module note; Layer 2 TikTok Shop paragraph updated with the H1-2026 GMV/attribution/conversion numbers.
4. **Rate card**: new holiday-2026 pricing note (BFCM bulk-rate + affiliate-cut caveats) and 2026 usage-rights benchmarks in the negotiation data; date line refreshed to the wave-25 sweep. Tier table and the 23%/41%/multiplier constants unchanged — reconfirmed, not stale.
5. **Data layer** (`data/calculators.json` v1.2.0 → **v1.3.0**): new `q4_seasonality_2026` + `tiktok_shop_2026` + `shorts_rpm_niche_2026` blocks (every figure sourced); TikTok Rewards threshold detail (Mexico, qualified-view def, US payout range, qualifying share); `revenue_splits` gained the Premium Lite 60%-of-net pool share; `sponsorship_rate_card_2026` gained the `holiday_2026_note`.
6. **Agentic surface**: `tools.json` simulator record — 5-card enum + updated card/drive-notes copy (via build.py); AGENT.md (Workflow 11 step 1 names the 5th card, ×1.8/2-month effect; version note 1.2.0 → 1.3.0; Workflow 4's "4 cards" → 5); pages/agents.md (workflow 7 + the calculators version note); API.md calculators section (v1.3.0 block list); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: `live-shopping-playbook` owns the live-shopping procedure, `sponsorship-pitch` owns outreach; the card is a simulator input covered by the schema + Workflow 11.
7. **Tests**: `tests/sim-engine.test.js` 166→**175 assertions** — new block pins the card (×1.8 exactly 2 months, affiliates back to baseline in month 7, `affiliateMult` trace, ads/subs untouched, `eventsActive` start-month pin, assumptionLines names card + 1.8, research basis citation, DEFAULTS length 4→5); `tests/agent-workflows.test.js` 104→**105 assertions** (wf11: 5-card enum match against the real tools.json, executed ×1.8/2-month pin vs baseline).

Validation: `scripts/build.py` clean (9 chapters, 18 tools, 12 skills, 9 case files, 18,028 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the 5-card events enum, 0 broken links (2,694 checked), byte-identical rebuild on the committed tree, 175 sim + 78 deal-room + 111 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 105 agent-workflow assertions). Honesty contract intact: no income promises; "not financial/legal/tax advice" copy preserved; all new figures sourced with single-source flags; the ×1.8 is the engine's labeled assumption, never platform data.

Commit: 8ac3e47 (local) → 45561c83a51f489cf4690fe1fe64261a69056187 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-25 files in the recursive tree).

## Wave 24 — Empire Simulator 3.0: 36-month projections, what-if event cards, stage transitions (2026-10-11)

Engine v2.0.0: the simulator grows from a 12/24-month sandbox into a full 36-month planning instrument — multi-year compounding with honest decay, the five Money Map stages placed per month, and four toggleable what-if event cards with chapter-cited assumed effects. Plus three new scenarios from the 2027 outlook and a shared two-path outcome chart for A/B comparisons. Honesty contract intact throughout: no income promises; "not financial/legal/tax advice" copy preserved; every event multiplier is the engine's labeled assumption, never platform data; every 36-month number is a scenario model, never a prediction.

What shipped:
1. **36-month projections** (`assets/js/sim-engine.js` — `horizon` now 12/24/36, clamped at 36; hire `startMonth` and `digital_start_month` clamps extended to 36): year-2 decay ×0.94/mo after month 12 (unchanged), new year-3 decay ×0.97/mo after month 24 — growth slows, stays positive, never collapses (plateau, not collapse). Q4 uplift months 34–36. 12-month math is byte-identical to v1 (all wave-13 pins still pass unmodified).
2. **What-if event cards** (`DEFAULTS.eventCards`, 4 cards; `inputs.events = [{id, startMonth}]`, `normalizeEvents()`): **algorithm change** (Shorts views ×0.6 from the card month — the Oct-1-2026 originality update, per the algorithm signal map); **viral hit** (event month long views ×10, subs get a one-time +8% lift only, next month ×1.5 tail — the reality check is in the card copy: virality spikes views, not loyalty); **burnout break** (2 months: growth 0%, subs −0.5%/mo drift, views ×0.3 back-catalog); **policy change** (Feb-2027 YPP rules: rolling-90d Shorts views under 10M ⇒ Shorts ads $0 that month, long-form pays as usual — the YPP checker's floor logic, monthly application). Each card names its assumed effect + chapter basis; per-month records carry `eventsActive[]`, `shortsFloorBlocked`, `viralMonth`.
3. **Money Map stage transitions**: `stageForNet(net, teamActive)` (exported, single source — the UI and tests use it): net <$100 ⇒ stage 0, <$1K ⇒ 1, <$10K ⇒ 2, ≥$10K ⇒ 3, team + ≥$10K ⇒ 4. Every month gets a `stage`; `res.stages` lists each stage's first month; `endStage` on the export. Stage journey stickers on the results page, a Stage column in the ledger, and the stage journey in `exportPlan()`.
4. **Three new 2027-outlook scenarios** (library 9→12): `sleep-ambient` (case file: Fortune-verified $40–60K/mo network, Dec 2025 + 2027 outlook "stable, 14x breakout" with the Jan-2026 enforcement caveats; lifestyle proxies declared, from-scratch planning assumptions only); `english-learning` (OutlierKit 21x breakout, $18–22 CPM — sits above the education RPM band, so `rpmLevel: high` = the band's honest $10 ceiling, stated in the source line); `senior-health` (OutlierKit 19x breakout, ultra-low competition; 31% of mini-drama viewers are 45–64, Ampere). Verified 36-month runs: english-learning net $17,172 baseline vs $17,045 with the month-12 algorithm cut (long-form-heavy — the cut bites hardest where Shorts ARE the business: betrayal-dramas $3,447 → $2,633, −24%).
5. **Strategy compare 3.0**: the horizon select drives both paths (12/24/36); new shared net-revenue chart (two lines, A=acid / B=coral, one clock) above the delta table; assumptions panels for both sides unchanged and always visible. `compare()` needed no shape change — deltas stay B minus A at any horizon.
6. **UI**: horizon selector replaces the 24-month checkbox; event cards render from the engine's card library (copy can never drift from the math); the assumptions drawer lists year-2/year-3 decay, all four card effects, and the stage rule; end-stage joins the stat grid; ⚡ marks event months in the ledger. ARIA/ keyboard/ prefers-reduced-motion conventions unchanged.
7. **Agentic surface**: `api/v1/tools.json` simulator record — description (12–36 months), `input_schema` (12 scenario ids, horizon enum [12,24,36], `events[]` with the 4-card enum + `start_month`, hire/digital clamps at 36), output contract (36-mo P&L, stages, events), drive notes (`normalizeEvents()`, `stageForNet()`); AGENT.md — new **Workflow 11** (the full 36-month + what-if run, executed against the real files: month-13 ×0.94, month-25 ×0.97, stage transitions, ×0.6 Shorts cut, B-minus-A compare) + the tool-drive row (12/24/36, `events[]`) + workflow-4 input updates (12 presets); pages/agents.md — workflow 4 updated (12 presets, 3.0 inputs) + new workflow 7 (36-month + what-if); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: the cards are simulator inputs, driven via the engine + Workflow 11; no existing skill owns scenario stress-testing, and the schema + workflow cover agentic use.

**Tests**: `tests/sim-engine.test.js` 84→**166 assertions** — §36-month projections (pinned decay math month-13/25/36, growth positive at month 36, year-3 Q4 months 34–36, horizon cap now 36, hire clamp at 36), §stage transitions (all four boundary pins incl. the $100/$10K exact-boundary checks, team+net⇒4, transitions only rise, endStage consistency, the five Money Map names), §what-if events (per-card effect pins with views-per-sub normalization where compounding applies: algo ×0.6 + long-form untouched + start-month pinning, viral 10x / +8% subs / 1.5x tail / views-per-sub back to 1x after, burnout exactly 2 months + −0.5% drift + ×0.3 view rate, policy floor blocks small-scale Shorts ads but spares long-form and clears above 10M/90d; unknown-id drop, startMonth default/clamp), §compare on 36 months (same clock, B-minus-A, "over 36 months" verdict), §new scenarios (12 presets, each simulates 12 finite months on a real RPM band, 2027-outlook/case-file source citations); `tests/agent-workflows.test.js` 88→**104 assertions** (wf4: 12 scenario presets, horizon 12|24|36 + `events` in the schema; new wf11 block executing AGENT.md Workflow 11 against the real JSONs — card library discovery, decay pins, stage-boundary pins, ×0.6 cut, 36-month compare, exportPlan stage journey + event line). Wired into `validate.sh` stage 6 (existing entries).

Validation: `scripts/build.py` clean (9 chapters, 18 tools, 12 skills, 9 case files, 17,224 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the extended simulator input schema with `events`, 0 broken links (2,693 checked), byte-identical rebuild on the committed tree, 166 sim + 78 deal-room + 111 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 104 agent-workflow assertions).

Commit: 15ffa6f (local) → d0622df031ebaaa5095efcea35af099775a1ef39 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-24 files in the recursive tree).

## Wave 23 — Content Engine 2.0 (2026-10-11)

Engine v1.1.0 + data contract v1.1.0: the Oct-2026 algorithm research integrated as a source-labeled signal map, six trend-derived hook patterns, an interactive weekly batch scheduler, and a new Cross-Post Optimizer tool (#18) — all wired through `ContentEngine.*`, the API, and the agentic surface. Honesty contract intact throughout: no income promises; "not financial/legal/tax advice" copy preserved everywhere; RPM/CPM-adjacent figures stay creator-reported with source labels; every algorithm claim carries `source_label` (platform-published / verified-multi-source / single-source / creator-lore) so agents and readers know what weight to give it.

**Research (wave-fuel Mission A, read 2026-10-11 — integrated, every claim labeled):**
- TikTok hierarchy re-verified as three-source consensus (Hootsuite, Vamp, fivebbc): completion + watch time dominate → rewatches/shares/saves → quality-weighted comments → likes declining; interest graph, not social graph; TikTok-as-search-engine (Vamp, fivebbc); platform-published: no reused/unoriginal/engagement-bait recommendations (viral.app citing TikTok docs, Sept 2026). Single-source/lore items explicitly flagged: 40–50% weight estimate (DMA), watch-time-per-impression beating raw views (DMA), 300–500 test pool (marketing_brain SKILL.md), 3s→5s qualified-view shift (virvid.ai).
- YouTube Shorts Oct-1-2026 update (platform-published: Rene Ritchie, Creator Insider + TeamYouTube community post; reported multi-source via Social Media Today, Storyboard18, readus247): channel-level reach cut for re-uploaded/aggregator content, originals prioritized, recommendations-only (payouts unchanged), commentary/unique-edits carve-out; May-2026 AI disclosure enforcement — labeled photorealistic AI gets normal distribution, undisclosed faces reduced recommendations/removal (Ritchie via aituber). Shorts search filters (Dataslayer/MeltedStories, single-source) and retention thresholds ~65%/~50% (Dataslayer, creator lore) flagged as such.
- Reels ranking (Mosseri-stated = platform-published via Virvid/CreatorFlow): sends per reach #1 > watch time > completion/rewatches > likes per reach > comments; the "sends are 3–5x a like" number debunked as invented (CreatorFlow); ~100 scored for Reels chaining (SocialPilot citing Meta, single-source); >3min not pushed to non-followers + 7–30s sweet spot (orangemonke, single-source); TikTok watermarks deprioritized (FlowShorts, single-source).
- Trend formats (SocialPilot Sept 25–Oct 5, New Engen, Later Oct 2, MediaNug 10/1, Virlo): Ramalama Costume Walk (430.7K videos), Patient Zero edits (149.3K), Be OK happy-dance-over-chaos, Text From "-A" (53.5K), cozy-fall jazz beds (5 of Metricool's Oct-1 top-10 sounds), upside-down before/afters — used as *structural patterns with mechanics*, never trend-chasing.

What shipped:
1. **Algorithm signal map** (`algorithm_signals` in `data/content-engine.json` v1.1.0; `ContentEngine.algorithmSignals(platform)`): 3 platforms, rank-ordered hierarchies + mechanics, every claim with `source` + `source_label`. Phase 3 chapter refreshed with the same labels (TikTok lore caveats, Reels single-source flags) and a new "algorithm cheat sheet (Oct 2026)" index-card table linking the Cross-Post Optimizer. The Short-Form Playbook's existing sourced sections were already current — no rewrite needed.
2. **Hook Library 2.0** (`hook_patterns`, 6 records; `ContentEngine.hookPatterns()`): Costume Reveal Walk, Leaving Edit, Joy Contrast, Hidden Confession, Cozy Bed, Upside-Down Flip — each with formula, the mechanic it exploits (completion/sends/rewatches/watch time/saves/shares), its Oct-2026 spotted-in source, and an adapt-don't-copy line. New static section on the Hook Builder page; machine-readable in the API. "Structures, not sounds" framing + honesty note (patterns improve odds, never guarantee views).
3. **Weekly batch scheduler** (`batching_scheduler` defaults; `ContentEngine.planBatchWeek({weeklyHours, longsPerWeek, shortsPerWeek, restDay, taskMinutes})`): weekly hours blocked into film/edit/publish day-blocks (8h/day cap, blocks in order, rest day non-negotiable), verdict holds/tight/over with lever guidance, pure arithmetic on the creator's inputs. New section on the Batching Planner page (tool #13) with optional per-task-minute overrides; defaults explicitly labeled adjustable starting estimates, not benchmarks.
4. **Cross-Post Optimizer** (`pages/crosspost.html` → `site/crosspost.html`, tool #18; `ContentEngine.adaptChecklist(source, destinations)` + `assets/js/crosspost-ui.js`): source + destination pickers → per-destination adaptation cards (hook rework, captions, CTA, audio rights, disclosure labels, grammar notes) with tick-off checklists + progress, the 6 universal checks, the Oct-1 channel-level gate callout, and a photorealistic-AI disclosure reminder. Data: `adaptation_matrix` (4 platform grammars, 12 source→destination rule sets, 6 universal checks, the gate). No-JS fallback summarizes the universal rules.
5. **Agentic surface**: `api/v1/tools.json` 18th record with draft-07 `CrossPostInput` schema (`source_platform`, `destinations[]`, `photorealistic_ai`) + output contract + drive notes; batching `input_schema` extended with `weekly_hours`/`rest_day`/`task_minutes`; `api/v1/content-engine.json` v1.1.0 mirrored to `site/api/v1/`; `api/v1/schema/content-engine.json` extended for the 4 new blocks (generated by build.py); `api/v1/index.json` tool counts + content-engine description updated (17→18); AGENT.md (18 tools; new **Workflow 10** driving the optimizer via `adaptChecklist()`; Workflow 6 gained the 2.0 extras; Cross-Post Optimizer row in the tool-drive table); API.md (18 tools, 10 workflows, content-engine v1.1.0 endpoint); `pages/agents.md` (surface table + workflow 7th step); README (18 tools listed); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: the `content-repurposing` skill owns the pillar-to-everywhere SOP (the optimizer is its per-destination checklist UI), `hook-writing` owns hook craft; the tools.json record + Workflow 10 cover agentic use.

**Tests**: `tests/content-engine.test.js` 49→**111 assertions** — new §7 planBatchWeek pinned fixtures (default-minutes 20h week → 14h required / film 4.5 + edit 8.25 + publish 1.25 / Mon–Thu dealing with the 8h cap; over/tight/holds verdicts incl. −9h slack; custom task minutes; rest-day shift; NaN/negative clamping; blocks sum to required), §8 hook patterns (6 ids, mechanic/spotted_in/source presence, engine↔data content match, structures-not-trends framing, no-prediction honesty note), §9 adaptChecklist (all 12 rule sets resolve with 3+ substantive changes, engine↔data byte-match per rule set, watermark rule on tiktok→reels, AI-disclosure rule on tiktok→shorts, universal checks + gate, unknown-source/unknown-dest/self-dest/case-insensitivity edges), §10 algorithm signals (3 platforms, rank ordering, all four source_labels valid, TikTok hierarchy = verified consensus, Shorts Oct-1 + disclosure rules platform-published, Reels sends #1 + 3–5x debunk, engine↔data match, disclaimer intact); `tests/agent-workflows.test.js` 79→**88 assertions** (wf2: 18 tools + crosspost schema-field check; new wf10 block executing AGENT.md Workflow 10 against the real JSONs — 2-card plan, disclosure/watermark rule pins, engine↔data byte-match, gate, edge cases). Wired into `validate.sh` stage 6 (existing entries).

Validation: `scripts/build.py` clean (9 chapters, 18 tools, 12 skills, 9 case files, 17,224 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the extended content-engine doc, 0 broken links (2,693 checked), byte-identical rebuild on the committed tree, 84 sim + 78 deal-room + 111 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 88 agent-workflow assertions).

Commit: 1a09e6d (local) → 22b2a562bbac554c7498a4a04bcf7d7746237309 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-23 files in the recursive tree).

## Wave 22 — Deal Room 2.0: The Outreach Center (2026-10-11)

Tool #17: the outbound half of the Deal Room — a sponsor outreach command center with a localStorage pitch pipeline, an honest pitch email generator, an interactive "what should I charge?" rate calculator wired to the re-verified 2026 rate card, and a contract red-flag checklist with plain-language risk summaries. Honesty contract intact throughout: no income promises, no invented stats (every pitch number is a [bracketed] placeholder the creator fills), usage rights stay separate line items, and the "not financial/legal/tax advice" copy — plus a prominent NOT-legal-advice line on the contract checklist — is everywhere it needs to be.

**Research (re-verified today, Oct 11, 2026 — rate-card figures, per brief):**
- The site's tier table confirmed against a fresh AIR Media-Tech crawl (updated ~1 day ago): nano/micro/macro/mega YouTube $200–$1K / $1K–$10K / $10K–$50K / $50K–$300K+, IG Reel median $22.40 CPM, integrated slot $20–$35 — identical to our `sponsorship_rate_card_2026`.
- "Creators list rates ~23% above what they accept" reconfirmed via projectcasting (InfluenceFlow 2026, 1,347 creator profiles; nano gap biggest at 28%) — the 0.23 constant stands.
- "41% offer package discounts on 3+ posts" reconfirmed via the same source — carried into the quote guidance.
- Platform multipliers (YouTube ~1.7× Instagram, TikTok ~0.85×) checked against Oct-2026 tables (RZLT/InfluenceFlow: TikTok 10–25% lower per-piece; AIR tables show YouTube ~1.7–2× IG) — consistent, kept labeled as wave-1 research rather than a fresh benchmark.
- The deliverable-CPM bands already in data (`youtube_integrated_slot` $20–$35, `ig_sponsored_reel_median` $22.40, rule-of-thumb dedicated $20–$50) all still current per the AIR/projectcasting pieces; projectcasting's "price the usage separately — always" reinforces the line-item architecture.

What shipped:
1. **Outreach pipeline tracker** (`pages/outreach.html` §1 → `site/outreach.html`, localStorage `cge.outreach.deals.v1` — never transmitted): brand, contact name, email, date pitched, status (pitched → replied → negotiating → signed → passed), one 7-day follow-up date, notes. Pipeline stats (contacted, response rate, active deals, signed/close rate — with the "~5% reply rate is normal" note from the sponsorship-pitch skill) and follow-up reminders (overdue / due today / upcoming buckets, signed+passed auto-excluded). Advance/remove actions, aria-live confirmations, keyboard-native.
2. **Pitch email generator** (§2): 3 templates in `data/deal-templates.json` v1.1.0 — cold pitch (under 120 words, from the skill's subject/body procedure), the one 7-day nudge (permission line "no reply needed — I won't write again"), warm intro. Placeholder fields render data-driven from each template's `placeholders[]`; unfilled [brackets] stay visible in the output and trigger a warning (never invent stats); copy-to-clipboard with fallback; every template carries `grounded_in` + `honesty_note`; anti-spam contract on-page (one targeted email per brand, one nudge, never bulk).
3. **"What should I charge?" rate calculator** (§3): followers → tier → 2026 rate-card range; top-of-range quote point with the 23% expected-close math (~$7,700 on a $10,000 open); implied-CPM cross-check against the deliverable band (integrated $20–$35 reported / dedicated $20–$50 rule-of-thumb labeled as such / short-form $10–$30 or the $22.40 IG median); the 41% bundle-discount guidance and the 1.7×/0.85× cross-platform note; usage-rights explicitly excluded from the total (separate line items, link to the Deal Room). Ranges only, disclaimer attached.
4. **Contract red-flag checklist** (§4): 10 new contract-specific flags in `deal-templates.json` v1.1.0 (IP assignment, one-sided termination, vague "all media" usage grants, auto-renewing exclusivity, view-guarantee clawbacks, one-sided morality clauses, missing payment schedules, open approval, missing FTC language, scope-creep language) — additive to the Deal Room's 6 offer red flags, not a duplicate. Interactive scoring (any walk_away flag or 3+ points → "don't sign as written") with a per-item plain-language fix and a prominent NOT-legal-advice disclaimer (contracts above $500 deserve a real lawyer's eyes, per the deal-negotiation skill). Persisted to localStorage.
5. **Engine** (`assets/js/outreach.js`, UMD — browser + `require()`-able in node): `validDeal`, `pipelineStats`, `dueFollowUps`, `quoteCalc`, `renderPitch`, `contractRisk` (+ `tierOf`/`nice`/`fmt` helpers, `LISTED_VS_ACCEPTED = 0.23`); UI wiring in `assets/js/outreach-ui.js` (pure-math-free). The Deal Room page gained a cross-link to the Outreach Center.
6. **Agentic surface**: `api/v1/tools.json` 17th record with draft-07 `OutreachInput` schema (pipeline + quote + pitch + contract fields) + full output contract + drive notes; `api/v1/deal-templates.json` v1.1.0 mirrored to `site/api/v1/`; `api/v1/schema/deal-templates.json` extended for the new keys (hand-maintained); `api/v1/index.json` deal-templates description + records note updated (16→17 tool counts everywhere: tools hub, index page, tools endpoint, llms.txt); AGENT.md (17 tools, new **Workflow 9** driving the full outbound loop via `Outreach.*`, Outreach Center row in the tool-drive table); API.md (17 tools, deal-templates shape v1.1.0); llms.txt/llms-full.txt regenerated. **No new skill** — no genuine gap: the `sponsorship-pitch` skill owns the outbound procedure (targeting, email, pricing, pipeline), `deal-negotiation` owns offer evaluation, `rate-card-reader` owns rate lookup; the Outreach Center is their executable UI + the tools.json record and Workflow 9 cover agentic use.

**Tests**: new `tests/outreach.test.js` (**92 assertions** — data contract (3 templates, 10 flags, no hard $ amounts in any template body, cold pitch ≤120 words, nudge permission line), validDeal incl. email sanity, pipelineStats over a pinned 10-deal fixture (40% response / 10% close), dueFollowUps buckets vs a fixed "now" (signed/passed/dateless excluded), quoteCalc against the REAL rate card (tier boundaries at 9,999/10,000/999,999/1,000,000; micro/YouTube $1,000–$10,000 → $10,000 quote → $7,700 expected close; implied CPM 250 flagged above the $20–$35 band; dedicated uses the labeled rule-of-thumb band; IG short uses the $22.40 median; no-views → no invented CPM), renderPitch placeholder honesty, contractRisk scoring incl. 2 walk_away pins + point math + unknown-id tolerance + NOT-legal-advice disclaimer); wired into `validate.sh` stage 6; `agent-workflows.test.js` wf2 updated 16→17 tools + outreach schema-field check, new wf8 block for AGENT.md Workflow 9 (79 assertions total, incl. the pinned $10,000/$7,700/250-CPM walk-through against the real JSONs).

Validation: `scripts/build.py` clean (9 chapters, 17 tools, 12 skills, 9 case files, 16,844 words); `scripts/validate.sh` **8/8 GREEN** (JS syntax, JSON parse, draft-07 schemas incl. the extended deal-templates doc, 0 broken links (2,626 checked), byte-identical rebuild on the committed tree, 84 sim + 78 deal-room + 49 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker + 92 outreach engine assertions, 79 agent-workflow assertions).

Commit: b366a1ed12f61f83cb511f5865d67ca078db18e9 (local) → 94633616a3052d65da72a6732cb3898991972336 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-22 files in the recursive tree).

## Wave 21 — YPP 2027 Eligibility Checker + monetization chapter refresh (2026-10-11)

Tool #16: an interactive current-vs-2027 YPP eligibility checker, plus the monetization chapter rewritten around the confirmed Feb-2027 rule sets, two documented YPP case files, and the full agentic-surface update. Every figure sourced; honesty contract intact (no income promises; "not financial/legal/tax advice" copy preserved).

**Research (verified today, Oct 11, 2026):**
- 2027 YPP changes reconfirmed against a fresh crawl — multi-source and consistent (AIR Media-Tech, AuditSocials, Tablet News, GSMDome, Eastleigh Voice, passionfru.it; announced by YouTube Aug 10, 2026 via official blog + Creator Insider video w/ Amjad Hanif): new applicants 1,000 subs + **8,000** qualified watch hours/365d **or** 20M qualified Shorts views/90d; the **10M qualified Shorts views/90d Shorts Creator Pool + Shorts Premium floor, checked monthly** (below it: stay in YPP, long-form keeps paying, Shorts pay stops that month); partner activity test (1,000 hours/365d OR 1M Shorts views/90d OR 2 longs / 5 Shorts per 90d, 90-day recovery window); fan-funding tier unchanged; updated terms due Jan 31, 2027; applications reaching YouTube by 23:59 UTC Jan 31, 2027 judged at the old 4,000-hour bar (AIR partner-support team). New detail this wave: activity-test legs, terms deadline, below-floor incentives (Shopping bonuses, brand-deal incentives, trend boosts), Premium Lite expansion, revenue shares unchanged (55% / 45% / 70%).
- Current rules re-verified (YouTube published eligibility via AIR guide ~Oct 10, 2026 + multi-source press): 1,000 subs + 4,000 hours/12mo OR 10M Shorts/90d; fan-funding 500 subs + 3 uploads/90d + 3,000 hours OR 3M Shorts; qualitative "inauthentic content" gate (Jul 2025); ~1-month review.
- Oct-1-2026 Shorts originality update re-confirmed (Rene Ritchie via Creator Insider; TechJuice, Digital Trends, ppc.land, Search Engine Journal): recommendations deprioritize re-uploaded clips; VO-narration/minor-edits/template-changes don't count as original.
- RPM refresh: OutlierKit Sep-2026 table (personal finance $10–25, legal & tax $8–22, AI & tech $4–11, gaming $2–4, entertainment $1–3) with AIR's 300-channel medians as the honest counterweight (education & science $10.22, entertainment $2.43, gaming $2.05, kids $0.33, business & finance $2.01 on 3 channels).

What shipped:
1. **YPP 2027 Eligibility Checker** (`assets/js/ypp-checker.js` + `pages/ypp-checker.html` → `site/ypp-checker.html`, TOOL 16, own stylesheet `assets/css/yppchecker.css`) — UMD engine (browser + node) like the video-doctor: `validInput()` / `check()` / `RULES` with per-rule-set source strings. Inputs: subs, watch hours/12mo, Shorts views/90d, uploads/90d, originality, format mix. Output: current-rules verdict vs 2027-rules verdict side by side (per-check pass/fail), fan-funding tier, the 10M Shorts floor check, the partner activity test, gap math (incl. per-day rates), the shorter-walk note, the Oct-2026 originality warning when repurposed/reposted content with Shorts is in play, and a chapter-grounded close-the-gap plan (Phase 1/2/4, Hook Builder, Video Doctor, Planner, Playbook, Money Map — all links verified real). The "at-or-above bar" case yields the second-gate step (qualitative review + Studio checklist), not gap steps. Aria-live results, keyboard-native form, localStorage last-input, full no-JS fallback (both rule sets in one paragraph each), prefers-reduced-motion honored, every verdict carries the verify-live-in-Studio disclaimer.
2. **Monetization chapter refresh** (`content/phase-5-monetization-stack.md` → rebuilt): Layer-1 RPM table rewritten from the Oct-2026 data (OutlierKit table + AIR medians + breakout multiples, all creator-reported); the "watch-time is the real gate" paragraph replaced with the two-rule-set comparison table + the Shorts-only-channels triple-squeeze warning (avoid-list + two new case files linked) + the checker cross-link; checklist gained the checker, Deal Room, Niche Atlas, and Money Map items; new inline Money Map / Niche Atlas cross-link paragraph.
3. **Two new case files** (documented industry arcs from reporting, no invented creators): `case-clippers-squeeze.md` (Kenya's clip industry: KSh 130–520/1K views, KSh 130K–520K per piece via Kenyan Mirror; Oct-1 reach cut via TechJuice/Digital Trends/SEJ; the $1.4M-in-five-weeks boom via Clownfish TV; the Feb-2027 floor as the second squeeze) and `case-shorts-floor.md` (the monthly 10M floor as a subscription: ~111K views/day, below-floor stack of sponsors/affiliates/Shopping/memberships, Jan-31 terms deadline, the broadcasters' "marketing tool, not a revenue line" posture via Barrett Media). Both follow the case-file structure (arc, revenue stack, 3 decisions, steal, NOT-copy, sources).
4. **Agentic surface**: `api/v1/tools.json` 16th record with draft-07 `YPPCheckerInput` schema (`subs`, `watchHours`, `shortsViews`, `uploads90d`, `originality`, `formatMix`) + full output contract + drive notes; `api/v1/index.json` tools endpoint description (fourteen→sixteen); AGENT.md (9 phases, 16 tools, 12 skills, 9 case files; new **Workflow 8** driving the checker via `YppChecker.check()`; ypp-checker row in the tool-drive table); API.md (all nine case files, updated list); llms.txt/llms-full.txt regenerated (16 tools, 9 case files, AGENT.md workflows 8). No new skill — no genuine gap (the tools.json record, Workflow 8, and drive-table row cover agentic use; none of the 12 skills overlaps).

**Tests**: new `tests/ypp-checker.test.js` (**84 assertions** — input validation incl. NaN/negatives, all threshold pins (4K/8K hours, 10M/20M shorts, 10M floor, activity legs, fan-funding unchanged), 6 pinned fixtures of current-vs-2027 verdicts with gap math, exact-boundary checks (9,999,999 misses by 1; exactly 4K hours passes current), originality-warning gating, plan link-target validity, honesty contract enforced in-test (disclaimer present, no guarantee language, no income-promise phrasing, both rule sets carry sources)); wired into `validate.sh` stage 6; `agent-workflows.test.js` wf2 updated 15→16 tools + ypp-checker schema-field check (67→68 assertions).

Validation: `scripts/build.py` clean; `scripts/validate.sh` **8/8 GREEN** (27 JS files node --check, 31 JSON files parse, draft-07 schemas, 0 broken links (2,561 checked), byte-identical rebuild, 84 sim + 78 deal-room + 49 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas + 84 ypp-checker engine assertions, 68 agent-workflow assertions).

Commit: f266741 (local) → a7b31ddb3d12655073779034f53cee5b7f063f45 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-21 files in the recursive tree).

## Wave 20 — Niche Atlas 2.0: the 2027 Niche Outlook (2026-10-11)

Fresh research (observed Oct 11, 2026) integrated as a full "2027 outlook" layer on the Niche Atlas — the research mission the task brief specified, every figure verified, single-source items flagged, honesty contract intact.

**Research (sourced, verified today):**
- TubeAI/AIR channel-growth figures reconfirmed against a fresh crawl (kids 1.59%, ASMR 1.56%, creator economy 1.50%, challenges/stunts 1.47%, AI/ML 1.44%, true crime 1.34% — all-channel median 0.97%/mo).
- OutlierKit Sep-2026 refreshed RPM/CPM table: personal finance $10–25 RPM, legal & tax $8–22, AI & tech $4–11, gaming $2–4, entertainment $1–3; breakout multiples (AI tutorials 18x, betrayal/revenge 21x $20–25 CPM, English learning 21x $18–22, senior health 19x $14–18 ultra-low, video podcasts 15x $12–18, rural homesteading 16x $12–16, manhwa/webtoon recaps 5.8x $15–19, sleep 14x $16–20).
- AIR Media-Tech monetization statistics (fresh): median RPMs education & science $10.22, gaming $2.05, entertainment $2.43, kids $0.33 — included as the honest counterweight to advertiser-CPM lists (business & finance median only $2.01 on 3 channels, directional).
- 2027 YPP changes CONFIRMED multi-source (AIR, AuditSocials, Tablet News, GSMDome; announced Aug 10, 2026): from Feb 1, 2027, Shorts revenue sharing needs 10M qualified Shorts views per 90 days (checked monthly); new applicants 8K watch hours or 20M Shorts views.
- Oct-2026 Shorts originality update CONFIRMED multi-source (Digital Trends, ppc.land, Storyboard18, NeoTeo).
- 2027 platform priorities (Lia Haberman, single-source): YouTube — shopping, micro-dramas, custom feeds (Shorts Series); TikTok — creator-brand partnerships. Microdrama 6.5B H1-2026 views / ~$14B 2026 industry estimate (FastCompany, single-source, flagged).

What shipped:
1. **`data/niches.json` v2.0.0** (source of truth): per-niche `outlook_2027` (trajectory heating/stable/cooling + basis sentence + signal source ids — 10 heating, 6 stable, 4 cooling), per-niche `stream_fit` (ads/sponsorships/digital_products/POD: strong/moderate/weak — editorial, labeled as judgment), doc-level `outlook_2027` (6 platform signals + evidence note: trajectories are reads, not forecasts), 4 `breakout_spotlights` (video podcasts, rural homesteading, manhwa recaps, shorts series — single-source flags where applicable), 7 new sources, avoid list 6→7 (new: "Shorts-only channels chasing pool revenue (post-Feb-2027)"; clipping + kids entries gained `flag_2027` 2027-updates). Honesty contract in-data: no income-promise language, disclaimer in the note.
2. **Niche Atlas article** (`content/niche-atlas.md`): new "The 2027 outlook" section (trajectory table, platform signals, breakout spotlights, competition-vs-reward explainer, stream-fit matrix table), "The avoid list (2027 update)" rewrite, sources extended. Static tables so the page reads without JS.
3. **Explorer 2.0** (`assets/js/niche-atlas.js`): trajectory badges on every card + trajectory filter + "2027 outlook" default sort, "Competition vs reward" scatter (SVG, role=img + title/desc + a details/summary data-table alternative for screen readers), breakout spotlight cards, the stream-fit matrix table, a rendered Red-flag niches panel, and a 2027-outlook row in the head-to-head compare. All from the live JSON; new CSS in components.css (badges, scatter, matrix, reduced-motion-safe).
4. **"Pick my 2027 niche" quiz branch** (`assets/js/quiz.js` + JS-rendered mode toggle): 4 questions (2027 bet, format, risk tolerance, skill fit) scored against the atlas outlook layer — trajectory weight (heating +3/stable +1/cooling −2), breakout/search/underserved/evergreen signal matches, format fit (with the Feb-2027 Shorts-floor warning for shorts-first), risk alignment, atlas skill-fit. `OUTLOOK_2027` mirrors `data/niches.json` trajectories; `tests/niche-atlas.test.js` enforces sync (20/20 match).
5. **Money Map tie-in** (`pages/money-map.html`): a "Niche fit" block in all 5 stage playbooks — stage-appropriate niches per stage (heating low-cost lanes at Stage 0; small-audience-pays math + kids warning at Stage 1; niche→second-stream matching at Stage 2; niche sets the team at Stage 3; portfolio thinking at Stage 4), cross-linking the Atlas, Deal Room, simulator, and hiring calculator.
6. **Empire Simulator refresh**: new `ai-tutorials` scenario (9th; tech_software band $8–20, OutlierKit 18x/$15–22 CPM source, growth assumption labeled a planning input); refreshed sources on `betrayal-dramas` (21x, $20–25 CPM multi-source + Feb-2027 floor caveat), `tech-reviewer` (2026 sponsor CPMs $25–45), `personal-finance` (Sep-2026 RPM table $10–25). Assumptions still shown honestly in-page.
7. **Agentic surface**: `api/v1/index.json` niches endpoint description + freshness note rewritten (v2.0.0, outlook layer documented); generated draft-07 schemas extended (`niche.json`: `outlook_2027` + `stream_fit`; `niches.json` doc: `outlook_2027`, `breakout_spotlights`, `stream_fit_legend`); `tools.json` quiz record carries the 2027-branch input schema (`q271`–`q274` optional) + drive notes; AGENT.md (niches row + Niche Picker row) and API.md (niches shape incl. all new fields) updated; llms.txt/llms-full.txt regenerated. No new skill — no genuine gap (the quiz branch, explorer, and API rows cover it).

**Tests**: new `tests/niche-atlas.test.js` (144 assertions — 20 records × outlook/stream-fit/source checks, avoid-list red flags, spotlights, platform signals, honesty contract, quiz.js trajectory sync); wired into `validate.sh` stage 6; `agent-workflows.test.js` wf4 updated 8→9 scenarios (sim + schema enum). Validation: `scripts/build.py` clean; `scripts/validate.sh` **8/8 GREEN** (26 JS files node --check, 31 JSON files parse, draft-07 schemas incl. the extended niche/niches pair, 0 broken links (2,393 checked), byte-identical rebuild on the committed tree, 84 sim + 78 deal-room + 49 content-engine + 44 money-map + 184 video-doctor + 144 niche-atlas engine assertions, 67 agent-workflow assertions).

Commit: 6902365772360df05e2f06e68330092867859429 (local) → 72965bceba579c9bf7ae61013f000cf7053e2a24 (pushed 2026-10-11, remote tree verified via GitHub API — all wave-20 files in the recursive tree).

## Wave 19 — The Analytics Decoder (2026-10-11)

The missing analytics-reading pillar: a video troubleshooter, a metrics
glossary chapter, and a retention-curve reader — all diagnostic logic drawn
from the site's existing chapters, every threshold labeled as a
creator-reported rule of thumb, never platform gospel. Now 15 tools total.

What shipped:
1. **Diagnose My Video tool** (`pages/video-doctor.html` +
   `assets/js/video-doctor.js` → `site/video-doctor.html`, TOOL 15) —
   symptom picker (8 symptoms: low CTR, early drop-off, great retention but
   no subs, sawtooth, single cliff, Shorts-no-crossover, flat-low,
   end-collapse) → ranked likely causes → chapter-grounded fixes with
   read-next links. Engine is UMD (browser + node): `validInput()` /
   `diagnose()` / `SYMPTOMS` dataset. Context-aware: tuition-phase caveat
   under 50 videos, completion-rate note for CTR on swipe feeds, bridge note
   for Shorts-crossover diagnosed from long-form. Symptom radio cards with
   arrow-key radiogroup support, aria-live results, localStorage last-input,
   full no-JS fallback (all 8 symptoms, one line each). Own stylesheet
   `assets/css/videodoctor.css`.
2. **The Metrics Glossary chapter** (`content/metrics-glossary.md` →
   `site/metrics-glossary.html`, 3rd Reference page): CTR, AVD, retention
   curves, traffic sources, returning vs new viewers, Shorts feed vs browse
   — what each metric means, what "good" looks like as reported ranges
   (flagged creator-reported, never platform-published), when each lies,
   plus "what NOT to watch (yet)", a stage-appropriate-metrics table (Money
   Map cross-link: beginners shouldn't obsess over CTR), and a "your numbers
   vs the Simulator's assumptions" section.
3. **Retention-curve reader** — five sketched SVG patterns
   (`METRICS_CURVE_MOUNT` in build.py, styles in components.css): cliff at
   start (hook/packaging), sawtooth (re-hooks vs pacing), single cliff (one
   bad section), end collapse (normal unless before 50%), flat low (topic
   mismatch / tuition phase). Static hand-drawn polylines — no data behind
   them, "read the shape, never the numbers"; each with aria-label +
   figcaption.
4. **Cross-links**: Playbook "Your next move" → Metrics Glossary +
   Video Doctor; Money Map stage 0/1 playbooks → stage-appropriate metrics;
   Simulator assumptions → Metrics Glossary (read your real graph before
   tuning the model) + Video Doctor; Phase 2 analytics section → both new
   pages. `data/glossary.json` gained 4 terms (Traffic sources, Returning
   viewers, Shorts feed, Browse traffic) → 30 terms.
5. **API surface**: `api/v1/tools.json` 15th record with draft-07
   `VideoDoctorInput` schema (symptom/platform/experience enums);
   llms.txt lists 15 tools + Glossary; llms-full.txt carries the new
   reference marker.

**Tests**: new `tests/video-doctor.test.js` (184 assertions — input
validation, all-8-symptom diagnosis shape, link targets all real site
pages, honesty contract enforced in-test: "rule of thumb" /
"creator-reported" present, no platform-published claims, no guarantee
language, tuition/platform context notes); `agent-workflows.test.js`
wf2 updated 14→15 tools; `validate.sh` stage 6 runs the new suite.

Validation: `scripts/build.py` clean (9 chapters, 15 tools, 12 skills,
7 case files, 16,208 words); `scripts/validate.sh` **8/8 GREEN** (26 JS
files node --check, JSON parse, draft-07 schemas, 0 broken links (2,377
checked), byte-identical rebuild, 80 sim + 78 deal-room + 49 content-engine
+ 44 money-map + 184 video-doctor engine assertions, 67 agent-workflow
assertions).

Commit: c03655a3426cdfc3a9640239f5b6e9ea01a13161 (local) → d91b715adfe7551738d9c7b426a6f72631a9672e (pushed 2026-10-11, remote tree verified via GitHub API).

## Wave 18 — The Money Map (2026-10-11)

The capstone page tying the whole empire together: $0 → first $100 → $1K/mo →
$10K/mo → company. Now 14 tools total.

What shipped:
1. **The Money Map tool** (`pages/money-map.html` + `assets/js/money-map.js`
   → `site/money-map.html`, TOOL 14) — the "Where am I?" quiz (7 questions:
   platform, audience, monthly revenue, cadence, team, bottleneck, revenue
   streams) places the creator on the map and generates a personalized
   3-move roadmap. Placement is anchored on the creator's own reported
   revenue band ($0→stage 0, $1–99→stage 1, $100–999→stage 2, $1K–9,999→
   stage 3, $10K+→stage 4); a 100K+ audience at base stage ≤ 2 bumps +1 with
   an `audience-ahead` note, employees at stage ≤ 2 add a `team-ahead` note.
   Answers persist in localStorage; nothing leaves the device.
2. **Five stage playbooks** — The Start Line ($0), First $100, The Engine Runs
   ($1K/mo), The Business ($10K/mo), The Company. Each: the goal (framed as
   "creators at this stage typically focus on X" — never income promises),
   the 3 moves that matter (wired to the right tool/chapter: Niche Atlas →
   Content Engine → Simulator → Deal Room → First Hire), the trap to avoid
   (with the honest framing from each source chapter: tool-collecting,
   sponsor-chasing without leverage, single-stream fragility, hiring before
   the math works, scaling what broke you), and "graduate when" criteria.
   Static HTML so the page reads fully without JavaScript.
3. **Interactive map visual** — the journey as a 5-node path (`<ol>` of
   anchor links, fully keyboard/noscript accessible; vertical on mobile,
   horizontal on desktop); clicking a node opens its playbook. Progress is
   self-marked per stage (localStorage `cge.moneymap.v1`), never
   auto-detected. Reduced-motion respected.
4. **Cross-links from every pillar page** — a "See where this fits on the
   Money Map" ribbon at the end of all 9 phase chapters (generated by
   build.py), plus the tools-hub "Pick by job" section and the footer Tools
   nav. AGENT.md gained Workflow 7 (place a creator on the map via API);
   README counts updated 13 → 14.

Validation: `scripts/validate.sh` **8/8 GREEN** (24 JS files node --check,
JSON parse, draft-07 schemas, 0 broken links (2,216 checked), byte-identical
rebuild, 80 sim + 78 deal-room + 49 content-engine + 44 money-map engine
assertions, 67 agent-workflow assertions).

Commit: b01afa3 (local) → f6e67b4f90f491d207e060f2e5d0bc2d11c8714a (pushed 2026-10-11, remote tree verified via GitHub API).

## Wave 13 — Empire Simulator 2.0 (2026-10-11)

What shipped:
1. **Scenario library** (`assets/js/sim-engine.js` → `SCENARIOS`, 6 presets):
   ASMR Bedroom Channel (Case File: Sleep Channels, ASMR→lifestyle proxies
   declared), Tech Reviewer (tech band $8–$20 + 2–3x sponsor rule), Betrayal
   Mini-Dramas (entertainment band, Shorts-first cadence), Home Cooking
   Channel (Case File: Ben's Bites), Personal Finance / Zero to Budget (Case
   File: PTYA, finance band $8–$35), Fitness Coach (health band $4–$10). Each
   is a named, loadable config with source attribution; one-click "Load
   scenario" on the page (`EmpireSim.scenarioInputs(id)` for agents).
2. **Comparison mode** — `EmpireSim.compare(nameA, inputsA, nameB, inputsB, cfg)`:
   same clock, deltas ALWAYS B-minus-A, plain-language verdict naming the
   net-revenue winner, the drivers (RPM, growth, team spend), the
   "subscribers are not income" note, and the honesty caveat. Page UI:
   scenario/custom selects per side, side-by-side cards, delta table, verdict
   panel, and the assumptions panel rendered with every comparison — never hidden.
3. **Team hiring layer** — wave 10's First Hire guide wired into the sim:
   editor ($1,400/mo preset, +1 long-form/wk, quality +12%), thumbnail
   designer ($120/mo, quality +8%), VA ($900/mo, +0.5 long-form/wk); start
   month + monthly cost adjustable, first active month at 50% (ramp-up,
   labeled). Month-by-month P&L: gross, team cost, net — in the ledger table
   and stat cards. Backwards compatible: no hires → byte-identical math to v1.
4. **Year 2 scaling** — optional 24-month horizon with the diminishing-returns
   curve (monthly growth decays ×0.94/mo after month 12, honestly labeled as
   our curve), Q4 uplift in months 22–24, generalized charts/milestones.
5. **"Copy my empire plan"** — `EmpireSim.exportPlan()`: scenario, hires,
   horizon-end numbers (subs, gross, team spend, net, best month),
   milestones, the full assumptions list, and the "model, not a prediction /
   not financial, legal, or tax advice" disclaimers.

Engine (`sim-engine.js`) stays UMD/node-testable. Honesty contract intact:
ranges and stated assumptions everywhere, no income promises, disclaimers
visible on-page and in exports.

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN**
(15 JS files node --check, JSON parse, draft-07 schemas, 0 broken links,
byte-identical rebuild, **71 sim assertions**, llms.txt counts fresh,
**36 agent-workflow assertions**). AGENT.md gained Workflow 4 (ASMR bedroom vs
Tech reviewer — executed numbers: 6,434 vs 5,323 subs; $909.02 vs $7,955.56
net; Tech reviewer leads by 775%); `api/v1/tools.json` simulator
`input_schema` extended (`scenario_id`, `horizon`, `hires[]`,
`compare_with`); llms.txt tool bullets now carry descriptions (2.0 features);
`pages/agents.md` gained worked workflow 4.

Commit: bf4f914fc5a9bb459d09252c01d14e6286ce47eb (pushed 2026-10-11).

## Wave 12 — Agent API excellence pass (2026-10-11)

What shipped:
1. **`api/v1/index.json` — full self-describing manifest.** Replaced the sparse
   path-dict with an endpoint-record list: every endpoint carries `id`, `kind`
   (`json`|`html`|`directory`), `path`/`paths`/`files`, `description`, `schema`
   URL, ISO-8601 UTC `updated`, `records` count, `deprecated` +
   `deprecation_note` (none active), and `freshness_note` where relevant
   (calculators: verify platform figures live). Covers chapters, glossary,
   calculators, skills, case-files, tools, reference-pages, tool-pages, and a
   `schemas` directory record listing all 11 schema files.
2. **New `api/v1/tools.json` endpoint** — all 9 tools with programmatic
   `input_schema` (JSON Schema draft-07), `output` description, and
   `drive_notes` (formulas + the shipped JS file to replicate). Generated from
   a new `TOOLS_API` table in `scripts/build.py`; faithfully mirrors each
   tool's actual inputs (verified against the tool JS).
3. **New `AGENT.md`** (repo root) — "how an agent uses this site": base URL
   pattern (`api/v1/` relative; no auth/keys/rate limits), endpoint table with
   example requests, **3 end-to-end worked workflows** (WF1: $5K offer for a
   50K-sub tech channel → FAIR, implied CPM $125 vs $20–$35 integrated
   benchmark, $15K counter; WF2: 90-day cooking-channel launch → 13 long-form
   + 39 shorts = 52 pieces, YPP 1K subs + 4K watch hours, TikTok food RPM
   $0.60–$1.30; WF3: ASMR sim scenario → month-12 subs 3,468, 12-mo $43.12,
   proxies declared explicitly), rate/expectation notes (static JSON,
   freshness dates, verify-live flags), per-tool drive table, honesty rules.
4. **JSON Schema draft-07 for every endpoint** — 11 schemas now (was 4): added
   `index.json`, `chapters.json` (doc), `skills.json` (doc), `skill.json`
   (record), `case-files.json` (doc), `tools.json` (doc), `tool.json`
   (record). Doc wrappers use relative `$ref` into per-record schemas.
5. **Shared conventions in API.md** — the canonical cross-site block added
   verbatim; endpoint docs rewritten to match actual payloads (old text
   described chapter fields that don't exist); glossary count fixed 25→26.
6. **Skills gap-fill (10→12)** — `shortform-hook-craft` (Hook Builder +
   Short-Form Playbook: 5 structures, retention editing, anti-hook checklist)
   and `first-hire-planner` (hiring guide + calculator: bottleneck test, 2026
   rate ranges, coverage math, 2-week trial, SOPs, contractor-vs-employee —
   not legal/tax advice), both in the standard Use-when/Inputs/Procedure/
   Worked-example/API-references/Pitfalls format.
7. **API Explorer polished** — now discovers endpoints from the new manifest
   shape (all 7 JSON endpoints + all 11 schemas from the manifest's `files[]`,
   record counts in descriptions), shows a manifest version/updated line, and
   the static fallback covers everything incl. case-files + tools.
8. **Freshness fixes** — `pages/agents.md`: calculators version 1.1.0→1.2.0,
   skills 10→12 (+2 table rows), interactive-tools row gained hiring-calculator
   + hook-builder; `llms.txt` regenerated via `scripts/build.py` — new
   **Guides & Playbooks** section (The First Hire + Short-Form Playbook,
   previously unlisted), `tools.json` + `schema/` in the API section, `AGENT.md`
   in the Agents section; hiring MARKDOWN_PAGES title/badge swap fixed (page
   title was rendering "Guide", now "The First Hire"); README agentic layer
   updated (was "3 tools, 6 skills").

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 12 skills, 5 case
files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (14 JS files,
21 JSON files, schema validation incl. $ref resolution + manifest/schema-set
coherence, 0 broken of 1,587 links, byte-identical rebuild, 16/16 sim
assertions, llms counts fresh, **20/20 agent-workflow assertions** — the 3
AGENT.md workflows executed against the real `api/v1/` JSON files + the
shipped UMD sim engine in node).

Existing payload shapes untouched (site JS + sim engine read them); only the
manifest shape changed, with the API Explorer updated to match.

Commit: db5e941cff923ed9dc11c8fd9f74d491e89e9226 (pushed 2026-10-11; local 3a5fa41).

---

## Wave 11 — deep content: "The Short-Form Playbook" (2026-10-11)

What shipped:
1. **New chapter `pages/shortform-playbook.md` → `site/shortform-playbook.html`** (MARKDOWN_PAGES, badge "Playbook", 3,012 words): "The Short-Form Playbook" — grounded in the wave-7 fuel research (sourced Oct 2026): why short-form is a different game (interest-graph not social-graph; test-pool cascade; watch-time-per-impression), **5 hook structures** (Open Loop, Cold Start, Contrarian Take, Numbered Promise, Question-as-Hook — craft formulas, flagged as craft), retention editing (cut density, burned-in captions as TikTok search index, pattern interrupts, loopability, mid-video re-hooks), platform playbooks (TikTok: completion-rate optimization + keyword-search lever + series formats; YouTube Shorts: Oct 1 2026 originality update — channel-level re-upload reach cut, recommendations-only, re-evaluation on original; May 2026 AI-disclosure rule — labels don't hurt, undisclosed photorealistic AI reduced/removed; Shorts→long-form funneling; Reels: Mosseri's sends-per-reach #1 hierarchy + sends-per-reach engineering + DM test; 7–30s discovery and >3min-not-pushed-to-non-followers both flagged single-source), posting cadence (honest: no peer-reviewed cadence science — consistency beats volume, Phase 1 baseline, anti-volume warning), series formats that compound (numbered series, recurring characters, serialized mini-dramas — cross-links the trend-machine's Oracle at github.com/astercast/trend-machine for launch-into-rising-topics), what kills reach (re-uploads, watermarks, undisclosed AI, long Reels to cold audiences, engagement bait, inconsistent volume). Every platform claim sourced or flagged single-source; no income promises, no earnings figures.
2. **New tool: Hook Builder** (`pages/hook-builder.html` + `assets/js/hook-builder.js`, TOOLS/TOOL_HUB_META/TOOL_SCRIPTS wired — CONTENT group, 🎣 icon): 5 hook structures as flip-through cards — topic input → 5 filmed-ready hook variants, one per card; card = structure name, description, your hook, formula, worked example, delivery tip, copy-to-clipboard button. ARIA (region/slide roles, numbered dots with aria-current, polite live announcer "Card N of 5"), full keyboard (arrows/Home/End + buttons), focus-visible outlines, reduced-motion media query, mobile-first deck CSS appended to assets/css/components.css. nav_active = tools.html; linked from the Playbook chapter and Phase 3's repurposing SOP.
3. **Cross-links** — Phase 1 hooks bullet → Playbook; Phase 2 originality-update section → Playbook; Phase 3 repurposing SOP → Hook Builder tool. Index "All 9 tools →"; llms.txt "All nine tools"; api/v1/index.json tools[] regenerated (hook-builder.html included); llms-full.txt carries the full Playbook chapter.

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 10 skills, 5 case files, 16,153 words); rebuild committed, then `scripts/validate.sh` **7/7 GREEN** (13 JS files incl. hook-builder.js node --check, 0 broken of ~1,5xx links, byte-identical rebuild, 16/16 sim assertions, llms counts fresh — 9 phases, 9 tools, 5 case files, 10 skills).

Commit: e7192b5 (pushed 2026-10-11).

---

History reconstruction (waves 1–2, logged 2026-10-11):

- **Wave 1: 9 chapters + 3 tools + 6 skills + API; design overhaul v2 — completed 2026-10-11**
  (9-phase content ~13,600 words, niche quiz, revenue calculator, 90-day planner, 6 skills,
  api/v1 + llms.txt/llms-full.txt, "Empire Briefing" v2 design.)

---

## Wave 2 — research integration (2026-10-11)

Research source: `~/workspace/research_notes/ai-film-deep-2026-20261011-2154/` (Mission 4 —
creator economy 2026, read Oct 11, 2026). All platform figures sourced in the research notes;
single-source claims flagged in-page.

What shipped:
1. **Phase 5 monetization chapter updated** — TikTok Creator Rewards RPMs $0.40–$2.00/1K
   qualified views (5–10x YouTube Shorts $0.04–$0.50; 1-min+ original-only; eligibility
   10K followers + 100K views/30d + 18+); Meta Creator Fast Track (Mar 2026: $1K/$3K per mo,
   US/Canada, 3-mo cap); Facebook Content Monetization merged program; Instagram has NO
   standing Reels bonus; sponsorships dwarf platform payouts ($20–$35 CPM integrated slot
   vs ~$2.30 ad RPM; IG sponsored Reel median $22.40 CPM); 7-figure pattern (5+ stacked
   streams + owned audience; newsletter ~$670K/yr; Ben's Bites 7 figures in <9 months solo);
   TikTok live shopping +60% YoY H1 2026, affiliate engagement 5.2% (160% above IG);
   watch-time is the real gate; Jan 2026 YouTube enforcement wave flagged as reported.
2. **New 2026 rate card reference page** (`content/rate-card.md` → `site/rate-card.html`) —
   sponsorship negotiation ranges by tier/platform, platform multipliers (YT 1.7x IG,
   TikTok 0.85x), sponsored CPMs, negotiation data (~23% above accepted), usage rights as
   the most-neglected line item. `build.py` gained a `REFERENCE_PAGES` list (rendered like
   chapters, excluded from the 9-phase index count); Phase 5 links to it.
3. **Phase 7 business chapter updated** — S-corp election at ~$50–75K net profit; default
   LLC = Schedule C + 15.3% SE tax on everything; ~$5.9K/yr saved on $120K at 60% salary;
   2026 SS wage base $184,500; 20% QBI permanent under OBBBA; not-tax-advice disclaimer
   stays prominent (top of phase). Phase 6 POD section got the Printful playbook bits
   (30–60% margins, samples, 7–12s clips, 1-hr+ lives).
4. **`data/calculators.json` v1.1.0 (updated 2026-10-11)** — niche RPM bands aligned to
   research (low $1.50–$4 / mid $4–$10 / high $8–$20 / music $0.75–$1.65; Q4 +40–80% vs Q1),
   Shorts RPM [0.04, 0.50] with tiers, TikTok RPM [0.40, 2.00] with per-niche bands,
   `sponsorship_rate_card_2026` block, usage-rights negotiation note. **2027 YPP threshold
   claim RE-VERIFIED via fresh search: CONFIRMED multi-source** (YouTube announced Aug 10,
   2026; Cartoon Brew, Tech Times, Hypebeast, AIR Media-Tech, Music Business Worldwide;
   official Help page) — old "vidIQ single-source" flag removed; Phase 2 chapter updated.
5. Rebuilt via `scripts/build.py` (9 chapters, 3 tools, 6 skills, ~14.6K words);
   llms.txt/llms-full.txt now list the Reference page; API index exposes `references`.

Commit: 1f87d372d9c669addb9aa1ea398aa0084ebf3bfa (pushed 2026-10-11, base 1d3f82a; parallel pipeline commits carried over via base_tree).

---

## Wave 3 — interactive tools (2026-10-11)

Two new interactive tools (vanilla JS, ARIA + keyboard support, print styles,
Empire Briefing v2 design language). Now 5 tools total.

What shipped:
1. **Sponsor Deal Analyzer** (`pages/deal-analyzer.html` + `assets/js/deal-analyzer.js`
   → `site/deal-analyzer.html`) — input: platform, follower count, deliverable type
   (integrated slot / dedicated video / short-form), offered pay, usage-rights terms,
   whitelisting, exclusivity, payment terms. Output: verdict against the
   `sponsorship_rate_card_2026` ranges in `data/calculators.json` (tier lookup +
   implied-CPM check vs sponsored-CPM benchmarks; underpaid / fair / strong),
   red-flag checklist (unlimited/perpetual usage, perpetual whitelisting, broad
   exclusivity, net-60+), and a counter-offer worksheet (quote at top of range,
   usage rights priced separately +50–100%, exclusivity +25%+, ~23% negotiation
   buffer). Framed as a negotiation aid, not financial advice.
2. **Repurposing Planner** (`pages/repurpose.html` + `assets/js/repurpose.js` →
   `site/repurpose.html`) — input: one content idea + source format (long video /
   stream / podcast). Output: atom-test self-score (run the full SOP vs pillar-only),
   pillar-prep card adapted to source format, and five mission-card checklists
   (YouTube Day 0, Short Day +1, TikTok Day +2, IG Reel Day +3, Facebook Day +4)
   with per-platform hook adaptations generated from the idea text, native-grammar
   format notes from the Phase 3 SOP, and staggered posting order. Checkboxes toggle
   done-state; print button for the mission cards.
3. **Build wiring made tool-agnostic** — `build.py` nav / tool pages / script tags /
   API index `tools` / `llms.txt` Tools section are now all generated from the single
   `TOOLS` list (all three were hardcoded for the original 3 tools); index hero stats
   and footer nav updated to 5 tools.
4. **Cross-links** — Phase 3 (repurposing SOP → Repurposing Planner), Phase 5
   (negotiation section → Sponsor Deal Analyzer), rate-card page → Deal Analyzer.

Validation: `scripts/build.py` rebuilds clean (9 chapters, 5 tools, 6 skills,
14,734 words); `node --check` passes on all 6 JS files; local link check on the
built site: 561 refs, 0 broken; all JSON valid. One build-time bug caught by
`node --check` (mismatched quotes in deal-analyzer.js) and fixed before push.
JS logic smoke-tested under node with a stubbed DOM (verdicts, red flags,
counter-offer math, mission cards, atom test all PASS).

Commit: d20903862dfb3dda932c497c0c615a3b24eac1a4 (pushed 2026-10-11, base 3b1ec58;
parallel pipeline commits carried over via base_tree).

---

## Wave 4 — agentic/API/skills expansion (2026-10-11)

The site is now agent-actionable end to end: data, executable skills, an agent
landing page, and an in-browser API playground. All platform figures come from
existing 2026 research — nothing new invented; income figures stay illustrative,
never promises; "not financial/legal/tax advice" intact.

What shipped:
1. **4 new skills** (same Use when / Inputs / Procedure / Worked example / API
   references / Pitfalls format; all reference real `api/v1` endpoints):
   `deal-negotiation` (benchmark an offer vs the rate card, red-flag checklist,
   counter-offer worksheet — drives the deal-analyzer logic),
   `rate-card-reader` (tier/platform/deliverable range lookup from
   `calculators.json`, ~23% listing buffer, package-discount layer),
   `live-shopping-playbook` (TikTok live selling from the Phase 6 POD research:
   60-min run of show, flash-sale margin math, own-the-customer-data loop),
   `repurposing-sprint` (execute the 5-platform SOP: atom test, pillar prep,
   YouTube Day 0 → Short Day +1 → TikTok Day +2 → Reel Day +3 → Facebook Day +4).
   Skills index regenerated: **10 skills**.
2. **Agents landing page** (`pages/agents.md` → `site/agents.html`, new
   `MARKDOWN_PAGES` renderer in build.py): full agentic surface — `api/v1`
   endpoint table (chapters, glossary, calculators, skills, tools, references),
   `llms.txt`/`llms-full.txt`, all 10 skills with use-when summaries, data
   freshness policy (`updated`/`version` fields, verify-live flags, rate-card
   caveats), and 3 worked agent workflows (evaluate a $5K sponsorship offer,
   plan a 90-day launch, build a repurposing sprint for one video idea).
   Linked from nav + footer.
3. **API explorer** (`pages/api-explorer.html` + `assets/js/api-explorer.js`,
   new 6th tool): browses `api/v1` endpoints (self-discovered from
   `index.json`, static fallback), fetches relative paths, pretty-prints JSON
   in-browser; client-side only, graceful failure states. Build now mirrors
   `api/v1/` into `site/api/v1/` so the deployed site serves its own API —
   the explorer works live with no server. Hero/index stats updated 5→6 tools.
4. **API index** gained the `skills` endpoint key; `API.md` updated (ten
   skills, explorer + deploy-mirror docs); `GO_LIVE.md` documents the
   site-side api mirror; `llms.txt`/`llms-full.txt` regenerated with an
   ## Agents section (agents page, explorer, llms files).

Validation: `scripts/build.py` clean (9 chapters, 6 tools, 10 skills,
14,734 words); `node --check` on all 8 JS files PASS; all 11 JSON files valid;
internal link check across site/: 706 refs, 0 broken; skills/index.json = 10.

Commit: a489b8d3ed9e493d26406e113245f316778c39b6 (pushed 2026-10-11, base 23b5ecf;
remote main ref confirmed via GitHub API; parallel pipeline commits carried over via base_tree).

---

## Wave 5 — Empire Case Files (2026-10-11)

5 documented creator-business deconstructions as `pages/case-*.md` → `site/case-*.html`
(new entries in the `MARKDOWN_PAGES` renderer; chained end-nav case→case→agents; violet
"Case File" badge). Each file: the arc (0 → scale), a revenue-stack breakdown table, the 3
decisions that mattered, what to steal (actionable), what NOT to copy (context), and
sources with URLs. Every figure is source-reported (interviews, Fortune-verified records,
founder statements) and flagged where self-reported — framed as "what happened," never
as income promises.

What shipped:
1. `case-budget-grocery` — The Budget-Grocery Newsletter: viral 2023 grocery video → 3M+
   followers → seven-figure stack; paid newsletter ~$670K/yr as the primary line on a
   2-person team (source: the creator's own "5 Revenue Streams of a $1M+ Creator Business"
   interview + transcript).
2. `case-bens-bites` — Ben Tossell: 7-figure AI-education business, 10,000+ students in
   <9 months; newsletter top-of-funnel → paid education products; honest note that the
   "one person" core had a small team behind it (sources: Behind the Craft interview,
   creatoreconomy.so takeaways, bensbites.com/about).
3. `case-sleep-channels` — Adavia Davis: Fortune-verified (Dec 2025) faceless network,
   $40K–$60K/mo (~$700K/yr), 5 channels, "Boring History" 6-hour sleep documentaries,
   Claude + ElevenLabs pipeline (~$60/video, ~85% margins); "what NOT to copy" centers
   YouTube's 2025–2026 AI-content enforcement (sources: Fortune profile via UNILAD Tech
   and Newsy Today write-ups).
4. `case-mavwicks` — Mavwicks Fragrances on TikTok Shop: Megan Reep, ~$300–400K/yr
   before → $32M in the first year on TikTok Shop; founder-on-camera lives as
   entertainment events (sources: Modern Retail + Digiday, Jun 2026).
5. `case-ptya` — Ali Abdaal's Part-Time YouTuber Academy: cohort course as the primary
   line ($1.3M maker revenue 2021; $5M combined with the Kit email engine; $528K in 4
   days from one automation); the list, not the platform, as the business (sources:
   Digiday 2021, Kit case study 2026).
6. **Discovery**: "Empire Case Files" card section on the index (violet phase-cards),
   hero sticker, footer CASE FILES nav, cross-links from Phase 5 ("The 7-figure pattern")
   and Phase 8 ("Empire patterns").
7. **API**: new `case-files` endpoint (`api/v1/case-files.json`) in the index manifest,
   + `api/v1/schema/case-file.json`; `API.md` documents the endpoint and schema;
   `pages/agents.md` surface table gained the Case Files row; `llms.txt` gained a
   ## Case Files section (+ api reference) and `llms-full.txt` picked up all five case
   pages automatically.

Validation: `scripts/build.py` clean (9 chapters, 6 tools, 10 skills, 5 case files,
14,848 words); `node --check` on all JS files PASS; all api/v1 JSON + schemas valid;
internal link check across site/: 986 refs, 0 broken; 0 broken anchors.

Commit: 87eb943abdc3a72eb05a7eb786f21ec38985fc06 (pushed 2026-10-11; remote main ref
confirmed via GitHub API; all 13 case-file paths present on remote main). Note: the
first push attempt (308b7b18) silently dropped untracked files — gh-push.py only pushes
`git ls-files` tracked paths — so the case pages/API JSON were committed locally and
pushed in this follow-up. Lesson: always `git add -A` before gh-push.py.

---

## Wave 6 — FLAGSHIP: Empire Simulator (2026-10-11)

The "craziest products" mandate: a 12-month channel growth simulator — the most fun
page on the site, all client-side, all from the site's real 2026 numbers, honest
about being a model.

What shipped:
1. **`assets/js/sim-engine.js`** — pure, DOM-free simulation engine (UMD: browser
   `window.EmpireSim` + node `module.exports`). Month-by-month for 12 months:
   subs compound via base growth × niche factor × cadence factor × quality
   multiplier (all shown); views = subs × views-per-sub per format; ad revenue =
   views/1000 × niche RPM band (low/mid/high selectable) with Q4 uplift on
   months 10–12 (default +60%, slider 40–80% per research); sponsors kick in at
   1K/10K/100K/1M subs using `sponsorship_rate_card_2026` YouTube per-video ranges
   × the researched niche multiplier (finance/tech 2–3×, entertainment lower —
   sourced from the rate-card rule of thumb); affiliates and digital product
   (toggleable, conservative conversion assumptions, launch month selectable).
   YPP ad-revenue gate at 1,000 subs (watch-hours gate noted as not modeled).
2. **`assets/js/simulator.js` + `pages/simulator.html`** — game-HUD tool page
   (TOOL // 07): niche dropdown fed live from `data/calculators.json` RPM bands,
   starting subs, long-form/shorts cadence, quality level (labeled assumption),
   monetization toggles; assumptions drawer (growth-rate slider, RPM low/mid/high,
   Q4 slider, digital price + every fixed assumption listed and sourced);
   outputs: SVG subscriber curve + SVG revenue-stacked-by-stream chart (static,
   responsive, labelled, aria-described), month-by-month ledger table, empire
   milestones timeline ("First $1K month: Month 7" style — computed, celebrated
   with sticker-bomb badges), end-of-year empire stats card, "Share my empire"
   (copies a text summary), and a big coral banner: "A MODEL, NOT A PREDICTION —
   change the assumptions, change the empire."
3. **Discovery**: nav entry ("Simulator"), footer TOOLS link, index Command Center
   card + hero counts 6→7, `pages/agents.md` tool table, cross-links from Phase 2
   (niche selection), Phase 5 (monetization checklist), Phase 8 (scale); `llms.txt`
   tools section; API tools list auto-updated. `build.py` TOOL_SCRIPTS now supports
   multiple scripts per tool (engine + wiring).
4. **A11y/perf**: semantic HTML, native `<details>`/`<fieldset>`/`<table>`,
   aria-live results, keyboard-focusable drawer summary, reduced-motion-safe
   (static SVGs, no animation), mobile-first grid.

Validation: `scripts/build.py` clean (9 chapters, **7 tools**, 10 skills, 5 case
files, 14,947 words); `node --check` on sim-engine.js + simulator.js PASS;
internal link check 0 broken; `tests/sim-engine.test.js` ALL PASS under node —
cadence monotonicity, finance ≥ gaming at equal inputs, Q4 uplift flag + per-sub
uplift on months 10–12 only, sponsor tiers nano/micro/macro/mega at 5K/50K/200K/2M
subs, digital toggle + launch month; plus a stubbed-DOM smoke test of the full
render path (form → engine → SVG charts → table → milestones) PASS.
Sanity tuning note: the first test run had gaming out-earning finance because the
niche-growth compounding gap swamped the RPM gap in niche-independent streams
(digital/sponsors) — fixed by applying the researched sponsor niche multiplier
(finance/tech 2–3×), which is grounded in the rate-card rule of thumb, not invented.

---

## Wave 7 — research fuel integration: niches + platform rules (2026-10-11)

Research source: `~/workspace/research_notes/wave-fuel-2026-20261011-2355/` (Missions A/C,
read Oct 11, 2026). All figures sourced in the research notes; single-source claims flagged
in-page. No income promises — CPM/RPM as creator-reported ranges. "Not financial advice" intact.

What shipped:
1. **Phase 0 "2026 niche landscape" section** — research-backed niche intelligence:
   fastest channel growth (TubeAI/AIR: kids 1.59%, ASMR 1.56%, creator economy 1.50%,
   challenges/stunts 1.47%, AI/ML 1.44%, true crime 1.34%); search growth (OutlierKit: AI
   tools +340% at $8–20 CPM, no-code/automation +220% most underserved, Gen Z finance
   +180% at $18–45, cybersecurity +160%); breakout formats (betrayal/revenge 21x at
   $20–25 CPM low competition, English-learning podcasts 21x, senior health 19x ultra-low
   competition); RPM reality (finance $8–35 vs gaming/entertainment $1–5, ~7x gap; kids
   content $0.33 RPM warning — ~3M views to earn $1,000); the <1% reality check (<1% of
   channels ever hit 100K subs — plan around 10K–30K loyal); clipping-channel warning
   (Oct 1 2026 Shorts update) and Jan 2026 AI-slop purge warning (16 channels, 4.7B views).
   Comparison table + machine-readable pointers to the new JSON blocks.
2. **Phase 2 YouTube update** — new "October 2026 Shorts originality update" section:
   channel-level reach cut for re-uploaded/aggregator content (announced by Rene Ritchie,
   Oct 1, 2026), clipping channels as the target, recommendations-only scope, and the May
   2026 AI-disclosure rule (labels don't hurt reach; undisclosed photorealistic AI gets
   reduced recommendations or removal).
3. **Phase 3 TikTok + Reels update** — TikTok signal hierarchy (completion/watch time
   dominant, rewatches/shares/saves next, comments quality-weighted, likes declining;
   interest-graph not social-graph; test-pool model; TikTok-as-search-engine keyword lever);
   Reels ranking per Mosseri (sends per reach #1, hierarchy sends > watch time >
   completion/rewatches > likes > comments), Reels >3min not pushed to non-followers
   (single-source, flagged), TikTok-watermark deprioritization.
4. **`data/calculators.json` v1.2.0 (2026-10-11)** — RPM bands updated to research:
   finance_investing [8,35] (was [8,20]), gaming [1,5] (was [1.5,4]),
   comedy_entertainment [1,5] (was [1.5,4]), new kids_content [0.33,0.33] floor;
   NEW `niche_growth_2026` block (channel growth %, search growth, breakout formats,
   RPM reality, reality checks — sourced, dated) and NEW `platform_rules_2026` block
   (TikTok / Shorts / Reels rules with sources and dates). Empire Simulator reads the
   same keys — verified working: kids_content 12-mo sim runs, finance band confirmed
   [8,35] live. Simulator niche dropdown gained "Kids Content" label.
5. **Rebuilt site + agent surfaces** — llms.txt/llms-full.txt regenerated (16,012 words,
   up from 14,947); api/v1/calculators.json carries both new blocks.

Validation: `scripts/build.py` clean (9 chapters, 7 tools, 10 skills, 5 case files);
`node --check` on sim-engine.js + simulator.js PASS; internal link check 0 broken;
`tests/sim-engine.test.js` ALL PASS under node (cadence monotonicity, finance ≥ gaming
at equal inputs, Q4 uplift months 10–12 only, sponsor tiers, model shape).

---

## Wave 8 — validation/hardening (2026-10-11)

One-command validation pipeline + the real issues it surfaced. No content changes
beyond the fixes below.

What shipped:
1. **`scripts/validate.sh`** — 7-stage pipeline (modeled on the film guide's /
   marvel's, adapted here): (1) `node --check` on all 11 source JS files
   (assets/js + tests); (2) JSON parse of every api/data/skills/scripts JSON;
   (3) draft-07 schema validation of chapters/case-files/glossary/calculators
   against api/v1/schema/, plus every record `path` resolving to a site/ page;
   (4) relative-link check across all site/ pages + pages/ fragments + JS
   fetch() literals + api/v1/index.json endpoints — 0 broken of 1,169 checked;
   (5) build reproducibility (`scripts/build.py` clean rebuild → zero git diff
   on site/, api/, llms.txt, llms-full.txt, skills/index.json); (6) the
   `tests/sim-engine.test.js` suite (16 assertions); (7) llms.txt freshness —
   9 phases / 7 tools / 1 reference / 5 case files / 10 skills match build.py,
   every section marker present in llms-full.txt. Non-zero exit on any failure.
2. **New `api/v1/schema/calculators.json`** (generated by build.py) — locks the
   data contract the sim engine, revenue calculator, and deal analyzer read:
   required blocks, RPM bands as 2-number arrays (finance_investing / gaming /
   kids_content required), niche_growth_2026 and platform_rules_2026 shapes.
3. **Real fixes found by the first run:**
   - `api/v1/index.json` `references` used a bare slug `"rate-card"` while
     `tools` used page filenames — now `"rate-card.html"`, consistent and
     site-root-resolvable (build.py one-liner).
   - **Build ordering bug:** the site/api/v1 mirror was copied BEFORE the
     schema files (and skills.json) were written, so a clean build shipped a
     mirror missing schema/case-file.json + schema/calculators.json —
     previously masked because incremental builds left stale copies behind.
     Mirror now copies after ALL api/v1 writes.
   - API Explorer listed only 2 of the 4 schema endpoints — added
     schema/case-file.json + schema/calculators.json to the static list.

Validation: first run 5/7 pass, caught the issues above; after fixes +
committed rebuild, **7/7 stages pass** (11 JS files, 13 JSON files, schema
clean, 0 broken links of 1,169, byte-identical rebuild, 16/16 sim assertions,
llms counts fresh).

---

## Wave 9 — navigation/design refinement: hubs, mobile QA, tool states (2026-10-11)

The site outgrew its nav (9 chapters, 7 tools, 10 skills, 5 case files, reference
pages). Navigation caught up — hub-first discovery, not more nav links.

What shipped:
1. **`site/tools.html` — Tools hub** (generated by build.py from `TOOLS` +
   new `TOOL_HUB_META`). All 7 tools as Empire Briefing v2 cards: icon tile,
   name, one-line "Use when", best-for tags, `BRIEF // 0N` index; grouped
   PLAN / MONEY / CONTENT (Niche Picker, 90-Day Planner, Empire Simulator /
   Revenue Calculator, Sponsor Deal Analyzer / Repurposing Planner, API Explorer).
2. **`site/case-files.html` — Case Files hub** (from `CASE_HUB`). Five cards
   with sourced revenue-stack thumbnails (the headline numbers + attribution:
   e.g. "$32M in year one on TikTok Shop" via Modern Retail/TikTok-shared data;
   "$40–60K/mo" Fortune-verified; "7 figures in under 9 months" self-reported),
   "X MIN READ", plus a comparison table (niche, primary revenue, team,
   timeline) in a `.table-wrap` scroller and a reported-not-audited honesty note.
3. **Nav consolidation** — desktop nav is now 5 hub-first links (Empire Map,
   Tools, Case Files, Glossary, Agents); the full per-tool list lives in the
   mobile nav and the footer. Tool pages highlight "Tools", case pages highlight
   "Case Files". Index section-heads gained "All 7 tools →" / "All 5 case files →".
   New `assets/css/hub.css` (brief card, empty/error states, `.section-more`,
   mobile fixes).
4. **Mobile QA at 390px** — real fixes, no screenshots available: nav-toggle and
   mobile nav links raised to ≥44px tap targets; `.hud-head` wraps instead of
   squeezing (simulator legend); range sliders get a 44px hit area; explorer
   endpoint rows lost their misplaced checkbox markers (endpoints aren't tasks)
   and wrap cleanly; comparison table scrolls horizontally via `.table-wrap`.
5. **Empty + error states** — every tool now ships a designed `.empty-state`
   ("Nothing brewing yet." + per-tool copy) in its results container; quiz reset
   restores it. Config-load failures (calculator, deal-analyzer) render the
   `.error-state` design with a working "Try again" retry button; repurpose's
   no-idea path uses it too. API Explorer: proper empty state behind the
   preview, loading row in the endpoint list, and a design-treated `role="alert"`
   failure panel that restores the empty state.

Validation: `scripts/build.py` clean (9 chapters, 7 tools, 10 skills, 5 case files);
rebuild committed, then `scripts/validate.sh` **7/7 GREEN** (11 JS files,
13 JSON files, 0 broken of 1,299 links, byte-identical rebuild, 16/16 sim
assertions, llms counts fresh).

---

## Wave 10 — deep content: "The First Hire" (2026-10-11)

Phases 7–8 covered business/scale but hiring was thin. This wave fixes that with
research-first sourcing.

What shipped:
1. **Research via browser.search** — 2026 freelance rates compiled Oct 2026:
   video editors (solopricing $150–$500/video typical, $200–$400 consistent,
   $500–$800 premium; retainers $800–$5K/mo by volume; LatAm dedicated
   $2.5–$3K/mo — floowitalent; cutjamm survey avg $27.55/hr); thumbnail
   designers (live Upwork postings $5–$40/thumbnail, $2–$3K/mo full-time
   equivalent); VAs (offshore $3–$12/hr, nearshore $8–$22/hr, US $25–$50/hr,
   managed plans $899–$1,699/mo — vantastaff/cherryassistant/remotescouts);
   where creators hire (Upwork, ytjobs.co, r/VideoEditing, creator Discords,
   own audience, Indeed — Oct 2026 remote editor listing $25.69–$50/hr);
   contractor-vs-employee basics (IRS three-factor test, W-9 before first
   payment, misclassification penalties — all flagged **not legal/tax advice**).
   The Creators Assistant's true-cost analysis (management time, revision
   overhead, replacement amortization) included as reported-not-audited.
2. **New guide page `pages/hiring.md` → `site/hiring.html`** (MARKDOWN_PAGES,
   badge "Guide", ~2,400 words): "The First Hire" — editor-vs-VA decision
   framework, sourced 2026 rate tables, where to find them, the 2-week trial
   method (paid trial task + fixed rubric + workflow-test week), **3 copy-paste
   SOP templates** (editing handoff, thumbnail brief, upload checklist),
   contractor agreement essentials + contractor-vs-employee reality check
   (not legal advice), and when NOT to hire yet. Sources section lists every
   benchmark. Cross-linked from Phases 7 and 8 (both chapters now point here).
3. **New tool: Hiring Cost Calculator** (`pages/hiring-calculator.html` +
   `assets/js/hiring-calculator.js`, TOOL_SCRIPTS wired) — inputs (role,
   billing model hourly/per-video/monthly, rate, hours/week, units/month,
   monthly views, niche RPM band from calculators.json) → monthly/annual cost
   (sticker vs +15% operating-overhead loaded), share of ad revenue, monthly
   views needed to cover, 3-month coverage reserve. Reuses calculator.js
   patterns (calc-grid, calc-out cards, empty/error states, data-retry
   delegation). Honest math, no income promises.
4. **Nav/hubs/llms** — TOOLS + TOOL_HUB_META (MONEY group, ⚒ icon) +
   MOBILE_NAV_LINKS + footer links; index "All 8 tools →"; llms.txt generator
   text updated ("All eight tools"); llms-full.txt carries the Guide.

Validation: `scripts/build.py` clean (9 chapters, 8 tools, 10 skills,
5 case files, 16,080 words); rebuild committed, then `scripts/validate.sh`
**7/7 GREEN** (12 JS files, 13 JSON files, 0 broken of 1,462 links,
byte-identical rebuild, 16/16 sim assertions, llms counts fresh).

Commit: 74ba71a10927959eac4363b137f438b26a6703c6 (pushed 2026-10-11).

## Wave 14 — Niche Atlas (2026-10-11)

What shipped (all traced to the wave-7 research notes at
`~/workspace/research_notes/wave-fuel-2026-20261011-2355/notes/mission-c-niches.md` —
no invented niches or numbers):
1. **New reference page "The Niche Atlas"** (`content/niche-atlas.md` →
   `site/niche-atlas.html`, registered in `REFERENCE_PAGES`): the <1%-of-
   channels-ever-reach-100K reality check front and center; channel growth
   rates (kids 1.59%, ASMR 1.56%, creator economy 1.50%, challenges/stunts
   1.47%, AI/ML 1.44%, true crime 1.34%); search growth (AI tools +340%
   $8–20 CPM, no-code/automation +220% "most underserved", Gen Z finance
   +180% $18–45, cybersecurity +160%); breakout formats (betrayal/revenge
   21x $20–25 CPM low competition, English learning 21x, senior health 19x
   ultra-low); finance $8–35 vs gaming/entertainment $1–5 RPM reality; the
   avoid list (clipping channels post-Oct-1-update, low-effort AI slop
   post-Jan-purge, kids-content $0.33 RPM trap, gambling/crypto + medical
   claims + news/politics on TikTok); sources + disclaimers intact.
2. **Interactive niche explorer** (`assets/js/niche-atlas.js`, mounted on the
   reference page): filter by revenue tier / competition / startup cost /
   skill fit, sort by channel growth / revenue midpoint / search growth /
   name, "compare two niches" head-to-head table with a plain-language
   verdict; every niche links to its chapter, the Niche Picker, and the
   simulator scenario / case file where one exists. Semantic HTML, labeled
   controls, aria-live result counts, keyboard-native, reduced-motion CSS,
   noscript fallback to the article's static tables.
3. **New API endpoint `api/v1/niches.json`** (source of truth
   `data/niches.json`, mirrored to `site/api/v1/`): 20 sourced niche
   records, 15-source bibliography with observation dates, the avoid list,
   the reality check, revenue-tier legend. Draft-07 schemas
   (`api/v1/schema/niches.json` doc + `niche.json` record), registered in
   the manifest with a freshness note. Documented in AGENT.md, API.md,
   `pages/agents.md`, and the `llms.txt` API section.
4. **Honesty contract intact**: every RPM/CPM figure a creator-reported
   range (never a point estimate), single-source claims flagged on each
   record, sorting uses labeled range midpoints (never presented as rates),
   no income promises, "not financial, legal, or tax advice" on-page and
   in the payload.

Validation: `scripts/build.py` clean (9 chapters, 9 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (15 JS
files node --check, 25 JSON files parse, draft-07 schemas incl. the new
niches/niche pair, 0 broken of 1,654 links, byte-identical rebuild on the
committed tree, 72 sim assertions, 36 agent-workflow assertions, llms
counts fresh).

Commit: 03825a66508de380708ccce6fb0ce9d78f8cb88d (pushed 2026-10-11).

## Wave 15 — The Deal Room (2026-10-11)

What shipped (extends the wave-3 Sponsor Deal Analyzer into full sponsorship
deal management; every benchmark a reported 2026 range, never a quote):
1. **Deal tracker** (`pages/deal-room.html` → `site/deal-room.html`, the 10th
   tool): log offers (brand, platform, followers, deliverable, expected views,
   pay, usage rights, exclusivity, payment terms, timeline, notes) in
   localStorage only — no accounts, no network writes. Status pipeline
   offer → negotiating → signed → delivered → paid (advance buttons + status
   filter). Every deal scored against the 2026 rate card
   (fair/under/over + the ~23%-listed-above-accepted honesty note).
2. **Usage-rights pricing calculator**: base post fee × tier. Reported tiers
   flagged honestly — paid ads 30d +50%, 6mo +75%, 12mo +100% (the wave-2
   research band, each tier labeled reported/not-gospel); whitelisting and
   full buyout return guidance instead of invented multipliers (whitelisting
   priced as a user-set monthly line; buyout a 2.0× negotiation floor or
   refuse outright).
3. **Negotiation scripts** — lowball counter, usage-rights upsell, exclusivity
   pushback, rush-fee ask — all grounded in the rate-card chapter, rendered
   live from one context form, copy-to-clipboard with fallback + aria-live
   confirmation. The rush-fee script carries a fill-in rate: no research
   benchmark exists, and the data says so.
4. **Red-flag checklist** — the walk-away signals (net-90+ without escrow,
   unlimited revisions, perpetual usage for organic price, no kill fee) +
   perpetual whitelisting and broad exclusivity as majors; interactive scoring
   (any walk-away flag or 3+ points → walk away), persisted to localStorage.
5. **"Copy my deal memo"** — one-page deal summary (terms, rate-card score,
   checked flags, counters, disclaimer) from any logged deal: copy to
   clipboard or download .txt.
6. **New API endpoint `api/v1/deal-templates.json`** (source of truth
   `data/deal-templates.json`, mirrored to `site/api/v1/`): 4 scripts,
   6 red-flag items, 6 usage-rights tiers, scoring rules. Draft-07 doc schema
   (`api/v1/schema/deal-templates.json`), registered in the manifest
   (schemas count 13 → 14, freshness note on the endpoint). Documented in
   AGENT.md (Workflow 5 + programmatic-tools table), API.md, `pages/agents.md`
   (surface table + workflow 5), README, and the `llms.txt` API section.
7. **Deal Room engine** (`assets/js/deal-room.js`, UMD — browser +
   `require()`-able in node): `scoreOffer`, `priceUsage`, `redFlagScore`,
   `renderScript`, `dealMemo`, `tierOf`, `nice`, `fmt`; UI wiring in
   `assets/js/deal-room-ui.js` (pure-math-free, localStorage, clipboard).
   Registered as TOOLS entry 10 (MONEY group in the hub, "All 10 tools"
   everywhere) with a `tools.json` input schema + drive notes. The
   wave-3 deal analyzer page now cross-links to the Deal Room.

Validation: `scripts/build.py` clean (9 chapters, 10 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (18 JS
files node --check, JSON parse, draft-07 schemas incl. the new
deal-templates doc, 0 broken links, byte-identical rebuild on the committed
tree, 72 sim + **78 deal-room** engine assertions, 47 agent-workflow
assertions — incl. the new Workflow 5 against the real JSONs, llms counts
fresh).

Commit: ca56215f7f560cb300de11fccab5e1362905f2ae (pushed 2026-10-11).

## Wave 16 — The Content Engine (2026-10-11)

What shipped (the missing pillar: idea → production → repurposing, three new
interactive tools, 10 → 13):

1. **Idea Bank** (`pages/idea-bank.html` → `site/idea-bank.html`, tool 11):
   localStorage idea capture — title, format (long/short/community), niche
   tag (datalist from `api/v1/niches.json`, free text fallback), effort
   estimate, hook-strength self-score 1–5 scored against the five Short-Form
   Playbook hook structures (reference cards on-page, linked to the Hook
   Builder). Sort by score (ties FIFO) or newest, filter by format;
   "Promote to production" moves an idea into the content calendar's dealing
   pool. localStorage only, nothing leaves the browser.
2. **90-Day Content Calendar** (`pages/content-calendar.html`, tool 12):
   cadence input (X longs + Y shorts/week, rest day, 13 weeks) auto-deals
   the bank into a 90-day grid using the week-planner dealing rules — longs
   sort by hook score then round-robin across non-rest work days, shorts
   every other work day, rest day non-negotiable, week 7 midpoint review.
   Empty slots stay OPEN (never filler); surplus ideas return as backlog.
   Drag-and-drop + keyboard move (‹ › buttons, arrow keys), star-marked
   sponsor slots (calendar commitments only — price them in the Deal Room),
   "Copy my calendar" text export, and "Send cadence to Simulator"
   (copies `{longform_per_week, shorts_per_week}` for the Simulator — a model,
   not a prediction). Moves/sponsor marks persist per config in localStorage.
3. **Batching Planner** (`pages/batching.html`, tool 13): "film day" math —
   videos/shoot-day + shoot-days/month vs cadence × 52/12 (the honest month).
   Surplus/balanced/shortfall verdict with honest guidance and the
   consistency-beats-volume framing ("'I'll find the time' is not capacity").
   No promises: pure arithmetic on the creator's own inputs.
4. **Repurposing Pipeline 2.0**: extends the wave-3 planner in place
   (`assets/js/repurpose.js` now loads the shared engine). One long-form
   pillar in → the 7-derivative map (short clip, community reaction, TikTok
   cut, Reel cut, newsletter issue, X thread, Facebook post) — every
   derivative carries a **required original element**, plus the Oct-1
   originality guardrails (no identical re-uploads, fresh hooks, native
   grammar, written text derivatives, atom-test gate). Repurposing is not
   re-uploading.
5. **Content engine** (`assets/js/content-engine.js`, UMD — browser +
   `require()`-able in node): `hookScore`, `sortIdeas`, `filterIdeas`,
   `dealIdeas`, `batchingMath`, `repurposeMap`, `originalityGuardrails`,
   `simInputFromCadence`, `exportCalendarText`. UI scripts
   (`idea-bank-ui.js`, `content-calendar-ui.js`, `batching-ui.js`) are
   pure-math-free DOM/localStorage wiring. Honesty contract: the engine does
   arithmetic on the creator's inputs only — never promises views, revenue,
   or growth. A planning aid, not financial/legal/tax advice.
6. **New API endpoint `api/v1/content-engine.json`** (source of truth
   `data/content-engine.json`, mirrored to `site/api/v1/`): 3 idea formats,
   5 hook structures, dealing rules, batching guidance, the 2.0 derivative
   map, 5 guardrails, deal-slot guidance, simulator bridge. Draft-07 doc
   schema (`api/v1/schema/content-engine.json`, derivative/guardrail/hook ids
   cross-checked against the engine by the test suite), registered in the
   manifest (schemas count 14 → 15). Documented in AGENT.md (Workflow 6 +
   tools table), API.md (endpoint + schema list), `pages/agents.md`
   (surface table + workflow 6), README, and the `llms.txt` API section.

Cross-links: Idea Bank → Hook Builder (structures) + Niche Atlas (tags);
calendar → Simulator (cadence bridge) + Deal Room/rate card (sponsor slots);
batching → Planner + Simulator; repurposing 2.0 → Idea Bank + calendar.

Validation: `scripts/build.py` clean (9 chapters, 13 tools, 12 skills,
5 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (23 JS
files node --check, JSON parse, draft-07 schemas incl. the new
content-engine doc, 0 broken links (1,896 checked), byte-identical rebuild
on the committed tree, 72 sim + 78 deal-room + **49 content-engine** engine
assertions, 47 agent-workflow assertions — incl. the new Workflow 6 against
the real JSONs, llms counts fresh).

Commit: 868a16f (local) → d793f2d08b79e36ee8035cfabfbdc7aa4b1c3aeb (pushed 2026-10-11, remote tree verified via GitHub API).


## Wave 17 — Case files 6–7: The Poly Couple + Gibi ASMR (2026-10-11)

Deep sourced content wave. Two new case files in the existing format, both
with public, verifiable trajectories — zero invented numbers, zero income
claims (revenue is never stated or implied in either file):

1. **The Poly Couple** (`pages/case-poly-couple.md`) — Dana and the Wolf's
   serialized micro-drama, from the wave-7 21x breakout-format territory.
   Music covers → vlogs → a fictionalized-relationship shorts series;
   the Oatly casting (Lana Spring) and love-triangle arc shot it to
   popularity. Sourced numbers: nearly 400K YouTube subs, 10K+ consistent
   viewers/episode, hundreds of episodes deep (Trill Magazine, Oct 2026);
   the 11,000-view turning point and Electric Now pickup after TikTok
   discovery by Dean Devlin (Dope Interviews); series underway by ~2021
   (podcast archive, flagged as estimate). Takeaways tie to Playbook
   serialized-drama mechanics (numbered series, recurring characters),
   Niche Atlas betrayal-dramas card, Content Engine batching, and the new
   `serialized-mini-drama` simulator scenario.

2. **Gibi ASMR** (`pages/case-gibi-asmr.md`) — the ASMR case from the same
   territory. June 2016 channel creation, full-time from day one (took
   winter quarter off), 100K by Jan 2017, then public milestone dates:
   1M (Jun 7, 2018) → 5M (Jun 3, 2024), ~5.2M subs / 2.56B views /
   ~2,000 videos (SocialBlade, Oct 2026 — flagged verify-live). Mechanics:
   cosplay-convention crossover into roleplay ASMR, original + licensed
   characters, Twitch/sideways expansion, mainstream crossovers (Rooster
   Teeth, Polydor, Reese The Movie), then the talent-agency stack. Takeaways
   tie to Content Engine batching, Niche Atlas ASMR card, the new
   `asmr-roleplay` simulator scenario, and the avoid-list lesson (visible
   human creativity as the moat under the 2026 inauthentic-content
   enforcement).

**Simulator scenarios** (both case-modeled, proxies declared in
`nicheProxyNote`, labeled as planning assumptions not historical replays):
`serialized-mini-drama` (comedy_entertainment, 1 longform + 4 shorts/wk) and
`asmr-roleplay` (lifestyle proxy, 2 longform + 3 shorts/wk, sponsors on).
Scenario library now 8; the `scenario_id` enum in the simulator tool schema
grew 6 → 8, and the wf4 workflow tests were updated to match.

**Cross-links**: case-files hub (CASE_HUB + 7-file nav chain
ptya → poly-couple → gibi-asmr → agents), footer nav, home sticker
("7 case files"), Niche Atlas niche cards (betrayal-dramas →
case-poly-couple.html; asmr → case-gibi-asmr.html, simulator_scenario
pointers updated), Short-Form Playbook serialized mini-dramas bullet,
AGENT.md/README.md counts.

Validation: `scripts/build.py` clean (9 chapters, 13 tools, 12 skills,
7 case files, 16,153 words); `scripts/validate.sh` **8/8 GREEN** (23 JS
files node --check, JSON parse, draft-07 schemas, 0 broken links (2,076
checked), byte-identical rebuild, 80 sim + 78 deal-room + 49 content-engine
engine assertions, 59 agent-workflow assertions).

Commit: 8d903f5 (local) → 321ca1bfdb490ebb4a5a0516c01f578cd597bf3e (pushed 2026-10-11, remote tree verified via GitHub API).
