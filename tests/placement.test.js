"use strict";
/* placement.test.js — rotation 13 placement-pass tripwire.
 * Every generated page must carry the generator's placement block:
 * OG/Twitter card meta (relative og:image until GO_LIVE absolutizes it),
 * theme-color from the site's own --bg token, the HUD-reticle favicon
 * links, and a root-relative canonical (every page except the noindex
 * 404). The OG card, icon files, and robots.txt must exist in site/.
 * If a future template edit drops any of this, this suite fails. */
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var SITE = path.join(ROOT, "site");
var failures = 0, passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log("PASS " + msg); }
  else { failures++; console.log("FAIL " + msg); }
}

var pages = fs.readdirSync(SITE).filter(function (f) { return f.endsWith(".html"); }).sort();
ok(pages.length >= 58, "generated pages present (" + pages.length + ")");

var NEEDLES = [
  '<meta property="og:type" content="website">',
  '<meta property="og:image" content="assets/og-card.png">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="twitter:image" content="assets/og-card.png">',
  '<meta name="theme-color" content="#F3F0E8">', // Rotation 135 re-pin: the Build Booklet's paper theme (Aesthetics Round 366 graded extraction) sets the paper theme-color on every page; the R21 dark-ground value retired with that theme.
  '<link rel="icon" href="/favicon.ico" sizes="48x48">',
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
];
pages.forEach(function (f) {
  var t = fs.readFileSync(path.join(SITE, f), "utf8");
  NEEDLES.forEach(function (n) {
    ok(t.includes(n), f + " carries " + n.slice(0, 44));
  });
  var title = (t.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  ok(t.includes('<meta property="og:title" content="' + title + '">'), f + " og:title mirrors <title>");
  ok((t.match(/<h1[\s>]/g) || []).length === 1, f + " exactly one <h1>");
  if (f === "404.html") {
    ok(!t.includes('rel="canonical"'), "404.html carries no canonical (noindex page)");
  } else {
    ok(t.includes('<link rel="canonical" href="/' + f + '">'), f + " canonical is root-relative self path");
  }
});

var og = fs.readFileSync(path.join(SITE, "assets", "og-card.png"));
ok(og.length === 31932, "site/assets/og-card.png is the packet card (31,932 B)");
ok(og.readUInt32BE(16) === 1200 && og.readUInt32BE(20) === 630, "og-card.png is 1200x630");

["favicon.svg", "favicon.ico", "icon-192.png", "icon-512.png", "apple-touch-icon.png"].forEach(function (f) {
  ok(fs.existsSync(path.join(SITE, f)) && fs.statSync(path.join(SITE, f)).size > 0, "site/" + f + " exists");
});
var svg = fs.readFileSync(path.join(SITE, "favicon.svg"), "utf8");
ok(svg.includes("#0d120d") && svg.includes("#5fe8ff") && svg.includes("#ffc42e"),
  "favicon.svg uses the site tokens (--bg, --cyan, --gold)");

var robots = fs.readFileSync(path.join(SITE, "robots.txt"), "utf8");
ok(/User-agent: \*/.test(robots) && /Allow: \//.test(robots), "robots.txt is allow-all");
ok(!/Sitemap:/.test(robots), "robots.txt has no Sitemap pointer (this repo publishes no sitemap)");

var index = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
ok(index.includes('"@type": "WebSite"') && index.includes("application/ld+json"), "index carries honest WebSite JSON-LD");
ok(!/aggregateRating|reviewCount/.test(index), "index JSON-LD invents no ratings");
var tools = fs.readFileSync(path.join(SITE, "tools.html"), "utf8");
ok(tools.includes('"@type": "ItemList"'), "tools hub carries ItemList JSON-LD");

console.log("\nplacement: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
