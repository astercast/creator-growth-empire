'use strict';
/* GET /api/changes — Algorithm Watch "what changed" feed (§7.5).
   Reads the committed changes.json (the repo is the database, §5) and applies
   ?platform= ?since= ?limit= filters. Every entry carries its source +
   confidence flag (verified | single-source); no change is ever stated
   without a source. Fallback: data/v1/changes.json. */

const fs = require('fs');
const path = require('path');
const env = require('../lib/envelope.js');
const { checkLimit, clientIp, ipHash } = require('../lib/ratelimit.js');

const SERVICE = 'creator-algwatch';
const VERSION = '1.0.0';

// Data file resolution: static data lives at repo-root data/v1/ (never under
// api/ — Vercel does not serve static files from api/). Candidates cover the
// repo layout (api/functions/*.js -> ../../data/v1), the Vercel bundle (same
// relative layout; file tracing bundles data/v1), and the served site/ mirror
// (site/api/*.js -> ../data/v1). First readable candidate wins.
function dataFile(name) {
  const cands = [path.join(__dirname, '..', '..', 'data', 'v1', name), path.join(__dirname, '..', 'data', 'v1', name)];
  for (const c of cands) {
    try { fs.accessSync(c, fs.constants.R_OK); return c; } catch (e) { /* try next */ }
  }
  return cands[0];
}
const FILE = dataFile('changes.json');

const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'x', 'twitch', 'kick', 'other', 'all'];

function query(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const q = {};
  try {
    const u = new URL(req.url || '/', 'http://x');
    for (const [k, v] of u.searchParams) q[k] = v;
  } catch (e) { /* ignore */ }
  return q;
}

function loadFeed() {
  const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!Array.isArray(j.changes)) throw new Error('changes.json has no changes[] array');
  return j;
}

module.exports = (req, res) => {
  const requestId = env.newRequestId();
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return env.err(res, SERVICE, VERSION, 405, 'BAD_INPUT', 'Only GET is supported on /api/changes.', {});
  }
  const ip = clientIp(req);
  const lim = checkLimit(ip, 'public');
  if (!lim.allowed) {
    console.log('[ratelimit] ip=' + ipHash(ip) + ' bucket=public path=/api/changes');
    res.setHeader('Retry-After', String(lim.retryAfter));
    return env.err(res, SERVICE, VERSION, 429, 'RATE_LIMITED',
      'Too many requests — slow down and try again in ' + lim.retryAfter + 's.', { retry_after_s: lim.retryAfter });
  }

  const q = query(req);
  const fields = {};

  // platform: youtube|tiktok|instagram|facebook|x|twitch|kick|other|all (default all)
  const platform = String(q.platform || 'all').toLowerCase();
  if (!PLATFORMS.includes(platform)) {
    fields.platform = 'must be one of: ' + PLATFORMS.join(', ');
  }

  // since: ISO date, default 90 days ago (retention window, §5.1)
  let sinceMs = Date.now() - 90 * 24 * 3600 * 1000;
  if (q.since !== undefined && q.since !== '') {
    const t = Date.parse(String(q.since));
    if (!Number.isFinite(t)) fields.since = 'must be a parseable ISO-8601 date, e.g. 2026-09-01';
    else sinceMs = t;
  }

  // limit: 1..200, default 50
  let limit = 50;
  if (q.limit !== undefined && q.limit !== '') {
    const n = Number(String(q.limit));
    if (!Number.isFinite(n) || n < 1) fields.limit = 'must be a number between 1 and 200';
    else limit = Math.min(200, Math.floor(n));
  }

  if (Object.keys(fields).length) {
    return env.err(res, SERVICE, VERSION, 400, 'BAD_INPUT',
      'Invalid query parameters for /api/changes.', { fields });
  }

  let feed;
  try {
    feed = loadFeed();
  } catch (e) {
    console.log('[upstream] changes-feed fail error=' + (e.message || e));
    return env.err(res, SERVICE, VERSION, 502, 'UPSTREAM_UNAVAILABLE',
      'The algorithm-change feed is unavailable right now; try the static fallback at /data/v1/changes.json.',
      { sources: ['changes-feed'] });
  }

  const rows = feed.changes
    .filter(c => (platform === 'all' || c.platform === platform))
    .filter(c => { const t = Date.parse(c.detected_at); return Number.isFinite(t) && t >= sinceMs; })
    .sort((a, b) => String(b.detected_at).localeCompare(String(a.detected_at)));

  env.ok(res, SERVICE, VERSION, {
    changes: rows.slice(0, limit),
    total: rows.length,
    filters: { platform, since: new Date(sinceMs).toISOString(), limit },
    feed_generated_at: feed.generated_at || null,
    disclaimer: feed.disclaimer || null,
  }, {
    source: 'live',
    upstream: [{ source: 'changes-feed', ok: true, checked_at: env.nowIso(), latency_ms: 0 }],
    requestId,
  });
};
