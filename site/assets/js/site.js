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

  // Scroll-reveal: .reveal elements animate in via IntersectionObserver.
  // Reduced-motion users and no-IO browsers get everything visible immediately.
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function revealize(scope) {
    (scope || document).querySelectorAll(".chapter h2, .chapter .callout, .chapter blockquote, .chapter .table-wrap").forEach(function (el) {
      el.classList.add("reveal");
    });
  }
  revealize(document);
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // Signature motion: stamp slams + XP fills, fired once per viewport.
  // Reduced-motion and no-IO visitors get the finished state instantly
  // (CSS default) — feedback survives, physics doesn't.
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
        var words = ["keep going, commander", "warming up", "halfway to intel", "almost there", "one more", "intel complete — hit the button"];
        meterLabel.innerHTML = "<strong>" + answered + "/" + TOTAL_Q + "</strong> answered — " + (words[Math.min(answered, 5)] || words[0]);
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
})();
