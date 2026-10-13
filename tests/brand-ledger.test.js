/* Brand Ledger tests. Run: node tests/brand-ledger.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var BL = require(path.join(ROOT, "assets", "js", "brand-ledger.js"));
var P = require(path.join(ROOT, "assets", "js", "deal-pipeline.js"));
var failures = 0, passes = 0;
function ok(c, n) { if (c) { passes++; console.log("  PASS " + n); } else { failures++; console.log("  FAIL " + n); } }
var NOW = new Date("2026-10-13T00:00:00Z");
var OPTS = { now: NOW, dp: P };

console.log("brand-ledger — the Workflow 22 board, ledgered by brand");
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
    amount: 3000, stage: "paid", stageEnteredAt: "2026-08-20" },
  { id: "f", brand: "Trail Snacks Co", platform: "tiktok", format: "short", followers: 50000,
    expectedViews: 60000, niche: "lifestyle", usage: "organic_only", whitelistingMonths: 0,
    amount: 1500, stage: "paid", stageEnteredAt: "2026-08-05" },
  { id: "g", brand: "Northwind VPN", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 2000, stage: "paid", stageEnteredAt: "2026-09-15" },
  { id: "h", brand: "Fresh Invoice Co", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 2500, stage: "invoiced", stageEnteredAt: "2026-10-12" },
  { id: "i", brand: "Slow Payer LLC", platform: "tiktok", format: "short", followers: 120000,
    expectedViews: 200000, niche: "lifestyle", usage: "organic_only", whitelistingMonths: 0,
    amount: 6000, stage: "invoiced", stageEnteredAt: "2026-08-30" }
];
var l = BL.buildLedger(deals, OPTS);
ok(l.ok && l.brandCount === 7, "the board's nine deals ledger under seven brands");
ok(l.pipelineValue === 40300 && l.totals.pipelineValue === 40300,
  "the pipeline total stays Tool 25's pipeline value ($40,300) — grouped, never re-derived");
ok(l.brands.map(function (b) { return b.brand; }).join("|") ===
   "Ridge Wallet|Paid Brand|Northwind VPN|Slow Payer LLC|Trail Snacks Co|Early Bird Media|Fresh Invoice Co",
  "brands order largest relationship first ($12,000 → $2,500)");
ok(l.topBrand.brand === "Ridge Wallet" && l.topBrand.total === 12000 && l.topBrand.share === 29.8,
  "top brand is Ridge Wallet at $12,000 = 29.8% of pipeline");
var nw = l.brands[2];
ok(nw.brand === "Northwind VPN" && nw.total === 6500 && nw.collected === 2000 && nw.owed === 4500 &&
   nw.open === 0 && nw.dealCount === 2 && nw.share === 16.1,
  "a brand in two tools at once is one relationship: Northwind VPN $6,500 = $2,000 collected + $4,500 owed (16.1%)");
var ts = l.brands[4];
ok(ts.brand === "Trail Snacks Co" && ts.total === 3300 && ts.open === 1800 && ts.collected === 1500 &&
   ts.owed === 0 && ts.stageCounts.lead === 1 && ts.stageCounts.paid === 1,
  "Trail Snacks Co spans open and collected ($1,800 open + $1,500 collected = $3,300) with stage counts kept");
ok(l.brands.every(function (b) { return b.open + b.owed + b.collected === b.total; }) &&
   l.collected === 13500 && l.owed === 13000 && l.openValue === 13800,
  "every brand's open + owed + collected equals its total; the classes sum to the board's ($13,800 open + $13,000 owed + $13,500 collected)");
ok(l.brands[0].platforms.join("|") === "youtube" && ts.platforms.join("|") === "tiktok",
  "each brand carries the platforms its deals were entered under");
ok(BL.share(1, 0) === 0 && BL.share(12000, 40300) === 29.8,
  "share is plain arithmetic on entered figures (no rate, no threshold)");
ok(l.emptyBoard === false && l.demoOnly === false,
  "a board with real deals reports neither empty state");

console.log("brand-ledger — honesty: empty, demo");
var empty = BL.buildLedger([], OPTS);
ok(empty.ok && empty.brandCount === 0 && empty.emptyBoard === true && empty.demoOnly === false && empty.pipelineValue === 0,
  "an empty board reports emptyBoard");
ok(/empty because the Deal Pipeline is empty/.test(BL.exportLedger(empty)),
  "the empty export says the ledger is empty because the board is");
var demoL = BL.buildLedger(P.DEMO_DEALS, OPTS);
ok(demoL.brandCount === 0 && demoL.demoOnly === true && demoL.emptyBoard === false &&
   demoL.demoCount === 3 && demoL.demoValue === 18300,
  "the demo board is named demoOnly and its deals are counted apart (3 deals, $18,300), never ledgered");
var mixed = BL.buildLedger(deals.concat(P.DEMO_DEALS), OPTS);
ok(mixed.brandCount === 7 && mixed.pipelineValue === 40300 && mixed.demoCount === 3 && mixed.demoOnly === false,
  "on a mixed board the demo deals stay out of the brands and the total ($40,300)");
ok(/DEMO deal/.test(BL.exportLedger(mixed)), "the export names the excluded demo deals");

console.log("brand-ledger — the export");
var exp = BL.exportLedger(l);
ok(/BRAND LEDGER — 7 brand\(s\), \$40,300 across the board/.test(exp) &&
   /Ridge Wallet · \$12,000 total · 29.8% of pipeline/.test(exp) &&
   /Collected \$2,000 · owed \$4,500/.test(exp) &&
   /not a relationship history or a lifetime value/.test(exp) && /current stages/.test(exp),
  "export carries the brands, the stage classes, and the no-history honesty note");
ok(exp.indexOf("Ridge Wallet") < exp.indexOf("Fresh Invoice Co"), "export order matches ledger order");

console.log("brand-ledger — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "brand-ledger.html"), "utf8");
ok(page.indexOf('id="bl-ledger"') >= 0 && page.indexOf('id="bl-export"') >= 0 && page.indexOf('id="bl-demo"') >= 0,
  "page carries ledger, export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "brand-ledger.js"), "utf8");
ok(!/NUDGE_DAYS|STAGE_SCENARIO|buildCard\(|priceDeal\(/.test(src),
  "engine defines no thresholds or scenarios of its own and never prices a deal (it groups Tool 25's board)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"brand-ledger": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"brand-ledger": ["assets/css/brand-ledger.css"]') >= 0,
  "build.py loads the composed engines before the ledger and registers its CSS");

console.log("\nbrand-ledger: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
