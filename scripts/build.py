#!/usr/bin/env python3
"""Build the Creator Growth Empire static site from content/*.md.

Outputs:
  site/                 - generated HTML site (index, phases, tools, glossary)
  site/assets/          - copied CSS/JS
  api/v1/*.json         - versioned JSON API (+ schema/)
  llms.txt / llms-full.txt - agent-oriented surfaces
"""
import json, re, shutil, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
PAGES = ROOT / "pages"
ASSETS = ROOT / "assets"
DATA = ROOT / "data"
SITE = ROOT / "site"
API = ROOT / "api" / "v1"

SITE_NAME = "Creator Growth Empire"
TAGLINE = "From $0 to a multi-million-dollar creator company."
FONT_URL = ("https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,600;0,800;0,900;1,900"
           "&family=Space+Grotesk:wght@400;500;700"
           "&family=JetBrains+Mono:wght@400;700&display=swap")

PHASE_ACCENTS = ["acid", "coral", "gold", "violet", "acid", "coral", "gold", "violet", "acid"]

REFERENCE_PAGES = [
    ("rate-card", "content/rate-card.md", "Reference", "2026 Rate Card"),
    # Optional 5th element: list of <script src> paths injected into <head>
    # (wave 14: the Niche Atlas ships an interactive explorer).
    ("niche-atlas", "content/niche-atlas.md", "Reference", "The Niche Atlas",
     ["assets/js/niche-atlas.js"]),
    ("metrics-glossary", "content/metrics-glossary.md", "Reference", "The Metrics Glossary"),
]

# Interactive mount appended to the Niche Atlas reference page (wave 14).
# The explorer UI itself is rendered by assets/js/niche-atlas.js from
# api/v1/niches.json; the article above carries static tables so the page
# reads fully without JavaScript.
NICHE_EXPLORER_MOUNT = (
    '<section class="niche-explorer" aria-labelledby="ne-mount-title">'
    '<h2 id="ne-mount-title" class="visually-hidden">Niche explorer</h2>'
    '<div id="niche-explorer"></div>'
    "<noscript><p>The niche explorer needs JavaScript. The full niche tables — "
    "growth rates, search demand, breakout formats, revenue bands, and the avoid "
    "list — are in the article above, and the dataset is "
    '<a href="api/v1/niches.json">api/v1/niches.json</a>.</p></noscript>'
    "</section>"
)

# Retention-curve sketches mount (wave 19): hand-drawn SVG illustrations for the
# Metrics Glossary's curve reader. Static sketches — read the shape, never the
# numbers. No data behind them; each carries an aria-label + figcaption so the
# read works without the image.
def _curve_sketch(num, title, aria, points, marker=None, ok=False):
    line_cls = "curve-line-ok" if ok else "curve-line"
    marker_svg = ""
    if marker:
        mx, mlabel = marker
        marker_svg = (
            f'<line x1="{mx}" y1="10" x2="{mx}" y2="132" class="curve-marker"/>'
            f'<text x="{mx + 5}" y="24" class="curve-tag">{mlabel}</text>'
        )
    return (
        f'<figure class="curve-sketch">'
        f'<svg viewBox="0 0 300 150" role="img" aria-label="{aria}">'
        f'<line x1="8" y1="8" x2="8" y2="132" class="curve-axis"/>'
        f'<line x1="8" y1="132" x2="292" y2="132" class="curve-axis"/>'
        f'<text x="12" y="22" class="curve-tag">watching</text>'
        f'<text x="252" y="146" class="curve-tag">time &#8594;</text>'
        f"{marker_svg}"
        f'<polyline points="{points}" class="{line_cls}"/>'
        f"</svg>"
        f"<figcaption><strong>{num}. {title}</strong>"
    )

METRICS_CURVE_MOUNT = (
    '<section class="curve-sketches" aria-labelledby="curve-sketches-title">'
    '<h2 id="curve-sketches-title">The five curve shapes — sketches</h2>'
    "<p class=\"muted\">Illustrative sketches drawn for this page — read the <em>shape</em>, "
    "never the numbers. Your graph's timestamps are the diagnosis; these are the patterns to recognize.</p>"
    '<div class="curve-sketch-grid">'
    + _curve_sketch("1", "The cliff at the start",
        "Retention curve sketch: the line drops steeply in the first moments, then coasts gently downward.",
        "8,16 26,22 38,92 60,102 150,112 292,124", marker=(38, "\u22480:30"))
    + "Hook/packaging failure — the opening didn't deliver the promise instantly. "
      "Fix: move the payoff moment to second 5. (Phase 2)</figcaption></figure>"
    + _curve_sketch("2", "The sawtooth",
        "Retention curve sketch: the line zigzags downward — small recoveries, then more slide.",
        "8,30 50,86 68,52 110,90 128,56 170,94 188,62 230,98 248,68 292,104")
    + "Teeth bouncing back up = re-hooks working; the whole saw grinding down = pacing problem. "
      "Fix: a pattern interrupt every 30–60 seconds. (Phase 2)</figcaption></figure>"
    + _curve_sketch("3", "The single cliff",
        "Retention curve sketch: gentle decline, one vertical drop in the middle, then gentle decline again.",
        "8,28 120,48 150,54 156,108 172,112 292,122", marker=(156, "watch here"))
    + "One bad section — a tangent, a slow demo, an off-topic rant. "
      "Fix: watch that timestamp; cut it or compress to 20%. (Phase 2)</figcaption></figure>"
    + _curve_sketch("4", "The end collapse",
        "Retention curve sketch: flat and healthy most of the way, then a steep drop near the end.",
        "8,24 170,38 225,46 258,58 292,118", ok=True)
    + "Normal — unless the collapse starts before 50%. Viewers leaving after the payoff is healthy. "
      "Fix: move anything that matters before the natural end. (Phase 2)</figcaption></figure>"
    + _curve_sketch("5", "The flat low line",
        "Retention curve sketch: a low, nearly flat line from start to finish — no recovery, no teeth.",
        "8,108 120,112 200,116 292,120")
    + "Topic mismatch — the promise didn't match what the audience wanted. Under 50 videos this is the "
      "tuition phase, not a verdict. Fix: repackage the same topic three ways first. (Phase 2)</figcaption></figure>"
    + "</div>"
    '<p class="muted" style="margin-top:1rem">Shapes 1–5 are the chapter reads from '
    '<a href="phase-2-youtube-mastery.html">Phase 2\u2019s retention repair</a>. '
    'Still stuck? Run the symptom through <a href="video-doctor.html">Diagnose My Video</a>.</p>'
    "</section>"
)

CHAPTERS = [
    ("phase-0-start-from-nothing",  "content/phase-0-start-from-nothing.md",  "Phase 0", "Start From Nothing"),
    ("phase-1-content-engine",      "content/phase-1-content-engine.md",      "Phase 1", "The Content Engine"),
    ("phase-2-youtube-mastery",     "content/phase-2-youtube-mastery.md",     "Phase 2", "YouTube Mastery"),
    ("phase-3-everywhere-engine",   "content/phase-3-everywhere-engine.md",   "Phase 3", "The Everywhere Engine"),
    ("phase-4-audience-to-community","content/phase-4-audience-to-community.md","Phase 4", "Audience to Community"),
    ("phase-5-monetization-stack",  "content/phase-5-monetization-stack.md",  "Phase 5", "The Monetization Stack"),
    ("phase-6-merch-and-brand",     "content/phase-6-merch-and-brand.md",     "Phase 6", "Merch & Brand"),
    ("phase-7-the-business",        "content/phase-7-the-business.md",        "Phase 7", "The Business"),
    ("phase-8-scale",               "content/phase-8-scale.md",               "Phase 8", "Scale"),
]

TOOLS = [
    ("quiz", "Niche Picker", "Answer 6 questions, get ranked niche suggestions with reasoning — or take the 4-question \"Pick my 2027 niche\" branch, scored against the Niche Atlas 2027 outlook layer."),
    ("calculator", "Revenue Calculator", "Project revenue from views, niche, sponsors, and affiliates — with honest ranges."),
    ("planner", "90-Day Planner", "Generate a posting schedule from your platforms and cadence. Printable."),
    ("deal-analyzer", "Sponsor Deal Analyzer", "Benchmark a sponsor offer against the 2026 rate card — verdict, red-flag checklist, counter-offer worksheet."),
    ("deal-room", "The Deal Room", "Manage the whole deal: track offers through signing, price usage rights, rehearse negotiations, export your memo."),
    ("hiring-calculator", "Hiring Cost Calculator", "Price your first hire: monthly/annual cost and the ad revenue needed to cover it — honest math, no promises."),
    ("repurpose", "Repurposing Planner", "Turn one idea into a 5-platform mission-card checklist from the Phase 3 repurposing SOP."),
    ("simulator", "Empire Simulator", "Simulate 12–24 months of channel growth + revenue — scenario library, A/B comparison, team hiring P&L — a model, not a prediction."),
    ("api-explorer", "API Explorer", "Browse every api/v1 endpoint and preview JSON responses live in your browser — no key, no server."),
    ("hook-builder", "Hook Builder", "Type your video topic, get five filmed-ready hooks — one per Short-Form Playbook structure. Flip-through cards."),
    ("idea-bank", "Idea Bank", "Capture ideas with hook-strength scores (1–5, Playbook structures), niche tags, and effort estimates — promote the best to production."),
    ("content-calendar", "90-Day Content Calendar", "Deal your idea bank into a 90-day grid: week-planner dealing rules, drag/keyboard moves, sponsor slots, copy-my-calendar export."),
    ("batching", "Batching Planner", "Film-day math: does your shoot capacity actually cover your cadence? Honest surplus/shortfall, consistency-beats-volume framing."),
    ("money-map", "The Money Map", "Find your stage on the $0-to-company journey: 7 questions, 5 stage playbooks, your next 3 moves. Stages are focus guides, never income promises."),
    ("video-doctor", "Diagnose My Video", "Pick your symptom \u2014 low CTR, the 30-second cliff, great retention but no subs \u2014 and get ranked causes with the fix from the chapter that owns it."),
    ("ypp-checker", "YPP 2027 Eligibility Checker", "Enter your subs, watch hours, and Shorts views — get your verdict under the current YPP bar and the Feb-2027 bar, the gap math, and a chapter-grounded plan to close it."),
]



# TOOLS_API: programmatic input schemas for every interactive tool (wave 12).
# Agents drive the tools' logic without the UI by replicating these inputs
# against the shipped JS logic (assets/js/<slug>.js) and api/v1/calculators.json.
# Each entry: (id, title, description, page, input_schema [JSON Schema draft-07],
#              output_description, drive_notes).
TOOLS_API = [
    ("quiz", "Niche Picker",
     "Answer 6 questions, get ranked niche suggestions with reasoning — or take the 4-question \"Pick my 2027 niche\" branch.",
     "quiz.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "QuizInput",
      "type": "object", "required": ["q1", "q2", "q3", "q4", "q5", "q6"],
      "properties": {
          "q1": {"type": "string", "enum": ["numbers", "teaching", "doing", "story", "research"],
                 "description": "What you could talk about for 100 videos."},
          "q2": {"type": "string", "enum": ["spotlight", "voiceover", "hands", "whatever"],
                 "description": "On-camera comfort."},
          "q3": {"type": "string", "enum": ["money", "audience", "balance"],
                 "description": "Max money per view, biggest audience, or balance."},
          "q4": {"type": "string", "enum": ["skill", "personality", "access", "curiosity"],
                 "description": "Unfair advantage."},
          "q5": {"type": "string", "enum": ["long", "short", "both"],
                 "description": "Preferred format."},
          "q6": {"type": "string", "enum": ["extreme", "medium", "low"],
                 "description": "Competition tolerance."},
          "q271": {"type": "string", "enum": ["rising", "search", "underserved", "evergreen"],
                 "description": "2027 branch: what's your 2027 bet (rising format / search demand / underserved lane / evergreen)."},
          "q272": {"type": "string", "enum": ["shorts", "long", "both"],
                 "description": "2027 branch: shorts-first, long-form, or both."},
          "q273": {"type": "string", "enum": ["policy", "comp", "lowpay"],
                 "description": "2027 branch: which risk you can stomach."},
          "q274": {"type": "string", "enum": ["teaching", "research", "personality", "hands-on", "voice"],
                 "description": "2027 branch: skill fit."},
      }},
     "Ranked niche list (top 3+) with per-niche reasoning and fit tags. The 2027 branch returns top-3 niches with trajectory badges, basis sentences, and risk notes.",
     "Scoring logic lives in assets/js/quiz.js: option tags are matched against each niche's fit[] tags, q3 sets an RPM preference filter, q6 sets the competition ceiling. The niche catalogue (9 niches, fit tags, rpm/competition levels) is embedded in quiz.js. The 2027 branch scores the 20 atlas niches against data/niches.json outlook_2027 trajectories (heating +3 / stable +1 / cooling -2), growth-signal matches, format fit, risk alignment, and atlas skill_fit — OUTLOOK_2027 in quiz.js mirrors the JSON and tests/niche-atlas.test.js checks sync."),
    ("calculator", "Revenue Calculator",
     "Project revenue from views, niche, sponsors, and affiliates — with honest ranges.",
     "calculator.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "CalculatorInput",
      "type": "object", "required": ["niche", "monthly_longform_views"],
      "properties": {
          "niche": {"type": "string",
                    "enum": ["comedy_entertainment", "education", "finance_investing",
                             "gaming", "health_fitness", "lifestyle", "music",
                             "tech_software", "kids_content"],
                    "description": "Must be a key of calculators.json youtube_longform_rpm_bands."},
          "monthly_longform_views": {"type": "number", "minimum": 0},
          "monthly_shorts_views": {"type": "number", "minimum": 0, "default": 0},
          "sponsor_deals_per_month": {"type": "number", "minimum": 0, "default": 0},
          "avg_sponsor_video_views": {"type": "number", "minimum": 0, "default": 0,
                                      "description": "Expected views on the sponsored video(s)."},
          "monthly_affiliate_revenue": {"type": "number", "minimum": 0, "default": 0},
      }},
     "Monthly revenue range [lo, hi] split into long-form ads, Shorts ads, sponsorships, affiliate/products, plus annualized totals. Ranges, never promises.",
     "Math (assets/js/calculator.js): long-form ads = views/1000 × RPM band from calculators.json; Shorts ads = shorts/1000 × shorts_rpm_per_1000; sponsorships = deals × (sponsor views/1000) × sponsorship_rule_of_thumb.dedicated_cpm_range; affiliate = input × 0.7–1.3."),
    ("planner", "90-Day Planner",
     "Generate a posting schedule from your platforms and cadence. Printable.",
     "planner.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "PlannerInput",
      "type": "object", "required": ["longform_per_week"],
      "properties": {
          "longform_per_week": {"type": "integer", "minimum": 0, "maximum": 7},
          "shorts_per_week": {"type": "integer", "minimum": 0, "maximum": 21, "default": 0},
          "platforms": {"type": "array", "items": {"type": "string"},
                        "default": ["Short-form"],
                        "description": "Where the shorts go (e.g. TikTok, Reels, Shorts)."},
          "rest_day": {"type": "integer", "minimum": 0, "maximum": 6, "default": 6,
                       "description": "0=Mon … 6=Sun; that day is rest + analytics review."},
      }},
     "13-week posting schedule (91 days): per-day long-form and short-form assignments, totals, a day-45 checkpoint review note.",
     "Layout logic (assets/js/planner.js): long-form spread across non-rest days, shorts spread 2 days apart, week 7 flagged as the midpoint review. Rest day is non-negotiable — no posting, analytics review only."),
    ("deal-analyzer", "Sponsor Deal Analyzer",
     "Benchmark a sponsor offer against the 2026 rate card — verdict, red-flag checklist, counter-offer worksheet.",
     "deal-analyzer.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "DealAnalyzerInput",
      "type": "object", "required": ["platform", "deliverable", "followers", "offer_usd"],
      "properties": {
          "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"]},
          "deliverable": {"type": "string",
                          "enum": ["integrated", "dedicated", "short"],
                          "description": "Integrated slot, dedicated video, or short-form video."},
          "followers": {"type": "number", "minimum": 0},
          "offer_usd": {"type": "number", "minimum": 0},
          "expected_views": {"type": "number", "minimum": 0, "default": 0,
                             "description": "If known, enables the implied-CPM check."},
          "usage_rights": {"type": "string",
                           "enum": ["organic_only", "paid30", "paid180", "paid365", "perpetual"],
                           "default": "organic_only"},
          "whitelisting": {"type": "string", "enum": ["none", "30", "90", "perpetual"],
                           "default": "none"},
          "exclusivity": {"type": "string", "enum": ["none", "30", "90", "broad"],
                          "default": "none"},
          "payment_terms": {"type": "string", "enum": ["30", "60", "90"],
                            "default": "30", "description": "Net payment terms in days."},
      }},
     "Verdict (UNDERPAID / FAIR / STRONG), benchmark range, implied CPM vs rate-card CPMs, red-flag checklist (usage, whitelisting, exclusivity, payment), counter-offer worksheet with line items.",
     "Logic (assets/js/deal-analyzer.js): followers → tier (nano/micro/macro/mega) → per_video_or_post_by_tier range for platform; verdict = offer vs range; counter starts at range top (creators list ~23% above what they accept) + usage line items (paid30 +50%, paid180 +75%, paid365 +100%) + exclusivity (30d +25%, 60–90d +50%). Negotiation aid, not financial advice."),
    ("deal-room", "The Deal Room",
     "Manage the whole deal: track offers through signing, price usage rights, rehearse negotiations, export your memo.",
     "deal-room.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "DealRoomInput",
      "type": "object", "required": ["brand", "platform", "followers", "offer_usd"],
      "properties": {
          "brand": {"type": "string", "description": "Brand making the offer."},
          "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"]},
          "followers": {"type": "number", "minimum": 0},
          "deliverable": {"type": "string", "enum": ["integrated", "dedicated", "short"],
                          "default": "integrated"},
          "expected_views": {"type": "number", "minimum": 0, "default": 0,
                             "description": "Last-10-video average; the number sponsors buy."},
          "offer_usd": {"type": "number", "minimum": 0},
          "usage_rights": {"type": "string",
                           "enum": ["organic", "paid30", "paid180", "paid365", "perpetual"],
                           "default": "organic"},
          "exclusivity": {"type": "string", "enum": ["none", "30", "90", "broad"],
                          "default": "none"},
          "payment_terms": {"type": "string", "enum": ["15", "30", "60", "90"],
                            "default": "30", "description": "Net payment terms in days."},
          "timeline": {"type": "string",
                       "description": "Due date / delivery window as written in the offer."},
          "status": {"type": "string",
                     "enum": ["offer", "negotiating", "signed", "delivered", "paid"],
                     "default": "offer",
                     "description": "Where the deal sits in the offer → paid pipeline."},
      }},
     "Tracked deal records with rate-card verdicts (UNDERPAID / FAIR / STRONG + the ~23% listed-vs-accepted note), usage-rights line-item pricing (reported +50/+75/+100% band; no invented whitelisting/buyout multipliers), per-situation negotiation scripts, interactive red-flag checklist scoring, and a one-page deal memo.",
     "Logic (assets/js/deal-room.js, UMD — importable in node): scoreOffer(offer, lo, hi) benchmarks against sponsorship_rate_card_2026; priceUsage(baseFee, tierId, usage_rights_tiers) applies the reported multipliers, returning guidance instead of numbers for whitelisting/buyout; redFlagScore(checkedIds, red_flags) scores contract structure (any walk_away flag or 3+ points -> walk away); renderScript(script, vars) fills {{placeholders}}; dealMemo(deal, scored, flags) builds the one-page record. Scripts + checklist + tiers live in api/v1/deal-templates.json. Negotiation aid, not financial/legal/tax advice."),
    ("hiring-calculator", "Hiring Cost Calculator",
     "Price your first hire: monthly/annual cost and the ad revenue needed to cover it — honest math, no promises.",
     "hiring-calculator.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "HiringCalculatorInput",
      "type": "object", "required": ["role", "billing_model", "rate_usd"],
      "properties": {
          "role": {"type": "string",
                   "enum": ["editor", "thumbnail_designer", "va", "channel_manager"],
                   "description": "Video editor, thumbnail designer, virtual assistant, channel manager/ops."},
          "billing_model": {"type": "string", "enum": ["hourly", "per_video", "monthly"],
                            "description": "hourly = rate/hr × hours/week; per_video = rate × units/month; monthly = retainer."},
          "rate_usd": {"type": "number", "minimum": 0},
          "hours_per_week": {"type": "number", "minimum": 0, "default": 0},
          "units_per_month": {"type": "number", "minimum": 0, "default": 0},
          "monthly_views": {"type": "number", "minimum": 0, "default": 0,
                            "description": "Your current monthly long-form views, for the coverage math."},
          "niche": {"type": "string",
                    "enum": ["comedy_entertainment", "education", "finance_investing",
                             "gaming", "health_fitness", "lifestyle", "music",
                             "tech_software", "kids_content"],
                    "default": "education"},
      }},
     "Monthly/annual cost (sticker vs +15% loaded), share of ad revenue, monthly views needed to cover the loaded cost, 3-month coverage reserve.",
     "Math (assets/js/hiring-calculator.js): hourly → rate × hrs × 52/12; per_video → rate × units; monthly → retainer. Loaded cost = sticker × 1.15 (management, revisions, fees). Coverage views = loaded ÷ RPM band × 1000 (both band ends). The hiring rule: cover 3 months from revenue before signing."),
    ("repurpose", "Repurposing Planner",
     "Turn one idea into a 5-platform mission-card checklist from the Phase 3 repurposing SOP.",
     "repurpose.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "RepurposeInput",
      "type": "object", "required": ["idea"],
      "properties": {
          "idea": {"type": "string", "minLength": 1,
                   "description": "The single pillar idea (one sentence)."},
          "source_format": {"type": "string",
                            "enum": ["longform", "live", "newsletter", "podcast", "other"],
                            "default": "longform"},
      }},
     "Five mission cards (YouTube Day 0, Short Day +1, TikTok Day +2, Reel Day +3, Facebook Day +4) each with a hook rewrite, atom test, and native-grammar checklist.",
     "Logic (assets/js/repurpose.js + assets/js/content-engine.js): atom test (does the insight survive standalone?), pillar prep (hook in first 15s), then the five staggered mission cards. Enforce native grammar — no watermarks, no copy-paste. 2.0 adds the full derivative map via ContentEngine.repurposeMap (7 derivatives: short clip, community reaction, TikTok cut, Reel cut, newsletter issue, X thread, Facebook post) — every derivative carries a required original element (repurposing is not re-uploading) plus the Oct-1 originality guardrails (ContentEngine.originalityGuardrails). Machine-readable map + guardrails: api/v1/content-engine.json repurposing_2_0 / originality_guardrails."),
    ("simulator", "Empire Simulator",
     "Simulate 12–24 months of channel growth + revenue — scenario library, A/B comparison, team hiring P&L — a model, not a prediction.",
     "simulator.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "SimulatorInput",
      "type": "object", "required": ["niche", "start_subs", "longform_per_week"],
      "properties": {
          "niche": {"type": "string",
                    "enum": ["finance_investing", "tech_software", "education",
                             "health_fitness", "lifestyle", "comedy_entertainment",
                             "gaming", "music"],
                    "description": "Growth-model niche keys from the sim engine's nicheGrowth map."},
          "start_subs": {"type": "number", "minimum": 0},
          "longform_per_week": {"type": "number", "minimum": 0},
          "shorts_per_week": {"type": "number", "minimum": 0, "default": 0},
          "quality": {"type": "string", "enum": ["low", "solid", "excellent"], "default": "solid"},
          "monthly_growth_rate": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.12,
                                  "description": "Base monthly compounding growth at reference cadence (assumption, adjustable)."},
          "q4_uplift_pct": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.6,
                            "description": "Ad-rate uplift in months 10–12 (assumption, adjustable 0.4–0.8)."},
          "monetize_ads": {"type": "boolean", "default": True},
          "monetize_sponsors": {"type": "boolean", "default": False},
          "monetize_affiliates": {"type": "boolean", "default": False},
          "monetize_digital": {"type": "boolean", "default": False},
          "digital_start_month": {"type": "integer", "minimum": 1, "maximum": 24, "default": 1},
          "digital_price_usd": {"type": "number", "minimum": 1, "default": 49},
          "scenario_id": {"type": "string",
                    "enum": ["asmr-bedroom", "tech-reviewer", "ai-tutorials", "betrayal-dramas",
                             "cooking-channel", "personal-finance", "fitness-coach",
                             "serialized-mini-drama", "asmr-roleplay"],
                    "description": "One-click preset: loads a full named starting config from the engine's SCENARIOS library (research-sourced assumptions)."},
          "horizon": {"type": "integer", "enum": [12, 24], "default": 12,
                      "description": "12 or 24 months. 24 adds year-2 diminishing returns: monthly growth decays x0.94/mo after month 12 (the engine's labeled curve)."},
          "hires": {"type": "array", "default": [],
                    "items": {"type": "object", "required": ["type"],
                              "properties": {
                                  "type": {"type": "string", "enum": ["editor", "thumbnail", "va"],
                                           "description": "First-Hire-guide role: editor, thumbnail designer, or virtual assistant."},
                                  "start_month": {"type": "integer", "minimum": 1, "maximum": 24, "default": 1},
                                  "monthly_cost_usd": {"type": "number", "minimum": 0,
                                    "description": "Omit to use the guide preset: editor $1,400, thumbnail $120, VA $900."},
                              }},
                    "description": "Team hires: each adds output/quality lift and subtracts monthly cost (month-by-month P&L: gross, team cost, net). First active month at 50% effect (ramp-up)."},
          "compare_with": {"type": "object",
                    "description": "A/B mode: {name_b, inputs_b} — compare(nameA, inputsA, nameB, inputsB, cfg) runs both over the same horizon and returns B-minus-A deltas plus a plain-language verdict.",
                    "properties": {
                        "name_b": {"type": "string", "description": "Label for the B path (e.g. 'Tech reviewer')."},
                        "inputs_b": {"type": "object", "description": "Full SimulatorInput for the B path (or a scenario_id)."},
                    }},
      }},
     "12- or 24-month projection: subs, views, and revenue per month per stream (ads, sponsors, affiliates, digital), month-by-month team P&L (gross, team cost, net), totals, milestones, and the full named-assumptions list. compare() adds side-by-side deltas (B minus A) and a verdict. exportPlan() renders the copy-my-empire-plan text. A model, not a prediction.",
     "Engine (assets/js/sim-engine.js, UMD — importable in node): simulate(inputs, cfg) with cfg = calculators.json. scenarioInputs(id) loads a named preset from the SCENARIOS library; compare(nameA, inputsA, nameB, inputsB, cfg) runs two configs over the same clock (deltas are B minus A); assumptionLines(inputs, res) is the always-visible assumptions panel; exportPlan(scenarioName, inputs, res) renders the share text. Growth compounds monthly x niche factor x quality x cadence (diminishing, capped 2.5x). Hires add output/quality and subtract cost monthly (first active month at 50% ramp). Year-2 decays growth x0.94/mo after month 12. RPMs come from calculators.json youtube_longform_rpm_bands. Every assumption is named in DEFAULTS and listed on-page."),
    ("api-explorer", "API Explorer",
     "Browse every api/v1 endpoint and preview JSON responses live in your browser — no key, no server.",
     "api-explorer.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "ApiExplorerInput",
      "type": "object", "properties": {},
      "description": "No inputs — this tool is a read-only browser over the API itself."},
     "Live in-browser JSON previews of every endpoint, discovered from api/v1/index.json with a static fallback list.",
     "Discovery (assets/js/api-explorer.js): fetches api/v1/index.json, renders one GET button per endpoint record, pretty-prints responses. Agents can skip the UI and fetch the endpoints directly."),
    ("hook-builder", "Hook Builder",
     "Type your video topic, get five filmed-ready hooks — one per Short-Form Playbook structure. Flip-through cards.",
     "hook-builder.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "HookBuilderInput",
      "type": "object", "required": ["topic"],
      "properties": {
          "topic": {"type": "string", "minLength": 1,
                    "description": "The video topic in one line (the payoff works best)."},
      }},
     "Five filmed-ready hooks, one per Short-Form Playbook structure: open loop, cold start, contrarian take, numbered promise, question-as-hook.",
     "Logic (assets/js/hook-builder.js): topic → template fills per structure + the anti-hook checklist (no 'wait for it', no follow-begging, no channel-name cold open). The structures are craft formulas, not platform documentation."),
    ("idea-bank", "Idea Bank",
     "Capture ideas with hook-strength scores (1–5, Playbook structures), niche tags, and effort estimates — promote the best to production.",
     "idea-bank.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "IdeaBankInput",
      "type": "object", "required": ["title"],
      "properties": {
          "title": {"type": "string", "minLength": 1, "maxLength": 120,
                  "description": "The idea in one line — the core of the video."},
          "format": {"type": "string", "enum": ["long", "short", "community"],
                   "default": "long",
                   "description": "Long-form pillar, short-form post, or community text post."},
          "niche": {"type": "string",
                  "description": "Niche tag — a Niche Atlas niche id from api/v1/niches.json (free text accepted)."},
          "effort": {"type": "string", "enum": ["quick", "afternoon", "week"],
                   "default": "afternoon",
                   "description": "quick < 2h, afternoon = half day, week = full week build."},
          "hook_score": {"type": "integer", "minimum": 1, "maximum": 5, "default": 3,
                       "description": "Hook strength self-score against the five Short-Form Playbook structures (see api/v1/content-engine.json hook_structures)."},
      }},
     "Banked ideas sorted by hook score (ties by FIFO), filterable by format, promotable to production (they deal into the content calendar). localStorage only.",
     "Logic (assets/js/content-engine.js, UMD — importable in node): hookScore(n) clamps 1–5; sortIdeas(ideas) sorts by hook score desc, ties by created asc, no mutation; filterIdeas(ideas, format) filters. Storage is the browser's localStorage (key cge_idea_bank_v1) — agents feed idea records directly to the engine functions."),
    ("content-calendar", "90-Day Content Calendar",
     "Deal your idea bank into a 90-day grid: week-planner dealing rules, drag/keyboard moves, sponsor slots, copy-my-calendar export.",
     "content-calendar.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "ContentCalendarInput",
      "type": "object", "required": ["longform_per_week"],
      "properties": {
          "longform_per_week": {"type": "integer", "minimum": 0, "maximum": 7},
          "shorts_per_week": {"type": "integer", "minimum": 0, "maximum": 21, "default": 0},
          "rest_day": {"type": "integer", "minimum": 0, "maximum": 6, "default": 6,
                     "description": "0=Mon … 6=Sun; non-negotiable rest — no placement, analytics review only."},
          "weeks": {"type": "integer", "minimum": 1, "maximum": 52, "default": 13},
          "ideas": {"type": "array", "default": [],
                  "items": {"type": "object", "required": ["id", "title", "format"],
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "format": {"type": "string", "enum": ["long", "short", "community"]},
                                "hookScore": {"type": "integer", "minimum": 1, "maximum": 5, "default": 3},
                                "created": {"type": "number"}}},
                  "description": "Idea records (e.g. from the Idea Bank). Community ideas deal on the short cadence."},
      }},
     "13-week grid: per-day long/short placements, open slots (never filler), backlog, midpoint-review flag on week 7. Export text + simulator input bridge + sponsor-slot marks.",
     "Logic (assets/js/content-engine.js, UMD — importable in node): dealIdeas(ideas, {longsPerWeek, shortsPerWeek, restDay, weeks}) — same dealing arithmetic as the 90-Day Planner: longs sort by hook score desc then round-robin across weeks onto non-rest work days; shorts deal every other work day; empty slots stay OPEN (never padded); surplus ideas return in unplaced; week 7 flagged midpointReview. exportCalendarText(deal) renders the copy-my-calendar text; simInputFromCadence(longs, shorts) returns {longform_per_week, shorts_per_week} for the Simulator; sponsored slots are calendar commitments only — price them in the Deal Room."),
    ("batching", "Batching Planner",
     "Film-day math: does your shoot capacity actually cover your cadence? Honest surplus/shortfall, consistency-beats-volume framing.",
     "batching.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "BatchingPlannerInput",
      "type": "object", "required": ["videos_per_shoot_day", "shoot_days_per_month", "longform_per_week"],
      "properties": {
          "videos_per_shoot_day": {"type": "number", "minimum": 0,
                                 "description": "Long-form videos filmed per shoot day (honest average)."},
          "shoot_days_per_month": {"type": "number", "minimum": 0,
                                 "description": "Scheduled, repeatable shoot days — 'I'll find the time' doesn't count."},
          "shorts_per_shoot_day": {"type": "number", "minimum": 0,
                                 "description": "Defaults to 2x videos_per_shoot_day."},
          "longform_per_week": {"type": "number", "minimum": 0},
          "shorts_per_week": {"type": "number", "minimum": 0, "default": 0},
      }},
     "Required vs capacity per month (long + short), deltas, and a verdict: surplus (bank it), balanced (no slack), or shortfall (add a shoot day / drop a slot / merge formats).",
     "Logic (assets/js/content-engine.js, UMD — importable in node): batchingMath(opts) — capacity = shoot_days_per_month × videos_per_shoot_day; required = cadence × 52/12 (the honest month); verdict surplus/balanced/shortfall with guidance text. Pure arithmetic on the creator's own inputs — never a promise. Planning aid, not financial/legal/tax advice."),
    ("money-map", "The Money Map",
     "Find your stage on the $0-to-company journey: 7 questions, 5 stage playbooks, your next 3 moves. Stages are focus guides, never income promises.",
     "money-map.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "MoneyMapInput",
      "type": "object",
      "required": ["platform", "audience", "revenue", "cadence", "team", "bottleneck", "streams"],
      "properties": {
          "platform": {"type": "string",
                       "enum": ["youtube", "tiktok", "instagram", "twitch", "newsletter", "not-yet"],
                       "description": "Primary publishing platform."},
          "audience": {"type": "string",
                       "enum": ["zero", "under-1k", "1k-10k", "10k-100k", "100k-1m", "1m-plus"],
                       "description": "Subscriber/follower band."},
          "revenue": {"type": "string",
                      "enum": ["0", "1-99", "100-999", "1k-9999", "10k-plus"],
                      "description": "Typical monthly content revenue band. The honest anchor: placement is driven by this, not by audience or team size."},
          "cadence": {"type": "string",
                      "enum": ["irregular", "weekly", "multi-weekly", "daily-or-team"],
                      "description": "Actual publishing cadence."},
          "team": {"type": "string",
                   "enum": ["just-me", "freelancers", "employees"],
                   "description": "Who makes the content."},
          "bottleneck": {"type": "string",
                         "enum": ["ideas", "consistency", "growth", "monetization", "operations"],
                         "description": "Biggest bottleneck right now — selects the bottleneck-driven roadmap moves."},
          "streams": {"type": "string",
                      "enum": ["0", "1", "2-3", "4-plus"],
                      "description": "Revenue streams actually paying right now."},
      }},
     "Stage placement (0–4: The Start Line / First $100 / The Engine Runs / The Business / The Company), sanity notes (audience-ahead, team-ahead), and a 3-move roadmap (stage signature move + 2 bottleneck-driven moves), the stage trap, and the graduate-when criteria. Placement anchored on the creator's own reported revenue band; stages are focus guides, never income promises.",
     "Logic (assets/js/money-map.js, UMD — importable in node): placeStage(a) — revenue band maps 0→0, 1-99→1, 100-999→2, 1k-9999→3, 10k-plus→4; if audience is 100k+ and base stage ≤ 2, stage+1 with an 'audience-ahead' note; employees with stage ≤ 2 adds a 'team-ahead' note. roadmap(a) — stage signature move (the stage's #1 tool) + two bottleneck-driven moves, deduped. STAGES carries the full playbook data (goal, 3 moves, trap, graduate). Planning aid, not financial/legal/tax advice."),
    ("video-doctor", "Diagnose My Video",
     "Pick your symptom \u2014 low CTR, the 30-second cliff, great retention but no subs \u2014 and get ranked causes with the fix from the chapter that owns it.",
     "video-doctor.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "VideoDoctorInput",
      "type": "object", "required": ["symptom", "platform", "experience"],
      "properties": {
          "symptom": {"type": "string",
                      "enum": ["low-ctr", "early-dropoff", "good-retention-no-subs",
                               "sawtooth", "single-cliff", "shorts-no-crossover",
                               "flat-low", "end-collapse"],
                      "description": "The symptom the creator sees in their analytics."},
          "platform": {"type": "string",
                       "enum": ["longform", "shorts", "tiktok", "reels"],
                       "description": "Where the underperforming video lives."},
          "experience": {"type": "string", "enum": ["under-50", "over-50"],
                         "description": "Videos shipped. Under 50 = tuition phase: the data is thin, diagnose lightly."},
      }},
     "Ranked likely causes drawn from the site's chapters (Phase 1, Phase 2, Short-Form Playbook), each with chapter-grounded fixes and read-next links; the metric to watch next; context notes (tuition-phase caveat under 50 videos, swipe-feed completion-rate note for CTR on short-form). Thresholds labeled as creator-reported rules of thumb, never platform-published benchmarks.",
     "Engine (assets/js/video-doctor.js, UMD \u2014 importable in node): validInput(i) validates the three enums; diagnose(i) returns the symptom record with causes ranked 1..N (cause/why/fixes/links) plus notes. SYMPTOMS carries the full 8-symptom dataset. Diagnostic aid, not financial/legal/tax advice; never an income promise."),
    ("ypp-checker", "YPP 2027 Eligibility Checker",
     "Enter your subs, watch hours, and Shorts views \u2014 get your verdict under the current YPP bar and the Feb-2027 bar, the gap math, and a chapter-grounded plan to close it.",
     "ypp-checker.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "YPPCheckerInput",
      "type": "object", "required": ["subs", "watchHours", "shortsViews", "uploads90d", "originality", "formatMix"],
      "properties": {
          "subs": {"type": "number", "minimum": 0,
                 "description": "Current subscriber count."},
          "watchHours": {"type": "number", "minimum": 0,
                        "description": "Qualified public watch hours from long-form in the last 12 months (as YouTube counts them, not the raw Studio number)."},
          "shortsViews": {"type": "number", "minimum": 0,
                         "description": "Qualified public Shorts views in the last 90 days."},
          "uploads90d": {"type": "number", "minimum": 0,
                        "description": "Total uploads (long + shorts) in the last 90 days."},
          "originality": {"type": "string", "enum": ["original", "repurposed", "reposted"],
                         "description": "How the channel's content is mostly made. Repurposed/reposted with Shorts in play triggers the Oct-2026 Shorts-originality warning."},
          "formatMix": {"type": "string", "enum": ["longform", "shorts", "both"],
                      "description": "Where the channel's volume mostly lives."},
      }},
     "Two verdicts: current YPP rules (through Jan 31, 2027: 1K subs + 4K watch hours/12mo OR 10M Shorts views/90d) vs 2027 rules (from Feb 1, 2027: 1K subs + 8K hours/365d OR 20M Shorts views/90d), each with per-check pass/fail; the 2027 Shorts revenue floor check (10M qualified Shorts views/90d, monthly); the 2027 activity test for partners; the unchanged fan-funding tier; the gap math per rule; the shorter-walk note; the Oct-2026 Shorts-originality warning when relevant; a chapter-grounded close-the-gap plan. Thresholds labeled with sources and observation dates; every verdict carries the verify-live-with-YouTube disclaimer.",
     "Engine (assets/js/ypp-checker.js, UMD \u2014 importable in node): RULES carries both rule sets with source strings; validInput(i) validates the numbers and two enums; check(i) returns {input, now, y2027, originalityWarning, plan2027, shorterWalk, disclaimer}; fullVerdict/fanVerdict/shortsFloorVerdict/activityVerdict return per-check pass/fail + gap math; plan() returns chapter-grounded steps with read-next links to real site pages. Educational aid, not financial/legal/tax advice; never an income promise."),
]

# Tools hub (wave 9): grouped card index. Per tool: icon, "use when" one-liner,
# best-for tags. Groups: PLAN / MONEY / CONTENT (order within group = TOOLS order).
TOOL_HUB_META = {
    "quiz":          ("◉", "PLAN",    "acid", "you're starting out and don't know what to make yet.",
                      ["starting out", "undecided", "Phase 0"]),
    "planner":       ("▦", "PLAN",    "acid", "you need a posting schedule you can actually keep.",
                      ["consistency", "cadence", "Phase 1"]),
    "simulator":     ("◬", "PLAN",    "acid", "you want to see 12–24 months of growth and revenue — scenarios, A/B, team costs — before you live them.",
                      ["what-if", "projections", "Phases 2 · 5 · 8"]),
    "calculator":    ("∑", "MONEY",   "gold", "you want honest revenue ranges from your current views.",
                      ["ads", "sponsors", "ranges"]),
    "deal-analyzer": ("⚖", "MONEY",   "gold", "a brand made an offer and your gut isn't sure.",
                      ["negotiation", "rate card", "Phase 5"]),
    "deal-room":     ("🗂", "MONEY",   "gold", "you want to manage a deal from offer to paid, not just analyze it once.",
                      ["deal pipeline", "scripts", "Phase 5"]),
    "hiring-calculator": ("⚒", "MONEY", "gold", "you're about to hire someone and want the real numbers first.",
                      ["first hire", "costs", "Phase 7 · 8"]),
    "repurpose":     ("⇄", "CONTENT", "coral", "one good idea should feed five platforms.",
                      ["SOP", "short-form", "Phase 3"]),
    "api-explorer":  ("⌗", "CONTENT", "coral", "you're building on the empire's data and want every endpoint.",
                      ["agents", "JSON", "no key"]),
    "hook-builder":  ("🎣", "CONTENT", "coral", "you have a topic and need the first 3 seconds to win.",
                      ["hooks", "short-form", "Playbook"]),
    "idea-bank":     ("💡", "CONTENT", "coral", "your ideas are scattered and you need them scored before production.",
                      ["hooks", "pipeline", "Phase 1"]),
    "content-calendar": ("🗓", "CONTENT", "coral", "you need your ideas dealt into a schedule you can actually keep.",
                      ["dealing", "sponsors", "Phase 1"]),
    "batching": ("🎬", "CONTENT", "coral", "you want to know if your shoot days really cover your cadence.",
                      ["film days", "capacity", "Phase 1"]),
    "money-map": ("🗺", "PLAN", "gold", "you want to know where you stand and what to do next.",
                      ["roadmap", "stages", "Phases 0 · 8"]),
    "video-doctor":    ("\U0001fa7a", "CONTENT", "coral", "your numbers are telling you something but you can't read them yet.",
                      ["diagnosis", "retention", "Phases 1 · 2"]),
    "ypp-checker":     ("◈", "MONEY", "gold", "YPP changes on Feb 1, 2027 — see where you stand under both rule sets.",
                      ["monetization", "YPP", "Phase 5"]),
}
TOOL_HUB_GROUPS = [
    ("PLAN", "Pick the battlefield",
     "Figure out what to make, when to post, and what it could become — before you burn a year on the wrong niche."),
    ("MONEY", "Know what it's worth",
     "Ranges, benchmarks, and verdicts before you quote a rate or sign an offer."),
    ("CONTENT", "Multiply one win",
     "Systems that turn one idea into a week of output — and the API that powers it all."),
]

# Case-files hub (wave 9): headline numbers are sourced from the case pages
# themselves (see pages/case-*.md Sources sections); every figure is reported,
# not audited. Comparison table fields: niche / primary revenue / team / timeline.
CASE_HUB = [
    {"id": "case-bens-bites",
     "headline": "7 figures in under 9 months",
     "stat": "10,000+ students taught",
     "source": "Ben Tossell's interviews + company about page (self-reported)",
     "niche": "AI education / newsletter",
     "primary": "AI courses / education products",
     "team": "1 core + collaborators",
     "timeline": "Oct 2022 → mid-2023"},
    {"id": "case-budget-grocery",
     "headline": "Paid newsletter ≈ $670K/yr",
     "stat": "3M+ followers · 7-figure business",
     "source": "The creator's own interview (self-reported)",
     "niche": "Budget grocery / cooking",
     "primary": "Paid newsletter",
     "team": "2 full-time + contractors",
     "timeline": "Years posting → 2023 viral video → newsletter primary"},
    {"id": "case-mavwicks",
     "headline": "$32M in year one on TikTok Shop",
     "stat": "From $300–400K/yr to $32M",
     "source": "Modern Retail interview; figures via TikTok-shared data (unaudited)",
     "niche": "Fragrance / live commerce",
     "primary": "TikTok Shop product sales",
     "team": "Founder-led (size undisclosed)",
     "timeline": "First year on the platform"},
    {"id": "case-ptya",
     "headline": "$1.3M+ maker revenue (2021); final cohort reportedly $2M",
     "stat": "$528K in 4 days from one email sequence",
     "source": "Digiday; 2026 Kit case study",
     "niche": "Productivity / cohort course",
     "primary": "Cohort course ($1K–$4K)",
     "team": "Small team (size undisclosed)",
     "timeline": "2017 YouTube → Nov 2020 first cohort"},
    {"id": "case-sleep-channels",
     "headline": "$40–60K/mo (~$700K/yr)",
     "stat": "5 faceless channels; Fortune-verified AdSense records",
     "source": "Fortune profile (Dec 2025), AdSense records verified",
     "niche": "Faceless ambient / sleep YouTube",
     "primary": "YouTube ad revenue (5 channels)",
     "team": "Davis + business partner",
     "timeline": "2020 dropout → 5-channel network"},
    {"id": "case-poly-couple",
     "headline": "Nearly 400K YouTube subs on a serialized micro-drama",
     "stat": "100s of episodes · 10K+ viewers/episode · landed on Electric Now",
     "source": "Trill Magazine (Oct 2026); Dope Interviews; ScreenChatter",
     "niche": "Serialized mini-drama / short-form storytelling",
     "primary": "Audience → streaming pickup (Electric Now)",
     "team": "Duo + cast and crew",
     "timeline": "~2021 TikTok series → 2026 Electric Now pickup"},
    {"id": "case-gibi-asmr",
     "headline": "0 → 5M subscribers in 8 years on ASMR roleplay",
     "stat": "2.3B+ lifetime views · ~2,000 videos",
     "source": "Wikipedia; The Daily Northwestern (2019); Wikitubia; SocialBlade",
     "niche": "ASMR / roleplay",
     "primary": "YouTube ad revenue + brand work + talent agency",
     "team": "Solo → agency (Human Media Group / Mana Talent)",
     "timeline": "Jun 2016 channel → 1M (2018) → 5M (2024)"},
    {"id": "case-clippers-squeeze",
     "headline": "KSh 130–520 per 1,000 views — then the originality update",
     "stat": "Clipping industry · Oct-2026 reach cut + Feb-2027 Shorts floor",
     "source": "Kenyan Mirror; TechJuice; Digital Trends (industry reports)",
     "niche": "Clip redistribution / Shorts",
     "primary": "Production-based clip payments",
     "team": "Solo clippers / clip networks",
     "timeline": "Boom → Oct 1, 2026 originality update → Feb 1, 2027 floor"},
    {"id": "case-shorts-floor",
     "headline": "The 10M-views-a-month subscription",
     "stat": "≈111,000 qualifying Shorts views/day to hold the floor",
     "source": "GSMDome; Tablet News; AIR Media-Tech; AuditSocials",
     "niche": "Shorts-first channels",
     "primary": "Shorts Creator Pool + Shorts Premium",
     "team": "Any size",
     "timeline": "Announced Aug 2026 → live Feb 1, 2027"},
]

# Markdown landing pages rendered like chapters (pages/*.md -> site/*.html).
# Optional 5th element: (next_slug, next_label) for the end-nav next link.
MARKDOWN_PAGES = [
    ("agents", "pages/agents.md", "Agents", "The Agent Surface",
     ("api-explorer", "Try the API Explorer")),
    ("case-budget-grocery", "pages/case-budget-grocery.md", "The Budget-Grocery Newsletter", "Case File",
     ("case-bens-bites", "Ben's Bites")),
    ("case-bens-bites", "pages/case-bens-bites.md", "Ben's Bites", "Case File",
     ("case-sleep-channels", "The Sleep-Channel Network")),
    ("case-sleep-channels", "pages/case-sleep-channels.md", "The Sleep-Channel Network", "Case File",
     ("case-mavwicks", "Mavwicks on TikTok Shop")),
    ("case-mavwicks", "pages/case-mavwicks.md", "Mavwicks on TikTok Shop", "Case File",
     ("case-ptya", "The Cohort Course")),
    ("case-ptya", "pages/case-ptya.md", "The Cohort Course", "Case File",
     ("case-poly-couple", "The Poly Couple")),
    ("case-poly-couple", "pages/case-poly-couple.md", "The Poly Couple", "Case File",
     ("case-gibi-asmr", "Gibi ASMR")),
    ("case-gibi-asmr", "pages/case-gibi-asmr.md", "Gibi ASMR", "Case File",
     ("case-clippers-squeeze", "The Clipping Squeeze")),
    ("case-clippers-squeeze", "pages/case-clippers-squeeze.md", "The Clipping Squeeze", "Case File",
     ("case-shorts-floor", "The Monthly Floor")),
    ("case-shorts-floor", "pages/case-shorts-floor.md", "The Monthly Floor", "Case File",
     ("agents", "The Agent Surface")),
    ("hiring", "pages/hiring.md", "The First Hire", "Guide",
     ("hiring-calculator", "Try the Hiring Cost Calculator")),
    ("shortform-playbook", "pages/shortform-playbook.md", "The Short-Form Playbook", "Playbook",
     ("hook-builder", "Build your hooks")),
]

# ---------- minimal markdown -> html ----------

def esc(s):
    return html.escape(s)

def inline(s):
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    return s

def md_to_html(md):
    lines = md.split("\n")
    out, i, n = [], 0, len(lines)
    while i < n:
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1; continue
        if s.startswith("|") and i + 1 < n and re.match(r"^\|?[\s\-:|]+\|?$", lines[i+1].strip()):
            # table
            headers = [c.strip() for c in s.strip("|").split("|")]
            i += 2
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            t = ["<div class='table-wrap'><table><thead><tr>" +
                 "".join(f"<th>{inline(h)}</th>" for h in headers) + "</tr></thead><tbody>"]
            for r in rows:
                t.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            t.append("</tbody></table></div>")
            out.append("\n".join(t)); continue
        if s.startswith("### "):
            out.append(f"<h3>{inline(s[4:])}</h3>"); i += 1; continue
        if s.startswith("## "):
            out.append(f"<h2>{inline(s[3:])}</h2>"); i += 1; continue
        if s.startswith("# "):
            out.append(f"<h1>{inline(s[2:])}</h1>"); i += 1; continue
        if s.startswith("> "):
            qs = []
            while i < n and lines[i].strip().startswith("> "):
                qs.append(inline(lines[i].strip()[2:])); i += 1
            out.append("<blockquote>" + "<br>".join(qs) + "</blockquote>"); continue
        if re.match(r"^(\d+)\.\s", s):
            items = []
            while i < n and re.match(r"^(\d+)\.\s", lines[i].strip()):
                items.append("<li>" + inline(re.sub(r"^(\d+)\.\s", "", lines[i].strip())) + "</li>"); i += 1
            out.append("<ol>" + "".join(items) + "</ol>"); continue
        if s.startswith("- "):
            items = []
            while i < n and lines[i].strip().startswith("- "):
                items.append("<li>" + inline(lines[i].strip()[2:]) + "</li>"); i += 1
            out.append("<ul>" + "".join(items) + "</ul>"); continue
        if s.startswith("```"):
            code = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                code.append(lines[i]); i += 1
            i += 1
            out.append("<pre><code>" + esc("\n".join(code)) + "</code></pre>"); continue
        # paragraph (collect continuation lines)
        para = [s]
        i += 1
        while i < n and lines[i].strip() and not re.match(r"^(#{1,3} |> |- |\d+\.\s|\||```)", lines[i].strip()):
            para.append(lines[i].strip()); i += 1
        out.append("<p>" + inline(" ".join(para)) + "</p>")
    return "\n".join(out)

def word_count(md):
    text = re.sub(r"[#>*`|\-]", " ", md)
    return len(re.findall(r"[A-Za-z0-9']+", text))

# ---------- page template ----------

# Desktop nav stays tight: hub-first discovery (wave 9 — the site grew too
# large for per-tool nav links). The full per-tool list lives in the mobile
# nav and the footer.
DESKTOP_NAV_LINKS = [
    ("index.html", "Empire Map"),
    ("tools.html", "Tools"),
    ("case-files.html", "Case Files"),
    ("glossary.html", "Glossary"),
    ("agents.html", "Agents"),
]

MOBILE_NAV_LINKS = [
    ("index.html", "Empire Map"),
    ("tools.html", "All tools"),
    ("quiz.html", "Niche Picker"),
    ("calculator.html", "Revenue Calc"),
    ("planner.html", "90-Day Plan"),
    ("deal-analyzer.html", "Deal Analyzer"),
    ("hiring-calculator.html", "Hire Calc"),
    ("repurpose.html", "Repurpose Plan"),
    ("simulator.html", "Simulator"),
    ("case-files.html", "All case files"),
    ("glossary.html", "Glossary"),
    ("agents.html", "Agents"),
]

def page_template(title, body, active="", extra_head=""):
    desktop_nav = "".join(
        f'<a href="{href}" class="nav-link{" active" if href == active else ""}">{label}</a>'
        for href, label in DESKTOP_NAV_LINKS
    )
    mobile_nav = "".join(
        f'<a href="{href}" class="nav-link{" active" if href == active else ""}">{label}</a>'
        for href, label in MOBILE_NAV_LINKS
    )
    nav = desktop_nav  # historical name kept for the mobile fallback below
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} — {SITE_NAME}</title>
<meta name="description" content="{esc(TAGLINE)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONT_URL}" rel="stylesheet">
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/layout.css">
<link rel="stylesheet" href="assets/css/components.css">
<link rel="stylesheet" href="assets/css/hub.css">
{extra_head}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="brand" href="index.html"><span class="brand-mark">▲</span> {SITE_NAME}</a>
  <nav class="site-nav" aria-label="Primary">{desktop_nav}</nav>
  <button class="nav-toggle" aria-expanded="false" aria-controls="mobileNav" aria-label="Menu">☰</button>
</header>
<nav id="mobileNav" class="mobile-nav" aria-label="Mobile">{mobile_nav}</nav>
<main id="main">{body}</main>
<footer class="site-footer">
  <div class="footer-grid">
    <div>
      <div class="foot-brand"><span class="brand-mark">▲</span> {SITE_NAME}</div>
      <p class="muted">{esc(TAGLINE)}</p>
      <div class="sticker-row" style="margin:1rem 0 0">
        <span class="sticker sticker-ghost">No guru hype</span>
        <span class="sticker sticker-ghost">2026 verified</span>
      </div>
    </div>
    <nav aria-label="Phases">
      <strong class="muted" style="font-size:.78rem;letter-spacing:.12em">PHASES</strong>
      <a href="phase-0-start-from-nothing.html">Phase 0 — Start From Nothing</a>
      <a href="phase-2-youtube-mastery.html">Phase 2 — YouTube Mastery</a>
      <a href="phase-5-monetization-stack.html">Phase 5 — Monetization Stack</a>
      <a href="phase-7-the-business.html">Phase 7 — The Business</a>
    </nav>
    <nav aria-label="Tools">
      <strong class="muted" style="font-size:.78rem;letter-spacing:.12em">TOOLS</strong>
      <a href="tools.html">All tools →</a>
      <a href="quiz.html">Niche Picker</a>
      <a href="calculator.html">Revenue Calculator</a>
      <a href="planner.html">90-Day Planner</a>
      <a href="deal-analyzer.html">Sponsor Deal Analyzer</a>
      <a href="hiring-calculator.html">Hiring Cost Calculator</a>
      <a href="repurpose.html">Repurposing Planner</a>
      <a href="simulator.html">Empire Simulator</a>
      <a href="money-map.html">The Money Map</a>
      <a href="api-explorer.html">API Explorer</a>
      <a href="glossary.html">Glossary</a>
      <a href="agents.html">Agents</a>
    </nav>
    <nav aria-label="Case Files">
      <strong class="muted" style="font-size:.78rem;letter-spacing:.12em">CASE FILES</strong>
      <a href="case-files.html">All case files →</a>
      <a href="case-budget-grocery.html">The Budget-Grocery Newsletter</a>
      <a href="case-bens-bites.html">Ben's Bites</a>
      <a href="case-sleep-channels.html">The Sleep-Channel Network</a>
      <a href="case-mavwicks.html">Mavwicks on TikTok Shop</a>
      <a href="case-ptya.html">The Cohort Course</a>
      <a href="case-poly-couple.html">The Poly Couple</a>
      <a href="case-gibi-asmr.html">Gibi ASMR</a>
    </nav>
  </div>
  <div class="footer-fine">PRIVATE RESEARCH ARCHIVE · PLATFORM FACTS VERIFIED OCT 2026 — VERIFY LIVE BEFORE ACTING · NOT FINANCIAL, LEGAL, OR TAX ADVICE</div>
</footer>
<script src="assets/js/site.js"></script>
</body>
</html>"""

# ---------- build ----------

def build():
    if SITE.exists():
        shutil.rmtree(SITE)
    (SITE / "assets" / "css").mkdir(parents=True)
    (SITE / "assets" / "js").mkdir(parents=True)
    API.mkdir(parents=True, exist_ok=True)
    (API / "schema").mkdir(exist_ok=True)

    for f in (ASSETS / "css").glob("*.css"):
        shutil.copy(f, SITE / "assets" / "css" / f.name)
    for f in (ASSETS / "js").glob("*.js"):
        shutil.copy(f, SITE / "assets" / "js" / f.name)

    chapters_meta = []
    llms_full_parts = []
    for slug, src, phase, short in CHAPTERS:
        md = (ROOT / src).read_text(encoding="utf-8")
        body_html = md_to_html(md)
        wc = word_count(md)
        read_min = max(1, round(wc / 200))
        idx = [c[0] for c in CHAPTERS].index(slug)
        # --- chapter hero: strip the markdown H1 + lead blockquote into a mega-type opener ---
        briefing = ""
        m_h1 = re.search(r"<h1>.*?</h1>", body_html)
        if m_h1:
            body_html = body_html[:m_h1.start()] + body_html[m_h1.end():]
        m_bq = re.search(r"<blockquote>(.*?)</blockquote>", body_html, re.S)
        if m_bq:
            briefing = m_bq.group(1)
            body_html = body_html[:m_bq.start()] + body_html[m_bq.end():]
        accent = PHASE_ACCENTS[idx % len(PHASE_ACCENTS)]
        words = short.split()
        hero_title = (" ".join(esc(w) for w in words[:-1]) + ' <span class="accent-word">' + esc(words[-1]) + "</span>") if len(words) > 1 else esc(short)
        lvl = f"{idx + 1:02d}"
        hero = (f'<header class="chapter-hero" style="--phase-accent: var(--{accent});">'
                f'<span class="chapter-num" aria-hidden="true">{idx}</span>'
                f'<p class="chapter-kicker"><span class="phase-badge" style="background: var(--{accent});">{phase}</span></p>'
                f"<h1>{hero_title}</h1>"
                + (f'<p class="lede">{briefing}</p>' if briefing else "")
                + f'<p class="chapter-meta-strip"><span>{read_min} min read</span><span class="sep">/</span>'
                f'<span>{wc:,} words</span><span class="sep">/</span><span>LVL {lvl}</span></p></header>')
        # chapter end-nav: next-phase mission cards
        cnav = '<nav class="chapter-nav" aria-label="Phases">'
        if idx > 0:
            ps, _, pphase, pshort = CHAPTERS[idx-1]
            cnav += (f'<a href="{ps}.html"><span class="nav-dir">← Previous phase</span>'
                     f'<span class="nav-title">{pphase}: {esc(pshort)}</span></a>')
        else:
            cnav += '<a href="index.html"><span class="nav-dir">← Back to</span><span class="nav-title">The Empire Map</span></a>'
        if idx < len(CHAPTERS) - 1:
            ns, _, nphase, nshort = CHAPTERS[idx+1]
            cnav += (f'<a class="nav-next" href="{ns}.html"><span class="nav-dir">Next phase →</span>'
                     f'<span class="nav-title">{nphase}: {esc(nshort)}</span></a>')
        else:
            cnav += '<a class="nav-next" href="quiz.html"><span class="nav-dir">Next step →</span><span class="nav-title">Pick your niche</span></a>'
        cnav += "</nav>"
        # money-map ribbon (wave 18): every pillar chapter links to the capstone map
        cnav += ('<div class="map-ribbon" role="note">'
                 '<strong>🧭 Lost in the climb?</strong>'
                 '<span>See where this phase fits on <a href="money-map.html">The Money Map</a> — 7 questions, your stage, your next 3 moves.</span>'
                 '<a class="btn btn-ghost" href="money-map.html">Open the map →</a></div>')
        page = page_template(f"{phase}: {short}", f'<article class="chapter">{hero}{body_html}{cnav}</article>', active="")
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")
        chapters_meta.append({
            "id": slug, "phase": phase, "title": short,
            "path": f"{slug}.html", "words": wc, "read_minutes": read_min,
        })
        llms_full_parts.append(f"# {phase}: {short}\n\n{md}")

    # ---- reference pages (not phases; rendered like chapters, linked from llms/API) ----
    reference_meta = []
    for entry in REFERENCE_PAGES:
        slug, src, badge, short = entry[:4]
        scripts = entry[4] if len(entry) > 4 else []
        md = (ROOT / src).read_text(encoding="utf-8")
        body_html = md_to_html(md)
        wc = word_count(md)
        read_min = max(1, round(wc / 200))
        briefing = ""
        m_h1 = re.search(r"<h1>.*?</h1>", body_html)
        if m_h1:
            body_html = body_html[:m_h1.start()] + body_html[m_h1.end():]
        m_bq = re.search(r"<blockquote>(.*?)</blockquote>", body_html, re.S)
        if m_bq:
            briefing = m_bq.group(1)
            body_html = body_html[:m_bq.start()] + body_html[m_bq.end():]
        words = short.split()
        hero_title = (" ".join(esc(w) for w in words[:-1]) + ' <span class="accent-word">' + esc(words[-1]) + "</span>") if len(words) > 1 else esc(short)
        hero = (f'<header class="chapter-hero" style="--phase-accent: var(--gold);">'
                f'<p class="chapter-kicker"><span class="phase-badge" style="background: var(--gold);">{badge}</span></p>'
                f"<h1>{hero_title}</h1>"
                + (f'<p class="lede">{briefing}</p>' if briefing else "")
                + f'<p class="chapter-meta-strip"><span>{read_min} min read</span><span class="sep">/</span>'
                f'<span>{wc:,} words</span></p></header>')
        cnav = ('<nav class="chapter-nav" aria-label="Phases">'
                '<a href="index.html"><span class="nav-dir">← Back to</span><span class="nav-title">The Empire Map</span></a>'
                '<a class="nav-next" href="phase-5-monetization-stack.html"><span class="nav-dir">Next phase →</span>'
                '<span class="nav-title">Phase 5: The Monetization Stack</span></a></nav>')
# (reference-page loop continues below)
        mount = NICHE_EXPLORER_MOUNT if slug == "niche-atlas" else ""
        if slug == "metrics-glossary":
            mount = METRICS_CURVE_MOUNT
        extra_head = "".join(f'<script src="{s}"></script>' for s in scripts)
        page = page_template(f"{short}", f'<article class="chapter">{hero}{body_html}{mount}{cnav}</article>',
                             active="", extra_head=extra_head)
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")
        reference_meta.append({"id": slug, "badge": badge, "title": short,
                               "path": f"{slug}.html", "words": wc, "read_minutes": read_min})
        llms_full_parts.append(f"# {badge}: {short}\n\n{md}")

    # ---- markdown landing pages (agents etc.): rendered like chapters, linked from nav/footer ----
    mdpage_meta = []
    for entry in MARKDOWN_PAGES:
        slug, src, short, badge = entry[:4]
        nxt = entry[4] if len(entry) > 4 else ("api-explorer", "Try the API Explorer")
        md = (ROOT / src).read_text(encoding="utf-8")
        body_html = md_to_html(md)
        wc = word_count(md)
        read_min = max(1, round(wc / 200))
        briefing = ""
        m_h1 = re.search(r"<h1>.*?</h1>", body_html)
        if m_h1:
            body_html = body_html[:m_h1.start()] + body_html[m_h1.end():]
        m_bq = re.search(r"<blockquote>(.*?)</blockquote>", body_html, re.S)
        if m_bq:
            briefing = m_bq.group(1)
            body_html = body_html[:m_bq.start()] + body_html[m_bq.end():]
        words = short.split()
        hero_title = (" ".join(esc(w) for w in words[:-1]) + ' <span class="accent-word">' + esc(words[-1]) + "</span>") if len(words) > 1 else esc(short)
        hero = (f'<header class="chapter-hero" style="--phase-accent: var(--violet);">'
                f'<p class="chapter-kicker"><span class="phase-badge" style="background: var(--violet);">{esc(badge)}</span></p>'
                f"<h1>{hero_title}</h1>"
                + (f'<p class="lede">{briefing}</p>' if briefing else "")
                + f'<p class="chapter-meta-strip"><span>{read_min} min read</span><span class="sep">/</span>'
                f'<span>{wc:,} words</span></p></header>')
        cnav = ('<nav class="chapter-nav" aria-label="Phases">'
                '<a href="index.html"><span class="nav-dir">← Back to</span><span class="nav-title">The Empire Map</span></a>'
                f'<a class="nav-next" href="{nxt[0]}.html"><span class="nav-dir">Next →</span>'
                f'<span class="nav-title">{esc(nxt[1])}</span></a></nav>')
        nav_active = "case-files.html" if badge == "Case File" else f"{slug}.html"
        page = page_template(short, f'<article class="chapter">{hero}{body_html}{cnav}</article>', active=nav_active)
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")
        mdpage_meta.append({"id": slug, "badge": badge, "title": short,
                            "path": f"{slug}.html", "words": wc, "read_minutes": read_min})
        llms_full_parts.append(f"# {badge}: {short}\n\n{md}")

    # tool pages
    TOOL_SCRIPTS = {
        "quiz": ["assets/js/quiz.js"],
        "calculator": ["assets/js/calculator.js"],
        "planner": ["assets/js/planner.js"],
        "deal-analyzer": ["assets/js/deal-analyzer.js"],
        "deal-room": ["assets/js/deal-room.js", "assets/js/deal-room-ui.js"],
        "hiring-calculator": ["assets/js/hiring-calculator.js"],
        "repurpose": ["assets/js/content-engine.js", "assets/js/repurpose.js"],
        "simulator": ["assets/js/sim-engine.js", "assets/js/simulator.js"],
        "api-explorer": ["assets/js/api-explorer.js"],
        "hook-builder": ["assets/js/hook-builder.js"],
        "idea-bank": ["assets/js/content-engine.js", "assets/js/idea-bank-ui.js"],
        "content-calendar": ["assets/js/content-engine.js", "assets/js/content-calendar-ui.js"],
        "batching": ["assets/js/content-engine.js", "assets/js/batching-ui.js"],
        "money-map": ["assets/js/money-map.js"],
        "video-doctor": ["assets/js/video-doctor.js"],
        "ypp-checker": ["assets/js/ypp-checker.js"],
    }
    TOOL_CSS = {
        "money-map": ["assets/css/moneymap.css"],
        "video-doctor": ["assets/css/videodoctor.css"],
        "ypp-checker": ["assets/css/yppchecker.css"],
    }
    for slug, title, desc in TOOLS:
        body_src = PAGES / f"{slug}.html"
        tool_body = body_src.read_text(encoding="utf-8") if body_src.exists() else f"<p>{esc(desc)}</p>"
        extra = ""
        if slug in TOOL_SCRIPTS:
            extra = "".join(f'<script src="{src}"></script>' for src in TOOL_SCRIPTS[slug])
        if slug in TOOL_CSS:
            extra += "".join(f'<link rel="stylesheet" href="{href}">' for href in TOOL_CSS[slug])
        tool_idx = [t[0] for t in TOOLS].index(slug)
        hud_open = (f'<div class="tool-page"><div class="hud-panel"><div class="hud-head">'
                    f'<span>TOOL // 0{tool_idx + 1} — {esc(title).upper()}</span>'
                    f'<span class="hud-status">SYSTEMS ONLINE</span></div>'
                    f'<div class="hud-body"><h1>{esc(title)}</h1><p class="lede">{esc(desc)}</p></div></div>')
        page = page_template(title, f'{hud_open}{tool_body}</div>',
                             active="tools.html", extra_head=extra)
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")

    # glossary page
    glossary = json.loads((DATA / "glossary.json").read_text(encoding="utf-8"))
    gloss_html = "<h1>Glossary</h1><p class='lede'>The words the empire runs on.</p><dl class='glossary'>"
    for term in sorted(glossary["terms"], key=lambda t: t["term"].lower()):
        gloss_html += f"<div class='gloss-entry'><dt id='g-{term['term'].lower().replace(' ', '-')}'>{esc(term['term'])}</dt><dd>{inline(term['definition'])}</dd></div>"
    gloss_html += "</dl>"
    (SITE / "glossary.html").write_text(page_template("Glossary", gloss_html, active="glossary.html"), encoding="utf-8")

    # ---- hub pages (wave 9): tools hub + case-files hub ----
    def hub_hero(kicker, title_words, lede, accent):
        words = title_words.split()
        hero_title = ((" ".join(esc(w) for w in words[:-1]) + ' <span class="accent-word">' +
                       esc(words[-1]) + "</span>") if len(words) > 1 else esc(title_words))
        return (f'<header class="chapter-hero" style="--phase-accent: var(--{accent});">'
                f'<p class="chapter-kicker"><span class="phase-badge" style="background: var(--{accent});">{esc(kicker)}</span></p>'
                f"<h1>{hero_title}</h1>"
                f'<p class="lede">{lede}</p></header>')

    # tools hub: brief cards grouped Plan / Money / Content
    tool_titles = {slug: title for slug, title, _ in TOOLS}
    n = 0
    hub_sections = ""
    for group, group_sub, group_desc in TOOL_HUB_GROUPS:
        members = [slug for slug, _, _ in TOOLS if TOOL_HUB_META[slug][1] == group]
        g_accent = TOOL_HUB_META[members[0]][2]
        cards = ""
        for slug in members:
            icon, _, accent, use_when, tags = TOOL_HUB_META[slug]
            n += 1
            tag_html = "".join(f"<li>{esc(t)}</li>" for t in tags)
            cards += (
                f'<a class="brief-card" style="--card-accent: var(--{accent});" href="{slug}.html">'
                f'<div class="brief-head"><span class="brief-id">BRIEF // {n:02d}</span>'
                f'<span class="brief-status">{group}</span></div>'
                f'<div class="brief-body"><div class="brief-icon-row">'
                f'<span class="brief-icon" aria-hidden="true">{esc(icon)}</span>'
                f"<h3>{esc(tool_titles[slug])}</h3></div>"
                f'<p class="brief-usage"><strong>Use when</strong> {esc(use_when)}</p></div>'
                f'<ul class="brief-tags" aria-label="Best for">{tag_html}</ul>'
                f'<span class="brief-go">Launch →</span></a>')
        hub_sections += (
            f'<section class="hub-group" aria-label="{group} tools">'
            f'<div class="hub-group-head" style="--card-accent: var(--{g_accent});">'
            f"<h2>{group}</h2>"
            f'<span class="hub-kicker">{esc(group_sub)}</span>'
            f'<span class="hub-rule" aria-hidden="true"></span>'
            f"<p>{esc(group_desc)}</p></div>"
            f'<div class="brief-grid">{cards}</div></section>')
    tools_body = (
        hub_hero("COMMAND CENTER", "All Tools",
                 "Sixteen power tools, one command center. Pick the briefing that matches where you are.",
                 "acid")
        + hub_sections
        + '<section class="section honesty"><h2>Pick by job, not by shine</h2>'
        "<p>Every tool on this page reads the same 2026 research the rest of the site is built on. "
        "Start with the Niche Picker if you're undecided, the Revenue Calculator if you have views, "
        "and the Sponsor Deal Analyzer the moment a brand emails you. "
        "Not sure where you stand at all? Take <a href=\"money-map.html\">The Money Map</a> — "
        "7 questions, your stage, your next 3 moves.</p></section>")
    (SITE / "tools.html").write_text(page_template("All Tools", tools_body, active="tools.html"), encoding="utf-8")

    # case-files hub: sourced headline cards + comparison table
    case_meta_by_id = {m["id"]: m for m in mdpage_meta if m["badge"] == "Case File"}
    case_cards = ""
    for i, c in enumerate(CASE_HUB):
        m = case_meta_by_id[c["id"]]
        case_cards += (
            f'<a class="brief-card" style="--card-accent: var(--violet);" href="{m["path"]}">'
            f'<div class="brief-head"><span class="brief-id">CASE FILE // {i + 1:02d}</span>'
            f'<span class="brief-status">{m["read_minutes"]} MIN READ</span></div>'
            f'<div class="brief-body"><h3>{esc(m["title"])}</h3>'
            f'<p class="brief-stat">{esc(c["headline"])}</p>'
            f'<p class="brief-stat-sub">{esc(c["stat"])}</p>'
            f'<p class="brief-source">Source: {esc(c["source"])}</p></div>'
            f'<span class="brief-go">Read the file →</span></a>')
    case_rows = "".join(
        f'<tr><th scope="row"><a href="{case_meta_by_id[c["id"]]["path"]}">{esc(case_meta_by_id[c["id"]]["title"])}</a></th>'
        f"<td>{esc(c['niche'])}</td><td>{esc(c['primary'])}</td>"
        f"<td>{esc(c['team'])}</td><td>{esc(c['timeline'])}</td></tr>"
        for c in CASE_HUB)
    case_body = (
        hub_hero("DOCUMENTED DECONSTRUCTIONS", "Case Files",
                 "Seven real creator businesses, taken apart: the stack, the decisions, the numbers — reported, not audited.",
                 "violet")
        + '<section class="hub-group" aria-label="Case files">'
        f'<div class="brief-grid">{case_cards}</div></section>'
        + '<section class="hub-group" aria-label="Comparison table">'
        + '<div class="hub-group-head" style="--card-accent: var(--violet);">'
        "<h2>Side by side</h2>"
        '<span class="hub-kicker">the comparison table</span>'
        '<span class="hub-rule" aria-hidden="true"></span>'
        "<p>Niche, primary revenue, team, and timeline at a glance. Headline figures are the numbers "
        "each case is best known for — always reported, never audited.</p></div>"
        + '<div class="table-wrap"><table class="compare-table">'
        "<caption>Case file comparison: niche, primary revenue, team size, timeline</caption>"
        "<thead><tr><th scope=\"col\">Case</th><th scope=\"col\">Niche</th>"
        "<th scope=\"col\">Primary revenue</th><th scope=\"col\">Team</th>"
        "<th scope=\"col\">Timeline</th></tr></thead><tbody>"
        + case_rows + "</tbody></table></div></section>"
        + '<section class="section honesty"><h2>The honesty policy</h2>'
        "<p>Every figure on these cards is reported by the cited source — interviews, company pages, "
        "or (in one case) verified AdSense records — not audited financials. Treat the structures as "
        "proven and the figures as directional. Read the full file before you copy a play.</p></section>")
    (SITE / "case-files.html").write_text(page_template("Case Files", case_body, active="case-files.html"), encoding="utf-8")

    # index
    cards = ""
    for i, m in enumerate(chapters_meta):
        accent = PHASE_ACCENTS[i % len(PHASE_ACCENTS)]
        lvl = f"{i + 1:02d}"
        cards += (f'<a class="phase-card reveal" style="--i:{i};--card-accent: var(--{accent});" href="{m["path"]}">'
                  f'<span class="phase-lvl">LVL {lvl}</span>'
                  f'<span class="phase-num">{m["phase"].split()[-1]}</span>'
                  f'<span class="phase-name">{esc(m["title"])}</span>'
                  f'<span class="phase-meta">{m["read_minutes"]} min · {m["words"]:,} words</span></a>')
    tools_html = "".join(
        f'<a class="tool-card reveal" style="--i:{i}" href="{slug}.html">'
        f'<span class="tool-id">TOOL // 0{i + 1}</span><strong>{esc(title)}</strong>'
        f'<span>{esc(desc)}</span><span class="tool-go">Launch →</span></a>'
        for i, (slug, title, desc) in enumerate(TOOLS))
    total_words = sum(m["words"] for m in chapters_meta)
    case_cards = "".join(
        f'<a class="phase-card reveal" style="--i:{i};--card-accent: var(--violet);" href="{m["path"]}">'
        f'<span class="phase-lvl">CASE FILE {i + 1:02d}</span>'
        f'<span class="phase-num">{i + 1:02d}</span>'
        f'<span class="phase-name">{esc(m["title"])}</span>'
        f'<span class="phase-meta">{m["read_minutes"]} min · {m["words"]:,} words</span></a>'
        for i, m in enumerate(m for m in mdpage_meta if m["badge"] == "Case File"))
    case_section = (f'<section class="section"><div class="section-head"><h2>Empire Case Files</h2>'
                    f'<span class="section-tag">documented deconstructions // no guru hype</span>'
                    f'<a href="case-files.html" class="section-more">All 9 case files →</a></div>'
                    f'<div class="phase-grid reveal-stagger">{case_cards}</div></section>')
    index_body = f"""
<section class="hero">
  <p class="hero-eyebrow">Field manual // Creator division</p>
  <p class="kicker">THE COMPLETE PLAYBOOK</p>
  <h1 class="mega">BUILD YOUR<br><span class="mega-outline outline-text">EMPIRE</span></h1>
  <p class="lede">Nine phases. Zero to multi-million-dollar creator company — YouTube, TikTok, Facebook, merch, brand deals, LLC, taxes, scale. No guru hype. Just the playbook.</p>
  <div class="sticker-row reveal">
    <span class="sticker">9 phases</span>
    <span class="sticker sticker-coral">16 power tools</span>
    <span class="sticker sticker-violet">9 case files</span>
    <span class="sticker sticker-gold">2026 verified</span>
    <span class="sticker sticker-violet">Zero → empire</span>
  </div>
  <div class="hero-stats">
    <div class="hero-stat reveal" style="--i:0"><strong>9</strong><span>phases</span></div>
    <div class="hero-stat reveal" style="--i:1"><strong>{total_words:,}</strong><span>words</span></div>
    <div class="hero-stat reveal" style="--i:2"><strong>16</strong><span>interactive tools</span></div>
    <div class="hero-stat reveal" style="--i:3"><strong>LVL 01–09</strong><span>your climb</span></div>
  </div>
  <div class="hero-cta"><a class="btn btn-primary" href="phase-0-start-from-nothing.html">Start at Phase 0 →</a>
  <a class="btn btn-ghost" href="quiz.html">Find your niche</a></div>
</section>
<section class="ticker" aria-hidden="true"><div class="ticker-track">
  <span>POST CONSISTENTLY</span><span>PACKAGING IS EVERYTHING</span><span>OWN YOUR AUDIENCE</span>
  <span>DIVERSIFY REVENUE</span><span>SEPARATE THE MONEY</span><span>SYSTEMS BEAT HUSTLE</span>
  <span>POST CONSISTENTLY</span><span>PACKAGING IS EVERYTHING</span><span>OWN YOUR AUDIENCE</span>
  <span>DIVERSIFY REVENUE</span><span>SEPARATE THE MONEY</span><span>SYSTEMS BEAT HUSTLE</span>
</div></section>
<section class="section"><div class="section-head"><h2>The Empire Map</h2><span class="section-tag">9 levels // clear them all</span></div><div class="phase-grid reveal-stagger">{cards}</div></section>
<section class="section"><div class="section-head"><h2>Command Center</h2><span class="section-tag">weapons free</span><a href="tools.html" class="section-more">All 16 tools →</a></div><div class="tool-grid reveal-stagger">{tools_html}</div></section>
{case_section}
<section class="section"><div class="section-head"><h2>Hottest topics right now</h2><span class="section-tag">live feed // trend-machine</span></div>
<div class="hud-panel trends-hud reveal">
  <div class="hud-head"><span>INTEL // WHAT TO COVER TODAY</span><span class="hud-status">SCANNING</span></div>
  <div class="hud-body">
    <div data-trends-widget data-trends-limit="6"></div>
    <script src="assets/js/trends-widget.js"></script>
    <noscript><p class="muted">The live trend feed needs JavaScript. The trend playbooks are in Phase 3.</p></noscript>
  </div>
</div></section>
<section class="section honesty reveal"><h2>The honesty policy</h2>
<p>Every platform number on this site was verified against 2026 sources or is flagged <strong>verify live</strong>. Income ranges are illustrative, never promises. The LLC/tax phase is educational — <strong>not legal or tax advice</strong>. Platforms change rules constantly; the most dangerous number on the internet is a stale one.</p></section>
"""
    (SITE / "index.html").write_text(page_template(SITE_NAME, index_body, active="index.html"), encoding="utf-8")

    # ---- skills index (skills/<name>/SKILL.md directory format) ----
    # (computed before the API block so the manifest can carry record counts)
    skill_files = sorted((ROOT / "skills").glob("*/SKILL.md"))
    skills_idx = []
    for sf in skill_files:
        txt = sf.read_text(encoding="utf-8")
        m = re.search(r"^name:\s*(.+)$", txt, re.M)
        d = re.search(r"^description:\s*(.+)$", txt, re.M)
        rel = sf.relative_to(ROOT).as_posix()
        skills_idx.append({"name": m.group(1).strip() if m else sf.parent.name,
                           "description": d.group(1).strip() if d else "",
                           "path": rel})
    (ROOT / "skills" / "index.json").write_text(json.dumps({"skills": skills_idx}, indent=2), encoding="utf-8")

    # ---- API ----
    # Wave 12: full self-describing manifest. Every endpoint carries its
    # description, schema URL, ISO-8601 UTC updated timestamp, record count,
    # and deprecation status. Existing payload shapes are untouched.
    BUILD_TS = "2026-10-11T00:00:00Z"
    calculators_cfg = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    niches_cfg = json.loads((DATA / "niches.json").read_text(encoding="utf-8"))
    api_endpoints = [
        {
            "id": "index",
            "kind": "json",
            "path": "api/v1/index.json",
            "description": "This manifest — self-describing list of every endpoint with schema URLs, updated timestamps, record counts, and deprecation notes. Start here.",
            "schema": "api/v1/schema/index.json",
            "updated": BUILD_TS,
            "records": None,
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "chapters",
            "kind": "json",
            "path": "api/v1/chapters.json",
            "description": "All nine phases: id, phase label, title, site-relative path, word count, read minutes. Use headings to navigate before fetching full text from llms-full.txt or the chapter page.",
            "schema": "api/v1/schema/chapters.json",
            "updated": BUILD_TS,
            "records": len(chapters_meta),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "niches",
            "kind": "json",
            "path": "api/v1/niches.json",
            "description": ("The Niche Atlas dataset v2.0.0: 20 October-2026-researched niches — "
                            "channel growth, search growth, breakout formats, creator-reported "
                            "revenue ranges (CPM/RPM), competition, startup cost, skill fit, "
                            "chapter/simulator/case-file links, the avoid list (red-flag niches, "
                            "2027-updated), sources, and the <1%-reach-100K reality check — "
                            "plus the 2027 outlook layer: per-niche trajectory badges "
                            "(heating/stable/cooling with basis + signals), breakout-format "
                            "spotlights, platform signals, and the niche-to-revenue-stream fit "
                            "matrix. Ranges, never promises."),
            "schema": "api/v1/schema/niches.json",
            "updated": BUILD_TS,
            "records": len(niches_cfg["niches"]),
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Research observed 2026-10-11; 2027 outlook layer added 2026-10-11 (trajectory badges are directional reads, not forecasts). Verify platform figures live before acting — every record carries its sources and observation date.",
        },
        {
            "id": "glossary",
            "kind": "json",
            "path": "api/v1/glossary.json",
            "description": "Creator-economy definitions: { terms: [{ term, definition }] }.",
            "schema": "api/v1/schema/glossary.json",
            "updated": BUILD_TS,
            "records": len(glossary["terms"]),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "calculators",
            "kind": "json",
            "path": "api/v1/calculators.json",
            "description": "Calculator config: per-niche long-form RPM bands, Shorts RPM, platform thresholds (YPP tiers, TikTok Rewards, Facebook CMP — with sources and dates), revenue splits, the 2026 sponsorship rate card, and 2026 niche/platform research snapshots. The data contract the sim engine, revenue calculator, deal analyzer, and hiring calculator read.",
            "schema": "api/v1/schema/calculators.json",
            "updated": BUILD_TS,
            "records": None,
            "records_note": "Config snapshot, not a record list: "
                            f"{len(calculators_cfg['youtube_longform_rpm_bands'])} niche RPM bands, "
                            "2026 rate card, platform thresholds, revenue splits, research snapshots.",
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Verify platform figures live before acting on them — see the payload's own updated/version fields. Treat undated numbers as stale.",
        },
        {
            "id": "deal-templates",
            "kind": "json",
            "path": "api/v1/deal-templates.json",
            "description": "The Deal Room data contract: negotiation scripts (lowball counter, usage-rights upsell, exclusivity pushback, rush-fee ask — with {{placeholders}}), the red-flag checklist with severity levels and scoring rules, and usage-rights pricing tiers with reported vs. definitional multiplier basis. A negotiation aid, not financial/legal/tax advice.",
            "schema": "api/v1/schema/deal-templates.json",
            "updated": BUILD_TS,
            "records": None,
            "records_note": "Data contract, not a record list: 4 negotiation scripts, 6 red-flag items, 6 usage-rights tiers.",
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Multipliers are reported 2026 benchmarks and ranges, not quotes. Verify against current creator rate reports before quoting.",
        },
        {
            "id": "content-engine",
            "kind": "json",
            "path": "api/v1/content-engine.json",
            "description": "The Content Engine data contract: idea formats, the five Short-Form Playbook hook structures, calendar dealing rules, batching guidance (consistency-beats-volume), the Repurposing 2.0 derivative map (each derivative's required original element), the Oct-1 originality guardrails, deal-slot guidance, and the simulator bridge. A planning aid, not financial/legal/tax advice.",
            "schema": "api/v1/schema/content-engine.json",
            "updated": BUILD_TS,
            "records": None,
            "records_note": "Data contract, not a record list: 3 idea formats, 5 hook structures, 7 dealing rules, 7 repurposing-2.0 derivatives, 5 originality guardrails.",
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Hook structures are craft formulas from the Short-Form Playbook, not platform documentation. Niche tags resolve against api/v1/niches.json.",
        },
        {
            "id": "skills",
            "kind": "json",
            "path": "api/v1/skills.json",
            "description": "Skill index: name, description, repo-relative path for every executable skill. Full skill content lives in skills/<name>/SKILL.md.",
            "schema": "api/v1/schema/skills.json",
            "updated": BUILD_TS,
            "records": len(skills_idx),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "case-files",
            "kind": "json",
            "path": "api/v1/case-files.json",
            "description": "Index of the documented creator-business deconstructions: id, badge, title, path, words, read_minutes. Full text on the case-*.html pages. Figures are source-reported, not audited — never present as promises.",
            "schema": "api/v1/schema/case-files.json",
            "updated": BUILD_TS,
            "records": sum(1 for m in mdpage_meta if m["badge"] == "Case File"),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "tools",
            "kind": "json",
            "path": "api/v1/tools.json",
            "description": "All sixteen interactive tools with programmatic input schemas (JSON Schema draft-07), output descriptions, and drive notes — replicate the tools' logic without the UI.",
            "schema": "api/v1/schema/tools.json",
            "updated": BUILD_TS,
            "records": len(TOOLS_API),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "reference-pages",
            "kind": "html",
            "paths": [m["path"] for m in reference_meta],
            "description": ("Human-readable reference pages (the 2026 sponsorship rate card, "
                            "the Niche Atlas). Machine-readable equivalents: rate card in "
                            "calculators.json sponsorship_rate_card_2026; the atlas in niches.json."),
            "schema": None,
            "updated": BUILD_TS,
            "records": len(reference_meta),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "tool-pages",
            "kind": "html",
            "paths": [f"{slug}.html" for slug, _, _ in TOOLS],
            "description": "The sixteen interactive tools' human UI pages. Agents should prefer api/v1/tools.json input schemas over scraping these pages.",
            "schema": None,
            "updated": BUILD_TS,
            "records": len(TOOLS),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "schemas",
            "kind": "directory",
            "path": "api/v1/schema/",
            "description": "JSON Schema (draft-07) for every JSON endpoint, per-endpoint and per-record.",
            "files": [
                "index.json — the manifest itself",
                "chapters.json — chapters doc",
                "chapter.json — chapter record",
                "niches.json — niches doc",
                "niche.json — niche record",
                "glossary.json — glossary doc (term records inline)",
                "calculators.json — the calculators data contract",
                "skills.json — skills doc",
                "skill.json — skill record",
                "case-files.json — case-files doc",
                "case-file.json — case-file record",
                "tools.json — tools doc",
                "tool.json — tool record",
                "deal-templates.json — deal-room data contract",
                "content-engine.json — content-engine data contract",
            ],
            "schema": None,
            "updated": BUILD_TS,
            "records": 15,
            "deprecated": False,
            "deprecation_note": None,
        },
    ]
    api_index = {
        "name": SITE_NAME,
        "tagline": TAGLINE,
        "version": "1.0.0",
        "updated": BUILD_TS,
        "base": "api/v1/",
        "notes": ("Self-describing manifest. Base is api/v1/ relative to the site root — "
                  "works on any static host; no auth, no keys, no rate limits. "
                  "Timestamps are ISO-8601 UTC. The deployed site ships its own api/ mirror, "
                  "so the explorer works live too."),
        "endpoints": api_endpoints,
    }
    (API / "index.json").write_text(json.dumps(api_index, indent=2), encoding="utf-8")
    (API / "chapters.json").write_text(json.dumps({"chapters": chapters_meta}, indent=2), encoding="utf-8")
    (API / "case-files.json").write_text(json.dumps({
        "version": "1.0.0", "updated": "2026-10-11",
        "note": "Documented creator-business deconstructions. Figures are reported by the cited sources, not audited — never present as promises.",
        "case_files": [
            {"id": m["id"], "badge": m["badge"], "title": m["title"],
             "path": m["path"], "words": m["words"], "read_minutes": m["read_minutes"]}
            for m in mdpage_meta if m["badge"] == "Case File"
        ],
    }, indent=2), encoding="utf-8")
    shutil.copy(DATA / "glossary.json", API / "glossary.json")
    shutil.copy(DATA / "calculators.json", API / "calculators.json")
    shutil.copy(DATA / "niches.json", API / "niches.json")
    shutil.copy(DATA / "deal-templates.json", API / "deal-templates.json")
    shutil.copy(DATA / "content-engine.json", API / "content-engine.json")

    # ---- tools.json: every tool with its programmatic input schema ----
    (API / "tools.json").write_text(json.dumps({
        "version": "1.0.0", "updated": "2026-10-11",
        "note": ("Programmatic input schemas for the sixteen interactive tools. "
                 "Agents replicate each tool's logic by feeding these inputs to the "
                 "documented formulas / shipped JS (assets/js/<id>.js); the UI pages "
                 "are the human front-end for the same logic."),
        "tools": [
            {"id": tid, "title": title, "description": desc, "page": page,
             "input_schema": schema, "output": output, "drive_notes": drive}
            for tid, title, desc, page, schema, output, drive in TOOLS_API
        ],
    }, indent=2), encoding="utf-8")

    chapter_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Chapter",
        "type": "object",
        "required": ["id", "phase", "title", "path", "words", "read_minutes"],
        "properties": {
            "id": {"type": "string"}, "phase": {"type": "string"},
            "title": {"type": "string"}, "path": {"type": "string"},
            "words": {"type": "integer", "minimum": 1},
            "read_minutes": {"type": "integer", "minimum": 1},
        },
    }
    (API / "schema" / "chapter.json").write_text(json.dumps(chapter_schema, indent=2), encoding="utf-8")
    glossary_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Glossary",
        "type": "object",
        "required": ["terms"],
        "properties": {"terms": {"type": "array", "items": {
            "type": "object", "required": ["term", "definition"],
            "properties": {"term": {"type": "string"}, "definition": {"type": "string"}},
        }}},
    }
    (API / "schema" / "glossary.json").write_text(json.dumps(glossary_schema, indent=2), encoding="utf-8")
    case_file_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "CaseFile",
        "type": "object",
        "required": ["id", "badge", "title", "path", "words", "read_minutes"],
        "properties": {
            "id": {"type": "string"}, "badge": {"type": "string"},
            "title": {"type": "string"}, "path": {"type": "string"},
            "words": {"type": "integer", "minimum": 1},
            "read_minutes": {"type": "integer", "minimum": 1},
        },
    }
    (API / "schema" / "case-file.json").write_text(json.dumps(case_file_schema, indent=2), encoding="utf-8")

    # calculators schema: locks the data contract the sim engine, revenue
    # calculator, and deal analyzer read (rpm band shape + research blocks).
    calculators_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Calculators",
        "type": "object",
        "required": ["version", "updated", "youtube_longform_rpm_bands",
                     "niche_growth_2026", "platform_rules_2026",
                     "sponsorship_rate_card_2026", "platform_thresholds",
                     "revenue_splits"],
        "properties": {
            "version": {"type": "string"},
            "updated": {"type": "string"},
            "youtube_longform_rpm_bands": {
                "type": "object",
                "required": ["finance_investing", "gaming", "kids_content"],
                "additionalProperties": {
                    "type": "array", "minItems": 2, "maxItems": 2,
                    "items": {"type": "number"},
                },
            },
            "niche_growth_2026": {
                "type": "object",
                "required": ["date", "channel_growth_monthly_pct",
                             "search_growth_2026", "breakout_formats",
                             "rpm_reality"],
            },
            "platform_rules_2026": {
                "type": "object",
                "required": ["date", "tiktok", "youtube_shorts",
                             "instagram_reels"],
            },
            "sponsorship_rate_card_2026": {"type": "object"},
            "platform_thresholds": {"type": "object"},
            "revenue_splits": {"type": "object"},
        },
    }
    (API / "schema" / "calculators.json").write_text(json.dumps(calculators_schema, indent=2), encoding="utf-8")

    # ---- schemas for the Niche Atlas endpoint (wave 14) ----
    # Revenue figures are creator-reported ranges: `kind` says which (CPM or
    # RPM), `lo`/`hi` the range ends. Ranges, never point estimates. Tiers are
    # our analytic convenience: high ~= $8+/1K views, mid ~= $3-8, low < ~$3,
    # unknown = no reported range in the October 2026 research.
    niche_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Niche",
        "type": "object",
        "required": ["id", "name", "summary", "revenue_tier", "competition",
                     "startup_cost", "skill_fit", "sources", "single_source"],
        "properties": {
            "id": {"type": "string"},
            "name": {"type": "string"},
            "platforms": {"type": "array", "items": {"type": "string"}},
            "summary": {"type": "string"},
            "channel_growth_monthly_pct": {"type": ["number", "null"],
                "description": "Median monthly subscriber growth among 10K-100K-sub YouTube channels (AIR Media-Tech / TubeAI, Sep 7-27, 2026). Cohort median, not a prediction."},
            "search_growth_pct": {"type": ["number", "null"],
                "description": "Year-over-year search growth (OutlierKit, Sep 2026)."},
            "breakout_rate": {"type": ["string", "null"],
                "description": "Growth multiple or share of videos beating the channel average 10x."},
            "revenue_figures": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["kind", "lo", "hi"],
                    "properties": {
                        "kind": {"type": "string", "enum": ["CPM", "RPM"]},
                        "lo": {"type": "number"},
                        "hi": {"type": "number"},
                        "note": {"type": "string"},
                    },
                },
            },
            "revenue_tier": {"type": "string",
                             "enum": ["high", "mid", "low", "unknown"]},
            "competition": {"type": "string",
                            "enum": ["low", "very-low", "medium", "high"]},
            "startup_cost": {"type": "string", "enum": ["low", "medium", "high"]},
            "skill_fit": {"type": "array", "items": {"type": "string",
                "enum": ["teaching", "research", "personality", "hands-on", "voice"]}},
            "formats": {"type": "array", "items": {"type": "string"}},
            "chapter_links": {"type": "array", "items": {
                "type": "object", "required": ["page", "label"],
                "properties": {"page": {"type": "string"}, "label": {"type": "string"}},
            }},
            "simulator_scenario": {"type": ["string", "null"]},
            "case_file": {"type": ["object", "null"],
                          "properties": {"page": {"type": "string"}, "title": {"type": "string"}}},
            "sources": {"type": "array", "items": {"type": "string"},
                        "description": "Source ids; every id must appear in the doc-level sources list."},
            "single_source": {"type": "boolean"},
            "caveats": {"type": "array", "items": {"type": "string"}},
            # Wave 20: the 2027 outlook layer.
            "outlook_2027": {"type": "object",
                "description": "Directional 2027 read: heating/stable/cooling + the basis sentence and signal source ids. A read, not a forecast.",
                "properties": {
                    "trajectory": {"type": "string", "enum": ["heating", "stable", "cooling"]},
                    "basis": {"type": "string"},
                    "signals": {"type": "array", "items": {"type": "string"}},
                }},
            "stream_fit": {"type": "object",
                "description": "Editorial fit ratings (strong/moderate/weak) for ads, sponsorships, digital_products, pod. Judgment, not reported figures.",
                "properties": {
                    "ads": {"type": "string", "enum": ["strong", "moderate", "weak"]},
                    "sponsorships": {"type": "string", "enum": ["strong", "moderate", "weak"]},
                    "digital_products": {"type": "string", "enum": ["strong", "moderate", "weak"]},
                    "pod": {"type": "string", "enum": ["strong", "moderate", "weak"]},
                }},
        },
    }
    (API / "schema" / "niche.json").write_text(json.dumps(niche_schema, indent=2), encoding="utf-8")
    niches_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Niches",
        "type": "object",
        "required": ["version", "updated", "note", "sources", "reality_check",
                     "niches", "avoid_list"],
        "properties": {
            "version": {"type": "string"},
            "updated": {"type": "string"},
            "note": {"type": "string"},
            "growth_context": {"type": "string"},
            "revenue_tier_legend": {"type": "object"},
            "stream_fit_legend": {"type": "object",
                "description": "Legend for the editorial stream-fit ratings (strong/moderate/weak)."},
            "outlook_2027": {"type": "object",
                "description": "Doc-level 2027 outlook: summary, platform_signals, evidence_note."},
            "breakout_spotlights": {"type": "array",
                "description": "Breakout-format spotlights: growth signal, reported rates, competition, why, single_source flag.",
                "items": {"type": "object"}},
            "sources": {"type": "array", "items": {
                "type": "object",
                "required": ["id", "publisher", "title", "url", "observed"],
                "properties": {
                    "id": {"type": "string"},
                    "publisher": {"type": "string"},
                    "title": {"type": "string"},
                    "url": {"type": "string", "format": "uri"},
                    "observed": {"type": "string"},
                    "note": {"type": "string"},
                },
            }},
            "reality_check": {
                "type": "object",
                "required": ["headline", "detail", "source"],
                "properties": {
                    "headline": {"type": "string"},
                    "detail": {"type": "string"},
                    "source": {"type": "string"},
                },
            },
            "niches": {"type": "array", "items": {"$ref": "niche.json"}},
            "avoid_list": {"type": "array", "items": {
                "type": "object",
                "required": ["id", "name", "detail", "sources"],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "detail": {"type": "string"},
                    "sources": {"type": "array", "items": {"type": "string"}},
                },
            }},
        },
    }
    (API / "schema" / "niches.json").write_text(json.dumps(niches_schema, indent=2), encoding="utf-8")

    # Wave 12: schema for EVERY endpoint — doc-level + per-record where it
    # applies. All draft-07, all checked by scripts/validate.sh.
    index_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "ApiIndex",
        "type": "object",
        "required": ["name", "version", "updated", "base", "endpoints"],
        "properties": {
            "name": {"type": "string"}, "tagline": {"type": "string"},
            "version": {"type": "string"}, "updated": {"type": "string"},
            "base": {"type": "string"}, "notes": {"type": "string"},
            "endpoints": {"type": "array", "items": {
                "type": "object",
                "required": ["id", "kind", "description", "updated", "deprecated"],
                "properties": {
                    "id": {"type": "string"},
                    "kind": {"type": "string", "enum": ["json", "html", "directory"]},
                    "path": {"type": "string"},
                    "paths": {"type": "array", "items": {"type": "string"}},
                    "files": {"type": "array", "items": {"type": "string"}},
                    "description": {"type": "string"},
                    "schema": {"type": ["string", "null"]},
                    "updated": {"type": "string"},
                    "records": {"type": ["integer", "null"]},
                    "records_note": {"type": "string"},
                    "deprecated": {"type": "boolean"},
                    "deprecation_note": {"type": ["string", "null"]},
                    "freshness_note": {"type": "string"},
                },
            }},
        },
    }
    (API / "schema" / "index.json").write_text(json.dumps(index_schema, indent=2), encoding="utf-8")
    chapters_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Chapters",
        "type": "object",
        "required": ["chapters"],
        "properties": {"chapters": {"type": "array", "items": {"$ref": "chapter.json"}}},
    }
    (API / "schema" / "chapters.json").write_text(json.dumps(chapters_schema, indent=2), encoding="utf-8")
    skill_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Skill",
        "type": "object",
        "required": ["name", "description", "path"],
        "properties": {
            "name": {"type": "string"}, "description": {"type": "string"},
            "path": {"type": "string"},
        },
    }
    (API / "schema" / "skill.json").write_text(json.dumps(skill_schema, indent=2), encoding="utf-8")
    skills_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Skills",
        "type": "object",
        "required": ["version", "updated", "skills"],
        "properties": {
            "version": {"type": "string"}, "updated": {"type": "string"},
            "skills": {"type": "array", "items": {"$ref": "skill.json"}},
        },
    }
    (API / "schema" / "skills.json").write_text(json.dumps(skills_schema, indent=2), encoding="utf-8")
    case_files_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "CaseFiles",
        "type": "object",
        "required": ["version", "updated", "note", "case_files"],
        "properties": {
            "version": {"type": "string"}, "updated": {"type": "string"},
            "note": {"type": "string"},
            "case_files": {"type": "array", "items": {"$ref": "case-file.json"}},
        },
    }
    (API / "schema" / "case-files.json").write_text(json.dumps(case_files_schema, indent=2), encoding="utf-8")
    tool_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Tool",
        "type": "object",
        "required": ["id", "title", "description", "page", "input_schema", "output", "drive_notes"],
        "properties": {
            "id": {"type": "string"}, "title": {"type": "string"},
            "description": {"type": "string"}, "page": {"type": "string"},
            "input_schema": {"type": "object"},
            "output": {"type": "string"}, "drive_notes": {"type": "string"},
        },
    }
    (API / "schema" / "tool.json").write_text(json.dumps(tool_schema, indent=2), encoding="utf-8")
    tools_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Tools",
        "type": "object",
        "required": ["version", "updated", "note", "tools"],
        "properties": {
            "version": {"type": "string"}, "updated": {"type": "string"},
            "note": {"type": "string"},
            "tools": {"type": "array", "items": {"$ref": "tool.json"}},
        },
    }
    (API / "schema" / "tools.json").write_text(json.dumps(tools_schema, indent=2), encoding="utf-8")

    # ---- schema for the Content Engine data contract (wave 16) ----
    # Derivative ids must match the set the engine's repurposeMap() emits
    # (checked by tests/content-engine.test.js); guardrail ids must match
    # originalityGuardrails(); hook structure ids must match the Hook Builder's
    # STRUCTURES.
    content_engine_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "ContentEngine",
        "type": "object",
        "required": ["version", "updated", "disclaimer", "idea_formats",
                     "hook_structures", "dealing_rules", "batching",
                     "repurposing_2_0", "originality_guardrails",
                     "deal_slots", "simulator_bridge", "source"],
        "properties": {
            "version": {"type": "string"},
            "updated": {"type": "string"},
            "disclaimer": {"type": "string"},
            "idea_formats": {"type": "array", "minItems": 3, "maxItems": 3, "items": {
                "type": "object",
                "required": ["id", "label", "description", "effort_note", "examples"],
                "properties": {
                    "id": {"type": "string", "enum": ["long", "short", "community"]},
                    "label": {"type": "string"},
                    "description": {"type": "string"},
                    "effort_note": {"type": "string"},
                    "examples": {"type": "array", "items": {"type": "string"}},
                }}},
            "hook_structures": {"type": "array", "minItems": 5, "maxItems": 5, "items": {
                "type": "object",
                "required": ["id", "name", "formula", "reference", "source"],
                "properties": {
                    "id": {"type": "string",
                           "enum": ["open-loop", "cold-start", "contrarian",
                                    "numbered", "question"]},
                    "name": {"type": "string"},
                    "formula": {"type": "string"},
                    "reference": {"type": "string"},
                    "source": {"type": "string"},
                }}},
            "dealing_rules": {
                "type": "object",
                "required": ["basis", "rules", "slot_priorities"],
                "properties": {
                    "basis": {"type": "string"},
                    "rules": {"type": "array", "items": {"type": "string"}},
                    "slot_priorities": {"type": "array", "items": {"type": "string"}},
                }},
            "batching": {
                "type": "object",
                "required": ["consistency_framing", "guidance", "weeks_per_month"],
                "properties": {
                    "consistency_framing": {"type": "string"},
                    "guidance": {"type": "array", "items": {"type": "string"}},
                    "weeks_per_month": {"type": "number"},
                }},
            "repurposing_2_0": {
                "type": "object",
                "required": ["basis", "note", "derivatives"],
                "properties": {
                    "basis": {"type": "string"},
                    "note": {"type": "string"},
                    "derivatives": {"type": "array", "minItems": 7, "items": {
                        "type": "object",
                        "required": ["id", "platform", "day", "label", "task",
                                     "original_element", "effort"],
                        "properties": {
                            "id": {"type": "string",
                                   "enum": ["short_clip", "community_reaction",
                                            "tiktok_cut", "reel_cut",
                                            "newsletter_issue", "x_thread",
                                            "facebook_post"]},
                            "platform": {"type": "string"},
                            "day": {"type": "string"},
                            "label": {"type": "string"},
                            "task": {"type": "string"},
                            "original_element": {"type": "string"},
                            "effort": {"type": "string"},
                        }}}}},
            "originality_guardrails": {"type": "array", "minItems": 4, "items": {
                "type": "object",
                "required": ["id", "rule", "detail"],
                "properties": {
                    "id": {"type": "string"},
                    "rule": {"type": "string"},
                    "detail": {"type": "string"},
                }}},
            "deal_slots": {
                "type": "object",
                "required": ["description", "guidance", "max_sponsor_share"],
                "properties": {
                    "description": {"type": "string"},
                    "guidance": {"type": "array", "items": {"type": "string"}},
                    "max_sponsor_share": {"type": "number"},
                }},
            "simulator_bridge": {"type": "object"},
            "source": {"type": "string"},
        },
    }
    (API / "schema" / "content-engine.json").write_text(
        json.dumps(content_engine_schema, indent=2), encoding="utf-8")

    # ---- skills index outputs (index computed before the API block) ----
    (API / "skills.json").write_text(json.dumps(
        {"version": "1.0.0", "updated": "2026-10-11", "skills": skills_idx}, indent=2), encoding="utf-8")

    # ---- ship an api/ mirror inside site/ so the deployed site serves its own
    #      API (the API explorer fetches relative paths). This must come AFTER
    #      every api/v1 write (including schemas + skills.json) so a clean
    #      build mirrors the final state, not a mid-build snapshot. ----
    site_api = SITE / "api" / "v1"
    if site_api.exists():
        shutil.rmtree(site_api)
    shutil.copytree(API, site_api)

    # ---- llms.txt / llms-full.txt ----
    llms = [f"# {SITE_NAME}", "", TAGLINE, "",
            "## Phases"]
    for m in chapters_meta:
        llms.append(f"- [{m['phase']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## Tools"]
    for slug, title, desc in TOOLS:
        llms.append(f"- [{title}]({slug}.html) — {desc}")
    llms += ["- [Glossary](glossary.html)", "",
             "All sixteen tools, grouped by job (Plan / Money / Content): [Tools hub](tools.html).",
             "", "## Reference"]
    for m in reference_meta:
        llms.append(f"- [{m['badge']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## Case Files — documented creator-business deconstructions"]
    for m in (m for m in mdpage_meta if m["badge"] == "Case File"):
        llms.append(f"- [Case File: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["- [All case files — index + comparison table](case-files.html)",
             "- api/v1/case-files.json — machine-readable case-file index", "",
             "## Guides & Playbooks"]
    for m in (m for m in mdpage_meta if m["badge"] in ("Guide", "Playbook")):
        llms.append(f"- [{m['badge']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## API", "- api/v1/index.json — self-describing manifest: every endpoint, schema URL, updated timestamp, record counts",
             "- api/v1/chapters.json",
             "- api/v1/niches.json — the Niche Atlas dataset v2.0.0: 20 researched niches, 2027 outlook layer (trajectory badges, breakout spotlights, platform signals, stream-fit matrix), avoid list, sources, reality check",
             "- api/v1/glossary.json",
             "- api/v1/calculators.json",
             "- api/v1/skills.json",
             "- api/v1/case-files.json",
             "- api/v1/tools.json — every tool's programmatic input schema",
             "- api/v1/deal-templates.json — Deal Room data: negotiation scripts, red-flag checklist, usage-rights tiers",
             "- api/v1/content-engine.json — Content Engine data: idea formats, Playbook hook structures, dealing rules, Repurposing 2.0 map, originality guardrails, deal-slot guidance",
             "- api/v1/schema/ — JSON Schema (draft-07) for every endpoint",
             "", "## Agents",
             "- AGENT.md — how an agent uses this site: base URL pattern, example requests, 8 end-to-end workflows, tool input schemas",
             "- [Agents](agents.html) — the agent surface: endpoint table, all skills, data freshness policy, 5 worked agent workflows",
             "- [API Explorer](api-explorer.html) — browse api/v1 endpoints, preview JSON in-browser",
             "- llms.txt (this file) — quick agent orientation",
             "- llms-full.txt — complete guide text, all chapters + reference + guides + agents",
             "", "## Skills"]
    for s in skills_idx:
        llms.append(f"- {s['name']}: {s['description']}")
    (ROOT / "llms.txt").write_text("\n".join(llms) + "\n", encoding="utf-8")
    (ROOT / "llms-full.txt").write_text("\n\n---\n\n".join(llms_full_parts), encoding="utf-8")

    print(f"Built {len(chapters_meta)} chapters, {len(TOOLS)} tools, {len(skill_files)} skills, "
          f"{sum(1 for m in mdpage_meta if m['badge'] == 'Case File')} case files, {total_words:,} words.")

if __name__ == "__main__":
    build()
