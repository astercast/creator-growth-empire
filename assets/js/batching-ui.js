/* Batching Planner — "film day" math. Pure-math-free:
   capacity/required arithmetic lives in assets/js/content-engine.js. */
(function () {
  "use strict";
  var form = document.getElementById("bp-form");
  var out = document.getElementById("bp-results");
  if (!form || !out) return;
  var CE = window.ContentEngine;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function num(id, fallback) {
    var v = parseFloat(document.getElementById(id).value);
    return isNaN(v) || v < 0 ? fallback : v;
  }

  var VERDICTS = {
    surplus: { badge: "money", label: "THE CADENCE HOLDS — WITH SLACK" },
    balanced: { badge: "warn", label: "THE CADENCE HOLDS — NO SLACK" },
    shortfall: { badge: "bad", label: "THE CADENCE DOESN'T HOLD" }
  };

  function bar(req, cap) {
    var pct = cap <= 0 && req <= 0 ? 100 : Math.min(100, Math.round((cap / Math.max(req, 0.001)) * 100));
    return '<div class="bp-bar" role="img" aria-label="Capacity ' + pct + '% of required">' +
      '<div class="bp-bar-fill" style="width:' + Math.min(100, pct) + '%"></div></div>';
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var opts = {
      videosPerShootDay: num("bp-vpsd", 1),
      shortsPerShootDay: num("bp-spsd", 0) || undefined,
      shootDaysPerMonth: num("bp-sdpm", 1),
      longsPerWeek: num("bp-lpw", 0),
      shortsPerWeek: num("bp-spw", 0)
    };
    if (opts.shortsPerShootDay === undefined) delete opts.shortsPerShootDay;
    var r = CE.batchingMath(opts);
    var v = VERDICTS[r.verdict];

    function row(label, required, capacity, delta) {
      var d = delta >= 0 ? "+" + delta : String(delta);
      return '<div class="calc-grid" style="margin-bottom:.75rem">' +
        '<div class="calc-out"><div class="lbl">' + esc(label) + " — required/month</div><div class=\"big\">" + required + "</div></div>" +
        '<div class="calc-out"><div class="lbl">' + esc(label) + " — shoot capacity/month</div><div class=\"big\">" + capacity + "</div></div>" +
        '<div class="calc-out"><div class="lbl">Delta</div><div class="big">' + d + "</div></div></div>" +
        bar(required, capacity);
    }

    out.innerHTML =
      '<div class="hud-panel" style="margin-bottom:1rem"><div class="hud-head">' +
      "<span>BATCHING MATH // FILM-DAY HONESTY</span>" +
      '<span class="hud-status">' + v.label + "</span></div><div class=\"hud-body\">" +
      row("Long-form", r.requiredLongsPerMonth, r.shootCapacityLongs, r.deltaLongs) +
      row("Short-form", r.requiredShortsPerMonth, r.shootCapacityShorts, r.deltaShorts) +
      "</div></div>" +
      '<div class="callout mission"><strong><span class="badge ' + v.badge + '">' + v.label + "</span></strong>" +
      "<p>" + esc(r.guidance) + "</p>" +
      "<p class='muted'>Consistency beats volume. A cadence you can film for 90 days straight is " +
      "worth more than an ambitious one you abandon in week three. If the math is red, shrink the " +
      "cadence — don't promise yourself heroics.</p>" +
      '<p class="muted">Inputs: ' + r.inputs.videosPerShootDay + " long-form videos per shoot day · " +
      r.inputs.shootDaysPerMonth + " shoot days/month · " + r.inputs.longsPerWeek + " longs + " +
      r.inputs.shortsPerWeek + " shorts per week. Weeks per month: " + r.inputs.weeksPerMonth.toFixed(2) +
      " (52/12 — the honest month, not 4).</p>" +
      '<p><a class="btn btn-ghost" href="planner.html">Open the 90-Day Planner \u2192</a> ' +
      '<a class="btn btn-ghost" href="simulator.html">Model it in the Simulator \u2192</a></p>' +
      "</div>";
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
