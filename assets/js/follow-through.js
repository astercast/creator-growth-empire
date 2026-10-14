/* Follow-Through Queue, engine (UMD, importable in node for tests).
 *
 * Tool 26. The Deal Pipeline (Tool 25) knows which deals have sat in
 * a stage too long, but its nudges live one per card across six
 * columns. This tool assembles them into the creator's morning send
 * list: one prioritized queue, each item carrying its nudge action
 * and the exact words to send, plus one copyable brief for the
 * whole queue.
 *
 * It COMPOSES and adds nothing of its own: the board, the nudges,
 * the thresholds, and the totals are the Deal Pipeline's
 * (buildBoard); the scripts are the Negotiation Script Builder's
 * (Tool 24), attached by Tool 25's scriptFor; the amounts are the
 * figures the creator entered on the board. The only logic here is
 * the ordering, urgent first (an invoiced deal at 30+ days, Tool
 * 25's own urgent flag), then most overdue against Tool 25's own
 * stage thresholds, then longest in stage, and the brief layout.
 *
 * Demo deals never enter the queue: their nudges are counted apart,
 * the same discipline pipelineTotals applies to demo money. An
 * empty board and a board with nothing due are different states
 * and this engine says which one it is.
 *
 * A planning aid, not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FollowThrough = api;
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

  /* Join a Tool 25 board's nudges to their enriched deals and order
   * them for sending. Demo-deal nudges are counted apart, never
   * queued. Pure: the board is not mutated. */
  function queueFromBoard(board) {
    if (!board || !board.ok) return { ok: false, errors: ["a Deal Pipeline board is required (Tool 25)"] };
    var byId = {};
    board.deals.forEach(function (e) { if (e.deal && e.deal.id) byId[e.deal.id] = e; });
    var items = [], demoDue = 0;
    board.nudges.forEach(function (n) {
      var e = byId[n.dealId];
      var deal = e ? e.deal : null;
      if (deal && deal.demo) { demoDue++; return; }
      var script = e ? e.script : null;
      items.push({
        dealId: n.dealId, brand: n.brand, stage: n.stage, stageLabel: n.stageLabel,
        ageDays: n.ageDays, thresholdDays: n.thresholdDays, overdueBy: n.overdueBy,
        urgent: !!n.urgent, action: n.action,
        amount: deal ? Number(deal.amount) || 0 : 0,
        scriptScenario: n.scriptScenario,
        script: script && script.ok
          ? { ok: true, scenario: script.scenario, label: script.label, exportText: script.exportText }
          : { ok: false, scenario: script ? script.scenario || n.scriptScenario : n.scriptScenario,
              reason: script ? (script.reason || "no script could be built for this deal") : "no script for this stage" }
      });
    });
    items.sort(function (x, y) {
      if (x.urgent !== y.urgent) return x.urgent ? -1 : 1;
      if (y.overdueBy !== x.overdueBy) return y.overdueBy - x.overdueBy;
      if (y.ageDays !== x.ageDays) return y.ageDays - x.ageDays;
      return String(x.brand).localeCompare(String(y.brand));
    });
    var realDeals = board.totals.totalDeals;
    return {
      ok: true, items: items,
      due: items.length,
      urgentCount: items.filter(function (i) { return i.urgent; }).length,
      demoDue: demoDue,
      emptyBoard: realDeals === 0 && board.totals.demoCount === 0,
      demoOnly: items.length === 0 && realDeals === 0 && demoDue > 0,
      nothingDue: items.length === 0 && realDeals > 0,
      totals: board.totals,
      generatedFor: board.generatedFor,
      advice: ADVICE
    };
  }

  /* Build the queue straight from entered deals, the board is
   * Tool 25's buildBoard with the caller's own data and clock. */
  function buildQueue(deals, opts) {
    opts = opts || {};
    var DP = opts.dp || dep("DealPipeline", "./deal-pipeline.js");
    if (!DP) return { ok: false, errors: ["Deal Pipeline engine is required (assets/js/deal-pipeline.js)"] };
    var board = DP.buildBoard(deals, opts);
    return queueFromBoard(board);
  }

  function exportBrief(queue) {
    if (!queue || !queue.ok) return "";
    var out = [];
    var date = String(queue.generatedFor || "").slice(0, 10);
    out.push("FOLLOW-THROUGH QUEUE · " + queue.due + " due" +
      (queue.urgentCount ? " (" + queue.urgentCount + " urgent)" : "") +
      (date ? " · " + date : ""));
    if (queue.emptyBoard) {
      out.push("No deals on the board, this queue is empty because the Deal Pipeline is empty, not because nothing is due.");
    } else if (queue.demoOnly) {
      out.push("Only demo deals are on the board, their follow-ups are demo data and stay out of the real queue.");
    } else if (queue.nothingDue) {
      out.push("Nothing is due. Every deal on the board is still inside its follow-up window, the queue is empty because no stage has aged past its threshold.");
    }
    if (queue.demoDue) {
      out.push("Plus " + queue.demoDue + " DEMO follow-up(s) on the demo board, demo data, excluded from this queue.");
    }
    queue.items.forEach(function (it, i) {
      out.push("");
      out.push((i + 1) + ". " + (it.urgent ? "URGENT, " : "") + it.brand + " · " + it.stageLabel +
        " · " + it.ageDays + "d in stage (follow-up at " + it.thresholdDays + "d, " + it.overdueBy + "d over) · " + fmt(it.amount));
      out.push("   Do: " + it.action);
      if (it.script.ok) {
        out.push("   Send, " + it.script.label + ":");
        out.push(it.script.exportText.split("\n").map(function (l) { return "   " + l; }).join("\n"));
      } else {
        out.push("   Script: none attached, " + it.script.reason);
      }
    });
    out.push("");
    out.push(queue.advice + " Follow-up thresholds and nudges from the Deal Pipeline (Tool 25); scripts from the Negotiation Script Builder (Tool 24). Amounts are the figures entered on the board.");
    return out.join("\n");
  }

  return {
    buildQueue: buildQueue, queueFromBoard: queueFromBoard,
    exportBrief: exportBrief, fmt: fmt, ADVICE: ADVICE
  };
});
