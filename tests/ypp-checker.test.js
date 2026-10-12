/* Unit tests for the YPP 2027 Eligibility Checker engine.
 * Run: node tests/ypp-checker.test.js
 * Exit 0 = all pass. Contracts:
 *  1. validInput accepts complete valid inputs; rejects negative numbers,
 *     missing fields, unknown enums, NaN.
 *  2. Threshold pins: current rules (1K subs + 4K hrs/12mo OR 10M Shorts/90d;
 *     fan-funding 500 subs + 3 uploads/90d + 3K hrs OR 3M Shorts); 2027 rules
 *     (1K subs + 8K hrs/365d OR 20M Shorts/90d; 10M Shorts floor monthly;
 *     activity 1K hrs OR 1M Shorts OR 2 longs/5 shorts per 90d; fan-funding
 *     unchanged).
 *  3. Pinned fixtures: current-vs-2027 verdicts, gap math, per-day rates.
 *  4. Fan-funding verdicts; shorts-floor + activity verdicts.
 *  5. Originality warning only when originality != original (and shorts are in play).
 *  6. Plan steps reference real site pages only; disclaimer present; no
 *     guarantee language; every rule set carries sources.
 *  7. check throws on invalid input.
 */
"use strict";
var path = require("path");
var ypp = require(path.join("..", "assets", "js", "ypp-checker.js"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

function base(over) {
  var a = { subs: 1200, watchHours: 6500, shortsViews: 5000000,
            uploads90d: 60, originality: "original", formatMix: "both" };
  if (over) for (var k in over) a[k] = over[k];
  return a;
}

/* real pages this tool may link to (must stay in sync with the site map) */
var VALID_PAGES = [
  "phase-1-content-engine.html", "phase-2-youtube-mastery.html",
  "phase-4-audience-to-community.html", "phase-5-monetization-stack.html",
  "shortform-playbook.html", "hook-builder.html", "money-map.html",
  "planner.html", "video-doctor.html"
];

/* 1: input validation */
ok(ypp.validInput(base()), "complete valid input passes");
ok(!ypp.validInput(base({ subs: -1 })), "negative subs rejected");
ok(!ypp.validInput(base({ watchHours: NaN })), "NaN watch hours rejected");
ok(!ypp.validInput(base({ shortsViews: -100 })), "negative shorts views rejected");
ok(!ypp.validInput(base({ originality: "stolen" })), "unknown originality rejected");
ok(!ypp.validInput(base({ formatMix: "radio" })), "unknown format mix rejected");
ok(!ypp.validInput(null), "null rejected");
ok(!ypp.validInput({}), "empty object rejected");
ok(ypp.validInput(base({ subs: 0, watchHours: 0, shortsViews: 0, uploads90d: 0 })),
   "all-zero numbers pass (channel from nothing)");

/* 2: threshold pins */
var R = ypp.RULES;
ok(R.current.full.subs === 1000, "current full: 1K subs");
ok(R.current.full.watchHours12mo === 4000, "current full: 4K hours");
ok(R.current.full.shortsViews90d === 10000000, "current full: 10M shorts");
ok(R.current.fanFunding.subs === 500, "current fan-funding: 500 subs");
ok(R.current.fanFunding.uploads90d === 3, "current fan-funding: 3 uploads/90d");
ok(R.current.fanFunding.watchHours12mo === 3000, "current fan-funding: 3K hours");
ok(R.current.fanFunding.shortsViews90d === 3000000, "current fan-funding: 3M shorts");
ok(R.y2027.full.subs === 1000, "2027 full: 1K subs (unchanged)");
ok(R.y2027.full.watchHours12mo === 8000, "2027 full: 8K hours (doubled)");
ok(R.y2027.full.shortsViews90d === 20000000, "2027 full: 20M shorts (doubled)");
ok(R.y2027.shortsFloor.shortsViews90d === 10000000, "2027 shorts floor: 10M/90d");
ok(R.y2027.activity.watchHours12mo === 1000, "2027 activity: 1K hours/365d");
ok(R.y2027.activity.shortsViews90d === 1000000, "2027 activity: 1M shorts/90d");
ok(R.y2027.activity.longs90d === 2, "2027 activity: 2 longs/90d");
ok(R.y2027.activity.shorts90d === 5, "2027 activity: 5 shorts/90d");
ok(R.y2027.fanFunding.watchHours12mo === 3000 &&
   R.y2027.fanFunding.shortsViews90d === 3000000,
   "2027 fan-funding: unchanged from current");

/* 3: pinned fixtures — current-vs-2027 verdicts + gap math */
// Fixture A: 1200 subs / 6500 hrs / 5M shorts / 60 uploads / original
var A = ypp.check(base());
ok(A.now.full.eligible === true, "A: current full eligible (subs + 6.5K hrs)");
ok(A.now.full.via === "watch-hours path", "A: current via hours path");
ok(A.y2027.full.eligible === false, "A: 2027 full NOT eligible (6.5K < 8K)");
ok(A.y2027.full.hoursGap === 1500, "A: 2027 hours gap = 1500");
ok(A.y2027.full.shortsGap === 15000000, "A: 2027 shorts gap = 15M");
ok(A.y2027.full.subsGap === 0, "A: no subs gap");
ok(A.y2027.shortsFloor.pass === false, "A: below 10M shorts floor");
ok(A.y2027.shortsFloor.gapViews === 5000000, "A: floor gap = 5M views");
ok(A.y2027.activity.pass === true, "A: activity test passes (1K+ hours)");
ok(A.originalityWarning === null, "A: no originality warning (original)");
ok(A.plan2027.length >= 2, "A: plan has steps for the remaining gaps");

// Fixture B: 1500 subs / 2000 hrs / 12M shorts — shorts-channel archetype
var B = ypp.check(base({ watchHours: 2000, shortsViews: 12000000 }));
ok(B.now.full.eligible === true, "B: current full eligible via 10M shorts");
ok(B.now.full.via === "shorts path", "B: current via shorts path");
ok(B.y2027.full.eligible === false, "B: 2027 full NOT eligible (12M < 20M)");
ok(B.y2027.full.shortsGap === 8000000, "B: 2027 shorts gap = 8M");
ok(B.y2027.shortsFloor.pass === true, "B: floor passes (12M >= 10M) — keeps Shorts pay");
ok(B.y2027.activity.pass === true, "B: activity passes via 1M shorts leg");

// Fixture C: 600 subs / 3500 hrs / 4 uploads — fan-funding tier
var C = ypp.check(base({ subs: 600, watchHours: 3500, uploads90d: 4 }));
ok(C.now.fanFunding.eligible === true, "C: current fan-funding eligible");
ok(C.now.full.eligible === false, "C: current full NOT eligible (< 1K subs)");
ok(C.now.full.subsGap === 400, "C: subs gap = 400");
ok(C.y2027.fanFunding.eligible === true, "C: 2027 fan-funding unchanged — still eligible");
ok(C.y2027.full.eligible === false, "C: 2027 full NOT eligible");

// Fixture D: 900 subs / 4500 hrs — the near-miss archetype
var D = ypp.check(base({ subs: 900, watchHours: 4500, shortsViews: 0, uploads90d: 40 }));
ok(D.now.full.eligible === false, "D: current NOT eligible (900 subs < 1K)");
ok(D.now.full.subsGap === 100, "D: subs gap = 100");
ok(D.y2027.full.hoursGap === 3500, "D: 2027 hours gap = 3500");
ok(D.now.fanFunding.eligible === true, "D: fan-funding still reachable pre-Feb");

// Fixture E: from nothing — 0/0/0/0
var E = ypp.check(base({ subs: 0, watchHours: 0, shortsViews: 0, uploads90d: 0 }));
ok(E.now.full.eligible === false, "E: nothing → not eligible now");
ok(E.y2027.full.eligible === false, "E: nothing → not eligible 2027");
ok(E.y2027.full.hoursGap === 8000, "E: full 8K-hour gap from zero");
ok(E.y2027.shortsFloor.gapViews === 10000000, "E: full 10M floor gap from zero");
ok(E.y2027.activity.pass === false, "E: activity test fails from zero");

// Exact-threshold boundary: 1K subs + exactly 4K hours passes current
var F = ypp.check(base({ subs: 1000, watchHours: 4000, shortsViews: 0 }));
ok(F.now.full.eligible === true, "F: exactly 1K subs + 4K hrs passes current bar");
ok(F.y2027.full.eligible === false, "F: same numbers fail the 2027 bar");
ok(F.y2027.full.hoursGap === 4000, "F: 2027 gap = 4000");

/* 4: fan-funding / floor / activity units */
var fu = ypp.fanVerdict(R.current, base({ subs: 500, watchHours: 3000, uploads90d: 3, shortsViews: 0 }));
ok(fu.eligible === true, "fanVerdict: boundary pass (500/3000/3)");
var fu2 = ypp.fanVerdict(R.current, base({ subs: 500, watchHours: 3000, uploads90d: 2, shortsViews: 0 }));
ok(fu2.eligible === false, "fanVerdict: 2 uploads fails the 3-upload gate");
ok(fu2.uploadsGap === 1, "fanVerdict: uploads gap = 1");
var fl = ypp.shortsFloorVerdict(R.y2027, base({ shortsViews: 9999999 }));
ok(fl.pass === false && fl.gapViews === 1, "floor: 9,999,999 misses by exactly 1");
var ac = ypp.activityVerdict(R.y2027, base({ watchHours: 0, shortsViews: 0, uploads90d: 5 }));
ok(ac.pass === true, "activity: 5 uploads/90d passes via output leg");
var ac2 = ypp.activityVerdict(R.y2027, base({ watchHours: 0, shortsViews: 999999, uploads90d: 4 }));
ok(ac2.pass === false, "activity: all three legs missed → fail");
ok(ac2.shortsGap === 1, "activity: shorts gap = 1");

/* 5: originality warning */
ok(ypp.check(base({ originality: "reposted", formatMix: "shorts" })).originalityWarning !== null,
   "reposted + shorts → warning fires");
ok(ypp.check(base({ originality: "repurposed", formatMix: "both" })).originalityWarning !== null,
   "repurposed → warning fires");
ok(ypp.check(base({ originality: "reposted", formatMix: "longform", shortsViews: 0 })).originalityWarning === null,
   "reposted long-form with zero shorts → no warning (long-form cutters unaffected)");
ok(/Rene Ritchie|Creator Insider/.test(
   ypp.check(base({ originality: "reposted" })).originalityWarning.source),
   "warning carries its source");
var fv_full = ypp.fullVerdict(R.current, base());
ok(fv_full.checks.length === 3 && fv_full.checks[0].label === "Subscribers",
   "fullVerdict: 3 checks with pass flags");
ok(fv_full.via === "watch-hours path" || fv_full.via === "shorts path" || fv_full.via === null,
   "fullVerdict: via is a known path or null");

/* 6: plan + honesty contract */
var planSteps = A.plan2027;
var allPlanText = JSON.stringify(planSteps);
ok(/phase-2-youtube-mastery|phase-1-content-engine/.test(allPlanText),
   "plan: grounded in site chapters");
var badLinks = [];
planSteps.forEach(function (s) {
  s.links.forEach(function (l) {
    if (VALID_PAGES.indexOf(l.page) === -1) badLinks.push(l.page);
  });
});
ok(badLinks.length === 0, "plan: every link page is a real site page" +
   (badLinks.length ? " — bad: " + badLinks.join(", ") : ""));
ok(/verify live|rules change/i.test(A.disclaimer), "disclaimer: rules-change + verify-live present");
ok(/not financial, legal, or tax advice/i.test(A.disclaimer),
   "disclaimer: not-financial/legal/tax-advice present");
ok(/income promise/i.test(A.disclaimer), "disclaimer: never-an-income-promise present");
var allText = JSON.stringify(ypp.check(base({ originality: "reposted" })));
ok(!/guarantee/i.test(allText), "no guarantee language in any output");
ok(!/will earn|you will make/i.test(allText), "no income-promise phrasing in any output");
ok(R.current.sources.length >= 1 && R.y2027.sources.length >= 1,
   "both rule sets carry sources");
ok(/Aug/.test(R.y2027.sources.join(" ")) || /2026/.test(R.y2027.sources.join(" ")),
   "2027 sources name the announcement context");
var emptyPlan = ypp.plan(R.y2027, ypp.fullVerdict(R.y2027, base({
  subs: 1500, watchHours: 9000, shortsViews: 25000000,
  uploads90d: 60, originality: "original", formatMix: "both" })), base({
  subs: 1500, watchHours: 9000, shortsViews: 25000000 }));
ok(emptyPlan.length === 1 && /second gate/i.test(emptyPlan[0].goal),
   "plan: at-or-above bar → second-gate step, not gap steps");

/* 7: throws */
var threw = false;
try { ypp.check(base({ subs: -5 })); } catch (e) { threw = true; }
ok(threw, "check() throws on invalid input");

console.log(failures === 0 ? "\nALL YPP-CHECKER TESTS PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
