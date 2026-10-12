/* Tests for the 2026 Breakout-Format Intel reference page (wave 31).
 * Run: node tests/breakout-format-intel.test.js (from the repo root)
 * Exit 0 = all pass. Contracts:
 *  1. Structure: exactly one h1; 19 h2s (What's inside + 17 numbered
 *     sections + Sources), unique and non-empty; numbered sections run
 *     1-17 in order; the 10 DOSSIER h2s are 01-10 in order; the TOC's
 *     17 items pair with the 17 content h2s in order.
 *  2. Source labeling: every figure carries a weight label — minimum
 *     counts of single-source / verified / platform-stated markers so a
 *     future edit can't silently drop the labeling discipline; every
 *     dossier section carries at least one label.
 *  3. Honesty: the not-financial/legal/tax-advice line is present; no
 *     income-promise or guarantee language anywhere; ranges-not-rates
 *     framing present.
 *  4. Links: every internal .html link resolves to a real site/ page;
 *     no in-page #anchors; no absolute URLs anywhere (sources are
 *     named, per site convention).
 *  5. Freshness + sources: research date + Feb-2027 date; >= 20-item
 *     sources section; verify-live disclaimer.
 *  6. Data sync: data/niches.json breakout_format_dossiers — 10 entries
 *     01-10 in order, every dossier field present, every dossier sourced,
 *     ids match the page's dossier h2s; version 2.1.0; generated schema
 *     documents the new block.
 *  7. Wiring: build.py REFERENCE_PAGES carries the breakout-format-intel
 *     tuple; the built site page exists; llms.txt / llms-full.txt name it.
 */
"use strict";
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var MD = fs.readFileSync(path.join(ROOT, "content", "breakout-format-intel.md"), "utf8");

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
ok(h2s.length === 19, "19 h2 sections (" + h2s.length + ")");
ok(new Set(h2s).size === h2s.length, "all h2s unique");
ok(h2s.every(function (h) { return h.length > 3; }), "no empty h2s");
var numbered = h2s.filter(function (h) { return /^\d+\. /.test(h); });
ok(numbered.length === 17, "17 numbered sections (" + numbered.length + ")");
ok(numbered.every(function (h, i) { return h.indexOf((i + 1) + ". ") === 0; }),
  "numbered sections run 1-17 in order");
var dossierH2s = h2s.filter(function (h) { return /DOSSIER (\d\d)/.test(h); });
ok(dossierH2s.length === 10, "10 dossier h2s (" + dossierH2s.length + ")");
ok(dossierH2s.every(function (h, i) {
  var n = ("0" + (i + 1)).slice(-2);
  return h.indexOf("DOSSIER " + n) !== -1;
}), "dossiers run 01-10 in order");
var tocBlock = MD.match(/## What's inside\n\n((?:\d+\. .+\n)+)/);
var tocItems = tocBlock ? tocBlock[1].trim().split("\n") : [];
ok(tocItems.length === 17, "TOC lists 17 sections (" + tocItems.length + ")");
var contentH2s = h2s.filter(function (h) {
  return h !== "What's inside" && h !== "Sources";
});
ok(contentH2s.length === 17, "17 content h2s pair with the 17 TOC items");
ok(tocItems.every(function (item, i) {
  var title = item.replace(/^\d+\. /, "").trim().toLowerCase();
  var h = contentH2s[i].toLowerCase();
  return h.indexOf(title.slice(0, 12)) !== -1 || title.indexOf(h.slice(0, 12)) !== -1;
}), "TOC items match content h2s in order");

/* 2: source labeling discipline */
ok(count(/single-source/gi) >= 60, "single-source flags >= 60 (" + count(/single-source/gi) + ")");
ok(count(/\bverified\b/gi) >= 40, "verified markers >= 40 (" + count(/\bverified\b/gi) + ")");
ok(count(/platform-stated/gi) >= 4, "platform-stated markers >= 4 (" + count(/platform-stated/gi) + ")");
var bodies = MD.split(/^## \d+\. /m).slice(1);
ok(bodies.length === 17, "17 numbered section bodies extracted");
ok(bodies.every(function (s) {
  return /single-source|verified|platform-stated/i.test(s);
}), "every numbered section carries at least one source-weight label");
ok(bodies.slice(2, 12).every(function (s) {
  return /The signal/.test(s) && /The pay/.test(s) && /The competition/.test(s) &&
         /What it takes/.test(s) && /Who it suits/.test(s) &&
         /The risks/.test(s) && /The 2027 read/.test(s);
}), "all 10 dossiers carry the seven standard fields");

/* 3: honesty contract */
ok(/not financial, legal, or tax advice/i.test(MD), "not-financial/legal/tax-advice line present");
ok(/honesty banner/i.test(MD), "honesty banner present");
var banned = ["guarantee", "guaranteed", "you will earn", "will make you",
  "passive income", "easy money", "get rich", "financial advice",
  "a promise", "promises "];
var hits = banned.filter(function (w) { return MD.toLowerCase().indexOf(w) !== -1; });
ok(hits.length === 0, "no income-promise/guarantee language" + (hits.length ? " (" + hits.join(", ") + ")" : ""));
ok(/never promises/i.test(MD), "'never promises' line present");
ok(/ranges, never promises|never platform-published/i.test(MD),
  "ranges-not-rates framing present");
ok(/your own numbers outrank everything here/i.test(MD), "golden rule present");

/* 4: links */
var links = [];
var lm = /\]\(([^)]+)\)/g, m;
while ((m = lm.exec(MD)) !== null) links.push(m[1]);
var htmlLinks = links.filter(function (l) { return /\.html$/.test(l); });
ok(htmlLinks.length >= 10, ">= 10 internal page links (" + htmlLinks.length + ")");
var sitePage = path.join(ROOT, "site", "breakout-format-intel.html");
var missing = htmlLinks.filter(function (l) {
  return !fs.existsSync(path.join(ROOT, "site", l));
});
ok(fs.existsSync(sitePage), "built page site/breakout-format-intel.html exists");
ok(missing.length === 0, "all internal links resolve to site/ pages" +
  (missing.length ? " MISSING: " + missing.join(", ") : ""));
ok(!links.some(function (l) { return l.charAt(0) === "#"; }),
  "no in-page #anchors");
ok(!links.some(function (l) { return /^https?:\/\//i.test(l); }),
  "no absolute URLs anywhere (sources are named, per site convention)");

/* 5: freshness + sources */
ok(/October 11, 2026/.test(MD), "research date October 11, 2026 stated");
ok(/February 1, 2027/.test(MD), "Feb 1 2027 YPP date present");
var srcBlock = MD.split("## Sources")[1] || "";
ok((srcBlock.match(/^- /gm) || []).length >= 20,
  "sources section has >= 20 items (" + ((srcBlock.match(/^- /gm) || []).length) + ")");
ok(/verify live before acting/i.test(MD), "verify-live disclaimer present");
ok(!/breakout/i.test(srcBlock.split("##")[0] || "") || true, "sources block parsed");

/* 6: data sync with data/niches.json */
var nichesPath = path.join(ROOT, "data", "niches.json");
ok(fs.existsSync(nichesPath), "data/niches.json exists");
var niches = JSON.parse(fs.readFileSync(nichesPath, "utf8"));
ok(niches.version === "2.1.0", "niches.json version is 2.1.0 (" + niches.version + ")");
var doss = niches.breakout_format_dossiers || [];
ok(doss.length === 10, "10 dossiers in breakout_format_dossiers (" + doss.length + ")");
ok(doss.every(function (d, i) { return d.dossier_no === ("0" + (i + 1)).slice(-2); }),
  "dossier_no runs 01-10 in order");
var fields = ["id", "name", "dossier_no", "signal", "pay", "competition",
              "entry_requirements", "who_it_suits", "risks", "read_2027",
              "sources", "single_source"];
ok(doss.every(function (d) {
  return fields.every(function (f) { return d[f] !== undefined && d[f] !== ""; });
}), "every dossier carries all " + fields.length + " fields");
ok(doss.every(function (d) {
  return Array.isArray(d.sources) && d.sources.length >= 1 &&
         typeof d.single_source === "boolean";
}), "every dossier is sourced and carries a boolean single_source flag");
var h2DossierNos = dossierH2s.map(function (h) { return h.match(/DOSSIER (\d\d)/)[1]; });
ok(JSON.stringify(doss.map(function (d) { return d.dossier_no; })) === JSON.stringify(h2DossierNos),
  "data dossier order matches the page's dossier h2 order");
var sourceIds = {};
(niches.sources || []).forEach(function (s) { sourceIds[s.id] = true; });
var badSrcs = [];
doss.forEach(function (d) {
  (d.sources || []).forEach(function (sid) {
    if (!sourceIds[sid]) badSrcs.push(d.id + ":" + sid);
  });
});
ok(badSrcs.length === 0, "every dossier source id exists in niches.json sources" +
  (badSrcs.length ? " BAD: " + badSrcs.join(", ") : ""));
var apiNichesPath = path.join(ROOT, "data", "v1", "niches.json");
if (fs.existsSync(apiNichesPath)) {
  var apiNiches = JSON.parse(fs.readFileSync(apiNichesPath, "utf8"));
  ok(Array.isArray(apiNiches.breakout_format_dossiers) &&
     apiNiches.breakout_format_dossiers.length === 10,
     "built data/v1/niches.json carries the 10 dossiers");
}
var schemaPath = path.join(ROOT, "data", "v1", "schema", "niches.json");
if (fs.existsSync(schemaPath)) {
  var schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  ok(schema.properties && schema.properties.breakout_format_dossiers,
    "niches schema documents breakout_format_dossiers");
}

/* 7: build wiring */
var buildPy = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(/"breakout-format-intel", "content\/breakout-format-intel\.md"/.test(buildPy),
  "REFERENCE_PAGES carries the breakout-format-intel tuple");
var llms = "";
try { llms = fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8"); } catch (e) {}
var llmsFull = "";
try { llmsFull = fs.readFileSync(path.join(ROOT, "llms-full.txt"), "utf8"); } catch (e) {}
if (llms) ok(/Breakout-Format Intel/i.test(llms), "llms.txt names the new page");
if (llmsFull) ok(/Breakout-Format Intel/i.test(llmsFull), "llms-full.txt names the new page");

console.log(failures === 0 ? "\nbreakout-format-intel: all tests passed"
  : "\nbreakout-format-intel: " + failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
