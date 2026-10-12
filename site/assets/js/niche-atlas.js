/* Niche Atlas explorer: filter, sort, and compare the 20 researched niches.
   Data contract: api/v1/niches.json (data/niches.json is the source of truth).
   Revenue ranges are creator-reported; sorting uses range midpoints, which are
   a sorting convenience, NOT a rate. */
(function () {
  "use strict";

  var MOUNT = "niche-explorer";
  var DATA_URL = "api/v1/niches.json";

  var mount = document.getElementById(MOUNT);
  if (!mount) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function money(n) {
    return n % 1 === 0 ? "$" + n : "$" + n.toFixed(2);
  }

  function revenueLabel(fig) {
    if (!fig) return "";
    return esc(fig.kind) + " " + money(fig.lo) + "–" + money(fig.hi);
  }

  // Sorting key: midpoint of the first reported revenue figure. Sorting
  // convenience only — never presented as a rate.
  function revenueMid(niche) {
    var f = niche.revenue_figures && niche.revenue_figures[0];
    if (!f) return null;
    return (f.lo + f.hi) / 2;
  }

  var SKILL_LABELS = {
    teaching: "Teaching", research: "Research", personality: "Personality",
    "hands-on": "Hands-on", voice: "Voice"
  };
  var TIER_LABELS = { high: "High", mid: "Mid", low: "Low", unknown: "Unknown" };
  var COMP_LABELS = { low: "Low", "very-low": "Very low", medium: "Medium", high: "High" };
  var COST_LABELS = { low: "Low", medium: "Medium", high: "High" };

  var state = {
    tiers: {}, comp: {}, cost: {}, fit: {},
    sort: "growth", multiOnly: false, data: null
  };

  function chipGroup(legend, key, labels, options) {
    var id = "ne-" + key;
    var boxes = options.map(function (opt) {
      return '<label class="ne-chip"><input type="checkbox" data-group="' + key +
        '" value="' + esc(opt) + '" checked> ' + esc(labels[opt]) + "</label>";
    }).join("");
    return '<fieldset class="ne-field"><legend>' + esc(legend) + "</legend>" +
      '<div class="ne-chips" id="' + id + '">' + boxes + "</div></fieldset>";
  }

  function skeleton() {
    mount.innerHTML =
      '<div class="hud-panel ne-panel">' +
      '<div class="hud-head"><span>ATLAS // NICHE EXPLORER</span>' +
      '<span class="hud-status" id="ne-status">LOADING DATA</span></div>' +
      '<div class="hud-body">' +
      '<h2 id="ne-title">The Niche Explorer</h2>' +
      '<p class="lede">Filter the twenty researched niches by what matters to you, then compare any two head to head. ' +
      "All revenue figures are creator-reported ranges — sorting uses a range midpoint as a sorting convenience, never as a rate.</p>" +
      '<form id="ne-form" aria-label="Filter and sort niches">' +
      chipGroup("Revenue tier", "tiers", TIER_LABELS, ["high", "mid", "low", "unknown"]) +
      chipGroup("Competition", "comp", COMP_LABELS, ["low", "very-low", "medium", "high"]) +
      chipGroup("Startup cost", "cost", COST_LABELS, ["low", "medium", "high"]) +
      chipGroup("Skill fit", "fit", SKILL_LABELS, ["teaching", "research", "personality", "hands-on", "voice"]) +
      '<div class="ne-row">' +
      '<label class="ne-sort">Sort by <select id="ne-sort" name="sort">' +
      '<option value="growth">Channel growth (high to low)</option>' +
      '<option value="revenue">Revenue midpoint (high to low)</option>' +
      '<option value="search">Search growth (high to low)</option>' +
      '<option value="name">Name (A to Z)</option>' +
      "</select></label>" +
      '<label class="ne-check"><input type="checkbox" id="ne-multi"> Only multi-sourced niches</label>' +
      "</div></form>" +
      '<p id="ne-count" role="status">Loading niches…</p>' +
      '<div id="ne-results" class="niche-grid"></div>' +
      '<h3 id="ne-compare-title">Compare two niches</h3>' +
      '<div class="ne-compare-controls">' +
      '<label>A <select id="ne-a"></select></label>' +
      '<label>B <select id="ne-b"></select></label>' +
      '<button type="button" id="ne-compare-btn" class="btn btn-primary">Compare</button>' +
      "</div>" +
      '<div id="ne-compare-out" aria-live="polite"></div>' +
      '<p class="ne-foot muted">Revenue tier legend — high: reported ranges reaching about $8+/1K views · mid: about $3–8 · ' +
      "low: below about $3 · unknown: no reported range in the October 2026 research. " +
      "Every record links its sources. This is educational — not financial, legal, or tax advice. Subscribers are not income.</p>" +
      "</div></div>";
  }

  function metricRows(niche) {
    var rows = [];
    if (niche.channel_growth_monthly_pct != null) {
      rows.push('<dt>Channel growth</dt><dd><strong>' +
        niche.channel_growth_monthly_pct.toFixed(2) +
        '%/mo</strong> median (TubeAI, Sep 2026)</dd>');
    }
    if (niche.search_growth_pct != null) {
      rows.push('<dt>Search growth</dt><dd><strong>+' + niche.search_growth_pct +
        '%</strong> (OutlierKit)</dd>');
    }
    if (niche.breakout_rate) {
      rows.push('<dt>Breakout</dt><dd><strong>' + esc(niche.breakout_rate) +
        "</strong> of videos beating channel average 10x</dd>");
    }
    (niche.revenue_figures || []).forEach(function (fig) {
      rows.push('<dt>Revenue</dt><dd><strong>' + revenueLabel(fig) +
        "</strong> " + esc(fig.note || "") + "</dd>");
    });
    if (!rows.length) {
      rows.push('<dt>Revenue</dt><dd>No reported range in the October 2026 research.</dd>');
    }
    return rows.join("");
  }

  function card(niche) {
    var links = (niche.chapter_links || []).map(function (l) {
      return '<a href="' + esc(l.page) + '">' + esc(l.label) + "</a>";
    });
    links.push('<a href="quiz.html">Take the Niche Picker</a>');
    if (niche.simulator_scenario) {
      links.push('<a href="simulator.html">Model it in the Empire Simulator</a>');
    }
    if (niche.case_file) {
      links.push('<a href="' + esc(niche.case_file.page) + '">Case File: ' +
        esc(niche.case_file.title) + "</a>");
    }
    var caveats = (niche.caveats || []).map(function (c) {
      return "<li>" + esc(c) + "</li>";
    }).join("");
    var srcNames = (niche.sources || []).map(sourceName);
    return '<article class="niche-card" aria-label="' + esc(niche.name) + '">' +
      '<h3>' + esc(niche.name) + "</h3>" +
      (niche.single_source ? '<p class="ne-flag">⚑ single-source — lighter evidence</p>' : "") +
      '<p class="ne-summary">' + esc(niche.summary) + "</p>" +
      '<ul class="ne-badges" aria-label="Niche attributes">' +
      "<li>Revenue: " + esc(TIER_LABELS[niche.revenue_tier] || niche.revenue_tier) + "</li>" +
      "<li>Competition: " + esc(COMP_LABELS[niche.competition] || niche.competition) + "</li>" +
      "<li>Startup: " + esc(COST_LABELS[niche.startup_cost] || niche.startup_cost) + "</li>" +
      "</ul>" +
      "<dl class='ne-metrics'>" + metricRows(niche) + "</dl>" +
      '<p class="ne-fit"><strong>Skill fit:</strong> ' +
      niche.skill_fit.map(function (f) { return esc(SKILL_LABELS[f] || f); }).join(", ") + "</p>" +
      '<p class="ne-src"><strong>Sources:</strong> ' + srcNames.map(esc).join(", ") + "</p>" +
      (caveats ? '<ul class="ne-caveats">' + caveats + "</ul>" : "") +
      '<nav class="ne-links" aria-label="Related resources">' + links.join(" · ") + "</nav>" +
      "</article>";
  }

  var sourceMap = {};
  function sourceName(id) {
    return (sourceMap[id] && sourceMap[id].publisher) || id;
  }

  function filtered() {
    var list = state.data.niches.filter(function (n) {
      if (!state.tiers[n.revenue_tier]) return false;
      if (!state.comp[n.competition]) return false;
      if (!state.cost[n.startup_cost]) return false;
      if (state.multiOnly && n.single_source) return false;
      var fitOk = n.skill_fit.some(function (f) { return state.fit[f]; });
      return fitOk;
    });
    var sorters = {
      growth: function (a, b) { return (b.channel_growth_monthly_pct || -1) - (a.channel_growth_monthly_pct || -1); },
      revenue: function (a, b) { return (revenueMid(b) || -1) - (revenueMid(a) || -1); },
      search: function (a, b) { return (b.search_growth_pct || -1) - (a.search_growth_pct || -1); },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    };
    list.sort(sorters[state.sort] || sorters.growth);
    return list;
  }

  function render() {
    var list = filtered();
    var results = document.getElementById("ne-results");
    var count = document.getElementById("ne-count");
    var total = state.data.niches.length;
    count.textContent = "Showing " + list.length + " of " + total + " niches.";
    results.innerHTML = list.length
      ? list.map(card).join("")
      : '<p class="muted">No niches match those filters — loosen one and try again.</p>';
    var status = document.getElementById("ne-status");
    if (status) status.textContent = "DATA LIVE";
  }

  function cell(niche, fn) {
    return "<td>" + fn(niche) + "</td>";
  }

  function compareRow(label, fn) {
    var a = state.data.niches[state.aIdx], b = state.data.niches[state.bIdx];
    return "<tr><th scope=\"row\">" + esc(label) + "</th>" + cell(a, fn) + cell(b, fn) + "</tr>";
  }

  function growthCell(n) {
    return n.channel_growth_monthly_pct != null
      ? "<strong>" + n.channel_growth_monthly_pct.toFixed(2) + "%/mo</strong>" : "—";
  }
  function searchCell(n) {
    return n.search_growth_pct != null ? "<strong>+" + n.search_growth_pct + "%</strong>" : "—";
  }
  function revenueCell(n) {
    return (n.revenue_figures || []).map(revenueLabel).join("<br>") || "No reported range";
  }
  function plainCell(fn) {
    return function (n) { return esc(fn(n)); };
  }

  function verdict(a, b) {
    var gA = a.channel_growth_monthly_pct, gB = b.channel_growth_monthly_pct;
    var rA = revenueMid(a), rB = revenueMid(b);
    var bits = [];
    if (gA != null && gB != null && gA !== gB) {
      bits.push((gB > gA ? b.name : a.name) + " leads on channel growth (" +
        Math.max(gA, gB).toFixed(2) + "% vs " + Math.min(gA, gB).toFixed(2) + "%/mo).");
    }
    if (rA != null && rB != null && rA !== rB) {
      bits.push((rB > rA ? b.name : a.name) +
        " leads on reported revenue range — and the subscriber winner is not always the revenue winner.");
    }
    if (!bits.length) bits.push("These two trade blows on different strengths — check competition and startup cost below.");
    return bits.join(" ");
  }

  function runCompare() {
    var aSel = document.getElementById("ne-a"), bSel = document.getElementById("ne-b");
    state.aIdx = aSel.selectedIndex; state.bIdx = bSel.selectedIndex;
    var a = state.data.niches[state.aIdx], b = state.data.niches[state.bIdx];
    if (a.id === b.id) {
      document.getElementById("ne-compare-out").innerHTML =
        '<p class="muted">Pick two different niches to compare.</p>';
      return;
    }
    var html =
      '<div class="table-wrap"><table class="compare-table">' +
      "<caption>Head-to-head: " + esc(a.name) + " vs " + esc(b.name) + "</caption>" +
      "<thead><tr><th scope=\"col\">Metric</th><th scope=\"col\">" + esc(a.name) +
      "</th><th scope=\"col\">" + esc(b.name) + "</th></tr></thead><tbody>" +
      compareRow("Channel growth (median, TubeAI Sep 2026)", growthCell) +
      compareRow("Search growth (OutlierKit)", searchCell) +
      compareRow("Breakout", plainCell(function (n) { return n.breakout_rate || "—"; })) +
      compareRow("Reported revenue range", revenueCell) +
      compareRow("Competition", plainCell(function (n) { return COMP_LABELS[n.competition] || n.competition; })) +
      compareRow("Startup cost", plainCell(function (n) { return COST_LABELS[n.startup_cost] || n.startup_cost; })) +
      compareRow("Skill fit", plainCell(function (n) {
        return n.skill_fit.map(function (f) { return SKILL_LABELS[f] || f; }).join(", ");
      })) +
      compareRow("Evidence", plainCell(function (n) { return n.single_source ? "Single-source" : "Multi-source"; })) +
      "</tbody></table></div>" +
      '<p class="ne-verdict"><strong>Verdict:</strong> ' + esc(verdict(a, b)) +
      " Growth figures are cohort medians, not predictions; revenue ranges are creator-reported, not promises.</p>";
    document.getElementById("ne-compare-out").innerHTML = html;
  }

  function wire() {
    var form = document.getElementById("ne-form");
    ["tiers", "comp", "cost", "fit"].forEach(function (group) {
      state[group] = {};
      form.querySelectorAll('input[data-group="' + group + '"]').forEach(function (cb) {
        state[group][cb.value] = cb.checked;
        cb.addEventListener("change", function () {
          state[group][cb.value] = cb.checked;
          render();
        });
      });
    });
    document.getElementById("ne-sort").addEventListener("change", function (e) {
      state.sort = e.target.value;
      render();
    });
    document.getElementById("ne-multi").addEventListener("change", function (e) {
      state.multiOnly = e.target.checked;
      render();
    });
    var opts = state.data.niches.map(function (n, i) {
      return '<option value="' + i + '">' + esc(n.name) + "</option>";
    }).join("");
    document.getElementById("ne-a").innerHTML = opts;
    document.getElementById("ne-b").innerHTML = opts;
    document.getElementById("ne-b").selectedIndex = 1;
    document.getElementById("ne-compare-btn").addEventListener("click", runCompare);
  }

  skeleton();
  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      state.data = data;
      (data.sources || []).forEach(function (s) { sourceMap[s.id] = s; });
      wire();
      render();
      runCompare();
    })
    .catch(function () {
      document.getElementById("ne-status").textContent = "DATA FAILED";
      document.getElementById("ne-count").textContent =
        "The explorer couldn't load its data. The full niche tables are in the article above, and the dataset is api/v1/niches.json.";
    });
})();
