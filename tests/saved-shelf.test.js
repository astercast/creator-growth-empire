/* Saved Shelf tests. Run: node tests/saved-shelf.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var SS = require(path.join(ROOT, "assets", "js", "saved-shelf.js"));
var failures = 0, passes = 0;
function ok(c, n) { if (c) { passes++; console.log("  PASS " + n); } else { failures++; console.log("  FAIL " + n); } }

var CATALOG = [
  { id: "quiz", title: "Niche Picker", description: "Answer 6 questions, get ranked niche suggestions.", page: "quiz.html" },
  { id: "deal-pipeline", title: "Deal Pipeline", description: "Your live sponsorship deals on one board.", page: "deal-pipeline.html" },
  { id: "platform-ledger", title: "Platform Ledger", description: "Every platform on the board as one total.", page: "platform-ledger.html" },
  { id: "saved-shelf", title: "Saved Shelf", description: "Your saved tools, held as one shelf.", page: "saved-shelf.html" }
];

console.log("saved-shelf — the saved set, joined against the catalogue");
var s = SS.buildShelf(CATALOG, ["platform-ledger", "quiz"]);
ok(s.ok && s.savedCount === 2 && s.catalogCount === 4, "two saves join against a four-tool catalogue");
ok(s.entries.map(function (e) { return e.id; }).join("|") === "platform-ledger|quiz",
  "entries come back in save order, not catalogue order");
ok(s.entries[0].title === "Platform Ledger" && s.entries[0].page === "platform-ledger.html" &&
   s.entries[0].description === "Every platform on the board as one total.",
  "each entry carries the catalogue's own title, page, and description — nothing rewritten");
ok(SS.normalizeSaved(["a", "a", 7, "", "b", null]).join("|") === "a|b",
  "normalizeSaved keeps first-save order, drops duplicates and non-strings");
var base = ["quiz"];
var added = SS.toggleSaved(base, "deal-pipeline");
ok(added.join("|") === "quiz|deal-pipeline" && base.join("|") === "quiz",
  "toggleSaved appends a new save and never mutates the caller's list");
ok(SS.toggleSaved(added, "quiz").join("|") === "deal-pipeline",
  "toggleSaved on a saved tool unsaves it");
ok(SS.isSaved(added, "quiz") === true && SS.isSaved(added, "nope") === false,
  "isSaved reads the normalized set");

console.log("saved-shelf — honesty: empty, stale, no invented ranking");
var empty = SS.buildShelf(CATALOG, []);
ok(empty.emptyShelf === true && empty.staleOnly === false && empty.savedCount === 0,
  "no saves reports emptyShelf");
var staleOnly = SS.buildShelf(CATALOG, ["retired-tool", "renamed-tool"]);
ok(staleOnly.staleOnly === true && staleOnly.emptyShelf === false && staleOnly.savedCount === 0 &&
   staleOnly.staleCount === 2,
  "saves that are all stale report staleOnly — a different state from empty");
var mixed = SS.buildShelf(CATALOG, ["quiz", "retired-tool"]);
ok(mixed.savedCount === 1 && mixed.staleCount === 1 && mixed.staleIds.join("|") === "retired-tool" &&
   mixed.entries.every(function (e) { return e.id !== "retired-tool"; }),
  "on a mixed shelf the stale save is counted apart and never rendered as a tool");
ok(SS.buildShelf("nope", []).ok === false && SS.shelfFromToolsJson({ tools: CATALOG }, ["quiz"]).savedCount === 1 &&
   SS.shelfFromToolsJson({}, []).ok === false,
  "a non-array catalogue is refused; shelfFromToolsJson reads a tools.json payload's tools array");

console.log("saved-shelf — the export");
var exp = SS.exportShelf(s);
ok(/SAVED TOOLS SHELF · 2 tool\(s\) saved of 4 in the catalogue/.test(exp) &&
   /Platform Ledger · platform-ledger\.html/.test(exp),
  "export carries the counts and each saved tool with its page");
ok(/no most-saved ranking/.test(exp) && /never sent anywhere/.test(exp) && /cge\.saved-tools\.v1/.test(exp),
  "export prints the honesty notes: local-only storage, no most-saved ranking (no cross-visitor usage is collected)");
ok(/empty because no tool has been saved/.test(SS.exportShelf(empty)),
  "the empty export says the shelf is empty because nothing has been saved");
ok(/stale save/.test(SS.exportShelf(mixed)) && /retired-tool/.test(SS.exportShelf(mixed)),
  "the export names the stale saves it counted apart");

console.log("saved-shelf — wiring");
var page = fs.readFileSync(path.join(ROOT, "pages", "saved-shelf.html"), "utf8");
ok(page.indexOf('id="svs-shelf"') >= 0 && page.indexOf('id="svs-export"') >= 0 && page.indexOf('id="svs-copy"') >= 0,
  "page carries shelf, export, copy control");
ok((page.match(/btn btn-primary/g) || []).length === 1, "page has exactly one primary action");
var src = fs.readFileSync(path.join(ROOT, "assets", "js", "saved-shelf.js"), "utf8");
ok(!/localStorage\.(getItem|setItem)|fetch\(|XMLHttpRequest/.test(src),
  "engine is pure set arithmetic — storage and fetching live in the UI files, never the engine");
var build = fs.readFileSync(path.join(ROOT, "scripts", "build.py"), "utf8");
ok(build.indexOf('"saved-shelf": ["assets/js/saved-shelf.js", "assets/js/saved-shelf-ui.js"]') >= 0 &&
   build.indexOf('"saved-shelf": ["assets/css/saved-shelf.css"]') >= 0,
  "build.py loads the shelf engine + UI and registers its CSS");
ok(build.indexOf('data-save-tool="{slug}"') >= 0 && build.indexOf('assets/js/save-toggle-ui.js') >= 0,
  "build.py injects the save toggle into every tool page's briefing panel (generator level)");
var toggle = fs.readFileSync(path.join(ROOT, "assets", "js", "save-toggle-ui.js"), "utf8");
ok(toggle.indexOf("data-save-tool") >= 0 && toggle.indexOf("SS.STORAGE_KEY") >= 0 && toggle.indexOf("aria-pressed") >= 0,
  "the toggle UI reads the same storage key through the engine and reflects state with aria-pressed");

console.log("\nsaved-shelf: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
