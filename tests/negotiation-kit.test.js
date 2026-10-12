/* Unit tests for the Negotiation Kit. Run: node tests/negotiation-kit.test.js
 * Exit 0 = all pass. Sanity contract:
 *  1. Counter math against the REAL calculators.json v1.5.0 blocks:
 *     niche-adjusted tier range, top-of-range counter base, usage /
 *     whitelisting / exclusivity line items with their benchmarks,
 *     counter total + the ~23% expected landing zone.
 *  2. Evidence honesty: reported vs modeled bases never blur; unmapped
 *     formats return null evidence, never a stretched benchmark.
 *  3. Implied-CPM positions against the deliverable's reported band.
 *  4. Walk-away panel: the higher of rate floor / creator floor, and
 *     pipeline arithmetic on the creator's own deals only.
 *  5. Reply scripts: all six situations exist, fill from the counter's
 *     numbers, leave unknown placeholders visible, carry no guru-speak.
 *  6. Honesty contract: "a model, not a prediction" + "not financial,
 *     legal, or tax advice" on every output surface.
 *  7. Niche parity with DealRoom + DealAnalyzer (one table site-wide).
 *  8. Page / CSS / build wiring contracts.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");
var K = require(path.join(ROOT, "assets", "js", "negotiation-kit.js"));
var DealRoom = require(path.join(ROOT, "assets", "js", "deal-room.js"));
var DealAnalyzer = require(path.join(ROOT, "assets", "js", "deal-analyzer.js"));
var cfg = require(path.join(ROOT, "data", "calculators.json"));
var tpl = require(path.join(ROOT, "data", "deal-templates.json"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

/* ---------- 1. counter math: the AGENT.md Workflow 15 fixture ---------- */
console.log("counter builder — workflow fixture");
var fixture = { brand: "Acme", platform: "youtube", deliverable: "integrated",
  followers: 50000, expectedViews: 60000, offer: 5000, niche: "tech_software",
  usage: "paid_6mo", whitelistingMonths: 0,
  exclusivity: { scope: "none", months: 0 }, postCount: 1, creatorFloor: 0 };
var c = K.buildCounter(fixture, cfg);
ok(c.ok && c.tier === "micro_10k_100k", "fixture builds, micro tier");
ok(c.range[0] === 2500 && c.range[1] === 25000,
  "niche-adjusted range $2,500–$25,000 (tech ×2.5 on the $1,000–$10,000 band)");
ok(c.verdict === "fair" && c.badge === "FAIR", "$5,000 inside the adjusted range -> FAIR");
ok(c.counterBase === 25000, "counter base = top of the range ($25,000)");
var usageLine = c.lines.filter(function (l) { return l.id === "usage"; })[0];
ok(usageLine && usageLine.range[0] === 13000 && usageLine.range[1] === 19000 &&
   usageLine.basis === "reported",
  "paid 3–6mo usage line = +50–75% of base -> $13,000–$19,000 (reported)");
ok(c.total[0] === 38000 && c.total[1] === 44000, "counter total $38,000–$44,000");
ok(c.expectedClose[0] === 29000 && c.expectedClose[1] === 34000,
  "expected landing zone ×0.77 -> $29,000–$34,000");
ok(K.LISTED_VS_ACCEPTED === 0.23 && DealRoom.LISTED_VS_ACCEPTED === 0.23,
  "LISTED_VS_ACCEPTED = 0.23, shared with the Deal Room");

/* verdicts at the edges, against the real rate card */
console.log("counter builder — verdicts and validation");
var under = K.buildCounter({ platform: "youtube", deliverable: "integrated", followers: 50000, offer: 500 }, cfg);
ok(under.verdict === "under" && under.range[0] === 1000 && under.range[1] === 10000,
  "no niche: $500 vs the $1,000–$10,000 base range -> UNDERPAID");
var over = K.buildCounter({ platform: "tiktok", deliverable: "short", followers: 5000, offer: 900 }, cfg);
ok(over.verdict === "over" && over.range[1] === 300, "$900 vs the nano TikTok ceiling $300 -> STRONG");
ok(!K.buildCounter({ platform: "myspace", deliverable: "integrated", followers: 50000, offer: 100 }, cfg).ok,
  "unknown platform rejected");
ok(!K.buildCounter({ platform: "youtube", deliverable: "integrated", followers: 500, offer: 100 }, cfg).ok,
  "followers under the 1,000 nano floor rejected");
ok(!K.buildCounter({ platform: "youtube", deliverable: "integrated", followers: 50000, offer: -5 }, cfg).ok,
  "negative offer rejected");
ok(!K.buildCounter({ platform: "youtube", deliverable: "integrated", followers: 50000, offer: 100,
  exclusivity: { scope: "none", months: 3 } }, cfg).ok,
  "exclusivity months with scope none rejected");
ok(K.buildCounter({ platform: "youtube", deliverable: "integrated", followers: 50000, offer: 100 }, cfg).ok,
  "omitted optional fields default instead of failing");

/* line items: whitelisting + named exclusivity + perpetual + bundles */
console.log("counter builder — stacked lines");
var stacked = K.buildCounter({ platform: "tiktok", deliverable: "short", followers: 200000,
  offer: 4000, usage: "perpetual", whitelistingMonths: 2,
  exclusivity: { scope: "named", months: 1 }, postCount: 3 }, cfg);
ok(stacked.counterBase === 9000, "macro TikTok top of range = $9,000 counter base");
var wl = stacked.lines.filter(function (l) { return l.id === "whitelisting"; })[0];
ok(wl && wl.range[0] === 5400 && wl.range[1] === 18000,
  "whitelisting 2mo at 30–100%/mo of base -> $5,400–$18,000");
var exl = stacked.lines.filter(function (l) { return l.id === "exclusivity"; })[0];
ok(exl && exl.range[0] === 2300 && exl.range[1] === 2300,
  "named 30-day exclusivity = +25% of base -> $2,300");
var usl = stacked.lines.filter(function (l) { return l.id === "usage"; })[0];
ok(usl && usl.range[0] === 9000 && usl.range[1] === null && stacked.openEnded === true &&
   stacked.total[1] === null,
  "perpetual usage: from +100% of base, open-ended total — never a fake ceiling");
ok(stacked.notes.some(function (n) { return /41%/.test(n); }),
  "3-post bundle carries the 41% package-discount note");
var broad = K.buildCounter({ platform: "youtube", deliverable: "dedicated", followers: 50000,
  offer: 8000, exclusivity: { scope: "category", months: 6 } }, cfg);
ok(broad.exclusivityFlag && /no benchmark multiplier/.test(broad.exclusivityFlag) &&
   !broad.lines.some(function (l) { return l.id === "exclusivity"; }),
  "broad category exclusivity: flagged in words, never priced with an invented multiplier");

/* ---------- 2. evidence honesty ---------- */
console.log("evidence — reported vs modeled");
ok(cfg.version === "1.5.0", "calculators.json is v1.5.0 (the data this kit is built on)");
ok(c.evidence.formatQuote && c.evidence.formatQuote.quoted === 3000 &&
   c.evidence.formatQuote.basis === "reported",
  "YouTube integration -> typical quote $3,000 (Cheerful, reported)");
ok(c.evidence.typicalAsk === null,
  "50K followers maps to no typical-ask band -> null, not a guess");
var ig = K.buildCounter({ platform: "instagram", deliverable: "short", followers: 75000,
  offer: 900, expectedViews: 40000 }, cfg);
ok(ig.evidence.formatQuote.quoted === 1800 && ig.evidence.formatQuote.basis === "reported",
  "Instagram Reel -> typical quote $1,800 (reported)");
ok(ig.evidence.modeledFeedPost && ig.evidence.modeledFeedPost.basis === "modeled" &&
   ig.evidence.modeledFeedPost.range[0] === 899 && ig.evidence.modeledFeedPost.range[1] === 1500,
  "Instagram 75K -> modeled feed-post cross-check $899–$1,500, basis labeled modeled");
var ytDed = K.buildCounter({ platform: "youtube", deliverable: "dedicated", followers: 50000, offer: 9000 }, cfg);
ok(ytDed.evidence.formatQuote === null && ytDed.evidence.modeledFeedPost === null,
  "YouTube dedicated -> no quoted-price evidence (the Deal Room's honest null, kept)");

/* ---------- 3. implied CPM ---------- */
console.log("implied CPM");
ok(c.impliedCpm === 83.33 && c.cpmCheck.position === "above" &&
   c.cpmCheck.range[0] === 20 && c.cpmCheck.range[1] === 35 && c.cpmCheck.basis === "reported",
  "fixture: $83.33 implied CPM, above the $20–$35 integrated band (reported)");
ok(ig.cpmCheck.implied === 22.5 && ig.cpmCheck.position === "inside",
  "Instagram short: $22.50 implied, inside the $10–$30 general band");
var ded = K.buildCounter({ platform: "youtube", deliverable: "dedicated", followers: 50000,
  offer: 6000, expectedViews: 100000 }, cfg);
ok(ded.cpmCheck.range[0] === 50 && ded.cpmCheck.range[1] === 90 &&
   /AIR/.test(ded.cpmCheck.source) && ded.cpmCheck.position === "inside",
  "dedicated: $60.00 implied vs the AIR $50–$90 band -> inside, source named");
var ugc = K.buildCounter({ platform: "youtube", deliverable: "ugc", followers: 5000,
  offer: 300, expectedViews: 10000 }, cfg);
ok(ugc.cpmCheck === null && ugc.impliedCpm === 30,
  "UGC: implied CPM computed but no CPM band claimed — production work has no CPM check");

/* ---------- 4. walk-away panel ---------- */
console.log("walk-away panel");
var deals = [
  { brand: "A", offer: 500, status: "offer" },
  { brand: "B", offer: 5000, status: "signed" },
  { brand: "C", offer: 2000, status: "paid" },
  { brand: "D", offer: 3000, status: "paid" }
];
var w = K.walkAwayPanel(fixture, deals, cfg);
ok(w.ok && w.rateFloor === 2500 && w.walkAway === 2500,
  "walk-away = rate-card floor $2,500 when no personal floor is set");
ok(w.pipeline.totalDeals === 4 && w.pipeline.committed === 10000 &&
   w.pipeline.paidTotal === 5000 && w.pipeline.avgPaid === 2500 && w.pipeline.openCount === 1,
  "pipeline: 4 deals, $10,000 committed, $5,000 paid, $2,500 average paid, 1 open");
ok(w.stance === "workable", "$5,000 offer vs a $2,500 floor -> workable");
var wFloor = K.walkAwayPanel(Object.assign({}, fixture, { creatorFloor: 8000, offer: 5000 }), deals, cfg);
ok(wFloor.walkAway === 8000 && wFloor.stance === "below",
  "personal floor $8,000 beats the rate floor; a $5,000 offer reads below walk-away");
var wEmpty = K.walkAwayPanel(fixture, [], cfg);
ok(wEmpty.pipeline.totalDeals === 0 && wEmpty.pipeline.avgPaid === null &&
   wEmpty.reasons.some(function (r) { return /No pipeline on file/.test(r); }),
  "empty pipeline: honest zeros + the log-deals-in-the-Deal-Room note, no invented average");

/* ---------- 5. reply scripts ---------- */
console.log("reply scripts");
ok(tpl.version === "1.2.0" && Array.isArray(tpl.negotiation_kit_scripts) &&
   tpl.negotiation_kit_scripts.length === 6,
  "deal-templates v1.2.0 carries the 6 kit scripts");
var wantIds = ["counter_offer", "lowball_reply", "exposure_only_reply",
               "usage_rights_reply", "whitelisting_reply", "late_payment_reply"];
wantIds.forEach(function (id) {
  ok(tpl.negotiation_kit_scripts.some(function (s) { return s.id === id; }),
    "script present: " + id);
});
var rv = K.replyVars(c, {});
ok(rv.ok && rv.vars.counter_total === "38,000–44,000" && rv.vars.counter_base === "25,000" &&
   rv.vars.typical_quote === "3,000" && rv.vars.implied_cpm === "83.33",
  "replyVars carries the counter's own numbers into the scripts");
var counterScript = tpl.negotiation_kit_scripts.filter(function (s) { return s.id === "counter_offer"; })[0];
var rendered = K.renderReply(counterScript, rv.vars);
ok(rendered.body.indexOf("$38,000") !== -1 && rendered.body.indexOf("{{") === -1 &&
   rendered.subject.indexOf("Acme") !== -1,
  "counter script renders fully from the fixture — no placeholder survives");
var lateScript = tpl.negotiation_kit_scripts.filter(function (s) { return s.id === "late_payment_reply"; })[0];
var lateRendered = K.renderReply(lateScript, rv.vars);
ok(lateRendered.body.indexOf("{{invoice_amount}}") !== -1,
  "unsupplied invoice fields stay visible as {{placeholders}} — never invented");
var exposure = K.buildCounter({ platform: "tiktok", deliverable: "short", followers: 20000, offer: 0 }, cfg);
ok(exposure.verdict === "under" && exposure.notes.some(function (n) { return /no fee/.test(n); }),
  "exposure-only offer ($0): reads underpaid and the kit names the matching reply");

/* ---------- 6. honesty contract ---------- */
console.log("honesty contract");
var brief = K.exportBrief(c, w);
ok(brief.ok && /a model, not a prediction/i.test(brief.text) &&
   /not financial, legal, or tax advice/i.test(brief.text),
  "brief carries both disclaimers");
ok(/\$38,000/.test(brief.text) && /Typical quote/.test(brief.text) &&
   /reported/.test(brief.text) && /WALK-AWAY/.test(brief.text),
  "brief records the counter, the reported evidence, and the walk-away");
ok(/a model, not a prediction/i.test(K.DISCLAIMER) && /never a guarantee/i.test(K.DISCLAIMER),
  "kit disclaimer: a model, not a prediction, never a guarantee");
var allText = JSON.stringify(c) + JSON.stringify(w) + brief.text +
  tpl.negotiation_kit_scripts.map(function (s) { return s.body + s.tip; }).join(" ");
ok(!/unlock the power of|delve|game-changer|in today's fast-paced world|whether you're a beginner/i.test(allText),
  "no banned AI-isms anywhere in the kit's outputs or scripts");
ok(!/\byou will earn\b|\bguaranteed income\b/i.test(allText),
  "no income promises in the kit's outputs or scripts");

/* ---------- 7. niche parity ---------- */
console.log("niche parity");
K.NICHES.forEach(function (n) {
  ok(K.nicheMult(n).mult === DealRoom.nicheMult(n).mult &&
     K.nicheMult(n).mult === DealAnalyzer.nicheMult(n).mult,
    "niche parity: " + n + " ×" + K.nicheMult(n).mult + " matches Deal Room + Deal Analyzer");
});
ok(K.tierOf(50000) === DealRoom.tierOf(50000) && K.nice(9876) === 9900,
  "tierOf + nice helpers match the Deal Room's");

/* ---------- 8. page / CSS / wiring contracts ---------- */
console.log("page + wiring contracts");
var page = fs.readFileSync(path.join(ROOT, "pages", "negotiation-kit.html"), "utf8");
["nk-form", "nk-counter-out", "nk-scripts", "nk-walk-out", "nk-brief-out",
 "nk-copy-brief", "nk-live"].forEach(function (id) {
  ok(page.indexOf('id="' + id + '"') !== -1, "page carries #" + id);
});
ok(/a model, not a prediction/i.test(page) && /not financial, legal, or tax advice/i.test(page),
  "page footer carries both honesty lines");
ok(page.indexOf("deal-room.html") !== -1 && page.indexOf("<noscript>") !== -1,
  "page cross-links the Deal Room and carries a noscript fallback");
var css = fs.readFileSync(path.join(ROOT, "assets", "css", "negotiation-kit.css"), "utf8");
ok(/\.nk-table/.test(css) && /\.nk-script/.test(css) && /\.nk-ev-modeled/.test(css) &&
   /border-style: dashed/.test(css),
  "CSS scopes .nk-* and the modeled evidence card is visually distinct (dashed)");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"negotiation-kit"') !== -1 && build.indexOf("NegotiationKitInput") !== -1 &&
   build.indexOf("assets/js/negotiation-kit.js") !== -1 &&
   build.indexOf("assets/css/negotiation-kit.css") !== -1,
  "build.py wires the tool: TOOLS + TOOLS_API + scripts + CSS");
var ui = fs.readFileSync(path.join(ROOT, "assets", "js", "negotiation-kit-ui.js"), "utf8");
ok(ui.indexOf("cge.deal-room.deals.v1") !== -1 && ui.indexOf("data/v1/calculators.json") !== -1 &&
   ui.indexOf("negotiation_kit_scripts") !== -1,
  "UI reads the Deal Room pipeline store + both data contracts");
var validate = fs.readFileSync(path.join(ROOT, "scripts", "validate.sh"), "utf8");
ok(validate.indexOf("tests/negotiation-kit.test.js") !== -1,
  "validate.sh stage 6 runs this suite");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
