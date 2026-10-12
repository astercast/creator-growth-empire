/* The 2026 Platform Rules Bible — wayfinding layer (wave 28).
   Progressive enhancement only: the page reads fully without this file
   (the "What's inside" list is static markup). With it: heading anchors,
   a linkified table of contents with active-section highlighting, and a
   scroll-progress indicator (CSS scroll-driven animation where supported —
   see research_notes/web-craft-20261011-2014 — with a rAF fallback here).
   All motion is reduced-motion-safe; the TOC is plain anchor links, fully
   keyboard/screen-reader navigable. Pure DOM wiring — no data, no network,
   no storage. */
(function () {
  "use strict";
  if (typeof document === "undefined") return;

  var article = document.querySelector("article.chapter");
  if (!article) return;

  /* Scoping hook for the bible's staged craft styles (see fragment-w28).
     Only this page gets the class, so the site's identity is untouched. */
  article.classList.add("platform-rules");
  /* Body-level hook: lets staged CSS scope viewport behaviors (smooth anchor
     scrolling under no-preference) to this page only. */
  document.body.classList.add("platform-rules-page");

  /* 1. Anchor ids on every h2 (slugified, deduped). Build-time ids win:
     only assign where the build didn't (wave 30 gives every chapter h2 an
     id for the radar section map, and those must stay stable). */
  var heads = Array.prototype.slice.call(article.querySelectorAll("h2"));
  var seen = {};
  heads.forEach(function (h) { if (h.id) seen[h.id] = true; });
  function slugify(t) {
    return "sec-" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  heads.forEach(function (h) {
    if (h.id) return;
    var base = slugify(h.textContent), id = base, n = 2;
    while (seen[id]) { id = base + "-" + (n++); }
    seen[id] = true;
    h.id = id;
  });

  /* 2. Linkify the static "What's inside" list. The list items are in the
     same order as the content h2s that follow it (Sources excluded), so we
     pair by index — and bail out entirely if the counts don't match, rather
     than link to the wrong section. */
  var tocHead = null, tocList = null;
  heads.forEach(function (h) {
    if (/^what'?s inside/i.test(h.textContent.trim())) tocHead = h;
  });
  if (tocHead) {
    var sib = tocHead.nextElementSibling;
    while (sib && sib.tagName !== "OL") sib = sib.nextElementSibling;
    tocList = sib;
  }
  var tocLinks = [];
  if (tocList) {
    var items = tocList.querySelectorAll(":scope > li");
    var targets = heads.filter(function (h) {
      return h !== tocHead && !/^sources$/i.test(h.textContent.trim());
    });
    if (items.length === targets.length && items.length > 0) {
      tocList.setAttribute("aria-label", "On this page");
      tocList.classList.add("rules-toc");
      Array.prototype.forEach.call(items, function (li, i) {
        var a = document.createElement("a");
        a.href = "#" + targets[i].id;
        while (li.firstChild) a.appendChild(li.firstChild);
        li.appendChild(a);
        tocLinks.push({ link: a, head: targets[i] });
      });
    }
  }

  /* 3. Active-section highlighting via IntersectionObserver. aria-current is
     state, not motion — it stays on under prefers-reduced-motion. */
  if (tocLinks.length && "IntersectionObserver" in window) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var pair = null;
        tocLinks.forEach(function (p) { if (p.head === e.target) pair = p; });
        if (!pair || pair === current) return;
        if (current) current.link.removeAttribute("aria-current");
        pair.link.setAttribute("aria-current", "true");
        current = pair;
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    tocLinks.forEach(function (p) { io.observe(p.head); });
  }

  /* 4. Scroll-progress indicator. Primary mechanism is CSS scroll-driven
     animation (animation-timeline: scroll() — compositor-thread, zero jank;
     see the staged CSS, gated behind prefers-reduced-motion). This JS is the
     fallback for engines without it: feature-detect, and if the CSS timeline
     is supported, install no scroll listener at all (near-zero-JS is an INP
     feature, not a limitation). The bar is a state indicator, not motion —
     it updates under prefers-reduced-motion too. */
  var cssTimeline = (typeof CSS !== "undefined" && CSS.supports &&
    CSS.supports("animation-timeline: scroll()"));
  var bar = document.createElement("div");
  bar.className = "rules-progress";
  bar.setAttribute("aria-hidden", "true");
  var fill = document.createElement("span");
  bar.appendChild(fill);
  document.body.appendChild(bar);
  if (!cssTimeline) {
    var ticking = false;
    var top = article.offsetTop;
    var height = function () { return article.offsetHeight - window.innerHeight; };
    var update = function () {
      ticking = false;
      var h = height();
      var p = h > 0 ? Math.min(1, Math.max(0, (window.pageYOffset - top) / h)) : 0;
      fill.style.width = (p * 100).toFixed(2) + "%";
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
})();
