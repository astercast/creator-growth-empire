/* Brand Ledger, engine (UMD, importable in node for tests).
 *
 * Tool 30. The money chain prices deals (Tool 23), scripts them
 * (Tool 24), boards them (Tool 25), queues their follow-ups
 * (Tool 26), re-approaches the paid ones (Tool 27), ledgers what
 * landed by month (Tool 28), and registers what is owed (Tool
 * 29), but a brand that appears in three of those places at
 * once is nowhere one relationship with one total. A creator
 * running a business asks: for each brand, how much business is
 * there in total across the whole board, how much of it has
 * been collected, how much is owed, and how much is still open,
 * and which brands does the whole pipeline ride on? This tool
 * is that ledger.
 *
 * It COMPOSES Tool 25's buildBoard and adds no pricing, no
 * wording, and no thresholds of its own. Its only arithmetic is
 * summing and grouping the entered amounts, by brand, and
 * within a brand by stage class: collected (paid), owed
 * (invoiced), and still open (lead / negotiating / terms set /
 * live), plus each brand's share of Tool 25's pipeline value,
 * the same discipline the Sponsor Income Ledger applies to
 * collected money. The pipeline total stays Tool 25's figure,
 * grouped, never re-derived.
 *
 * No timing is claimed. The board records only each deal's
 * current stage and the date it entered that stage, so a brand
 * total is a sum of current-stage amounts, not a relationship
 * history, not a lifetime value, and no stage-entry date is
 * presented as anything else.
 *
 * Demo deals never enter the ledger: demo deals are counted
 * apart. An empty board and a demo-only board are different
 * states and this engine says which one it is. There is
 * deliberately no "none-yet" state: every real deal belongs to
 * a brand, so a non-empty real board always has a ledger, the
 * stage-filtered tools' none-yet states belong to their
 * filters, not to brands.
 *
 * A planning aid, not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BrandLedger = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var ADVICE = "Planning aid, not financial, legal, or tax advice.";
  var OPEN_STAGES = ["lead", "negotiating", "terms", "live"];

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

  /* Join a Tool 25 board's deals into per-brand ledger entries.
   * Demo deals are counted apart, never ledgered. Pure: no
   * mutation. */
  function ledgerFromBoard(board) {
    if (!board || !board.ok) return { ok: false, errors: ["a Deal Pipeline board is required (Tool 25)"] };
    var byBrand = {}, demoCount = 0, demoValue = 0;
    board.deals.forEach(function (e) {
      var deal = e.deal;
      if (!deal) return;
      if (deal.demo) { demoCount++; demoValue += Number(deal.amount) || 0; return; }
      var brand = deal.brand || "(no brand)";
      if (!byBrand[brand]) {
        byBrand[brand] = { brand: brand, total: 0, collected: 0, owed: 0, open: 0,
          dealCount: 0, stageCounts: {}, platforms: [] };
      }
      var b = byBrand[brand];
      var amount = Number(deal.amount) || 0;
      b.total += amount;
      b.dealCount++;
      b.stageCounts[deal.stage] = (b.stageCounts[deal.stage] || 0) + 1;
      if (deal.stage === "paid") b.collected += amount;
      else if (deal.stage === "invoiced") b.owed += amount;
      else if (OPEN_STAGES.indexOf(deal.stage) >= 0) b.open += amount;
      var platform = deal.platform || "(no platform)";
      if (b.platforms.indexOf(platform) < 0) b.platforms.push(platform);
    });
    var pipelineValue = board.totals.pipelineValue;
    var brands = Object.keys(byBrand).map(function (k) {
      var b = byBrand[k];
      b.platforms.sort();
      b.share = share(b.total, pipelineValue);
      return b;
    });
    /* Largest relationship first, then most collected, then brand. */
    brands.sort(function (x, y) {
      if (y.total !== x.total) return y.total - x.total;
      if (y.collected !== x.collected) return y.collected - x.collected;
      return String(x.brand).localeCompare(String(y.brand));
    });
    var realDeals = board.totals.totalDeals;
    return {
      ok: true, brands: brands,
      brandCount: brands.length,
      pipelineValue: pipelineValue,
      collected: board.totals.paidTotal,
      owed: board.totals.invoicedOutstanding,
      openValue: board.totals.openValue - board.totals.invoicedOutstanding,
      topBrand: brands.length ? brands[0] : null,
      demoCount: demoCount, demoValue: demoValue,
      emptyBoard: realDeals === 0 && board.totals.demoCount === 0,
      demoOnly: brands.length === 0 && realDeals === 0 && board.totals.demoCount > 0,
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
    out.push("BRAND LEDGER · " + ledger.brandCount + " brand(s), " +
      fmt(ledger.pipelineValue) + " across the board" + (date ? " · " + date : ""));
    if (ledger.emptyBoard) {
      out.push("No deals on the board, this ledger is empty because the Deal Pipeline is empty, not because no brand relationship exists off the board.");
    } else if (ledger.demoOnly) {
      out.push("Only demo deals are on the board, demo data stays out of the real ledger.");
    }
    if (ledger.demoCount) {
      out.push("Plus " + ledger.demoCount + " DEMO deal(s) worth " + fmt(ledger.demoValue) +
        ", demo data, excluded from this ledger.");
    }
    ledger.brands.forEach(function (b, i) {
      out.push("");
      out.push((i + 1) + ". " + b.brand + " · " + fmt(b.total) + " total · " + b.share +
        "% of pipeline · " + b.dealCount + " deal(s)");
      out.push("   Collected " + fmt(b.collected) + " · owed " + fmt(b.owed) +
        " · still open " + fmt(b.open) + " · platforms: " + b.platforms.join(", "));
      var stages = Object.keys(b.stageCounts).sort().map(function (s) {
        return s + " ×" + b.stageCounts[s];
      }).join(", ");
      out.push("   Stages: " + stages);
    });
    out.push("");
    out.push(ledger.advice + " A brand total is a sum of the entered amounts of that brand's deals at their current stages on the Deal Pipeline (Tool 25), collected is the paid stage, owed is the invoiced stage, still open is lead / negotiating / terms set / live. It is not a relationship history or a lifetime value: the board carries no record of stages a deal has already left. The pipeline total is Tool 25's pipeline value, grouped by brand, never re-derived from any rate card.");
    return out.join("\n");
  }

  return {
    buildLedger: buildLedger, ledgerFromBoard: ledgerFromBoard,
    exportLedger: exportLedger, share: share, fmt: fmt,
    OPEN_STAGES: OPEN_STAGES, ADVICE: ADVICE
  };
});
