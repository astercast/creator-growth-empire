/* Idea Bank, localStorage idea capture + scoring + promote-to-production.
   Pure-math-free: sorting/dealing live in assets/js/content-engine.js.
   Storage: localStorage key "cge_idea_bank_v1" (array of idea records). */
(function () {
  "use strict";
  var form = document.getElementById("ib-form");
  var listEl = document.getElementById("ib-list");
  var emptyEl = document.getElementById("ib-empty");
  var countEl = document.getElementById("ib-count");
  var sortSel = document.getElementById("ib-sort");
  var filterSel = document.getElementById("ib-filter");
  var nicheInput = document.getElementById("ib-niche");
  if (!form || !listEl) return;

  var KEY = "cge_idea_bank_v1";
  var CE = window.ContentEngine;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { /* private mode */ }
  }
  function uid() {
    return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* niche tag datalist from the Niche Atlas, graceful fallback to free text */
  if (nicheInput) {
    fetch("data/v1/niches.json").then(function (r) { return r.json(); }).then(function (d) {
      var dl = document.getElementById("ib-niche-list");
      if (!dl || !d.niches) return;
      dl.innerHTML = d.niches.map(function (n) {
        return '<option value="' + esc(n.id) + '">' + esc(n.name) + "</option>";
      }).join("");
    }).catch(function () { /* offline-safe: free text still works */ });
  }

  var FORMAT_LABELS = { long: "Long-form", short: "Short-form", community: "Community" };
  var EFFORT_LABELS = { quick: "Quick (< 2h)", afternoon: "Afternoon (half day)", week: "Full week build" };

  function cardHtml(idea) {
    var score = CE.hookScore(idea.hookScore);
    var stars = "\u2605".repeat(score) + "\u2606".repeat(5 - score);
    var promoted = idea.promoted
      ? '<span class="badge money">IN PRODUCTION</span>'
      : '<button type="button" class="btn btn-ghost btn-sm ib-promote" data-id="' + esc(idea.id) + '">Promote to production \u2192</button>';
    return '<article class="brief-card idea-card" style="--card-accent: var(--stamp);">' +
      '<div class="brief-head"><span class="brief-id">' + esc(FORMAT_LABELS[idea.format] || idea.format) + "</span>" +
      '<span class="brief-status" aria-label="Hook strength ' + score + ' of 5">' + stars + "</span></div>" +
      '<div class="brief-body"><h3>' + esc(idea.title) + "</h3>" +
      '<p class="brief-usage"><strong>Effort</strong> ' + esc(EFFORT_LABELS[idea.effort] || idea.effort) +
      (idea.niche ? " · <strong>Niche</strong> " + esc(idea.niche) : "") + "</p></div>" +
      '<div class="idea-actions">' + promoted +
      '<button type="button" class="btn btn-ghost btn-sm ib-delete" data-id="' + esc(idea.id) + '" aria-label="Delete idea">\u2715</button></div>' +
      "</article>";
  }

  function render() {
    var ideas = load();
    var filtered = CE.filterIdeas(ideas, filterSel.value);
    var ordered = sortSel.value === "newest"
      ? filtered.slice().sort(function (a, b) { return (b.created || 0) - (a.created || 0); })
      : CE.sortIdeas(filtered);
    countEl.textContent = ideas.length + (ideas.length === 1 ? " idea" : " ideas") +
      " in the bank";
    if (!ordered.length) {
      listEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    listEl.innerHTML = ordered.map(cardHtml).join("");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("ib-title").value.trim();
    var format = (form.querySelector('input[name="format"]:checked') || {}).value || "long";
    var niche = nicheInput ? nicheInput.value.trim() : "";
    var effort = document.getElementById("ib-effort").value || "afternoon";
    var score = CE.hookScore((form.querySelector('input[name="hook"]:checked') || {}).value);
    if (!title) {
      document.getElementById("ib-title").focus();
      return;
    }
    var ideas = load();
    ideas.push({ id: uid(), title: title, format: format, niche: niche,
                 effort: effort, hookScore: score, created: Date.now(), promoted: false });
    save(ideas);
    form.reset();
    render();
    var live = document.getElementById("ib-live");
    if (live) live.textContent = "Idea banked: " + title;
  });

  listEl.addEventListener("click", function (e) {
    var promoteBtn = e.target.closest(".ib-promote");
    var deleteBtn = e.target.closest(".ib-delete");
    if (!promoteBtn && !deleteBtn) return;
    var ideas = load();
    if (promoteBtn) {
      var id = promoteBtn.getAttribute("data-id");
      ideas.forEach(function (i) { if (i.id === id) i.promoted = true; });
      save(ideas);
      render();
      var live = document.getElementById("ib-live");
      if (live) live.textContent = "Promoted to production, it now deals into your content calendar.";
    } else if (deleteBtn) {
      var did = deleteBtn.getAttribute("data-id");
      save(ideas.filter(function (i) { return i.id !== did; }));
      render();
    }
  });

  sortSel.addEventListener("change", render);
  filterSel.addEventListener("change", render);
  render();
})();
