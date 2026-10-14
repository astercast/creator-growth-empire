/* Shared site behavior: mobile nav, checklist persistence, progress helpers. */
(function () {
  "use strict";

  // JS-present gate: CSS keeps everything visible unless this class exists
  // (scroll-reveal failure mode = finished state, never blank).
  document.documentElement.classList.add("js");

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Persistent checklists: any <ul class="checklist"> gets click-to-check with localStorage
  function checklistKey(ul) {
    var id = ul.getAttribute("data-checklist-id") || ul.id || "checklist";
    return "cge-checklist-" + id;
  }
  document.querySelectorAll("ul.checklist").forEach(function (ul) {
    var key = checklistKey(ul);
    var done = {};
    try { done = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { done = {}; }
    var items = ul.querySelectorAll("li");
    items.forEach(function (li, i) {
      li.setAttribute("role", "checkbox");
      li.setAttribute("tabindex", "0");
      var set = function (v) {
        li.classList.toggle("done", v);
        li.setAttribute("aria-checked", String(v));
        done[i] = v;
        try { localStorage.setItem(key, JSON.stringify(done)); } catch (e) {}
      };
      if (done[i]) { li.classList.add("done"); li.setAttribute("aria-checked", "true"); }
      else { li.setAttribute("aria-checked", "false"); }
      if (!li.querySelector(".check-text")) {
        li.innerHTML = '<span class="check-text">' + li.innerHTML + "</span>";
      }
      li.addEventListener("click", function () { set(!li.classList.contains("done")); });
      li.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); set(!li.classList.contains("done")); }
      });
    });
  });

  // Copy buttons: <button data-copy="target-id">
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var el = document.getElementById(btn.getAttribute("data-copy"));
      if (!el) return;
      var text = el.innerText || el.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "Copied ✓";
          setTimeout(function () { btn.textContent = "Copy"; }, 1500);
        });
      }
    });
  });

  // Rotation 22: the scroll-reveal estate is removed (CREATOR-STUDY
  // Section 5.4). Pages render in their finished state; nothing waits
  // for a scroll trigger to become visible.
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Signature motion: stamp slams + XP fills, fired once per viewport.
  // Reduced-motion and no-IO visitors get the finished state instantly
  // (CSS default), feedback survives, physics doesn't.
  var impactEls = document.querySelectorAll(".stamp-slam, .xp");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    impactEls.forEach(function (el) {
      el.classList.add("slammed");
      el.classList.add("inview");
    });
  } else {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("slammed");
          en.target.classList.add("inview");
          sio.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.25 });
    impactEls.forEach(function (el) { sio.observe(el); });
  }

  // Quiz XP meter: tracks answered questions, marks answered fieldsets.
  var quizWrap = document.getElementById("quiz-questions");
  var meterFill = document.getElementById("quiz-meter-fill");
  var meter = document.getElementById("quiz-meter");
  var meterLabel = document.getElementById("quiz-meter-label");
  if (quizWrap && meterFill) {
    var TOTAL_Q = 6;
    var updateMeter = function () {
      var answered = quizWrap.querySelectorAll(".quiz-q.answered").length;
      // fallback: count checked radios in case classes aren't set yet
      if (!answered) {
        var names = {};
        quizWrap.querySelectorAll('input[type="radio"]:checked').forEach(function (r) { names[r.name] = 1; });
        answered = Object.keys(names).length;
      }
      var pct = Math.round((answered / TOTAL_Q) * 100);
      meterFill.style.width = pct + "%";
      if (meter) meter.setAttribute("aria-valuenow", String(answered));
      if (meterLabel) {
        var words = ["keep going, commander", "warming up", "halfway to intel", "almost there", "one more", "intel complete, hit the button"];
        meterLabel.innerHTML = "<strong>" + answered + "/" + TOTAL_Q + "</strong> answered, " + (words[Math.min(answered, 5)] || words[0]);
      }
    };
    quizWrap.addEventListener("change", function (e) {
      var fs = e.target.closest ? e.target.closest(".quiz-q") : null;
      if (fs) fs.classList.add("answered");
      updateMeter();
    });
    var resetBtn = document.getElementById("quiz-reset");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      setTimeout(function () {
        quizWrap.querySelectorAll(".quiz-q").forEach(function (fs) { fs.classList.remove("answered"); });
        updateMeter();
      }, 0);
    });
    updateMeter();
  }

  // Calm mode, the site-wide sensory-envelope kill switch (wave 30).
  // Same mechanism the simulator's calm mode uses: data-calm="1" on <html>
  // + localStorage "cge.calm". The <head> inline script already applied the
  // attribute pre-paint; here we wire the header toggle and keep the
  // simulator's own checkbox in sync when both share a page.
  var calmBtn = document.getElementById("calmToggle");
  function setCalm(on) {
    if (on) document.documentElement.setAttribute("data-calm", "1");
    else document.documentElement.removeAttribute("data-calm");
    try { localStorage.setItem("cge.calm", on ? "1" : "0"); } catch (e) {}
    if (calmBtn) calmBtn.setAttribute("aria-pressed", String(on));
    var sbox = document.getElementById("s-calm");
    if (sbox) sbox.checked = on;
  }
  if (calmBtn) {
    calmBtn.setAttribute("aria-pressed",
      String(document.documentElement.getAttribute("data-calm") === "1"));
    calmBtn.addEventListener("click", function () {
      setCalm(document.documentElement.getAttribute("data-calm") !== "1");
    });
  }

  // Radar section map (wave 30): the dossier nav on long chapter/reference
  // pages. Tracks reading position with aria-current (state, not motion,
  // it holds under reduced motion) and drives a thin read-progress rail
  // off the same scroll position ("one progress drives everything").
  // No-ops on pages without [data-radar].
  (function radar() {
    var asides = document.querySelectorAll("[data-radar]");
    if (!asides.length || !("IntersectionObserver" in window)) return;
    // group every map link on the page (sidebar + mobile disclosure) by target
    var byHref = {};
    document.querySelectorAll("[data-radar] a[href^='#'], [data-radar-mobile] a[href^='#']")
      .forEach(function (a) {
        var h = a.getAttribute("href");
        (byHref[h] = byHref[h] || []).push(a);
      });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || !e.target.id) return;
        var links = byHref["#" + e.target.id] || [];
        if (!links.length) return;
        Object.keys(byHref).forEach(function (h) {
          byHref[h].forEach(function (a) { a.removeAttribute("aria-current"); });
        });
        links.forEach(function (a) { a.setAttribute("aria-current", "true"); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    var seen = {};
    document.querySelectorAll(".chapter-with-map article.chapter").forEach(function (art) {
      art.querySelectorAll("h2[id]").forEach(function (h) {
        if (!seen[h.id]) { seen[h.id] = true; io.observe(h); }
      });
    });
    // read-progress rails: one passive scroll listener, rAF-throttled
    var rails = [];
    asides.forEach(function (aside) {
      var rail = aside.querySelector(".radar-rail");
      var scope = aside.closest ? aside.closest(".chapter-with-map") : null;
      var art = scope ? scope.querySelector("article.chapter") : null;
      if (rail && art) rails.push({ rail: rail, fill: rail.querySelector("i"), art: art });
    });
    if (!rails.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      rails.forEach(function (r) {
        var top = r.art.offsetTop;
        var h = r.art.offsetHeight - window.innerHeight;
        var p = h > 0 ? Math.min(1, Math.max(0, (window.pageYOffset - top) / h)) : 0;
        var pct = Math.round(p * 100);
        r.rail.setAttribute("aria-valuenow", String(pct));
        if (r.fill) r.fill.style.width = pct + "%";
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();
})();
