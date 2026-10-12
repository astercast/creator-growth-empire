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

/* ---------- 6. Deal Room 2.0: niche parity + scoreDeal ---------- */
console.log("2.0 niche parity + scoreDeal");
var DealAnalyzer = require(path.join(ROOT, "assets", "js", "deal-analyzer.js"));
var full = require(path.join(ROOT, "data", "calculators.json"));
var rateCard = full.sponsorship_rate_card_2026;
DealRoom.NICHES.forEach(function (n) {
  ok(DealRoom.nicheMult(n).mult === DealAnalyzer.nicheMult(n).mult,
    "niche parity: " + n + " x" + DealRoom.nicheMult(n).mult + " matches DealAnalyzer");
});
var sd = DealRoom.scoreDeal({ platform: "youtube", followers: 50000, offer: 5000, views: 60000, niche: "tech_software" }, rateCard);
ok(sd.tier === "micro_10k_100k" && sd.range[0] === 2500 && sd.range[1] === 25000 && sd.verdict === "fair",
  "scoreDeal: 50K tech YouTube $5K vs niche-adjusted $2,500-$25,000 -> FAIR");
ok(sd.impliedCpm === 83.33, "scoreDeal: implied CPM $83.33 at 60K views");
var sdNoNiche = DealRoom.scoreDeal({ platform: "youtube", followers: 50000, offer: 5000, views: 0 }, rateCard);
ok(sdNoNiche.range[0] === 1000 && sdNoNiche.range[1] === 10000 && sdNoNiche.impliedCpm === null,
  "scoreDeal: no niche -> base range, no implied CPM without views");

/* ---------- 7. Deal Room 2.0: rate-card table + quoted prices ---------- */
console.log("2.0 rate-card table + quoted-price check");
var quoted = full.sponsorship_quoted_prices_2026;
ok(!!quoted, "calculators.json carries sponsorship_quoted_prices_2026 (v1.5.0 block)");
ok(full.version === "1.5.0", "calculators.json version bumped to 1.5.0");
var table = DealRoom.rateCardTable(rateCard, quoted);
ok(table.tiers.length === 4 && table.tiers[1].youtube[0] === 1000 && table.tiers[1].youtube[1] === 10000,
  "rateCardTable: 4 tiers, micro YouTube $1,000-$10,000");
ok(table.multipliers.youtube === 1.7 && table.multipliers.tiktok === 0.85,
  "rateCardTable: platform multipliers 1.7x / 0.85x carried");
ok(table.cpms.dedicated.range[0] === 50 && table.cpms.dedicated.range[1] === 90 &&
   /AIR/.test(table.cpms.dedicated.source),
  "rateCardTable: dedicated CPM $50-$90 with its AIR source named");
ok(table.quoted.typical_quoted_by_format.length === 4 &&
   table.quoted.instagram_feed_post_modeled.every(function (r) { return true; }) &&
   table.quoted.instagram_modeled_basis === "modeled",
  "quoted block: 4 format quotes (reported) + IG feed-post model labeled modeled");

var qc = DealRoom.quotedPriceCheck({ platform: "tiktok", deliverable: "short", followers: 5000, offer: 1000 }, quoted);
ok(qc.formatQuote && qc.formatQuote.quoted === 2000 && qc.formatQuote.basis === "reported" &&
   qc.formatQuote.position === "below",
  "quotedPriceCheck: TikTok short $1,000 offer vs $2,000 typical quote -> below (reported)");
ok(qc.ask && qc.ask.ask === 450 && qc.ask.band.indexOf("1K") === 0,
  "quotedPriceCheck: 5K followers -> typical ask $450 (Cheerful 1K-10K band)");
var qcNull = DealRoom.quotedPriceCheck({ platform: "youtube", deliverable: "dedicated", followers: 50000, offer: 9000 }, quoted);
ok(qcNull.formatQuote === null && qcNull.ask === null,
  "quotedPriceCheck: YouTube dedicated + 50K followers -> no mapped benchmark, nulls not guesses");
var qcBig = DealRoom.quotedPriceCheck({ platform: "youtube", deliverable: "integrated", followers: 300000, offer: 3000 }, quoted);
ok(qcBig.formatQuote.quoted === 3000 && qcBig.formatQuote.position === "near" && qcBig.ask.ask === 4250,
  "quotedPriceCheck: integration at the $3,000 typical quote -> near; 300K followers -> $4,250 typical ask");

/* ---------- 8. Deal Room 2.0: pipeline summary ---------- */
console.log("2.0 pipeline summary");
var pipe = DealRoom.pipelineSummary([
  { brand: "A", platform: "youtube", followers: 50000, offer: 500, status: "offer" },
  { brand: "B", platform: "youtube", followers: 50000, offer: 5000, status: "signed" },
  { brand: "C", platform: "tiktok", followers: 5000, offer: 200, status: "paid" }
], rateCard);
ok(pipe.totalDeals === 3 && pipe.totalOffered === 5700 && pipe.committed === 5200 && pipe.paidTotal === 200,
  "pipeline: totals offered $5,700 / committed $5,200 / paid $200");
ok(pipe.verdicts.under === 1 && pipe.verdicts.fair === 2,
  "pipeline: verdict counts under=1 fair=2 against the real rate card");
ok(pipe.openUnderpaid.length === 1 && pipe.openUnderpaid[0].brand === "A",
  "pipeline: the underpaid open deal is named for the counter list");

/* ---------- 9. Deal Room 2.0: Algorithm Watch digest ---------- */
console.log("2.0 algorithm watch digest");
var feed = require(path.join(ROOT, "data", "changes.json"));
var digest = DealRoom.watchDigest(feed, { now: "2026-10-12T12:00:00Z", days: 90, limit: 50 });
ok(digest.total === 15 && digest.shown === 15,
  "digest: all 15 feed entries land inside the 90-day window at 2026-10-12");
ok(DealRoom.watchDigest(feed, { now: "2026-10-12T12:00:00Z", days: 90 }).shown === 12,
  "digest: the default limit still caps at 12 (the page asks for 50 explicitly)");
ok(digest.entries[0].date === "2026-10-12" &&
   digest.entries.every(function (e, i, a) { return i === 0 || a[i - 1].date >= e.date; }),
  "digest: newest first, dated from detected_at");
ok(digest.entries.every(function (e) { return e.dealNote && e.dealNote.length > 40; }),
  "digest: every entry carries a substantive deal note");
ok(digest.entries.every(function (e) { return e.sources.length >= 1 && /^https:\/\//.test(e.sources[0].url); }),
  "digest: every entry carries at least one https source");
ok(digest.byCategory.monetization === 9 && digest.byCategory.policy === 3 &&
   digest.byCategory.algorithm === 3 && digest.byConfidence.verified === 7,
  "digest: category/confidence counts match the feed (9 monetization, 3 policy, 3 algorithm, 7 verified)");
var ypp = digest.entries.filter(function (e) { return e.id === "yt-ypp-overhaul-2026"; })[0];
ok(/Feb 2027/.test(ypp.dealNote), "digest: YPP entry's deal note names the Feb 2027 changeover");
var spot = digest.entries.filter(function (e) { return e.id === "spotify-partner-program-expansion-2026"; })[0];
ok(spot && spot.announced === "2026-09-17" && spot.effective === "2026-10-20" &&
   spot.platform === "other" && spot.sources.length === 2,
  "digest: Spotify expansion carries announced/effective dates and two sources");
ok(["facebook", "x"].every(function (p) {
  return digest.entries.some(function (e) { return e.platform === p; });
}), "digest: Facebook and X have entries of their own (Algorithm Watch 2.0 coverage)");
var narrow = DealRoom.watchDigest(feed, { now: "2026-10-12T12:00:00Z", days: 7, limit: 12 });
ok(narrow.total === 9 && narrow.entries.every(function (e) { return e.date >= "2026-10-05"; }),
  "digest: 7-day window narrows to the 9 freshest entries");
var dtxt = DealRoom.digestText(digest);
ok(dtxt.indexOf("ALGORITHM WATCH") === 0 && dtxt.indexOf("For your next deal:") !== -1 &&
   /not financial, legal, or tax advice/i.test(dtxt) && dtxt.indexOf("https://") !== -1,
  "digestText: header, deal lines, sources, and the advice disclaimer all present");
ok(dtxt.indexOf("announced 2026-09-17") !== -1 && dtxt.indexOf("takes effect 2026-10-20") !== -1 &&
   dtxt.indexOf("logged 2026-10-12") !== -1,
  "digestText: announced/effective/logged dates print for entries that carry them");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
