/* Tests for the 2026 Platform Rules Bible reference chapter (wave 28).
 * Run: node tests/platform-rules-bible.test.js (from the repo root)
 * Exit 0 = all pass. Contracts:
 *  1. Structure: exactly one h1; 15 h2s, unique and non-empty; the 11
 *     numbered sections (§1–§11) exist in order; the "What's inside" list
 *     has 13 items matching the 13 content h2s in order (Sources excluded).
 *  2. Source labeling: every figure carries a weight label — minimum
 *     counts of single-source / verified / platform-stated markers so a
 *     future edit can't silently drop the labeling discipline.
 *  3. Honesty: the not-financial/legal/tax-advice line is present; no
 *     income-promise or guarantee language anywhere.
 *  4. Links: every internal .html link resolves to a real site/ page; no
 *     in-page #anchors (headings get no ids at build — the wayfinding JS
 *     adds them at runtime); no absolute site URLs.
 *  5. Tables: every row matches its header's column count.
 *  6. Freshness + sources: research date and a ≥20-item sources section.
 *  7. Wayfinding JS (assets/js/platform-rules-ui.js): defensive DOM
 *     guards, never initiates motion itself (reduced-motion-safe by
 *     construction), passive scroll listener, aria-current management,
 *     page-scoped class hook so site identity is untouched.
 *  8. Lane discipline: no references to parallel-lane internals.
 */
"use strict";
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var MD = fs.readFileSync(path.join(ROOT, "content", "platform-rules-bible.md"), "utf8");
var JS = fs.readFileSync(path.join(ROOT, "assets", "js", "platform-rules-ui.js"), "utf8");

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function count(re) { var m = MD.match(re); return m ? m.length : 0; }

/* 1: structure */
var h1s = MD.match(/^# .+/gm) || [];
ok(h1s.length === 1, "exactly one h1 (" + h1s.length + ")");
var h2s = (MD.match(/^## .+/gm) || []).map(function (h) { return h.slice(3).trim(); });
ok(h2s.length === 15, "15 h2 sections (" + h2s.length + ")");
ok(new Set(h2s).size === h2s.length, "all h2s unique");
ok(h2s.every(function (h) { return h.length > 3; }), "no empty h2s");
var numbered = h2s.filter(function (h) { return /^\d+\. /.test(h); });
ok(numbered.length === 11, "11 numbered sections (" + numbered.length + ")");
ok(numbered.every(function (h, i) { return h.indexOf((i + 1) + ". ") === 0; }),
  "numbered sections run 1-11 in order");
var tocBlock = MD.match(/## What's inside\n\n((?:\d+\. .+\n)+)/);
var tocItems = tocBlock ? tocBlock[1].trim().split("\n") : [];
ok(tocItems.length === 13, "TOC lists 13 sections (" + tocItems.length + ")");
var contentH2s = h2s.filter(function (h) {
  return h !== "What's inside" && h !== "Sources";
});
ok(contentH2s.length === 13, "13 content h2s pair with the 13 TOC items");
ok(tocItems.every(function (item, i) {
  var title = item.replace(/^\d+\. /, "").trim().toLowerCase();
  var h = contentH2s[i].toLowerCase();
  return h.indexOf(title.slice(0, 12)) !== -1 || title.indexOf(h.slice(0, 12)) !== -1;
}), "TOC items match content h2s in order");

/* 2: source labeling discipline */
ok(count(/single-source/gi) >= 40, "single-source flags >= 40 (" + count(/single-source/gi) + ")");
ok(count(/\bverified\b/gi) >= 25, "verified markers >= 25 (" + count(/\bverified\b/gi) + ")");
ok(count(/platform-stated/gi) >= 5, "platform-stated markers >= 5 (" + count(/platform-stated/gi) + ")");
var numberedSections = MD.split(/^## \d+\. /m).slice(1);
ok(numberedSections.length === 11, "11 numbered section bodies extracted");
ok(numberedSections.every(function (s) {
  return /single-source|verified|platform-stated/i.test(s);
}), "every numbered section carries at least one source-weight label");

/* 3: honesty contract */
ok(/not financial, legal, or tax advice/i.test(MD), "not-financial/legal/tax-advice line present");
ok(/honesty banner/i.test(MD), "honesty banner present");
var banned = ["guarantee", "guaranteed", "you will earn", "will make you",
  "passive income", "easy money", "get rich", "financial advice",
  "a promise", "promises "];
var hits = banned.filter(function (w) { return MD.toLowerCase().indexOf(w) !== -1; });
ok(hits.length === 0, "no income-promise/guarantee language" + (hits.length ? " (" + hits.join(", ") + ")" : ""));
ok(/never promises/i.test(MD), "'never promises' line present");
ok(/ranges, never rates|illustrative, never promises/i.test(MD),
  "ranges-not-rates framing present");

/* 4: links */
var links = [];
var lm = /\]\(([^)]+)\)/g, m;
while ((m = lm.exec(MD)) !== null) links.push(m[1]);
var htmlLinks = links.filter(function (l) { return /\.html$/.test(l); });
ok(htmlLinks.length >= 15, ">= 15 internal page links (" + htmlLinks.length + ")");
var missing = htmlLinks.filter(function (l) {
  return !fs.existsSync(path.join(ROOT, "site", l));
});
ok(missing.length === 0, "all internal links resolve to site/ pages" +
  (missing.length ? " MISSING: " + missing.join(", ") : ""));
ok(!links.some(function (l) { return l.charAt(0) === "#"; }),
  "no in-page #anchors (headings get ids only at runtime via the wayfinding JS)");
ok(!links.some(function (l) { return /^https?:\/\//i.test(l); }),
  "no absolute URLs in body (sources are named, per site convention)");

/* 5: tables */
var lines = MD.split("\n"), badTables = 0, tableCount = 0;
for (var i = 0; i < lines.length; i++) {
  if (/^\|/.test(lines[i]) && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1].trim())) {
    tableCount++;
    var cols = lines[i].split("|").length;
    var j = i + 2;
    while (j < lines.length && /^\|/.test(lines[j])) {
      if (lines[j].split("|").length !== cols) badTables++;
      j++;
    }
    i = j - 1;
  }
}
ok(tableCount >= 5, ">= 5 data tables (" + tableCount + ")");
ok(badTables === 0, "every table row matches its header column count");

/* 6: freshness + sources */
ok(/October 11, 2026/.test(MD), "research date October 11, 2026 stated");
ok(/February 1, 2027/.test(MD), "Feb 1 2027 YPP date present");
var srcBlock = MD.split("## Sources")[1] || "";
ok((srcBlock.match(/^- /gm) || []).length >= 20,
  "sources section has >= 20 items (" + ((srcBlock.match(/^- /gm) || []).length) + ")");
ok(/verify live before acting/i.test(MD), "verify-live disclaimer present");

/* 7: wayfinding JS */
ok(/typeof document === "undefined"/.test(JS), "JS guards non-DOM environments");
ok(/querySelector\("article\.chapter"\)/.test(JS), "JS scopes to the chapter article");
ok(/classList\.add\("platform-rules"\)/.test(JS), "JS adds the page-scoped class hook");
ok(/classList\.add\("platform-rules-page"\)/.test(JS), "JS adds the body-level scoping hook");
ok(/aria-current/.test(JS), "JS manages aria-current on TOC links");
ok(/aria-label/.test(JS), "JS labels the TOC nav");
ok(/passive:\s*true/.test(JS) || /passive/.test(JS), "scroll listener is passive");
ok(/animation-timeline/.test(JS), "JS feature-detects CSS scroll-timeline support");
ok(/CSS\.supports/.test(JS), "support check via CSS.supports (fallback only when missing)");
ok(!/\.animate\(/.test(JS), "JS never calls .animate() (no self-initiated motion)");
ok(!/setInterval/.test(JS), "no setInterval animation loops");
ok(!/scrollIntoView\(\{\s*behavior:\s*["']smooth/.test(JS),
  "no JS-forced smooth scrolling (left to CSS under no-preference)");
ok(/requestAnimationFrame/.test(JS), "scroll handler is rAF-throttled");
ok(/IntersectionObserver/.test(JS), "active-section tracking via IntersectionObserver");
ok(/"use strict"/.test(JS), "strict mode");

/* 8: lane discipline — never touch parallel lanes' files */
ok(!/wave-2[67]/i.test(MD), "no wave-26/27 references in the chapter");
ok(!/deal-analyzer\.js|sim-engine\.js|crosspost-ui\.js/.test(MD),
  "no parallel-lane engine internals referenced");
ok(!/WAVELOG\.md/.test(JS), "JS doesn't touch the wave log");

console.log(failures === 0 ? "\nplatform-rules-bible: all tests passed"
  : "\nplatform-rules-bible: " + failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
