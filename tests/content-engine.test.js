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
 *  6. Wave 23 (2.0): planBatchWeek pinned fixtures (default + custom task
 *     minutes, over/tight/holds verdicts, day-block dealing, input clamping);
 *     hookPatterns id/mechanic/spotted_in contract vs data; adaptChecklist
 *     completeness (all 12 rule sets, universal checks, Oct-1 gate, edge
 *     cases); algorithmSignals hierarchies + source_label discipline.
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

/* ---------- 7. weekly batch scheduler (2.0) ---------- */
console.log("batch scheduler");
ok(CE.VERSION === "1.1.0", "engine version bumped to 1.1.0");

/* pinned fixture: 20h/week, 1 long + 3 shorts, rest Sun, defaults.
 * long task total 570 min, short task total 90 min -> 570 + 3*90 = 840 min = 14h. */
var wk = CE.planBatchWeek({ weeklyHours: 20, longsPerWeek: 1, shortsPerWeek: 3, restDay: 6 });
ok(wk.requiredHours === 14, "required = 14h (570 + 3x90 min)");
ok(wk.feasible === true && wk.verdict === "holds" && wk.slackHours === 6,
  "20h available -> holds with 6h slack");
ok(wk.blocks.map(function (b) { return b.id + ":" + b.hours; }).join(" ") ===
  "film:4.5 edit:8.25 publish:1.25", "blocks: film 4.5h / edit 8.25h / publish 1.25h");
var wkDays = wk.days.map(function (d) {
  return d.day + "=" + d.tasks.map(function (t) { return t.label + " " + t.hours + "h"; }).join("+");
}).join(" | ");
ok(wkDays === "Mon=Film day 4.5h | Tue=Edit day 8h | Wed=Edit day 0.25h | Thu=Publish day 1.25h",
  "day dealing: film Mon, edit Tue(+Wed spill), publish Thu; rest day untouched — " + wkDays);
ok(wk.days.every(function (d) {
  var load = d.tasks.reduce(function (s, t) { return s + t.hours; }, 0);
  return load <= 8.001;
}), "no day exceeds the 8h/day cap");
ok(wk.inputs.taskMinutes.long.edit === 360 && wk.inputs.taskMinutes.short.film === 30,
  "default task minutes surface in inputs");

/* over: 5h/week for the same cadence */
var over = CE.planBatchWeek({ weeklyHours: 5, longsPerWeek: 1, shortsPerWeek: 3, restDay: 6 });
ok(over.feasible === false && over.verdict === "over" && over.slackHours === -9,
  "5h available -> over, short by 9h");
ok(/drop a weekly slot|add hours|cut per-task/.test(over.guidance),
  "over guidance names the levers, not heroics");

/* tight: 15h/week -> 1h slack */
var tight = CE.planBatchWeek({ weeklyHours: 15, longsPerWeek: 1, shortsPerWeek: 3, restDay: 6 });
ok(tight.verdict === "tight" && tight.slackHours === 1, "1h slack -> tight verdict");

/* custom task minutes */
var custom = CE.planBatchWeek({
  weeklyHours: 10, longsPerWeek: 2, shortsPerWeek: 0, restDay: 0,
  taskMinutes: { long: { film: 60, edit: 120, publish: 15 } }
});
ok(custom.requiredHours === 6.5, "custom minutes: 2 x 195 min = 6.5h");
ok(custom.blocks[0].hours === 2 && custom.blocks[1].hours === 4 && custom.blocks[2].hours === 0.5,
  "custom minutes flow into film/edit/publish blocks");
ok(custom.days[0].day === "Tue", "rest day Mon (0) -> week starts on Tue");

/* clamping + zero cadence */
var clampWk = CE.planBatchWeek({ weeklyHours: -3, longsPerWeek: "x", shortsPerWeek: NaN });
ok(clampWk.availableHours === 0 && clampWk.requiredHours === 0 && clampWk.verdict === "holds",
  "negative/NaN inputs clamp; zero cadence holds trivially");
ok(clampWk.days.length === 0, "zero work blocks -> empty day list");
var badTm = CE.planBatchWeek({ weeklyHours: 50, longsPerWeek: 1, shortsPerWeek: 0,
  taskMinutes: { long: { film: -10, edit: "junk" } } });
ok(badTm.inputs.taskMinutes.long.film === 180 && badTm.inputs.taskMinutes.long.edit === 360,
  "bad per-task minutes fall back to defaults");

/* blocks always sum to requiredHours (rounding-safe) */
var sumBlocks = wk.blocks.reduce(function (s, b) { return s + b.hours; }, 0);
ok(Math.abs(sumBlocks - wk.requiredHours) < 0.01, "blocks sum to requiredHours");

/* ---------- 8. hook patterns (2.0) ---------- */
console.log("hook patterns");
var pats = CE.hookPatterns();
ok(pats.length === 6, "six trend-derived patterns");
var patIds = pats.map(function (p) { return p.id; });
ok(new Set(patIds).size === 6, "pattern ids unique");
ok(pats.every(function (p) { return p.name && p.formula && p.adapt; }),
  "every pattern has name, formula, adapt");
ok(pats.every(function (p) { return p.mechanic && /completion|watch time|sends|shares|rewatches|comments|saves|search/i.test(p.mechanic); }),
  "every pattern names the signal/mechanic it exploits");
ok(pats.every(function (p) { return p.spotted_in && /2026/.test(p.spotted_in); }),
  "every pattern cites its Oct-2026 spotted-in source");
var dcPats = dataContract.hook_patterns.patterns;
ok(dcPats.map(function (p) { return p.id; }).join(",") === patIds.join(","),
  "engine pattern ids match data contract (order-stable)");
ok(dcPats.every(function (p, i) { return p.mechanic === pats[i].mechanic && p.formula === pats[i].formula; }),
  "engine pattern content matches data contract");
ok(/structures, not|steal the structure/i.test(dataContract.hook_patterns.basis),
  "data contract frames patterns as structures, not trend-chasing");
ok(/never guarantees|improves your odds/i.test(dataContract.hook_patterns.honesty_note),
  "honesty note: patterns are not predictions");

/* ---------- 9. cross-post adaptation (2.0) ---------- */
console.log("cross-post adaptation");
var mx = dataContract.adaptation_matrix;
var ruleKeys = Object.keys(mx.rules);
ok(ruleKeys.length === 12, "12 source->destination rule sets");
ok(["tiktok", "shorts", "reels", "facebook"].every(function (s) {
  return ["tiktok", "shorts", "reels", "facebook"].every(function (d) {
    return s === d || ruleKeys.indexOf(s + ">" + d) !== -1;
  });
}), "full 4x3 matrix, no self-routes");
ok(mx.universal_checks.length === 6, "6 universal checks");
ok(/channel level/i.test(mx.oct1_gate), "Oct-1 gate names the channel-level judgment");

var t2s = CE.adaptChecklist("tiktok", ["shorts"]);
ok(t2s.ok && t2s.cards.length === 1 && t2s.cards[0].to === "shorts",
  "tiktok->shorts builds one card");
ok(t2s.cards[0].changes.length === mx.rules["tiktok>shorts"].length &&
   t2s.cards[0].changes.every(function (c, i) { return c === mx.rules["tiktok>shorts"][i]; }),
  "engine card content matches the data-contract rule set");
ok(t2s.cards[0].changes.some(function (c) { return /AI-content label/.test(c); }),
  "tiktok->shorts carries the AI disclosure rule");
var t2r = CE.adaptChecklist("tiktok", ["reels"]);
ok(t2r.cards[0].changes.some(function (c) { return /watermark/i.test(c); }),
  "tiktok->reels strips the watermark (explicit Reels deprioritization)");
ok(t2s.universal.length === 6 && /channel level/i.test(t2s.gate),
  "universal checks + Oct-1 gate ride along");
ok(t2s.cards[0].grammar && t2s.cards[0].grammar.length > 5, "card carries the destination grammar");

/* every rule set is complete and non-trivial */
ok(ruleKeys.every(function (k) {
  var r = CE.adaptChecklist(k.split(">")[0], [k.split(">")[1]]);
  return r.ok && r.cards.length === 1 && r.cards[0].changes.length >= 3 &&
    r.cards[0].changes.every(function (c) { return c.length > 20; });
}), "all 12 rule sets resolve with 3+ substantive changes");

/* edge cases */
ok(CE.adaptChecklist("myspace", ["shorts"]).ok === false, "unknown source -> ok:false");
ok(CE.adaptChecklist("tiktok", ["tiktok", "shorts"]).cards.length === 1,
  "source in destinations is ignored");
ok(CE.adaptChecklist("tiktok", ["nope", "shorts"]).cards.length === 1,
  "unknown destinations are ignored");
ok(CE.adaptChecklist("tiktok", []).cards.length === 0, "empty destinations -> no cards");
ok(CE.adaptChecklist("SHORTS", ["TIKTOK"]).ok === true, "platform ids are case-insensitive");

/* ---------- 10. algorithm signals (2.0) ---------- */
console.log("algorithm signals");
var sigs = CE.algorithmSignals();
ok(sigs.length === 3, "three platform records");
var sigIds = sigs.map(function (s) { return s.id; });
ok(sigIds.join(",") === "tiktok,shorts,reels", "tiktok/shorts/reels");
var LABELS = ["platform-published", "verified-multi-source", "single-source", "creator-lore"];
ok(sigs.every(function (s) { return s.label && s.optimize_for; }),
  "every platform has a label + optimize_for");
ok(sigs.every(function (s) {
  return s.hierarchy.every(function (h, i) { return h.rank === i + 1; });
}), "hierarchies are rank-ordered 1..n");
ok(sigs.every(function (s) {
  return s.hierarchy.every(function (h) { return LABELS.indexOf(h.source_label) !== -1; }) &&
         s.mechanics.every(function (m) { return LABELS.indexOf(m.source_label) !== -1; });
}), "every claim carries a valid source_label");
ok(sigs.every(function (s) {
  return s.hierarchy.every(function (h) { return h.signal && h.source; }) &&
         s.mechanics.every(function (m) { return m.claim && m.source; });
}), "every claim has signal/claim text + source");
var tt = CE.algorithmSignals("tiktok")[0];
ok(tt.hierarchy.map(function (h) { return h.signal; }).join("|") ===
  "Watch time + completion rate|Rewatches, shares, saves|Comments|Likes",
  "TikTok hierarchy matches the verified three-source consensus");
ok(tt.hierarchy.every(function (h) { return h.source_label === "verified-multi-source"; }),
  "TikTok hierarchy labeled verified-multi-source");
ok(tt.mechanics.some(function (m) { return m.source_label === "platform-published" && /engagement-bait/.test(m.claim); }),
  "TikTok mechanics include the platform-published engagement-bait rule");
var sh = CE.algorithmSignals("shorts")[0];
ok(sh.mechanics.some(function (m) { return /Oct 1, 2026/.test(m.claim) && m.source_label === "platform-published"; }),
  "Shorts mechanics include the platform-published Oct-1 announcement");
ok(sh.mechanics.some(function (m) { return /AI disclosure/.test(m.claim) && /labeled.*normal distribution/i.test(m.claim); }),
  "Shorts mechanics include the AI-disclosure rule (labels don't hurt)");
var re = CE.algorithmSignals("reels")[0];
ok(re.hierarchy[0].signal === "Sends per reach" && re.hierarchy[0].source_label === "platform-published",
  "Reels #1 = sends per reach, platform-published (Mosseri)");
ok(re.mechanics.some(function (m) { return /invented number/.test(m.claim); }),
  "Reels mechanics carry the 3-5x debunk");
ok(CE.algorithmSignals("nope").length === 0, "unknown platform -> empty");

/* engine <-> data contract for algorithm signals */
var dcSigs = dataContract.algorithm_signals.platforms;
ok(dcSigs.map(function (s) { return s.id; }).join(",") === sigIds.join(","),
  "engine signal ids match data contract");
ok(dcSigs.every(function (s, i) {
  var e = sigs[i];
  return s.hierarchy.length === e.hierarchy.length &&
         s.hierarchy.every(function (h, j) { return h.signal === e.hierarchy[j].signal &&
           h.source_label === e.hierarchy[j].source_label; }) &&
         s.mechanics.length === e.mechanics.length &&
         s.mechanics.every(function (m, j) { return m.claim === e.mechanics[j].claim; });
}), "engine signal content matches data contract");
ok(Object.keys(dataContract.algorithm_signals.source_labels).join(",") ===
  "platform-published,verified-multi-source,single-source,creator-lore",
  "data contract defines all four source labels");

/* honesty contract holds for the 2.0 additions */
ok(/not financial, legal, or tax advice/i.test(dataContract.disclaimer),
  "disclaimer intact on the v1.1.0 contract");
ok(dataContract.version === "1.1.0", "data contract version is 1.1.0");
ok(/planning aid/i.test(dataContract.batching_scheduler.basis) ||
   /adjustable starting estimates/i.test(dataContract.batching_scheduler.basis),
  "scheduler defaults labeled as estimates, not benchmarks");

console.log(failures === 0 ? "\nALL CONTENT-ENGINE TESTS PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
