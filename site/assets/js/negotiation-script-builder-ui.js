/* Negotiation Script Builder — page wiring. Engine does the
 * assembly; benchmarks via window.NegotiationKit on
 * data/v1/calculators.json, scripts from data/v1/deal-templates.json.
 * Starts EMPTY: no script exists until the creator picks a scenario
 * and builds it. Nothing is stored. */
(function () {
  "use strict";
  var B = window.NegotiationScriptBuilder, K = window.NegotiationKit;
  var form = document.getElementById("nsb-form");
  if (!B || !K || !form) return;
  var out = document.getElementById("nsb-out");
  var prov = document.getElementById("nsb-prov");
  var exportBox = document.getElementById("nsb-export");
  var errorsBox = document.getElementById("nsb-errors");
  var DATA = { calculators: null, templates: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function readForm() {
    return {
      scenario: document.getElementById("nsb-scenario").value,
      brand: document.getElementById("nsb-brand").value.trim(),
      platform: document.getElementById("nsb-platform").value,
      deliverable: document.getElementById("nsb-deliverable").value,
      followers: Number(document.getElementById("nsb-followers").value),
      expectedViews: Number(document.getElementById("nsb-views").value) || 0,
      offer: Number(document.getElementById("nsb-offer").value) || 0,
      niche: document.getElementById("nsb-niche").value || null,
      usage: document.getElementById("nsb-usage").value,
      exclusivity: { scope: document.getElementById("nsb-ex-scope").value,
                     months: Number(document.getElementById("nsb-ex-months").value) || 0 },
      invoiceAmount: Number(document.getElementById("nsb-inv-amount").value) || 0,
      invoiceDate: document.getElementById("nsb-inv-date").value.trim(),
      daysOverdue: Number(document.getElementById("nsb-inv-days").value) || 0,
      creatorFloor: Number(document.getElementById("nsb-floor").value) || 0
    };
  }
  var STAGE = { opener: "1 · OPENER", anchor: "2 · ANCHOR — your number, with its evidence",
    concession: "CONCESSION LADDER", "walk-away": "FINAL · WALK-AWAY LINE" };
  function render(res) {
    var html = "<div class=\"nsb-script-head\"><h3>Your script — " + esc(res.scenario.label) + "</h3>" +
      "<p class=\"muted\">Counter " + esc(B.rangeText(res.counter.total)) + " · landing zone " +
      esc(B.rangeText(res.counter.expectedClose)) + " · walk-away " + B.fmt(res.walkAway) + " · verdict " + esc(res.counter.badge) + "</p></div>";
    var lastStage = "";
    res.lines.forEach(function (l) {
      if (l.stage !== lastStage) {
        html += "<h4 class=\"nsb-stage\">" + STAGE[l.stage] + "</h4>"; lastStage = l.stage;
      }
      html += "<blockquote class=\"nsb-line\">" + esc(l.text) + "</blockquote>" +
        "<p class=\"muted nsb-src\">Source: " + esc(l.sources.join(" + ")) + " — " + esc(l.grounded_in) + "</p>";
    });
    out.innerHTML = html;
    var p = "<h4 class=\"nsb-stage\">Excluded scenarios — no repo script, no script built</h4><ul class=\"nsb-excluded\">";
    res.excluded.forEach(function (e) { p += "<li><strong>" + esc(e.label) + ".</strong> " + esc(e.reason) + "</li>"; });
    p += "</ul><p class=\"muted\">" + esc(res.disclaimer) + "</p>";
    prov.innerHTML = p;
    exportBox.value = B.exportScript(res);
  }
  function emptyState(msg) {
    out.innerHTML = "<div class=\"nsb-empty\"><p><strong>No script yet.</strong> " + esc(msg || "Pick the scenario that matches the thread you are in, check your numbers, and build the script. Every line will name the Kit / Deal Room script it came from.") + "</p></div>";
    prov.innerHTML = ""; exportBox.value = "";
  }
  emptyState();
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!DATA.calculators || !DATA.templates) {
      errorsBox.textContent = "Data is still loading — the benchmark and script files have not arrived yet.";
      return;
    }
    var input = readForm();
    var v = B.validInput(input);
    if (!v.ok) {
      errorsBox.textContent = v.excluded ? v.reason : "Check the form: " + v.errors.join("; ") + ".";
      emptyState(v.excluded ? "That scenario is excluded on purpose: " + v.reason : undefined);
      return;
    }
    errorsBox.textContent = "";
    var res = B.buildScript(input, DATA.calculators, DATA.templates, K);
    if (!res.ok) { errorsBox.textContent = res.errors.join("; "); emptyState(); return; }
    render(res);
    document.getElementById("nsb-sec-script").scrollIntoView({ block: "start" });
  });
  var copyBtn = document.getElementById("nsb-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the script"; }, 2000);
  });
  Promise.allSettled([
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
    fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    if (res[0].status === "fulfilled") DATA.calculators = res[0].value;
    if (res[1].status === "fulfilled") DATA.templates = res[1].value;
    if (!DATA.calculators || !DATA.templates) {
      errorsBox.textContent = "Could not load the benchmark / script data (data/v1/). Check that data/v1/ is deployed alongside this page.";
    }
  });
})();
