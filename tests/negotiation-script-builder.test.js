/* Negotiation Script Builder tests. Run: node tests/negotiation-script-builder.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var B = require(path.join(ROOT, "assets", "js", "negotiation-script-builder.js"));
var NK = require(path.join(ROOT, "assets", "js", "negotiation-kit.js"));
var cfg = require(path.join(ROOT, "data", "calculators.json"));
var tplSrc = require(path.join(ROOT, "data", "deal-templates.json"));
var tpl = require(path.join(ROOT, "data", "v1", "deal-templates.json"));
var failures = 0;
function ok(c, n) { if (c) console.log("  PASS " + n); else { failures++; console.log("  FAIL " + n); } }
function stages(r) { return r.lines.map(function (l) { return l.stage; }); }

console.log("script builder — lowball fixture (NK Workflow 15 numbers)");
var base = { scenario: "lowball", brand: "Acme", platform: "youtube", deliverable: "integrated",
  followers: 50000, expectedViews: 60000, offer: 500, niche: "tech_software", usage: "paid_6mo" };
var r = B.buildScript(base, cfg, tpl, NK);
ok(r.ok, "lowball script builds");
ok(JSON.stringify(stages(r)) === JSON.stringify(["opener", "anchor", "concession", "concession", "concession", "walk-away"]),
  "stage order: opener, anchor, 3 concessions, walk-away");
ok(r.lines.filter(function (l) { return l.stage === "concession"; }).map(function (l) { return l.step; }).join(",") === "1,2,3",
  "concession ladder is steps 1,2,3");
ok(r.counter.total[0] === 38000 && r.counter.total[1] === 44000,
  "anchor numbers = NK counter total $38,000–$44,000 (Workflow 15 fixture)");
ok(r.lines[1].text.indexOf("$38,000–$44,000") >= 0, "anchor line carries the counter total word-for-word");
ok(r.walkAway === 2500 && r.lines[5].text.indexOf("$2,500") >= 0,
  "walk-away line carries the $2,500 floor (NK walk-away fixture)");
ok(r.lines.every(function (l) { return l.sources.length > 0 && l.grounded_in.length > 10; }),
  "every line names source script(s) and grounded_in provenance");
var allIds = {};
tpl.negotiation_kit_scripts.forEach(function (s) { allIds[s.id] = 1; });
tplSrc.negotiation_scripts.forEach(function (s) { allIds[s.id] = 1; });
tpl.negotiation_scripts.forEach(function (s) { allIds[s.id] = 1; });
ok(r.lines.every(function (l) { return l.sources.every(function (id) { return allIds[id]; }); }),
  "every cited source id exists in deal-templates.json");

console.log("script builder — other covered scenarios");
var u = B.buildScript(Object.assign({}, base, { scenario: "usage_grab", offer: 5000 }), cfg, tpl, NK);
ok(u.ok && u.lines[0].sources.indexOf("usage_rights_reply") >= 0 &&
   /separate line/.test(u.lines[1].text), "usage grab: opener+anchor from usage_rights scripts, usage as separate line");
var x = B.buildScript(Object.assign({}, base, { scenario: "exclusivity_lockin", offer: 5000,
  exclusivity: { scope: "named", months: 1 } }), cfg, tpl, NK);
ok(x.ok && x.lines[0].sources.indexOf("exclusivity_pushback") >= 0 &&
   /\+25%/.test(x.lines.map(function (l) { return l.text; }).join(" ")),
  "exclusivity: from exclusivity_pushback, named 30-day +25% lever present");
var lp = B.buildScript(Object.assign({}, base, { scenario: "late_payment", offer: 2500,
  invoiceAmount: 2500, invoiceDate: "September 3", daysOverdue: 14 }), cfg, tpl, NK);
ok(lp.ok && lp.lines[0].text.indexOf("$2,500") >= 0 && lp.lines[0].text.indexOf("14 days past due") >= 0 &&
   /pausing further deliverables/.test(lp.lines[5].text),
  "late payment: invoice anchor in opener, pause line as walk-away");

console.log("script builder — exclusions and provenance gate");
["ip_assignment", "view_guarantee_clawback", "morality_clause", "perpetual_buyout"].forEach(function (id) {
  var e = B.buildScript(Object.assign({}, base, { scenario: id }), cfg, tpl, NK);
  ok(!e.ok && e.excluded && /no repo|never a multiplier|only as/.test(e.reason || ""),
    "excluded with reason: " + id);
});
ok(B.EXCLUDED.length === 4 && B.SCENARIOS.length === 4, "4 covered scenarios, 4 excluded scenarios listed");
var broken = JSON.parse(JSON.stringify(tpl));
broken.negotiation_kit_scripts = broken.negotiation_kit_scripts.filter(function (s) { return s.id !== "lowball_reply"; });
ok(!B.buildScript(base, cfg, broken, NK).ok, "missing source script fails the build — no improvised line");
ok(!B.buildScript(Object.assign({}, base, { scenario: "late_payment", invoiceAmount: 0 }), cfg, tpl, NK).ok,
  "late payment without invoice amount rejected");

console.log("script builder — export + wiring");
var text = B.exportScript(r);
ok(/NEGOTIATION SCRIPT/.test(text) && /OPENER:/.test(text) && /WALK-AWAY LINE:/.test(text) &&
   /PROVENANCE:/.test(text) && /EXCLUDED SCENARIOS/.test(text), "export carries stages, provenance, exclusions");
var page = fs.readFileSync(path.join(ROOT, "pages", "negotiation-script-builder.html"), "utf8");
ok(page.indexOf('id="nsb-form"') >= 0 && page.indexOf('id="nsb-out"') >= 0 && page.indexOf('id="nsb-export"') >= 0,
  "page carries form, output, export");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"negotiation-script-builder": ["assets/js/negotiation-kit.js"') >= 0 &&
   build.indexOf('"negotiation-script-builder": ["assets/css/negotiation-script-builder.css"]') >= 0,
  "build.py wires engine (with NK dependency), UI, CSS");
var css = fs.readFileSync(path.join(ROOT, "assets", "css", "negotiation-script-builder.css"), "utf8");
ok(css.indexOf(".nsb-line") >= 0 && css.indexOf(".nsb-empty") >= 0, "CSS carries script-line and empty-state styles");
var banned = /(delve|tapestry|furthermore|moreover|in conclusion|game-changer|unlock|supercharge|skyrocket)/i;
ok(!banned.test(text) && !banned.test(page), "no AI-ism vocabulary in export or page copy");
console.log(failures === 0 ? "\nALL PASS" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
