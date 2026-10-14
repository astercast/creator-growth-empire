/* Unit tests for the Empire Simulator launch sequence (wow wave 1).
 * Tests the UMD pure helpers in assets/js/simulator-launch.js:
 *  1. preflightChecks — the four real gates, pass and fail paths
 *  2. countdownSteps — T-5..T-0..LIFTOFF order
 *  3. telemetryFrames — one frame per month, stage-change flags, names
 *  4. debriefFor — honest copy: model-labeled, no promises, XP line
 *  5. missionKey uniqueness shape
 *  6. honesty contract — no banned phrasing on any user-facing string
 * Exit 0 = all pass. Run: node tests/sim-launch.test.js
 */
"use strict";
var path = require("path");
var sl = require(path.join("..", "assets", "js", "simulator-launch.js"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

function goodInputs() {
  return { niche: "education", startSubs: 500, longformPerWeek: 1, shortsPerWeek: 3,
    quality: "solid", growthRate: 0.12, rpmLevel: "mid", q4Uplift: 0.6,
    ads: true, sponsors: true, affiliates: true, digital: false,
    digitalStartMonth: 6, digitalPrice: 49, horizon: 12, hires: [], events: [] };
}
function goodCfg() { return { loaded: true, engineReady: true }; }

/* ---------- 1: preflight checks ---------- */
var pass = sl.preflightChecks(goodInputs(), goodCfg());
ok(pass.length === 4, "four pre-flight checks");
ok(pass.every(function (c) { return c.ok; }), "all four pass on good inputs");
ok(pass.map(function (c) { return c.id; }).join(",") === "rates,inputs,streams,engine",
  "check ids: rates,inputs,streams,engine");
ok(pass.every(function (c) { return c.label && c.detail; }),
  "every check has label + detail");

var noCfg = sl.preflightChecks(goodInputs(), { loaded: false, engineReady: true });
ok(!noCfg[0].ok && /still loading/i.test(noCfg[0].detail),
  "rates check fails honestly when calculators.json is still loading");

var badGrowth = goodInputs(); badGrowth.growthRate = 0.9;
var badIn = sl.preflightChecks(badGrowth, goodCfg());
ok(!badIn[1].ok && /bounds/i.test(badIn[1].detail),
  "inputs check fails on out-of-bounds growth rate");
var badHorizon = goodInputs(); badHorizon.horizon = 18;
ok(!sl.preflightChecks(badHorizon, goodCfg())[1].ok,
  "inputs check fails on non-12/24/36 horizon");

var noStreams = goodInputs();
noStreams.ads = noStreams.sponsors = noStreams.affiliates = noStreams.digital = false;
var ns = sl.preflightChecks(noStreams, goodCfg());
ok(!ns[2].ok && /no revenue stream/i.test(ns[2].detail),
  "streams check fails when nothing is armed");
var twoStreams = goodInputs(); twoStreams.ads = twoStreams.digital = false;
ok(/2 of 4 streams armed/.test(sl.preflightChecks(twoStreams, goodCfg())[2].detail),
  "streams detail names the armed count");

var noEngine = sl.preflightChecks(goodInputs(), { loaded: true, engineReady: false });
ok(!noEngine[3].ok, "engine check fails when EmpireSim is missing");

/* ---------- 2: countdown ---------- */
var steps = sl.countdownSteps();
ok(JSON.stringify(steps) === JSON.stringify(
  ["T-5", "T-4", "T-3", "T-2", "T-1", "T-0", "LIFTOFF"]),
  "countdown: T-5..T-0 then LIFTOFF, in order");
ok(steps.length === 7, "7 countdown beats");

/* ---------- 3: telemetry frames ---------- */
var fakeRes = {
  months: [
    { month: 1, subs: 500, net: -20, stage: 0 },
    { month: 2, subs: 560, net: 5, stage: 0 },
    { month: 3, subs: 640, net: 120, stage: 1 },
    { month: 4, subs: 720, net: 340, stage: 1 }
  ],
  endSubs: 720, endStage: 1,
  totals: { total: 900, teamCost: 0, net: 445 }
};
var names = ["The Start Line", "First $100", "The Engine Runs", "The Business", "The Company"];
var frames = sl.telemetryFrames(fakeRes, names);
ok(frames.length === 4, "one frame per month");
ok(frames[0].month === 1 && frames[0].subs === 500 && frames[0].net === -20,
  "frame 1 carries rounded subs + net (negatives kept)");
ok(!frames[0].stageChanged && !frames[1].stageChanged,
  "no stage-change flag on months 1-2");
ok(frames[2].stageChanged && frames[2].stage === 1 &&
   frames[2].stageName === "First $100",
  "stage change flagged on month 3 with the stage name");
ok(!frames[3].stageChanged, "no flag when the stage holds");

/* ---------- 4: debrief ---------- */
var d = sl.debriefFor(goodInputs(), fakeRes, "Test Scenario", names);
ok(/MISSION LOGGED/.test(d.title) && /4-month/.test(d.title),
  "debrief title: mission logged + horizon");
ok(d.stats.length === 4, "four debrief stats");
ok(d.stats[0].value === "720" && d.stats[3].value === "Stage 1 · First $100",
  "debrief stats: end subs + end stage (got " + d.stats[0].value + " / " + d.stats[3].value + ")");
ok(d.xpLine === "+25 XP: MISSION LOGGED \u00b7 recorded in your Empire Climb journal",
  "XP line pins +25 and the journal framing");
ok(/not a prediction/i.test(d.honesty) && /not financial, legal, or tax advice/i.test(d.honesty),
  "honesty footer rides the debrief");
ok(sl.MISSION_XP === 25, "MISSION_XP = 25");

/* ---------- 5: mission keys ---------- */
var k1 = sl.missionKey("2026-10-12T08:00:00.000Z");
var k2 = sl.missionKey("2026-10-12T08:00:01.000Z");
ok(k1 === "mission:2026-10-12T08:00:00.000Z", "mission key shape");
ok(k1 !== k2, "distinct timestamps give distinct keys");

/* ---------- 6: honesty contract ---------- */
var copy = [d.title, d.xpLine, d.honesty, d.kicker]
  .concat(d.stats.map(function (s) { return s.label + " " + s.value; }))
  .concat(pass.map(function (c) { return c.label + " " + c.detail; }))
  .concat(steps).join(" | ");
var banned = [/(?<!not to )(?<!never )guarantee[sd]? (you'll|you will|income|earnings|revenue|views|growth|success|results)/i,
  /will earn/i, /risk-free/i, /passive income/i, /get rich/i, /(?<!no )income promises?/i,
  /you will make/i];
banned.forEach(function (re) {
  ok(!re.test(copy), "launch copy: no banned phrasing " + re);
});
ok(/model/i.test(d.honesty), "debrief honesty names the model");

console.log(failures === 0 ? "\nsim-launch: all tests passed" : "\nsim-launch: " + failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
