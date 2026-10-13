'use strict';
/* github.js — §1.11 / §5 repo-as-database helpers. Verbatim-shared across sites.
 *
 * PENDING TOKEN (open decision §14.1): the fine-grained PAT behind
 * GITHUB_REPO_TOKEN has NOT been created yet (awaiting the user's decision).
 * Behavior without it:
 *   - writeJsonIfChanged() degrades gracefully to read-only: it computes the
 *     new content, returns {committed:false, reason:'no-token'}, and the cron
 *     job reports the would-be diff in its envelope instead of committing.
 *   - readJson() falls back to the deployment bundle's static file
 *     (<servedRoot>/data/v1/<file>) — same bytes the last successful deploy
 *     shipped — so readers keep working with zero credentials.
 * Once the PAT exists, no code changes are needed: set GITHUB_REPO_TOKEN,
 * GITHUB_REPO (owner/name), REPO_STATIC_PREFIX ('site/' here) in the Vercel
 * dashboard (Production scope) and commits start flowing.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fetchTimeout } = require('./fetchx');

const API = 'https://api.github.com';

function cfg() {
  return {
    token: process.env.GITHUB_REPO_TOKEN || '',
    repo: process.env.GITHUB_REPO || '',
    prefix: process.env.REPO_STATIC_PREFIX || '',
  };
}

function ghHeaders(token) {
  return {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function repoPath(file) {
  // file like 'data/v1/changes.json' -> 'site/data/v1/changes.json'
  return cfg().prefix + file.replace(/^\/+/, '');
}

// Canonical bytes for change detection: sorted keys, 2-space indent,
// trailing newline. Recursive key sort.
function canonicalBytes(obj) {
  const sorted = deepSort(obj);
  return JSON.stringify(sorted, null, 2) + '\n';
}

function deepSort(v) {
  if (Array.isArray(v)) return v.map(deepSort);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = deepSort(v[k]);
    return out;
  }
  return v;
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Read a JSON file from the repo (source of truth). Falls back to the local
// deployment bundle when no token is configured (read-only degraded mode).
// Returns { ok, json, sha (contents-API blob sha when available), source }.
async function readJson(repoFile) {
  const { token, repo } = cfg();
  const p = repoPath(repoFile);
  if (token && repo) {
    const url = API + '/repos/' + repo + '/contents/' + encodeURIComponent(p).replace(/%2F/g, '/');
    const r = await fetchTimeout(url, { timeoutMs: 8000, headers: ghHeaders(token) });
    if (r.ok) {
      try {
        const body = JSON.parse(r.text);
        const json = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
        return { ok: true, json, sha: body.sha, source: 'github-contents' };
      } catch (e) {
        return { ok: false, json: null, sha: null, source: 'github-contents', error: 'decode: ' + e.message };
      }
    }
    console.log('[upstream] github-contents fail error=' + r.status + ' ' + (r.error || '') + ' path=' + p);
    // fall through to local bundle
  }
  try {
    // Served root layout: site/api/*.js functions, site/lib/*.js helpers,
    // site/data/v1/*.json static data (this file lives in site/lib/).
    // Repo source layout: api/functions/*.js, lib/*.js, data/v1/*.json
    // (this file lives in lib/ — moved out of api/ 2026-10-13 so the
    // helpers never deploy as functions). Try both.
    const cands = [
      path.join(__dirname, '..', repoFile),
      path.join(__dirname, '..', '..', repoFile),
    ];
    let json = null, lastErr = null;
    for (const local of cands) {
      try { json = JSON.parse(fs.readFileSync(local, 'utf8')); break; }
      catch (e) { lastErr = e; }
    }
    if (!json) throw lastErr || new Error('no local bundle candidate');
    return { ok: true, json, sha: null, source: 'local-bundle' };
  } catch (e) {
    return { ok: false, json: null, sha: null, source: 'local-bundle', error: e.message };
  }
}

// PUT file only when the canonical content changed. One SHA-conflict retry.
// Returns { committed, sha?, changed, reason? }.
async function writeJsonIfChanged(repoFile, obj, message) {
  const { token, repo } = cfg();
  if (!token || !repo) {
    return {
      committed: false, changed: null,
      reason: 'read-only: GITHUB_REPO_TOKEN not configured (fine-grained PAT pending user decision §14.1); computed content returned in cron envelope instead',
    };
  }
  const p = repoPath(repoFile);
  const wanted = canonicalBytes(obj);
  const wantedHash = sha256hex(wanted);

  for (let attempt = 0; attempt < 2; attempt++) {
    const cur = await readJson(repoFile);
    if (cur.ok && cur.json) {
      if (sha256hex(canonicalBytes(cur.json)) === wantedHash) {
        return { committed: false, changed: false, reason: 'unchanged' };
      }
    }
    const url = API + '/repos/' + repo + '/contents/' + encodeURIComponent(p).replace(/%2F/g, '/');
    const payload = {
      message,
      content: Buffer.from(wanted, 'utf8').toString('base64'),
    };
    if (cur.ok && cur.sha) payload.sha = cur.sha; // null when file is new
    const putRes = await putContents(url, payload, token);
    if (putRes.ok) {
      console.log('[cron] github commit ok path=' + p + ' sha=' + (putRes.sha || '?'));
      return { committed: true, changed: true, sha: putRes.sha };
    }
    if (putRes.conflict && attempt === 0) {
      console.log('[cron] github SHA conflict, re-reading once path=' + p);
      continue; // one retry with a fresh read
    }
    console.log('[cron] github commit fail path=' + p + ' error=' + putRes.error);
    return { committed: false, changed: null, reason: putRes.conflict ? 'conflict' : putRes.error };
  }
  return { committed: false, changed: null, reason: 'conflict' };
}

async function putContents(url, payload, token) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: 'PUT',
      signal: ctrl.signal,
      headers: Object.assign(ghHeaders(token), {
        'Content-Type': 'application/json',
        'User-Agent': 'creator-algwatch/1.0.0',
      }),
      body: JSON.stringify(payload),
    });
    clearTimeout(timer);
    const text = await r.text();
    if (r.ok) {
      let sha = null;
      try { sha = JSON.parse(text).content.sha; } catch (e) { /* ignore */ }
      return { ok: true, sha };
    }
    return { ok: false, conflict: r.status === 409 || r.status === 422, error: 'http ' + r.status };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, conflict: false, error: e && e.name === 'AbortError' ? 'timeout after 8000ms' : String((e && e.message) || e) };
  }
}

module.exports = { readJson, writeJsonIfChanged, canonicalBytes, sha256hex, repoPath };
