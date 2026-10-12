/* Unit tests for the Deal Room math. Run: node tests/deal-room.test.js
 * Exit 0 = all pass. Sanity contract:
 *  1. scoreOffer vs the REAL rate-card ranges (data/calculators.json):
 *     below floor -> under, inside -> fair, above ceiling -> over,
 *     for every tier x platform.
 *  2. Usage-rights line items honor the wave-2 research band (+50/+75/+100%)
 *     and refuse to invent numbers for whitelisting/buyout.
 *  3. Red-flag scoring: any walk_away flag -> walk away; point math honest.
 *  4. Script rendering fills known vars, leaves unknown placeholders visible.
 *  5. The deal memo carries the disclaimer + the ~23% honesty note.
 */
"use strict";
var path = require("path");
var ROOT = path.join(__dirname, "..");
var DealRoom = require(path.join(ROOT, "assets", "js", "deal-room.js"));
var rc = require(path.join(ROOT, "data", "calculators.json")).sponsorship_rate_card_2026;
var templates = require(path.join(ROOT, "data", "deal-templates.json"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

/* ---------- 1. scoring math against the real rate card ---------- */
console.log("rate-card scoring");
var tiers = Object.keys(rc.per_video_or_post_by_tier);
var platforms = ["youtube", "tiktok", "instagram"];
var checked = 0;
tiers.forEach(function (t) {
  platforms.forEach(function (p) {
    var range = rc.per_video_or_post_by_tier[t][p];
    var lo = range[0], hi = range[1];
    ok(DealRoom.scoreOffer(lo - 1, lo, hi).verdict === "under",
      t + "/" + p + ": $" + (lo - 1) + " below floor $" + lo + " -> under");
    ok(DealRoom.scoreOffer(lo, lo, hi).verdict === "fair" &&
       DealRoom.scoreOffer(hi, lo, hi).verdict === "fair",
      t + "/" + p + ": floor and ceiling both -> fair");
    ok(DealRoom.scoreOffer(Math.floor((lo + hi) / 2), lo, hi).verdict === "fair",
      t + "/" + p + ": midpoint -> fair");
    ok(DealRoom.scoreOffer(hi + 1, lo, hi).verdict === "over",
      t + "/" + p + ": $" + (hi + 1) + " above ceiling $" + hi + " -> over");
    checked++;
  });
});
ok(checked === tiers.length * platforms.length, "scored " + checked + " tier x platform combos");

var spot = DealRoom.scoreOffer(5000,
  rc.per_video_or_post_by_tier.micro_10k_100k.youtube[0],
  rc.per_video_or_post_by_tier.micro_10k_100k.youtube[1]);
ok(spot.verdict === "fair" && spot.badge === "FAIR",
  "spot check: $5K micro/YouTube ($1,000–$10,000) -> FAIR");
ok(/23%/.test(spot.note), "verdict carries the ~23% listed-vs-accepted honesty note");
ok(DealRoom.LISTED_VS_ACCEPTED === 0.23, "LISTED_VS_ACCEPTED constant = 0.23");

/* ---------- 2. usage-rights line items ---------- */
console.log("usage-rights pricing");
var u = DealRoom.priceUsage(1000, "organic", templates.usage_rights_tiers);
ok(u.addonLo === 0 && u.totalLo === 1000, "organic: no add-on, total = base");

u = DealRoom.priceUsage(1000, "paid_30", templates.usage_rights_tiers);
ok(u.addonLo === 500 && u.addonHi === 500 && u.totalLo === 1500 && u.totalHi === 1500,
  "paid 30d on $1,000 base -> +$500 line item, $1,500 total (reported +50%)");

u = DealRoom.priceUsage(1000, "paid_180", templates.usage_rights_tiers);
ok(u.addonLo === 750 && u.totalLo === 1750,
  "paid 6mo on $1,000 base -> +$750 (reported +75%)");

u = DealRoom.priceUsage(1000, "paid_365", templates.usage_rights_tiers);
ok(u.addonLo === 1000 && u.totalLo === 2000,
  "paid 12mo on $1,000 base -> +$1,000 (reported +100%, top of research band)");

u = DealRoom.priceUsage(1000, "whitelisting", templates.usage_rights_tiers);
ok(u.addonLo === null && u.totalLo === null && /no research-backed multiplier/i.test(u.note),
  "whitelisting: no invented multiplier — returns guidance, not fake numbers");

u = DealRoom.priceUsage(1000, "buyout", templates.usage_rights_tiers);
ok(u.totalLo === 2000 && u.totalHi === null,
  "buyout: 2.0x floor ($2,000 on $1K base), no ceiling, never a point estimate");

u = DealRoom.priceUsage(1000, "bogus", templates.usage_rights_tiers);
ok(u === null, "unknown tier id -> null, not a guess");

/* ---------- 3. red-flag scoring ---------- */
console.log("red-flag scoring");
var r = DealRoom.redFlagScore([], templates.red_flags);
ok(r.verdict === "clean" && r.score === 0, "no flags -> clean, score 0");

templates.red_flags.forEach(function (f) {
  var single = DealRoom.redFlagScore([f.id], templates.red_flags);
  if (f.severity === "walk_away") {
    ok(single.verdict === "walk_away", "'" + f.title + "' alone -> walk away");
  } else {
    ok(single.verdict !== "walk_away", "'" + f.title + "' alone does not force walk-away");
  }
});
var combo = DealRoom.redFlagScore(["perpetual_whitelisting", "broad_exclusivity"], templates.red_flags);
ok(combo.score === 4 && combo.verdict === "walk_away",
  "two majors = 4 points -> walk_away (3+ rule)");
var one = DealRoom.redFlagScore(["perpetual_whitelisting"], templates.red_flags);
ok(one.score === 2 && one.verdict === "caution",
  "one major = 2 points -> caution");
var ignored = DealRoom.redFlagScore(["not_a_flag"], templates.red_flags);
ok(ignored.verdict === "clean", "unknown flag ids are ignored, not scored");

/* ---------- 4. script rendering ---------- */
console.log("script rendering");
var script = templates.negotiation_scripts.filter(function (s) { return s.id === "lowball_counter"; })[0];
var rendered = DealRoom.renderScript(script, { brand: "Acme", counter: "10,000" });
ok(rendered.indexOf("Acme") !== -1 && rendered.indexOf("10,000") !== -1 &&
   rendered.indexOf("{{views_avg}}") !== -1,
  "known vars filled; unknown placeholders stay visible (never silently lies)");
ok(rendered.indexOf("{{brand}}") === -1, "no raw {{brand}} survives a filled render");
var rush = templates.negotiation_scripts.filter(function (s) { return s.id === "rush_fee_ask"; })[0];
ok(/no research benchmark/i.test(rush.grounded_in),
  "rush-fee script is flagged as having no research benchmark");

/* ---------- 5. deal memo ---------- */
console.log("deal memo");
var memo = DealRoom.dealMemo(
  { brand: "Acme", status: "offer", deliverable: "Integrated slot", platform: "YouTube",
    offer: 1200, usage: "Paid ads, 30 days", exclusivity: "None",
    payTerms: "Net 30", timeline: "Draft by Nov 1", createdAt: "2026-10-11" },
  spot,
  { verdictText: "Clean", checkedTitles: [] });
ok(memo.indexOf("DEAL MEMO — Acme") === 0, "memo opens with the brand header");
ok(memo.indexOf("FAIR") !== -1 && /23%/.test(memo),
  "memo carries the FAIR verdict and the ~23% honesty note");
ok(/not financial, legal, or tax advice/i.test(memo),
  "memo carries the not-financial/legal/tax-advice disclaimer");
ok(memo.indexOf("$1,200") !== -1 && memo.indexOf("Paid ads, 30 days") !== -1,
  "memo records the offer pay and usage terms");

console.log("tiers: " + DealRoom.tierOf(50000) + " / " + DealRoom.tierLabel(DealRoom.tierOf(50000)));
ok(DealRoom.tierOf(50000) === "micro_10k_100k" && DealRoom.nice(9876) === 9900,
  "tierOf + nice helpers behave");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
