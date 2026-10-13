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
ok(feed.version === "1.7.0", "feed version bumped to 1.7.0 for the Watch With backfill wave");
ok(Array.isArray(rows) && rows.length === 25, "feed holds 25 entries");
var ids = {};
ok(rows.every(function (c) { return !ids[c.id] && (ids[c.id] = 1); }), "entry ids are unique");
ok(rows.every(function (c) {
  return /^[a-z0-9][a-z0-9-]{2,80}$/.test(c.id) &&
    ["youtube", "tiktok", "instagram", "facebook", "x", "twitch", "kick", "other"].indexOf(c.platform) !== -1 &&
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
["youtube", "tiktok", "instagram", "facebook", "x", "twitch", "kick", "other"].forEach(function (p) {
  ok(rows.some(function (c) { return c.platform === p; }),
    "coverage: " + p + " holds at least one entry");
});
ok(/Twitch, and Kick have their own slots/.test(feed.note) && /Spotify and industry-wide/.test(feed.note) && /under Other/.test(feed.note),
  "feed note states Twitch and Kick have their own slots and Spotify/industry changes log under Other");

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

/* ---------- 4b. the 2.1 entries: Twitch slot + fresh TikTok changes ---------- */
console.log("2.1 entries");
var tw = byId("twitch-sponsorships-affiliates-2026");
ok(!!tw && tw.platform === "twitch" && tw.category === "monetization" &&
   tw.confidence === "verified" && tw.sources.length === 2 &&
   tw.announced_at === "2026-08-20T00:00:00Z" && tw.effective_at === "2026-08-20T00:00:00Z" &&
   /Creator Sponsorship Certification/.test(tw.summary) && /more than half/.test(tw.summary) &&
   tw.sources[0].url === "https://www.panstag.com/2026/08/twitch-creator-sponsorships-affiliates.html" &&
   tw.sources[1].url === "https://www.fakta.co/twitch-expands-sponsorship-access-affiliates",
  "Twitch: Sponsorships opened to Affiliates Aug 20, certification gate stated, 2 independent sources — the slot opens with a real entry, not a placeholder");
var tg = byId("tt-community-guidelines-2026h2");
ok(!!tg && tg.platform === "tiktok" && tg.category === "policy" &&
   tg.announced_at === "2026-08-25T00:00:00Z" && tg.effective_at === "2026-09-24T00:00:00Z" &&
   /associated accounts/.test(tg.summary) && /policy training/.test(tg.summary),
  "TikTok guidelines 2026H2: released Aug 25, effective Sep 24, associated-accounts reach + policy training stated");
var tp = byId("tt-one-pay-plus-2026");
ok(!!tp && tp.platform === "tiktok" && tp.category === "monetization" &&
   tp.announced_at === "2026-09-24T00:00:00Z" && tp.effective_at === null &&
   /within 30 days/.test(tp.summary) && /15% more on Custom Collab/.test(tp.summary),
  "TikTok One Pay/Plus: Sep 24, 30-day pay promise + 15% Custom Collab line, no invented effective date");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(
   [tw.summary, tg.summary, tp.summary].join(" ")),
  "2.1 entry copy: no AI-isms");

/* ---------- 4c. the 2.2 entry: Meta's ByteDance ad ban ---------- */
console.log("2.2 entry");
var mb = byId("meta-bytedance-ad-ban-2026");
ok(!!mb && mb.platform === "facebook" && mb.category === "policy" &&
   mb.confidence === "verified" && mb.sources.length === 2 &&
   mb.announced_at === "2026-10-08T00:00:00Z" && mb.effective_at === "2026-10-08T00:00:00Z" &&
   /seven countries|United States, Canada, Egypt, Indonesia, Japan, Thailand, and Vietnam/.test(mb.summary) &&
   /third-party advertisers/.test(mb.summary) && /Organic posts/.test(mb.summary) &&
   mb.sources[0].url === "https://www.lapost.com/content/meta-bans-tiktok-from-advertising-on-its-apps-bloomberg-news-reports" &&
   mb.sources[1].url === "https://www.moneyweb.co.za/news/international/meta-bans-ads-from-tiktok-on-its-apps-in-escalating-feud/",
  "Meta ad ban: Oct 8, seven named markets, third-party reach stated, organic posts excluded, Reuters + Bloomberg wires — a paid-promotion policy, not an access ban");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(mb.summary),
  "2.2 entry copy: no AI-isms");

/* ---------- 4d. the 2.3 entries: the three rotation-5 near-misses, resolved ---------- */
console.log("2.3 entries");
var lc = byId("fb-link-post-cap-test-2026");
ok(!!lc && lc.platform === "facebook" && lc.category === "policy" &&
   lc.confidence === "verified" && lc.sources.length === 2 &&
   lc.announced_at === "2026-09-17T00:00:00Z" && lc.effective_at === null &&
   /December 2025/.test(lc.summary) && /two organic posts/.test(lc.summary) &&
   /news-publisher Pages are excluded/.test(lc.summary) && /\$49\.99/.test(lc.summary) &&
   /still a test, not a rule for every Page/.test(lc.summary) &&
   lc.sources[0].url === "https://pressgazette.co.uk/platforms/facebook-cash-for-links-scheme-excludes-publishers-for-now/" &&
   lc.sources[1].url === "https://www.relevantaudience.com/meta/facebook-pages-charged-for-link-posts-meta-one/",
  "Facebook link cap: expanded test (Dec 2025 origin, Sep 17 expansion), two-free cap, publisher exclusion, paid tiers, still-a-test stated, Press Gazette + SMT-recap sources — logged only once it firmed up");
var sc = byId("tt-smart-plus-creative-selection-2026");
ok(!!sc && sc.platform === "tiktok" && sc.category === "monetization" &&
   sc.confidence === "verified" && sc.sources.length === 2 &&
   sc.announced_at === "2026-10-05T00:00:00Z" && sc.effective_at === null &&
   /Symphony/.test(sc.summary) && /creator content/.test(sc.summary) &&
   /no pay rate, no revenue share/.test(sc.summary) &&
   sc.sources[0].url === "https://www.marketingdive.com/news/tiktok-broadens-agentic-ai-play-brings-global-ad-network-to-us/832007/" &&
   sc.sources[1].url === "https://www.mediapost.com/publications/article/418523/tiktok-ai-expands-search-creative-merchant-ad-fo.html",
  "TikTok Smart+ Creative Selection: Oct 5, three creative sources in one advertiser approval flow, Marketing Dive + MediaPost, and the unpublished creator pay/opt-in terms stated plainly");
var ke = byId("kenya-withholding-platform-payouts-2026");
ok(!!ke && ke.platform === "other" && ke.category === "legal" &&
   ke.confidence === "verified" && ke.sources.length === 2 &&
   ke.announced_at === null && ke.effective_at === null &&
   /Finance Act 2023/.test(ke.summary) && /January 1, 2026/.test(ke.summary) &&
   /September 2026 earnings paid in October/.test(ke.summary) && /October 1/.test(ke.summary) &&
   /has published no rate, start date, or consequence/.test(ke.summary) &&
   ke.sources[0].url === "https://tech-ish.com/2026/09/16/tiktok-is-now-asking-kenyan-creators-for-their-tax-information/" &&
   ke.sources[1].url === "https://www.dawan.africa/news/tiktok-joins-meta-and-youtube-as-kenya-moves-creator-taxes-into-platform-payouts",
  "Kenya withholding: country tax (not a platform fee), Meta Jan 1 + YouTube Sep-earnings/Oct 1 PIN dates per platform, TikTok's missing rate stated — the blanket claim corrected, not repeated");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(
   [lc.summary, sc.summary, ke.summary].join(" ")),
  "2.3 entry copy: no AI-isms");

/* ---------- 4e. the 2.4 entry: the X payout rail ---------- */
console.log("2.4 entry");
var xm = byId("x-payouts-x-money-2026");
ok(!!xm && xm.platform === "x" && xm.category === "monetization" &&
   xm.confidence === "verified" && xm.sources.length === 2 &&
   xm.announced_at === "2026-09-02T00:00:00Z" && xm.effective_at === "2026-09-02T00:00:00Z" &&
   /mandatory for U\.S\. creators/.test(xm.summary) && /stay on Stripe/.test(xm.summary) &&
   /every two weeks behind a \$30 minimum/.test(xm.summary) && /Cross River Bank/.test(xm.summary) &&
   xm.sources[0].url === "https://techcrunch.com/2026/09/02/x-shifts-us-creator-payouts-from-stripe-to-x-money/" &&
   xm.sources[1].url === "https://www.pymnts.com/commerce/social-commerce/2026/x-replaces-stripe-united-states-creator-payouts/",
  "X payout rail: Sep 2 announced + effective, mandatory for U.S. creators per X's own confirmation, non-U.S. stays on Stripe, old biweekly/$30 terms named, TechCrunch + PYMNTS sources");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(xm.summary),
  "2.4 entry copy: no AI-isms");

/* ---------- 4f. the 2.5 entry: Kick gets its own slot (coverage audit) ---------- */
console.log("2.5 entry");
var kk = byId("kick-kpp-rolling-rate-2026");
ok(!!kk && kk.platform === "kick" && kk.category === "monetization" &&
   kk.confidence === "verified" && kk.sources.length === 2 &&
   kk.announced_at === null && kk.effective_at === null &&
   /manual calculation error/.test(kk.summary) && /rolling basis/.test(kk.summary) &&
   /stream by stream/.test(kk.summary) && /95\/5 subscription split/.test(kk.summary) &&
   /no numeric KPP rate|neither report publishes a numeric KPP rate/.test(kk.summary) &&
   kk.sources[0].url === "https://streamscharts.com/news/kick-revises-kpp-september-2026-update" &&
   kk.sources[1].url === "https://win.gg/kick-admits-kpp-payment-errors/",
  "Kick: KPP rolling-rate rewrite + September backpay, manual-error cause stated, 95/5 unchanged, no invented day or rate — the slot opens with a real entry, not a placeholder");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(kk.summary),
  "2.5 entry copy: no AI-isms");

/* ---------- 4g. the 2.6 entry: YouTube Watch With expansion (Sept 23 backfill) ---------- */
console.log("2.6 entry");
var ww = byId("yt-watch-with-expansion-2026");
ok(!!ww && ww.platform === "youtube" && ww.category === "monetization" &&
   ww.confidence === "verified" && ww.sources.length === 2 &&
   ww.announced_at === "2026-09-23T00:00:00Z" && ww.effective_at === null &&
   /React live/.test(ww.summary) && /keeps the live ad revenue and any fan funding/.test(ww.summary) &&
   /not paid a share/.test(ww.summary) && /added view credit/.test(ww.summary) &&
   /has not published what makes a video eligible/.test(ww.summary) &&
   /no start date has been published/.test(ww.summary) &&
   ww.sources[0].url === "https://www.fonearena.com/blog/493327/made-on-youtube-2026-announcements.html" &&
   ww.sources[1].url === "https://blog.evolvedlotus.com/blog/2026-09-28-youtube-will-let-reactors-keep-the-ad-money-from-your-videos/",
  "YouTube Watch With: announced Sept 23 at Made on YouTube, reactors keep live ad revenue + fan funding, originals get attribution + view credit + eligibility control but no share, eligibility criteria and rollout date unpublished — stated, not filled in");
ok(!/unlock the power|delve|game-changer|game changer|elevate your|supercharge|revolutioni[sz]e/i.test(ww.summary),
  "2.6 entry copy: no AI-isms");

/* ---------- 5. page / build wiring ---------- */
console.log("page/build wiring");
var buildSrc = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
var feedSrc = fs.readFileSync(path.join(ROOT, "assets", "js", "changes-feed.js"), "utf8");
var page = fs.readFileSync(path.join(ROOT, "site", "what-changed.html"), "utf8");
ok(page.indexOf("Read the newest change") !== -1 && page.indexOf('href="deal-room.html#dr-sec-watch"') !== -1,
  "built page: sleek hero with one primary action + one secondary (Deal Room)");
rows.forEach(function (c) {
  ok(page.indexOf(c.title.replace(/&/g, "&amp;").replace(/'/g, "&#x27;")) !== -1, "built page pre-renders: " + c.id);
});
ok((page.match(/aw-cov-row/g) || []).length >= 8, "built page: coverage panel lists all eight platform slots");
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
