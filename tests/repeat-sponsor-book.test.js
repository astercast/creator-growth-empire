/* Repeat Sponsor Book tests. Run: node tests/repeat-sponsor-book.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var RSB = require(path.join(ROOT, "assets", "js", "repeat-sponsor-book.js"));
var P = require(path.join(ROOT, "assets", "js", "deal-pipeline.js"));
var R = require(path.join(ROOT, "assets", "js", "rate-card-builder.js"));
var NK = require(path.join(ROOT, "assets", "js", "negotiation-kit.js"));
var NSB = require(path.join(ROOT, "assets", "js", "negotiation-script-builder.js"));
var cfg = require(path.join(ROOT, "data", "calculators.json"));
var tpl = require(path.join(ROOT, "data", "v1", "deal-templates.json"));
var feed = require(path.join(ROOT, "data", "changes.json"));
var failures = 0, passes = 0;
function ok(c, n) { if (c) { passes++; console.log("  PASS " + n); } else { failures++; console.log("  FAIL " + n); } }
var NOW = new Date("2026-10-13T00:00:00Z");
var OPTS = { calculators: cfg, dealTemplates: tpl, changesFeed: feed, now: NOW, rcb: R, nsb: NSB, nk: NK, dp: P };

console.log("repeat-sponsor-book — the Workflow 18 board plus one older paid deal");
var deals = [
  { id: "a", brand: "Ridge Wallet", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "paid_6mo", whitelistingMonths: 0,
    amount: 12000, stage: "negotiating", stageEnteredAt: "2026-10-05", scenario: "lowball" },
  { id: "b", brand: "Trail Snacks Co", platform: "tiktok", format: "short", followers: 50000,
    expectedViews: 60000, niche: "lifestyle", usage: "organic_only", whitelistingMonths: 0,
    amount: 1800, stage: "lead", stageEnteredAt: "2026-10-08" },
  { id: "c", brand: "Northwind VPN", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "paid_3mo", whitelistingMonths: 0,
    amount: 4500, stage: "invoiced", stageEnteredAt: "2026-09-20" },
  { id: "d", brand: "Paid Brand", platform: "youtube", format: "dedicated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 7000, stage: "paid", stageEnteredAt: "2026-10-01" },
  { id: "e", brand: "Early Bird Media", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 3000, stage: "paid", stageEnteredAt: "2026-08-20" }
];
var b = RSB.buildBook(deals, OPTS);
ok(b.ok && b.paidCount === 2, "only the board's paid deals are booked (2 of 5)");
ok(b.items.map(function (i) { return i.brand; }).join("|") === "Early Bird Media|Paid Brand",
  "book order is longest since payment first (54d before 12d)");
ok(b.items[0].paidAgeDays === 54 && b.items[1].paidAgeDays === 12,
  "paid ages are Tool 25's stage ages (54d / 12d at 2026-10-13)");
ok(b.collected === 10000 && b.totals.pipelineValue === 28300,
  "collected stays Tool 25's paid total ($10,000 of a $28,300 pipeline)");
ok(b.items[0].rateCard.ok && b.items[0].rateCard.total.range.join("-") === "3000-5300" &&
   /sponsored_cpms\.youtube_integrated_slot/.test(b.items[0].rateCard.provenance),
  "each item carries Tool 23's current card through Tool 25 (Early Bird integrated total $3,000–$5,300, provenance intact)");
ok(b.items[1].rateCard.total.range.join("-") === "2500-25000" && b.items[1].relation === "inside" && b.items[0].relation === "inside",
  "the paid amount is set against the card total (both fixture amounts sit inside their ranges)");
ok(RSB.relation(1000, [3000, 5300]) === "below" && RSB.relation(9999, [3000, 5300]) === "above" && RSB.relation(3000, [3000, 5300]) === "inside",
  "relation is a plain comparison of the two composed figures (below / above / inside, edges inside)");
ok(b.items.every(function (i) { return i.pitch.ok === false && /cold pitch/.test(i.pitch.reason) && /mutual connection/.test(i.pitch.reason); }),
  "no pitch wording is attached — the exclusion names why (no repo template describes a repeat pitch)");
ok(b.emptyBoard === false && b.noPaidYet === false && b.demoOnly === false,
  "a board with paid deals reports none of the empty states");

console.log("repeat-sponsor-book — honesty: empty, no paid yet, demo");
var empty = RSB.buildBook([], OPTS);
ok(empty.ok && empty.paidCount === 0 && empty.emptyBoard === true && empty.noPaidYet === false,
  "an empty board reports emptyBoard, not no-paid-yet");
ok(/empty because the Deal Pipeline is empty/.test(RSB.exportBook(empty)),
  "the empty export says the book is empty because the board is");
var fresh = RSB.buildBook([deals[1]], OPTS);
ok(fresh.paidCount === 0 && fresh.emptyBoard === false && fresh.noPaidYet === true,
  "a real board with nothing paid reports noPaidYet");
ok(/No brand has paid yet/.test(RSB.exportBook(fresh)), "the no-paid-yet export says so");
var demoB = RSB.buildBook(P.DEMO_DEALS, OPTS);
ok(demoB.paidCount === 0 && demoB.demoOnly === true && demoB.emptyBoard === false && demoB.noPaidYet === false,
  "the demo board (no paid deals) is named demoOnly — not no-paid-yet");
var demoPaid = RSB.buildBook(P.DEMO_DEALS.concat([
  { id: "demo-9", demo: true, brand: "DEMO · Paid Demo", platform: "youtube", format: "dedicated",
    followers: 50000, expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 9999, stage: "paid", stageEnteredAt: "2026-09-01" }
]), OPTS);
ok(demoPaid.paidCount === 0 && demoPaid.demoPaid === 1 && demoPaid.demoPaidValue === 9999 && demoPaid.demoOnly === true,
  "a demo paid deal is counted apart ($9,999), never booked");
ok(/DEMO paid deal/.test(RSB.exportBook(demoPaid)), "the export names the excluded demo paid deal");

console.log("repeat-sponsor-book — the export");
var exp = RSB.exportBook(b);
ok(/REPEAT SPONSOR BOOK · 2 paid brand\(s\), \$10,000 collected/.test(exp) &&
   /Early Bird Media/.test(exp) && /Tool 23/.test(exp) && /Tool 25/.test(exp) &&
   /not a renewal-due date/.test(exp),
  "export carries the book, the collected total, the composition provenance, and the no-renewal-window note");
ok(exp.indexOf("Early Bird Media") < exp.indexOf("Paid Brand"), "export order matches book order");

console.log("repeat-sponsor-book — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "repeat-sponsor-book.html"), "utf8");
ok(page.indexOf('id="rsb-book"') >= 0 && page.indexOf('id="rsb-export"') >= 0 && page.indexOf('id="rsb-demo"') >= 0,
  "page carries book, export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "repeat-sponsor-book.js"), "utf8");
ok(!/NUDGE_DAYS|STAGE_SCENARIO|buildCard\(/.test(src),
  "engine defines no thresholds or scenarios of its own and never calls Tool 23 directly (it reads Tool 25's enriched board)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"repeat-sponsor-book": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"repeat-sponsor-book": ["assets/css/repeat-sponsor-book.css"]') >= 0,
  "build.py loads the composed engines before the book and registers its CSS");

console.log("\nrepeat-sponsor-book: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
