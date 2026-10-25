"""Creator heartbeat (Claude bundle 2026-10-24, cron 41 */6).

Ports the three feeds from api/functions/cron/algorithm-watch.js
(Tubefilter, Social Media Today, Tubefilter Twitch tag) and adds the
platform feeds Claude named: YouTube Official Blog RSS and Meta
Newsroom RSS (a post on a platform's own feed counts as verified),
the TikTok Newsroom page word-hash, and the YouTube Help Partner
Program page word-hash (a change there flags the rule checkers
amber). Trade stories count as verified only when two trade sources
share 3 or more keywords within 72 hours; anything else stays
"single-source" and the site shows it dimmer.

Writes changes.json in the same shape the site already uses, plus
pulse.json + source-checks.json via the fleet lib (HB_OUT: this
site's folder in the fleet-data repo; the baked data/v1 copies in
this repo are the read-only seed and fallback).
Standard library only. A dead source keeps the last good data and
counts a fail in the pulse; this job never invents a change.
"""
import sys, os, re, json, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from lib import get, read, write_if_changed, sig, now, Pulse

YPP_URL = "https://support.google.com/youtube/answer/72851"
TIKTOK_URL = "https://newsroom.tiktok.com/en-us/"

PLATFORM_FEEDS = [
    ("youtube-blog", "YouTube Official Blog", "https://blog.youtube/feed/", "youtube"),
    ("meta-newsroom", "Meta Newsroom", "https://about.fb.com/news/feed/", "facebook"),
]
TRADE_FEEDS = [
    ("tubefilter-rss", "Tubefilter", "https://www.tubefilter.com/feed/"),
    ("socialmediatoday-rss", "Social Media Today", "https://www.socialmediatoday.com/feeds/news/"),
    ("tubefilter-twitch-rss", "Tubefilter Twitch tag", "https://www.tubefilter.com/tag/twitch/feed/"),
]

RELEVANT = re.compile(r"algorithm|rank(ing)?|recommendation|for you|fyp|shorts|reels|monetiz|partner program|\bypp\b|payout|revenue|\brpm\b|\bcpm\b|polic|guideline|terms|disclosure|\bftc\b|lawsuit|settlement|regulation|appeal|demonetiz|distribution|reach|creator fund|rewards|sponsor|shop", re.I)
CAT_MONETIZATION = re.compile(r"monetiz|payout|revenue|\brpm\b|\bcpm\b|partner program|\bypp\b|shop|affiliate|creator fund|rewards|sponsor", re.I)
CAT_LEGAL = re.compile(r"\bftc\b|lawsuit|settlement|regulation|\birs\b|tax|court", re.I)
CAT_POLICY = re.compile(r"polic|guideline|terms|disclosure|ban|appeal|demonetiz|enforcement", re.I)
STOP = set("the a an and or of to in on for with from by at as is are was were be been it its this that these those you your we our they their will would can could new says said".split())
RETENTION_DAYS = 90
MAX_NEW = 25

ENTITIES = {"amp": "&", "lt": "<", "gt": ">", "quot": '"', "apos": "'", "nbsp": " "}

def decode(s):
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))) if 31 < int(m.group(1)) < 0x110000 else m.group(0), s or "")
    s = re.sub(r"&#x([0-9a-fA-F]+);", lambda m: chr(int(m.group(1), 16)) if 31 < int(m.group(1), 16) < 0x110000 else m.group(0), s)
    return re.sub(r"&([a-zA-Z]+);", lambda m: ENTITIES.get(m.group(1), m.group(0)), s)

def strip_tags(s):
    s = re.sub(r"<!\[CDATA\[([\s\S]*?)\]\]>", r"\1", s or "")
    return re.sub(r"\s+", " ", decode(re.sub(r"<[^>]*>", " ", s))).strip()

def pick(block, tags):
    for t in tags:
        m = re.search(r"<" + re.escape(t) + r"[^>]*>([\s\S]*?)</" + re.escape(t) + r">", block, re.I)
        if m:
            return strip_tags(m.group(1))
    return ""

def parse_items(xml):
    items = []
    for m in re.finditer(r"<(item|entry)[\s>]([\s\S]*?)</\1>", xml, re.I):
        block = m.group(2)
        title = pick(block, ["title"])
        lm = re.search(r'<link[^>]*href="([^"]+)"', block, re.I)
        link = lm.group(1).strip() if lm else pick(block, ["link"])
        pub = pick(block, ["pubDate", "published", "updated", "dc:date"])
        desc = pick(block, ["description", "summary", "content:encoded", "content"])
        if title and link:
            items.append({"title": title, "link": link, "pub": pub, "desc": desc[:500]})
        if len(items) >= 60:
            break
    return items

def norm_title(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", (t or "").lower())).strip()

def keywords(title):
    return {w for w in re.findall(r"[a-z]{4,}", (title or "").lower()) if w not in STOP}

def category(text):
    if CAT_MONETIZATION.search(text): return "monetization"
    if CAT_LEGAL.search(text): return "legal"
    if CAT_POLICY.search(text): return "policy"
    return "algorithm"

def platform_of(text, hint=None):
    if hint: return hint
    t = (text or "").lower()
    for name, pat in [("youtube", r"youtube|youtu"), ("tiktok", r"tiktok"), ("instagram", r"instagram|reels"),
                      ("facebook", r"facebook|meta"), ("x", r"twitter"), ("twitch", r"twitch"), ("kick", r"\bkick\b")]:
        if re.search(pat, t): return name
    return "other"

def make_id(platform, title, link):
    pfx = {"youtube": "yt", "tiktok": "tt", "instagram": "ig", "facebook": "fb", "x": "x", "twitch": "tw", "kick": "ki", "other": "cw"}.get(platform, "cw")
    slug = norm_title(title).replace(" ", "-")[:48].rstrip("-") or "update"
    h = hashlib.sha256(link.encode()).hexdigest()[:6]
    return (pfx + "-" + slug + "-" + h)[:80]

def iso_pub(pub):
    if not pub: return None
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(pub)
        return dt.astimezone().strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None
    except Exception:
        m = re.match(r"^(\d{4}-\d{2}-\d{2})", pub)
        return (m.group(1) + "T00:00:00Z") if m else None

def is_dup(existing, item):
    link = item["link"].lower().rstrip("/")
    t = norm_title(item["title"])
    for e in existing:
        if str(e.get("source_url") or "").lower().rstrip("/") == link: return True
        if any(str(s.get("url") or "").lower().rstrip("/") == link for s in (e.get("sources") or [])): return True
        if norm_title(e.get("title")) == t and len(t) > 12: return True
    return False

def load_feed_doc():
    """Last live doc first (fleet-data), then the baked data/v1 copy."""
    return read("changes.json", {"changes": []})

def save_feed_doc(doc):
    """Write the live feed to HB_OUT, only on real change."""
    return write_if_changed("changes.json", doc)

def check_hash_source(p, checks, sid, label, url, verified_at):
    prev = next((s for s in checks.get("sources", []) if s.get("id") == sid), {})
    raw, err = get(url)
    ok = raw is not None
    h = sig(raw.decode("utf-8", "replace")) if ok else prev.get("hash")
    changed = bool(ok and prev.get("hash") and h != prev["hash"])
    if changed:
        p.change("source-changed", label + " page changed", url)
    entry = {"id": sid, "label": label, "url": url, "hash": h,
             "checked_at": now(), "ok": ok, "error": None if ok else err,
             "verified_at": prev.get("verified_at", verified_at),
             "changed": bool(prev.get("changed") or changed),
             "changed_at": prev.get("changed_at") or (now() if changed else None)}
    checks["sources"] = [s for s in checks.get("sources", []) if s.get("id") != sid] + [entry]
    p.source(sid, label, ok, 1 if ok else 0, err, url)
    return entry

def main():
    p = Pulse()
    doc = load_feed_doc()
    existing = list(doc.get("changes") or [])
    now_iso = now()
    candidates = []  # {item, source_id, source_name, kind: platform|trade, hint}

    for sid, label, url, hint in PLATFORM_FEEDS:
        raw, err = get(url)
        items = []
        if raw is not None:
            text = raw.decode("utf-8", "replace")
            if re.search(r"<(rss|feed|rdf)[\s>]|<item[\s>]|<entry[\s>]", text[:4000], re.I):
                items = parse_items(text)
            else:
                err = "response was not a feed (HTML?)"
        p.source(sid, label, bool(items) or raw is not None and err is None, len(items), err, url)
        for it in items:
            candidates.append((it, sid, label, "platform", hint))
    for sid, label, url in TRADE_FEEDS:
        raw, err = get(url)
        items = []
        if raw is not None:
            text = raw.decode("utf-8", "replace")
            if re.search(r"<(rss|feed|rdf)[\s>]|<item[\s>]|<entry[\s>]", text[:4000], re.I):
                items = parse_items(text)
            else:
                err = "response was not a feed (HTML?)"
        p.source(sid, label, bool(items), len(items), err, url)
        for it in items:
            candidates.append((it, sid, label, "trade", None))

    # Relevance gate, same words as the old cron job.
    kept = []
    for it, sid, label, kind, hint in candidates:
        hay = it["title"] + " " + it["desc"]
        if not RELEVANT.search(hay): continue
        if not (CAT_MONETIZATION.search(hay) or CAT_LEGAL.search(hay) or CAT_POLICY.search(hay) or re.search(r"algorithm|rank|recommend|for you|fyp|distribution|reach|feed", hay, re.I)): continue
        kept.append({"item": it, "sid": sid, "label": label, "kind": kind, "hint": hint,
                     "kw": keywords(it["title"]), "pub": iso_pub(it["pub"])})

    # Trade corroboration: two trade sources, 3+ shared keywords, 72h.
    def within72(a, b):
        if not a or not b: return True
        try:
            from datetime import datetime
            da = datetime.strptime(a, "%Y-%m-%dT%H:%M:%SZ"); db = datetime.strptime(b, "%Y-%m-%dT%H:%M:%SZ")
            return abs((da - db).total_seconds()) <= 72 * 3600
        except Exception:
            return True
    fresh = []
    used = set()
    for i, c in enumerate(kept):
        if i in used: continue
        it = c["item"]
        if is_dup(existing + [f for f in fresh], it): continue
        plat = platform_of(it["title"] + " " + it["desc"], c["hint"])
        partners = []
        if c["kind"] == "trade":
            # One publisher never corroborates itself: Tubefilter's main
            # feed and its Twitch tag feed are the same outlet, so trade
            # corroboration needs a different publisher family.
            fam = lambda sid: sid.split("-")[0]
            for j, o in enumerate(kept):
                if j == i or j in used or o["kind"] != "trade" or fam(o["sid"]) == fam(c["sid"]): continue
                if len(c["kw"] & o["kw"]) >= 3 and within72(c["pub"], o["pub"]):
                    partners.append((j, o))
        verified = c["kind"] == "platform" or bool(partners)
        sources = [{"name": c["label"], "url": it["link"]}]
        for j, o in partners:
            used.add(j)
            sources.append({"name": o["label"], "url": o["item"]["link"]})
        entry = {
            "id": make_id(plat, it["title"], it["link"]),
            "platform": plat,
            "title": it["title"][:160],
            "summary": (it["desc"] or it["title"])[:600],
            "detected_at": now_iso,
            "announced_at": c["pub"],
            "effective_at": None,
            "source_url": it["link"],
            "sources": sources,
            "category": category(it["title"] + " " + it["desc"]),
            "confidence": "verified" if verified else "single-source",
            "affects": [],
        }
        fresh.append(entry)
        p.change("change", entry["title"], it["link"])
        if len(fresh) >= MAX_NEW: break

    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    merged = []
    for e in existing + fresh:
        try:
            t = datetime.strptime(str(e.get("detected_at"))[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if t >= cutoff: merged.append(e)
    merged.sort(key=lambda e: str(e.get("detected_at")), reverse=True)
    if fresh:
        doc = dict(doc)
        doc["updated"] = now_iso[:10]
        doc["generated_at"] = now_iso
        doc["changes"] = merged
        save_feed_doc(doc)

    # Page word-hash watches: TikTok Newsroom + the YPP help page.
    checks = read("source-checks.json", {"sources": []})
    check_hash_source(p, checks, "tiktok-newsroom", "TikTok Newsroom", TIKTOK_URL, None)
    check_hash_source(p, checks, "ypp-help", "YouTube Partner Program help page", YPP_URL, "2026-10-12")
    checks["generated_at"] = now_iso
    write_if_changed("source-checks.json", checks)
    p.write()

if __name__ == "__main__":
    main()
