/* The Negotiation Kit, counter-offer math, reply scripts, and the
 * walk-away panel. UMD: works in the browser (window.NegotiationKit)
 * and in node (module.exports).
 *
 * Built on Deal Room 2.0's data: every figure reads from the real
 * calculators.json v1.5.0 blocks, sponsorship_rate_card_2026 (tier
 * ranges), sponsorship_quoted_prices_2026 (Cheerful Sep-2026 reported
 * asks/quotes; Click Analytic 2026 Instagram model, labeled modeled),
 * usage_rights_benchmarks_2026, and sponsorship_rule_of_thumb. Bases
 * travel with every number: reported stays reported, modeled stays
 * modeled, and an unmapped format returns no evidence instead of a
 * stretched benchmark.
 *
 * HONESTY CONTRACT: a counter is a model built from reported ranges,
 * not a prediction and never a guarantee of what a brand will pay.
 * Creators list ~23% above what they accept, so the output shows both
 * the counter and the expected landing zone. Not financial, legal, or
 * tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.NegotiationKit = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LISTED_VS_ACCEPTED = 0.23;
  var DISCLAIMER = "A negotiation aid, built from reported 2026 ranges, " +
    "a model, not a prediction, and never a guarantee of what a brand will pay. " +
    "Not financial, legal, or tax advice.";
  var MODEL_NOTE = "A model, not a prediction: benchmarks disagree 2–3x within " +
    "tiers, and your niche, engagement, and geography move the real number. " +
    "Verify against current creator rate reports before you send.";

  var PLATFORMS = ["youtube", "tiktok", "instagram"];
  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
  var DELIVERABLES = ["integrated", "dedicated", "short", "ugc"];
  var DELIVERABLE_LABELS = {
    integrated: "Integrated slot", dedicated: "Dedicated video",
    short: "Short-form video", ugc: "UGC (no posting)"
  };
  var USAGE_IDS = ["organic_only", "paid_3mo", "paid_6mo", "paid_12mo", "perpetual"];
  var EXCL_SCOPES = ["none", "named", "category"];

  /* Same sponsor niche table as DealRoom.NICHE_MULT and
   * DealAnalyzer.nicheMult, tests pin parity across all three. */
  var NICHE_MULT = {
    finance_investing: 2.5, tech_software: 2.5,
    education: 1.0, health_fitness: 1.0, lifestyle: 1.0,
    gaming: 0.6, comedy_entertainment: 0.6, music: 0.6,
    kids: 0.6, asmr: 0.6, creator_economy: 1.5,
    challenges_stunts: 0.6, ai_ml: 2.5, true_crime: 0.6,
    entertainment: 0.6, science: 1.0
  };
  var NICHE_LABELS = {
    finance_investing: "Finance / Investing", tech_software: "Tech / Software",
    education: "Education", health_fitness: "Health / Fitness",
    lifestyle: "Lifestyle", gaming: "Gaming",
    comedy_entertainment: "Comedy / Entertainment", music: "Music",
    kids: "Kids Content", asmr: "ASMR",
    creator_economy: "Creator Economy", challenges_stunts: "Challenges & Stunts",
    ai_ml: "AI & ML", true_crime: "True Crime",
    entertainment: "Entertainment & Comedy", science: "Science Explainers"
  };
  var NICHES = Object.keys(NICHE_MULT);

  function nice(n) {
    if (!(n > 0)) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }
  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function fmtRange(r) {
    if (!r) return "·";
    if (r[1] === null) return "from " + fmt(r[0]);
    if (r[1] === r[0]) return fmt(r[0]);
    return fmt(r[0]) + "–" + fmt(r[1]);
  }
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
  function nicheMult(niche) {
    if (!niche || NICHE_MULT[niche] == null) return { mult: 1.0, label: null };
    return { mult: NICHE_MULT[niche], label: NICHE_LABELS[niche] };
  }

  function validInput(input) {
    var errors = [];
    function bad(cond, msg) { if (cond) errors.push(msg); }
    bad(!input || typeof input !== "object", "input must be an object");
    var inp = input || {};
    bad(PLATFORMS.indexOf(inp.platform) < 0, "platform must be youtube, tiktok, or instagram");
    bad(DELIVERABLES.indexOf(inp.deliverable) < 0, "deliverable must be integrated, dedicated, short, or ugc");
    bad(!(inp.followers >= 1000), "followers must be at least 1,000 (nano floor)");
    bad(inp.followers >= 100000000, "followers above 100M is outside the benchmark universe");
    bad(!(inp.offer >= 0), "offer must be 0 or more (0 = exposure-only offer)");
    bad(typeof inp.expectedViews !== "undefined" && !(inp.expectedViews >= 0),
        "expectedViews must be 0 or a positive number");
    bad(inp.niche && NICHE_MULT[inp.niche] == null, "unknown niche");
    bad(USAGE_IDS.indexOf(inp.usage || "organic_only") < 0, "unknown usage tier");
    bad(typeof inp.whitelistingMonths !== "undefined" &&
        (!(inp.whitelistingMonths >= 0) || inp.whitelistingMonths > 24),
        "whitelistingMonths must be 0–24");
    var ex = inp.exclusivity || { scope: "none", months: 0 };
    bad(EXCL_SCOPES.indexOf(ex.scope || "none") < 0, "unknown exclusivity scope");
    bad(!(ex.months >= 0) || ex.months > 24, "exclusivity months must be 0–24");
    bad((ex.scope || "none") === "none" && ex.months > 0, "exclusivity months set but scope is none");
    bad((ex.scope || "none") !== "none" && !(ex.months >= 1), "exclusivity scope set but months is 0");
    bad(typeof inp.postCount !== "undefined" &&
        (!(inp.postCount >= 1) || inp.postCount > 12), "postCount must be 1–12");
    bad(typeof inp.creatorFloor !== "undefined" && !(inp.creatorFloor >= 0),
        "creatorFloor must be 0 or a positive number");
    return { ok: errors.length === 0, errors: errors };
  }

  function norm(input) {
    var ex = input.exclusivity || {};
    return {
      brand: String(input.brand || "").trim(),
      platform: input.platform,
      deliverable: input.deliverable,
      followers: Number(input.followers),
      expectedViews: input.expectedViews ? Number(input.expectedViews) : 0,
      offer: Number(input.offer),
      niche: input.niche || null,
      usage: input.usage || "organic_only",
      whitelistingMonths: Math.floor(Number(input.whitelistingMonths || 0)),
      exclusivity: { scope: ex.scope || "none", months: Math.floor(Number(ex.months || 0)) },
      postCount: Math.floor(Number(input.postCount || 1)),
      creatorFloor: input.creatorFloor ? Number(input.creatorFloor) : 0
    };
  }

  /* The CPM band a deliverable is checked against. Dedicated carries the
   * AIR agency-benchmark compilation ($50–$90, reported); integrated
   * YouTube carries the rate card's integrated slot; short-form carries
   * the general band. UGC has no CPM check, it is production work. */
  function cpmBandFor(inp, rateCard) {
    var cpms = (rateCard && rateCard.sponsored_cpms) || {};
    if (inp.deliverable === "dedicated") {
      return { range: [50, 90], basis: "reported",
               source: "AIR Media-Tech compilation of 2026 agency benchmarks (Oct 2026)" };
    }
    if (inp.deliverable === "integrated" && inp.platform === "youtube") {
      return cpms.youtube_integrated_slot
        ? { range: cpms.youtube_integrated_slot, basis: "reported",
            source: "2026 rate card, YouTube integrated slot" } : null;
    }
    if (inp.deliverable === "short" || inp.deliverable === "integrated") {
      return cpms.tiktok_youtube_general
        ? { range: cpms.tiktok_youtube_general, basis: "reported",
            source: "2026 rate card, TikTok/YouTube general sponsored CPM" } : null;
    }
    return null;
  }

  /* Format mapping onto the Cheerful quoted-prices block, the same map
   * the Deal Room uses. Unmapped formats return null evidence. */
  var FORMAT_QUOTE_MAP = {
    "instagram:short": "instagram_reel",
    "tiktok:short": "tiktok_video", "tiktok:integrated": "tiktok_video",
    "tiktok:dedicated": "tiktok_video",
    "youtube:integrated": "video_integration"
  };

  function evidenceFor(inp, calculators) {
    var quoted = calculators.sponsorship_quoted_prices_2026;
    var out = { formatQuote: null, typicalAsk: null, modeledFeedPost: null };
    if (!quoted) return out;
    var fid = FORMAT_QUOTE_MAP[inp.platform + ":" + inp.deliverable];
    if (fid) {
      (quoted.typical_quoted_by_format || []).forEach(function (q) {
        if (q.id === fid) {
          out.formatQuote = { label: q.label, quoted: q.quoted_usd,
                              basis: q.basis, source: q.source };
        }
      });
    }
    (quoted.typical_ask_by_followers || []).forEach(function (a) {
      var hi = a.max_followers === null ? Infinity : a.max_followers;
      if (inp.followers >= a.min_followers && inp.followers < hi) {
        out.typicalAsk = { band: a.band, ask: a.ask_usd, basis: a.basis, source: a.source };
      }
    });
    if (inp.platform === "instagram") {
      var f = inp.followers;
      var tierId = f < 50000 ? "nano_10k_50k" : f < 100000 ? "micro_50k_100k"
        : f < 500000 ? "mid_100k_500k" : f < 1000000 ? "macro_500k_1m" : "mega_1m_plus";
      (quoted.instagram_feed_post_modeled || []).forEach(function (r) {
        if (r.tier === tierId) {
          out.modeledFeedPost = { label: r.label, range: r.range_usd,
                                  basis: quoted.instagram_modeled_basis || "modeled",
                                  source: "Click Analytic, Creator Pricing Report 2026" };
        }
      });
    }
    return out;
  }

  /* The counter-offer builder. Input is one live offer; calculators is
   * the full calculators.json document. The counter base is the top of
   * the niche-adjusted tier range; usage, whitelisting, and exclusivity
   * stack as separate lines, each carrying its benchmark. */
  function buildCounter(input, calculators) {
    var v = validInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (!calculators || !calculators.sponsorship_rate_card_2026) {
      return { ok: false, errors: ["calculators.json rate card is required"] };
    }
    var inp = norm(input);
    var rateCard = calculators.sponsorship_rate_card_2026;
    var usageRights = calculators.usage_rights_benchmarks_2026;
    var tier = tierOf(inp.followers);
    var baseBand = rateCard.per_video_or_post_by_tier[tier][inp.platform];
    var nm = nicheMult(inp.niche);
    var range = [nice(baseBand[0] * nm.mult), nice(baseBand[1] * nm.mult)];
    var verdict = inp.offer < range[0] ? "under" : inp.offer > range[1] ? "over" : "fair";
    var badge = verdict === "under" ? "UNDERPAID" : verdict === "over" ? "STRONG" : "FAIR";

    var impliedCpm = null, cpmCheck = null;
    if (inp.expectedViews > 0 && inp.offer > 0) {
      impliedCpm = Math.round((inp.offer / inp.expectedViews * 1000) * 100) / 100;
      var band = cpmBandFor(inp, rateCard);
      if (band) {
        cpmCheck = { implied: impliedCpm, range: band.range, basis: band.basis,
          source: band.source,
          position: impliedCpm < band.range[0] ? "below" : impliedCpm > band.range[1] ? "above" : "inside" };
      }
    }

    var counterBase = range[1];
    var lines = [{ id: "base", label: "Post fee, top of your " + tierLabel(tier) + " range" +
      (nm.label ? " (" + nm.label + " ×" + nm.mult + ")" : ""),
      range: [counterBase, counterBase], basis: "reported",
      source: "2026 rate card, " + PLATFORM_LABELS[inp.platform] + " tier band" }];

    var usageTier = null;
    (usageRights && usageRights.tiers || []).forEach(function (t) {
      if (t.id === inp.usage) usageTier = t;
    });
    var openEnded = false;
    if (usageTier && inp.usage !== "organic_only") {
      var pct = usageTier.addon_pct;
      var lo = nice(counterBase * pct[0] / 100);
      var hi = pct[1] === null ? null : nice(counterBase * pct[1] / 100);
      if (hi === null) openEnded = true;
      lines.push({ id: "usage", label: usageTier.label + ", separate line item",
        range: [lo, hi], basis: "reported",
        source: "2026 usage-rights benchmarks: +" + pct[0] +
          (pct[1] === null ? "% or more" : "–" + pct[1] + "%") + " on the post fee" });
    }
    if (inp.whitelistingMonths > 0) {
      var wlPct = (usageRights && usageRights.whitelisting_per_month_pct) || [30, 100];
      lines.push({ id: "whitelisting",
        label: "Whitelisting, " + inp.whitelistingMonths + " month(s), monthly and revocable",
        range: [nice(counterBase * wlPct[0] / 100 * inp.whitelistingMonths),
                nice(counterBase * wlPct[1] / 100 * inp.whitelistingMonths)],
        basis: "reported",
        source: "2026 benchmarks: " + wlPct[0] + "–" + wlPct[1] + "% of the post fee per month" });
    }
    var exFlag = null;
    if (inp.exclusivity.scope === "named") {
      var exPct = inp.exclusivity.months <= 1 ? 25 : 50;
      var exVal = nice(counterBase * exPct / 100);
      lines.push({ id: "exclusivity",
        label: "Exclusivity, named competitors, " + inp.exclusivity.months + " month(s)",
        range: [exVal, exVal], basis: "reported",
        source: "Rate-card lever: +" + exPct + "% (" +
          (inp.exclusivity.months <= 1 ? "30 days" : "60–90 days") + ")" });
    } else if (inp.exclusivity.scope === "category") {
      exFlag = "Broad category exclusivity for " + inp.exclusivity.months +
        " month(s) carries no benchmark multiplier in this kit. The premium has to cover " +
        "the deals the lock costs you, narrow it to named competitors, or price your lost pipeline yourself.";
    }

    var totalLo = lines.reduce(function (a, l) { return a + l.range[0]; }, 0);
    var totalHi = openEnded ? null
      : lines.reduce(function (a, l) { return a + (l.range[1] || 0); }, 0);
    var total = [nice(totalLo), totalHi === null ? null : nice(totalHi)];
    var expectedClose = [nice(total[0] * (1 - LISTED_VS_ACCEPTED)),
                         total[1] === null ? null : nice(total[1] * (1 - LISTED_VS_ACCEPTED))];

    var notes = [];
    if (inp.offer === 0) {
      notes.push("This offer carries no fee. The counter below is the paid-slot price, " +
        "the exposure-only reply in the scripts section is the matching words.");
    }
    if (inp.postCount >= 3) {
      notes.push("Bundles of 3+ posts commonly close with a 15–20% package discount, and 41% " +
        "of creators offer one (2026 rate card). Decide your bundle line now, not under pressure.");
    }
    if (openEnded) {
      notes.push("Perpetual usage is open-ended: the high end has no ceiling. Price it from " +
        "2x the post fee as its own line, or refuse the perpetual term.");
    }
    notes.push("Quote at the top of the range: creators list ~23% above what they accept, " +
      "so the expected landing zone is " + fmtRange(expectedClose) + ".");
    notes.push(MODEL_NOTE);

    return {
      ok: true, input: inp, tier: tier, tierLabel: tierLabel(tier),
      baseRange: baseBand, range: range,
      niche: inp.niche, nicheLabel: nm.label, nicheMult: nm.mult,
      verdict: verdict, badge: badge,
      impliedCpm: impliedCpm, cpmCheck: cpmCheck,
      evidence: evidenceFor(inp, calculators),
      counterBase: counterBase, lines: lines, total: total,
      expectedClose: expectedClose, openEnded: openEnded,
      exclusivityFlag: exFlag, notes: notes,
      disclaimer: DISCLAIMER, modelNote: MODEL_NOTE
    };
  }

  /* The walk-away panel. Deals are the creator's own Deal Room tracker
   * records (may be empty). The walk-away number is the higher of the
   * rate-card floor for this deal's context and the creator's own floor
   *, arithmetic on their numbers, never an invented probability. */
  var STATUSES = ["offer", "negotiating", "signed", "delivered", "paid"];
  function walkAwayPanel(input, deals, calculators) {
    var v = validInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (!calculators || !calculators.sponsorship_rate_card_2026) {
      return { ok: false, errors: ["calculators.json rate card is required"] };
    }
    var inp = norm(input);
    var rateCard = calculators.sponsorship_rate_card_2026;
    var tier = tierOf(inp.followers);
    var baseBand = rateCard.per_video_or_post_by_tier[tier][inp.platform];
    var nm = nicheMult(inp.niche);
    var rateFloor = nice(baseBand[0] * nm.mult);
    var creatorFloor = inp.creatorFloor || 0;
    var walkAway = Math.max(rateFloor, creatorFloor);

    var list = Array.isArray(deals) ? deals : [];
    var committed = 0, paidTotal = 0, paidCount = 0, openCount = 0;
    list.forEach(function (d) {
      var st = STATUSES.indexOf(d.status) >= 0 ? d.status : "offer";
      if (st === "signed" || st === "delivered" || st === "paid") committed += (+d.offer || 0);
      if (st === "paid") { paidTotal += (+d.offer || 0); paidCount++; }
      if (st === "offer" || st === "negotiating") openCount++;
    });
    var avgPaid = paidCount ? Math.round(paidTotal / paidCount) : null;

    var stance, action;
    if (inp.offer < walkAway) {
      stance = "below";
      action = "Below your walk-away. Counter at the number the builder produced, " +
        "or pass cleanly, taking this offer reprices every deal after it.";
    } else if (inp.offer < walkAway * 1.25) {
      stance = "at_floor";
      action = "At your floor. Workable only with the terms clean: usage priced, " +
        "exclusivity narrow, payment on schedule. Do not discount further.";
    } else {
      stance = "workable";
      action = "Above your walk-away with room to negotiate. Hold the counter, " +
        "trade scope or timeline before you trade price.";
    }
    var reasons = [
      "Rate-card floor for " + tierLabel(tier) + " " + PLATFORM_LABELS[inp.platform] +
        (nm.label ? " (" + nm.label + " ×" + nm.mult + ")" : "") + ": " + fmt(rateFloor) + ".",
      creatorFloor > 0
        ? "Your own floor, as you set it: " + fmt(creatorFloor) + "."
        : "No personal floor set, the rate-card floor is doing the work. Set yours before the call, not during it."
    ];
    if (list.length) {
      reasons.push("Your pipeline: " + list.length + " logged deal(s), " + fmt(committed) +
        " committed, " + fmt(paidTotal) + " paid" +
        (avgPaid !== null ? " (average paid deal " + fmt(avgPaid) + ")" : "") +
        ", " + openCount + " still open. Those are your numbers, not a forecast.");
    } else {
      reasons.push("No pipeline on file in this browser. Log deals in the Deal Room and this " +
        "panel reads your committed and paid totals alongside the rate floor.");
    }
    return {
      ok: true, walkAway: walkAway, rateFloor: rateFloor, creatorFloor: creatorFloor,
      tier: tier, tierLabel: tierLabel(tier),
      pipeline: { totalDeals: list.length, committed: committed, paidTotal: paidTotal,
                  paidCount: paidCount, avgPaid: avgPaid, openCount: openCount },
      stance: stance, action: action, reasons: reasons,
      disclaimer: DISCLAIMER, modelNote: MODEL_NOTE
    };
  }

  /* Fill a kit script's {{placeholders}} from vars. Unknown placeholders
   * stay visible so nothing silently invents a number. */
  function renderReply(script, vars) {
    function fill(text) {
      return String(text || "").replace(/\{\{(\w+)\}\}/g, function (m, key) {
        return (vars && vars[key] !== undefined && vars[key] !== null && vars[key] !== "")
          ? String(vars[key]) : m;
      });
    }
    return { subject: fill(script.subject), body: fill(script.body) };
  }

  /* Script variables built from a counter result, so the words carry the
   * same numbers as the math. Money is pre-formatted without the $ sign
   * because the script templates carry their own. */
  function replyVars(counter, extra) {
    if (!counter || !counter.ok) return { ok: false, errors: ["build the counter first"] };
    var inp = counter.input;
    var usageLine = counter.lines.filter(function (l) { return l.id === "usage"; })[0];
    var wlLine = counter.lines.filter(function (l) { return l.id === "whitelisting"; })[0];
    var num = function (n) { return Math.round(n).toLocaleString("en-US"); };
    var vars = {
      brand: inp.brand || "{{brand}}",
      deliverable: DELIVERABLE_LABELS[inp.deliverable].toLowerCase(),
      offer: num(inp.offer),
      views_avg: inp.expectedViews ? num(inp.expectedViews) : "{{views_avg}}",
      range_lo: num(counter.range[0]), range_hi: num(counter.range[1]),
      counter_base: num(counter.counterBase),
      counter_total: counter.total[1] === null ? num(counter.total[0]) + "+"
        : num(counter.total[0]) === num(counter.total[1]) ? num(counter.total[0])
        : num(counter.total[0]) + "–" + num(counter.total[1]),
      typical_quote: counter.evidence.formatQuote ? num(counter.evidence.formatQuote.quoted) : "{{typical_quote}}",
      implied_cpm: counter.impliedCpm !== null ? counter.impliedCpm.toFixed(2) : "{{implied_cpm}}",
      usage_line: usageLine
        ? usageLine.label.split(", ")[0].toLowerCase() + " at " +
          (usageLine.range[1] === null ? "from $" + num(usageLine.range[0])
                                       : "$" + num(usageLine.range[0]) +
                                         (usageLine.range[1] !== usageLine.range[0]
                                           ? "–$" + num(usageLine.range[1]) : ""))
        : "organic placement only, no paid usage in this counter",
      usage_ask: inp.usage === "organic_only" ? "paid usage folded into the post fee"
        : "the usage window in the draft",
      whitelisting_monthly: wlLine ? num(Math.round((wlLine.range[0] + (wlLine.range[1] || wlLine.range[0])) / 2 / Math.max(1, inp.whitelistingMonths))) : "{{whitelisting_monthly}}",
      whitelisting_months: String(inp.whitelistingMonths || 1),
      invoice_amount: "{{invoice_amount}}", invoice_date: "{{invoice_date}}",
      days_overdue: "{{days_overdue}}", due_terms: "net-30"
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] !== undefined && extra[k] !== null && extra[k] !== "") vars[k] = String(extra[k]);
      });
    }
    return { ok: true, vars: vars };
  }

  /* The one-page negotiation brief, as copy-ready plaintext. */
  function exportBrief(counter, walk) {
    if (!counter || !counter.ok) return { ok: false, errors: ["build the counter first"] };
    var inp = counter.input;
    var L = [];
    L.push("NEGOTIATION BRIEF, " + (inp.brand || "(brand TBD)") + " · " +
      PLATFORM_LABELS[inp.platform] + " " + DELIVERABLE_LABELS[inp.deliverable]);
    L.push("Generated by the Negotiation Kit (Creator Growth Empire) from calculators.json v1.5.0 data.");
    L.push("");
    L.push("THE OFFER");
    L.push("  Offered: " + fmt(inp.offer) + " · Tier: " + counter.tierLabel +
      " · Benchmark range: " + fmtRange(counter.range) +
      (counter.nicheLabel ? " (" + counter.nicheLabel + " ×" + counter.nicheMult + ")" : ""));
    L.push("  Verdict: " + counter.badge +
      (counter.cpmCheck ? " · Implied CPM $" + counter.cpmCheck.implied.toFixed(2) +
        " vs the $" + counter.cpmCheck.range[0] + "–$" + counter.cpmCheck.range[1] +
        " band (" + counter.cpmCheck.position + ", " + counter.cpmCheck.basis + ")" : ""));
    var ev = counter.evidence;
    if (ev.formatQuote) {
      L.push("  Typical quote for a " + ev.formatQuote.label.toLowerCase() + ": " +
        fmt(ev.formatQuote.quoted) + " (" + ev.formatQuote.source + " · " + ev.formatQuote.basis + ")");
    }
    if (ev.typicalAsk) {
      L.push("  Typical ask at " + ev.typicalAsk.band + ": " + fmt(ev.typicalAsk.ask) +
        " (" + ev.typicalAsk.source + " · " + ev.typicalAsk.basis + ")");
    }
    if (ev.modeledFeedPost) {
      L.push("  Modeled cross-check, one sponsored Instagram feed post, " +
        ev.modeledFeedPost.label + ": " + fmtRange(ev.modeledFeedPost.range) +
        " (" + ev.modeledFeedPost.source + " · " + ev.modeledFeedPost.basis +
        ", a planning model, kept separate from the reported figures)");
    }
    L.push("");
    L.push("THE COUNTER");
    counter.lines.forEach(function (l) {
      L.push("  " + l.label + ": " + fmtRange(l.range) + " [" + l.basis + ", " + l.source + "]");
    });
    L.push("  Counter total: " + fmtRange(counter.total));
    L.push("  Expected landing zone (~23% listed-vs-accepted): " + fmtRange(counter.expectedClose));
    if (counter.exclusivityFlag) L.push("  Flag: " + counter.exclusivityFlag);
    if (walk && walk.ok) {
      L.push("");
      L.push("WALK-AWAY");
      L.push("  Your walk-away: " + fmt(walk.walkAway) + " (rate floor " + fmt(walk.rateFloor) +
        (walk.creatorFloor ? ", your floor " + fmt(walk.creatorFloor) : "") + ")");
      L.push("  Stance on this offer: " + walk.stance + ", " + walk.action);
      L.push("  Pipeline on file: " + walk.pipeline.totalDeals + " deal(s), " +
        fmt(walk.pipeline.committed) + " committed, " + fmt(walk.pipeline.paidTotal) + " paid.");
    }
    L.push("");
    counter.notes.forEach(function (n) { L.push("  " + n); });
    L.push("");
    L.push(DISCLAIMER);
    return { ok: true, text: L.join("\n") };
  }

  return {
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED,
    DISCLAIMER: DISCLAIMER, MODEL_NOTE: MODEL_NOTE,
    PLATFORMS: PLATFORMS, PLATFORM_LABELS: PLATFORM_LABELS,
    DELIVERABLES: DELIVERABLES, DELIVERABLE_LABELS: DELIVERABLE_LABELS,
    USAGE_IDS: USAGE_IDS, EXCL_SCOPES: EXCL_SCOPES,
    NICHES: NICHES, NICHE_LABELS: NICHE_LABELS,
    nice: nice, fmt: fmt, fmtRange: fmtRange,
    tierOf: tierOf, tierLabel: tierLabel, nicheMult: nicheMult,
    validInput: validInput, norm: norm,
    cpmBandFor: cpmBandFor, evidenceFor: evidenceFor,
    buildCounter: buildCounter, walkAwayPanel: walkAwayPanel,
    renderReply: renderReply, replyVars: replyVars, exportBrief: exportBrief
  };
});
