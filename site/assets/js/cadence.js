/* Cadence Coach, the posting-cadence optimizer (tool 20).
   UMD: browser window.CadenceCoach + node module.exports.
   What it does: turns weekly hours + formats + platforms into a sustainable
   posting cadence. Capacity arithmetic + Oct-2026 platform facts only.
   It NEVER promises views, revenue, or growth, there is no peer-reviewed
   cadence science, and this engine says so in every output. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CadenceCoach = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  /* Starting estimates for per-piece production minutes, borrowed from the
     batching scheduler's placeholders (film+edit+publish). Labeled as
     adjustable starting estimates everywhere they surface, never benchmarks. */
  var DEFAULTS = {
    longMins: 570,      // 180 film + 360 edit + 30 publish
    shortMins: 90,       // 30 film + 45 edit + 15 publish
    overheadPct: 0.20,   // comments, admin, analytics, the non-filming work
    restDay: 6,          // Sunday
    stage: 1,
    priority: "balanced"
  };

  var PLATFORMS = ["youtube", "shorts", "tiktok", "instagram"];

  /* Oct-2026 platform facts. Every figure is creator-reported or analyst data
     from the Oct-11-2026 research sweep, ranges, never promises. */
  var PLATFORM_NOTES = {
    youtube: {
      title: "YouTube (long-form)",
      body: "Long-form carries the highest ad RPM in most niches, and it is the format sponsors pay the most for, but 20M+ videos go up every day (Neal Mohan, Made on YouTube Sept 2026), so packaging is the lever, not volume."
    },
    shorts: {
      title: "YouTube Shorts",
      body: "Shorts RPM runs $0.02–$0.20 per 1K views (AIR, 274 channels), a fraction of long-form. From Feb 1, 2027 Shorts revenue needs 10M qualified Shorts views per 90 days, checked monthly. And the Oct-1-2026 originality rule cut reach for straight re-uploads: every short needs its own hook, not a recycled clip."
    },
    tiktok: {
      title: "TikTok",
      body: "Creator Rewards pays $0.40–$1.00 per 1K qualified views, but a qualified view means 5+ seconds on a video OVER 1 minute (AIR, verified Oct-2026). Under-1-minute TikToks earn $0 from the program. If revenue matters on TikTok, make the shorts 1-minute-plus."
    },
    instagram: {
      title: "Instagram Reels",
      body: "Reels pay $0 per view in 2026 (AIR, verified), the Reels Play Bonus ended in 2023 and nothing replaced it. Post Reels for audience-building and discovery, never as a revenue line. The one exception: the one-time US Breakthrough Bonus ($5K over 90 days)."
    }
  };

  var DISCLAIMER = "No peer-reviewed cadence science exists, this is capacity arithmetic on your own hours plus platform facts. Consistency beats volume: the right cadence is the one you can hold for 90 days. A planning aid, not financial, legal, or tax advice. Posting more never guarantees views, revenue, or growth.";

  function clampNum(v, lo, hi, fallback) {
    var n = parseFloat(v);
    if (isNaN(n) || !isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  function validInput(o) {
    var errors = [];
    o = o || {};
    var platforms = o.platforms;
    if (!Array.isArray(platforms) || platforms.length === 0) {
      errors.push("Pick at least one platform.");
    } else {
      platforms.forEach(function (p) {
        if (PLATFORMS.indexOf(String(p).toLowerCase()) === -1) errors.push("Unknown platform: " + p);
      });
    }
    var h = parseFloat(o.weeklyHours);
    if (isNaN(h) || h < 1 || h > 80) errors.push("Weekly hours must be between 1 and 80.");
    [["longMins", o.longMins], ["shortMins", o.shortMins]].forEach(function (pair) {
      var v = parseFloat(pair[1]);
      if (isNaN(v) || v < 5 || v > 3000) errors.push(pair[0] + " must be between 5 and 3000 minutes.");
    });
    var r = parseInt(o.restDay, 10);
    if (isNaN(r) || r < 0 || r > 6) errors.push("Rest day must be 0 (Mon) – 6 (Sun).");
    var s = parseInt(o.stage, 10);
    if (isNaN(s) || s < 0 || s > 4) errors.push("Stage must be 0–4 (Money Map stages).");
    if (["longs", "shorts", "balanced"].indexOf(o.priority) === -1) errors.push("Priority must be longs, shorts, or balanced.");
    return { ok: errors.length === 0, errors: errors };
  }

  function norm(o) {
    o = o || {};
    return {
      platforms: (o.platforms || []).map(function (p) { return String(p).toLowerCase(); }),
      weeklyHours: clampNum(o.weeklyHours, 1, 80, 10),
      longMins: clampNum(o.longMins, 5, 3000, DEFAULTS.longMins),
      shortMins: clampNum(o.shortMins, 5, 3000, DEFAULTS.shortMins),
      overheadPct: clampNum(o.overheadPct, 0, 0.9, DEFAULTS.overheadPct),
      restDay: Math.min(6, Math.max(0, parseInt(o.restDay, 10) || 0)),
      stage: Math.min(4, Math.max(0, parseInt(o.stage, 10) || 0)),
      priority: ["longs", "shorts", "balanced"].indexOf(o.priority) === -1 ? "balanced" : o.priority
    };
  }

  /* Pure capacity: how many longs / shorts fit in the production hours. */
  function capacityMath(o) {
    var n = norm(o);
    var totalMins = n.weeklyHours * 60;
    var prodMins = Math.floor(totalMins * (1 - n.overheadPct));
    return {
      totalMins: totalMins,
      prodMins: prodMins,
      overheadMins: totalMins - prodMins,
      maxLongs: Math.floor(prodMins / n.longMins),
      maxShorts: Math.floor(prodMins / n.shortMins),
      hours: n.weeklyHours
    };
  }

  /* Deal longs + shorts across the 7-day week. Rest day stays empty,
     non-negotiable. Longs spread evenly over work days; shorts round-robin. */
  function dealWeek(longs, shorts, restDay) {
    var days = DAY_NAMES.map(function (name, i) {
      return { day: i, name: name, rest: i === restDay, longs: 0, shorts: 0 };
    });
    var work = days.filter(function (d) { return !d.rest; });
    if (work.length === 0) return days;
    for (var i = 0; i < longs; i++) {
      var idx = longs === 1 ? 0 : Math.round((i * (work.length - 1)) / (longs - 1));
      work[idx].longs += 1;
    }
    for (var j = 0; j < shorts; j++) work[j % work.length].shorts += 1;
    return days;
  }

  function recommend(raw) {
    var v = validInput(raw);
    if (!v.ok) return { ok: false, errors: v.errors };
    var n = norm(raw);
    var cap = capacityMath(n);

    var needsLongs = n.platforms.indexOf("youtube") !== -1;
    var shortPlatforms = n.platforms.filter(function (p) { return p !== "youtube"; });
    var needsShorts = shortPlatforms.length > 0;

    var longs = 0, shorts = 0;
    if (needsLongs && !needsShorts) {
      longs = cap.maxLongs;
    } else if (needsShorts && !needsLongs) {
      shorts = cap.maxShorts;
    } else {
      if (n.priority === "longs") {
        longs = cap.maxLongs;
        shorts = Math.floor((cap.prodMins - longs * n.longMins) / n.shortMins);
      } else if (n.priority === "shorts") {
        shorts = cap.maxShorts;
        longs = Math.floor((cap.prodMins - shorts * n.shortMins) / n.longMins);
      } else {
        var half = Math.floor(cap.prodMins / 2);
        longs = Math.floor(half / n.longMins);
        shorts = Math.floor(half / n.shortMins);
      }
    }

    var usedMins = longs * n.longMins + shorts * n.shortMins;
    /* Utilization is measured against PRODUCTION minutes (after the overhead
       reserve), that is the capacity the cadence actually competes for. */
    var utilization = cap.prodMins > 0 ? usedMins / cap.prodMins : 0;
    var verdict = utilization > 0.95 ? "over" : (utilization > 0.7 ? "tight" : "holds");

    /* Ramp: the house method, start one notch below max for the first two
       weeks, raise only if every slot shipped on time. Labeled as method. */
    var ramp = {
      longs: longs > 0 ? Math.max(1, Math.floor(longs * 0.7)) : 0,
      shorts: shorts > 0 ? Math.max(1, Math.floor(shorts * 0.7)) : 0
    };

    var platformNotes = n.platforms.map(function (p) { return PLATFORM_NOTES[p]; });

    var methodNotes = [];
    methodNotes.push("Per-piece minutes (" + n.longMins + " long / " + n.shortMins + " short) are adjustable starting estimates, time one real video of each type and replace them; that single calibration beats any default.");
    methodNotes.push(Math.round(n.overheadPct * 100) + "% of your hours are reserved for non-filming work (comments, analytics, admin). Only scheduled, repeatable hours count, \"I'll find the time\" is not capacity.");
    if (n.stage === 0) {
      methodNotes.push("Tuition-phase caveat: under ~50 videos you are in tuition, not optimization, cadence teaches you craft, and chasing volume before the craft lands just burns hours faster.");
    }
    if (needsLongs && needsShorts) {
      methodNotes.push(n.priority === "balanced"
        ? "Balanced split: production minutes divided 50/50 between long-form and shorts. Leftovers stay as slack, slack is what keeps a cadence alive in a bad week."
        : (n.priority === "longs" ? "Long-form-first: longs take their full share, shorts fill what is left." : "Short-form-first: shorts take their full share, longs fill what is left."));
    }

    var guidance =
      verdict === "over"
        ? "Over capacity: this cadence needs more hours than you have. Shrink it, drop the lowest-leverage format first, and never promise yourself heroics."
        : verdict === "tight"
        ? "Tight: the cadence fits, with almost no slack. One bad week breaks it. Consider the ramp below, or trim one short per week."
        : "Holds: the cadence fits inside your hours with slack to spare. Slack is the whole game, it is what survives sick weeks, slow edits, and life.";

    return {
      ok: true,
      inputs: n,
      capacity: cap,
      longs: longs,
      shorts: shorts,
      usedMins: usedMins,
      usedHours: Math.round(usedMins / 6) / 10,
      utilization: utilization,
      verdict: verdict,
      guidance: guidance,
      ramp: ramp,
      schedule: dealWeek(longs, shorts, n.restDay),
      platformNotes: platformNotes,
      methodNotes: methodNotes,
      disclaimer: DISCLAIMER
    };
  }

  return {
    DEFAULTS: DEFAULTS,
    PLATFORMS: PLATFORMS,
    PLATFORM_NOTES: PLATFORM_NOTES,
    DISCLAIMER: DISCLAIMER,
    DAY_NAMES: DAY_NAMES,
    validInput: validInput,
    capacityMath: capacityMath,
    dealWeek: dealWeek,
    recommend: recommend
  };
}));
