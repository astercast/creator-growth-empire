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


console.log("scenario library (wave 13)");
ok(sim.SCENARIOS.length >= 6, "6+ loadable scenarios (" + sim.SCENARIOS.length + ")");
sim.SCENARIOS.forEach(function (sc) {
  var inp = sim.scenarioInputs(sc.id);
  ok(inp !== null, "scenario '" + sc.id + "' loads to a full inputs object");
  var rs = sim.simulate(inp, cfg);
  ok(rs.months.length === 12 && isFinite(rs.endSubs) && isFinite(rs.totals.total),
    "scenario '" + sc.id + "' simulates 12 finite months (" +
    Math.round(rs.endSubs) + " subs, $" + Math.round(rs.totals.total) + ")");
  ok((cfg.youtube_longform_rpm_bands[inp.niche] || []).length === 2,
    "scenario '" + sc.id + "' niche '" + inp.niche + "' is a real calculators.json RPM band");
  ok(typeof sc.source === "string" && sc.source.length > 0,
    "scenario '" + sc.id + "' names its research source");
});
// library returns copies: mutating a load doesn't poison the next one
var copy = sim.scenarioInputs("asmr-bedroom");
copy.niche = "gaming";
ok(sim.scenarioInputs("asmr-bedroom").niche === "lifestyle",
  "scenarioInputs returns a deep copy (library not mutated)");
ok(sim.scenarioInputs("nope") === null, "unknown scenario id returns null");

console.log("hiring math (wave 13)");
var solo = sim.simulate(baseInputs({}), cfg);
var hired = sim.simulate(baseInputs({ hires: [{ type: "editor", startMonth: 4, monthlyCost: 1400 }] }), cfg);
ok(hired.totals.teamCost === 1400 * 9,
  "editor from month 4 costs 1400 x 9 = 12600 (got " + hired.totals.teamCost + ")");
ok(hired.months[3].activeHires.indexOf("editor") !== -1 && hired.months[2].activeHires.length === 0,
  "hire activates exactly from its start month");
ok(Math.abs(hired.totals.net - (hired.totals.total - hired.totals.teamCost)) < 1e-6,
  "net = gross - team cost every run");
ok(hired.endSubs > solo.endSubs,
  "editor's output+quality lift raises end subs (" + Math.round(hired.endSubs) +
  " > " + Math.round(solo.endSubs) + ")");
ok(solo.totals.teamCost === 0 && solo.totals.net === solo.totals.total,
  "no hires -> zero team cost, net equals gross (backwards compat)");
// ramp month: month 4 subs-lift is smaller than month 5's (50% ramp effect)
var lift4 = hired.months[3].subs - solo.months[3].subs;
var lift5 = hired.months[4].subs - solo.months[4].subs;
ok(lift5 > lift4 * 1.4,
  "ramp month at 50%: month-5 lift beats month-4 lift (" +
  lift5.toFixed(0) + " > " + lift4.toFixed(0) + " x 1.4)");
var mixed = sim.simulate(baseInputs({ hires: [
  { type: "thumbnail", startMonth: 2, monthlyCost: 120 },
  { type: "va", startMonth: 6, monthlyCost: 900 },
  { type: "ceo", startMonth: 1, monthlyCost: 99999 }
] }), cfg);
ok(mixed.totals.teamCost === 120 * 11 + 900 * 7,
  "two hires accumulate; unknown hire type dropped (got " + mixed.totals.teamCost + ")");
ok(mixed.months[5].activeHires.length === 2, "both hires active by month 6");
var defCost = sim.simulate(baseInputs({ hires: [{ type: "editor", startMonth: 1 }] }), cfg);
ok(defCost.totals.teamCost === sim.DEFAULTS.hireTypes.editor.monthlyCostDefault * 12,
  "missing monthlyCost falls back to the honest preset default");

console.log("comparison mode (wave 13)");
var inpA = sim.scenarioInputs("asmr-bedroom");
var inpB = sim.scenarioInputs("tech-reviewer");
var cmp = sim.compare("ASMR bedroom", inpA, "Tech reviewer", inpB, cfg);
ok(Math.abs(cmp.deltas.netRevenue - (cmp.b.totals.net - cmp.a.totals.net)) < 1e-6,
  "netRevenue delta = B minus A");
ok(Math.abs(cmp.deltas.endSubs - (cmp.b.endSubs - cmp.a.endSubs)) < 1e-6,
  "endSubs delta = B minus A");
ok(Math.abs(cmp.deltas.teamCost - (cmp.b.totals.teamCost - cmp.a.totals.teamCost)) < 1e-6,
  "teamCost delta = B minus A");
ok(/Path (ASMR bedroom|Tech reviewer) leads on net revenue/.test(cmp.verdict),
  "verdict names the net-revenue winner");
ok(/not predictions, not promises, not financial advice/.test(cmp.verdict),
  "verdict carries the honesty caveat");
var self = sim.compare("same", inpA, "same", inpA, cfg);
ok(self.deltas.netRevenue === 0 && self.deltas.endSubs === 0 &&
   self.deltas.grossRevenue === 0 && self.deltas.milestones === 0,
  "identical configs -> zero deltas");
// hires change the winner: solo vs solo+editor on the same config
var team = sim.compare("solo", baseInputs({}), "solo + editor",
  baseInputs({ hires: [{ type: "editor", startMonth: 1, monthlyCost: 1400 }] }), cfg);
ok(team.deltas.teamCost === 1400 * 12 && team.deltas.netRevenue !== 0,
  "solo-vs-team comparison prices the hire ($16,800) and moves net");

console.log("year-2 scaling (wave 13)");
var y2 = sim.simulate(baseInputs({ horizon: 24 }), cfg);
ok(y2.months.length === 24, "horizon 24 returns 24 months");
ok(y2.months[12].growthRate < y2.months[11].growthRate * 0.99,
  "month-13 growth below month-12 (diminishing returns kick in)");
ok(y2.months[12].growthRate > 0, "growth stays positive — plateau, not collapse");
ok(y2.meta.year2Decay === sim.DEFAULTS.year2Decay,
  "meta exposes the year-2 decay factor");
ok(y2.months[22].q4UpliftApplied && y2.months[9].q4UpliftApplied,
  "Q4 uplift applies in year 1 and year 2 (months 10-12, 22-24)");
ok(y2.months.length === 24 && y2.endSubs > solo.endSubs,
  "24-month run grows past the 12-month solo end");
var horizonCap = sim.simulate(baseInputs({ horizon: 99 }), cfg);
ok(horizonCap.months.length === 24, "horizon capped at 24");

console.log("assumptions + plan export (wave 13)");
var al = sim.assumptionLines(baseInputs({ hires: [{ type: "editor", startMonth: 4, monthlyCost: 1400 }] }), hired);
ok(Array.isArray(al) && al.length >= 4 && /Video editor/.test(al.join(" | ")),
  "assumptionLines lists the hire");
var al2 = sim.assumptionLines(baseInputs({ horizon: 24 }), y2);
ok(/year 2/i.test(al2.join(" ")), "assumptionLines labels the year-2 decay");
var plan = sim.exportPlan("Tech Reviewer", inpB, cmp.b);
ok(typeof plan === "string" && plan.indexOf("MY EMPIRE PLAN") === 0,
  "exportPlan opens with the plan header");
ok(plan.indexOf("Tech Reviewer") !== -1 && plan.indexOf("ASSUMPTIONS:") !== -1,
  "exportPlan names the scenario + assumptions block");
ok(/Not financial, legal, or tax advice/.test(plan),
  "exportPlan carries the not-financial/legal/tax-advice disclaimer");
ok(/a model, not a prediction/i.test(plan), "exportPlan says model-not-prediction");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
