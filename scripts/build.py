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
]

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
    ("quiz", "Niche Picker", "Answer 6 questions, get ranked niche suggestions with reasoning."),
    ("calculator", "Revenue Calculator", "Project revenue from views, niche, sponsors, and affiliates — with honest ranges."),
    ("planner", "90-Day Planner", "Generate a posting schedule from your platforms and cadence. Printable."),
    ("deal-analyzer", "Sponsor Deal Analyzer", "Benchmark a sponsor offer against the 2026 rate card — verdict, red-flag checklist, counter-offer worksheet."),
    ("hiring-calculator", "Hiring Cost Calculator", "Price your first hire: monthly/annual cost and the ad revenue needed to cover it — honest math, no promises."),
    ("repurpose", "Repurposing Planner", "Turn one idea into a 5-platform mission-card checklist from the Phase 3 repurposing SOP."),
    ("simulator", "Empire Simulator", "Simulate 12 months of channel growth + revenue from your niche, cadence, and assumptions — a model, not a prediction."),
    ("api-explorer", "API Explorer", "Browse every api/v1 endpoint and preview JSON responses live in your browser — no key, no server."),
    ("hook-builder", "Hook Builder", "Type your video topic, get five filmed-ready hooks — one per Short-Form Playbook structure. Flip-through cards."),
]



# TOOLS_API: programmatic input schemas for every interactive tool (wave 12).
# Agents drive the tools' logic without the UI by replicating these inputs
# against the shipped JS logic (assets/js/<slug>.js) and api/v1/calculators.json.
# Each entry: (id, title, description, page, input_schema [JSON Schema draft-07],
#              output_description, drive_notes).
TOOLS_API = [
    ("quiz", "Niche Picker",
     "Answer 6 questions, get ranked niche suggestions with reasoning.",
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
      }},
     "Ranked niche list (top 3+) with per-niche reasoning and fit tags.",
     "Scoring logic lives in assets/js/quiz.js: option tags are matched against each niche's fit[] tags, q3 sets an RPM preference filter, q6 sets the competition ceiling. The niche catalogue (9 niches, fit tags, rpm/competition levels) is embedded in quiz.js."),
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
     "Logic (assets/js/repurpose.js): atom test (does the insight survive standalone?), pillar prep (hook in first 15s), then the five staggered mission cards. Enforce native grammar — no watermarks, no copy-paste."),
    ("simulator", "Empire Simulator",
     "Simulate 12 months of channel growth + revenue from your niche, cadence, and assumptions — a model, not a prediction.",
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
          "digital_start_month": {"type": "integer", "minimum": 1, "maximum": 12, "default": 1},
          "digital_price_usd": {"type": "number", "minimum": 1, "default": 49},
      }},
     "12-month projection: subs, views, and revenue per month per stream (ads, sponsors, affiliates, digital), totals, and the full named-assumptions list. A model, not a prediction.",
     "Engine (assets/js/sim-engine.js, UMD — importable in node): simulate(inputs, cfg) with cfg = calculators.json. Growth compounds monthly × niche factor × quality × cadence (diminishing, capped 2.5x). RPMs come from calculators.json youtube_longform_rpm_bands. Every assumption is named in DEFAULTS and listed on-page."),
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
]

# Tools hub (wave 9): grouped card index. Per tool: icon, "use when" one-liner,
# best-for tags. Groups: PLAN / MONEY / CONTENT (order within group = TOOLS order).
TOOL_HUB_META = {
    "quiz":          ("◉", "PLAN",    "acid", "you're starting out and don't know what to make yet.",
                      ["starting out", "undecided", "Phase 0"]),
    "planner":       ("▦", "PLAN",    "acid", "you need a posting schedule you can actually keep.",
                      ["consistency", "cadence", "Phase 1"]),
    "simulator":     ("◬", "PLAN",    "acid", "you want to see 12 months of growth and revenue before you live them.",
                      ["what-if", "projections", "Phases 2 · 5 · 8"]),
    "calculator":    ("∑", "MONEY",   "gold", "you want honest revenue ranges from your current views.",
                      ["ads", "sponsors", "ranges"]),
    "deal-analyzer": ("⚖", "MONEY",   "gold", "a brand made an offer and your gut isn't sure.",
                      ["negotiation", "rate card", "Phase 5"]),
    "hiring-calculator": ("⚒", "MONEY", "gold", "you're about to hire someone and want the real numbers first.",
                      ["first hire", "costs", "Phase 7 · 8"]),
    "repurpose":     ("⇄", "CONTENT", "coral", "one good idea should feed five platforms.",
                      ["SOP", "short-form", "Phase 3"]),
    "api-explorer":  ("⌗", "CONTENT", "coral", "you're building on the empire's data and want every endpoint.",
                      ["agents", "JSON", "no key"]),
    "hook-builder":  ("🎣", "CONTENT", "coral", "you have a topic and need the first 3 seconds to win.",
                      ["hooks", "short-form", "Playbook"]),
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
        page = page_template(f"{phase}: {short}", f'<article class="chapter">{hero}{body_html}{cnav}</article>', active="")
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")
        chapters_meta.append({
            "id": slug, "phase": phase, "title": short,
            "path": f"{slug}.html", "words": wc, "read_minutes": read_min,
        })
        llms_full_parts.append(f"# {phase}: {short}\n\n{md}")

    # ---- reference pages (not phases; rendered like chapters, linked from llms/API) ----
    reference_meta = []
    for slug, src, badge, short in REFERENCE_PAGES:
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
        page = page_template(f"{short}", f'<article class="chapter">{hero}{body_html}{cnav}</article>', active="")
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
        "hiring-calculator": ["assets/js/hiring-calculator.js"],
        "repurpose": ["assets/js/repurpose.js"],
        "simulator": ["assets/js/sim-engine.js", "assets/js/simulator.js"],
        "api-explorer": ["assets/js/api-explorer.js"],
        "hook-builder": ["assets/js/hook-builder.js"],
    }
    for slug, title, desc in TOOLS:
        body_src = PAGES / f"{slug}.html"
        tool_body = body_src.read_text(encoding="utf-8") if body_src.exists() else f"<p>{esc(desc)}</p>"
        extra = ""
        if slug in TOOL_SCRIPTS:
            extra = "".join(f'<script src="{src}"></script>' for src in TOOL_SCRIPTS[slug])
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
                 "Seven power tools, one command center. Pick the briefing that matches where you are.",
                 "acid")
        + hub_sections
        + '<section class="section honesty"><h2>Pick by job, not by shine</h2>'
        "<p>Every tool on this page reads the same 2026 research the rest of the site is built on. "
        "Start with the Niche Picker if you're undecided, the Revenue Calculator if you have views, "
        "and the Sponsor Deal Analyzer the moment a brand emails you.</p></section>")
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
                 "Five real creator businesses, taken apart: the stack, the decisions, the numbers — reported, not audited.",
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
                    f'<a href="case-files.html" class="section-more">All 5 case files →</a></div>'
                    f'<div class="phase-grid reveal-stagger">{case_cards}</div></section>')
    index_body = f"""
<section class="hero">
  <p class="hero-eyebrow">Field manual // Creator division</p>
  <p class="kicker">THE COMPLETE PLAYBOOK</p>
  <h1 class="mega">BUILD YOUR<br><span class="mega-outline outline-text">EMPIRE</span></h1>
  <p class="lede">Nine phases. Zero to multi-million-dollar creator company — YouTube, TikTok, Facebook, merch, brand deals, LLC, taxes, scale. No guru hype. Just the playbook.</p>
  <div class="sticker-row reveal">
    <span class="sticker">9 phases</span>
    <span class="sticker sticker-coral">7 power tools</span>
    <span class="sticker sticker-violet">5 case files</span>
    <span class="sticker sticker-gold">2026 verified</span>
    <span class="sticker sticker-violet">Zero → empire</span>
  </div>
  <div class="hero-stats">
    <div class="hero-stat reveal" style="--i:0"><strong>9</strong><span>phases</span></div>
    <div class="hero-stat reveal" style="--i:1"><strong>{total_words:,}</strong><span>words</span></div>
    <div class="hero-stat reveal" style="--i:2"><strong>7</strong><span>interactive tools</span></div>
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
<section class="section"><div class="section-head"><h2>Command Center</h2><span class="section-tag">weapons free</span><a href="tools.html" class="section-more">All 9 tools →</a></div><div class="tool-grid reveal-stagger">{tools_html}</div></section>
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
            "description": "All nine interactive tools with programmatic input schemas (JSON Schema draft-07), output descriptions, and drive notes — replicate the tools' logic without the UI.",
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
            "description": "Human-readable reference pages (the 2026 sponsorship rate card). Machine-readable equivalent lives in calculators.json sponsorship_rate_card_2026.",
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
            "description": "The nine interactive tools' human UI pages. Agents should prefer api/v1/tools.json input schemas over scraping these pages.",
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
                "glossary.json — glossary doc (term records inline)",
                "calculators.json — the calculators data contract",
                "skills.json — skills doc",
                "skill.json — skill record",
                "case-files.json — case-files doc",
                "case-file.json — case-file record",
                "tools.json — tools doc",
                "tool.json — tool record",
            ],
            "schema": None,
            "updated": BUILD_TS,
            "records": 11,
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

    # ---- tools.json: every tool with its programmatic input schema ----
    (API / "tools.json").write_text(json.dumps({
        "version": "1.0.0", "updated": "2026-10-11",
        "note": ("Programmatic input schemas for the nine interactive tools. "
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
        llms.append(f"- [{title}]({slug}.html)")
    llms += ["- [Glossary](glossary.html)", "",
             "All nine tools, grouped by job (Plan / Money / Content): [Tools hub](tools.html).",
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
             "- api/v1/glossary.json",
             "- api/v1/calculators.json",
             "- api/v1/skills.json",
             "- api/v1/case-files.json",
             "- api/v1/tools.json — every tool's programmatic input schema",
             "- api/v1/schema/ — JSON Schema (draft-07) for every endpoint",
             "", "## Agents",
             "- AGENT.md — how an agent uses this site: base URL pattern, example requests, 3 end-to-end workflows, tool input schemas",
             "- [Agents](agents.html) — the agent surface: endpoint table, all skills, data freshness policy, 3 worked agent workflows",
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
