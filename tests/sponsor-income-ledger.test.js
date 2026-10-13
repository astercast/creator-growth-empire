/* Sponsor Income Ledger tests. Run: node tests/sponsor-income-ledger.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var SIL = require(path.join(ROOT, "assets", "js", "sponsor-income-ledger.js"));
var P = require(path.join(ROOT, "assets", "js", "deal-pipeline.js"));
var failures = 0, passes = 0;
function ok(c, n) { if (c) { passes++; console.log("  PASS " + n); } else { failures++; console.log("  FAIL " + n); } }
var NOW = new Date("2026-10-13T00:00:00Z");
var OPTS = { now: NOW, dp: P };

console.log("sponsor-income-ledger — the Workflow 20 board plus two more paid deals");
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
    amount: 2000, stage: "paid", stageEnteredAt: "2026-09-15" }
];
var l = SIL.buildLedger(deals, OPTS);
ok(l.ok && l.paidCount === 4, "only the board's paid deals are ledgered (4 of 7)");
ok(l.collected === 13500 && l.totals.paidTotal === 13500,
  "collected stays Tool 25's paid total ($13,500) — grouped, never re-derived");
ok(l.months.map(function (m) { return m.month; }).join("|") === "2026-08|2026-09|2026-10",
  "months run chronological (Aug, Sep, Oct 2026)");
ok(l.months[0].total === 4500 && l.months[0].count === 2 && l.months[1].total === 2000 && l.months[2].total === 7000,
  "month totals are sums of the entered amounts ($4,500 / $2,000 / $7,000)");
ok(l.months[0].cumulative === 4500 && l.months[1].cumulative === 6500 && l.months[2].cumulative === 13500,
  "the cumulative runs to the collected total ($4,500 → $6,500 → $13,500)");
ok(l.months[0].label === "August 2026" && l.months[0].deals[0].brand === "Early Bird Media",
  "month labels name the stage-entry month; within a month, largest amount first");
ok(l.byBrand[0].key === "Paid Brand" && l.byBrand[0].total === 7000 && l.byBrand[0].share === 51.9 &&
   l.topBrand.key === "Paid Brand",
  "brand grouping ranks Paid Brand first ($7,000 = 51.9% of collected)");
ok(l.byBrand.map(function (b) { return b.key; }).join("|") === "Paid Brand|Early Bird Media|Northwind VPN|Trail Snacks Co" &&
   l.byBrand[3].total === 1500 && l.byBrand[3].count === 1,
  "a brand paid in two stages of the chain appears once per payment (Trail Snacks Co's lead is not income; its paid deal is)");
ok(l.byPlatform[0].key === "youtube" && l.byPlatform[0].total === 12000 && l.byPlatform[0].share === 88.9 &&
   l.byPlatform[1].key === "tiktok" && l.byPlatform[1].total === 1500,
  "platform grouping sums entered amounts (YouTube $12,000 = 88.9%, TikTok $1,500)");
ok(SIL.share(1, 0) === 0 && SIL.monthKey({ stageEnteredAt: "2026-10-01" }) === "2026-10" &&
   SIL.monthKey({ stageEnteredAt: "" }) === "undated" && SIL.monthLabel("2026-08") === "August 2026",
  "share/month helpers are plain arithmetic on entered figures (no rate, no threshold)");
ok(l.emptyBoard === false && l.noPaidYet === false && l.demoOnly === false,
  "a board with paid deals reports none of the empty states");

console.log("sponsor-income-ledger — undated paid deals are flagged, never dropped or guessed");
var undated = SIL.buildLedger(deals.concat([
  { id: "h", brand: "Dateless Sponsor", platform: "youtube", format: "integrated", followers: 50000,
    expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 500, stage: "paid", stageEnteredAt: "" }
]), OPTS);
ok(undated.months[undated.months.length - 1].month === "undated" && undated.collected === 14000 &&
   /Undated/.test(undated.months[undated.months.length - 1].label),
  "an unreadable stage entry date ledgers under Undated, last, and still counts toward collected ($14,000)");

console.log("sponsor-income-ledger — honesty: empty, no paid yet, demo");
var empty = SIL.buildLedger([], OPTS);
ok(empty.ok && empty.paidCount === 0 && empty.emptyBoard === true && empty.noPaidYet === false,
  "an empty board reports emptyBoard, not no-paid-yet");
ok(/empty because the Deal Pipeline is empty/.test(SIL.exportLedger(empty)),
  "the empty export says the ledger is empty because the board is");
var fresh = SIL.buildLedger([deals[1]], OPTS);
ok(fresh.paidCount === 0 && fresh.emptyBoard === false && fresh.noPaidYet === true,
  "a real board with nothing paid reports noPaidYet");
ok(/No brand has paid yet/.test(SIL.exportLedger(fresh)), "the no-paid-yet export says so");
var demoL = SIL.buildLedger(P.DEMO_DEALS, OPTS);
ok(demoL.paidCount === 0 && demoL.demoOnly === true && demoL.emptyBoard === false && demoL.noPaidYet === false,
  "the demo board (no paid deals) is named demoOnly — not no-paid-yet");
var demoPaid = SIL.buildLedger(P.DEMO_DEALS.concat([
  { id: "demo-9", demo: true, brand: "DEMO — Paid Demo", platform: "youtube", format: "dedicated",
    followers: 50000, expectedViews: 60000, niche: "tech_software", usage: "organic_only", whitelistingMonths: 0,
    amount: 9999, stage: "paid", stageEnteredAt: "2026-09-01" }
]), OPTS);
ok(demoPaid.paidCount === 0 && demoPaid.demoPaid === 1 && demoPaid.demoPaidValue === 9999 && demoPaid.demoOnly === true,
  "a demo paid deal is counted apart ($9,999), never ledgered");
ok(/DEMO paid deal/.test(SIL.exportLedger(demoPaid)), "the export names the excluded demo paid deal");

console.log("sponsor-income-ledger — the export");
var exp = SIL.exportLedger(l);
ok(/SPONSOR INCOME LEDGER — 4 paid deal\(s\), \$13,500 collected/.test(exp) &&
   /AUGUST 2026 — \$4,500/.test(exp) && /BY BRAND/.test(exp) && /BY PLATFORM/.test(exp) &&
   /entered the paid stage/.test(exp) && /no clearing or payout date/.test(exp),
  "export carries the months, the groupings, and the stage-entry-month honesty note");
ok(exp.indexOf("AUGUST 2026") < exp.indexOf("OCTOBER 2026"), "export months match ledger order");

console.log("sponsor-income-ledger — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "sponsor-income-ledger.html"), "utf8");
ok(page.indexOf('id="sil-ledger"') >= 0 && page.indexOf('id="sil-export"') >= 0 && page.indexOf('id="sil-demo"') >= 0,
  "page carries ledger, export, labeled demo control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "sponsor-income-ledger.js"), "utf8");
ok(!/NUDGE_DAYS|STAGE_SCENARIO|buildCard\(|priceDeal\(/.test(src),
  "engine defines no thresholds or scenarios of its own and never prices a deal (it groups Tool 25's board)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"sponsor-income-ledger": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"sponsor-income-ledger": ["assets/css/sponsor-income-ledger.css"]') >= 0,
  "build.py loads the composed engines before the ledger and registers its CSS");

console.log("\nsponsor-income-ledger: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
