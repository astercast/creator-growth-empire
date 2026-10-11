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

NAV_LINKS = [
    ("index.html", "Empire Map"),
    ("quiz.html", "Niche Picker"),
    ("calculator.html", "Revenue Calc"),
    ("planner.html", "90-Day Plan"),
    ("glossary.html", "Glossary"),
]

def page_template(title, body, active="", extra_head=""):
    nav = "".join(
        f'<a href="{href}" class="nav-link{" active" if href == active else ""}">{label}</a>'
        for href, label in NAV_LINKS
    )
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
{extra_head}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="brand" href="index.html"><span class="brand-mark">▲</span> {SITE_NAME}</a>
  <nav class="site-nav" aria-label="Primary">{nav}</nav>
  <button class="nav-toggle" aria-expanded="false" aria-controls="mobileNav" aria-label="Menu">☰</button>
</header>
<nav id="mobileNav" class="mobile-nav" aria-label="Mobile">{nav}</nav>
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
      <a href="quiz.html">Niche Picker</a>
      <a href="calculator.html">Revenue Calculator</a>
      <a href="planner.html">90-Day Planner</a>
      <a href="glossary.html">Glossary</a>
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

    # tool pages
    for slug, title, desc in TOOLS:
        body_src = PAGES / f"{slug}.html"
        tool_body = body_src.read_text(encoding="utf-8") if body_src.exists() else f"<p>{esc(desc)}</p>"
        extra = ""
        if slug == "quiz":
            extra = '<script src="assets/js/quiz.js"></script>'
        elif slug == "calculator":
            extra = '<script src="assets/js/calculator.js"></script>'
        elif slug == "planner":
            extra = '<script src="assets/js/planner.js"></script>'
        tool_idx = [t[0] for t in TOOLS].index(slug)
        hud_open = (f'<div class="tool-page"><div class="hud-panel"><div class="hud-head">'
                    f'<span>TOOL // 0{tool_idx + 1} — {esc(title).upper()}</span>'
                    f'<span class="hud-status">SYSTEMS ONLINE</span></div>'
                    f'<div class="hud-body"><h1>{esc(title)}</h1><p class="lede">{esc(desc)}</p></div></div>')
        page = page_template(title, f'{hud_open}{tool_body}</div>',
                             active=f"{slug}.html", extra_head=extra)
        (SITE / f"{slug}.html").write_text(page, encoding="utf-8")

    # glossary page
    glossary = json.loads((DATA / "glossary.json").read_text(encoding="utf-8"))
    gloss_html = "<h1>Glossary</h1><p class='lede'>The words the empire runs on.</p><dl class='glossary'>"
    for term in sorted(glossary["terms"], key=lambda t: t["term"].lower()):
        gloss_html += f"<div class='gloss-entry'><dt id='g-{term['term'].lower().replace(' ', '-')}'>{esc(term['term'])}</dt><dd>{inline(term['definition'])}</dd></div>"
    gloss_html += "</dl>"
    (SITE / "glossary.html").write_text(page_template("Glossary", gloss_html, active="glossary.html"), encoding="utf-8")

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
    index_body = f"""
<section class="hero">
  <p class="hero-eyebrow">Field manual // Creator division</p>
  <p class="kicker">THE COMPLETE PLAYBOOK</p>
  <h1 class="mega">BUILD YOUR<br><span class="mega-outline outline-text">EMPIRE</span></h1>
  <p class="lede">Nine phases. Zero to multi-million-dollar creator company — YouTube, TikTok, Facebook, merch, brand deals, LLC, taxes, scale. No guru hype. Just the playbook.</p>
  <div class="sticker-row reveal">
    <span class="sticker">9 phases</span>
    <span class="sticker sticker-coral">3 power tools</span>
    <span class="sticker sticker-gold">2026 verified</span>
    <span class="sticker sticker-violet">Zero → empire</span>
  </div>
  <div class="hero-stats">
    <div class="hero-stat reveal" style="--i:0"><strong>9</strong><span>phases</span></div>
    <div class="hero-stat reveal" style="--i:1"><strong>{total_words:,}</strong><span>words</span></div>
    <div class="hero-stat reveal" style="--i:2"><strong>3</strong><span>interactive tools</span></div>
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
<section class="section"><div class="section-head"><h2>Command Center</h2><span class="section-tag">weapons free</span></div><div class="tool-grid reveal-stagger">{tools_html}</div></section>
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

    # ---- API ----
    api_index = {
        "name": SITE_NAME, "version": "1.0.0",
        "endpoints": {
            "chapters": "api/v1/chapters.json",
            "glossary": "api/v1/glossary.json",
            "calculators": "api/v1/calculators.json",
            "references": [m["path"].replace(".html", "") for m in reference_meta],
            "tools": ["quiz.html", "calculator.html", "planner.html"],
        },
    }
    (API / "index.json").write_text(json.dumps(api_index, indent=2), encoding="utf-8")
    (API / "chapters.json").write_text(json.dumps({"chapters": chapters_meta}, indent=2), encoding="utf-8")
    shutil.copy(DATA / "glossary.json", API / "glossary.json")
    shutil.copy(DATA / "calculators.json", API / "calculators.json")

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

    # ---- skills index (skills/<name>/SKILL.md directory format) ----
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
    (API / "skills.json").write_text(json.dumps(
        {"version": "1.0.0", "updated": "2026-10-11", "skills": skills_idx}, indent=2), encoding="utf-8")

    # ---- llms.txt / llms-full.txt ----
    llms = [f"# {SITE_NAME}", "", TAGLINE, "",
            "## Phases"]
    for m in chapters_meta:
        llms.append(f"- [{m['phase']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## Tools",
             "- [Niche Picker](quiz.html)", "- [Revenue Calculator](calculator.html)",
             "- [90-Day Planner](planner.html)", "- [Glossary](glossary.html)",
             "", "## Reference"]
    for m in reference_meta:
        llms.append(f"- [{m['badge']}: {m['title']}]({m['path']}) — {m['read_minutes']} min read")
    llms += ["", "## API", "- api/v1/index.json", "- api/v1/chapters.json",
             "- api/v1/glossary.json", "- api/v1/calculators.json",
             "", "## Skills"]
    for s in skills_idx:
        llms.append(f"- {s['name']}: {s['description']}")
    (ROOT / "llms.txt").write_text("\n".join(llms) + "\n", encoding="utf-8")
    (ROOT / "llms-full.txt").write_text("\n\n---\n\n".join(llms_full_parts), encoding="utf-8")

    print(f"Built {len(chapters_meta)} chapters, {len(TOOLS)} tools, {len(skill_files)} skills, {total_words:,} words.")

if __name__ == "__main__":
    build()
