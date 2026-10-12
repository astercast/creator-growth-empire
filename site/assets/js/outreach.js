/* The Outreach Center — pure outreach math (no DOM).
 * UMD: works in the browser (window.Outreach) and in node (module.exports).
 *
 * HONESTY CONTRACT: every benchmark is a reported range from the 2026 rate
 * card (data/v1/calculators.json sponsorship_rate_card_2026), never a quote.
 * Pitch templates never invent metrics — every stat is a [bracketed]
 * placeholder the creator fills with their own real numbers. The contract
 * checklist is a negotiation aid, NOT legal advice. Not financial, legal, or
 * tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.Outreach = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Creators list rates ~23% above what they accept — from the 2026 rate
   * card chapter (projectcasting / InfluenceFlow 2026, 1,347 creator
   * profiles; re-verified Oct 2026). Quoted in rate calculations as the
   * reason to quote at the top of the range and expect to be negotiated
   * down. */
  var LISTED_VS_ACCEPTED = 0.23;

  /* Outbound pipeline: pitched -> replied -> negotiating -> signed.
   * "passed" is a terminal state (they said no, or you moved on). */
  var STATUSES = ["pitched", "replied", "negotiating", "signed", "passed"];
  var STATUS_LABELS = {
    pitched: "Pitched",
    replied: "Replied",
    negotiating: "Negotiating",
    signed: "Signed",
    passed: "Passed"
  };
  var RESPONDED = { replied: 1, negotiating: 1, signed: 1 };
  var ACTIVE = { pitched: 1, replied: 1, negotiating: 1 };

  function tierOf(followers) {
    if (followers < 10000) return "nano_1k_10k";
    if (followers < 100000) return "micro_10k_100k";
    if (followers < 1000000) return "macro_100k_1m";
    return "mega_1m_plus";
  }

  function tierLabel(t) {
    return { nano_1k_10k: "Nano (1K\u201310K)", micro_10k_100k: "Micro (10K\u2013100K)",
             macro_100k_1m: "Macro (100K\u20131M)", mega_1m_plus: "Mega (1M+)" }[t];
  }

  /* Honest rounding for quote numbers: 2 significant figures. */
  function nice(n) {
    if (n <= 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  /* Validate one pipeline record. Brand is required; status must be one of
   * the pipeline states; email, when present, must look like an email. */
  function validDeal(d) {
    if (!d || typeof d !== "object") return { ok: false, reason: "not an object" };
    if (!d.brand || !String(d.brand).trim()) return { ok: false, reason: "brand is required" };
    if (STATUSES.indexOf(d.status) === -1) return { ok: false, reason: "unknown status" };
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) {
      return { ok: false, reason: "email looks invalid" };
    }
    return { ok: true };
  }

  /* Pipeline stats over an array of deal records. Response rate = deals that
   * drew any reply (replied/negotiating/signed) over all contacted; close
   * rate = signed over all contacted. ~5% reply rate is normal per the
   * sponsorship-pitch skill — the system works on volume. */
  function pipelineStats(deals) {
    var list = Array.isArray(deals) ? deals : [];
    var contacted = list.length;
    var responded = 0, active = 0, signed = 0;
    list.forEach(function (d) {
      if (RESPONDED[d.status]) responded++;
      if (ACTIVE[d.status]) active++;
      if (d.status === "signed") signed++;
    });
    function pct(n) { return contacted ? Math.round((n / contacted) * 100) : 0; }
    return {
      contacted: contacted,
      responded: responded,
      activeDeals: active,
      signed: signed,
      responseRate: pct(responded),
      closeRate: pct(signed),
      note: "~5% reply rate is normal for cold outreach (sponsorship-pitch skill) \u2014 the system works on volume, not on chasing."
    };
  }

  /* Split follow-ups into overdue / due-today / upcoming buckets relative to
   * nowIso (YYYY-MM-DD). Signed and passed deals never need follow-ups. */
  function dueFollowUps(deals, nowIso) {
    var list = Array.isArray(deals) ? deals : [];
    var today = String(nowIso || "").slice(0, 10);
    var out = { overdue: [], dueToday: [], upcoming: [] };
    list.forEach(function (d) {
      if (!d || d.status === "signed" || d.status === "passed") return;
      var f = d.followUpDate ? String(d.followUpDate).slice(0, 10) : "";
      if (!f) return;
      if (f < today) out.overdue.push(d);
      else if (f === today) out.dueToday.push(d);
      else out.upcoming.push(d);
    });
    return out;
  }

  /* "What should I charge?" — range from the 2026 rate card tier, a CPM
   * cross-check from expected views, and negotiation guidance. RANGES ONLY:
   * the output never claims a price is correct, and every number carries
   * its provenance. Usage-rights pricing is deliberately left out of the
   * total here — it's a separate line item (Deal Room), never folded in. */
  function quoteCalc(input, rateCard, ruleOfThumb) {
    input = input || {};
    var followers = Math.max(0, Number(input.followers) || 0);
    var platform = ["youtube", "tiktok", "instagram"].indexOf(input.platform) !== -1
      ? input.platform : "youtube";
    var deliverable = ["integrated", "dedicated", "short"].indexOf(input.deliverable) !== -1
      ? input.deliverable : "integrated";
    var expectedViews = Math.max(0, Number(input.expectedViews) || 0);

    var tier = tierOf(followers);
    var band = rateCard.per_video_or_post_by_tier[tier][platform];
    var lo = band[0], hi = band[1];
    var quotePoint = nice(hi);
    var expectedClose = nice(hi * (1 - LISTED_VS_ACCEPTED));

    /* CPM cross-check: which benchmark matches this deliverable? */
  var cpmBand, cpmLabel, cpmBasis;
    if (deliverable === "integrated") {
      cpmBand = rateCard.sponsored_cpms.youtube_integrated_slot;
      cpmLabel = "YouTube integrated slot";
      cpmBasis = "reported benchmark $20\u2013$35 per 1,000 views";
    } else if (deliverable === "dedicated") {
      cpmBand = ruleOfThumb.dedicated_cpm_range;
      cpmLabel = "Dedicated video";
      cpmBasis = "rule-of-thumb starting point $20\u2013$50 per 1,000 expected views \u2014 not a benchmark";
    } else {
      if (platform === "instagram") {
        cpmBand = [rateCard.sponsored_cpms.ig_sponsored_reel_median,
                   rateCard.sponsored_cpms.ig_sponsored_reel_median];
        cpmLabel = "IG sponsored Reel";
        cpmBasis = "median $22.40 CPM (creator-reported, Oct 2026)";
      } else {
        cpmBand = rateCard.sponsored_cpms.tiktok_youtube_general;
        cpmLabel = "Short-form video";
        cpmBasis = "reported benchmark $10\u2013$30 per 1,000 views";
      }
    }
    var impliedCpm = expectedViews > 0
      ? Math.round((quotePoint / expectedViews) * 1000 * 10) / 10 : null;
    var cpmNote;
    if (impliedCpm === null) {
      cpmNote = "Add your last-10-video average views to cross-check the quote against the " +
        cpmLabel.toLowerCase() + " benchmark.";
    } else if (impliedCpm > cpmBand[1]) {
      cpmNote = "At " + fmt(expectedViews) + " expected views, quoting " + fmt(quotePoint) +
        " implies ~$" + impliedCpm + " per 1,000 views \u2014 above the " + cpmLabel +
        " band (" + cpmBasis + "). Either the views support dedication-level pricing, or the quote sits above what the views defend.";
    } else if (impliedCpm < cpmBand[0]) {
      cpmNote = "At " + fmt(expectedViews) + " expected views, quoting " + fmt(quotePoint) +
        " implies ~$" + impliedCpm + " per 1,000 views \u2014 below the " + cpmLabel +
        " band (" + cpmBasis + "). There may be room to quote higher.";
    } else {
      cpmNote = "At " + fmt(expectedViews) + " expected views, quoting " + fmt(quotePoint) +
        " implies ~$" + impliedCpm + " per 1,000 views \u2014 inside the " + cpmLabel +
        " band (" + cpmBasis + ").";
    }

    return {
      tier: tier,
      tierLabel: tierLabel(tier),
      platform: platform,
      deliverable: deliverable,
      range: [lo, hi],
      rangeLabel: fmt(lo) + "\u2013" + fmt(hi),
      quotePoint: quotePoint,
      expectedClose: expectedClose,
      guidance: "Quote at the top of your tier range (" + fmt(quotePoint) + "). Creators list rates ~" +
        Math.round(LISTED_VS_ACCEPTED * 100) + "% above what they accept \u2014 if you open at the top, expect to land near " +
        fmt(expectedClose) + ". 41% of creators offer package discounts on 3+ posts (InfluenceFlow 2026) \u2014 build the discount into a bundle, never into a one-off.",
      cpm: {
        deliverableLabel: cpmLabel,
        band: cpmBand,
        basis: cpmBasis,
        impliedCpmAtQuote: impliedCpm,
        note: cpmNote
      },
      crossPlatform: "At equal followers, YouTube pays ~1.7\u00d7 Instagram and TikTok ~0.85\u00d7 (wave-1 research, consistent with 2026 agency tables \u2014 use it to move a quote across platforms, not to inflate one).",
      usageRightsNote: "This range is the POST FEE ONLY. Paid-ad usage, whitelisting, and exclusivity are separate line items \u2014 price them in the Deal Room, never fold them in here.",
      disclaimer: "A negotiation range compiled from 2026 benchmarks that disagree 2\u20133\u00d7 within tiers \u2014 never a quote, never a promise. Niche, engagement rate, and audience geography move the real number as much as follower count. Not financial advice."
    };
  }

  /* Fill a pitch template's [bracketed] and {{mustache}} placeholders from
   * vars. Unknown placeholders stay visible so nothing silently lies \u2014
   * and no stat is ever invented for the user. */
  function renderPitch(template, vars) {
    if (!template) return "";
    var out = "Subject: " + template.subject + "\n\n" + template.body;
    out = out.replace(/\{\{(\w+)\}\}/g, function (m, key) {
      return (vars && vars[key] !== undefined && vars[key] !== null)
        ? String(vars[key]) : m;
    });
    out = out.replace(/\[([^\]]+)\]/g, function (m, key) {
      var norm = key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return (vars && vars[norm] !== undefined && vars[norm] !== null &&
              String(vars[norm]).trim() !== "")
        ? String(vars[norm]) : m;
    });
    return out;
  }

  /* Score the contract red-flag checklist. Same family as the Deal Room's
   * offer-flag scoring: any walk_away flag -> don't sign; otherwise
   * score = 2*major + 1*minor; 0 clean, 1-2 caution, 3+ don't sign.
   * Returns a plain-language risk summary per item plus the aggregate. */
  function contractRisk(selectedIds, flags) {
    var byId = {};
    (flags || []).forEach(function (f) { byId[f.id] = f; });
    var walkAway = [], items = [], score = 0;
    (selectedIds || []).forEach(function (id) {
      var f = byId[id];
      if (!f) return;
      items.push({ id: f.id, title: f.title, severity: f.severity,
                   detail: f.detail, fix: f.fix });
      if (f.severity === "walk_away") walkAway.push(f);
      else if (f.severity === "major") score += 2;
      else if (f.severity === "minor") score += 1;
    });
    var verdict, verdictText;
    if (walkAway.length) {
      verdict = "dont_sign";
      verdictText = "Don't sign as written \u2014 a walk-away clause is checked (" +
        walkAway.map(function (f) { return f.title; }).join("; ") +
        "), and no price fixes a hostile structure. Send it back with the fixes below.";
    } else if (score >= 3) {
      verdict = "dont_sign";
      verdictText = "Don't sign as written \u2014 the flagged terms stack up (" + score +
        " points) to a contract that can cost you more than the deal pays. Renegotiate the fixes below first.";
    } else if (score >= 1) {
      verdict = "caution";
      verdictText = "Caution \u2014 fix the flagged terms in writing before you sign (" + score +
        " point" + (score === 1 ? "" : "s") + "). Nothing here is fatal, but unwritten terms always favor the brand.";
    } else {
      verdict = "clean";
      verdictText = "Clean \u2014 no structural contract flags checked. Price the post next, and keep usage rights as separate line items.";
    }
    return {
      score: score,
      verdict: verdict,
      verdictText: verdictText,
      items: items,
      disclaimer: "A negotiation aid, NOT legal advice. Contracts above $500 deserve a real lawyer's eyes."
    };
  }

  return {
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED,
    STATUSES: STATUSES,
    STATUS_LABELS: STATUS_LABELS,
    tierOf: tierOf,
    tierLabel: tierLabel,
    nice: nice,
    fmt: fmt,
    validDeal: validDeal,
    pipelineStats: pipelineStats,
    dueFollowUps: dueFollowUps,
    quoteCalc: quoteCalc,
    renderPitch: renderPitch,
    contractRisk: contractRisk
  };
});
