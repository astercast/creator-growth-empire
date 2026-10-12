/* Empire Simulator page wiring: inputs -> EmpireSim engine -> SVG charts + table.
 * Runs in-browser only; the engine itself (sim-engine.js) is DOM-free and node-testable.
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

  var cfg = null;
  var nicheSel = document.getElementById("s-niche");
  var nicheNote = document.getElementById("s-niche-rpm");

  function fmtMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Math.round(n).toString();
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function rpmNote() {
    if (!cfg) return;
    var band = (cfg.youtube_longform_rpm_bands || {})[nicheSel.value];
    if (band && nicheNote) {
      nicheNote.textContent = NICHE_NAMES[nicheSel.value] + " band: $" +
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
      o.textContent = NICHE_NAMES[key] || key;
      if (key === cur) o.selected = true;
      nicheSel.appendChild(o);
    });
    rpmNote();
  }).catch(function () {
    nicheNote.textContent = "Could not load live RPM bands — using engine fallbacks.";
  });

  nicheSel.addEventListener("change", rpmNote);
  var growthRange = document.getElementById("s-growth");
  var growthOut = document.getElementById("s-growth-out");
  var q4Range = document.getElementById("s-q4");
  var q4Out = document.getElementById("s-q4-out");
  growthRange.addEventListener("input", function () { growthOut.value = growthRange.value + "%"; });
  q4Range.addEventListener("input", function () { q4Out.value = q4Range.value + "%"; });

  // fixed-assumption list, rendered from the engine so it can't drift
  (function () {
    var ul = document.getElementById("s-assumption-list");
    if (!ul) return;
    var d = EmpireSim.DEFAULTS;
    var items = [
      "Base monthly growth " + (d.baseGrowthRate * 100) + "% × niche factor × cadence × quality (compounding, deterministic — no viral lottery)",
      "Niche growth factors: " + Object.keys(d.nicheGrowth).map(function (k) {
        return (NICHE_NAMES[k] || k) + " " + d.nicheGrowth[k] + "×"; }).join(", "),
      "Quality multipliers: low 0.7× / solid 1× / excellent 1.35×",
      "Cadence factor: 1 + 0.12 per long-form + 0.03 per short (cap 2.5×)",
      "Views per sub per month: " + d.viewsPerSubLong + " (long-form), " +
        d.viewsPerSubShort + " (shorts)",
      "Shorts RPM $" + d.shortsRpmMid + " (mid of the 2026 Shorts band)",
      "Sponsor tiers nano → mega with " +
        d.sponsorTiers.slice().reverse().map(function (t) {
          return t.id + " " + t.dealsPerMonth + "/mo"; }).join(", ") + " deals",
      "Affiliates $" + d.affiliatePer1kViews + " per 1K long-form views; " +
        "digital " + (d.digitalConvPerMonth * 100) + "% of subs buy per month at price you set"
    ];
    ul.innerHTML = items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  })();

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
      digitalPrice: Math.max(1, parseFloat(document.getElementById("s-dig-price").value) || 49)
    };
  }

  /* ---------- SVG charts (static, responsive, labelled) ---------- */
  function subsChart(months) {
    var W = 640, H = 260, pl = 46, pr = 14, pt = 18, pb = 30;
    var max = Math.max.apply(null, months.map(function (m) { return m.subs; })) * 1.08;
    var X = function (i) { return pl + (W - pl - pr) * (i / 11); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var pts = months.map(function (m, i) { return X(i).toFixed(1) + "," + Y(m.subs).toFixed(1); });
    var area = pl + "," + Y(0).toFixed(1) + " " + pts.join(" ") + " " + X(11).toFixed(1) + "," + Y(0).toFixed(1);
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtCompact(v) + "</text>";
    }).join("");
    var months_ticks = [1, 4, 7, 10, 12].map(function (mm) {
      return '<text x="' + X(mm - 1) + '" y="' + (H - 8) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Subscriber growth curve over 12 months, ending at ' + fmtCompact(months[11].subs) + ' subscribers">' +
      ticks + '<polygon points="' + area + '" class="chart-area"/>' +
      '<polyline points="' + pts.join(" ") + '" class="chart-line"/>' +
      months_ticks + "</svg>";
  }

  function revenueChart(months) {
    var W = 640, H = 280, pl = 52, pr = 14, pt = 18, pb = 44;
    var max = Math.max.apply(null, months.map(function (m) { return m.total; })) * 1.08 || 1;
    var slot = (W - pl - pr) / 12, bw = Math.min(34, slot * 0.62);
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
      'aria-label="Monthly revenue stacked by stream over 12 months. Peak month ' + fmtMoney(max / 1.08) + '">' +
      ticks + bars +
      '<text x="' + pl + '" y="' + (H - 6) + '" class="chart-tick">month</text></svg>' +
      '<div class="chart-legend" aria-hidden="true">' + legend + "</div>";
  }

  /* ---------- render ---------- */
  var STICKER_VARIANTS = ["", "sticker-coral", "sticker-gold", "sticker-violet"];

  function render(inputs, res) {
    var months = res.months, totals = res.totals;
    var best = months.reduce(function (a, b) { return b.total > a.total ? b : a; }, months[0]);

    var stats = '<div class="stat-grid">' +
      stat("End of year subs", fmtCompact(res.endSubs), res.startSubs + " → " + fmtCompact(res.endSubs)) +
      stat("Year-one revenue", fmtMoney(totals.total), "all streams, before taxes/costs") +
      stat("Best month", fmtMoney(best.total), "month " + best.month) +
      stat("Growth multiple", res.growthMultiple.toFixed(1) + "×", "subs compounded") +
      "</div>";

    var meta = '<p class="muted">Model used: ' + (inputs.growthRate * 100).toFixed(0) +
      "% base growth × " + res.meta.nicheGrowth + " niche × " + res.meta.cadenceMult.toFixed(2) +
      " cadence × " + res.meta.qualityMult + " quality = <strong>" +
      (res.meta.monthlyGrowth * 100).toFixed(1) + "%/mo</strong> · RPM $" +
      res.meta.rpm.toFixed(2) + " (" + inputs.rpmLevel + " of $" + res.meta.rpmBand[0] +
      "–$" + res.meta.rpmBand[1] + ").</p>";

    var miles = res.milestones.length
      ? '<div class="sticker-row" aria-label="Empire milestones">' + res.milestones.map(function (m, i) {
          return '<span class="sticker ' + STICKER_VARIANTS[i % 4] + '">M' + m.month +
            " · " + esc(m.label) + "</span>";
        }).join("") + "</div>"
      : '<p class="muted">No milestones hit in 12 months — raise the cadence, the quality, or the growth assumption and run it again.</p>';

    var rows = months.map(function (m) {
      var ads = m.adsLong + m.adsShorts;
      return "<tr><th scope='row'>" + m.month + "</th><td>" + fmtCompact(m.subs) + "</td>" +
        "<td>" + fmtCompact(m.longViews) + "</td><td>" + fmtCompact(m.shortViews) + "</td>" +
        "<td>" + fmtMoney(ads) + "</td><td>" + fmtMoney(m.sponsor) + "</td>" +
        "<td>" + fmtMoney(m.affiliates) + "</td><td>" + fmtMoney(m.digital) + "</td>" +
        "<td><strong>" + fmtMoney(m.total) + "</strong></td></tr>";
    }).join("");

    out.innerHTML =
      '<div class="hud-panel" style="margin-top:2rem"><div class="hud-head">' +
      "<span>SIMULATION COMPLETE // 12-MONTH EMPIRE PROJECTION</span>" +
      '<span class="hud-status">MODEL, NOT PROPHECY</span></div><div class="hud-body">' +
      "<h2>Your empire, month by month</h2>" + meta + stats +
      '<h3>Subscriber curve</h3>' + subsChart(months) +
      '<h3>Revenue by stream</h3>' + revenueChart(months) +
      "<h3>Empire milestones</h3>" + miles +
      '<h3>The ledger</h3><div class="table-wrap"><table><caption>Month-by-month projection. ' +
      "Compact numbers; revenue rounded.</caption><thead><tr><th scope='col'>Mo</th>" +
      "<th scope='col'>Subs</th><th scope='col'>Long views</th><th scope='col'>Shorts views</th>" +
      "<th scope='col'>Ads</th><th scope='col'>Sponsors</th><th scope='col'>Affiliates</th>" +
      "<th scope='col'>Digital</th><th scope='col'>Total</th></tr></thead><tbody>" + rows +
      "</tbody></table></div>" +
      '<div style="margin-top:1.5rem"><button type="button" class="btn btn-ghost" id="s-share">Share my empire (copy text)</button> ' +
      '<span id="s-share-status" class="muted" role="status"></span></div>' +
      '<p class="muted" style="margin-top:1rem">A model, not a prediction. Revenue is pre-tax, pre-cost, and pre-reality. ' +
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
      var best = res.months.reduce(function (a, b) { return b.total > a.total ? b : a; }, res.months[0]);
      var lines = [
        "MY EMPIRE SIMULATOR RUN (Creator Growth Empire — a model, not a prediction)",
        "Niche: " + (NICHE_NAMES[inputs.niche] || inputs.niche) +
          " | Start: " + Math.round(inputs.startSubs) + " subs" +
          " | Cadence: " + inputs.longformPerWeek + " long + " + inputs.shortsPerWeek +
          " shorts/wk",
        "Quality: " + inputs.quality + " | Growth: " + (inputs.growthRate * 100).toFixed(0) +
          "%/mo | RPM: " + inputs.rpmLevel + " of band",
        "Month 12: " + fmtCompact(res.endSubs) + " subs (" + res.growthMultiple.toFixed(1) + "x)" +
          " | Year revenue: " + fmtMoney(res.totals.total) +
          " | Best month: " + fmtMoney(best.total) + " (M" + best.month + ")"
      ];
      if (res.milestones.length) {
        lines.push("Milestones: " + res.milestones.map(function (m) {
          return m.label + " — M" + m.month; }).join("; "));
      } else {
        lines.push("Milestones: none hit in 12 months — back to the drawing board.");
      }
      lines.push("Change the assumptions, change the empire.");
      var text = lines.join("\n");
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
