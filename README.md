# Creator Growth Empire

The most comprehensive creator-growth guide ever made: the $0 → multi-million-dollar creator company arc. YouTube, TikTok, Facebook, merch, brand deals, LLC, taxes, scale — nine phases, three interactive tools, a versioned JSON API, and six agent skills.

**Private repo. GitHub-only. No Vercel.**

## The nine phases

| # | Phase | What it covers |
|---|---|---|
| 0 | Start From Nothing | Niche selection, positioning, channel setup, branding |
| 1 | The Content Engine | Ideation, scripting, filming on a budget, editing, packaging |
| 2 | YouTube Mastery | How the algorithm works (2026), SEO, analytics, Shorts vs long-form |
| 3 | Everywhere Engine | TikTok, Reels, Facebook — the one-idea-five-platforms repurposing system |
| 4 | Audience to Community | Email list, Discord, live content, turning viewers into a movement |
| 5 | Monetization Stack | AdSense, sponsorships, affiliates, digital products — ordered by return |
| 6 | Merch & Brand | Print-on-demand → owned product line → brand |
| 7 | The Business | LLC formation, taxes, bookkeeping, first hires *(educational — not legal/tax advice)* |
| 8 | Scale | Team building, SOPs, multiple channels, the path to 7–8 figures |

Every chapter is 1,500+ words of substantive, actionable content. No stubs.

## Interactive tools

Nine tools (`pages/*.html` → `site/*.html`): **Niche Picker** (quiz), **Revenue Calculator** (calculator), **90-Day Planner** (planner), **Sponsor Deal Analyzer** (deal-analyzer), **Hiring Cost Calculator** (hiring-calculator), **Repurposing Planner** (repurpose), **Empire Simulator** (simulator), **API Explorer** (api-explorer), **Hook Builder** (hook-builder). Every tool's programmatic input schema lives in `api/v1/tools.json`.

## Agentic layer

- `api/v1/` — versioned JSON: `index.json` (self-describing manifest), `chapters.json`, `glossary.json`, `calculators.json`, `skills.json`, `case-files.json`, `tools.json`, plus `schema/` (11 JSON Schema draft-07 files)
- `AGENT.md` — how an agent uses this site: base URL pattern, example requests, 3 end-to-end workflows (executed by `tests/agent-workflows.test.js`), tool input schemas
- `llms.txt` + `llms-full.txt` — LLM-ready summaries of the full guide (9 phases, 9 tools, guides & playbooks, 5 case files, 12 skills)
- `skills/` — twelve skills in the standard format: `niche-validation`, `hook-writing`, `shortform-hook-craft`, `thumbnail-teardown`, `content-repurposing`, `repurposing-sprint`, `analytics-review`, `sponsorship-pitch`, `deal-negotiation`, `rate-card-reader`, `first-hire-planner`, `live-shopping-playbook`
- `API.md` — full API reference (includes the shared cross-site API conventions block)

## Build

```bash
python3 scripts/build.py
```

Reads `content/*.md` → `site/*.html`, tool pages from `pages/*.html`, glossary from `data/glossary.json`, API JSON, skills index, and llms.txt files. The `site/` directory is the built output (open `site/index.html` locally or serve the repo root).

## Validate

```bash
bash scripts/validate.sh   # 8 stages: JS syntax, JSON parse, draft-07 schemas,
                           # link check, build reproducibility, sim tests,
                           # llms freshness, AGENT.md workflow execution
```

## Design

Dark `#0b0b0d`, acid lime `#c8ff2e`, coral `#ff4d2e`, gold `#ffc42e`. Archivo display + Space Grotesk body. Mission-briefing energy: mega typography, sticker badges, ticker marquee. No gradients, no template look. Semantic HTML, ARIA, keyboard support, reduced-motion, mobile-first, print styles.

## Factual grounding

Platform facts (YPP thresholds, revenue splits, TikTok Rewards terms, Meta monetization) were verified via web search in October 2026. Platform numbers change constantly — every figure carries a "verify live" expectation, and the chapters say so. No income promises anywhere; ranges are presented as ranges.

## License

Private. All rights reserved.
