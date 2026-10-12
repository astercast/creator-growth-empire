/* Cadence Coach UI — pure-math-free DOM wiring.
   The cadence arithmetic lives in assets/js/cadence.js (CadenceCoach). */
(function () {
  "use strict";
  var form = document.getElementById("cc-form");
  var out = document.getElementById("cc-results");
  if (!form || !out) return;
  var CC = window.CadenceCoach;

  var LS_KEY = "cge.cadence.v1";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function num(id, fallback) {
    var el = document.getElementById(id);
    var v = el ? parseFloat(el.value) : NaN;
    return isNaN(v) || v < 0 ? fallback : v;
  }

  var VERDICTS = {
    holds: { badge: "money", label: "THE CADENCE HOLDS" },
    tight: { badge: "warn", label: "THE CADENCE IS TIGHT" },
    over: { badge: "bad", label: "OVER CAPACITY" }
  };

  /* Same-document view transition (Baseline since Oct 2025 — research
     web-craft round 1 §2). Gated on no-preference: the site honors
     reduced-motion everywhere, and the fallback is a plain swap. */
  function swap(html) {
    var noPref = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    if (noPref && document.startViewTransition) {
      document.startViewTransition(function () { out.innerHTML = html; });
    } else {
      out.innerHTML = html;
    }
  }

  function platChecked() {
    var boxes = form.querySelectorAll('input[name="cc-plat"]:checked');
    var out = [];
    for (var i = 0; i < boxes.length; i++) out.push(boxes[i].value);
    return out;
  }

  function dayCell(d) {
    var cls = "cc-day" + (d.rest ? " is-rest" : "");
    var inner = '<span class="cc-dayname">' + esc(d.name) + "</span>";
    if (d.rest) {
      inner += '<span class="cc-rest">Rest — no posting, analytics review only.</span>';
    } else {
      var bits = [];
      if (d.longs > 0) bits.push('<span class="cc-chip cc-long">🎬 ' + d.longs + " long-form</span>");
      if (d.shorts > 0) bits.push('<span class="cc-chip cc-short">⚡ ' + d.shorts + " short" + (d.shorts > 1 ? "s" : "") + "</span>");
      inner += bits.length ? bits.join("") : '<span class="cc-empty">—</span>';
    }
    return '<div class="' + cls + '" role="listitem">' + inner + "</div>";
  }

  function render(r) {
    var v = VERDICTS[r.verdict];
    var n = r.inputs;
    var pct = Math.round(r.utilization * 100);
    var CIRC = 2 * Math.PI * 30;
    var ringOff = (CIRC * (1 - Math.min(1, r.utilization))).toFixed(1);
    var html =
      '<div class="hud-panel" style="margin-bottom:1rem"><div class="hud-head">' +
      "<span>CADENCE MATH // YOUR SUSTAINABLE SCHEDULE</span>" +
      '<span class="hud-status">' + v.label + "</span></div>" +
      '<div class="hud-body">' +
      '<div class="calc-grid" style="margin-bottom:1rem">' +
      '<div class="calc-out"><div class="lbl">Long-form / week</div><div class="big cc-stat-num">' + r.longs + "</div></div>" +
      '<div class="calc-out"><div class="lbl">Short-form / week</div><div class="big cc-stat-num">' + r.shorts + "</div></div>" +
      '<div class="calc-out"><div class="lbl">Production hours / week</div><div class="big cc-stat-num">' + r.usedHours + "h</div></div>" +
      '<div class="calc-out"><div class="lbl">Of production time</div>' +
      '<svg class="cc-ring" viewBox="0 0 72 72" role="img" aria-label="' + pct +
      '% of production time used — ' + v.label.toLowerCase() + '">' +
      '<circle class="cc-ring-track" cx="36" cy="36" r="30"></circle>' +
      '<circle class="cc-ring-fill is-' + r.verdict + '" cx="36" cy="36" r="30" ' +
      'stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + ringOff + '"></circle></svg>' +
      '<div class="big cc-stat-num">' + pct + "%</div></div>" +
      "</div>" +
      '<div class="callout mission" style="margin:0 0 1rem"><strong><span class="badge ' + v.badge + '">' + v.label + "</span></strong>" +
      "<p>" + esc(r.guidance) + "</p></div>" +
      '<div class="cc-ramp"><strong>First two weeks (the ramp):</strong> start at ' +
      r.ramp.longs + " long-form + " + r.ramp.shorts + " shorts per week — raise to the full cadence only if every slot shipped on time. " +
      "This is the tool's house method, not science: new cadences die in week one, not week nine.</div>" +
      "</div></div>" +

      '<section aria-labelledby="cc-week-title" class="cc-week"><h2 id="cc-week-title">Your week</h2>' +
      '<div class="cc-grid" role="list">' + r.schedule.map(dayCell).join("") + "</div>" +
      '<p class="muted">Rest day is non-negotiable — no posting, analytics review only. Longs spread across work days; shorts round-robin the rest.</p></section>' +

      '<section aria-labelledby="cc-plat-title"><h2 id="cc-plat-title">What each platform actually pays (Oct 2026)</h2>' +
      r.platformNotes.map(function (p) {
        return '<div class="callout"><strong>' + esc(p.title) + "</strong><p>" + esc(p.body) + "</p></div>";
      }).join("") + "</section>" +

      '<section aria-labelledby="cc-method-title"><h2 id="cc-method-title">How this was computed</h2><ul class="cc-prose">' +
      r.methodNotes.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") +
      "</ul>" +
      '<p><button type="button" class="btn btn-ghost" id="cc-copy">Copy my cadence →</button> ' +
      '<a class="btn btn-ghost" href="planner.html">Open the 90-Day Planner →</a> ' +
      '<a class="btn btn-ghost" href="batching.html">Check it in the Batching Planner →</a> ' +
      '<a class="btn btn-ghost" href="simulator.html">Model it in the Simulator →</a></p>' +
      '<p class="muted cc-prose">' + esc(r.disclaimer) + "</p></section>";

    swap(html);
    var copyBtn = document.getElementById("cc-copy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var payload = JSON.stringify({
        longform_per_week: r.longs,
        shorts_per_week: r.shorts,
        rest_day: n.restDay,
        note: "from Cadence Coach — a model input, not a prediction"
      });
      function done(msg) {
        copyBtn.textContent = msg;
        setTimeout(function () { copyBtn.textContent = "Copy my cadence →"; }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () { done("Copied ✓"); }, function () { done("Copy failed — select manually"); });
      } else done("Clipboard unavailable");
    });
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderErrors(errors) {
    out.innerHTML = '<div class="error-state" role="alert"><strong>Can\'t build a cadence from that.</strong><ul>' +
      errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") +
      "</ul></div>";
  }

  /* Restore last input. */
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (saved) {
      if (Array.isArray(saved.platforms)) {
        form.querySelectorAll('input[name="cc-plat"]').forEach(function (b) {
          b.checked = saved.platforms.indexOf(b.value) !== -1;
        });
      }
      ["cc-hours", "cc-longmins", "cc-shortmins"].forEach(function (id) {
        if (saved[id] !== undefined && document.getElementById(id)) document.getElementById(id).value = saved[id];
      });
      if (saved.restDay !== undefined) document.getElementById("cc-rest").value = saved.restDay;
      if (saved.stage !== undefined) document.getElementById("cc-stage").value = saved.stage;
      if (saved.priority) {
        var pr = form.querySelector('input[name="cc-priority"][value="' + saved.priority + '"]');
        if (pr) pr.checked = true;
      }
    }
  } catch (e) { /* storage unavailable — form still works */ }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = {
      platforms: platChecked(),
      weeklyHours: num("cc-hours", NaN),
      longMins: num("cc-longmins", CC.DEFAULTS.longMins),
      shortMins: num("cc-shortmins", CC.DEFAULTS.shortMins),
      restDay: parseInt(document.getElementById("cc-rest").value, 10),
      stage: parseInt(document.getElementById("cc-stage").value, 10),
      priority: (form.querySelector('input[name="cc-priority"]:checked') || {}).value
    };
    var r = CC.recommend(raw);
    if (!r.ok) { renderErrors(r.errors); return; }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        platforms: raw.platforms, "cc-hours": document.getElementById("cc-hours").value,
        "cc-longmins": document.getElementById("cc-longmins").value,
        "cc-shortmins": document.getElementById("cc-shortmins").value,
        restDay: raw.restDay, stage: raw.stage, priority: raw.priority
      }));
    } catch (err) { /* private mode — results still render */ }
    render(r);
  });
})();
