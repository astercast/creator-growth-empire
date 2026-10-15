/* Home progress wiring (revision 2026-10-15).
 * The home page's first steps and stage counts read and write the same
 * store the Path uses (localStorage "cge.career-path.v1", a JSON list of
 * lesson ids), so a tick on the home page is a tick on the Path, and
 * back. No account, nothing sent anywhere. */
(function () {
  "use strict";
  var KEY = "cge.career-path.v1";
  var dataEl = document.getElementById("home-path-data");
  if (!dataEl) return;
  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var known = {};
  data.order.forEach(function (id) { known[id] = true; });

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(v)) return [];
      var seen = {}, out = [];
      v.forEach(function (id) {
        if (known[id] && !seen[id]) { seen[id] = true; out.push(id); }
      });
      return out;
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked; page still reads fine */ }
  }

  var boxes = Array.prototype.slice.call(document.querySelectorAll("[data-lesson-toggle]"));
  var fill = document.getElementById("home-spine-fill");
  var progress = document.getElementById("home-progress");
  var routePlace = document.getElementById("route-place");
  var stageOrder = ["foundation", "build", "publish", "growth", "career"];
  var stageNames = {
    foundation: "Start From Nothing", build: "Make Your Videos",
    publish: "Post and Keep Posting", growth: "Grow Your People",
    career: "Turn It Into a Career"
  };

  function render() {
    var done = load();
    var set = {};
    done.forEach(function (id) { set[id] = true; });
    boxes.forEach(function (b) {
      b.checked = !!set[b.getAttribute("data-lesson-toggle")];
      var block = b.closest ? b.closest(".step-block") : null;
      if (block) block.classList.toggle("is-done", b.checked);
    });
    var currentSid = null;
    Object.keys(data.stages).forEach(function (sid) {
      var ids = data.stages[sid];
      var n = ids.filter(function (id) { return set[id]; }).length;
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-stage-count="' + sid + '"]'),
        function (el) { el.textContent = n + " of " + ids.length + " steps done"; });
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-stage-fill="' + sid + '"]'),
        function (el) { el.style.width = (ids.length ? Math.round((n / ids.length) * 100) : 0) + "%"; });
      var stop = document.querySelector('[data-route-stage="' + sid + '"]');
      if (stop) {
        stop.classList.toggle("is-done", n === ids.length);
        stop.classList.remove("is-current");
      }
      if (currentSid === null && n < ids.length) currentSid = sid;
    });
    if (currentSid) {
      var cur = document.querySelector('[data-route-stage="' + currentSid + '"]');
      if (cur) cur.classList.add("is-current");
    }
    if (routePlace) {
      if (done.length >= data.order.length) {
        routePlace.textContent = "You have walked the whole road.";
      } else if (currentSid) {
        routePlace.textContent = "You are at Stage " + (stageOrder.indexOf(currentSid) + 1) +
          ", " + stageNames[currentSid] + ".";
      }
    }
    var total = data.order.length;
    if (fill) fill.style.width = (total ? Math.round((done.length / total) * 100) : 0) + "%";
    if (progress) {
      if (done.length === 0) {
        progress.textContent = "Your first step is below. Tick each step off as you finish it. The path fills in as you go.";
      } else if (done.length >= total) {
        progress.textContent = "You have done all " + total + " steps. The career is running. Keep the Watch page close, and re-run a step when your numbers change.";
      } else {
        progress.textContent = "You have done " + done.length + " of " + total + " steps. The Path marks your next step for you.";
      }
    }
  }

  boxes.forEach(function (b) {
    b.addEventListener("change", function () {
      var id = b.getAttribute("data-lesson-toggle");
      var done = load().filter(function (x) { return x !== id; });
      if (b.checked) done.push(id);
      save(done);
      render();
    });
  });
  render();
})();
