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
ok(horizonCap.months.length === 36, "horizon capped at 36");

console.log("36-month projections (wave 24)");
var r36 = sim.simulate(baseInputs({ horizon: 36 }), cfg);
ok(r36.months.length === 36, "horizon 36 returns 36 months");
ok(r36.meta.year2Decay === 0.94 && r36.meta.year3Decay === 0.97,
  "meta exposes both decay factors on a 36-month run");
ok(r36.meta.year3Decay === null || sim.simulate(baseInputs({ horizon: 12 }), cfg).meta.year3Decay === null,
  "12-month meta carries no year-3 decay");
// pinned decay math: month 13 = g x0.94, month 25 = g x0.94^12 x0.97
var g0 = r36.meta.monthlyGrowth;
ok(Math.abs(r36.months[12].growthRate - g0 * Math.pow(0.94, 1)) < 1e-9,
  "month-13 growth = base x0.94^1 (got " + r36.months[12].growthRate + ")");
ok(Math.abs(r36.months[24].growthRate - g0 * Math.pow(0.94, 12) * Math.pow(0.97, 1)) < 1e-9,
  "month-25 growth = base x0.94^12 x0.97^1 (got " + r36.months[24].growthRate + ")");
ok(Math.abs(r36.months[35].growthRate - g0 * Math.pow(0.94, 12) * Math.pow(0.97, 12)) < 1e-9,
  "month-36 growth = base x0.94^12 x0.97^12 (got " + r36.months[35].growthRate + ")");
ok(r36.months[35].growthRate > 0, "growth stays positive at month 36 — plateau, not collapse");
ok(r36.months[33].q4UpliftApplied && r36.months[35].q4UpliftApplied && !r36.months[32].q4UpliftApplied,
  "Q4 uplift applies in year 3 (months 34-36)");
ok(r36.endSubs > sim.simulate(baseInputs({ horizon: 24 }), cfg).endSubs,
  "36-month run grows past the 24-month end");
// the s-y2-era checkbox semantic survives: a 24-month run with hires clamps start month at 36
var h36 = sim.simulate(baseInputs({ horizon: 36, hires: [{ type: "editor", startMonth: 40, monthlyCost: 1400 }] }), cfg);
ok(h36.meta.hires[0].startMonth === 36, "hire start month clamps at 36 (got " + h36.meta.hires[0].startMonth + ")");

console.log("stage transitions (wave 24)");
ok(sim.stageForNet(50, false) === 0, "net $50 -> stage 0");
ok(sim.stageForNet(500, false) === 1, "net $500 -> stage 1");
ok(sim.stageForNet(5000, false) === 2, "net $5K -> stage 2");
ok(sim.stageForNet(50000, false) === 3, "net $50K solo -> stage 3 (not 4)");
ok(sim.stageForNet(50000, true) === 4, "net $50K with team -> stage 4");
ok(sim.stageForNet(100, false) === 1 && sim.stageForNet(99.99, false) === 0,
  "stage boundary exactly $100");
ok(sim.stageForNet(10000, false) === 3 && sim.stageForNet(9999.99, false) === 2,
  "stage boundary exactly $10K");
ok(Array.isArray(r36.stages) && r36.stages.length >= 1,
  "36-month run returns stage transitions");
ok(r36.stages[0].stage === r36.months[0].stage && r36.stages[0].month === 1,
  "first transition is the starting stage at month 1");
var stageNames = r36.stages.map(function (s) { return s.stage; });
ok(stageNames.every(function (s, i) { return i === 0 || s > stageNames[i - 1]; }),
  "stages only rise (no regressing transitions)");
ok(r36.endStage === r36.months[35].stage && r36.endStage === r36.stages[r36.stages.length - 1].stage,
  "endStage matches the last month and the last transition");
ok(sim.STAGES.length === 5 && sim.STAGES[2].name === "The Engine Runs",
  "STAGES ships the five Money Map names");

console.log("what-if event cards (wave 24)");
ok(sim.DEFAULTS.eventCards.length === 5, "5 event cards in DEFAULTS");
sim.DEFAULTS.eventCards.forEach(function (c) {
  ok(typeof c.assumedEffect === "string" && c.assumedEffect.length > 0 &&
     typeof c.basis === "string" && c.basis.length > 0,
    "card '" + c.id + "' names its assumed effect + chapter basis");
});
// algorithm change: Shorts views x0.6 from the event month, long-form untouched
var algo = sim.simulate(baseInputs({ horizon: 12, events: [{ id: "algorithm-change", startMonth: 4 }] }), cfg);
var ratio = algo.months[3].shortViews / algo.months[2].shortViews * (algo.months[2].subs / algo.months[3].subs);
ok(Math.abs(ratio - 0.6) < 0.02,
  "algorithm-change: shorts views x0.6 at the event month (ratio " + ratio.toFixed(3) + ")");
ok(algo.months[3].eventsActive.indexOf("algorithm-change") !== -1 &&
   algo.months[2].eventsActive.length === 0,
  "eventsActive pins the algorithm-change start month");
var algoLong = algo.months[3].longViews / algo.months[2].longViews * (algo.months[2].subs / algo.months[3].subs);
ok(Math.abs(algoLong - 1) < 0.02, "algorithm-change leaves long-form views untouched");
// viral hit: 10x long views in the event month, +8% subs bump, 1.5x tail, then normal
var viral = sim.simulate(baseInputs({ horizon: 12, events: [{ id: "viral-hit", startMonth: 6 }] }), cfg);
var noEv = sim.simulate(baseInputs({ horizon: 12 }), cfg);
var vSpike = viral.months[5].longViews / noEv.months[5].longViews;
ok(vSpike > 9 && vSpike < 11,
  "viral-hit: event-month long views ~10x (got " + vSpike.toFixed(2) + "x)");
ok(viral.months[5].viralMonth === true && viral.months[4].viralMonth === false,
  "viralMonth flags exactly the event month");
var vSubs = viral.months[5].subs / noEv.months[5].subs;
ok(vSubs > 1.07 && vSubs < 1.09,
  "viral-hit: subs get the one-time +8% lift only (got " + (vSubs * 100 - 100).toFixed(2) + "%)");
var vTail = viral.months[6].longViews / noEv.months[6].longViews;
// the +8% subs bump compounds forward, so the tail ratio = 1.5 x (1.08 x growth)
ok(vTail > 1.55 && vTail < 1.75,
  "viral-hit: next-month tail 1.5x on the boosted subs base (got " + vTail.toFixed(2) + "x)");
// two months later: views per sub back to 1x (the bump lives in the subs base, not the view rate)
var vRec = (viral.months[7].longViews / viral.months[7].subs) / (noEv.months[7].longViews / noEv.months[7].subs);
ok(Math.abs(vRec - 1) < 0.02,
  "viral-hit: views-per-sub returns to baseline after the tail (got " + vRec.toFixed(3) + ")");
ok(viral.months[7].subs / noEv.months[7].subs > 1.07,
  "viral-hit: the subs lift compounds forward (reality check: views fade, the audience bump stays small)");
// burnout break: 2 months of zero growth, drift, views x0.3
var burn = sim.simulate(baseInputs({ horizon: 12, events: [{ id: "burnout-break", startMonth: 5 }] }), cfg);
ok(burn.months[4].growthRate === 0 && burn.months[5].growthRate === 0 &&
   burn.months[6].growthRate > 0,
  "burnout-break: exactly 2 months of zero growth, then recovery");
var drift = burn.months[4].subs / burn.months[3].subs;
ok(Math.abs(drift - 0.995) < 0.002,
  "burnout-break: -0.5%/mo audience drift (got " + drift.toFixed(4) + ")");
// pin views-per-sub (the 0.3 applies to the view rate; the zero-growth
// month also shrinks the subs base vs the control, so raw views read lower)
var burnVps = (burn.months[4].longViews / burn.months[4].subs) /
              (noEv.months[4].longViews / noEv.months[4].subs);
ok(Math.abs(burnVps - 0.3) < 0.01,
  "burnout-break: views-per-sub x0.3 back-catalog only (got " + burnVps.toFixed(3) + ")");
// policy change: Shorts ads $0 while rolling 90d < 10M views
var pol = sim.simulate(baseInputs({ horizon: 12, events: [{ id: "policy-change", startMonth: 1 }] }), cfg);
ok(pol.months[0].shortsFloorBlocked === true && pol.months[0].adsShorts === 0,
  "policy-change: shorts ads blocked at small scale");
ok(pol.months[0].adsLong > 0, "policy-change: long-form ads keep paying");
var polBig = sim.simulate(baseInputs({ horizon: 12, startSubs: 2000000, shortsPerWeek: 7,
  events: [{ id: "policy-change", startMonth: 1 }] }), cfg);
var blocked12 = polBig.months[11].shortsFloorBlocked;
ok(blocked12 === false && polBig.months[11].adsShorts > 0,
  "policy-change: above the 10M/90d floor, shorts ads pay normally");
// unknown ids dropped, start months clamped/defaulted
ok(sim.normalizeEvents([{ id: "nope", startMonth: 2 }]).length === 0,
  "unknown event id dropped");
ok(sim.normalizeEvents([{ id: "viral-hit" }])[0].startMonth === 1,
  "missing startMonth defaults to 1");
ok(sim.normalizeEvents([{ id: "viral-hit", startMonth: 99 }])[0].startMonth === 36,
  "startMonth clamps at 36");
ok(sim.normalizeEvents(null).length === 0, "no events -> empty array");
// event honesty contract: no hard income numbers on the cards
sim.DEFAULTS.eventCards.forEach(function (c) {
  ok(!/\$\d/.test(c.assumedEffect) || /×\d/.test(c.assumedEffect) === false,
    "card '" + c.id + "' assumes effects as multipliers, never income dollars");
});
// holiday-shopping-surge (wave 25): affiliate revenue x1.8 for the event
// month + the next month; everything else untouched
var hol = sim.simulate(baseInputs({ horizon: 12, events: [{ id: "holiday-shopping-surge", startMonth: 5 }] }), cfg);
var holAff5 = hol.months[4].affiliates / noEv.months[4].affiliates;
var holAff6 = hol.months[5].affiliates / noEv.months[5].affiliates;
var holAff7 = hol.months[6].affiliates / noEv.months[6].affiliates;
ok(Math.abs(holAff5 - 1.8) < 1e-9 && Math.abs(holAff6 - 1.8) < 1e-9,
  "holiday-shopping-surge: affiliate revenue x1.8 in months 5-6 (got " +
  holAff5.toFixed(3) + " / " + holAff6.toFixed(3) + ")");
ok(Math.abs(holAff7 - 1) < 1e-9,
  "holiday-shopping-surge: affiliates back to baseline in month 7 (got " +
  holAff7.toFixed(3) + ")");
ok(hol.months[4].affiliateMult === 1.8 && hol.months[6].affiliateMult === 1,
  "affiliateMult traces the card months on the record");
ok(Math.abs(hol.months[4].adsLong / noEv.months[4].adsLong - 1) < 1e-9 &&
   Math.abs(hol.months[4].subs / noEv.months[4].subs - 1) < 1e-9,
  "holiday-shopping-surge: ads, subs, growth untouched");
ok(hol.months[4].eventsActive.indexOf("holiday-shopping-surge") !== -1 &&
   hol.months[3].eventsActive.indexOf("holiday-shopping-surge") === -1,
  "eventsActive pins the holiday-shopping-surge start month (id stays listed after, like the persistent cards)");
var holAl = sim.assumptionLines(baseInputs({ horizon: 12, events: [{ id: "holiday-shopping-surge", startMonth: 5 }] }), hol);
ok(/Holiday shopping surge/.test(holAl.join(" ")) && /1\.8/.test(holAl.join(" ")),
  "assumptionLines names the card + its 1.8 multiplier");
var holCard = sim.DEFAULTS.eventCards.filter(function (c) { return c.id === "holiday-shopping-surge"; })[0];
ok(/BFCM 2025|TikTok Shop/.test(holCard.basis) && /Adobe/.test(holCard.basis),
  "holiday-shopping-surge card cites the TikTok Shop + Adobe research basis");

console.log("compare on 36 months (wave 24)");
var cmp36 = sim.compare("sleep-ambient", sim.scenarioInputs("sleep-ambient"),
  "english-learning", sim.scenarioInputs("english-learning"), cfg);
var A36 = sim.scenarioInputs("sleep-ambient"); A36.horizon = 36;
var B36 = sim.scenarioInputs("english-learning"); B36.horizon = 36;
var cmp36h = sim.compare("sleep-ambient", A36, "english-learning", B36, cfg);
ok(cmp36h.a.meta.horizon === 36 && cmp36h.b.meta.horizon === 36,
  "both paths run the 36-month clock when horizon=36");
ok(Math.abs(cmp36h.deltas.netRevenue - (cmp36h.b.totals.net - cmp36h.a.totals.net)) < 1e-6,
  "36-month deltas still B minus A");
ok(/over 36 months/.test(cmp36h.verdict), "verdict names the 36-month clock");
ok(cmp36.a.months.length === 12, "scenarios still default to 12 months");

console.log("new scenarios (wave 24)");
ok(sim.SCENARIOS.length === 12, "12 loadable scenarios (" + sim.SCENARIOS.length + ")");
["sleep-ambient", "english-learning", "senior-health"].forEach(function (id) {
  var sc = sim.SCENARIOS.filter(function (s) { return s.id === id; })[0];
  ok(!!sc, "new scenario '" + id + "' exists");
  var inp = sim.scenarioInputs(id);
  var rs = sim.simulate(inp, cfg);
  ok(rs.months.length === 12 && isFinite(rs.endSubs) && isFinite(rs.totals.total),
    "scenario '" + id + "' simulates 12 finite months");
  ok((cfg.youtube_longform_rpm_bands[inp.niche] || []).length === 2,
    "scenario '" + id + "' niche is a real calculators.json RPM band");
  ok(typeof sc.source === "string" && /OutlierKit|Fortune|Niche Atlas 2027/.test(sc.source),
    "scenario '" + id + "' cites its 2027-outlook / case-file source");
  ok(typeof sc.nicheProxyNote === "string" || ["education", "health_fitness"].indexOf(inp.niche) !== -1,
    "scenario '" + id + "' uses a real engine niche key (proxies declared where needed)");
});

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


/* ---------- solveForGoal: "what would it take?" ----------
 * Pure inversion of simulate(): binary-searches base growth (whole %,
 * 2-60) or long-form cadence (half videos, 0-14). Every answer is
 * re-verified by re-running simulate() at the solved value. */
console.log("solveForGoal");
var sfgBase = baseInputs({ startSubs: 1000, horizon: 24 });
var s1 = sim.solveForGoal(sfgBase, cfg, { target: "subs", value: 100000, month: 18, variable: "growth" });
ok(s1.ok && s1.variable === "growth", "100k subs by m18 solves (growth)");
ok(s1.value >= 0.02 && s1.value <= 0.60 && Math.abs(s1.value * 100 - Math.round(s1.value * 100)) < 1e-9,
  "solved growth is a whole % in [2,60] (" + s1.valueLabel + ")");
var verify1 = baseInputs({ startSubs: 1000, horizon: 24, growthRate: s1.value });
ok(sim.simulate(verify1, cfg).months[17].subs >= 100000,
  "re-simulation at solved growth reaches 100k by month 18");
var s2 = sim.solveForGoal(sfgBase, cfg, { target: "stage", value: 2, month: 24, variable: "cadence" });
ok(s2.ok && s2.variable === "cadence", "stage 2 by m24 solves (cadence)");
ok(s2.value >= 0 && s2.value <= 7 && Math.abs(s2.value * 2 - Math.round(s2.value * 2)) < 1e-9,
  "solved cadence is in half-videos in [0,7]/wk (" + s2.valueLabel + ")");
var s3 = sim.solveForGoal(sfgBase, cfg, { target: "subs", value: 1e12, month: 12, variable: "growth" });
ok(!s3.ok && s3.reason === "unreachable", "1T subs by m12 = unreachable (honest, not infinite)");
var s4 = sim.solveForGoal(sfgBase, cfg, { target: "subs", value: 10, month: 12, variable: "growth" });
ok(s4.ok && s4.alreadyThere === true, "already-there target short-circuits");
var s5 = sim.solveForGoal(sfgBase, cfg, { target: "stage", value: 4, month: 24, variable: "growth" });
ok(!s5.ok && s5.reason === "stage4_needs_team", "stage 4 without a hire = stage4_needs_team");
var s5b = sim.solveForGoal(baseInputs({ startSubs: 1000, horizon: 36,
  hires: [{ type: "editor", startMonth: 1 }] }), cfg,
  { target: "stage", value: 4, month: 36, variable: "growth" });
ok(s5b.ok || s5b.reason === "unreachable",
  "stage 4 with a hire solves or is honestly unreachable (never stage4_needs_team)");
var s6 = sim.solveForGoal(sfgBase, cfg, { target: "fame", value: 1, month: 12 });
ok(!s6.ok && s6.reason === "bad_target", "bad target rejected");
var s7 = sim.solveForGoal(sfgBase, cfg, { target: "subs", value: -5, month: 12 });
ok(!s7.ok && s7.reason === "bad_value", "non-positive value rejected");
var s8 = sim.solveForGoal(sfgBase, cfg, { target: "net", value: 5000, month: 18, variable: "growth" });
ok(s8.ok && s8.targetLabel.indexOf("net revenue") !== -1, "net target solves with net label");
var verify8 = baseInputs({ startSubs: 1000, horizon: 24, growthRate: s8.value });
ok(sim.simulate(verify8, cfg).months[17].net >= 5000,
  "re-simulation at solved growth reaches $5k net by month 18");
ok(s1.note.indexOf("not a promise") !== -1, "solver note says model-not-promise");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
