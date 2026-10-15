#!/usr/bin/env python3
"""audit_copy.py — the easy-words copy audit (revision 2026-10-15).

The user's copy law for the guided layer of this site:
  * very easy words: short sentences, everyday words a young reader
    would know; no word that needs a dictionary;
  * zero jargon: an unavoidable hard term is explained in the same
    breath, in easy words;
  * no em dashes in presented copy.

Scope: every string the revision authors or rewrites — the step layer
(lessons.json needs/steps/artifact + the path engine's detail/doneWhen,
stage promises and verdicts), the plain-words boxes and stage blurbs in
build.py, the tagline, and the Path page shell copy. The deep chapter
bodies are research text and stay out of scope by design; each one now
opens with an audited plain-words box instead.

Rules enforced:
  1. No em dash (U+2014) in any audited string.
  2. No sentence over 24 words in step-layer and shell copy.
  3. No blocklisted jargon in step-layer copy, unless the word is part
     of a tool's proper name (tool titles from tools.json are exempt)
     or inside a "(Tool NN)" pointer, which names a tool by its title.

Exit 0 = clean. Prints counts so the record can cite them.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_WORDS = 24
JARGON = [
    "monetization", "monetize", "cadence", "leverage", "synergy",
    "optimize", "optimise", "utilize", "threshold", "pillar",
    "ecosystem", "funnel", "workflow", "scalable", "bandwidth",
    "holistic", "streamline", "monetisation",
]
EM_DASH = "\u2014"

violations = []
checked_strings = 0
checked_sentences = 0


def sentences(text):
    # a sentence may end with the period inside a closing quote
    parts = re.split(r"(?:(?<=[.!?])|(?<=[.!?][\"”’]))\s+", text.strip())
    return [p for p in parts if p.strip()]


def audit(text, where, layer):
    """layer: 'step' (sentence + jargon rules) or 'shell' (all rules)."""
    global checked_strings, checked_sentences
    if not text:
        return
    checked_strings += 1
    if EM_DASH in text:
        violations.append(f"{where}: em dash in copy")
    for s in sentences(text):
        checked_sentences += 1
        words = s.split()
        if len(words) > MAX_WORDS:
            violations.append(
                f"{where}: sentence of {len(words)} words (max {MAX_WORDS}): {s[:80]}…")
    if layer == "step":
        scan = re.sub(r"\([^)]*Tool \d+[^)]*\)", "", text)
        for title in TOOL_TITLES:
            scan = scan.replace(title, "")
        low = " " + scan.lower() + " "
        for word in JARGON:
            if re.search(r"[^a-z]" + word + r"[^a-z]", low):
                violations.append(f"{where}: jargon '{word}' in step copy: {text[:80]}")


# tool proper names are exempt from the jargon scan
tools = json.loads((ROOT / "data/v1/tools.json").read_text(encoding="utf-8"))["tools"]
TOOL_TITLES = [t["title"] for t in tools]

# ---- step layer: lessons.json -------------------------------------------
lessons = json.loads((ROOT / "data/v1/lessons.json").read_text(encoding="utf-8"))["lessons"]
for les in lessons:
    # A read's title is the proper name of the chapter it sends you to
    # (e.g. "The Monetization Stack"); the chapter's own plain-words box
    # glosses it in easy words, so titles of reads are audited as shell
    # copy (length + em dash), not against the jargon list.
    audit(les["title"], f"lessons.json {les['id']} title",
          "shell" if les["kind"] == "read" else "step")
    for i, n in enumerate(les.get("needs", [])):
        audit(n, f"lessons.json {les['id']} needs[{i}]", "step")
    for i, s in enumerate(les.get("steps", [])):
        audit(s, f"lessons.json {les['id']} steps[{i}]", "step")
    audit(les.get("artifact", ""), f"lessons.json {les['id']} artifact", "step")

# ---- step layer: the path engine (detail / doneWhen / stage copy) -------
dump = subprocess.run(
    ["node", "-e", """
const CP = require("./assets/js/career-path.js");
const out = { stages: CP.STAGES.map(s => ({name: s.name, promise: s.promise, doVerdict: s.doVerdict})),
              lessons: CP.allLessons().map(x => ({id: x.lesson.id, detail: x.lesson.detail || "", doneWhen: x.lesson.doneWhen || ""})) };
process.stdout.write(JSON.stringify(out));
"""],
    cwd=ROOT, capture_output=True, text=True)
if dump.returncode != 0:
    print("audit_copy: engine dump failed:", dump.stderr[:400])
    sys.exit(1)
engine = json.loads(dump.stdout)
for st in engine["stages"]:
    audit(st["name"], "engine stage name", "step")
    audit(st["promise"], "engine stage promise", "step")
    audit(st["doVerdict"], "engine stage verdict", "step")
for les in engine["lessons"]:
    audit(les["detail"], f"engine {les['id']} detail", "step")
    audit(les["doneWhen"], f"engine {les['id']} doneWhen", "step")

# ---- shell layer: build.py authored copy --------------------------------
sys.path.insert(0, str(ROOT / "scripts"))
import build as build_mod  # noqa: E402

audit(build_mod.TAGLINE, "build.py TAGLINE", "shell")
for name in build_mod.LESSON_STAGE_NAMES.values():
    audit(name, "build.py stage name", "shell")
for slug, (summary, job) in build_mod.PLAIN_SUMMARIES.items():
    audit(summary, f"build.py plain box {slug}", "shell")
    audit(job, f"build.py plain job {slug}", "shell")
# stage blurbs are build()-locals; audit them as they ship, in the home
home_html = (ROOT / "site/index.html").read_text(encoding="utf-8")
for blurb in re.findall(r'<p class="stage-what">([^<]+)</p>', home_html):
    audit(blurb, "home stage blurb (as shipped)", "shell")
for what in re.findall(r'<p class="step-what">([^<]+)</p>', home_html):
    audit(what, "home step line (as shipped)", "shell")

# ---- shell layer: the Path page ------------------------------------------
shell = (ROOT / "pages/career-path.html").read_text(encoding="utf-8")
shell = re.sub(r"</(h1|h2|h3|p|div|section|li)>", ". ", shell)
shell_text = re.sub(r"<[^>]+>", " ", shell)
shell_text = re.sub(r"\s+", " ", shell_text)
for s in sentences(shell_text):
    audit(s, "pages/career-path.html shell", "shell")

print(f"audit_copy: {checked_strings} strings, {checked_sentences} sentences audited")
if violations:
    print(f"audit_copy: {len(violations)} violation(s):")
    for v in violations[:40]:
        print("  -", v)
    sys.exit(1)
print("audit_copy: clean (no em dashes, no sentence over "
      f"{MAX_WORDS} words, no unglossed jargon in the step layer)")
