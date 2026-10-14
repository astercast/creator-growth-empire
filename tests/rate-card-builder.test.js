/* Unit tests for the Rate Card Builder. Run: node tests/rate-card-builder.test.js
 * Exit 0 = all pass. Sanity contract:
 *  1. Row math against the REAL calculators.json v1.5.0 blocks: tier
 *     table × niche for dedicated, reported CPM bands × views for
 *     integrated/short, the Storika band for UGC (never scaled).
 *  2. Honesty contract: rows with no benchmark return null with the
 *     reason stated; platforms with no tier table get the labeled
 *     proxy, never a borrowed rate dressed as their own.
 *  3. Add-ons ride on the primary row only, as separate lines; the
 *     total and the ×0.77 expected landing zone follow.
 *  4. Evidence: reported typical quotes/asks map only where the map
 *     says they map; no follower band is ever interpolated.
 *  5. The watch panel carries the platform's real feed entries.
 *  6. Niche parity with DealRoom + DealAnalyzer + NegotiationKit.
 *  7. Page / CSS / build wiring contracts.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");
var R = require(path.join(ROOT, "assets", "js", "rate-card-builder.js"));
var DealRoom = require(path.join(ROOT, "assets", "js", "deal-room.js"));
var DealAnalyzer = require(path.join(ROOT, "assets", "js", "deal-analyzer.js"));
var NK = require(path.join(ROOT, "assets", "js", "negotiation-kit.js"));
var cfg = require(path.join(ROOT, "data", "calculators.json"));
var feed = require(path.join(ROOT, "data", "changes.json"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function row(card, id) { return card.rows.filter(function (r) { return r.id === id; })[0]; }

/* ---------- 1. row math: the AGENT.md Workflow 16 fixture ---------- */
console.log("rate card — workflow fixture");
var fixture = { platform: "youtube", format: "dedicated", followers: 50000,
  expectedViews: 60000, niche: "tech_software", usage: "paid_6mo", whitelistingMonths: 1 };
var c = R.buildCard(fixture, cfg, feed);
ok(c.ok && c.tier === "micro_10k_100k", "fixture builds, micro tier");
ok(row(c, "dedicated").range[0] === 2500 && row(c, "dedicated").range[1] === 25000,
  "dedicated = tier band $1,000–$10,000 × niche 2.5 -> $2,500–$25,000");
ok(row(c, "integrated").range[0] === 3000 && row(c, "integrated").range[1] === 5300,
  "integrated = CPM $20–$35 × 60K views × 2.5 -> $3,000–$5,300 (2 sig figs)");
ok(row(c, "short").range[0] === 1500 && row(c, "short").range[1] === 4500,
  "short = general CPM $10–$30 × 60K views × 2.5 -> $1,500–$4,500");
ok(row(c, "ugc").range[0] === 150 && row(c, "ugc").range[1] === 1000 &&
   row(c, "ugc").basis === "single-source",
  "UGC = Storika $150–$1,000, single-source, never niche-scaled");
var usage = c.addons.filter(function (a) { return a.id === "usage"; })[0];
ok(usage && usage.range[0] === 1300 && usage.range[1] === 19000,
  "usage line = +50–75% of the primary (dedicated) row -> $1,300–$19,000");
var wl = c.addons.filter(function (a) { return a.id === "whitelisting"; })[0];
ok(wl && wl.range[0] === 750 && wl.range[1] === 25000,
  "whitelisting line = 30–100% of primary × 1 month -> $750–$25,000");
ok(c.total && c.total.range[0] === 4550 && c.total.range[1] === 69000,
  "card total = primary + add-ons -> $4,550–$69,000");
ok(c.total.expectedClose[0] === 3500 && c.total.expectedClose[1] === 53000,
  "expected landing zone ×0.77 -> $3,500–$53,000");
ok(R.LISTED_VS_ACCEPTED === 0.23 && DealRoom.LISTED_VS_ACCEPTED === 0.23,
  "LISTED_VS_ACCEPTED = 0.23, shared with the Deal Room");

/* ---------- 2. honesty: blanks and the labeled proxy ---------- */
console.log("rate card — honesty contract");
var tw = R.buildCard({ platform: "twitch", format: "dedicated", followers: 50000, expectedViews: 0 }, cfg, feed);
ok(row(tw, "dedicated").basis === "proxy" && row(tw, "dedicated").range[0] === 1000 &&
   row(tw, "dedicated").range[1] === 10000,
  "twitch dedicated = YouTube band shown unadjusted, basis proxy");
ok(/no sponsorship tier band/.test(row(tw, "dedicated").reasoning),
  "proxy reasoning says the platform has no benchmark of its own");
ok(row(tw, "integrated").range === null && row(tw, "integrated").basis === "none",
  "twitch integrated = null — no cross-platform stretch");
var noViews = R.buildCard({ platform: "youtube", format: "integrated", followers: 50000, expectedViews: 0 }, cfg, feed);
ok(row(noViews, "integrated").range === null && /prices itself/.test(row(noViews, "integrated").reasoning),
  "integrated without views = null, reasoning names the missing input");
var ttShort = R.buildCard({ platform: "tiktok", format: "short", followers: 50000, expectedViews: 0 }, cfg, feed);
ok(row(ttShort, "short").basis === "reported" && row(ttShort, "short").range[0] === 2000,
  "tiktok short without views = reported typical quote $2,000, labeled cross-tier");
var ytShort = R.buildCard({ platform: "youtube", format: "short", followers: 50000, expectedViews: 0 }, cfg, feed);
ok(row(ytShort, "short").range === null,
  "youtube short without views = null (no YouTube typical quote is carried)");
var bad = R.buildCard({ platform: "myspace", format: "dedicated", followers: 50000 }, cfg, feed);
ok(!bad.ok && bad.errors.length > 0, "unknown platform rejected");
ok(!R.buildCard({ platform: "youtube", format: "dedicated", followers: 500 }, cfg, feed).ok,
  "followers under the 1,000 nano floor rejected");

/* ---------- 3. add-ons on a blank primary stay blank ---------- */
console.log("rate card — add-ons never invent");
var blankPrimary = R.buildCard({ platform: "twitch", format: "integrated", followers: 50000,
  expectedViews: 0, usage: "paid_3mo", whitelistingMonths: 2 }, cfg, feed);
ok(blankPrimary.addons.length === 2 &&
   blankPrimary.addons.every(function (a) { return a.range === null && a.basis === "none"; }),
  "usage + whitelisting on a benchmark-less primary = null lines, reasons stated");
ok(blankPrimary.total === null, "no total is fabricated from a blank primary");

/* ---------- 4. evidence mapping ---------- */
console.log("rate card — evidence");
var ev = R.buildCard({ platform: "tiktok", format: "short", followers: 5000, expectedViews: 0 }, cfg, feed);
var quote = ev.evidence.filter(function (e) { return e.kind === "reported-quote"; })[0];
ok(quote && quote.value === 2000 && quote.basis === "reported",
  "tiktok short evidence = Cheerful typical quote $2,000 (reported)");
var ask = ev.evidence.filter(function (e) { return e.kind === "reported-ask"; })[0];
ok(ask && ask.value === 450, "5,000 followers evidence = the published 1K–10K ask band, $450");
var mid = R.buildCard({ platform: "tiktok", format: "short", followers: 50000, expectedViews: 0 }, cfg, feed);
ok(!mid.evidence.some(function (e) { return e.kind === "reported-ask"; }),
  "50K followers = no ask evidence (no published band — never interpolated)");
var ig = R.buildCard({ platform: "instagram", format: "dedicated", followers: 50000, expectedViews: 0 }, cfg, feed);
var mc = ig.evidence.filter(function (e) { return e.kind === "modeled-crosscheck"; })[0];
ok(mc && mc.basis === "modeled" && mc.value === null,
  "instagram modeled cross-check is named and kept out of the math");

/* ---------- 5. the watch panel ---------- */
console.log("rate card — watch panel");
ok(c.watch.length === 3 && c.watch[0].id === "yt-watch-with-expansion-2026",
  "youtube card carries the feed's 3 newest YouTube entries, Watch With first");
ok(tw.watch.length >= 1 && tw.watch[0].id === "twitch-sponsorships-affiliates-2026",
  "twitch card carries the Twitch sponsorships entry");
var ki = R.buildCard({ platform: "kick", format: "dedicated", followers: 50000, expectedViews: 0 }, cfg, feed);
ok(ki.watch.length === 1 && ki.watch[0].id === "kick-kpp-rolling-rate-2026",
  "kick card carries the KPP rolling-rate entry");

/* ---------- 6. niche parity ---------- */
console.log("rate card — niche parity");
Object.keys(R.NICHE_MULT).forEach(function (k) {
  ok(R.NICHE_MULT[k] === DealRoom.nicheMult(k).mult &&
     R.NICHE_MULT[k] === DealAnalyzer.nicheMult(k).mult &&
     R.NICHE_MULT[k] === NK.nicheMult(k).mult, "niche parity: " + k);
});

/* ---------- 7. export + wiring ---------- */
console.log("rate card — export and wiring");
var text = R.exportCard(c);
ok(/RATE CARD · YouTube/.test(text) && /CARD TOTAL/.test(text) &&
   /ON THE WATCH/.test(text), "export carries the card, the total, and the watch");
ok(text.indexOf(R.HONESTY) >= 0 && text.indexOf(R.ADVICE) >= 0,
  "export carries the honesty line and the not-advice line");
var page = fs.readFileSync(path.join(ROOT, "pages", "rate-card-builder.html"), "utf8");
ok(page.indexOf('id="rcb-form"') >= 0 && page.indexOf('id="rcb-out"') >= 0 &&
   page.indexOf('id="rcb-export"') >= 0, "page carries the form, output, and export blocks");
ok(page.indexOf("btn btn-primary") >= 0 &&
   (page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"rate-card-builder": ["assets/js/rate-card-builder.js"') >= 0 &&
   build.indexOf('"rate-card-builder": ["assets/css/rate-card-builder.css"]') >= 0,
  "build.py wires the engine, UI, and CSS");
var css = fs.readFileSync(path.join(ROOT, "assets", "css", "rate-card-builder.css"), "utf8");
ok(css.indexOf(".rcb-table") >= 0 && css.indexOf(".rcb-ev-card") >= 0, "CSS carries the table and evidence styles");
var banned = /(delve|tapestry|furthermore|moreover|in conclusion|game-changer|unlock|supercharge|skyrocket)/i;
ok(!banned.test(text) && !banned.test(page), "no AI-ism vocabulary in export or page copy");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
