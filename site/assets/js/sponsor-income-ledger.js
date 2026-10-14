/* Sponsor Income Ledger, engine (UMD, importable in node for tests).
 *
 * Tool 28. The money chain prices deals (Tool 23), scripts them
 * (Tool 24), boards them (Tool 25), queues their follow-ups
 * (Tool 26), and books the paid ones for re-approach (Tool 27),
 * but the collected money itself only ever appears as one lump
 * paid total on the board. A creator running a business needs it
 * broken open: what landed in which month, how much of the total
 * rides on one brand, and which platform it came through. This
 * tool is that ledger.
 *
 * It COMPOSES Tool 25's buildBoard and adds no pricing, no rate
 * card, and no thresholds of its own. Its only arithmetic is
 * summing and grouping the entered amounts, by the month each
 * deal entered the paid stage, by brand, and by platform, the
 * same discipline pipelineTotals applies to demo money. The
 * month a deal is ledgered under is the month it entered the
 * paid stage, because that is the only payment timing the board
 * carries; the ledger labels it exactly that and claims no
 * clearing, payout, or tax-period date beyond it.
 *
 * Demo deals never enter the ledger: demo paid deals are counted
 * apart. An empty board, a board with no paid deals yet, and a
 * demo-only board are different states and this engine says
 * which one it is.
 *
 * A planning aid, not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SponsorIncomeLedger = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var ADVICE = "Planning aid, not financial, legal, or tax advice.";
  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function dep(name, file) {
    if (root && root[name]) return root[name];
    if (typeof require === "function") {
      try { return require(file); } catch (e) { return null; }
    }
    return null;
  }
  function fmt(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function share(part, whole) {
    if (!whole) return 0;
    return Math.round((Number(part) || 0) / whole * 1000) / 10;
  }
  /* The ledger month of a paid deal: the YYYY-MM its stage entry
   * date falls in. A paid deal whose date cannot be read is not
   * dropped and not guessed into a month, it is ledgered under
   * "undated", flagged, and still counted in the collected total. */
  function monthKey(deal) {
    var s = String((deal && deal.stageEnteredAt) || "").slice(0, 7);
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : "undated";
  }
  function monthLabel(key) {
    if (key === "undated") return "Undated, stage entry date unreadable";
    var y = key.slice(0, 4), m = MONTHS[Number(key.slice(5, 7)) - 1];
    return m + " " + y;
  }

  /* Join a Tool 25 board's paid deals into the ledger. Demo paid
   * deals are counted apart, never ledgered. Pure: no mutation. */
  function ledgerFromBoard(board) {
    if (!board || !board.ok) return { ok: false, errors: ["a Deal Pipeline board is required (Tool 25)"] };
    var paid = [], demoPaid = 0, demoPaidValue = 0;
    board.deals.forEach(function (e) {
      var deal = e.deal;
      if (!deal || deal.stage !== "paid") return;
      if (deal.demo) { demoPaid++; demoPaidValue += Number(deal.amount) || 0; return; }
      paid.push({
        dealId: deal.id || null, brand: deal.brand || "(no brand)",
        amount: Number(deal.amount) || 0,
        platform: deal.platform || "(no platform)",
        month: monthKey(deal), enteredPaidAt: String(deal.stageEnteredAt || "").slice(0, 10)
      });
    });
    var collected = board.totals.paidTotal;

    /* By month, chronological, undated last; running cumulative. */
    var byKey = {};
    paid.forEach(function (p) { (byKey[p.month] = byKey[p.month] || []).push(p); });
    var keys = Object.keys(byKey).sort(function (a, b) {
      if (a === "undated") return 1; if (b === "undated") return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    var running = 0;
    var months = keys.map(function (k) {
      var deals = byKey[k].slice().sort(function (x, y) {
        if (y.amount !== x.amount) return y.amount - x.amount;
        return String(x.brand).localeCompare(String(y.brand));
      });
      var total = deals.reduce(function (s, d) { return s + d.amount; }, 0);
      running += total;
      return { month: k, label: monthLabel(k), deals: deals, count: deals.length,
               total: total, cumulative: running };
    });

    /* By brand and by platform: totals with each share of the
     * collected total, plain shares of entered amounts. */
    function groupBy(field) {
      var g = {};
      paid.forEach(function (p) {
        var k = p[field];
        if (!g[k]) g[k] = { key: k, total: 0, count: 0 };
        g[k].total += p.amount; g[k].count++;
      });
      return Object.keys(g).map(function (k) {
        return { key: k, total: g[k].total, count: g[k].count, share: share(g[k].total, collected) };
      }).sort(function (x, y) {
        if (y.total !== x.total) return y.total - x.total;
        return String(x.key).localeCompare(String(y.key));
      });
    }
    var byBrand = groupBy("brand");
    var byPlatform = groupBy("platform");
    var realDeals = board.totals.totalDeals;
    return {
      ok: true, months: months, byBrand: byBrand, byPlatform: byPlatform,
      topBrand: byBrand.length ? byBrand[0] : null,
      paidCount: paid.length, collected: collected,
      demoPaid: demoPaid, demoPaidValue: demoPaidValue,
      emptyBoard: realDeals === 0 && board.totals.demoCount === 0,
      demoOnly: paid.length === 0 && realDeals === 0 && board.totals.demoCount > 0,
      noPaidYet: paid.length === 0 && realDeals > 0,
      totals: board.totals,
      generatedFor: board.generatedFor,
      advice: ADVICE
    };
  }

  /* Build the ledger straight from entered deals, the board is
   * Tool 25's buildBoard with the caller's own data and clock. */
  function buildLedger(deals, opts) {
    opts = opts || {};
    var DP = opts.dp || dep("DealPipeline", "./deal-pipeline.js");
    if (!DP) return { ok: false, errors: ["Deal Pipeline engine is required (assets/js/deal-pipeline.js)"] };
    var board = DP.buildBoard(deals, opts);
    return ledgerFromBoard(board);
  }

  function exportLedger(ledger) {
    if (!ledger || !ledger.ok) return "";
    var out = [];
    var date = String(ledger.generatedFor || "").slice(0, 10);
    out.push("SPONSOR INCOME LEDGER · " + ledger.paidCount + " paid deal(s), " +
      fmt(ledger.collected) + " collected" + (date ? " · " + date : ""));
    if (ledger.emptyBoard) {
      out.push("No deals on the board, this ledger is empty because the Deal Pipeline is empty, not because no brand has paid yet.");
    } else if (ledger.demoOnly) {
      out.push("Only demo deals are on the board, demo data stays out of the real ledger.");
    } else if (ledger.noPaidYet) {
      out.push("No brand has paid yet. Deals reach this ledger when they reach the paid stage on the Deal Pipeline.");
    }
    if (ledger.demoPaid) {
      out.push("Plus " + ledger.demoPaid + " DEMO paid deal(s) worth " + fmt(ledger.demoPaidValue) +
        ", demo data, excluded from this ledger.");
    }
    ledger.months.forEach(function (m) {
      out.push("");
      out.push(m.label.toUpperCase() + " · " + fmt(m.total) + " (" + m.count +
        " paid deal(s); cumulative " + fmt(m.cumulative) + ")");
      m.deals.forEach(function (d) {
        out.push("- " + d.brand + " · " + fmt(d.amount) + " · " + d.platform);
      });
    });
    if (ledger.byBrand.length) {
      out.push("");
      out.push("BY BRAND");
      ledger.byBrand.forEach(function (b) {
        out.push("- " + b.key + " · " + fmt(b.total) + " · " + b.count + " deal(s) · " + b.share + "% of collected");
      });
      out.push("");
      out.push("BY PLATFORM");
      ledger.byPlatform.forEach(function (p) {
        out.push("- " + p.key + " · " + fmt(p.total) + " · " + p.count + " deal(s) · " + p.share + "% of collected");
      });
    }
    out.push("");
    out.push(ledger.advice + " Months are the month each deal entered the paid stage on the Deal Pipeline (Tool 25), the only payment timing the board carries; this ledger claims no clearing or payout date beyond it. Amounts are the figures entered on the board; collected is Tool 25's paid total.");
    return out.join("\n");
  }

  return {
    buildLedger: buildLedger, ledgerFromBoard: ledgerFromBoard,
    exportLedger: exportLedger, monthKey: monthKey, monthLabel: monthLabel,
    share: share, fmt: fmt, ADVICE: ADVICE
  };
});
