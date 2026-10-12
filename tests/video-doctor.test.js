/* Unit tests for the Diagnose My Video engine. Run: node tests/video-doctor.test.js
 * Exit 0 = all pass. Contracts:
 *  1. validInput accepts complete valid inputs; rejects unknown enums, missing
 *     fields, null.
 *  2. diagnose() works for all 8 symptoms: causes ranked 1..N, each with
 *     cause/why/fixes/links; every link page ends .html and is a real site page.
 *  3. Honesty: CTR thresholds are labeled as creator-reported rules of thumb.
 *  4. Context notes: tuition-phase note only when experience=under-50;
 *     swipe-feed CTR note only for low-ctr on non-longform platforms;
 *     bridge note for shorts-no-crossover diagnosed from longform.
 *  5. diagnose throws on invalid input.
 *  6. SYMPTOMS data integrity: 8 unique ids matching SYMPTOM_IDS.
 */
"use strict";
var path = require("path");
var vd = require(path.join("..", "assets", "js", "video-doctor.js"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

function base(over) {
  var a = { symptom: "low-ctr", platform: "longform", experience: "over-50" };
  if (over) for (var k in over) a[k] = over[k];
  return a;
}

/* real pages this tool may link to (must stay in sync with the site map) */
var VALID_PAGES = [
  "phase-1-content-engine.html", "phase-2-youtube-mastery.html",
  "phase-4-audience-to-community.html", "shortform-playbook.html",
  "hook-builder.html", "metrics-glossary.html"
];

/* 1: input validation */
ok(vd.validInput(base()), "complete valid input passes");
ok(!vd.validInput(base({ symptom: "no-views" })), "unknown symptom rejected");
ok(!vd.validInput(base({ platform: "myspace" })), "unknown platform rejected");
ok(!vd.validInput(base({ experience: "veteran" })), "unknown experience rejected");
var missing = base(); delete missing.platform;
ok(!vd.validInput(missing), "missing field rejected");
ok(!vd.validInput(null), "null rejected");
ok(!vd.validInput("low-ctr"), "non-object rejected");

/* 6: data integrity */
ok(vd.SYMPTOMS.length === 8, "exactly 8 symptoms");
ok(vd.SYMPTOM_IDS.length === 8, "exactly 8 symptom ids");
var ids = vd.SYMPTOMS.map(function (s) { return s.id; });
ok(new Set(ids).size === 8, "symptom ids unique");
ok(vd.SYMPTOM_IDS.every(function (id) { return ids.indexOf(id) !== -1; }),
  "SYMPTOM_IDS matches SYMPTOMS ids");
vd.SYMPTOMS.forEach(function (s) {
  ok(s.label && s.desc && s.summary && s.watchThis, s.id + ": label/desc/summary/watchThis present");
  ok(Array.isArray(s.causes) && s.causes.length >= 1, s.id + ": at least one cause");
});

/* 2: diagnosis shape for every symptom */
vd.SYMPTOM_IDS.forEach(function (id) {
  var d = vd.diagnose(base({ symptom: id }));
  ok(d.symptom.id === id, id + ": diagnosis carries the symptom id");
  ok(typeof d.summary === "string" && d.summary.length > 20, id + ": summary present");
  ok(typeof d.watchThis === "string" && d.watchThis.length > 10, id + ": watchThis present");
  d.causes.forEach(function (c, i) {
    var tag = id + " cause #" + (i + 1);
    ok(c.rank === i + 1, tag + ": rank sequential");
    ok(c.cause && c.why, tag + ": cause + why present");
    ok(Array.isArray(c.fixes) && c.fixes.length >= 1 &&
       c.fixes.every(function (f) { return typeof f === "string" && f.length > 10; }),
      tag + ": 1+ concrete fixes");
    ok(Array.isArray(c.links) && c.links.length >= 1, tag + ": 1+ chapter/tool links");
    c.links.forEach(function (l) {
      ok(l.label && /\.html$/.test(l.page), tag + ": link has label + .html page");
      ok(VALID_PAGES.indexOf(l.page) !== -1, tag + ": link page is a real site page (" + l.page + ")");
    });
  });
});

/* 3: honesty contract — no invented benchmarks */
var ctr = vd.diagnose(base({ symptom: "low-ctr" }));
var ctrText = ctr.causes.map(function (c) { return c.why; }).join(" ");
ok(/rule of thumb/i.test(ctrText), "low-ctr: thresholds labeled as rule of thumb");
ok(/creator-reported/i.test(ctrText), "low-ctr: ranges flagged as creator-reported");
var allText = vd.SYMPTOMS.map(function (s) {
  return s.summary + " " + s.causes.map(function (c) { return c.cause + " " + c.why; }).join(" ");
}).join(" ");
ok(!/platform.?published/i.test(allText), "no claim of platform-published benchmarks anywhere");
ok(!/guarantee/i.test(allText), "no guarantee language anywhere");

/* 4: context notes */
var tuition = vd.diagnose(base({ symptom: "flat-low", experience: "under-50" }));
ok(tuition.notes.length === 1 && /tuition phase/i.test(tuition.notes[0]),
  "under-50 gets the tuition-phase note");
var veteran = vd.diagnose(base({ symptom: "flat-low", experience: "over-50" }));
ok(veteran.notes.length === 0, "over-50 gets no tuition note");
var swipe = vd.diagnose(base({ symptom: "low-ctr", platform: "tiktok" }));
ok(swipe.notes.some(function (n) { return /completion rate/i.test(n); }),
  "low-ctr on TikTok notes completion rate instead of CTR");
var lf = vd.diagnose(base({ symptom: "low-ctr", platform: "longform" }));
ok(lf.notes.length === 0, "low-ctr on longform gets no platform note");
var bridge = vd.diagnose(base({ symptom: "shorts-no-crossover", platform: "longform" }));
ok(bridge.notes.some(function (n) { return /bridge/i.test(n); }),
  "shorts-no-crossover from longform gets the bridge note");
var bridge2 = vd.diagnose(base({ symptom: "shorts-no-crossover", platform: "shorts" }));
ok(bridge2.notes.length === 0, "shorts-no-crossover from shorts gets no bridge note");

/* 5: diagnose throws on invalid input */
var threw = false;
try { vd.diagnose(base({ symptom: "nope" })); } catch (e) { threw = true; }
ok(threw, "diagnose throws on invalid input");

console.log(failures === 0 ? "\nvideo-doctor: all tests passed" : "\nvideo-doctor: " + failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
