/* Rate Card Builder, page wiring. The engine
 * (assets/js/rate-card-builder.js) does the math; benchmarks come
 * from data/v1/calculators.json, the watch panel from
 * data/v1/changes.json. Nothing is stored; the card is rebuilt from
 * the form on every submit and can be copied as plaintext. */
(function () {
  "use strict";
  var R = window.RateCardBuilder;
  var form = document.getElementById("rcb-form");
  if (!R || !form) return;
  var out = document.getElementById("rcb-out");
  var exportBox = document.getElementById("rcb-export");
  var errorsBox = document.getElementById("rcb-errors");
  var DATA = { calculators: null, feed: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rangeText(r, openEnded) {
    if (!r) return "no benchmark";
    if (r[1] == null) return R.fmt(r[0]) + "+";
    if (r[0] === r[1]) return R.fmt(r[0]);
    return R.fmt(r[0]) + "–" + R.fmt(r[1]) + (openEnded ? "+" : "");
  }
  function basisChip(b) {
    var label = { benchmark: "BENCHMARK", reported: "REPORTED", modeled: "MODELED",
      "single-source": "SINGLE-SOURCE", proxy: "PROXY", none: "NO DATA" }[b] || b.toUpperCase();
    return "<span class=\"badge " + (b === "none" ? "stamp" : b === "proxy" ? "stamp" : "gold") + "\">" + label + "</span>";
  }

  function rowHtml(r, primary) {
    return "<tr class=\"" + (primary ? "rcb-primary" : "") + "\">" +
      "<th scope=\"row\">" + (primary ? "▸ " : "") + esc(r.label) + "</th>" +
      "<td class=\"rcb-fig\">" + esc(rangeText(r.range)) + "</td>" +
      "<td>" + basisChip(r.basis) + "</td>" +
      "<td class=\"rcb-why\">" + esc(r.reasoning) + "<br><span class=\"muted\">Source: " +
        esc(r.source) + "</span></td></tr>";
  }

  function render(card) {
    var html = "";
    html += "<div class=\"rcb-card-head\"><h3>Your rate card: " + esc(card.platformLabel) +
      " · " + esc(card.tierLabel) + " followers" +
      (card.niche.label ? " · " + esc(card.niche.label) + " ×" + card.niche.mult : "") +
      "</h3><p class=\"muted\">Primary format marked ▸. Usage and whitelisting ride on it as separate lines, never folded into the post fee.</p></div>";
    html += "<div class=\"rcb-table-wrap\"><table class=\"rcb-table\"><thead><tr>" +
      "<th scope=\"col\">Format</th><th scope=\"col\">Your range</th><th scope=\"col\">Basis</th>" +
      "<th scope=\"col\">Why this number</th></tr></thead><tbody>";
    card.rows.forEach(function (r) { html += rowHtml(r, r.id === card.primaryFormat); });
    card.addons.forEach(function (a) {
      html += "<tr><th scope=\"row\">+ " + esc(a.label) + "</th>" +
        "<td class=\"rcb-fig\">" + esc(rangeText(a.range, a.openEnded)) + "</td>" +
        "<td>" + basisChip(a.basis) + "</td>" +
        "<td class=\"rcb-why\">" + esc(a.reasoning) + "<br><span class=\"muted\">Source: " +
        esc(a.source) + "</span></td></tr>";
    });
    if (card.total) {
      html += "<tr class=\"rcb-total\"><th scope=\"row\">Card total (primary + add-ons)</th>" +
        "<td class=\"rcb-fig\">" + esc(rangeText(card.total.range, card.total.openEnded)) + "</td>" +
        "<td colspan=\"2\" class=\"rcb-why\">Expected landing zone " +
        esc(rangeText(card.total.expectedClose)) +
        ", creators list ~23% above what they accept, so the gap is priced in here, not discovered mid-thread.</td></tr>";
    }
    html += "</tbody></table></div>";

    if (card.evidence.length) {
      html += "<h4 class=\"rcb-sub\">Evidence, what creators actually quote (kept apart from the benchmark rows)</h4><div class=\"rcb-evidence\">";
      card.evidence.forEach(function (e) {
        html += "<div class=\"rcb-ev-card\"><div class=\"lbl\">" + esc(e.label) + " · " + esc(e.basis) + "</div>" +
          (e.value != null ? "<div class=\"big\">" + R.fmt(e.value) + "</div>" : "") +
          "<p class=\"muted\">" + esc(e.note) + "<br>Source: " + esc(e.source) + "</p></div>";
      });
      html += "</div>";
    }
    if (card.watch.length) {
      html += "<h4 class=\"rcb-sub\">On the watch for " + esc(card.platformLabel) +
        ", the newest logged rule changes behind this card</h4><ul class=\"rcb-watch\">";
      card.watch.forEach(function (w) {
        html += "<li><strong>" + esc(w.title) + "</strong> <span class=\"muted\">[" +
          esc(w.category) + " · " + esc(w.confidence) +
          (w.announced_at ? " · announced " + esc(w.announced_at.slice(0, 10)) : "") +
          "]</span>, <a href=\"what-changed.html\">What Changed</a></li>";
      });
      html += "</ul>";
    }
    html += "<div class=\"rcb-notes\">" + card.notes.map(function (n) {
      return "<p class=\"muted\">" + esc(n) + "</p>";
    }).join("") + "<p class=\"muted\">" + esc(card.honesty) + " " + esc(card.advice) + "</p></div>";
    out.innerHTML = html;
    exportBox.value = R.exportCard(card);
  }

  function readForm() {
    return {
      platform: document.getElementById("rcb-platform").value,
      format: document.getElementById("rcb-format").value,
      followers: Number(document.getElementById("rcb-followers").value),
      expectedViews: Number(document.getElementById("rcb-views").value) || 0,
      niche: document.getElementById("rcb-niche").value || null,
      usage: document.getElementById("rcb-usage").value,
      whitelistingMonths: Number(document.getElementById("rcb-wl-months").value) || 0
    };
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = readForm();
    var v = R.validInput(input);
    if (!v.ok) {
      errorsBox.textContent = "Check the form: " + v.errors.join("; ") + ".";
      out.innerHTML = "";
      exportBox.value = "";
      return;
    }
    errorsBox.textContent = "";
    render(R.buildCard(input, DATA.calculators, DATA.feed));
    document.getElementById("rcb-sec-card").scrollIntoView({ block: "start" });
  });

  var copyBtn = document.getElementById("rcb-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportBox.value);
    } else { document.execCommand("copy"); }
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the card"; }, 2000);
  });

  Promise.allSettled([
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
    fetch("data/v1/changes.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    if (res[0].status === "fulfilled") DATA.calculators = res[0].value;
    if (res[1].status === "fulfilled") DATA.feed = res[1].value;
    if (!DATA.calculators) {
      errorsBox.textContent = "Could not load the benchmark data (data/v1/calculators.json). " +
        "Check that data/v1/ is deployed alongside this page.";
      return;
    }
    render(R.buildCard(readForm(), DATA.calculators, DATA.feed));
  });
})();
