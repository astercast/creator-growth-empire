/* Sponsor Income Ledger — page wiring. Engine (assets/js/sponsor-income-ledger.js)
 * composes the Deal Pipeline (Tool 25): the ledger reads the SAME
 * localStorage board the pipeline writes (key cge.deal-pipeline.deals.v1)
 * — deals are entered on the Deal Pipeline page, ledgered here.
 * No deals are created on this page; demo deals load only from the
 * labeled demo control and never enter the real ledger. */
(function () {
  "use strict";
  var SIL = window.SponsorIncomeLedger;
  var P = window.DealPipeline;
  var ledgerEl = document.getElementById("sil-ledger");
  if (!SIL || !P || !ledgerEl) return;
  var exportBox = document.getElementById("sil-export");
  var statusEl = document.getElementById("sil-status");
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
    var l = SIL.buildLedger(deals, { now: new Date() });
    if (!l.ok) { ledgerEl.innerHTML = "<p class=\"muted\">" + esc(l.errors.join("; ")) + "</p>"; return; }
    statusEl.textContent = l.emptyBoard
      ? "The board is empty — enter deals on the Deal Pipeline and the brands that pay are ledgered here."
      : l.demoOnly
        ? "Demo board preview — demo deals are counted, none ledgered as real income."
        : l.noPaidYet
          ? "No brand has paid yet — this ledger fills when a deal reaches the paid stage."
          : l.paidCount + " paid deal(s) · " + SIL.fmt(l.collected) + " collected across " +
            l.months.length + " month(s)" +
            (l.topBrand ? " · top brand " + l.topBrand.key + " at " + l.topBrand.share + "% of collected" : "") +
            (l.demoPaid ? " · " + l.demoPaid + " DEMO paid deal(s) excluded" : "");
    if (!l.months.length) {
      ledgerEl.innerHTML = "<div class=\"sil-empty\"><p><strong>" +
        (l.emptyBoard ? "No deals, no ledger." : l.demoOnly ? "Demo board — no real ledger." : "No paid deals yet.") + "</strong> " +
        (l.emptyBoard
          ? "This page ledgers the paid deals from the <a href=\"deal-pipeline.html\">Deal Pipeline</a> board. The board is genuinely empty — the ledger is empty because nothing has been entered."
          : l.demoOnly
            ? "The demo board carries no paid deals, and demo data would stay out of the real ledger even if it did — demo paid deals are counted above and excluded here, the same rule the Deal Pipeline applies to demo money. Enter a real deal on the board, move it to paid when the money lands, and it is ledgered here."
            : "Every deal on the board is still short of the paid stage. When a brand pays, move the deal to Paid on the Deal Pipeline — it is ledgered here under the month it entered the paid stage.") +
        "</p></div>";
    } else {
      var html = l.months.map(function (m) {
        return "<section class=\"sil-month\"><h3>" + esc(m.label) + " — " + SIL.fmt(m.total) +
          " <span class=\"muted\">(" + m.count + " paid deal(s); cumulative " + SIL.fmt(m.cumulative) + ")</span></h3>" +
          "<ul class=\"sil-deals\">" + m.deals.map(function (d) {
            return "<li><strong>" + esc(d.brand) + "</strong> <span class=\"sil-fig\">" + SIL.fmt(d.amount) +
              "</span> <span class=\"muted\">" + esc(d.platform) + "</span></li>";
          }).join("") + "</ul></section>";
      }).join("");
      html += "<h3>By brand</h3><ul class=\"sil-groups\">" + l.byBrand.map(function (b) {
        return "<li><strong>" + esc(b.key) + "</strong> <span class=\"sil-fig\">" + SIL.fmt(b.total) + "</span> " +
          "<span class=\"muted\">" + b.count + " deal(s) · " + b.share + "% of collected</span></li>";
      }).join("") + "</ul>";
      html += "<h3>By platform</h3><ul class=\"sil-groups\">" + l.byPlatform.map(function (p) {
        return "<li><strong>" + esc(p.key) + "</strong> <span class=\"sil-fig\">" + SIL.fmt(p.total) + "</span> " +
          "<span class=\"muted\">" + p.count + " deal(s) · " + p.share + "% of collected</span></li>";
      }).join("") + "</ul>";
      ledgerEl.innerHTML = html;
    }
    exportBox.value = SIL.exportLedger(l);
  }

  var demoBtn = document.getElementById("sil-demo");
  if (demoBtn) demoBtn.addEventListener("click", function () {
    deals = P.DEMO_DEALS.map(function (d) { return Object.assign({}, d); });
    save(); render();
  });
  var boardBtn = document.getElementById("sil-board");
  if (boardBtn) boardBtn.addEventListener("click", function () { deals = load(); render(); });
  var copyBtn = document.getElementById("sil-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the ledger"; }, 2000);
  });

  render();
})();
