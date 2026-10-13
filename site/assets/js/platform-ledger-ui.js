/* Platform Ledger — page wiring. Engine (assets/js/platform-ledger.js)
 * composes the Deal Pipeline (Tool 25): the ledger reads the SAME
 * localStorage board the pipeline writes (key cge.deal-pipeline.deals.v1)
 * — deals are entered on the Deal Pipeline page, ledgered here by platform.
 * No deals are created on this page; demo deals load only from the
 * labeled demo control and never enter the real ledger. */
(function () {
  "use strict";
  var PL = window.PlatformLedger;
  var P = window.DealPipeline;
  var ledgerEl = document.getElementById("pld-ledger");
  if (!PL || !P || !ledgerEl) return;
  var exportBox = document.getElementById("pld-export");
  var statusEl = document.getElementById("pld-status");
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
    try { window.localStorage.setItem(P.STORAGE_KEY, JSON.stringify(deals)); } catch (e) { /* storage blocked — ledger still renders in memory */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var l = PL.buildLedger(deals, { calculators: DATA.calculators, dealTemplates: DATA.templates,
      changesFeed: DATA.feed, now: new Date() });
    if (!l.ok) { ledgerEl.innerHTML = "<p class=\"muted\">" + esc(l.errors.join("; ")) + "</p>"; return; }
    statusEl.textContent = l.emptyBoard
      ? "The board is empty — enter deals on the Deal Pipeline and each platform's business is ledgered here."
      : l.demoOnly
        ? "Demo board preview — demo deals are counted, none ledgered as real platform business."
        : l.platformCount + " platform(s) · " + PL.fmt(l.pipelineValue) + " across the board" +
          (l.topPlatform ? " · top platform " + l.topPlatform.platform + " at " + l.topPlatform.share + "% of pipeline" : "") +
          (l.demoCount ? " · " + l.demoCount + " DEMO deal(s) excluded" : "");
    if (!l.platforms.length) {
      ledgerEl.innerHTML = "<div class=\"pld-empty\"><p><strong>" +
        (l.emptyBoard ? "No deals, no ledger." : "Demo board — no real ledger.") + "</strong> " +
        (l.emptyBoard
          ? "This page ledgers the platforms on the <a href=\"deal-pipeline.html\">Deal Pipeline</a> board, one platform total per platform. The board is genuinely empty — the ledger is empty because nothing has been entered."
          : "The demo board's deals are counted above and excluded here — demo data never ledgers as real platform business, the same rule the Deal Pipeline applies to demo money. Enter a real deal on the board and its platform is ledgered here from that day.") +
        "</p></div>";
    } else {
      ledgerEl.innerHTML = "<ol class=\"pld-list\">" + l.platforms.map(function (p, i) {
        var stages = Object.keys(p.stageCounts).sort().map(function (s) {
          return esc(s) + " ×" + p.stageCounts[s];
        }).join(", ");
        return "<li class=\"pld-item\">" +
          "<p class=\"pld-head\"><strong>" + (i + 1) + ". " + esc(p.platform) + "</strong> " +
          "<span class=\"pld-fig\">" + PL.fmt(p.total) + " total</span> " +
          "<span class=\"muted\">" + p.share + "% of pipeline · " + p.dealCount + " deal(s) · " +
          esc(p.brands.join(", ")) + "</span></p>" +
          "<p class=\"muted\">Collected " + PL.fmt(p.collected) + " · owed " + PL.fmt(p.owed) +
          " · still open " + PL.fmt(p.open) + " · stages: " + stages + "</p>" +
          "</li>";
      }).join("") + "</ol>";
    }
    exportBox.value = PL.exportLedger(l);
  }

  var demoBtn = document.getElementById("pld-demo");
  if (demoBtn) demoBtn.addEventListener("click", function () {
    deals = P.DEMO_DEALS.map(function (d) { return Object.assign({}, d); });
    save(); render();
  });
  var boardBtn = document.getElementById("pld-board");
  if (boardBtn) boardBtn.addEventListener("click", function () { deals = load(); render(); });
  var copyBtn = document.getElementById("pld-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the ledger"; }, 2000);
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
