/* Unit tests for the Cadence Coach engine. Run: node tests/cadence.test.js
 * Exit 0 = all pass. Pinned fixtures:
 *  1. validInput — platform/hour/minute/rest/stage/priority validation.
 *  2. capacityMath — production-minute arithmetic vs pinned numbers.
 *  3. recommend — allocation per priority, verdict bands, ramp math,
 *     platform-note gating, tuition/method notes.
 *  4. dealWeek — 7-day shape, rest-day emptiness, totals, spread.
 *  5. honesty contract — no guarantee / income-promise language anywhere
 *     the engine emits; disclaimer present; minutes labeled estimates.
 */
"use strict";
var path = require("path");
var ROOT = path.join(__dirname, "..");
var CC = require(path.join(ROOT, "assets", "js", "cadence.js"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function base(over) {
  var o = {
    platforms: ["youtube", "shorts"], weeklyHours: 20,
    longMins: 570, shortMins: 90, restDay: 6, stage: 1, priority: "balanced"
  };
  if (over) for (var k in over) o[k] = over[k];
  return o;
}

/* ---------- 1. validInput ---------- */
console.log("validInput");
var v = CC.validInput(base());
ok(v.ok && v.errors.length === 0, "clean input validates");
ok(!CC.validInput(base({ platforms: [] })).ok, "empty platforms rejected");
ok(!CC.validInput(base({ platforms: ["youtube", "myspace"] })).ok, "unknown platform rejected");
ok(CC.validInput(base({ platforms: ["YOUTUBE"] })).ok, "platform case-insensitive");
ok(!CC.validInput(base({ weeklyHours: 0 })).ok, "0 hours rejected");
ok(!CC.validInput(base({ weeklyHours: 81 })).ok, "81 hours rejected");
ok(!CC.validInput(base({ weeklyHours: NaN })).ok, "NaN hours rejected");
ok(!CC.validInput(base({ longMins: 4 })).ok, "4-min long rejected");
ok(!CC.validInput(base({ shortMins: 3001 })).ok, "3001-min short rejected");
ok(!CC.validInput(base({ restDay: 7 })).ok, "restDay 7 rejected");
ok(!CC.validInput(base({ stage: 5 })).ok, "stage 5 rejected");
ok(!CC.validInput(base({ priority: "viral" })).ok, "unknown priority rejected");
ok(!CC.validInput({}).ok, "empty object rejected");

/* ---------- 2. capacityMath ---------- */
console.log("capacityMath");
var cap = CC.capacityMath(base());
ok(cap.totalMins === 1200, "20h = 1200 total mins");
ok(cap.prodMins === 960, "20% overhead -> 960 production mins");
ok(cap.overheadMins === 240, "240 overhead mins reserved");
ok(cap.maxLongs === 1, "960/570 -> maxLongs 1");
ok(cap.maxShorts === 10, "960/90 -> maxShorts 10");
var cap2 = CC.capacityMath(base({ weeklyHours: 10, longMins: 300, shortMins: 60 }));
ok(cap2.prodMins === 480 && cap2.maxLongs === 1 && cap2.maxShorts === 8,
  "10h custom minutes: 480 prod, 1 long, 8 shorts");

/* ---------- 3. recommend ---------- */
console.log("recommend");
var r = CC.recommend(base());
ok(r.ok, "recommend ok on clean input");
ok(r.longs === 0 && r.shorts === 5,
  "balanced 20h: half=480 -> 0 longs (480<570) + 5 shorts");
ok(r.usedMins === 450, "usedMins 450 = 5*90");
ok(Math.abs(r.utilization - 450 / 960) < 1e-9, "utilization vs production mins");
ok(r.verdict === "holds", "450/960 = 0.47 -> holds");
ok(r.ramp.longs === 0 && r.ramp.shorts === 3, "ramp: 0 longs, floor(5*0.7)=3 shorts");
ok(r.schedule.length === 7, "7-day schedule");
ok(r.platformNotes.length === 2, "2 platform notes for 2 platforms");
ok(r.inputs.priority === "balanced", "inputs echo");

var rl = CC.recommend(base({ priority: "longs" }));
ok(rl.longs === 1 && rl.shorts === 4, "longs-first 20h: 1 long, (960-570)/90=4 shorts");
ok(rl.usedMins === 570 + 360, "longs-first usedMins 930");

var rs = CC.recommend(base({ priority: "shorts" }));
ok(rs.shorts === 10 && rs.longs === 0, "shorts-first 20h: 10 shorts, (960-900)<570 -> 0 longs");

var ytonly = CC.recommend(base({ platforms: ["youtube"], weeklyHours: 30 }));
ok(ytonly.longs === 2 && ytonly.shorts === 0, "youtube-only 30h: floor(1440/570)=2 longs, 0 shorts");

var igonly = CC.recommend(base({ platforms: ["instagram"], weeklyHours: 10, priority: "longs" }));
ok(igonly.longs === 0 && igonly.shorts === 5, "instagram-only ignores longs priority: 5 shorts");

/* verdict bands */
var tight = CC.recommend(base({ platforms: ["shorts"], weeklyHours: 5, shortMins: 60 }));
/* prodMins=240, shorts=4, used=240, util=1.0 -> over */
ok(tight.shorts === 4 && tight.verdict === "over", "240/240 production -> over");
var tight2 = CC.recommend(base({ platforms: ["shorts"], weeklyHours: 5, shortMins: 70 }));
/* prodMins=240, shorts=3, used=210, util=0.875 -> tight */
ok(tight2.verdict === "tight" && Math.abs(tight2.utilization - 0.875) < 1e-9, "0.875 -> tight");
var holds = CC.recommend(base({ platforms: ["shorts"], weeklyHours: 5, shortMins: 90 }));
/* shorts=2, used=180, util=0.75 -> tight; make holds: */
var holds2 = CC.recommend(base({ platforms: ["shorts"], weeklyHours: 10, shortMins: 90 }));
/* prodMins=480, shorts=5, used=450, util=0.9375 -> tight; use bigger week */
/* holds needs one piece >= 30% of production mins (flooring eats the rest):
   20h youtube-only -> prodMins 960, 1 long = 570, util 0.594 */
var holds3 = CC.recommend(base({ platforms: ["youtube"], weeklyHours: 20 }));
ok(holds3.longs === 1 && holds3.verdict === "holds", "570/960=0.59 -> holds");
ok(holds.verdict === "tight" && holds2.verdict === "tight", "boundary fixtures tight");

/* platform-note gating */
var notes = CC.recommend(base({ platforms: ["tiktok"] })).platformNotes;
ok(notes.length === 1 && /over 1 minute/i.test(notes[0].body), "tiktok note: 1-min+ qualifier");
var ig = CC.recommend(base({ platforms: ["instagram"] })).platformNotes;
ok(ig.length === 1 && /\$0 per view/.test(ig[0].body), "instagram note: Reels $0");
var yt = CC.recommend(base({ platforms: ["youtube"] })).platformNotes;
ok(/20M\+/.test(yt[0].body), "youtube note: 20M+ videos/day");
var sh = CC.recommend(base({ platforms: ["shorts"] })).platformNotes;
ok(/10M qualified/.test(sh[0].body) && /Oct-1-2026/.test(sh[0].body),
  "shorts note: 10M floor + Oct-1 originality rule");

/* method notes */
var m0 = CC.recommend(base({ stage: 0 })).methodNotes.join(" ");
ok(/tuition/i.test(m0), "stage 0 -> tuition-phase caveat");
var m1 = CC.recommend(base({ stage: 2 })).methodNotes.join(" ");
ok(!/tuition/i.test(m1), "stage 2 -> no tuition caveat");
ok(/50\/50/.test(CC.recommend(base()).methodNotes.join(" ")), "balanced -> 50/50 note");
ok(/Long-form-first/.test(CC.recommend(base({ priority: "longs" })).methodNotes.join(" ")),
  "longs priority -> long-form-first note");
ok(/adjustable starting estimates/.test(CC.recommend(base()).methodNotes.join(" ")),
  "minutes labeled adjustable starting estimates");

/* ramp bounds */
ok(r.ramp.longs <= r.longs && r.ramp.shorts <= r.shorts, "ramp never exceeds full cadence");
var r1 = CC.recommend(base({ platforms: ["youtube"], weeklyHours: 40 }));
ok(r1.longs >= 2 && r1.ramp.longs >= 1 && r1.ramp.longs < r1.longs, "ramp between 1 and max");

/* ---------- 4. dealWeek ---------- */
console.log("dealWeek");
var week = CC.dealWeek(2, 6, 6);
ok(week.length === 7, "7 days");
ok(week[6].rest && week[6].longs === 0 && week[6].shorts === 0, "Sunday rest: empty");
var tl = week.reduce(function (a, d) { return a + d.longs; }, 0);
var ts = week.reduce(function (a, d) { return a + d.shorts; }, 0);
ok(tl === 2 && ts === 6, "totals preserved: 2 longs, 6 shorts");
ok(week[0].longs === 1 && week[5].longs === 1, "2 longs spread Mon + Sat");
var empt = week.filter(function (d) { return !d.rest && d.longs === 0 && d.shorts === 0; });
ok(empt.length === 0, "every work day carries something with 8 items over 6 days");
var wk0 = CC.dealWeek(0, 0, 0);
ok(wk0[0].rest && wk0.every(function (d) { return d.longs === 0 && d.shorts === 0; }),
  "zero cadence: all empty, Monday rest");
var wk1 = CC.dealWeek(1, 0, 3);
ok(wk1[0].longs === 1 && wk1[3].rest, "single long lands Monday when Thursday rests");

/* ---------- 5. honesty contract ---------- */
console.log("honesty contract");
ok(/not financial, legal, or tax advice/i.test(CC.DISCLAIMER), "disclaimer: not financial/legal/tax advice");
ok(/no peer-reviewed cadence science/i.test(CC.DISCLAIMER), "disclaimer: no cadence science");
var allCopy = CC.DISCLAIMER + " " + r.guidance + " " + r.methodNotes.join(" ") + " " +
  r.platformNotes.map(function (p) { return p.body; }).join(" ");
/* The disclaimer itself says "never guarantees views, revenue, or growth" —
   that negation is the honesty clause; strip it before testing. */
var positiveCopy = allCopy.replace(/never guarantees views, revenue, or growth/gi, "");
ok(!/guarantee/i.test(positiveCopy), "no positive 'guarantee' language");
ok(!/will (earn|make|get you)/i.test(allCopy), "no income-promise phrasing");
ok(!/promise[sd]? (you|views|growth|revenue)/i.test(allCopy), "no promise phrasing");
ok(r.disclaimer === CC.DISCLAIMER, "recommend carries the disclaimer");

/* ---------- 6. web-craft contract (static checks on shipped UI/CSS) ----------
   Oct-2026 design research (web-craft-20261011-2014 + -2025): typography
   micro-craft, same-document view transitions, scroll-driven reveals with a
   safe failure mode, hand-rolled SVG. All motion gated on no-preference;
   all selectors .cc-scoped (no collision with other lanes). */
console.log("web-craft contract");
var fs = require("fs");
var uiSrc = fs.readFileSync(path.join(ROOT, "assets", "js", "cadence-ui.js"), "utf8");
var cssSrc = fs.readFileSync(path.join(ROOT, "assets", "css", "cadence.css"), "utf8");
ok(/prefers-reduced-motion/.test(uiSrc) && /startViewTransition/.test(uiSrc),
  "UI: view transition gated on prefers-reduced-motion");
ok(/prefers-reduced-motion: no-preference/.test(cssSrc),
  "CSS: motion only under no-preference");
ok(/@supports\s*\(animation-timeline:\s*view\(\)\)/.test(cssSrc),
  "CSS: scroll reveal is @supports-gated (progressive enhancement)");
ok(/text-wrap:\s*balance/.test(cssSrc), "CSS: text-wrap balance on headings");
ok(/tabular-nums/.test(cssSrc), "CSS: tabular-nums on stat numbers");
ok(/65ch/.test(cssSrc), "CSS: 65ch measure on prose");
ok(/@supports\s*\(text-wrap:\s*pretty\)/.test(cssSrc),
  "CSS: text-wrap pretty stays @supports-gated (Firefox disputed)");
ok(/\.cc-ring/.test(cssSrc) && /stroke-dasharray/.test(uiSrc),
  "UI+CSS: hand-rolled SVG utilization ring");
var cssNoComments = cssSrc.replace(/\/\*[\s\S]*?\*\//g, "");
var uiNoComments = uiSrc.replace(/\/\*[\s\S]*?\*\//g, "");
ok(!/\.platform-rules/.test(cssNoComments) && !/\.platform-rules/.test(uiNoComments),
  "no selector collision with wave 28's .platform-rules scope");
ok(/opacity:\s*1/.test(cssSrc) || /to\s*\{[^}]*opacity:\s*1/.test(cssSrc),
  "CSS: reveal failure mode is visible content (finished state default)");

console.log(failures === 0 ? "\nALL PASS (incl. craft contract)" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
