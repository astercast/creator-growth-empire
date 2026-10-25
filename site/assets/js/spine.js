/* spine.js: the Spine (Claude bundle 2026-10-24, creator-spine.tgz).
 * A 35-tick bar fixed at the top of every page. It reads the same store
 * the Path uses (localStorage "cge.career-path.v1", a JSON list of done
 * step ids) and the same path shape the home page uses
 * (data/v1/path.json, written by scripts/build.py from the one path
 * source). Nothing leaves the browser. Done steps are tall orange
 * ticks, the next step is a tall black tick, the rest are grey stubs,
 * and each new stage starts after a gap. A small dot marks a tick when
 * a verified platform change touches that step. Under the bar sits the
 * Wire: one line for each verified change, newest first. */
(function () {
  "use strict";
  var KEY = "cge.career-path.v1";
  var NAMES = { foundation: "Start From Nothing", build: "Make Your Videos", publish: "Post and Keep Posting", growth: "Grow Your People", career: "Turn It Into a Career" };

  function doneSet() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return new Set(Array.isArray(v) ? v : []);
    } catch (e) { return new Set(); }
  }

  function getJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); });
  }

  function render(path, changes) {
    var d = doneSet();
    var first = path.order.findIndex(function (id) { return !d.has(id); });
    if (first < 0) first = path.order.length;
    var stageOf = function (id) {
      return Object.keys(path.stages).find(function (s) { return path.stages[s].indexOf(id) >= 0; });
    };
    var starts = new Set(Object.values(path.stages).map(function (ids) { return ids[0]; }));
    var affected = new Set();
    (changes || []).forEach(function (c) {
      if (c.confidence !== "verified") return;
      (c.affects || []).forEach(function (id) { affected.add(id); });
    });
    var cur = path.order[first];
    var stage = cur ? NAMES[stageOf(cur)] : "Done";
    var el = document.createElement("nav");
    el.className = "spine";
    el.setAttribute("aria-label", "Your progress");
    var ticks = path.order.map(function (id, i) {
      var cls = (d.has(id) ? "done" : (i === first ? "next" : "")) +
        (starts.has(id) ? " stage-start" : "") + (affected.has(id) ? " has-change" : "");
      return '<li class="' + cls.trim() + '"></li>';
    }).join("");
    el.innerHTML = "<span>" + d.size + " of " + path.order.length + "</span>" +
      '<ol class="spine-ticks" aria-hidden="true">' + ticks + "</ol>" +
      '<span class="spine-now">' + (cur ? 'Next: <a href="career-path.html#lesson-' + cur + '">' + stage + "</a>" : "Every step done") + "</span>";
    document.body.prepend(el);
    document.documentElement.classList.add("has-spine");
  }

  function wire(changes) {
    var list = (changes || []).filter(function (x) { return x.confidence === "verified"; })
      .sort(function (a, b) { return String(b.announced_at || b.detected_at).localeCompare(String(a.announced_at || a.detected_at)); })
      .slice(0, 8);
    if (!list.length) return;
    var el = document.createElement("div");
    el.className = "cwire";
    el.setAttribute("aria-label", "Verified platform changes");
    el.innerHTML = list.map(function (x) {
      var when = String(x.announced_at || x.detected_at || "").slice(5, 10);
      var title = String(x.title || "").split(":")[0].replace(/</g, "&lt;");
      return '<a href="what-changed.html#change-' + x.id + '"><b>' + x.platform + " " + when + "</b><span>" + title + "</span></a>";
    }).join("");
    var spineEl = document.querySelector(".spine");
    if (spineEl) spineEl.after(el);
  }

  Promise.all([
    getJson("data/v1/path.json"),
    getJson("data/v1/changes.json").catch(function () { return { changes: [] }; })
  ]).then(function (res) {
    var path = res[0];
    var changes = (res[1] && res[1].changes) || [];
    render(path, changes);
    wire(changes);
  }).catch(function () { /* no spine is better than a broken one */ });
})();
