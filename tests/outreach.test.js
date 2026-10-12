/* Unit tests for the Outreach Center math. Run: node tests/outreach.test.js
 * Exit 0 = all pass. Pinned fixtures:
 *  1. validDeal — brand required, status in pipeline, email sanity.
 *  2. pipelineStats — response/close rates over a pinned 10-deal fixture.
 *  3. dueFollowUps — overdue / due-today / upcoming buckets vs a fixed now;
 *     signed/passed and dateless deals never appear.
 *  4. quoteCalc vs the REAL rate card (data/calculators.json): tier
 *     boundaries, range pins, 23% listing math, CPM cross-check bands per
 *     deliverable, no invented numbers, honesty copy enforced.
 *  5. renderPitch — known placeholders filled, unknown ones stay visible;
 *     no $ amounts baked into any template (never invent stats).
 *  6. contractRisk — walk_away flag -> don't sign; point math honest;
 *     plain-language verdict; NOT-legal-advice disclaimer present.
 */
"use strict";
var path = require("path");
var ROOT = path.join(__dirname, "..");
var Outreach = require(path.join(ROOT, "assets", "js", "outreach.js"));
var rc = require(path.join(ROOT, "data", "calculators.json"));
var templates = require(path.join(ROOT, "data", "deal-templates.json"));

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

/* ---------- data contract: pitch templates ---------- */
console.log("pitch templates (data)");
ok(templates.pitch_templates.length === 3, "3 pitch templates");
var tplIds = templates.pitch_templates.map(function (t) { return t.id; });
["cold_pitch", "follow_up_nudge", "warm_intro"].forEach(function (id) {
  ok(tplIds.indexOf(id) !== -1, "template present: " + id);
});
templates.pitch_templates.forEach(function (t) {
  ok(t.placeholders.length > 0 && t.honesty_note && t.grounded_in,
    "'" + t.id + "' has placeholders + honesty_note + grounded_in");
  ok(!/\$\d/.test(t.subject + t.body),
    "'" + t.id + "' contains no hard $ amounts — never invents stats");
  ok(/\[.+\]/.test(t.body),
    "'" + t.id + "' body uses [bracketed] placeholders the user fills");
});
var cold = templates.pitch_templates.filter(function (t) { return t.id === "cold_pitch"; })[0];
ok(cold.body.split(/\s+/).length <= 120,
  "cold pitch under 120 words (" + cold.body.split(/\s+/).length + ")");
var nudge = templates.pitch_templates.filter(function (t) { return t.id === "follow_up_nudge"; })[0];
ok(/won't write again/i.test(nudge.body),
  "follow-up nudge carries the permission line (one nudge, then move on)");

/* ---------- data contract: contract flags ---------- */
console.log("contract flags (data)");
ok(templates.contract_flags.length === 10, "10 contract red-flag items");
templates.contract_flags.forEach(function (f) {
  ok(f.title && f.detail && f.fix && ["walk_away", "major", "minor"].indexOf(f.severity) !== -1,
    "'" + f.id + "' has title/detail/fix/valid severity");
});
ok(templates.contract_scoring.rules.length === 5, "contract scoring: 5 rules");
ok(/NOT legal advice/i.test(templates.contract_scoring.note),
  "contract scoring note carries the not-legal-advice line");

/* ---------- 1. validDeal ---------- */
console.log("validDeal");
ok(Outreach.validDeal({ brand: "Acme", status: "pitched" }).ok, "brand + status -> ok");
ok(Outreach.validDeal({ brand: "Acme", status: "pitched", email: "a@b.co" }).ok, "valid email -> ok");
ok(!Outreach.validDeal({ brand: "", status: "pitched" }).ok, "empty brand -> invalid");
ok(!Outreach.validDeal({ brand: "Acme", status: "shipped" }).ok, "unknown status -> invalid");
ok(!Outreach.validDeal({ brand: "Acme", status: "pitched", email: "not-an-email" }).ok,
  "bad email -> invalid");
ok(!Outreach.validDeal(null).ok, "null -> invalid");

/* ---------- 2. pipelineStats ---------- */
console.log("pipelineStats");
var fixture = [
  { brand: "A", status: "pitched" }, { brand: "B", status: "pitched" },
  { brand: "C", status: "pitched" }, { brand: "D", status: "pitched" },
  { brand: "E", status: "pitched" }, { brand: "F", status: "replied" },
  { brand: "G", status: "replied" }, { brand: "H", status: "negotiating" },
  { brand: "I", status: "signed" }, { brand: "J", status: "passed" }
];
var s = Outreach.pipelineStats(fixture);
ok(s.contacted === 10, "contacted = 10");
ok(s.responded === 4, "responded = 4 (2 replied + 1 negotiating + 1 signed)");
ok(s.activeDeals === 8, "active = 8 (5 pitched + 2 replied + 1 negotiating)");
ok(s.signed === 1, "signed = 1");
ok(s.responseRate === 40 && s.closeRate === 10,
  "responseRate 40%, closeRate 10% (pinned)");
ok(/5%/.test(s.note), "stats note names the ~5% normal reply rate");
var empty = Outreach.pipelineStats([]);
ok(empty.contacted === 0 && empty.responseRate === 0 && empty.closeRate === 0,
  "empty pipeline -> zeros, no NaN");
var bad = Outreach.pipelineStats("nope");
ok(bad.contacted === 0, "non-array input -> zeros");

/* ---------- 3. dueFollowUps ---------- */
console.log("dueFollowUps");
var nowDeals = [
  { brand: "Over", status: "pitched", followUpDate: "2026-10-10" },
  { brand: "Today", status: "replied", followUpDate: "2026-10-11" },
  { brand: "Soon", status: "negotiating", followUpDate: "2026-10-15" },
  { brand: "Done", status: "signed", followUpDate: "2026-10-01" },
  { brand: "Nope", status: "passed", followUpDate: "2026-10-01" },
  { brand: "Dateless", status: "pitched" }
];
var b = Outreach.dueFollowUps(nowDeals, "2026-10-11");
ok(b.overdue.length === 1 && b.overdue[0].brand === "Over", "overdue bucket");
ok(b.dueToday.length === 1 && b.dueToday[0].brand === "Today", "due-today bucket");
ok(b.upcoming.length === 1 && b.upcoming[0].brand === "Soon", "upcoming bucket");

/* ---------- 4. quoteCalc against the real rate card ---------- */
console.log("quoteCalc");
var rateCard = rc.sponsorship_rate_card_2026;
var rot = rc.sponsorship_rule_of_thumb;

ok(Outreach.tierOf(9999) === "nano_1k_10k", "9,999 followers -> nano");
ok(Outreach.tierOf(10000) === "micro_10k_100k", "10,000 followers -> micro (boundary)");
ok(Outreach.tierOf(999999) === "macro_100k_1m", "999,999 -> macro");
ok(Outreach.tierOf(1000000) === "mega_1m_plus", "1,000,000 -> mega (boundary)");

var q = Outreach.quoteCalc(
  { followers: 50000, platform: "youtube", deliverable: "integrated", expectedViews: 40000 },
  rateCard, rot);
ok(q.tier === "micro_10k_100k" && q.range[0] === 1000 && q.range[1] === 10000,
  "50K/YouTube -> micro $1,000\u2013$10,000 (real rate card)");
ok(q.quotePoint === 10000, "quote at the top of the range: $10,000");
ok(q.expectedClose === 7700,
  "expected close = top \u00d7 0.77 = $7,700 (23% listed-vs-accepted)");
ok(q.cpm.impliedCpmAtQuote === 250, "implied CPM at quote: 250");
ok(q.cpm.band[0] === 20 && q.cpm.band[1] === 35,
  "integrated uses the youtube_integrated_slot band $20\u2013$35");
ok(/above/.test(q.cpm.note),
  "CPM note flags 250 as above the integrated band (dedication-level pricing)");

var qd = Outreach.quoteCalc(
  { followers: 50000, platform: "youtube", deliverable: "dedicated", expectedViews: 40000 },
  rateCard, rot);
ok(qd.cpm.band[0] === 20 && qd.cpm.band[1] === 50 &&
   qd.cpm.deliverableLabel === "Dedicated video",
  "dedicated uses the rule-of-thumb band $20\u2013$50, labeled as rule-of-thumb");
ok(/not a benchmark/i.test(qd.cpm.basis), "dedicated basis admits it is not a benchmark");

var qs = Outreach.quoteCalc(
  { followers: 50000, platform: "instagram", deliverable: "short", expectedViews: 40000 },
  rateCard, rot);
ok(qs.range[0] === 200 && qs.range[1] === 3200,
  "50K/Instagram short -> micro IG range $200\u2013$3,200");
ok(qs.cpm.band[0] === 22.4 && qs.cpm.band[1] === 22.4,
  "IG short cross-check uses the $22.40 median Reel CPM");
ok(qs.cpm.impliedCpmAtQuote === 80, "implied CPM at $3,200 / 40K views = 80");

var qz = Outreach.quoteCalc(
  { followers: 5000, platform: "tiktok", deliverable: "short", expectedViews: 0 },
  rateCard, rot);
ok(qz.cpm.impliedCpmAtQuote === null && /last-10-video average/.test(qz.cpm.note),
  "no expected views -> no invented CPM, asks for the real average");
ok(qz.tier === "nano_1k_10k" && qz.range[0] === 50 && qz.range[1] === 300,
  "5K/TikTok -> nano $50\u2013$300");

var qx = Outreach.quoteCalc({ followers: 2000000, platform: "youtube", deliverable: "integrated", expectedViews: 500000 }, rateCard, rot);
ok(qx.range[0] === 50000 && qx.range[1] === 300000,
  "2M/YouTube -> mega $50,000\u2013$300,000");

ok(/Not financial advice/i.test(q.disclaimer) && /never a quote/i.test(q.disclaimer),
  "quoteCalc carries the not-financial-advice / never-a-quote disclaimer");
ok(/2\u20133\u00d7/.test(q.disclaimer),
  "disclaimer names the 2\u20133\u00d7 benchmark disagreement");
ok(/separate line items/i.test(q.usageRightsNote),
  "usage rights kept as separate line items, never folded into the range");
ok(/41%/.test(q.guidance), "guidance carries the 41% package-discount figure");
ok(Outreach.LISTED_VS_ACCEPTED === 0.23, "LISTED_VS_ACCEPTED = 0.23");

/* ---------- 5. renderPitch ---------- */
console.log("renderPitch");
var rendered = Outreach.renderPitch(cold,
  { your_name: "Maya", channel_name: "Maya Makes", brand: "Acme" });
ok(rendered.indexOf("Maya") !== -1 && rendered.indexOf("Acme") !== -1 &&
   rendered.indexOf("[Niche]") !== -1,
  "filled placeholders replaced; unfilled [brackets] stay visible");
ok(rendered.indexOf("Subject:") === 0, "render starts with the subject line");
ok(!/\{\{\w+\}\}/.test(Outreach.renderPitch({ subject: "s", body: "Hi {{x}}" }, { x: "y" })),
  "mustache placeholders also fill");

/* ---------- 6. contractRisk ---------- */
console.log("contractRisk");
var flags = templates.contract_flags;
var r0 = Outreach.contractRisk([], flags);
ok(r0.verdict === "clean" && r0.score === 0, "no flags -> clean, score 0");

flags.forEach(function (f) {
  var single = Outreach.contractRisk([f.id], flags);
  if (f.severity === "walk_away") {
    ok(single.verdict === "dont_sign", "'" + f.title + "' alone -> don't sign");
  } else {
    ok(single.verdict !== "dont_sign", "'" + f.title + "' alone does not force don't-sign");
  }
});
var walkCount = flags.filter(function (f) { return f.severity === "walk_away"; }).length;
ok(walkCount === 2, "2 walk_away contract flags (IP assignment, one-sided termination)");

var twoMajors = Outreach.contractRisk(["usage_vague_all_media", "exclusivity_auto_renew"], flags);
ok(twoMajors.score === 4 && twoMajors.verdict === "dont_sign",
  "two majors = 4 points -> don't sign (3+ rule)");
var majorMinor = Outreach.contractRisk(["no_payment_schedule", "no_ftc_disclosure"], flags);
ok(majorMinor.score === 3 && majorMinor.verdict === "dont_sign",
  "major + minor = 3 points -> don't sign");
var oneMajor = Outreach.contractRisk(["moral_clause_one_sided"], flags);
ok(oneMajor.score === 2 && oneMajor.verdict === "caution",
  "one major = 2 points -> caution");
var twoMinors = Outreach.contractRisk(["approval_no_timeline", "scope_creep_language"], flags);
ok(twoMinors.score === 2 && twoMinors.verdict === "caution",
  "two minors = 2 points -> caution");
var ignored = Outreach.contractRisk(["not_a_flag"], flags);
ok(ignored.verdict === "clean" && ignored.items.length === 0,
  "unknown flag ids are ignored, not scored");
var withItems = Outreach.contractRisk(["payment_on_metrics"], flags);
ok(withItems.items.length === 1 && /guaranteed views/i.test(withItems.items[0].title) &&
   withItems.items[0].fix.length > 0,
  "risk summary carries the plain-language detail + fix per item");
ok(/fix the flagged terms in writing/i.test(withItems.verdictText),
  "caution verdict text is plain language");
ok(/NOT legal advice/i.test(withItems.disclaimer),
  "contractRisk carries the NOT-legal-advice disclaimer");

console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
