'use strict';
/* ratelimit.js — §1.7 per-instance token bucket. Verbatim-shared across sites.
   Best-effort: resets on cold start (documented, not hidden). */

const crypto = require('crypto');

// bucket defs: { limit, windowMs }
const BUCKETS = {
  public: { limit: 60, windowMs: 60 * 1000 },   // GET functions
  compute: { limit: 20, windowMs: 60 * 1000 },  // POST compute endpoints
};

// ip -> bucket -> { tokens, resetAt }
const store = new Map();

function clientIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 12);
}

// Returns { allowed:true } or { allowed:false, retryAfter }.
// retryAfter is seconds until the bucket refills.
function checkLimit(ip, bucketName) {
  const def = BUCKETS[bucketName] || BUCKETS.public;
  const now = Date.now();
  let perIp = store.get(ip);
  if (!perIp) { perIp = {}; store.set(ip, perIp); }
  let b = perIp[bucketName];
  if (!b || now >= b.resetAt) {
    b = { tokens: def.limit, resetAt: now + def.windowMs };
    perIp[bucketName] = b;
  }
  if (b.tokens > 0) {
    b.tokens -= 1;
    return { allowed: true };
  }
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
}

module.exports = { checkLimit, clientIp, ipHash, BUCKETS };
