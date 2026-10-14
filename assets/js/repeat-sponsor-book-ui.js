/* Repeat Sponsor Book, page wiring. Engine (assets/js/repeat-sponsor-book.js)
 * composes the Deal Pipeline (Tool 25): the book reads the SAME
 * localStorage board the pipeline writes (key cge.deal-pipeline.deals.v1)
 *, deals are entered on the Deal Pipeline page, re-approached here.
 * No deals are created on this page; demo deals load only from the
 * labeled demo control and never enter the real book. */
(function () {
  "use strict";
  var RSB = window.RepeatSponsorBook;
  var P = window.DealPipeline;
  var bookEl = document.getElementById("rsb-book");
  if (!RSB || !P || !bookEl) return;
  var exportBox = document.getElementById("rsb-export");
  var statusEl = document.getElementById("rsb-status");
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
    try { window.localStorage.setItem(P.STORAGE_KEY, JSON.stringify(deals)); } catch (e) { /* storage blocked, book still renders in memory */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>\"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtRange(r) { return RSB.fmt(r[0]) + "–" + RSB.fmt(r[1]); }

  function render() {
    var b = RSB.buildBook(deals, { calculators: DATA.calculators, dealTemplates: DATA.templates,
      changesFeed: DATA.feed, now: new Date() });
    if (!b.ok) { bookEl.innerHTML = "<p class=\"muted\">" + esc(b.errors.join("; ")) + "</p>"; return; }
    statusEl.textContent = b.emptyBoard
      ? "The board is empty, enter deals on the Deal Pipeline and the brands that pay land here."
      : b.demoOnly
        ? "Demo board preview, demo deals are counted, none booked as real sponsors."
        : b.noPaidYet
          ? "No brand has paid yet, this book fills when a deal reaches the paid stage."
          : b.paidCount + " paid brand(s) · " + RSB.fmt(b.collected) + " collected" +
            (b.demoPaid ? " · " + b.demoPaid + " DEMO paid deal(s) excluded" : "");
    if (!b.items.length) {
      bookEl.innerHTML = "<div class=\"rsb-empty\"><p><strong>" +
        (b.emptyBoard ? "No deals, no book." : b.demoOnly ? "Demo board, no real book." : "No paid deals yet.") + "</strong> " +
        (b.emptyBoard
          ? "This page holds the paid deals from the <a href=\"deal-pipeline.html\">Deal Pipeline</a> board. The board is genuinely empty, the book is empty because nothing has been entered."
          : b.demoOnly
            ? "The demo board carries no paid deals, and demo data would stay out of the real book even if it did, demo paid deals are counted above and excluded here, the same rule the Deal Pipeline applies to demo money. Enter a real deal on the board, move it to paid when the money lands, and the brand books here."
            : "Every deal on the board is still short of the paid stage. When a brand pays, move the deal to Paid on the Deal Pipeline, it appears here with its current rate card, longest-paid first.") +
        "</p></div>";
    } else {
      bookEl.innerHTML = "<ol class=\"rsb-list\">" + b.items.map(function (it, i) {
        return "<li class=\"rsb-item\">" +
          "<p class=\"rsb-head\"><strong>" + (i + 1) + ". " + esc(it.brand) + "</strong> " +
          "<span class=\"rsb-fig\">" + RSB.fmt(it.amount) + " paid</span> " +
          "<span class=\"muted\">" + (it.paidAgeDays == null ? "?" : it.paidAgeDays) + "d since it entered the paid stage</span></p>" +
          (it.rateCard.ok
            ? "<p class=\"rsb-card\">Current card: total <strong>" + esc(fmtRange(it.rateCard.total.range)) + "</strong>, the amount paid sits " + esc(it.relation) + " that range.<br><span class=\"muted\">" + esc(it.rateCard.provenance) + "</span></p>"
            : "<p class=\"muted\">Current card: none, " + esc(it.rateCard.reason) + "</p>") +
          "<p class=\"muted\">Pitch: " + esc(it.pitch.reason) + "</p>" +
          "</li>";
      }).join("") + "</ol>";
    }
    exportBox.value = RSB.exportBook(b);
  }

  var demoBtn = document.getElementById("rsb-demo");
  if (demoBtn) demoBtn.addEventListener("click", function () {
    deals = P.DEMO_DEALS.map(function (d) { return Object.assign({}, d); });
    save(); render();
  });
  var boardBtn = document.getElementById("rsb-board");
  if (boardBtn) boardBtn.addEventListener("click", function () { deals = load(); render(); });
  var copyBtn = document.getElementById("rsb-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied \u2713";
    setTimeout(function () { copyBtn.textContent = "Copy the book"; }, 2000);
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
