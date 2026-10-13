/* fleet-commons · server-toolkit · fetchx.js — CANONICAL v1.0.0
 *
 * Bounded upstream fetch. Every upstream call in a fleet function goes
 * through fetchTimeout() — never raw fetch — so a slow source can never
 * eat the 10s Hobby function budget.
 *
 * fetchTimeout(url, opts) -> Promise<{ ok, status, text, ms, error }>
 *   opts: { timeoutMs (default 4000), headers, ua | userAgent,
 *           method (default "GET"), body }
 *   ok is true iff HTTP 2xx and no transport error. text is always a
 *   string; on HTTP errors the body is preserved (check ok before using
 *   it). The promise never rejects.
 *
 * Reconciles the two drifted dialects (marvel: `ua`; aster/trend:
 * `userAgent`, `method`, `body`). Both option names are accepted.
 * The User-Agent must identify the service (spec §8.7) — never disguised
 * as a browser; sources that block non-browser agents are reported
 * ok:false honestly. Pass your service UA via opts or set DEFAULT_UA
 * when copying into a repo.
 *
 * Zero dependencies. Copy verbatim; propose changes back to fleet-commons.
 */
"use strict";

const DEFAULT_TIMEOUT_MS = 4000;
/* Creator adoption (rotation 13): DEFAULT_UA set to this service's own UA,
 * per the canonical README's instruction above; SERVICE_USER_AGENT still
 * overrides it, and SERVICE_UA is re-exported for the pre-canonical
 * import shape. */
const DEFAULT_UA = process.env.SERVICE_USER_AGENT || "creator-algwatch/1.0.0 (+https://creator-growth-empire.vercel.app)";
const SERVICE_UA = DEFAULT_UA;

async function fetchTimeout(url, opts) {
  opts = opts || {};
  const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const ua = opts.ua || opts.userAgent || DEFAULT_UA;
  const headers = Object.assign({ Accept: "*/*" }, opts.headers || {});
  const hasUa = Object.keys(headers).some((k) => k.toLowerCase() === "user-agent");
  if (!hasUa) headers["User-Agent"] = ua;

  const init = { method: opts.method || "GET", headers: headers, redirect: "follow" };
  if (opts.body !== undefined) init.body = opts.body;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  init.signal = ctrl.signal;
  const t0 = Date.now();
  try {
    const r = await fetch(url, init);
    let text = "";
    try {
      text = await r.text();
    } catch (e) {
      /* body unreadable — treat as empty; status already known */
    }
    const ms = Date.now() - t0;
    if (r.status >= 200 && r.status < 300) {
      return { ok: true, status: r.status, text: text, ms: ms, error: null };
    }
    return { ok: false, status: r.status, text: text, ms: ms, error: "http " + r.status };
  } catch (e) {
    const ms = Date.now() - t0;
    const aborted =
      (e && e.name === "AbortError") || (e && e.code === 20);
    return {
      ok: false,
      status: 0,
      text: "",
      ms: ms,
      error: aborted ? "timeout after " + timeoutMs + "ms" : String((e && e.message) || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchTimeout, DEFAULT_TIMEOUT_MS, DEFAULT_UA, SERVICE_UA };
