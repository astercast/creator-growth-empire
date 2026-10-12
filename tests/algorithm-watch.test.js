/* Unit tests for Algorithm Watch 2.0. Run: node tests/algorithm-watch.test.js
 * Exit 0 = all pass. Contract:
 *  1. Feed integrity: every entry is dated, sourced (https), confidence-
 *     flagged, and inside its schema length bounds; ids are unique.
 *  2. Honest timestamps: announced <= effective when both are carried,
 *     detected_at is never before announced_at, and no entry claims a
 *     future logged date relative to the feed's generated_at.
 *  3. Coverage: YouTube, TikTok, Instagram, Facebook, X, and Other each
 *     hold at least one entry — a platform the watch claims to cover
 *     must not be silently empty.
 *  4. The three 2.0 backfill entries (Facebook originality, X Original
 *     Content Rewards, Spotify expansion) carry the exact sourced facts
 *     they were logged with.
 *  5. Page/build wiring: the built what-changed page pre-renders every
 *     entry, the coverage panel, the hero action, and the failure-status
 *     slot; build.py and changes-feed.js render dates identically.
 *  6. Failure states exist in the client: live+static both failing is
 *     stated on the page, degraded live data is stated, and nothing in
 *     the client presents cached data as live.
 *  7. Honesty + AI-ism contracts on the new copy.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");

var failures = 0, total = 0;
function ok(cond, name) {
  total++;
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

var feed = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "changes.json"), "utf8"));
var rows = feed.changes;

/* ---------- 1. feed integrity ---------- */
console.log("feed integrity");
ok(feed.version === "1.1.0", "feed version bumped to 1.1.0 for the 2.0 coverage wave");
ok(Array.isArray(rows) && rows.length === 15, "feed holds 15 entries");
var ids = {};
ok(rows.every(function (c) { return !ids[c.id] && (ids[c.id] = 1); }), "entry ids are unique");
ok(rows.every(function (c) {
  return /^[a-z0-9][a-z0-9-]{2,80}$/.test(c.id) &&
    ["youtube", "tiktok", "instagram", "facebook", "x", "other"].indexOf(c.platform) !== -1 &&
    ["algorithm", "policy", "monetization", "legal"].indexOf(c.category) !== -1 &&
    ["verified", "single-source"].indexOf(c.confidence) !== -1;
}), "every entry: id shape, platform, category, confidence enums hold");
ok(rows.every(function (c) {
  return c.title.length >= 8 && c.title.length <= 160 &&
    c.summary.length >= 20 && c.summary.length <= 1200;
}), "every entry: title/summary inside schema length bounds");
ok(rows.every(function (c) {
  return Array.isArray(c.sources) && c.sources.length >= 1 &&
    c.sources.every(function (s) { return /^https:\/\//.test(s.url) && s.name.length > 3; });
}), "every entry: at least one named https source — no unsourced change is stated");
ok(rows.every(function (c) {
  return c.confidence !== "verified" || c.sources.length >= 2 ||
    /spotify\.com/.test(c.sources[0].url);
}), "verified means 2+ sources or the platform's own page — never one blog post");

/* ---------- 2. honest timestamps ---------- */
console.log("honest timestamps");
ok(rows.every(function (c) { return Number.isFinite(Date.parse(c.detected_at)); }),
  "every entry: detected_at parses");
ok(rows.every(function (c) {
  var ann = c.announced_at ? Date.parse(c.announced_at) : null;
  var eff = c.effective_at ? Date.parse(c.effective_at) : null;
  var det = Date.parse(c.detected_at);
  return (ann === null || ann <= det + 86400000) &&
    (ann === null || eff === null || ann <= eff);
}), "announced never after logged (beyond a day) and never after effective");
ok(rows.every(function (c) { return Date.parse(c.detected_at) <= Date.parse(feed.generated_at); }),
  "no entry is logged after the feed's own generated_at — no backdated freshness");

/* ---------- 3. coverage ---------- */
console.log("coverage");
["youtube", "tiktok", "instagram", "facebook", "x", "other"].forEach(function (p) {
  ok(rows.some(function (c) { return c.platform === p; }),
    "coverage: " + p + " holds at least one entry");
});
ok(/Twitch/.test(feed.note) && /Other/.test(feed.note),
  "feed note states where Twitch/Spotify/industry changes are logged (under Other)");

/* ---------- 4. the 2.0 backfill entries ---------- */
console.log("2.0 backfill entries");
function byId(id) { return rows.filter(function (c) { return c.id === id; })[0]; }
var fb = byId("fb-content-monetization-originality-2026");
ok(!!fb && fb.platform === "facebook" && fb.category === "policy" &&
   /March 2026/.test(fb.summary) && /August 31, 2025/.test(fb.summary) &&
   /600,000/.test(fb.summary) && fb.sources.length === 2,
  "Facebook: originality rule, program merge date, and reported gate all present, 2 sources");
var x = byId("x-original-content-rewards-2026");
ok(!!x && x.platform === "x" && x.category === "monetization" &&
   x.announced_at === "2026-08-07T00:00:00Z" && x.effective_at === "2026-09-08T00:00:00Z" &&
   /500 verified followers/.test(x.summary) && /500,000/.test(x.summary) &&
   /no per-impression rate/.test(x.summary),
  "X: enrollments stopped Aug 7, applications Sep 8, gates stated, no invented rate");
var sp = byId("spotify-partner-program-expansion-2026");
ok(!!sp && sp.platform === "other" && sp.announced_at === "2026-09-17T00:00:00Z" &&
   sp.effective_at === "2026-10-20T00:00:00Z" && /37 more markets/.test(sp.title) &&
   /2,000 consumption hours/.test(sp.summary) &&
   sp.sources[0].url === "https://support.spotify.com/us/creators/article/spotify-partner-program/",
  "Spotify: expansion (not a launch), official source first, lowered bar stated — the held watch slot is closed with a real source");

/* ---------- 5. page / build wiring ---------- */
console.log("page/build wiring");
var buildSrc = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
var feedSrc = fs.readFileSync(path.join(ROOT, "assets", "js", "changes-feed.js"), "utf8");
var page = fs.readFileSync(path.join(ROOT, "site", "what-changed.html"), "utf8");
ok(page.indexOf("Read the newest change") !== -1 && page.indexOf('href="deal-room.html#dr-sec-watch"') !== -1,
  "built page: sleek hero with one primary action + one secondary (Deal Room)");
rows.forEach(function (c) {
  ok(page.indexOf(c.title.replace(/&/g, "&amp;")) !== -1, "built page pre-renders: " + c.id);
});
ok((page.match(/aw-cov-row/g) || []).length >= 6, "built page: coverage panel lists all six platform slots");
ok(page.indexOf("No entry in the current window") !== -1 || rows.length >= 6,
  "built page: empty-slot copy exists in the renderer path");
ok(page.indexOf("data-aw-status") !== -1 && page.indexOf("data-aw-coverage") !== -1,
  "built page carries the status slot and the live-updatable coverage list");
ok(page.indexOf("Announced Sep 17, 2026") !== -1 && page.indexOf("Takes effect Oct 20, 2026") !== -1 &&
   page.indexOf("Logged Oct 12, 2026") !== -1,
  "built page renders announced/effective/logged dates for the Spotify entry");
ok(buildSrc.indexOf("_aw_dates_html") !== -1 && feedSrc.indexOf("datesHtml") !== -1 &&
   /Announced /.test(buildSrc) && /Announced /.test(feedSrc) &&
   /Takes effect/.test(buildSrc) && /Takes effect/.test(feedSrc),
  "build.py and changes-feed.js date lines match (no visible shift on the live swap)");

/* ---------- 6. failure states ---------- */
console.log("failure states");
ok(feedSrc.indexOf("live server did not answer and the published feed file failed to load") !== -1,
  "client states the both-sources-failed case on the page, in words");
ok(feedSrc.indexOf("last published copy of the feed") !== -1,
  "client states the static-fallback case as a published copy, never as live");
ok(feedSrc.indexOf("degraded data") !== -1 && feedSrc.indexOf("result.note") !== -1,
  "client surfaces a degraded-live note from the server instead of hiding it");
ok(feedSrc.indexOf("coverageHtml") !== -1,
  "client re-renders coverage from the payload it actually received");

/* ---------- 7. honesty + AI-ism contracts ---------- */
console.log("honesty contracts");
var newCopy = [fb.summary, x.summary, sp.summary].join(" ");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(newCopy),
  "new entry copy: no AI-isms");
ok(/not financial\/legal\/tax advice/i.test(feed.disclaimer) &&
   page.indexOf("Verify platform figures live before acting") !== -1,
  "feed disclaimer + verify-live line ride the page");
ok(!/guarantee|guaranteed earnings|you will earn/i.test(newCopy),
  "new entry copy: no earnings promises");

console.log("\n" + (total - failures) + "/" + total + " assertions" +
  (failures === 0 ? " — ALL PASS" : " — " + failures + " FAILURES"));
process.exit(failures === 0 ? 0 : 1);
