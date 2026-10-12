'use strict';
/* GET /api/niches — niche dataset passthrough (§7.5).
   No inputs. Returns api/v1/niches.json with its generated_at freshness
   surfaced in the payload. Fallback: api/v1/niches.json (same file). */

const fs = require('fs');
const path = require('path');
const env = require('../lib/envelope.js');
const { checkLimit, clientIp, ipHash } = require('../lib/ratelimit.js');

const SERVICE = 'creator-algwatch';
const VERSION = '1.0.0';

function dataFile(name) {
  const cands = [path.join(__dirname, 'v1', name), path.join(__dirname, '..', 'v1', name)];
  for (const c of cands) {
    try { fs.accessSync(c, fs.constants.R_OK); return c; } catch (e) { /* try next */ }
  }
  return cands[0];
}
const FILE = dataFile('niches.json');

module.exports = (req, res) => {
  const requestId = env.newRequestId();
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return env.err(res, SERVICE, VERSION, 405, 'BAD_INPUT', 'Only GET is supported on /api/niches.', {});
  }
  const ip = clientIp(req);
  const lim = checkLimit(ip, 'public');
  if (!lim.allowed) {
    console.log('[ratelimit] ip=' + ipHash(ip) + ' bucket=public path=/api/niches');
    res.setHeader('Retry-After', String(lim.retryAfter));
    return env.err(res, SERVICE, VERSION, 429, 'RATE_LIMITED',
      'Too many requests — slow down and try again in ' + lim.retryAfter + 's.', { retry_after_s: lim.retryAfter });
  }
  let j;
  try {
    j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    console.log('[upstream] niches-feed fail error=' + (e.message || e));
    return env.err(res, SERVICE, VERSION, 502, 'UPSTREAM_UNAVAILABLE',
      'The niche dataset is unavailable right now; try the static fallback at /api/v1/niches.json.',
      { sources: ['niches-feed'] });
  }
  env.ok(res, SERVICE, VERSION, {
    niches: j.niches || [],
    generated_at: j.generated_at || j.updated || null,
    version: j.version || null,
    note: j.note || null,
    freshness_note: j.freshness_note || 'Verify platform figures live before acting on them — every record carries its sources and observation date.',
  }, {
    source: 'live',
    upstream: [{ source: 'niches-feed', ok: true, checked_at: env.nowIso(), latency_ms: 0 }],
    requestId,
  });
};
