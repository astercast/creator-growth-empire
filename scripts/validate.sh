#!/usr/bin/env bash
# validate.sh — one-command validation pipeline for the Creator Growth Empire.
#
# Stages:
#   1. JS syntax ......... node --check every source JS file (assets/js, tests)
#   2. JSON parse ........ every JSON file under data/, skills/, scripts/ (api/ holds only function handlers)
#   3. JSON Schema ....... draft-07 validation of index / chapters / case-files /
#                         glossary / calculators / skills / tools against
#                         data/v1/schema/ (doc-level + per-record, $refs resolved)
#   4. Relative links .... every href/src in every site/ page resolves on disk;
#                         JS fetch() literals resolve too; data/v1/index.json
#                         endpoint paths + schema URLs all exist
#   5. Build reproduc. ... scripts/build.py clean rebuild leaves zero git diff
#                         on site/, data/, llms.txt, llms-full.txt, skills/index.json
#   6. Engine tests ..... node tests/sim-engine.test.js + tests/deal-room.test.js
#                         + tests/content-engine.test.js + tests/money-map.test.js
#                         + tests/video-doctor.test.js + tests/niche-atlas.test.js
#                         + tests/ypp-checker.test.js + tests/outreach.test.js
#                         + tests/deal-analyzer.test.js + tests/cadence.test.js
#                         + tests/platform-rules-bible.test.js
#                         + tests/deal-builder.test.js + tests/negotiation-kit.test.js
#                         + tests/algorithm-watch.test.js
#                         + tests/algorithm-watch-cron.test.js
#   7. llms.txt fresh ... chapter/tool/reference/guide/case-file/skill counts match
#                         build.py; every chapter marker present in llms-full.txt
#   8. Agent workflows ... node tests/agent-workflows.test.js — the AGENT.md
#                         example workflows executed against the real data/v1 JSON
#
# Exit code: 0 only if every stage passes. Anything failing is a real issue
# to fix, not cosmetic churn.
#
# Usage: bash scripts/validate.sh   (from anywhere; resolves the repo itself)

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
pass() { echo "  ok: $1"; PASS=$((PASS+1)); }
stage() { echo; echo "[$1/8] $2"; }

# ---------------------------------------------------------------- stage 1 ---
stage 1 "JS syntax (node --check)"
JS_OK=1
JS_N=0
while IFS= read -r f; do
  JS_N=$((JS_N+1))
  if ! node --check "$f" >/dev/null 2>&1; then
    fail "$f"; JS_OK=0
  fi
done < <(find assets/js tests api/functions lib -name '*.js' 2>/dev/null | sort)
if [ "$JS_OK" = 1 ]; then pass "$JS_N source JS files parse"; fi

# ---------------------------------------------------------------- stage 2 ---
stage 2 "JSON parse"
JSON_N=0
JSON_BAD=0
while IFS= read -r f; do
  JSON_N=$((JSON_N+1))
  if ! python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$f" 2>/dev/null; then
    fail "invalid JSON: $f"; JSON_BAD=$((JSON_BAD+1))
  fi
done < <(find api data skills scripts -name '*.json' 2>/dev/null | grep -v __pycache__ | sort)
if [ "$JSON_BAD" = 0 ]; then pass "$JSON_N JSON files parse"; fi

# ---------------------------------------------------------------- stage 3 ---
stage 3 "JSON Schema (draft-07)"
python3 - <<'EOF'
import json, sys
from pathlib import Path
from jsonschema import Draft7Validator, RefResolver

ROOT = Path(".")
SCH = ROOT / "data" / "v1" / "schema"
failures = []

def schema(name):
    s = json.loads((SCH / name).read_text())
    Draft7Validator.check_schema(s)  # the schema itself must be valid draft-07
    # resolve relative $refs (e.g. chapters.json -> chapter.json) against the schema dir
    resolver = RefResolver(base_uri=(SCH.resolve() / name).as_uri(), referrer=s)
    return Draft7Validator(s, resolver=resolver)

# every schema file on disk must itself be valid draft-07
for sf in sorted(SCH.glob("*.json")):
    try:
        Draft7Validator.check_schema(json.loads(sf.read_text()))
    except Exception as e:
        failures.append(f"schema/{sf.name}: not valid draft-07: {e}")

# per-record schemas
# per-record validator for changes.json: inline the $defs/change subschema so no
# $ref resolution runs (avoids base-URI pitfalls with the doc's $id).
changes_schema_doc = json.loads((SCH / "changes.json").read_text())
changes_schema_rec = Draft7Validator(
    dict(changes_schema_doc["$defs"]["change"], title="Algorithm Watch change record"))
checks = [
    ("chapters.json", "chapters", schema("chapter.json"), "chapter"),
    ("case-files.json", "case_files", schema("case-file.json"), "case file"),
    ("skills.json", "skills", schema("skill.json"), "skill"),
    ("tools.json", "tools", schema("tool.json"), "tool"),
    ("niches.json", "niches", schema("niche.json"), "niche"),
    ("changes.json", "changes", changes_schema_rec, "change"),
]
for fname, key, val, label in checks:
    for i, rec in enumerate(json.loads((ROOT / "data" / "v1" / fname).read_text())[key]):
        for e in val.iter_errors(rec):
            failures.append(f"{fname}[{i}] {label}: {e.message}")

# doc-level schemas (doc wrappers use $ref into the per-record schemas)
for fname, sname in [("index.json", "index.json"),
                     ("chapters.json", "chapters.json"),
                     ("niches.json", "niches.json"),
                     ("glossary.json", "glossary.json"),
                     ("calculators.json", "calculators.json"),
                     ("skills.json", "skills.json"),
                     ("case-files.json", "case-files.json"),
                     ("tools.json", "tools.json"),
                     ("deal-templates.json", "deal-templates.json"),
                     ("content-engine.json", "content-engine.json"),
                     ("changes.json", "changes.json")]:
    for e in schema(sname).iter_errors(json.loads((ROOT / "data" / "v1" / fname).read_text())):
        failures.append(f"{fname}: {e.message}")

# manifest coherence: every json endpoint's schema URL must exist on disk,
# and every schema file must be referenced by the manifest
idx = json.loads((ROOT / "data" / "v1" / "index.json").read_text())
manifest_schemas = set()
for ep in idx["endpoints"]:
    if ep.get("schema"):
        p = ROOT / ep["schema"]
        manifest_schemas.add(Path(ep["schema"]).name)
        if not p.exists():
            failures.append(f"index.json: schema '{ep['schema']}' missing on disk")
    if ep.get("id") == "schemas":
        for f in ep.get("files", []):
            manifest_schemas.add(f.split(" — ")[0])
on_disk = {p.name for p in SCH.glob("*.json")}
if on_disk != manifest_schemas:
    failures.append(f"index.json: schema set mismatch: on disk {sorted(on_disk)} vs manifest {sorted(manifest_schemas)}")

# every record's path must resolve to a generated page
for fname, key in [("chapters.json", "chapters"), ("case-files.json", "case_files")]:
    for rec in json.loads((ROOT / "data" / "v1" / fname).read_text())[key]:
        if not (ROOT / "site" / rec["path"]).exists():
            failures.append(f"{fname}: path '{rec['path']}' has no site/ page")
# every tool record's page must resolve too
for rec in json.loads((ROOT / "data" / "v1" / "tools.json").read_text())["tools"]:
    if not (ROOT / "site" / rec["page"]).exists():
        failures.append(f"tools.json: page '{rec['page']}' has no site/ page")

if failures:
    print("  FAIL: schema/path violations:")
    for f in failures[:20]:
        print("   -", f)
    if len(failures) > 20:
        print(f"   ... and {len(failures)-20} more")
    sys.exit(1)
print("  ok: index/chapters/case-files/glossary/calculators/skills/tools validate against draft-07 schemas; manifest schema set coherent; all record paths resolve")
EOF
[ $? -eq 0 ] && pass "schema validation clean" || FAIL=$((FAIL+1))

# ---------------------------------------------------------------- stage 4 ---
stage 4 "relative-link check (0 broken)"
python3 - <<'EOF'
import json, re, sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(".")
ATTR = re.compile(r'''(?:href|src)\s*=\s*["']([^"']+)["']''', re.I)
FETCH = re.compile(r'''fetch\(\s*["']([^"']+)["']''')
total = 0
broken = []

def resolve(base, link):
    link = link.strip()
    if not link or link.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return None
    if re.match(r"^(?:https?:)?//", link, re.I):
        return None  # external: out of scope for this check
    link = unquote(link.split("#", 1)[0].split("?", 1)[0])
    if not link:
        return None
    if link.startswith("/"):
        return ROOT / "site" / link[1:]  # site-rooted
    return base / link

def check_link(base, link, origin):
    global total
    target = resolve(base, link)
    if target is None:
        return
    total += 1
    t = Path(str(target).rstrip("/"))
    if not t.exists():
        broken.append(f"{origin} -> {link}")

# generated pages + tool fragments (fragments resolve as-if included in site/)
for page in sorted((ROOT / "site").rglob("*.html")):
    text = page.read_text()
    for m in ATTR.finditer(text):
        check_link(page.parent, m.group(1), page.relative_to(ROOT))
for frag in sorted((ROOT / "pages").glob("*.html")):
    text = frag.read_text()
    for m in ATTR.finditer(text):
        check_link(ROOT / "site", m.group(1), frag.relative_to(ROOT))

# JS fetch() literals in the shipped JS (from the page's perspective = site/)
for js in sorted((ROOT / "site" / "assets" / "js").glob("*.js")):
    text = js.read_text()
    for m in FETCH.finditer(text):
        if "BASE" in m.group(0):
            continue
        check_link(ROOT / "site", m.group(1), js.relative_to(ROOT))

# data/v1/index.json endpoints must all exist on disk (the API Explorer BASE+name pattern).
# Wave 12: the manifest is a list of endpoint records — json endpoints have a
# single `path`, html endpoints have `paths[]` (site-root-relative), the
# schemas record has `files[]` (schema-dir-relative). Each json endpoint's
# schema URL must resolve too.
idx = json.loads((ROOT / "data" / "v1" / "index.json").read_text())
for ep in idx["endpoints"]:
    kind = ep.get("kind")
    if kind == "json":
        check_link(ROOT, ep["path"], "data/v1/index.json")
        if ep.get("schema"):
            check_link(ROOT, ep["schema"], "data/v1/index.json")
    elif kind == "html":
        for p in ep.get("paths", []):
            check_link(ROOT / "site", p, "data/v1/index.json")
    elif kind == "directory":
        d = ROOT / ep["path"]
        for f in ep.get("files", []):
            check_link(d, f.split(" — ")[0], "data/v1/index.json")

print(f"  checked {total} links")
if broken:
    print(f"  FAIL: {len(broken)} broken links:")
    for b in broken[:25]:
        print("   -", b)
    if len(broken) > 25:
        print(f"   ... and {len(broken)-25} more")
    sys.exit(1)
print("  ok: 0 broken relative links")
EOF
[ $? -eq 0 ] && pass "link check" || FAIL=$((FAIL+1))

# ---------------------------------------------------------------- stage 5 ---
stage 5 "build reproducibility (clean rebuild -> zero diff)"
python3 scripts/build.py >/dev/null 2>&1
if [ $? -ne 0 ]; then
  fail "scripts/build.py crashed"
else
  DIFF=$(git diff --stat -- site data llms.txt llms-full.txt skills/index.json 2>/dev/null)
  if [ -z "$DIFF" ]; then
    pass "clean rebuild produces byte-identical generated output"
  else
    fail "rebuild drifted from committed generated files:"
    echo "$DIFF" | head -12 | sed 's/^/    /'
  fi
fi

# ---------------------------------------------------------------- stage 6 ---
stage 6 "engine test suites (sim + deal room + content engine + outreach)"
TEST_FAIL=0
for T in tests/sim-engine.test.js tests/deal-room.test.js tests/content-engine.test.js tests/money-map.test.js tests/video-doctor.test.js tests/niche-atlas.test.js tests/ypp-checker.test.js tests/outreach.test.js tests/deal-analyzer.test.js tests/cadence.test.js tests/platform-rules-bible.test.js tests/identity-w30.test.js tests/breakout-format-intel.test.js tests/format-fit.test.js tests/deal-builder.test.js tests/sim-launch.test.js tests/negotiation-kit.test.js tests/rate-card-builder.test.js tests/negotiation-script-builder.test.js tests/deal-pipeline.test.js tests/follow-through.test.js tests/repeat-sponsor-book.test.js tests/sponsor-income-ledger.test.js tests/receivables-register.test.js tests/brand-ledger.test.js tests/view-transitions.test.js tests/placement.test.js tests/algorithm-watch.test.js tests/algorithm-watch-cron.test.js; do
  node "$T" >/tmp/cge_validate_tests.log 2>&1
  if [ $? -eq 0 ]; then
    N=$(grep -c "PASS" /tmp/cge_validate_tests.log)
    pass "$T ($N assertions)"
  else
    TEST_FAIL=1
    fail "$T failed:"
    grep "FAIL" /tmp/cge_validate_tests.log | head -10 | sed 's/^/    /'
  fi
done

# ---------------------------------------------------------------- stage 7 ---
stage 7 "llms.txt / llms-full.txt freshness"
python3 - <<'EOF'
import re, sys
sys.path.insert(0, "scripts")
import build

errors = []

def section_bullets(text, header):
    m = re.search(rf"^## {re.escape(header)}\s*$", text, re.M)
    if not m:
        return None
    tail = text[m.end():]
    nxt = re.search(r"^## ", tail, re.M)
    tail = tail[:nxt.start()] if nxt else tail
    return [l for l in tail.splitlines() if l.startswith("- ")]

llms = open("llms.txt").read()
full = open("llms-full.txt").read()

phases = section_bullets(llms, "Phases")
if phases is None or len(phases) != len(build.CHAPTERS):
    errors.append(f"Phases: {len(phases) if phases is not None else 'MISSING'} bullets != CHAPTERS {len(build.CHAPTERS)}")

tools = section_bullets(llms, "Tools")
exp_tools = len(build.TOOLS) + 1  # tools + Glossary line
if tools is None or len(tools) != exp_tools:
    errors.append(f"Tools: {len(tools) if tools is not None else 'MISSING'} bullets != {exp_tools}")

ref = section_bullets(llms, "Reference")
if ref is None or len(ref) != len(build.REFERENCE_PAGES):
    errors.append(f"Reference: {len(ref) if ref is not None else 'MISSING'} bullets != REFERENCE_PAGES {len(build.REFERENCE_PAGES)}")

cases = section_bullets(llms, "Case Files — documented creator-business deconstructions")
exp_cases = sum(1 for e in build.MARKDOWN_PAGES if e[3] == "Case File")
case_links = [l for l in (cases or []) if re.match(r"- \[Case File:", l)]
if cases is None or len(case_links) != exp_cases:
    errors.append(f"Case Files: {len(case_links)} case links != {exp_cases} Case File pages")

skills = section_bullets(llms, "Skills")
from pathlib import Path
exp_skills = len(list(Path("skills").glob("*/SKILL.md")))
if skills is None or len(skills) != exp_skills:
    errors.append(f"Skills: {len(skills) if skills is not None else 'MISSING'} bullets != {exp_skills} SKILL.md files")

missing_markers = []
for slug, src, phase, short in build.CHAPTERS:
    if f"# {phase}: {short}" not in full:
        missing_markers.append(slug)
for entry in build.REFERENCE_PAGES:
    slug, src, badge, short = entry[:4]
    if f"# {badge}: {short}" not in full:
        missing_markers.append(slug)
for e in build.MARKDOWN_PAGES:
    if f"# {e[3]}: {e[2]}" not in full:
        missing_markers.append(e[0])
if missing_markers:
    errors.append(f"llms-full.txt missing markers: {', '.join(missing_markers)}")

if errors:
    print("  FAIL:")
    for e in errors:
        print("   -", e)
    sys.exit(1)
print(f"  ok: llms.txt lists {len(build.CHAPTERS)} phases, {len(build.TOOLS)} tools, "
      f"{len(build.REFERENCE_PAGES)} reference, {exp_cases} case files, {exp_skills} skills; "
      f"llms-full.txt carries every section marker")
EOF
[ $? -eq 0 ] && pass "llms.txt/llms-full.txt fresh" || FAIL=$((FAIL+1))

# ---------------------------------------------------------------- stage 8 ---
stage 8 "agent workflows (AGENT.md examples vs real data/v1 JSON)"
node tests/agent-workflows.test.js >/tmp/cge_validate_agent.log 2>&1
if [ $? -eq 0 ]; then
  N=$(grep -c "PASS" /tmp/cge_validate_agent.log)
  pass "agent workflows ($N assertions)"
else
  fail "tests/agent-workflows.test.js failed:"
  grep "FAIL" /tmp/cge_validate_agent.log | head -10 | sed 's/^/    /'
fi

# ---------------------------------------------------------------- summary ---
echo
echo "validate.sh: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "ALL STAGES PASS" || echo "VALIDATION FAILED"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
