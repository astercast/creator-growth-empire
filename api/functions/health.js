'use strict';
/* GET /api/health — §1.4. No auth. Edge-cacheable (s-maxage=60 via envelope
   default of 600 is fine; health re-checks are cheap).
   Never returns 5xx: status degrades to "degraded", never "ok" falsely. */

const fs = require('fs');
const path = require('path');
const env = require('../lib/envelope.js');
const { secretConfigured } = require('../lib/cronauth.js');

const SERVICE = 'creator-algwatch';
const VERSION = '1.0.0';
const STARTED_AT = env.nowIso();
// functions = every function file in this deployment (§1.4, self-documenting)
const FUNCTIONS = ['health', 'changes', 'niches', 'cron/algorithm-watch'];

// Static files the functions depend on, with freshness SLAs (§7.5: 24h).
// Resolved like the readers: deployed layout first, repo source fallback.
function dataFile(name) {
  const cands = [path.join(__dirname, 'v1', name), path.join(__dirname, '..', 'v1', name)];
  for (const c of cands) {
    try { fs.accessSync(c, fs.constants.R_OK); return c; } catch (e) { /* try next */ }
  }
  return cands[0];
}
const WATCHED_FILES = {
  'changes.json': { file: dataFile('changes.json'), sla_s: 86400 },
  'niches.json': { file: dataFile('niches.json'), sla_s: 86400 },
};

function freshness(name, spec) {
  const now = Date.now();
  try {
    const j = JSON.parse(fs.readFileSync(spec.file, 'utf8'));
    const gen = j.generated_at || j.updated || null;
    const genMs = gen ? Date.parse(gen) : NaN;
    const age_s = Number.isFinite(genMs) ? Math.max(0, Math.floor((now - genMs) / 1000)) : null;
    return {
      generated_at: gen,
      age_s,
      sla_s: spec.sla_s,
      within_sla: age_s === null ? false : age_s <= spec.sla_s,
    };
  } catch (e) {
    return { generated_at: null, age_s: null, sla_s: spec.sla_s, within_sla: false, error: String(e.message || e) };
  }
}

module.exports = (req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return env.err(res, SERVICE, VERSION, 405, 'BAD_INPUT', 'Only GET is supported on /api/health.', {});
  }
  const data_freshness = {};
  let allFresh = true;
  for (const [name, spec] of Object.entries(WATCHED_FILES)) {
    const f = freshness(name, spec);
    data_freshness[name] = f;
    if (!f.within_sla) allFresh = false;
  }
  const staticOk = Object.values(data_freshness).every(f => f.generated_at !== null);
  const status = (staticOk && allFresh) ? 'ok' : 'degraded';
  env.ok(res, SERVICE, VERSION, {
    status,
    service: SERVICE,
    version: VERSION,
    started_at: STARTED_AT,
    uptime_s: Math.floor(process.uptime()),
    node: process.version,
    functions: FUNCTIONS,
    data_freshness,
    checks: {
      static_fallback_present: staticOk,
      cron_secret_configured: secretConfigured(),
      github_token_configured: !!(process.env.GITHUB_REPO_TOKEN && process.env.GITHUB_REPO),
    },
  }, { cacheable: true });
};
