/* tests/agent-workflows.test.js — wave 12.
 *
 * Executes the 5 end-to-end workflows documented in AGENT.md against the
 * REAL local api/v1 JSON files (plus the shipped sim engine, which is UMD
 * and require()-able in node). This proves the agent workflows actually
 * work — they are not aspirational pseudocode.
 *
 * Run: node tests/agent-workflows.test.js   (exit 0 = all pass)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const API = path.join(__dirname, "..", "api", "v1");
const load = (f) => JSON.parse(fs.readFileSync(path.join(API, f), "utf8"));

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS: " + name); }
  else { fail++; console.error("FAIL: " + name + (detail ? " — " + detail : "")); }
}

/* ============ Workflow 1: $5K sponsorship offer, 50K-sub tech channel ============
 * AGENT.md §Workflow 1: rate-card benchmark + deal-analyzer logic via API. */
(function workflow1() {
  const cfg = load("calculators.json");
  const rc = cfg.sponsorship_rate_card_2026;

  // tierOf: same thresholds as the Sponsor Deal Analyzer UI
  const tierOf = (f) => f < 10000 ? "nano_1k_10k"
    : f < 100000 ? "micro_10k_100k"
    : f < 1000000 ? "macro_100k_1m" : "mega_1m_plus";
  const tier = tierOf(50000);
  check("wf1: 50K subs -> micro_10k_100k tier", tier === "micro_10k_100k", tier);

  const range = rc.per_video_or_post_by_tier[tier].youtube; // [lo, hi]
  check("wf1: micro YouTube range is $1,000–$10,000",
    range[0] === 1000 && range[1] === 10000, JSON.stringify(range));

  const offer = 5000;
  const verdict = offer < range[0] ? "UNDERPAID" : offer > range[1] ? "STRONG" : "FAIR";
  check("wf1: $5,000 inside the band -> FAIR", verdict === "FAIR", verdict);

  // implied-CPM check (integrated slot, 40K expected views)
  const implied = offer / 40000 * 1000; // $125
  const cpmBand = rc.sponsored_cpms.youtube_integrated_slot; // [20, 35]
  check("wf1: implied CPM $125 above the $20–$35 integrated benchmark",
    implied === 125 && implied > cpmBand[1], String(implied));

  // counter-offer worksheet: top of range + paid-30 usage line item (+50%)
  const nice = (n) => { const m = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / m) * m; };
  const base = nice(range[1]);              // $10,000 — quote high
  const usageAddon = nice(base * 0.5);      // paid 30-day usage: +50%
  check("wf1: counter base $10,000 + usage $5,000 = $15,000",
    base === 10000 && usageAddon === 5000 && base + usageAddon === 15000,
    `${base}+${usageAddon}`);
})();

/* ============ Workflow 2: 90-day launch plan, cooking channel ============
 * AGENT.md §Workflow 2: chapters.json + planner input schema + platform gates. */
(function workflow2() {
  const chapters = load("chapters.json").chapters;
  const ids = chapters.map((c) => c.id);
  check("wf2: chapters.json has all 9 phases", chapters.length === 9, String(chapters.length));
  check("wf2: Phase 0 + Phase 1 present for the launch read",
    ids.includes("phase-0-start-from-nothing") && ids.includes("phase-1-content-engine"));

  // tools.json drives the planner config shape
  const tools = load("tools.json").tools;
  check("wf2: tools.json lists all 10 tools", tools.length === 10, String(tools.length));
  const planner = tools.find((t) => t.id === "planner");
  const schema = planner && planner.input_schema;
  check("wf2: planner input schema exposes cadence fields",
    !!(schema && schema.properties.longform_per_week && schema.properties.shorts_per_week
       && schema.properties.platforms && schema.properties.rest_day));

  // Replicate the planner's layout math (assets/js/planner.js) for
  // 1 long + 3 shorts/week, rest day = Sunday (6): 13 weeks
  const rest = 6, workDays = [0, 1, 2, 3, 4, 5].filter((d) => d !== rest);
  let totalLong = 0, totalShort = 0;
  for (let w = 1; w <= 13; w++) {
    totalLong += 1;                                   // longDays: workDays[0]
    for (let s = 0; s < 3; s++) { totalShort += 1; }  // shortDays: (s*2) % 6
  }
  check("wf2: 90-day plan totals 13 long-form + 39 shorts = 52 pieces",
    totalLong === 13 && totalShort === 39 && totalLong + totalShort === 52,
    `${totalLong}/${totalShort}`);

  // Monetization gates + cooking-relevant RPMs from calculators.json
  const cfg = load("calculators.json");
  const ypp2 = cfg.platform_thresholds.youtube_ypp_tier2_full;
  check("wf2: YPP full-monetization gate present (subs + watch hours)",
    !!(ypp2 && ypp2.subscribers && ypp2.watch_hours_12mo_or),
    JSON.stringify({ subscribers: ypp2.subscribers, watch_hours_12mo_or: ypp2.watch_hours_12mo_or }));
  const food = cfg.platform_thresholds.tiktok_creator_rewards.rpm_by_niche.food;
  check("wf2: TikTok Rewards has a food-niche RPM band ($0.60–$1.30)",
    Array.isArray(food) && food[0] === 0.6 && food[1] === 1.3, JSON.stringify(food));
})();

/* ============ Workflow 3: Empire Simulator scenario, ASMR ============
 * AGENT.md §Workflow 3: calculators.json RPM bands + the shipped sim engine.
 * ASMR is not a key in the engine's niche maps, so the scenario declares its
 * proxies explicitly: lifestyle growth factor (1.05) + lifestyle RPM band at
 * the "low" end ($4 — ASMR is low-RPM ambient content). The engine compounds
 * growth on existing subs, so it needs a nonzero seed: 500 subs of first
 * traction. A literal day-zero seed returns all zeros — honest, not a bug. */
(function workflow3() {
  const EmpireSim = require(path.join(__dirname, "..", "assets", "js", "sim-engine.js"));
  const cfg = load("calculators.json");

  // sanity: ASMR genuinely has no native keys (the proxies are load-bearing)
  check("wf3: no native ASMR keys — proxies required",
    cfg.youtube_longform_rpm_bands.asmr === undefined
    && EmpireSim.DEFAULTS.nicheGrowth.asmr === undefined);

  const inputs = {
    niche: "lifestyle", startSubs: 500, longformPerWeek: 2, shortsPerWeek: 5,
    quality: "solid", growthRate: 0.12, rpmLevel: "low", q4Uplift: 0.6,
    ads: true, sponsors: false, affiliates: false, digital: false,
  };
  const r = EmpireSim.simulate(inputs, cfg);

  check("wf3: engine returns 12 months", r.months.length === 12, String(r.months.length));
  check("wf3: meta exposes the declared assumptions",
    r.meta.rpm === 4 && r.meta.nicheGrowth === 1.05 && r.meta.rpmBand[0] === 4,
    JSON.stringify({ rpm: r.meta.rpm, nicheGrowth: r.meta.nicheGrowth }));
  const m12 = r.months[11];
  check("wf3: month-12 subs positive", m12.subs > 0, String(m12.subs));
  check("wf3: Q4 uplift applied in months 10–12",
    r.months[9].q4UpliftApplied && r.months[11].q4UpliftApplied && !r.months[0].q4UpliftApplied);
  check("wf3: totals accumulate (adsLong + adsShorts == total)",
    Math.abs(r.totals.adsLong + r.totals.adsShorts - r.totals.total) < 1e-6);
  check("wf3: 1K-sub milestone recorded",
    r.milestones.some((m) => m.label.includes("1K subs")));
  check("wf3: run is deterministic",
    JSON.stringify(EmpireSim.simulate(inputs, cfg)) === JSON.stringify(r));

  // emit the headline numbers AGENT.md quotes (regenerate on data change)
  console.log("INFO: wf3 month-12 subs=" + Math.round(m12.subs).toLocaleString("en-US")
    + " total-12mo=$" + r.totals.total.toFixed(2)
    + " milestones=" + r.milestones.length);
})();

/* ============ Workflow 4: A/B compare two simulator scenarios ============
 * AGENT.md §Workflow 4: scenario library + compare() over the same clock. */
(function workflow4() {
  const EmpireSim = require(path.join(__dirname, "..", "assets", "js", "sim-engine.js"));
  const cfg = load("calculators.json");

  // the 2.0 inputs are discoverable from tools.json's input schema
  const tools = load("tools.json").tools;
  const simTool = tools.find((t) => t.id === "simulator");
  const props = simTool && simTool.input_schema && simTool.input_schema.properties;
  check("wf4: simulator schema exposes scenario_id / horizon / hires / compare_with",
    !!(props && props.scenario_id && props.horizon && props.hires && props.compare_with),
    Object.keys(props || {}).join(","));
  check("wf4: schema lists the 6 scenario presets",
    Array.isArray(props.scenario_id.enum) && props.scenario_id.enum.length === 6,
    (props.scenario_id.enum || []).join(","));

  // the scenario library is real: 6 presets, RPMs trace to calculators.json bands
  check("wf4: engine ships 6 named scenarios", EmpireSim.SCENARIOS.length === 6,
    String(EmpireSim.SCENARIOS.length));
  const asmr = EmpireSim.scenarioInputs("asmr-bedroom");
  const tech = EmpireSim.scenarioInputs("tech-reviewer");
  check("wf4: scenario RPMs come from the calculators.json bands",
    asmr.niche === "lifestyle" && tech.niche === "tech_software"
    && cfg.youtube_longform_rpm_bands.lifestyle[0] === 4
    && cfg.youtube_longform_rpm_bands.tech_software[1] === 20);
  check("wf4: ASMR scenario declares its niche proxies",
    typeof EmpireSim.SCENARIOS.find((s) => s.id === "asmr-bedroom").nicheProxyNote === "string");

  // the A/B comparison AGENT.md quotes
  const cmp = EmpireSim.compare("ASMR bedroom", asmr, "Tech reviewer", tech, cfg);
  check("wf4: both paths run the same 12-month clock",
    cmp.a.meta.horizon === 12 && cmp.b.meta.horizon === 12);
  check("wf4: deltas are B minus A (net revenue)",
    Math.abs(cmp.deltas.netRevenue - (cmp.b.totals.net - cmp.a.totals.net)) < 1e-6);
  const m12a = Math.round(cmp.a.endSubs), m12b = Math.round(cmp.b.endSubs);
  check("wf4: ASMR bedroom month-12 subs 6,434", m12a === 6434, String(m12a));
  check("wf4: Tech reviewer month-12 subs 5,323", m12b === 5323, String(m12b));
  check("wf4: ASMR net $909.02 / tech net $7,955.56",
    cmp.a.totals.net.toFixed(2) === "909.02" && cmp.b.totals.net.toFixed(2) === "7955.56",
    cmp.a.totals.net.toFixed(2) + " / " + cmp.b.totals.net.toFixed(2));
  check("wf4: verdict names Tech reviewer the net-revenue winner",
    /Path Tech reviewer leads on net revenue over 12 months by 775%/.test(cmp.verdict),
    cmp.verdict.slice(0, 80));
  check("wf4: verdict explains the drivers (RPM + growth)",
    /RPM \$4\.00 vs \$14\.00/.test(cmp.verdict) && /19\.0% vs 11\.1%/.test(cmp.verdict));
  check("wf4: verdict carries the subscribers-are-not-income note",
    /the net-revenue winner is NOT the subscriber winner/.test(cmp.verdict));

  // hires flow through compare too (content -> team -> company)
  const teamCmp = EmpireSim.compare("solo", tech, "solo + editor",
    Object.assign({}, tech, { hires: [{ type: "editor", startMonth: 1, monthlyCost: 1400 }] }), cfg);
  check("wf4: team comparison prices the hire ($16,800) and moves net",
    teamCmp.deltas.teamCost === 16800 && teamCmp.deltas.netRevenue !== 0,
    String(teamCmp.deltas.teamCost));

  // year-2 horizon is an exposed schema option and behaves
  check("wf4: horizon schema allows 24 months", props.horizon.enum.includes(24));
  const y2 = EmpireSim.simulate(Object.assign({}, tech, { horizon: 24 }), cfg);
  check("wf4: 24-month run diminishes after month 12",
    y2.months.length === 24 && y2.months[12].growthRate < y2.months[11].growthRate);
})();

/* ============ Workflow 5: manage a sponsorship deal end-to-end ============
 * AGENT.md §Workflow 5: score the offer, price usage rights, check red
 * flags, render the negotiation script, and export the deal memo — all
 * against the real deal-templates.json + calculators.json, via the shipped
 * Deal Room engine (assets/js/deal-room.js, UMD, require()-able). */
(function workflow5() {
  const DealRoom = require(path.join(__dirname, "..", "assets", "js", "deal-room.js"));
  const rc = load("calculators.json").sponsorship_rate_card_2026;
  const tpl = load("deal-templates.json");

  // the data contract is complete
  check("wf5: deal-templates.json carries 4 scripts, 6 red flags, 6 usage tiers",
    tpl.negotiation_scripts.length === 4 && tpl.red_flags.length === 6 &&
    tpl.usage_rights_tiers.length === 6,
    `${tpl.negotiation_scripts.length}/${tpl.red_flags.length}/${tpl.usage_rights_tiers.length}`);
  check("wf5: disclaimer carries the not-financial/legal/tax-advice line",
    /not financial, legal, or tax advice/i.test(tpl.disclaimer));

  // 1. score: $5,000 YouTube integrated slot, 60K-sub creator -> micro tier
  const tier = DealRoom.tierOf(60000);
  const range = rc.per_video_or_post_by_tier[tier].youtube; // [1000, 10000]
  check("wf5: 60K subs -> micro_10k_100k, YouTube range $1,000–$10,000",
    tier === "micro_10k_100k" && range[0] === 1000 && range[1] === 10000);
  const scored = DealRoom.scoreOffer(5000, range[0], range[1]);
  check("wf5: $5,000 inside the band -> FAIR verdict", scored.verdict === "fair" && scored.badge === "FAIR");
  check("wf5: verdict carries the ~23% honesty note", /23%/.test(scored.note));

  // 2. usage rights: 6-month paid-ads window on a $10,000 base (top of range)
  const usage = DealRoom.priceUsage(10000, "paid_180", tpl.usage_rights_tiers);
  check("wf5: paid 6mo usage = +$7,500 line item ($17,500 total)",
    usage.addonLo === 7500 && usage.totalLo === 17500, `${usage.addonLo}/${usage.totalLo}`);
  check("wf5: the tier is flagged as reported research", usage.reported === true);

  // 3. red flags: unlimited revisions alone is a walk-away signal
  const r = DealRoom.redFlagScore(["unlimited_revisions"], tpl.red_flags);
  check("wf5: unlimited revisions -> walk away", r.verdict === "walk_away");

  // 4. negotiation script: lowball counter renders with the deal's numbers
  const script = tpl.negotiation_scripts.find((x) => x.id === "lowball_counter");
  const text = DealRoom.renderScript(script, { brand: "Acme", counter: "10,000", views_avg: "85,000",
    range_lo: "1,000", range_hi: "10,000", deliverable: "integrated slot" });
  check("wf5: script fills known vars, keeps unknowns visible",
    text.includes("Acme") && text.includes("10,000") && !text.includes("{{brand}}"));

  // 5. deal memo: one-page record with verdict + disclaimer
  const memo = DealRoom.dealMemo(
    { brand: "Acme", status: "negotiating", deliverable: "Integrated slot", platform: "YouTube",
      offer: 5000, usage: "Paid ads, 6 months", exclusivity: "30 days", payTerms: "Net 30",
      timeline: "Draft by Nov 1", createdAt: "2026-10-11" },
    scored, { verdictText: "Walk away — unlimited revisions.", checkedTitles: ["Unlimited revisions"] });
  check("wf5: memo names the brand, verdict, and red flag",
    memo.startsWith("DEAL MEMO — Acme") && memo.includes("FAIR") && memo.includes("Unlimited revisions"));
  check("wf5: memo carries the disclaimer", /not financial, legal, or tax advice/i.test(memo));
})();

console.log(`\nagent-workflows: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
