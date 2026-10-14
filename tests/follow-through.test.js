/* Follow-Through Queue tests. Run: node tests/follow-through.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var FT = require(path.join(ROOT, "assets", "js", "follow-through.js"));
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

console.log("follow-through — the Workflow 18 board, queued");
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
var q = FT.buildQueue(deals, OPTS);
ok(q.ok && q.due === 3 && q.urgentCount === 0, "the board's 3 nudges become a queue of 3");
ok(q.items.map(function (i) { return i.brand; }).join("|") === "Northwind VPN|Trail Snacks Co|Ridge Wallet",
  "send order is most-overdue first (invoiced 9d over, lead 2d over, negotiating 1d over)");
ok(q.items[0].stage === "invoiced" && q.items[0].ageDays === 23 && q.items[0].thresholdDays === 14 && q.items[0].overdueBy === 9,
  "queue items carry Tool 25's own threshold math (invoiced: 23d in stage, 14d mark, 9d over)");
ok(q.items[2].script.ok && q.items[2].script.scenario === "lowball" &&
   q.items[2].script.exportText.indexOf("$38,000") >= 0,
  "each item carries its Tool 24 script (Ridge Wallet's lowball export carries the $38,000–$44,000 counter)");
ok(q.items[0].script.ok && q.items[0].script.scenario === "late_payment",
  "the invoiced item's script is the stage-default late-payment script");
ok(q.items.every(function (i) { return typeof i.amount === "number" && !("rateCard" in i) && !("price" in i); }),
  "queue items carry only the entered amount — no pricing of their own");
ok(q.emptyBoard === false && q.nothingDue === false && q.totals.pipelineValue === 25300,
  "board state passes through honestly (totals stay Tool 25's: $25,300)");

console.log("follow-through — urgency outranks overdue count");
var withUrgent = deals.concat([
  { id: "e", brand: "Slow Payer LLC", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 3000, stage: "invoiced", stageEnteredAt: "2026-08-30" }
]);
var q2 = FT.buildQueue(withUrgent, OPTS);
ok(q2.due === 4 && q2.urgentCount === 1 && q2.items[0].brand === "Slow Payer LLC" && q2.items[0].urgent === true,
  "an invoiced deal at 30+ days (44d here) is urgent and sorts first");

console.log("follow-through — honesty: empty, nothing due, demo");
var empty = FT.buildQueue([], OPTS);
ok(empty.ok && empty.due === 0 && empty.emptyBoard === true && empty.nothingDue === false,
  "an empty board reports emptyBoard, not nothing-due");
ok(/empty because the Deal Pipeline is empty/.test(FT.exportBrief(empty)),
  "the empty brief says the queue is empty because the board is");
var fresh = FT.buildQueue([
  { id: "f", brand: "Fresh Lead", platform: "youtube", format: "dedicated", followers: 50000,
    expectedViews: 60000, amount: 900, stage: "lead", stageEnteredAt: "2026-10-12" }
], OPTS);
ok(fresh.due === 0 && fresh.emptyBoard === false && fresh.nothingDue === true,
  "a board inside its follow-up windows reports nothingDue");
ok(/Nothing is due/.test(FT.exportBrief(fresh)), "the nothing-due brief says so");
var demoQ = FT.buildQueue(P.DEMO_DEALS, OPTS);
ok(demoQ.due === 0 && demoQ.demoDue === 3 && demoQ.emptyBoard === false && demoQ.nothingDue === false && demoQ.demoOnly === true,
  "demo follow-ups are counted apart (3), never queued, and the state is named demoOnly — not nothing-due");
ok(/DEMO follow-up/.test(FT.exportBrief(demoQ)) && /Only demo deals are on the board/.test(FT.exportBrief(demoQ)),
  "the brief names the excluded demo follow-ups and the demo-only state");

console.log("follow-through — the brief");
var brief = FT.exportBrief(q);
ok(/FOLLOW-THROUGH QUEUE · 3 due/.test(brief) && /Northwind VPN/.test(brief) &&
   /Do: Chase payment/.test(brief) && /Tool 25/.test(brief) && /Tool 24/.test(brief),
  "brief carries the queue, the actions, and the composition provenance");
ok(brief.indexOf("Northwind VPN") < brief.indexOf("Ridge Wallet"), "brief order matches queue order");

console.log("follow-through — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "follow-through.html"), "utf8");
ok(page.indexOf('id="ft-queue"') >= 0 && page.indexOf('id="ft-export"') >= 0 && page.indexOf('id="ft-demo"') >= 0,
  "page carries queue, brief export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "follow-through.js"), "utf8");
ok(!/NUDGE_DAYS|STAGE_SCENARIO/.test(src),
  "engine defines no thresholds or scenarios of its own (they are Tool 25's)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"follow-through": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"follow-through": ["assets/css/follow-through.css"]') >= 0,
  "build.py loads the composed engines before the queue and registers its CSS");

console.log("\nfollow-through: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
