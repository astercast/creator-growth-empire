/* Platform Ledger tests. Run: node tests/platform-ledger.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var PL = require(path.join(ROOT, "assets", "js", "platform-ledger.js"));
var P = require(path.join(ROOT, "assets", "js", "deal-pipeline.js"));
var failures = 0, passes = 0;
function ok(c, n) { if (c) { passes++; console.log("  PASS " + n); } else { failures++; console.log("  FAIL " + n); } }
var NOW = new Date("2026-10-13T00:00:00Z");
var OPTS = { now: NOW, dp: P };

console.log("platform-ledger — the Workflow 23 board, ledgered by platform");
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
var l = PL.buildLedger(deals, OPTS);
ok(l.ok && l.platformCount === 2, "the board's nine deals ledger under two platforms");
ok(l.pipelineValue === 40300 && l.totals.pipelineValue === 40300,
  "the pipeline total stays Tool 25's pipeline value ($40,300) — grouped, never re-derived");
ok(l.platforms.map(function (p) { return p.platform; }).join("|") === "youtube|tiktok",
  "platforms order largest total first ($31,000 → $9,300)");
ok(l.topPlatform.platform === "youtube" && l.topPlatform.total === 31000 && l.topPlatform.share === 76.9,
  "top platform is youtube at $31,000 = 76.9% of pipeline");
var yt = l.platforms[0];
ok(yt.total === 31000 && yt.collected === 12000 && yt.owed === 7000 && yt.open === 12000 &&
   yt.dealCount === 6 && yt.share === 76.9,
  "youtube across every stage: $31,000 = $12,000 collected + $7,000 owed + $12,000 still open (6 deals)");
var tt = l.platforms[1];
ok(tt.total === 9300 && tt.collected === 1500 && tt.owed === 6000 && tt.open === 1800 &&
   tt.dealCount === 3 && tt.share === 23.1 && tt.stageCounts.invoiced === 1 && tt.stageCounts.paid === 1,
  "tiktok spans open, owed, and collected ($1,800 open + $6,000 owed + $1,500 collected = $9,300) with stage counts kept");
ok(l.platforms.every(function (p) { return p.open + p.owed + p.collected === p.total; }) &&
   l.collected === 13500 && l.owed === 13000 && l.openValue === 13800,
  "every platform's open + owed + collected equals its total; the classes sum to the board's ($13,800 open + $13,000 owed + $13,500 collected)");
ok(yt.brands.join("|") === "Early Bird Media|Fresh Invoice Co|Northwind VPN|Paid Brand|Ridge Wallet" &&
   tt.brands.join("|") === "Slow Payer LLC|Trail Snacks Co",
  "each platform carries the brands its deals were entered under, sorted");
ok(PL.share(1, 0) === 0 && PL.share(31000, 40300) === 76.9,
  "share is plain arithmetic on entered figures (no rate, no threshold)");
ok(l.emptyBoard === false && l.demoOnly === false,
  "a board with real deals reports neither empty state");

console.log("platform-ledger — honesty: empty, demo");
var empty = PL.buildLedger([], OPTS);
ok(empty.ok && empty.platformCount === 0 && empty.emptyBoard === true && empty.demoOnly === false && empty.pipelineValue === 0,
  "an empty board reports emptyBoard");
ok(/empty because the Deal Pipeline is empty/.test(PL.exportLedger(empty)),
  "the empty export says the ledger is empty because the board is");
var demoL = PL.buildLedger(P.DEMO_DEALS, OPTS);
ok(demoL.platformCount === 0 && demoL.demoOnly === true && demoL.emptyBoard === false &&
   demoL.demoCount === 3 && demoL.demoValue === 18300,
  "the demo board is named demoOnly and its deals are counted apart (3 deals, $18,300), never ledgered");
var mixed = PL.buildLedger(deals.concat(P.DEMO_DEALS), OPTS);
ok(mixed.platformCount === 2 && mixed.pipelineValue === 40300 && mixed.demoCount === 3 && mixed.demoOnly === false,
  "on a mixed board the demo deals stay out of the platforms and the total ($40,300)");
ok(/DEMO deal/.test(PL.exportLedger(mixed)), "the export names the excluded demo deals");

console.log("platform-ledger — the export");
var exp = PL.exportLedger(l);
ok(/PLATFORM LEDGER — 2 platform\(s\), \$40,300 across the board/.test(exp) &&
   /youtube · \$31,000 total · 76.9% of pipeline/.test(exp) &&
   /Collected \$12,000 · owed \$7,000/.test(exp) &&
   /not a platform history/.test(exp) && /current stages/.test(exp),
  "export carries the platforms, the stage classes, and the no-history honesty note");
ok(exp.indexOf("youtube") < exp.indexOf("tiktok"), "export order matches ledger order");

console.log("platform-ledger — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "platform-ledger.html"), "utf8");
ok(page.indexOf('id="pld-ledger"') >= 0 && page.indexOf('id="pld-export"') >= 0 && page.indexOf('id="pld-demo"') >= 0,
  "page carries ledger, export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "platform-ledger.js"), "utf8");
ok(!/NUDGE_DAYS|STAGE_SCENARIO|buildCard\(|priceDeal\(/.test(src),
  "engine defines no thresholds or scenarios of its own and never prices a deal (it groups Tool 25's board)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"platform-ledger": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"platform-ledger": ["assets/css/platform-ledger.css"]') >= 0,
  "build.py loads the composed engines before the ledger and registers its CSS");

console.log("\nplatform-ledger: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
