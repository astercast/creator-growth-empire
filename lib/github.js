/* fleet-commons · server-toolkit · github.js — CANONICAL v1.0.0, adopted
 * by creator-growth-empire in rotation 13 with three creator contracts
 * retained (each marked RETAINED below; canonical is adopted wherever it
 * is the union/superset, and these three are places the creator fork
 * carries behavior canonical does not have):
 *
 * "The repo is the database" (spec §1.11 + §5): cron jobs read/write
 * versioned JSON via the GitHub Contents API, and functions read the same
 * files — the static fallback file and the store are literally the same
 * file (§4.6).
 *
 * Env: GITHUB_REPO_TOKEN (fine-grained PAT, contents:write on this repo
 * only), GITHUB_REPO ("owner/name"), REPO_STATIC_PREFIX ("" when the
 * deployment root is the repo root, "site/" for mirrored layouts).
 *
 * Read-only degradation: until GITHUB_REPO_TOKEN is set, tokenConfigured()
 * is false — writes are skipped, crons run read-only (compute + return,
 * do not persist), and reads come from the deployment bundle. Nothing here
 * ever throws for a missing token; callers branch on tokenConfigured().
 * Whether a given fleet site has a token yet is that site's deployment
 * decision — check its LIVE_CHECKLIST.md, not this file. (Creator status:
 * the PAT is still pending the user's decision, §14.1 — see GO_LIVE.md.)
 *
 * writeJsonIfChanged: GETs the current file, compares SHA-256-canonical
 * JSON (sorted keys, 2-space indent, trailing newline), PUTs only on
 * change; on SHA mismatch (409) it re-reads once and retries once, then
 * returns { committed:false, reason:"conflict" }. Never force-pushes,
 * never deletes (§4.3). All calls carry an 8000ms timeout via fetchx.
 *
 * Requires ./fetchx.js (canonical). Zero dependencies.
 * Propose changes back to fleet-commons instead of forking further.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { fetchTimeout } = require("./fetchx.js");

const API = "https://api.github.com";

/* RETAINED (creator): env is read per call, not captured at module load —
 * the local test harness and Vercel warm instances both rely on the
 * current environment, and the pre-canonical creator fork's cfg() shape
 * is what the cron's read-only tests pin. */
function cfg() {
  return {
    token: process.env.GITHUB_REPO_TOKEN || "",
    repo: process.env.GITHUB_REPO || "",
    prefix: process.env.REPO_STATIC_PREFIX || "",
  };
}

function tokenConfigured() {
  const c = cfg();
  return !!(c.token && c.repo);
}

function repoPath(p) {
  return cfg().prefix + String(p).replace(/^\/+/, "");
}

function ghHeaders() {
  const c = cfg();
  return {
    Authorization: "Bearer " + c.token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "fleet-server/1.0.0 (+https://github.com/" + (c.repo || "astercast") + ")",
  };
}

// Canonical JSON: sorted keys, 2-space indent, trailing newline.
// The wire and the repo pipeline must produce byte-identical files for
// identical content — this is the shared canonicalization (§4.3).
function canonicalJson(obj) {
  return JSON.stringify(sortKeys(obj), null, 2) + "\n";
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out = {};
    Object.keys(v)
      .sort()
      .forEach((k) => {
        out[k] = sortKeys(v[k]);
      });
    return out;
  }
  return v;
}

/* Pre-canonical name, kept as an alias: the creator fork exported
 * canonicalBytes for the same bytes canonicalJson now produces. */
const canonicalBytes = canonicalJson;

function sha256hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function contentsUrl(p) {
  return (
    API +
    "/repos/" +
    cfg().repo +
    "/contents/" +
    encodeURIComponent(repoPath(p)).replace(/%2F/g, "/")
  );
}

/* RETAINED (creator): the local-bundle fallback. Canonical readJson reads
 * only via the Contents API; the creator cron's source of truth when no
 * token is configured is the deployment bundle's static file
 * (<root>/data/v1/<file>) — the same bytes the last successful deploy
 * shipped — and tests/algorithm-watch-cron.test.js pins that read path
 * (the file the cron reads matches the committed feed). The return shape
 * is also the creator contract: { ok, json, sha, source, error }, with
 * canonical's `data` carried as an alias of `json`. */
async function readJson(repoFile) {
  if (tokenConfigured()) {
    const r = await fetchTimeout(contentsUrl(repoFile), {
      timeoutMs: 8000,
      headers: ghHeaders(),
    });
    if (r.ok) {
      try {
        const body = JSON.parse(r.text);
        const json = JSON.parse(Buffer.from(body.content || "", "base64").toString("utf8"));
        return { ok: true, json: json, data: json, sha: body.sha || null, source: "github-contents", error: null };
      } catch (e) {
        return { ok: false, json: null, data: null, sha: null, source: "github-contents", error: "decode: " + e.message };
      }
    }
    console.log("[upstream] github-contents fail error=" + r.status + " " + (r.error || "") + " path=" + repoPath(repoFile));
    // fall through to local bundle
  }
  try {
    // Served root layout: site/api/*.js functions, site/lib/*.js helpers,
    // site/data/v1/*.json static data (this file lives in site/lib/).
    // Repo source layout: api/functions/*.js, lib/*.js, data/v1/*.json
    // (this file lives in lib/ — moved out of api/ 2026-10-13 so the
    // helpers never deploy as functions). Try both.
    const cands = [
      path.join(__dirname, "..", repoFile),
      path.join(__dirname, "..", "..", repoFile),
    ];
    let json = null, lastErr = null;
    for (const local of cands) {
      try { json = JSON.parse(fs.readFileSync(local, "utf8")); break; }
      catch (e) { lastErr = e; }
    }
    if (!json) throw lastErr || new Error("no local bundle candidate");
    return { ok: true, json: json, data: json, sha: null, source: "local-bundle", error: null };
  } catch (e) {
    return { ok: false, json: null, data: null, sha: null, source: "local-bundle", error: e.message };
  }
}

// PUT one file via fetchx (canonical path — the pre-canonical fork used a
// hand-rolled fetch with its own timer for this call). sha may be null
// for a brand-new file.
async function putFile(p, content, message, sha) {
  const body = JSON.stringify({
    message: message,
    content: Buffer.from(content, "utf8").toString("base64"),
    sha: sha || undefined,
  });
  const r = await fetchTimeout(contentsUrl(p), {
    timeoutMs: 8000,
    method: "PUT",
    headers: Object.assign(ghHeaders(), { "Content-Type": "application/json" }),
    body: body,
  });
  if (!r.ok) {
    return { ok: false, status: r.status, error: r.error || "http " + r.status };
  }
  try {
    const b = JSON.parse(r.text);
    return { ok: true, status: r.status, sha: (b.content && b.content.sha) || null, error: null };
  } catch (e) {
    return { ok: true, status: r.status, sha: null, error: null };
  }
}

// Write JSON only when the canonical bytes differ from the repo's.
// Returns { committed, changed, sha, reason }.
async function writeJsonIfChanged(p, obj, message) {
  /* RETAINED (creator): the graceful no-token answer. Canonical assumes a
   * token and would attempt an API write against an empty repo; the
   * creator cron's contract (pinned by tests/algorithm-watch-cron.test.js,
   * /read-only|no-token/) is that a missing token computes the would-be
   * content and reports it, committing nothing. */
  if (!tokenConfigured()) {
    return {
      committed: false, changed: null, sha: null,
      reason: "read-only: GITHUB_REPO_TOKEN not configured (fine-grained PAT pending user decision §14.1); computed content returned in cron envelope instead",
    };
  }
  const want = canonicalJson(obj);
  const cur = await readJson(p);
  if (cur.ok && cur.json !== null && cur.source === "github-contents") {
    if (sha256hex(canonicalJson(cur.json)) === sha256hex(want)) {
      return { committed: false, changed: false, sha: cur.sha, reason: "unchanged" };
    }
  }
  let attempt = await putFile(p, want, message, cur.ok ? cur.sha : null);
  if (!attempt.ok && attempt.status === 409) {
    // SHA conflict: re-read once, re-compare, retry once (§4.3).
    const cur2 = await readJson(p);
    if (cur2.ok && cur2.json !== null) {
      if (canonicalJson(cur2.json) === want) {
        return { committed: false, changed: false, sha: cur2.sha, reason: "unchanged-after-retry" };
      }
    }
    attempt = await putFile(p, want, message, cur2.ok ? cur2.sha : null);
    if (!attempt.ok) {
      return { committed: false, changed: false, sha: null, reason: "conflict" };
    }
  }
  if (!attempt.ok) {
    return { committed: false, changed: false, sha: null, reason: "write-failed: " + attempt.error };
  }
  console.log("[cron] github commit ok path=" + repoPath(p) + " sha=" + (attempt.sha || "?"));
  return { committed: true, changed: true, sha: attempt.sha, reason: "committed" };
}

// Raw-text twin (for JSONP-style files — the file is text, not JSON).
// Adopted from canonical in rotation 13; no caller yet.
async function writeTextIfChanged(p, text, message) {
  if (!tokenConfigured()) {
    return {
      committed: false, changed: null, sha: null,
      reason: "read-only: GITHUB_REPO_TOKEN not configured (fine-grained PAT pending user decision §14.1)",
    };
  }
  const raw = await fetchTimeout(contentsUrl(p), {
    timeoutMs: 8000,
    headers: Object.assign(ghHeaders(), { Accept: "application/vnd.github.raw" }),
  });
  if (raw.ok && raw.text === text) {
    return { committed: false, changed: false, sha: null, reason: "unchanged" };
  }
  const meta = await readJson(p);
  const sha = meta.ok ? meta.sha : null;
  let attempt = await putFile(p, text, message, sha);
  if (!attempt.ok && attempt.status === 409) {
    const meta2 = await readJson(p);
    attempt = await putFile(p, text, message, meta2.ok ? meta2.sha : null);
    if (!attempt.ok) return { committed: false, changed: false, sha: null, reason: "conflict" };
  }
  if (!attempt.ok) {
    return { committed: false, changed: false, sha: null, reason: "write-failed: " + attempt.error };
  }
  return { committed: true, changed: true, sha: attempt.sha, reason: "committed" };
}

module.exports = {
  tokenConfigured,
  readJson,
  writeJsonIfChanged,
  writeTextIfChanged,
  canonicalJson,
  canonicalBytes,
  sha256hex,
  repoPath,
};
