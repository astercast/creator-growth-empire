/* fleet-commons · server-toolkit · envelope.js — CANONICAL v1.0.0
 *
 * The shared response envelope for every fleet serverless function:
 *   success: { ok: true,  data, meta }
 *   failure: { ok: false, data: null, meta, error: { code, message, details? } }
 * meta always carries { service, version, generated_at, request_id } and,
 * on success, { source, degraded, stale_since, upstream, note }.
 *
 * This file reconciles the drifted per-repo copies (marvel-legends-chronicle,
 * aster-da-master, trend-machine, activity-vault, button-mash,
 * creator-growth-empire). Both historical opts dialects are accepted:
 *   marvel/film style: { cacheMaxAge, swr, noStore, stale_since }
 *   trend style:       { staleSince, requestId } + setCacheHeaders(res, kind)
 *   creator style:     { cacheable: false } == noStore
 * New code should use the marvel/film dialect.
 *
 * Cache contract (server-program spec §1.6): successful GET responses are
 * edge-cached `public, s-maxage=600, stale-while-revalidate=86400` unless
 * overridden; errors and non-cacheable responses are `no-store`.
 * Pass cacheMaxAge: 60 for /api/health (§1.4).
 *
 * Zero dependencies. Copy into a site's lib/ verbatim; do not fork behavior —
 * propose changes back to fleet-commons instead.
 */
"use strict";

const crypto = require("crypto");

// RFC 3339 UTC, second precision, Z suffix (§1.3).
function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function newRequestId() {
  return "req_" + crypto.randomBytes(3).toString("hex");
}

function baseMeta(service, version, opts) {
  opts = opts || {};
  return {
    service: service,
    version: version,
    generated_at: nowIso(),
    request_id: opts.requestId || newRequestId(),
  };
}

/* setCacheHeaders(res, kind) — trend-dialect helper, kept for compatibility.
 * kind "get" applies the §1.6 default; anything else is no-store. */
function setCacheHeaders(res, kind) {
  if (kind === "get") {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=86400"
    );
  } else {
    res.setHeader("Cache-Control", "no-store");
  }
}

function staleSinceOf(opts) {
  if (opts.stale_since !== undefined) return opts.stale_since;
  if (opts.staleSince !== undefined) return opts.staleSince;
  return null;
}

/* ok(res, service, version, data, opts)
 * opts: { source, degraded, stale_since|staleSince, upstream, note,
 *         requestId, cacheMaxAge (default 600), swr (default 86400),
 *         noStore, cacheable (creator dialect; false == noStore) }
 * Returns the request_id. */
function ok(res, service, version, data, opts) {
  opts = opts || {};
  const meta = baseMeta(service, version, opts);
  meta.source = opts.source || "live";
  meta.degraded = !!opts.degraded;
  meta.stale_since = staleSinceOf(opts);
  meta.upstream = Array.isArray(opts.upstream) ? opts.upstream : [];
  meta.note = opts.note || null;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (opts.noStore || opts.cacheable === false) {
    res.setHeader("Cache-Control", "no-store");
  } else {
    const maxAge = opts.cacheMaxAge != null ? opts.cacheMaxAge : 600;
    const swr = opts.swr != null ? opts.swr : 86400;
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=" + maxAge + ", stale-while-revalidate=" + swr
    );
  }
  res.end(JSON.stringify({ ok: true, data: data, meta: meta }));
  return meta.request_id;
}

/* err(res, service, version, httpStatus, code, message, details, opts)
 * opts: { retryAfter (seconds; sets the Retry-After header), requestId }.
 * Error responses are always no-store. Returns the request_id. */
function err(res, service, version, httpStatus, code, message, details, opts) {
  opts = opts || {};
  const meta = baseMeta(service, version, opts);
  res.statusCode = httpStatus;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (opts.retryAfter) res.setHeader("Retry-After", String(opts.retryAfter));
  const body = { ok: false, data: null, meta: meta, error: { code: code, message: message } };
  if (details !== undefined && details !== null) body.error.details = details;
  res.end(JSON.stringify(body));
  return meta.request_id;
}

module.exports = { ok, err, newRequestId, nowIso, setCacheHeaders };
