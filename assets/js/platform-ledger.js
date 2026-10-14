/* Platform Ledger, engine (UMD, importable in node for tests).
 *
 * Tool 31. The money chain prices deals (Tool 23), scripts them
 * (Tool 24), boards them (Tool 25), queues their follow-ups
 * (Tool 26), re-approaches the paid ones (Tool 27), ledgers what
 * landed by month (Tool 28), registers what is owed (Tool 29),
 * and totals each brand as one relationship (Tool 30), but no
 * tool totals the board by the platform the deals were entered
 * under, across every stage at once. Tool 28 splits only the
 * collected money by platform; Tool 30 lists a brand's platforms
 * without totalling them. A creator running a business asks:
 * for each platform, how much business is there in total across
 * the whole board, how much of it has been collected, how much
 * is owed, and how much is still open, and which platform does
 * the whole pipeline ride on? This tool is that ledger.
 *
 * It COMPOSES Tool 25's buildBoard and adds no pricing, no
 * wording, and no thresholds of its own. Its only arithmetic is
 * summing and grouping the entered amounts, by platform, and
 * within a platform by stage class: collected (paid), owed
 * (invoiced), and still open (lead / negotiating / terms set /
 * live), plus each platform's share of Tool 25's pipeline
 * value, the same discipline the Brand Ledger applies to brands.
 * The pipeline total stays Tool 25's figure, grouped, never
 * re-derived.
 *
 * No timing is claimed. The board records only each deal's
 * current stage and the date it entered that stage, so a
 * platform total is a sum of current-stage amounts, not a
 * platform history, and no stage-entry date is presented as
 * anything else.
 *
 * Demo deals never enter the ledger: demo deals are counted
 * apart. An empty board and a demo-only board are different
 * states and this engine says which one it is. There is
 * deliberately no "none-yet" state: every real deal belongs to
 * a platform, so a non-empty real board always has a ledger,
 * the stage-filtered tools' none-yet states belong to their
 * filters, not to platforms.
 *
 * A planning aid, not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PlatformLedger = api;
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

  /* Join a Tool 25 board's deals into per-platform ledger entries.
   * Demo deals are counted apart, never ledgered. Pure: no
   * mutation. */
  function ledgerFromBoard(board) {
    if (!board || !board.ok) return { ok: false, errors: ["a Deal Pipeline board is required (Tool 25)"] };
    var byPlatform = {}, demoCount = 0, demoValue = 0;
    board.deals.forEach(function (e) {
      var deal = e.deal;
      if (!deal) return;
      if (deal.demo) { demoCount++; demoValue += Number(deal.amount) || 0; return; }
      var platform = deal.platform || "(no platform)";
      if (!byPlatform[platform]) {
        byPlatform[platform] = { platform: platform, total: 0, collected: 0, owed: 0, open: 0,
          dealCount: 0, stageCounts: {}, brands: [] };
      }
      var p = byPlatform[platform];
      var amount = Number(deal.amount) || 0;
      p.total += amount;
      p.dealCount++;
      p.stageCounts[deal.stage] = (p.stageCounts[deal.stage] || 0) + 1;
      if (deal.stage === "paid") p.collected += amount;
      else if (deal.stage === "invoiced") p.owed += amount;
      else if (OPEN_STAGES.indexOf(deal.stage) >= 0) p.open += amount;
      var brand = deal.brand || "(no brand)";
      if (p.brands.indexOf(brand) < 0) p.brands.push(brand);
    });
    var pipelineValue = board.totals.pipelineValue;
    var platforms = Object.keys(byPlatform).map(function (k) {
      var p = byPlatform[k];
      p.brands.sort();
      p.share = share(p.total, pipelineValue);
      return p;
    });
    /* Largest platform first, then most collected, then platform. */
    platforms.sort(function (x, y) {
      if (y.total !== x.total) return y.total - x.total;
      if (y.collected !== x.collected) return y.collected - x.collected;
      return String(x.platform).localeCompare(String(y.platform));
    });
    var realDeals = board.totals.totalDeals;
    return {
      ok: true, platforms: platforms,
      platformCount: platforms.length,
      pipelineValue: pipelineValue,
      collected: board.totals.paidTotal,
      owed: board.totals.invoicedOutstanding,
      openValue: board.totals.openValue - board.totals.invoicedOutstanding,
      topPlatform: platforms.length ? platforms[0] : null,
      demoCount: demoCount, demoValue: demoValue,
      emptyBoard: realDeals === 0 && board.totals.demoCount === 0,
      demoOnly: platforms.length === 0 && realDeals === 0 && board.totals.demoCount > 0,
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
    out.push("PLATFORM LEDGER · " + ledger.platformCount + " platform(s), " +
      fmt(ledger.pipelineValue) + " across the board" + (date ? " · " + date : ""));
    if (ledger.emptyBoard) {
      out.push("No deals on the board, this ledger is empty because the Deal Pipeline is empty, not because no platform business exists off the board.");
    } else if (ledger.demoOnly) {
      out.push("Only demo deals are on the board, demo data stays out of the real ledger.");
    }
    if (ledger.demoCount) {
      out.push("Plus " + ledger.demoCount + " DEMO deal(s) worth " + fmt(ledger.demoValue) +
        ", demo data, excluded from this ledger.");
    }
    ledger.platforms.forEach(function (p, i) {
      out.push("");
      out.push((i + 1) + ". " + p.platform + " · " + fmt(p.total) + " total · " + p.share +
        "% of pipeline · " + p.dealCount + " deal(s)");
      out.push("   Collected " + fmt(p.collected) + " · owed " + fmt(p.owed) +
        " · still open " + fmt(p.open) + " · brands: " + p.brands.join(", "));
      var stages = Object.keys(p.stageCounts).sort().map(function (s) {
        return s + " ×" + p.stageCounts[s];
      }).join(", ");
      out.push("   Stages: " + stages);
    });
    out.push("");
    out.push(ledger.advice + " A platform total is a sum of the entered amounts of that platform's deals at their current stages on the Deal Pipeline (Tool 25), collected is the paid stage, owed is the invoiced stage, still open is lead / negotiating / terms set / live. It is not a platform history: the board carries no record of stages a deal has already left. The pipeline total is Tool 25's pipeline value, grouped by platform, never re-derived from any rate card.");
    return out.join("\n");
  }

  return {
    buildLedger: buildLedger, ledgerFromBoard: ledgerFromBoard,
    exportLedger: exportLedger, share: share, fmt: fmt,
    OPEN_STAGES: OPEN_STAGES, ADVICE: ADVICE
  };
});
