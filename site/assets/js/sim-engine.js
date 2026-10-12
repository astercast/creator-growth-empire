/* Empire Simulator — pure simulation engine (no DOM).
 * UMD: works in the browser (window.EmpireSim) and in node (module.exports).
 *
 * HONESTY CONTRACT: this is a model, not a prediction. Every assumption is
 * named, sourced, and listed in DEFAULTS / the on-page assumptions drawer.
 * Platform figures come from calculators.json (2026 third-party research).
 * Nothing here invents platform numbers.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.EmpireSim = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- assumptions: named, tweakable, displayed on-page ---------- */
  var DEFAULTS = {
    // Base monthly compounding subscriber growth at reference cadence.
    // Assumption: user-adjustable on the page (slider). Labeled as such.
    baseGrowthRate: 0.12,

    // Niche "competition factor": how much harder/easier growth is per niche.
    // ASSUMPTION — not from any platform dataset; displayed as ours.
    nicheGrowth: {
      finance_investing: 0.9,
      tech_software: 0.92,
      education: 1.0,
      health_fitness: 1.0,
      lifestyle: 1.05,
      comedy_entertainment: 1.08,
      gaming: 1.1,
      music: 1.05
    },

    // Quality/effort level multiplier. ASSUMPTION — labeled "our guess" on-page.
    qualityMult: { low: 0.7, solid: 1.0, excellent: 1.35 },

    // Cadence: weekly long-form (weight 0.12 each) + shorts (weight 0.03 each),
    // capped at 2.5x. ASSUMPTION — posting more helps, with diminishing logic.
    cadencePerLongform: 0.12,
    cadencePerShort: 0.03,
    cadenceCap: 2.5,

    // Views per subscriber per month, per format. ASSUMPTIONS — visible on page.
    viewsPerSubLong: 0.35,
    viewsPerSubShort: 2.0,

    // Monetization floor: simplified YPP gate (1,000 subs = ad revenue unlock).
    // Assumption: ignores the watch-hours gate — stated on the page.
    monetizedAtSubs: 1000,

    // Shorts RPM: midpoint of the calculators.json Shorts band [0.04, 0.50].
    // Q4 uplift: months 10-12 of the 12-month run, +60% (mid of +40-80% band
    // in calculators.json). Assumption slider on page (40-80%).
    shortsRpmMid: 0.27,
    q4Uplift: 0.6,
    q4Months: [10, 11, 12],

    // Sponsors: tiers from sponsorship_rate_card_2026, YouTube per-video ranges.
    // Deals/month are OUR conservative assumptions — labeled on page.
    sponsorTiers: [
      { id: "mega",  minSubs: 1000000, dealsPerMonth: 3,   perDealRange: [50000, 300000] },
      { id: "macro", minSubs: 100000,  dealsPerMonth: 2,   perDealRange: [10000, 50000] },
      { id: "micro", minSubs: 10000,   dealsPerMonth: 1,   perDealRange: [1000, 10000] },
      { id: "nano",  minSubs: 1000,    dealsPerMonth: 0.5, perDealRange: [25, 1000] }
    ],

    // Sponsor rate niche multiplier. SOURCED: calculators.json
    // sponsorship_rule_of_thumb.note — "finance/tech 2–3x, entertainment lower."
    sponsorNicheMult: {
      finance_investing: 2.5,
      tech_software: 2.5,
      education: 1.0,
      health_fitness: 1.0,
      lifestyle: 1.0,
      gaming: 0.6,
      comedy_entertainment: 0.6,
      music: 0.6
    },

    // Affiliates: $1 per 1,000 long-form views (conservative). ASSUMPTION.
    affiliatePer1kViews: 1.0,

    // Digital product: 0.1% of subs buy per month at $49, from launch month.
    // Conservative conversion ASSUMPTION — displayed and tweakable.
    digitalPrice: 49,
    digitalConvPerMonth: 0.001,

    months: 12,

    // Team hiring presets (wave 13). SOURCED: the site's "First Hire" guide
    // (2026 freelance-rate research, Oct 2026). monthlyCostDefault = the
    // mid-band "real number" from the guide; extraLongPerWeek = extra
    // long-form output the hire unlocks; qualityDelta = fractional bump to
    // the quality multiplier (packaging/retention lift). rampFactor = first
    // active month runs at 50% effect (ramp-up, labeled on-page).
    hireTypes: {
      editor:    { label: "Video editor",       monthlyCostDefault: 1400,
                   costBand: "$800–$2,000/mo", extraLongPerWeek: 1.0, qualityDelta: 0.12,
                   source: "First Hire guide: the $800–$2,000/mo 'real number' for a solid mid-level freelancer at ~4 long-form/mo" },
      thumbnail: { label: "Thumbnail designer", monthlyCostDefault: 120,
                   costBand: "$80–$160/mo", extraLongPerWeek: 0.0, qualityDelta: 0.08,
                   source: "First Hire guide: $80–$160/mo at 4 videos/mo (mid-tier $10–$25/thumbnail)" },
      va:        { label: "Virtual assistant",  monthlyCostDefault: 900,
                   costBand: "$500–$1,500/mo", extraLongPerWeek: 0.5, qualityDelta: 0.00,
                   source: "First Hire guide: $500–$1,500/mo for a 10–15 hr/wk offshore direct hire" }
    },
    rampFactor: 0.5,

    // Year-2 scaling (wave 13): after month 12, monthly growth decays by
    // this factor per month (compounding) — the "why most channels plateau"
    // curve. ASSUMPTION — labeled as ours, displayed on-page.
    year2Decay: 0.94,
    q4MonthsYear2: [22, 23, 24]
  };

  function mid(lo, hi) { return (lo + hi) / 2; }

  function tierForSubs(subs) {
    var tiers = DEFAULTS.sponsorTiers;
    for (var i = 0; i < tiers.length; i++) {
      if (subs >= tiers[i].minSubs) return tiers[i];
    }
    return null;
  }

  function rpmForBand(band, level) {
    if (level === "low") return band[0];
    if (level === "high") return band[1];
    return mid(band[0], band[1]);
  }

  /* ---------- scenario library (wave 13) ----------
   * Named, loadable starting configs built from the site's real research
   * data: 2026 RPM bands (calculators.json), the case files, and the
   * sponsored-stream rules. Every number here is an assumption or a sourced
   * band — labeled per scenario. scenarioInputs(id) returns a full,
   * ready-to-run inputs object (deep copy). */
  var SCENARIOS = [
    {
      id: "asmr-bedroom",
      name: "ASMR Bedroom Channel",
      tagline: "Low-RPM ambient content, high volume, slow-burn loyalty.",
      source: "Case File: Sleep Channels + the calculators.json RPM bands",
      nicheProxyNote: "ASMR is not an engine niche key, so proxies are declared: growth uses lifestyle 1.05x, RPM uses the lifestyle band at low ($4) — ambient content is low-RPM.",
      inputs: { niche: "lifestyle", startSubs: 800, longformPerWeek: 2, shortsPerWeek: 5,
        quality: "solid", growthRate: 0.13, rpmLevel: "low", q4Uplift: 0.6,
        ads: true, sponsors: false, affiliates: false,
        digital: true, digitalStartMonth: 6, digitalPrice: 29, digitalConvPerMonth: 0.001 }
    },
    {
      id: "tech-reviewer",
      name: "Tech Reviewer",
      tagline: "High RPM, sponsor-friendly — the money-per-view play.",
      source: "calculators.json: tech RPM band $8–$20 + the finance/tech 2–3x sponsor rule + OutlierKit 2026 integrated-sponsor CPMs (tech/reviews $25–$45)",
      inputs: { niche: "tech_software", startSubs: 1500, longformPerWeek: 1, shortsPerWeek: 3,
        quality: "solid", growthRate: 0.10, rpmLevel: "mid", q4Uplift: 0.6,
        ads: true, sponsors: true, affiliates: true,
        digital: false, digitalStartMonth: 6, digitalPrice: 49, digitalConvPerMonth: 0.001 }
    },
    {
      /* Wave 20: new — the 2027 outlook's fastest-rising search niche. Uses the
         real tech_software engine key; growth assumption reflects the 18x
         breakout reading (planning input, not a prediction). */
      id: "ai-tutorials",
      name: "AI Tutorials Channel",
      tagline: "Tutorial volume in the fastest-rising search niche of 2026.",
      source: "OutlierKit trending guide (Sep 2026): AI tutorials 18x growth, $15–22 CPM, medium-high competition + calculators.json tech band $8–$20 + Niche Atlas 2027 outlook (heating)",
      inputs: { niche: "tech_software", startSubs: 1000, longformPerWeek: 2, shortsPerWeek: 4,
        quality: "solid", growthRate: 0.12, rpmLevel: "mid", q4Uplift: 0.6,
        ads: true, sponsors: true, affiliates: true,
        digital: false, digitalStartMonth: 6, digitalPrice: 49, digitalConvPerMonth: 0.001 }
    },
    {
      id: "betrayal-dramas",
      name: "Betrayal Mini-Dramas",
      tagline: "Serialized short-form dramas: volume first, RPM later.",
      source: "calculators.json: entertainment band $1–$5 + the Phase 3 Shorts-first cadence + OutlierKit trending (Sep 2026): betrayal/revenge 21x breakout, $20–25 CPM, low competition (multi-source) + Niche Atlas 2027 outlook (heating). Shorts-first formats face the Feb-2027 10M qualified Shorts views/90d revenue floor.",
      inputs: { niche: "comedy_entertainment", startSubs: 2000, longformPerWeek: 1, shortsPerWeek: 7,
        quality: "solid", growthRate: 0.15, rpmLevel: "low", q4Uplift: 0.6,
        ads: true, sponsors: false, affiliates: false,
        digital: false, digitalStartMonth: 6, digitalPrice: 49, digitalConvPerMonth: 0.001 }
    },
    {
      id: "cooking-channel",
      name: "Home Cooking Channel",
      tagline: "Recipes + kitchen-gear affiliates + a recipe pack.",
      source: "Case File: Ben's Bites + calculators.json lifestyle band",
      inputs: { niche: "lifestyle", startSubs: 1000, longformPerWeek: 1, shortsPerWeek: 3,
        quality: "solid", growthRate: 0.11, rpmLevel: "mid", q4Uplift: 0.6,
        ads: true, sponsors: false, affiliates: true,
        digital: true, digitalStartMonth: 6, digitalPrice: 29, digitalConvPerMonth: 0.001 }
    },
    {
      id: "personal-finance",
      name: "Personal Finance (Zero to Budget)",
      tagline: "Competitive niche, top RPM band, sponsors pay the 2.5x.",
      source: "Case File: PTYA + calculators.json finance band $8–$35 + sponsor niche multiplier + OutlierKit Sep-2026 RPM table (personal finance $10–$25 RPM) + Niche Atlas 2027 outlook (stable)",
      inputs: { niche: "finance_investing", startSubs: 700, longformPerWeek: 1, shortsPerWeek: 2,
        quality: "solid", growthRate: 0.09, rpmLevel: "mid", q4Uplift: 0.6,
        ads: true, sponsors: true, affiliates: true,
        digital: true, digitalStartMonth: 6, digitalPrice: 49, digitalConvPerMonth: 0.001 }
    },
    {
      id: "fitness-coach",
      name: "Fitness Coach",
      tagline: "Training vlogs, affiliate gear, a program in month 9.",
      source: "calculators.json: health/fitness band $4–$10 + Phase 5 digital-product stack",
      inputs: { niche: "health_fitness", startSubs: 1200, longformPerWeek: 2, shortsPerWeek: 4,
        quality: "solid", growthRate: 0.12, rpmLevel: "mid", q4Uplift: 0.6,
        ads: true, sponsors: false, affiliates: true,
        digital: true, digitalStartMonth: 9, digitalPrice: 49, digitalConvPerMonth: 0.001 }
    },
    {
      /* Wave 17: modeled on a public case — inputs are planning assumptions,
         not a replay of the creator's historical trajectory. Proxies declared. */
      id: "serialized-mini-drama",
      name: "Serialized Mini-Drama",
      tagline: "Multi-part story arcs with cliffhangers; the backlog binges.",
      source: "Case File: The Poly Couple (Dana and the Wolf) — hundreds of episodes, TikTok/Instagram-first, picked up by Electric Now",
      nicheProxyNote: "Modeled on a real serialized micro-drama case. Uses the comedy_entertainment RPM band (a real engine niche key). Cadence is a forward-looking planning input, not the case's 5-year historical arc — the case documents years of shorts, this scenario models the batching discipline it took.",
      inputs: { niche: "comedy_entertainment", startSubs: 100, longformPerWeek: 1, shortsPerWeek: 4,
        quality: "solid", growthRate: 0.15, rpmLevel: "low", q4Uplift: 0.6,
        ads: true, sponsors: false, affiliates: false,
        digital: false, digitalStartMonth: 6, digitalPrice: 49, digitalConvPerMonth: 0.001 }
    },
    {
      /* Wave 17: modeled on a public case — inputs are planning assumptions,
         not a replay of the creator's historical trajectory. Proxies declared. */
      id: "asmr-roleplay",
      name: "ASMR Roleplay Channel",
      tagline: "Character-driven roleplays, longform volume, loyal binge audiences.",
      source: "Case File: Gibi ASMR — 0 to 5M subscribers over 8 years, ~2,000 videos",
      nicheProxyNote: "Modeled on a real ASMR creator case. ASMR is not an engine niche key, so proxies are declared: growth uses lifestyle 1.05x, RPM uses the lifestyle band at mid ($4–10) — roleplay ASMR sits mid-band per the atlas. The 8-year historical arc is not replayed; this is a 12-month planning sandbox.",
      inputs: { niche: "lifestyle", startSubs: 300, longformPerWeek: 2, shortsPerWeek: 3,
        quality: "solid", growthRate: 0.13, rpmLevel: "mid", q4Uplift: 0.6,
        ads: true, sponsors: true, affiliates: false,
        digital: false, digitalStartMonth: 6, digitalPrice: 29, digitalConvPerMonth: 0.001 }
    }
  ];

  function scenarioInputs(id) {
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === id) {
        var src = SCENARIOS[i].inputs, out = {};
        for (var k in src) out[k] = src[k];
        return out;
      }
    }
    return null;
  }

  /* hires: [{type: "editor"|"thumbnail"|"va", startMonth, monthlyCost}]
   * Normalized against DEFAULTS.hireTypes (unknown types dropped).
   * Missing monthlyCost falls back to the hire's honest preset default. */
  function normalizeHires(hires) {
    var out = [];
    if (!hires) return out;
    for (var i = 0; i < hires.length; i++) {
      var h = hires[i] || {};
      var t = DEFAULTS.hireTypes[h.type];
      if (!t) continue;
      var cost = h.monthlyCost != null ? h.monthlyCost : t.monthlyCostDefault;
      var start = h.startMonth != null ? Math.max(1, Math.min(24, Math.round(h.startMonth))) : 1;
      out.push({ type: h.type, label: t.label, startMonth: start,
                 monthlyCost: Math.max(0, cost) });
    }
    return out;
  }

  /* inputs: {
       niche, startSubs, longformPerWeek, shortsPerWeek, quality,
       growthRate, rpmLevel, q4Uplift,
       ads, sponsors, affiliates, digital, digitalStartMonth,
       digitalPrice, digitalConvPerMonth, affiliatePer1kViews,
       viewsPerSubLong, viewsPerSubShort,
       horizon (12|24, default 12), hires ([...] as above)
     }
     cfg: parsed calculators.json                                       */
  function simulate(inputs, cfg) {
    var d = DEFAULTS;
    var bands = cfg.youtube_longform_rpm_bands || {};
    var band = bands[inputs.niche] || [2, 10];
    var rpm = rpmForBand(band, inputs.rpmLevel || "mid");

    var nicheG = (d.nicheGrowth[inputs.niche] != null)
      ? d.nicheGrowth[inputs.niche] : 1.0;
    var qMult = d.qualityMult[inputs.quality] || 1.0;
    var baseLong = Math.max(0, inputs.longformPerWeek);
    var baseShorts = Math.max(0, inputs.shortsPerWeek);
    var cad = 1 + d.cadencePerLongform * baseLong + d.cadencePerShort * baseShorts;
    cad = Math.min(cad, d.cadenceCap);
    var baseRate = (inputs.growthRate != null ? inputs.growthRate : d.baseGrowthRate) * nicheG;
    var g = baseRate * cad * qMult;
    // No hires, no year-2: g is exactly the pre-wave-13 formula. Byte-identical
    // compounding when the wave-13 inputs (hires/horizon) are left default.

    var horizon = Math.max(1, Math.min(24, Math.round(inputs.horizon || d.months)));
    var year2 = horizon > 12;
    var hires = normalizeHires(inputs.hires);

    var vpsL = inputs.viewsPerSubLong != null ? inputs.viewsPerSubLong : d.viewsPerSubLong;
    var vpsS = inputs.viewsPerSubShort != null ? inputs.viewsPerSubShort : d.viewsPerSubShort;
    var uplift = inputs.q4Uplift != null ? inputs.q4Uplift : d.q4Uplift;
    var affRate = inputs.affiliatePer1kViews != null
      ? inputs.affiliatePer1kViews : d.affiliatePer1kViews;
    var digPrice = inputs.digitalPrice != null ? inputs.digitalPrice : d.digitalPrice;
    var digConv = inputs.digitalConvPerMonth != null
      ? inputs.digitalConvPerMonth : d.digitalConvPerMonth;

    var months = [];
    var subs = Math.max(0, inputs.startSubs || 0);
    var cum = { adsLong: 0, adsShorts: 0, sponsors: 0, affiliates: 0, digital: 0,
                total: 0, teamCost: 0, net: 0 };

    for (var m = 1; m <= horizon; m++) {
      // wave 13: hires reshape this month's effective cadence + quality,
      // year-2 applies the diminishing-returns decay. Defaults reproduce g.
      var gm = g;
      var qMultH = qMult;
      var teamCostM = 0;
      var activeHires = [];
      if (hires.length || year2) {
        var extraLong = 0, qDelta = 0;
        for (var h = 0; h < hires.length; h++) {
          if (m < hires[h].startMonth) continue;
          var t = d.hireTypes[hires[h].type];
          var ramp = (m === hires[h].startMonth) ? d.rampFactor : 1;
          extraLong += t.extraLongPerWeek * ramp;
          qDelta += t.qualityDelta * ramp;
          teamCostM += hires[h].monthlyCost;
          activeHires.push(hires[h].type);
        }
        if (extraLong || qDelta) {
          var cadH = 1 + d.cadencePerLongform * (baseLong + extraLong) +
                         d.cadencePerShort * baseShorts;
          cadH = Math.min(cadH, d.cadenceCap);
          qMultH = qMult * (1 + qDelta);
          gm = baseRate * cadH * qMultH;
        }
        if (m > 12) gm = gm * Math.pow(d.year2Decay, m - 12);
      }
      subs = subs * (1 + gm);
      var longViews = subs * vpsL;
      var shortViews = subs * vpsS;
      var monetized = subs >= d.monetizedAtSubs;
      var q4 = (d.q4Months.indexOf(m) !== -1 || d.q4MonthsYear2.indexOf(m) !== -1)
        ? (1 + uplift) : 1;

      var adsLong = (inputs.ads && monetized)
        ? (longViews / 1000) * rpm * q4 : 0;
      var adsShorts = (inputs.ads && monetized)
        ? (shortViews / 1000) * d.shortsRpmMid * q4 : 0;
      var tier = tierForSubs(subs);
      var spMult = (d.sponsorNicheMult[inputs.niche] != null)
        ? d.sponsorNicheMult[inputs.niche] : 1.0;
      var sponsor = (inputs.sponsors && tier)
        ? tier.dealsPerMonth * mid(tier.perDealRange[0], tier.perDealRange[1]) * spMult : 0;
      var sponsorPerDeal = tier ? mid(tier.perDealRange[0], tier.perDealRange[1]) * spMult : 0;
      var aff = inputs.affiliates ? (longViews / 1000) * affRate : 0;
      var dig = (inputs.digital && m >= (inputs.digitalStartMonth || 1))
        ? subs * digConv * digPrice : 0;
      var total = adsLong + adsShorts + sponsor + aff + dig;
      var net = total - teamCostM;

      cum.adsLong += adsLong; cum.adsShorts += adsShorts;
      cum.sponsors += sponsor; cum.affiliates += aff;
      cum.digital += dig; cum.total += total;
      cum.teamCost += teamCostM; cum.net += net;

      months.push({
        month: m,
        subs: subs,
        growthRate: gm,
        teamCost: teamCostM,
        net: net,
        activeHires: activeHires,
        longViews: longViews,
        shortViews: shortViews,
        monetized: monetized,
        q4UpliftApplied: q4 > 1,
        rpm: rpm,
        adsLong: adsLong,
        adsShorts: adsShorts,
        sponsor: sponsor,
        sponsorTier: tier ? tier.id : null,
        sponsorDeals: tier ? tier.dealsPerMonth : 0,
        sponsorPerDeal: sponsorPerDeal,
        affiliates: aff,
        digital: dig,
        total: total
      });
    }

    return {
      months: months,
      totals: cum,
      endSubs: subs,
      startSubs: Math.max(0, inputs.startSubs || 0),
      growthMultiple: subs > 0 && inputs.startSubs > 0 ? subs / inputs.startSubs : 0,
      milestones: computeMilestones(months),
      meta: {
        rpm: rpm, rpmBand: band, nicheGrowth: nicheG,
        qualityMult: qMult, cadenceMult: cad, monthlyGrowth: g,
        horizon: horizon, year2Decay: year2 ? d.year2Decay : null,
        hires: hires
      }
    };
  }

  function bestOf(res) {
    return res.months.reduce(function (a, b) { return b.total > a.total ? b : a; },
                             res.months[0]);
  }

  /* compare(): run two configs over the same clock, return deltas + a
   * plain-language verdict. Deltas are ALWAYS "B minus A" — documented and
   * asserted in tests. The verdict names the net-revenue winner, explains
   * the drivers from the two runs' meta, and carries the honesty caveat. */
  function compare(nameA, inputsA, nameB, inputsB, cfg) {
    var a = simulate(inputsA, cfg);
    var b = simulate(inputsB, cfg);
    var bestA = bestOf(a), bestB = bestOf(b);
    var deltas = {
      endSubs: b.endSubs - a.endSubs,
      grossRevenue: b.totals.total - a.totals.total,
      teamCost: b.totals.teamCost - a.totals.teamCost,
      netRevenue: b.totals.net - a.totals.net,
      bestMonth: bestB.total - bestA.total,
      milestones: b.milestones.length - a.milestones.length
    };
    var bWins = deltas.netRevenue >= 0;
    var winner = bWins ? nameB : nameA;
    var loser = bWins ? nameA : nameB;
    var margin = Math.abs(deltas.netRevenue) /
      Math.max(1, Math.abs((bWins ? a : b).totals.net));
    var drivers = [];
    if (a.meta.rpm !== b.meta.rpm) {
      drivers.push("RPM $" + a.meta.rpm.toFixed(2) + " vs $" + b.meta.rpm.toFixed(2));
    }
    if (a.meta.monthlyGrowth !== b.meta.monthlyGrowth) {
      drivers.push("monthly growth " + (a.meta.monthlyGrowth * 100).toFixed(1) + "% vs " +
        (b.meta.monthlyGrowth * 100).toFixed(1) + "%");
    }
    if (deltas.teamCost !== 0) {
      drivers.push("team spend $" + Math.round(a.totals.teamCost).toLocaleString("en-US") +
        " vs $" + Math.round(b.totals.teamCost).toLocaleString("en-US"));
    }
    if (Math.abs(deltas.endSubs) > 1 && ((bWins && deltas.endSubs < 0) || (!bWins && deltas.endSubs > 0))) {
      drivers.push("note: the net-revenue winner is NOT the subscriber winner — subscribers are not income");
    }
    var verdict = "Path " + winner + " leads on net revenue over " + a.meta.horizon + " months by " +
      (margin * 100).toFixed(0) + "% vs " + loser + ". " +
      (drivers.length ? "Why: " + drivers.join("; ") + ". " : "") +
      "Both are scenario models with stated assumptions — not predictions, not promises, not financial advice.";
    return { a: a, b: b, nameA: nameA, nameB: nameB, deltas: deltas, verdict: verdict };
  }

  /* assumptionLines(): the honest-assumptions panel as plain text —
   * shared by the UI compare view and the copy-my-empire-plan export so
   * the two can never drift apart. */
  function assumptionLines(inputs, res) {
    var d = DEFAULTS;
    var lines = [
      "Base growth " + ((inputs.growthRate != null ? inputs.growthRate : d.baseGrowthRate) * 100).toFixed(0) +
        "%/mo x niche " + res.meta.nicheGrowth + "x x cadence " + res.meta.cadenceMult.toFixed(2) +
        "x x quality " + res.meta.qualityMult + "x = " + (res.meta.monthlyGrowth * 100).toFixed(1) +
        "%/mo compounding (deterministic; no viral lottery)",
      "RPM $" + res.meta.rpm.toFixed(2) + " (" + (inputs.rpmLevel || "mid") + " of the $" +
        res.meta.rpmBand[0] + "-$" + res.meta.rpmBand[1] + " " + inputs.niche + " band)",
      "Q4 ad-rate uplift " + ((inputs.q4Uplift != null ? inputs.q4Uplift : d.q4Uplift) * 100).toFixed(0) +
        "% in months 10-12" + (res.meta.horizon > 12 ? " and 22-24" : "")
    ];
    if (res.meta.horizon > 12) {
      lines.push("Year 2: monthly growth decays x" + d.year2Decay + "/mo after month 12 (our diminishing-returns curve)");
    }
    var hires = normalizeHires(inputs.hires);
    if (hires.length) {
      hires.forEach(function (h) {
        var t = d.hireTypes[h.type];
        lines.push(t.label + " from month " + h.startMonth + ": $" +
          Math.round(h.monthlyCost).toLocaleString("en-US") + "/mo; +" +
          t.extraLongPerWeek + " long-form/wk, quality +" +
          Math.round(t.qualityDelta * 100) + "% (ramp month at 50%)");
      });
    } else {
      lines.push("No team hires — solo run (gross = net)");
    }
    return lines;
  }

  function fmtMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Math.round(n).toString();
  }

  /* exportPlan(): the "Copy my empire plan" text export — scenario, hires,
   * end-of-run numbers, every assumption, and the disclaimers. */
  function exportPlan(scenarioName, inputs, res) {
    var N = res.meta.horizon;
    var best = bestOf(res);
    var hires = normalizeHires(inputs.hires);
    var streams = [];
    if (inputs.ads) streams.push("ads");
    if (inputs.sponsors) streams.push("sponsors");
    if (inputs.affiliates) streams.push("affiliates");
    if (inputs.digital) streams.push("digital product");
    var lines = [
      "MY EMPIRE PLAN — Creator Growth Empire (a model, not a prediction)",
      "Scenario: " + scenarioName,
      "Setup: " + inputs.niche + " | " + Math.round(inputs.startSubs || 0) + " subs start | " +
        inputs.longformPerWeek + " long + " + inputs.shortsPerWeek + " shorts/wk | quality " +
        inputs.quality + " | " + N + "-month horizon",
      "Monetization: " + (streams.length ? streams.join(", ") : "none"),
      "Team: " + (hires.length
        ? hires.map(function (h) { return h.label + " ($" + Math.round(h.monthlyCost) +
            "/mo from M" + h.startMonth + ")"; }).join("; ")
        : "none (solo)"),
      "Month " + N + ": " + fmtCompact(res.endSubs) + " subs (" +
        (res.growthMultiple ? res.growthMultiple.toFixed(1) + "x" : "n/a") + ") | gross " +
        fmtMoney(res.totals.total) + " | team spend " + fmtMoney(res.totals.teamCost) +
        " | net " + fmtMoney(res.totals.net) + " | best month " + fmtMoney(best.total) + " (M" + best.month + ")",
      res.milestones.length
        ? "Milestones: " + res.milestones.map(function (m) { return m.label + " (M" + m.month + ")"; }).join("; ")
        : "Milestones: none hit — raise cadence, quality, or the growth assumption.",
      "ASSUMPTIONS:"
    ];
    assumptionLines(inputs, res).forEach(function (l) { lines.push("  - " + l); });
    lines.push("Model, not a prediction. Not financial, legal, or tax advice. Verify every platform number live before making decisions.");
    return lines.join("\n");
  }

  function computeMilestones(months) {
    var ms = [];
    var seen = {};
    function hit(key, month, label) {
      if (!seen[key]) { seen[key] = true; ms.push({ month: month, label: label }); }
    }
    months.forEach(function (mo) {
      if (mo.total >= 100) hit("m100", mo.month, "First $100 month");
      if (mo.total >= 1000) hit("m1k", mo.month, "First $1K month");
      if (mo.total >= 10000) hit("m10k", mo.month, "First $10K month");
      if (mo.subs >= 1000) hit("s1k", mo.month, "1K subs — ad revenue unlocks (YPP gate)");
      if (mo.subs >= 10000) hit("s10k", mo.month, "10K subs — micro-influencer tier");
      if (mo.subs >= 100000) hit("s100k", mo.month, "100K subs — macro tier");
      if (mo.subs >= 1000000) hit("s1m", mo.month, "1M subs — mega tier");
      if (mo.sponsorTier === "micro") hit("spMicro", mo.month, "First micro-tier sponsor deals");
      if (mo.sponsorTier === "macro") hit("spMacro", mo.month, "Macro-tier sponsor deals");
    });
    ms.sort(function (a, b) { return a.month - b.month; });
    return ms;
  }

  return {
    DEFAULTS: DEFAULTS,
    SCENARIOS: SCENARIOS,
    scenarioInputs: scenarioInputs,
    normalizeHires: normalizeHires,
    simulate: simulate,
    compare: compare,
    assumptionLines: assumptionLines,
    exportPlan: exportPlan,
    tierForSubs: tierForSubs,
    rpmForBand: rpmForBand
  };
});
