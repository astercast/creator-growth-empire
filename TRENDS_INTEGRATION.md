# Trend-feed integration (Creator Growth Empire ⇄ trend-machine)

How the site's "Hottest topics to cover" widget gets live trend data.

## One include line

Add this wherever the widget should appear:

```html
<div data-trends-widget data-trends-limit="6"></div>
<script src="/assets/js/trends-widget.js"></script>
```

The widget auto-initializes on load. `data-trends-limit` is optional (default 6).

Recommended minimal styling (no animation = inherently reduced-motion safe;
the builder's site theme can restyle these classes freely):

```css
.tw-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
.tw-card { padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
.tw-title { font-size: 1.05rem; font-weight: 600; }
.tw-summary { font-size: .9rem; color: #555; }
.tw-meta { display: flex; gap: .5rem; font-size: .75rem; color: #777; }
.tw-meter-bar { height: 6px; background: #eee; border-radius: 3px; }
.tw-meter-fill { display: block; height: 100%; background: #2b7; border-radius: 3px; }
.tw-tags { display: flex; flex-wrap: wrap; gap: .35rem; }
.tw-tag { font-size: .75rem; background: #f2f2f2; border-radius: 4px; padding: .1rem .4rem; }
```

## Configuration

The widget reads the API base from the first non-empty of:

```js
window.TRENDS_API_BASE = "https://trends.example.com";
```

or

```html
<meta name="trends-api-base" content="https://trends.example.com">
```

No URL is hardcoded anywhere. Set it once per page template; the widget
fetches `${base}/api/v1/trends.json`.

- **Production:** point at the deployed trend-machine origin
  (e.g. `https://trend-machine.example.com`) once it is deployed and serving
  the API. The trend-machine must serve `Access-Control-Allow-Origin: *` on its
  `api/` path (CORS) or the browser will block the cross-origin fetch.
- **Local dev:** serve the trend-machine's `api/` directory locally
  (e.g. `python3 -m http.server` inside it) and set the base to
  `http://localhost:8000`. Same-directory dev (both sites from one server) works too.

## Expected schema (`api/v1/trends.json`)

The trend-machine's live feed (confirmed 2026-10-11 from its wave-1
`data/trends.json` seed — the published `api/v1/trends.json` mirrors this):

```json
{
  "generated_at": "2026-10-11T15:10:00-07:00",
  "topics": [
    {
      "id": "six-seven-meme",
      "title": "\"6-7\" — Gen Alpha's defining brainrot joke",
      "summary": "Born from Skrilla's viral TikTok song …",
      "category": "meme",
      "platforms": ["tiktok", "youtube"],
      "hashtags": ["#67", "#sixseven", "#brainrot"],
      "velocity": 92,
      "saturation": "medium",
      "opportunity_score": 60,
      "first_seen": "2026-09-01T00:00:00-07:00",
      "last_seen": "2026-10-11T15:10:00-07:00",
      "sources": [{ "name": "LatestLY", "url": "https://…" }],
      "angles": ["…"], "hooks": ["…"], "who_to_watch": ["…"]
    }
  ]
}
```

The widget also accepts a legacy/minimal shape
(`{ trends: [{ id, title, source, url, velocity, opportunity_score, hashtags[], detected_at }] }`)
for backward compatibility — both normalize to the same card fields:
title, summary, source (first `sources[].name`), url (first `sources[].url`),
category, velocity, opportunity_score, hashtags.

## Fallback behavior (graceful degradation)

On ANY failure — no base configured, DNS/network down, timeout (8 s),
non-200, invalid JSON, unrecognized schema, empty list — the widget hides
itself (`display:none`, `aria-hidden`) and logs nothing. Zero console errors,
zero layout breakage. The page reads exactly as if the widget slot doesn't
exist until the API is reachable again.

## Reuse export

The script exposes `window.TrendsWidget` with:

- `init()` — find `[data-trends-widget]` slots and populate them
- `renderTrendsInto(el, trends)` — render normalized trend objects into a DOM element
- `normalizeTrends(payload)` — validate + normalize a feed payload (returns `null` when invalid)
- `loadTrends(base)` — fetch + normalize (rejects on any failure)

`renderTrendsInto` and `normalizeTrends` are also exposed via `module.exports`
for Node-based testing.
