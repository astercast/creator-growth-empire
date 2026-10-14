/* Creator rotation 22: the identity pass invariants.
 *  - data/v1/lessons.json is the spec table of record: it mirrors the
 *    engine's STAGES (ids, titles, kinds, stage membership) exactly.
 *  - Every lesson carries the full iFixit spec set: time, difficulty
 *    (closed vocabulary), needs, steps, and a conclusion line naming
 *    the artifact it produces.
 *  - Tool numbers named inside lesson needs use the tools-hub listing
 *    number (the formula number), derived here from build.py's own
 *    catalogue order, independently of the JSON.
 *  - build.py's TOOL_STAGE map equals the engine's toolStageMap().
 *  - After a build, data/v1/tools.json carries job / pricing_model /
 *    added / updated on all 32 records.
 * Run: node tests/creator-r22.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

/* ---------- engine STAGES (loaded the same way career-path.test.js does) --- */
const engine = require(path.join(ROOT, 'assets/js/career-path.js'));
ok(engine && engine.STAGES && engine.allLessons, 'engine loads');

/* ---------- lessons.json parity with the engine ---------- */
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/v1/lessons.json'), 'utf8'));
const byId = {};
spec.lessons.forEach(l => { byId[l.id] = l; });
eq(spec.lessons.length, 32, 'spec table holds 32 lessons');
eq(spec.lessons.filter(l => l.kind === 'read').length, 13, '13 reads');
eq(spec.lessons.filter(l => l.kind === 'drill').length, 19, '19 drills');

const DIFFICULTY = ['Very easy', 'Easy', 'Moderate', 'Difficult', 'Very difficult'];
const STATE = ['current', 'superseded'];
const stageIdx = {};
engine.STAGES.forEach((s, i) => { stageIdx[s.id] = i; });
const perStageCount = {};
engine.allLessons().forEach((x) => {
  const el = x.lesson;
  const li = (perStageCount[x.stageId] = (perStageCount[x.stageId] || 0) + 1) - 1;
  {
    const rec = byId[el.id];
    ok(rec, 'spec record exists for lesson ' + el.id);
    if (!rec) return;
    eq(rec.title, el.title, 'title parity for ' + el.id);
    eq(rec.kind, el.kind, 'kind parity for ' + el.id);
    eq(rec.stage, x.stageId, 'stage parity for ' + el.id);
    eq(rec.number, (stageIdx[x.stageId] + 1) + '.' + (li + 1), 'formula number for ' + el.id);
    ok(STATE.includes(rec.state), 'closed state vocabulary for ' + el.id);
    ok(DIFFICULTY.includes(rec.difficulty), 'closed difficulty vocabulary for ' + el.id);
    ok(typeof rec.time === 'string' && rec.time.length > 0, 'time present for ' + el.id);
    ok(Array.isArray(rec.needs) && rec.needs.length >= 1, 'needs present for ' + el.id);
    ok(Array.isArray(rec.steps) && rec.steps.length >= 2, 'steps present for ' + el.id);
    ok(typeof rec.artifact === 'string' && rec.artifact.length > 10, 'conclusion artifact line for ' + el.id);
    if (el.kind === 'drill') eq(rec.tool, el.tool, 'drill tool parity for ' + el.id);
    if (el.kind === 'read') ok(typeof rec.href === 'string' && rec.href.endsWith('.html'), 'read href for ' + el.id);
    ok(!/\u2014/.test(JSON.stringify(rec)), 'no em dash in spec record ' + el.id);
  }
});

/* ---------- hub numbers, derived from build.py's own text ---------- */
const buildSrc = fs.readFileSync(path.join(ROOT, 'scripts/build.py'), 'utf8');
function pyBlock(src, startMark, endMark) {
  const a = src.indexOf(startMark);
  const b = src.indexOf(endMark, a);
  return src.slice(a, b);
}
const toolsOrder = [];
{
  const blk = pyBlock(buildSrc, 'TOOLS = [', '\n]');
  const re = /\("([a-z0-9-]+)", "/g; let mm;
  while ((mm = re.exec(blk))) toolsOrder.push(mm[1]);
}
const hubMeta = {};
{
  const blk = pyBlock(buildSrc, 'TOOL_HUB_META = {', '\n}');
  const re = /"([a-z0-9-]+)":\s+\("[^"]*", "([A-Z]+)"/g; let mm;
  while ((mm = re.exec(blk))) hubMeta[mm[1]] = mm[2];
}
const hubNum = {};
{
  let n = 0;
  ['PLAN', 'MONEY', 'CONTENT'].forEach(g => {
    toolsOrder.forEach(slug => { if (hubMeta[slug] === g) { n++; hubNum[slug] = n; } });
  });
}
eq(Object.keys(hubNum).length, 32, 'hub numbering covers 32 tools');
eq(hubNum['saved-shelf'], 32, 'saved-shelf is Tool 32 in hub order');
eq(hubNum['quiz'], 1, 'quiz is Tool 01 in hub order');

/* lesson needs name tools by their hub number */
const toolTitle = {};
{
  const blk = pyBlock(buildSrc, 'TOOLS = [', '\n]');
  const re = /\("([a-z0-9-]+)", "((?:[^"\\]|\\.)*)"/g; let mm;
  while ((mm = re.exec(blk))) toolTitle[mm[1]] = mm[2].replace(/\\"/g, '"');
}
const bareTitle = s => s.replace(/^The /, '');
let needsChecked = 0;
spec.lessons.forEach(l => {
  l.needs.forEach(need => {
    const mm = need.match(/^(.+?) \(Tool (\d+)\)/);
    if (mm) {
      needsChecked++;
      const slug = Object.keys(toolTitle).find(s => bareTitle(toolTitle[s]) === bareTitle(mm[1]));
      ok(slug, 'needs entry names a real tool: ' + need);
      if (slug) eq(parseInt(mm[2], 10), hubNum[slug], 'hub number in needs entry: ' + need);
    }
  });
});
ok(needsChecked >= 6, 'lesson needs carry numbered tool references (' + needsChecked + ' found)');

/* ---------- TOOL_STAGE parity: build.py == engine ---------- */
const toolStagePy = {};
{
  const blk = pyBlock(buildSrc, 'TOOL_STAGE = {', '\n}');
  const re = /"([a-z0-9-]+)": \((\d), "[^"]+"\)/g; let mm;
  while ((mm = re.exec(blk))) toolStagePy[mm[1]] = parseInt(mm[2], 10);
}
const engStage = engine.toolStageMap();
eq(Object.keys(toolStagePy).length, 32, 'build.py TOOL_STAGE covers 32 tools');
Object.keys(toolStagePy).forEach(slug => {
  eq(engStage[slug], engine.STAGES[toolStagePy[slug] - 1].id, 'stage parity for tool ' + slug);
});

/* ---------- post-build tools.json freshness fields ---------- */
const toolsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/v1/tools.json'), 'utf8'));
eq(toolsJson.tools.length, 32, 'tools.json holds 32 records');
toolsJson.tools.forEach(trec => {
  ok(['Planning', 'Money', 'Content'].includes(trec.job), 'job word for ' + trec.id);
  eq(trec.pricing_model, 'Free', 'pricing model stated for ' + trec.id);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(trec.added || ''), 'added date for ' + trec.id);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(trec.updated || ''), 'updated date for ' + trec.id);
  ok(trec.added <= trec.updated, 'added not after updated for ' + trec.id);
});

console.log('creator-r22: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
