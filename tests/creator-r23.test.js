/*
 * creator-r23.test.js, REWRITTEN for the revision of 2026-10-15.
 *
 * History: rotation 23 pinned the makeover home (the specimen plate, the
 * complete-contents wall, the nine numbered Path plates, the Path page's
 * naming demonstration). The user's verdict on that home was "extremely
 * confusing", so the revision replaced it wholesale, and this suite now
 * pins the replacement:
 *   1. foundation sub-checks (retained, size re-based): the Archivo
 *      variable font ships from the repo (subset since rotation 23, so
 *      the pin is existence at real-font size, not the old 100 kB).
 *   2. vercel.json (retained): function entries are explicit paths, each
 *      with maxDuration 10, and no runtime is pinned anywhere.
 *   3. the home IS the start of the path: its h1 speaks to a beginner,
 *      the first three steps appear in order with their real titles, the
 *      five stages appear in order under their plain names, the progress
 *      wiring (home-path.js + the shared store) is present, and the old
 *      directory machinery (specimen plate, contents wall, kill-feed) is
 *      absent.
 *   4. chrome: the desktop nav is three plain words; the CALM toggle is
 *      gone from the shipped site entirely; reduced motion is honored.
 *   5. findability (the VP-0045 principle, new mechanism): every phase
 *      page is linked from the home page or is the chapter of a lesson on
 *      the Path (lessons.json href), so no phase is orphaned.
 *   6. deep reads open with the plain-words box; the Toolbox and Words to
 *      Know carry their plain names; the Path page explains itself in
 *      easy words and carries no naming demonstration.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "site");
const rd = (p) => fs.readFileSync(p, "utf8");
let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; } else { fail++; console.log("FAIL:", label); }
}

// ---------- 1. the variable display face ships from the repo ----------
// (The rotation-23 original asserted >100 kB; the Archivo face has since
// been subset, so the pin is now: the Archivo variable woff2 is declared
// and ships, at real-font size.)
const fontsCss = rd(path.join(SITE, "assets/css/fonts.css"));
const fontUrl = fontsCss.match(/url\(["']?([^)"']*archivo[^)"']*\.woff2)["']?\)/);
ok(!!fontUrl, "fonts.css references the Archivo variable woff2");
if (fontUrl) {
  const fontPath = path.join(SITE, "assets/css", fontUrl[1]);
  ok(fs.existsSync(fontPath), "the Archivo woff2 exists in the built site");
  if (fs.existsSync(fontPath)) {
    const bytes = fs.statSync(fontPath).size;
    ok(bytes > 10 * 1024, "the Archivo woff2 is a real font (>10 kB), got " + bytes);
  }
}

// ---------- 2. vercel.json: explicit paths, maxDuration 10, no runtime ----------
const vercelPath = path.join(ROOT, "vercel.json");
ok(fs.existsSync(vercelPath), "vercel.json exists");
const vercel = JSON.parse(rd(vercelPath));
const fnEntries = Object.entries(vercel.functions || {});
ok(fnEntries.length > 0, "vercel.json declares functions");
for (const [p, cfg] of fnEntries) {
  ok(!/[*?]/.test(p), "function path is explicit (no glob): " + p);
  ok(cfg && cfg.maxDuration === 10, "function carries maxDuration 10: " + p);
  ok(!(cfg && "runtime" in cfg), "function pins no runtime: " + p);
}

// ---------- 3. the home is the start of the path ----------
const index = rd(path.join(SITE, "index.html"));
// Rotation 135 re-pin: the Build Booklet cover carries the same h1 words in its
// cover-title form (class + line/dot spans, graded extraction verbatim).
ok(index.includes('<h1 class="cover-title" id="cover-title">Build a career'), "home h1 speaks to a beginner");
ok((index.match(/<h1[\s>]/g) || []).length === 1, "home carries exactly one h1");
// Rotation 135 re-pin: the booklet's step panels carry giant numerals and
// "Stage 1" kickers, not "Step 1.1" labels; the order evidence is the three
// steps' own lesson toggles in document order (same store home-path.js writes).
const i11 = index.indexOf('data-lesson-toggle="f-read-phase0"');
const i12 = index.indexOf('data-lesson-toggle="f-drill-statement"');
const i13 = index.indexOf('data-lesson-toggle="f-drill-money"');
ok(i11 > -1 && i12 > i11 && i13 > i12, "the first three steps appear in order (1.1, 1.2, 1.3)");
ok(index.includes("Read Phase 0: Start From Nothing"), "step 1.1 carries its real title");
ok(index.includes("Write your niche statement"), "step 1.2 carries its real title");
ok(index.includes("Run the money check on three niches"), "step 1.3 carries its real title");
const stageNames = ["Start From Nothing", "Make Your Videos", "Post and Keep Posting", "Grow Your People", "Turn It Into a Career"];
let lastAt = -1, stagesOrdered = true;
for (const name of stageNames) {
  const at = index.indexOf(name, lastAt + 1);
  if (at === -1) { stagesOrdered = false; break; }
  lastAt = at;
}
ok(stagesOrdered, "the five stages appear in order under their plain names");
ok(index.includes("Start with nothing. Build a career, one small step at a time."), "the plain tagline rides the home");
ok(index.includes('id="home-path-data"'), "home carries the path data block");
ok(index.includes('data-lesson-toggle="f-read-phase0"'), "home step checkboxes write the shared path store");
ok(index.includes("assets/js/home-path.js"), "home loads the progress wiring");
ok(!index.includes("specimen"), "no specimen plate on the home");
ok(!index.includes('class="ci-') && !index.includes(">CONTENTS<"), "no complete-contents wall on the home");
ok(!index.includes("signal-log"), "no kill-feed signal log on the home");
ok(!index.includes("Trending formats"), "no trends widget competing on the home");

// ---------- 4. chrome: three plain words, and no CALM anywhere ----------
const nav = index.match(/<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/);
ok(!!nav, "desktop nav present");
if (nav) {
  const links = [...nav[1].matchAll(/>([^<]+)<\/a>/g)].map((m) => m[1].trim());
  ok(JSON.stringify(links) === JSON.stringify(["The Path", "Toolbox", "Words to Know"]),
     "desktop nav is three plain words, got " + JSON.stringify(links));
}
ok(!index.includes("calmToggle"), "no CALM toggle in the shipped home");
ok(!/cge\.calm|data-calm/.test(index), "no calm machinery in the shipped home");
const motifs = rd(path.join(SITE, "assets/css/motifs.css"));
ok(!/data-calm/.test(motifs), "motifs.css carries no data-calm rules");
const guide = rd(path.join(SITE, "assets/css/guide.css"));
ok(/prefers-reduced-motion: reduce/.test(guide), "reduced motion is honored in the guide layer");

// ---------- 5. findability: no phase is orphaned ----------
const lessons = JSON.parse(rd(path.join(ROOT, "data/v1/lessons.json"))).lessons;
const lessonHrefs = new Set(lessons.map((l) => l.href).filter(Boolean));
const phasePages = fs.readdirSync(SITE).filter((f) => /^phase-\d-.*\.html$/.test(f));
ok(phasePages.length === 9, "nine phase pages built, got " + phasePages.length);
for (const page of phasePages) {
  ok(index.includes('href="' + page + '"') || lessonHrefs.has(page),
     "phase reachable from home or from its Path lesson: " + page);
}

// ---------- 6. plain layer on the deep surfaces ----------
const phase0 = rd(path.join(SITE, "phase-0-start-from-nothing.html"));
ok(phase0.includes('id="plain-words"') && phase0.includes("In easy words"), "chapter pages open with the plain-words box");
ok(phase0.includes("Pick your topic, and write it in one line."), "the box states the one job");
const toolsHub = rd(path.join(SITE, "tools.html"));
ok(toolsHub.includes("<h1>The Toolbox</h1>"), "tools hub carries its plain name");
const glossary = rd(path.join(SITE, "glossary.html"));
ok(glossary.includes("<h1>Words to Know</h1>"), "glossary carries its plain name");
const pathPage = rd(path.join(SITE, "career-path.html"));
ok(!pathPage.includes("cp-demo"), "the naming demonstration is gone from the Path page");
ok(!pathPage.includes("How this manual names things"), "no naming lecture on the Path page");
ok(pathPage.includes("only when it is done"), "the Path page explains ticking in easy words");
for (const id of ["cp-readout", "cp-next", "cp-path", "cp-shelf-line", "cp-export", "cp-copy"]) {
  ok(pathPage.includes('id="' + id + '"'), "path page keeps the UI mount: " + id);
}

console.log("creator-r23: " + pass + " PASS, " + fail + " FAIL");
process.exit(fail ? 1 : 0);
