/* Unit tests for the Niche Atlas 2.0 data contract (wave 20).
 * Run: node tests/niche-atlas.test.js   (from the repo root)
 * Exit 0 = all pass. Sanity contract:
 *  1. 20 niche records, each with a valid outlook_2027 (trajectory/basis/signals)
 *  2. each niche has stream_fit for the 4 revenue streams (strong/moderate/weak)
 *  3. every niche source id resolves to the doc-level sources list
 *  4. avoid_list carries the red-flag items incl. the new post-2027 Shorts item
 *  5. breakout_spotlights present with single_source flags
 *  6. doc-level outlook_2027 block: platform signals + evidence note
 *  7. honesty contract: no income promises in the JSON; disclaimer present
 *  8. quiz.js OUTLOOK_2027 trajectories stay in sync with data/niches.json
 */
"use strict";
var fs = require("fs");
var path = require("path");

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

var d = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "niches.json"), "utf8"));
var sourceIds = {};
(d.sources || []).forEach(function (s) { sourceIds[s.id] = true; });

ok(d.version === "2.1.0", "dataset version is 2.1.0 (got " + d.version + ")");
ok(d.niches.length === 20, "20 niche records (got " + d.niches.length + ")");

var TRAJ = { heating: 1, stable: 1, cooling: 1 };
var FIT = { strong: 1, moderate: 1, weak: 1 };
var STREAMS = ["ads", "sponsorships", "digital_products", "pod"];

d.niches.forEach(function (n) {
  var o = n.outlook_2027;
  ok(!!o && !!TRAJ[o.trajectory],
    n.id + ": outlook_2027.trajectory valid (" + (o && o.trajectory) + ")");
  ok(!!o && typeof o.basis === "string" && o.basis.length > 20,
    n.id + ": outlook basis is a real sentence");
  var sigs = (o && o.signals) || [];
  ok(sigs.length >= 1 && sigs.every(function (s) { return sourceIds[s]; }),
    n.id + ": outlook signals resolve (" + sigs.join(",") + ")");
  var fit = n.stream_fit || {};
  ok(STREAMS.every(function (k) { return FIT[fit[k]]; }),
    n.id + ": stream_fit covers all 4 streams with valid ratings");
  var badSrc = (n.sources || []).filter(function (s) { return !sourceIds[s]; });
  ok(badSrc.length === 0, n.id + ": niche sources resolve" + (badSrc.length ? " (" + badSrc.join(",") + ")" : ""));
});

var avoidIds = {};
(d.avoid_list || []).forEach(function (a) {
  avoidIds[a.id] = true;
  var bad = (a.sources || []).filter(function (s) { return !sourceIds[s]; });
  ok(bad.length === 0, "avoid[" + a.id + "]: sources resolve");
});
["clipping-reposts", "kids-trap", "ai-slop", "shorts-only-post-2027"].forEach(function (id) {
  ok(!!avoidIds[id], "avoid_list carries red-flag item " + id);
});
var flag2027 = d.avoid_list.filter(function (a) { return a.flag_2027; }).length;
ok(flag2027 >= 3, "3+ avoid items flagged for the 2027 outlook (got " + flag2027 + ")");

ok(Array.isArray(d.breakout_spotlights) && d.breakout_spotlights.length >= 3,
  "breakout_spotlights present (" + (d.breakout_spotlights || []).length + ")");
d.breakout_spotlights.forEach(function (s) {
  ok(!!(s.name && s.growth && s.revenue && s.why && typeof s.single_source === "boolean"),
    "spotlight " + s.id + ": complete record with single_source flag");
});

var outlook = d.outlook_2027;
ok(!!outlook && Array.isArray(outlook.platform_signals) && outlook.platform_signals.length >= 4,
  "doc-level outlook_2027: 4+ platform signals (got " + (outlook && outlook.platform_signals.length) + ")");
ok(!!(outlook && outlook.evidence_note && /not forecasts/i.test(outlook.evidence_note)),
  "doc-level outlook_2027: evidence note frames trajectories as reads, not forecasts");

var raw = fs.readFileSync(path.join(__dirname, "..", "data", "niches.json"), "utf8");
ok(!/will earn|guaranteed|passive income in your sleep/i.test(raw),
  "honesty: no income-promise language in the dataset");
ok(/not financial,? legal,? or tax advice/i.test(raw),
  "honesty: disclaimer present in the dataset");

/* quiz.js sync: the 2027 branch mirrors atlas trajectories. */
var quizSrc = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "quiz.js"), "utf8");
var re = /\{\s*id:\s*"([\w-]+)",\s*trajectory:\s*"(heating|stable|cooling)"/g;
var quizTraj = {}, m;
while ((m = re.exec(quizSrc)) !== null) { quizTraj[m[1]] = m[2]; }
ok(Object.keys(quizTraj).length === 20,
  "quiz.js OUTLOOK_2027 mirrors all 20 niches (got " + Object.keys(quizTraj).length + ")");
d.niches.forEach(function (n) {
  ok(quizTraj[n.id] === n.outlook_2027.trajectory,
    "quiz sync: " + n.id + " trajectory matches (" + quizTraj[n.id] + " vs " + n.outlook_2027.trajectory + ")");
});

if (failures) { console.log(failures + " FAILURE(S)"); process.exit(1); }
console.log("niche-atlas: all assertions pass");
