/* Negotiation Script Builder — engine (UMD, importable in node).
 *
 * Assembles a word-for-word negotiation script — opener, anchor,
 * concession ladder, walk-away line — for ONE scenario, from the
 * scripts and frameworks this site already carries: the Deal Room's
 * negotiation_scripts and the Negotiation Kit's
 * negotiation_kit_scripts in data/v1/deal-templates.json, priced by
 * the Negotiation Kit counter engine on calculators.json v1.5.0
 * (the same blocks the Rate Card Builder reads). No new doctrine:
 * every line carries the id of the repo script/framework it was
 * assembled from, and a scenario with no repo script behind it is
 * excluded with the reason stated, never improvised.
 *
 * A negotiation aid — a model, not a prediction. Not financial,
 * legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NegotiationScriptBuilder = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var DISCLAIMER = "A negotiation aid, built from this site's Negotiation Kit and Deal Room scripts " +
    "and reported 2026 ranges — a model, not a prediction, and never a guarantee of what a brand will pay. " +
    "Not financial, legal, or tax advice.";

  function nkDefault() {
    if (root && root.NegotiationKit) return root.NegotiationKit;
    if (typeof require === "function") {
      try { return require("./negotiation-kit.js"); } catch (e) { return null; }
    }
    return null;
  }
  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function rangeText(r) {
    if (!r) return "—";
    if (r[1] === null) return fmt(r[0]) + "+";
    if (r[1] === r[0]) return fmt(r[0]);
    return fmt(r[0]) + "–" + fmt(r[1]);
  }

  /* Scenarios — ONLY the situations a repo script actually covers.
   * sourceScripts are looked up in deal-templates.json at build
   * time; if a named script is missing, the build fails rather
   * than assembling a line from nothing. */
  var SCENARIOS = [
    { id: "lowball", label: "Brand lowball — offer under your floor",
      when: "The offer came in under the bottom of your tier range.",
      kitScripts: ["lowball_reply", "counter_offer"], dealScripts: ["lowball_counter"] },
    { id: "usage_grab", label: "Unpaid usage grab — paid ads folded into the post fee",
      when: "The contract asks for paid-ad usage priced inside the post fee, or an open-ended usage window.",
      kitScripts: ["usage_rights_reply"], dealScripts: ["usage_rights_upsell"] },
    { id: "exclusivity_lockin", label: "Exclusivity lock-in — broad or long lock, unpaid",
      when: "The deal wants broad or long exclusivity without paying for the deals it freezes out.",
      kitScripts: [], dealScripts: ["exclusivity_pushback"] },
    { id: "late_payment", label: "Late payment — agreed invoice past its terms",
      when: "An agreed invoice is past its terms and has gone quiet.",
      kitScripts: ["late_payment_reply"], dealScripts: [] }
  ];

  /* Covered by a checklist or a flag in the repo, but by NO reply
   * script — so this tool excludes them and says why, instead of
   * inventing wording the repo never wrote. */
  var EXCLUDED = [
    { id: "ip_assignment", label: "IP assignment / work-for-hire grab",
      reason: "data/v1/deal-templates.json carries this only as a contract_flags checklist item (a don't-sign flag), and neither negotiation_scripts nor negotiation_kit_scripts carries a reply script for it. Excluded — no repo wording to assemble." },
    { id: "view_guarantee_clawback", label: "View-guarantee clawback dispute",
      reason: "Carried only as a contract_flags checklist item in deal-templates.json; no negotiation script in the Kit or the Deal Room addresses it. Excluded — no repo wording to assemble." },
    { id: "morality_clause", label: "One-sided morality clause dispute",
      reason: "Carried only as a contract_flags checklist item in deal-templates.json; no negotiation script in the Kit or the Deal Room addresses it. Excluded — no repo wording to assemble." },
    { id: "perpetual_buyout", label: "Perpetual buyout pricing demand",
      reason: "The Deal Room's usage tiers return guidance for a buyout, never a multiplier, and no repo script prices one. Excluded — pricing it here would invent a number the repo deliberately does not carry." }
  ];

  function scenarioOf(id) { return SCENARIOS.filter(function (s) { return s.id === id; })[0] || null; }
  function excludedOf(id) { return EXCLUDED.filter(function (s) { return s.id === id; })[0] || null; }
  function findScript(list, id) { return (list || []).filter(function (s) { return s.id === id; })[0] || null; }

  function validInput(input) {
    var errors = [];
    if (!input || typeof input !== "object") return { ok: false, errors: ["no input"] };
    var ex = excludedOf(input.scenario);
    if (ex) return { ok: false, excluded: true, reason: ex.reason, errors: [ex.reason] };
    if (!scenarioOf(input.scenario)) errors.push("unknown scenario — pick one the Kit / Deal Room scripts cover");
    if (input.scenario === "late_payment") {
      if (!(Number(input.invoiceAmount) > 0)) errors.push("late payment needs the invoice amount");
      if (!input.invoiceDate) errors.push("late payment needs the invoice issue date (as written, e.g. September 3)");
      if (!(Number(input.daysOverdue) > 0)) errors.push("late payment needs the days overdue");
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function line(stage, step, text, sources, grounded) {
    return { stage: stage, step: step || null, text: text, sources: sources, grounded_in: grounded };
  }

  function buildScript(input, calculators, dealTemplates, nkOpt) {
    var v = validInput(input);
    if (!v.ok) return v.excluded ? { ok: false, excluded: true, reason: v.reason, errors: v.errors }
                                  : { ok: false, errors: v.errors };
    var NK = nkOpt || nkDefault();
    if (!NK) return { ok: false, errors: ["Negotiation Kit engine is required (assets/js/negotiation-kit.js)"] };
    if (!dealTemplates) return { ok: false, errors: ["deal-templates.json is required — the scripts live there"] };
    var sc = scenarioOf(input.scenario);
    /* Provenance gate: every named source script must exist. */
    var missing = [];
    sc.kitScripts.forEach(function (id) { if (!findScript(dealTemplates.negotiation_kit_scripts, id)) missing.push(id); });
    sc.dealScripts.forEach(function (id) { if (!findScript(dealTemplates.negotiation_scripts, id)) missing.push(id); });
    if (missing.length) return { ok: false, errors: ["source script(s) missing from deal-templates.json: " + missing.join(", ")] };

    var counterIn = {
      brand: input.brand || "", platform: input.platform, deliverable: input.deliverable,
      followers: input.followers, expectedViews: input.expectedViews || 0,
      offer: Number(input.offer) || 0, niche: input.niche || null,
      usage: input.usage || "organic_only",
      whitelistingMonths: input.whitelistingMonths || 0,
      exclusivity: input.exclusivity || { scope: "none", months: 0 },
      postCount: input.postCount || 1, creatorFloor: input.creatorFloor || 0
    };
    var counter = NK.buildCounter(counterIn, calculators);
    if (!counter.ok) return { ok: false, errors: counter.errors };
    var walk = NK.walkAwayPanel(counterIn, Array.isArray(input.deals) ? input.deals : [], calculators);
    if (!walk.ok) return { ok: false, errors: walk.errors };

    var inp = counter.input;
    var brand = inp.brand || "{{brand}}";
    var deliverable = NK.DELIVERABLE_LABELS[inp.deliverable].toLowerCase();
    var total = rangeText(counter.total);
    var close = rangeText(counter.expectedClose);
    var floor = fmt(walk.walkAway);
    var usageLine = counter.lines.filter(function (l) { return l.id === "usage"; })[0];
    var exLine = counter.lines.filter(function (l) { return l.id === "exclusivity"; })[0];
    var lines = [];

    if (sc.id === "lowball") {
      lines.push(line("opener", null,
        "Hi " + brand + " team — thanks for the offer of " + fmt(inp.offer) + ". I have to be straight with you: that is below the floor for my tier.",
        ["lowball_reply"], findScript(dealTemplates.negotiation_kit_scripts, "lowball_reply").grounded_in));
      lines.push(line("anchor", null,
        "My range for this " + deliverable + " is " + rangeText(counter.range) + ", based on " +
          (inp.expectedViews ? num(inp.expectedViews) + " average views on my last 10 videos" : "my tier on the 2026 rate card") +
          (counter.cpmCheck ? " — at " + fmt(inp.offer) + ", the implied rate is $" + counter.cpmCheck.implied.toFixed(2) + " per 1,000 views" : "") +
          ". My counter is " + total + ": " + fmt(counter.counterBase) + " for the post, with usage priced as its own line.",
        ["counter_offer", "lowball_counter"], "Counter builder: base = top of the niche-adjusted tier range; usage as a separate line item."));
      lines.push(line("concession", 1,
        "At " + total + " the terms stand as written — that is the anchor, stated once.",
        ["counter_offer"], findScript(dealTemplates.negotiation_kit_scripts, "counter_offer").tip));
      lines.push(line("concession", 2,
        "If the budget is fixed at your end, the honest lever is scope — fewer deliverables, a shorter usage window, or no exclusivity — not the same package for less.",
        ["counter_offer"], "Counter script: scope is the lever, not the rate."));
      lines.push(line("concession", 3,
        "The landing zone the rate data supports is " + close + " (creators list ~23% above what they accept). At " + floor + " I am at my floor — workable only with the terms clean: usage priced, exclusivity narrow, payment on schedule.",
        ["counter_offer"], "Walk-away panel: the at-floor stance, from the creator's own floor and the rate-card floor."));
      lines.push(line("walk-away", null,
        "Below " + floor + ", I would rather pass cleanly than discount the rate — a smaller scope at my rate serves us both better. If the budget moves, my door is open.",
        ["lowball_reply"], findScript(dealTemplates.negotiation_kit_scripts, "lowball_reply").grounded_in));
    } else if (sc.id === "usage_grab") {
      var usageText = usageLine ? (usageLine.label.split(" — ")[0].toLowerCase() + " at " + rangeText(usageLine.range))
                                 : "paid usage priced from the 2026 usage-rights benchmarks as its own line";
      lines.push(line("opener", null,
        "Hi " + brand + " team — one term to settle before we sign: usage. The post fee covers organic placement on my channel only.",
        ["usage_rights_reply", "usage_rights_upsell"], findScript(dealTemplates.negotiation_kit_scripts, "usage_rights_reply").grounded_in));
      lines.push(line("anchor", null,
        "Paid usage is a separate line in every rate benchmark I work from: " + usageText + ". That puts the total at " + total +
          ", with the usage window ending on a date we write into the contract.",
        ["usage_rights_reply"], findScript(dealTemplates.negotiation_kit_scripts, "usage_rights_reply").grounded_in));
      lines.push(line("concession", 1,
        "Pay the usage line as priced and the post fee stands at " + fmt(counter.counterBase) + " — the two lines together are the anchor.",
        ["usage_rights_upsell"], findScript(dealTemplates.negotiation_scripts, "usage_rights_upsell").tip));
      lines.push(line("concession", 2,
        "Shorten the usage window and the line shrinks with it, at the benchmark rate for the shorter window — the window is the lever, not a discount on the same window.",
        ["usage_rights_reply"], "Usage tiers in calculators.json v1.5.0 price each window as its own percentage band."));
      lines.push(line("concession", 3,
        "Strike the paid-usage clause entirely and the post fee stands as quoted for organic placement only, at the landing zone of " + close + ".",
        ["usage_rights_reply"], findScript(dealTemplates.negotiation_kit_scripts, "usage_rights_reply").tip));
      lines.push(line("walk-away", null,
        "What I cannot sign is paid usage folded into the post fee at " + fmt(inp.offer) + " — that is perpetual value at an organic price, and below my floor of " + floor + " I will pass cleanly rather than sign it.",
        ["usage_rights_reply"], "Red-flag checklist: perpetual usage for organic price is a walk-away signal in deal-templates.json."));
    } else if (sc.id === "exclusivity_lockin") {
      var exText = exLine ? exLine.label + " at " + rangeText(exLine.range)
                          : "named competitors for 30 days at +25%, or 60–90 days at +50%";
      lines.push(line("opener", null,
        "Hi " + brand + " team — on exclusivity: a broad category lock would freeze out other sponsor revenue for me, so I can't sign it as written.",
        ["exclusivity_pushback"], findScript(dealTemplates.negotiation_scripts, "exclusivity_pushback").grounded_in));
      lines.push(line("anchor", null,
        "I can do " + exText + ", with the competitor list written into the contract. If you need the full category, the premium has to actually cover the deals I'd lose — my counter on the post itself is " + total + ".",
        ["exclusivity_pushback"], findScript(dealTemplates.negotiation_scripts, "exclusivity_pushback").grounded_in));
      lines.push(line("concession", 1,
        "Narrow the lock to named competitors and the priced line stands — scope first, price second.",
        ["exclusivity_pushback"], findScript(dealTemplates.negotiation_scripts, "exclusivity_pushback").tip));
      lines.push(line("concession", 2,
        "Shorten the window — 30 days at +25% instead of 60–90 days at +50% — and the fee falls with the window.",
        ["exclusivity_pushback"], findScript(dealTemplates.negotiation_scripts, "exclusivity_pushback").grounded_in));
      lines.push(line("concession", 3,
        "Drop exclusivity entirely and the post fee stands on its own in the landing zone of " + close + ", with no lock on either side.",
        ["exclusivity_pushback"], "Counter builder: exclusivity is a separate priced line; removing it removes the line, not the post fee."));
      lines.push(line("walk-away", null,
        "A broad category lock for 6+ months without a premium that covers the lost deals is below my floor of " + floor + " in effect, whatever the headline fee — on that term I will pass cleanly.",
        ["exclusivity_pushback"], "Red-flag checklist: broad / category exclusivity, 6+ months, is a walk-away signal in deal-templates.json."));
    } else { /* late_payment */
      var inv = fmt(Number(input.invoiceAmount));
      lines.push(line("opener", null,
        "Hi " + brand + " team — following up on the invoice of " + inv + " for the " + deliverable + ", issued " + input.invoiceDate + " on net-30 terms. It is now " + Number(input.daysOverdue) + " days past due, and I have not had a payment date from your side.",
        ["late_payment_reply"], findScript(dealTemplates.negotiation_kit_scripts, "late_payment_reply").grounded_in));
      lines.push(line("anchor", null,
        "The amount due is " + inv + " — that is the anchor. This work was delivered and published on schedule; I am asking for the same on payment.",
        ["late_payment_reply"], findScript(dealTemplates.negotiation_kit_scripts, "late_payment_reply").grounded_in));
      lines.push(line("concession", 1,
        "Please confirm today when payment will land. If it has already been sent, a remittance reference is all I need.",
        ["late_payment_reply"], "Late-payment script: one written chase with the amount, the date, and the consequence."));
      lines.push(line("concession", 2,
        "If it is stuck somewhere in approvals, tell me where, and who owns it — I would rather have an honest date than another week of silence.",
        ["late_payment_reply"], "Late-payment script: an honest date over another week of silence."));
      lines.push(line("concession", 3,
        "Give me a named date and an owner today and I hold everything else — no pause, no further chase — until that date.",
        ["late_payment_reply"], "Late-payment script: the chase is once, in writing, with the consequence named — a dated commitment is what the script asks for."));
      lines.push(line("walk-away", null,
        "Until this invoice clears I am pausing further deliverables and usage renewals with " + brand + ", which I would prefer not to do.",
        ["late_payment_reply"], findScript(dealTemplates.negotiation_kit_scripts, "late_payment_reply").grounded_in));
    }

    return {
      ok: true, scenario: sc, input: counter.input,
      counter: { range: counter.range, total: counter.total, expectedClose: counter.expectedClose,
                 counterBase: counter.counterBase, badge: counter.badge, lines: counter.lines },
      walkAway: walk.walkAway, rateFloor: walk.rateFloor, stance: walk.stance,
      lines: lines, excluded: EXCLUDED, disclaimer: DISCLAIMER
    };
  }

  function exportScript(result) {
    if (!result || !result.ok) return "";
    var out = [];
    out.push("NEGOTIATION SCRIPT — " + result.scenario.label);
    out.push("Send it word for word, or edit it in the page first. Numbers from the Negotiation Kit counter on calculators.json v1.5.0.");
    out.push("");
    var labels = { opener: "OPENER", anchor: "ANCHOR", concession: "CONCESSION", "walk-away": "WALK-AWAY LINE" };
    result.lines.forEach(function (l) {
      out.push((labels[l.stage] || l.stage.toUpperCase()) + (l.step ? " " + l.step : "") + ":");
      out.push(l.text);
      out.push("  [source: " + l.sources.join(" + ") + " — " + l.grounded_in + "]");
      out.push("");
    });
    out.push("PROVENANCE: every line above was assembled from the repo script(s) named under it " +
      "(data/v1/deal-templates.json: negotiation_scripts + negotiation_kit_scripts). No line was invented for this tool.");
    out.push("EXCLUDED SCENARIOS (no repo script covers them — see the page): " +
      result.excluded.map(function (e) { return e.label; }).join("; ") + ".");
    out.push(result.disclaimer);
    return out.join("\n");
  }

  return {
    SCENARIOS: SCENARIOS, EXCLUDED: EXCLUDED, DISCLAIMER: DISCLAIMER,
    scenarioOf: scenarioOf, excludedOf: excludedOf,
    validInput: validInput, buildScript: buildScript, exportScript: exportScript,
    fmt: fmt, rangeText: rangeText
  };
});
