/* Receivables Register, page wiring. Engine (assets/js/receivables-register.js)
 * composes the Deal Pipeline (Tool 25): the register reads the SAME
 * localStorage board the pipeline writes (key cge.deal-pipeline.deals.v1)
 *, deals are entered on the Deal Pipeline page, registered here.
 * No deals are created on this page; demo deals load only from the
 * labeled demo control and never enter the real register. */
(function () {
  "use strict";
  var RR = window.ReceivablesRegister;
  var P = window.DealPipeline;
  var regEl = document.getElementById("rr-register");
  if (!RR || !P || !regEl) return;
  var exportBox = document.getElementById("rr-export");
  var statusEl = document.getElementById("rr-status");
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
    try { window.localStorage.setItem(P.STORAGE_KEY, JSON.stringify(deals)); } catch (e) { /* storage blocked, register still renders in memory */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var r = RR.buildRegister(deals, { calculators: DATA.calculators, dealTemplates: DATA.templates,
      changesFeed: DATA.feed, now: new Date() });
    if (!r.ok) { regEl.innerHTML = "<p class=\"muted\">" + esc(r.errors.join("; ")) + "</p>"; return; }
    statusEl.textContent = r.emptyBoard
      ? "The board is empty, enter deals on the Deal Pipeline and the brands that owe you are registered here."
      : r.demoOnly
        ? "Demo board preview, demo deals are counted, none registered as real receivables."
        : r.nothingOwed
          ? "Nothing is owed, no deal on the board sits in the invoiced stage."
          : r.invoicedCount + " invoiced deal(s) · " + RR.fmt(r.owed) + " owed" +
            (r.oldest ? " · longest outstanding: " + r.oldest.brand + " at " +
              (r.oldest.daysOutstanding == null ? "?" : r.oldest.daysOutstanding) + "d" : "") +
            (r.demoInvoiced ? " · " + r.demoInvoiced + " DEMO invoiced deal(s) excluded" : "");
    if (!r.items.length) {
      regEl.innerHTML = "<div class=\"rr-empty\"><p><strong>" +
        (r.emptyBoard ? "No deals, no register." : r.demoOnly ? "Demo board, no real register." : "Nothing owed.") + "</strong> " +
        (r.emptyBoard
          ? "This page registers the invoiced deals from the <a href=\"deal-pipeline.html\">Deal Pipeline</a> board. The board is genuinely empty, the register is empty because nothing has been entered."
          : r.demoOnly
            ? "The demo board's invoiced deal is counted above and excluded here, demo data never registers as real money owed, the same rule the Deal Pipeline applies to demo money. Enter a real deal on the board, deliver it, invoice it, and it is registered here."
            : "Every deal on the board is short of the invoiced stage, or already past it. When a delivered deal is invoiced, move it to Invoiced on the Deal Pipeline, it is registered here from that day, however fresh the invoice is.") +
        "</p></div>";
    } else {
      regEl.innerHTML = "<ol class=\"rr-list\">" + r.items.map(function (it, i) {
        return "<li class=\"rr-item\">" +
          "<p class=\"rr-head\"><strong>" + (i + 1) + ". " + esc(it.brand) + "</strong> " +
          "<span class=\"rr-fig\">" + RR.fmt(it.amount) + " owed</span> " +
          "<span class=\"muted\">" + esc(it.platform) + " · invoiced " + esc(it.invoicedAt || "(no date)") +
          " · " + (it.daysOutstanding == null ? "?" : it.daysOutstanding) + "d outstanding</span></p>" +
          (it.script.ok
            ? "<details class=\"rr-script\"><summary>Late-payment script, " + esc(it.script.label) + "</summary><pre>" +
              esc(it.script.exportText) + "</pre></details>"
            : "<p class=\"muted\">Late-payment script: none, " + esc(it.script.reason) + "</p>") +
          "</li>";
      }).join("") + "</ol>";
    }
    exportBox.value = RR.exportRegister(r);
  }

  var demoBtn = document.getElementById("rr-demo");
  if (demoBtn) demoBtn.addEventListener("click", function () {
    deals = P.DEMO_DEALS.map(function (d) { return Object.assign({}, d); });
    save(); render();
  });
  var boardBtn = document.getElementById("rr-board");
  if (boardBtn) boardBtn.addEventListener("click", function () { deals = load(); render(); });
  var copyBtn = document.getElementById("rr-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the register"; }, 2000);
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
