/* Career Path, page wiring. Progress is this browser's localStorage
 * (key cge.career-path.v1, an array of done lesson ids), written on
 * every check-off and read on load. Tool titles/pages resolve against
 * the committed data/v1/tools.json catalogue, the same records the
 * hub and the Saved Shelf use; the shelf count reads Tool 32's own key
 * through its own engine. Nothing is sent anywhere.
 *
 * Rotation 22 (the manual's composition): every lesson renders in the
 * fixed anatomy. Formula name first (number, name, kind word, state
 * word), then the spec block, then What you need, the numbered steps,
 * the check-off criterion, and the conclusion line naming the artifact
 * produced. The spec table is data/v1/lessons.json, merged by the
 * engine; a lesson without a spec says so instead of guessing. Done
 * lessons and cleared stages carry their stamp in residence, printed
 * in the record at render, never animated in. */
(function () {
  "use strict";
  var CP = window.CareerPath;
  var root = document.getElementById("cp-path");
  if (!CP || !root) return;
  var readoutEl = document.getElementById("cp-readout");
  var nextEl = document.getElementById("cp-next");
  var shelfEl = document.getElementById("cp-shelf-line");
  var exportBox = document.getElementById("cp-export");
  var DATA = { catalog: null, spec: null, settled: 0 };
  var JOB_RANK = { "Planning": 0, "Money": 1, "Content": 2 };

  function load() {
    try {
      var v = window.localStorage.getItem(CP.STORAGE_KEY);
      var parsed = v ? JSON.parse(v) : [];
      return CP.normalizeProgress(parsed);
    } catch (e) { return []; }
  }
  function save(list) {
    try { window.localStorage.setItem(CP.STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked, path still renders */ }
    /* The journey strip under the header reads the same store;
       tell it to re-read now instead of waiting for a reload. */
    if (window.cgeJourneyRefresh) window.cgeJourneyRefresh();
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
  /* The tool's number in the manual's formula: its position in the
   * tools listing, by job (Planning, Money, Content) then catalogue
   * order. The same numbering scripts/build.py prints on the hub. */
  function toolNumber(id) {
    if (!DATA.catalog) return null;
    var tools = (DATA.catalog.tools || []).map(function (t, i) { return { id: t.id, job: t.job, i: i }; });
    tools.sort(function (a, b) {
      var d = (JOB_RANK[a.job] || 0) - (JOB_RANK[b.job] || 0);
      return d !== 0 ? d : a.i - b.i;
    });
    for (var k = 0; k < tools.length; k++) if (tools[k].id === id) return k + 1;
    return null;
  }
  function toolName(id) {
    var r = toolRecord(id);
    if (!r) return id;
    var n = toolNumber(id);
    return (n ? "Tool " + (n < 10 ? "0" + n : n) + " · " : "") + r.title;
  }

  function lessonHtml(les, s, isCurrent) {
    var action = les.kind === "read" && les.href
      ? "<a href=\"" + esc(les.href) + "\">Read the chapter</a>"
      : (les.tool && toolRecord(les.tool) ? "<a href=\"" + esc(toolRecord(les.tool).page) + "\">Open " + esc(toolName(les.tool)) + "</a>" : "");
    var stamp = les.done ? "<span class=\"stamp cp-stamp\">Done</span>" : "<span class=\"cp-stamp-slot\" aria-hidden=\"true\"></span>";
    var here = isCurrent && !les.done ? " <span class=\"cp-here\">You are here</span>" : "";
    var head = "<div class=\"cp-lesson-head\"><label><input type=\"checkbox\" data-lesson=\"" + esc(les.id) + "\"" + (les.done ? " checked" : "") + "> " +
      "<span class=\"cp-formula\"><span class=\"cp-num\">" + esc(les.number || "") + "</span> <strong>" + esc(les.title) + "</strong> " +
      "<span class=\"cp-kind\">" + esc(les.kind) + "</span>" + (les.state && les.state !== "current" ? " <span class=\"cp-state\">" + esc(les.state) + "</span>" : "") + here + "</span></label>" + stamp + "</div>";
    var liClass = "cp-lesson" + (les.done ? " cp-done" : "") + (isCurrent && !les.done ? " cp-current" : "");
    if (!les.time && !les.artifact) {
      var note0 = les.kind === "read" ? esc(les.detail || "") : esc(les.doneWhen || "");
      return "<li id=\"lesson-" + esc(les.id) + "\" class=\"" + liClass + "\">" + head +
        "<p class=\"cp-prov\">" + esc(les.provenanceLabel || "Provenance not recorded") + "</p>" +
        "<p class=\"muted\">Spec not recorded for this lesson.</p>" +
        (note0 ? "<p class=\"muted\">" + note0 + "</p>" : "") +
        (action ? "<p class=\"cp-action\">" + action + "</p>" : "") + "</li>";
    }
    /* Professional rework 2026-10-15: the spec plate becomes one quiet
     * meta line. Same facts (stage, kind, time, difficulty, state),
     * no form: a station on a route states its coordinates in a line. */
    var spec = "<p class=\"cp-meta\">" +
      (s.number || "") + " · " + esc(s.name) + " · " + esc(les.kind === "read" ? "Read" : "Drill") +
      " · " + esc(les.time || "Not recorded") + " · " + esc(les.difficulty || "Not recorded") +
      (les.state && les.state !== "current" ? " · " + esc(les.state) : "") + "</p>";
    var needs = les.needs && les.needs.length
      ? "<div class=\"cp-block\"><h4>What you need</h4><ul>" + les.needs.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>"
      : "";
    var steps = les.steps && les.steps.length
      ? "<div class=\"cp-block\"><h4>" + (les.kind === "read" ? "The read" : "The drill") + "</h4><ol>" + les.steps.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ol></div>"
      : "";
    // Revision 2026-10-15: the action (the door into the chapter or the
    // tool) renders directly under the lesson's name, before the meta
    // line. A beginner should meet the doing before the metadata.
    return "<li id=\"lesson-" + esc(les.id) + "\" class=\"" + liClass + "\">" + head +
      (action ? "<p class=\"cp-action\">" + action + "</p>" : "") + spec +
      "<p class=\"cp-prov\">" + esc(les.provenanceLabel || "Provenance not recorded") + "</p>" +
      (les.kind === "read" && les.detail ? "<p class=\"cp-detail muted\">" + esc(les.detail) + "</p>" : "") +
      needs + steps +
      (les.kind === "drill" && les.doneWhen ? "<p class=\"cp-donewhen\"><strong>Check it off when:</strong> " + esc(les.doneWhen) + "</p>" : "") +
      (les.artifact ? "<p class=\"cp-conclusion\"><strong>Done looks like:</strong> " + esc(les.artifact) + "</p>" : "") +
      "</li>";
  }

  function render() {
    var p = CP.buildPath(load(), DATA.spec);
    readoutEl.textContent = p.complete
      ? "Path complete, all " + p.totalLessons + " steps. The career is running; Algorithm Watch keeps it current."
      : "You are here: Stage " + (CP.STAGES.findIndex(function (s) { return s.id === p.currentStageId; }) + 1) +
        ", " + p.currentStageName + " · " + p.doneCount + " of " + p.totalLessons + " steps done (" + p.pct + "%)" +
        (p.staleCount ? " · " + p.staleCount + " stale lesson id(s) counted apart" : "");
    if (p.nextStep) {
      var l = p.nextStep.lesson;
      nextEl.innerHTML = "<strong>Your next step:</strong> " + esc(l.number || "") + " · " + esc(l.title) +
        (l.kind === "read" && l.href ? ", <a href=\"" + esc(l.href) + "\">open the chapter</a>" : "") +
        (l.kind === "drill" && l.tool && toolRecord(l.tool) ? ", <a href=\"" + esc(toolRecord(l.tool).page) + "\">open " + esc(toolRecord(l.tool).title) + "</a>" : "");
    } else {
      nextEl.innerHTML = "<strong>Path complete.</strong> Re-run any stage's drills as the channel grows, the numbers change, the order doesn't.";
    }
    root.innerHTML = p.stages.map(function (s, i) {
      var nextId = p.nextStep ? p.nextStep.lesson.id : null;
      var lessons = s.lessons.map(function (les) { return lessonHtml(les, s, les.id === nextId); }).join("");
      var chips = s.tools.map(function (id) {
        var r = toolRecord(id);
        return r ? "<li><a href=\"" + esc(r.page) + "\">" + esc(toolName(id)) + "</a></li>" : "<li>" + esc(id) + "</li>";
      }).join("");
      var stageStamp = s.status === "complete" ? "<span class=\"stamp cp-stage-stamp\">Stage cleared</span>" : "";
      return "<section class=\"cp-stage\" aria-label=\"Stage " + (i + 1) + ": " + esc(s.name) + "\">" +
        "<span class=\"cp-ghost\" aria-hidden=\"true\">" + (i + 1 < 10 ? "0" : "") + (i + 1) + "</span>" +
        "<div class=\"cp-stage-head\"><span class=\"cp-stage-num\">STAGE " + (i + 1) + " / 5</span>" +
        "<h2>" + esc(s.name) + "</h2>" + stageStamp +
        "<span class=\"cp-stage-status\">" + s.doneCount + "/" + s.total + " · " + esc(s.status.replace("-", " ")) + "</span></div>" +
        "<div class=\"cp-bar\" role=\"img\" aria-label=\"" + s.pct + "% of stage done\"><span style=\"width:" + s.pct + "%\"></span></div>" +
        "<p>" + esc(s.promise) + "</p>" +
        "<p class=\"cp-do\"><strong>After this stage you can:</strong> " + esc(s.doVerdict) + "</p>" +
        "<ol class=\"cp-lessons\" style=\"--fill:" + s.pct + "%\">" + lessons + "</ol>" +
        "<h3>Toolkit for this stage</h3><ul class=\"cp-tools\">" + chips + "</ul>" +
        (s.id === "foundation" ? "<p class=\"muted\">The Saved Shelf sits in Stage 1 because you set it up once, here, it then holds your most-used tools from <em>every</em> stage, in this browser only.</p>" : "") +
        "</section>";
    }).join("");
    // VP-0045 (rotation 30): anchored landings. Contents links point at
    // career-path.html#lesson-<id>; the lessons render from JS, so scroll
    // to the named lesson on the load renders. Lesson heights grow when
    // the spec table lands, so keep re-landing until both data fetches
    // settle; the settled flag keeps check-off re-renders from dragging
    // the visitor back.
    if (!render.hashScrolled && location.hash.indexOf("#lesson-") === 0) {
      var target = root.querySelector(location.hash);
      if (target) {
        target.scrollIntoView();
        if (DATA.settled >= 2) render.hashScrolled = true;
      }
    }
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
        (saved.length ? saved.length + " tool(s) saved across the path, your own collection, one tap back from anywhere." :
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
    DATA.catalog = doc; DATA.settled++; render();
  }).catch(function () { DATA.settled++; render(); /* catalogue unreachable, ids still render, titles resolve on next load */ });
  fetch("data/v1/lessons.json").then(function (r) { return r.json(); }).then(function (doc) {
    var map = {};
    (doc.lessons || []).forEach(function (les) { map[les.id] = les; });
    DATA.spec = map; DATA.settled++; render();
  }).catch(function () { DATA.settled++; render(); /* spec table unreachable, lessons render with the honest fallback */ });
})();
