'use strict';
/* fetchx.js — §1.11 bounded upstream fetch. Verbatim-shared across sites. */

const SERVICE_UA = process.env.SERVICE_USER_AGENT || 'creator-algwatch/1.0.0 (+https://creator-growth-empire.vercel.app)';

// fetchTimeout(url, {timeoutMs, headers}) -> {ok, status, text, ms, error}
// All upstream calls go through this. Default 4000ms (§4.2).
async function fetchTimeout(url, opts) {
  opts = opts || {};
  const timeoutMs = opts.timeoutMs || 4000;
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = Object.assign({ 'User-Agent': SERVICE_UA, Accept: '*/*' }, opts.headers || {});
    const r = await fetch(url, { signal: ctrl.signal, headers, redirect: 'follow' });
    const text = await r.text();
    clearTimeout(timer);
    return { ok: r.ok, status: r.status, text, ms: Date.now() - started, error: null };
  } catch (e) {
    clearTimeout(timer);
    const ms = Date.now() - started;
    const reason = e && e.name === 'AbortError' ? 'timeout after ' + timeoutMs + 'ms' : String((e && e.message) || e);
    return { ok: false, status: 0, text: '', ms, error: reason };
  }
}

module.exports = { fetchTimeout, SERVICE_UA };
