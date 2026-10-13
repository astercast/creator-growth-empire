/* Follow-Through Queue — page wiring. Engine (assets/js/follow-through.js)
 * composes the Deal Pipeline (Tool 25): the queue reads the SAME
 * localStorage board the pipeline writes (key cge.deal-pipeline.deals.v1)
 * — deals are entered on the Deal Pipeline page, followed up here.
 * No deals are created on this page; demo deals load only from the
 * labeled demo control and never enter the real queue. */
(function () {
  "use strict";
  var FT = window.FollowThrough;
  var P = window.DealPipeline;
  var queueEl = document.getElementById("ft-queue");
  if (!FT || !P || !queueEl) return;
  var briefBox = document.getElementById("ft-export");
  var statusEl = document.getElementById("ft-status");
  var scriptEl = document.getElementById("ft-script");
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
    try { window.localStorage.setItem(P.STORAGE_KEY, JSON.stringify(deals)); } catch (e) { /* storage blocked — queue still renders in memory */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var q = FT.buildQueue(deals, { calculators: DATA.calculators, dealTemplates: DATA.templates,
      changesFeed: DATA.feed, now: new Date() });
    if (!q.ok) { queueEl.innerHTML = "<p class=\"muted\">" + esc(q.errors.join("; ")) + "</p>"; return; }
    statusEl.textContent = q.emptyBoard
      ? "The board is empty — enter deals on the Deal Pipeline and their follow-ups land here."
      : q.demoOnly
        ? "Demo board preview — " + q.demoDue + " demo follow-up(s) counted, none queued as real work."
        : q.nothingDue
          ? "Nothing is due — every deal is inside its follow-up window."
          : q.due + " follow-up(s) due" + (q.urgentCount ? " · " + q.urgentCount + " urgent" : "") +
            (q.demoDue ? " · " + q.demoDue + " DEMO follow-up(s) excluded" : "");
    if (!q.items.length) {
      queueEl.innerHTML = "<div class=\"ft-empty\"><p><strong>" +
        (q.emptyBoard ? "No deals, no queue." : q.demoOnly ? "Demo board — no real queue." : "Nothing due today.") + "</strong> " +
        (q.emptyBoard
          ? "This page sends the follow-ups for deals on the <a href=\"deal-pipeline.html\">Deal Pipeline</a> board. The board is genuinely empty — the queue is empty because nothing has been entered."
          : q.demoOnly
            ? "The demo board's deals have " + q.demoDue + " follow-up(s) due, but demo data never enters the real queue — they are counted above and excluded here, the same rule the Deal Pipeline applies to demo money. Enter a real deal on the board and its follow-ups queue here."
            : "Every deal is still inside its follow-up window (lead 3d, negotiating 7d, terms set 5d, live 14d, invoiced 14d). When a stage ages past its threshold, its follow-up appears here with its script attached.") +
        "</p></div>";
    } else {
      queueEl.innerHTML = "<ol class=\"ft-list\">" + q.items.map(function (it, i) {
        return "<li class=\"ft-item" + (it.urgent ? " ft-urgent" : "") + "\">" +
          "<p class=\"ft-head\"><strong>" + (i + 1) + ". " + esc(it.brand) + "</strong> " +
          (it.urgent ? "<span class=\"badge stamp\">URGENT</span> " : "") +
          "<span class=\"ft-fig\">" + FT.fmt(it.amount) + "</span> " +
          "<span class=\"muted\">" + esc(it.stageLabel) + " · " + it.ageDays + "d in stage · " +
          it.overdueBy + "d past the " + it.thresholdDays + "d follow-up mark</span></p>" +
          "<p class=\"ft-action\"><strong>Do:</strong> " + esc(it.action) + "</p>" +
          (it.script.ok
            ? "<p><button type=\"button\" class=\"btn ft-script-btn\" data-script=\"" + esc(it.dealId) + "\">Open the words — " + esc(it.script.label) + "</button></p>"
            : "<p class=\"muted\">Script: none attached — " + esc(it.script.reason) + "</p>") +
          "</li>";
      }).join("") + "</ol>";
      queueEl.querySelectorAll("[data-script]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var hit = q.items.filter(function (x) { return x.dealId === btn.getAttribute("data-script"); })[0];
          if (!hit || !hit.script.ok) return;
          scriptEl.innerHTML = "<h3>Send to " + esc(hit.brand) + " — " + esc(hit.script.label) + "</h3>" +
            "<textarea rows=\"12\" readonly aria-label=\"Script for " + esc(hit.brand) + "\">" + esc(hit.script.exportText) + "</textarea>" +
            "<p class=\"muted\">Assembled by the Negotiation Script Builder (Tool 24) from this deal's board entry — edit the deal on the Deal Pipeline to change it.</p>";
          scriptEl.scrollIntoView({ block: "start" });
        });
      });
    }
    briefBox.value = FT.exportBrief(q);
  }

  var demoBtn = document.getElementById("ft-demo");
  if (demoBtn) demoBtn.addEventListener("click", function () {
    deals = P.DEMO_DEALS.map(function (d) { return Object.assign({}, d); });
    save(); render();
  });
  var boardBtn = document.getElementById("ft-board");
  if (boardBtn) boardBtn.addEventListener("click", function () { deals = load(); render(); });
  var copyBtn = document.getElementById("ft-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    briefBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(briefBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the brief"; }, 2000);
  });

  render();
  Promise.allSettled([
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
    fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); }),
    fetch("data/v1/changes.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    if (res[0].status === "fulfilled") DATA.calculators = res[0].value;
    if (res[1].status === "fulfilled") DATA.templates = res[1].value;
    if (res[2].status === "fulfilled") DATA.feed = res[2].value;
    render();
  });
})();
