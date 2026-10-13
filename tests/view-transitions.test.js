"use strict";
/* view-transitions.test.js — rotation 14 VT assessment tripwire.
 * Creator adopted cross-document View Transitions before the
 * Commons canonical existed (wave 26, components.css), but its
 * ::view-transition root shaping sat OUTSIDE the reduced-motion
 * guard. Rotation 14 aligns the adoption to Fleet Commons
 * canonical v1.0.0 (patterns/view-transitions): everything —
 * the @view-transition rule AND the root shaping — lives inside
 * @media (prefers-reduced-motion: no-preference), the shape keeps
 * this site's own tokens, and view-transition-name shared-element
 * pairings stay unadopted (duplicate-name risk across 59+
 * generated pages, the same reasoning Film recorded). */
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");
var failures = 0, passes = 0;
function ok(c, n) { if (c) { passes++; console.log("  PASS " + n); } else { failures++; console.log("  FAIL " + n); } }

var rawCss = fs.readFileSync(path.join(ROOT, "assets", "css", "components.css"), "utf8");
/* Strip comments first: the VT block's own header comment names
 * the tokens it declines, and prose must not trip a code check. */
var css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");
var m = css.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*@view-transition \{ navigation: auto; \}[\s\S]*?\n\}/);
ok(!!m, "components.css carries the VT guard block (@media no-preference wrapping @view-transition)");
var vtBlock = m ? m[0] : "";
ok(vtBlock.includes("::view-transition-old(root)") && vtBlock.includes("::view-transition-new(root)"),
  "the root pseudo shaping lives inside the same guard (canonical: the guard is the pattern)");
var outside = m ? css.replace(m[0], "") : css;
ok(!/::view-transition-(old|new)/.test(outside) && !/@view-transition/.test(outside),
  "no view-transition rule survives outside the guard — reduced-motion visitors get no transition at all");
ok(vtBlock.includes("var(--dur-moderate)") && vtBlock.includes("var(--ease-decelerate)"),
  "the shape keeps this site's own tokens (dur-moderate / ease-decelerate) — shape is site identity");
ok(!/view-transition-name\s*:/.test(css),
  "no view-transition-name shared-element pairings (declined: duplicate-name risk across the generated pages)");
var built = fs.readFileSync(path.join(ROOT, "site", "assets", "css", "components.css"), "utf8");
ok(built === rawCss, "the built site copy matches the source sheet byte for byte");

console.log("\nview-transitions: " + passes + " passed, " + failures + " failed");
process.exit(failures ? 1 : 0);
