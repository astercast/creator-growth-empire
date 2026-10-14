/* Deal Pipeline, page wiring. Engine (assets/js/deal-pipeline.js)
 * composes Tool 23 (pricing) and Tool 24 (scripts). Storage:
 * localStorage only (key cge.deal-pipeline.deals.v1), no accounts,
 * no network writes. Starts EMPTY: no deals exist until the creator
 * enters one; demo deals load only from the labeled demo control
 * and stay flagged DEMO everywhere they render. */
(function () {
  "use strict";
  var P = window.DealPipeline;
  var form = document.getElementById("dp-form");
  if (!P || !form) return;
  var boardEl = document.getElementById("dp-board");
  var totalsEl = document.getElementById("dp-totals");
  var nudgesEl = document.getElementById("dp-nudges");
  var scriptEl = document.getElementById("dp-script");
  var exportBox = document.getElementById("dp-export");
  var errorsBox = document.getElementById("dp-errors");
  var DATA = { calculators: null, templates: null, feed: null };
  var deals = load();

  function load() {
    try {
      var v = window.localStorage.getItem(P.STORAGE_KEY);
      var parsed = v ? JSON.parse(v) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function save() {
    try { window.localStorage.setItem(P.STORAGE_KEY, JSON.stringify(deals)); } catch (e) { /* storage full/blocked, board still works in memory */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rangeText(r) {
    if (!r) return "no benchmark";
    if (r[1] == null) return P.fmt(r[0]) + "+";
    if (r[0] === r[1]) return P.fmt(r[0]);
    return P.fmt(r[0]) + "–" + P.fmt(r[1]);
  }
  function today() { return new Date().toISOString().slice(0, 10); }

  function render() {
    var board = P.buildBoard(deals, { calculators: DATA.calculators, dealTemplates: DATA.templates,
      changesFeed: DATA.feed, now: new Date() });
    var t = board.totals;
    totalsEl.innerHTML = t.empty && !t.demoCount
      ? "<div class=\"dp-empty\"><p><strong>No deals yet.</strong> This board is genuinely empty, totals are zero because nothing has been entered. Add your first deal above, or load the labeled demo board to see the layout.</p></div>"
      : "<p class=\"dp-totals-line\"><strong>" + t.totalDeals + " deal(s)</strong> · pipeline " + P.fmt(t.pipelineValue) +
        " · open " + P.fmt(t.openValue) + " · invoiced outstanding " + P.fmt(t.invoicedOutstanding) +
        " · paid " + P.fmt(t.paidTotal) +
        (t.demoCount ? " · <span class=\"badge stamp\">" + t.demoCount + " DEMO deal(s) excluded from totals</span>" : "") + "</p>";
    var html = "";
    board.stages.forEach(function (s) {
      html += "<section class=\"dp-stage\" aria-label=\"" + esc(board.stageLabels[s]) + "\"><h3>" +
        esc(board.stageLabels[s]) + " <span class=\"muted\">(" + board.byStage[s].length + ")</span></h3>";
      if (!board.byStage[s].length) html += "<p class=\"muted dp-none\">No deals in this stage.</p>";
      board.byStage[s].forEach(function (e) {
        var d = e.deal;
        html += "<article class=\"dp-deal\">" +
          "<p class=\"dp-deal-head\"><strong>" + esc(d.brand) + "</strong> " +
          (d.demo ? "<span class=\"badge stamp\">DEMO</span> " : "") +
          "<span class=\"dp-fig\">" + P.fmt(d.amount) + "</span> " +
          "<span class=\"muted\">in stage " + (e.ageDays == null ? "?" : e.ageDays) + "d</span></p>" +
          (e.rateCard && e.rateCard.ok
            ? "<p class=\"muted dp-prov\">Rate card: " + esc(e.rateCard.primary.label) + " " +
              esc(rangeText(e.rateCard.primary.range)) +
              (e.rateCard.total ? " · card total " + esc(rangeText(e.rateCard.total.range, e.rateCard.total.openEnded)) : "") +
              "<br>" + esc(e.rateCard.provenance) + "</p>"
            : "<p class=\"muted dp-prov\">Rate card: not priced, " +
              esc(e.rateCard && e.rateCard.errors ? e.rateCard.errors.join("; ") : "benchmark data not loaded") + "</p>") +
          "<p class=\"dp-actions\">" +
          (e.script && e.script.ok
            ? "<button type=\"button\" class=\"btn dp-script-btn\" data-script=\"" + esc(d.id) + "\">Open negotiation script, " + esc(e.script.label) + "</button> "
            : "<span class=\"muted\">" + esc(e.script && e.script.reason ? e.script.reason : "No script for this stage.") + "</span> ") +
          "<label class=\"dp-move\">Move to <select data-move=\"" + esc(d.id) + "\">" +
          P.STAGES.map(function (st) {
            return "<option value=\"" + st + "\"" + (st === d.stage ? " selected" : "") + ">" + P.STAGE_LABELS[st] + "</option>";
          }).join("") + "</select></label> " +
          "<button type=\"button\" class=\"btn dp-del\" data-del=\"" + esc(d.id) + "\">Remove</button></p>" +
          (e.nudge ? "<p class=\"dp-nudge\"><strong>Follow-up:</strong> " + esc(e.nudge.action) + "</p>" : "") +
          "</article>";
      });
      html += "</section>";
    });
    boardEl.innerHTML = html;
    nudgesEl.innerHTML = board.nudges.length
      ? "<ul class=\"dp-nudge-list\">" + board.nudges.map(function (n) {
          return "<li><strong>" + esc(n.brand) + "</strong>, " + esc(n.stageLabel) + ", " + n.ageDays +
            " days in stage (nudge at " + n.thresholdDays + "d): " + esc(n.action) + "</li>";
        }).join("") + "</ul>"
      : "<p class=\"muted\">No follow-ups due. Nudges appear from stage age alone, lead 3d, negotiating 7d, terms set 5d, live 14d, invoiced 14d.</p>";
    exportBox.value = P.exportBoard(board);
    wireBoard(board);
  }

  function wireBoard(board) {
    boardEl.querySelectorAll("[data-script]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var hit = board.deals.filter(function (e) { return e.deal.id === btn.getAttribute("data-script"); })[0];
        if (!hit || !hit.script || !hit.script.ok) return;
        scriptEl.innerHTML = "<h3>Negotiation script: " + esc(hit.deal.brand) + "</h3>" +
          hit.script.lines.map(function (l) {
            return "<blockquote class=\"dp-line\">" + esc(l.text) + "</blockquote>" +
              "<p class=\"muted\">Source: " + esc(l.sources.join(" + ")) + ", " + esc(l.grounded_in) + "</p>";
          }).join("") +
          "<p class=\"muted\">Assembled by the Negotiation Script Builder (Tool 24), edit it in that tool for the full export.</p>";
        scriptEl.scrollIntoView({ block: "start" });
      });
    });
    boardEl.querySelectorAll("[data-move]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var d = deals.filter(function (x) { return x.id === sel.getAttribute("data-move"); })[0];
        if (d) { d.stage = sel.value; d.stageEnteredAt = today(); save(); render(); }
      });
    });
    boardEl.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deals = deals.filter(function (x) { return x.id !== btn.getAttribute("data-del"); });
        save(); render();
      });
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var deal = {
      id: "d" + Date.now().toString(36),
      brand: document.getElementById("dp-brand").value.trim(),
      platform: document.getElementById("dp-platform").value,
      format: document.getElementById("dp-format").value,
      followers: Number(document.getElementById("dp-followers").value),
      expectedViews: Number(document.getElementById("dp-views").value) || 0,
      niche: document.getElementById("dp-niche").value || null,
      usage: document.getElementById("dp-usage").value,
      whitelistingMonths: Number(document.getElementById("dp-wl-months").value) || 0,
      amount: Number(document.getElementById("dp-amount").value),
      stage: document.getElementById("dp-stage").value,
      stageEnteredAt: document.getElementById("dp-entered").value || today(),
      scenario: document.getElementById("dp-scenario").value || null
    };
    var v = P.validDeal(deal);
    if (!v.ok) { errorsBox.textContent = "Check the form: " + v.errors.join("; ") + "."; return; }
    errorsBox.textContent = "";
    deals.push(deal); save(); render();
    document.getElementById("dp-sec-board").scrollIntoView({ block: "start" });
  });

  var demoBtn = document.getElementById("dp-demo");
  if (demoBtn) demoBtn.addEventListener("click", function () {
    deals = P.DEMO_DEALS.map(function (d) { return Object.assign({}, d); });
    save(); render();
  });
  var clearBtn = document.getElementById("dp-clear");
  if (clearBtn) clearBtn.addEventListener("click", function () { deals = []; save(); render(); });
  var copyBtn = document.getElementById("dp-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the board"; }, 2000);
  });

  document.getElementById("dp-entered").value = today();
  render();
  Promise.allSettled([
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
    fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); }),
    fetch("data/v1/changes.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    if (res[0].status === "fulfilled") DATA.calculators = res[0].value;
    if (res[1].status === "fulfilled") DATA.templates = res[1].value;
    if (res[2].status === "fulfilled") DATA.feed = res[2].value;
    if (!DATA.calculators || !DATA.templates) {
      errorsBox.textContent = "Could not load the benchmark / script data (data/v1/). Deals still save and total, but rate cards and scripts need data/v1/ deployed alongside this page.";
    }
    render();
  });
})();
