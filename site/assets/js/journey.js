/* The journey strip (professional rework 2026-10-15).
 * One slim strip under the header on every page: where you are on
 * the Path, how much of it is done, and the one next step. It reads
 * the same store the Path and the home page write (localStorage
 * "cge.career-path.v1", a JSON list of lesson ids) and the path
 * island the generator prints on every page. With no store yet it
 * shows the starting state the template already printed. Nothing is
 * sent anywhere; with JavaScript off, the strip still states the
 * whole journey in one line and links to the Path.
 * Round 2 (2026-10-24): the strip used to read the store once, so a
 * tick on the same page only showed after a reload. It now re-reads
 * on every render: the tick writers call window.cgeJourneyRefresh()
 * after saving, and a storage event covers ticks in another tab. */
(function () {
  "use strict";
  var place = document.getElementById("js-place");
  var fill = document.getElementById("js-fill");
  var next = document.getElementById("js-next");
  var island = document.getElementById("cge-path-data");
  if (!place || !next || !island) return;
  var data;
  try { data = JSON.parse(island.textContent); } catch (e) { return; }
  if (!data || !data.order || !data.order.length) return;

  var KEY = "cge.career-path.v1";
  var known = {};
  data.order.forEach(function (id) { known[id] = true; });

  var total = data.order.length;
  var stageIds = Object.keys(data.stages || {});
  function stageIndex(sid) { return stageIds.indexOf(sid); }

  function render() {
    var done = [];
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(v)) {
        var seen = {};
        v.forEach(function (id) {
          if (known[id] && !seen[id]) { seen[id] = true; done.push(id); }
        });
      }
    } catch (e) { /* storage blocked; the strip keeps its starting state */ }
    var set = {};
    done.forEach(function (id) { set[id] = true; });

    var nextId = null;
    for (var i = 0; i < data.order.length; i++) {
      if (!set[data.order[i]]) { nextId = data.order[i]; break; }
    }

    if (fill) fill.style.width = Math.round((done.length / total) * 100) + "%";

    if (!nextId) {
      place.textContent = "All " + total + " steps done. The career is running.";
      next.textContent = "Keep the Watch close";
      next.setAttribute("href", "what-changed.html");
      return;
    }

    var step = data.steps[nextId];
    var sid = step.s;
    place.textContent = "Stage " + (stageIndex(sid) + 1) + " of " + stageIds.length +
      " · " + data.names[sid] + " · " + done.length + " of " + total + " steps done";
    var onPath = /(^|\/)career-path\.html$/.test(window.location.pathname);
    next.setAttribute("href", onPath ? step.a : step.h);
    next.innerHTML = "";
    var label = document.createElement("span");
    label.textContent = "Next step: " + step.n + " · " + step.t;
    var arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = " →";
    next.appendChild(label);
    next.appendChild(arrow);
  }

  render();
  window.cgeJourneyRefresh = render;
  window.addEventListener("storage", function (ev) {
    if (!ev.key || ev.key === KEY) render();
  });
})();
