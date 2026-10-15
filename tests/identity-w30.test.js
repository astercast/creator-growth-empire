/* Wave-30 identity tests: the Field Manual system, wave 2.
 * Verifies the built site/ tree (run AFTER scripts/build.py):
 *  1. radar section maps — every chapter + reference h2 has an anchor id;
 *     every chapter/reference page carries the sidebar + mobile disclosure
 *  2. kill-feed — the homepage signal log: 9 transmissions, case-file links,
 *     no fake timestamps
 *  3. dossier 404 — exists, noindex, MIA stamp, working rally links
 *  4. empty states — dossier plate CSS present; no emoji-as-icon anywhere
 *  5. audit — deferred tool scripts (the head-execution fix), calm toggle,
 *     signature easings, no legacy acid/coral tokens
 * Exit 0 = all pass.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");
var SITE = path.join(ROOT, "site");

var failures = 0;
function ok(cond, name) {
  if (cond) { console.log("  PASS " + name); }
  else { failures++; console.log("  FAIL " + name); }
}
function read(p) { return fs.readFileSync(p, "utf-8"); }
function site(f) { return read(path.join(SITE, f)); }

var chapters = ["phase-0-start-from-nothing", "phase-1-content-engine",
  "phase-2-youtube-mastery", "phase-3-everywhere-engine",
  "phase-4-audience-to-community", "phase-5-monetization-stack",
  "phase-6-merch-and-brand", "phase-7-the-business", "phase-8-scale"];
var refs = ["rate-card", "niche-atlas", "metrics-glossary", "platform-rules-bible"];
var longPages = chapters.concat(refs).map(function (s) { return s + ".html"; });

/* ---------- 1. radar section maps ---------- */
var h2re = /<h2(?![^>]*\bid=)[^>]*>/;
longPages.forEach(function (f) {
  var html = site(f);
  ok(!h2re.test(html), f + ": every h2 carries an anchor id");
  var ids = html.match(/<h2 id="sec-[a-z0-9-]+">/g) || [];
  ok(ids.length > 0, f + ": has section ids (" + ids.length + ")");
  ok(/data-radar[\s>]/.test(html), f + ": radar sidebar present");
  ok(/data-radar-mobile/.test(html), f + ": mobile section-map disclosure present");
  ok(/class="radar-rail"[^>]*role="progressbar"/.test(html), f + ": read-progress rail present");
  // sidebar links match h2 ids 1:1
  var linkIds = (html.match(/<aside class="radar" data-radar>[\s\S]*?<\/aside>/) || [""])[0]
    .match(/href="#(sec-[a-z0-9-]+)"/g) || [];
  var idSet = {};
  ids.forEach(function (m) { idSet[m.match(/id="(sec-[a-z0-9-]+)"/)[1]] = true; });
  var allResolve = linkIds.every(function (m) {
    return idSet[m.match(/href="#(sec-[a-z0-9-]+)"/)[1]];
  });
  ok(allResolve && linkIds.length === ids.length,
    f + ": sidebar links resolve 1:1 to section ids (" + linkIds.length + ")");
});
// ids unique per page
longPages.forEach(function (f) {
  var ids = (site(f).match(/id="(sec-[a-z0-9-]+)"/g) || []).map(function (m) {
    return m.slice(4, -1);
  });
  ok(new Set(ids).size === ids.length, f + ": section ids unique");
});

/* ---------- 2. case files live on their hub (revision 2026-10-15) ----
 * Was: the kill-feed "signal log" on the home, one transmission per case
 * file. The user's confusion verdict removed it: the home is the start
 * of the path now, and the cases are reached from it as stories, in
 * their own place. The case files themselves are untouched and still
 * carry their pages; the hub still lists them. */
var index = site("index.html");
var caseCount = fs.readdirSync(path.join(ROOT, "pages"))
  .filter(function (f) { return /^case-.*\.md$/.test(f); }).length;
ok(caseCount > 0, "case files still exist as pages (" + caseCount + ")");
ok(!/kf-msg|SIGNAL LOG|killfeed/.test(index),
  "no kill-feed signal log on the home (removed, revision 2026-10-15)");
ok(index.includes('href="case-files.html"'), "home links the case files as stories");
ok(fs.existsSync(path.join(SITE, "case-files.html")), "case-files hub still built");

/* ---------- 3. dossier 404 ---------- */
ok(fs.existsSync(path.join(SITE, "404.html")), "site/404.html exists");
var nf = site("404.html");
ok(/<meta name="robots" content="noindex">/.test(nf), "404 is noindex");
ok(/>MIA</.test(nf), "404 carries the MIA stamp");
ok(/FILE[\s\S]*NOT FOUND/.test(nf), "404 stencil headline present");
ok(/brk-stamp/.test(nf), "404 uses stamp-red corner brackets");
["index.html", "tools.html", "case-files.html", "glossary.html"].forEach(function (h) {
  ok(nf.indexOf('href="' + h + '"') !== -1, "404 rally link -> " + h);
});

/* ---------- 4. empty states ---------- */
var motifs = read(path.join(ROOT, "assets", "css", "motifs.css"));
ok(/\.empty-state::before/.test(motifs) && /AWAITING ORDERS/.test(motifs),
  "motifs.css: empty states carry the AWAITING ORDERS ghost stamp");
ok(/\.empty-state \.empty-icon/.test(motifs), "motifs.css: boxed glyph icon style");
ok(!/\.empty-state/.test(read(path.join(ROOT, "assets", "css", "hub.css"))),
  "hub.css no longer defines .empty-state (single source: motifs.css)");
// no emoji-as-icon in any empty-icon span, static or JS-rendered.
// The exact codepoints wave 30 removed (precision over broad ranges — the
// tactical glyphs ◉▦◬∑⌖✦◫⌂✚⧉⌗◷⇄! live in nearby blocks and must NOT trip this).
var emojiRe = /[🎬🗓⚖⚒🎣💡🩺🧭📁📝⚠️️]/u;
var bad = [];
fs.readdirSync(path.join(ROOT, "pages")).filter(function (f) { return f.endsWith(".html"); })
  .forEach(function (f) {
    var hits = (read(path.join(ROOT, "pages", f)).match(/empty-icon" aria-hidden="true">([^<]*)</g) || [])
      .filter(function (m) { return emojiRe.test(m); });
    if (hits.length) bad.push("pages/" + f);
  });
fs.readdirSync(path.join(ROOT, "assets", "js")).filter(function (f) { return f.endsWith(".js"); })
  .forEach(function (f) {
    var hits = (read(path.join(ROOT, "assets", "js", f)).match(/empty-icon[^<]*<\/span>/g) || [])
      .filter(function (m) { return emojiRe.test(m); });
    if (hits.length) bad.push("assets/js/" + f);
  });
ok(bad.length === 0, "no emoji-as-icon in empty states" + (bad.length ? " (" + bad.join(", ") + ")" : ""));
// the built pages inherit the same guarantee
var siteBad = [];
fs.readdirSync(SITE).filter(function (f) { return f.endsWith(".html"); }).forEach(function (f) {
  var hits = (site(f).match(/empty-icon" aria-hidden="true">([^<]*)</g) || [])
    .filter(function (m) { return emojiRe.test(m); });
  if (hits.length) siteBad.push(f);
});
ok(siteBad.length === 0, "no emoji-as-icon in built pages" + (siteBad.length ? " (" + siteBad.join(", ") + ")" : ""));

/* ---------- 5. audit ---------- */
// deferred tool/reference scripts (the head-execution fix)
var toolPages = ["quiz", "calculator", "planner", "deal-analyzer", "deal-room",
  "hiring-calculator", "repurpose", "simulator", "api-explorer", "hook-builder",
  "idea-bank", "content-calendar", "batching", "money-map", "video-doctor",
  "ypp-checker", "outreach", "crosspost", "cadence"];
var undeferred = toolPages.filter(function (s) {
  var h = site(s + ".html");
  // site.js rides at end-of-body and is intentionally classic; everything
  // injected into <head> must be deferred (the wave-30 audit fix)
  var tags = (h.match(/<script (?:defer )?src="assets\/js\/[^"]+"><\/script>/g) || [])
    .filter(function (t) { return t.indexOf("site.js") === -1; });
  return tags.some(function (t) { return t.indexOf("defer") === -1; });
});
ok(undeferred.length === 0, "all tool scripts deferred" + (undeferred.length ? " (" + undeferred.join(", ") + ")" : ""));
ok(/<script defer src="assets\/js\/platform-rules-ui\.js"><\/script>/.test(site("platform-rules-bible.html")),
  "reference wayfinding script deferred");
ok(/if \(h\.id\) return/.test(read(path.join(ROOT, "assets", "js", "platform-rules-ui.js"))),
  "platform-rules-ui.js preserves build-time ids");
// calm toggle: REMOVED by the revision of 2026-10-15, on the user's
// direct callout (he found the header CALM switch and asked what it even
// is; a control a first-time visitor cannot understand at a glance is a
// defect). Motion is gentle by default; the device setting rules alone.
ok(!index.includes("calmToggle"), "no CALM toggle in the header (removed, revision 2026-10-15)");
ok(!/cge\.calm/.test(index), "no calm store read anywhere in the home");
ok(!/data-calm/.test(motifs), "motifs.css carries no data-calm kill rules");
ok(/prefers-reduced-motion: reduce/.test(read(path.join(ROOT, "assets", "css", "guide.css"))),
   "reduced motion honored in the guide layer, no toggle needed");
// signature easings (web-craft round 4)
var tokens = read(path.join(ROOT, "assets", "css", "tokens.css"));
ok(/--ease-decelerate:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/.test(tokens),
  "tokens.css: expo.out as the primary reveal easing");
ok(/--ease-emphasized:\s*cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/.test(tokens),
  "tokens.css: back.out(1.7) reserved for the emphasized accent");
ok(/--ease-emphasized/.test(motifs), "stamp slam uses the emphasized easing");
// no legacy palette tokens left
var cssFiles = fs.readdirSync(path.join(ROOT, "assets", "css")).filter(function (f) { return f.endsWith(".css"); });
var legacy = cssFiles.filter(function (f) { return /--acid|--coral/.test(read(path.join(ROOT, "assets", "css", f))); });
ok(legacy.length === 0, "no --acid/--coral tokens in CSS" + (legacy.length ? " (" + legacy.join(", ") + ")" : ""));

console.log(failures === 0 ? "\nidentity-w30: all tests passed"
  : "\nidentity-w30: " + failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
