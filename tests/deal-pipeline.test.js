/* Deal Pipeline tests. Run: node tests/deal-pipeline.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var P = require(path.join(ROOT, "assets", "js", "deal-pipeline.js"));
var R = require(path.join(ROOT, "assets", "js", "rate-card-builder.js"));
var NK = require(path.join(ROOT, "assets", "js", "negotiation-kit.js"));
var NSB = require(path.join(ROOT, "assets", "js", "negotiation-script-builder.js"));
var cfg = require(path.join(ROOT, "data", "calculators.json"));
var tpl = require(path.join(ROOT, "data", "v1", "deal-templates.json"));
var feed = require(path.join(ROOT, "data", "changes.json"));
var failures = 0;
function ok(c, n) { if (c) console.log("  PASS " + n); else { failures++; console.log("  FAIL " + n); } }
var NOW = new Date("2026-10-13T00:00:00Z");
var OPTS = { calculators: cfg, dealTemplates: tpl, changesFeed: feed, now: NOW, rcb: R, nsb: NSB, nk: NK };

console.log("deal pipeline — fixture board (AGENT.md Workflow 18 numbers)");
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
    amount: 7000, stage: "paid", stageEnteredAt: "2026-10-01" }
];
var b = P.buildBoard(deals, OPTS);
ok(b.ok && P.STAGES.join(",") === "lead,negotiating,terms,live,invoiced,paid", "six stages in pipeline order");
ok(b.totals.pipelineValue === 25300 && b.totals.openValue === 18300 &&
   b.totals.invoicedOutstanding === 4500 && b.totals.paidTotal === 7000 && b.totals.totalDeals === 4,
  "totals from entered deals only: $25,300 pipeline / $18,300 open / $4,500 invoiced / $7,000 paid");
ok(b.nudges.length === 3 && b.nudges.map(function (n) { return n.ageDays; }).join(",") === "8,5,23",
  "stage-age nudges due: negotiating 8d, lead 5d, invoiced 23d");
var a = b.deals[0];
ok(a.rateCard.ok && a.rateCard.primary.range[0] === 3000 && a.rateCard.primary.range[1] === 5300 &&
   a.rateCard.primary.source === "sponsored_cpms.youtube_integrated_slot" && a.rateCard.primary.basis === "benchmark",
  "deal priced by Tool 23: integrated $3,000–$5,300 from the named CPM block [benchmark]");
ok(a.rateCard.total.range[0] === 4500 && a.rateCard.total.range[1] === 9300 &&
   /Rate Card Builder \(Tool 23\)/.test(a.rateCard.provenance),
  "card total $4,500–$9,300 with Tool 23 provenance attached");
ok(a.script.ok && a.script.counter.total[0] === 38000 && a.script.counter.total[1] === 44000 && a.script.walkAway === 2500,
  "deal script is Tool 24's: counter $38,000–$44,000, walk-away $2,500");
var c = b.deals[2];
ok(c.script.ok && c.script.scenario === "late_payment", "invoiced stage defaults to the late-payment script");
var d = b.deals[3];
ok(d.script.none === true && d.nudge === null, "paid deal: no script, no nudge");

console.log("deal pipeline — honesty: empty board and demo data");
var empty = P.buildBoard([], OPTS);
ok(empty.totals.empty === true && empty.totals.pipelineValue === 0 && empty.nudges.length === 0 &&
   /genuinely|empty/.test(P.exportBoard(empty)) && /No real deals entered/.test(P.exportBoard(empty)),
  "empty board totals to zero and says so");
ok(P.DEMO_DEALS.length === 3 && P.DEMO_DEALS.every(function (x) { return x.demo === true && /^DEMO — /.test(x.brand); }),
  "demo deals are flagged demo:true with DEMO brand prefixes");
var demoTotals = P.pipelineTotals(P.DEMO_DEALS);
ok(demoTotals.totalDeals === 0 && demoTotals.pipelineValue === 0 && demoTotals.demoCount === 3 && demoTotals.demoValue === 18300,
  "demo money never enters real totals (3 demo deals, $18,300 counted apart)");

console.log("deal pipeline — validation and nudge edges");
ok(!P.validDeal({ brand: "", stage: "lead", amount: 0, stageEnteredAt: "2026-10-01" }).ok, "brand required");
ok(!P.validDeal({ brand: "X", stage: "bogus", amount: 0, stageEnteredAt: "2026-10-01" }).ok, "unknown stage rejected");
ok(P.validDeal({ brand: "X", stage: "lead", amount: 0, stageEnteredAt: "2026-10-01" }).ok, "amount 0 is a real value (unpaid lead)");
ok(P.nudgeFor({ brand: "Y", stage: "lead", amount: 0, stageEnteredAt: "2026-10-12" }, NOW) === null,
  "no nudge before the stage threshold (lead at 1d)");
ok(P.nudgeFor({ brand: "Y", stage: "invoiced", amount: 100, stageEnteredAt: "2026-08-20" }, NOW).urgent === true,
  "invoiced at 30+ days is urgent");

console.log("deal pipeline — export + wiring");
var text = P.exportBoard(b);
ok(/DEAL PIPELINE/.test(text) && /\$25,300/.test(text) && /FOLLOW-UP:/.test(text), "export carries totals and nudges");
var page = fs.readFileSync(path.join(ROOT, "pages", "deal-pipeline.html"), "utf8");
ok(page.indexOf('id="dp-form"') >= 0 && page.indexOf('id="dp-board"') >= 0 && page.indexOf('id="dp-export"') >= 0 &&
   page.indexOf('id="dp-demo"') >= 0, "page carries form, board, export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"deal-pipeline": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"deal-pipeline": ["assets/css/deal-pipeline.css"]') >= 0,
  "build.py wires engines (RCB + NK + NSB + pipeline), UI, CSS");
ok(P.STORAGE_KEY === "cge.deal-pipeline.deals.v1", "localStorage key follows the cge.* tool convention");
var css = fs.readFileSync(path.join(ROOT, "assets", "css", "deal-pipeline.css"), "utf8");
ok(css.indexOf(".dp-board") >= 0 && css.indexOf(".dp-empty") >= 0, "CSS carries board and empty-state styles");
var banned = /(delve|tapestry|furthermore|moreover|in conclusion|game-changer|unlock|supercharge|skyrocket)/i;
ok(!banned.test(text) && !banned.test(page), "no AI-ism vocabulary in export or page copy");
console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
