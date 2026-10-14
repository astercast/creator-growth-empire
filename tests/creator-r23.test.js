/* Creator rotation 23: the composition build invariants (FINDINGS 5.8).
 *  - Screen one IS the formula, demonstrated: the built home carries a
 *    specimen plate naming one real lesson by number, name, kind and
 *    state, with the claim stated once, in the manual's true counts.
 *  - The naming-system lecture is gone from the home and the Path page.
 *  - The Path is a numbered contents composition: nine plates, 01-09.
 *  - Display type is Archivo; the formula's coordinates ride the mono.
 * Run after a build: node tests/creator-r23.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/v1/lessons.json'), 'utf8'));
const lessons = spec.lessons;
const drills = lessons.filter(l => l.kind === 'drill').length;
eq(lessons.length, 32, 'spec table holds 32 lessons');
eq(drills, 19, '19 drills');

const home = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
const pathPage = fs.readFileSync(path.join(ROOT, 'site/career-path.html'), 'utf8');

/* the specimen: lesson 1.2, named in full.
 * VP-0045 (rotation 30) supersedes the h1 half of this invariant: the home
 * H1 now names the site so the page reads as the start page, and the
 * specimen lesson keeps its plate as a presented name, not the H1. */
const specimen = lessons.find(l => l.number === '1.2');
ok(home.includes('class="specimen"'), 'home carries the specimen plate');
ok(home.includes(`<span class="spec-num">${specimen.number}</span>`), 'specimen number is lesson 1.2');
ok(home.includes('<h1 class="spec-site">Creator Growth Empire</h1>'), 'home h1 names the site (VP-0045)');
ok(home.includes(`<p class="spec-name">${specimen.title}</p>`), 'specimen name is the lesson title, presented in the plate');
ok(home.includes(`${specimen.kind} \u00b7 ${specimen.state}`), 'specimen kind and state words ride the name');
ok(home.includes(specimen.artifact), 'specimen states the lesson artifact as its done line');

/* one claim, true counts, no stat strip */
ok(home.includes(`<span class="claim-num">${lessons.length}</span> lessons. <span class="claim-num">${drills}</span> are drills you do, not read.`), 'the claim states the true counts');
ok(!home.includes('hero-meta'), 'the old stat strip is gone from the home');
ok(!home.includes('<section class="hero">'), 'the old SaaS hero is gone from the home');

/* the lecture is gone; its content now lives as demonstration */
ok(!home.includes('How this manual names things'), 'no naming lecture on the home');
ok(!pathPage.includes('How this manual names things'), 'no naming lecture on the Path page');
ok(pathPage.includes('class="cp-demo"'), 'the Path page demonstrates one name instead');

/* the Path as numbered contents: 01 to 09 plates, one per chapter */
const plates = [...home.matchAll(/<span class="pp-num">(\d{2})<\/span>/g)].map(m => m[1]);
eq(plates.join(','), '01,02,03,04,05,06,07,08,09', 'nine numbered Path plates, 01 to 09');
const chapters = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/v1/chapters.json'), 'utf8'));
eq(chapters.chapters.length, 9, 'nine chapters behind the plates');
chapters.chapters.forEach(c => ok(home.includes(`href="${c.path}"`), `plate links ${c.path}`));

/* type: Archivo at display sizes, mono on the coordinates */
const tokens = fs.readFileSync(path.join(ROOT, 'assets/css/tokens.css'), 'utf8');
ok(tokens.includes('--font-display: "Archivo"'), 'display token is Archivo');
ok(fs.existsSync(path.join(ROOT, 'assets/fonts/archivo-latin-var.woff2')), 'Archivo latin variable file ships');
const hub = fs.readFileSync(path.join(ROOT, 'assets/css/hub.css'), 'utf8');
ok(hub.includes('.spec-num { font-family: var(--font-mono)'), 'the specimen number rides the mono voice');
ok(hub.includes('.ci-num { font-family: var(--font-mono)'), 'contents numbers ride the mono voice');

/* free-tier shape stands */
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const fns = Object.entries(vercel.functions);
eq(fns.length, 4, 'four functions, as standing');
fns.forEach(([k, v]) => { eq(v.maxDuration, 10, `${k} maxDuration 10`); ok(!('runtime' in v), `${k} carries no runtime pin`); });

console.log(`creator-r23: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
