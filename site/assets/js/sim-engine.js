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

    months: 12
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

  /* inputs: {
       niche, startSubs, longformPerWeek, shortsPerWeek, quality,
       growthRate, rpmLevel, q4Uplift,
       ads, sponsors, affiliates, digital, digitalStartMonth,
       digitalPrice, digitalConvPerMonth, affiliatePer1kViews,
       viewsPerSubLong, viewsPerSubShort
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
    var cad = 1 + d.cadencePerLongform * Math.max(0, inputs.longformPerWeek) +
                  d.cadencePerShort * Math.max(0, inputs.shortsPerWeek);
    cad = Math.min(cad, d.cadenceCap);
    var g = (inputs.growthRate != null ? inputs.growthRate : d.baseGrowthRate) *
            nicheG * cad * qMult;

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
    var cum = { adsLong: 0, adsShorts: 0, sponsors: 0, affiliates: 0, digital: 0, total: 0 };

    for (var m = 1; m <= d.months; m++) {
      subs = subs * (1 + g);
      var longViews = subs * vpsL;
      var shortViews = subs * vpsS;
      var monetized = subs >= d.monetizedAtSubs;
      var q4 = d.q4Months.indexOf(m) !== -1 ? (1 + uplift) : 1;

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

      cum.adsLong += adsLong; cum.adsShorts += adsShorts;
      cum.sponsors += sponsor; cum.affiliates += aff;
      cum.digital += dig; cum.total += total;

      months.push({
        month: m,
        subs: subs,
        growthRate: g,
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
        qualityMult: qMult, cadenceMult: cad, monthlyGrowth: g
      }
    };
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
    simulate: simulate,
    tierForSubs: tierForSubs,
    rpmForBand: rpmForBand
  };
});
