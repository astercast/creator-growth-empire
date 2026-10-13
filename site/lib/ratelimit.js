/* fleet-commons · server-toolkit · ratelimit.js — CANONICAL v1.0.0
 *
 * Per-instance fixed-window rate limiting for fleet functions (spec §1.7).
 * Best-effort by design: state is in-memory per warm instance and resets
 * on cold start (documented, not hidden).
 *
 * Buckets: public (60 req/min), compute (20 req/min).
 * Clients are keyed on x-forwarded-for (first entry), not the socket IP.
 * When a limit trips, log a SHA-256 hash prefix of the IP — never the raw
 * IP (§1.7) — and answer 429 via envelope.err with retry_after_s.
 *
 * checkLimit(ip, bucket) -> { allowed, retryAfter }
 * getClientIp(req) -> string
 *
 * Zero dependencies. Copy verbatim; propose changes back to fleet-commons.
 */
"use strict";

const crypto = require("crypto");

const BUCKETS = {
  public: { limit: 60, windowMs: 60 * 1000 },
  compute: { limit: 20, windowMs: 60 * 1000 },
};

// key -> { count, resetAt }
const store = new Map();

function getClientIp(req) {
  const fwd = req.headers && req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  return "unknown";
}

function checkLimit(ip, bucket) {
  const cfg = BUCKETS[bucket] || BUCKETS.public;
  const now = Date.now();
  const key = bucket + ":" + ip;
  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + cfg.windowMs };
    store.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > cfg.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfter: retryAfter };
  }
  // Opportunistic cleanup so the map cannot grow unbounded on a warm instance.
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
      if (store.size <= 4000) break;
    }
  }
  return { allowed: true, retryAfter: 0 };
}

/* Creator compat aliases (rotation 13): the pre-canonical fork named the
 * IP getter clientIp() and exported ipHash() for rate-limit logging; the
 * handlers still import those names, so they stay as aliases over the
 * canonical implementations. ipHash logs a SHA-256 prefix, never a raw IP. */
function clientIp(req) {
  return getClientIp(req);
}

function ipHash(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 12);
}

module.exports = { checkLimit, getClientIp, clientIp, ipHash, BUCKETS };
