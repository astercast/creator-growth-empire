/* Unit tests for the Format Fit Finder engine. Run: node tests/format-fit.test.js
 * Exit 0 = all pass. Pinned fixtures:
 *  1. validInput — six-dimension validation.
 *  2. Axis scorers — experience/camera/hours/budget/goal/risk pins via
 *     scoreFormat on pinned fixtures (scores pre-computed by hand).
 *  3. recommend — ranking, band thresholds, verdicts, global + per-match
 *     mismatch flags, edge cases (<3h, camera clash, budget gap, timeline
 *     mismatch, none-yet, no-fit).
 *  4. Dossier sync — FORMATS mirrors data/niches.json v2.1.0
 *     breakout_format_dossiers (id order, dossier_no, name, pay-range digits,
 *     competition label, catch + first3 presence).
 *  5. Honesty contract — no guarantee / income-promise phrasing anywhere
 *     the engine emits; disclaimer + ranges framing present.
 *  6. Web-craft contract (static checks on shipped UI/CSS): .ff- scoping,
 *     reduced-motion gating, typography micro-craft, no collisions.
 *  7. Accessibility contract: WCAG contrast computed on the shipped token
 *     palette for every component text color; aria-live + focus-visible pins.
 */
"use strict";
var path = require("path");
var fs = require("fs");
var ROOT = path.join(__dirname, "..");
var FF = require(path.join(ROOT, "assets", "js", "format-fit.js"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function base(over) {
  var o = { experience: "teacher", weeklyHours: 8, camera: "voice",
            budget: "free", goal: "mid", risk: "balanced" };
  if (over) for (var k in over) o[k] = over[k];
  return o;
}

/* ---------- 1. validInput ---------- */
console.log("validInput");
var v = FF.validInput(base());
ok(v.ok && v.errors.length === 0, "clean input validates");
ok(!FF.validInput(base({ experience: "influencer" })).ok, "unknown experience rejected");
ok(!FF.validInput(base({ experience: null })).ok, "missing experience rejected");
ok(!FF.validInput(base({ weeklyHours: 0 })).ok, "0 hours rejected");
ok(!FF.validInput(base({ weeklyHours: 81 })).ok, "81 hours rejected");
ok(!FF.validInput(base({ weeklyHours: NaN })).ok, "NaN hours rejected");
ok(!FF.validInput(base({ camera: "maybe" })).ok, "unknown camera rejected");
ok(!FF.validInput(base({ budget: "crypto" })).ok, "unknown budget rejected");
ok(!FF.validInput(base({ goal: "yesterday" })).ok, "unknown goal rejected");
ok(!FF.validInput(base({ risk: "yolo" })).ok, "unknown risk rejected");
ok(!FF.validInput({}).ok, "empty object rejected");

/* ---------- 2. Axis scorers (scoreFormat) ---------- */
console.log("axis scorers");
function fmtBy(id) {
  return FF.FORMATS.filter(function (f) { return f.id === id; })[0];
}
/* Teacher 8h voice free mid balanced vs English podcasts:
   exp 3 + camera 2 + hours 8>=6*1.5=9? no, 8>=6 -> 1 + budget 2 + goal mid/mid 2 + risk low/balanced 1 = 11 */
var sp = FF.scoreFormat(fmtBy("english-learning-podcasts"), FF.norm(base()));
ok(sp.score === 11, "teacher podcast pin: score 11 (3+2+1+2+2+1)");
ok(sp.why.length >= 5, "teacher podcast: rich why (" + sp.why.length + ")");
ok(sp.flags.length === 0, "teacher podcast: zero flags");

/* Hands-only user vs mini-dramas (needs face): camera -2 flag. */
var clash = FF.scoreFormat(fmtBy("betrayal-revenge-minidramas"),
  FF.norm(base({ experience: "writer", weeklyHours: 20, camera: "hands", budget: "real", goal: "slow", risk: "balanced" })));
ok(clash.score === 3 + (-2) + 1 + 2 + 2 + 1, "camera clash pin: 3-2+1+2+2+1 = 7");
ok(clash.flags.some(function (f) { return /camera clash/.test(f); }), "camera clash flagged");

/* Budget gap: free budget vs real-budget format. */
var gap = FF.scoreFormat(fmtBy("betrayal-revenge-minidramas"),
  FF.norm(base({ experience: "writer", weeklyHours: 20, camera: "face", budget: "free", goal: "slow", risk: "balanced" })));
ok(gap.flags.some(function (f) { return /budget gap/.test(f); }), "free vs real budget -> budget gap flag");

/* Hours: 2h vs 15h format -> hours mismatch -2. */
var short = FF.scoreFormat(fmtBy("betrayal-revenge-minidramas"), FF.norm(base({ weeklyHours: 2 })));
ok(short.flags.some(function (f) { return /hours mismatch/.test(f); }), "2h vs 15h -> hours mismatch flag");

/* Timeline: fast goal vs slow format. */
var tl = FF.scoreFormat(fmtBy("senior-health"), FF.norm(base({ goal: "fast" })));
ok(tl.flags.some(function (f) { return /timeline mismatch/.test(f); }), "fast goal vs slow format -> timeline mismatch");

/* Risk: safe vs high-risk format. */
var rk = FF.scoreFormat(fmtBy("genz-personal-finance"), FF.norm(base({ risk: "safe" })));
ok(rk.flags.some(function (f) { return /risk mismatch/.test(f); }), "safe vs high-risk -> risk mismatch");

/* none-yet experience: zero points, tuition why. */
var nz = FF.scoreFormat(fmtBy("ai-tools-tutorials"), FF.norm(base({ experience: "none-yet" })));
ok(nz.score === 0 + 2 + 1 + 2 + 2 + 2, "none-yet pin: 0+2+1+2+2+2 = 9");
ok(nz.why.some(function (w) { return /tuition phase/.test(w); }), "none-yet -> tuition-phase note");

/* Bands. */
ok(FF.bandFor(13) === "strong" && FF.bandFor(9) === "strong", "band: >=9 strong");
ok(FF.bandFor(8) === "workable" && FF.bandFor(6) === "workable", "band: 6–8 workable");
ok(FF.bandFor(5) === "weak" && FF.bandFor(-7) === "weak", "band: <6 weak");

/* ---------- 3. recommend: ranking + verdicts + edges ---------- */
console.log("recommend");
var r = FF.recommend(base());
ok(r.ok, "recommend ok on clean input");
ok(r.top.id === "english-learning-podcasts", "teacher fixture -> english podcasts top");
ok(r.verdict === "strong", "teacher fixture -> strong verdict");
ok(r.matches.length === 10, "all 10 formats ranked");
ok(r.matches[0].score >= r.matches[9].score, "sorted desc by score");
ok(r.matches.every(function (m) { return m.first3.length === 3 && m.catch.length > 40 && m.pay.length > 10; }),
  "every match carries catch, pay reality, exactly 3 moves");
ok(r.matches.every(function (m) { return m.why.length >= 3 && m.why.every(function (w) { return w.length > 10; }); }),
  "every match carries real why-reasoning, no empty bullets (>=3)");
ok(r.matches.filter(function (m) { return m.band === "weak"; })
  .every(function (m) { return m.flags.length >= 1; }),
  "every weak match names at least one honest flag (flags are reasoning too)");
ok(r.rateContext.indexOf("$20–$35 per 1,000") !== -1, "rate-card context carried");
ok(r.hourEstimateNote.indexOf("starting estimates") !== -1, "hour estimates labeled starting estimates");
ok(r.disclaimer === FF.DISCLAIMER, "recommend carries the disclaimer");

/* Deterministic tie-break: equal scores -> dossier_no order. */
var tieAll = r.matches.filter(function (m) { return m.score === r.matches[0].score; });
var tieNos = tieAll.map(function (m) { return m.dossier_no; });
var sortedNos = tieNos.slice().sort();
ok(JSON.stringify(tieNos) === JSON.stringify(sortedNos), "ties break by dossier order (deterministic)");

/* Edge: <3h/week -> global flag + no-fit risk. */
var edge = FF.recommend(base({ experience: "none-yet", weeklyHours: 2, goal: "fast", risk: "safe" }));
ok(edge.globalFlags.some(function (f) { return /Under 3 hrs\/week/.test(f); }), "<3h -> under-3h global flag");
ok(edge.globalFlags.some(function (f) { return /Fast money plus play-it-safe/.test(f); }), "fast+safe -> tightest-corner flag");
ok(edge.globalFlags.some(function (f) { return /starting from zero experience/.test(f); }), "none-yet -> tuition global flag");
ok(edge.verdict === "no-fit", "hopeless fixture -> no-fit verdict");

/* Edge: camera-clash formats sink for hands-only users. */
var hands = FF.recommend(base({ experience: "writer", weeklyHours: 20, camera: "hands", budget: "real", goal: "slow", risk: "balanced" }));
var dramaRank = hands.matches.map(function (m) { return m.id; }).indexOf("betrayal-revenge-minidramas");
ok(dramaRank >= 5, "mini-dramas sinks for hands-only (rank " + (dramaRank + 1) + ")");
ok(hands.matches.filter(function (m) { return m.band === "strong" || m.band === "workable"; }).length >= 1,
  "hands-only writer still has workable options");

/* Edge: high-budget formats flag honestly for free-budget creators. */
var broke = FF.recommend(base({ experience: "writer", weeklyHours: 20, camera: "face", budget: "free", goal: "mid", risk: "bold" }));
var dramaFlags = broke.matches.filter(function (m) { return m.id === "betrayal-revenge-minidramas"; })[0].flags;
ok(dramaFlags.some(function (f) { return /budget gap/.test(f); }), "free budget + mini-dramas -> budget gap flag on the card");

/* ---------- 4. Dossier sync (FORMATS mirrors niches.json v2.1.0) ---------- */
console.log("dossier sync");
var niches = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "niches.json"), "utf8"));
var dossiers = niches.breakout_format_dossiers;
ok(FF.FORMATS.length === 10 && dossiers.length === 10, "10 formats mirror 10 dossiers");
dossiers.forEach(function (d, i) {
  var f = FF.FORMATS[i];
  ok(f.id === d.id, "order+id match [" + i + "]: " + d.id);
  ok(f.dossier_no === d.dossier_no, "dossier_no match: " + d.dossier_no);
  ok(f.name.toLowerCase() === d.name.toLowerCase(), "name match: " + d.name);
  /* Pay label must carry the dossier's headline range digits (never drifted).
     Only the FIRST $-range of the dossier pay field is pinned — later figures
     (sponsor exceptions, ratios) are annotation, not the headline range. */
  var headline = (d.pay.match(/\$\d[\d.]*\s*[-–—]\s*\$\d[\d.]*/) ||
                  d.pay.match(/\$\d[\d.]*[-–—]\d[\d.]*/) || [])[0] || "";
  var headlineDigits = headline.replace(/[^0-9.]/g, " ").split(/\s+/)
    .filter(function (t) { return t.replace(".", "").length >= 2; });
  var okPay = headlineDigits.length === 0 ||
    headlineDigits.every(function (t) { return f.payLabel.indexOf(t) !== -1; });
  ok(okPay, "pay label keeps dossier headline range: " + d.dossier_no + " [" + headline + "]");
  /* Competition label must echo the dossier's competition text. */
  var compCore = d.competition.replace(/\s*\(.*$/, "").trim();
  ok(f.compLabel.toLowerCase().indexOf(compCore.split(" ")[0].toLowerCase()) !== -1,
    "competition echoes dossier: " + d.dossier_no);
  ok(f.expNote.length > 20, "expNote present: " + d.dossier_no);
  ok(["face", "voice", "screen", "none"].indexOf(f.camera) !== -1, "camera tier valid: " + d.dossier_no);
  ok(f.minHours >= 5 && f.minHours <= 20, "minHours sane (5–20): " + d.dossier_no);
  ok(["free", "modest", "real"].indexOf(f.budget) !== -1, "budget tier valid: " + d.dossier_no);
  ok(["fast", "mid", "slow"].indexOf(f.timeToMoney) !== -1, "timeToMoney valid: " + d.dossier_no);
  ok(["low", "medium", "high"].indexOf(f.risk) !== -1, "risk tier valid: " + d.dossier_no);
});

/* ---------- 5. Honesty contract ---------- */
console.log("honesty contract");
ok(/not financial, legal, or tax advice/i.test(FF.DISCLAIMER), "disclaimer: not financial/legal/tax advice");
ok(/creator-reported ranges/i.test(FF.DISCLAIMER), "disclaimer: creator-reported ranges framing");
ok(/never guarantees views, revenue, or growth/i.test(FF.DISCLAIMER), "disclaimer: no-guarantee clause");
var allCopy = FF.DISCLAIMER + " " + FF.RATE_CONTEXT + " " +
  FF.FORMATS.map(function (f) { return f.catch + " " + f.payLabel + " " + f.first3.join(" "); }).join(" ") + " " +
  r.matches.map(function (m) { return m.why.join(" ") + " " + m.flags.join(" "); }).join(" ") +
  r.globalFlags.join(" ");
var positiveCopy = allCopy.replace(/never guarantees views, revenue, or growth/gi, "")
                          .replace(/ranges, never promises/gi, "")
                          .replace(/not what you will earn/gi, "");
ok(!/guarantee/i.test(positiveCopy), "no positive 'guarantee' language");
ok(!/will (earn|make you|get you)/i.test(positiveCopy), "no income-promise phrasing");
ok(!/you will earn/i.test(positiveCopy), "no 'you will earn'");
ok(!/passive income/i.test(allCopy), "no 'passive income' bait");
ok(FF.FORMATS.every(function (f) { return /range|proxy|directional|No reported range/.test(f.payLabel); }),
  "every pay label is a range/proxy — or honestly says no range exists");

/* ---------- 6. Web-craft contract (static checks on shipped UI/CSS) ---------- */
console.log("web-craft contract");
var uiSrc = fs.readFileSync(path.join(ROOT, "assets", "js", "format-fit-ui.js"), "utf8");
var cssSrc = fs.readFileSync(path.join(ROOT, "assets", "css", "format-fit.css"), "utf8");
var pageSrc = fs.readFileSync(path.join(ROOT, "pages", "format-fit.html"), "utf8");
ok(/prefers-reduced-motion/.test(uiSrc) && /startViewTransition/.test(uiSrc),
  "UI: view transition gated on prefers-reduced-motion");
var cssNoComments = cssSrc.replace(/\/\*[\s\S]*?\*\//g, "");
ok(!/@keyframes/.test(cssNoComments) || /prefers-reduced-motion/.test(cssSrc),
  "CSS: no ungated motion");
ok(/text-wrap:\s*balance/.test(cssSrc), "CSS: text-wrap balance on headings");
ok(/tabular-nums/.test(cssSrc), "CSS: tabular-nums on score stats");
ok(/65ch/.test(cssSrc), "CSS: 65ch measure on prose");
ok(/@supports\s*\(text-wrap:\s*pretty\)/.test(cssSrc),
  "CSS: text-wrap pretty stays @supports-gated (Firefox disputed)");
ok(/@media\s*\(min-width:\s*760px\)/.test(cssNoComments), "CSS: mobile-first media query");
ok(/\.ff-card|\.ff-cards|\.ff-score|\.ff-flags/.test(cssNoComments), "CSS: .ff- component scope present");
/* Every selector in the file must be .ff- / #ff- scoped: collect each
   rule's selector list (skipping at-rules), and require at least one
   .ff- or #ff- hook per selector. */
var ruleSels = (cssNoComments.match(/([^{}@]+)\{/g) || [])
  .map(function (r) { return r.replace(/\{$/, "").trim(); })
  .filter(function (s) { return s.length > 0 && !/^(media|supports|keyframes|container)\b/i.test(s.trim()); });
var unscoped = [];
ruleSels.forEach(function (sel) {
  sel.split(",").forEach(function (one) {
    one = one.trim();
    if (one && one.indexOf(".ff-") === -1 && one.indexOf("#ff-") === -1) unscoped.push(one);
  });
});
ok(unscoped.length === 0, "CSS: every selector is .ff-/#ff- scoped (found: " + unscoped.slice(0, 5).join(" | ") + ")");
ok(!/\.platform-rules/.test(cssNoComments) && !/\.platform-rules/.test(uiSrc.replace(/\/\*[\s\S]*?\*\//g, "")),
  "no selector collision with wave 28's .platform-rules scope");
ok(/aria-live="polite"/.test(pageSrc), "page: results region is aria-live");
ok(/<noscript>/.test(pageSrc), "page: honest noscript fallback");

/* ---------- 7. Accessibility contract ---------- */
console.log("accessibility contract");
/* Parse the shipped token palette and compute WCAG contrast for every
   component text color against its background. Floor: 4.5:1 (AA normal text). */
var tokensSrc = fs.readFileSync(path.join(ROOT, "assets", "css", "tokens.css"), "utf8");
function tok(name) {
  var m = tokensSrc.match(new RegExp("--" + name + ":\\s*(#[0-9a-fA-F]{6})"));
  return m ? m[1] : null;
}
function lum(hex) {
  var c = [0, 2, 4].map(function (i) {
    var v = parseInt(hex.substr(i + 1, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  var l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
var BG = tok("bg");           // #0d120d — panel/deep backgrounds live on this
var checks = [
  ["cyan text", tok("cyan"), BG],
  ["gold text", tok("gold"), BG],
  ["stamp text", tok("stamp"), BG],
  ["muted text", tok("muted"), BG],
  ["gold focus ring", tok("gold"), BG]
];
checks.forEach(function (c) {
  var ratio = contrast(c[1], c[2]);
  ok(ratio >= 4.5, "contrast " + c[0] + ": " + ratio.toFixed(2) + ":1 >= 4.5 (AA)");
});
ok(/focus-visible/.test(cssSrc), "CSS: :focus-visible perimeters on interactive elements");
ok(/role="img".*aria-label/.test(uiSrc), "UI: score bars expose role=img + aria-label");
ok(/role="note".*aria-label="Honest flags"/.test(uiSrc), "UI: flag blocks expose role=note");
ok((pageSrc.match(/<legend/g) || []).length === 5, "page: 5 fieldsets with legends (keyboard-native radios)");

console.log(failures === 0 ? "\nALL PASS (incl. craft + a11y contracts)" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
