/* Niche Atlas explorer: filter, sort, and compare the 20 researched niches.
   Wave 20 (Niche Atlas 2.0): 2027 outlook layer, trajectory badges + filter +
   sort, a competition-vs-reward scatter view, breakout-format spotlights,
   a red-flag niches panel, and the niche-to-revenue-stream fit matrix.
   Data contract: data/v1/niches.json (data/niches.json is the source of truth,
   v2.0.0). Revenue ranges are creator-reported; sorting uses range midpoints,
   which are a sorting convenience, NOT a rate. */
(function () {
  "use strict";

  var MOUNT = "niche-explorer";
  var DATA_URL = "data/v1/niches.json";

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
  // convenience only, never presented as a rate.
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
  var TRAJ_LABELS = { heating: "Heating", stable: "Stable", cooling: "Cooling" };
  var TRAJ_ORDER = { heating: 0, stable: 1, cooling: 2 };
  var FIT_LABELS = { strong: "Strong", moderate: "Moderate", weak: "Weak" };
  var COMP_IDX = { "very-low": 0, low: 1, medium: 2, high: 3 };
  var STREAM_COLS = [["ads", "Ads"], ["sponsorships", "Sponsorships"],
                     ["digital_products", "Digital products"], ["pod", "POD / merch"]];

  var state = {
    tiers: {}, comp: {}, cost: {}, fit: {}, traj: {},
    sort: "outlook", multiOnly: false, data: null
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

  function trajBadge(niche) {
    var o = niche.outlook_2027;
    if (!o) return "";
    return '<p class="ne-outlook">2027 outlook: <strong class="ne-traj ne-traj-' +
      esc(o.trajectory) + '">' + esc(TRAJ_LABELS[o.trajectory] || o.trajectory) +
      '</strong><span class="ne-outlook-basis">, ' + esc(o.basis) + "</span></p>";
  }

  function skeleton() {
    mount.innerHTML =
      '<div class="hud-panel ne-panel">' +
      '<div class="hud-head"><span>ATLAS // NICHE EXPLORER 2.0</span>' +
      '<span class="hud-status" id="ne-status">LOADING DATA</span></div>' +
      '<div class="hud-body">' +
      '<h2 id="ne-title">The Niche Explorer</h2>' +
      '<p class="lede">Filter the twenty researched niches by what matters to you, then compare any two head to head. ' +
      "Trajectory badges are directional reads of October-2026 signals, not predictions. " +
      "All revenue figures are creator-reported ranges, sorting uses a range midpoint as a sorting convenience, never as a rate.</p>" +
      '<form id="ne-form" aria-label="Filter and sort niches">' +
      chipGroup("2027 outlook", "traj", TRAJ_LABELS, ["heating", "stable", "cooling"]) +
      chipGroup("Revenue tier", "tiers", TIER_LABELS, ["high", "mid", "low", "unknown"]) +
      chipGroup("Competition", "comp", COMP_LABELS, ["low", "very-low", "medium", "high"]) +
      chipGroup("Startup cost", "cost", COST_LABELS, ["low", "medium", "high"]) +
      chipGroup("Skill fit", "fit", SKILL_LABELS, ["teaching", "research", "personality", "hands-on", "voice"]) +
      '<div class="ne-row">' +
      '<label class="ne-sort">Sort by <select id="ne-sort" name="sort">' +
      '<option value="outlook">2027 outlook (heating first)</option>' +
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
      '<h3 id="ne-scatter-title">Competition vs reward</h3>' +
      '<p class="muted">Reported revenue range midpoint (vertical, a sorting convenience, never a rate) against competition. ' +
      "Niches with no reported range sit off the plot; their revenue is sponsorships and products, not ads.</p>" +
      '<div id="ne-scatter"></div>' +
      '<h3 id="ne-spotlights-title">Breakout-format spotlights</h3>' +
      '<div id="ne-spotlights" class="niche-grid"></div>' +
      '<h3 id="ne-matrix-title">Niche → revenue stream fit</h3>' +
      '<p class="muted" id="ne-matrix-legend"></p>' +
      '<div class="table-wrap"><table class="compare-table" id="ne-matrix-table">' +
      "<caption>How well each niche fits four revenue streams (editorial ratings, not reported figures)</caption>" +
      "</table></div>" +
      '<h3 id="ne-redflags-title">Red-flag niches</h3>' +
      '<p class="muted">Not saturated, structurally bad ideas in late 2026, updated for 2027.</p>' +
      '<div id="ne-redflags"></div>' +
      '<p class="ne-foot muted">Revenue tier legend, high: reported ranges reaching about $8+/1K views · mid: about $3–8 · ' +
      "low: below about $3 · unknown: no reported range in the October 2026 research. " +
      "Every record links its sources. This is educational, not financial, legal, or tax advice. Subscribers are not income.</p>" +
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

  function fitRow(niche) {
    if (!niche.stream_fit) return "";
    var cells = STREAM_COLS.map(function (c) {
      return esc(c[1]) + ": " + esc(FIT_LABELS[niche.stream_fit[c[0]]] || "·");
    }).join(" · ");
    return '<p class="ne-fit"><strong>Stream fit:</strong> ' + cells + "</p>";
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
      (niche.single_source ? '<p class="ne-flag">⚑ single-source, lighter evidence</p>' : "") +
      trajBadge(niche) +
      '<p class="ne-summary">' + esc(niche.summary) + "</p>" +
      '<ul class="ne-badges" aria-label="Niche attributes">' +
      "<li>Revenue: " + esc(TIER_LABELS[niche.revenue_tier] || niche.revenue_tier) + "</li>" +
      "<li>Competition: " + esc(COMP_LABELS[niche.competition] || niche.competition) + "</li>" +
      "<li>Startup: " + esc(COST_LABELS[niche.startup_cost] || niche.startup_cost) + "</li>" +
      "</ul>" +
      "<dl class='ne-metrics'>" + metricRows(niche) + "</dl>" +
      fitRow(niche) +
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
      if (n.outlook_2027 && !state.traj[n.outlook_2027.trajectory]) return false;
      if (!state.tiers[n.revenue_tier]) return false;
      if (!state.comp[n.competition]) return false;
      if (!state.cost[n.startup_cost]) return false;
      if (state.multiOnly && n.single_source) return false;
      var fitOk = n.skill_fit.some(function (f) { return state.fit[f]; });
      return fitOk;
    });
    var trajIdx = function (n) {
      return n.outlook_2027 ? (TRAJ_ORDER[n.outlook_2027.trajectory] || 0) : 3;
    };
    var sorters = {
      outlook: function (a, b) {
        return trajIdx(a) - trajIdx(b) ||
          ((b.channel_growth_monthly_pct || -1) - (a.channel_growth_monthly_pct || -1));
      },
      growth: function (a, b) { return (b.channel_growth_monthly_pct || -1) - (a.channel_growth_monthly_pct || -1); },
      revenue: function (a, b) { return (revenueMid(b) || -1) - (revenueMid(a) || -1); },
      search: function (a, b) { return (b.search_growth_pct || -1) - (a.search_growth_pct || -1); },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    };
    list.sort(sorters[state.sort] || sorters.outlook);
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
      : '<p class="muted">No niches match those filters, loosen one and try again.</p>';
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
      ? "<strong>" + n.channel_growth_monthly_pct.toFixed(2) + "%/mo</strong>" : "·";
  }
  function searchCell(n) {
    return n.search_growth_pct != null ? "<strong>+" + n.search_growth_pct + "%</strong>" : "·";
  }
  function revenueCell(n) {
    return (n.revenue_figures || []).map(revenueLabel).join("<br>") || "No reported range";
  }
  function outlookCell(n) {
    var o = n.outlook_2027;
    return o ? '<strong class="ne-traj ne-traj-' + esc(o.trajectory) + '">' +
      esc(TRAJ_LABELS[o.trajectory] || o.trajectory) + "</strong>" : "·";
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
        " leads on reported revenue range, and the subscriber winner is not always the revenue winner.");
    }
    if (a.outlook_2027 && b.outlook_2027 &&
        TRAJ_ORDER[a.outlook_2027.trajectory] !== TRAJ_ORDER[b.outlook_2027.trajectory]) {
      var hotter = TRAJ_ORDER[a.outlook_2027.trajectory] < TRAJ_ORDER[b.outlook_2027.trajectory] ? a : b;
      bits.push(hotter.name + " has the hotter 2027 trajectory (" +
        TRAJ_LABELS[hotter.outlook_2027.trajectory] + "), a directional read of October-2026 signals, not a prediction.");
    }
    if (!bits.length) bits.push("These two trade blows on different strengths, check competition and startup cost below.");
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
      compareRow("2027 outlook", outlookCell) +
      compareRow("Channel growth (median, TubeAI Sep 2026)", growthCell) +
      compareRow("Search growth (OutlierKit)", searchCell) +
      compareRow("Breakout", plainCell(function (n) { return n.breakout_rate || "·"; })) +
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

  /* ---- competition vs reward scatter (wave 20) ---- */
  function renderScatter() {
    var el = document.getElementById("ne-scatter");
    var withRev = state.data.niches.filter(function (n) { return revenueMid(n) != null; });
    var offPlot = state.data.niches.filter(function (n) { return revenueMid(n) == null; });
    var W = 640, H = 400, PL = 64, PR = 20, PT = 20, PB = 56;
    var maxY = 0;
    withRev.forEach(function (n) { maxY = Math.max(maxY, revenueMid(n)); });
    maxY = Math.ceil(maxY / 10) * 10;
    function x(i, idx) {
      var jitter = ((idx * 37) % 23) - 11;
      return PL + (COMP_IDX[i] / 3) * (W - PL - PR) + jitter;
    }
    function y(v) { return PT + (1 - v / maxY) * (H - PT - PB); }
    var pts = withRev.map(function (n, i) {
      var cx = x(n.competition, i).toFixed(1), cy = y(revenueMid(n)).toFixed(1);
      var cls = n.outlook_2027 ? "ne-traj-" + n.outlook_2027.trajectory : "";
      return '<g class="scatter-pt ' + cls + '"><title>' + esc(n.name) +
        ", competition " + esc(COMP_LABELS[n.competition] || n.competition) +
        ", revenue midpoint $" + revenueMid(n).toFixed(2) +
        (n.outlook_2027 ? ", 2027 " + esc(n.outlook_2027.trajectory) : "") + "</title>" +
        '<circle cx="' + cx + '" cy="' + cy + '" r="8" />' +
        '<text x="' + (+cx + 11) + '" y="' + (+cy + 4) + '">' + esc(shortName(n.name)) +
        "</text></g>";
    }).join("");
    var ticks = [0, maxY / 2, maxY].map(function (v) {
      return '<text class="scatter-tick" x="' + (PL - 8) + '" y="' + (y(v) + 4) + '">$' + v + "</text>" +
        '<line class="scatter-grid" x1="' + PL + '" y1="' + y(v) + '" x2="' + (W - PR) + '" y2="' + y(v) + '"/>';
    }).join("");
    var xlabels = ["Very low", "Low", "Medium", "High"].map(function (lab, i) {
      return '<text class="scatter-tick" x="' + (PL + (i / 3) * (W - PL - PR)).toFixed(1) +
        '" y="' + (H - PB + 22) + '" text-anchor="middle">' + lab + "</text>";
    }).join("");
    var svg =
      '<div class="table-wrap"><svg viewBox="0 0 ' + W + " " + H +
      '" role="img" class="scatter-svg" aria-label="Scatter plot: competition (horizontal) versus reported revenue midpoint (vertical) for ' +
      withRev.length + " niches. " + esc(offPlot.map(function (n) { return n.name; }).join(", ")) +
      " have no reported revenue range and sit off the plot. Point color marks the 2027 trajectory: green heating, grey stable, coral cooling.'>" +
      "<title>Competition vs reward</title>" +
      '<desc>Horizontal axis: competition from very low to high. Vertical axis: reported revenue range midpoint in dollars per thousand views. ' +
      "This midpoint is a sorting convenience, not a rate.</desc>" +
      ticks + xlabels +
      '<line class="scatter-axis" x1="' + PL + '" y1="' + PT + '" x2="' + PL + '" y2="' + (H - PB) + '"/>' +
      '<line class="scatter-axis" x1="' + PL + '" y1="' + (H - PB) + '" x2="' + (W - PR) + '" y2="' + (H - PB) + '"/>' +
      '<text class="scatter-tick" x="' + (PL + (W - PL - PR) / 2) + '" y="' + (H - 8) +
      '" text-anchor="middle">Competition →</text>' +
      pts + "</svg></div>" +
      '<details class="ne-alt"><summary>Same data as a table (screen-reader friendly)</summary>' +
      '<div class="table-wrap"><table class="compare-table"><caption>Competition vs reported revenue midpoint by niche</caption>' +
      "<thead><tr><th scope=\"col\">Niche</th><th scope=\"col\">Competition</th>" +
      "<th scope=\"col\">Revenue midpoint ($/1K views, sorting convenience)</th>" +
      "<th scope=\"col\">2027 outlook</th></tr></thead><tbody>" +
      state.data.niches.map(function (n) {
        return "<tr><th scope=\"row\">" + esc(n.name) + "</th><td>" +
          esc(COMP_LABELS[n.competition] || n.competition) + "</td><td>" +
          (revenueMid(n) != null ? "$" + revenueMid(n).toFixed(2) : "no reported range") + "</td><td>" +
          esc(n.outlook_2027 ? TRAJ_LABELS[n.outlook_2027.trajectory] : "·") + "</td></tr>";
      }).join("") +
      "</tbody></table></div></details>" +
      '<p class="muted">' + withRev.length + " niches plotted. " +
      esc(offPlot.map(function (n) { return n.name; }).join(", ")) +
      " have no reported revenue range, their revenue is sponsorships and products, not ads. " +
      "Quadrant read: top-left (low competition, high reported range) is where the heating niches cluster; " +
      "bottom-right (high competition, low range) is where most people start.</p>";
    el.innerHTML = svg;
  }

  function shortName(name) {
    return name.replace(" & ", " ").split(" ").slice(0, 2).join(" ");
  }

  /* ---- breakout spotlights (wave 20) ---- */
  function renderSpotlights() {
    var el = document.getElementById("ne-spotlights");
    var items = state.data.breakout_spotlights || [];
    el.innerHTML = items.map(function (s) {
      var srcNames = (s.sources || []).map(sourceName);
      return '<article class="niche-card" aria-label="' + esc(s.name) + '">' +
        '<h3>' + esc(s.name) + "</h3>" +
        (s.single_source ? '<p class="ne-flag">⚑ single-source, lighter evidence</p>' : "") +
        '<p class="ne-summary">' + esc(s.why) + "</p>" +
        '<dl class="ne-metrics"><dt>Growth</dt><dd><strong>' + esc(s.growth) + "</strong></dd>" +
        "<dt>Rates</dt><dd><strong>" + esc(s.revenue) + "</strong></dd>" +
        "<dt>Competition</dt><dd>" + esc(s.competition) + "</dd></dl>" +
        (s.note ? '<p class="ne-fit"><em>' + esc(s.note) + "</em></p>" : "") +
        '<p class="ne-src"><strong>Sources:</strong> ' + srcNames.map(esc).join(", ") + "</p>" +
        "</article>";
    }).join("");
  }

  /* ---- stream-fit matrix (wave 20) ---- */
  function renderMatrix() {
    var legend = state.data.stream_fit_legend || {};
    var legEl = document.getElementById("ne-matrix-legend");
    if (legend.strong) {
      legEl.innerHTML = "<strong>Strong:</strong> " + esc(legend.strong) + " · " +
        "<strong>Moderate:</strong> " + esc(legend.moderate) + " · " +
        "<strong>Weak:</strong> " + esc(legend.weak) + ", " + esc(legend.evidence_note || "");
    }
    var tbl = document.getElementById("ne-matrix-table");
    var head = "<thead><tr><th scope=\"col\">Niche</th>" +
      STREAM_COLS.map(function (c) { return "<th scope=\"col\">" + esc(c[1]) + "</th>"; }).join("") +
      "</tr></thead>";
    var body = "<tbody>" + state.data.niches.map(function (n) {
      var tds = STREAM_COLS.map(function (c) {
        var v = n.stream_fit && n.stream_fit[c[0]];
        return '<td class="fit-' + esc(v || "na") + '">' + esc(FIT_LABELS[v] || "·") + "</td>";
      }).join("");
      return "<tr><th scope=\"row\">" + esc(n.name) + "</th>" + tds + "</tr>";
    }).join("") + "</tbody>";
    tbl.innerHTML = head + body;
  }

  /* ---- red-flag niches (wave 20) ---- */
  function renderRedFlags() {
    var el = document.getElementById("ne-redflags");
    var items = state.data.avoid_list || [];
    el.innerHTML = '<ul class="ne-redflags">' + items.map(function (it) {
      var srcNames = (it.sources || []).map(sourceName);
      return '<li class="niche-card ne-redflag"><h3>⚠ ' + esc(it.name) + "</h3>" +
        (it.flag_2027 ? '<p class="ne-flag">🚩 2027 red flag, updated for the 2027 outlook</p>' : "") +
        '<p class="ne-summary">' + esc(it.detail) + "</p>" +
        '<p class="ne-src"><strong>Sources:</strong> ' + srcNames.map(esc).join(", ") + "</p></li>";
    }).join("") + "</ul>";
  }

  function wire() {
    var form = document.getElementById("ne-form");
    ["traj", "tiers", "comp", "cost", "fit"].forEach(function (group) {
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
      renderScatter();
      renderSpotlights();
      renderMatrix();
      renderRedFlags();
    })
    .catch(function () {
      document.getElementById("ne-status").textContent = "DATA FAILED";
      document.getElementById("ne-count").textContent =
        "The explorer couldn't load its data. The full niche tables are in the article above, and the dataset is data/v1/niches.json.";
    });
})();
