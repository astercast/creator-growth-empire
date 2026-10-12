/* Unit tests for the Deal Builder engine + the Sponsor Playbook chapter
 * (wave 33). Run: node tests/deal-builder.test.js (from the repo root)
 * Exit 0 = all pass. Pinned fixtures:
 *  1. validInput — validation edges (followers floor, deliverable caps,
 *     unknown enums, exclusivity consistency, affiliate bounds).
 *  2. tierOf — boundary pins + parity with Outreach.tierOf (the site's
 *     tier math is one number everywhere).
 *  3. deliverableBase — per-kind math against the REAL
 *     data/calculators.json (tier bands, CPM×views anchoring, UGC band,
 *     no-views fallback).
 *  4. buildQuote — line items, base totals, usage add-ons, whitelisting,
 *     exclusivity premiums, package total, expected-close math, notes.
 *  5. exclusivityConflicts — every flag path incl. window mismatches,
 *     broad-lock walk-away, perpetual+exclusivity, UGC+affiliate,
 *     the can't-see-other-contracts honesty note.
 *  6. buildChecklist — 7 groups, term-customized copy, walk-away math.
 *  7. renderPitch — brackets for unsupplied stats (never invented),
 *     quote numbers from the real quote, proposal structure.
 *  8. Honesty contract — disclaimer on every output surface; no
 *     guarantee / income-promise phrasing anywhere the engine emits;
 *     ranges framing; LISTED_VS_ACCEPTED parity with Outreach.
 *  9. Sponsor Playbook chapter — 1 h1, 14 h2s (11 numbered in order),
 *     TOC pairing, source-label floors, honesty contract, links resolve
 *     to site/ pages, no #anchors, no absolute URLs, ≥20 sources.
 * 10. Web-craft contract — .db- scoping, no cross-lane collisions,
 *     typography micro-craft, reduced-motion-by-construction.
 * 11. Accessibility contract — WCAG contrast on the shipped token
 *     palette; aria-live + focus-visible + role=note pins.
 */
"use strict";
var path = require("path");
var fs = require("fs");
var ROOT = path.join(__dirname, "..");
var DB = require(path.join(ROOT, "assets", "js", "deal-builder.js"));
var OUTREACH = require(path.join(ROOT, "assets", "js", "outreach.js"));
var CALC = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "calculators.json"), "utf8"));
var RC = CALC.sponsorship_rate_card_2026;
var UR = CALC.usage_rights_benchmarks_2026;

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function base(over) {
  var o = { followers: 50000,
    deliverables: [{ platform: "youtube", kind: "dedicated", count: 1 }],
    usage: "organic_only", whitelistingMonths: 0,
    exclusivity: { scope: "none", months: 0 } };
  if (over) for (var k in over) o[k] = over[k];
  return o;
}

/* ---------- 1. validInput ---------- */
console.log("validInput");
ok(DB.validInput(base()).ok, "clean input validates");
ok(!DB.validInput(base({ followers: 999 })).ok, "999 followers rejected (nano floor)");
ok(!DB.validInput(base({ followers: 1000 })).ok === false, "1000 followers accepted");
ok(!DB.validInput(base({ followers: NaN })).ok, "NaN followers rejected");
ok(!DB.validInput(base({ followers: -5 })).ok, "negative followers rejected");
ok(!DB.validInput(base({ deliverables: [] })).ok, "zero deliverables rejected");
ok(!DB.validInput(base({ deliverables: [{ platform: "youtube", kind: "dedicated", count: 1 },
  { platform: "youtube", kind: "dedicated", count: 1 }, { platform: "youtube", kind: "dedicated", count: 1 },
  { platform: "youtube", kind: "dedicated", count: 1 }, { platform: "youtube", kind: "dedicated", count: 1 },
  { platform: "youtube", kind: "dedicated", count: 1 }, { platform: "youtube", kind: "dedicated", count: 1 },
  { platform: "youtube", kind: "dedicated", count: 1 }, { platform: "youtube", kind: "dedicated", count: 1 }] })).ok,
  "9 deliverable lines rejected (cap 8)");
ok(!DB.validInput(base({ deliverables: [{ platform: "twitch", kind: "dedicated", count: 1 }] })).ok, "unknown platform rejected");
ok(!DB.validInput(base({ deliverables: [{ platform: "youtube", kind: "livestream", count: 1 }] })).ok, "unknown kind rejected");
ok(!DB.validInput(base({ deliverables: [{ platform: "youtube", kind: "dedicated", count: 0 }] })).ok, "count 0 rejected");
ok(!DB.validInput(base({ deliverables: [{ platform: "youtube", kind: "dedicated", count: 13 }] })).ok, "count 13 rejected");
ok(!DB.validInput(base({ usage: "paid_forever" })).ok, "unknown usage tier rejected");
ok(!DB.validInput(base({ whitelistingMonths: 25 })).ok, "whitelisting 25mo rejected");
ok(!DB.validInput(base({ whitelistingMonths: -1 })).ok, "negative whitelisting rejected");
ok(!DB.validInput(base({ exclusivity: { scope: "galaxy", months: 3 } })).ok, "unknown exclusivity scope rejected");
ok(!DB.validInput(base({ exclusivity: { scope: "none", months: 3 } })).ok, "months with scope=none rejected");
ok(!DB.validInput(base({ exclusivity: { scope: "named", months: 0 } })).ok, "scope without months rejected");
ok(!DB.validInput(base({ exclusivity: { scope: "named", months: 30 } })).ok, "exclusivity 30mo rejected (cap 24)");
ok(!DB.validInput(base({ affiliate: { include: true, commissionPct: 95 } })).ok, "commission 95% rejected");
ok(!DB.validInput({}).ok, "empty object rejected");

/* ---------- 2. tierOf boundaries + Outreach parity ---------- */
console.log("tierOf");
ok(DB.tierOf(9999) === "nano_1k_10k", "9999 → nano");
ok(DB.tierOf(10000) === "micro_10k_100k", "10000 → micro");
ok(DB.tierOf(999999) === "macro_100k_1m", "999999 → macro");
ok(DB.tierOf(1000000) === "mega_1m_plus", "1000000 → mega");
var sweep = [1000, 5000, 9999, 10000, 50000, 99999, 100000, 750000, 999999, 1000000, 5000000];
ok(sweep.every(function (f) { return DB.tierOf(f) === OUTREACH.tierOf(f); }),
  "tierOf parity with Outreach.tierOf across " + sweep.length + " follower counts");
ok(DB.LISTED_VS_ACCEPTED === OUTREACH.LISTED_VS_ACCEPTED, "23% constant parity with Outreach");

/* ---------- 3. deliverableBase vs the real rate card ---------- */
console.log("deliverableBase");
var b1 = DB.deliverableBase("dedicated", "youtube", "micro_10k_100k", 0, CALC);
ok(b1.range[0] === 1000 && b1.range[1] === 10000, "dedicated/micro/YT = tier band $1,000–$10,000");
var b2 = DB.deliverableBase("integrated", "youtube", "micro_10k_100k", 25000, CALC);
ok(b2.range[0] === 500 && b2.range[1] === 875, "integrated/YT 25K views = 25 × $20–$35 = $500–$875");
ok(/sponsored cpm/i.test(b2.note), "integrated cites the CPM band");
var b3 = DB.deliverableBase("short", "tiktok", "nano_1k_10k", 0, CALC);
ok(b3.range[0] === 25 && b3.range[1] === 150, "short/no-views = half the nano/TikTok band ($50–$300 → $25–$150)");
ok(/no views average/i.test(b3.note), "no-views fallback says so honestly");
var b4 = DB.deliverableBase("short", "tiktok", "micro_10k_100k", 40000, CALC);
ok(b4.range[0] === 400 && b4.range[1] === 1200, "short/TikTok 40K views = 40 × $10–$30 = $400–$1,200");
var b5 = DB.deliverableBase("ugc", "instagram", "mega_1m_plus", 0, CALC);
ok(b5.range[0] === 150 && b5.range[1] === 1000, "UGC = Storika band $150–$1,000 regardless of tier");
ok(/storika/i.test(b5.note), "UGC cites Storika single-source");
var b6 = DB.deliverableBase("dedicated", "tiktok", "macro_100k_1m", 0, CALC);
ok(b6.range[0] === 3500 && b6.range[1] === 9000, "dedicated/macro/TikTok = $3,500–$9,000");

/* ---------- 4. buildQuote ---------- */
console.log("buildQuote");
var q0 = DB.buildQuote(base(), CALC, UR);
ok(q0.ok, "base fixture quotes");
ok(q0.tier === "micro_10k_100k", "tier resolved micro");
ok(q0.baseTotal[0] === 1000 && q0.baseTotal[1] === 10000, "base total $1,000–$10,000");
ok(q0.total[0] === 1000 && q0.total[1] === 10000, "total = base with no add-ons");
ok(q0.expectedClose[0] === 770 && q0.expectedClose[1] === 7700,
  "expected close = ×0.77 → $770–$7,700 (the $10K/$7.7K walk-through)");
ok(q0.lines.length === 1 && q0.lines[0].line[0] === 1000, "one line item");
ok(q0.usage.addon[0] === 0 && q0.usage.addon[1] === 0, "organic_only → no usage add-on");

var q1 = DB.buildQuote(base({ usage: "paid_3mo" }), CALC, UR);
ok(q1.usage.addon[0] === 250 && q1.usage.addon[1] === 5000, "paid_3mo = +25–50% of base → $250–$5,000");
ok(q1.total[0] === 1300 && q1.total[1] === 15000, "total stacks: $1,300–$15,000 (2-sig-fig rounding)");

var q2 = DB.buildQuote(base({ usage: "perpetual" }), CALC, UR);
ok(q2.usage.addon[0] === 1000 && q2.usage.addon[1] === Infinity, "perpetual = +100% floor, open ceiling");
ok(q2.notes.some(function (n) { return /no ceiling/i.test(n); }), "perpetual open-end honesty note");

var q3 = DB.buildQuote(base({ whitelistingMonths: 2 }), CALC, UR);
ok(q3.whitelisting.addon[0] === 600 && q3.whitelisting.addon[1] === 20000,
  "whitelisting 2mo = base × 30–100%/mo × 2 → $600–$20,000");

var q4 = DB.buildQuote(base({ exclusivity: { scope: "named", months: 1 } }), CALC, UR);
ok(q4.exclusivity.addon[0] === 250 && q4.exclusivity.addon[1] === 2500, "named 30d = +25% → $250–$2,500");
var q5 = DB.buildQuote(base({ exclusivity: { scope: "named", months: 3 } }), CALC, UR);
ok(q5.exclusivity.addon[0] === 500 && q5.exclusivity.addon[1] === 5000, "named 90d = +50% → $500–$5,000");
var q6 = DB.buildQuote(base({ exclusivity: { scope: "category", months: 6 } }), CALC, UR);
ok(q6.exclusivity.addon[0] === 0 && q6.exclusivity.flag && q6.exclusivity.flag.level === "walk_away",
  "broad 6mo category lock → no invented premium + walk-away flag");

var q7 = DB.buildQuote(base({ deliverables: [
  { platform: "youtube", kind: "dedicated", count: 2 },
  { platform: "tiktok", kind: "short", count: 2 }] }), CALC, UR);
ok(q7.lines.length === 2, "two line items");
ok(q7.lines[0].line[0] === 2000 && q7.lines[0].line[1] === 20000, "2× dedicated scales the band");
ok(q7.notes.some(function (n) { return /41%/i.test(n); }), "4-unit package carries the bundle note");
ok(q7.notes.some(function (n) { return /multi-platform/i.test(n); }), "YT+TikTok mix carries the multi-platform note");

var q8 = DB.buildQuote(base({ usage: "organic_only", whitelistingMonths: 3 }), CALC, UR);
ok(q8.notes.some(function (n) { return /whitelisting implies paid usage/i.test(n); }),
  "whitelisting + organic_only → free-ads honesty note");

var qBad = DB.buildQuote(base({ followers: 10 }), CALC, UR);
ok(!qBad.ok && qBad.errors.length > 0, "invalid input → {ok:false, errors}");

var q9 = DB.buildQuote(base({ followers: 25000000, deliverables: [
  { platform: "youtube", kind: "dedicated", count: 1 }] }), CALC, UR);
ok(q9.notes.some(function (n) { return /10M followers/i.test(n); }), "25M followers → thin-benchmarks note");

/* ---------- 5. exclusivityConflicts ---------- */
console.log("exclusivityConflicts");
var c1 = DB.exclusivityConflicts(base({ usage: "paid_6mo", exclusivity: { scope: "named", months: 2 } }));
ok(c1.ok && c1.flags.some(function (f) { return f.level === "flag" && /exclusivity ends at 2 months.*paid-ad usage runs 6 months/i.test(f.text); }),
  "exclusivity 2mo < usage 6mo → window-mismatch flag");
var c2 = DB.exclusivityConflicts(base({ exclusivity: { scope: "category", months: 9 } }));
ok(c2.flags.some(function (f) { return f.level === "walk_away" && /broad category lock for 9 months/i.test(f.text); }),
  "broad 9mo lock → walk-away");
var c3 = DB.exclusivityConflicts(base({ exclusivity: { scope: "category", months: 4 } }));
ok(c3.flags.some(function (f) { return f.level === "flag" && /name the competitors/i.test(f.text); }),
  "broad 4mo lock → name-competitors flag");
var c4 = DB.exclusivityConflicts(base({ usage: "perpetual", exclusivity: { scope: "named", months: 6 } }));
ok(c4.flags.some(function (f) { return /perpetual paid-ad usage plus exclusivity/i.test(f.text); }),
  "perpetual usage + exclusivity → conflict flag");
var c5 = DB.exclusivityConflicts(base({ whitelistingMonths: 4, exclusivity: { scope: "named", months: 2 } }));
ok(c5.flags.some(function (f) { return /whitelisting runs 4 months but exclusivity ends at 2/i.test(f.text); }),
  "whitelisting outliving exclusivity → flag");
var c6 = DB.exclusivityConflicts(base({ whitelistingMonths: 18 }));
ok(c6.flags.some(function (f) { return /18 months of whitelisting/i.test(f.text); }),
  "18mo whitelisting → revocability flag");
var c7 = DB.exclusivityConflicts(base({ followers: 50000, deliverables: [
  { platform: "tiktok", kind: "ugc", count: 2 } ], affiliate: { include: true, commissionPct: 10 } }));
ok(c7.flags.some(function (f) { return f.level === "flag" && /UGC-only package under 100K/i.test(f.text); }),
  "UGC-only + affiliate under 100K → flag");
var c8 = DB.exclusivityConflicts(base({ affiliate: { include: true, commissionPct: 40 } }));
ok(c8.flags.some(function (f) { return /40% commission is generous/i.test(f.text); }),
  "40% commission → keep-the-fee note");
var c9 = DB.exclusivityConflicts(base({ usage: "paid_3mo", deliverables: [
  { platform: "tiktok", kind: "ugc", count: 1 }] }));
ok(c9.flags.some(function (f) { return /the usage IS the product/i.test(f.text); }),
  "UGC + paid usage → usage-is-the-product note");
ok(c1.flags.some(function (f) { return /can't see your other contracts/i.test(f.text); }),
  "every conflict run carries the can't-see-other-contracts honesty note");
var cClean = DB.exclusivityConflicts(base());
ok(cClean.ok && cClean.flags.length === 1 && cClean.flags[0].level === "note",
  "clean deal → only the honesty note");

/* ---------- 6. buildChecklist ---------- */
console.log("buildChecklist");
var chk = DB.buildChecklist(q1);
ok(chk.ok, "checklist builds from a quote");
var gids = chk.groups.map(function (g) { return g.id; });
ok(JSON.stringify(gids) === JSON.stringify(["usage", "payment", "revisions", "exclusivity", "ftc", "deliverables", "walkaway"]),
  "7 groups in order: usage/payment/revisions/exclusivity/ftc/deliverables/walkaway");
ok(chk.groups.every(function (g) { return g.items.length >= 2; }), "every group has ≥2 items");
ok(chk.groups[0].items[0].detail.indexOf("Paid ads") === 0, "usage group reflects the actual usage tier");
ok(chk.groups[4].items.some(function (i) { return /\$53,088/.test(i.detail); }), "FTC group carries the $53,088 figure");
ok(chk.groups[6].items[0].detail.indexOf("$1,000") >= 0, "walk-away line uses the quote's expected-close floor ($1,000)");
ok(chk.groups.every(function (g) { return g.items.every(function (i) { return i.id && i.text; }); }),
  "every item has id + text");
var chkBad = DB.buildChecklist({ ok: false });
ok(!chkBad.ok, "checklist without a quote → {ok:false}");

/* ---------- 7. renderPitch ---------- */
console.log("renderPitch");
var p = DB.renderPitch(base({ usage: "paid_3mo", whitelistingMonths: 1,
  exclusivity: { scope: "named", months: 1 } }), q1);
ok(p.ok, "pitch renders");
ok(/\[Channel\] x \[Brand\]/.test(p.subject), "subject carries [Channel]/[Brand] brackets");
ok(p.bracketCount >= 8, "body keeps ≥8 bracket placeholders (" + p.bracketCount + ")");
ok(p.body.indexOf("$1,250") >= 0 || p.body.indexOf("$1,000") >= 0, "body carries the real quote numbers");
ok(/Usage rights are priced as their own line item/.test(p.body), "proposal states the usage architecture");
ok(/50% upfront, net-30/.test(p.body), "proposal states payment terms");
ok(!/views averaged [0-9]/.test(p.body), "no invented view counts — the stat stays a bracket");
ok(p.body.indexOf(q1.lines[0].label) >= 0, "proposal lists the actual deliverable line");
var pBad = DB.renderPitch(base(), { ok: false });
ok(!pBad.ok, "pitch without a quote → {ok:false}");

/* ---------- 8. Honesty contract ---------- */
console.log("honesty contract");
var banned = [/(?<!not to )(?<!never )guarantee[sd]? (you'll|you will|income|earnings|revenue|views|growth|success|results)/i,
  /will earn/i, /risk-free/i, /passive income/i, /get rich/i, /(?<!no )income promises?/i];
var surfaces = [q1.notes.join(" "), chk.groups.map(function (g) {
  return g.items.map(function (i) { return i.text + " " + i.detail; }).join(" ");
}).join(" "), p.body, c1.flags.map(function (f) { return f.text; }).join(" ")];
surfaces.forEach(function (s, i) {
  banned.forEach(function (re) {
    ok(!re.test(s), "surface " + i + ": no banned phrasing " + re);
  });
});
ok(/not financial, legal, or tax advice/i.test(q1.disclaimer), "quote carries the disclaimer");
ok(/not financial, legal, or tax advice/i.test(chk.disclaimer), "checklist carries the disclaimer");
ok(/not financial, legal, or tax advice/i.test(p.disclaimer), "pitch carries the disclaimer");
ok(/not legal advice/i.test(DB.DISCLAIMER), "NOT-legal-advice line in the disclaimer");
ok(/ranges?,? (not|never) (quotes?|a quote)/i.test(q1.notes.join(" ")), "ranges-not-quotes framing in quote notes");

/* ---------- 9. Sponsor Playbook chapter ---------- */
console.log("sponsor-playbook chapter");
var MD = fs.readFileSync(path.join(ROOT, "content", "sponsor-playbook.md"), "utf8");
var h1s = MD.match(/^# .+/gm) || [];
ok(h1s.length === 1, "exactly one h1");
var h2s = (MD.match(/^## .+/gm) || []).map(function (h) { return h.slice(3).trim(); });
ok(h2s.length === 14, "14 h2 sections (" + h2s.length + ")");
ok(new Set(h2s).size === h2s.length, "all h2s unique");
var numbered = h2s.filter(function (h) { return /^\d+\. /.test(h); });
ok(numbered.length === 11, "11 numbered sections");
ok(numbered.every(function (h, i) { return h.indexOf((i + 1) + ". ") === 0; }),
  "numbered sections run 1–11 in order");
var tocBlock = (MD.match(/## What's inside\n\n([\s\S]*?)\n\n## /) || [])[1] || "";
var tocItems = tocBlock.split("\n").map(function (l) { return l.replace(/^- /, "").trim(); }).filter(Boolean);
var contentH2s = h2s.filter(function (h) { return h !== "What's inside"; });
ok(JSON.stringify(tocItems) === JSON.stringify(contentH2s), "TOC pairs 1:1 with content h2s in order");
var labels = { single: (MD.match(/\[single-source\]/g) || []).length,
               verified: (MD.match(/\[verified\]/g) || []).length,
               platform: (MD.match(/\[platform-stated\]/g) || []).length };
ok(labels.single >= 20, "≥20 single-source labels (" + labels.single + ")");
ok(labels.verified >= 8, "≥8 verified labels (" + labels.verified + ")");
numbered.forEach(function (h) {
  var sec = MD.split("## " + h)[1].split("\n## ")[0];
  ok(/\[(single-source|verified|platform-stated)\]/.test(sec), "section carries a source label: " + h.slice(0, 40));
});
var srcBlock = (MD.match(/## Sources\n\n([\s\S]*)$/) || [])[1] || "";
var srcItems = srcBlock.split("\n").filter(function (l) { return /^\d+\. /.test(l); });
ok(srcItems.length >= 20, "≥20-item Sources section (" + srcItems.length + ")");
ok(/not financial, legal, or tax advice/i.test(MD), "not-financial/legal/tax-advice line present");
ok(/Not legal advice/i.test(MD), "NOT-legal-advice disclaimer present");
ok(/ranges?,? (not|never) (quotes?|a quote)/i.test(MD), "ranges-not-quotes framing present");
banned.forEach(function (re) { ok(!re.test(MD), "chapter: no banned phrasing " + re); });
var links = MD.match(/\[[^\]]+\]\(([^)]+)\)/g) || [];
var htmlLinks = links.map(function (l) { return l.match(/\(([^)]+)\)/)[1]; })
  .filter(function (u) { return /\.html$/.test(u); });
var badLinks = htmlLinks.filter(function (u) {
  return !fs.existsSync(path.join(ROOT, "site", u));
});
ok(badLinks.length === 0, "all internal .html links resolve to site/ pages" +
  (badLinks.length ? ": " + badLinks.join(", ") : ""));
ok(!/\]\(#[^)]+\)/.test(MD), "no in-page #anchors");
ok(!/https?:\/\//.test(MD), "no absolute URLs (sources are named, per site convention)");
ok(/2026-10-11|Oct(ober)? (9|11),? 2026/.test(MD), "freshness date present");
ok(/verify against current creator rate reports/i.test(MD), "verify-live disclaimer present");
ok(MD.split(/\s+/).length >= 4000, "chapter is deep (≥4,000 words, got " + MD.split(/\s+/).length + ")");

/* ---------- 10. Web-craft contract ---------- */
console.log("web-craft contract");
var cssSrc = fs.readFileSync(path.join(ROOT, "assets", "css", "deal-builder.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
var uiSrc = fs.readFileSync(path.join(ROOT, "assets", "js", "deal-builder-ui.js"), "utf8");
ok(/^\.db-|^#deal-builder|^@media/m.test(cssSrc), "CSS is .db-/#deal-builder scoped");
var bareSelectors = cssSrc.split("\n").map(function (l) { return l.trim(); })
  .filter(function (l) {
    return /^[a-z][a-z0-9-]*(\s|[{,])/.test(l) && l.indexOf(".db-") !== 0 &&
           l.indexOf("#deal-builder") !== 0 && l.indexOf("@") !== 0 && l.indexOf("}") !== 0 &&
           l.indexOf("*") !== 0;
  });
ok(bareSelectors.length === 0, "no unscoped element selectors" +
  (bareSelectors.length ? ": " + bareSelectors.join(" | ") : ""));
[".ff-", ".cc-", ".platform-rules", ".oc-", "#ff-", "#oc-"].forEach(function (sel) {
  ok(cssSrc.indexOf(sel) < 0, "no cross-lane selector collision: " + sel);
});
ok(/text-wrap:\s*balance/.test(cssSrc), "CSS: balance on headings");
ok(/tabular-nums/.test(cssSrc), "CSS: tabular numerals on tables");
ok(!/\.animate\(|setInterval|requestAnimationFrame/.test(uiSrc), "UI: no self-initiated motion");
ok(/prefers-reduced-motion/.test(cssSrc) || !/animation|transition/.test(cssSrc),
  "CSS: reduced-motion safe (no animation at all)");

/* ---------- 11. Accessibility contract ---------- */
console.log("accessibility contract");
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
var BG = tok("bg");
[["cyan text", "cyan"], ["gold text", "gold"], ["stamp text", "stamp"],
 ["sage text", "sage"], ["ink body", "ink"]].forEach(function (c) {
  var ratio = contrast(tok(c[1]), BG);
  ok(ratio >= 4.5, "contrast " + c[0] + ": " + ratio.toFixed(2) + ":1 >= 4.5 (AA)");
});
var pageSrc = fs.readFileSync(path.join(ROOT, "pages", "deal-builder.html"), "utf8");
ok(/aria-live="polite"/.test(pageSrc), "page: aria-live regions");
ok(/role="alert"|aria-live="assertive"/.test(pageSrc), "page: assertive error region");
ok(/aria-label="Deal Builder"/.test(pageSrc), "page: form has an accessible label");
ok(/<noscript>/.test(pageSrc), "page: noscript fallback");
ok(/role="note"/.test(uiSrc), "UI: flags expose role=note");
ok(/:focus-visible/.test(cssSrc), "CSS: :focus-visible perimeters");
ok(/aria-label="Remove deliverable/.test(uiSrc), "UI: remove buttons are labeled");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
