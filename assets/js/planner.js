/* 90-Day Planner: posting schedule generator + print. */
(function () {
  "use strict";
  var form = document.getElementById("plan-form");
  var out = document.getElementById("plan-results");
  if (!form || !out) return;

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var longPerWeek = Math.min(7, Math.max(0, parseInt(document.getElementById("p-long").value, 10) || 0));
    var shortPerWeek = Math.min(21, Math.max(0, parseInt(document.getElementById("p-short").value, 10) || 0));
    var platforms = document.getElementById("p-platforms").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var rest = parseInt(document.getElementById("p-rest").value, 10) || 6;
    if (!platforms.length) platforms = ["Short-form"];

    var html = "";
    var totalLong = 0, totalShort = 0;
    for (var w = 1; w <= 13; w++) {
      html += '<div class="plan-week"><h3>Week ' + w + (w === 7 ? ": midpoint review" : "") + "</h3>";
      html += '<div class="plan-days">';
      // spread long-form across non-rest days
      var workDays = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return d !== rest; });
      var longDays = [];
      for (var l = 0; l < longPerWeek; l++) longDays.push(workDays[l % workDays.length]);
      var shortDays = [];
      for (var s2 = 0; s2 < shortPerWeek; s2++) shortDays.push(workDays[(s2 * 2) % workDays.length]);
      for (var d = 0; d < 7; d++) {
        var items = [];
        var nl = longDays.filter(function (x) { return x === d; }).length;
        var ns = shortDays.filter(function (x) { return x === d; }).length;
        if (d === rest) { items.push("<em>Rest, no posting. Review analytics.</em>"); }
        if (nl) { items.push("🎬 " + nl + " long-form video" + (nl > 1 ? "s" : "")); totalLong += nl; }
        if (ns) {
          var per = Math.ceil(ns / platforms.length);
          items.push("⚡ " + ns + " short" + (ns > 1 ? "s" : "") + " → " + platforms.join(", "));
          totalShort += ns;
        }
        if (!items.length) items.push("<span class='muted'>·</span>");
        html += '<div class="plan-day"><strong>' + DAYS[d] + "</strong>" + items.join("<br>") + "</div>";
      }
      html += "</div>";
      if (w === 6) html += "<p class='muted'><strong>Day 45 checkpoint:</strong> kill your worst-performing format, double your best outlier. The plan serves the data, not the other way around.</p>";
      html += "</div>";
    }
    html = '<div class="calc-grid">' +
      '<div class="calc-out"><div class="lbl">Long-form videos</div><div class="big">' + totalLong + "</div></div>" +
      '<div class="calc-out"><div class="lbl">Short-form posts</div><div class="big">' + totalShort + "</div></div>" +
      '<div class="calc-out"><div class="lbl">Total pieces</div><div class="big">' + (totalLong + totalShort) + "</div></div></div>" + html;
    out.innerHTML = html;
  });

  document.getElementById("plan-print").addEventListener("click", function () { window.print(); });
})();
