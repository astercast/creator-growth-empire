'use strict';
/* envelope.js — §1.1 / §1.2 / §1.6 response envelopes. Verbatim-shared across sites. */

const crypto = require('crypto');

function newRequestId() {
  return 'req_' + crypto.randomBytes(3).toString('hex');
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function setJsonHeaders(res, cacheable) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // §1.6: edge does the work on GETs; never send private PII-bearing headers.
  if (cacheable === false) {
    res.setHeader('Cache-Control', 'no-store');
  } else {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  }
}

// ok(res, service, version, data, opts)
// opts: { source:'live'|'cache', degraded, stale_since, upstream, note, requestId, cacheable }
function ok(res, service, version, data, opts) {
  opts = opts || {};
  const body = {
    ok: true,
    data: data === undefined ? null : data,
    meta: {
      service: service,
      version: version,
      generated_at: nowIso(),
      source: opts.source || 'live',
      degraded: !!opts.degraded,
      stale_since: opts.stale_since || null,
      upstream: opts.upstream || [],
      note: opts.note || null,
      request_id: opts.requestId || newRequestId(),
    },
  };
  setJsonHeaders(res, opts.cacheable);
  res.statusCode = 200;
  res.end(JSON.stringify(body));
  return body.meta.request_id;
}

// err(res, service, version, httpStatus, code, message, details)
// details object is safe to show the caller (no secrets — §8.1).
function err(res, service, version, httpStatus, code, message, details) {
  const body = {
    ok: false,
    data: null,
    meta: {
      service: service,
      version: version,
      generated_at: nowIso(),
      request_id: newRequestId(),
    },
    error: {
      code: code,
      message: message,
      details: details || {},
    },
  };
  setJsonHeaders(res, false);
  res.statusCode = httpStatus;
  res.end(JSON.stringify(body));
  return body.meta.request_id;
}

module.exports = { ok, err, newRequestId, nowIso };
