/* fleet-commons · server-toolkit · cronauth.js — CANONICAL v1.0.0
 *
 * CRON_SECRET gate for cron/admin functions (spec §1.11, §8.3).
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on cron
 * invocations when CRON_SECRET is set.
 *
 * Fail closed: if CRON_SECRET is unset, or the header is missing/wrong,
 * nothing passes — a missing secret must never mean "no auth". Callers
 * answer 401 with envelope code UNAUTHORIZED and never run the refresh.
 *
 * assertCron(req) -> true iff authorized
 * secretConfigured() -> true iff CRON_SECRET is a non-empty string
 *   (creator-growth-empire fork addition, adopted into canonical: health
 *   endpoints report this as a boolean check without leaking the value)
 *
 * Zero dependencies. Copy verbatim; propose changes back to fleet-commons.
 */
"use strict";

function secretConfigured() {
  /* Creator strengthening retained on adoption (rotation 13): the
   * pre-canonical creator fork required >= 16 chars (GO_LIVE.md generates
   * the secret with `openssl rand -hex 32`); canonical accepts any
   * non-empty string. The stricter creator rule stays — a short secret
   * reports unconfigured and assertCron fails closed on it. */
  return typeof process.env.CRON_SECRET === "string" && process.env.CRON_SECRET.length >= 16;
}

function assertCron(req) {
  if (!secretConfigured()) return false; // fail closed — never run an unprotected refresh
  const header = (req.headers && req.headers.authorization) || "";
  return header === "Bearer " + process.env.CRON_SECRET;
}

module.exports = { assertCron, secretConfigured };
