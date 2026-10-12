/* changes-feed.js — Algorithm Watch "what changed" feed widget (Wave B).
 *
 * Contract (ARCHITECTURE.md §3): the page ships pre-rendered with the static
 * feed baked in. On load this calls /api/changes first (7s timeout via
 * ApiClient.fetchWithFallback) and swaps in fresh data on success; on any
 * failure the pre-rendered static feed stays and the badge goes honest
 * ("cached · updated HH:MM"). The page is never blank, never errors.
 *
 * Loaded with defer, after assets/js/api-client.js.
 */
(function () {
  "use strict";

  var LIVE_PATH = "/api/changes?limit=200";
  // relative (not root-absolute): matches the site's asset convention and keeps
  // the fallback working from any origin that serves this page at root —
  // including a local file:// copy of the built site.
  var STATIC_PATH = "api/v1/changes.json";
  var PLATFORM_ORDER = ["youtube", "tiktok", "instagram", "facebook", "x", "other"];
  var PLATFORM_LABELS = {
    youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
    facebook: "Facebook", x: "X", other: "Other"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cap(s) {
    s = String(s || "");
    if (Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, s)) return PLATFORM_LABELS[s];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function dateOnly(iso) {
    var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(iso || ""));
    return m ? m[1] : "date unknown";
  }

  function confidenceChip(conf) {
    if (conf === "verified") {
      return '<span class="aw-chip aw-chip-verified">Verified</span>';
    }
    return '<span class="aw-chip aw-chip-single">Single-source</span>';
  }

  function entryHtml(c) {
    var sources = Array.isArray(c.sources) ? c.sources : [];
    var srcItems = sources.map(function (s) {
      var name = esc(s.name || "source");
      var url = typeof s.url === "string" && /^https?:\/\//i.test(s.url) ? s.url : "";
      var link = url
        ? '<a href="' + esc(url) + '" rel="noopener">' + name + "</a>"
        : "<span>" + name + "</span>";
      return '<li><span class="aw-src-tag" aria-hidden="true">SRC</span>' + link + "</li>";
    }).join("");
    return (
      '<li class="aw-entry brk" data-platform="' + esc(c.platform || "other") + '">' +
      '<b class="brk-x" aria-hidden="true"></b>' +
      '<div class="aw-entry-head"><h2>' + esc(c.title || "Untitled change") + "</h2>" +
      '<span class="aw-date">' + esc(dateOnly(c.detected_at)) + "</span></div>" +
      '<div class="aw-chips">' +
      '<span class="aw-chip aw-chip-platform">' + esc(cap(c.platform || "other")) + "</span>" +
      '<span class="aw-chip aw-chip-category">' + esc(cap(c.category || "policy")) + "</span>" +
      confidenceChip(c.confidence) +
      "</div>" +
      '<p class="aw-summary">' + esc(c.summary || "") + "</p>" +
      (srcItems ? '<ul class="aw-sources" aria-label="Sources">' + srcItems + "</ul>" : "") +
      "</li>"
    );
  }

  function platformsIn(entries) {
    var seen = [];
    entries.forEach(function (c) {
      var p = c.platform || "other";
      if (seen.indexOf(p) === -1) seen.push(p);
    });
    return PLATFORM_ORDER.filter(function (p) { return seen.indexOf(p) !== -1; })
      .concat(seen.filter(function (p) { return PLATFORM_ORDER.indexOf(p) === -1; }));
  }

  function init() {
    var root = document.querySelector("[data-changes-feed]");
    if (!root || !window.ApiClient) return; // pre-rendered feed stays; never broken
    var badge = document.getElementById("aw-badge");
    var list = root.querySelector("[data-aw-list]");
    var filters = root.querySelector("[data-aw-filters]");
    var count = root.querySelector("[data-aw-count]");
    var updated = root.querySelector("[data-aw-updated]");
    if (!list) return;

    var entries = [];
    var activePlatform = "all";

    function renderFilters() {
      if (!filters) return;
      var plats = platformsIn(entries);
      var html = '<button type="button" class="aw-filter" data-aw-platform="all" aria-pressed="' +
        (activePlatform === "all" ? "true" : "false") + '">All</button>';
      html += plats.map(function (p) {
        var n = entries.filter(function (c) { return (c.platform || "other") === p; }).length;
        return '<button type="button" class="aw-filter" data-aw-platform="' + esc(p) +
          '" aria-pressed="' + (activePlatform === p ? "true" : "false") + '">' +
          esc(cap(p)) + " · " + n + "</button>";
      }).join("");
      filters.innerHTML = html;
    }

    function render() {
      var shown = entries.filter(function (c) {
        return activePlatform === "all" || (c.platform || "other") === activePlatform;
      });
      if (!shown.length) {
        list.innerHTML = '<li class="aw-empty" role="status">No changes in this slice of the feed yet — the watch is running, the log is just quiet here.</li>';
      } else {
        list.innerHTML = shown.map(entryHtml).join("");
      }
      if (count) count.textContent = shown.length + (shown.length === 1 ? " change" : " changes") + " · 90-day window";
      renderFilters();
    }

    if (filters) {
      filters.addEventListener("click", function (ev) {
        var btn = ev.target.closest ? ev.target.closest("[data-aw-platform]") : null;
        if (!btn) return;
        activePlatform = btn.getAttribute("data-aw-platform") || "all";
        render();
      });
    }

    // live first; static fallback keeps the pre-rendered DOM if nothing lands
    window.ApiClient.fetchWithFallback(LIVE_PATH, STATIC_PATH, { badgeEl: badge })
      .then(function (result) {
        var payload = result.data || {};
        // live envelope data and the static doc both carry .changes[]
        var rows = Array.isArray(payload.changes) ? payload.changes : null;
        if (!rows) return; // source "none": keep pre-rendered, badge hidden by the client
        entries = rows;
        activePlatform = "all";
        render();
        if (updated) {
          var gen = payload.feed_generated_at || payload.generated_at || result.generatedAt || null;
          var label = result.source === "live" ? "fresh from the server" : "last published";
          updated.innerHTML = gen
            ? "Feed data <strong>" + esc(label) + "</strong> · generated " + esc(String(gen).replace("T", " ").slice(0, 16)) + " UTC"
            : "Feed data <strong>" + esc(label) + "</strong>";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
