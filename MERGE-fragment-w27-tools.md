# MERGE FRAGMENT — Wave 27: Cadence Coach (tool #20) wiring

Status: **staged, not applied**. Wave 27 (this wave) created all new tool
files but did NOT edit `scripts/build.py`, `scripts/validate.sh`, or any
hand-maintained doc, because wave 26 (Deal Analyzer #19 + Empire Simulator
4.0) is live on the same lane and its `build.py` edits must land first.
Apply the blocks below to `build.py`/`validate.sh` AFTER wave 26 merges,
then rebuild + revalidate. Every block is an exact search→replace against
the `build.py`/`validate.sh` state at wave-27 time; if wave 26 changed an
anchor line, re-anchor on the same logical spot (end of TOOLS /
TOOL_HUB_META / TOOLS_API / TOOL_SCRIPTS / TOOL_CSS, the tool-count
strings) before applying.

New files this fragment wires up (all committed by wave 27, all new):
- `pages/cadence.html` — tool page source (form, empty-state, noscript, pipeline cross-links)
- `assets/js/cadence.js` — `CadenceCoach` UMD engine (`validInput`, `capacityMath`, `dealWeek`, `recommend`)
- `assets/js/cadence-ui.js` — pure-math-free DOM wiring (aria-live, localStorage `cge.cadence.v1`, copy-cadence)
- `assets/css/cadence.css` — week grid (mobile-first; container query `@container ccweek` progressive enhancement; zero animation)
- `tests/cadence.test.js` — 62 assertions, `node tests/cadence.test.js` exit 0 standalone

---

## Block B1 — TOOLS list (new tool entry, keep last)

Search (end of TOOLS, ~line 147):
```
    ("crosspost", "Cross-Post Optimizer", "Move one clip to every platform without getting throttled: per-destination adaptation checklists (aspect, captions, hooks, CTAs, disclosure labels) under the Oct-1 originality rules."),
]
```

Replace with:
```
    ("crosspost", "Cross-Post Optimizer", "Move one clip to every platform without getting throttled: per-destination adaptation checklists (aspect, captions, hooks, CTAs, disclosure labels) under the Oct-1 originality rules."),
    ("cadence", "Cadence Coach", "How often should you actually post? Turn your honest weekly hours, formats, and platforms into a sustainable cadence — capacity math plus Oct-2026 platform realities. Consistency beats volume."),
]
```

## Block B2 — TOOL_HUB_META (hub card, PLAN group)

Search (~line 619):
```
    "crosspost":       ("⧉", "CONTENT", "coral", "one clip needs to live natively on four platforms.",
                      ["adaptation", "cross-post", "Phase 3"]),
}
```

Replace with:
```
    "crosspost":       ("⧉", "CONTENT", "coral", "one clip needs to live natively on four platforms.",
                      ["adaptation", "cross-post", "Phase 3"]),
    "cadence":         ("◷", "PLAN",    "acid", "you keep asking how often to post and the answer starts with your hours.",
                      ["consistency", "schedule", "Phase 1"]),
}
```

## Block B3 — TOOLS_API (tools.json record with CadenceInput schema)

Search (end of TOOLS_API — the crosspost drive-notes line followed by the list close):
```
     "Engine (assets/js/content-engine.js, UMD — importable in node): adaptChecklist(source_platform, destinations) reads the adaptation matrix (12 source→destination rule sets + 6 universal checks); unknown platforms and the source itself are filtered out. Matrix + grammars + gate: api/v1/content-engine.json -> adaptation_matrix. Pairs with the content-repurposing skill. Planning aid, not financial/legal/tax advice."),
]
```

Replace with:
```
     "Engine (assets/js/content-engine.js, UMD — importable in node): adaptChecklist(source_platform, destinations) reads the adaptation matrix (12 source→destination rule sets + 6 universal checks); unknown platforms and the source itself are filtered out. Matrix + grammars + gate: api/v1/content-engine.json -> adaptation_matrix. Pairs with the content-repurposing skill. Planning aid, not financial/legal/tax advice."),
    ("cadence", "Cadence Coach",
     "How often should you actually post? Turn your honest weekly hours, formats, and platforms into a sustainable cadence — capacity math plus Oct-2026 platform realities. Consistency beats volume.",
     "cadence.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "CadenceInput",
      "type": "object", "required": ["platforms", "weeklyHours", "longMins", "shortMins"],
      "properties": {
          "platforms": {"type": "array", "minItems": 1,
                      "items": {"type": "string", "enum": ["youtube", "shorts", "tiktok", "instagram"]},
                      "description": "Platforms in the cadence."},
          "weeklyHours": {"type": "number", "minimum": 1, "maximum": 80,
                        "description": "Honest, repeatable hours per week."},
          "longMins": {"type": "number", "minimum": 5, "maximum": 3000,
                     "description": "Minutes per long-form video (film+edit+publish); adjustable starting estimate."},
          "shortMins": {"type": "number", "minimum": 5, "maximum": 3000,
                      "description": "Minutes per short-form post (film+edit+publish); adjustable starting estimate."},
          "restDay": {"type": "integer", "minimum": 0, "maximum": 6, "default": 6,
                    "description": "0=Mon … 6=Sun; non-negotiable, no posting."},
          "stage": {"type": "integer", "minimum": 0, "maximum": 4, "default": 1,
                  "description": "Money Map stage; 0 adds the tuition-phase caveat."},
          "priority": {"type": "string", "enum": ["longs", "shorts", "balanced"], "default": "balanced",
                     "description": "Which format gets production minutes first."},
          "overheadPct": {"type": "number", "minimum": 0, "maximum": 0.9, "default": 0.2,
                        "description": "Share of hours reserved for comments/admin/analytics."},
      }},
     "Recommended longs/week + shorts/week, utilization vs production time (holds/tight/over), a 7-day schedule grid (rest day empty), per-platform Oct-2026 revenue realities, the 2-week ramp suggestion, method notes. Capacity arithmetic only — never a promise of views, revenue, or growth.",
     "Logic (assets/js/cadence.js, UMD): production minutes = weeklyHours*60*(1-overheadPct); longs-first/shorts-first/balanced-50-50 allocation by per-piece minutes; utilization = used/production minutes (holds ≤0.7, tight ≤0.95, over above); dealWeek() spreads longs evenly over non-rest days and round-robins shorts; platform notes are the Oct-11-2026 research facts (TikTok Rewards 1-min+ qualifier $0.40–$1.00/1K, Reels $0, Shorts $0.02–$0.20/1K + Feb-2027 10M floor + Oct-1 originality rule, 20M+ uploads/day). Planning aid, not financial/legal/tax advice."),
]
```

## Block B4 — TOOL_SCRIPTS (page script tags)

Search (~line 1094):
```
        "crosspost": ["assets/js/content-engine.js", "assets/js/crosspost-ui.js"],
    }
```

Replace with:
```
        "crosspost": ["assets/js/content-engine.js", "assets/js/crosspost-ui.js"],
        "cadence": ["assets/js/cadence.js", "assets/js/cadence-ui.js"],
    }
```

## Block B5 — TOOL_CSS (page stylesheet)

Search (~line 1099):
```
        "ypp-checker": ["assets/css/yppchecker.css"],
    }
```

Replace with:
```
        "ypp-checker": ["assets/css/yppchecker.css"],
        "cadence": ["assets/css/cadence.css"],
    }
```

## Block B6 — tool-count strings in build.py

6a. Search (~line 1279):
```
<a href="tools.html" class="section-more">All 18 tools →</a>
```
Replace `All 18 tools` with the correct count after wave 26 (wave 27 expects 19 if wave 26 shipped one new tool; if wave 26 changed this line already, bump its number by one).

6b. Search (~line 1529):
```
        "note": ("Programmatic input schemas for the eighteen interactive tools. "
```
Replace `eighteen` with the written-out correct count after wave 26 (`nineteen` expected).

## Block B7 — validate.sh stage 6 (run the new suite)

Search (~line 257):
```
for T in tests/sim-engine.test.js tests/deal-room.test.js tests/content-engine.test.js tests/money-map.test.js tests/video-doctor.test.js tests/niche-atlas.test.js tests/ypp-checker.test.js tests/outreach.test.js; do
```
Append ` tests/cadence.test.js` before `; do`. (If wave 26 already extended this list, append after its last entry.)

Also update the stage-6 header comment (~lines 15–18) to name the cadence suite.

---

## Manual doc touch-ups (apply after the build blocks, adjust counts to wave 26's final)

- **AGENT.md** line 4: `9 phases, 18 tools, 12 skills, 9 case files` → bump tools count.
- **AGENT.md** line 35: `` `GET api/v1/tools.json` | 18 tools with programmatic `input_schema` `` → bump.
- **AGENT.md** tool-drive table (after the Cross-Post Optimizer row, ~line 427): add
  `| Cadence Coach | `platforms`, `weeklyHours`, `longMins`, `shortMins`, `restDay`, `stage`, `priority` (longs/shorts/balanced) | `require("assets/js/cadence.js")` — `recommend(i)` → longs/week + shorts/week, holds/tight/over utilization, 7-day grid, Oct-2026 platform revenue realities, 2-week ramp — capacity math only, never a growth promise |`
- **README.md** line 3 (`eighteen interactive tools`) and line 31 (`9 phases, 18 tools`) → bump.
- **API.md** line 29 (`all eighteen interactive tools`) → bump.
- **pages/agents.md** line 21: add `cadence.html` to the interactive-tools page list.

---

## Block B8 — tests/agent-workflows.test.js (wf2 tool-count + cadence schema pin)

8a. Search:
```
  check("wf2: tools.json lists all 18 tools", tools.length === 18, String(tools.length));
```
Bump both the label number and the `=== N` to wave 26's final count + 1
(wave 27 expects 19 if wave 26 shipped one new tool; if wave 26 changed
this line already, bump its numbers by one).

8b. Search:
```
  check("wf2: crosspost input schema exposes source/destinations/AI-flag fields",
    !!(crossSchema && crossSchema.title === "CrossPostInput"
       && crossSchema.properties.source_platform && crossSchema.properties.destinations
       && crossSchema.properties.photorealistic_ai)
    && cross.page === "crosspost.html");

  // Replicate the planner's layout math (assets/js/planner.js) for
```
Insert between the crosspost check and the planner comment:
```
  const cad = tools.find((t) => t.id === "cadence");
  const cadSchema = cad && cad.input_schema;
  check("wf2: cadence input schema exposes hours/minutes/priority fields",
    !!(cadSchema && cadSchema.title === "CadenceInput"
       && cadSchema.properties.platforms && cadSchema.properties.weeklyHours
       && cadSchema.properties.longMins && cadSchema.properties.shortMins
       && cadSchema.properties.priority)
    && cad.page === "cadence.html");

  // Replicate the planner's layout math (assets/js/planner.js) for
```

---

## Post-merge verification (run in order)

1. `python3 scripts/build.py` — expect clean (9 chapters, wave-26-count + 1 tools, 12 skills, 9 case files).
   (Scratch-verified 2026-10-11 against the wave-26-in-flight tree: B1–B8
   applied cleanly, build clean at 19 tools.)
2. `bash scripts/validate.sh` — expect 8/8 GREEN (16 passed, 0 failed in
   scratch), including the 62 cadence assertions in stage 6 and the new
   wf2 cadence schema pin in stage 8.
3. Confirm `site/cadence.html` renders (TOOL // 0NN, last), `site/tools.html`
   carries the Cadence Coach card, `api/v1/tools.json` has the cadence record
   with the CadenceInput schema validating draft-07, and llms.txt's Tools
   section lists every tool (+ Glossary line).
