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
    document.getElementById("s-y2").checked = false;
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
      "Year-2 (optional): monthly growth decays ×" + d.year2Decay + "/mo after month 12 — our diminishing-returns curve, labeled"
    ];
    ul.innerHTML = items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  })();

  function readHires() {
    var hires = [];
    HIRE_FIELDS.forEach(function (f) {
      if (document.getElementById(f.check).checked) {
        hires.push({
          type: f.type,
          startMonth: Math.max(1, Math.min(24,
            parseInt(document.getElementById(f.month).value, 10) || 1)),
          monthlyCost: Math.max(0,
            parseFloat(document.getElementById(f.cost).value) || 0)
        });
      }
    });
    return hires;
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
      horizon: document.getElementById("s-y2").checked ? 24 : 12,
      hires: readHires()
    };
  }

  /* ---------- SVG charts (static, responsive, labelled) ---------- */
  function chartTicks(N) {
    if (N === 12) return [1, 4, 7, 10, 12];
    return [1, Math.round(N / 4), Math.round(N / 2), Math.round(3 * N / 4), N];
  }
  function subsChart(months) {
    var N = months.length;
    var W = 640, H = 260, pl = 46, pr = 14, pt = 18, pb = 30;
    var max = Math.max.apply(null, months.map(function (m) { return m.subs; })) * 1.08;
    var X = function (i) { return pl + (W - pl - pr) * (i / (N - 1)); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var pts = months.map(function (m, i) { return X(i).toFixed(1) + "," + Y(m.subs).toFixed(1); });
    var area = pl + "," + Y(0).toFixed(1) + " " + pts.join(" ") + " " + X(N - 1).toFixed(1) + "," + Y(0).toFixed(1);
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtCompact(v) + "</text>";
    }).join("");
    var months_ticks = chartTicks(N).map(function (mm) {
      return '<text x="' + X(mm - 1) + '" y="' + (H - 8) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Subscriber growth curve over ' + N + " months, ending at " + fmtCompact(months[N - 1].subs) + ' subscribers">' +
      ticks + '<polygon points="' + area + '" class="chart-area"/>' +
      '<polyline points="' + pts.join(" ") + '" class="chart-line"/>' +
      months_ticks + "</svg>";
  }

  function revenueChart(months) {
    var N = months.length;
    var W = 640, H = 280, pl = 52, pr = 14, pt = 18, pb = 44;
    var max = Math.max.apply(null, months.map(function (m) { return m.total; })) * 1.08 || 1;
    var slot = (W - pl - pr) / N, bw = Math.min(34, slot * 0.62);
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
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
      return '<g><title>Month ' + m.month + " total " + fmtMoney(m.total) + "</title>" + segs +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 24) +
        '" class="chart-tick" text-anchor="middle">' + m.month + "</text></g>";
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

  function render(inputs, res) {
    var months = res.months, totals = res.totals;
    var N = months.length;
    var best = months.reduce(function (a, b) { return b.total > a.total ? b : a; }, months[0]);

    var stats = '<div class="stat-grid">' +
      stat("End of run subs", fmtCompact(res.endSubs), res.startSubs + " → " + fmtCompact(res.endSubs)) +
      stat("Gross revenue", fmtMoney(totals.total), "all streams, before taxes") +
      stat("Team spend", fmtMoney(totals.teamCost), hireSummary(res)) +
      stat("Net revenue", fmtMoney(totals.net), "gross minus team") +
      stat("Best month", fmtMoney(best.total), "month " + best.month) +
      stat("Growth multiple", res.growthMultiple.toFixed(1) + "×", "subs compounded") +
      "</div>";

    var meta = '<p class="muted">Model used: ' + (inputs.growthRate * 100).toFixed(0) +
      "% base growth × " + res.meta.nicheGrowth + " niche × " + res.meta.cadenceMult.toFixed(2) +
      " cadence × " + res.meta.qualityMult + " quality = <strong>" +
      (res.meta.monthlyGrowth * 100).toFixed(1) + "%/mo</strong> · RPM $" +
      res.meta.rpm.toFixed(2) + " (" + inputs.rpmLevel + " of $" + res.meta.rpmBand[0] +
      "–$" + res.meta.rpmBand[1] + ")" + (N > 12 ? " · 24-month run (year-2 decay ×" +
      res.meta.year2Decay + "/mo)" : "") + " · Team: " + esc(hireSummary(res)) + ".</p>";

    var miles = res.milestones.length
      ? '<div class="sticker-row" aria-label="Empire milestones">' + res.milestones.map(function (m, i) {
          return '<span class="sticker ' + STICKER_VARIANTS[i % 4] + '">M' + m.month +
            " · " + esc(m.label) + "</span>";
        }).join("") + "</div>"
      : '<p class="muted">No milestones hit — raise the cadence, the quality, or the growth assumption and run it again.</p>';

    var rows = months.map(function (m) {
      var ads = m.adsLong + m.adsShorts;
      return "<tr><th scope='row'>" + m.month + "</th><td>" + fmtCompact(m.subs) + "</td>" +
        "<td>" + fmtCompact(m.longViews) + "</td><td>" + fmtCompact(m.shortViews) + "</td>" +
        "<td>" + fmtMoney(ads) + "</td><td>" + fmtMoney(m.sponsor) + "</td>" +
        "<td>" + fmtMoney(m.affiliates) + "</td><td>" + fmtMoney(m.digital) + "</td>" +
        "<td>" + fmtMoney(m.teamCost) + "</td><td><strong>" + fmtMoney(m.net) + "</strong></td></tr>";
    }).join("");

    out.innerHTML =
      '<div class="hud-panel" style="margin-top:2rem"><div class="hud-head">' +
      "<span>SIMULATION COMPLETE // " + N + "-MONTH EMPIRE PROJECTION</span>" +
      '<span class="hud-status">MODEL, NOT PROPHECY</span></div><div class="hud-body">' +
      "<h2>Your empire, month by month</h2>" + meta + stats +
      "<h3>Subscriber curve</h3>" + subsChart(months) +
      "<h3>Revenue by stream</h3>" + revenueChart(months) +
      "<h3>The ledger (month-by-month P&amp;L)</h3><div class=\"table-wrap\"><table><caption>Month-by-month projection. " +
      "Compact numbers; revenue rounded. Net = total − team cost.</caption><thead><tr><th scope='col'>Mo</th>" +
      "<th scope='col'>Subs</th><th scope='col'>Long views</th><th scope='col'>Shorts views</th>" +
      "<th scope='col'>Ads</th><th scope='col'>Sponsors</th><th scope='col'>Affiliates</th>" +
      "<th scope='col'>Digital</th><th scope='col'>Team</th><th scope='col'>Net</th></tr></thead><tbody>" + rows +
      "</tbody></table></div>" +
      '<div style="margin-top:1.5rem"><button type="button" class="btn btn-ghost" id="s-share">Copy my empire plan</button> ' +
      '<span id="s-share-status" class="muted" role="status"></span></div>' +
      '<p class="muted" style="margin-top:1rem">A model, not a prediction. Revenue is pre-tax and pre-reality. ' +
      "Not financial, legal, or tax advice. " +
      'Verify every platform number live before making decisions.</p>' +
      "</div></div>";

    wireShare(inputs, res);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
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

  /* ---------- A/B comparison ---------- */
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
      "<h3>Which path wins</h3>" +
      '<div class="calc-out" style="text-align:left;border-left:4px solid var(--gold)">' +
      "<p><strong>Verdict:</strong> " + esc(cmp.verdict) + "</p></div>" +
      "<h3>The delta table</h3>" + deltaTable +
      "<h3>Assumptions — always visible, both sides</h3>" +
      '<div class="calc-grid">' + assumptionsPanel(cmp.nameA, A.inputs, cmp.a) +
      assumptionsPanel(cmp.nameB, B.inputs, cmp.b) + "</div>" +
      '<p class="muted" style="margin-top:1rem">Models, not predictions. Not financial, legal, or tax advice.</p>' +
      "</div></div>";
    cmpOut.scrollIntoView({ behavior: "smooth", block: "start" });
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
      var horizon = document.getElementById("s-y2").checked ? 24 : 12;
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
})();
