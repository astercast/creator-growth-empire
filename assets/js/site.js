/* Shared site behavior: mobile nav, checklist persistence, progress helpers. */
(function () {
  "use strict";

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
})();
