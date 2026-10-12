/* The Content Engine — pure content-planning math (no DOM).
 * UMD: works in the browser (window.ContentEngine) and in node (module.exports).
 *
 * Covers wave 16: idea-bank sorting/filtering, 90-day content-calendar
 * dealing, batching-planner film-day math, and the repurposing 2.0 derivative
 * map with originality guardrails.
 *
 * Wave 23 (Content Engine 2.0) adds: the Oct-2026 algorithm signal map
 * (TikTok/Shorts/Reels, source-labeled), six trend-derived hook patterns
 * (structures, not trends), the weekly batch scheduler (hours -> day blocks),
 * and the cross-post adaptation checklist under the Oct-1 originality rules.
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

  var VERSION = "1.1.0";
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

  /* ---------- Content Engine 2.0: algorithm signals (Oct 2026) ---------- */

  /* Mirrors data/v1/content-engine.json -> algorithm_signals. source_label is
   * one of: platform-published | verified-multi-source | single-source |
   * creator-lore. The map is a planning reference — platforms change the
   * rules; verify live before acting on anything that matters. */
  var ALGORITHM_SIGNALS = [
    {
      id: "tiktok", label: "TikTok — For You feed",
      optimize_for: "Completion rate + watch time per impression.",
      hierarchy: [
        { rank: 1, signal: "Watch time + completion rate", note: "the dominant signals",
          source: "Hootsuite; Vamp; fivebbc", source_label: "verified-multi-source" },
        { rank: 2, signal: "Rewatches, shares, saves", note: "next in line",
          source: "Hootsuite; Vamp; fivebbc", source_label: "verified-multi-source" },
        { rank: 3, signal: "Comments", note: "quality-weighted, not volume-weighted",
          source: "Hootsuite; Vamp; fivebbc", source_label: "verified-multi-source" },
        { rank: 4, signal: "Likes", note: "moderate and declining in weight",
          source: "Hootsuite; Vamp; fivebbc", source_label: "verified-multi-source" }
      ],
      mechanics: [
        { claim: "Interest graph, not social graph — follower count is not a direct ranking factor.",
          source: "Hootsuite; Vamp; fivebbc", source_label: "verified-multi-source" },
        { claim: "Every upload is tested against a small matched audience pool (~300–500 accounts) and widened ~3–5x per wave only if early signals clear the gate.",
          source: "marketing_brain SKILL.md (Oct 2026, citing virvid.ai)", source_label: "creator-lore" },
        { claim: "Watch time per impression has replaced raw view counts — a 60-second video at 80% completion can outperform a 15-second clip at 95%.",
          source: "DMA (digitalmarketingagency.sg)", source_label: "single-source" },
        { claim: "The 'qualified view' bar may have risen from 3s to 5s in 2025–2026.",
          source: "virvid.ai", source_label: "creator-lore" },
        { claim: "TikTok functions as a search engine — captions, on-screen text, and spoken keywords decide discoverability months later.",
          source: "Vamp; fivebbc", source_label: "verified-multi-source" },
        { claim: "TikTok does not recommend reused, unoriginal, or engagement-bait content.",
          source: "viral.app, citing TikTok docs (Sept 2026)", source_label: "platform-published" },
        { claim: "One agency estimates watch time/completion at 40–50% of ranking weight.",
          source: "DMA", source_label: "single-source" }
      ]
    },
    {
      id: "shorts", label: "YouTube Shorts — recommendations feed",
      optimize_for: "Completion rate (nobody clicks — they just don't swipe).",
      hierarchy: [
        { rank: 1, signal: "Completion rate + watch time",
          note: "dominant; the metric that matters is completion rate, not CTR",
          source: "October 2026 research consensus", source_label: "verified-multi-source" },
        { rank: 2, signal: "Rewatches, shares, saves", note: "next in line",
          source: "October 2026 research", source_label: "single-source" },
        { rank: 3, signal: "Likes", note: "a declining signal on swipe-driven feeds",
          source: "October 2026 research", source_label: "single-source" }
      ],
      mechanics: [
        { claim: "Oct 1, 2026 update: Shorts recommendations prioritize original content and reduce reach for re-uploaded material 'without adding anything of your own'.",
          source: "Rene Ritchie (Creator Liaison), Creator Insider video + TeamYouTube community post, Oct 1 2026; reported by Social Media Today, Storyboard18, readus247",
          source_label: "platform-published" },
        { claim: "The judgment is at the channel level: channels that primarily aggregate or re-upload without significant changes likely see less distribution — clipping channels are the direct target.",
          source: "Ritchie announcement via readus247; Storyboard18", source_label: "verified-multi-source" },
        { claim: "Recommendations only, not monetization — reach is cut; payout formulas are unchanged.",
          source: "readus247", source_label: "verified-multi-source" },
        { claim: "Real commentary, unique edits, or storytelling keep a channel safe; reaction and quoting with genuine added perspective are explicitly carved out.",
          source: "Ritchie announcement via Social Media Today", source_label: "platform-published" },
        { claim: "AI disclosure (May 2026 enforcement): automated detection flags undisclosed photorealistic AI content; properly labeled videos get normal distribution — AI labels alone don't affect recommendations or pay. Undisclosed ones face reduced recommendations or removal.",
          source: "Ritchie (May 2026), via aituber", source_label: "platform-published" },
        { claim: "Shorts-specific search filters launched in 2026 — keyword SEO matters for short-form for the first time.",
          source: "Dataslayer / MeltedStories", source_label: "single-source" },
        { claim: "Retention thresholds around ~65% (sub-30s) / ~50% (30–60s) keep a Short in distribution.",
          source: "Dataslayer", source_label: "creator-lore" }
      ]
    },
    {
      id: "reels", label: "Instagram Reels",
      optimize_for: "Sends per reach — build Reels people want to send someone.",
      hierarchy: [
        { rank: 1, signal: "Sends per reach",
          note: "Mosseri: correlates with reach more than watch time or likes",
          source: "Adam Mosseri via Virvid; CreatorFlow", source_label: "platform-published" },
        { rank: 2, signal: "Watch time", note: "",
          source: "CreatorFlow; SocialPilot", source_label: "verified-multi-source" },
        { rank: 3, signal: "Completion / rewatches", note: "",
          source: "CreatorFlow; SocialPilot", source_label: "verified-multi-source" },
        { rank: 4, signal: "Likes per reach",
          note: "likes matter more for connected (follower) content; sends dominate unconnected discovery",
          source: "Virvid (Mosseri)", source_label: "platform-published" },
        { rank: 5, signal: "Comments", note: "",
          source: "CreatorFlow; SocialPilot", source_label: "verified-multi-source" }
      ],
      mechanics: [
        { claim: "'Sends are worth 3–5x a like' is an invented number with no source — Instagram publishes no weights.",
          source: "CreatorFlow (debunk)", source_label: "creator-lore" },
        { claim: "Most Reels impressions come from accounts the viewer doesn't follow; ~100 Reels are scored for 'Reels chaining'.",
          source: "SocialPilot, citing Meta", source_label: "single-source" },
        { claim: "Reels longer than ~3 minutes are reportedly not pushed to non-followers; 7–30 seconds is the discovery sweet spot.",
          source: "orangemonke", source_label: "single-source" },
        { claim: "TikTok watermarks are explicitly deprioritized; low-resolution and engagement-bait content are penalized.",
          source: "FlowShorts", source_label: "single-source" }
      ]
    }
  ];

  /* platform: "tiktok" | "shorts" | "reels" (or falsy for all).
   * Returns a copy of the matching platform record(s). */
  function algorithmSignals(platform) {
    var out = !platform
      ? ALGORITHM_SIGNALS
      : ALGORITHM_SIGNALS.filter(function (p) { return p.id === String(platform).toLowerCase(); });
    return JSON.parse(JSON.stringify(out));
  }

  /* ---------- Content Engine 2.0: hook patterns (Oct 2026 trends) ---------- */

  /* Structural patterns distilled from the October 2026 trend reports.
   * Structures, not trends — steal the mechanic, never the sound. */
  var HOOK_PATTERNS = [
    { id: "costume-reveal-walk", name: "The Costume Reveal Walk",
      formula: "Open on a striking walk toward the camera — low angle, full commitment — then the zoom-out reveals the transformation.",
      mechanic: "Completion + watch time: the promised visual reveal is an open loop; viewers stay to see the payoff.",
      spotted_in: "Ramalama Costume Walk — 430.7K videos (SocialPilot, Sept 25–Oct 5, 2026; New Engen)",
      adapt: "The walk is a container. Swap the costume for your reveal: the finished product, the before/after, the result of the experiment." },
    { id: "leaving-edit", name: "The Leaving Edit",
      formula: "'I left [X] behind' — a confession montage of walking away from a habit, job, or belief, cut to a wistful track.",
      mechanic: "Sends + shares: an identity confession people DM to friends ('this is so you').",
      spotted_in: "Patient Zero edits — wedding edits and 'leaving something behind' audio, 149.3K videos (SocialPilot; Virlo, Oct 2026)",
      adapt: "Works for any transformation arc in your niche: the diet you quit, the tool you dropped, the belief you outgrew." },
    { id: "joy-contrast", name: "The Joy Contrast",
      formula: "Upbeat, happy-dance energy layered over chaos — the track and the caption contradict each other.",
      mechanic: "Rewatches + comments: the contradiction makes viewers watch twice and comment 'same'.",
      spotted_in: "Be OK / 'I just want to be OK' — happy-dance-over-chaos (New Engen; Later, Oct 2, 2026)",
      adapt: "Pair your realest caption with your most upbeat 3 seconds. The clash is the hook." },
    { id: "hidden-confession", name: "The Hidden Confession",
      formula: "'Text from -A' framing: 'POV: someone just exposed the thing I've been hiding about [X].'",
      mechanic: "Watch time + comments: social tension creates a stay-to-the-end promise; the comments become the confessional.",
      spotted_in: "Text From '-A' — 53.5K videos (MediaNug, 10/1/26; Later, Oct 2, 2026)",
      adapt: "Confess a niche truth your audience thinks they're alone in. Specificity beats drama." },
    { id: "cozy-bed", name: "The Cozy Bed",
      formula: "Romanticize a routine: slow shots of the ordinary process, a jazz/piano bed underneath, text overlay naming the ordinary thing as the good thing.",
      mechanic: "Saves + search: save-for-later comfort content; keyword-rich captions ride TikTok search.",
      spotted_in: "Cozy-fall mood beds — 5 of Metricool's Oct 1, 2026 top-10 sounds are jazz/piano/ambient (Virlo)",
      adapt: "Any 'day in my process' content becomes a save magnet with the right bed and a keyword-forward caption." },
    { id: "upside-down-flip", name: "The Upside-Down Flip",
      formula: "Shoot the 'before' upside down or mid-gesture; flip to the 'after' on the beat — the transition IS the hook.",
      mechanic: "Completion + shares: the visual trick delays the payoff past the swipe point.",
      spotted_in: "'Upside down' before/after main-character transitions (Later, Oct 2, 2026)",
      adapt: "Use for any transformation: edits, builds, makeovers, data reveals. Film the flip, not the filter." }
  ];

  function hookPatterns() {
    return JSON.parse(JSON.stringify(HOOK_PATTERNS));
  }

  /* ---------- Content Engine 2.0: weekly batch scheduler ---------- */

  /* Default per-task minutes: adjustable starting estimates, NOT benchmarks.
   * The scheduler does arithmetic on the creator's own inputs. */
  var SCHEDULER_DEFAULTS = {
    long: { film: 180, edit: 360, publish: 30 },
    short: { film: 30, edit: 45, publish: 15 },
    maxHoursPerDay: 8,
    restDay: 6
  };

  /* cfg: { weeklyHours, longsPerWeek, shortsPerWeek, restDay (0-6, default 6),
   *        taskMinutes: { long: {film, edit, publish}, short: {film, edit, publish} } }
   * Returns: { inputs, requiredHours, availableHours, blocks, days, slackHours,
   *            feasible, verdict ("holds"|"tight"|"over"), guidance }.
   * Pure arithmetic — never a promise. A planning aid, not financial,
   * legal, or tax advice. */
  function planBatchWeek(cfg) {
    cfg = cfg || {};
    function posNum(v, fallback) {
      v = parseFloat(v);
      return (isNaN(v) || v < 0) ? fallback : v;
    }
    var weeklyHours = posNum(cfg.weeklyHours, 0);
    var lpw = posNum(cfg.longsPerWeek, 0);
    var spw = posNum(cfg.shortsPerWeek, 0);
    var restDay = normInt(cfg.restDay, 0, 6, SCHEDULER_DEFAULTS.restDay);
    var tm = cfg.taskMinutes || {};
    function mins(kind, task) {
      var v = tm[kind] && tm[kind][task];
      v = parseFloat(v);
      return (isNaN(v) || v < 0) ? SCHEDULER_DEFAULTS[kind][task] : v;
    }

    var longTotal = mins("long", "film") + mins("long", "edit") + mins("long", "publish");
    var shortTotal = mins("short", "film") + mins("short", "edit") + mins("short", "publish");
    var reqMins = lpw * longTotal + spw * shortTotal;
    var requiredHours = round2(reqMins / 60);

    function blockHours(kind, task, n) { return n * mins(kind, task) / 60; }
    var blocks = [
      { id: "film", label: "Film day",
        hours: round2(blockHours("long", "film", lpw) + blockHours("short", "film", spw)) },
      { id: "edit", label: "Edit day",
        hours: round2(blockHours("long", "edit", lpw) + blockHours("short", "edit", spw)) },
      { id: "publish", label: "Publish day",
        hours: round2(blockHours("long", "publish", lpw) + blockHours("short", "publish", spw)) }
    ];

    /* Deal block hours across work days: film first, then edit, then publish;
     * cap 8h/day, split a block across consecutive days when needed. */
    var maxDay = SCHEDULER_DEFAULTS.maxHoursPerDay;
    var workIdx = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return d !== restDay; });
    var dayLoad = workIdx.map(function () { return 0; });
    var days = workIdx.map(function (d) { return { day: DAY_NAMES[d], tasks: [] }; });
    var di = 0;
    blocks.forEach(function (b) {
      var h = b.hours, guard = 0;
      while (h > 0.005 && guard++ < 60 && days.length) {
        var room = maxDay - dayLoad[di];
        if (room <= 0.005) { di = (di + 1) % days.length; continue; }
        var take = round2(Math.min(h, room));
        days[di].tasks.push({ block: b.id, label: b.label, hours: take });
        dayLoad[di] = round2(dayLoad[di] + take);
        h = round2(h - take);
        if (h > 0.005) di = (di + 1) % days.length;
      }
      di = (di + 1) % days.length; // next block starts on a fresh day
    });
    days = days.filter(function (d) { return d.tasks.length; });

    var feasible = requiredHours <= weeklyHours;
    var slack = round2(weeklyHours - requiredHours);
    var verdict = !feasible ? "over"
      : (requiredHours > 0 && slack < 2 ? "tight" : "holds");

    function guidance() {
      if (verdict === "over") {
        return "The week doesn't hold: " + requiredHours + "h needed, " + weeklyHours +
          "h available — short by " + Math.abs(slack) + "h. Pick one lever: drop a " +
          "weekly slot, add hours, or cut per-task time (batch filming, edit templates). " +
          "A schedule you can't keep is a plan to quit; shrink the cadence, don't promise heroics.";
      }
      if (verdict === "tight") {
        return "The week holds with " + slack + "h of slack — no margin. One bad day " +
          "breaks it. Bank content when you're ahead, and protect the rest day first.";
      }
      return "The week holds with " + slack + "h to spare. Use the slack to bank ahead — " +
        "a filmed backlog is what keeps the calendar honest when life happens.";
    }

    return {
      inputs: { weeklyHours: weeklyHours, longsPerWeek: lpw, shortsPerWeek: spw,
                restDay: restDay,
                taskMinutes: { long: { film: mins("long", "film"), edit: mins("long", "edit"),
                                       publish: mins("long", "publish") },
                               short: { film: mins("short", "film"), edit: mins("short", "edit"),
                                        publish: mins("short", "publish") } } },
      requiredHours: requiredHours,
      availableHours: weeklyHours,
      blocks: blocks,
      days: days,
      slackHours: slack,
      feasible: feasible,
      verdict: verdict,
      guidance: guidance(),
      note: "Default task minutes are starting estimates, not benchmarks — adjust them to your reality."
    };
  }

  /* ---------- Content Engine 2.0: cross-post adaptation ---------- */

  var ADAPT_PLATFORMS = {
    tiktok: "TikTok",
    shorts: "YouTube Shorts",
    reels: "Instagram Reels",
    facebook: "Facebook"
  };

  var ADAPT_GRAMMAR = {
    tiktok: "raw, fast, text-on-screen, trending audio",
    shorts: "punchy, loopable, high-retention",
    reels: "polished, aesthetic, save-worthy",
    facebook: "discussion-provoking, shareable, slightly longer"
  };

  var ADAPT_RULES = {
    "tiktok>shorts": [
      "Re-cut the opening: the first 2 seconds must carry the payoff — Shorts is swipe-driven, no title or CTR to save you.",
      "Strip or rebuild the TikTok text overlay — Shorts viewers expect burned-in captions, not TikTok's UI text.",
      "Loop the ending into the opening when the format allows — loopable Shorts harvest rewatches.",
      "AI disclosure: if the clip uses photorealistic AI, apply YouTube's AI-content label BEFORE upload — labeled gets normal distribution (Ritchie, May 2026; aituber).",
      "Swap trending TikTok audio for a Shorts-safe track whenever you don't hold the rights cross-platform."
    ],
    "tiktok>reels": [
      "Strip the TikTok watermark — watermarked re-uploads are explicitly deprioritized on Reels (FlowShorts). Export a clean master from your editor.",
      "Re-edit for polish: Reels rewards aesthetic consistency — stabilize, grade, reframe.",
      "Rewrite the caption as a mini-blog + ~5 hashtags (Reels grammar, not TikTok's keyword-stuffed caption).",
      "Add the send trigger: a 'send this to someone who…' CTA or a quotable line built for DMs — sends per reach is Mosseri's #1 signal.",
      "Keep it under ~3 minutes — longer Reels reportedly aren't pushed to non-followers (orangemonke, single source)."
    ],
    "tiktok>facebook": [
      "Write a discussion-prompting caption ending in a direct question — Facebook's algorithm weights meaningful discussion.",
      "Native upload to your Page; never post the TikTok link.",
      "Slightly longer is fine here — Facebook rewards native long-ish video, so keep the fuller cut, not the trimmed one.",
      "Respect Meta's March 2026 repost policy: your own content with native captions is normal practice; reposting others' videos kills reach."
    ],
    "shorts>tiktok": [
      "Add TikTok-native text-on-screen hooks — TikTok grammar is raw, fast, text-forward.",
      "Say your keywords out loud in the first 10 seconds, in on-screen text, and in the caption — TikTok is a search engine; Shorts SEO doesn't transfer.",
      "Keep 60–90 seconds when the format allows to stay Creator Rewards eligible (1 min+, original, 10K followers / 100K views in 30d).",
      "Strip YouTube end-cards and subscribe CTAs — they read as off-platform on TikTok."
    ],
    "shorts>reels": [
      "Export a clean master — no watermarks or cross-platform branding.",
      "Polish pass: aesthetic reframe + save-worthy framing (transformation or reveal in the first 2 seconds).",
      "Caption as mini-blog + hashtags; add the DM-send trigger.",
      "Keep it under ~3 minutes for discovery; save longer cuts for followers."
    ],
    "shorts>facebook": [
      "Native upload to your Page — Facebook rewards long-ish native video, so bring the fuller cut.",
      "Write a discussion-prompting caption with a direct question.",
      "Post the best short as a Facebook Reel too."
    ],
    "reels>tiktok": [
      "De-polish: faster pacing, rawer cuts — TikTok's grammar rewards authenticity over aesthetic.",
      "Replace the mini-blog caption with keyword-forward text, and say the keywords on camera.",
      "Re-hook the first 2 seconds with a native text overlay."
    ],
    "reels>shorts": [
      "Tighten the hook to the first 2 seconds — Shorts viewers decide faster than Reels scrollers.",
      "Burn in captions if the Reel relied on Instagram's auto-captions.",
      "Apply YouTube's AI-content label if the Reel used photorealistic AI — labeled gets normal distribution.",
      "Loop the ending into the opening when the format allows."
    ],
    "reels>facebook": [
      "Native upload to your Page with a discussion-prompting caption.",
      "The polished aesthetic transfers fine — Facebook audiences skew older and appreciate production value.",
      "Keep the mini-blog caption's best line as the discussion question."
    ],
    "facebook>tiktok": [
      "Cut down: Facebook's longer cut must become a 60–90s TikTok cut with a brand-new hook.",
      "Add text-on-screen overlay and keyword delivery for TikTok search.",
      "Remove Facebook-specific CTAs ('follow my Page')."
    ],
    "facebook>shorts": [
      "Extract the best self-contained moment — a Facebook cut is rarely a Short as-is.",
      "Re-hook the first 2 seconds; 9:16 reframe; burned-in captions.",
      "Apply YouTube's AI-content label if the footage used photorealistic AI."
    ],
    "facebook>reels": [
      "Export a clean master — no watermarks.",
      "Polish pass: aesthetic reframe; mini-blog caption + hashtags + the DM-send trigger.",
      "Keep it under ~3 minutes for discovery."
    ]
  };

  var ADAPT_UNIVERSAL = [
    "Upload native, every time. Watermarks from another platform are deprioritized (TikTok watermark on Reels is explicit). Export a clean master from your editor.",
    "9:16 full-frame. Letterboxed 16:9 on vertical reads as recycled — platforms and viewers both punish it.",
    "A new hook per destination. Same file, same first 2 seconds = a re-upload, not repurposing — and the Oct-1 rules starve re-uploads.",
    "One original element minimum per destination (re-cut opening, re-recorded VO, new text overlay, new caption angle). 'Repurposing is not re-uploading' is policy now, not advice.",
    "Photorealistic AI? Disclose on YouTube before upload (labeled = normal distribution; hiding = reduced reach or removal). Other platforms: check the current disclosure rules — they move.",
    "Stagger posting across days. The same idea everywhere on the same day splits your own audience's attention and looks automated."
  ];

  var ADAPT_GATE = "Oct-1-2026 gate: YouTube's Shorts update judges at the CHANNEL level — channels that primarily " +
    "re-upload without adding anything of their own get less distribution (Ritchie, Oct 1 2026). TikTok demotes " +
    "reused/unoriginal content; Meta's March 2026 policy targets reposts with low-value changes. Every adaptation " +
    "below adds the original element that keeps you on the right side of all three.";

  /* source: "tiktok"|"shorts"|"reels"|"facebook".
   * destinations: array of the same ids (source itself + unknowns are ignored).
   * Returns { ok, source, cards: [{from, to, fromLabel, toLabel, grammar, changes[] }],
   *           universal[], gate } — pure arithmetic on the matrix, never a promise. */
  function adaptChecklist(source, destinations) {
    source = String(source || "").toLowerCase();
    if (!ADAPT_PLATFORMS[source]) {
      return { ok: false, error: "Unknown source platform: " + source };
    }
    var seen = {};
    var dests = (destinations || []).map(function (d) { return String(d).toLowerCase(); })
      .filter(function (d) { return ADAPT_PLATFORMS[d] && d !== source && !seen[d] && (seen[d] = true); });
    var cards = dests.map(function (to) {
      return {
        from: source, to: to,
        fromLabel: ADAPT_PLATFORMS[source], toLabel: ADAPT_PLATFORMS[to],
        grammar: ADAPT_GRAMMAR[to],
        changes: (ADAPT_RULES[source + ">" + to] || []).slice()
      };
    });
    return {
      ok: true,
      source: source,
      source_label: ADAPT_PLATFORMS[source],
      cards: cards,
      universal: ADAPT_UNIVERSAL.slice(),
      gate: ADAPT_GATE
    };
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
    exportCalendarText: exportCalendarText,
    algorithmSignals: algorithmSignals,
    hookPatterns: hookPatterns,
    planBatchWeek: planBatchWeek,
    adaptChecklist: adaptChecklist
  };
});
