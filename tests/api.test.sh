#!/usr/bin/env bash
# tests/api.test.sh — Algorithm Watch (creator-algwatch) API test suite (§12).
# Runs against `vercel dev` or any preview URL via BASE, e.g.:
#   BASE=https://<preview>.vercel.app ./tests/api.test.sh
# With no BASE it starts the local harness (tests/serve-functions.js) itself.
# bash + curl + python3 only. Exit 0 iff every assertion passes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT=32113
HARNESS_PID=""
if [ -z "${BASE:-}" ]; then
  node tests/serve-functions.js "$PORT" >/tmp/algwatch-harness.log 2>&1 &
  HARNESS_PID=$!
  BASE="http://localhost:$PORT"
  export BASE
  # wait for the harness to accept connections (max ~10s)
  for _ in $(seq 1 50); do
    if curl -s -o /dev/null "$BASE/api/health" 2>/dev/null; then break; fi
    sleep 0.2
  done
  trap 'kill "$HARNESS_PID" 2>/dev/null || true' EXIT
fi

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "ok   $1"; }
nope() { fail=$((fail+1)); echo "FAIL $1${2:+ — $2}"; }

# 1. health: 200 + ok:true envelope + roster matches §7.5 exactly
if body=$(curl -s -m 10 "$BASE/api/health"); then
  if python3 - "$body" <<'EOF'
import json, sys
e = json.loads(sys.argv[1])
assert e["ok"] is True, "ok != true"
assert e["meta"]["service"] == "creator-algwatch", "service"
assert e["data"]["status"] in ("ok", "degraded"), "status"
assert e["data"]["functions"] == ["health", "changes", "niches", "cron/algorithm-watch"], \
    "functions roster mismatch: %r" % (e["data"]["functions"],)
assert "changes.json" in e["data"]["data_freshness"], "freshness missing changes.json"
assert "niches.json" in e["data"]["data_freshness"], "freshness missing niches.json"
EOF
  then ok "health 200 + roster"; else nope "health roster" "see output"; fi
else nope "health 200" "curl failed"; fi

# 2. every roster GET returns an ok:true envelope with a request_id
for p in "changes" "niches"; do
  if body=$(curl -s -m 10 "$BASE/api/$p"); then
    if python3 - "$body" <<'EOF'
import json, sys, re
e = json.loads(sys.argv[1])
assert e["ok"] is True, "ok != true"
assert re.match(r"^req_[0-9a-f]{6}$", e["meta"]["request_id"]), "request_id shape"
assert e["meta"]["source"] in ("live", "cache"), "source"
EOF
    then ok "envelope /api/$p"; else nope "envelope /api/$p"; fi
  else nope "envelope /api/$p" "curl failed"; fi
done

# 3. envelope schema validation (§1.10) for health + changes + niches
for p in "health" "changes" "niches"; do
  if curl -s -m 10 "$BASE/api/$p" | python3 tests/validate_envelope.py >/dev/null 2>&1; then
    ok "schema /api/$p"
  else nope "schema /api/$p"; fi
done

# 4. changes payload: confidence flags + sources on every entry, sorted newest-first
if body=$(curl -s -m 10 "$BASE/api/changes"); then
  if python3 - "$body" <<'EOF'
import json, sys
e = json.loads(sys.argv[1])
rows = e["data"]["changes"]
assert len(rows) > 0, "empty feed"
for c in rows:
    assert c["confidence"] in ("verified", "single-source"), c
    assert c.get("source_url") or c.get("sources"), c["id"]
    assert c["category"] in ("algorithm", "policy", "monetization", "legal"), c
    assert c["platform"] in ("youtube","tiktok","instagram","facebook","x","other"), c
dates = [c["detected_at"] for c in rows]
assert dates == sorted(dates, reverse=True), "not newest-first"
EOF
  then ok "changes payload flags+sources+order"; else nope "changes payload"; fi
else nope "changes payload" "curl failed"; fi

# 5. filters: platform + limit + since
if python3 - <<'EOF'
import json, subprocess
def get(path):
    import os
    return json.loads(subprocess.run(["curl","-s","-m","10", os.environ["BASE"]+path],
                                     capture_output=True, text=True).stdout)
e = get("/api/changes?platform=youtube&limit=3")
assert all(c["platform"]=="youtube" for c in e["data"]["changes"]), "platform filter"
assert len(e["data"]["changes"]) <= 3, "limit"
assert e["data"]["filters"]["platform"] == "youtube"
e2 = get("/api/changes?since=2026-10-01")
assert all(c["detected_at"] >= "2026-10-01" for c in e2["data"]["changes"]), "since filter"
EOF
then ok "filters platform/limit/since"; else nope "filters"; fi

# 6. cron without secret -> 401 envelope
code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$BASE/api/cron/algorithm-watch")
[ "$code" = 401 ] && ok "cron 401 no secret" || nope "cron 401 no secret" "got $code"

# 7. cron with wrong secret -> 401
code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 -H 'Authorization: Bearer wrong' "$BASE/api/cron/algorithm-watch")
[ "$code" = 401 ] && ok "cron 401 bad secret" || nope "cron 401 bad secret" "got $code"

# 8. cron 401 body is an envelope with UNAUTHORIZED
if body=$(curl -s -m 10 "$BASE/api/cron/algorithm-watch"); then
  if python3 - "$body" <<'EOF'
import json, sys
e = json.loads(sys.argv[1])
assert e["ok"] is False and e["error"]["code"] == "UNAUTHORIZED", e
EOF
  then ok "cron 401 envelope"; else nope "cron 401 envelope"; fi
else nope "cron 401 envelope" "curl failed"; fi

# 9. bad inputs -> 400 BAD_INPUT envelopes
for q in "platform=bogus" "since=not-a-date" "limit=abc" "limit=0"; do
  if body=$(curl -s -m 10 "$BASE/api/changes?$q"); then
    if python3 - "$body" <<'EOF'
import json, sys
e = json.loads(sys.argv[1])
assert e["ok"] is False and e["error"]["code"] == "BAD_INPUT", e
EOF
    then ok "400 gate ?$q"; else nope "400 gate ?$q"; fi
  else nope "400 gate ?$q" "curl failed"; fi
done

# 10. static fallbacks present (the §3 fallback contract files)
for f in "changes.json" "niches.json" "schema/envelope.json" "schema/changes.json"; do
  if curl -sf -m 10 -o /dev/null "$BASE/api/v1/$f"; then ok "static /api/v1/$f";
  else nope "static /api/v1/$f"; fi
done

# 11. cache headers: GET functions carry the §1.6 edge policy
if curl -s -D - -o /dev/null -m 10 "$BASE/api/changes" | grep -qi 's-maxage=600'; then ok "cache s-maxage=600";
else nope "cache s-maxage=600"; fi

# 12. vercel.json lint: cron daily-or-slower (Hobby hard limit), explicit
# function paths with NO runtime key (2026-10-12: Vercel rejects any
# functions.*.runtime value for Node — omit it, Node is auto-detected)
if python3 - <<'EOF'
import json
v = json.load(open("vercel.json"))
assert v["outputDirectory"] == "site", "outputDirectory"
assert v["buildCommand"] == "python3 scripts/build.py", "buildCommand"
fns = v["functions"]
assert set(fns) == {"api/health.js", "api/changes.js", "api/niches.js",
                    "api/cron/algorithm-watch.js"}, "explicit function paths, no globs"
assert all("runtime" not in cfg for cfg in fns.values()), \
    "no runtime key on any function"
assert all(cfg.get("maxDuration") == 10 for cfg in fns.values()), \
    "maxDuration 10 on every function (empty {} fails validation)"
crons = v.get("crons", [])
assert len(crons) == 1, "exactly one cron job"
c = crons[0]
assert c["path"] == "/api/cron/algorithm-watch", "cron path"
f = c["schedule"].split()
assert len(f) == 5, "5-field cron"
assert f[0] != "*" and "*/" not in f[0] and "*/" not in f[1], "must be daily-or-slower: %r" % c["schedule"]
EOF
then ok "vercel.json lint"; else nope "vercel.json lint"; fi

# 13. niches passthrough carries generated_at freshness
if body=$(curl -s -m 10 "$BASE/api/niches"); then
  if python3 - "$body" <<'EOF'
import json, sys
e = json.loads(sys.argv[1])
assert e["data"]["generated_at"], "missing generated_at"
assert len(e["data"]["niches"]) == 20, "expected 20 niches, got %d" % len(e["data"]["niches"])
EOF
  then ok "niches freshness passthrough"; else nope "niches passthrough"; fi
else nope "niches passthrough" "curl failed"; fi

echo "pass=$pass fail=$fail"
[ "$fail" = 0 ]
