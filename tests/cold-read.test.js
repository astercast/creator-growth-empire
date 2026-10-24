/*
 * cold-read.test.js (revision 2026-10-15).
 *
 * The timed cold-read, mechanized: strip the built home page to the
 * words a first-time visitor actually sees, in order, and require that
 * a fresh reader meets the path's promise and the first three actions,
 * in order, inside the first screenful of text. Plus the absence law:
 * no calm machinery anywhere in the shipped site (the user's exhibit A:
 * a control a first-time visitor cannot understand at a glance).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "site");
let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; } else { fail++; console.log("FAIL:", label); }
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const home = visibleText(fs.readFileSync(path.join(SITE, "index.html"), "utf8"));
const first = home.slice(0, 2500);
// Rotation 135 re-pin: the Build Booklet cover splits the title's period into its
// own .dot span, so the stripped text reads "from nothing ." with a space; the
// promise and its first-screenful position are unchanged.
ok(first.includes("Build a career from nothing"), "cold read: the promise is in the first screenful");
const moves = ["Read Phase 0: Start From Nothing", "Write your niche statement", "Run the money check on three niches"];
let at = -1, ordered = true;
for (const m of moves) {
  const i = first.indexOf(m, at + 1);
  if (i === -1) { ordered = false; break; }
  at = i;
}
ok(ordered, "cold read: the first three actions appear in order in the first 2,500 visible characters");
// Rotation 135 re-pin: the booklet labels the first moves "Start here"
// (the graded extraction's fs-head), replacing "Your first three moves".
ok(first.includes("Start here"), "cold read: the first moves are labeled as such");
ok(!/specimen|signal log|contents/i.test(first.slice(0, 1200)), "cold read: no directory machinery in the opening text");

// the absence law: no calm machinery in any shipped file
const offenders = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js|css)$/.test(e.name)) {
      const t = fs.readFileSync(p, "utf8");
      if (/calmToggle|cge\.calm|data-calm|s-calm/.test(t)) offenders.push(path.relative(SITE, p));
    }
  }
})(SITE);
ok(offenders.length === 0, "no calm machinery anywhere in the shipped site" +
   (offenders.length ? " (offenders: " + offenders.join(", ") + ")" : ""));

console.log("cold-read: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
