/* Receivables Register tests. Run: node tests/receivables-register.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var RR = require(path.join(ROOT, "assets", "js", "receivables-register.js"));
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

console.log("receivables-register — the Workflow 21 board plus two more invoiced deals");
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
var r = RR.buildRegister(deals, OPTS);
ok(r.ok && r.invoicedCount === 3, "only the board's invoiced deals are registered (3 of 9)");
ok(r.owed === 13000 && r.totals.invoicedOutstanding === 13000,
  "the total owed stays Tool 25's invoiced outstanding figure ($13,000) — listed, never re-derived");
ok(r.items.map(function (it) { return it.brand; }).join("|") === "Slow Payer LLC|Northwind VPN|Fresh Invoice Co",
  "register order is longest outstanding first (44d, 23d, 1d)");
ok(r.items[0].daysOutstanding === 44 && r.items[1].daysOutstanding === 23 && r.items[2].daysOutstanding === 1 &&
   r.oldest.brand === "Slow Payer LLC",
  "days outstanding are the board's stage ages; the oldest entry leads");
ok(r.items[1].invoicedAt === "2026-09-20" && r.items[1].amount === 4500 && r.items[1].platform === "youtube",
  "entries carry the entered amount, platform, and invoiced-stage entry date");
var board = P.buildBoard(deals, OPTS);
var invoicedNudges = board.nudges.filter(function (n) { return n.stage === "invoiced"; })
  .map(function (n) { return n.brand; });
ok(invoicedNudges.join("|") === "Northwind VPN|Slow Payer LLC" &&
   r.items.some(function (it) { return it.brand === "Fresh Invoice Co"; }),
  "a 1-day-old invoice is registered even though the board raises no follow-up nudge for it — the register is not the queue");
ok(r.items.every(function (it) { return it.script.ok; }) &&
   r.items[1].script.label === "Late payment, agreed invoice past its terms" &&
   r.items[1].script.exportText.indexOf("$4,500") >= 0,
  "each entry carries the board's Tool 24 late-payment script for that deal (label + full text)");
ok(r.emptyBoard === false && r.nothingOwed === false && r.demoOnly === false,
  "a board with invoiced deals reports none of the empty states");

console.log("receivables-register — honesty: empty, nothing owed, demo");
var empty = RR.buildRegister([], OPTS);
ok(empty.ok && empty.invoicedCount === 0 && empty.emptyBoard === true && empty.nothingOwed === false,
  "an empty board reports emptyBoard, not nothing-owed");
ok(/empty because the Deal Pipeline is empty/.test(RR.exportRegister(empty)),
  "the empty export says the register is empty because the board is");
var fresh = RR.buildRegister([deals[1], deals[3]], OPTS);
ok(fresh.invoicedCount === 0 && fresh.emptyBoard === false && fresh.nothingOwed === true && fresh.owed === 0,
  "a real board with nothing invoiced reports nothingOwed ($0 owed)");
ok(/Nothing is owed/.test(RR.exportRegister(fresh)), "the nothing-owed export says so");
var demoR = RR.buildRegister(P.DEMO_DEALS, OPTS);
ok(demoR.invoicedCount === 0 && demoR.demoOnly === true && demoR.emptyBoard === false && demoR.nothingOwed === false &&
   demoR.demoInvoiced === 1 && demoR.demoInvoicedValue === 4500,
  "the demo board is named demoOnly and its invoiced deal is counted apart ($4,500), never registered");
var mixed = RR.buildRegister(deals.concat(P.DEMO_DEALS), OPTS);
ok(mixed.invoicedCount === 3 && mixed.owed === 13000 && mixed.demoInvoiced === 1 && mixed.demoOnly === false,
  "on a mixed board the demo invoice stays out of the register and the total ($13,000)");
ok(/DEMO invoiced deal/.test(RR.exportRegister(mixed)), "the export names the excluded demo invoiced deal");

console.log("receivables-register — the export");
var exp = RR.exportRegister(r);
ok(/RECEIVABLES REGISTER · 3 invoiced deal\(s\), \$13,000 owed/.test(exp) &&
   /Slow Payer LLC · \$6,000 owed/.test(exp) && /Late-payment script \(Tool 24, via the board\)/.test(exp) &&
   /not a follow-up queue/.test(exp) && /entered the invoiced stage/.test(exp),
  "export carries the entries, the scripts, and the register-not-queue honesty note");
ok(exp.indexOf("Slow Payer LLC") < exp.indexOf("Fresh Invoice Co"), "export order matches register order");

console.log("receivables-register — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "receivables-register.html"), "utf8");
ok(page.indexOf('id="rr-register"') >= 0 && page.indexOf('id="rr-export"') >= 0 && page.indexOf('id="rr-demo"') >= 0,
  "page carries register, export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "receivables-register.js"), "utf8");
ok(!/NUDGE_DAYS|STAGE_SCENARIO|buildCard\(|priceDeal\(/.test(src),
  "engine defines no thresholds or scenarios of its own and never prices a deal (it registers Tool 25's board)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"receivables-register": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"receivables-register": ["assets/css/receivables-register.css"]') >= 0,
  "build.py loads the composed engines before the register and registers its CSS");

console.log("\nreceivables-register: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
