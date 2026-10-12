/* Unit tests for the Empire Simulator engine. Run: node tests/sim-engine.test.js
 * Exit 0 = all pass. Sanity contract:
 *  1. higher cadence >= lower cadence revenue (same inputs otherwise)
 *  2. finance niche >= gaming niche revenue at equal inputs
 *  3. Q4 uplift applied in months 10-12
 *  4. sponsor tiers trigger at the right subscriber thresholds
 */
"use strict";
var path = require("path");
var sim = require(path.join("..", "assets", "js", "sim-engine.js"));
var cfg = require(path.join("..", "data", "calculators.json"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

function baseInputs(over) {
  var inp = {
    niche: "education",
    startSubs: 1000,
    longformPerWeek: 1,
    shortsPerWeek: 3,
    quality: "solid",
    growthRate: 0.12,
    rpmLevel: "mid",
    q4Uplift: 0.6,
    ads: true,
    sponsors: true,
    affiliates: true,
    digital: true,
    digitalStartMonth: 6,
    digitalPrice: 49,
    digitalConvPerMonth: 0.001,
    affiliatePer1kViews: 1.0,
    viewsPerSubLong: 0.35,
    viewsPerSubShort: 2.0
  };
  if (over) for (var k in over) inp[k] = over[k];
  return inp;
}

console.log("cadence sanity");
var lowCad = sim.simulate(baseInputs({ longformPerWeek: 1, shortsPerWeek: 0 }), cfg);
var highCad = sim.simulate(baseInputs({ longformPerWeek: 3, shortsPerWeek: 7 }), cfg);
ok(highCad.totals.total >= lowCad.totals.total,
  "higher cadence total revenue >= lower cadence (" +
  Math.round(highCad.totals.total) + " >= " + Math.round(lowCad.totals.total) + ")");
ok(highCad.endSubs >= lowCad.endSubs, "higher cadence end subs >= lower cadence");

console.log("niche revenue sanity (finance >= gaming at equal inputs)");
var fin = sim.simulate(baseInputs({ niche: "finance_investing" }), cfg);
var gam = sim.simulate(baseInputs({ niche: "gaming" }), cfg);
ok(fin.totals.total >= gam.totals.total,
  "finance total revenue >= gaming (" + Math.round(fin.totals.total) +
  " >= " + Math.round(gam.totals.total) + ")");

console.log("Q4 uplift");
var r = sim.simulate(baseInputs({ sponsors: false, affiliates: false, digital: false }), cfg);
var m9 = r.months[8], m10 = r.months[9], m12 = r.months[11];
ok(m10.q4UpliftApplied && m12.q4UpliftApplied && !m9.q4UpliftApplied,
  "uplift flag on months 10-12 only");
var perSub9 = m9.adsLong / m9.subs, perSub12 = m12.adsLong / m12.subs;
ok(perSub12 > perSub9 * 1.5,
  "Q4 ad revenue per sub uplifted vs month 9 (" +
  perSub12.toFixed(4) + " > " + perSub9.toFixed(4) + " x 1.5)");

console.log("sponsor tiers");
ok(sim.tierForSubs(500) === null, "no tier below 1K subs");
ok(sim.tierForSubs(5000).id === "nano", "5K subs -> nano tier");
ok(sim.tierForSubs(50000).id === "micro", "50K subs -> micro tier");
ok(sim.tierForSubs(200000).id === "macro", "200K subs -> macro tier");
ok(sim.tierForSubs(2000000).id === "mega", "2M subs -> mega tier");
// tier shows up in-month with expected deal math
var rr = sim.simulate(baseInputs({ startSubs: 49000, growthRate: 0.0, ads: false,
  affiliates: false, digital: false }), cfg);
ok(rr.months[0].sponsorTier === "micro" && rr.months[0].sponsorPerDeal === 5500,
  "50K-sub month bills micro tier at $5,500/deal mid (got " +
  rr.months[0].sponsorTier + " / " + rr.months[0].sponsorPerDeal + ")");

console.log("model shape");
ok(r.months.length === 12, "12 months simulated");
ok(r.meta.rpm > 0 && r.meta.monthlyGrowth > 0, "meta exposes rpm + growth");
ok(Array.isArray(r.milestones), "milestones computed");
var digitalOff = sim.simulate(baseInputs({ digital: false }), cfg);
var digitalOn = sim.simulate(baseInputs({ digital: true, digitalStartMonth: 1 }), cfg);
ok(digitalOn.months[0].digital > 0 && digitalOff.months[0].digital === 0,
  "digital product toggle + start month respected");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
