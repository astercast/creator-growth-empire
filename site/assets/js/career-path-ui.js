/* Career Path — page wiring. Progress is this browser's localStorage
 * (key cge.career-path.v1, an array of done lesson ids), written on
 * every check-off and read on load. Tool titles/pages resolve against
 * the committed data/v1/tools.json catalogue — the same records the
 * hub and the Saved Shelf use; the shelf count reads Tool 32's own key
 * through its own engine. Nothing is sent anywhere. */
(function () {
  "use strict";
  var CP = window.CareerPath;
  var root = document.getElementById("cp-path");
  if (!CP || !root) return;
  var readoutEl = document.getElementById("cp-readout");
  var nextEl = document.getElementById("cp-next");
  var shelfEl = document.getElementById("cp-shelf-line");
  var exportBox = document.getElementById("cp-export");
  var DATA = { catalog: null };

  function load() {
    try {
      var v = window.localStorage.getItem(CP.STORAGE_KEY);
      var parsed = v ? JSON.parse(v) : [];
      return CP.normalizeProgress(parsed);
    } catch (e) { return []; }
  }
  function save(list) {
    try { window.localStorage.setItem(CP.STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked — path still renders */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>\"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toolRecord(id) {
    if (!DATA.catalog) return null;
    var tools = DATA.catalog.tools || [];
    for (var i = 0; i < tools.length; i++) if (tools[i].id === id) return tools[i];
    return null;
  }

  function render() {
    var p = CP.buildPath(load());
    readoutEl.textContent = p.complete
      ? "Path complete — all " + p.totalLessons + " lessons. The career is running; Algorithm Watch keeps it current."
      : "You are here: Stage " + (CP.STAGES.findIndex(function (s) { return s.id === p.currentStageId; }) + 1) +
        " — " + p.currentStageName + " · " + p.doneCount + " of " + p.totalLessons + " lessons done (" + p.pct + "%)" +
        (p.staleCount ? " · " + p.staleCount + " stale lesson id(s) counted apart" : "");
    if (p.nextStep) {
      var l = p.nextStep.lesson;
      nextEl.innerHTML = "<strong>Your next step:</strong> " + esc(l.title) +
        (l.kind === "read" && l.href ? " — <a href=\"" + esc(l.href) + "\">open the chapter</a>" : "") +
        (l.kind === "drill" && l.tool && toolRecord(l.tool) ? " — <a href=\"" + esc(toolRecord(l.tool).page) + "\">open " + esc(toolRecord(l.tool).title) + "</a>" : "");
    } else {
      nextEl.innerHTML = "<strong>Path complete.</strong> Re-run any stage's drills as the channel grows — the numbers change, the order doesn't.";
    }
    root.innerHTML = p.stages.map(function (s, i) {
      var lessons = s.lessons.map(function (les) {
        var action = les.kind === "read" && les.href
          ? "<a href=\"" + esc(les.href) + "\">Read</a>"
          : (les.tool && toolRecord(les.tool) ? "<a href=\"" + esc(toolRecord(les.tool).page) + "\">" + esc(toolRecord(les.tool).title) + "</a>" : "");
        var note = les.kind === "read" ? esc(les.detail || "") : esc(les.doneWhen || "");
        return "<li class=\"cp-lesson" + (les.done ? " cp-done" : "") + "\">" +
          "<label><input type=\"checkbox\" data-lesson=\"" + esc(les.id) + "\"" + (les.done ? " checked" : "") + "> " +
          "<span class=\"cp-kind\">" + esc(les.provenanceLabel || "Provenance not recorded") + "</span> <strong>" + esc(les.title) + "</strong></label>" +
          (note ? "<p class=\"muted\">" + note + "</p>" : "") +
          (action ? "<p class=\"cp-action\">" + action + "</p>" : "") + "</li>";
      }).join("");
      var chips = s.tools.map(function (id) {
        var r = toolRecord(id);
        return r ? "<li><a href=\"" + esc(r.page) + "\">" + esc(r.title) + "</a></li>" : "<li>" + esc(id) + "</li>";
      }).join("");
      return "<section class=\"cp-stage\" aria-label=\"Stage " + (i + 1) + ": " + esc(s.name) + "\">" +
        "<div class=\"cp-stage-head\"><span class=\"cp-stage-num\">STAGE " + (i + 1) + " / 5</span>" +
        "<h2>" + esc(s.name) + "</h2>" +
        "<span class=\"cp-stage-status\">" + s.doneCount + "/" + s.total + " · " + esc(s.status.replace("-", " ")) + "</span></div>" +
        "<div class=\"cp-bar\" role=\"img\" aria-label=\"" + s.pct + "% of stage done\"><span style=\"width:" + s.pct + "%\"></span></div>" +
        "<p>" + esc(s.promise) + "</p>" +
        "<p class=\"cp-do\"><strong>After this stage you can:</strong> " + esc(s.doVerdict) + "</p>" +
        "<ol class=\"cp-lessons\">" + lessons + "</ol>" +
        "<h3>Toolkit for this stage</h3><ul class=\"cp-tools\">" + chips + "</ul>" +
        (s.id === "foundation" ? "<p class=\"muted\">The Saved Shelf sits in Stage 1 because you set it up once, here — it then holds your most-used tools from <em>every</em> stage, in this browser only.</p>" : "") +
        "</section>";
    }).join("");
    Array.prototype.forEach.call(root.querySelectorAll("[data-lesson]"), function (box) {
      box.addEventListener("change", function () {
        save(CP.toggleLesson(load(), box.getAttribute("data-lesson")));
        render();
      });
    });
    if (shelfEl && window.SavedShelf) {
      var saved = [];
      try { saved = JSON.parse(window.localStorage.getItem(window.SavedShelf.STORAGE_KEY) || "[]"); } catch (e) { saved = []; }
      shelfEl.innerHTML = "Your <a href=\"saved-shelf.html\">Saved Shelf</a>: " +
        (saved.length ? saved.length + " tool(s) saved across the path — your own collection, one tap back from anywhere." :
          "nothing saved yet. As stages hand you tools you keep returning to, save them from their own pages and they wait on your shelf.");
    }
    if (exportBox) exportBox.value = CP.exportPath(p);
  }

  var copyBtn = document.getElementById("cp-copy");
  if (copyBtn && exportBox) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy your progress record"; }, 2000);
  });

  render();
  fetch("data/v1/tools.json").then(function (r) { return r.json(); }).then(function (doc) {
    DATA.catalog = doc; render();
  }).catch(function () { /* catalogue unreachable — ids still render, titles resolve on next load */ });
})();
