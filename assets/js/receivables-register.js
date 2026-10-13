/* Receivables Register — engine (UMD, importable in node for tests).
 *
 * Tool 29. The money chain prices deals (Tool 23), scripts them
 * (Tool 24), boards them (Tool 25), queues their follow-ups
 * (Tool 26), books the paid ones for re-approach (Tool 27), and
 * ledgers what landed (Tool 28) — but the money OWED exists only
 * as one lump total on the board, with no list behind it. The
 * Follow-Through Queue surfaces an invoiced deal only once it
 * crosses the board's follow-up mark, so a fresh invoice is
 * invisible everywhere as an individual record. This tool is
 * that register.
 *
 * It COMPOSES Tool 25's buildBoard and adds nothing of its own:
 * every invoiced deal on the board is registered — fresh ones
 * included — because a register's job is completeness, not
 * nudging; the queue already owns the follow-up marks and this
 * engine deliberately does not gate on them. Its only arithmetic
 * is summing the entered invoiced amounts (the register total
 * stays Tool 25's invoiced outstanding figure) and the ordering:
 * longest outstanding first. Each entry carries the deal's
 * late-payment script exactly as the board composed it through
 * Tool 24, or the honest reason none is attached. An invoiced
 * deal's stage entry date is the only invoice timing the board
 * carries, and the register labels it exactly that.
 *
 * Demo deals never enter the register: demo invoiced deals are
 * counted apart. An empty board, a board with nothing invoiced
 * yet, and a demo-only board are different states and this
 * engine says which one it is.
 *
 * A planning aid — not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ReceivablesRegister = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var ADVICE = "Planning aid, not financial, legal, or tax advice.";

  function dep(name, file) {
    if (root && root[name]) return root[name];
    if (typeof require === "function") {
      try { return require(file); } catch (e) { return null; }
    }
    return null;
  }
  function fmt(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }

  /* Join a Tool 25 board's invoiced deals into the register.
   * Demo invoiced deals are counted apart, never registered.
   * Pure: no mutation. */
  function registerFromBoard(board) {
    if (!board || !board.ok) return { ok: false, errors: ["a Deal Pipeline board is required (Tool 25)"] };
    var items = [], demoInvoiced = 0, demoInvoicedValue = 0;
    board.deals.forEach(function (e) {
      var deal = e.deal;
      if (!deal || deal.stage !== "invoiced") return;
      if (deal.demo) { demoInvoiced++; demoInvoicedValue += Number(deal.amount) || 0; return; }
      var sc = e.script && e.script.ok ? e.script : null;
      items.push({
        dealId: deal.id || null, brand: deal.brand || "(no brand)",
        amount: Number(deal.amount) || 0,
        platform: deal.platform || "(no platform)",
        invoicedAt: String(deal.stageEnteredAt || "").slice(0, 10),
        daysOutstanding: e.ageDays,
        script: sc ? { ok: true, label: sc.label, exportText: sc.exportText }
          : { ok: false, reason: e.script ? (e.script.reason || (e.script.errors || []).join("; ") || "no script is attached to this deal")
                                         : "no late-payment script is attached — the board composes one when its data files load" }
      });
    });
    /* Longest outstanding first, then largest amount, then brand.
     * An unreadable age sorts last, never first. */
    items.sort(function (x, y) {
      var ax = x.daysOutstanding == null ? -1 : x.daysOutstanding;
      var ay = y.daysOutstanding == null ? -1 : y.daysOutstanding;
      if (ay !== ax) return ay - ax;
      if (y.amount !== x.amount) return y.amount - x.amount;
      return String(x.brand).localeCompare(String(y.brand));
    });
    var realDeals = board.totals.totalDeals;
    return {
      ok: true, items: items,
      invoicedCount: items.length,
      owed: board.totals.invoicedOutstanding,
      oldest: items.length ? items[0] : null,
      demoInvoiced: demoInvoiced, demoInvoicedValue: demoInvoicedValue,
      emptyBoard: realDeals === 0 && board.totals.demoCount === 0,
      demoOnly: items.length === 0 && realDeals === 0 && board.totals.demoCount > 0,
      nothingOwed: items.length === 0 && realDeals > 0,
      totals: board.totals,
      generatedFor: board.generatedFor,
      advice: ADVICE
    };
  }

  /* Build the register straight from entered deals — the board is
   * Tool 25's buildBoard with the caller's own data and clock. */
  function buildRegister(deals, opts) {
    opts = opts || {};
    var DP = opts.dp || dep("DealPipeline", "./deal-pipeline.js");
    if (!DP) return { ok: false, errors: ["Deal Pipeline engine is required (assets/js/deal-pipeline.js)"] };
    var board = DP.buildBoard(deals, opts);
    return registerFromBoard(board);
  }

  function exportRegister(reg) {
    if (!reg || !reg.ok) return "";
    var out = [];
    var date = String(reg.generatedFor || "").slice(0, 10);
    out.push("RECEIVABLES REGISTER — " + reg.invoicedCount + " invoiced deal(s), " +
      fmt(reg.owed) + " owed" + (date ? " · " + date : ""));
    if (reg.emptyBoard) {
      out.push("No deals on the board — this register is empty because the Deal Pipeline is empty, not because no brand owes you.");
    } else if (reg.demoOnly) {
      out.push("Only demo deals are on the board — demo data stays out of the real register.");
    } else if (reg.nothingOwed) {
      out.push("Nothing is owed. Deals reach this register when they reach the invoiced stage on the Deal Pipeline.");
    }
    if (reg.demoInvoiced) {
      out.push("Plus " + reg.demoInvoiced + " DEMO invoiced deal(s) worth " + fmt(reg.demoInvoicedValue) +
        " — demo data, excluded from this register.");
    }
    reg.items.forEach(function (it, i) {
      out.push("");
      out.push((i + 1) + ". " + it.brand + " · " + fmt(it.amount) + " owed · " + it.platform +
        " · invoiced " + (it.invoicedAt || "(no date)") +
        " · " + (it.daysOutstanding == null ? "?" : it.daysOutstanding) + "d outstanding");
      out.push(it.script.ok
        ? "   Late-payment script (Tool 24, via the board): " + it.script.label
        : "   Late-payment script: none — " + it.script.reason);
    });
    out.push("");
    out.push(reg.advice + " Every invoiced deal is registered, fresh ones included — this is a register of what is owed, not a follow-up queue; the Follow-Through Queue (Tool 26) owns the day's sends. Invoiced dates are the dates deals entered the invoiced stage on the Deal Pipeline (Tool 25) — the only invoice timing the board carries. Amounts are the figures entered on the board; the total owed is Tool 25's invoiced outstanding figure.");
    return out.join("\n");
  }

  return {
    buildRegister: buildRegister, registerFromBoard: registerFromBoard,
    exportRegister: exportRegister, fmt: fmt, ADVICE: ADVICE
  };
});
