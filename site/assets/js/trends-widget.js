/* trends-widget.js, "Hottest topics to cover" widget for Creator Growth Empire.
 *
 * Live trend feed from the trend-machine sibling site. Fetches
 * ${TRENDS_API_BASE}/data/v1/trends.json and renders the top-N trends.
 *
 * Graceful degradation: on ANY failure (no config, network error, timeout,
 * non-JSON, unrecognized schema) the widget hides itself silently, no
 * console errors, no layout breakage, no half-rendered state.
 *
 * Config (first non-empty wins):
 *   1. window.TRENDS_API_BASE
 *   2. <meta name="trends-api-base" content="https://trends.example.com">
 *
 * Usage: <div data-trends-widget data-trends-limit="6"></div>
 *        plus the one <script> include in TRENDS_INTEGRATION.md.
 *
 * Schema support (normalized to a common shape):
 *   A. trend-machine wave-1 feed: { generated_at, topics: [{ id, title,
 *      summary, category, platforms[], hashtags[], velocity, saturation,
 *      opportunity_score, first_seen, last_seen, sources: [{name, url}] }] }
 *   B. legacy/minimal feed: { trends: [{ id, title, source, url, velocity,
 *      opportunity_score, hashtags[], detected_at }] }
 */
(function () {
  "use strict";

  var FETCH_TIMEOUT_MS = 8000;
  var DEFAULT_LIMIT = 6;
  var ATTR = "data-trends-widget";

  /* ---------- config ---------- */
  function getBase() {
    try {
      if (typeof window !== "undefined" && typeof window.TRENDS_API_BASE === "string" && window.TRENDS_API_BASE.trim()) {
        return window.TRENDS_API_BASE.replace(/\/+$/, "");
      }
      if (typeof document !== "undefined") {
        var meta = document.querySelector('meta[name="trends-api-base"]');
        if (meta && meta.getAttribute("content")) return meta.getAttribute("content").trim().replace(/\/+$/, "");
      }
    } catch (e) { /* config read must never throw */ }
    return "";
  }

  /* ---------- schema normalization ---------- */
  function safeUrl(u) {
    if (typeof u !== "string") return "";
    u = u.trim();
    if (/^https?:\/\//i.test(u)) return u;
    return "";
  }

  function normItem(t) {
    if (!t || typeof t !== "object") return null;
    var title = typeof t.title === "string" ? t.title.trim() : "";
    if (!title) return null;
    var source = "", url = "";
    if (Array.isArray(t.sources) && t.sources.length && typeof t.sources[0] === "object") {
      source = String(t.sources[0].name || "").trim();
      url = safeUrl(t.sources[0].url);
    } else {
      // legacy shape: source/url as plain strings
      if (typeof t.source === "string") source = t.source.trim();
      url = safeUrl(t.url);
    }
    return {
      id: typeof t.id === "string" ? t.id : "",
      title: title,
      summary: typeof t.summary === "string" ? t.summary : "",
      source: source,
      url: url,
      category: typeof t.category === "string" ? t.category : "",
      velocity: numOrNull(t.velocity),
      opportunity_score: numOrNull(t.opportunity_score),
      hashtags: Array.isArray(t.hashtags)
        ? t.hashtags.filter(function (h) { return typeof h === "string" && h.trim(); }).slice(0, 5)
        : []
    };
  }

  function numOrNull(v) {
    if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.min(100, v));
    return null;
  }

  function normalizeTrends(payload) {
    if (!payload || typeof payload !== "object") return null;
    var raw = Array.isArray(payload.topics) ? payload.topics
            : Array.isArray(payload.trends) ? payload.trends
            : null;
    if (!raw) return null;
    var out = raw.map(normItem).filter(function (x) { return x !== null; });
    return out.length ? out : null;
  }

  /* ---------- rendering (DOM only, textContent-safe) ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function meter(label, value) {
    var wrap = el("div", "tw-meter");
    var top = el("div", "tw-meter-top");
    top.appendChild(el("span", "tw-meter-label", label));
    top.appendChild(el("span", "tw-meter-value", value == null ? "·" : String(Math.round(value))));
    wrap.appendChild(top);
    var bar = el("div", "tw-meter-bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", value == null ? "0" : String(Math.round(value)));
    bar.setAttribute("aria-label", label);
    var fill = el("span", "tw-meter-fill");
    fill.style.width = (value == null ? 0 : Math.round(value)) + "%";
    bar.appendChild(fill);
    wrap.appendChild(bar);
    return wrap;
  }

  function card(t) {
    var li = el("li", "tw-card");
    li.setAttribute("role", "listitem");
    var title = t.title;
    if (t.url) {
      var a = el("a", "tw-title");
      a.setAttribute("href", t.url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.textContent = title;
      li.appendChild(a);
    } else {
      li.appendChild(el("h3", "tw-title", title));
    }
    if (t.summary) li.appendChild(el("p", "tw-summary", t.summary));
    var meta = el("div", "tw-meta");
    if (t.source) meta.appendChild(el("span", "tw-source", t.source));
    if (t.category) meta.appendChild(el("span", "tw-category", t.category));
    if (meta.childNodes.length) li.appendChild(meta);
    if (t.velocity != null || t.opportunity_score != null) {
      var meters = el("div", "tw-meters");
      if (t.velocity != null) meters.appendChild(meter("Velocity", t.velocity));
      if (t.opportunity_score != null) meters.appendChild(meter("Opportunity", t.opportunity_score));
      li.appendChild(meters);
    }
    if (t.hashtags.length) {
      var tags = el("div", "tw-tags");
      t.hashtags.forEach(function (h) { tags.appendChild(el("span", "tw-tag", h)); });
      li.appendChild(tags);
    }
    return li;
  }

  function renderTrendsInto(host, trends) {
    if (!host || !trends || !trends.length) return false;
    var limit = parseInt(host.getAttribute("data-trends-limit"), 10);
    if (!isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
    var list = el("ul", "tw-list");
    list.setAttribute("role", "list");
    trends.slice(0, limit).forEach(function (t) { list.appendChild(card(t)); });
    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(list);
    return true;
  }

  function hide(host) {
    try {
      host.setAttribute("aria-hidden", "true");
      host.style.display = "none";
    } catch (e) { /* hiding must never throw */ }
  }

  /* ---------- fetch ---------- */
  function loadTrends(base) {
    var ctrl;
    try { ctrl = new AbortController(); } catch (e) { ctrl = null; }
    var timer = null;
    if (ctrl) timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
    var url = base + "/data/v1/trends.json";
    var opts = ctrl ? { signal: ctrl.signal, mode: "cors", credentials: "omit" } : { mode: "cors" };
    return fetch(url, opts)
      .then(function (res) {
        if (!res || !res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (payload) {
        var tr = normalizeTrends(payload);
        if (tr) tr.generated_at = (payload && (payload.generated_at || payload.generatedAt)) || "";
        return tr;
      })
      .then(function (trends) {
        if (timer) clearTimeout(timer);
        return trends;
      }, function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      });
  }

  /* ---------- init ---------- */
  function init() {
    var base = getBase();
    var hosts = [];
    try { hosts = Array.prototype.slice.call(document.querySelectorAll("[" + ATTR + "]")); } catch (e) { return; }
    if (!hosts.length) return;
    if (!base) { hosts.forEach(hide); return; } // no config -> silent hide
    loadTrends(base).then(
      function (trends) {
        if (!trends || !trends.length) { hosts.forEach(hide); return; }
        /* The age rule (Claude bundle 2026-10-24): the list always
           says how old it is, and a list more than 12 hours old does
           not show at all. No date on the feed counts as too old. */
        var genMs = Date.parse(trends.generated_at || "");
        var ageH = isFinite(genMs) ? (Date.now() - genMs) / 3600000 : Infinity;
        if (!(ageH <= 12)) { hosts.forEach(hide); return; }
        hosts.forEach(function (h) {
          var ageEl = h.parentNode ? h.parentNode.querySelector("[data-trends-age]") : null;
          if (ageEl) {
            ageEl.textContent = ageH < 1
              ? "This list is less than an hour old."
              : "This list is about " + Math.round(ageH) + (Math.round(ageH) === 1 ? " hour" : " hours") + " old.";
          }
        });
        hosts.forEach(function (h) {
          try {
            var ok = renderTrendsInto(h, trends);
            if (!ok) hide(h);
            else h.style.display = ""; // reveal (builder may start it hidden)
          } catch (e) { hide(h); }
        });
      },
      function () { hosts.forEach(hide); } // any failure -> silent hide
    );
  }

  var api = { init: init, renderTrendsInto: renderTrendsInto, normalizeTrends: normalizeTrends, loadTrends: loadTrends };

  if (typeof window !== "undefined") {
    window.TrendsWidget = api;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else { try { init(); } catch (e) {} }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
