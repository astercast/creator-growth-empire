#!/usr/bin/env python3
"""Build the Creator Growth Empire static site from content/*.md.

Outputs:
  site/                 - generated HTML site (index, phases, tools, glossary)
  site/assets/          - copied CSS/JS
  data/v1/*.json         - versioned JSON API (+ schema/)
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
DATA_V1 = ROOT / "data" / "v1"

SITE_NAME = "Creator Growth Empire"
TAGLINE = "From $0 to a multi-million-dollar creator company."
FONT_URL = ("https://fonts.googleapis.com/css2?family=Black+Ops+One"
           "&family=Barlow+Condensed:wght@500;600;700"
           "&family=Barlow:wght@400;500;600;700"
           "&family=JetBrains+Mono:wght@400;700&display=swap")

PHASE_ACCENTS = ["cyan", "gold", "stamp", "sage", "cyan", "gold", "stamp", "sage", "cyan"]

# Phase rank ladder — the field-manual tier each phase earns (wave 29).
PHASE_RANKS = ["RECRUIT", "PRIVATE", "CORPORAL", "SERGEANT", "STAFF SERGEANT",
               "GUNNERY SERGEANT", "MASTER SERGEANT", "LIEUTENANT", "COMMANDER"]

def _rank_chevrons(n, cls="rank", sm=False):
    n = max(1, min(5, n))
    tag = "rank rank-sm" if sm else cls
    return f'<span class="{tag}" role="img" aria-label="Tier {n}">' + "<i></i>" * n + "</span>"

# ---------- wave 30: radar section maps (dossier nav for long pages) ----------

def _slugify_h2(text, seen):
    base = "sec-" + re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if base == "sec-":
        base = "sec-x"
    slug, n = base, 2
    while slug in seen:
        slug = f"{base}-{n}"
        n += 1
    seen.add(slug)
    return slug

def _add_h2_ids(body_html):
    """Give every h2 an anchor id. Returns (html, [(id, label), ...])."""
    seen = set()
    items = []
    def repl(m):
        inner = m.group(1)
        label = html.unescape(re.sub(r"<[^>]+>", "", inner)).strip()
        sid = _slugify_h2(label, seen)
        items.append((sid, label))
        return f'<h2 id="{sid}">{inner}</h2>'
    return re.sub(r"<h2>(.*?)</h2>", repl, body_html, flags=re.S), items

def _radar_map(items):
    """Dossier section-map: sticky sidebar + mobile disclosure, same links."""
    links = "".join(
        f'<li><a href="#{sid}"><span class="radar-n">{i + 1:02d}</span>'
        f'<span class="radar-t">{esc(label)}</span></a></li>'
        for i, (sid, label) in enumerate(items))
    nav = f'<nav aria-label="On this page"><ol>{links}</ol></nav>'
    aside = (
        '<aside class="radar" data-radar>'
        '<p class="fm-kicker radar-kicker"><strong>SECTION MAP</strong></p>'
        '<div class="radar-rail" role="progressbar" aria-label="Reading progress" '
        'aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i aria-hidden="true"></i></div>'
        f"{nav}"
        f'<p class="radar-foot fm-readout">FILED // {len(items):02d} SECTIONS</p></aside>')
    details = (
        '<details class="radar-mobile" data-radar-mobile>'
        f'<summary><span class="fm-kicker"><strong>SECTION MAP</strong>'
        f'<span class="sep">//</span>{len(items):02d} SECTIONS</span></summary>'
        f"{nav}</details>")
    return aside, details

def _lede_text(briefing_html, limit=170):
    """Plain-text one-liner from a blockquote lede (for the signal log)."""
    t = html.unescape(re.sub(r"<[^>]+>", "", briefing_html or ""))
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) > limit:
        cut = t[:limit].rsplit(" ", 1)[0]
        t = (cut or t[:limit]) + "…"
    return t

REFERENCE_PAGES = [
    ("rate-card", "content/rate-card.md", "Reference", "2026 Rate Card"),
    # Optional 5th element: list of <script src> paths injected into <head>
    # (wave 14: the Niche Atlas ships an interactive explorer).
    ("niche-atlas", "content/niche-atlas.md", "Reference", "The Niche Atlas",
     ["assets/js/niche-atlas.js"]),
    ("metrics-glossary", "content/metrics-glossary.md", "Reference", "The Metrics Glossary"),
    ("platform-rules-bible", "content/platform-rules-bible.md", "Reference", "The 2026 Platform Rules Bible",
     ["assets/js/platform-rules-ui.js"]),
    ("breakout-format-intel", "content/breakout-format-intel.md", "Reference", "The 2026 Breakout-Format Intel"),
    ("sponsor-playbook", "content/sponsor-playbook.md", "Reference", "The 2026 Sponsor Playbook"),
]

# Interactive mount appended to the Niche Atlas reference page (wave 14).
# The explorer UI itself is rendered by assets/js/niche-atlas.js from
# data/v1/niches.json; the article above carries static tables so the page
# reads fully without JavaScript.
NICHE_EXPLORER_MOUNT = (
    '<section class="niche-explorer" aria-labelledby="ne-mount-title">'
    '<h2 id="ne-mount-title" class="visually-hidden">Niche explorer</h2>'
    '<div id="niche-explorer"></div>'
    "<noscript><p>The niche explorer needs JavaScript. The full niche tables — "
    "growth rates, search demand, breakout formats, revenue bands, and the avoid "
    "list — are in the article above, and the dataset is "
    '<a href="data/v1/niches.json">data/v1/niches.json</a>.</p></noscript>'
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
    ("deal-analyzer", "The Deal Analyzer", "Paste the brand's terms — rate-card verdict with platform multipliers + niche adjustment, the wave-22 contract checklist applied to the deal, counter-offer calculator, 2026 usage-rights add-on math, deal history + comparison mode."),
    ("deal-room", "The Deal Room", "Deal Room 2.0 — manage the whole deal: niche-adjusted rate-card scoring, pipeline totals, the full 2026 rate card with real quoted prices, the Algorithm Watch digest, usage pricing, scripts, export your memo."),
    ("hiring-calculator", "Hiring Cost Calculator", "Price your first hire: monthly/annual cost and the ad revenue needed to cover it — honest math, no promises."),
    ("repurpose", "Repurposing Planner", "Turn one idea into a 5-platform mission-card checklist from the Phase 3 repurposing SOP."),
    ("simulator", "Empire Simulator", "Simulate 12–36 months of channel growth + revenue — the 10 real 2026 study niches (TubeAI/AIR medians + labeled RPM bands), niche/cadence/quality sliders, platform mix (Shorts/TikTok/Reels under their real 2026 rules), 12-scenario library, A/B comparison, team hiring P&L, what-if event cards, Money Map stage transitions, the \u201cwhat would it take?\u201d goal solver, live re-run, the mission-control launch sequence, and the animated watch-the-empire-build chart with milestone celebrations + kind reality checks — a model, not a prediction."),
    ("api-explorer", "API Explorer", "Browse every api/v1 endpoint and preview JSON responses live in your browser — no key, no server."),
    ("hook-builder", "Hook Builder", "Type your video topic, get five filmed-ready hooks — one per Short-Form Playbook structure. Flip-through cards."),
    ("idea-bank", "Idea Bank", "Capture ideas with hook-strength scores (1–5, Playbook structures), niche tags, and effort estimates — promote the best to production."),
    ("content-calendar", "90-Day Content Calendar", "Deal your idea bank into a 90-day grid: week-planner dealing rules, drag/keyboard moves, sponsor slots, copy-my-calendar export."),
    ("batching", "Batching Planner", "Film-day math: does your shoot capacity actually cover your cadence? Honest surplus/shortfall, consistency-beats-volume framing."),
    ("money-map", "The Money Map", "Find your stage on the $0-to-company journey — now a playable climb: 7 questions, 5 stage playbooks, checkable missions that earn XP toward Field Manual ranks (Recruit → General). Ranks track work done, never income promises."),
    ("video-doctor", "Diagnose My Video", "Pick your symptom \u2014 low CTR, the 30-second cliff, great retention but no subs \u2014 and get ranked causes with the fix from the chapter that owns it."),
    ("ypp-checker", "YPP 2027 Eligibility Checker", "Enter your subs, watch hours, and Shorts views — get your verdict under the current YPP bar and the Feb-2027 bar, the gap math, and a chapter-grounded plan to close it."),
    ("outreach", "The Outreach Center", "Run your sponsor pipeline outbound: track pitches in a CRM-lite, generate honest pitch emails, quote from the 2026 rate card, and flag contract red flags before you sign."),
    ("crosspost", "Cross-Post Optimizer", "Move one clip to every platform without getting throttled: per-destination adaptation checklists (aspect, captions, hooks, CTAs, disclosure labels) under the Oct-1 originality rules."),
    ("cadence", "Cadence Coach", "How often should you actually post? Turn your honest weekly hours, formats, and platforms into a sustainable cadence — capacity math plus Oct-2026 platform realities. Consistency beats volume."),
    ("format-fit", "Format Fit Finder", "Answer six questions about your real situation — experience, hours, on-camera comfort, budget, timeline, risk — and get all 10 breakout formats ranked by fit, each with why it fits, the catch, creator-reported pay ranges, and your first 3 moves. Honest mismatch flags; never a promise."),
    ("deal-builder", "Deal Builder", "Turn deliverables into a line-item quote from the 2026 rate card — base fees, usage, whitelisting, and exclusivity stacked as separate lines — plus a ready-to-send proposal and a deal checklist built from your actual terms."),
    ("negotiation-kit", "The Negotiation Kit", "The words and the math for a live negotiation: a counter-offer builder grounded in the 2026 rate card with the typical-quote evidence shown (reported vs modeled, kept apart), six ready-to-send reply scripts — the counter, the lowball, exposure-only, usage rights, whitelisting, late payment — each editable in place, and a walk-away panel tied to your own Deal Room pipeline numbers."),
]



# TOOLS_API: programmatic input schemas for every interactive tool (wave 12).
# Agents drive the tools' logic without the UI by replicating these inputs
# against the shipped JS logic (assets/js/<slug>.js) and data/v1/calculators.json.
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
    ("deal-analyzer", "The Deal Analyzer",
     "Paste the brand's terms — rate-card verdict with platform multipliers + niche adjustment, the wave-22 contract checklist applied to the deal, counter-offer calculator, 2026 usage-rights add-on math, deal history + comparison mode.",
     "deal-analyzer.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "DealAnalyzerInput",
      "type": "object", "required": ["platform", "deliverable", "followers", "offer_usd"],
      "properties": {
          "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"]},
          "deliverable": {"type": "string",
                          "enum": ["integrated", "dedicated", "short"],
                          "description": "Integrated slot, dedicated video, or short-form video."},
          "niche": {"type": "string",
                    "enum": ["finance_investing", "tech_software", "education",
                             "health_fitness", "lifestyle", "gaming",
                             "comedy_entertainment", "music"],
                    "description": "Optional — adjusts the verdict range by the niche multiplier (finance/tech x2.5, entertainment/gaming/music x0.6) and enables the AIR category-CPM cross-check where mapped."},
          "followers": {"type": "number", "minimum": 0},
          "offer_usd": {"type": "number", "minimum": 0},
          "expected_views": {"type": "number", "minimum": 0, "default": 0,
                             "description": "If known, enables the implied-CPM check and the category-CPM cross-check."},
          "post_count": {"type": "integer", "minimum": 1, "default": 1,
                         "description": "Posts in the bundle — 3+ triggers the 15-20% bundle-discount guidance."},
          "usage": {"type": "string",
                    "enum": ["organic_only", "paid_3mo", "paid_6mo", "paid_12mo", "perpetual"],
                    "default": "organic_only"},
          "whitelisting": {"type": "string", "enum": ["none", "30", "90", "perpetual"],
                           "default": "none"},
          "exclusivity": {"type": "string", "enum": ["none", "30", "90", "broad"],
                          "default": "none"},
          "payment_terms": {"type": "string", "enum": ["15", "30", "60", "90"],
                            "default": "30", "description": "Net payment terms in days."},
          "timeline": {"type": "string",
                       "enum": ["relaxed", "standard", "rush", "unknown"],
                       "default": "unknown"},
          "contract": {"type": "object",
                       "description": "Ten contract-language answers feeding the wave-22 checklist.",
                       "properties": {
                           "ip": {"type": "string", "enum": ["mine", "brand_full", "unclear"]},
                           "cancel": {"type": "string", "enum": ["no", "yes"]},
                           "usageWords": {"type": "string", "enum": ["specific", "all_media", "unclear"]},
                           "exclRenew": {"type": "string", "enum": ["no", "yes"]},
                           "payMetrics": {"type": "string", "enum": ["no", "yes"]},
                           "morals": {"type": "string", "enum": ["none", "mutual", "one_sided"]},
                           "paySchedule": {"type": "string", "enum": ["yes", "no"]},
                           "approval": {"type": "string", "enum": ["defined", "vague"]},
                           "ftc": {"type": "string", "enum": ["yes", "no"]},
                           "scope": {"type": "string", "enum": ["no", "yes"]},
                       }},
      }},
     "Verdict (UNDERPAID / FAIR / STRONG) against the niche-adjusted benchmark range, implied CPM vs rate-card CPMs, AIR category-CPM cross-check (where mapped), offer-term flags, wave-22 contract checklist verdict (clean / caution / dont_sign) with per-flag fixes, counter-offer with line-item ranges + open-ended totals, usage-rights add-on table, plaintext export.",
     "Engine (assets/js/deal-analyzer.js, UMD — require() it in node): DealAnalyzer.validInput() normalizes; .evaluate(deal, rateCard) returns the tier range x niche multiplier (parity-pinned with the simulator's sponsorNicheMult), verdict, implied CPM, categoryCheck (AIR Oct-2026 category CPMs: finance/real-estate $58, B2B SaaS/AI $46.50, health $28, gaming/tech $18.50, entertainment $14), cross-platform ranges + the 1.7x/0.85x note, and the 23%-benchmark expected close; .offerTermFlags() scans usage/whitelisting/exclusivity/payment/timeline; .mapTermsToFlags() + .contractRisk(flagIds, deal-templates.json contract_flags) apply the wave-22 checklist (walk_away = dont_sign, major 2pts, minor 1pt, 3+ = dont_sign — same scoring as Outreach.contractRisk); .usageAddons() prices the 2026 benchmark ranges (3mo +25-50%, 3-6mo +50-75%, 6-12mo +75-100%, perpetual from 2x; whitelisting 30-100%/mo) from calculators.json usage_rights_benchmarks_2026 (calculators v1.5.0); .counterOffer() builds base + line items + open-ended totals + the 15-20% bundle guidance; .exportReport() renders the plaintext evaluation; .compareDeals() diffs two saved deals. Browser history/compare/print live in assets/js/deal-analyzer-ui.js (localStorage only). Negotiation aid — not financial, legal, or tax advice; the checklist is not legal advice. See AGENT.md Workflow 12."),
    ("deal-room", "The Deal Room",
     "Deal Room 2.0: track offers through signing against the niche-adjusted 2026 rate card, read the pipeline totals, price usage rights, check real quoted prices, read the Algorithm Watch digest, export your memo.",
     "deal-room.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "DealRoomInput",
      "type": "object", "required": ["brand", "platform", "followers", "offer_usd"],
      "properties": {
          "brand": {"type": "string", "description": "Brand making the offer."},
          "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"]},
          "followers": {"type": "number", "minimum": 0},
          "niche": {"type": "string",
                    "description": "Optional sponsor niche key (same table as the Deal Analyzer / simulator sponsorNicheMult) — adjusts the benchmark range the offer is scored against.",
                    "enum": ["finance_investing", "tech_software", "education", "health_fitness",
                             "lifestyle", "gaming", "comedy_entertainment", "music", "kids",
                             "asmr", "creator_economy", "challenges_stunts", "ai_ml",
                             "true_crime", "entertainment", "science"]},
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
     "Tracked deal records with niche-adjusted rate-card verdicts (UNDERPAID / FAIR / STRONG + the ~23% listed-vs-accepted note), a pipeline summary over the creator's own logged deals (stage totals, committed vs paid, underpaid deals still in play), the full 2026 rate-card table with reported vs modeled bases kept separate, a quoted-price check against real negotiation data, usage-rights line-item pricing (reported +50/+75/+100% band; no invented whitelisting/buyout multipliers), per-situation negotiation scripts, interactive red-flag checklist scoring, the Algorithm Watch digest (dated, sourced, confidence-flagged, with per-entry deal notes), and a one-page deal memo.",
     "Logic (assets/js/deal-room.js, UMD — importable in node): scoreOffer(offer, lo, hi) benchmarks against sponsorship_rate_card_2026; scoreDeal(deal, rateCard) adds the niche multiplier (parity-pinned with DealAnalyzer.nicheMult) + implied CPM; rateCardTable(rateCard, quoted) returns the full tier table + multipliers + CPMs + the quoted-prices block; quotedPriceCheck(deal, quoted) reads sponsorship_quoted_prices_2026 (calculators.json v1.5.0 — Cheerful Sep-2026 reported asks/quotes; Click Analytic 2026 Instagram model, labeled modeled) and returns null where no format is honestly mapped; pipelineSummary(deals, rateCard) totals the creator's own pipeline with no invented close probabilities; watchDigest(feed, {days, limit, now}) + digestText(digest) build the Algorithm Watch digest from data/v1/changes.json with curated per-entry deal notes (editorial, labeled); priceUsage(baseFee, tierId, usage_rights_tiers) applies the reported multipliers, returning guidance instead of numbers for whitelisting/buyout; redFlagScore(checkedIds, red_flags) scores contract structure (any walk_away flag or 3+ points -> walk away); renderScript(script, vars) fills {{placeholders}}; dealMemo(deal, scored, flags) builds the one-page record. Scripts + checklist + tiers live in data/v1/deal-templates.json. Negotiation aid, not financial/legal/tax advice."),
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
     "Logic (assets/js/repurpose.js + assets/js/content-engine.js): atom test (does the insight survive standalone?), pillar prep (hook in first 15s), then the five staggered mission cards. Enforce native grammar — no watermarks, no copy-paste. 2.0 adds the full derivative map via ContentEngine.repurposeMap (7 derivatives: short clip, community reaction, TikTok cut, Reel cut, newsletter issue, X thread, Facebook post) — every derivative carries a required original element (repurposing is not re-uploading) plus the Oct-1 originality guardrails (ContentEngine.originalityGuardrails). Machine-readable map + guardrails: data/v1/content-engine.json repurposing_2_0 / originality_guardrails."),
    ("simulator", "Empire Simulator",
     "Simulate 12–36 months of channel growth + revenue — the 10 real 2026 study niches (TubeAI/AIR medians + labeled RPM bands), niche/cadence/quality sliders, platform mix (Shorts/TikTok/Reels under their real 2026 rules), 12-scenario library, A/B comparison, team hiring P&L, what-if event cards, Money Map stage transitions, the \u201cwhat would it take?\u201d goal solver, live re-run, the mission-control launch sequence, and the animated watch-the-empire-build chart with milestone celebrations + kind reality checks — a model, not a prediction.",
     "simulator.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "SimulatorInput",
      "type": "object", "required": ["niche", "start_subs", "longform_per_week"],
      "properties": {
          "niche": {"type": "string",
                    "enum": ["kids", "asmr", "creator_economy", "challenges_stunts",
                             "ai_ml", "true_crime", "education", "entertainment",
                             "science", "gaming"],
                    "description": "The 10 real 2026 study niches (TubeAI/AIR Sep 2026). Each sets the niche_rpm_2026 RPM band (labeled reported/proxy/CPM-reported) and shows the study median as context for monthly_growth_rate — the median is never a multiplier."},
          "start_subs": {"type": "number", "minimum": 0},
          "longform_per_week": {"type": "number", "minimum": 0},
          "shorts_per_week": {"type": "number", "minimum": 0, "default": 0},
          "publish_tiktok": {"type": "boolean", "default": False,
                    "description": "Arm TikTok: the short-form output is split across Shorts/TikTok/Reels (normalized shares). TikTok pays Creator Rewards on ~50% of raw views (qualifying views) at $0.40-$2.00/1k past the 10K-follower gate; under the gate it pays $0."},
          "publish_reels": {"type": "boolean", "default": False,
                    "description": "Arm Instagram Reels: takes a real share of the short-form output and pays $0/view (2026) — the honest number, modeled explicitly. Reels build audience monetized elsewhere."},
          "short_mix": {"type": "object",
                    "description": "Raw platform weights {shorts, tiktok, reels}; normalized across armed platforms. Defaults 60/25/15.",
                    "properties": {
                        "shorts": {"type": "number", "minimum": 0},
                        "tiktok": {"type": "number", "minimum": 0},
                        "reels": {"type": "number", "minimum": 0}}},
          "quality": {"type": "string", "enum": ["low", "solid", "excellent"], "default": "solid"},
          "monthly_growth_rate": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.12,
                                  "description": "Base monthly compounding growth at reference cadence (assumption, adjustable)."},
          "q4_uplift_pct": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.6,
                            "description": "Ad-rate uplift in months 10–12 (assumption, adjustable 0.4–0.8)."},
          "monetize_ads": {"type": "boolean", "default": True},
          "monetize_sponsors": {"type": "boolean", "default": False},
          "monetize_affiliates": {"type": "boolean", "default": False},
          "monetize_digital": {"type": "boolean", "default": False},
          "digital_start_month": {"type": "integer", "minimum": 1, "maximum": 36, "default": 1},
          "digital_price_usd": {"type": "number", "minimum": 1, "default": 49},
          "scenario_id": {"type": "string",
                    "enum": ["asmr-bedroom", "tech-reviewer", "ai-tutorials", "betrayal-dramas",
                             "cooking-channel", "personal-finance", "fitness-coach",
                             "serialized-mini-drama", "asmr-roleplay",
                             "sleep-ambient", "english-learning", "senior-health"],
                    "description": "One-click preset: loads a full named starting config from the engine's SCENARIOS library (research-sourced assumptions)."},
          "horizon": {"type": "integer", "enum": [12, 24, 36], "default": 12,
                      "description": "12, 24, or 36 months. 24 adds year-2 diminishing returns (monthly growth decays x0.94/mo after month 12); 36 adds year-3 (x0.97/mo after month 24) plus Money Map stage transitions — the engine's labeled curves."},
          "hires": {"type": "array", "default": [],
                    "items": {"type": "object", "required": ["type"],
                              "properties": {
                                  "type": {"type": "string", "enum": ["editor", "thumbnail", "va"],
                                           "description": "First-Hire-guide role: editor, thumbnail designer, or virtual assistant."},
                                  "start_month": {"type": "integer", "minimum": 1, "maximum": 36, "default": 1},
                                  "monthly_cost_usd": {"type": "number", "minimum": 0,
                                    "description": "Omit to use the guide preset: editor $1,400, thumbnail $120, VA $900."},
                              }},
                    "description": "Team hires: each adds output/quality lift and subtracts monthly cost (month-by-month P&L: gross, team cost, net). First active month at 50% effect (ramp-up)."},
          "events": {"type": "array", "default": [],
                    "items": {"type": "object", "required": ["id"],
                              "properties": {
                                  "id": {"type": "string",
                                         "enum": ["algorithm-change", "viral-hit", "burnout-break", "policy-change", "holiday-shopping-surge"],
                                         "description": "What-if event card: algorithm-change (Shorts reach cut), viral-hit (one video 10x's), burnout-break (2 months off), policy-change (Feb-2027 YPP rules), holiday-shopping-surge (Q4 affiliate windfall)."},
                                  "start_month": {"type": "integer", "minimum": 1, "maximum": 36, "default": 1,
                                           "description": "The month the card lands on the timeline."},
                              }},
                    "description": "What-if event cards: random-but-transparent scenario events with chapter-cited assumed effects. algorithm-change: Shorts views x0.6 from the card month (Oct-1-2026 originality update). viral-hit: event month long views x10, one-time +8% subs, next month x1.5 tail (reality check built in: virality spikes views, not loyalty). burnout-break: 2 months of zero growth, -0.5%/mo subs drift, views x0.3. policy-change: the Feb-2027 10M-qualified-Shorts-views/90d revenue floor — Shorts ads pay $0 in months under it. holiday-shopping-surge: the event month + the next month, affiliate revenue x1.8 (the two-month holiday buying window — TikTok Shop BFCM 2025 $500M/4 days, Adobe 2026 holiday forecast). Multipliers are the engine's labeled assumptions, never platform data."},
          "compare_with": {"type": "object",
                    "description": "A/B mode: {name_b, inputs_b} — compare(nameA, inputsA, nameB, inputsB, cfg) runs both over the same horizon and returns B-minus-A deltas plus a plain-language verdict.",
                    "properties": {
                        "name_b": {"type": "string", "description": "Label for the B path (e.g. 'Tech reviewer')."},
                        "inputs_b": {"type": "object", "description": "Full SimulatorInput for the B path (or a scenario_id)."},
                    }},
      }},
     "12-, 24-, or 36-month projection: subs, views, and revenue per month per stream (ads, sponsors, affiliates, digital), month-by-month team P&L (gross, team cost, net), per-month Money Map stage (0-4 from monthly net + team) with the stage-transition timeline, active what-if event cards per month, totals, milestones, and the full named-assumptions list. compare() adds side-by-side deltas (B minus A) and a verdict. exportPlan() renders the copy-my-empire-plan text incl. the stage journey. A model, not a prediction.",
     "Engine (assets/js/sim-engine.js, UMD — importable in node): simulate(inputs, cfg) with cfg = calculators.json. scenarioInputs(id) loads a named preset from the SCENARIOS library (12 presets, research-sourced assumptions); compare(nameA, inputsA, nameB, inputsB, cfg) runs two configs over the same clock (deltas are B minus A); assumptionLines(inputs, res) is the always-visible assumptions panel; exportPlan(scenarioName, inputs, res) renders the share text; normalizeEvents() validates the 5 what-if cards; stageForNet(net, teamActive) is the single source of the 0-4 stage rule; solveForGoal(inputs, cfg, {target: \"subs\"|\"net\"|\"stage\", value, month, variable: \"growth\"|\"cadence\"}) binary-searches base growth (whole %) or long-form cadence (half videos) until the target lands by the month — pure inversion of simulate(), no new claims (see AGENT.md Workflow 13). The 4.0 UI adds live re-run (debounced), stage-banded subscriber charts with milestone/event markers, year cards, and an always-visible assumptions block. Wow wave 2 flagship: the 10 study niches carry real TubeAI/AIR medians as CONTEXT (never multipliers) + labeled RPM bands from calculators.json niche_rpm_2026 (reported/proxy/CPM-reported). Growth compounds monthly x cadence x quality (diminishing, capped 2.5x). Hires add output/quality and subtract cost monthly (first active month at 50% ramp). Year-2 decays growth x0.94/mo after month 12; year-3 x0.97/mo after month 24 (growth stays positive — plateau, not collapse). RPMs come from calculators.json niche_rpm_2026 (the 10 study niches; legacy scenario keys still read youtube_longform_rpm_bands). Platform mix: publish_tiktok/publish_reels split the short-form output across Shorts/TikTok/Reels (normalized); TikTok pays Creator Rewards on ~50% of raw views at $0.40-$2.00/1k past the 10K gate; Reels pay $0/view. realityChecks(inputs, res) returns the kind hard truths (<1% to 100K, hyper-growth, kids-trap, reels-zero, tiktok-gate, ads-vs-sponsors). moneyMapToInputs(answers) feeds the Money Map quiz into starting stats. Every assumption is named in DEFAULTS and listed on-page. Wow wave 1 adds the mission-control launch sequence (assets/js/simulator-launch.js, UMD pure helpers + DOM): explicit runs fly pre-flight checks (four real gates), a T-minus countdown, mission elapsed-time telemetry streamed month-by-month, then the full results plus a stamped MISSION DEBRIEF that credits +25 XP to the Empire Climb journal (shared localStorage store with the Money Map). Live-update re-runs bypass the sequence; reduced-motion/calm users get checks + debrief + XP without the motion; ABORT/Esc scrubs before anything is computed."),
    ("api-explorer", "API Explorer",
     "Browse every api/v1 endpoint and preview JSON responses live in your browser — no key, no server.",
     "api-explorer.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "ApiExplorerInput",
      "type": "object", "properties": {},
      "description": "No inputs — this tool is a read-only browser over the API itself."},
     "Live in-browser JSON previews of every endpoint, discovered from data/v1/index.json with a static fallback list.",
     "Discovery (assets/js/api-explorer.js): fetches data/v1/index.json, renders one GET button per endpoint record, pretty-prints responses. Agents can skip the UI and fetch the endpoints directly."),
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
                  "description": "Niche tag — a Niche Atlas niche id from data/v1/niches.json (free text accepted)."},
          "effort": {"type": "string", "enum": ["quick", "afternoon", "week"],
                   "default": "afternoon",
                   "description": "quick < 2h, afternoon = half day, week = full week build."},
          "hook_score": {"type": "integer", "minimum": 1, "maximum": 5, "default": 3,
                       "description": "Hook strength self-score against the five Short-Form Playbook structures (see data/v1/content-engine.json hook_structures)."},
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
          "publish_tiktok": {"type": "boolean", "default": False,
                    "description": "Arm TikTok: the short-form output is split across Shorts/TikTok/Reels (normalized shares). TikTok pays Creator Rewards on ~50% of raw views (qualifying views) at $0.40-$2.00/1k past the 10K-follower gate; under the gate it pays $0."},
          "publish_reels": {"type": "boolean", "default": False,
                    "description": "Arm Instagram Reels: takes a real share of the short-form output and pays $0/view (2026) — the honest number, modeled explicitly. Reels build audience monetized elsewhere."},
          "short_mix": {"type": "object",
                    "description": "Raw platform weights {shorts, tiktok, reels}; normalized across armed platforms. Defaults 60/25/15.",
                    "properties": {
                        "shorts": {"type": "number", "minimum": 0},
                        "tiktok": {"type": "number", "minimum": 0},
                        "reels": {"type": "number", "minimum": 0}}},
          "weekly_hours": {"type": "number", "minimum": 0,
                         "description": "Scheduler: honest weekly content hours (planBatchWeek)."},
          "rest_day": {"type": "integer", "minimum": 0, "maximum": 6, "default": 6,
                      "description": "Scheduler: rest day, Mon=0..Sun=6 (non-negotiable)."},
          "task_minutes": {"type": "object",
                         "description": "Scheduler: per-task minutes {long:{film,edit,publish}, short:{film,edit,publish}} — your own timings; blanks fall back to starting estimates."},
      }},
     "Required vs capacity per month (long + short), deltas, and a verdict: surplus (bank it), balanced (no slack), or shortfall (add a shoot day / drop a slot / merge formats).",
     "Logic (assets/js/content-engine.js, UMD — importable in node): batchingMath(opts) — capacity = shoot_days_per_month × videos_per_shoot_day; required = cadence × 52/12 (the honest month); verdict surplus/balanced/shortfall with guidance text. 2.0 adds planBatchWeek({weeklyHours, longsPerWeek, shortsPerWeek, restDay, taskMinutes}) — weekly hours blocked into film/edit/publish day-blocks (8h/day cap, rest day untouched); verdict holds/tight/over with lever guidance. Defaults for task minutes are adjustable starting estimates, not benchmarks. Pure arithmetic on the creator's own inputs — never a promise. Planning aid, not financial/legal/tax advice."),
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
     "Logic (assets/js/money-map.js, UMD — importable in node): placeStage(a) — revenue band maps 0→0, 1-99→1, 100-999→2, 1k-9999→3, 10k-plus→4; if audience is 100k+ and base stage ≤ 2, stage+1 with an 'audience-ahead' note; employees with stage ≤ 2 adds a 'team-ahead' note. roadmap(a) — stage signature move (the stage's #1 tool) + two bottleneck-driven moves, deduped. STAGES carries the full playbook data (goal, 3 moves, trap, graduate). Wow wave 1 adds the Empire Climb: RANKS (RECRUIT/CADET/OPERATIVE/COMMANDER/GENERAL, chevron insignias), RANK_THRESHOLDS [0,100,275,500,775], XP_AWARDS {survey:50, move:25, stage:100, mission:25}; awardXP(store,key,amount,label) is idempotent per key, revokeKey undoes; rankFor/nextRankInfo map totals to ranks; loadClimb/saveClimb persist the cge.empireclimb.v1 journal (one-time migration from the pre-climb store). XP is a work journal \u2014 missions cleared, stages closed \u2014 never money earned; no rank promises revenue. Planning aid, not financial/legal/tax advice."),
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
    ("outreach", "The Outreach Center",
     "Run your sponsor pipeline outbound: track pitches in a CRM-lite, generate honest pitch emails, quote from the 2026 rate card, and flag contract red flags before you sign.",
     "outreach.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "OutreachInput",
      "type": "object", "required": [],
      "properties": {
          "brand": {"type": "string", "description": "Brand being pitched (pipeline + pitch)."},
          "contactName": {"type": "string", "description": "The human being emailed — never 'dear partnerships team'."},
          "email": {"type": "string", "format": "email"},
          "status": {"type": "string", "enum": ["pitched", "replied", "negotiating", "signed", "passed"],
                     "default": "pitched",
                     "description": "Where the outreach sits in the pitched → signed pipeline."},
          "followUpDate": {"type": "string", "format": "date",
                          "description": "YYYY-MM-DD of the single 7-day nudge. One nudge, then move on."},
          "followers": {"type": "number", "minimum": 0,
                       "description": "Follower/subscriber count on the platform being sold (rate calculator)."},
          "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"], "default": "youtube"},
          "deliverable": {"type": "string", "enum": ["integrated", "dedicated", "short"], "default": "integrated"},
          "expectedViews": {"type": "number", "minimum": 0, "default": 0,
                           "description": "Last-10-video average; sponsors buy views, not subs."},
          "pitchTemplate": {"type": "string", "enum": ["cold_pitch", "follow_up_nudge", "warm_intro"]},
          "pitchVars": {"type": "object",
                       "description": "Values for the template's [bracketed] placeholders (your_name, channel_name, avg_views, …). Unfilled placeholders stay visible — never invent stats."},
          "contractFlags": {"type": "array", "items": {"type": "string"},
                           "description": "Checked contract_flags[].id values from data/v1/deal-templates.json."},
      }},
     "Pipeline stats (contacted, response rate, active deals, close rate) + follow-up buckets (overdue / due today / upcoming); rendered pitch email from the 3 templates with unfilled [brackets] left visible; rate-card quote (tier range, top-of-range quote point, 23% expected-close math, CPM cross-check vs the deliverable band); contract risk summary (per-item plain-language fix + clean / caution / don't-sign verdict). All ranges and guidance, never promises.",
     "Engine (assets/js/outreach.js, UMD — importable in node): validDeal(d) validates pipeline records; pipelineStats(deals) computes response/close rates; dueFollowUps(deals, nowIso) buckets follow-ups; quoteCalc(input, rateCard, ruleOfThumb) reads sponsorship_rate_card_2026 (tier ranges, platform multipliers, sponsored_cpms) and sponsorship_rule_of_thumb.dedicated_cpm_range — output carries the ~23% listed-vs-accepted note, the 41% package-discount figure, and the never-a-quote disclaimer; renderPitch(template, vars) fills placeholders and leaves unknown ones visible; contractRisk(ids, contract_flags) scores contract structure (any walk_away flag or 3+ points -> don't sign) with a NOT-legal-advice disclaimer. Templates + contract flags from data/v1/deal-templates.json. Negotiation aid, not financial/legal/tax advice."),
    ("crosspost", "Cross-Post Optimizer",
     "Take one clip to every platform without getting throttled: per-destination adaptation checklists (aspect, captions, hooks, CTAs, disclosure labels) under the Oct-1 originality rules.",
     "crosspost.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "CrossPostInput",
      "type": "object", "required": ["source_platform", "destinations"],
      "properties": {
          "source_platform": {"type": "string", "enum": ["tiktok", "shorts", "reels", "facebook"],
                           "description": "Where the clip lives now."},
          "destinations": {"type": "array", "minItems": 1,
                         "items": {"type": "string", "enum": ["tiktok", "shorts", "reels", "facebook"]},
                         "description": "Where it should go (the source is ignored if included)."},
          "photorealistic_ai": {"type": "boolean", "default": False,
                              "description": "The clip uses photorealistic AI visuals — triggers the YouTube disclosure-label reminder (labeled = normal distribution; undisclosed = reduced recommendations or removal)."},
      }},
     "Per-destination adaptation cards (aspect, captions, hook rework, CTA, audio, disclosure label, one-original-element changes) + the universal checks + the Oct-1 gate reminder. Adaptation guidance under the platforms' stated 2026 rules — never a promise of reach, views, or revenue.",
     "Engine (assets/js/content-engine.js, UMD — importable in node): adaptChecklist(source_platform, destinations) reads the adaptation matrix (12 source→destination rule sets + 6 universal checks); unknown platforms and the source itself are filtered out. Matrix + grammars + gate: data/v1/content-engine.json -> adaptation_matrix. Pairs with the content-repurposing skill. Planning aid, not financial/legal/tax advice."),
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
    ("format-fit", "Format Fit Finder",
     "Six questions about the creator's real situation — experience, weekly hours, on-camera comfort, budget, monetization goal, risk tolerance — scored against the 10 breakout-format dossiers; ranked matches with why-it-fits reasoning, the catch, creator-reported pay ranges, and first 3 moves.",
     "format-fit.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "FormatFitInput",
      "type": "object", "required": ["experience", "weeklyHours", "camera", "budget", "goal", "risk"],
      "properties": {
          "experience": {"type": "string", "enum": ["teacher", "tech", "finance", "legal", "health", "audio", "writer", "operator", "none-yet"],
                     "description": "The creator's real background; none-yet adds a tuition-phase note."},
          "weeklyHours": {"type": "number", "minimum": 1, "maximum": 80,
                        "description": "Honest, repeatable hours per week."},
          "camera": {"type": "string", "enum": ["face", "voice", "hands", "anything"],
                      "description": "On-camera comfort: face = loves camera, voice = voiceover only, hands = show work not face."},
          "budget": {"type": "string", "enum": ["free", "modest", "real"],
                      "description": "Production budget tier: near $0, a few hundred for gear/tools, $500+/mo."},
          "goal": {"type": "string", "enum": ["fast", "mid", "slow"],
                    "description": "Monetization timeline: under 6 months, 6–18 months, 18+ months."},
          "risk": {"type": "string", "enum": ["safe", "balanced", "bold"],
                    "description": "Risk tolerance."},
      }},
     "Ranked matches (score of 13, strong/workable/weak bands) with per-match why-it-fits reasoning, the honest catch from the dossier's risks, creator-reported pay ranges, competition, first 3 moves, per-match mismatch flags, global honesty flags, and the rate-card context. Matching arithmetic only — never a promise of views, revenue, or growth.",
     "Logic (assets/js/format-fit.js, UMD): FORMATS mirrors data/niches.json v2.1.0 breakout_format_dossiers (id, dossier_no order, pay + competition labels — tests pin the sync); axis scores experience(3)/camera(2)/hours(2)/budget(2)/goal(2)/risk(2) = 13 max; camera-clash and hours-mismatch hard penalties; bands strong >=9, workable 6–8, weak <6; ties break by dossier order; global flags for none-yet, <3h/week, and fast-money-plus-play-it-safe. Planning aid, not financial/legal/tax advice."),
    ("deal-builder", "Deal Builder",
     "Turn deliverables into a line-item quote from the 2026 rate card: base fees per deliverable, usage rights, whitelisting, and exclusivity as stacked line items — plus a ready-to-send proposal built from the quote and a deal checklist built from the terms.",
     "deal-builder.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "DealBuilderInput",
      "type": "object", "required": ["followers", "deliverables", "usage"],
      "properties": {
          "followers": {"type": "number", "minimum": 1000,
                     "description": "Follower/subscriber count on the platform being sold (nano floor 1,000)."},
          "deliverables": {"type": "array", "minItems": 1, "maxItems": 8,
                       "items": {"type": "object", "required": ["platform", "kind", "count"],
                                 "properties": {
                                     "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"]},
                                     "kind": {"type": "string", "enum": ["dedicated", "integrated", "short", "ugc"],
                                              "description": "dedicated = brand is the video; integrated = mid-roll slot; short = Short/TikTok/Reel; ugc = creative without posting (Storika UGC band)."},
                                     "count": {"type": "integer", "minimum": 1, "maximum": 12}}},
                       "description": "The package: each deliverable is its own line item."},
          "viewsAvg": {"type": "number", "minimum": 0, "default": 0,
                    "description": "Last-10-video average views; sponsors buy views, not subs. Without it, integrated/short lines price at half the tier band (labeled fallback)."},
          "usage": {"type": "string", "enum": ["organic_only", "paid_3mo", "paid_6mo", "paid_12mo", "perpetual"],
                 "description": "Paid-ad usage tier from calculators.json usage_rights_benchmarks_2026."},
          "whitelistingMonths": {"type": "integer", "minimum": 0, "maximum": 24, "default": 0,
                              "description": "Months the brand runs ads from YOUR account (30–100%/mo of post-fee base)."},
          "exclusivity": {"type": "object",
                       "properties": {
                           "scope": {"type": "string", "enum": ["none", "named", "category"], "default": "none",
                                    "description": "named = named competitors (+25% 30d / +50% 60–90d); category = broad lock, priced to cover lost deals or flagged."},
                           "months": {"type": "integer", "minimum": 0, "maximum": 24, "default": 0}}},
          "affiliate": {"type": "object",
                     "properties": {
                         "include": {"type": "boolean", "default": False},
                         "commissionPct": {"type": "number", "minimum": 0, "maximum": 90, "default": 0,
                                        "description": "Affiliate commission % on top of the flat fee — the bonus, not the deal."}}},
      }},
     "Line-item quote: per-deliverable lines (per-unit + line ranges with the data basis named), post-fee base, usage add-on (+25–50% / +50–75% / +75–100% / perpetual from 2x), whitelisting add-on (30–100%/mo), exclusivity add-on or broad-lock flag, package total, expected landing zone (~23% below the ask), bundle + multi-platform + honesty notes; exclusivity/usage-window conflict flags (walk_away/flag/note levels, incl. the can't-see-other-contracts honesty note); proposal email with unsupplied stats as [brackets] (never invented); 7-group deal checklist (usage, payment, revisions, exclusivity, FTC disclosure, deliverables, walk-away) customized to the quote's terms. All ranges and guidance, never promises.",
     "Engine (assets/js/deal-builder.js, UMD — importable in node): validInput() validates (followers ≥1,000, ≤8 deliverable lines, count 1–12, exclusivity consistency); tierOf() parity-pinned with Outreach.tierOf; deliverableBase() reads sponsorship_rate_card_2026 (dedicated = tier band, integrated/short = sponsored-CPM × viewsAvg with a labeled half-band fallback, ugc = Storika $150–$1,000 single-source); buildQuote() stacks base + usage (usage_rights_benchmarks_2026 tiers) + whitelisting (monthly) + exclusivity (named +25%/+50%, category flagged not invented) — 2-sig-fig rounding, expectedClose ×(1−0.23); exclusivityConflicts() checks window mismatches, perpetual+exclusivity, whitelisting-outliving-lock, UGC+affiliate edges; buildChecklist() generates the 7-group checklist from the quote; renderPitch() writes the proposal with [bracket] placeholders. Negotiation aid — not financial, legal, or tax advice; the checklist is not legal advice. See AGENT.md Workflow 14."),
    ("negotiation-kit", "The Negotiation Kit",
     "The words and the math for a live negotiation: a counter-offer builder grounded in the 2026 rate card with the typical-quote evidence shown (reported vs modeled, kept apart), six ready-to-send reply scripts, and a walk-away panel tied to your own Deal Room pipeline numbers.",
     "negotiation-kit.html",
     {"$schema": "http://json-schema.org/draft-07/schema#", "title": "NegotiationKitInput",
      "type": "object", "required": ["platform", "deliverable", "followers", "offer"],
      "properties": {
          "brand": {"type": "string", "description": "Brand making the offer (used in the reply scripts)."},
          "platform": {"type": "string", "enum": ["youtube", "tiktok", "instagram"]},
          "deliverable": {"type": "string", "enum": ["integrated", "dedicated", "short", "ugc"],
                          "description": "Integrated slot, dedicated video, short-form video, or UGC without posting."},
          "followers": {"type": "number", "minimum": 1000,
                        "description": "Follower/subscriber count on the platform being sold (nano floor 1,000)."},
          "expectedViews": {"type": "number", "minimum": 0, "default": 0,
                            "description": "Last-10-video average; enables the implied-CPM check."},
          "offer": {"type": "number", "minimum": 0,
                    "description": "The brand's offered fee in USD. 0 = an exposure-only offer."},
          "niche": {"type": "string",
                    "enum": ["finance_investing", "tech_software", "education", "health_fitness",
                             "lifestyle", "gaming", "comedy_entertainment", "music", "kids",
                             "asmr", "creator_economy", "challenges_stunts", "ai_ml",
                             "true_crime", "entertainment", "science"],
                    "description": "Optional sponsor niche key — adjusts the benchmark range by the shared niche multiplier table."},
          "usage": {"type": "string", "enum": ["organic_only", "paid_3mo", "paid_6mo", "paid_12mo", "perpetual"],
                    "default": "organic_only",
                    "description": "Paid-ad usage in the offer, from calculators.json usage_rights_benchmarks_2026."},
          "whitelistingMonths": {"type": "integer", "minimum": 0, "maximum": 24, "default": 0,
                              "description": "Months of whitelisting the brand asks for (30–100%/mo of the counter base)."},
          "exclusivity": {"type": "object",
                          "properties": {
                              "scope": {"type": "string", "enum": ["none", "named", "category"], "default": "none"},
                              "months": {"type": "integer", "minimum": 0, "maximum": 24, "default": 0}}},
          "postCount": {"type": "integer", "minimum": 1, "maximum": 12, "default": 1,
                        "description": "Posts in the deal — 3+ triggers the bundle-discount note."},
          "creatorFloor": {"type": "number", "minimum": 0, "default": 0,
                           "description": "Your own walk-away floor in USD; the panel takes the higher of this and the rate-card floor."},
      }},
     "Counter-offer: niche-adjusted tier range and verdict on the offer, implied-CPM position against the deliverable's reported band, the typical-quote / typical-ask evidence (Cheerful Sep-2026, reported) and the modeled Instagram feed-post cross-check (Click Analytic 2026, labeled modeled) — null where no format maps honestly; line items (post fee at the top of the range + usage + whitelisting + named exclusivity, each with its basis), counter total, expected landing zone (~23% below the ask), and the broad-exclusivity flag. Walk-away panel: your floor (higher of rate-card floor and your own floor), your Deal Room pipeline totals (committed / paid / average paid / still open — your numbers only), and a stance on this offer. Six editable reply scripts (counter, lowball, exposure-only, usage rights, whitelisting, late payment) filled from the counter's numbers, plus a one-page negotiation brief. A model, not a prediction; never a guarantee.",
     "Engine (assets/js/negotiation-kit.js, UMD — importable in node): validInput() validates; buildCounter(input, calculatorsJson) reads sponsorship_rate_card_2026 + sponsorship_quoted_prices_2026 + usage_rights_benchmarks_2026 (calculators v1.5.0) — niche multiplier parity-pinned with DealRoom/DealAnalyzer, quoted-price format map shared with the Deal Room, unmapped formats return null evidence; walkAwayPanel(input, dealRoomDeals, calculatorsJson) totals the creator's own pipeline with no invented close probabilities; renderReply(script, vars) fills {{placeholders}} from deal-templates.json negotiation_kit_scripts (v1.2.0) and leaves unknown ones visible; replyVars(counter, extra) carries the counter's numbers into the scripts; exportBrief(counter, walk) renders the plaintext brief. Negotiation aid — not financial, legal, or tax advice. See AGENT.md Workflow 15."),
]

# Tools hub (wave 9): grouped card index. Per tool: icon, "use when" one-liner,
# best-for tags. Groups: PLAN / MONEY / CONTENT (order within group = TOOLS order).
TOOL_HUB_META = {
    "quiz":          ("◉", "PLAN",    "cyan", "you're starting out and don't know what to make yet.",
                      ["starting out", "undecided", "Phase 0"]),
    "planner":       ("▦", "PLAN",    "cyan", "you need a posting schedule you can actually keep.",
                      ["consistency", "cadence", "Phase 1"]),
    "simulator":     ("◬", "PLAN",    "cyan", "you want to see 12–36 months of growth and revenue — scenarios, A/B, team costs, what-if events — before you live them.",
                      ["what-if", "projections", "Phases 2 · 5 · 8"]),
    "calculator":    ("∑", "MONEY",   "gold", "you want honest revenue ranges from your current views.",
                      ["ads", "sponsors", "ranges"]),
    "deal-analyzer": ("⚖", "MONEY",   "gold", "a brand made an offer and your gut isn't sure.",
                      ["negotiation", "rate card", "Phase 5"]),
    "deal-room":     ("▤", "MONEY",   "gold", "you want to manage a deal from offer to paid, not just analyze it once.",
                      ["deal pipeline", "scripts", "Phase 5"]),
    "hiring-calculator": ("⚒", "MONEY", "gold", "you're about to hire someone and want the real numbers first.",
                      ["first hire", "costs", "Phase 7 · 8"]),
    "repurpose":     ("⇄", "CONTENT", "stamp", "one good idea should feed five platforms.",
                      ["SOP", "short-form", "Phase 3"]),
    "api-explorer":  ("⌗", "CONTENT", "stamp", "you're building on the empire's data and want every endpoint.",
                      ["agents", "JSON", "no key"]),
    "hook-builder":  ("⌖", "CONTENT", "stamp", "you have a topic and need the first 3 seconds to win.",
                      ["hooks", "short-form", "Playbook"]),
    "idea-bank":     ("✦", "CONTENT", "stamp", "your ideas are scattered and you need them scored before production.",
                      ["hooks", "pipeline", "Phase 1"]),
    "content-calendar": ("▦", "CONTENT", "stamp", "you need your ideas dealt into a schedule you can actually keep.",
                      ["dealing", "sponsors", "Phase 1"]),
    "batching": ("◫", "CONTENT", "stamp", "you want to know if your shoot days really cover your cadence.",
                      ["film days", "capacity", "Phase 1"]),
    "money-map": ("⌂", "PLAN", "gold", "you want to know where you stand, earn XP, and climb Field Manual ranks.",
                      ["roadmap", "stages", "Phases 0 · 8"]),
    "video-doctor":    ("\u271a", "CONTENT", "stamp", "your numbers are telling you something but you can't read them yet.",
                      ["diagnosis", "retention", "Phases 1 · 2"]),
    "ypp-checker":     ("◈", "MONEY", "gold", "YPP changes on Feb 1, 2027 — see where you stand under both rule sets.",
                      ["monetization", "YPP", "Phase 5"]),
    "outreach":        ("\u2709", "MONEY",   "gold", "you're pitching brands outbound and need the whole command center.",
                      ["outreach", "pitch pipeline", "Phase 5"]),
    "crosspost":       ("⧉", "CONTENT", "stamp", "one clip needs to live natively on four platforms.",
                      ["adaptation", "cross-post", "Phase 3"]),
    "cadence":         ("◷", "PLAN",    "cyan", "you keep asking how often to post and the answer starts with your hours.",
                      ["consistency", "schedule", "Phase 1"]),
    "format-fit":      ("⌑", "PLAN",    "cyan", "you have a real situation and want the breakout format that fits it.",
                      ["format fit", "assessment", "Phase 1"]),
    "deal-builder":    ("◊", "MONEY",   "gold", "you're building a sponsor package and need the line-item quote, the proposal, and the checklist.",
                      ["quote", "sponsorship package", "Phase 5"]),
    "negotiation-kit": ("✎", "MONEY",   "gold", "a brand replied and you need the counter, the exact words, and your walk-away number before you answer.",
                      ["counter-offer", "reply scripts", "Phase 5"]),
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

# ---------- wave B: Algorithm Watch feed page ("what changed") ----------
# The feed surface for the creator-algwatch service. Entries are pre-rendered
# from data/changes.json (newest-first) so the page is fully usable with
# JavaScript disabled; assets/js/changes-feed.js swaps in /api/changes data
# when the server is reachable (fetchWithFallback, §3). Markup here MUST match
# entryHtml() in assets/js/changes-feed.js or the live swap visibly shifts.

AW_PLATFORM_LABELS = {
    "youtube": "YouTube", "tiktok": "TikTok", "instagram": "Instagram",
    "facebook": "Facebook", "x": "X", "twitch": "Twitch", "other": "Other",
}
AW_PLATFORM_ORDER = ["youtube", "tiktok", "instagram", "facebook", "x", "twitch", "other"]

_AW_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def _aw_date_label(iso):
    """'2026-09-17T00:00:00Z' -> 'Sep 17, 2026'. '' for anything unparseable."""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", str(iso or ""))
    if not m:
        return ""
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return ""
    return f"{_AW_MONTHS[mo - 1]} {d}, {y}"

def _aw_dates_html(c):
    """Announced / effective / logged line — only the dates the entry
    actually carries. Must match datesHtml() in changes-feed.js."""
    parts = []
    ann = _aw_date_label(c.get("announced_at"))
    eff = _aw_date_label(c.get("effective_at"))
    det = _aw_date_label(c.get("detected_at"))
    if ann:
        parts.append(f"Announced {ann}")
    if eff:
        parts.append(f"Takes effect {eff}")
    if det:
        parts.append(f"Logged {det}")
    if not parts:
        return ""
    return f'<p class="aw-dates">{" · ".join(esc(p) for p in parts)}</p>'

def _aw_entry_html(c):
    plat = (c.get("platform") or "other")
    cat = (c.get("category") or "policy")
    conf = c.get("confidence", "single-source")
    conf_cls = "aw-chip-verified" if conf == "verified" else "aw-chip-single"
    conf_label = "Verified" if conf == "verified" else "Single-source"
    src_items = ""
    for s in (c.get("sources") or []):
        name = esc(s.get("name", "source"))
        url = s.get("url", "")
        if isinstance(url, str) and re.match(r"^https?://", url, re.I):
            link = f'<a href="{esc(url)}" rel="noopener">{name}</a>'
        else:
            link = f"<span>{name}</span>"
        src_items += f'<li><span class="aw-src-tag" aria-hidden="true">SRC</span>{link}</li>'
    src_html = f'<ul class="aw-sources" aria-label="Sources">{src_items}</ul>' if src_items else ""
    det = str(c.get("detected_at", ""))[:10] or "date unknown"
    return (
        f'<li class="aw-entry brk" data-platform="{esc(plat)}">'
        '<b class="brk-x" aria-hidden="true"></b>'
        f'<div class="aw-entry-head"><h2>{esc(c.get("title", "Untitled change"))}</h2>'
        f'<span class="aw-date">{esc(det)}</span></div>'
        '<div class="aw-chips">'
        f'<span class="aw-chip aw-chip-platform">{esc(AW_PLATFORM_LABELS.get(plat, plat.capitalize()))}</span>'
        f'<span class="aw-chip aw-chip-category">{esc(cat.capitalize())}</span>'
        f'<span class="aw-chip {conf_cls}">{conf_label}</span>'
        "</div>"
        f'<p class="aw-summary">{esc(c.get("summary", ""))}</p>'
        f"{_aw_dates_html(c)}"
        f"{src_html}</li>"
    )

def _build_what_changed():
    """Render site/what-changed.html from data/changes.json."""
    doc = json.loads((DATA / "changes.json").read_text(encoding="utf-8"))
    rows = sorted(doc.get("changes", []), key=lambda c: str(c.get("detected_at", "")), reverse=True)
    gen = str(doc.get("generated_at", ""))[:16].replace("T", " ")
    counts = {}
    for c in rows:
        p = c.get("platform") or "other"
        counts[p] = counts.get(p, 0) + 1
    plats = [p for p in AW_PLATFORM_ORDER if p in counts] + sorted(set(counts) - set(AW_PLATFORM_ORDER))
    filter_btns = ['<button type="button" class="aw-filter" data-aw-platform="all" aria-pressed="true">All</button>']
    for p in plats:
        label = AW_PLATFORM_LABELS.get(p, p.capitalize())
        filter_btns.append(
            f'<button type="button" class="aw-filter" data-aw-platform="{esc(p)}" '
            f'aria-pressed="false">{esc(label)} · {counts[p]}</button>')
    entries_html = "".join(_aw_entry_html(c) for c in rows) or \
        '<li class="aw-empty" role="status">No changes in the feed yet — the watch is running, the log is just quiet.</li>'
    # Coverage panel: every platform slot the watch claims to cover, with
    # its entry count and newest logged date — or an honest "no entry"
    # line. A platform with zero entries must look uncovered, not hidden.
    newest = {}
    for c in rows:
        p = c.get("platform") or "other"
        d = str(c.get("detected_at", ""))[:10]
        if p not in newest or d > newest[p]:
            newest[p] = d
    cov_rows = ""
    for p in AW_PLATFORM_ORDER:
        label = AW_PLATFORM_LABELS.get(p, p.capitalize())
        n = counts.get(p, 0)
        if n:
            cov_rows += (
                f'<li class="aw-cov-row"><span class="aw-cov-plat">{esc(label)}</span>'
                f'<span class="aw-cov-n">{n} {"entry" if n == 1 else "entries"}</span>'
                f'<span class="aw-cov-date">newest {esc(_aw_date_label(newest.get(p, "")) or "—")}</span></li>')
        else:
            cov_rows += (
                f'<li class="aw-cov-row aw-cov-empty"><span class="aw-cov-plat">{esc(label)}</span>'
                '<span class="aw-cov-n">No entry in the current window</span>'
                '<span class="aw-cov-date">standing rules: Platform Rules Bible §13</span></li>')
    coverage_html = (
        '<section class="aw-coverage" aria-labelledby="aw-cov-h">'
        '<h2 id="aw-cov-h" class="aw-sec-h">Coverage — what this watch actually covers</h2>'
        f'<ul class="aw-cov" data-aw-coverage>{cov_rows}</ul>'
        '<p class="aw-cov-note">Spotify and industry-wide changes have no slot of their '
        'own — they are logged under <strong>Other</strong>, and their standing rules live in the '
        'Platform Rules Bible §13. A slot with no entry is shown as no entry; the watch does not '
        'pad a quiet platform with old news.</p></section>')
    extra = (
        '<link rel="stylesheet" href="assets/css/api-badge.css">'
        '<link rel="stylesheet" href="assets/css/what-changed.css">'
        '<script defer src="assets/js/api-client.js"></script>'
        '<script defer src="assets/js/changes-feed.js"></script>'
    )
    body = (
        '<div class="aw-wrap" data-changes-feed>'
        '<p class="fm-kicker"><strong>ALGORITHM WATCH</strong><span class="sep">//</span>INTEL FEED</p>'
        '<div class="aw-head-row"><h1>What changed</h1>'
        '<span class="api-badge" id="aw-badge" role="status" aria-live="polite" tabindex="0" '
        'title="Feed status. Without JavaScript this shows the last published static feed.">static feed</span></div>'
        '<p class="lede">Platforms move the rules that decide what you earn. <strong>This page logs '
        'every algorithm, policy, and monetization change that matters — dated, sourced, and labeled '
        'with its confidence</strong> — so a rule change never reaches you through a rumor.</p>'
        '<p class="aw-actions"><a class="btn btn-primary" href="#aw-feed-list">Read the newest change ↓</a> '
        '<a class="btn btn-ghost" href="deal-room.html#dr-sec-watch">Price a deal against it →</a></p>'
        f'<p class="aw-updated" data-aw-updated>Feed data last published · generated {esc(gen)} UTC</p>'
        '<p class="aw-status" data-aw-status role="status" hidden></p>'
        + coverage_html +
        '<div class="aw-filters" data-aw-filters role="group" aria-label="Filter by platform">' +
        "".join(filter_btns) + "</div>"
        f'<p class="aw-count" data-aw-count>{len(rows)} {"change" if len(rows) == 1 else "changes"} · 90-day window</p>'
        f'<ul class="aw-feed" id="aw-feed-list" data-aw-list>{entries_html}</ul>'
        '<div class="aw-note" role="note"><p class="muted"><strong>How to read this feed.</strong> '
        f'{esc(doc.get("disclaimer", ""))} '
        "Entries older than 90 days roll off — this is a watch log, not an archive. "
        "Verify platform figures live before acting on them.</p></div>"
        '<p class="aw-window">RETENTION 90D · REFRESHED DAILY BY THE ALGORITHM-WATCH CRON · LIVE AT /api/changes</p>'
        "</div>"
    )
    (SITE / "what-changed.html").write_text(
        page_template("What Changed", body, active="", extra_head=extra), encoding="utf-8")
    return len(rows)

# ---------- end wave B ----------

def page_template(title, body, active="", extra_head=""):
    desktop_nav = "".join(
        f'<a href="{href}" class="nav-link{" active" if href == active else ""}"><span class="nav-n">{i + 1:02d}</span>{label}</a>'
        for i, (href, label) in enumerate(DESKTOP_NAV_LINKS)
    )
    mobile_nav = "".join(
        f'<a href="{href}" class="nav-link{" active" if href == active else ""}"><span class="nav-n">{i + 1:02d}</span>{label}</a>'
        for i, (href, label) in enumerate(MOBILE_NAV_LINKS)
    )
    nav = desktop_nav  # historical name kept for the mobile fallback below
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>try{{if(localStorage.getItem("cge.calm")==="1")document.documentElement.setAttribute("data-calm","1");}}catch(e){{}}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} — {SITE_NAME}</title>
<meta name="description" content="{esc(TAGLINE)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONT_URL}" rel="stylesheet">
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/motifs.css">
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/layout.css">
<link rel="stylesheet" href="assets/css/components.css">
<link rel="stylesheet" href="assets/css/hub.css">
{extra_head}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="brand" href="index.html"><span class="brand-plate" aria-hidden="true">CG</span> {SITE_NAME}</a>
  <nav class="site-nav" aria-label="Primary">{desktop_nav}</nav>
  <button class="calm-toggle" id="calmToggle" aria-pressed="false" title="Calm mode — stop ambient motion"><span class="calm-glyph" aria-hidden="true">◍</span><span>CALM</span></button>
  <button class="nav-toggle" aria-expanded="false" aria-controls="mobileNav" aria-label="Menu">☰</button>
</header>
<nav id="mobileNav" class="mobile-nav" aria-label="Mobile">{mobile_nav}</nav>
<main id="main">{body}</main>
<footer class="site-footer">
  <div class="footer-grid">
    <div>
      <div class="foot-brand"><span class="brand-plate" aria-hidden="true">CG</span> {SITE_NAME}</div>
      <p class="muted">{esc(TAGLINE)}</p>
      <div class="chit-row" style="margin:1rem 0 0">
        <span class="chit chit-ghost">No guru hype</span>
        <span class="chit chit-ghost">2026 verified</span>
        <span class="chit chit-ghost">Field manual</span>
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
      <a href="deal-analyzer.html">The Deal Analyzer</a>
      <a href="hiring-calculator.html">Hiring Cost Calculator</a>
      <a href="repurpose.html">Repurposing Planner</a>
      <a href="simulator.html">Empire Simulator</a>
      <a href="money-map.html">The Money Map</a>
      <a href="api-explorer.html">API Explorer</a>
      <a href="what-changed.html">Algorithm Watch</a>
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
  <div class="footer-fine"><span class="stamp stamp-sm" aria-hidden="true">CLEARED</span><span>PRIVATE RESEARCH ARCHIVE · PLATFORM FACTS VERIFIED OCT 2026 — VERIFY LIVE BEFORE ACTING · NOT FINANCIAL, LEGAL, OR TAX ADVICE · SET IN THE FIELD, PRINTED ON RECYCLED PIXELS</span></div>
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
    DATA_V1.mkdir(parents=True, exist_ok=True)
    (DATA_V1 / "schema").mkdir(exist_ok=True)

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
        rank = PHASE_RANKS[idx]
        # mission briefing: stencil title, NATO-style entry number, rank insignia,
        # dossier meta strip. The phase's rank ladder is the badge of the climb.
        hero = (f'<header class="chapter-hero scan-sweep" style="--phase-accent: var(--{accent});">'
                f'<span class="chapter-num" aria-hidden="true">{idx}</span>'
                f'<p class="chapter-kicker fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>ENTRY {lvl}<span class="sep">//</span>{phase.upper()}</p>'
                f"<h1>{hero_title}</h1>"
                + (f'<p class="lede">{briefing}</p>' if briefing else "")
                + f'<p class="chapter-meta-strip"><span>{read_min} min read</span><span class="sep">/</span>'
                f'<span>{wc:,} words</span><span class="sep">/</span><span>LVL {lvl}</span></p>'
                f'<div class="briefing-rank">{_rank_chevrons(idx + 1)}'
                f'<span class="fm-readout">RANK // {rank}</span></div></header>')
        # chapter end-nav: next-phase mission cards
        cnav = '<nav class="chapter-nav" aria-label="Phases">'
        if idx > 0:
            ps, _, pphase, pshort = CHAPTERS[idx-1]
            cnav += (f'<a href="{ps}.html"><span class="nav-dir">← Prev operation</span>'
                     f'<span class="nav-title">{pphase}: {esc(pshort)}</span></a>')
        else:
            cnav += '<a href="index.html"><span class="nav-dir">← Return to</span><span class="nav-title">The Empire Map</span></a>'
        if idx < len(CHAPTERS) - 1:
            ns, _, nphase, nshort = CHAPTERS[idx+1]
            cnav += (f'<a class="nav-next" href="{ns}.html"><span class="nav-dir">Next operation →</span>'
                     f'<span class="nav-title">{nphase}: {esc(nshort)}</span></a>')
        else:
            cnav += '<a class="nav-next" href="quiz.html"><span class="nav-dir">Next step →</span><span class="nav-title">Pick your niche</span></a>'
        cnav += "</nav>"
        # money-map ribbon (wave 18): every pillar chapter links to the capstone map
        cnav += ('<div class="map-ribbon" role="note">'
                 '<strong>⌖ Lost in the climb?</strong>'
                 '<span>See where this phase fits on <a href="money-map.html">The Money Map</a> — 7 questions, your stage, your next 3 moves.</span>'
                 '<a class="btn btn-ghost" href="money-map.html">Open the map →</a></div>')
        # wave 30: radar section map — anchor ids on every h2 + a dossier nav
        # that tracks reading position (sidebar on desktop, disclosure on mobile)
        body_html, map_items = _add_h2_ids(body_html)
        raside, rdetails = _radar_map(map_items)
        page = page_template(f"{phase}: {short}",
                             f'<div class="chapter-with-map">{raside}'
                             f'<article class="chapter">{hero}{rdetails}{body_html}{cnav}</article></div>',
                             active="")
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
        hero = (f'<header class="chapter-hero scan-sweep" style="--phase-accent: var(--gold);">'
                f'<p class="chapter-kicker fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>INTEL FILE<span class="sep">//</span>{esc(badge).upper()}</p>'
                f"<h1>{hero_title}</h1>"
                + (f'<p class="lede">{briefing}</p>' if briefing else "")
                + f'<p class="chapter-meta-strip"><span>{read_min} min read</span><span class="sep">/</span>'
                f'<span>{wc:,} words</span><span class="sep">/</span><span>CLEARANCE // ALL</span></p>'
                f'<div class="briefing-rank"><span class="stamp stamp-gold stamp-sm stamp-slam" data-slam="1">VERIFIED</span></div></header>')
        cnav = ('<nav class="chapter-nav" aria-label="Phases">'
                '<a href="index.html"><span class="nav-dir">← Return to</span><span class="nav-title">The Empire Map</span></a>'
                '<a class="nav-next" href="phase-5-monetization-stack.html"><span class="nav-dir">Next operation →</span>'
                '<span class="nav-title">Phase 5: The Monetization Stack</span></a></nav>')
# (reference-page loop continues below)
        mount = NICHE_EXPLORER_MOUNT if slug == "niche-atlas" else ""
        if slug == "metrics-glossary":
            mount = METRICS_CURVE_MOUNT
        # wave 14/28: page scripts load deferred — they ran dead in <head>
        # before the DOM existed (audit fix, wave 30)
        extra_head = "".join(f'<script defer src="{s}"></script>' for s in scripts)
        # wave 30: radar section map, same as chapters (the bible keeps its own
        # in-article "What's inside" TOC; the sidebar mirrors the same sections)
        body_html, map_items = _add_h2_ids(body_html)
        raside, rdetails = _radar_map(map_items)
        page = page_template(f"{short}",
                             f'<div class="chapter-with-map">{raside}'
                             f'<article class="chapter">{hero}{rdetails}{body_html}{mount}{cnav}</article></div>',
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
        hero = (f'<header class="chapter-hero scan-sweep" style="--phase-accent: var(--gold);">'
                f'<p class="chapter-kicker fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>DOSSIER<span class="sep">//</span>{esc(badge).upper()}</p>'
                f"<h1>{hero_title}</h1>"
                + (f'<p class="lede">{briefing}</p>' if briefing else "")
                + f'<p class="chapter-meta-strip"><span>{read_min} min read</span><span class="sep">/</span>'
                f'<span>{wc:,} words</span></p></header>')
        cnav = ('<nav class="chapter-nav" aria-label="Phases">'
                '<a href="index.html"><span class="nav-dir">← Return to</span><span class="nav-title">The Empire Map</span></a>'
                f'<a class="nav-next" href="{nxt[0]}.html"><span class="nav-dir">Next →</span>'
                f'<span class="nav-title">{esc(nxt[1])}</span></a></nav>')
        nav_active = "case-files.html" if badge == "Case File" else f"{slug}.html"
        page = page_template(short, f'<article class="chapter">{hero}{body_html}{cnav}</article>', active=nav_active)
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")
        mdpage_meta.append({"id": slug, "badge": badge, "title": short,
                            "path": f"{slug}.html", "words": wc, "read_minutes": read_min,
                            "lede": _lede_text(briefing)})
        llms_full_parts.append(f"# {badge}: {short}\n\n{md}")

    # tool pages
    TOOL_SCRIPTS = {
        "quiz": ["assets/js/quiz.js"],
        "calculator": ["assets/js/calculator.js"],
        "planner": ["assets/js/planner.js"],
        "deal-analyzer": ["assets/js/deal-analyzer.js", "assets/js/deal-analyzer-ui.js"],
        "deal-room": ["assets/js/deal-room.js", "assets/js/deal-room-ui.js"],
        "hiring-calculator": ["assets/js/hiring-calculator.js"],
        "repurpose": ["assets/js/content-engine.js", "assets/js/repurpose.js"],
        "simulator": ["assets/js/sim-engine.js", "assets/js/money-map.js",
                      "assets/js/simulator.js", "assets/js/simulator-launch.js"],
        "api-explorer": ["assets/js/api-explorer.js"],
        "hook-builder": ["assets/js/hook-builder.js"],
        "idea-bank": ["assets/js/content-engine.js", "assets/js/idea-bank-ui.js"],
        "content-calendar": ["assets/js/content-engine.js", "assets/js/content-calendar-ui.js"],
        "batching": ["assets/js/content-engine.js", "assets/js/batching-ui.js"],
        "money-map": ["assets/js/money-map.js"],
        "video-doctor": ["assets/js/video-doctor.js"],
        "ypp-checker": ["assets/js/ypp-checker.js"],
        "outreach": ["assets/js/outreach.js", "assets/js/outreach-ui.js"],
        "crosspost": ["assets/js/content-engine.js", "assets/js/crosspost-ui.js"],
        "cadence": ["assets/js/cadence.js", "assets/js/cadence-ui.js"],
        "format-fit": ["assets/js/format-fit.js", "assets/js/format-fit-ui.js"],
        "deal-builder": ["assets/js/deal-builder.js", "assets/js/deal-builder-ui.js"],
        "negotiation-kit": ["assets/js/negotiation-kit.js", "assets/js/negotiation-kit-ui.js"],
    }
    TOOL_CSS = {
        "money-map": ["assets/css/moneymap.css"],
        "simulator": ["assets/css/simlaunch.css"],
        "video-doctor": ["assets/css/videodoctor.css"],
        "ypp-checker": ["assets/css/yppchecker.css"],
        "cadence": ["assets/css/cadence.css"],
        "format-fit": ["assets/css/format-fit.css"],
        "deal-builder": ["assets/css/deal-builder.css"],
        "negotiation-kit": ["assets/css/negotiation-kit.css"],
        "deal-room": ["assets/css/deal-room.css"],
    }
    for slug, title, desc in TOOLS:
        body_src = PAGES / f"{slug}.html"
        tool_body = body_src.read_text(encoding="utf-8") if body_src.exists() else f"<p>{esc(desc)}</p>"
        extra = ""
        if slug in TOOL_SCRIPTS:
            # deferred: these scripts query the DOM at load; in <head> without
            # defer they ran before the body existed and silently no-op'd
            # (audit fix, wave 30 — execution order is preserved by defer)
            extra = "".join(f'<script defer src="{src}"></script>' for src in TOOL_SCRIPTS[slug])
        if slug in TOOL_CSS:
            extra += "".join(f'<link rel="stylesheet" href="{href}">' for href in TOOL_CSS[slug])
        tool_idx = [t[0] for t in TOOLS].index(slug)
        tier = {"PLAN": 1, "MONEY": 2, "CONTENT": 3}[TOOL_HUB_META[slug][1]]
        tier_name = TOOL_HUB_META[slug][1]
        hud_open = (f'<div class="tool-page"><div class="hud-panel brk brk-gold"><b class="brk-x" aria-hidden="true"></b><div class="hud-head">'
                    f'<span>MISSION BRIEFING // TOOL {tool_idx + 1:02d} — {esc(title).upper()}</span>'
                    f'<span class="hud-status">SYSTEMS ONLINE</span></div>'
                    f'<div class="hud-body"><p class="fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>DIVISION {tier_name}</p>'
                    f"<h1>{esc(title)}</h1><p class=\"lede\">{esc(desc)}</p>"
                    f'<div class="briefing-rank">{_rank_chevrons(tier)}<span class="fm-readout">TIER {tier} // {tier_name}</span></div>'
                    "</div></div>")
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

    # ---- Algorithm Watch feed page (wave B): pre-rendered from data/changes.json,
    #      live-updated from /api/changes when the server is reachable ----
    n_changes = _build_what_changed()

    # ---- hub pages (wave 9): tools hub + case-files hub ----
    def hub_hero(kicker, title_words, lede, accent):
        words = title_words.split()
        hero_title = ((" ".join(esc(w) for w in words[:-1]) + ' <span class="accent-word">' +
                       esc(words[-1]) + "</span>") if len(words) > 1 else esc(title_words))
        return (f'<header class="chapter-hero scan-sweep" style="--phase-accent: var(--{accent});">'
                f'<p class="chapter-kicker fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>{esc(kicker)}</p>'
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
            tier = {"PLAN": 1, "MONEY": 2, "CONTENT": 3}[group]
            tag_html = "".join(f"<li>{esc(t)}</li>" for t in tags)
            cards += (
                f'<a class="brief-card brk" style="--card-accent: var(--{accent});" href="{slug}.html">'
                f'<b class="brk-x" aria-hidden="true"></b>'
                f'<span class="folder-tab" aria-hidden="true">BRIEF {n:02d}</span>'
                f'<div class="brief-head"><span class="brief-id">FM // TOOL {n:02d}</span>'
                f'<span class="brief-status">{group}</span></div>'
                f'<div class="brief-body"><div class="brief-icon-row">'
                f'<span class="brief-icon" aria-hidden="true">{esc(icon)}</span>'
                f"<h3>{esc(tool_titles[slug])}</h3></div>"
                f'<p class="brief-usage"><strong>Use when</strong> {esc(use_when)}</p></div>'
                f'<ul class="brief-tags" aria-label="Best for">{tag_html}</ul>'
                f'<div class="brief-foot">{_rank_chevrons(tier, sm=True)}'
                f'<span class="brief-go">Launch →</span></div></a>')
        hub_sections += (
            f'<section class="hub-group" aria-label="{group} tools">'
            f'<div class="hub-group-head" style="--card-accent: var(--{g_accent});">'
            f'<span class="folder-tab" aria-hidden="true">DIVISION // {group}</span>'
            f"<h2>{group}</h2>"
            f'<span class="hub-kicker">{esc(group_sub)}</span>'
            f'<span class="hub-rule" aria-hidden="true"></span>'
            f"<p>{esc(group_desc)}</p></div>"
            f'<div class="brief-grid">{cards}</div></section>')
    tools_body = (
        hub_hero("COMMAND CENTER", "All Tools",
                 f"{len(TOOLS)} field tools, one command center. Pick the briefing that matches where you are.",
                 "cyan")
        + hub_sections
        + '<section class="section honesty"><h2>Pick by job, not by shine</h2>'
        "<p>Every tool on this page reads the same 2026 research the rest of the site is built on. "
        "Start with the Niche Picker if you're undecided, the Revenue Calculator if you have views, "
        "and The Deal Analyzer the moment a brand emails you. "
        "Not sure where you stand at all? Take <a href=\"money-map.html\">The Money Map</a> — "
        "7 questions, your stage, your next 3 moves.</p></section>")
    (SITE / "tools.html").write_text(page_template("All Tools", tools_body, active="tools.html"), encoding="utf-8")

    # case-files hub: sourced headline cards + comparison table
    case_meta_by_id = {m["id"]: m for m in mdpage_meta if m["badge"] == "Case File"}
    case_cards = ""
    for i, c in enumerate(CASE_HUB):
        m = case_meta_by_id[c["id"]]
        case_cards += (
            f'<a class="brief-card brk" style="--card-accent: var(--gold);" href="{m["path"]}">'
            f'<b class="brk-x" aria-hidden="true"></b>'
            f'<span class="folder-tab folder-tab-gold" aria-hidden="true">CASE FILE {i + 1:02d}</span>'
            f'<div class="brief-head"><span class="brief-id">FM // DOSSIER {i + 1:02d}</span>'
            f'<span class="brief-status">{m["read_minutes"]} MIN READ</span></div>'
            f'<div class="brief-body"><h3>{esc(m["title"])}</h3>'
            f'<p class="brief-stat">{esc(c["headline"])}</p>'
            f'<p class="brief-stat-sub">{esc(c["stat"])}</p>'
            f'<p class="brief-source">Source: {esc(c["source"])}</p></div>'
            f'<div class="brief-foot">{_rank_chevrons(3, sm=True)}'
            f'<span class="brief-go">Read the file →</span></div></a>')
    case_rows = "".join(
        f'<tr><th scope="row"><a href="{case_meta_by_id[c["id"]]["path"]}">{esc(case_meta_by_id[c["id"]]["title"])}</a></th>'
        f"<td>{esc(c['niche'])}</td><td>{esc(c['primary'])}</td>"
        f"<td>{esc(c['team'])}</td><td>{esc(c['timeline'])}</td></tr>"
        for c in CASE_HUB)
    case_body = (
        hub_hero("DOCUMENTED DECONSTRUCTIONS", "Case Files",
                 "Seven real creator businesses, taken apart: the stack, the decisions, the numbers — reported, not audited.",
                 "gold")
        + '<section class="hub-group" aria-label="Case files">'
        f'<div class="brief-grid">{case_cards}</div></section>'
        + '<section class="hub-group" aria-label="Comparison table">'
        + '<div class="hub-group-head" style="--card-accent: var(--gold);">'
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
    GROUP_TIER_COLOR = {"PLAN": "var(--cyan)", "MONEY": "var(--gold)", "CONTENT": "var(--stamp)"}
    # makeover: the 9 phases as a campaign trail - one <details> per phase,
    # exclusive via name= (plain-HTML-first, no JS, keyboard-native).
    PHASE_LEDES = [
        "Zero audience, zero budget, zero excuses. Pick the niche, set up the accounts, ship the first ten.",
        "The system that turns one idea into a week of output. Batch it, template it, repeat it \u2014 this is where consistency gets manufactured.",
        "Click and stay. Packaging, retention, the algorithm's two questions \u2014 the highest-leverage skill on the internet.",
        "One pillar, five platforms. Repurpose without re-uploading, and survive the originality era the platforms all converged on.",
        "Viewers watch. Communities stay, pay, and recruit. The unsexy work that makes everything else compound.",
        "Ads, sponsors, affiliates, products \u2014 layered in the right order. Read it twice; everyone reads it once and skips ahead.",
        "Your name as an asset. When merch makes sense, when it doesn't, and the margins nobody posts about.",
        "LLC, taxes, separate the money. The boring paperwork that keeps the exciting part legal. Educational \u2014 not legal or tax advice.",
        "Team, systems, stepping back. How empires stop depending on the founder's calendar.",
    ]
    trail_stops = ""
    for i, m in enumerate(chapters_meta):
        accent = PHASE_ACCENTS[i % len(PHASE_ACCENTS)]
        lvl = f"{i + 1:02d}"
        open_attr = " open" if i == 0 else ""
        trail_stops += (
            f'<details class="trail-stop reveal" style="--i:{i};--card-accent: var(--{accent});" name="trail"{open_attr}>'
            f'<summary><span class="trail-lvl">LVL {lvl}</span>'
            f'<span class="trail-title">{esc(m["title"])}</span>'
            f'<span class="trail-meta">{m["read_minutes"]} min \u00b7 RANK // {PHASE_RANKS[i]}</span>'
            f'<span class="trail-plus" aria-hidden="true">+</span></summary>'
            f'<div class="trail-body"><p>{PHASE_LEDES[i]}</p>'
            f'<a class="trail-go" href="{m["path"]}">Open {m["phase"]} <span class="arr" aria-hidden="true">\u2192</span></a>'
            f'</div></details>')

    # makeover: tools grouped by job into 3 tier <details> (progressive
    # disclosure - the wall of 21 cards is gone from first view).
    tier_order = ["PLAN", "MONEY", "CONTENT"]
    tier_tools = {t: [] for t in tier_order}
    for i, (slug, title, desc) in enumerate(TOOLS):
        tier_tools[TOOL_HUB_META[slug][1]].append((i, slug, title, desc))
    tiers_html = ""
    for t in tier_order:
        rows = "".join(
            f'<li><a href="{slug}.html"><span class="tier-num">{i + 1:02d}</span>'
            f'<span><strong>{esc(title)}</strong><span class="desc">{esc(desc)}</span></span>'
            f'<span class="tier-arrow" aria-hidden="true">\u2192</span></a></li>'
            for i, slug, title, desc in tier_tools[t])
        open_attr = " open" if t == "PLAN" else ""
        tiers_html += (
            f'<details class="tier" name="tiers" style="--tier:{GROUP_TIER_COLOR[t]}"{open_attr}>'
            f'<summary><span class="tier-chip" aria-hidden="true"></span>'
            f'<span class="tier-name">{t}</span>'
            f'<span class="tier-count">{len(tier_tools[t])} tools</span>'
            f'<span class="tier-plus" aria-hidden="true">+</span></summary>'
            f'<ul class="tier-list">{rows}</ul></details>')
    total_words = sum(m["words"] for m in chapters_meta)
    case_cards = "".join(
        f'<a class="phase-card brk reveal" style="--i:{i};--card-accent: var(--gold);" href="{m["path"]}">'
        f'<b class="brk-x" aria-hidden="true"></b>'
        f'<div class="phase-top"><span class="phase-lvl">CASE FILE {i + 1:02d}</span>'
        f'{_rank_chevrons(3, sm=True)}</div>'
        f'<span class="phase-num">{i + 1:02d}</span>'
        f'<span class="phase-name">{esc(m["title"])}</span>'
        f'<span class="phase-meta">{m["read_minutes"]} min · {m["words"]:,} words</span></a>'
        for i, m in enumerate(m for m in mdpage_meta if m["badge"] == "Case File"))
    case_files = [m for m in mdpage_meta if m["badge"] == "Case File"]
    # wave 30: signal log — the kill-feed of field wins. Every transmission is
    # an existing case file, one line each, styled as tactical comms. Numbered
    # MSG ids, never fake timestamps; the lede is the file's own, truncated.
    kf_items = "".join(
        f'<a class="kf-msg" role="listitem" href="{m["path"]}">'
        f'<span class="kf-num">MSG {i + 1:02d}</span>'
        f'<span class="kf-call">{esc(m["title"])}</span>'
        f'<span class="kf-text">{esc(m["lede"])}</span>'
        f'<span class="kf-chit">Filed</span></a>'
        for i, m in enumerate(case_files))
    signal_log = (
        f'<section class="section"><div class="section-head"><h2>Signal Log</h2>'
        f'<span class="section-tag">field wins // tactical comms</span></div>'
        f'<div class="hud-panel brk"><b class="brk-x" aria-hidden="true"></b>'
        f'<div class="hud-head"><span>SIGNAL LOG // {len(case_files):02d} TRANSMISSIONS</span>'
        f'<span class="hud-status hud-status-live">MONITORED</span></div>'
        f'<div class="hud-body"><div class="killfeed" role="list">{kf_items}</div>'
        f'<p class="killfeed-foot muted">Every transmission is a documented case file — '
        f'structures proven, figures directional. No wins invented, no timestamps faked.</p>'
        f'</div></div></section>')
    n_tools = len(TOOLS)
    index_body = f"""
<section class="hero">
<div class="briefing-board brk scan-sweep"><b class="brk-x" aria-hidden="true"></b>
  <p class="hero-eyebrow">Field manual // Creator division // Entry 00</p>
  <p class="fm-kicker" style="margin-bottom:1rem"><strong>MISSION BRIEFING</strong><span class="sep">//</span>CLEARANCE // ALL RECRUITS</p>
  <h1 class="mega">BUILD YOUR<br><span class="mega-outline">EMPIRE</span></h1>
  <p class="lede">Nine phases. Zero to multi-million-dollar creator company \u2014 YouTube, TikTok, Facebook, merch, brand deals, LLC, taxes, scale. <strong>No guru hype. Just the playbook.</strong></p>
  <div class="hero-cta"><a class="btn btn-primary" href="money-map.html">Find your stage \u2192</a>
  <a class="btn btn-ghost" href="tools.html">Browse the {n_tools} field tools</a></div>
  <p class="hero-note">New here? The 2-minute <strong>Money Map survey</strong> finds your stage \u2014 and every mission you clear earns XP toward your Field Manual rank, Recruit to General. Your progress never leaves this device.</p>
  <p class="hero-meta"><span class="stamp stamp-gold stamp-slam">2026 VERIFIED</span><span>9 phases \u00b7 {n_tools} tools \u00b7 9 case files</span></p>
</div>
</section>
<section class="ticker" aria-hidden="true"><div class="ticker-track">
  <span>TRANSMISSION // POST CONSISTENTLY</span><span>PACKAGING IS EVERYTHING</span><span>OWN YOUR AUDIENCE</span>
  <span>DIVERSIFY REVENUE</span><span>SEPARATE THE MONEY</span><span>SYSTEMS BEAT HUSTLE</span>
  <span>TRANSMISSION // POST CONSISTENTLY</span><span>PACKAGING IS EVERYTHING</span><span>OWN YOUR AUDIENCE</span>
  <span>DIVERSIFY REVENUE</span><span>SEPARATE THE MONEY</span><span>SYSTEMS BEAT HUSTLE</span>
</div></section>
<section class="section"><div class="section-head"><h2>The climb</h2><span class="section-tag">9 phases // clear them in order</span></div>
<p class="section-lede">Nine phases, in order. Each one is a mission set \u2014 open it to see what it covers, clear it to earn XP and rise a rank.</p>
<div class="trail reveal">{trail_stops}</div></section>
<section class="section"><div class="section-head"><h2>Field tools</h2><span class="section-tag">{n_tools} instruments // grouped by job</span><a href="tools.html" class="section-more">All {n_tools} tools \u2192</a></div>
{tiers_html}</section>
<section class="section"><div class="section-head"><h2>Case files</h2><span class="section-tag">documented deconstructions // no guru hype</span><a href="case-files.html" class="section-more">All 9 case files \u2192</a></div>
<p class="rail-hint" aria-hidden="true">scroll \u2192</p><div class="rail reveal" role="list">{case_cards}</div></section>
<section class="section"><div class="curator-note brk reveal"><b class="brk-x" aria-hidden="true"></b>
<p class="fm-kicker"><strong>CURATOR'S NOTE</strong><span class="sep">//</span>FILED BY THE QUARTERMASTER</p>
<blockquote>If you only read one phase, read Phase 5 \u2014 twice. Everyone skips to the money chapter and wonders why the math doesn't work. It doesn't work because phases 1 through 4 <em>are</em> the product. The stack is just the cash register on top of an audience that trusts you. I put monetization fifth on purpose.</blockquote>
<cite>\u2014 the Quartermaster, keeper of this manual</cite></div></section>
{signal_log}
<section class="section"><div class="section-head"><h2>Hottest topics right now</h2><span class="section-tag">live feed // trend-machine</span></div>
<div class="hud-panel trends-hud reveal">
  <div class="hud-head"><span>INTEL // WHAT TO COVER TODAY</span><span class="hud-status">SCANNING</span></div>
  <div class="hud-body">
    <div data-trends-widget data-trends-limit="6"></div>
    <script src="assets/js/trends-widget.js"></script>
    <noscript><p class="muted">The live trend feed needs JavaScript. The trend playbooks are in Phase 3.</p></noscript>
  </div>
</div></section>
<section class="section honesty reveal"><span class="honesty-stamp stamp stamp-sm stamp-slam" aria-hidden="true">STANDING ORDER</span><h2>The honesty policy</h2>
<p>Every platform number on this site was verified against 2026 sources or is flagged <strong>verify live</strong>. Income ranges are illustrative, never promises. The LLC/tax phase is educational \u2014 <strong>not legal or tax advice</strong>. Platforms change rules constantly; the most dangerous number on the internet is a stale one.</p></section>
"""
    (SITE / "index.html").write_text(page_template(SITE_NAME, index_body, active="index.html"), encoding="utf-8")

    # wave 30: dossier-styled 404 — the file that never filed its paperwork.
    # noindex: a 404 must never be indexed. All links resolve (stage 4 checks).
    notfound_body = (
        '<div class="lost brk brk-stamp"><b class="brk-x" aria-hidden="true"></b>'
        '<p class="fm-kicker"><strong>FIELD MANUAL</strong><span class="sep">//</span>LOST &amp; FOUND</p>'
        '<h1>FILE<br>NOT FOUND</h1>'
        '<p><span class="stamp stamp-slam" data-slam="1">MIA</span></p>'
        '<p class="lede">This page never filed its paperwork. It may have been moved, '
        'renamed, or decommissioned — or the coordinates were wrong from the start. '
        'Fall back to a known position:</p>'
        '<div class="lost-nav">'
        '<a class="btn btn-primary" href="index.html">Return to the Empire Map →</a>'
        '<a class="btn btn-ghost" href="tools.html">All field tools</a>'
        '<a class="btn btn-ghost" href="case-files.html">Case files</a>'
        '<a class="btn btn-ghost" href="glossary.html">Glossary</a>'
        '</div>'
        '<p class="fm-readout">ERROR 404 // NO PAPERWORK ON FILE</p>'
        '<p class="muted" style="margin-top:1.2rem;font-size:.85rem">P.S. If you got here from a link on this site, that’s our fault — the Quartermaster has been notified and is pretending it was always part of the plan.</p></div>')
    (SITE / "404.html").write_text(
        page_template("File not found", notfound_body,
                      extra_head='<meta name="robots" content="noindex">'),
        encoding="utf-8")

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

    # ---- data/v1 (static JSON API) ----
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
            "path": "data/v1/index.json",
            "description": "This manifest — self-describing list of every endpoint with schema URLs, updated timestamps, record counts, and deprecation notes. Start here.",
            "schema": "data/v1/schema/index.json",
            "updated": BUILD_TS,
            "records": None,
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "chapters",
            "kind": "json",
            "path": "data/v1/chapters.json",
            "description": "All nine phases: id, phase label, title, site-relative path, word count, read minutes. Use headings to navigate before fetching full text from llms-full.txt or the chapter page.",
            "schema": "data/v1/schema/chapters.json",
            "updated": BUILD_TS,
            "records": len(chapters_meta),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "niches",
            "kind": "json",
            "path": "data/v1/niches.json",
            "description": ("The Niche Atlas dataset v2.1.0: 20 October-2026-researched niches — "
                            "channel growth, search growth, breakout formats, creator-reported "
                            "revenue ranges (CPM/RPM), competition, startup cost, skill fit, "
                            "chapter/simulator/case-file links, the avoid list (red-flag niches, "
                            "2027-updated), sources, and the <1%-reach-100K reality check — "
                            "plus the 2027 outlook layer: per-niche trajectory badges "
                            "(heating/stable/cooling with basis + signals), breakout-format "
                            "spotlights, platform signals, and the niche-to-revenue-stream fit "
                            "matrix — plus the ten breakout-format dossiers (signal, reported "
                            "ranges, competition, entry requirements, who-it-suits, risks, "
                            "2027 read, source weights) backing the Breakout-Format Intel "
                            "reference page. Ranges, never promises."),
            "schema": "data/v1/schema/niches.json",
            "updated": BUILD_TS,
            "records": len(niches_cfg["niches"]),
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Research observed 2026-10-11; 2027 outlook layer added 2026-10-11 (trajectory badges are directional reads, not forecasts). Verify platform figures live before acting — every record carries its sources and observation date.",
        },
        {
            "id": "glossary",
            "kind": "json",
            "path": "data/v1/glossary.json",
            "description": "Creator-economy definitions: { terms: [{ term, definition }] }.",
            "schema": "data/v1/schema/glossary.json",
            "updated": BUILD_TS,
            "records": len(glossary["terms"]),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "calculators",
            "kind": "json",
            "path": "data/v1/calculators.json",
            "description": "Calculator config: per-niche long-form RPM bands, Shorts RPM, platform thresholds (YPP tiers, TikTok Rewards, Facebook CMP — with sources and dates), revenue splits, the 2026 sponsorship rate card, the 2026 quoted-prices block (Cheerful reported asks/quotes + Click Analytic modeled Instagram cross-check, bases labeled), and 2026 niche/platform research snapshots. The data contract the sim engine, revenue calculator, deal analyzer, deal room, negotiation kit, and hiring calculator read.",
            "schema": "data/v1/schema/calculators.json",
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
            "path": "data/v1/deal-templates.json",
            "description": "The Deal Room data contract: negotiation scripts (lowball counter, usage-rights upsell, exclusivity pushback, rush-fee ask — with {{placeholders}}), the red-flag checklist with severity levels and scoring rules, and usage-rights pricing tiers with reported vs. definitional multiplier basis, 3 honest pitch email templates (cold pitch, one follow-up nudge, warm intro — [bracketed] placeholders, never invented stats), the 10-item contract red-flag checklist with scoring rules, and the Negotiation Kit reply scripts (6 situations — counter, lowball, exposure-only, usage rights, whitelisting, late payment — with {{placeholders}}, v1.2.0). A negotiation aid, not financial/legal/tax advice.",
            "schema": "data/v1/schema/deal-templates.json",
            "updated": BUILD_TS,
            "records": None,
            "records_note": "Data contract, not a record list: 4 negotiation scripts, 6 red-flag items, 6 usage-rights tiers, 3 pitch email templates, 10 contract red-flag items, 6 negotiation-kit reply scripts.",
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Multipliers are reported 2026 benchmarks and ranges, not quotes. Verify against current creator rate reports before quoting.",
        },
        {
            "id": "content-engine",
            "kind": "json",
            "path": "data/v1/content-engine.json",
            "description": "The Content Engine data contract v1.1.0: idea formats, the five Short-Form Playbook hook structures, calendar dealing rules, batching guidance (consistency-beats-volume), the Repurposing 2.0 derivative map (each derivative's required original element), the Oct-1 originality guardrails, deal-slot guidance, the simulator bridge — plus the 2.0 additions: the Oct-2026 algorithm signal map (TikTok/Shorts/Reels, every claim source-labeled), 6 trend-derived hook patterns, the cross-post adaptation matrix (12 source→destination rule sets + universal checks), and the weekly batch scheduler defaults. A planning aid, not financial/legal/tax advice.",
            "schema": "data/v1/schema/content-engine.json",
            "updated": BUILD_TS,
            "records": None,
            "records_note": "Data contract, not a record list: 3 idea formats, 5 hook structures, 7 dealing rules, 7 repurposing-2.0 derivatives, 5 originality guardrails.",
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Hook structures are craft formulas from the Short-Form Playbook, not platform documentation. Niche tags resolve against data/v1/niches.json.",
        },
        {
            "id": "changes",
            "kind": "json",
            "path": "data/v1/changes.json",
            "description": ("Algorithm Watch feed: dated platform algorithm, policy, and monetization changes — "
                            "id, platform, title, summary, detected_at, announced_at, effective_at, source_url(s), "
                            "category (algorithm/policy/monetization/legal), confidence (verified/single-source). "
                            "Every entry carries its source and confidence flag; no change is ever stated as fact without one. "
                            "Refreshed by the daily /api/cron/algorithm-watch job; 90-day retention. Live function: /api/changes. "
                            "A planning aid, not financial/legal/tax advice. RPM/CPM figures are creator-reported ranges, never promises."),
            "schema": "data/v1/schema/changes.json",
            "updated": BUILD_TS,
            "records": len(json.loads((DATA / "changes.json").read_text(encoding="utf-8"))["changes"]),
            "deprecated": False,
            "deprecation_note": None,
            "freshness_note": "Verify platform figures live before acting on them — every entry carries its sources and confidence flag.",
        },
        {
            "id": "skills",
            "kind": "json",
            "path": "data/v1/skills.json",
            "description": "Skill index: name, description, repo-relative path for every executable skill. Full skill content lives in skills/<name>/SKILL.md.",
            "schema": "data/v1/schema/skills.json",
            "updated": BUILD_TS,
            "records": len(skills_idx),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "case-files",
            "kind": "json",
            "path": "data/v1/case-files.json",
            "description": "Index of the documented creator-business deconstructions: id, badge, title, path, words, read_minutes. Full text on the case-*.html pages. Figures are source-reported, not audited — never present as promises.",
            "schema": "data/v1/schema/case-files.json",
            "updated": BUILD_TS,
            "records": sum(1 for m in mdpage_meta if m["badge"] == "Case File"),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "tools",
            "kind": "json",
            "path": "data/v1/tools.json",
            "description": "All twenty-two interactive tools with programmatic input schemas (JSON Schema draft-07), output descriptions, and drive notes — replicate the tools' logic without the UI.",
            "schema": "data/v1/schema/tools.json",
            "updated": BUILD_TS,
            "records": len(TOOLS_API),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "reference-pages",
            "kind": "html",
            "paths": [m["path"] for m in reference_meta],
            "description": ("Human-readable reference pages: the 2026 sponsorship rate card, "
                            "the Niche Atlas, the Metrics Glossary, the 2026 Platform "
                            "Rules Bible, the 2026 Breakout-Format Intel, and the 2026 " \
                            "Sponsor Playbook. "
                            "Machine-readable equivalents: rate card in "
                            "calculators.json sponsorship_rate_card_2026; the atlas and "
                            "the ten breakout-format dossiers in niches.json "
                            "(breakout_format_dossiers); glossary terms in glossary.json. "
                            "Figures are creator-reported ranges and source-weighted "
                            "research, never promises."),
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
            "description": "The twenty-two interactive tools' human UI pages. Agents should prefer data/v1/tools.json input schemas over scraping these pages.",
            "schema": None,
            "updated": BUILD_TS,
            "records": len(TOOLS),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "algorithm-watch",
            "kind": "html",
            "paths": ["what-changed.html"],
            "description": ("Algorithm Watch — the 'what changed' feed's human front-end: dated platform "
                            "algorithm, policy, and monetization changes, pre-rendered from data/v1/changes.json "
                            "and live-updated from /api/changes when the server is reachable. Fully readable with "
                            "JavaScript disabled; the status badge reports live / cached state honestly. "
                            "Machine-readable feed: data/v1/changes.json; live function: /api/changes."),
            "schema": None,
            "updated": BUILD_TS,
            "records": len(json.loads((DATA / "changes.json").read_text(encoding="utf-8"))["changes"]),
            "deprecated": False,
            "deprecation_note": None,
        },
        {
            "id": "schemas",
            "kind": "directory",
            "path": "data/v1/schema/",
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
                "changes.json — algorithm-watch changes feed doc",
                "envelope.json — server function response envelope (§1.1)",
            ],
            "schema": None,
            "updated": BUILD_TS,
            "records": 17,
            "deprecated": False,
            "deprecation_note": None,
        },
    ]
    api_index = {
        "name": SITE_NAME,
        "tagline": TAGLINE,
        "version": "1.0.0",
        "updated": BUILD_TS,
        "base": "data/v1/",
        "notes": ("Self-describing manifest. Base is data/v1/ relative to the site root — "
                  "works on any static host; no auth, no keys, no rate limits. "
                  "Timestamps are ISO-8601 UTC. The deployed site ships its own api/ mirror, "
                  "so the explorer works live too."),
        "endpoints": api_endpoints,
    }
    (DATA_V1 / "index.json").write_text(json.dumps(api_index, indent=2), encoding="utf-8")
    (DATA_V1 / "chapters.json").write_text(json.dumps({"chapters": chapters_meta}, indent=2), encoding="utf-8")
    (DATA_V1 / "case-files.json").write_text(json.dumps({
        "version": "1.0.0", "updated": "2026-10-11",
        "note": "Documented creator-business deconstructions. Figures are reported by the cited sources, not audited — never present as promises.",
        "case_files": [
            {"id": m["id"], "badge": m["badge"], "title": m["title"],
             "path": m["path"], "words": m["words"], "read_minutes": m["read_minutes"]}
            for m in mdpage_meta if m["badge"] == "Case File"
        ],
    }, indent=2), encoding="utf-8")
    shutil.copy(DATA / "glossary.json", DATA_V1 / "glossary.json")
    shutil.copy(DATA / "calculators.json", DATA_V1 / "calculators.json")
    shutil.copy(DATA / "niches.json", DATA_V1 / "niches.json")
    shutil.copy(DATA / "deal-templates.json", DATA_V1 / "deal-templates.json")
    shutil.copy(DATA / "content-engine.json", DATA_V1 / "content-engine.json")
    shutil.copy(DATA / "changes.json", DATA_V1 / "changes.json")

    # ---- tools.json: every tool with its programmatic input schema ----
    (DATA_V1 / "tools.json").write_text(json.dumps({
        "version": "1.0.0", "updated": "2026-10-11",
        "note": ("Programmatic input schemas for the twenty-two interactive tools. "
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
    (DATA_V1 / "schema" / "chapter.json").write_text(json.dumps(chapter_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "glossary.json").write_text(json.dumps(glossary_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "case-file.json").write_text(json.dumps(case_file_schema, indent=2), encoding="utf-8")

    # calculators schema: locks the data contract the sim engine, revenue
    # calculator, and deal analyzer read (rpm band shape + research blocks).
    calculators_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Calculators",
        "type": "object",
        "required": ["version", "updated", "youtube_longform_rpm_bands",
                     "niche_growth_2026", "platform_rules_2026",
                     "sponsorship_rate_card_2026", "platform_thresholds",
                     "revenue_splits", "usage_rights_benchmarks_2026",
                     "sponsorship_quoted_prices_2026"],
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
            "sponsorship_quoted_prices_2026": {
                "type": "object",
                "required": ["date", "note", "sources", "typical_quoted_by_format",
                             "typical_ask_by_followers", "instagram_feed_post_modeled",
                             "instagram_modeled_basis"],
                "properties": {
                    "typical_quoted_by_format": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["id", "label", "quoted_usd", "basis", "source"],
                            "properties": {
                                "basis": {"type": "string", "enum": ["reported"]},
                            },
                        },
                    },
                    "instagram_feed_post_modeled": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["tier", "label", "range_usd"],
                        },
                    },
                    "instagram_modeled_basis": {"type": "string", "enum": ["modeled"]},
                },
            },
            "usage_rights_benchmarks_2026": {
                "type": "object",
                "required": ["date", "source", "note", "tiers", "whitelisting_per_month_pct"],
                "properties": {
                    "tiers": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["id", "label", "addon_pct", "note"],
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "addon_pct": {"type": "array",
                                            "items": {"type": ["number", "null"]},
                                            "minItems": 2, "maxItems": 2},
                                "note": {"type": "string"},
                            },
                        },
                    },
                    "whitelisting_per_month_pct": {"type": "array",
                        "items": {"type": "number"}, "minItems": 2, "maxItems": 2},
                },
            },
            "platform_thresholds": {"type": "object"},
            "revenue_splits": {"type": "object"},
        },
    }
    (DATA_V1 / "schema" / "calculators.json").write_text(json.dumps(calculators_schema, indent=2), encoding="utf-8")

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
    (DATA_V1 / "schema" / "niche.json").write_text(json.dumps(niche_schema, indent=2), encoding="utf-8")
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
            "breakout_format_dossiers": {"type": "array",
                "description": "Wave-31 breakout-format dossiers: signal, reported pay range, competition, entry_requirements, who_it_suits, risks, read_2027, sources, single_source flag + source_note.",
                "items": {"type": "object"}},
            "sources": {"type": "array", "items": {
                "type": "object",
                "required": ["id", "publisher", "title", "observed"],
                "properties": {
                    "id": {"type": "string"},
                    "publisher": {"type": "string"},
                    "title": {"type": "string"},
                    "url": {"type": ["string", "null"]},
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
    (DATA_V1 / "schema" / "niches.json").write_text(json.dumps(niches_schema, indent=2), encoding="utf-8")

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
    (DATA_V1 / "schema" / "index.json").write_text(json.dumps(index_schema, indent=2), encoding="utf-8")
    chapters_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Chapters",
        "type": "object",
        "required": ["chapters"],
        "properties": {"chapters": {"type": "array", "items": {"$ref": "chapter.json"}}},
    }
    (DATA_V1 / "schema" / "chapters.json").write_text(json.dumps(chapters_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "skill.json").write_text(json.dumps(skill_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "skills.json").write_text(json.dumps(skills_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "case-files.json").write_text(json.dumps(case_files_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "tool.json").write_text(json.dumps(tool_schema, indent=2), encoding="utf-8")
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
    (DATA_V1 / "schema" / "tools.json").write_text(json.dumps(tools_schema, indent=2), encoding="utf-8")

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
                     "deal_slots", "simulator_bridge",
                     "algorithm_signals", "hook_patterns",
                     "adaptation_matrix", "batching_scheduler", "source"],
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
            "algorithm_signals": {
                "type": "object",
                "required": ["updated", "research_basis", "source_labels", "platforms"],
                "properties": {
                    "updated": {"type": "string"},
                    "research_basis": {"type": "string"},
                    "source_labels": {"type": "object"},
                    "platforms": {"type": "array", "minItems": 3, "maxItems": 3, "items": {
                        "type": "object",
                        "required": ["id", "label", "optimize_for", "hierarchy", "mechanics"],
                        "properties": {
                            "id": {"type": "string", "enum": ["tiktok", "shorts", "reels"]},
                            "label": {"type": "string"},
                            "optimize_for": {"type": "string"},
                            "hierarchy": {"type": "array", "minItems": 3, "items": {
                                "type": "object",
                                "required": ["rank", "signal", "note", "source", "source_label"],
                                "properties": {
                                    "rank": {"type": "integer"},
                                    "signal": {"type": "string"},
                                    "note": {"type": "string"},
                                    "source": {"type": "string"},
                                    "source_label": {"type": "string",
                                        "enum": ["platform-published", "verified-multi-source",
                                                 "single-source", "creator-lore"]},
                                }}}},
                            "mechanics": {"type": "array", "minItems": 4, "items": {
                                "type": "object",
                                "required": ["claim", "source", "source_label"],
                                "properties": {
                                    "claim": {"type": "string"},
                                    "source": {"type": "string"},
                                    "source_label": {"type": "string",
                                        "enum": ["platform-published", "verified-multi-source",
                                                 "single-source", "creator-lore"]},
                                }}},
                        }}}},
            "hook_patterns": {
                "type": "object",
                "required": ["updated", "basis", "honesty_note", "patterns"],
                "properties": {
                    "updated": {"type": "string"},
                    "basis": {"type": "string"},
                    "honesty_note": {"type": "string"},
                    "patterns": {"type": "array", "minItems": 6, "maxItems": 6, "items": {
                        "type": "object",
                        "required": ["id", "name", "formula", "mechanic", "spotted_in", "adapt"],
                        "properties": {
                            "id": {"type": "string",
                                   "enum": ["costume-reveal-walk", "leaving-edit",
                                            "joy-contrast", "hidden-confession",
                                            "cozy-bed", "upside-down-flip"]},
                            "name": {"type": "string"},
                            "formula": {"type": "string"},
                            "mechanic": {"type": "string"},
                            "spotted_in": {"type": "string"},
                            "adapt": {"type": "string"},
                        }}}}},
            "adaptation_matrix": {
                "type": "object",
                "required": ["updated", "basis", "platforms", "rules", "universal_checks", "oct1_gate"],
                "properties": {
                    "updated": {"type": "string"},
                    "basis": {"type": "string"},
                    "platforms": {"type": "object"},
                    "rules": {"type": "object",
                              "required": ["tiktok>shorts", "tiktok>reels", "tiktok>facebook",
                                           "shorts>tiktok", "shorts>reels", "shorts>facebook",
                                           "reels>tiktok", "reels>shorts", "reels>facebook",
                                           "facebook>tiktok", "facebook>shorts", "facebook>reels"]},
                    "universal_checks": {"type": "array", "minItems": 6,
                                         "items": {"type": "string"}},
                    "oct1_gate": {"type": "string"},
                }},
            "batching_scheduler": {
                "type": "object",
                "required": ["basis", "default_task_minutes", "rest_day_default",
                           "max_hours_per_day", "guidance"],
                "properties": {
                    "basis": {"type": "string"},
                    "default_task_minutes": {"type": "object"},
                    "rest_day_default": {"type": "integer"},
                    "max_hours_per_day": {"type": "number"},
                    "guidance": {"type": "array", "items": {"type": "string"}},
                }},
            "source": {"type": "string"},
        },
    }
    (DATA_V1 / "schema" / "content-engine.json").write_text(
        json.dumps(content_engine_schema, indent=2), encoding="utf-8")

    # ---- skills index outputs (index computed before the API block) ----
    (DATA_V1 / "skills.json").write_text(json.dumps(
        {"version": "1.0.0", "updated": "2026-10-11", "skills": skills_idx}, indent=2), encoding="utf-8")

    # ---- ship a data/ mirror inside site/ so the deployed site serves its own
    #      static API (the API explorer fetches relative paths). This must come
    #      AFTER every data/v1 write (including schemas + skills.json) so a clean
    #      build mirrors the final state, not a mid-build snapshot. ----
    site_data = SITE / "data" / "v1"
    if site_data.exists():
        shutil.rmtree(site_data)
    shutil.copytree(DATA_V1, site_data)

    # ---- ship serverless functions + shared lib into the served root ----
    # (site/ is rebuilt from scratch every run, so these live canonically
    # under api/functions + api/lib and are copied here; vercel.json detects
    # them as functions because outputDirectory=site.)
    fn_src, lib_src = ROOT / "api" / "functions", ROOT / "api" / "lib"
    if fn_src.exists():
        shutil.copytree(fn_src, SITE / "api", dirs_exist_ok=True)
    if lib_src.exists():
        shutil.copytree(lib_src, SITE / "lib", dirs_exist_ok=True)

    # ---- llms.txt / llms-full.txt ----
    llms = [f"# {SITE_NAME}", "", TAGLINE, "",
            "## Phases"]
    for m in chapters_meta:
        llms.append(f"- [{m['phase']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## Tools"]
    for slug, title, desc in TOOLS:
        llms.append(f"- [{title}]({slug}.html) — {desc}")
    llms += ["- [Glossary](glossary.html)", "",
             "All twenty-two tools, grouped by job (Plan / Money / Content): [Tools hub](tools.html).",
             "", "## Reference"]
    for m in reference_meta:
        llms.append(f"- [{m['badge']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## Case Files — documented creator-business deconstructions"]
    for m in (m for m in mdpage_meta if m["badge"] == "Case File"):
        llms.append(f"- [Case File: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["- [All case files — index + comparison table](case-files.html)",
             "- data/v1/case-files.json — machine-readable case-file index", "",
             "## Guides & Playbooks"]
    for m in (m for m in mdpage_meta if m["badge"] in ("Guide", "Playbook")):
        llms.append(f"- [{m['badge']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## API", "- data/v1/index.json — self-describing manifest: every endpoint, schema URL, updated timestamp, record counts",
             "- data/v1/chapters.json",
             "- data/v1/niches.json — the Niche Atlas dataset v2.1.0: 20 researched niches, 2027 outlook layer (trajectory badges, breakout spotlights, platform signals, stream-fit matrix), ten breakout-format dossiers, avoid list, sources, reality check",
             "- data/v1/glossary.json",
             "- data/v1/calculators.json",
             "- data/v1/skills.json",
             "- data/v1/case-files.json",
             "- data/v1/tools.json — every tool's programmatic input schema",
             "- data/v1/deal-templates.json — Deal Room data: negotiation scripts, red-flag checklist, usage-rights tiers, pitch templates, contract red-flag checklist, negotiation-kit reply scripts",
             "- data/v1/content-engine.json — Content Engine data: idea formats, Playbook hook structures, dealing rules, Repurposing 2.0 map, originality guardrails, deal-slot guidance",
             "- data/v1/changes.json — Algorithm Watch feed: dated algorithm/policy/monetization changes with sources + confidence flags (verified/single-source); live at /api/changes",
             "- what-changed.html — Algorithm Watch 'what changed' feed page: pre-rendered from data/v1/changes.json, live-updated from /api/changes when reachable (status badge reports live/cached honestly)",
             "- data/v1/schema/ — JSON Schema (draft-07) for every endpoint",
             "", "## Agents",
             "- AGENT.md — how an agent uses this site: base URL pattern, example requests, 14 end-to-end workflows, tool input schemas",
             "- [Agents](agents.html) — the agent surface: endpoint table, all skills, data freshness policy, 7 worked agent workflows",
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
