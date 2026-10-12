'use strict';
/* cronauth.js — §1.11 / §8.3 cron + admin auth. Verbatim-shared across sites.
   Fail closed: no CRON_SECRET configured -> every protected endpoint 401s. */

function secretConfigured() {
  return !!(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16);
}

// Returns true iff the request carries the Vercel-sent cron bearer token.
// Vercel automatically sends Authorization: Bearer <CRON_SECRET> on cron
// invocations when CRON_SECRET is set (§4.1).
function assertCron(req) {
  if (!secretConfigured()) {
    console.log('[auth] cron/admin denied: CRON_SECRET not configured');
    return false;
  }
  const h = req.headers && req.headers.authorization;
  return typeof h === 'string' && h === 'Bearer ' + process.env.CRON_SECRET;
}

module.exports = { assertCron, secretConfigured };
