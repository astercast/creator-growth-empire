/* Unit tests for the Money Map engine. Run: node tests/money-map.test.js
 * Exit 0 = all pass. Sanity contract:
 *  1. revenue band is the placement anchor: 0->0, 1-99->1, 100-999->2,
 *     1k-9999->3, 10k-plus->4
 *  2. audience 100k+ at base stage <= 2 bumps +1 with 'audience-ahead' note;
 *     never more than one bump
 *  3. employees at stage <= 2 adds 'team-ahead' note without moving the stage
 *  4. validAnswers rejects unknown enum values and missing questions
 *  5. roadmap returns stage signature move first + 2 bottleneck moves, deduped
 *  6. STAGES has exactly 5 entries, each with goal/moves(3)/trap/graduate
 */
"use strict";
var path = require("path");
var mm = require(path.join("..", "assets", "js", "money-map.js"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

function base(over) {
  var a = {
    platform: "youtube", audience: "1k-10k", revenue: "0",
    cadence: "weekly", team: "just-me", bottleneck: "consistency", streams: "0"
  };
  if (over) for (var k in over) a[k] = over[k];
  return a;
}

/* 1: revenue band anchors placement */
[["0", 0], ["1-99", 1], ["100-999", 2], ["1k-9999", 3], ["10k-plus", 4]].forEach(function (pair) {
  var r = mm.placeStage(base({ revenue: pair[0] }));
  ok(r.stage === pair[1], "revenue " + pair[0] + " -> stage " + pair[1] + " (got " + r.stage + ")");
});

/* 2: audience-ahead bump */
var aud = mm.placeStage(base({ revenue: "0", audience: "100k-1m" }));
ok(aud.stage === 1 && aud.note === "audience-ahead",
  "100k+ audience at $0 -> stage 1 with audience-ahead note (got " + aud.stage + "/" + aud.note + ")");
var aud2 = mm.placeStage(base({ revenue: "100-999", audience: "1m-plus" }));
ok(aud2.stage === 3 && aud2.note === "audience-ahead",
  "1M+ audience at $100-999 -> stage 3, bump of exactly 1 (got " + aud2.stage + ")");
var aud3 = mm.placeStage(base({ revenue: "1k-9999", audience: "1m-plus" }));
ok(aud3.stage === 3 && aud3.note === null,
  "audience-ahead never fires at stage 3+ (got " + aud3.stage + "/" + aud3.note + ")");

/* 3: team-ahead note without moving the stage */
var team = mm.placeStage(base({ revenue: "1-99", team: "employees" }));
ok(team.stage === 1 && team.note === "team-ahead",
  "employees at stage 1 -> note team-ahead, stage unchanged (got " + team.stage + "/" + team.note + ")");
var team2 = mm.placeStage(base({ revenue: "0", audience: "100k-1m", team: "employees" }));
ok(team2.stage === 1 && team2.note === "audience-ahead+team-ahead",
  "both notes combine (got " + team2.stage + "/" + team2.note + ")");

/* 4: answer validation */
ok(mm.validAnswers(base()), "complete valid answers pass");
ok(!mm.validAnswers(base({ revenue: "millions" })), "unknown enum value rejected");
var missing = base(); delete missing.bottleneck;
ok(!mm.validAnswers(missing), "missing question rejected");
ok(!mm.validAnswers(null), "null answers rejected");

/* 5: roadmap shape */
var r2 = mm.roadmap(base({ revenue: "100-999", bottleneck: "monetization" }));
ok(r2.stage === 2, "roadmap carries the placed stage");
ok(r2.moves.length === 3, "roadmap has exactly 3 moves");
ok(r2.moves[0].page === "deal-room.html",
  "stage 2 signature move first (got " + r2.moves[0].page + ")");
ok(r2.moves[1].page === "calculator.html" && r2.moves[2].page === "deal-analyzer.html",
  "monetization bottleneck moves follow (got " + r2.moves[1].page + ", " + r2.moves[2].page + ")");
var r0 = mm.roadmap(base({ revenue: "0", bottleneck: "ideas" }));
ok(r0.moves[0].page === "niche-atlas.html", "stage 0 signature move is the Niche Atlas");
var pages = r2.moves.map(function (m) { return m.page; });
ok(new Set(pages).size === 3, "roadmap moves are deduped");
ok(typeof r2.graduate === "string" && r2.graduate.length > 10, "graduate criteria present");
ok(typeof r2.trap === "string" && r2.trap.length > 10, "trap present");

/* 6: STAGES data integrity */
ok(mm.STAGES.length === 5, "exactly 5 stages");
var names = ["The Start Line", "First $100", "The Engine Runs", "The Business", "The Company"];
mm.STAGES.forEach(function (s, i) {
  ok(s.name === names[i], "stage " + i + " named '" + names[i] + "'");
  ok(s.moves.length === 3, "stage " + i + " has 3 moves");
  ok(s.moves.every(function (m) { return m.tool && m.page && m.why; }),
    "stage " + i + " moves all have tool/page/why");
  ok(s.goal && s.trap && s.graduate, "stage " + i + " has goal/trap/graduate");
});
ok(mm.QUIZ.length === 7, "quiz has 7 questions");

/* 7: climb rank structure (wow wave 1) */
ok(mm.RANKS.length === 5, "5 Field Manual ranks");
var rankTitles = ["RECRUIT", "CADET", "OPERATIVE", "COMMANDER", "GENERAL"];
mm.RANKS.forEach(function (r, i) {
  ok(r.title === rankTitles[i], "rank " + i + " is " + rankTitles[i]);
  ok(r.stage === i, "rank " + i + " maps to stage " + i);
  ok(typeof r.tagline === "string" && r.tagline.length > 5, "rank " + i + " has a tagline");
});
ok(JSON.stringify(mm.RANK_THRESHOLDS) === JSON.stringify([0, 100, 275, 500, 775]),
  "rank thresholds [0,100,275,500,775]");
ok(mm.XP_AWARDS.survey === 50 && mm.XP_AWARDS.move === 25 &&
   mm.XP_AWARDS.stage === 100 && mm.XP_AWARDS.mission === 25,
  "XP awards: survey 50 / move 25 / stage 100 / mission 25");

/* 8: rankFor + nextRankInfo boundary pins */
[[0, 0], [99, 0], [100, 1], [274, 1], [275, 2], [499, 2],
 [500, 3], [774, 3], [775, 4], [5000, 4]].forEach(function (pair) {
  ok(mm.rankFor(pair[0]) === pair[1],
    "rankFor(" + pair[0] + ") = " + pair[1] + " (got " + mm.rankFor(pair[0]) + ")");
});
var nri = mm.nextRankInfo(140);
ok(nri.rank === 1 && nri.next === 2 && nri.xpToGo === 135,
  "nextRankInfo(140) = rank 1, next 2, 135 to go");
var nriMax = mm.nextRankInfo(900);
ok(nriMax.rank === 4 && nriMax.next === null && nriMax.xpToGo === 0,
  "nextRankInfo at max rank: no next, 0 to go");

/* 9: awardXP idempotency + revokeKey rank transitions */
var store = mm.blankClimb();
var a1 = mm.awardXP(store, "survey:placed", 50, "survey");
ok(a1.awarded && a1.total === 50 && a1.rankBefore === 0 && a1.rankAfter === 0 && !a1.rankedUp,
  "survey award: +50, still RECRUIT");
var a2 = mm.awardXP(store, "survey:placed", 50, "survey");
ok(!a2.awarded && a2.total === 50, "duplicate key never awards twice");
var a3 = mm.awardXP(store, "stage:0", 100, "stage 0");
ok(a3.awarded && a3.total === 150 && a3.rankedUp && a3.rankAfter === 1,
  "stage clear: +100, total 150, rank up 0->1");
ok(mm.climbTotal(store) === 150, "climbTotal sums the log");
ok(mm.climbHasKey(store, "stage:0") && !mm.climbHasKey(store, "stage:9"),
  "climbHasKey true/false");
var rv = mm.revokeKey(store, "stage:0");
ok(rv.removed && rv.total === 50 && rv.rankedDown && rv.rankAfter === 0,
  "revoke stage: -100, total 50, rank down 1->0");
var rv2 = mm.revokeKey(store, "stage:0");
ok(!rv2.removed && rv2.total === 50, "revoking a missing key is a no-op");
/* full-clear math: survey + 15 moves + 5 stages = 50 + 375 + 500 = 925 >= 775 */
var full = mm.blankClimb();
mm.awardXP(full, "survey:placed", 50, "survey");
for (var mi = 0; mi < 15; mi++) mm.awardXP(full, "move:m" + mi, 25, "m" + mi);
for (var si = 0; si < 5; si++) mm.awardXP(full, "stage:" + si, 100, "s" + si);
ok(mm.climbTotal(full) === 925 && mm.rankFor(mm.climbTotal(full)) === 4,
  "full clear = 925 XP, reaches GENERAL (got " + mm.climbTotal(full) + ")");

/* 10: climb honesty contract — no income promises, ranks = work not money */
var honestSrc = mm.CLIMB_HONESTY + " " +
  mm.RANKS.map(function (r) { return r.title + " " + r.tagline; }).join(" ");
var banned = [/(?<!not to )(?<!never )guarantee[sd]? (you'll|you will|income|earnings|revenue|views|growth|success|results)/i,
  /will earn/i, /risk-free/i, /passive income/i, /get rich/i, /(?<!no )income promises?/i,
  /you will make/i, /earn \$|earn money/i];
banned.forEach(function (re) {
  ok(!re.test(honestSrc), "climb copy: no banned phrasing " + re);
});
ok(/never money earned/i.test(mm.CLIMB_HONESTY),
  "honesty line names the work-not-money contract");
ok(/work journal/i.test(mm.CLIMB_HONESTY), "honesty line calls XP a work journal");

console.log(failures === 0 ? "\nmoney-map: all tests passed" : "\nmoney-map: " + failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
