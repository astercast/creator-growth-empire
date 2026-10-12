/* The Deal Analyzer 2.0 — pure deal math (no DOM).
 * UMD: works in the browser (window.DealAnalyzer) and in node
 * (module.exports).
 *
 * HONESTY CONTRACT: every benchmark is a reported range from the 2026 rate
 * card (api/v1/calculators.json: sponsorship_rate_card_2026 +
 * usage_rights_benchmarks_2026 v1.4.0) or the site's chapters, never a quote.
 * The contract checklist is wave 22's data (api/v1/deal-templates.json
 * contract_flags) — a negotiation aid, NOT legal advice. RPM/CPM figures are
 * creator-reported ranges, not platform-published. Not financial, legal, or
 * tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.DealAnalyzer = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Creators list rates ~23% above what they accept (projectcasting 2026,
   * 1,347 creator profiles; nano gap biggest at 28%) — carried in the rate
   * card's disclaimer. */
  var LISTED_VS_ACCEPTED = 0.23;

  var PLATFORMS = ["youtube", "tiktok", "instagram"];
  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
  var DELIVERABLES = ["integrated", "dedicated", "short"];
  var DELIVERABLE_LABELS = {
    integrated: "Integrated slot",
    dedicated: "Dedicated video",
    short: "Short-form video"
  };
  var USAGES = ["organic_only", "paid_3mo", "paid_6mo", "paid_12mo", "perpetual"];
  var USAGE_LABELS = {
    organic_only: "Organic only",
    paid_3mo: "Paid ads, 3 months",
    paid_6mo: "Paid ads, 3–6 months",
    paid_12mo: "Paid ads, 6–12 months",
    perpetual: "Perpetual / unlimited"
  };
  var TIERS = ["nano_1k_10k", "micro_10k_100k", "macro_100k_1m", "mega_1m_plus"];
  var TIER_LABELS = {
    nano_1k_10k: "Nano (1K–10K)",
    micro_10k_100k: "Micro (10K–100K)",
    macro_100k_1m: "Macro (100K–1M)",
    mega_1m_plus: "Mega (1M+)"
  };

  /* Sponsor niche multiplier — the same table as the Empire Simulator's
   * DEFAULTS.sponsorNicheMult (engine assumption, sourced from the rate
   * card's rule of thumb: "finance/tech 2–3x, entertainment lower").
   * tests/deal-analyzer.test.js pins parity with the simulator table. */
  var NICHE_MULT = {
    finance_investing: 2.5, tech_software: 2.5,
    education: 1.0, health_fitness: 1.0, lifestyle: 1.0,
    gaming: 0.6, comedy_entertainment: 0.6, music: 0.6
  };
  var NICHE_LABELS = {
    finance_investing: "Finance / Investing", tech_software: "Tech / Software",
    education: "Education", health_fitness: "Health / Fitness",
    lifestyle: "Lifestyle", gaming: "Gaming",
    comedy_entertainment: "Comedy / Entertainment", music: "Music"
  };

  function nicheMult(niche) {
    if (!niche || NICHE_MULT[niche] == null) {
      return { mult: 1.0, label: null,
               note: "No niche selected — finance/tech benchmarks run ~2.5× the base range; entertainment, gaming, and music run ~0.6×." };
    }
    return { mult: NICHE_MULT[niche], label: NICHE_LABELS[niche],
             note: "Niche-adjusted ×" + NICHE_MULT[niche] + " (" + NICHE_LABELS[niche] +
                   ") — the simulator's niche multiplier, from the rate-card rule of thumb (finance/tech 2–3×, entertainment lower)." };
  }

  /* Category sponsored CPMs — AIR Media-Tech's Oct-11-2026 compilation of 2026
   * agency benchmarks (Influencer Marketing Hub, Aspire, CreatorIQ).
   * Verified as a compilation; the underlying agency tables are single sources
   * each. Only mapped where the AIR category clearly matches the niche —
   * education, lifestyle, and music have no direct AIR category and are
   * skipped rather than stretched. */
  var CATEGORY_CPM = {
    finance_investing:    { category: "Finance & real estate",  cpm: 58 },
    tech_software:        { category: "B2B SaaS & AI",          cpm: 46.5 },
    health_fitness:       { category: "Health & fitness",       cpm: 28 },
    gaming:               { category: "Gaming & tech",          cpm: 18.5 },
    comedy_entertainment:  { category: "Entertainment & comedy", cpm: 14 }
  };
  var CATEGORY_CPM_SOURCE = "AIR Media-Tech compilation of 2026 agency benchmarks (Oct 11, 2026)";

  function categoryCpm(niche) {
    var c = CATEGORY_CPM[niche];
    return c ? { category: c.category, cpm: c.cpm, source: CATEGORY_CPM_SOURCE } : null;
  }

  function tierOf(followers) {
    if (followers < 10000) return "nano_1k_10k";
    if (followers < 100000) return "micro_10k_100k";
    if (followers < 1000000) return "macro_100k_1m";
    return "mega_1m_plus";
  }

  /* Honest rounding for counter-offer numbers: 2 significant figures. */
  function nice(n) {
    if (!isFinite(n) || n <= 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  function fmtRange(lo, hi) {
    if (hi == null) return "from " + fmt(lo);
    return fmt(lo) + "–" + fmt(hi);
  }

  /* ---------- input ---------- */
  var CONTRACT_DEFAULTS = {
    ip: "mine",            /* mine | brand_full | unclear */
    cancel: "no",          /* no | yes — brand can cancel anytime, you can't */
    usageWords: "specific",/* specific | all_media | unclear */
    exclRenew: "no",       /* no | yes — exclusivity auto-renews */
    payMetrics: "no",      /* no | yes — pay tied to guaranteed views */
    morals: "none",        /* none | mutual | one_sided */
    paySchedule: "yes",    /* yes | no — written payment schedule */
    approval: "defined",   /* defined | vague */
    ftc: "yes",            /* yes | no — FTC disclosure language */
    scope: "no"            /* no | yes — "and related content" scope creep */
  };

  function validInput(raw) {
    var errors = [];
    var d = raw || {};
    var deal = {
      platform: PLATFORMS.indexOf(d.platform) >= 0 ? d.platform : "youtube",
      deliverable: DELIVERABLES.indexOf(d.deliverable) >= 0 ? d.deliverable : "integrated",
      followers: Math.max(0, parseFloat(d.followers) || 0),
      expectedViews: Math.max(0, parseFloat(d.expectedViews) || 0),
      offerUsd: Math.max(0, parseFloat(d.offerUsd) || 0),
      usage: USAGES.indexOf(d.usage) >= 0 ? d.usage : "organic_only",
      whitelisting: ["none", "30", "90", "perpetual"].indexOf(d.whitelisting) >= 0 ? d.whitelisting : "none",
      exclusivity: ["none", "30", "90", "broad"].indexOf(d.exclusivity) >= 0 ? d.exclusivity : "none",
      paymentTerms: ["15", "30", "60", "90"].indexOf(String(d.paymentTerms)) >= 0 ? String(d.paymentTerms) : "30",
      postCount: Math.max(1, Math.round(parseFloat(d.postCount) || 1)),
      timeline: ["relaxed", "standard", "rush", "unknown"].indexOf(d.timeline) >= 0 ? d.timeline : "unknown",
      niche: (d.niche && NICHE_MULT[d.niche] != null) ? d.niche : null,
      contract: {}
    };
    var c = d.contract || {};
    Object.keys(CONTRACT_DEFAULTS).forEach(function (k) {
      var allowed = {
        ip: ["mine", "brand_full", "unclear"],
        cancel: ["no", "yes"],
        usageWords: ["specific", "all_media", "unclear"],
        exclRenew: ["no", "yes"],
        payMetrics: ["no", "yes"],
        morals: ["none", "mutual", "one_sided"],
        paySchedule: ["yes", "no"],
        approval: ["defined", "vague"],
        ftc: ["yes", "no"],
        scope: ["no", "yes"]
      }[k];
      deal.contract[k] = allowed.indexOf(c[k]) >= 0 ? c[k] : CONTRACT_DEFAULTS[k];
    });
    if (!(d.followers > 0)) errors.push("followers must be above 0");
    if (!(d.offerUsd > 0)) errors.push("offer_usd must be above 0");
    return { ok: errors.length === 0, errors: errors, deal: deal };
  }

  /* ---------- (a) rate-card evaluation ---------- */
  function benchmarkRange(rateCard, tier, platform) {
    var tiers = rateCard.per_video_or_post_by_tier || {};
    var t = tiers[tier] || {};
    var r = t[platform];
    return (r && r.length === 2) ? [r[0], r[1]] : null;
  }

  /* Implied-CPM band for the deliverable — straight from the rate card's
   * sponsored_cpms, plus the labeled rule-of-thumb dedicated band. */
  function cpmBand(rateCard, platform, deliverable) {
    var cpms = rateCard.sponsored_cpms || {};
    if (platform === "youtube" && deliverable === "integrated" && cpms.youtube_integrated_slot) {
      return { lo: cpms.youtube_integrated_slot[0], hi: cpms.youtube_integrated_slot[1],
               label: "YouTube integrated slot $20–$35 CPM", basis: "reported" };
    }
    if (platform === "instagram" && deliverable === "short" && cpms.ig_sponsored_reel_median) {
      return { lo: cpms.tiktok_youtube_general[0], hi: cpms.tiktok_youtube_general[1],
               label: "IG sponsored Reel median $22.40 CPM (general range $10–$30)", basis: "reported" };
    }
    if (platform === "youtube" && deliverable === "short" && cpms.youtube_general) {
      return { lo: cpms.youtube_general[0], hi: cpms.youtube_general[1],
               label: "YouTube general $15–$40 CPM", basis: "reported" };
    }
    if (deliverable === "dedicated") {
      /* Fresh Oct-2026 research (AIR's agency-benchmark compilation) reports
       * dedicated video at $50–$90 CPM — the wave-3 tool carried this number;
       * the site's older $20–$50 rule of thumb stays in the revenue
       * calculator. The analyzer uses the reported benchmark here. */
      return { lo: 50, hi: 90,
               label: "Dedicated video $50–$90 CPM (AIR agency-benchmark compilation, Oct 2026)",
               basis: "reported" };
    }
    var g = cpms.tiktok_youtube_general || [10, 30];
    return { lo: g[0], hi: g[1], label: "General sponsored CPM $10–$30", basis: "reported" };
  }

  function evaluate(deal, rateCard) {
    var tier = tierOf(deal.followers);
    var range = benchmarkRange(rateCard, tier, deal.platform);
    var nm = nicheMult(deal.niche);
    /* Niche-adjusted range: the verdict is read against what the benchmarks
     * say YOUR niche pays, not the all-niche base band. */
    var adjRange = range ? [nice(range[0] * nm.mult), nice(range[1] * nm.mult)] : null;
    var verdict, verdictText;
    if (!adjRange) {
      verdict = "unknown";
      verdictText = "No benchmark range for this tier/platform — the rate card doesn't cover it.";
    } else if (deal.offerUsd < adjRange[0]) {
      verdict = "UNDERPAID";
      verdictText = "Underpaid — below the range floor. The 2026 benchmarks say " +
        TIER_LABELS[tier] + " " + PLATFORM_LABELS[deal.platform] + " " +
        DELIVERABLE_LABELS[deal.deliverable].toLowerCase() + "s" +
        (nm.label ? " in " + nm.label : "") + " typically land " +
        fmt(adjRange[0]) + "–" + fmt(adjRange[1]) + ".";
    } else if (deal.offerUsd > adjRange[1]) {
      verdict = "STRONG";
      verdictText = "Strong — above the range ceiling. " + fmt(adjRange[0]) + "–" +
        fmt(adjRange[1]) + " is the " + TIER_LABELS[tier] + " " +
        PLATFORM_LABELS[deal.platform] + (nm.label ? " " + nm.label : "") +
        " benchmark band.";
    } else {
      verdict = "FAIR";
      verdictText = "Fair — inside the benchmark range (" + fmt(adjRange[0]) + "–" +
        fmt(adjRange[1]) + "). Benchmarks disagree 2–3x within tiers; niche and engagement move numbers as much as followers.";
    }

    var implied = null;
    if (deal.expectedViews > 0 && deal.offerUsd > 0) {
      var band = cpmBand(rateCard, deal.platform, deal.deliverable);
      var value = deal.offerUsd / deal.expectedViews * 1000;
      implied = {
        value: value,
        band: band,
        position: value < band.lo ? "below" : value > band.hi ? "above" : "inside"
      };
    }

    /* Category cross-check (fresh Oct-2026 research): what sponsors pay per
     * 1K views in YOUR category, translated into dollars at the expected
     * view count — a second lens beside the tier verdict. */
    var categoryCheck = null;
    var cat = categoryCpm(deal.niche);
    if (cat && deal.expectedViews > 0) {
      var catValue = nice(deal.expectedViews / 1000 * cat.cpm);
      var ratio = catValue > 0 ? deal.offerUsd / catValue : 1;
      categoryCheck = {
        category: cat.category, cpm: cat.cpm, source: cat.source,
        impliedValue: catValue,
        position: ratio < 0.8 ? "below" : ratio > 1.2 ? "above" : "near"
      };
    }
    /* Cross-platform context: the same tier's ranges on the other two
     * platforms, with the 1.7x / 0.85x multipliers named as the wave-1
     * research behind them. */
    var mults = rateCard.platform_multipliers_at_equal_followers || {};
    var crossPlatform = PLATFORMS.filter(function (p) { return p !== deal.platform; })
      .map(function (p) {
        return { platform: p, label: PLATFORM_LABELS[p],
                 range: benchmarkRange(rateCard, tier, p) };
      });
    var multNote = "At equal followers the 2026 benchmarks price YouTube ≈" +
      (mults.youtube || 1.7) + "× Instagram and TikTok ≈" +
      (mults.tiktok || 0.85) + "× (platform_multipliers_at_equal_followers — " +
      "wave-1 research, kept labeled).";

    /* Expected landing zone: listed rates run ~23% above accepted rates, so
     * a top-of-range quote of $hi lands near $hi/1.23. The benchmark's math,
     * not a promise. */
    var expectedClose = adjRange ? nice(adjRange[1] / (1 + LISTED_VS_ACCEPTED)) : null;

    return {
      tier: tier, tierLabel: TIER_LABELS[tier],
      platform: deal.platform, platformLabel: PLATFORM_LABELS[deal.platform],
      deliverable: deal.deliverable, deliverableLabel: DELIVERABLE_LABELS[deal.deliverable],
      range: adjRange, baseRange: range,
      niche: deal.niche, nicheLabel: nm.label, nicheNote: nm.note, nicheMult: nm.mult,
      verdict: verdict, verdictText: verdictText,
      impliedCpm: implied, categoryCheck: categoryCheck,
      crossPlatform: crossPlatform, multNote: multNote,
      expectedClose: expectedClose,
      disclaimer: "Negotiation ranges, not quotes. Benchmarks compiled from 2026 third-party data — they disagree 2–3x within tiers. Not financial advice."
    };
  }

  /* ---------- offer-terms scan (usage / whitelisting / exclusivity / pay) ---------- */
  function offerTermFlags(deal) {
    var flags = [];
    function flag(kind, title, detail) { flags.push({ kind: kind, title: title, detail: detail }); }

    if (deal.usage === "perpetual") {
      flag("bad", "Perpetual usage rights",
        "The single most-neglected line item. A perpetual paid-ads license turns your post into the brand's permanent ad creative — price it as its OWN line item from 2x the base fee, or refuse it.");
    } else if (deal.usage === "paid_12mo") {
      flag("warn", "6–12 month paid-ads window",
        "2026 benchmarks: +75–100% on top of the post fee as a separate line item. Cap it in writing — don't let 'a year' drift into 'forever'.");
    } else if (deal.usage === "paid_6mo") {
      flag("warn", "3–6 month paid-ads window",
        "2026 benchmarks: +50–75% on top of the post fee, separate line item, hard end date in the contract.");
    } else if (deal.usage === "paid_3mo") {
      flag("ok", "3-month paid-ads window",
        "A reasonable paid-ads ask — 2026 benchmarks: +25–50% on top of the post fee as a separate line item.");
    }

    if (deal.whitelisting === "perpetual") {
      flag("bad", "Perpetual whitelisting",
        "Indefinite ad spend off your account and face. Whitelisting is always a monthly premium, always revocable — perpetual is a red line.");
    } else if (deal.whitelisting === "90") {
      flag("warn", "31–90 day whitelisting",
        "2026 benchmarks: 30–100% of the base fee PER MONTH, priced separately. Hard end date, keep kill-switch access.");
    } else if (deal.whitelisting === "30") {
      flag("ok", "Up to 30-day whitelisting",
        "A normal premium ask — price it monthly, separately from the post fee, revocable.");
    }

    if (deal.exclusivity === "broad") {
      flag("bad", "Broad / category exclusivity, 6+ months",
        "This kills other sponsor revenue for half a year. Narrow it to named competitors with a hard end date, or demand a premium that actually covers the lost deals.");
    } else if (deal.exclusivity === "90") {
      flag("warn", "60–90 day exclusivity",
        "+25% is the floor for 30 days of exclusivity (Phase 5 pricing lever) — 60–90 days needs more; we model +50% as the working rule. Narrow the competitor list in writing.");
    } else if (deal.exclusivity === "30") {
      flag("warn", "30-day exclusivity",
        "+25% on the base fee is the floor (Phase 5 pricing lever). Name the competitors, set the end date.");
    }

    if (deal.paymentTerms === "90") {
      flag("bad", "Net 90+ payment terms",
        "Net-90 means you are financing the brand's marketing for a quarter. Counter with net-30 and 50% upfront.");
    } else if (deal.paymentTerms === "60") {
      flag("warn", "Net 60 payment terms",
        "Two months is standard for agencies, not for you. Ask net-30 — and 50% upfront from any brand you haven't worked with.");
    }

    if (deal.timeline === "rush") {
      flag("warn", "Rush timeline",
        "Rush turnarounds are a pricing lever — decide the rush premium before the call, not during it, and get the delivery date in writing.");
    } else if (deal.timeline === "unknown") {
      flag("warn", "No delivery date",
        "Get the delivery date in writing. Vague timelines become rush timelines — and rush timelines without a premium become free work.");
    }

    if (!flags.length) {
      flags.push({ kind: "ok", title: "No structural offer red flags",
        detail: "Usage, whitelisting, exclusivity, payment terms, and timeline all look sane. Price the post itself next." });
    }
    return flags;
  }

  /* ---------- (b) wave-22 contract checklist, applied to the deal ----------
   * Maps the deal's contract answers onto deal-templates.json contract_flags,
   * then scores with the same rules as the Outreach Center (single data
   * source for flags + scoring: api/v1/deal-templates.json). */
  function mapTermsToFlags(deal) {
    var c = deal.contract || {};
    var ids = [];
    function on(cond, id) { if (cond && ids.indexOf(id) < 0) ids.push(id); }
    on(c.ip === "brand_full", "ip_assignment");
    on(c.ip === "unclear", "usage_vague_all_media");
    on(c.cancel === "yes", "termination_one_sided");
    on(c.usageWords === "all_media" || c.usageWords === "unclear", "usage_vague_all_media");
    on(c.exclRenew === "yes" && deal.exclusivity !== "none", "exclusivity_auto_renew");
    on(c.payMetrics === "yes", "payment_on_metrics");
    on(c.morals === "one_sided", "moral_clause_one_sided");
    on(c.paySchedule === "no", "no_payment_schedule");
    on(c.approval === "vague", "approval_no_timeline");
    on(c.ftc === "no", "no_ftc_disclosure");
    on(c.scope === "yes", "scope_creep_language");
    return ids;
  }

  function contractRisk(flagIds, flags) {
    var byId = {};
    (flags || []).forEach(function (f) { byId[f.id] = f; });
    var walkAway = [], items = [], score = 0;
    (flagIds || []).forEach(function (id) {
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
      verdictText = "Don't sign as written — a walk-away clause is in play (" +
        walkAway.map(function (f) { return f.title; }).join("; ") +
        "), and no price fixes a hostile structure. Send it back with the fixes below.";
    } else if (score >= 3) {
      verdict = "dont_sign";
      verdictText = "Don't sign as written — the flagged terms stack up (" + score +
        " points) to a contract that can cost you more than the deal pays. Renegotiate the fixes below first.";
    } else if (score >= 1) {
      verdict = "caution";
      verdictText = "Caution — fix the flagged terms in writing before you sign (" + score +
        " point" + (score === 1 ? "" : "s") + "). Nothing here is fatal, but unwritten terms always favor the brand.";
    } else {
      verdict = "clean";
      verdictText = "Clean — no structural contract flags triggered. Price the post next, and keep usage rights as separate line items.";
    }
    return {
      score: score,
      verdict: verdict,
      verdictText: verdictText,
      items: items,
      disclaimer: "A negotiation aid, NOT legal advice. Contracts above $500 deserve a real lawyer's eyes."
    };
  }

  /* ---------- (d) usage-rights add-on math (2026 benchmarks) ---------- */
  function usageAddons(base, benchmarks) {
    var tiers = (benchmarks && benchmarks.tiers) || [];
    return tiers.map(function (t) {
      var pct = t.addon_pct || [0, 0];
      return {
        id: t.id,
        label: t.label,
        note: t.note,
        lo: nice(base * (pct[0] || 0) / 100),
        hi: pct[1] == null ? null : nice(base * pct[1] / 100)
      };
    });
  }

  /* ---------- (c) counter-offer calculator ---------- */
  function counterOffer(deal, rateCard, benchmarks) {
    var ev = evaluate(deal, rateCard);
    if (!ev.range) return { error: "no benchmark range", evaluation: ev };
    var base = nice(ev.range[1]); /* quote at the top; creators list ~23% above what they accept */
    var lines = [];
    function line(label, detail, lo, hi, basis) {
      lines.push({ label: label, detail: detail, lo: lo, hi: hi, basis: basis });
    }

    line("Base post fee: " + fmt(base),
      "Top of your " + ev.tierLabel + " " + ev.platformLabel + " range (" +
      fmt(ev.range[0]) + "–" + fmt(ev.range[1]) + ", " + ev.deliverableLabel.toLowerCase() +
      "). Quote high — benchmarks show creators list ~23% above what they accept.",
      base, base, "benchmark");

    /* usage-rights add-ons: the 2026 benchmark ranges, computed on the base */
    var addons = usageAddons(base, benchmarks);
    var chosen = null;
    addons.forEach(function (a) { if (a.id === deal.usage) chosen = a; });
    if (chosen && deal.usage !== "organic_only") {
      line("Usage rights — " + chosen.label + ": " + fmtRange(chosen.lo, chosen.hi),
        "2026 usage-rights benchmarks, on top of the base fee as a separate line item. " + chosen.note,
        chosen.lo, chosen.hi, "benchmark_2026");
    } else if (deal.usage === "perpetual" && chosen) {
      line("Usage rights — " + chosen.label + ": " + fmtRange(chosen.lo, chosen.hi),
        chosen.note + " Perpetual usage is priced as its OWN line item or refused outright.",
        chosen.lo, chosen.hi, "benchmark_2026");
    }

    /* whitelisting: 30–100% of the base fee per month (2026 benchmarks) */
    var wlMonths = { "30": 1, "90": 3 }[deal.whitelisting];
    if (wlMonths) {
      var pcts = (benchmarks && benchmarks.whitelisting_per_month_pct) || [30, 100];
      var wlLo = nice(base * pcts[0] / 100 * wlMonths);
      var wlHi = nice(base * pcts[1] / 100 * wlMonths);
      line("Whitelisting (" + wlMonths + (wlMonths === 1 ? " month" : " months") + "): " + fmtRange(wlLo, wlHi),
        "2026 benchmarks: 30–100% of the base fee per month, separate line item, revocable.",
        wlLo, wlHi, "benchmark_2026");
    } else if (deal.whitelisting === "perpetual") {
      line("Whitelisting (perpetual) — no number: refuse or re-scope",
        "Whitelisting is always a monthly premium, always revocable. Perpetual whitelisting is a red line, not a line item.",
        0, null, "rule");
    }

    /* exclusivity: 30d +25% (Phase 5 pricing lever); 60–90d +50% working rule */
    if (deal.exclusivity === "30") {
      var ex30 = nice(base * 0.25);
      line("30-day exclusivity: " + fmt(ex30),
        "+25% on the base fee — the Phase 5 pricing lever. Name the competitors, set the end date.",
        ex30, ex30, "chapter");
    } else if (deal.exclusivity === "90") {
      var ex90 = nice(base * 0.50);
      line("60–90 day exclusivity: " + fmt(ex90),
        "The working rule: 60–90 days needs more than the 30-day floor — modeled at +50% as a planning figure. Narrow the competitor list in writing.",
        ex90, ex90, "rule_of_thumb");
    } else if (deal.exclusivity === "broad") {
      line("Broad exclusivity — no number: narrow it or demand a premium",
        "A category lock kills other sponsor revenue for 6+ months. Narrow to named competitors with a hard end date, or demand a premium that actually covers the lost deals.",
        0, null, "rule");
    }

    var totalLo = 0, totalHi = 0, open = false;
    lines.forEach(function (l) {
      totalLo += (l.lo || 0);
      if (l.hi == null) open = true; else totalHi += l.hi;
    });

    var bundleNote = null;
    if (deal.postCount >= 3) {
      bundleNote = deal.postCount + "-post bundle: 3+ posts typically get 15–20% off " +
        "(projectcasting 2026) and 41% of creators offer package discounts — price the bundle " +
        "from the per-post counter above, then discount deliberately, not by accident.";
    }

    return {
      evaluation: ev,
      base: base,
      expectedClose: ev.expectedClose,
      expectedCloseNote: "The 23% benchmark's math: a top-of-range quote of " + fmt(base) +
        " lands near " + fmt(ev.expectedClose) + " (" + fmt(base) + " ÷ 1.23). The benchmark's landing zone, not a promise.",
      lines: lines,
      totalLo: totalLo,
      totalHi: open ? null : totalHi,
      totalLabel: open ? fmtRange(totalLo, null) : fmtRange(totalLo, totalHi),
      bundleNote: bundleNote,
      disclaimer: "A negotiation aid, not financial advice. Counter from the top of the range; decide your walk-away rate before the call, not during it."
    };
  }

  /* ---------- (e) export: the full evaluation as shareable plaintext ----------
   * analysis = { brand, deal, evaluation, termFlags, contractFlagIds,
   *              contractRisk, counter } — everything the UI renders. */
  function exportReport(a) {
    var L = [];
    var ev = a.evaluation, co = a.counter, cr = a.contractRisk;
    L.push("DEAL EVALUATION — " + (a.brand || "unsaved deal"));
    L.push("Generated by The Deal Analyzer (Creator Growth Empire). " +
           "Benchmarks are 2026 reported ranges, not quotes.");
    L.push("");
    L.push("THE TERMS");
    L.push("  Platform: " + ev.platformLabel + " · " + ev.deliverableLabel +
           " · " + ev.tierLabel);
    L.push("  Offered: " + fmt(a.deal.offerUsd) +
           (a.deal.expectedViews > 0 ? " · expected views: " +
             Math.round(a.deal.expectedViews).toLocaleString("en-US") : "") +
           " · posts: " + a.deal.postCount);
    L.push("  Usage: " + (USAGE_LABELS[a.deal.usage] || a.deal.usage) +
           " · whitelisting: " + a.deal.whitelisting +
           " · exclusivity: " + a.deal.exclusivity +
           " · payment: net-" + a.deal.paymentTerms);
    L.push("");
    L.push("RATE-CARD VERDICT: " + ev.verdict);
    L.push("  " + ev.verdictText);
    L.push("  Benchmark range: " + fmt(ev.range[0]) + "–" + fmt(ev.range[1]));
    if (ev.impliedCpm) {
      L.push("  Implied CPM: $" + ev.impliedCpm.value.toFixed(2) + " (" +
             ev.impliedCpm.position + " " + ev.impliedCpm.band.label + ")");
    }
    if (ev.categoryCheck) {
      L.push("  Category check (" + ev.categoryCheck.source + "): " +
             ev.categoryCheck.category + " sponsors pay ~$" + ev.categoryCheck.cpm +
             "/1K views → at the expected views that's ~" +
             fmt(ev.categoryCheck.impliedValue) + " of category-rate value (" +
             ev.categoryCheck.position + " your " + fmt(a.deal.offerUsd) + " offer).");
    }
    L.push("  Expected landing zone: " + fmt(ev.expectedClose) +
           " (the 23% listed-above-accepted benchmark's math)");
    L.push("  " + ev.multNote);
    L.push("");
    L.push("OFFER-TERM FLAGS (" + a.termFlags.length + ")");
    a.termFlags.forEach(function (f) {
      L.push("  [" + f.kind.toUpperCase() + "] " + f.title + " — " + f.detail);
    });
    L.push("");
    L.push("CONTRACT CHECKLIST: " + cr.verdict.toUpperCase().replace(/_/g, " ") +
           " (" + cr.score + " points)");
    L.push("  " + cr.verdictText);
    cr.items.forEach(function (it) {
      L.push("  [" + it.severity.toUpperCase().replace(/_/g, " ") + "] " +
             it.title + " — Fix: " + it.fix);
    });
    L.push("  " + cr.disclaimer);
    L.push("");
    L.push("COUNTER-OFFER");
    co.lines.forEach(function (ln) {
      L.push("  - " + ln.label);
      L.push("    " + ln.detail);
    });
    L.push("  Counter total: " + co.totalLabel);
    L.push("  " + co.expectedCloseNote);
    if (co.bundleNote) L.push("  " + co.bundleNote);
    L.push("  " + co.disclaimer);
    L.push("");
    L.push(ev.disclaimer);
    L.push("Decide your walk-away rate before the call, not during it.");
    return L.join("\n");
  }

  /* ---------- (f) comparison mode: two saved deals, side by side ----------
   * Each snapshot: { brand, savedAt, deal, verdict, range, expectedClose,
   *                  counterTotalLabel, contractVerdict, flagCount }. */
  var COMPARE_TERMS = [
    ["platform", "Platform"], ["deliverable", "Deliverable"],
    ["followers", "Followers"], ["offerUsd", "Offered ($)"],
    ["expectedViews", "Expected views"], ["usage", "Usage rights"],
    ["whitelisting", "Whitelisting"], ["exclusivity", "Exclusivity"],
    ["paymentTerms", "Payment terms"], ["timeline", "Timeline"],
    ["postCount", "Posts"]
  ];

  function compareDeals(A, B) {
    function cell(s, key) {
      return key === "verdict" ? s.verdict
        : key === "range" ? fmt(s.range[0]) + "–" + fmt(s.range[1])
        : key === "expectedClose" ? fmt(s.expectedClose)
        : key === "counter" ? s.counterTotalLabel
        : key === "contract" ? s.contractVerdict.replace(/_/g, " ") +
            " (" + s.flagCount + " flags)"
        : String(s.deal[key]);
    }
    var rows = [
      ["Verdict", "verdict"], ["Benchmark range", "range"],
      ["Expected close", "expectedClose"], ["Counter total", "counter"],
      ["Contract checklist", "contract"]
    ].map(function (r) {
      return { label: r[0], a: cell(A, r[1]), b: cell(B, r[1]),
               differs: cell(A, r[1]) !== cell(B, r[1]) };
    });
    var differingTerms = [];
    COMPARE_TERMS.forEach(function (t) {
      var key = t[0];
      var va = key === "offerUsd" || key === "followers" || key === "expectedViews"
        ? Math.round(A.deal[key]).toLocaleString("en-US") : String(A.deal[key]);
      var vb = key === "offerUsd" || key === "followers" || key === "expectedViews"
        ? Math.round(B.deal[key]).toLocaleString("en-US") : String(B.deal[key]);
      if (va !== vb) differingTerms.push({ term: t[1], a: va, b: vb });
    });
    return { rows: rows, differingTerms: differingTerms };
  }

  return {
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED,
    tierOf: tierOf,
    nice: nice,
    fmt: fmt,
    fmtRange: fmtRange,
    validInput: validInput,
    benchmarkRange: benchmarkRange,
    nicheMult: nicheMult,
    categoryCpm: categoryCpm,
    evaluate: evaluate,
    offerTermFlags: offerTermFlags,
    mapTermsToFlags: mapTermsToFlags,
    contractRisk: contractRisk,
    usageAddons: usageAddons,
    counterOffer: counterOffer,
    exportReport: exportReport,
    compareDeals: compareDeals,
    DISCLAIMER: "A negotiation aid — not financial, legal, or tax advice."
  };
});
