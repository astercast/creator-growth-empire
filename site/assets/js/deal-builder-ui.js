/* Deal Builder UI, pure DOM wiring (no math lives here; all math is in
 * assets/js/deal-builder.js). Renders the deliverable-line repeater,
 * the quote, term checks, proposal, and checklist; persists last input +
 * checklist ticks to localStorage. */
(function () {
  "use strict";
  var DB = window.DealBuilder;
  var LS_KEY = "cge.dealbuilder.v1";
  var LS_CHECK = "cge.dealbuilder.checks.v1";
  var MAX_LINES = 8;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var lineCount = 0;

  function addLine(preset) {
    if (lineCount >= MAX_LINES) return;
    lineCount++;
    var p = preset || {};
    var wrap = document.createElement("div");
    wrap.className = "db-line calc-grid";
    wrap.setAttribute("data-line", lineCount);
    wrap.innerHTML =
      '<label>Platform <select data-f="platform" aria-label="Deliverable ' + lineCount + ' platform">' +
      ["youtube", "tiktok", "instagram"].map(function (pl) {
        return '<option value="' + pl + '"' + (p.platform === pl ? " selected" : "") + ">" +
          DB.PLATFORM_LABELS[pl] + "</option>";
      }).join("") + "</select></label>" +
      '<label>Format <select data-f="kind" aria-label="Deliverable ' + lineCount + ' format">' +
      ["dedicated", "integrated", "short", "ugc"].map(function (k) {
        return '<option value="' + k + '"' + (p.kind === k ? " selected" : "") + ">" +
          DB.KIND_LABELS[k] + "</option>";
      }).join("") + "</select></label>" +
      '<label>Count <input type="number" data-f="count" min="1" max="12" step="1" value="' +
      (p.count || 1) + '" aria-label="Deliverable ' + lineCount + ' count"></label>' +
      '<div><button type="button" class="btn btn-ghost db-remove" aria-label="Remove deliverable ' +
      lineCount + '">Remove</button></div>';
    $("db-lines").appendChild(wrap);
    wrap.querySelector(".db-remove").addEventListener("click", function () {
      wrap.remove();
      lineCount--;
      renumber();
    });
  }

  function renumber() {
    var rows = $("db-lines").querySelectorAll("[data-line]");
    rows.forEach(function (row, i) {
      row.setAttribute("data-line", i + 1);
    });
    lineCount = rows.length;
  }

  function readLines() {
    var rows = $("db-lines").querySelectorAll("[data-line]");
    var out = [];
    rows.forEach(function (row) {
      out.push({
        platform: row.querySelector('[data-f="platform"]').value,
        kind: row.querySelector('[data-f="kind"]').value,
        count: row.querySelector('[data-f="count"]').value
      });
    });
    return out;
  }

  function readInput() {
    return {
      followers: $("db-followers").value,
      viewsAvg: $("db-views").value === "" ? 0 : $("db-views").value,
      deliverables: readLines(),
      usage: $("db-usage").value,
      whitelistingMonths: $("db-wl").value,
      exclusivity: { scope: $("db-ex-scope").value, months: $("db-ex-months").value },
      affiliate: { include: $("db-aff").checked, commissionPct: $("db-aff-pct").value }
    };
  }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(readInput())); } catch (e) { /* private mode */ }
  }

  function restore() {
    var raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch (e) { /* private mode */ }
    if (!raw) { addLine({ platform: "youtube", kind: "dedicated", count: 1 }); return; }
    try {
      var s = JSON.parse(raw);
      $("db-followers").value = s.followers || 50000;
      $("db-views").value = s.viewsAvg || "";
      (s.deliverables && s.deliverables.length ? s.deliverables : [{ platform: "youtube", kind: "dedicated", count: 1 }])
        .forEach(addLine);
      $("db-usage").value = s.usage || "organic_only";
      $("db-wl").value = s.whitelistingMonths || 0;
      $("db-ex-scope").value = (s.exclusivity && s.exclusivity.scope) || "none";
      $("db-ex-months").value = (s.exclusivity && s.exclusivity.months) || 0;
      $("db-aff").checked = !!(s.affiliate && s.affiliate.include);
      $("db-aff-pct").value = (s.affiliate && s.affiliate.commissionPct) || 10;
    } catch (e) {
      addLine({ platform: "youtube", kind: "dedicated", count: 1 });
    }
  }

  function loadChecks() {
    try { return JSON.parse(localStorage.getItem(LS_CHECK) || "{}"); }
    catch (e) { return {}; }
  }
  function saveCheck(id, on) {
    try {
      var c = loadChecks();
      c[id] = !!on;
      localStorage.setItem(LS_CHECK, JSON.stringify(c));
    } catch (e) { /* private mode */ }
  }

  var lastQuote = null;

  function fmtR(r) {
    if (!r) return "·";
    if (r[1] === Infinity) return DB.fmt(r[0]) + "+";
    return DB.fmtRange(r);
  }

  function renderQuote(q) {
    var html = '<div class="db-quote hud-panel brk">';
    html += '<p class="fm-kicker"><strong>QUOTE</strong><span class="sep">//</span>' +
      esc(q.tierLabel) + ' TIER</p>';
    html += '<div class="table-wrap"><table class="db-table"><thead><tr><th scope="col">Line item</th>' +
      '<th scope="col">Per unit</th><th scope="col">Line total</th></tr></thead><tbody>';
    q.lines.forEach(function (l) {
      html += "<tr><td>" + esc(l.label) + "<br><span class='muted'>" + esc(l.note) + "</span></td>" +
        "<td>" + fmtR(l.perUnit) + "</td><td>" + fmtR(l.line) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    html += '<div class="table-wrap"><table class="db-table"><tbody>';
    html += "<tr><td>Post-fee base</td><td>" + fmtR(q.baseTotal) + "</td></tr>";
    html += "<tr><td>Usage, " + esc(q.usage.label) + "<br><span class='muted'>" + esc(q.usage.note) + "</span></td><td>" + fmtR(q.usage.addon) + "</td></tr>";
    html += "<tr><td>Whitelisting<br><span class='muted'>" + esc(q.whitelisting.note) + "</span></td><td>" + fmtR(q.whitelisting.addon) + "</td></tr>";
    html += "<tr><td>Exclusivity<br><span class='muted'>" + esc(q.exclusivity.note) + "</span></td><td>" + fmtR(q.exclusivity.addon) + "</td></tr>";
    html += '<tr class="db-total"><td><strong>Package total (ask)</strong></td><td><strong>' + fmtR(q.total) + "</strong></td></tr>";
    html += '<tr><td>Expected landing zone (~23% below the ask)</td><td>' + fmtR(q.expectedClose) + "</td></tr>";
    html += "</tbody></table></div>";
    if (q.exclusivity.flag) {
      html += '<p class="db-flag db-flag-walk" role="note"><strong>Walk-away flag:</strong> ' +
        esc(q.exclusivity.flag.text) + "</p>";
    }
    html += "<ul>" + q.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    html += '<p class="muted">' + esc(q.disclaimer) + "</p></div>";
    $("db-quote").innerHTML = html;
  }

  function renderFlags(flags) {
    var el = $("db-flags");
    if (!flags.ok) {
      el.innerHTML = '<p class="muted">' + esc(flags.errors.join("; ")) + "</p>";
      return;
    }
    el.innerHTML = flags.flags.map(function (f) {
      var cls = f.level === "walk_away" ? "db-flag-walk" : (f.level === "flag" ? "db-flag-flag" : "db-flag-note");
      var tag = f.level === "walk_away" ? "Walk-away" : (f.level === "flag" ? "Flag" : "Note");
      return '<p class="db-flag ' + cls + '" role="note"><strong>' + tag + ":</strong> " + esc(f.text) + "</p>";
    }).join("");
  }

  function renderChecklist(check) {
    var ticks = loadChecks();
    var html = "";
    check.groups.forEach(function (g) {
      html += '<section class="db-check-group" aria-labelledby="dbck-' + g.id + '">' +
        '<h3 id="dbck-' + g.id + '">' + esc(g.title) + "</h3><ul>";
      g.items.forEach(function (it) {
        var on = !!ticks[it.id];
        html += '<li><label class="db-check' + (on ? " db-checked" : "") + '">' +
          '<input type="checkbox" data-check="' + it.id + '"' + (on ? " checked" : "") + "> " +
          "<span><strong>" + esc(it.text) + "</strong>" +
          (it.detail ? "<br><span class='muted'>" + esc(it.detail) + "</span>" : "") + "</span></label></li>";
      });
      html += "</ul></section>";
    });
    html += '<p class="muted">' + esc(check.disclaimer) + "</p>";
    $("db-checklist").innerHTML = html;
    $("db-checklist").querySelectorAll("[data-check]").forEach(function (box) {
      box.addEventListener("change", function () {
        saveCheck(box.getAttribute("data-check"), box.checked);
        box.closest(".db-check").classList.toggle("db-checked", box.checked);
      });
    });
  }

  function copyText(text, btn, doneLabel) {
    function done() {
      var old = btn.textContent;
      btn.textContent = doneLabel;
      setTimeout(function () { btn.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
      done();
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    var input = readInput();
    save();
    var v = DB.validInput(input);
    if (!v.ok) {
      $("db-errors").textContent = v.errors.join(" ");
      lastQuote = null;
      return;
    }
    $("db-errors").textContent = "";
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }).then(function (calc) {
      var q = DB.buildQuote(input, calc, calc.usage_rights_benchmarks_2026);
      if (!q.ok) { $("db-errors").textContent = q.errors.join(" "); return; }
      lastQuote = { input: input, quote: q };
      renderQuote(q);
      renderFlags(DB.exclusivityConflicts(input));
      renderChecklist(DB.buildChecklist(q));
      $("db-pitch-actions").style.display = "none";
      $("db-pitch-out").innerHTML = "";
    }).catch(function () {
      $("db-errors").textContent = "Couldn't load the rate-card data (data/v1/calculators.json). Check your connection and retry.";
    });
  }

  function onPitch() {
    if (!lastQuote) {
      $("db-pitch-out").innerHTML = '<p class="muted">Build the quote first, the proposal is written from its numbers.</p>';
      return;
    }
    var p = DB.renderPitch(lastQuote.input, lastQuote.quote);
    if (!p.ok) {
      $("db-pitch-out").innerHTML = '<p class="muted">' + esc(p.errors.join("; ")) + "</p>";
      return;
    }
    $("db-pitch-out").innerHTML =
      '<div class="db-pitch"><p><strong>Subject:</strong> ' + esc(p.subject) + "</p>" +
      "<pre>" + esc(p.body) + "</pre>" +
      '<p class="muted">' + esc(p.disclaimer) + "</p></div>";
    $("db-pitch-actions").style.display = "block";
    $("db-pitch-copy").onclick = function () { copyText(p.subject + "\n\n" + p.body, $("db-pitch-copy"), "Copied ✓"); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("db-form")) return; /* not the deal-builder page */
    restore();
    $("db-add").addEventListener("click", function () { addLine(); save(); });
    $("db-form").addEventListener("submit", onSubmit);
    $("db-pitch-gen").addEventListener("click", onPitch);
  });
})();
