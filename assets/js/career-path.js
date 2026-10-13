/* Career Path — the Zero-to-Career system engine (rotation 20).
 * The site's center of gravity: five stages from $0 and no content to a
 * full career. Each stage carries real teaching content — reads drawn
 * from the manual's own committed chapters and intel files, plus drills
 * authored for this path — and the stage's slice of the 32-tool toolkit,
 * placed where a creator actually needs it. The Saved Shelf (Tool 32)
 * is the learner's own collection across the whole path.
 *
 * Pure set/order arithmetic over two committed lists: STAGES below and
 * the visitor's own done-set (localStorage key cge.career-path.v1,
 * written by career-path-ui.js). No progress is sent anywhere; a stage's
 * status is derived, never stored. Foundations here are durable;
 * platform terms move in Algorithm Watch (what-changed.html) — the
 * volatile layer on top, never mixed into the stages.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CareerPath = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STORAGE_KEY = "cge.career-path.v1";

  /* Lessons: kind "read" = a committed chapter/intel file (href is the
   * generated page); kind "drill" = an authored action with a done
   * criterion (doneWhen). Every drill's tool is in the stage's toolkit.
   * Provenance (research gap G-1, closed this pass): every lesson is
   * labelled from this data — reads carry a `source` naming the exact
   * chapter/intel file they are drawn from, and drills are Creator
   * Academy originals authored for this path. lessonProvenance()
   * derives the visible label; a lesson whose kind/source cannot be
   * determined is labelled "Provenance not recorded", never guessed. */
  var STAGES = [
    {
      id: "foundation",
      name: "Foundation",
      promise: "Choose the right war before you fight it: a niche with an audience and a payer, a format that fits your life, and a 90-day target written down.",
      doVerdict: "You can state your channel in one sentence — format, topic, person, transformation — and defend the choice with revenue math instead of vibes.",
      tools: ["quiz", "calculator", "planner", "money-map", "format-fit", "saved-shelf"],
      lessons: [
        { id: "f-read-phase0", kind: "read", title: "Read Phase 0 — Start From Nothing", href: "phase-0-start-from-nothing.html", source: "Phase 0 — Start From Nothing (chapter)", detail: "The niche triangle (passion × market × monetization), the 2026 niche landscape, and the two traps that end channels before they start." },
        { id: "f-drill-statement", kind: "drill", title: "Write your niche statement", tool: "quiz", doneWhen: "You can fill every blank: “I make [format] about [topic] for [specific person] who wants [transformation].” Run the Niche Picker first if a blank won't fill." },
        { id: "f-drill-money", kind: "drill", title: "Run the money check on three niches", tool: "calculator", doneWhen: "The Revenue Calculator has priced your top three candidate niches at the same view count, and you have seen the per-view gap in writing." },
        { id: "f-drill-format", kind: "drill", title: "Pick the format you can sustain", tool: "format-fit", doneWhen: "The Format Fit Finder has returned a format, and you have honestly answered whether you could make 100 of them." },
        { id: "f-drill-plan", kind: "drill", title: "Set the 90-day target", tool: "planner", doneWhen: "The 90-Day Planner holds a written target — uploads, one growth bet, one money bet — that the next stage will execute against." }
      ]
    },
    {
      id: "build",
      name: "Build",
      promise: "Build the machine before you need the output: an idea bank that never runs dry, hooks written before cameras roll, and a batching rhythm that manufactures consistency.",
      doVerdict: "You can turn one idea into a week of scheduled output in a single sitting — banked, hooked, batched, and on a calendar — without waiting for inspiration.",
      tools: ["idea-bank", "hook-builder", "batching", "content-calendar", "repurpose"],
      lessons: [
        { id: "b-read-phase1", kind: "read", title: "Read Phase 1 — The Content Engine", href: "phase-1-content-engine.html", source: "Phase 1 — The Content Engine (chapter)", detail: "The system that turns one idea into a week of output: pillars, templates, batching, and why consistency is manufactured, not motivated." },
        { id: "b-drill-bank", kind: "drill", title: "Bank twenty ideas", tool: "idea-bank", doneWhen: "The Idea Bank holds twenty ideas scored against your niche statement — not two ideas and a feeling." },
        { id: "b-drill-hooks", kind: "drill", title: "Write five hooks before filming anything", tool: "hook-builder", doneWhen: "Five banked ideas each carry a written first-three-seconds hook from the Hook Builder." },
        { id: "b-drill-batch", kind: "drill", title: "Plan one batch day", tool: "batching", doneWhen: "The Batching Planner has turned a week's output into one shoot day with a shot list." },
        { id: "b-drill-calendar", kind: "drill", title: "Put ninety days on the calendar", tool: "content-calendar", doneWhen: "The 90-Day Content Calendar shows the publishing slots your Stage 1 target demands — empty slots are visible, not deniable." }
      ]
    },
    {
      id: "publish",
      name: "Publish Rhythm",
      promise: "Ship on a cadence and learn the only two questions the algorithm asks: does the click happen, and does the viewer stay. Then take one pillar everywhere without re-uploading it.",
      doVerdict: "You can publish on a fixed cadence, read a weak video's failure to the exact decision that caused it, and check your monetization gate against the real, current thresholds.",
      tools: ["cadence", "crosspost", "video-doctor", "ypp-checker"],
      lessons: [
        { id: "p-read-phase2", kind: "read", title: "Read Phase 2 — YouTube Mastery", href: "phase-2-youtube-mastery.html", source: "Phase 2 — YouTube Mastery (chapter)", detail: "Packaging, retention, and the algorithm's two questions — the highest-leverage skill on the internet, taught in order." },
        { id: "p-read-phase3", kind: "read", title: "Read Phase 3 — The Everywhere Engine", href: "phase-3-everywhere-engine.html", source: "Phase 3 — The Everywhere Engine (chapter)", detail: "One pillar, five platforms: repurposing without re-uploading, and surviving the originality era every platform converged on." },
        { id: "p-drill-cadence", kind: "drill", title: "Lock your cadence", tool: "cadence", doneWhen: "The Cadence Coach has set a weekly rhythm you have actually kept for two consecutive weeks." },
        { id: "p-drill-crosspost", kind: "drill", title: "Take one pillar everywhere", tool: "crosspost", doneWhen: "One published pillar has been adapted — not re-uploaded — to a second platform with the Cross-Post Optimizer." },
        { id: "p-drill-doctor", kind: "drill", title: "Diagnose your weakest video", tool: "video-doctor", doneWhen: "Diagnose My Video has named the failure point of your weakest performer, and the fix is written into the next video's plan." },
        { id: "p-drill-ypp", kind: "drill", title: "Check the monetization gate", tool: "ypp-checker", doneWhen: "The YPP 2027 Eligibility Checker has measured your channel against the thresholds that will actually apply to you, with the date attached." }
      ]
    },
    {
      id: "growth",
      name: "Growth",
      promise: "Turn viewers into a community that stays, pays, and recruits — and learn to read the numbers well enough to know which lever you just pulled. This is the path's thinnest stage for tools (two) by design: growth is mostly judgment, and the teaching carries it.",
      doVerdict: "You can read your own analytics without flinching or guessing, name the metric a change moved, and run one deliberate growth play instead of posting and hoping.",
      tools: ["outreach", "api-explorer"],
      lessons: [
        { id: "g-read-phase4", kind: "read", title: "Read Phase 4 — Audience to Community", href: "phase-4-audience-to-community.html", source: "Phase 4 — Audience to Community (chapter)", detail: "Viewers watch; communities stay, pay, and recruit. The unsexy work that makes everything else compound." },
        { id: "g-read-breakout", kind: "read", title: "Read the Breakout Format Intel", href: "breakout-format-intel.html", source: "The 2026 Breakout-Format Intel (intel file)", detail: "The formats punching above their weight right now, with the research attached — formats are borrowed, never copied blind." },
        { id: "g-drill-metrics", kind: "drill", title: "Learn your twelve numbers", tool: "api-explorer", doneWhen: "You can define every term in the Metrics Glossary from your own channel's data, pulled and read in the API Explorer — no term left as a vibe." },
        { id: "g-drill-outreach", kind: "drill", title: "Run one outreach play", tool: "outreach", doneWhen: "The Outreach Center has sent one real collaboration or guest pitch to a named creator in your niche — written, sent, and logged." }
      ]
    },
    {
      id: "career",
      name: "Monetization & Career",
      promise: "Layer the money in the right order — ads, sponsors, products, business — then run it like a company: rate card, pipeline, books, team. This stage's toolkit is the whole money chain, because this is where it is used.",
      doVerdict: "You can price a deal from your own rate card, negotiate it without bluffing, hold it on a board, chase it, ledger what landed, and say what your business earned last month — per brand and per platform — from records, not memory.",
      tools: ["rate-card-builder", "deal-analyzer", "deal-room", "deal-builder", "negotiation-kit", "negotiation-script-builder", "deal-pipeline", "follow-through", "repeat-sponsor-book", "sponsor-income-ledger", "receivables-register", "brand-ledger", "platform-ledger", "hiring-calculator", "simulator"],
      lessons: [
        { id: "c-read-phase5", kind: "read", title: "Read Phase 5 — The Monetization Stack", href: "phase-5-monetization-stack.html", source: "Phase 5 — The Monetization Stack (chapter)", detail: "Ads, sponsors, affiliates, products — layered in the right order. The chapter the Quartermaster says to read twice." },
        { id: "c-read-phase6", kind: "read", title: "Read Phase 6 — Merch & Brand", href: "phase-6-merch-and-brand.html", source: "Phase 6 — Merch & Brand (chapter)", detail: "Your name as an asset: when merch makes sense, when it doesn't, and the margins nobody posts about." },
        { id: "c-read-phase7", kind: "read", title: "Read Phase 7 — The Business", href: "phase-7-the-business.html", source: "Phase 7 — The Business (chapter)", detail: "LLC, taxes, separating the money — the boring paperwork that keeps the exciting part legal. Educational, not advice." },
        { id: "c-read-phase8", kind: "read", title: "Read Phase 8 — Scale", href: "phase-8-scale.html", source: "Phase 8 — Scale (chapter)", detail: "Team, systems, stepping back: how empires stop depending on the founder's calendar." },
        { id: "c-read-ratecard", kind: "read", title: "Read the Rate Card intel file", href: "rate-card.html", source: "The 2026 Rate Card (intel file)", detail: "What the market actually pays, by niche and size — the evidence your own rate card is built from." },
        { id: "c-read-sponsor", kind: "read", title: "Read the Sponsor Playbook", href: "sponsor-playbook.html", source: "The 2026 Sponsor Playbook (intel file)", detail: "How deals are found, pitched, priced, and renewed when a professional runs them." },
        { id: "c-read-rules", kind: "read", title: "Read the Platform Rules Bible", href: "platform-rules-bible.html", source: "The 2026 Platform Rules Bible (intel file)", detail: "The standing rules of every platform you earn on — the durable layer. (What changes week to week lives in Algorithm Watch, not here.)" },
        { id: "c-drill-ratecard", kind: "drill", title: "Build your rate card", tool: "rate-card-builder", doneWhen: "The Rate Card Builder holds your card — every format priced from your numbers, ready to send without a rewrite." },
        { id: "c-drill-firstdeal", kind: "drill", title: "Price the first real inquiry", tool: "deal-analyzer", doneWhen: "The first brand inquiry (or a realistic rehearsal) has been priced in the Deal Analyzer and answered from the Negotiation Kit — no number invented in the reply box." },
        { id: "c-drill-pipeline", kind: "drill", title: "Open the pipeline", tool: "deal-pipeline", doneWhen: "Every live deal sits on the Deal Pipeline board at its true stage; the Follow-Through Queue is your morning list." },
        { id: "c-drill-books", kind: "drill", title: "Run the books once", tool: "sponsor-income-ledger", doneWhen: "The Sponsor Income Ledger, Receivables Register, Brand Ledger, and Platform Ledger have each been read against the board — you know what landed, what is owed, and what rides on one platform." },
        { id: "c-drill-hire", kind: "drill", title: "Model the first hire before making it", tool: "hiring-calculator", doneWhen: "The Hiring Cost Calculator and the Empire Simulator have both priced the same hire — and the decision, either way, is written down with its numbers." }
      ]
    }
  ];

  /* Honest provenance, derived from the lesson record itself:
   * a drill was authored for this path, a read is drawn from the
   * committed chapter/intel file its `source` names. Anything else
   * — an unknown kind, or a read with no source recorded — is the
   * honest unknown, never a guessed label. */
  function lessonProvenance(lesson) {
    if (!lesson) return { origin: "unknown", label: "Provenance not recorded" };
    if (lesson.kind === "drill") {
      return { origin: "creator-academy", label: "Creator Academy \u2014 original drill" };
    }
    if (lesson.kind === "read" && typeof lesson.source === "string" && lesson.source) {
      return { origin: "read", label: "Read \u2014 from " + lesson.source, source: lesson.source };
    }
    return { origin: "unknown", label: "Provenance not recorded" };
  }

  function allLessons() {
    var out = [];
    STAGES.forEach(function (s) {
      s.lessons.forEach(function (l) {
        out.push({ stageId: s.id, stageName: s.name, lesson: l });
      });
    });
    return out;
  }

  function lessonIds() {
    return allLessons().map(function (x) { return x.lesson.id; });
  }

  /* The done-set: only ids the path actually has, first-done order,
   * never mutating the caller's list. Unknown ids are counted apart by
   * buildPath as stale — a renamed lesson never silently vanishes. */
  function normalizeProgress(done) {
    var known = {};
    lessonIds().forEach(function (id) { known[id] = true; });
    var seen = {}, out = [];
    (Array.isArray(done) ? done : []).forEach(function (id) {
      if (typeof id === "string" && known[id] && !seen[id]) { seen[id] = true; out.push(id); }
    });
    return out;
  }

  function toggleLesson(done, id) {
    var list = normalizeProgress(done);
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else if (lessonIds().indexOf(id) >= 0) list.push(id);
    return list;
  }

  function toolStageMap() {
    var map = {};
    STAGES.forEach(function (s) {
      s.tools.forEach(function (t) { map[t] = s.id; });
    });
    return map;
  }

  function buildPath(done) {
    var raw = Array.isArray(done) ? done : [];
    var clean = normalizeProgress(raw);
    var doneSet = {};
    clean.forEach(function (id) { doneSet[id] = true; });
    var known = {};
    lessonIds().forEach(function (id) { known[id] = true; });
    var stale = [];
    raw.forEach(function (id) { if (typeof id === "string" && !known[id] && stale.indexOf(id) < 0) stale.push(id); });

    var stages = STAGES.map(function (s) {
      var total = s.lessons.length;
      var doneCount = s.lessons.filter(function (l) { return doneSet[l.id]; }).length;
      return {
        id: s.id, name: s.name, promise: s.promise, doVerdict: s.doVerdict,
        tools: s.tools.slice(),
        reads: s.lessons.filter(function (l) { return l.kind === "read"; }).length,
        drills: s.lessons.filter(function (l) { return l.kind === "drill"; }).length,
        lessons: s.lessons.map(function (l) {
          var prov = lessonProvenance(l);
          return { id: l.id, kind: l.kind, title: l.title, href: l.href || null, tool: l.tool || null, detail: l.detail || null, doneWhen: l.doneWhen || null, source: l.source || null, provenance: prov.origin, provenanceLabel: prov.label, done: !!doneSet[l.id] };
        }),
        total: total, doneCount: doneCount,
        pct: total ? Math.round((doneCount / total) * 100) : 0,
        status: doneCount === 0 ? "not-started" : doneCount === total ? "complete" : "in-progress"
      };
    });

    var totalLessons = lessonIds().length;
    var next = null;
    outer: for (var i = 0; i < stages.length; i++) {
      for (var j = 0; j < stages[i].lessons.length; j++) {
        if (!stages[i].lessons[j].done) {
          next = { stageId: stages[i].id, stageName: stages[i].name, stageIndex: i, lessonIndex: j, lesson: stages[i].lessons[j] };
          break outer;
        }
      }
    }
    var currentStage = next ? stages[next.stageIndex] : stages[stages.length - 1];

    return {
      ok: true,
      stages: stages,
      doneCount: clean.length,
      totalLessons: totalLessons,
      pct: totalLessons ? Math.round((clean.length / totalLessons) * 100) : 0,
      complete: clean.length === totalLessons,
      currentStageId: currentStage.id,
      currentStageName: currentStage.name,
      nextStep: next,
      staleCount: stale.length,
      staleIds: stale,
      toolCount: Object.keys(toolStageMap()).length
    };
  }

  function exportPath(p) {
    var lines = ["ZERO-TO-CAREER PATH — your progress (this browser only, never sent anywhere)"];
    lines.push(p.doneCount + " of " + p.totalLessons + " lessons done (" + p.pct + "%)" +
      (p.complete ? " — path complete" : " — you are in Stage: " + p.currentStageName));
    if (p.nextStep) lines.push("Next step: [" + p.nextStep.stageName + "] " + p.nextStep.lesson.title);
    p.stages.forEach(function (s, i) {
      lines.push("");
      lines.push("STAGE " + (i + 1) + " — " + s.name.toUpperCase() + ": " + s.doneCount + "/" + s.total + " (" + s.status + ")");
      lines.push("After this stage you can: " + s.doVerdict);
      s.lessons.forEach(function (l) {
        lines.push("  [" + (l.done ? "x" : " ") + "] (" + l.kind + " \u00b7 " + (l.provenanceLabel || "Provenance not recorded") + ") " + l.title);
      });
      lines.push("  Toolkit: " + s.tools.join(", "));
    });
    if (p.staleCount) lines.push("", p.staleCount + " stale lesson id(s) counted apart, never rendered: " + p.staleIds.join(", "));
    lines.push("", "Foundations are durable; platform changes are tracked separately in Algorithm Watch (what-changed.html).");
    return lines.join("\n");
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    STAGES: STAGES,
    lessonProvenance: lessonProvenance,
    allLessons: allLessons,
    lessonIds: lessonIds,
    normalizeProgress: normalizeProgress,
    toggleLesson: toggleLesson,
    toolStageMap: toolStageMap,
    buildPath: buildPath,
    exportPath: exportPath
  };
});
