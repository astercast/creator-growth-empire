/* Cross-Post Optimizer — per-destination adaptation checklists.
   Pure-math-free: the adaptation matrix lives in assets/js/content-engine.js
   (ContentEngine.adaptChecklist). This file is DOM/localStorage wiring only. */
(function () {
  "use strict";
  var form = document.getElementById("cp-form");
  var out = document.getElementById("cp-results");
  if (!form || !out) return;
  var CE = window.ContentEngine;
  var sourceSel = document.getElementById("cp-source");
  var aiBox = document.getElementById("cp-ai");

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Keep the source out of the destinations — the engine ignores it anyway,
   * but disabling it in the UI says it plainly. */
  function syncDests() {
    var boxes = form.querySelectorAll('input[name="cp-dest"]');
    Array.prototype.forEach.call(boxes, function (b) {
      var isSrc = b.value === sourceSel.value;
      b.disabled = isSrc;
      if (isSrc) b.checked = false;
    });
  }
  sourceSel.addEventListener("change", syncDests);
  syncDests();

  function checklistCard(card, idx) {
    var items = card.changes.map(function (c, i) {
      return '<li><label style="font-weight:400;display:flex;gap:.5rem;align-items:flex-start">' +
        '<input type="checkbox" data-cp-card="' + idx + '" style="margin-top:.25rem"> ' +
        "<span>" + esc(c) + "</span></label></li>";
    }).join("");
    return '<div class="hud-panel" style="margin-bottom:1rem"><div class="hud-head">' +
      "<span>" + esc(card.fromLabel).toUpperCase() + " → " + esc(card.toLabel).toUpperCase() + "</span>" +
      '<span class="hud-status">' + esc(card.grammar) + "</span></div>" +
      '<div class="hud-body"><ol class="cp-checklist" style="margin:0;padding-left:1.25rem;display:grid;gap:.6rem">' +
      items + "</ol>" +
      '<p class="muted" data-cp-progress="' + idx + '" role="status" style="margin:.75rem 0 0">0 of ' +
      card.changes.length + " adaptations done.</p></div></div>";
  }

  function updateProgress() {
    var cards = out.querySelectorAll(".hud-panel");
    Array.prototype.forEach.call(cards, function (panel, idx) {
      var boxes = panel.querySelectorAll('input[data-cp-card="' + idx + '"]');
      var done = 0;
      Array.prototype.forEach.call(boxes, function (b) { if (b.checked) done++; });
      var p = panel.querySelector('[data-cp-progress="' + idx + '"]');
      if (p) p.textContent = done + " of " + boxes.length + " adaptations done.";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var dests = [];
    Array.prototype.forEach.call(form.querySelectorAll('input[name="cp-dest"]:checked'),
      function (b) { dests.push(b.value); });
    var r = CE.adaptChecklist(sourceSel.value, dests);
    if (!r.ok) {
      out.innerHTML = '<div class="callout danger"><strong>Can\'t build that plan.</strong><p>' +
        esc(r.error) + "</p></div>";
      return;
    }
    if (!r.cards.length) {
      out.innerHTML = '<div class="empty-state" role="status"><strong>No destinations picked.</strong>' +
        "Tick at least one platform that isn't the source.</div>";
      return;
    }
    var html = "";
    if (aiBox && aiBox.checked) {
      html += '<div class="callout warn"><strong>Photorealistic AI flagged.</strong>' +
        "<p>YouTube requires the AI-content label before upload — labeled gets normal distribution; " +
        "undisclosed photorealistic AI faces reduced recommendations or removal (Ritchie, May 2026). " +
        "Other platforms: check the current disclosure rules — they move.</p></div>";
    }
    html += '<div class="callout danger"><strong>The Oct-1 gate.</strong><p>' + esc(r.gate) + "</p></div>";
    html += r.cards.map(checklistCard).join("");
    html += '<div class="hud-panel"><div class="hud-head"><span>UNIVERSAL CHECKS — EVERY DESTINATION</span>' +
      '<span class="hud-status">NON-NEGOTIABLE</span></div><div class="hud-body"><ul style="margin:0;' +
      'padding-left:1.25rem;display:grid;gap:.6rem">' +
      r.universal.map(function (u) { return "<li>" + esc(u) + "</li>"; }).join("") +
      "</ul></div></div>";
    out.innerHTML = html;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  out.addEventListener("change", updateProgress);
})();
