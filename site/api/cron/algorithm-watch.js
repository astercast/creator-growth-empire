'use strict';
/* GET /api/cron/algorithm-watch — §4.2 / §7.5 daily refresh job.
   Schedule (vercel.json): 0 12 * * * UTC. Cron only (CRON_SECRET, fail closed).
   Bounded incremental refresh:
     1. read current changes.json (github.js; read-only fallback when the
        GITHUB_REPO_TOKEN fine-grained PAT is still pending — §14.1)
     2. fetch upstream feeds in parallel (4s each, allSettled — partial
        success is the normal case)
     3. keyword-filter to algorithm/policy/monetization/legal, classify,
        dedupe vs existing entries (no synthetic entries — §6.5)
     4. prune to the 90-day retention window (§5.1)
     5. writeJsonIfChanged (no change -> no commit -> no redeploy)
   Fits the 10s Hobby function budget. Idempotent (§4.3). */

const crypto = require('crypto');
const env = require('../../lib/envelope.js');
const { fetchTimeout } = require('../../lib/fetchx.js');
const { assertCron } = require('../../lib/cronauth.js');
const { readJson, writeJsonIfChanged } = require('../../lib/github.js');

const SERVICE = 'creator-algwatch';
const VERSION = '1.0.0';
const JOB = 'algorithm-watch';
const REPO_FILE = 'data/v1/changes.json'; // served at site/data/v1/changes.json (§2.1)
const RETENTION_DAYS = 90;
const MAX_NEW_PER_RUN = 25;

// Upstream feeds (best-effort RSS; a dead feed is marked ok:false — never
// treated as "no changes"). Probed 2026-10-12: blog.youtube/feed/ and
// blog.youtube/feeds/posts/default serve HTML (no official RSS), and
// newsroom.tiktok.com/en-us/feed times out — both were dropped rather than
// left permanently failing. Re-probe before re-adding; do not guess URLs.
// Twitch sourcing (probed 2026-10-12, Rotation 6): the two general feeds
// carried 0 Twitch stories in their current windows, so a Twitch-only
// story reached this job only by luck. Candidates probed with this job's
// own fetch + parser: the Twitch blog serves HTML at every feed-shaped
// URL (no official RSS), Dot Esports 403s, Esports Insider 403s, Kotaku
// tag RSS timed out, StreamerSquare redirects to an HTML guides page.
// Two tag feeds answered clean RSS/Atom: The Verge's Twitch tag (viable,
// held as a fallback — broader and noisier) and Tubefilter's Twitch tag
// feed, which is wired below: same publisher as the existing main feed,
// 12/12 current items Twitch-tagged (Aug 25–Oct 6, 2026), 3 passing the
// relevance gate through the real parser on probe day (a Twitch/Amazon
// class-action lawsuit among them). Each entry: { name, url }.
const SOURCES = [
  { name: 'tubefilter-rss', url: 'https://www.tubefilter.com/feed/' },
  { name: 'socialmediatoday-rss', url: 'https://www.socialmediatoday.com/feeds/news/' },
  { name: 'tubefilter-twitch-rss', url: 'https://www.tubefilter.com/tag/twitch/feed/' },
];

// Relevance gate: only items about algorithm/policy/monetization/legal.
const RELEVANT = /algorithm|rank(ing)?|recommendation|for you|fyp|shorts|reels|monetiz|partner program|\bypp\b|payout|revenue|\brpm\b|\bcpm\b|polic|guideline|terms|disclosure|\bftc\b|lawsuit|settlement|regulation|appeal|demonetiz|distribution|reach|creator fund|rewards|sponsor|shop/i;
const CAT_MONETIZATION = /monetiz|payout|revenue|\brpm\b|\bcpm\b|partner program|\bypp\b|shop|affiliate|creator fund|rewards|sponsor/i;
const CAT_LEGAL = /\bftc\b|lawsuit|settlement|regulation|\birs\b|tax|court/i;
const CAT_POLICY = /polic|guideline|terms|disclosure|ban|appeal|demonetiz|enforcement/i;
const CAT_ALGORITHM = /algorithm|rank|recommend|for you|fyp|distribution|reach|feed/i;

// 60s global cooldown — Vercel cron delivery is best-effort, duplicates happen.
let lastRunAt = 0;

// ---- tiny dependency-free RSS/Atom item parser ----
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', mdash: '—', ndash: '–' };
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (m, n) => { const c = Number(n); return c > 31 && c < 0x110000 ? String.fromCodePoint(c) : m; })
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => { const c = parseInt(h, 16); return c > 31 && c < 0x110000 ? String.fromCodePoint(c) : m; })
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}
function stripTags(s) {
  return decodeEntities(String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim());
}
function pick(block, tags) {
  for (const t of tags) {
    const m = block.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>', 'i'));
    if (m) return stripTags(m[1]);
  }
  return '';
}
function pickLink(block) {
  const m = block.match(/<link[^>]*href="([^"]+)"/i); // atom
  if (m) return m[1].trim();
  return pick(block, ['link']); // rss
}
function parseFeedItems(xml) {
  const items = [];
  const entryRe = /<(item|entry)[\s>]([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = entryRe.exec(xml)) && items.length < 60) {
    const block = m[2];
    const title = pick(block, ['title']);
    const link = pickLink(block);
    const pub = pick(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const desc = pick(block, ['description', 'summary', 'content:encoded', 'content']);
    if (title && link) items.push({ title, link, pub, desc: desc.slice(0, 500) });
  }
  return items;
}

function normTitle(t) {
  return String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function classifyCategory(text) {
  if (CAT_MONETIZATION.test(text)) return 'monetization';
  if (CAT_LEGAL.test(text)) return 'legal';
  if (CAT_POLICY.test(text)) return 'policy';
  if (CAT_ALGORITHM.test(text)) return 'algorithm';
  return null;
}
function detectPlatform(text) {
  if (/youtube|youtu/i.test(text)) return 'youtube';
  if (/tiktok/i.test(text)) return 'tiktok';
  if (/instagram|reels/i.test(text)) return 'instagram';
  if (/facebook|meta/i.test(text)) return 'facebook';
  if (/twitter/i.test(text)) return 'x';
  if (/twitch/i.test(text)) return 'twitch';
  if (/\bkick\b/i.test(text)) return 'kick';
  return 'other';
}
function makeId(platform, title, link) {
  const pfx = { youtube: 'yt', tiktok: 'tt', instagram: 'ig', facebook: 'fb', x: 'x', twitch: 'tw', kick: 'ki', other: 'cw' }[platform] || 'cw';
  const slug = normTitle(title).replace(/ /g, '-').slice(0, 48).replace(/-+$/, '');
  const h = crypto.createHash('sha256').update(link).digest('hex').slice(0, 6);
  return (pfx + '-' + (slug || 'update') + '-' + h).slice(0, 80);
}

async function fetchSourceOk(src) {
  const checked_at = env.nowIso();
  const r = await fetchTimeout(src.url, { timeoutMs: 4000, headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
  if (!r.ok) {
    const error = r.status ? 'http ' + r.status : (r.error || 'fetch failed');
    console.log('[upstream] ' + src.name + ' fail error=' + error + ' latency_ms=' + r.ms);
    return { source: src.name, ok: false, checked_at, error, latency_ms: r.ms, items: [] };
  }
  const looksXml = /<(rss|feed|rdf)[\s>]|<item[\s>]|<entry[\s>]/i.test(r.text.slice(0, 4000));
  if (!looksXml) {
    console.log('[upstream] ' + src.name + ' fail error=not-xml latency_ms=' + r.ms);
    return { source: src.name, ok: false, checked_at, error: 'response was not a feed (HTML?)', latency_ms: r.ms, items: [] };
  }
  const items = parseFeedItems(r.text);
  return { source: src.name, ok: true, checked_at, latency_ms: r.ms, items };
}

function isDuplicate(existing, item) {
  const link = item.link.toLowerCase().replace(/\/$/, '');
  const t = normTitle(item.title);
  return existing.some(e =>
    String(e.source_url || '').toLowerCase().replace(/\/$/, '') === link ||
    (e.sources || []).some(s => String(s.url || '').toLowerCase().replace(/\/$/, '') === link) ||
    (normTitle(e.title) === t && t.length > 12));
}

module.exports = async (req, res) => {
  const requestId = env.newRequestId();
  const startedMs = Date.now();
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return env.err(res, SERVICE, VERSION, 405, 'BAD_INPUT', 'Only GET is supported on /api/cron/algorithm-watch.', {});
  }
  if (!assertCron(req)) {
    return env.err(res, SERVICE, VERSION, 401, 'UNAUTHORIZED',
      'This endpoint requires the cron secret. Set CRON_SECRET in the Vercel dashboard (Production scope) — see GO_LIVE.md.', {});
  }
  const now = Date.now();
  if (now - lastRunAt < 60 * 1000) {
    console.log('[cron] ' + JOB + ' duplicate delivery suppressed request_id=' + requestId);
    return env.ok(res, SERVICE, VERSION,
      { checked: false, duplicate: true, note: 'duplicate delivery within 60s cooldown' },
      { cacheable: false, requestId });
  }
  lastRunAt = now;
  console.log('[cron] ' + JOB + ' start request_id=' + requestId);

  try {
    // 1. current feed (source of truth)
    const cur = await readJson(REPO_FILE);
    if (!cur.ok || !cur.json || !Array.isArray(cur.json.changes)) {
      throw new Error('could not read ' + REPO_FILE + ': ' + (cur.error || 'empty'));
    }
    const feed = cur.json;
    const existing = feed.changes;

    // 2. fetch upstreams in parallel — partial success is normal
    const settled = await Promise.allSettled(SOURCES.map(fetchSourceOk));
    const results = settled.map((s, i) =>
      s.status === 'fulfilled' ? s.value
        : { source: SOURCES[i].name, ok: false, checked_at: env.nowIso(), error: String((s.reason && s.reason.message) || s.reason), items: [] });
    const upstream = results.map(r => ({ source: r.source, ok: r.ok, checked_at: r.checked_at, latency_ms: r.latency_ms, error: r.error }));

    // 3. extract -> relevance gate -> classify -> dedupe (no synthetic entries)
    const nowIso = env.nowIso();
    const fresh = [];
    for (const r of results) {
      if (!r.ok) continue;
      for (const item of r.items) {
        const hay = item.title + ' ' + item.desc;
        if (!RELEVANT.test(hay)) continue; // off-topic for algorithm watch
        const category = classifyCategory(hay);
        if (!category) continue;
        if (isDuplicate(existing.concat(fresh), item)) continue;
        const pubMs = Date.parse(item.pub);
        fresh.push({
          id: makeId(detectPlatform(hay), item.title, item.link),
          platform: detectPlatform(hay),
          title: item.title.slice(0, 160),
          summary: (item.desc || item.title).slice(0, 600),
          detected_at: nowIso,
          announced_at: Number.isFinite(pubMs) ? new Date(pubMs).toISOString().replace(/\.\d{3}Z$/, 'Z') : null,
          effective_at: null,
          source_url: item.link,
          sources: [{ name: r.source, url: item.link }],
          category,
          confidence: 'single-source', // cron entries are always single-source until corroborated
        });
        if (fresh.length >= MAX_NEW_PER_RUN) break;
      }
      if (fresh.length >= MAX_NEW_PER_RUN) break;
    }

    // 4. merge + prune to 90-day retention (§5.1); newest first
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 3600 * 1000;
    const merged = existing.concat(fresh)
      .filter(e => { const t = Date.parse(e.detected_at); return Number.isFinite(t) && t >= cutoff; })
      .sort((a, b) => String(b.detected_at).localeCompare(String(a.detected_at)));
    const next = Object.assign({}, feed, {
      version: feed.version || '1.0.0',
      updated: nowIso.slice(0, 10),
      generated_at: nowIso,
      changes: merged,
    });

    // 5. commit only on change (no change -> no commit -> no redeploy)
    const commitMsg = JOB + ': +' + fresh.length + ' change(s), ' + merged.length + ' retained (' + nowIso.slice(0, 10) + ')';
    const wr = await writeJsonIfChanged(REPO_FILE, next, commitMsg);

    const failedSources = results.filter(r => !r.ok);
    const degraded = failedSources.length > 0;
    const data = {
      checked: true,
      changed: fresh.length > 0,
      committed: !!wr.committed,
      commit_reason: wr.reason || null,
      commit_sha: wr.sha || null,
      sources_ok: results.filter(r => r.ok).length + '/' + results.length,
      new_changes: fresh.map(e => ({ id: e.id, platform: e.platform, category: e.category, title: e.title })),
      retained: merged.length,
      elapsed_ms: Date.now() - startedMs,
    };
    console.log('[cron] ' + JOB + ' done changed=' + data.changed + ' committed=' + (wr.sha || wr.reason || false) +
      ' sources_ok=' + data.sources_ok + ' request_id=' + requestId);
    return env.ok(res, SERVICE, VERSION, data, {
      cacheable: false,
      degraded,
      stale_since: degraded ? nowIso : null,
      note: degraded
        ? failedSources.length + ' of ' + results.length + ' upstream feeds failed at ' + nowIso +
          ' (' + failedSources.map(s => s.source + ': ' + s.error).join('; ') + '); only reachable feeds were scanned.'
        : null,
      upstream,
      requestId,
    });
  } catch (e) {
    console.log('[cron] ' + JOB + ' fail stage=' + (e.stage || 'run') + ' error=' + (e.message || e) + ' request_id=' + requestId);
    return env.err(res, SERVICE, VERSION, 500, 'REFRESH_FAILED',
      'The algorithm-watch refresh failed partway through; yesterday\u2019s feed is still served from /api/changes and /data/v1/changes.json.',
      { stage: e.stage || 'run' });
  }
};
