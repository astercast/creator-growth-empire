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
  var STATIC_PATH = "data/v1/changes.json";
  var PLATFORM_ORDER = ["youtube", "tiktok", "instagram", "facebook", "x", "twitch", "kick", "other"];
  var PLATFORM_LABELS = {
    youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
    facebook: "Facebook", x: "X", twitch: "Twitch", kick: "Kick", other: "Other"
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

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function dateLabel(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    var mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
    return MONTHS[mo - 1] + " " + d + ", " + m[1];
  }

  /* Announced / effective / logged line — only the dates the entry
     actually carries. Must match _aw_dates_html() in scripts/build.py. */
  function datesHtml(c) {
    var parts = [];
    var ann = dateLabel(c.announced_at), eff = dateLabel(c.effective_at),
      det = dateLabel(c.detected_at);
    if (ann) parts.push("Announced " + ann);
    if (eff) parts.push("Takes effect " + eff);
    if (det) parts.push("Logged " + det);
    if (!parts.length) return "";
    return '<p class="aw-dates">' + esc(parts.join(" · ")) + "</p>";
  }

  /* Coverage panel: every platform slot, its count, and its newest logged
     date — or an honest "no entry" line. Must match build.py's panel. */
  function coverageHtml(entries) {
    var counts = {}, newest = {};
    entries.forEach(function (c) {
      var p = c.platform || "other";
      counts[p] = (counts[p] || 0) + 1;
      var d = dateOnly(c.detected_at);
      if (!newest[p] || d > newest[p]) newest[p] = d;
    });
    return PLATFORM_ORDER.map(function (p) {
      var n = counts[p] || 0;
      if (n) {
        return '<li class="aw-cov-row"><span class="aw-cov-plat">' + esc(cap(p)) +
          '</span><span class="aw-cov-n">' + n + (n === 1 ? " entry" : " entries") +
          '</span><span class="aw-cov-date">newest ' + esc(dateLabel(newest[p]) || "—") + "</span></li>";
      }
      return '<li class="aw-cov-row aw-cov-empty"><span class="aw-cov-plat">' + esc(cap(p)) +
        '</span><span class="aw-cov-n">No entry in the current window</span>' +
        '<span class="aw-cov-date">standing rules: Platform Rules Bible §13</span></li>';
    }).join("");
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
      datesHtml(c) +
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
    var status = root.querySelector("[data-aw-status]");
    var coverage = root.querySelector("[data-aw-coverage]");
    if (!list) return;

    /* Failure states are stated, never smoothed over: a reader must be
       able to tell live data from a published copy from a baked-in page. */
    function setStatus(text) {
      if (!status) return;
      if (text) {
        status.textContent = text;
        status.hidden = false;
      } else {
        status.textContent = "";
        status.hidden = true;
      }
    }

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
        if (!rows) {
          // source "none": both the live server and the static fallback
          // failed. Keep the pre-rendered feed — and say what it is.
          setStatus("The live server did not answer and the published feed file failed to load. " +
            "You are reading the copy baked into this page at its last build — its dates are the " +
            "newest confirmed state, not live data. Try again later; nothing here is being " +
            "presented as a live check.");
          return;
        }
        entries = rows;
        activePlatform = "all";
        render();
        if (coverage) coverage.innerHTML = coverageHtml(entries);
        if (result.source === "live" && result.degraded) {
          setStatus("The live server answered with degraded data" +
            (result.note ? ": " + result.note : ".") +
            " Entries below carry the server's own timestamps; check the dates before acting.");
        } else if (result.source === "static") {
          setStatus("The live server did not answer, so this is the last published copy of the feed. " +
            "It is dated below — read it as a published log, not a live check.");
        } else {
          setStatus("");
        }
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
