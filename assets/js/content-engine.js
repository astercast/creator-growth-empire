/* The Content Engine — pure content-planning math (no DOM).
 * UMD: works in the browser (window.ContentEngine) and in node (module.exports).
 *
 * Covers wave 16: idea-bank sorting/filtering, 90-day content-calendar
 * dealing, batching-planner film-day math, and the repurposing 2.0 derivative
 * map with originality guardrails.
 *
 * HONESTY CONTRACT: the engine does arithmetic on the creator's own inputs —
 * cadence, shoot days, hook scores. It never promises views, revenue, or
 * growth. A planning aid, not financial, legal, or tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.ContentEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var WEEKS_PER_MONTH = 52 / 12; // 4.333… — the honest month
  var IDEA_FORMATS = ["long", "short", "community"];

  /* ---------- idea-bank helpers ---------- */

  function hookScore(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return 1;
    return Math.min(5, Math.max(1, n));
  }

  /* Sort ideas by hook-strength score (highest first); ties break by
   * created order (oldest first — FIFO fairness for equally strong ideas).
   * Returns a new array; input untouched. */
  function sortIdeas(ideas) {
    return ideas.slice().sort(function (a, b) {
      var d = hookScore(b.hookScore) - hookScore(a.hookScore);
      if (d !== 0) return d;
      var ca = a.created || 0, cb = b.created || 0;
      if (ca !== cb) return ca - cb;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  function filterIdeas(ideas, format) {
    if (!format || format === "all") return ideas.slice();
    return ideas.filter(function (i) { return i.format === format; });
  }

  /* ---------- 90-day content calendar dealing ---------- */

  var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function normInt(n, lo, hi, fallback) {
    n = parseInt(n, 10);
    if (isNaN(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  /* Deal ideas into a weekly grid — same dealing arithmetic as the 90-Day
   * Planner (assets/js/planner.js): longs spread across non-rest days by
   * round-robin, shorts every other day, rest day untouched.
   *
   * cfg: { longsPerWeek (0-7), shortsPerWeek (0-21), restDay (0-6, Mon..Sun,
   *        default 6), weeks (1-52, default 13) }
   * ideas: [{ id, title, format ("long"|"short"|"community"), hookScore, ... }]
   *        Community ideas deal on the short cadence.
   * Returns: { weeks, totals, unplaced, openSlots }.
   * Each placed item: { ideaId, title, format, slot: "long"|"short" }.
   * Slots with no idea left stay OPEN (never padded with filler). */
  function dealIdeas(ideas, cfg) {
    cfg = cfg || {};
    var longsPerWeek = normInt(cfg.longsPerWeek, 0, 7, 1);
    var shortsPerWeek = normInt(cfg.shortsPerWeek, 0, 21, 2);
    var restDay = normInt(cfg.restDay, 0, 6, 6);
    var weeks = normInt(cfg.weeks, 1, 52, 13);

    var workDays = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return d !== restDay; });

    function byFormat(f) {
      var names = f === "short" ? ["short", "community"] : [f];
      return sortIdeas(ideas.filter(function (i) { return names.indexOf(i.format) !== -1; }));
    }
    var longs = byFormat("long");
    var shorts = byFormat("short");

    function dealLane(sorted, perWeek, slotKind) {
      var placed = [];
      for (var i = 0; i < perWeek * weeks; i++) {
        var idea = i < sorted.length ? sorted[i] : null;
        placed.push(idea ? {
          ideaId: idea.id, title: idea.title, format: idea.format, slot: slotKind
        } : null); // null = OPEN slot
      }
      return placed;
    }
    var longLane = dealLane(longs, longsPerWeek, "long");
    var shortLane = dealLane(shorts, shortsPerWeek, "short");

    var outWeeks = [];
    var totals = { long: 0, short: 0, open: 0 };
    for (var w = 0; w < weeks; w++) {
      var wl = longLane.slice(w * longsPerWeek, (w + 1) * longsPerWeek);
      var ws = shortLane.slice(w * shortsPerWeek, (w + 1) * shortsPerWeek);
      var days = [];
      for (var d = 0; d < 7; d++) {
        days.push({ day: DAY_NAMES[d], rest: d === restDay, items: [], sponsored: false });
      }
      /* longs land on work days in score order (highest score first) */
      wl.forEach(function (item, i) {
        var dayIdx = workDays.length ? workDays[i % workDays.length] : i % 7;
        if (item) { days[dayIdx].items.push(item); totals.long++; }
        else { days[dayIdx].items.push({ open: true, slot: "long" }); totals.open++; }
      });
      /* shorts every other work day (planner-style: (s*2) % workDays) */
      ws.forEach(function (item, i) {
        var dayIdx = workDays.length ? workDays[(i * 2) % workDays.length] : i % 7;
        if (item) { days[dayIdx].items.push(item); totals.short++; }
        else { days[dayIdx].items.push({ open: true, slot: "short" }); totals.open++; }
      });
      outWeeks.push({
        week: w + 1,
        midpointReview: (w + 1) === 7,
        days: days
      });
    }

    var placedIds = {};
    outWeeks.forEach(function (wk) {
      wk.days.forEach(function (d) {
        d.items.forEach(function (it) { if (it.ideaId) placedIds[it.ideaId] = true; });
      });
    });
    var unplaced = ideas.filter(function (i) { return !placedIds[i.id]; });

    return {
      config: { longsPerWeek: longsPerWeek, shortsPerWeek: shortsPerWeek, restDay: restDay, weeks: weeks },
      weeks: outWeeks,
      totals: totals,
      unplaced: unplaced,
      openSlots: totals.open
    };
  }

  /* ---------- batching planner: film-day math ---------- */

  /* opts: { videosPerShootDay, shootDaysPerMonth, shortsPerShootDay (optional,
   *   defaults to videosPerShootDay * 2), longsPerWeek, shortsPerWeek }
   * All inputs are the creator's own numbers; outputs are pure arithmetic.
   * verdict: "surplus" | "balanced" | "shortfall". */
  function batchingMath(opts) {
    opts = opts || {};
    function num(v, fallback) {
      v = parseFloat(v);
      if (isNaN(v) || v < 0) return fallback;
      return v;
    }
    var vpsd = num(opts.videosPerShootDay, 1);
    var sdpm = num(opts.shootDaysPerMonth, 1);
    var spsd = num(opts.shortsPerShootDay, vpsd * 2);
    var lpw = num(opts.longsPerWeek, 0);
    var spw = num(opts.shortsPerWeek, 0);

    var requiredLongs = lpw * WEEKS_PER_MONTH;
    var requiredShorts = spw * WEEKS_PER_MONTH;
    /* effort-equivalence: a shoot day films X longs or 2X shorts */
    var capacityLongs = sdpm * vpsd;
    var capacityShorts = sdpm * spsd;
    var deltaLongs = capacityLongs - requiredLongs;
    var deltaShorts = capacityShorts - requiredShorts;

    var holds = deltaLongs >= 0 && deltaShorts >= 0;
    var verdict = holds
      ? (deltaLongs === 0 && deltaShorts === 0 ? "balanced" : "surplus")
      : "shortfall";

    return {
      inputs: { videosPerShootDay: vpsd, shootDaysPerMonth: sdpm,
                shortsPerShootDay: spsd, longsPerWeek: lpw, shortsPerWeek: spw,
                weeksPerMonth: WEEKS_PER_MONTH },
      requiredLongsPerMonth: round2(requiredLongs),
      requiredShortsPerMonth: round2(requiredShorts),
      shootCapacityLongs: round2(capacityLongs),
      shootCapacityShorts: round2(capacityShorts),
      deltaLongs: round2(deltaLongs),
      deltaShorts: round2(deltaShorts),
      verdict: verdict,
      guidance: guidanceFor(verdict, deltaLongs, deltaShorts, lpw, spw)
    };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function guidanceFor(verdict, dL, dS, lpw, spw) {
    if (verdict === "surplus") {
      return "Your film days cover the cadence with " + fmtDelta(dL) + " long-form and " +
        fmtDelta(dS) + " short-form slots to spare. Bank the surplus — consistency " +
        "beats volume, and a filmed backlog is what keeps the calendar honest " +
        "when life happens.";
    }
    if (verdict === "balanced") {
      return "Capacity exactly matches cadence — no slack. One sick day and the " +
        "calendar breaks. Shrink the cadence by one slot or add a buffer shoot day.";
    }
    var parts = [];
    if (dL < 0) parts.push("long-form: short by " + Math.abs(round2(dL)) + "/month");
    if (dS < 0) parts.push("short-form: short by " + Math.abs(round2(dS)) + "/month");
    return "The cadence doesn't hold: " + parts.join("; ") + ". Pick one — add a " +
      "shoot day, drop a weekly slot, or merge formats. An ambitious cadence you " +
      "abandon beats nothing; a smaller cadence you keep beats everything.";
  }

  function fmtDelta(d) {
    d = round2(d);
    return (d > 0 ? "+" : "") + d;
  }

  /* ---------- repurposing pipeline 2.0: the full derivative map ---------- */

  /* One long-form pillar in → the derivative map. Every derivative carries
   * its required original element (repurposing is not re-uploading).
   * Guardrails are the Oct-1 originality rules. */
  var DERIVATIVES = [
    { id: "short_clip", platform: "YouTube Shorts", day: "+1",
      label: "Short-form clip",
      task: "Cut the best self-contained moment; burned-in captions, 9:16 reframe.",
      originalElement: "A fresh first 2 seconds — re-hook the clip, never reuse the pillar's intro.",
      effort: "~45 min (edit for pacing, not re-upload)" },
    { id: "community_reaction", platform: "YouTube Community", day: "+1 to +4",
      label: "Community reaction post",
      task: "Post the debatable claim as a question or poll.",
      originalElement: "A new question written for the community tab — not the video title.",
      effort: "~10 min (write it, don't extract it)" },
    { id: "tiktok_cut", platform: "TikTok", day: "+2 to +4",
      label: "TikTok cut",
      task: "Re-edit for TikTok pacing; keep 60–90s for Creator Rewards eligibility.",
      originalElement: "Text-on-screen re-hook + native pacing — a re-edit, not a re-upload.",
      effort: "~50 min (cut + cut-native edit)" },
    { id: "reel_cut", platform: "Instagram Reels", day: "+3",
      label: "Instagram Reel cut",
      task: "Polished, save-worthy; caption as a mini-blog (5 hashtags).",
      originalElement: "An aesthetic or save-worthy framing — transformation or reveal in the first 2 seconds.",
      effort: "~30 min (caption as mini-blog)" },
    { id: "newsletter_issue", platform: "Newsletter / email", day: "+5",
      label: "Newsletter issue",
      task: "Write the story around the video's numbers or result.",
      originalElement: "A written angle the video never states outright — the story behind the result.",
      effort: "~1 hr (write the story around the numbers)" },
    { id: "x_thread", platform: "X / Twitter", day: "+6",
      label: "X thread",
      task: "5–8 posts compressing the pillar's argument.",
      originalElement: "Written natively for X — the first post is a new hook, not a link drop.",
      effort: "~30 min (compress, don't paste)" },
    { id: "facebook_post", platform: "Facebook", day: "+7",
      label: "Facebook post",
      task: "Native upload of the best short as a Reel + discussion caption on your Page.",
      originalElement: "A discussion-provoking caption ending with the debatable claim as a direct question.",
      effort: "~20 min (caption is the engagement lever)" }
  ];

  var ORIGINALITY_GUARDRAILS = [
    { id: "no_reupload_spam", rule: "No identical re-uploads",
      detail: "The same video file uploaded to multiple platforms is distribution failure, not repurposing. Each derivative needs a native cut or a new hook." },
    { id: "fresh_hook", rule: "Every derivative gets a new hook",
      detail: "A clip of the old intro dies on scroll. Every short-form derivative opens with a hook written for that platform." },
    { id: "native_grammar", rule: "Native grammar per platform",
      detail: "Watermarks, letterboxed 16:9 on vertical, copy-pasted captions — platforms and viewers both punish it." },
    { id: "text_is_original", rule: "Text derivatives are written, not extracted",
      detail: "A community post that is just the video title is noise. Write the question the audience argues about." },
    { id: "atom_gate", rule: "Atom test gates the whole pipeline",
      detail: "If the pillar scores under 3/4 on the atom test (standalone hook, visual moment, quotable line, debatable claim), publish the pillar only — skip the repurposing and save the hours." }
  ];

  /* pillarTitle: the idea line. Returns the full derivative map bound to it. */
  function repurposeMap(pillarTitle) {
    var stub = String(pillarTitle || "").split(/[.!?;:\u2014]/)[0].trim();
    if (stub.length > 70) stub = stub.slice(0, 70).trim() + "\u2026";
    return DERIVATIVES.map(function (d) {
      return {
        id: d.id, platform: d.platform, day: d.day, label: d.label,
        task: d.task, originalElement: d.originalElement, effort: d.effort,
        pillar: stub
      };
    });
  }

  function originalityGuardrails() {
    return ORIGINALITY_GUARDRAILS.slice();
  }

  /* ---------- calendar <-> simulator bridge ---------- */

  /* Feed the calendar cadence into the Empire Simulator's inputs.
   * The simulator stays a model, not a prediction. */
  function simInputFromCadence(longsPerWeek, shortsPerWeek) {
    return {
      longform_per_week: normInt(longsPerWeek, 0, 7, 1),
      shorts_per_week: normInt(shortsPerWeek, 0, 21, 2)
    };
  }

  /* "Copy my calendar": render a dealt plan as plain text. */
  function exportCalendarText(deal) {
    var L = [];
    var cfg = deal.config;
    L.push("MY 90-DAY CONTENT CALENDAR");
    L.push("Cadence: " + cfg.longsPerWeek + " long-form + " + cfg.shortsPerWeek +
      " short-form per week · rest day " + DAY_NAMES[cfg.restDay] + " · " +
      cfg.weeks + " weeks");
    L.push("");
    deal.weeks.forEach(function (wk) {
      L.push("WEEK " + wk.week + (wk.midpointReview ? " — MIDPOINT REVIEW" : ""));
      wk.days.forEach(function (d) {
        var bits = d.items.map(function (it) {
          if (it.open) return "[OPEN " + it.slot + " slot]";
          return it.title + " (" + it.format + ")";
        });
        var line = "  " + d.day + (d.rest ? " (rest)" : "") + ": " +
          (bits.length ? bits.join(" · ") : "—");
        if (d.sponsored) line += "  [SPONSORED SLOT]";
        L.push(line);
      });
      L.push("");
    });
    var u = deal.unplaced || [];
    if (u.length) {
      L.push("BACKLOG (in the idea bank, not on the calendar):");
      u.forEach(function (i) { L.push("  - " + i.title + " (" + i.format + ", hook " + hookScore(i.hookScore) + "/5)"); });
    }
    if (deal.openSlots) {
      L.push("");
      L.push(deal.openSlots + " OPEN slots — the bank needs ideas, not filler.");
    }
    L.push("");
    L.push("Built with the Creator Growth Empire content engine. A planning aid, " +
      "not financial, legal, or tax advice.");
    return L.join("\n");
  }

  return {
    VERSION: VERSION,
    WEEKS_PER_MONTH: WEEKS_PER_MONTH,
    IDEA_FORMATS: IDEA_FORMATS,
    hookScore: hookScore,
    sortIdeas: sortIdeas,
    filterIdeas: filterIdeas,
    dealIdeas: dealIdeas,
    batchingMath: batchingMath,
    repurposeMap: repurposeMap,
    originalityGuardrails: originalityGuardrails,
    simInputFromCadence: simInputFromCadence,
    exportCalendarText: exportCalendarText
  };
});
