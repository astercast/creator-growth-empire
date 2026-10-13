/* Deal Pipeline — engine (UMD, importable in node for tests).
 *
 * Tool 25. A working board for a creator's LIVE sponsorship deals:
 * lead -> negotiating -> terms set -> live -> invoiced -> paid.
 * It COMPOSES the two tools before it instead of duplicating them:
 * every deal is priced by the Rate Card Builder engine (Tool 23,
 * assets/js/rate-card-builder.js) on the same calculators.json
 * v1.5.0 blocks, with that engine's provenance rules intact (basis,
 * source, reasoning travel with the numbers; a row with no
 * benchmark stays blank here too), and every deal's current
 * negotiation script is the Negotiation Script Builder (Tool 24,
 * assets/js/negotiation-script-builder.js) one call away, chosen by
 * stage when the creator has not picked a scenario themselves.
 *
 * Totals are arithmetic on the deals actually entered — nothing
 * else. An empty board totals to zero and says so. Demo deals are
 * data with demo:true and a DEMO brand prefix, never mixed into a
 * real board silently: pipelineTotals counts them apart.
 *
 * A planning aid — ranges, not quotes. Not financial, legal, or
 * tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DealPipeline = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var STAGES = ["lead", "negotiating", "terms", "live", "invoiced", "paid"];
  var STAGE_LABELS = {
    lead: "Lead", negotiating: "Negotiating", terms: "Terms set",
    live: "Live", invoiced: "Invoiced", paid: "Paid"
  };
  /* Follow-up thresholds in days-in-stage. Derived from stage age
   * only — no invented close probabilities, no engagement scores. */
  var NUDGE_DAYS = { lead: 3, negotiating: 7, terms: 5, live: 14, invoiced: 14, paid: null };
  var NUDGE_ACTIONS = {
    lead: "Send the first follow-up — a lead this old has gone quiet.",
    negotiating: "Nudge the thread — send your current script and name a reply date.",
    terms: "Chase the signature — terms were set days ago and the deal is not live yet.",
    live: "Check delivery and the invoice date — a live deal this old should be invoiced.",
    invoiced: "Chase payment — send the late-payment script if the terms have passed.",
    paid: ""
  };
  /* Default Tool 24 scenario per stage, used only when the deal
   * carries no scenario of its own. Paid deals need no script. */
  var STAGE_SCENARIO = {
    lead: "lowball", negotiating: "lowball", terms: "usage_grab",
    live: "usage_grab", invoiced: "late_payment", paid: null
  };
  var ADVICE = "Planning aid, not financial, legal, or tax advice.";
  var STORAGE_KEY = "cge.deal-pipeline.deals.v1";

  function dep(name, file) {
    if (root && root[name]) return root[name];
    if (typeof require === "function") {
      try { return require(file); } catch (e) { return null; }
    }
    return null;
  }
  function fmt(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function dayMs() { return 86400000; }
  function parseDay(s) {
    var t = Date.parse(s);
    return isNaN(t) ? null : t;
  }
  function ageDays(deal, now) {
    var t = parseDay(deal && deal.stageEnteredAt);
    if (t == null) return null;
    var n = now ? (now instanceof Date ? now.getTime() : parseDay(now) || Date.now()) : Date.now();
    return Math.max(0, Math.floor((n - t) / dayMs()));
  }

  function validDeal(deal) {
    var errors = [];
    if (!deal || typeof deal !== "object") return { ok: false, errors: ["no deal"] };
    if (!String(deal.brand || "").trim()) errors.push("brand is required");
    if (STAGES.indexOf(deal.stage) < 0) errors.push("stage must be one of: " + STAGES.join(", "));
    if (!(Number(deal.amount) >= 0)) errors.push("amount must be 0 or more");
    if (deal.amount == null || deal.amount === "") errors.push("amount is required (0 is a real value — an unpaid lead)");
    if (!deal.stageEnteredAt || parseDay(deal.stageEnteredAt) == null) {
      errors.push("stageEnteredAt (ISO date the deal entered its stage) is required");
    }
    if (deal.scenario && ["lowball", "usage_grab", "exclusivity_lockin", "late_payment"].indexOf(deal.scenario) < 0) {
      errors.push("unknown scenario — pick one Tool 24 covers");
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /* Price one deal through Tool 23. Returns the primary row, the
   * card total, and the provenance exactly as the Rate Card
   * Builder reports it — this tool adds no pricing math of its own. */
  function priceDeal(deal, calculators, changesFeed, rcbOpt) {
    var RCB = rcbOpt || dep("RateCardBuilder", "./rate-card-builder.js");
    if (!RCB) return { ok: false, errors: ["Rate Card Builder engine is required (assets/js/rate-card-builder.js)"] };
    var input = {
      platform: deal.platform, format: deal.format, followers: deal.followers,
      expectedViews: deal.expectedViews || 0, niche: deal.niche || null,
      usage: deal.usage || "organic_only",
      whitelistingMonths: deal.whitelistingMonths || 0
    };
    var card = RCB.buildCard(input, calculators, changesFeed || null);
    if (!card.ok) return { ok: false, errors: card.errors };
    return {
      ok: true, platform: card.platformLabel, tierLabel: card.tierLabel,
      primary: { id: card.primary.id, label: card.primary.label, range: card.primary.range,
                 basis: card.primary.basis, source: card.primary.source,
                 reasoning: card.primary.reasoning },
      total: card.total, addons: card.addons,
      provenance: "Priced by the Rate Card Builder (Tool 23) from " + card.primary.source +
        " [" + card.primary.basis + "] — " + card.primary.reasoning
    };
  }

  /* The deal's current Tool 24 script, one call away. Scenario:
   * the deal's own when set, otherwise the stage default. For a
   * late-payment script the invoice fields come from the deal
   * itself (amount, stage entry date, days in stage). */
  function scriptFor(deal, calculators, dealTemplates, opts) {
    opts = opts || {};
    var scenario = deal.scenario || STAGE_SCENARIO[deal.stage] || null;
    if (!scenario) return { ok: false, none: true, reason: "Paid deals need no negotiation script." };
    var NSB = opts.nsb || dep("NegotiationScriptBuilder", "./negotiation-script-builder.js");
    var NK = opts.nk || dep("NegotiationKit", "./negotiation-kit.js");
    if (!NSB || !NK) return { ok: false, errors: ["Negotiation Script Builder + Kit engines are required (Tool 24)"] };
    var now = opts.now || new Date();
    var input = {
      scenario: scenario, brand: deal.brand || "", platform: deal.platform,
      deliverable: deal.format === "ugc" ? "ugc" : deal.format,
      followers: deal.followers, expectedViews: deal.expectedViews || 0,
      offer: Number(deal.amount) || 0, niche: deal.niche || null,
      usage: deal.usage || "organic_only",
      exclusivity: deal.exclusivity || { scope: "none", months: 0 },
      creatorFloor: deal.creatorFloor || 0,
      invoiceAmount: Number(deal.amount) || 0,
      invoiceDate: deal.stageEnteredAt ? String(deal.stageEnteredAt).slice(0, 10) : "",
      daysOverdue: Math.max(1, ageDays(deal, now) || 0)
    };
    var res = NSB.buildScript(input, calculators, dealTemplates, NK);
    if (!res.ok) return { ok: false, scenario: scenario, errors: res.errors, excluded: !!res.excluded, reason: res.reason || null };
    return { ok: true, scenario: scenario, label: res.scenario.label,
             lines: res.lines, counter: res.counter, walkAway: res.walkAway,
             exportText: NSB.exportScript(res) };
  }

  function nudgeFor(deal, now) {
    var threshold = NUDGE_DAYS[deal.stage];
    if (threshold == null) return null;
    var age = ageDays(deal, now);
    if (age == null || age < threshold) return null;
    return {
      dealId: deal.id || null, brand: deal.brand || "(no brand)", stage: deal.stage,
      stageLabel: STAGE_LABELS[deal.stage], ageDays: age, thresholdDays: threshold,
      overdueBy: age - threshold,
      urgent: deal.stage === "invoiced" && age >= 30,
      action: NUDGE_ACTIONS[deal.stage],
      scriptScenario: deal.scenario || STAGE_SCENARIO[deal.stage] || null
    };
  }

  /* Totals from the entered deals only. Demo deals are counted
   * apart so a demo board can never pass as a real pipeline. */
  function pipelineTotals(deals) {
    var counts = {}, sums = {};
    STAGES.forEach(function (s) { counts[s] = 0; sums[s] = 0; });
    var demoCount = 0, demoValue = 0;
    (deals || []).forEach(function (d) {
      if (d.demo) { demoCount++; demoValue += Number(d.amount) || 0; return; }
      var st = STAGES.indexOf(d.stage) >= 0 ? d.stage : "lead";
      counts[st]++; sums[st] += Number(d.amount) || 0;
    });
    var total = 0, open = 0;
    STAGES.forEach(function (s) { total += sums[s]; if (s !== "paid") open += sums[s]; });
    return {
      counts: counts, sums: sums, totalDeals: (deals || []).filter(function (d) { return !d.demo; }).length,
      pipelineValue: total, openValue: open,
      invoicedOutstanding: sums.invoiced, paidTotal: sums.paid,
      demoCount: demoCount, demoValue: demoValue,
      empty: (deals || []).filter(function (d) { return !d.demo; }).length === 0
    };
  }

  function buildBoard(deals, opts) {
    opts = opts || {};
    var now = opts.now || new Date();
    var list = (deals || []).slice();
    var enriched = list.map(function (d) {
      var v = validDeal(d);
      var priced = null, script = null;
      if (v.ok && opts.calculators) priced = priceDeal(d, opts.calculators, opts.changesFeed || null, opts.rcb);
      if (v.ok && opts.calculators && opts.dealTemplates) {
        script = scriptFor(d, opts.calculators, opts.dealTemplates, { now: now, nsb: opts.nsb, nk: opts.nk });
      }
      return { deal: d, valid: v, ageDays: ageDays(d, now),
               rateCard: priced, script: script, nudge: v.ok ? nudgeFor(d, now) : null };
    });
    var byStage = {};
    STAGES.forEach(function (s) {
      byStage[s] = enriched.filter(function (e) { return e.deal.stage === s; });
    });
    return {
      ok: true, stages: STAGES, stageLabels: STAGE_LABELS, byStage: byStage,
      deals: enriched, totals: pipelineTotals(list),
      nudges: enriched.map(function (e) { return e.nudge; }).filter(Boolean),
      generatedFor: now instanceof Date ? now.toISOString() : String(now),
      advice: ADVICE
    };
  }

  function exportBoard(board) {
    if (!board || !board.ok) return "";
    var out = [];
    out.push("DEAL PIPELINE — " + board.totals.totalDeals + " deal(s), pipeline value " +
      fmt(board.totals.pipelineValue) + " (open " + fmt(board.totals.openValue) +
      " · invoiced outstanding " + fmt(board.totals.invoicedOutstanding) +
      " · paid " + fmt(board.totals.paidTotal) + ")");
    if (board.totals.demoCount) {
      out.push("Plus " + board.totals.demoCount + " DEMO deal(s) worth " + fmt(board.totals.demoValue) +
        " — demo data, excluded from every total above.");
    }
    if (board.totals.empty) out.push("No real deals entered — this board is empty. Totals are zero because nothing has been entered, not because deals are worth zero.");
    board.stages.forEach(function (s) {
      out.push("");
      out.push(board.stageLabels[s].toUpperCase() + " (" + board.byStage[s].length + ")");
      board.byStage[s].forEach(function (e) {
        var d = e.deal;
        out.push("- " + (d.demo ? "DEMO — " : "") + d.brand + " · " + fmt(d.amount) +
          " · in stage " + (e.ageDays == null ? "?" : e.ageDays) + "d" +
          (e.rateCard && e.rateCard.ok ? " · rate card: " + e.rateCard.provenance : "") +
          (e.script && e.script.ok ? " · script: " + e.script.label : "") +
          (e.nudge ? " · FOLLOW-UP: " + e.nudge.action : ""));
      });
    });
    out.push("");
    out.push(board.advice + " Rates from the Rate Card Builder (Tool 23); scripts from the Negotiation Script Builder (Tool 24).");
    return out.join("\n");
  }

  /* Demo board — offered only behind an explicit control in the UI,
   * every record flagged demo:true with a DEMO brand prefix, and
   * pipelineTotals keeps demo money out of the real totals. */
  var DEMO_DEALS = [
    { id: "demo-1", demo: true, brand: "DEMO — Ridge Wallet", platform: "youtube", format: "dedicated",
      followers: 50000, expectedViews: 60000, niche: "tech_software", usage: "paid_6mo", whitelistingMonths: 1,
      amount: 12000, stage: "negotiating", stageEnteredAt: "2026-10-05", scenario: "lowball" },
    { id: "demo-2", demo: true, brand: "DEMO — Trail Snacks Co", platform: "tiktok", format: "short",
      followers: 50000, expectedViews: 60000, niche: "lifestyle", usage: "organic_only", whitelistingMonths: 0,
      amount: 1800, stage: "lead", stageEnteredAt: "2026-10-08" },
    { id: "demo-3", demo: true, brand: "DEMO — Northwind VPN", platform: "youtube", format: "integrated",
      followers: 50000, expectedViews: 60000, niche: "tech_software", usage: "paid_3mo", whitelistingMonths: 0,
      amount: 4500, stage: "invoiced", stageEnteredAt: "2026-09-20", scenario: "late_payment" }
  ];

  return {
    STAGES: STAGES, STAGE_LABELS: STAGE_LABELS, NUDGE_DAYS: NUDGE_DAYS,
    STAGE_SCENARIO: STAGE_SCENARIO, STORAGE_KEY: STORAGE_KEY, DEMO_DEALS: DEMO_DEALS,
    validDeal: validDeal, priceDeal: priceDeal, scriptFor: scriptFor,
    nudgeFor: nudgeFor, ageDays: ageDays, pipelineTotals: pipelineTotals,
    buildBoard: buildBoard, exportBoard: exportBoard, fmt: fmt, ADVICE: ADVICE
  };
});
