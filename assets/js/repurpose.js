/* Content Repurposing Planner: one idea -> five platform-native variants.
   Built from the Phase 3 "Everywhere Engine" repurposing SOP.
   Template logic only — all data lives in this file. */
(function () {
  "use strict";
  var form = document.getElementById("rp-form");
  var out = document.getElementById("rp-results");
  if (!form || !out) return;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* One short clause of the idea for hook templates (first clause, ~60 chars). */
  function stub(idea) {
    var s = idea.split(/[.!?;:\u2014]/)[0].trim();
    if (s.length > 70) s = s.slice(0, 70).trim() + "\u2026";
    return s;
  }

  var SOURCE_PREP = {
    long: { title: "Pillar prep: long video", tasks: [
      "Export the full pillar (8–15 min), hook inside the first 15 seconds",
      "Mark the 3 most self-contained moments while editing — they're your shorts",
      "Write down the single most quotable line and the single most debatable claim" ] },
    stream: { title: "Pillar prep: stream recording", tasks: [
      "Scrub chat replay + your energy peaks for the 3 biggest reaction moments",
      "Cut a clean 8–15 min highlight reel — this becomes the YouTube pillar",
      "Write down the single most quotable line and the single most debatable claim" ] },
    podcast: { title: "Pillar prep: podcast episode", tasks: [
      "Pick the 3 most quotable segments (60–120s each) — they become video clips",
      "Pair each clip with captioned visuals or waveform — audio alone dies on scroll",
      "Write down the single most surprising take and the single most debatable claim" ] }
  };

  var PLATFORMS = [
    { id: "youtube", name: "YouTube", day: "Day 0", time: "the pillar itself",
      hook: function (s) { return "Packaging sells it: title + thumbnail must sell the payoff of \u201c" + s + "\u201d in 3 seconds."; },
      notes: "The durable asset — full idea, fully produced, 8–15 min. This is the thing everything else is cut from." },
    { id: "short", name: "YouTube Short", day: "Day +1", time: "~45 min",
      hook: function (s) { return "New first 2 seconds: restate the payoff of \u201c" + s + "\u201d before any context. Re-hook it — never clip the old intro."; },
      notes: "Best self-contained moment. Burned-in captions, 9:16 reframe, punchy and loopable. Native grammar: Shorts wants punchy, loopable, high-retention." },
    { id: "tiktok", name: "TikTok", day: "Day +2", time: "~50 min (cut + cut-native edit)",
      hook: function (s) { return "Text-on-screen: the single most surprising 60–90 seconds of \u201c" + s + "\u201d. Trending audio underneath at 10%."; },
      notes: "Re-edit for TikTok pacing, not just a re-upload. Videos over 1 minute stay Creator Rewards-eligible — keep the cut 60–90s." },
    { id: "reel", name: "Instagram Reel", day: "Day +3", time: "~30 min",
      hook: function (s) { return "Aesthetic hook: frame \u201c" + s + "\u201d as a transformation or save-worthy reveal in the first 2 seconds."; },
      notes: "Polished, save-worthy. Write the caption as a mini-blog (5 hashtags) — Reels traffic converts when the caption closes the loop." },
    { id: "facebook", name: "Facebook", day: "Day +4", time: "~10 min",
      hook: function (s) { return "Discussion hook: end the caption with the debatable claim from \u201c" + s + "\u201d as a direct question."; },
      notes: "Native upload of the full pillar to your Page + the best short as a Reel. Facebook wants discussion-provoking and shareable — the caption is the engagement lever." }
  ];

  function card(n, p, s) {
    return '<div class="callout mission" style="margin:1rem 0">' +
      "<strong>MISSION " + n + " — " + p.name.toUpperCase() + " (" + p.day + ")</strong>" +
      '<p><strong>Hook adaptation:</strong> ' + p.hook(s) + "</p>" +
      "<p>" + p.notes + "</p>" +
      '<ul class="checklist rp-tasks">' +
      '<li><label><input type="checkbox"> ' + esc(p.day) + ": publish " + esc(p.name) + " variant (" + esc(p.time) + ")</label></li>" +
      '<li><label><input type="checkbox"> ' + esc(p.name) + ": check native grammar, not a copy-paste</label></li>" +
      "</ul></div>";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var idea = document.getElementById("rp-idea").value.trim();
    var source = document.getElementById("rp-source").value;
    if (!idea) {
      out.innerHTML = '<div class="error-state" role="alert">' +
        "<strong>NO PILLAR IDEA</strong>" +
        "<p>Give me one content idea first — one line is enough. " +
        "The whole plan is cut from your pillar, so without it there's nothing to repurpose.</p></div>";
      return;
    }
    var s = esc(stub(idea));
    var prep = SOURCE_PREP[source];

    var prepHtml = '<div class="callout mission" style="margin:1rem 0"><strong>MISSION 0 — ' +
      esc(prep.title).toUpperCase() + "</strong><ul class='checklist rp-tasks'>" +
      prep.tasks.map(function (t) {
        return '<li><label><input type="checkbox"> ' + esc(t) + "</label></li>";
      }).join("") + "</ul></div>";

    var planHtml = "";
    PLATFORMS.forEach(function (p, i) { planHtml += card(i + 1, p, s); });

    out.innerHTML =
      '<div class="hud-panel" style="margin-bottom:1rem"><div class="hud-head">' +
      "<span>MISSION BRIEF // ONE IDEA → FIVE PLATFORMS</span>" +
      '<span class="hud-status">SOP LOADED</span></div><div class="hud-body">' +
      "<p><strong>Pillar:</strong> " + esc(idea) + "</p>" +
      "<p class='muted'>Total marginal effort: ~2 hours beyond the pillar. 5 platforms, 8+ touchpoints.</p>" +
      '<button type="button" class="btn btn-ghost" id="rp-print">Print mission cards</button>' +
      "</div></div>" +
      '<h3>The atom test — score before you repurpose</h3>' +
      "<p class='muted'>Check each one. 3–4: run the full SOP below. 1–2: publish the pillar, skip the repurposing, save the 2 hours.</p>" +
      '<ul class="checklist rp-tasks" id="rp-atom">' +
      '<li><label><input type="checkbox"> <strong>Standalone hook</strong> — the core insight survives without the other 9 minutes</label></li>' +
      '<li><label><input type="checkbox"> <strong>Visual moment</strong> — one frame or sequence striking enough to stop a scroll</label></li>' +
      '<li><label><input type="checkbox"> <strong>Quotable line</strong> — one sentence that works as text</label></li>' +
      '<li><label><input type="checkbox"> <strong>Debatable claim</strong> — the clips that travel furthest are the ones people argue about</label></li>' +
      "</ul>" +
      '<p id="rp-verdict" aria-live="polite"></p>' +
      prepHtml + planHtml;

    /* atom-test scoring */
    var atom = document.getElementById("rp-atom");
    var verdict = document.getElementById("rp-verdict");
    atom.addEventListener("change", function () {
      var n = atom.querySelectorAll("input:checked").length;
      verdict.innerHTML = n >= 3
        ? '<strong><span class="badge money">RUN THE FULL SOP</span></strong> <span class="muted">' + n + "/4 — this idea travels.</span>"
        : '<strong><span class="badge warn">PILLAR-ONLY</span></strong> <span class="muted">' + n + "/4 — publish the pillar, skip the repurposing, save the 2 hours.</span>";
    });

    /* done-state for printable checklist tasks */
    out.querySelectorAll(".rp-tasks li").forEach(function (li) {
      var box = li.querySelector("input");
      box.addEventListener("change", function () { li.classList.toggle("done", box.checked); });
    });

    document.getElementById("rp-print").addEventListener("click", function () { window.print(); });

    /* Repurposing Pipeline 2.0: the full derivative map (wave 16).
       Every derivative carries its required original element —
       repurposing is not re-uploading. Rendered from the shared engine when
       available; falls back silently if the script is missing. */
    if (typeof window !== "undefined" && window.ContentEngine) {
      var CE = window.ContentEngine;
      var map = CE.repurposeMap(idea);
      var guards = CE.originalityGuardrails();
      var mapHtml = map.map(function (d, i) {
        return '<div class="callout mission" style="margin:1rem 0">' +
          "<strong>2.0 DERIVATIVE " + (i + 1) + " — " + esc(d.platform.toUpperCase()) + " (" + esc(d.day) + ")</strong>" +
          "<p><strong>" + esc(d.label) + ":</strong> " + esc(d.task) + "</p>" +
          "<p><strong>Original element (required):</strong> " + esc(d.originalElement) + "</p>" +
          "<p class='muted'>Marginal effort: " + esc(d.effort) + "</p></div>";
      }).join("");
      var guardHtml = '<ul class="checklist">' + guards.map(function (g) {
        return "<li><strong>" + esc(g.rule) + "</strong> — " + esc(g.detail) + "</li>";
      }).join("") + "</ul>";
      out.innerHTML += '<hr><h3>Repurposing Pipeline 2.0 — the full derivative map</h3>' +
        "<p class='muted'>The wave-3 mission cards cover the five platform drops. 2.0 adds the " +
        "full derivative map: community posts, a newsletter issue, an X thread, and platform-cut " +
        "shorts — every one carrying a <strong>required original element</strong>. Repurposing " +
        "is not re-uploading.</p>" + mapHtml +
        '<h3>The Oct-1 originality guardrails</h3>' + guardHtml +
        '<p class="muted">Machine-readable map + guardrails: <a href="api/v1/content-engine.json">api/v1/content-engine.json</a>. ' +
        "Feed the pillar back into the <a href=\"idea-bank.html\">Idea Bank</a> or the <a href=\"content-calendar.html\">content calendar</a> when it's done.</p>";
    }
  });
})();
