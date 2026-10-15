/* Career Path engine tests (rotation 20) — the Zero-to-Career system.
 * Pins: 5 stages in order; 35 lessons (13 reads / 22 drills); every one
 * of the 32 catalogue tools mapped to exactly one stage; the Saved
 * Shelf inside Foundation; progress arithmetic (normalize/toggle/stale
 * counted apart); next-step order; stage DO-verdicts present. */
"use strict";
const fs = require("fs");
const path = require("path");
const CP = require(path.join(__dirname, "..", "assets", "js", "career-path.js"));

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log("FAIL: " + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + " (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")"); }

// --- stage shape ---
eq(CP.STAGES.map(function (s) { return s.id; }), ["foundation", "build", "publish", "growth", "career"], "five stages in journey order");
CP.STAGES.forEach(function (s) {
  ok(typeof s.doVerdict === "string" && s.doVerdict.length > 40, s.id + " carries a DO-verdict");
  ok(typeof s.promise === "string" && s.promise.length > 40, s.id + " carries a promise");
});
var lessons = CP.allLessons();
eq(lessons.length, 35, "35 lessons on the path");
eq(lessons.filter(function (x) { return x.lesson.kind === "read"; }).length, 13, "13 reads (9 phases + 4 intel files)");
eq(lessons.filter(function (x) { return x.lesson.kind === "drill"; }).length, 22, "22 authored drills");
lessons.forEach(function (x) {
  if (x.lesson.kind === "read") ok(!!x.lesson.href, x.lesson.id + " read has an href");
  if (x.lesson.kind === "drill") { ok(!!x.lesson.tool, x.lesson.id + " drill names its tool"); ok(!!x.lesson.doneWhen, x.lesson.id + " drill has a done criterion"); }
  // every drill's tool belongs to the same stage's toolkit
  if (x.lesson.kind === "drill") {
    var st = CP.STAGES.filter(function (s) { return s.id === x.stageId; })[0];
    ok(st.tools.indexOf(x.lesson.tool) >= 0, x.lesson.id + " drill tool is in its stage toolkit");
  }
});
// --- provenance labelling (G-1): every lesson labelled from its own data ---
var builtLessons = [];
CP.buildPath([]).stages.forEach(function (s) { s.lessons.forEach(function (l) { builtLessons.push(l); }); });
eq(builtLessons.length, 35, "built path carries all 35 lessons for provenance check");
eq(builtLessons.filter(function (l) { return l.provenanceLabel === "Creator Academy: original drill"; }).length, 22, "22 drills labelled Creator Academy: original drill");
eq(builtLessons.filter(function (l) { return l.provenance === "read" && l.provenanceLabel.indexOf("Read \u00b7 from ") === 0; }).length, 13, "13 reads labelled Read \u00b7 from [their named source]");
ok(builtLessons.every(function (l) { return typeof l.provenanceLabel === "string" && l.provenanceLabel.length > 0 && l.provenanceLabel !== "Provenance not recorded"; }), "no lesson on the path is left with unknown provenance");
lessons.forEach(function (x) {
  if (x.lesson.kind === "read") {
    ok(typeof x.lesson.source === "string" && x.lesson.source.length > 0, x.lesson.id + " read names its source in the data");
    eq(CP.lessonProvenance(x.lesson).label, "Read \u00b7 from " + x.lesson.source, x.lesson.id + " label is derived from its recorded source");
  }
  if (x.lesson.kind === "drill") eq(CP.lessonProvenance(x.lesson).origin, "creator-academy", x.lesson.id + " drill provenance is Creator Academy original");
});
eq(CP.lessonProvenance({ kind: "read", title: "sourceless" }).label, "Provenance not recorded", "a read with no recorded source gets the honest unknown, never a guess");
eq(CP.lessonProvenance({ kind: "mystery" }).label, "Provenance not recorded", "an unknown lesson kind gets the honest unknown");
eq(CP.lessonProvenance(null).label, "Provenance not recorded", "a missing lesson gets the honest unknown");
var expProv = CP.exportPath(CP.buildPath([]));
ok(expProv.indexOf("Creator Academy: original drill") >= 0 && expProv.indexOf("Read \u00b7 from Phase 0") >= 0, "export carries the provenance labels");
var uiSrc = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "career-path-ui.js"), "utf8");
ok(uiSrc.indexOf("provenanceLabel") >= 0, "page UI renders the provenance label from the lesson data");

// reads resolve to generated pages that exist in content/CHAPTERS space
var readHrefs = lessons.filter(function (x) { return x.lesson.kind === "read"; }).map(function (x) { return x.lesson.href; });
["phase-0-start-from-nothing.html", "phase-5-monetization-stack.html", "phase-8-scale.html", "platform-rules-bible.html", "sponsor-playbook.html", "rate-card.html", "breakout-format-intel.html"].forEach(function (h) {
  ok(readHrefs.indexOf(h) >= 0, "read present: " + h);
});

// --- tool mapping: 32/32, exactly once ---
var toolsDoc = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "v1", "tools.json"), "utf8"));
var catalogIds = toolsDoc.tools.map(function (t) { return t.id; });
eq(catalogIds.length, 32, "catalogue holds 32 tools");
var mapped = [];
CP.STAGES.forEach(function (s) { s.tools.forEach(function (t) { mapped.push(t); }); });
eq(mapped.length, 32, "32 tool placements across stages");
eq(mapped.slice().sort(), catalogIds.slice().sort(), "every catalogue tool mapped exactly once");
var stageOf = CP.toolStageMap();
eq(stageOf["saved-shelf"], "foundation", "Saved Shelf wired into Foundation as the cross-path collection");
eq(stageOf["deal-pipeline"], "career", "Deal Pipeline sits in Monetization & Career");
eq(stageOf["quiz"], "foundation", "Niche Picker opens the path");
eq(Object.keys(stageOf).length, 32, "toolStageMap covers 32 tools");

// --- progress arithmetic ---
var empty = CP.buildPath([]);
eq(empty.doneCount, 0, "empty progress: 0 done");
eq(empty.totalLessons, 35, "empty progress: 35 total");
eq(empty.currentStageId, "foundation", "empty progress starts at Foundation");
eq(empty.nextStep.lesson.id, "f-read-phase0", "first next step is Phase 0 read");
eq(empty.stages[0].status, "not-started", "stage 1 not-started when empty");
var one = CP.toggleLesson([], "f-read-phase0");
eq(one, ["f-read-phase0"], "toggle adds a lesson");
eq(CP.toggleLesson(one, "f-read-phase0"), [], "toggle again removes it (no mutation of caller's list)");
var p1 = CP.buildPath(one);
eq(p1.doneCount, 1, "one done counted");
eq(p1.nextStep.lesson.id, "f-drill-statement", "next step advances within the stage");
eq(p1.stages[0].status, "in-progress", "stage 1 in-progress after one lesson");
var fDone = CP.buildPath(CP.STAGES[0].lessons.map(function (l) { return l.id; }));
eq(fDone.stages[0].status, "complete", "stage completes when all its lessons are done");
eq(fDone.currentStageId, "build", "current stage advances to Build");
eq(fDone.nextStep.stageId, "build", "next step is in Build");
var all = CP.buildPath(CP.lessonIds());
eq(all.complete, true, "all lessons done = path complete");
eq(all.nextStep, null, "no next step when complete");
eq(all.pct, 100, "100% when complete");
// stale ids counted apart, never rendered as progress
var stale = CP.buildPath(["f-read-phase0", "retired-lesson", "retired-lesson"]);
eq(stale.doneCount, 1, "stale ids never count as done");
eq(stale.staleCount, 1, "stale ids counted apart once");
eq(stale.staleIds, ["retired-lesson"], "stale id named");
eq(CP.normalizeProgress(["bogus", "f-read-phase0", "f-read-phase0"]), ["f-read-phase0"], "normalize dedupes and drops unknown");
eq(CP.normalizeProgress("nope"), [], "non-array progress normalizes to empty");
// export carries the DO-verdicts and the Watch distinction
var exp = CP.exportPath(CP.buildPath([]));
ok(exp.indexOf("Algorithm Watch") >= 0, "export names the Watch layer");
ok(exp.indexOf("STAGE 5") >= 0 && exp.indexOf("you can") >= 0, "export prints per-stage DO-verdicts");
// engine source honesty: no invented earnings promises
var src = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "career-path.js"), "utf8");
ok(!/\$\d[\d,]*\s*(per month|\/month|a month)/.test(src), "engine promises no monthly income figure");

console.log("career-path.test.js: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
