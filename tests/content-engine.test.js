/* Unit tests for the Content Engine math. Run: node tests/content-engine.test.js
 * Exit 0 = all pass. Sanity contract:
 *  1. Idea sorting: hook score desc, ties by created order, input not mutated.
 *  2. Calendar dealing: rest day untouched; slot counts match cadence x weeks;
 *     top-scored ideas deal first (week 1); empty slots stay OPEN; surplus
 *     ideas land in unplaced; dealing arithmetic mirrors the 90-Day Planner
 *     (longs round-robin on work days, shorts every other day).
 *  3. Batching math: capacity vs required arithmetic; verdict honest
 *     (surplus/balanced/shortfall); negative/NaN inputs clamp; no promises.
 *  4. Repurposing 2.0 map: every derivative carries an original element;
 *     ids unique and aligned with data/content-engine.json; guardrails non-empty.
 *  5. Engine <-> data-contract cross-check against data/content-engine.json.
 */
"use strict";
var path = require("path");
var ROOT = path.join(__dirname, "..");
var CE = require(path.join(ROOT, "assets", "js", "content-engine.js"));
var dataContract = require(path.join(ROOT, "data", "content-engine.json"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function mkIdea(id, format, score, created) {
  return { id: id, title: "Idea " + id, format: format, hookScore: score,
           created: created === undefined ? 0 : created };
}

/* ---------- 1. sorting / filtering ---------- */
console.log("idea sorting");
var ideas = [mkIdea("a", "long", 3, 2), mkIdea("b", "long", 5, 9), mkIdea("c", "short", 5, 1)];
var sorted = CE.sortIdeas(ideas);
ok(sorted.map(function (i) { return i.id; }).join(",") === "c,b,a",
  "hook score desc, ties broken by created asc (c before b)");
ok(ideas[0].id === "a", "input array not mutated");
ok(CE.sortIdeas([]).length === 0, "empty bank sorts to empty");
ok(CE.hookScore(99) === 5 && CE.hookScore(-4) === 1 && CE.hookScore("x") === 1,
  "hook scores clamp to 1..5, garbage -> 1");
var filtered = CE.filterIdeas(ideas, "long");
ok(filtered.length === 2 && filtered.every(function (i) { return i.format === "long"; }),
  "filter by format");
ok(CE.filterIdeas(ideas, "all").length === 3, "filter 'all' keeps everything");
ok(CE.IDEA_FORMATS.join(",") === "long,short,community", "three formats in engine");

/* ---------- 2. calendar dealing ---------- */
console.log("calendar dealing");
var bank = [];
for (var i = 1; i <= 30; i++) {
  bank.push(mkIdea("L" + i, "long", (i % 5) + 1, i));
}
for (var j = 1; j <= 40; j++) {
  bank.push(mkIdea("S" + j, "short", (j % 5) + 1, j));
}
var deal = CE.dealIdeas(bank, { longsPerWeek: 2, shortsPerWeek: 3, restDay: 6, weeks: 13 });
ok(deal.weeks.length === 13, "13 weeks dealt");
ok(deal.totals.long === 26 && deal.totals.short === 39, "slot counts = cadence x weeks");
ok(deal.openSlots === 0, "enough ideas -> zero open slots");
ok(deal.unplaced.length === (30 - 26) + (40 - 39), "surplus ideas stay in the bank as backlog");
var restDayClean = deal.weeks.every(function (wk) {
  return wk.days[6].items.length === 0 && wk.days[6].rest === true;
});
ok(restDayClean, "rest day (Sun) untouched by dealing");
var week1Ids = {};
deal.weeks[0].days.forEach(function (d) {
  d.items.forEach(function (it) { if (it.ideaId) week1Ids[it.ideaId] = true; });
});
var topLongs = CE.sortIdeas(bank.filter(function (i) { return i.format === "long"; })).slice(0, 2);
ok(topLongs.every(function (i) { return week1Ids[i.id]; }),
  "top-scored long ideas deal into week 1");
var midReview = deal.weeks.filter(function (wk) { return wk.midpointReview; });
ok(midReview.length === 1 && midReview[0].week === 7, "week 7 is the midpoint review");

/* shorts every other work day, longs round-robin (planner arithmetic) */
var d2 = CE.dealIdeas([mkIdea("x", "long", 5)], { longsPerWeek: 1, shortsPerWeek: 0, restDay: 6, weeks: 1 });
var longDayIdx = -1;
d2.weeks[0].days.forEach(function (d, idx) { if (d.items.length) longDayIdx = idx; });
ok(longDayIdx === 0, "single long lands on first work day (Mon) when rest=Sun");
var d3 = CE.dealIdeas([mkIdea("y", "short", 5), mkIdea("z", "short", 4)],
  { longsPerWeek: 0, shortsPerWeek: 2, restDay: 6, weeks: 1 });
var shortDays = [];
d3.weeks[0].days.forEach(function (d, idx) { if (d.items.length) shortDays.push(idx); });
ok(shortDays.join(",") === "0,2", "shorts deal Mon then Wed (every other work day)");

/* fewer ideas than slots -> OPEN slots, never filler */
var thin = CE.dealIdeas([mkIdea("only", "long", 5)], { longsPerWeek: 2, shortsPerWeek: 1, restDay: 6, weeks: 2 });
ok(thin.openSlots === 5, "2 weeks x (2+1) slots - 1 idea = 5 open slots");
ok(thin.totals.open === 5 && thin.weeks.every(function (wk) {
  return wk.days.every(function (d) {
    return d.items.every(function (it) { return it.ideaId || it.open === true; });
  });
}), "every unfilled slot is explicitly OPEN");
ok(thin.unplaced.length === 0, "no backlog when ideas are thin");
ok(CE.dealIdeas([], { longsPerWeek: 1, shortsPerWeek: 1, weeks: 1 }).openSlots === 2,
  "empty bank -> all slots open");
ok(CE.dealIdeas(bank, { longsPerWeek: 2, shortsPerWeek: 3, restDay: 6, weeks: 4 }).weeks.length === 4,
  "weeks param honored");

/* ---------- 3. batching math ---------- */
console.log("batching math");
var bm = CE.batchingMath({ videosPerShootDay: 2, shootDaysPerMonth: 4, longsPerWeek: 1, shortsPerWeek: 2 });
ok(Math.abs(bm.requiredLongsPerMonth - 4.33) < 0.01, "required longs = 1/wk x 52/12 ≈ 4.33");
ok(Math.abs(bm.requiredShortsPerMonth - 8.67) < 0.01, "required shorts = 2/wk x 52/12 ≈ 8.67");
ok(bm.shootCapacityLongs === 8, "capacity = 4 shoot days x 2 longs");
ok(bm.shootCapacityShorts === 16, "shorts capacity defaults to 2x longs per shoot day");
ok(bm.verdict === "surplus" && bm.deltaLongs > 0 && bm.deltaShorts > 0, "surplus verdict when capacity covers");
ok(/consistency/i.test(bm.guidance) || /bank/i.test(bm.guidance), "surplus guidance frames consistency");

var shortfall = CE.batchingMath({ videosPerShootDay: 1, shootDaysPerMonth: 2, longsPerWeek: 2, shortsPerWeek: 5 });
ok(shortfall.verdict === "shortfall", "shortfall verdict when capacity misses");
ok(shortfall.deltaLongs < 0, "shortfall delta is negative");
ok(/doesn.t hold/.test(shortfall.guidance), "shortfall guidance names the decision");

var exact = CE.batchingMath({ videosPerShootDay: 13, shootDaysPerMonth: 1, longsPerWeek: 3, shortsPerWeek: 0 });
ok(exact.verdict === "balanced" || exact.verdict === "surplus",
  "capacity 13 vs required 13.0 -> balanced or surplus (rounding-safe)");

var clamped = CE.batchingMath({ videosPerShootDay: -5, shootDaysPerMonth: "x", longsPerWeek: 1, shortsPerWeek: 0 });
ok(clamped.inputs.videosPerShootDay === 1 && clamped.inputs.shootDaysPerMonth === 1,
  "negative/NaN inputs clamp to defaults, never NaN math");
var zero = CE.batchingMath({ videosPerShootDay: 2, shootDaysPerMonth: 4, longsPerWeek: 0, shortsPerWeek: 0 });
ok(zero.verdict === "surplus" && zero.requiredLongsPerMonth === 0, "zero cadence is trivially covered");

/* ---------- 4. repurposing 2.0 map ---------- */
console.log("repurposing 2.0");
var map = CE.repurposeMap("I tested 5 budget mics and the $30 one won");
ok(map.length >= 7, "full derivative map: 7 derivatives");
var ids = map.map(function (d) { return d.id; });
ok(new Set(ids).size === ids.length, "derivative ids unique");
ok(map.every(function (d) { return d.originalElement && d.originalElement.length > 10; }),
  "every derivative carries a required original element");
ok(map.every(function (d) { return d.platform && d.day && d.task && d.effort; }),
  "every derivative has platform, day, task, effort");
ok(map.some(function (d) { return d.id === "x_thread"; }) &&
   map.some(function (d) { return d.id === "newsletter_issue"; }) &&
   map.some(function (d) { return d.id === "community_reaction"; }),
  "2.0 map covers X thread, newsletter, community posts");
var guards = CE.originalityGuardrails();
ok(guards.length >= 4 && guards.every(function (g) { return g.rule && g.detail; }),
  "originality guardrails non-empty with rule + detail");
ok(guards.some(function (g) { return g.id === "no_reupload_spam"; }),
  "guardrails include the no-re-upload-spam rule");

/* ---------- 5. engine <-> data-contract cross-check ---------- */
console.log("data-contract cross-check");
var dcIds = dataContract.repurposing_2_0.derivatives.map(function (d) { return d.id; });
ok(dcIds.length === ids.length && dcIds.every(function (id) { return ids.indexOf(id) !== -1; }),
  "engine derivative ids match data/content-engine.json");
var dcFormats = dataContract.idea_formats.map(function (f) { return f.id; });
ok(dcFormats.join(",") === CE.IDEA_FORMATS.join(","), "engine formats match data contract");
var dcHooks = dataContract.hook_structures.map(function (h) { return h.id; });
ok(dcHooks.join(",") === "open-loop,cold-start,contrarian,numbered,question",
  "data contract references all 5 Playbook hook structures");
var dcGuardIds = dataContract.originality_guardrails.map(function (g) { return g.id; });
var engGuardIds = guards.map(function (g) { return g.id; });
ok(dcGuardIds.every(function (id) { return engGuardIds.indexOf(id) !== -1; }),
  "guardrail ids match data contract");
ok(/not financial, legal, or tax advice/i.test(dataContract.disclaimer),
  "data contract carries the disclaimer");

/* ---------- 6. simulator bridge + export ---------- */
console.log("bridge + export");
var simIn = CE.simInputFromCadence(3, 25);
ok(simIn.longform_per_week === 3 && simIn.shorts_per_week === 21,
  "sim bridge clamps shorts to the simulator's 21 cap");
var text = CE.exportCalendarText(deal);
ok(text.indexOf("MY 90-DAY CONTENT CALENDAR") === 0 && text.indexOf("MIDPOINT REVIEW") !== -1,
  "export text carries header + midpoint review");
ok(text.indexOf("BACKLOG") !== -1, "export text lists the unplaced backlog");

console.log(failures === 0 ? "\nALL CONTENT-ENGINE TESTS PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
