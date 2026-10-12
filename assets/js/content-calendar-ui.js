/* Content Calendar — 90-day grid dealt from the idea bank.
   Pure-math-free: dealing/export live in assets/js/content-engine.js.
   Reads the idea bank from localStorage "cge_idea_bank_v1"; stores moves and
   sponsor marks in "cge_calendar_v1" (per config fingerprint). */
(function () {
  "use strict";
  var form = document.getElementById("cc-form");
  var out = document.getElementById("cc-results");
  if (!form || !out) return;

  var CE = window.ContentEngine;
  var BANK_KEY = "cge_idea_bank_v1";
  var CAL_KEY = "cge_calendar_v1";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function loadBank() {
    try { var a = JSON.parse(localStorage.getItem(BANK_KEY)); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function loadCal() {
    try { var o = JSON.parse(localStorage.getItem(CAL_KEY)); return o || {}; }
    catch (e) { return {}; }
  }
  function saveCal(o) {
    try { localStorage.setItem(CAL_KEY, JSON.stringify(o)); } catch (e) { /* private mode */ }
  }
  function fp(cfg) {
    return [cfg.longsPerWeek, cfg.shortsPerWeek, cfg.restDay, cfg.weeks].join("x");
  }

  var deal = null;       // last dealt plan
  var overrides = {};    // itemKey -> {week, day}
  var sponsored = {};    // itemKey -> true

  function itemKey(it, w, d, n) {
    if (it.ideaId) return "idea:" + it.ideaId;
    return "open:W" + w + "D" + d + "S" + it.slot + ":" + n;
  }

  function copy(text, btn) {
    function done() { if (btn) { btn.textContent = "Copied \u2713"; setTimeout(function () { btn.textContent = "Copy my calendar"; }, 2000); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* no-op */ }
      document.body.removeChild(ta);
    }
  }

  function applyMoves() {
    /* build lookup: key -> current placement */
    var placement = {};
    deal.weeks.forEach(function (wk, wi) {
      wk.days.forEach(function (d, di) {
        d.items.forEach(function (it, n) {
          var key = itemKey(it, wi, di, n);
          placement[key] = { week: wi, day: di };
        });
      });
    });
    var moved = [];
    Object.keys(overrides).forEach(function (key) {
      if (placement[key]) moved.push({ key: key, to: overrides[key] });
    });
    return moved;
  }

  function currentItems() {
    /* week -> day -> [item render records] after moves */
    var grid = deal.weeks.map(function (wk) {
      return wk.days.map(function (d) { return []; });
    });
    var moved = applyMoves();
    var movedTo = {};
    moved.forEach(function (m) { movedTo[m.key] = m.to; });
    deal.weeks.forEach(function (wk, wi) {
      wk.days.forEach(function (d, di) {
        d.items.forEach(function (it, n) {
          var key = itemKey(it, wi, di, n);
          if (movedTo[key]) {
            var t = movedTo[key];
            grid[t.week].days[t.day].push({ item: it, key: key });
          } else {
            grid[wi][di].push({ item: it, key: key });
          }
        });
      });
    });
    return grid;
  }

  function moveItem(key, dWeek, dDay) {
    var t = applyMoves().filter(function (m) { return m.key === key; })[0];
    var cur = t ? t.to : findOriginal(key);
    if (!cur) return;
    var nw = cur.week + dWeek, nd = cur.day + dDay;
    if (nw < 0 || nw >= deal.weeks.length || nd < 0 || nd > 6) return;
    if (deal.weeks[nw].days[nd].rest) return; // rest day is non-negotiable
    overrides[key] = { week: nw, day: nd };
    persist();
    renderGrid();
  }

  function findOriginal(key) {
    var found = null;
    deal.weeks.forEach(function (wk, wi) {
      wk.days.forEach(function (d, di) {
        d.items.forEach(function (it, n) {
          if (itemKey(it, wi, di, n) === key) found = { week: wi, day: di };
        });
      });
    });
    return found;
  }

  function persist() {
    var all = loadCal();
    all[fp(deal.config)] = { overrides: overrides, sponsored: sponsored };
    saveCal(all);
  }

  function itemHtml(rec) {
    var it = rec.item;
    var star = it.ideaId
      ? '<span class="cc-score" aria-label="Hook strength">' + "\u2605".repeat(CE.hookScore((bankById[it.ideaId] || {}).hookScore)) + "</span>"
      : "";
    var cls = it.open ? "cc-item cc-open" : "cc-item";
    var sponsorBtn = '<button type="button" class="cc-star" data-key="' + esc(rec.key) + '" aria-pressed="' +
      (sponsored[rec.key] ? "true" : "false") + '" title="Mark as sponsored slot (price it in the Deal Room)">\u2605</button>';
    var body = it.open
      ? '<span class="cc-open-label">OPEN ' + esc(it.slot) + " slot</span>"
      : "<span>" + esc(it.title) + "</span> " + star;
    return '<div class="' + cls + (sponsored[rec.key] ? " cc-sponsored" : "") + '" draggable="true" data-key="' + esc(rec.key) + '" tabindex="0" role="group" aria-label="' +
      esc(it.open ? "Open " + it.slot + " slot" : it.title) + '">' +
      body + sponsorBtn +
      '<span class="cc-move" role="group" aria-label="Move item">' +
      '<button type="button" data-move="-1" data-key="' + esc(rec.key) + '" aria-label="Move to previous day">\u2039</button>' +
      '<button type="button" data-move="1" data-key="' + esc(rec.key) + '" aria-label="Move to next day">\u203a</button>' +
      "</span></div>";
  }

  var bankById = {};

  function renderGrid() {
    var grid = currentItems();
    var html = '<div class="hud-panel" style="margin-bottom:1rem"><div class="hud-head">' +
      "<span>CALENDAR // " + deal.config.weeks + " WEEKS DEALT</span>" +
      '<span class="hud-status">' + deal.totals.long + " LONG \u00b7 " + deal.totals.short + " SHORT \u00b7 " +
      deal.openSlots + " OPEN</span></div><div class=\"hud-body\">" +
      '<div class="cc-actions">' +
      '<button type="button" class="btn btn-primary" id="cc-copy">Copy my calendar</button>' +
      '<button type="button" class="btn btn-ghost" id="cc-sim">Send cadence to Simulator</button>' +
      "</div>" +
      '<p class="muted">Drag items between days, or use the \u2039 \u203a buttons (keyboard-friendly). ' +
      "Star \u2605 marks a sponsored slot — price it in the <a href=\"deal-room.html\">Deal Room</a> before you promise it. " +
      "Open slots are honest gaps: the idea bank needs ideas, not filler.</p>" +
      "</div></div>";
    grid.forEach(function (days, wi) {
      var wk = deal.weeks[wi];
      html += '<section class="cc-week" aria-label="Week ' + wk.week + '"><h3>Week ' + wk.week +
        (wk.midpointReview ? ' <span class="badge gold">MIDPOINT REVIEW</span>' : "") + "</h3>";
      html += '<div class="cc-days">';
      days.forEach(function (recs, di) {
        var d = wk.days[di];
        html += '<div class="cc-day' + (d.rest ? " cc-rest" : "") + '" data-week="' + wi + '" data-day="' + di + '">' +
          "<strong>" + esc(d.day) + "</strong>";
        if (d.rest) html += '<p class="muted"><em>Rest — analytics review.</em></p>';
        recs.forEach(function (rec) { html += itemHtml(rec); });
        if (!recs.length && !d.rest) html += '<p class="muted">\u2014</p>';
        html += "</div>";
      });
      html += "</div></section>";
    });
    if (deal.unplaced.length) {
      html += '<section class="cc-week"><h3>Backlog — in the bank, not on the calendar</h3><div class="cc-backlog">' +
        deal.unplaced.map(function (i) {
          return '<span class="sticker sticker-ghost">' + esc(i.title) + "</span>";
        }).join("") + "</div></section>";
    }
    out.innerHTML = html;
    wireGrid();
  }

  function wireGrid() {
    var copyBtn = document.getElementById("cc-copy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      copy(CE.exportCalendarText(deal) + exportSponsorNote(), copyBtn);
    });
    var simBtn = document.getElementById("cc-sim");
    if (simBtn) simBtn.addEventListener("click", function () {
      var cfg = CE.simInputFromCadence(deal.config.longsPerWeek, deal.config.shortsPerWeek);
      copy(JSON.stringify(cfg, null, 2), simBtn);
      simBtn.textContent = "Copied \u2713 \u2014 paste into Simulator";
      setTimeout(function () { simBtn.textContent = "Send cadence to Simulator"; }, 2500);
    });

    out.querySelectorAll("[data-move]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var delta = parseInt(b.getAttribute("data-move"), 10);
        moveItem(b.getAttribute("data-key"), 0, delta);
      });
    });
    out.querySelectorAll(".cc-star").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var key = b.getAttribute("data-key");
        if (sponsored[key]) delete sponsored[key]; else sponsored[key] = true;
        persist();
        renderGrid();
      });
    });

    /* pointer drag-and-drop */
    var dragKey = null;
    out.querySelectorAll(".cc-item").forEach(function (el) {
      el.addEventListener("dragstart", function (e) {
        dragKey = el.getAttribute("data-key");
        e.dataTransfer.effectAllowed = "move";
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { moveItem(el.getAttribute("data-key"), 0, -1); e.preventDefault(); }
        if (e.key === "ArrowRight") { moveItem(el.getAttribute("data-key"), 0, 1); e.preventDefault(); }
      });
    });
    out.querySelectorAll(".cc-day").forEach(function (cell) {
      cell.addEventListener("dragover", function (e) { e.preventDefault(); cell.classList.add("cc-drop"); });
      cell.addEventListener("dragleave", function () { cell.classList.remove("cc-drop"); });
      cell.addEventListener("drop", function (e) {
        e.preventDefault();
        cell.classList.remove("cc-drop");
        if (!dragKey) return;
        var wi = parseInt(cell.getAttribute("data-week"), 10);
        var di = parseInt(cell.getAttribute("data-day"), 10);
        if (deal.weeks[wi].days[di].rest) return;
        overrides[dragKey] = { week: wi, day: di };
        dragKey = null;
        persist();
        renderGrid();
      });
    });
  }

  function exportSponsorNote() {
    var keys = Object.keys(sponsored);
    if (!keys.length) return "";
    var lines = ["", "SPONSORED SLOTS (price in the Deal Room before promising):"];
    var titles = {};
    deal.weeks.forEach(function (wk, wi) {
      wk.days.forEach(function (d, di) {
        d.items.forEach(function (it, n) {
          var key = itemKey(it, wi, di, n);
          titles[key] = it.open ? "OPEN " + it.slot + " slot" : it.title;
        });
      });
    });
    keys.forEach(function (k) { lines.push("  \u2605 " + (titles[k] || k)); });
    return "\n" + lines.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bank = loadBank();
    bankById = {};
    bank.forEach(function (i) { bankById[i.id] = i; });
    var cfg = {
      longsPerWeek: parseInt(document.getElementById("cc-longs").value, 10) || 0,
      shortsPerWeek: parseInt(document.getElementById("cc-shorts").value, 10) || 0,
      restDay: parseInt(document.getElementById("cc-rest").value, 10) || 0,
      weeks: 13
    };
    deal = CE.dealIdeas(bank, cfg);
    var saved = loadCal()[fp(deal.config)] || {};
    overrides = saved.overrides || {};
    sponsored = saved.sponsored || {};
    var warn = "";
    if (!bank.length) {
      warn = '<div class="error-state" role="alert"><strong>THE BANK IS EMPTY</strong>' +
        '<p>No ideas to deal. Capture some in the <a href="idea-bank.html">Idea Bank</a> first — ' +
        "the calendar deals real ideas, never filler.</p></div>";
    } else if (deal.openSlots > 0) {
      warn = '<div class="callout" style="margin-bottom:1rem"><strong>' + deal.openSlots +
        " OPEN SLOTS</strong><p>Your bank doesn't cover this cadence yet — that's feedback, not " +
        'failure. Either bank more ideas or shrink the cadence. <a href="batching.html">Check your film-day math</a>.</p></div>';
    }
    renderGrid();
    out.insertAdjacentHTML("afterbegin", warn);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
