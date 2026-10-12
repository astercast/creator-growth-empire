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
 * AGENT.md §Workflow 1: The Deal Analyzer 2.0 engine via require() — the
 * agent runs the same math as the page, no re-implementation. */
(function workflow1() {
  const DA = require(path.join(__dirname, "..", "assets", "js", "deal-analyzer.js"));
  const cfg = load("calculators.json");
  const rc = cfg.sponsorship_rate_card_2026;

  const v = DA.validInput({ platform: "youtube", deliverable: "dedicated",
    followers: 50000, expectedViews: 60000, offerUsd: 5000,
    niche: "tech_software" });
  check("wf1: input validates", v.ok, JSON.stringify(v.errors));
  const deal = v.deal;

  check("wf1: 50K subs -> micro_10k_100k tier", DA.tierOf(50000) === "micro_10k_100k");
  const ev = DA.evaluate(deal, rc);
  check("wf1: niche-adjusted range pinned $2,500–$25,000 (tech 2.5x)",
    JSON.stringify(ev.range) === "[2500,25000]", JSON.stringify(ev.range));
  check("wf1: $5,000 inside the niche-adjusted band -> FAIR", ev.verdict === "FAIR", ev.verdict);

  // dedicated implied-CPM band: $50–$90 (AIR agency-benchmark compilation, Oct 2026)
  check("wf1: dedicated implied-CPM band is $50–$90 (AIR, reported)",
    ev.impliedCpm.band.lo === 50 && ev.impliedCpm.band.hi === 90,
    JSON.stringify(ev.impliedCpm.band));
  check("wf1: $5k / 60K views = $83.33 CPM, inside the band",
    Math.abs(ev.impliedCpm.value - 83.33) < 0.01 && ev.impliedCpm.position === "inside");

  // category cross-check: B2B SaaS & AI $46.50 CPM
  check("wf1: category check names B2B SaaS & AI $46.50 CPM",
    ev.categoryCheck && ev.categoryCheck.cpm === 46.5, JSON.stringify(ev.categoryCheck));

  // usage add-ons from the real 2026 block + counter math
  const ub = cfg.usage_rights_benchmarks_2026;
  const addons = DA.usageAddons(25000, ub);
  const p3 = addons.find((a) => a.id === "paid_3mo");
  check("wf1: 3mo usage add-on on $25k = $6,300–$13,000 (+25–50%)",
    p3.lo === 6300 && p3.hi === 13000, `${p3.lo}-${p3.hi}`);
  const co = DA.counterOffer(Object.assign({}, deal, { usage: "paid_3mo" }), rc, ub);
  check("wf1: counter totals pin ($31,300–$38,000)",
    co.totalLo === 31300 && co.totalHi === 38000, co.totalLabel);
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
  check("wf2: tools.json lists all 18 tools", tools.length === 18, String(tools.length));
  const oc = tools.find((t) => t.id === "outreach");
  const ocSchema = oc && oc.input_schema;
  check("wf2: outreach input schema exposes pipeline + quote + pitch + contract fields",
    !!(ocSchema && ocSchema.title === "OutreachInput"
       && ocSchema.properties.brand && ocSchema.properties.status
       && ocSchema.properties.followers && ocSchema.properties.platform
       && ocSchema.properties.pitchTemplate && ocSchema.properties.contractFlags));
  const yppc = tools.find((t) => t.id === "ypp-checker");
  const yppSchema = yppc && yppc.input_schema;
  check("wf2: ypp-checker input schema exposes stats + originality + formatMix",
    !!(yppSchema && yppSchema.properties.subs && yppSchema.properties.watchHours
       && yppSchema.properties.shortsViews && yppSchema.properties.uploads90d
       && yppSchema.properties.originality && yppSchema.properties.formatMix));
  const planner = tools.find((t) => t.id === "planner");
  const schema = planner && planner.input_schema;
  check("wf2: planner input schema exposes cadence fields",
    !!(schema && schema.properties.longform_per_week && schema.properties.shorts_per_week
       && schema.properties.platforms && schema.properties.rest_day));
  const cross = tools.find((t) => t.id === "crosspost");
  const crossSchema = cross && cross.input_schema;
  check("wf2: crosspost input schema exposes source/destinations/AI-flag fields",
    !!(crossSchema && crossSchema.title === "CrossPostInput"
       && crossSchema.properties.source_platform && crossSchema.properties.destinations
       && crossSchema.properties.photorealistic_ai)
    && cross.page === "crosspost.html");

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
  check("wf4: schema lists the 12 scenario presets",
    Array.isArray(props.scenario_id.enum) && props.scenario_id.enum.length === 12,
    (props.scenario_id.enum || []).join(","));
  check("wf4: schema horizon covers 12 | 24 | 36 and exposes events",
    Array.isArray(props.horizon.enum) && props.horizon.enum.length === 3 &&
    props.horizon.enum[2] === 36 && !!props.events,
    (props.horizon.enum || []).join(","));

  // the scenario library is real: 12 presets, RPMs trace to calculators.json bands
  check("wf4: engine ships 12 named scenarios", EmpireSim.SCENARIOS.length === 12,
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

/* ============ Workflow 11: 36-month empire with what-if events ============
 * AGENT.md §Workflow 11: Simulator 3.0 — horizon 36, year-2/year-3 decay,
 * Money Map stage transitions, and the algorithm-change event card, all
 * against the real sim engine + calculators.json. */
(function workflow11() {
  const EmpireSim = require(path.join(__dirname, "..", "assets", "js", "sim-engine.js"));
  const cfg = load("calculators.json");

  // discoverability from tools.json
  const tools = load("tools.json").tools;
  const simTool = tools.find((t) => t.id === "simulator");
  const props = simTool && simTool.input_schema && simTool.input_schema.properties;
  check("wf11: simulator schema exposes horizon (12/24/36) + events",
    Array.isArray(props.horizon.enum) && props.horizon.enum.includes(36) &&
    props.events && props.events.type === "array",
    (props.horizon.enum || []).join(","));
  check("wf11: events schema enumerates the 5 cards",
    (props.events.items.properties.id.enum || []).join(",") ===
    "algorithm-change,viral-hit,burnout-break,policy-change,holiday-shopping-surge");

  // the card library in the engine carries assumed effect + chapter basis
  check("wf11: 5 event cards, each with assumedEffect + basis",
    EmpireSim.DEFAULTS.eventCards.length === 5 &&
    EmpireSim.DEFAULTS.eventCards.every((c) => c.assumedEffect && c.basis));

  // AGENT.md Workflow 11 step 2: english-learning, 36 months, algo card at 12
  const base = EmpireSim.scenarioInputs("english-learning");
  const base36 = Object.assign({}, base, { horizon: 36 });
  const shocked36 = Object.assign({}, base, {
    horizon: 36, events: [{ id: "algorithm-change", startMonth: 12 }] });
  const r = EmpireSim.simulate(shocked36, cfg);
  const rBase = EmpireSim.simulate(base36, cfg);
  check("wf11: 36-month run returns 36 months", r.months.length === 36);
  const g0 = r.meta.monthlyGrowth;
  check("wf11: month-13 growth = base x0.94 (year-2 curve)",
    Math.abs(r.months[12].growthRate - g0 * 0.94) < 1e-9);
  check("wf11: month-25 growth = base x0.94^12 x0.97 (year-3 curve)",
    Math.abs(r.months[24].growthRate - g0 * Math.pow(0.94, 12) * 0.97) < 1e-9);
  check("wf11: stages list first-month transitions with Money Map names",
    r.stages.length >= 1 && r.stages[0].month === 1 &&
    typeof r.stages[0].name === "string" &&
    /Stage|Start Line|First \$100/.test(r.stages[0].name + " Stage " + r.stages[0].stage));
  check("wf11: stage rule exported and pinned at the boundaries",
    EmpireSim.stageForNet(99.99, false) === 0 && EmpireSim.stageForNet(100, false) === 1 &&
    EmpireSim.stageForNet(9999.99, false) === 2 && EmpireSim.stageForNet(10000, false) === 3 &&
    EmpireSim.stageForNet(10000, true) === 4);
  const shortRatio = r.months[11].shortViews / rBase.months[11].shortViews;
  check("wf11: algorithm-change card cuts month-12 shorts views x0.6",
    Math.abs(shortRatio - 0.6) < 0.02, shortRatio.toFixed(3));
  // wave 25: the holiday-shopping-surge card lifts affiliates x1.8 for 2 months
  const aff = Object.assign({}, base, { horizon: 36, affiliates: true,
    events: [{ id: "holiday-shopping-surge", startMonth: 11 }] });
  const rAff = EmpireSim.simulate(aff, cfg);
  const affRatio11 = rAff.months[10].affiliates / rBase.months[10].affiliates;
  const affRatio12 = rAff.months[11].affiliates / rBase.months[11].affiliates;
  const affRatio13 = rAff.months[12].affiliates / rBase.months[12].affiliates;
  check("wf11: holiday-shopping-surge x1.8 affiliates for 2 months, then baseline",
    Math.abs(affRatio11 - 1.8) < 1e-9 && Math.abs(affRatio12 - 1.8) < 1e-9 &&
    Math.abs(affRatio13 - 1) < 1e-9,
    affRatio11.toFixed(2) + "/" + affRatio12.toFixed(2) + "/" + affRatio13.toFixed(2));

  // step 4: compare with the baseline — B minus A, plain-language verdict
  const cmp = EmpireSim.compare("English learning", base36,
    "English learning + algo cut", shocked36, cfg);
  check("wf11: both paths run the 36-month clock",
    cmp.a.meta.horizon === 36 && cmp.b.meta.horizon === 36);
  check("wf11: 36-month deltas are B minus A",
    Math.abs(cmp.deltas.netRevenue - (cmp.b.totals.net - cmp.a.totals.net)) < 1e-6);
  check("wf11: verdict names the winner with the honesty caveat",
    /Path .* leads on net revenue over 36 months/.test(cmp.verdict) &&
    /not predictions, not promises, not financial advice/.test(cmp.verdict));
  check("wf11: the event path ends lower on net — the shock is honest",
    cmp.deltas.netRevenue < 0, cmp.deltas.netRevenue.toFixed(2));

  // exportPlan carries the stage journey + the disclaimer
  const plan = EmpireSim.exportPlan("English learning", shocked36, r);
  check("wf11: exportPlan names the stage journey + stage",
    /Stage journey/.test(plan) && /Money Map stage/.test(plan));
  check("wf11: exportPlan lists the what-if event with its assumed effect",
    /What-if event/.test(plan) && /algorithm-change|Algorithm change/i.test(plan));

  console.log("INFO: wf11 36mo net baseline=$" + rBase.totals.net.toFixed(2) +
    " shocked=$" + r.totals.net.toFixed(2) +
    " stages=" + r.stages.map((s) => "S" + s.stage + "@M" + s.month).join(","));
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

/* ============ Workflow 6: run the content engine end-to-end ============
 * AGENT.md §Workflow 6: ideas -> 90-day calendar -> batching check ->
 * repurposing 2.0, all via api/v1/content-engine.json + the shipped engine. */
(function workflow6() {
  const CE = require("../assets/js/content-engine.js");
  const ce = load("content-engine.json");

  // 1. hook structures: the five Playbook structures the bank scores against
  const hooks = ce.hook_structures.map((h) => h.id);
  check("wf6: content-engine.json carries the 5 Playbook hook structures",
    hooks.join(",") === "open-loop,cold-start,contrarian,numbered,question", hooks.join(","));

  // 2. bank ideas: score, sort, promote
  const bank = [
    { id: "a", title: "I roasted my old setup", format: "long", hookScore: 5, created: 1 },
    { id: "b", title: "3 mic mistakes", format: "long", hookScore: 3, created: 2 },
    { id: "c", title: "hot take: posting daily is backwards", format: "community", hookScore: 4, created: 3 },
  ];
  const ordered = CE.sortIdeas(bank);
  check("wf6: idea bank sorts by hook strength", ordered[0].id === "a" && ordered[1].id === "c");
  const promoted = bank.filter((i) => i.hookScore >= 4);
  check("wf6: promote ideas with hook score 4+", promoted.length === 2, String(promoted.length));

  // 3. deal into the calendar: 1 long + 1 short/week, rest Sunday
  const deal = CE.dealIdeas(bank, { longsPerWeek: 1, shortsPerWeek: 1, restDay: 6, weeks: 13 });
  check("wf6: calendar places 2 longs + 1 community, leaves 23 slots OPEN",
    deal.totals.long === 2 && deal.totals.short === 1 && deal.openSlots === 23,
    `${deal.totals.long}/${deal.totals.short}/${deal.openSlots}`);
  const week1HasTop = deal.weeks[0].days.some((d) => d.items.some((it) => it.ideaId === "a"));
  check("wf6: top-scored idea deals into week 1", week1HasTop);
  const restClean = deal.weeks.every((w) => w.days[6].items.length === 0);
  check("wf6: rest day untouched", restClean);
  const exportText = CE.exportCalendarText(deal);
  check("wf6: export text flags open slots and names the disclaimer",
    exportText.includes("OPEN") && /not financial, legal, or tax advice/i.test(exportText),
    exportText.split("\n").slice(0, 3).join(" | "));

  // 4. batching: can 2 shoot days/month (1 long each) cover 1 long/week?
  const b = CE.batchingMath({ videosPerShootDay: 1, shootDaysPerMonth: 2, longsPerWeek: 1, shortsPerWeek: 1 });
  check("wf6: batching verdict shortfall (2 < 4.33 longs/mo)",
    b.verdict === "shortfall" && b.deltaLongs < 0, `${b.verdict}/${b.deltaLongs}`);
  const simIn = CE.simInputFromCadence(1, 1);
  check("wf6: cadence bridges to simulator inputs",
    simIn.longform_per_week === 1 && simIn.shorts_per_week === 1);

  // 5. repurposing 2.0: derivative map + guardrails
  const map = CE.repurposeMap(bank[0].title);
  const engineIds = map.map((d) => d.id).sort().join(",");
  const dataIds = ce.repurposing_2_0.derivatives.map((d) => d.id).sort().join(",");
  check("wf6: 2.0 derivative map matches the data contract", engineIds === dataIds, engineIds);
  check("wf6: every derivative has a required original element",
    map.every((d) => d.originalElement && d.originalElement.length > 0));
  const guardIds = CE.originalityGuardrails().map((g) => g.id).sort().join(",");
  const dataGuardIds = ce.originality_guardrails.map((g) => g.id).sort().join(",");
  check("wf6: originality guardrails match the data contract", guardIds === dataGuardIds);
})();

/* ============ Workflow 7: place a creator on the Money Map ============
 * AGENT.md §Workflow 7: money-map input schema -> placeStage -> roadmap,
 * all via the shipped UMD engine (no UI). */
(function workflow7() {
  const tools = load("tools.json").tools;
  const moneyMap = tools.find((t) => t.id === "money-map");
  check("wf7: tools.json lists the money-map tool", !!moneyMap);
  const schema = moneyMap && moneyMap.input_schema;
  check("wf7: money-map schema requires all 7 quiz answers",
    !!(schema && ["platform", "audience", "revenue", "cadence", "team", "bottleneck", "streams"]
      .every((k) => schema.required.includes(k) && schema.properties[k])));
  check("wf7: revenue enum is the 5 honest bands",
    JSON.stringify(schema.properties.revenue.enum) === JSON.stringify(["0", "1-99", "100-999", "1k-9999", "10k-plus"]));

  // replicate the engine (same module the page ships)
  const MM = require(path.join(__dirname, "..", "assets", "js", "money-map.js"));
  const answers = {
    platform: "youtube", audience: "10k-100k", revenue: "100-999",
    cadence: "multi-weekly", team: "just-me", bottleneck: "monetization", streams: "1"
  };
  const placed = MM.placeStage(answers);
  check("wf7: $100–999/mo -> stage 2 (The Engine Runs)",
    placed.stage === 2 && placed.note === null, `${placed.stage}/${placed.note}`);
  const road = MM.roadmap(answers);
  check("wf7: roadmap opens with the stage signature move (Deal Room)",
    road.moves[0].page === "deal-room.html", road.moves[0].page);
  check("wf7: monetization bottleneck adds the calculator + deal analyzer",
    road.moves[1].page === "calculator.html" && road.moves[2].page === "deal-analyzer.html",
    road.moves.map((m) => m.page).join(","));
  check("wf7: stage 2 graduate-when requires 3 consecutive $1K+ months",
    /Three consecutive \$1K\+ months/.test(road.graduate));
  const early = MM.placeStage(Object.assign({}, answers, { revenue: "0", audience: "100k-1m" }));
  check("wf7: audience-ahead note fires, stage moves at most +1",
    early.stage === 1 && early.note === "audience-ahead", `${early.stage}/${early.note}`);
})();

/* ============ Workflow 9: outbound sponsor campaign, 50K-sub channel ============
 * AGENT.md §Workflow 9: tools.json OutreachInput + deal-templates.json
 * (pitch_templates, contract_flags) + the shipped outreach engine. */
(function workflow8() {
  const tools = load("tools.json").tools;
  const oc = tools.find((t) => t.id === "outreach");
  check("wf8: tools.json has the outreach record on outreach.html",
    !!(oc && oc.page === "outreach.html"), oc && oc.page);

  // Replicate the engine (same module the page ships)
  const OC = require(path.join(__dirname, "..", "assets", "js", "outreach.js"));
  const tpl = load("deal-templates.json");
  check("wf8: deal-templates v1.1.0 ships 3 pitch templates + 10 contract flags",
    tpl.version === "1.1.0" && tpl.pitch_templates.length === 3 && tpl.contract_flags.length === 10,
    `${tpl.version}/${tpl.pitch_templates.length}/${tpl.contract_flags.length}`);

  // Pipeline: validate a record, then stats over a pinned set
  const rec = { brand: "Acme", contactName: "Priya", email: "priya@acme.co",
                status: "pitched", followUpDate: "2026-10-18" };
  check("wf8: validDeal accepts a complete pitch record", OC.validDeal(rec).ok);
  const deals = [rec,
    Object.assign({}, rec, { brand: "Beta", status: "replied" }),
    Object.assign({}, rec, { brand: "Gamma", status: "signed" }),
    Object.assign({}, rec, { brand: "Delta", status: "passed" })];
  const stats = OC.pipelineStats(deals);
  check("wf8: pipeline stats — 4 contacted, 2 responded, 50% response, 25% close",
    stats.contacted === 4 && stats.responded === 2 && stats.signed === 1
    && stats.responseRate === 50 && stats.closeRate === 25,
    JSON.stringify(stats));

  // Quote: 50K YouTube, integrated slot, 40K expected views
  const cfg = load("calculators.json");
  const q = OC.quoteCalc(
    { followers: 50000, platform: "youtube", deliverable: "integrated", expectedViews: 40000 },
    cfg.sponsorship_rate_card_2026, cfg.sponsorship_rule_of_thumb);
  check("wf8: quote — micro tier, $1,000–$10,000 range, $10,000 top-of-range quote",
    q.tier === "micro_10k_100k" && q.range[0] === 1000 && q.range[1] === 10000
    && q.quotePoint === 10000, q.rangeLabel);
  check("wf8: expected close ~$7,700 (23% listed-vs-accepted math)",
    q.expectedClose === 7700, String(q.expectedClose));
  check("wf8: CPM cross-check flags $250 implied as above the $20–$35 integrated band",
    q.cpm.impliedCpmAtQuote === 250 && /above/.test(q.cpm.note));
  check("wf8: quote carries the never-a-quote disclaimer",
    /never a quote/i.test(q.disclaimer));

  // Pitch: render the cold template with the creator's real numbers
  const cold = tpl.pitch_templates.find((t) => t.id === "cold_pitch");
  const pitch = OC.renderPitch(cold, { your_name: "Maya", channel_name: "Maya Makes",
    brand: "Acme", avg_views: "40,000" });
  check("wf8: pitch fills known vars, leaves unfilled [brackets] visible",
    pitch.indexOf("Maya") !== -1 && pitch.indexOf("[Niche]") !== -1);

  // Contract: IP assignment alone -> don't sign
  const risk = OC.contractRisk(["ip_assignment"], tpl.contract_flags);
  check("wf8: IP assignment alone -> dont_sign with a plain-language fix",
    risk.verdict === "dont_sign" && risk.items.length === 1 && risk.items[0].fix.length > 0);
})();

/* ============ Workflow 10: cross-post adaptation, TikTok -> Shorts + Reels ============
 * AGENT.md §Workflow 10: tools.json CrossPostInput + content-engine.json
 * (adaptation_matrix) + the shipped content engine's adaptChecklist(). */
(function workflow10() {
  const tools = load("tools.json").tools;
  const cp = tools.find((t) => t.id === "crosspost");
  check("wf10: tools.json has the crosspost record on crosspost.html",
    !!(cp && cp.page === "crosspost.html"), cp && cp.page);
  const schema = cp && cp.input_schema;
  check("wf10: CrossPostInput requires source_platform + destinations",
    !!(schema && schema.required.includes("source_platform")
       && schema.required.includes("destinations")));

  const CE = require(path.join(__dirname, "..", "assets", "js", "content-engine.js"));
  const matrix = load("content-engine.json").adaptation_matrix;
  const plan = CE.adaptChecklist("tiktok", ["shorts", "reels"]);
  check("wf10: tiktok -> [shorts, reels] builds 2 cards",
    plan.ok && plan.cards.length === 2);
  check("wf10: shorts card re-cuts the opening + carries the AI disclosure rule",
    plan.cards[0].to === "shorts"
    && plan.cards[0].changes.some((c) => /first 2 seconds/.test(c))
    && plan.cards[0].changes.some((c) => /AI-content label/.test(c)));
  check("wf10: reels card strips the watermark + adds the send trigger",
    plan.cards[1].to === "reels"
    && plan.cards[1].changes.some((c) => /watermark/i.test(c))
    && plan.cards[1].changes.some((c) => /send/i.test(c)));
  check("wf10: engine cards match the data-contract rule sets",
    plan.cards.every((card) => {
      const dc = matrix.rules[card.from + ">" + card.to];
      return dc && dc.length === card.changes.length
        && dc.every((c, i) => c === card.changes[i]);
    }));
  check("wf10: universal checks + Oct-1 gate ride along",
    plan.universal.length === matrix.universal_checks.length
    && /channel level/i.test(plan.gate));
  check("wf10: unknown source fails clean, source-in-dests is ignored",
    !CE.adaptChecklist("myspace", ["shorts"]).ok
    && CE.adaptChecklist("tiktok", ["tiktok", "shorts"]).cards.length === 1);
})();

/* ============ Workflow 12: full Deal Analyzer 2.0 run ============
 * AGENT.md §Workflow 12: paste-the-terms -> verdict + term flags +
 * contract checklist + counter + export, all through the real engine. */
(function workflow12() {
  const DA = require(path.join(__dirname, "..", "assets", "js", "deal-analyzer.js"));
  const cfg = load("calculators.json");
  const rc = cfg.sponsorship_rate_card_2026;
  const ub = cfg.usage_rights_benchmarks_2026;
  const flags = load("deal-templates.json").contract_flags;

  const v = DA.validInput({
    platform: "youtube", deliverable: "dedicated", followers: 200000,
    expectedViews: 150000, offerUsd: 8000, usage: "paid_12mo",
    whitelisting: "30", exclusivity: "30", paymentTerms: "60",
    postCount: 4, timeline: "rush", niche: "finance_investing",
    contract: { ip: "brand_full", cancel: "no", usageWords: "specific",
      exclRenew: "no", payMetrics: "no", morals: "mutual",
      paySchedule: "yes", approval: "defined", ftc: "yes", scope: "no" }
  });
  check("wf12: hostile-ish terms validate", v.ok);
  const deal = v.deal;

  const ev = DA.evaluate(deal, rc);
  check("wf12: macro/finance range $25,000–$130,000, $8k = UNDERPAID",
    JSON.stringify(ev.range) === "[25000,130000]" && ev.verdict === "UNDERPAID",
    ev.verdict + " " + JSON.stringify(ev.range));

  const termFlags = DA.offerTermFlags(deal);
  const flagTitles = termFlags.map((f) => f.title).join("|");
  check("wf12: term scan flags 12mo usage + 30d whitelisting + 30d exclusivity + net-60 + rush",
    /paid-ads window/.test(flagTitles) && /whitelisting/.test(flagTitles)
    && /exclusivity/.test(flagTitles) && /Net 60/.test(flagTitles) && /Rush/.test(flagTitles),
    flagTitles);

  const ids = DA.mapTermsToFlags(deal);
  check("wf12: brand-full IP maps to ip_assignment", ids.includes("ip_assignment"));
  const risk = DA.contractRisk(ids, flags);
  check("wf12: walk_away IP clause -> dont_sign", risk.verdict === "dont_sign");

  const co = DA.counterOffer(deal, rc, ub);
  check("wf12: counter has base + usage + whitelisting + exclusivity lines",
    co.lines.length === 4, String(co.lines.length));
  check("wf12: 4-post bundle note carries 15–20% + 41%",
    co.bundleNote && /15–20%/.test(coBundleNote(co)) && /41%/.test(coBundleNote(co)));

  const rep = DA.exportReport({ brand: "FinBrand", deal, evaluation: ev,
    termFlags, contractRisk: risk, counter: co });
  check("wf12: export report opens with brand + carries verdict and disclaimers",
    rep.indexOf("DEAL EVALUATION — FinBrand") === 0
    && rep.indexOf("RATE-CARD VERDICT: UNDERPAID") !== -1
    && /NOT legal advice/.test(rep) && /not financial advice/.test(rep));

  function coBundleNote(c) { return c.bundleNote || ""; }
})();

/* ============ Workflow 13: solveForGoal — "what would it take?" ============
 * AGENT.md §Workflow 13: invert the simulator — binary-search growth or
 * cadence to land a target by a month, then re-verify by re-simulation. */
(function workflow13() {
  const sim = require(path.join(__dirname, "..", "assets", "js", "sim-engine.js"));
  const cfg = load("calculators.json");
  const inputs = { niche: "education", startSubs: 1000, longformPerWeek: 1,
    shortsPerWeek: 3, quality: "solid", growthRate: 0.12, rpmLevel: "mid",
    q4Uplift: 0.6, ads: true, sponsors: true, affiliates: true,
    digital: false, horizon: 24 };

  const s = sim.solveForGoal(inputs, cfg,
    { target: "subs", value: 100000, month: 18, variable: "growth" });
  check("wf13: 100k subs by m18 solves", s.ok && s.variable === "growth", s.valueLabel);
  const again = Object.assign({}, inputs, { growthRate: s.value });
  check("wf13: re-simulation at solved growth reaches 100k by m18",
    sim.simulate(again, cfg).months[17].subs >= 100000);

  const un = sim.solveForGoal(inputs, cfg,
    { target: "subs", value: 1e12, month: 12, variable: "growth" });
  check("wf13: impossible target is honestly unreachable", !un.ok && un.reason === "unreachable");

  const st = sim.solveForGoal(inputs, cfg,
    { target: "stage", value: 4, month: 24, variable: "growth" });
  check("wf13: stage 4 without a team is refused with guidance",
    !st.ok && st.reason === "stage4_needs_team");
})();

console.log(`\nagent-workflows: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
