/* Empire Simulator page wiring: inputs -> EmpireSim engine -> SVG charts + table.
 * Runs in-browser only; the engine itself (sim-engine.js) is DOM-free and node-testable.
 * Wave 13: scenario library, A/B comparison mode, team hiring P&L, 24-month
 * year-2 runs, and the "Copy my empire plan" export.
 */
(function () {
  "use strict";
  var form = document.getElementById("sim-form");
  var out = document.getElementById("sim-output");
  if (!form || !out || typeof EmpireSim === "undefined") return;

  var NICHE_NAMES = {
    finance_investing: "Finance / Investing",
    tech_software: "Tech / Software",
    education: "Education",
    health_fitness: "Health / Fitness",
    lifestyle: "Lifestyle",
    gaming: "Gaming",
    comedy_entertainment: "Comedy / Entertainment",
    music: "Music",
    kids_content: "Kids Content (low RPM — see Phase 0)"
  };
  var STREAMS = [
    { key: "adsLong",   label: "Long-form ads", color: "var(--acid)" },
    { key: "adsShorts", label: "Shorts ads",    color: "var(--gold)" },
    { key: "sponsor",   label: "Sponsors",      color: "var(--coral)" },
    { key: "affiliates",label: "Affiliates",    color: "var(--violet)" },
    { key: "digital",   label: "Digital product", color: "var(--cyan)" }
  ];
  var HIRE_FIELDS = [
    { type: "editor",    check: "s-hire-editor",    month: "s-hire-editor-month",    cost: "s-hire-editor-cost" },
    { type: "thumbnail", check: "s-hire-thumbnail", month: "s-hire-thumbnail-month", cost: "s-hire-thumbnail-cost" },
    { type: "va",        check: "s-hire-va",        month: "s-hire-va-month",        cost: "s-hire-va-cost" }
  ];

  var cfg = null;
  var currentScenarioName = "Custom settings";
  var nicheSel = document.getElementById("s-niche");
  var nicheNote = document.getElementById("s-niche-rpm");

  /* 4.0: reduced-motion-safe scrolling — smooth scroll only when the user
   * hasn't asked for reduced motion. Round-2 design: a manual "calm mode"
   * sensory toggle (TetraLogical-backed 2026 pattern) goes beyond the
   * prefers-reduced-motion binary — persisted, honored everywhere motion is. */
  function motionReduced() {
    if (document.documentElement.getAttribute("data-calm") === "1") return true;
    return typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  (function initCalm() {
    try {
      if (localStorage.getItem("cge.calm") === "1") {
        document.documentElement.setAttribute("data-calm", "1");
        var box = document.getElementById("s-calm");
        if (box) box.checked = true;
      }
    } catch (e) { /* private mode — calm simply won't persist */ }
  })();
  function scrollToEl(el) {
    if (!el || !el.scrollIntoView) return;
    if (motionReduced()) el.scrollIntoView({ block: "start" });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fmtMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function fmtSigned(n) {
    var v = Math.round(n);
    return (v < 0 ? "−$" : "+$") + Math.abs(v).toLocaleString("en-US");
  }
  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Math.round(n).toString();
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function nicheName(k) { return NICHE_NAMES[k] || k; }

  /* ---------- what-if event cards (wave 24) ----------
   * Rendered from the engine's DEFAULTS.eventCards so the card copy can
   * never drift from the engine that applies the effects. */
  function renderEventCards() {
    var grid = document.getElementById("event-grid");
    if (!grid || typeof EmpireSim.DEFAULTS.eventCards === "undefined") return;
    grid.innerHTML = EmpireSim.DEFAULTS.eventCards.map(function (c) {
      var id = "s-ev-" + c.id;
      return '<div class="calc-out" style="text-align:left">' +
        '<label class="check"><input type="checkbox" id="' + id + '"> <strong>' +
        esc(c.name) + "</strong></label>" +
        '<label>Card lands <input type="number" id="' + id + '-month" min="1" max="36" value="6" step="1" aria-label="' +
        esc(c.name) + ' start month"></label>' +
        '<p class="muted" style="font-size:.82rem"><strong>Assumed effect:</strong> ' + esc(c.assumedEffect) + "</p>" +
        '<p class="muted" style="font-size:.78rem"><strong>Basis:</strong> ' + esc(c.basis) + "</p>" +
        "</div>";
    }).join("");
  }

  /* ---------- scenario library ---------- */
  function scenarioById(id) {
    for (var i = 0; i < EmpireSim.SCENARIOS.length; i++) {
      if (EmpireSim.SCENARIOS[i].id === id) return EmpireSim.SCENARIOS[i];
    }
    return null;
  }

  function renderScenarioGrid() {
    var grid = document.getElementById("scenario-grid");
    if (!grid) return;
    var bands = (cfg && cfg.youtube_longform_rpm_bands) || {};
    grid.innerHTML = EmpireSim.SCENARIOS.map(function (sc) {
      var band = bands[sc.inputs.niche];
      var bandTxt = band ? " · RPM $" + band[0] + "–$" + band[1] : "";
      return '<div class="calc-out" style="text-align:left">' +
        '<div class="lbl">' + esc(sc.name) + "</div>" +
        '<p class="muted" style="font-size:.85rem;margin:.4rem 0">' + esc(sc.tagline) + "</p>" +
        '<p class="muted" style="font-size:.8rem">' + esc(nicheName(sc.inputs.niche)) + bandTxt +
        " · " + sc.inputs.longformPerWeek + " long + " + sc.inputs.shortsPerWeek + " shorts/wk</p>" +
        '<p class="muted" style="font-size:.75rem">Source: ' + esc(sc.source) + "</p>" +
        '<button type="button" class="btn btn-ghost" data-scenario="' + esc(sc.id) +
        '">Load scenario →</button></div>';
    }).join("");
  }
  function loadScenario(id) {
    var sc = scenarioById(id);
    if (!sc) return;
    var inp = EmpireSim.scenarioInputs(id);
    nicheSel.value = inp.niche;
    document.getElementById("s-subs").value = inp.startSubs;
    document.getElementById("s-long").value = inp.longformPerWeek;
    document.getElementById("s-shorts").value = inp.shortsPerWeek;
    document.getElementById("s-quality").value = inp.quality;
    growthRange.value = Math.round(inp.growthRate * 100);
    growthOut.value = growthRange.value + "%";
    var radios = document.querySelectorAll('input[name="s-rpm"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === inp.rpmLevel);
    q4Range.value = Math.round(inp.q4Uplift * 100);
    q4Out.value = q4Range.value + "%";
    document.getElementById("s-ads").checked = !!inp.ads;
    document.getElementById("s-sponsors").checked = !!inp.sponsors;
    document.getElementById("s-aff").checked = !!inp.affiliates;
    document.getElementById("s-digital").checked = !!inp.digital;
    document.getElementById("s-dig-month").value = inp.digitalStartMonth;
    document.getElementById("s-dig-price").value = inp.digitalPrice;
    HIRE_FIELDS.forEach(function (f) { document.getElementById(f.check).checked = false; });
    eventCardIds().forEach(function (id) {
      var box = document.getElementById("s-ev-" + id);
      if (box) box.checked = false;
    });
    currentScenarioName = sc.name;
    var note = "Loaded: " + sc.name + " — tweak anything, then run the simulation.";
    if (sc.nicheProxyNote) note += " " + sc.nicheProxyNote;
    document.getElementById("scenario-active").textContent = note;
    rpmNote();
  }

  function rpmNote() {
    if (!cfg) return;
    var band = (cfg.youtube_longform_rpm_bands || {})[nicheSel.value];
    if (band && nicheNote) {
      nicheNote.textContent = nicheName(nicheSel.value) + " band: $" +
        band[0] + "–$" + band[1] + " RPM.";
    }
  }

  fetch("api/v1/calculators.json").then(function (r) { return r.json(); }).then(function (c) {
    cfg = c;
    var bands = c.youtube_longform_rpm_bands || {};
    var cur = nicheSel.value;
    nicheSel.innerHTML = "";
    Object.keys(bands).forEach(function (key) {
      var o = document.createElement("option");
      o.value = key;
      o.textContent = nicheName(key);
      if (key === cur) o.selected = true;
      nicheSel.appendChild(o);
    });
    rpmNote();
    renderScenarioGrid();
  }).catch(function () {
    nicheNote.textContent = "Could not load live RPM bands — using engine fallbacks.";
  });
  renderScenarioGrid();
  renderEventCards();

  var grid = document.getElementById("scenario-grid");
  if (grid) {
    grid.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-scenario]") : null;
      if (btn) loadScenario(btn.getAttribute("data-scenario"));
    });
  }

  nicheSel.addEventListener("change", rpmNote);
  var growthRange = document.getElementById("s-growth");
  var growthOut = document.getElementById("s-growth-out");
  var q4Range = document.getElementById("s-q4");
  var q4Out = document.getElementById("s-q4-out");
  growthRange.addEventListener("input", function () { growthOut.value = growthRange.value + "%"; });
  q4Range.addEventListener("input", function () { q4Out.value = q4Range.value + "%"; });

  // any manual tweak after a load = custom settings again (programmatic loads don't fire this)
  form.addEventListener("input", function () {
    if (currentScenarioName !== "Custom settings") {
      currentScenarioName = "Custom settings";
      document.getElementById("scenario-active").textContent =
        "No scenario loaded — your current form settings are custom.";
    }
  });

  // fixed-assumption list, rendered from the engine so it can't drift
  (function () {
    var ul = document.getElementById("s-assumption-list");
    if (!ul) return;
    var d = EmpireSim.DEFAULTS;
    var items = [
      "Base monthly growth " + (d.baseGrowthRate * 100) + "% × niche factor × cadence × quality (compounding, deterministic — no viral lottery)",
      "Niche growth factors: " + Object.keys(d.nicheGrowth).map(function (k) {
        return nicheName(k) + " " + d.nicheGrowth[k] + "×"; }).join(", "),
      "Quality multipliers: low 0.7× / solid 1× / excellent 1.35×",
      "Cadence factor: 1 + 0.12 per long-form + 0.03 per short (cap 2.5×)",
      "Views per sub per month: " + d.viewsPerSubLong + " (long-form), " +
        d.viewsPerSubShort + " (shorts)",
      "Shorts RPM $" + d.shortsRpmMid + " (mid of the 2026 Shorts band)",
      "Sponsor tiers nano → mega with " +
        d.sponsorTiers.slice().reverse().map(function (t) {
          return t.id + " " + t.dealsPerMonth + "/mo"; }).join(", ") + " deals",
      "Affiliates $" + d.affiliatePer1kViews + " per 1K long-form views; " +
        "digital " + (d.digitalConvPerMonth * 100) + "% of subs buy per month at price you set",
      "Team hires: editor $1,400/mo (+1 long-form/wk, quality +12%), thumbnail $120/mo (quality +8%), " +
        "VA $900/mo (+0.5 long-form/wk) — from the First Hire guide; first month at 50% (ramp-up)",
      "Year-2 (12/24+ month horizons): monthly growth decays ×" + d.year2Decay + "/mo after month 12; year-3 decays ×" + d.year3Decay + "/mo after month 24 — our diminishing-returns curve, labeled; growth stays positive (plateau, not collapse)",
      "What-if event cards (our labeled assumptions, chapter-cited): algorithm change (Shorts views ×" + d.eventAssumptions.algoReachMult + " from the card month), viral hit (one month ×" + d.eventAssumptions.viralLongViewsMult + " long views, +8% subs once, ×" + d.eventAssumptions.viralTailMult + " tail next month), burnout break (2 months: growth 0%, subs −0.5%/mo, views ×" + d.eventAssumptions.burnoutViewsMult + "), policy change (Feb-2027 YPP rules: Shorts ads $0 in months under the 10M/90d floor)",
      "Money Map stages placed per month by net revenue: <$100 stage 0 · <$1K stage 1 · <$10K stage 2 · ≥$10K stage 3 · team + ≥$10K stage 4"
    ];
    ul.innerHTML = items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  })();

  function readHires() {
    var hires = [];
    HIRE_FIELDS.forEach(function (f) {
      if (document.getElementById(f.check).checked) {
        hires.push({
          type: f.type,
          startMonth: Math.max(1, Math.min(36,
            parseInt(document.getElementById(f.month).value, 10) || 1)),
          monthlyCost: Math.max(0,
            parseFloat(document.getElementById(f.cost).value) || 0)
        });
      }
    });
    return hires;
  }

  function eventCardIds() {
    var ids = [];
    if (typeof EmpireSim.DEFAULTS.eventCards === "undefined") return ids;
    EmpireSim.DEFAULTS.eventCards.forEach(function (c) { ids.push(c.id); });
    return ids;
  }

  function readEvents() {
    var evs = [];
    eventCardIds().forEach(function (id) {
      var box = document.getElementById("s-ev-" + id);
      if (box && box.checked) {
        var mo = parseInt(document.getElementById("s-ev-" + id + "-month").value, 10);
        evs.push({ id: id, startMonth: Math.max(1, Math.min(36, mo || 1)) });
      }
    });
    return evs;
  }

  function readInputs() {
    var rpmLevel = "mid";
    var radios = document.querySelectorAll('input[name="s-rpm"]');
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) rpmLevel = radios[i].value;
    return {
      niche: nicheSel.value,
      startSubs: Math.max(0, parseFloat(document.getElementById("s-subs").value) || 0),
      longformPerWeek: Math.max(0, parseFloat(document.getElementById("s-long").value) || 0),
      shortsPerWeek: Math.max(0, parseFloat(document.getElementById("s-shorts").value) || 0),
      quality: document.getElementById("s-quality").value,
      growthRate: (parseFloat(growthRange.value) || 12) / 100,
      rpmLevel: rpmLevel,
      q4Uplift: (parseFloat(q4Range.value) || 60) / 100,
      ads: document.getElementById("s-ads").checked,
      sponsors: document.getElementById("s-sponsors").checked,
      affiliates: document.getElementById("s-aff").checked,
      digital: document.getElementById("s-digital").checked,
      digitalStartMonth: parseInt(document.getElementById("s-dig-month").value, 10) || 1,
      digitalPrice: Math.max(1, parseFloat(document.getElementById("s-dig-price").value) || 49),
      horizon: parseInt(document.getElementById("s-horizon").value, 10) || 12,
      hires: readHires(),
      events: readEvents()
    };
  }

  /* ---------- SVG charts (static, responsive, labelled) ---------- */
  function chartTicks(N) {
    if (N === 12) return [1, 4, 7, 10, 12];
    return [1, Math.round(N / 4), Math.round(N / 2), Math.round(3 * N / 4), N];
  }
  function subsChart(months, res) {
    var N = months.length;
    var W = 640, H = 260, pl = 46, pr = 14, pt = 18, pb = 30;
    var max = Math.max.apply(null, months.map(function (m) { return m.subs; })) * 1.08;
    var X = function (i) { return pl + (W - pl - pr) * (i / (N - 1)); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var pts = months.map(function (m, i) { return X(i).toFixed(1) + "," + Y(m.subs).toFixed(1); });
    var area = pl + "," + Y(0).toFixed(1) + " " + pts.join(" ") + " " + X(N - 1).toFixed(1) + "," + Y(0).toFixed(1);
    var slot = (W - pl - pr) / N;
    /* 4.0: Money Map stage bands behind the curve — the journey, visible. */
    var bands = months.map(function (m, i) {
      return '<rect x="' + (pl + slot * i).toFixed(1) + '" y="' + pt + '" width="' +
        (slot + 0.6).toFixed(1) + '" height="' + (H - pt - pb) + '" class="stage-band-' +
        m.stage + '"><title>Month ' + m.month + " \u2014 Stage " + m.stage + " (" +
        esc(EmpireSim.STAGES[m.stage].name) + ")</title></rect>";
    }).join("");
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtCompact(v) + "</text>";
    }).join("");
    var months_ticks = chartTicks(N).map(function (mm) {
      return '<text x="' + X(mm - 1) + '" y="' + (H - 8) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    /* 4.0: milestone dots on the curve + what-if event markers. */
    /* 4.0 + round-2 dataviz: milestone dots are keyboard-focusable groups
     * with labels (hover AND keyboard tooltips) — never color-only, never
     * hover-only. Event markers likewise. Bands stay decorative (aria-hidden). */
    var dots = (res.milestones || []).map(function (ms) {
      var i = Math.max(0, Math.min(N - 1, ms.month - 1));
      var lbl = esc(ms.label) + " — month " + ms.month + ", " +
        fmtCompact(months[i].subs) + " subscribers";
      return '<g tabindex="0" role="img" class="chart-mark" aria-label="' + lbl + '">' +
        '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(months[i].subs).toFixed(1) +
        '" r="4.5" class="chart-dot" tabindex="-1"><title>' + lbl + "</title></circle></g>";
    }).join("");
    var evMarks = months.map(function (m, i) {
      if (!m.eventsActive.length) return "";
      var lbl = "What-if active, month " + m.month + ": " +
        esc(m.eventsActive.map(cardName).join(", "));
      return '<g tabindex="0" role="img" class="chart-mark" aria-label="' + lbl + '">' +
        '<text x="' + X(i).toFixed(1) + '" y="' + (Y(m.subs) - 14).toFixed(1) +
        '" text-anchor="middle" class="chart-event" tabindex="-1">⚡<title>' + lbl + "</title></text></g>";
    }).join("");
    var endLabel = '<text x="' + (X(N - 1) - 4).toFixed(1) + '" y="' +
      (Y(months[N - 1].subs) - 10).toFixed(1) +
      '" text-anchor="end" class="chart-tick">' + fmtCompact(months[N - 1].subs) + " subs</text>";
    var stageLegend = [0, 1, 2, 3, 4].map(function (s) {
      return '<span class="legend-item"><span class="swatch stage-swatch-' + s +
        '"></span>Stage ' + s + "</span>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Subscriber growth curve over ' + N + " months, ending at " + fmtCompact(months[N - 1].subs) + ' subscribers">' +
      '<g aria-hidden="true">' + bands + "</g>" +
      ticks + '<polygon points="' + area + '" class="chart-area"/>' +
      '<polyline points="' + pts.join(" ") + '" class="chart-line"/>' +
      dots + evMarks +
      endLabel + months_ticks + "</svg>" +
      '<div class="chart-legend" aria-hidden="true">' + stageLegend + "</div>";
  }

  function revenueChart(months, res) {
    var N = months.length;
    var W = 640, H = 280, pl = 52, pr = 14, pt = 18, pb = 44;
    var max = Math.max.apply(null, months.map(function (m) { return m.total; })) * 1.08 || 1;
    var slot = (W - pl - pr) / N, bw = Math.min(34, slot * 0.62);
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var best = months.reduce(function (a, b) { return b.total > a.total ? b : a; }, months[0]);
    var labelEvery = N > 12 ? 3 : 1; /* 4.0: keep month labels readable at 24/36 mo */
    var bars = months.map(function (m, i) {
      var x = pl + slot * i + (slot - bw) / 2, y0 = Y(0), segs = "";
      var acc = 0;
      STREAMS.forEach(function (s) {
        var v = m[s.key];
        if (v <= 0) return;
        var y1 = Y(acc + v);
        segs += '<rect x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + (Y(acc) - y1).toFixed(1) + '" fill="' + s.color + '">' +
          "<title>" + esc(s.label) + " M" + m.month + ": " + fmtMoney(v) + "</title></rect>";
        acc += v;
      });
      /* 4.0: what-if event marker above the bar + best-month value label. */
      var mark = "";
      if (m.eventsActive.length) {
        mark = '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Y(acc) - 8).toFixed(1) +
          '" text-anchor="middle" class="chart-event">\u26a1<title>What-if active, month ' +
          m.month + ": " + esc(m.eventsActive.map(cardName).join(", ")) + "</title></text>";
      }
      if (m.month === best.month && best.total > 0) {
        mark += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Y(acc) - (m.eventsActive.length ? 22 : 8)).toFixed(1) +
          '" text-anchor="middle" class="chart-tick">' + fmtMoney(best.total) + "</text>";
      }
      var mlabel = ((m.month - 1) % labelEvery === 0)
        ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 24) +
          '" class="chart-tick" text-anchor="middle">' + m.month + "</text>"
        : "";
      return '<g aria-hidden="true"><title>Month ' + m.month + " total " + fmtMoney(m.total) + "</title>" + segs +
        mark + mlabel + "</g>";
    }).join("");
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtMoney(v) + "</text>";
    }).join("");
    var legend = STREAMS.map(function (s) {
      return '<span class="legend-item"><span class="swatch" style="background:' + s.color +
        '"></span>' + esc(s.label) + "</span>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Monthly revenue stacked by stream over ' + N + " months. Peak month " + fmtMoney(max / 1.08) + '">' +
      ticks + bars +
      '<text x="' + pl + '" y="' + (H - 6) + '" class="chart-tick">month</text></svg>' +
      '<div class="chart-legend" aria-hidden="true">' + legend + "</div>";
  }

  /* round-2 dataviz recipe: non-hover readouts — exact values reachable via
   * keyboard/touch through a toggleable data table under each chart.
   * Native <details> = free keyboard behavior, zero component code. */
  function subsDataTable(months) {
    var rows = months.map(function (m) {
      return "<tr><th scope='row'>" + m.month + "</th><td>" +
        Math.round(m.subs).toLocaleString("en-US") + "</td><td>" + m.stage + "</td><td>" +
        Math.round(m.longViews).toLocaleString("en-US") + "</td><td>" +
        Math.round(m.shortViews).toLocaleString("en-US") + "</td></tr>";
    }).join("");
    return '<details class="chart-data"><summary>Subscriber data as a table</summary>' +
      '<div class="table-wrap"><table><caption>Month-by-month subscribers, Money Map stage, and views.</caption>' +
      "<thead><tr><th scope='col'>Month</th><th scope='col'>Subs</th><th scope='col'>Stage</th>" +
      "<th scope='col'>Long views</th><th scope='col'>Shorts views</th></tr></thead><tbody>" +
      rows + "</tbody></table></div></details>";
  }
  function revenueDataTable(months) {
    var rows = months.map(function (m) {
      return "<tr><th scope='row'>" + m.month + "</th><td>" + fmtMoney(m.total) + "</td><td>" +
        fmtMoney(m.teamCost) + "</td><td><strong>" + fmtMoney(m.net) + "</strong></td></tr>";
    }).join("");
    return '<details class="chart-data"><summary>Revenue data as a table</summary>' +
      '<div class="table-wrap"><table><caption>Month-by-month total revenue, team cost, and net.</caption>' +
      "<thead><tr><th scope='col'>Month</th><th scope='col'>Total</th><th scope='col'>Team cost</th>" +
      "<th scope='col'>Net</th></tr></thead><tbody>" + rows + "</tbody></table></div></details>";
  }

  /* ---------- render ---------- */
  var STICKER_VARIANTS = ["", "sticker-coral", "sticker-gold", "sticker-violet"];

  function hireSummary(res) {
    var hires = res.meta.hires || [];
    if (!hires.length) return "no hires — gross = net";
    return hires.map(function (h) {
      var t = EmpireSim.DEFAULTS.hireTypes[h.type];
      return (t ? t.label : h.type) + " $" + Math.round(h.monthlyCost) + "/mo from M" + h.startMonth;
    }).join(" · ");
  }

  function cardName(id) {
    var cards = EmpireSim.DEFAULTS.eventCards || [];
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].id === id) return cards[i].name;
    }
    return id;
  }

  function stageTimeline(res) {
    var html = '<h3>The stage journey</h3><div class="sticker-row" aria-label="Money Map stage transitions">' +
      res.stages.map(function (s, i) {
        return '<span class="sticker ' + STICKER_VARIANTS[i % 4] + '">M' + s.month +
          " · Stage " + s.stage + " — " + esc(s.name) + "</span>";
      }).join("") + "</div>" +
      '<p class="muted" style="font-size:.85rem">Stages placed per month from net revenue plus team: ' +
      "&lt;$100 = stage 0 (The Start Line) · &lt;$1K = stage 1 (First $100) · &lt;$10K = stage 2 (The Engine Runs) · " +
      "≥$10K = stage 3 (The Business) · team + ≥$10K = stage 4 (The Company). " +
      "Ends at stage " + res.endStage + " (" + esc(EmpireSim.STAGES[res.endStage].name) + ").</p>";
    return html;
  }

  /* 4.0: year-by-year summary cards for 24/36-month runs — the multi-year
   * story at a glance, before the month-by-month ledger. */
  function yearCards(res) {
    var months = res.months;
    if (months.length <= 12) return "";
    var cards = "";
    for (var y = 0; y < months.length / 12; y++) {
      var slice = months.slice(y * 12, y * 12 + 12);
      var gross = slice.reduce(function (a, m) { return a + m.total; }, 0);
      var team = slice.reduce(function (a, m) { return a + m.teamCost; }, 0);
      var last = slice[slice.length - 1];
      cards += '<div class="calc-out"><div class="lbl">Year ' + (y + 1) + "</div>" +
        '<div class="big">' + fmtMoney(gross - team) + '</div><div class="range">net · ' +
        fmtCompact(last.subs) + " subs · ends Stage " + last.stage + " (" +
        esc(EmpireSim.STAGES[last.stage].name) + ")</div>" +
        '<p class="muted" style="font-size:.82rem;margin:.4rem 0">Gross ' +
        fmtMoney(gross) + " − team " + fmtMoney(team) + "</p></div>";
    }
    return '<h3>The years</h3><div class="calc-grid">' + cards + "</div>";
  }

  /* 4.0: the assumptions panel, always visible in the results — never
   * hidden behind the drawer. Reuses the engine's assumptionLines(). */
  function assumptionsBlock(inputs, res) {
    return "<h3>Assumptions — always visible</h3>" +
      '<div class="calc-out" style="text-align:left">' +
      "<ul style='font-size:.88rem;margin:.5rem 0;padding-left:1.2rem'>" +
      EmpireSim.assumptionLines(inputs, res).map(function (l) {
        return "<li>" + esc(l) + "</li>";
      }).join("") + "</ul></div>";
  }

  function render(inputs, res, opts) {
    opts = opts || {};
    var months = res.months, totals = res.totals;
    var N = months.length;
    var best = months.reduce(function (a, b) { return b.total > a.total ? b : a; }, months[0]);

    var horizonNote = N > 24
      ? " · 36-month run (year-2 ×" + res.meta.year2Decay + "/mo, year-3 ×" + res.meta.year3Decay + "/mo)"
      : (N > 12 ? " · 24-month run (year-2 decay ×" + res.meta.year2Decay + "/mo)" : "");
    var evNote = (res.meta.events && res.meta.events.length)
      ? " · What-if: " + res.meta.events.map(function (e) {
          return esc(cardName(e.id)) + " (M" + e.startMonth + ")";
        }).join(", ") : "";

    var stats = '<div class="stat-grid">' +
      stat("End of run subs", fmtCompact(res.endSubs), res.startSubs + " → " + fmtCompact(res.endSubs)) +
      stat("Gross revenue", fmtMoney(totals.total), "all streams, before taxes") +
      stat("Team spend", fmtMoney(totals.teamCost), hireSummary(res)) +
      stat("Net revenue", fmtMoney(totals.net), "gross minus team") +
      stat("Best month", fmtMoney(best.total), "month " + best.month) +
      stat("End stage", "Stage " + res.endStage, esc(EmpireSim.STAGES[res.endStage].name) + " (Money Map)") +
      "</div>";

    var meta = '<p class="muted">Model used: ' + (inputs.growthRate * 100).toFixed(0) +
      "% base growth × " + res.meta.nicheGrowth + " niche × " + res.meta.cadenceMult.toFixed(2) +
      " cadence × " + res.meta.qualityMult + " quality = <strong>" +
      (res.meta.monthlyGrowth * 100).toFixed(1) + "%/mo</strong> · RPM $" +
      res.meta.rpm.toFixed(2) + " (" + inputs.rpmLevel + " of $" + res.meta.rpmBand[0] +
      "–$" + res.meta.rpmBand[1] + ")" + horizonNote + evNote +
      " · Team: " + esc(hireSummary(res)) + ".</p>";

    var miles = res.milestones.length
      ? '<div class="sticker-row" aria-label="Empire milestones">' + res.milestones.map(function (m, i) {
          return '<span class="sticker ' + STICKER_VARIANTS[i % 4] + '">M' + m.month +
            " · " + esc(m.label) + "</span>";
        }).join("") + "</div>"
      : '<p class="muted">No milestones hit — raise the cadence, the quality, or the growth assumption and run it again.</p>';

    var rows = months.map(function (m) {
      var ads = m.adsLong + m.adsShorts;
      var moCell = m.month + (m.eventsActive.length
        ? ' <span title="What-if active: ' + esc(m.eventsActive.map(cardName).join(", ")) +
          '" aria-label="what-if event active this month">⚡</span>' : "");
      return "<tr><th scope='row'>" + moCell + "</th><td>" + fmtCompact(m.subs) + "</td>" +
        "<td>S" + m.stage + "</td>" +
        "<td>" + fmtCompact(m.longViews) + "</td><td>" + fmtCompact(m.shortViews) + "</td>" +
        "<td>" + fmtMoney(ads) + "</td><td>" + fmtMoney(m.sponsor) + "</td>" +
        "<td>" + fmtMoney(m.affiliates) + "</td><td>" + fmtMoney(m.digital) + "</td>" +
        "<td>" + fmtMoney(m.teamCost) + "</td><td><strong>" + fmtMoney(m.net) + "</strong></td></tr>";
    }).join("");

    var html =
      '<div class="hud-panel" style="margin-top:2rem"><div class="hud-head">' +
      "<span>SIMULATION COMPLETE // " + N + "-MONTH EMPIRE PROJECTION</span>" +
      '<span class="hud-status">MODEL, NOT PROPHECY</span></div><div class="hud-body">' +
      "<h2>Your empire, month by month</h2>" + meta + stats +
      yearCards(res) + miles + stageTimeline(res) +
      "<h3>Subscriber curve</h3>" + subsChart(months, res) + subsDataTable(months) +
      "<h3>Revenue by stream</h3>" + revenueChart(months, res) + revenueDataTable(months) +
      assumptionsBlock(inputs, res) +
      "<h3>The ledger (month-by-month P&amp;L)</h3><div class=\"table-wrap\"><table><caption>Month-by-month projection. " +
      "Compact numbers; revenue rounded. Net = total − team cost. ⚡ marks months with an active what-if event.</caption><thead><tr><th scope='col'>Mo</th>" +
      "<th scope='col'>Subs</th><th scope='col'>Stage</th><th scope='col'>Long views</th><th scope='col'>Shorts views</th>" +
      "<th scope='col'>Ads</th><th scope='col'>Sponsors</th><th scope='col'>Affiliates</th>" +
      "<th scope='col'>Digital</th><th scope='col'>Team</th><th scope='col'>Net</th></tr></thead><tbody>" + rows +
      "</tbody></table></div>" +
      '<div style="margin-top:1.5rem"><button type="button" class="btn btn-ghost" id="s-share">Copy my empire plan</button> ' +
      '<span id="s-share-status" class="muted" role="status"></span></div>' +
      '<p class="muted" style="margin-top:1rem">A model, not a prediction. Revenue is pre-tax and pre-reality. ' +
      "Not financial, legal, or tax advice. " +
      'Verify every platform number live before making decisions.</p>' +
      "</div></div>";

    /* Same-document view transition (Baseline 2026) on explicit runs — the
     * new results crossfade in as one choreographed beat. Live re-runs pass
     * transition:false to swap plainly (no flicker); reduced-motion users
     * and unsupporting browsers always get the plain swap. */
    function swap() {
      out.innerHTML = html;
      wireShare(inputs, res);
      if (opts.scroll !== false) scrollToEl(out);
    }
    if (opts.transition !== false && !motionReduced() && document.startViewTransition) {
      document.startViewTransition(swap);
    } else {
      swap();
    }
  }

  function stat(label, big, sub) {
    return '<div class="calc-out"><div class="lbl">' + esc(label) + '</div><div class="big">' +
      esc(big) + '</div><div class="range">' + esc(sub) + "</div></div>";
  }

  function wireShare(inputs, res) {
    var btn = document.getElementById("s-share");
    var status = document.getElementById("s-share-status");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text = EmpireSim.exportPlan(currentScenarioName, inputs, res);
      function done(okMsg) { status.textContent = okMsg; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          done("Copied — paste it anywhere.");
        }, function () { done("Copy blocked by the browser — select and copy manually."); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done("Copied — paste it anywhere."); }
        catch (e) { done("Copy blocked by the browser — select and copy manually."); }
        document.body.removeChild(ta);
      }
    });
  }

  /* shared net-revenue chart: both paths on one clock, two lines */
  function compareNetChart(ma, mb, nameA, nameB) {
    var N = ma.length;
    var W = 640, H = 280, pl = 52, pr = 14, pt = 18, pb = 44;
    var max = Math.max.apply(null,
      ma.concat(mb).map(function (m) { return m.net; })) * 1.08 || 1;
    var X = function (i) { return pl + (W - pl - pr) * (i / (N - 1)); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    function line(months) {
      return months.map(function (m, i) {
        return X(i).toFixed(1) + "," + Y(m.net).toFixed(1);
      }).join(" ");
    }
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtMoney(v) + "</text>";
    }).join("");
    var monthsTicks = chartTicks(N).map(function (mm) {
      return '<text x="' + X(mm - 1) + '" y="' + (H - 24) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Net revenue per month over ' + N + " months: " + esc(nameA) + " versus " + esc(nameB) + '">' +
      ticks +
      '<polyline points="' + line(ma) + '" class="chart-line" style="stroke:var(--acid)"/>' +
      '<polyline points="' + line(mb) + '" class="chart-line" style="stroke:var(--coral)"/>' +
      monthsTicks +
      '<text x="' + pl + '" y="' + (H - 6) + '" class="chart-tick">month</text></svg>' +
      '<div class="chart-legend" aria-hidden="true">' +
      '<span class="legend-item"><span class="swatch" style="background:var(--acid)"></span>A · ' + esc(nameA) + "</span>" +
      '<span class="legend-item"><span class="swatch" style="background:var(--coral)"></span>B · ' + esc(nameB) + "</span></div>";
  }

  var cmpOut = document.getElementById("cmp-output");
  function cmpSelectOptions() {
    var html = '<option value="custom">My current settings (form above)</option>';
    EmpireSim.SCENARIOS.forEach(function (sc) {
      html += '<option value="' + esc(sc.id) + '">Scenario: ' + esc(sc.name) + "</option>";
    });
    return html;
  }
  function cmpSide(sel, horizon) {
    if (sel === "custom") {
      var inp = readInputs();
      inp.horizon = horizon;
      return { name: "My current settings", inputs: inp };
    }
    var sc = scenarioById(sel);
    var sinc = EmpireSim.scenarioInputs(sel);
    sinc.horizon = horizon;
    return { name: sc ? sc.name : sel, inputs: sinc };
  }
  function renderCompare(cmp, A, B) {
    var N = cmp.a.meta.horizon;
    function sideCard(res, name) {
      var best = res.months.reduce(function (x, y) { return y.total > x.total ? y : x; }, res.months[0]);
      return '<div class="calc-out" style="text-align:left"><div class="lbl">' + esc(name) + "</div>" +
        '<div class="big">' + fmtMoney(res.totals.net) + '</div><div class="range">net over ' + N + " months</div>" +
        '<p class="muted" style="font-size:.85rem;margin:.4rem 0">' +
        fmtCompact(res.endSubs) + " subs · gross " + fmtMoney(res.totals.total) +
        " · team " + fmtMoney(res.totals.teamCost) +
        " · best month " + fmtMoney(best.total) + " (M" + best.month + ")</p></div>";
    }
    function deltaRow(label, aVal, bVal, fmt) {
      var d = bVal - aVal;
      var cls = d > 0 ? ' style="color:var(--acid)"' : (d < 0 ? ' style="color:var(--coral)"' : "");
      return "<tr><th scope='row'>" + label + "</th><td>" + fmt(aVal) + "</td><td>" + fmt(bVal) +
        '</td><td' + cls + "><strong>" + fmtSigned(d) + "</strong></td></tr>";
    }
    function assumptionsPanel(name, inputs, res) {
      return '<div class="calc-out" style="text-align:left"><div class="lbl">Assumptions · ' + esc(name) + "</div>" +
        "<ul style='font-size:.85rem;margin:.5rem 0;padding-left:1.2rem'>" +
        EmpireSim.assumptionLines(inputs, res).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") +
        "</ul></div>";
    }
    var bestA = cmp.a.months.reduce(function (x, y) { return y.total > x.total ? y : x; }, cmp.a.months[0]);
    var bestB = cmp.b.months.reduce(function (x, y) { return y.total > x.total ? y : x; }, cmp.b.months[0]);
    var deltaTable =
      '<div class="table-wrap"><table><caption>Delta table — every Δ is Path B minus Path A.</caption>' +
      "<thead><tr><th scope='col'>Metric</th><th scope='col'>A · " + esc(cmp.nameA) +
      "</th><th scope='col'>B · " + esc(cmp.nameB) + "</th><th scope='col'>Δ (B − A)</th></tr></thead><tbody>" +
      deltaRow("End subs", cmp.a.endSubs, cmp.b.endSubs, fmtCompact) +
      deltaRow("Gross revenue", cmp.a.totals.total, cmp.b.totals.total, fmtMoney) +
      deltaRow("Team spend", cmp.a.totals.teamCost, cmp.b.totals.teamCost, fmtMoney) +
      deltaRow("Net revenue", cmp.a.totals.net, cmp.b.totals.net, fmtMoney) +
      deltaRow("Best month", bestA.total, bestB.total, fmtMoney) +
      deltaRow("Milestones hit", cmp.a.milestones.length, cmp.b.milestones.length, function (v) { return String(v); }) +
      "</tbody></table></div>";
    cmpOut.innerHTML =
      '<div class="hud-panel" style="margin-top:1.5rem"><div class="hud-head">' +
      "<span>COMPARE COMPLETE // " + N + "-MONTH DELTAS</span>" +
      '<span class="hud-status">MODEL, NOT PROPHECY</span></div><div class="hud-body">' +
      '<div class="calc-grid">' + sideCard(cmp.a, cmp.nameA) + sideCard(cmp.b, cmp.nameB) + "</div>" +
      "<h3>The shared chart — net revenue, same clock</h3>" +
      compareNetChart(cmp.a.months, cmp.b.months, cmp.nameA, cmp.nameB) +
      "<h3>Which path wins</h3>" +
      '<div class="calc-out" style="text-align:left;border-left:4px solid var(--gold)">' +
      "<p><strong>Verdict:</strong> " + esc(cmp.verdict) + "</p></div>" +
      "<h3>The delta table</h3>" + deltaTable +
      "<h3>Assumptions — always visible, both sides</h3>" +
      '<div class="calc-grid">' + assumptionsPanel(cmp.nameA, A.inputs, cmp.a) +
      assumptionsPanel(cmp.nameB, B.inputs, cmp.b) + "</div>" +
      '<p class="muted" style="margin-top:1rem">Models, not predictions. Not financial, legal, or tax advice.</p>' +
      "</div></div>";
    scrollToEl(cmpOut);
  }

  var cmpA = document.getElementById("cmp-a");
  var cmpB = document.getElementById("cmp-b");
  if (cmpA && cmpB) {
    cmpA.innerHTML = cmpSelectOptions();
    cmpB.innerHTML = cmpSelectOptions();
    cmpA.value = "asmr-bedroom";
    cmpB.value = "tech-reviewer";
    document.getElementById("cmp-run").addEventListener("click", function () {
      if (!cfg) {
        cmpOut.innerHTML = '<p class="muted">Still loading the 2026 rate data — try again in a second.</p>';
        return;
      }
      var horizon = parseInt(document.getElementById("s-horizon").value, 10) || 12;
      var A = cmpSide(cmpA.value, horizon);
      var B = cmpSide(cmpB.value, horizon);
      renderCompare(EmpireSim.compare(A.name, A.inputs, B.name, B.inputs, cfg), A, B);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!cfg) {
      out.innerHTML = '<p class="muted">Still loading the 2026 rate data — try again in a second.</p>';
      return;
    }
    var inputs = readInputs();
    var res = EmpireSim.simulate(inputs, cfg);
    render(inputs, res);
  });

  /* ---------- 4.0: live re-run (debounced) ----------
   * The sandbox re-simulates as you type — the charts stay in sync with the
   * form without a round-trip through the Run button. Explicit runs keep the
   * view transition + scroll; live runs swap plainly and stay put. */
  var liveTimer = null;
  var liveBox = document.getElementById("s-live");
  var liveStatus = document.getElementById("s-live-status");
  form.addEventListener("input", function () {
    if (!liveBox || !liveBox.checked || !cfg) return;
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      var inputs = readInputs();
      var res = EmpireSim.simulate(inputs, cfg);
      render(inputs, res, { scroll: false, transition: false });
      if (liveStatus) {
        var d = new Date();
        var hh = ("0" + d.getHours()).slice(-2);
        var mm = ("0" + d.getMinutes()).slice(-2);
        var ss = ("0" + d.getSeconds()).slice(-2);
        liveStatus.textContent = "Live re-ran at " + hh + ":" + mm + ":" + ss + ".";
      }
    }, 800);
  });

  /* ---------- round-2: calm mode — the sensory-envelope toggle ----------
   * User-activated stillness: kills animation/transition and smooth scroll
   * beyond what the OS prefers-reduced-motion binary covers. Persisted. */
  var calmBox = document.getElementById("s-calm");
  if (calmBox) {
    calmBox.addEventListener("change", function () {
      var on = calmBox.checked;
      if (on) document.documentElement.setAttribute("data-calm", "1");
      else document.documentElement.removeAttribute("data-calm");
      try { localStorage.setItem("cge.calm", on ? "1" : "0"); } catch (e) { /* private mode */ }
    });
  }

  /* ---------- 4.0: "what would it take?" goal solver ----------
   * Inverts the model: binary-searches base growth (or long-form cadence)
   * until the target lands by the target month. The answer is the model's,
   * labeled as such — never a promise. */
  var goalBtn = document.getElementById("s-goal-run");
  if (goalBtn) {
    var goalTarget = document.getElementById("s-goal-target");
    var goalStageRow = document.getElementById("s-goal-stage-row");
    goalTarget.addEventListener("change", function () {
      if (goalStageRow) {
        goalStageRow.style.display = goalTarget.value === "stage" ? "" : "none";
      }
    });
    goalBtn.addEventListener("click", function () {
      var goalOut = document.getElementById("s-goal-out");
      if (!cfg) {
        goalOut.innerHTML = '<p class="muted">Still loading the 2026 rate data — try again in a second.</p>';
        return;
      }
      var target = goalTarget.value;
      var goal = {
        target: target,
        value: target === "stage"
          ? parseInt(document.getElementById("s-goal-stage").value, 10)
          : parseFloat(document.getElementById("s-goal-value").value) || 0,
        month: Math.max(1, Math.min(36,
          parseInt(document.getElementById("s-goal-month").value, 10) || 12)),
        variable: document.getElementById("s-goal-var").value
      };
      var inputs = readInputs();
      var r = EmpireSim.solveForGoal(inputs, cfg, goal);
      var html;
      if (r.ok) {
        html = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--acid)">' +
          "<p><strong>What it would take: " + esc(r.valueLabel) + "</strong></p>" +
          "<p class='muted'>" + esc(r.note) + "</p>" +
          (r.alreadyThere ? "" :
            "<p class='muted'>Model check: at " + esc(r.valueLabel) + " the run reaches " +
            esc(r.achievedLabel) + " by month " + r.month + ".</p>") +
          "</div>";
      } else if (r.reason === "stage4_needs_team") {
        html = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--gold)">' +
          "<p><strong>Blocked:</strong> " + esc(r.note) + "</p></div>";
      } else if (r.reason === "unreachable") {
        html = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--coral)">' +
          "<p><strong>Not reachable in this model.</strong></p>" +
          "<p class='muted'>" + esc(r.note) + "</p></div>";
      } else {
        html = '<p class="muted">Enter a target above zero first.</p>';
      }
      html += '<p class="muted" style="font-size:.82rem">Single-source reality check (Lilach Bullock, Oct 2026): ' +
        "under 1% of YouTube channels ever reach 100K subscribers — plan around loyal-subscriber math, not virality. " +
        "The solver is model math, not a plan.</p>";
      goalOut.innerHTML = html;
      scrollToEl(goalOut);
    });
  }
})();
