/* First cron-cycle exercise for Algorithm Watch (Rotation 5, 2.2).
 * Run: node tests/algorithm-watch-cron.test.js — exit 0 = all pass.
 *
 * The Rotation 4 wave wired Twitch into the cron (detectPlatform,
 * the tw- id prefix, and the sponsor- relevance/classification gates)
 * but never ran a cycle against it. This suite does, at test level:
 * the REAL handler (api/functions/cron/algorithm-watch.js) runs
 * against stubbed upstream RSS and the REAL feed file as its dedupe
 * baseline. No feed entries are fabricated into data/changes.json —
 * the cron's would-be additions live only in the response envelope
 * (no GITHUB_REPO_TOKEN in tests, so the job runs read-only and
 * commits nothing).
 *
 * Contract:
 *  1. Auth fails closed: no CRON_SECRET / wrong secret -> 401;
 *     non-GET -> 405.
 *  2. A Twitch sponsorship story passes the relevance gate on its
 *     sponsor- terms alone, classifies as monetization, detects as
 *     twitch, and gets a tw- id.
 *  3. A story that duplicates the shipped Twitch entry (same link,
 *     or same title behind a different link) is deduped, not re-added.
 *  4. An off-topic story is filtered by the relevance gate.
 *  5. A dead upstream feed degrades the envelope honestly
 *     (sources_ok 2/3, degraded note) instead of failing the run.
 *  6. A second delivery inside 60s is suppressed as a duplicate.
 *  7. The client renderer (assets/js/changes-feed.js) renders the
 *     shipped Twitch entry end to end: platform/category/confidence
 *     chips, announced/effective/logged dates, source links, the
 *     Twitch filter chip, and the coverage row.
 *  8. Rotation 6 (2.3): the third upstream is Tubefilter's Twitch tag
 *     feed (probed live 2026-10-12: 200 RSS, 12/12 items Twitch-tagged,
 *     where the two general feeds carried 0 Twitch stories). A Twitch
 *     Shopping story served ONLY by that feed survives — the relevance
 *     gate now carries the shop term its own monetization classifier
 *     already used, the same gate/classifier mismatch Rotation 4
 *     fixed for sponsor- — and a Twitch story with no gate terms is
 *     still filtered, from the tag feed as from any other.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var ROOT = path.join(__dirname, "..");
var CRON_PATH = path.join(ROOT, "api", "functions", "cron", "algorithm-watch.js");

var failures = 0, total = 0;
function ok(cond, name) {
  total++;
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}

/* ---------- harness: mock res, stubbed fetch, fresh handler ---------- */
function mockRes() {
  return {
    statusCode: 0, headers: {}, body: null,
    setHeader: function (k, v) { this.headers[k] = v; },
    end: function (s) { this.body = s; },
    json: function () { return JSON.parse(this.body); }
  };
}
function mockReq(method, secret) {
  return { method: method || "GET", headers: secret ? { authorization: "Bearer " + secret } : {} };
}
function freshHandler() {
  delete require.cache[require.resolve(CRON_PATH)];
  return require(CRON_PATH);
}
function rss(items) {
  var body = items.map(function (i) {
    return "<item><title>" + i.title + "</title><link>" + i.link + "</link>" +
      "<pubDate>" + (i.pub || "Mon, 12 Oct 2026 09:00:00 GMT") + "</pubDate>" +
      "<description>" + i.desc + "</description></item>";
  }).join("");
  return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>' +
    "<title>stub feed</title>" + body + "</channel></rss>";
}
function stubFetch(map) {
  global.fetch = function (url) {
    var hit = map[String(url)];
    if (!hit) return Promise.reject(new Error("unstubbed url: " + url));
    if (hit.fail) return Promise.resolve({ ok: false, status: hit.fail, text: function () { return Promise.resolve(""); } });
    return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(hit.xml); } });
  };
}
var TUBEFILTER = "https://www.tubefilter.com/feed/";
var SMT = "https://www.socialmediatoday.com/feeds/news/";
var TF_TWITCH = "https://www.tubefilter.com/tag/twitch/feed/";
var SECRET = "test-cron-secret-0123456789";
process.env.CRON_SECRET = SECRET;
delete process.env.GITHUB_REPO_TOKEN;
delete process.env.GITHUB_REPO;

var TWITCH_STORY = {
  title: "Twitch expands sponsorship deals for mid-size streamers",
  link: "https://example.com/twitch-sponsorship-expansion",
  desc: "Twitch said brands can sponsor more streamers through its dashboard, with sponsorship revenue paid to creators who finish the certification."
};
var EXISTING_TWITCH_TITLE = "Twitch opened Creator Sponsorships to Affiliates on Aug 20, 2026";
var EXISTING_TWITCH_LINK = "https://www.panstag.com/2026/08/twitch-creator-sponsorships-affiliates.html";

async function main() {
  /* ---------- 1. auth + method gates ---------- */
  console.log("auth + method gates");
  var savedSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  var res = mockRes();
  await freshHandler()(mockReq("GET"), res);
  ok(res.statusCode === 401 && res.json().error.code === "UNAUTHORIZED",
    "no CRON_SECRET configured -> 401, fail closed");
  process.env.CRON_SECRET = savedSecret;
  res = mockRes();
  await freshHandler()(mockReq("GET", "wrong-secret-wrong-secret"), res);
  ok(res.statusCode === 401, "wrong bearer secret -> 401");
  res = mockRes();
  await freshHandler()(mockReq("POST", SECRET), res);
  ok(res.statusCode === 405, "POST -> 405, only GET runs the job");

  /* ---------- 2-5. cycle A: Twitch sponsor story, dupes, off-topic, dead feed ---------- */
  console.log("cycle A: twitch sponsorship story end to end");
  stubFetch({
    [TUBEFILTER]: { xml: rss([
      TWITCH_STORY,
      { title: EXISTING_TWITCH_TITLE, link: EXISTING_TWITCH_LINK,
        desc: "Sponsorship revenue for Affiliates, announced again." },
      { title: "Studio announces a new cooking show for fall", link: "https://example.com/cooking-show",
        desc: "A beloved chef returns with twelve episodes of weeknight dinners." }
    ]) },
    [SMT]: { fail: 503 },
    [TF_TWITCH]: { xml: rss([]) }
  });
  res = mockRes();
  await freshHandler()(mockReq("GET", SECRET), res);
  var body = res.json();
  ok(res.statusCode === 200 && body.ok === true, "cycle A: handler returns a 200 ok envelope");
  ok(body.data.sources_ok === "2/3" && body.meta.degraded === true &&
     /socialmediatoday-rss/.test(body.meta.note || ""),
    "cycle A: the dead feed degrades the run honestly (sources_ok 2/3, named in the note)");
  ok(body.data.new_changes.length === 1,
    "cycle A: exactly one new change survives the gates (dupe + off-topic filtered)");
  var nc = body.data.new_changes[0] || {};
  ok(nc.platform === "twitch" && nc.category === "monetization",
    "cycle A: the Twitch sponsorship story classifies platform=twitch, category=monetization");
  ok(/^tw-twitch-expands-sponsorship-deals-/.test(nc.id || ""),
    "cycle A: the new entry id carries the tw- prefix: " + (nc.id || "(none)"));
  ok(nc.title === TWITCH_STORY.title, "cycle A: the surviving change is the Twitch story itself");
  var cronFeedCount = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "v1", "changes.json"), "utf8")).changes.length;
  var srcFeedCount = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "changes.json"), "utf8")).changes.length;
  ok(cronFeedCount === srcFeedCount,
    "cycle A: the file the cron reads (data/v1/changes.json) matches the source feed (" + srcFeedCount + " entries)");
  ok(body.data.retained === cronFeedCount + 1,
    "cycle A: retained = the shipped " + cronFeedCount + " entries + 1 fresh (nothing pruned, nothing lost)");
  ok(body.data.committed === false && /read-only|no-token/.test(body.data.commit_reason || ""),
    "cycle A: no token in tests -> read-only, the would-be change is reported, never committed");

  /* ---------- 3b. cycle B: sponsor- gate alone + cross-link title dedupe ---------- */
  console.log("cycle B: sponsor- gate carries a story on its own");
  stubFetch({
    [TUBEFILTER]: { xml: rss([
      { title: "Sponsorship marketplace opens to streamers", link: "https://example.com/sponsor-marketplace",
        desc: "Streamers can list themselves for sponsorship deals with brands." }
    ]) },
    [SMT]: { xml: rss([
      { title: EXISTING_TWITCH_TITLE, link: "https://example.com/a-different-link-to-the-same-story",
        desc: "Sponsorship revenue for Affiliates through the Twitch dashboard." }
    ]) },
    [TF_TWITCH]: { xml: rss([]) }
  });
  res = mockRes();
  await freshHandler()(mockReq("GET", SECRET), res);
  body = res.json();
  ok(body.data.sources_ok === "3/3" && body.meta.degraded === false,
    "cycle B: all three feeds up -> sources_ok 3/3, not degraded");
  ok(body.data.new_changes.length === 1 && body.data.new_changes[0].category === "monetization" &&
     /^cw-/.test(body.data.new_changes[0].id || ""),
    "cycle B: a sponsor- story with no platform name still passes the gate and classifies monetization (other/cw-)");
  ok(!body.data.new_changes.some(function (e) { return /creator-sponsorships/.test(e.id); }),
    "cycle B: the shipped Twitch entry is deduped by title even behind a different link");

  /* ---------- 5b. cycle C: the Twitch tag feed carries a Twitch story ---------- */
  console.log("cycle C: twitch tag feed sourcing");
  stubFetch({
    [TUBEFILTER]: { xml: rss([]) },
    [SMT]: { xml: rss([]) },
    [TF_TWITCH]: { xml: rss([
      { title: "Twitch has streaming deals in its new Shopping category",
        link: "https://example.com/twitch-shopping-category",
        desc: "Twitch is linking up with Amazon to populate a new Shopping category that showcases streamers who are selling products to their viewers." },
      { title: "Twitch streamer completes a 3,000-mile walk for charity",
        link: "https://example.com/twitch-walk",
        desc: "Fans followed along as the walk crossed the country, one town at a time." }
    ]) }
  });
  res = mockRes();
  await freshHandler()(mockReq("GET", SECRET), res);
  body = res.json();
  ok(body.data.sources_ok === "3/3",
    "cycle C: the handler consults all three upstreams, including the Twitch tag feed");
  ok(body.data.new_changes.length === 1,
    "cycle C: exactly one tag-feed story survives (the gate still filters Twitch stories with no watch terms)");
  var shop = body.data.new_changes[0] || {};
  ok(shop.platform === "twitch" && shop.category === "monetization" && /^tw-/.test(shop.id || ""),
    "cycle C: the Shopping story classifies twitch/monetization with a tw- id — the shop gate term carries it");
  ok(shop.title === "Twitch has streaming deals in its new Shopping category",
    "cycle C: the surviving change is the tag feed's Shopping story itself");

  /* ---------- 5c. cycle D: a Kick story classifies into the new slot (2.5) ---------- */
  console.log("cycle D: kick slot classification");
  stubFetch({
    [TUBEFILTER]: { xml: rss([
      { title: "Kick revises Partner Program payout calculations for streamers",
        link: "https://example.com/kick-kpp-rolling-rate",
        desc: "Kick said Partner Program payout rates now use recent broadcasts, after September payment errors were repaid to creators." }
    ]) },
    [SMT]: { xml: rss([]) },
    [TF_TWITCH]: { xml: rss([]) }
  });
  res = mockRes();
  await freshHandler()(mockReq("GET", SECRET), res);
  body = res.json();
  ok(body.data.new_changes.length === 1,
    "cycle D: exactly one new change survives (the Kick story)");
  var kick = body.data.new_changes[0] || {};
  ok(kick.platform === "kick" && kick.category === "monetization" && /^ki-/.test(kick.id || ""),
    "cycle D: the Kick payout story classifies kick/monetization with a ki- id — the 2.5 slot is wired into the cron, not just the feed");

  /* ---------- 6. duplicate delivery cooldown ---------- */
  console.log("duplicate delivery");
  stubFetch({ [TUBEFILTER]: { xml: rss([]) }, [SMT]: { xml: rss([]) }, [TF_TWITCH]: { xml: rss([]) } });
  var handler = freshHandler();
  res = mockRes();
  await handler(mockReq("GET", SECRET), res);
  ok(res.json().data.checked === true, "first delivery runs the check");
  res = mockRes();
  await handler(mockReq("GET", SECRET), res);
  var dup = res.json();
  ok(dup.data.checked === false && dup.data.duplicate === true,
    "second delivery inside 60s is suppressed as a duplicate");

  /* ---------- 7. client render of the shipped Twitch entry ---------- */
  console.log("changes-feed render");
  var feed = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "changes.json"), "utf8"));
  function el() { return { innerHTML: "", textContent: "", hidden: false, addEventListener: function () {} }; }
  var listEl = el(), filtersEl = el(), countEl = el(), updatedEl = el(), statusEl = el(), coverageEl = el();
  var rootEl = { querySelector: function (sel) {
    return { "[data-aw-list]": listEl, "[data-aw-filters]": filtersEl, "[data-aw-count]": countEl,
      "[data-aw-updated]": updatedEl, "[data-aw-status]": statusEl, "[data-aw-coverage]": coverageEl }[sel] || null;
  } };
  var sandbox = {
    console: console,
    document: {
      readyState: "complete",
      querySelector: function (sel) { return sel === "[data-changes-feed]" ? rootEl : null; },
      getElementById: function () { return null; },
      addEventListener: function () {}
    }
  };
  sandbox.window = sandbox;
  sandbox.window.ApiClient = {
    fetchWithFallback: function () {
      return Promise.resolve({ data: feed, source: "static", degraded: false, generatedAt: feed.generated_at });
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets", "js", "changes-feed.js"), "utf8"), sandbox);
  await new Promise(function (r) { setImmediate(r); });
  await new Promise(function (r) { setImmediate(r); });
  ok(listEl.innerHTML.indexOf('data-platform="twitch"') !== -1 &&
     listEl.innerHTML.indexOf("Twitch opened Creator Sponsorships to Affiliates on Aug 20, 2026") !== -1,
    "render: the Twitch entry renders as a twitch-platform card");
  ok(listEl.innerHTML.indexOf(">Twitch</span>") !== -1 &&
     listEl.innerHTML.indexOf(">Monetization</span>") !== -1 &&
     listEl.innerHTML.indexOf("aw-chip-verified") !== -1,
    "render: Twitch / Monetization / Verified chips all present");
  ok(listEl.innerHTML.indexOf("Announced Aug 20, 2026") !== -1 &&
     listEl.innerHTML.indexOf("Takes effect Aug 20, 2026") !== -1 &&
     listEl.innerHTML.indexOf("Logged Oct 12, 2026") !== -1,
    "render: announced / effective / logged dates print for the Twitch entry");
  ok(listEl.innerHTML.indexOf(EXISTING_TWITCH_LINK) !== -1,
    "render: the Twitch entry's source link renders verbatim");
  ok(coverageEl.innerHTML.indexOf(">Twitch</span>") !== -1 &&
     /Twitch<\/span><span class="aw-cov-n">1 entry<\/span>/.test(coverageEl.innerHTML) &&
     coverageEl.innerHTML.indexOf("newest Oct 12, 2026") !== -1,
    "render: coverage panel carries the Twitch row (1 entry, newest Oct 12, 2026)");
  ok(listEl.innerHTML.indexOf('data-platform="kick"') !== -1 &&
     coverageEl.innerHTML.indexOf(">Kick</span>") !== -1 &&
     /Kick<\/span><span class="aw-cov-n">1 entry<\/span>/.test(coverageEl.innerHTML) &&
     filtersEl.innerHTML.indexOf('data-aw-platform="kick"') !== -1 &&
     filtersEl.innerHTML.indexOf("Kick · 1") !== -1,
    "render: the Kick entry renders as a kick-platform card with its coverage row and filter chip");
  ok(filtersEl.innerHTML.indexOf('data-aw-platform="twitch"') !== -1 &&
     filtersEl.innerHTML.indexOf("Twitch · 1") !== -1 &&
     filtersEl.innerHTML.indexOf("Facebook · 3") !== -1,
    "render: filter chips include Twitch · 1 and Facebook · 3 (originality + the Oct 8 Meta entry + the link-cap test)");

  console.log("\n" + (total - failures) + "/" + total + " assertions" +
    (failures === 0 ? " — ALL PASS" : " — " + failures + " FAILURES"));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(function (e) {
  console.log("  FAIL harness error: " + (e && e.stack || e));
  process.exit(1);
});
