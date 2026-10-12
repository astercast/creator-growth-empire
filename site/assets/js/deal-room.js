/* The Deal Room — pure deal math (no DOM).
 * UMD: works in the browser (window.DealRoom) and in node (module.exports).
 *
 * HONESTY CONTRACT: every benchmark is a reported range from the 2026 rate
 * card (data/v1/calculators.json sponsorship_rate_card_2026), never a quote.
 * Usage-rights multipliers are the wave-2 research band (+50–100%), flagged
 * per tier as reported vs. definitional. Not financial, legal, or tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.DealRoom = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Creators list rates ~23% above what they accept — from the 2026 rate card
   * chapter. Quoted in deal memos and tracker scorecards as the reason to
   * quote at the top of the range and expect to be negotiated down. */
  var LISTED_VS_ACCEPTED = 0.23;

  /* Status pipeline for the tracker: offer -> negotiating -> signed ->
   * delivered -> paid. */
  var STATUSES = ["offer", "negotiating", "signed", "delivered", "paid"];
  var STATUS_LABELS = {
    offer: "Offer",
    negotiating: "Negotiating",
    signed: "Signed",
    delivered: "Delivered",
    paid: "Paid"
  };

  function tierOf(followers) {
    if (followers < 10000) return "nano_1k_10k";
    if (followers < 100000) return "micro_10k_100k";
    if (followers < 1000000) return "macro_100k_1m";
    return "mega_1m_plus";
  }

  function tierLabel(t) {
    return { nano_1k_10k: "Nano (1K–10K)", micro_10k_100k: "Micro (10K–100K)",
             macro_100k_1m: "Macro (100K–1M)", mega_1m_plus: "Mega (1M+)" }[t];
  }

  /* Honest rounding for counter-offer numbers: 2 significant figures. */
  function nice(n) {
    if (n <= 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  /* Score one offer against a rate-card range. Returns "under" | "fair" |
   * "over". The ~23% note travels with every verdict. */
  function scoreOffer(offer, lo, hi) {
    var verdict = offer < lo ? "under" : offer > hi ? "over" : "fair";
    return {
      verdict: verdict,
      badge: verdict === "under" ? "UNDERPAID" : verdict === "over" ? "STRONG" : "FAIR",
      note: "Creators list rates ~" + Math.round(LISTED_VS_ACCEPTED * 100) +
        "% above what they accept — quote at the top of the range and expect " +
        "to be negotiated down."
    };
  }

  /* Price one usage-rights tier against a base post fee. tiers is
   * deal-templates.json usage_rights_tiers. Returns {addonLo, addonHi,
   * totalLo, totalHi, label, note}; whitelisting/buyout have no safe
   * multiplier and return nulls with guidance instead of fake numbers. */
  function priceUsage(baseFee, tierId, tiers) {
    var tier = null;
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i].id === tierId) { tier = tiers[i]; break; }
    }
    if (!tier) return null;
    var m = tier.multiplier;
    if (!m) {
      return { addonLo: null, addonHi: null, totalLo: null, totalHi: null,
        label: tier.label,
        note: "No research-backed multiplier exists for this tier (" +
          tier.basis + "). Price it as its own line item — enter your own " +
          "monthly rate (whitelisting) or negotiate a separate figure (buyout)." };
    }
    var addonLo = Math.max(0, (m[0] - 1)) * baseFee;
    var addonHi = m[1] === null ? null : Math.max(0, (m[1] - 1)) * baseFee;
    return {
      addonLo: addonLo, addonHi: addonHi,
      totalLo: baseFee + addonLo,
      totalHi: addonHi === null ? null : baseFee + addonHi,
      label: tier.label,
      reported: !!tier.reported,
      note: tier.multiplier_label + ". " + tier.basis
    };
  }

  /* Score the interactive red-flag checklist. selectedIds is the array of
   * checked red_flags[].id; flags is the red_flags array from
   * deal-templates.json. Any walk_away flag -> walk_away; otherwise
   * score = 2*major + 1*minor; 0 clean, 1-2 caution, 3+ walk_away. */
  function redFlagScore(selectedIds, flags) {
    var byId = {};
    flags.forEach(function (f) { byId[f.id] = f; });
    var walkAway = [];
    var score = 0;
    selectedIds.forEach(function (id) {
      var f = byId[id];
      if (!f) return;
      if (f.severity === "walk_away") walkAway.push(f);
      else if (f.severity === "major") score += 2;
      else if (f.severity === "minor") score += 1;
    });
    var verdict, verdictText;
    if (walkAway.length) {
      verdict = "walk_away";
      verdictText = "Walk away — a walk-away clause is checked, and no price fixes a hostile structure.";
    } else if (score >= 3) {
      verdict = "walk_away";
      verdictText = "Walk away — the flagged terms stack up to a deal that costs you more than it pays.";
    } else if (score >= 1) {
      verdict = "caution";
      verdictText = "Caution — fix the flagged terms in writing before you sign.";
    } else {
      verdict = "clean";
      verdictText = "Clean — no structural red flags checked. Price the post next.";
    }
    return { score: score, verdict: verdict, verdictText: verdictText,
             walkAwayFlags: walkAway.map(function (f) { return f.title; }) };
  }

  /* Fill a negotiation script's {{placeholders}} from vars. Unknown
   * placeholders are left visible as-is so nothing silently lies. */
  function renderScript(script, vars) {
    return String(script.body).replace(/\{\{(\w+)\}\}/g, function (m, key) {
      return (vars && vars[key] !== undefined && vars[key] !== null)
        ? String(vars[key]) : m;
    });
  }

  /* Build the one-page deal memo (plain text) for the creator's records. */
  function dealMemo(deal, scored, flagsSummary) {
    var L = [];
    L.push("DEAL MEMO — " + (deal.brand || "(brand TBD)") + " · " +
      (deal.createdAt || "").slice(0, 10));
    L.push("Generated by the Deal Room (Creator Growth Empire).");
    L.push("");
    L.push("TERMS");
    L.push("  Status: " + (STATUS_LABELS[deal.status] || deal.status));
    L.push("  Deliverable: " + (deal.deliverable || "—") + " on " + (deal.platform || "—"));
    L.push("  Offered pay: " + fmt(deal.offer || 0));
    L.push("  Usage rights: " + (deal.usage || "—"));
    L.push("  Exclusivity: " + (deal.exclusivity || "—"));
    L.push("  Payment terms: " + (deal.payTerms || "—"));
    L.push("  Timeline: " + (deal.timeline || "—"));
    if (deal.notes) L.push("  Notes: " + deal.notes);
    L.push("");
    L.push("RATE-CARD SCORE");
    L.push("  Verdict: " + (scored ? scored.badge : "UNAVAILABLE"));
    if (scored) {
      L.push("  " + scored.note);
    }
    L.push("");
    L.push("RED FLAGS" + (flagsSummary ? " (" + flagsSummary.verdictText + ")" : ""));
    if (flagsSummary && flagsSummary.checkedTitles && flagsSummary.checkedTitles.length) {
      flagsSummary.checkedTitles.forEach(function (t) { L.push("  - " + t); });
    } else {
      L.push("  (none checked)");
    }
    L.push("");
    L.push("Counters from the rate card: quote at the top of your range; " +
      "usage rights as separate line items; decide your walk-away rate " +
      "before the call, not during it.");
    L.push("A negotiation aid, not financial, legal, or tax advice. " +
      "Benchmarks disagree 2–3x within tiers — verify against current " +
      "creator rate reports before you quote.");
    return L.join("\n");
  }

  return {
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED,
    STATUSES: STATUSES,
    STATUS_LABELS: STATUS_LABELS,
    tierOf: tierOf,
    tierLabel: tierLabel,
    nice: nice,
    fmt: fmt,
    scoreOffer: scoreOffer,
    priceUsage: priceUsage,
    redFlagScore: redFlagScore,
    renderScript: renderScript,
    dealMemo: dealMemo
  };
});
