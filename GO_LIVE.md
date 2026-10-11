# Go-live guide — Creator Growth Empire

## 1. Live architecture

- The site is a static site. The deploy root is `site/` — a static host
  (GitHub Pages, Netlify Drop, Cloudflare Pages, any file server) serves it
  verbatim. There is no server-side code on this site.
- **Trends arrive client-side.** The "Hottest topics to cover" widget
  (`assets/js/trends-widget.js`) fetches `api/v1/trends.json` from the
  deployed **trend-machine** origin directly in the visitor's browser
  (CORS fetch). Trend data therefore stays live without any rebuild or
  redeploy of this site.
- **CORS requirement (flag for whoever deploys trend-machine):** the
  trend-machine must serve `Access-Control-Allow-Origin: *` (or at least the
  Creator Growth Empire origin) on its `api/` path. Without this header the
  browser blocks the cross-origin fetch and the widget degrades to hidden.
  No key or auth is involved — the endpoint is public by design.

## 2. What's live vs static

| Feature | Mode | Notes |
|---|---|---|
| Trend widget ("Hottest topics to cover") | Live client-side fetch | Refreshes every page load from trend-machine's API; hides silently if the API is down |
| Calculators, quiz, planner | Client-side, live by design | Pure JS in `assets/js/`; no backend needed |
| Chapters / guide content | Static | Baked into the pages at build time |

## 3. Integration contract

- **Endpoint:** `GET {TRENDS_API_BASE}/api/v1/trends.json` (public, no auth)
- **Schema:** `{ generated_at, topics: [{ id, title, summary, category,
  platforms[], hashtags[], velocity, saturation, opportunity_score,
  first_seen, last_seen, sources: [{name, url}] }] }` — full contract in
  `TRENDS_INTEGRATION.md`. A legacy `{ trends: [...] }` shape is also accepted.
- **Semver:** additive fields are safe; breaking renames must bump the
  integration doc and the widget together.
- **SLA expectation:** none — the widget treats any failure as "hide silently".
  If trend-machine goes down, this site is unaffected (the widget simply
  doesn't render).

## 4. Deploy checklist

1. Builder finishes wave 1; `site/` is generated and complete.
2. Deploy the trend-machine site somewhere; verify
   `https://<trend-machine>/api/v1/trends.json` returns valid JSON with
   `Access-Control-Allow-Origin: *`.
3. Copy the built `site/` output to the static host.
4. Set `TRENDS_API_BASE` on every page template (either `window.TRENDS_API_BASE`
   or the `<meta name="trends-api-base">` tag) to the deployed trend-machine URL.
5. Load a page, open devtools Network tab, confirm the `trends.json` fetch
   returns 200 and the widget populates with trend cards.
6. Break it on purpose (point the base at a bogus URL) and confirm the widget
   hides silently with zero console errors — that's the designed fallback.

## 5. Keys needed

**None on this side.** The trend-machine holds whatever API keys its refresh
pipeline needs (YouTube, X, Reddit, news fetchers); this site never sees them.
The public `api/v1/trends.json` endpoint requires no key.

## 6. Audit status

Full static audit (LIVE.md readiness) is deferred until the builder finishes
wave 1 — `site/` was empty as of 2026-10-11. The pieces built here
(widget + integration contract + this guide) are live-capable and need no
further changes when the builder's pages include the one-line script tag and
set the base URL.
