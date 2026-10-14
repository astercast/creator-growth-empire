/* Format Fit Finder UI, pure-math-free DOM wiring.
   The matching logic lives in assets/js/format-fit.js (FormatFit). */
(function () {
  "use strict";
  var form = document.getElementById("ff-form");
  var out = document.getElementById("ff-results");
  if (!form || !out) return;
  var FF = window.FormatFit;

  var LS_KEY = "cge.formatfit.v1";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function num(id, fallback) {
    var el = document.getElementById(id);
    var v = el ? parseFloat(el.value) : NaN;
    return isNaN(v) || v < 0 ? fallback : v;
  }
  function radio(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  var BANDS = {
    strong: { badge: "gold", label: "STRONG FIT" },
    workable: { badge: "money", label: "WORKABLE" },
    weak: { badge: "bad", label: "WEAK FIT" }
  };
  var VERDICTS = {
    strong: { badge: "gold", label: "STRONG FIT ON FILE" },
    workable: { badge: "money", label: "WORKABLE, WITH HONEST CAVEATS" },
    "no-fit": { badge: "bad", label: "NO STRONG FIT. READ THE FLAGS" }
  };

  /* Same-document view transition (Baseline since Oct 2025, research
     web-craft round 1 §2). Gated on no-preference; fallback is a plain
     swap. The site honors reduced motion everywhere. */
  function swap(html) {
    var noPref = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    if (noPref && document.startViewTransition) {
      document.startViewTransition(function () { out.innerHTML = html; });
    } else {
      out.innerHTML = html;
    }
  }

  function flagList(flags) {
    if (!flags.length) return "";
    return '<div class="ff-flags" role="note" aria-label="Honest flags">' +
      '<p class="ff-flags-head">Honest flags, read before you act</p><ul>' +
      flags.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") +
      "</ul></div>";
  }

  function matchCard(m, rank) {
    var b = BANDS[m.band];
    var MAX = 13, MIN = -7;
    var pct = Math.max(0, Math.min(100, Math.round(((m.score - MIN) / (MAX - MIN)) * 100)));
    var barLabel = m.score + " of " + MAX + ", " + b.label.toLowerCase();
    return '<article class="ff-card hud-panel">' +
      '<div class="hud-head"><span>FIT ' + (rank < 10 ? "0" + rank : rank) +
      " // DOSSIER " + esc(m.dossier_no) + "</span>" +
      '<span class="badge ' + b.badge + '">' + b.label + "</span></div>" +
      '<div class="hud-body">' +
      "<h3>" + esc(m.name) + "</h3>" +
      '<div class="ff-score" role="img" aria-label="' + esc(m.name) + " fit score: " + barLabel + '">' +
      '<div class="ff-scorebar" aria-hidden="true"><div class="ff-scorefill is-' + m.band + '" style="width:' + pct + '%"></div></div>' +
      '<div class="ff-scoreval ff-stat-num">' + m.score + "<span>/13</span></div></div>" +
      '<h4>Why it fits</h4><ul class="ff-why">' +
      m.why.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" +
      '<h4>The catch</h4><p class="ff-catch ff-prose">' + esc(m.catch) + "</p>" +
      '<h4>Pay reality</h4><p class="ff-prose">' + esc(m.pay) + ". " +
      "Competition: " + esc(m.competition) + ".</p>" +
      '<h4>Your first 3 moves</h4><ol class="ff-moves ff-prose">' +
      m.first3.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
      flagList(m.flags) +
      '<p class="muted"><a href="breakout-format-intel.html">Read the full dossier →</a></p>' +
      "</div></article>";
  }

  function rankTable(matches) {
    var rows = matches.map(function (m, i) {
      var b = BANDS[m.band];
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(m.name) + "</td>" +
        '<td><span class="badge ' + b.badge + '">' + m.score + "</span></td>" +
        "<td>" + esc(m.competition.split(/[,;(]/)[0].trim()) + "</td>" +
        "<td>" + esc(m.timeToMoney === "fast" ? "<6 mo" : m.timeToMoney === "mid" ? "6–18 mo" : "18+ mo") + "</td></tr>";
    }).join("");
    return '<details class="ff-all"><summary>All 10 formats, ranked (' +
      matches.length + ')</summary>' +
      '<div class="table-wrap"><table class="ff-table"><thead><tr>' +
      "<th scope=\"col\">Rank</th><th scope=\"col\">Format</th>" +
      "<th scope=\"col\">Score</th><th scope=\"col\">Competition</th>" +
      "<th scope=\"col\">Time to money</th></tr></thead><tbody>" + rows +
      "</tbody></table></div>" +
      '<p class="muted ff-prose">Scores are axis arithmetic (experience + camera + hours + budget + timeline + risk = 13 max). ' +
      "Lower ranks are not rejections, they are honest statements about what your situation makes hard right now.</p></details>";
  }

  function render(r) {
    var v = VERDICTS[r.verdict];
    var n = r.inputs;
    var inp = [FF.EXP_LABELS[n.experience], n.weeklyHours + " hrs/wk",
      FF.CAMERA_LABELS[n.camera], FF.BUDGET_LABELS[n.budget],
      FF.GOAL_LABELS[n.goal], FF.RISK_LABELS[n.risk]].join(" · ");
    var html =
      '<div class="hud-panel" style="margin-bottom:1.5rem"><div class="hud-head">' +
      "<span>FORMAT FIT // YOUR ASSESSMENT</span>" +
      '<span class="hud-status">' + v.label + "</span></div>" +
      '<div class="hud-body">' +
      '<div class="callout mission" style="margin:0 0 1rem"><strong><span class="badge ' + v.badge + '">' + v.label + "</span></strong>" +
      "<p>" + esc(inp) + "</p>" +
      (r.verdict === "no-fit"
        ? "<p>Nothing scored high, and the tool says so instead of handing you a 'winner'. Read the flags: the fix is in your inputs (more hours, real experience, a tuition phase), not in a different format.</p>"
        : "<p>Ranked by how well your situation actually matches each dossier's entry bar, not by which format is 'hottest'. The catch under each match is the part most tools would hide.</p>") +
      "</div>" +
      flagList(r.globalFlags) +
      "</div></div>" +

      '<section aria-labelledby="ff-top-title"><h2 id="ff-top-title">Your top matches</h2>' +
      '<div class="ff-cards">' + r.matches.slice(0, 5).map(function (m, i) {
        return matchCard(m, i + 1);
      }).join("") + "</div></section>" +

      rankTable(r.matches) +

      '<section aria-labelledby="ff-context-title"><h2 id="ff-context-title">The pay context, once</h2>' +
      '<p class="ff-prose">' + esc(r.rateContext) + "</p>" +
      '<p class="muted ff-prose">' + esc(r.hourEstimateNote) + "</p>" +
      '<p><a class="btn btn-ghost" href="quiz.html">Take the Niche Picker →</a> ' +
      '<a class="btn btn-ghost" href="cadence.html">Check hours in Cadence Coach →</a> ' +
      '<a class="btn btn-ghost" href="breakout-format-intel.html">Read all 10 dossiers →</a></p>' +
      '<p class="muted ff-prose">' + esc(r.disclaimer) + "</p></section>";

    swap(html);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderErrors(errors) {
    out.innerHTML = '<div class="error-state" role="alert"><strong>Can\'t run the assessment from that.</strong><ul>' +
      errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") +
      "</ul></div>";
  }

  /* Restore last input. */
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (saved) {
      ["ff-exp", "ff-camera", "ff-budget", "ff-goal", "ff-risk"].forEach(function (name) {
        if (saved[name]) {
          var el = form.querySelector('input[name="' + name + '"][value="' + saved[name] + '"]');
          if (el) el.checked = true;
        }
      });
      if (saved.hours !== undefined && document.getElementById("ff-hours"))
        document.getElementById("ff-hours").value = saved.hours;
    }
  } catch (e) { /* storage unavailable, form still works */ }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = {
      experience: radio("ff-exp"),
      weeklyHours: num("ff-hours", NaN),
      camera: radio("ff-camera"),
      budget: radio("ff-budget"),
      goal: radio("ff-goal"),
      risk: radio("ff-risk")
    };
    var r = FF.recommend(raw);
    if (!r.ok) { renderErrors(r.errors); return; }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        "ff-exp": raw.experience, hours: document.getElementById("ff-hours").value,
        "ff-camera": raw.camera, "ff-budget": raw.budget,
        "ff-goal": raw.goal, "ff-risk": raw.risk
      }));
    } catch (err) { /* private mode, results still render */ }
    render(r);
  });
})();
