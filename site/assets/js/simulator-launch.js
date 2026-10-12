/* The Empire Simulator — mission-control launch sequence (wow wave 1).
 * UMD: the pure helpers (preflight, countdown, telemetry, debrief) are
 * node-testable; the DOM sequence auto-inits in the browser.
 *
 * Flow: PRE-FLIGHT (four real checks) -> T-minus countdown -> LIFTOFF ->
 * mission elapsed-time telemetry -> full results + MISSION DEBRIEF (+25 XP
 * to the Empire Climb journal). Live-update re-runs bypass the sequence.
 * Reduced-motion / calm mode: checks, debrief, and XP still run; the
 * countdown and telemetry render instantly. ABORT / Esc scrubs the launch
 * before anything is computed.
 *
 * HONESTY: every readout is the model's, labeled as such. No promises.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.SimLaunch = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var COUNTDOWN_STEPS = ["T-5", "T-4", "T-3", "T-2", "T-1", "T-0", "LIFTOFF"];
  var MISSION_XP = 25;
  var VALID_HORIZONS = { 12: true, 24: true, 36: true };

  /* ---------- pure helpers (node-testable) ---------- */

  /* Four real gates. Nothing about the launch is theater: a failed check
   * names the actual reason and the launch holds. */
  function preflightChecks(inputs, cfgState) {
    cfgState = cfgState || {};
    var streamsOn = ["ads", "sponsors", "affiliates", "digital"].filter(
      function (k) { return inputs[k]; });
    var inputsOk = inputs &&
      inputs.startSubs >= 0 &&
      inputs.longformPerWeek >= 0 && inputs.shortsPerWeek >= 0 &&
      inputs.growthRate >= 0.01 && inputs.growthRate <= 0.40 &&
      !!VALID_HORIZONS[inputs.horizon];
    return [
      { id: "rates",
        label: "2026 rate data link",
        ok: !!cfgState.loaded,
        detail: cfgState.loaded
          ? "calculators.json live \u2014 RPM bands, rate card, thresholds"
          : "Rate data still loading \u2014 hold and retry in a few seconds" },
      { id: "inputs",
        label: "Starting position sane",
        ok: !!inputsOk,
        detail: inputsOk
          ? Math.round(inputs.growthRate * 100) + "% base growth \u00b7 " +
            inputs.horizon + "-month horizon \u00b7 " +
            inputs.longformPerWeek + " long + " + inputs.shortsPerWeek + " shorts/wk"
          : "An input is outside the model's bounds \u2014 check growth (1\u201340%), horizon, and cadence" },
      { id: "streams",
        label: "Revenue streams armed",
        ok: streamsOn.length > 0,
        detail: streamsOn.length > 0
          ? streamsOn.length + " of 4 streams armed (" + streamsOn.join(", ") + ")"
          : "No revenue stream is armed \u2014 the model would project zeros" },
      { id: "engine",
        label: "Model engine ready",
        ok: !!cfgState.engineReady,
        detail: cfgState.engineReady
          ? "EmpireSim engine loaded \u2014 deterministic, no viral lottery"
          : "Engine not loaded \u2014 reload the page" }
    ];
  }

  function countdownSteps() { return COUNTDOWN_STEPS.slice(); }

  /* One frame per simulated month for the mission-elapsed ticker.
   * stageNames lets node tests pass names without the engine. */
  function telemetryFrames(res, stageNames) {
    var frames = [];
    var prev = null;
    (res.months || []).forEach(function (m) {
      var changed = prev !== null && m.stage !== prev;
      frames.push({
        month: m.month,
        subs: Math.round(m.subs),
        net: Math.round(m.net),
        stage: m.stage,
        stageName: stageNames ? stageNames[m.stage] : null,
        stageChanged: changed
      });
      prev = m.stage;
    });
    return frames;
  }

  function fmtMoney(n) {
    var v = Math.round(n);
    return (v < 0 ? "\u2212$" : "$") + Math.abs(v).toLocaleString("en-US");
  }
  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Math.round(n).toString();
  }

  /* The after-action copy. Every number is the model's; the honesty footer
   * rides every debrief. stageNames: array like telemetryFrames. */
  function debriefFor(inputs, res, scenarioName, stageNames) {
    var N = res.months.length;
    var best = res.months.reduce(function (a, b) {
      return b.total > a.total ? b : a;
    }, res.months[0]);
    var endStageName = stageNames ? stageNames[res.endStage] : ("Stage " + res.endStage);
    return {
      kicker: "FIELD MANUAL // AFTER-ACTION",
      title: "MISSION LOGGED \u2014 " + N + "-month projection complete",
      scenario: scenarioName || "Custom settings",
      stats: [
        { label: "End-of-run subs", value: fmtCompact(res.endSubs) },
        { label: "Net revenue", value: fmtMoney(res.totals.net) },
        { label: "Best month", value: fmtMoney(best.total) + " (M" + best.month + ")" },
        { label: "End stage", value: "Stage " + res.endStage + " \u2014 " + endStageName }
      ],
      xpLine: "+" + MISSION_XP + " XP \u2014 MISSION LOGGED \u00b7 recorded in your Empire Climb journal",
      honesty: "A model, not a prediction. Revenue is pre-tax and pre-reality. " +
        "Not financial, legal, or tax advice. Verify every platform number live " +
        "before making decisions."
    };
  }

  function missionKey(ts) { return "mission:" + ts; }

  /* ---------- browser sequence (guarded) ---------- */

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function motionReduced() {
    if (typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-calm") === "1") return true;
    return typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function $(id) { return document.getElementById(id); }

  var timers = [];
  function later(fn, ms) {
    var t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function announce(msg) {
    var live = $("lc-live");
    if (!live) return;
    live.textContent = "";
    later(function () { live.textContent = msg; }, 30);
  }

  function buildConsole() {
    var old = $("launch-console");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var out = $("sim-output");
    var sec = document.createElement("section");
    sec.className = "launch-console hud-panel";
    sec.id = "launch-console";
    sec.setAttribute("aria-label", "Launch sequence");
    sec.setAttribute("tabindex", "-1");
    sec.innerHTML =
      '<div class="hud-head"><span id="lc-title">LAUNCH SEQUENCE // PRE-FLIGHT</span>' +
      '<span class="hud-status" id="lc-status">HOLD</span></div>' +
      '<div class="hud-body">' +
      '<ol class="lc-checks" id="lc-checks" aria-label="Pre-flight checks"></ol>' +
      '<div class="lc-count" id="lc-count" hidden>' +
      '<div class="lc-count-num" id="lc-count-num" aria-hidden="true">T-5</div>' +
      '<p class="muted">Countdown running \u2014 ABORT scrubs the launch before anything is computed.</p>' +
      "</div>" +
      '<div class="lc-tele" id="lc-tele" hidden>' +
      '<div class="lc-tele-grid">' +
      '<div><span class="lc-tele-k">MISSION ELAPSED</span><strong id="lc-t-month">M1</strong></div>' +
      '<div><span class="lc-tele-k">SUBSCRIBERS</span><strong id="lc-t-subs">0</strong></div>' +
      '<div><span class="lc-tele-k">NET / MO</span><strong id="lc-t-net">$0</strong></div>' +
      '<div><span class="lc-tele-k">STAGE</span><strong id="lc-t-stage">S0</strong></div>' +
      "</div>" +
      '<div class="lc-tele-bar" role="progressbar" aria-label="Mission elapsed time" ' +
      'aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="lc-t-bar">' +
      '<div class="lc-tele-fill" id="lc-t-fill"></div></div>' +
      '<p class="muted" id="lc-t-note" role="status"></p>' +
      "</div>" +
      '<div class="lc-actions"><button type="button" class="btn btn-ghost" id="lc-abort">ABORT</button> ' +
      '<span class="muted" style="font-size:.85rem">or press Esc \u2014 nothing is computed until liftoff.</span></div>' +
      '<div id="lc-live" class="sr-only" aria-live="polite"></div>' +
      "</div>";
    out.parentNode.insertBefore(sec, out);
    $("lc-abort").addEventListener("click", abort);
    sec.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); abort(); }
    });
    return sec;
  }

  function setStatus(txt) {
    var s = $("lc-status");
    if (s) s.textContent = txt;
  }

  function abort() {
    clearTimers();
    announce("Launch scrubbed \u2014 nothing was computed.");
    var sec = $("launch-console");
    if (sec && sec.parentNode) sec.parentNode.removeChild(sec);
    /* #lc-live dies with the console above, so the scrub notice would
     * never reach a screen reader -- post it to the persistent
     * #sim-output live region instead. */
    var out = $("sim-output");
    if (out) {
      var note = document.createElement("p");
      note.className = "sr-only";
      note.setAttribute("role", "status");
      note.textContent = "Launch scrubbed \u2014 nothing was computed.";
      out.insertAdjacentElement("afterbegin", note);
    }
    var btn = document.querySelector('#sim-form button[type="submit"]');
    if (btn) btn.focus();
  }

  function renderChecks(checks) {
    var ol = $("lc-checks");
    if (!ol) return;
    ol.innerHTML = checks.map(function (c) {
      return '<li class="lc-check ' + (c.ok ? "lc-ok" : "lc-bad") + '">' +
        '<span class="lc-check-mark" aria-hidden="true">' + (c.ok ? "\u2713" : "\u2717") + "</span>" +
        "<span><strong>" + esc(c.label) + "</strong> \u2014 " +
        '<span class="sr-only">' + (c.ok ? "pass" : "fail") + ": </span>" +
        esc(c.detail) + "</span></li>";
    }).join("");
  }

  function runCountdown(done) {
    var steps = countdownSteps();
    var num = $("lc-count-num");
    $("lc-count").hidden = false;
    setStatus("COUNTDOWN");
    var i = 0;
    function tick() {
      var label = steps[i];
      num.textContent = label;
      /* re-trigger the pulse: transform/opacity only, 60fps-safe */
      num.classList.remove("lc-pulse");
      void num.offsetWidth;
      num.classList.add("lc-pulse");
      if (label === "T-5" || label === "T-3" || label === "T-1") announce("T-minus " + label.slice(2));
      if (label === "LIFTOFF") announce("Liftoff.");
      i++;
      if (i < steps.length) later(tick, 650);
      else later(done, 500);
    }
    tick();
  }

  function runTelemetry(pair, done) {
    var ui = window.EmpireSimUI;
    var names = ui.stageNames();
    var frames = telemetryFrames(pair.res, names);
    var N = frames.length;
    var tele = $("lc-tele");
    tele.hidden = false;
    setStatus("MISSION ELAPSED");
    $("lc-title").textContent = "LAUNCH SEQUENCE // " + N + "-MONTH FLIGHT";
    var fill = $("lc-t-fill");
    var bar = $("lc-t-bar");
    var i = 0;
    function frame() {
      var f = frames[i];
      $("lc-t-month").textContent = "M" + f.month;
      $("lc-t-subs").textContent = fmtCompact(f.subs);
      $("lc-t-net").textContent = fmtMoney(f.net);
      $("lc-t-stage").textContent = "S" + f.stage;
      var pct = Math.round(((i + 1) / N) * 100);
      fill.style.transform = "scaleX(" + ((i + 1) / N) + ")";
      bar.setAttribute("aria-valuenow", String(pct));
      if (f.stageChanged) {
        var note = "STAGE " + f.stage + " \u2014 " +
          (f.stageName || "").toUpperCase();
        $("lc-t-note").textContent = note + " (month " + f.month + ")";
        announce(note);
      }
      i++;
      if (i < N) later(frame, 90);
      else {
        announce("Mission complete \u2014 rendering the debrief.");
        later(done, 350);
      }
    }
    frame();
  }

  function creditMission(scenario) {
    if (typeof window.MoneyMap === "undefined") return null;
    try {
      var store = window.MoneyMap.loadClimb();
      var ts = new Date().toISOString();
      var r = window.MoneyMap.awardXP(store, missionKey(ts), MISSION_XP,
        "Mission logged \u2014 " + scenario);
      window.MoneyMap.saveClimb(store);
      return r;
    } catch (e) { return null; }
  }

  function renderDebrief(pair, xpResult) {
    var ui = window.EmpireSimUI;
    var d = debriefFor(pair.inputs, pair.res, ui.scenarioName(), ui.stageNames());
    var stats = d.stats.map(function (s) {
      return '<div class="calc-out"><div class="lbl">' + esc(s.label) + '</div>' +
        '<div class="big">' + esc(s.value) + "</div></div>";
    }).join("");
    var html =
      '<div class="lc-debrief hud-panel"><div class="hud-head">' +
      "<span>MISSION DEBRIEF // " + esc(d.scenario).toUpperCase() + "</span>" +
      '<span class="hud-status">LOGGED</span></div><div class="hud-body">' +
      '<p class="fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>AFTER-ACTION</p>' +
      '<h2><span class="stamp stamp-gold" aria-hidden="true">LOGGED</span> ' +
      '<span class="lc-debrief-title">' + esc(d.title) + "</span></h2>" +
      '<div class="stat-grid">' + stats + "</div>" +
      (xpResult && xpResult.awarded
        ? '<p class="lc-xp" role="status">' + esc(d.xpLine) + "</p>"
        : "") +
      '<p class="muted">' + esc(d.honesty) + "</p>" +
      "</div></div>";
    var out = $("sim-output");
    out.insertAdjacentHTML("afterbegin", html);
    var card = out.querySelector(".lc-debrief");
    if (card) {
      if (motionReduced()) card.scrollIntoView({ block: "start" });
      else card.scrollIntoView({ behavior: "smooth", block: "start" });
      card.setAttribute("tabindex", "-1");
      card.focus({ preventScroll: true });
    }
    setStatus("MISSION LOGGED");
    var abortBtn = $("lc-abort");
    if (abortBtn) abortBtn.parentNode.style.display = "none";
    announce("Mission logged. " + d.title + ".");
  }

  function start() {
    var ui = window.EmpireSimUI;
    if (!ui) return false;
    clearTimers();
    var sec = buildConsole();
    sec.focus({ preventScroll: true });
    var inputs = ui.readInputs();
    var checks = preflightChecks(inputs, {
      loaded: ui.hasConfig(),
      engineReady: ui.engineReady()
    });
    renderChecks(checks);
    var failed = checks.filter(function (c) { return !c.ok; });
    if (failed.length) {
      setStatus("HOLD \u2014 SCRUBBED");
      announce("Launch scrubbed: " + failed.map(function (f) {
        return f.label + " \u2014 " + f.detail;
      }).join(" "));
      return true;
    }
    announce("Pre-flight checks green. Go for launch.");
    if (motionReduced()) {
      /* still the sequence, minus the motion: compute, render, debrief */
      var pair = ui.computeRun();
      if (!pair) { setStatus("HOLD \u2014 SCRUBBED"); return true; }
      /* wave-2: the launch hands off to the animated "watch the empire
       * build" chart — the telemetry already played, this is the payoff. */
      ui.renderRun(pair, { scroll: false, transition: false, animate: true });
      renderDebrief(pair, creditMission(ui.scenarioName()));
      var tele = $("lc-tele");
      if (tele) tele.hidden = true;
      var count = $("lc-count");
      if (count) count.hidden = true;
      return true;
    }
    later(function () { runCountdown(function () {
      var p = ui.computeRun();
      if (!p) { setStatus("HOLD \u2014 SCRUBBED"); return; }
      runTelemetry(p, function () {
        /* transition:false: render()'s startViewTransition defers its DOM
         * swap to the next frame, which would wipe the debrief inserted
         * right after. The synchronous swap keeps ordering deterministic;
         * the debrief card carries its own entrance animation (CSS).
         * animate:true: the chart still plays its month-by-month build. */
        ui.renderRun(p, { scroll: false, transition: false, animate: true });
        renderDebrief(p, creditMission(ui.scenarioName()));
      });
    }); }, 600);
    return true;
  }

  /* Called from simulator.js's own submit listener: when the launch module
   * is present it takes over the explicit run (preventDefault + sequence).
   * Live-update re-runs never submit the form and are untouched. */
  function interceptSubmit(e) {
    if (typeof document === "undefined") return false;
    if (!window.EmpireSimUI) return false;
    e.preventDefault();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    start();
    return true;
  }

  /* No auto-init needed: simulator.js delegates its submit to
   * SimLaunch.interceptSubmit at event time, by which point every deferred
   * script (sim-engine, money-map, simulator, this file — in that order)
   * has executed. */

  return {
    COUNTDOWN_STEPS: COUNTDOWN_STEPS,
    MISSION_XP: MISSION_XP,
    preflightChecks: preflightChecks,
    countdownSteps: countdownSteps,
    telemetryFrames: telemetryFrames,
    debriefFor: debriefFor,
    missionKey: missionKey,
    interceptSubmit: interceptSubmit,
    start: start,
    abort: abort
  };
});
