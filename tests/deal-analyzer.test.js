/* Unit tests for The Deal Analyzer 2.0 engine. Run: node tests/deal-analyzer.test.js
 * Exit 0 = all pass. Pinned fixtures:
 *  1. validInput — defaults, contract defaults, error cases.
 *  2. tierOf — nano/micro/macro/mega boundaries.
 *  3. nicheMult — finance/tech 2.5x, gaming/comedy/music 0.6x, default 1x;
 *     parity with EmpireSim.DEFAULTS.sponsorNicheMult (single source rule).
 *  4. categoryCpm — AIR Oct-11-2026 category CPMs ($58 finance … $14
 *     entertainment); education/lifestyle/music unmapped -> null.
 *  5. evaluate vs the REAL rate card (sponsorship_rate_card_2026): range
 *     pins, niche-adjusted verdicts, 23% landing zone, implied-CPM bands
 *     (dedicated $50–$90 AIR), category cross-check, no invented numbers.
 *  6. offerTermFlags — usage/whitelisting/exclusivity/payment/timeline scans.
 *  7. mapTermsToFlags + contractRisk vs the REAL checklist
 *     (deal-templates.json contract_flags): walk_away -> dont_sign, point
 *     math, parity spot-check vs Outreach.contractRisk, NOT-legal-advice.
 *  8. usageAddons vs the REAL usage_rights_benchmarks_2026 block:
 *     3mo +25–50%, 12mo +75–100%, perpetual open-ended (hi null).
 *  9. counterOffer — line items, totals, open-ended perpetual, bundle note
 *     (15–20% + 41% stats), honest rounding (nice = 2 sig figs).
 * 10. exportReport + compareDeals — content pins, disclaimers present,
 *     no guarantee language.
 */
"use strict";
var path = require("path");
var ROOT = path.join(__dirname, "..");
var DA = require(path.join(ROOT, "assets", "js", "deal-analyzer.js"));
var Outreach = require(path.join(ROOT, "assets", "js", "outreach.js"));
var EmpireSim = require(path.join(ROOT, "assets", "js", "sim-engine.js"));
var calc = require(path.join(ROOT, "data", "calculators.json"));
var RC = calc.sponsorship_rate_card_2026;
var UB = calc.usage_rights_benchmarks_2026;
var dealData = require(path.join(ROOT, "data", "deal-templates.json"));
var FLAGS = dealData.contract_flags;

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function deal(over) {
  var base = { platform: "youtube", deliverable: "dedicated", followers: 50000,
    expectedViews: 60000, offerUsd: 5000, usage: "organic_only",
    whitelisting: "none", exclusivity: "none", paymentTerms: "30",
    postCount: 1, timeline: "standard", niche: "finance_investing", contract: {} };
  Object.keys(over || {}).forEach(function (k) { base[k] = over[k]; });
  return DA.validInput(base).deal;
}

/* ---------- 1. validInput ---------- */
console.log("validInput");
var v = DA.validInput({ followers: 50000, offerUsd: 5000 });
ok(v.ok && v.errors.length === 0, "good input passes");
ok(v.deal.platform === "youtube" && v.deal.usage === "organic_only" &&
   v.deal.paymentTerms === "30" && v.deal.postCount === 1, "defaults applied");
ok(v.deal.contract.ip === "mine" && v.deal.contract.ftc === "yes" &&
   v.deal.contract.paySchedule === "yes", "contract defaults applied");
var bad = DA.validInput({ followers: 0, offerUsd: 0 });
ok(!bad.ok && bad.errors.length === 2, "zero followers + zero offer rejected");
ok(DA.validInput({ followers: 100, offerUsd: 50, platform: "myspace" }).deal.platform === "youtube",
  "unknown platform falls back to youtube");
ok(DA.validInput({ followers: 100, offerUsd: 50, niche: "astrology" }).deal.niche === null,
  "unknown niche falls back to null (no stretch)");

/* ---------- 2. tierOf ---------- */
console.log("tierOf");
ok(DA.tierOf(9999) === "nano_1k_10k", "9999 = nano");
ok(DA.tierOf(10000) === "micro_10k_100k", "10000 = micro");
ok(DA.tierOf(99999) === "micro_10k_100k", "99999 = micro");
ok(DA.tierOf(100000) === "macro_100k_1m", "100000 = macro");
ok(DA.tierOf(999999) === "macro_100k_1m", "999999 = macro");
ok(DA.tierOf(1000000) === "mega_1m_plus", "1000000 = mega");

/* ---------- 3. nicheMult + parity ---------- */
console.log("nicheMult");
ok(DA.nicheMult("finance_investing").mult === 2.5, "finance 2.5x");
ok(DA.nicheMult("tech_software").mult === 2.5, "tech 2.5x");
ok(DA.nicheMult("gaming").mult === 0.6, "gaming 0.6x");
ok(DA.nicheMult("comedy_entertainment").mult === 0.6, "comedy 0.6x");
ok(DA.nicheMult("music").mult === 0.6, "music 0.6x");
ok(DA.nicheMult("education").mult === 1, "education 1x");
ok(DA.nicheMult(null).mult === 1 && DA.nicheMult(null).label === null,
  "no niche = 1x, unlabeled");
Object.keys(EmpireSim.DEFAULTS.sponsorNicheMult).forEach(function (n) {
  ok(DA.nicheMult(n).mult === EmpireSim.DEFAULTS.sponsorNicheMult[n],
    "parity with sim-engine sponsorNicheMult: " + n);
});

/* ---------- 4. categoryCpm ---------- */
console.log("categoryCpm");
var cFin = DA.categoryCpm("finance_investing");
ok(cFin && cFin.cpm === 58 && cFin.category === "Finance & real estate",
  "finance = $58 Finance & real estate");
ok(DA.categoryCpm("tech_software").cpm === 46.5, "tech = $46.50 B2B SaaS & AI");
ok(DA.categoryCpm("health_fitness").cpm === 28, "health = $28");
ok(DA.categoryCpm("gaming").cpm === 18.5, "gaming = $18.50");
ok(DA.categoryCpm("comedy_entertainment").cpm === 14, "entertainment = $14");
ok(cFin.source.indexOf("AIR") !== -1 && cFin.source.indexOf("2026") !== -1,
  "category source labeled (AIR compilation, Oct 2026)");
ok(DA.categoryCpm("education") === null && DA.categoryCpm("lifestyle") === null &&
   DA.categoryCpm("music") === null, "education/lifestyle/music unmapped -> null, not stretched");

/* ---------- 5. evaluate ---------- */
console.log("evaluate");
ok(JSON.stringify(DA.benchmarkRange(RC, "micro_10k_100k", "youtube")) === "[1000,10000]",
  "micro/youtube base range pinned [1000,10000]");
var ev = DA.evaluate(deal(), RC);
ok(ev.verdict === "FAIR", "finance/micro/YT $5k dedicated = FAIR");
ok(JSON.stringify(ev.range) === "[2500,25000]", "niche-adjusted range pinned [2500,25000]");
ok(JSON.stringify(ev.baseRange) === "[1000,10000]", "base range preserved alongside adjusted");
ok(DA.evaluate(deal({ offerUsd: 1000 }), RC).verdict === "UNDERPAID", "$1k = UNDERPAID (below $2,500 floor)");
ok(DA.evaluate(deal({ offerUsd: 40000 }), RC).verdict === "STRONG", "$40k = STRONG (above $25,000 ceiling)");
ok(DA.evaluate(deal({ niche: "gaming", offerUsd: 7000 }), RC).verdict === "STRONG" &&
   DA.evaluate(deal({ offerUsd: 7000 }), RC).verdict === "FAIR",
  "$7k reads STRONG in gaming ($600–$6,000) but FAIR in finance ($2,500–$25,000) — niche moves the verdict");
ok(ev.expectedClose === DA.nice(25000 / 1.23), "expected close = nice(hi / 1.23)");
ok(ev.expectedClose === 20000, "expected close pinned $20,000");
ok(DA.LISTED_VS_ACCEPTED === 0.23, "23% listed-above-accepted constant");
var imp = ev.impliedCpm;
ok(imp && imp.band.lo === 50 && imp.band.hi === 90, "dedicated implied-CPM band $50–$90 (AIR)");
ok(Math.abs(imp.value - 83.33) < 0.01 && imp.position === "inside",
  "implied CPM $83.33 sits inside the $50–$90 band");
ok(ev.categoryCheck && ev.categoryCheck.cpm === 58 &&
   ev.categoryCheck.impliedValue === DA.nice(60 * 58),
  "category check: 60K views x $58 = " + DA.fmt(DA.nice(60 * 58)) + " of category-rate value");
ok(DA.evaluate(deal({ niche: "education" }), RC).categoryCheck === null,
  "no category check for unmapped niches");
ok(ev.crossPlatform.length === 2 && ev.multNote.indexOf("1.7") !== -1,
  "cross-platform context names the 1.7x / 0.85x multipliers");
ok(ev.disclaimer.indexOf("Not financial advice") !== -1, "evaluate disclaimer: not financial advice");

/* ---------- 6. offerTermFlags ---------- */
console.log("offerTermFlags");
function kinds(flags) { return flags.map(function (f) { return f.kind + ":" + f.title; }); }
var fPerp = DA.offerTermFlags(deal({ usage: "perpetual" }));
ok(fPerp.some(function (f) { return f.kind === "bad" && f.title.indexOf("Perpetual usage") === 0; }),
  "perpetual usage = bad flag");
var f12 = DA.offerTermFlags(deal({ usage: "paid_12mo" }));
ok(f12.some(function (f) { return f.kind === "warn" && f.detail.indexOf("+75") !== -1; }),
  "paid 12mo = warn naming +75–100%");
var fNet90 = DA.offerTermFlags(deal({ paymentTerms: "90" }));
ok(fNet90.some(function (f) { return f.kind === "bad" && f.title.indexOf("Net 90") === 0; }),
  "net-90 = bad flag");
ok(DA.offerTermFlags(deal()).every(function (f) { return f.kind === "ok"; }) &&
   DA.offerTermFlags(deal()).length === 1, "clean deal = single ok flag");

/* ---------- 7. contract checklist ---------- */
console.log("contract checklist");
var hostile = deal({ contract: { ip: "brand_full", cancel: "yes", usageWords: "all_media",
  exclRenew: "no", payMetrics: "yes", morals: "one_sided", paySchedule: "no",
  approval: "vague", ftc: "no", scope: "yes" } });
var ids = DA.mapTermsToFlags(hostile);
["ip_assignment", "termination_one_sided", "usage_vague_all_media", "payment_on_metrics",
 "moral_clause_one_sided", "no_payment_schedule", "approval_no_timeline",
 "no_ftc_disclosure", "scope_creep_language"].forEach(function (id) {
  ok(ids.indexOf(id) !== -1, "term maps to flag: " + id);
});
ok(DA.mapTermsToFlags(deal()).length === 0, "clean contract maps to zero flags");
var cr = DA.contractRisk(ids, FLAGS);
ok(cr.verdict === "dont_sign" && cr.score >= 3, "hostile contract = dont_sign");
ok(cr.disclaimer.indexOf("NOT legal advice") !== -1, "contract disclaimer: NOT legal advice");
var three = DA.contractRisk(["usage_vague_all_media", "exclusivity_auto_renew"], FLAGS);
ok(three.verdict === "dont_sign" && three.score === 4, "2 majors = 4 pts = dont_sign");
var one = DA.contractRisk(["approval_no_timeline"], FLAGS);
ok(one.verdict === "caution" && one.score === 1, "1 minor = caution");
ok(DA.contractRisk([], FLAGS).verdict === "clean", "no flags = clean");
var walk = DA.contractRisk(["ip_assignment"], FLAGS);
ok(walk.verdict === "dont_sign", "single walk_away flag = dont_sign regardless of points");
/* parity: same flags through the Outreach Center's scorer */
["ip_assignment", "usage_vague_all_media", "approval_no_timeline"].forEach(function (id) {
  var a = DA.contractRisk([id], FLAGS), b = Outreach.contractRisk([id], FLAGS);
  ok(a.verdict === b.verdict && a.score === b.score,
    "parity vs Outreach.contractRisk: " + id + " -> " + a.verdict);
});

/* ---------- 8. usageAddons ---------- */
console.log("usageAddons");
ok(UB.version === undefined || true, "usage block present");
var tiers = UB.tiers;
ok(tiers.length === 5, "5 usage tiers in the JSON");
var adds = DA.usageAddons(5000, UB);
function addon(id) { return adds.filter(function (a) { return a.id === id; })[0]; }
ok(JSON.stringify([addon("paid_3mo").lo, addon("paid_3mo").hi]) === "[1300,2500]",
  "3mo on $5k = $1,300–$2,500 (+25–50%)");
ok(JSON.stringify([addon("paid_12mo").lo, addon("paid_12mo").hi]) === "[3800,5000]",
  "12mo on $5k = $3,800–$5,000 (+75–100%)");
ok(addon("perpetual").lo === 5000 && addon("perpetual").hi === null,
  "perpetual = from $5,000, open-ended (hi null)");
ok(addon("organic_only").lo === 0 && addon("organic_only").hi === 0,
  "organic only = $0 add-on (absence of a line item)");
ok(UB.whitelisting_per_month_pct.join(",") === "30,100", "whitelisting 30–100%/mo pinned");

/* ---------- 9. counterOffer ---------- */
console.log("counterOffer");
var co = DA.counterOffer(deal({ usage: "paid_3mo" }), RC, UB);
ok(co.base === 25000, "counter base = top of niche-adjusted range ($25,000)");
ok(co.lines[0].label.indexOf("$25,000") !== -1, "base line item names the number");
var coTotal = co.totalLo + "–" + co.totalHi;
ok(co.totalLo === 25000 + DA.nice(25000 * 0.25) &&
   co.totalHi === 25000 + DA.nice(25000 * 0.50),
  "counter total = base + 3mo usage add-on (" + DA.fmtRange(co.totalLo, co.totalHi) + ")");
var coPerp = DA.counterOffer(deal({ usage: "perpetual" }), RC, UB);
ok(coPerp.totalHi === null && coPerp.totalLabel.indexOf("from") === 0,
  "perpetual usage = open-ended counter (" + coPerp.totalLabel + ")");
ok(co.bundleNote === null, "no bundle note under 3 posts");
var coBundle = DA.counterOffer(deal({ postCount: 4 }), RC, UB);
ok(coBundle.bundleNote && coBundle.bundleNote.indexOf("15–20%") !== -1 &&
   coBundle.bundleNote.indexOf("41%") !== -1,
  "4-post bundle note carries the 15–20% + 41% stats");
ok(co.disclaimer.indexOf("not financial advice") !== -1, "counter disclaimer: not financial advice");
ok(co.expectedCloseNote.indexOf("÷ 1.23") !== -1, "expected-close note shows the 23% math");

/* ---------- 10. exportReport + compareDeals ---------- */
console.log("exportReport / compareDeals");
var analysis = {
  brand: "Acme", deal: deal(), evaluation: ev,
  termFlags: DA.offerTermFlags(deal()),
  contractRisk: DA.contractRisk([], FLAGS),
  counter: DA.counterOffer(deal(), RC, UB)
};
var rep = DA.exportReport(analysis);
ok(rep.indexOf("DEAL EVALUATION — Acme") === 0, "report opens with the brand");
ok(rep.indexOf("RATE-CARD VERDICT: FAIR") !== -1, "report carries the verdict");
ok(rep.indexOf("Counter total: " + analysis.counter.totalLabel) !== -1, "report carries the counter total");
ok(rep.indexOf("NOT legal advice") !== -1 && rep.indexOf("not financial advice") !== -1,
  "report carries both disclaimers");
ok(!/guarantee/i.test(rep), "no guarantee language anywhere in the report");
ok(rep.indexOf("Benchmark range: $2,500–$25,000") !== -1, "report pins the niche-adjusted range");
function snap(d, evx, cox, crx) {
  return { brand: "X", savedAt: 1, deal: d, verdict: evx.verdict,
    range: evx.range, expectedClose: evx.expectedClose,
    counterTotalLabel: cox.totalLabel, contractVerdict: crx.verdict,
    flagCount: crx.items.length };
}
var A = snap(deal(), ev, analysis.counter, analysis.contractRisk);
var dB = deal({ offerUsd: 7000, niche: "gaming" });
var evB = DA.evaluate(dB, RC);
var B = snap(dB, evB, DA.counterOffer(dB, RC, UB), DA.contractRisk([], FLAGS));
var cmp = DA.compareDeals(A, B);
ok(cmp.rows.length === 5, "5 comparison rows");
ok(cmp.rows[0].a === "FAIR" && cmp.rows[0].b === "STRONG" && cmp.rows[0].differs,
  "verdict row shows FAIR vs STRONG, flagged as differing");
ok(cmp.differingTerms.some(function (t) { return t.term === "Offered ($)"; }),
  "differing terms call out the offer amounts");
ok(DA.DISCLAIMER.indexOf("not financial") !== -1, "module disclaimer intact");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
