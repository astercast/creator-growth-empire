/* this-week.js: personalizes /this-week in this browser only.
 * Reads the same saved progress the Path uses, then swaps in the
 * next 3 steps of your stage, the newest verified change that
 * touches your steps, and a week file (.ics) built on your device.
 * Nothing is sent anywhere. */
(function () {
  "use strict";
  var KEY = "cge.career-path.v1";
  var island = document.getElementById("this-week-data");
  if (!island) return;
  var data;
  try { data = JSON.parse(island.textContent); } catch (e) { return; }
  if (!data || !data.order) return;

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dateLabel(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  var done = load();
  var set = {};
  done.forEach(function (id) { set[id] = true; });
  var stageOrder = ["foundation", "build", "publish", "growth", "career"];
  var currentSid = null;
  stageOrder.forEach(function (sid) {
    if (currentSid) return;
    var ids = data.stages[sid] || [];
    if (ids.some(function (id) { return !set[id]; })) currentSid = sid;
  });

  var next3 = [];
  if (currentSid) {
    var rest = data.order.filter(function (id) { return !set[id]; });
    var inStage = rest.filter(function (id) { return data.steps[id] && data.steps[id].s === currentSid; });
    var after = rest.filter(function (id) { return !(data.steps[id] && data.steps[id].s === currentSid); });
    next3 = inStage.concat(after).slice(0, 3);
  }

  var stageEl = document.querySelector("[data-tw-stage]");
  if (stageEl) {
    stageEl.textContent = currentSid
      ? "Your stage: Stage " + (stageOrder.indexOf(currentSid) + 1) + ", " + (data.names[currentSid] || currentSid) + "."
      : "You have done every step. The career is running.";
  }
  var listEl = document.querySelector("[data-tw-steps]");
  if (listEl && next3.length) {
    listEl.innerHTML = next3.map(function (id) {
      var s = data.steps[id];
      return '<li><a href="' + esc(s.h) + '">' + esc(s.t) + "</a></li>";
    }).join("");
  }

  /* The one change: newest verified change that touches a step you
     still have to do. If none touches your steps, say so plainly. */
  var changeEl = document.querySelector("[data-tw-change]");
  var mine = (data.changes || []).filter(function (c) {
    return (c.affects || []).some(function (id) { return !set[id]; });
  });
  if (changeEl) {
    if (mine.length) {
      var c = mine[0];
      var when = dateLabel(c.announced_at || c.detected_at);
      changeEl.innerHTML = 'One change that touches your steps: <a href="what-changed.html#change-' +
        esc(c.id) + '">' + esc(c.title) + "</a>" + (when ? " (" + esc(when) + ")" : "") +
        ". Read it before you do the step it touches.";
    } else if (currentSid) {
      changeEl.textContent = "No verified change touches your steps right now.";
    }
  }

  /* The week file: one event per step, on the next Monday, Wednesday,
     and Friday at 10 in the morning, one hour each. Built here, on
     your device, from your own next steps. */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function stamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" +
      pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  function buildIcs() {
    var now = new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var shift = (8 - monday.getDay()) % 7; /* days to next Monday */
    if (shift === 0) shift = 7;
    monday.setDate(monday.getDate() + shift);
    var days = [0, 2, 4];
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Creator Growth Empire//This Week//EN"];
    next3.forEach(function (id, i) {
      var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + days[i % 3], 10, 0, 0);
      var end = new Date(d.getTime() + 60 * 60 * 1000);
      var s = data.steps[id];
      lines.push("BEGIN:VEVENT");
      lines.push("UID:" + id + "-" + stamp(d) + "@creator-growth-empire");
      lines.push("DTSTAMP:" + stamp(now));
      lines.push("DTSTART:" + stamp(d));
      lines.push("DTEND:" + stamp(end));
      lines.push("SUMMARY:" + String(s.t).replace(/([,;\\])/g, "\\$1"));
      lines.push("DESCRIPTION:From your Path. Stage: " + (data.names[s.s] || s.s));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  var icsBtn = document.querySelector("[data-tw-ics]");
  if (icsBtn) icsBtn.addEventListener("click", function () {
    if (!next3.length) return;
    var blob = new Blob([buildIcs()], { type: "text/calendar" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "this-week.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  });
  var printBtn = document.querySelector("[data-tw-print]");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
})();
