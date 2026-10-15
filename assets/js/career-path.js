/* Career Path, the Zero-to-Career system engine (rotation 20).
 * The site's center of gravity: five stages from $0 and no content to a
 * full career. Each stage carries real teaching content, reads drawn
 * from the manual's own committed chapters and intel files, plus drills
 * authored for this path, and the stage's slice of the 32-tool toolkit,
 * placed where a creator actually needs it. The Saved Shelf (Tool 32)
 * is the learner's own collection across the whole path.
 *
 * Pure set/order arithmetic over two committed lists: STAGES below and
 * the visitor's own done-set (localStorage key cge.career-path.v1,
 * written by career-path-ui.js). No progress is sent anywhere; a stage's
 * status is derived, never stored. Foundations here are durable;
 * platform terms move in Algorithm Watch (what-changed.html), the
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
   * labelled from this data, reads carry a `source` naming the exact
   * chapter/intel file they are drawn from, and drills are Creator
   * Academy originals authored for this path. lessonProvenance()
   * derives the visible label; a lesson whose kind/source cannot be
   * determined is labelled "Provenance not recorded", never guessed. */
  var STAGES = [
    {
      id: "foundation",
      name: "Start From Nothing",
      promise: "Choose before you build. Pick a topic with viewers and money in it. Pick a kind of video that fits your life. Write down a 90-day target.",
      doVerdict: "Done when you can say what your channel is in one short line. You can also show plain math for why it can pay.",
      tools: ["quiz", "calculator", "planner", "money-map", "format-fit", "saved-shelf"],
      lessons: [
        { id: "f-read-phase0", kind: "read", title: "Read Phase 0: Start From Nothing", href: "phase-0-start-from-nothing.html", source: "Phase 0: Start From Nothing (chapter)", detail: "The three things a good topic needs, the 2026 topic map, and the two traps that end channels early." },
        { id: "f-drill-statement", kind: "drill", title: "Write your niche statement", tool: "quiz", doneWhen: "You can fill every blank in this line: “I make [kind of video] about [topic] for [one kind of person] who wants [change].” If a blank will not fill, run the Niche Picker first." },
        { id: "f-drill-money", kind: "drill", title: "Run the money check on three niches", tool: "calculator", doneWhen: "The Revenue Calculator has priced your three topics at the same view count. You have seen, in writing, what each pays for one view." },
        { id: "f-drill-format", kind: "drill", title: "Pick the format you can sustain", tool: "format-fit", doneWhen: "The Format Fit Finder has named a kind of video, and you have answered honestly: could I make 100 of these?" },
        { id: "f-drill-plan", kind: "drill", title: "Set the 90-day target", tool: "planner", doneWhen: "The 90-Day Planner holds your target in writing: how many videos, one growth bet, one money bet." }
      ]
    },
    {
      id: "build",
      name: "Make Your Videos",
      promise: "Build the system before you need the videos. Keep a bank of ideas that never runs dry. Write your opening lines before you film. Film a week of videos in one day.",
      doVerdict: "Done when you can turn one idea into a week of planned videos in one sitting. No waiting to feel inspired.",
      tools: ["idea-bank", "hook-builder", "batching", "content-calendar", "repurpose"],
      lessons: [
        { id: "b-read-phase1", kind: "read", title: "Read Phase 1: The Content Engine", href: "phase-1-content-engine.html", source: "Phase 1: The Content Engine (chapter)", detail: "How one idea becomes a week of videos: main subjects, set shapes, filming days, and why steady beats inspired." },
        { id: "b-drill-bank", kind: "drill", title: "Bank twenty ideas", tool: "idea-bank", doneWhen: "The Idea Bank holds twenty ideas, each scored against your topic sentence. Not two ideas and a feeling." },
        { id: "b-drill-hooks", kind: "drill", title: "Write five hooks before filming anything", tool: "hook-builder", doneWhen: "Five of your banked ideas each carry a written hook: the first three seconds, in words." },
        { id: "b-drill-batch", kind: "drill", title: "Plan one batch day", tool: "batching", doneWhen: "The Batching Planner has turned one week of videos into one filming day, with a shot list." },
        { id: "b-drill-calendar", kind: "drill", title: "Put ninety days on the calendar", tool: "content-calendar", doneWhen: "The 90-Day Content Calendar shows your posting days for ninety days. Empty days stay visible, not hidden." }
      ]
    },
    {
      id: "publish",
      name: "Post and Keep Posting",
      promise: "Post on set days. Learn the two questions that matter: would I click this, and would I keep watching? Then take your best work to more apps, remade for each one.",
      doVerdict: "Done when you can post on your set days without fail. You can point to the exact choice that hurt a weak video. You can check when you can start earning.",
      tools: ["cadence", "crosspost", "video-doctor", "ypp-checker"],
      lessons: [
        { id: "p-read-phase2", kind: "read", title: "Read Phase 2: YouTube Mastery", href: "phase-2-youtube-mastery.html", source: "Phase 2: YouTube Mastery (chapter)", detail: "How titles and cover pictures earn the click, and how the first seconds keep people watching." },
        { id: "p-read-phase3", kind: "read", title: "Read Phase 3: The Everywhere Engine", href: "phase-3-everywhere-engine.html", source: "Phase 3: The Everywhere Engine (chapter)", detail: "One kind of video, five apps: remake it for each app. Never just re-send the same file." },
        { id: "p-drill-cadence", kind: "drill", title: "Pick your posting days", tool: "cadence", doneWhen: "The Cadence Coach holds your posting days, and you have kept them two weeks in a row." },
        { id: "p-drill-crosspost", kind: "drill", title: "Take your best video to a second app", tool: "crosspost", doneWhen: "One strong video has been remade, not re-sent, for a second app with the Cross-Post Optimizer." },
        { id: "p-drill-doctor", kind: "drill", title: "Diagnose your weakest video", tool: "video-doctor", doneWhen: "Diagnose My Video has named the exact place your weakest video loses people, and the fix is in your next video's plan." },
        { id: "p-drill-ypp", kind: "drill", title: "Check when you can start earning", tool: "ypp-checker", doneWhen: "The YPP 2027 Eligibility Checker has checked your channel against the rules that will apply to you, with the date on it." }
      ]
    },
    {
      id: "growth",
      name: "Grow Your People",
      promise: "Turn viewers into people who stay. Learn your numbers well enough to know what each change did. This stage has few tools on purpose. Growth is mostly judgment, and the teaching carries it.",
      doVerdict: "Done when you can read your own numbers without fear or guessing. You can name what a change moved. You can run one planned growth move, not just post and hope.",
      tools: ["outreach", "api-explorer"],
      lessons: [
        { id: "g-read-phase4", kind: "read", title: "Read Phase 4: Audience to Community", href: "phase-4-audience-to-community.html", source: "Phase 4: Audience to Community (chapter)", detail: "People who watch come and go. People who belong stay, pay, and bring friends. This chapter is about the second kind." },
        { id: "g-read-breakout", kind: "read", title: "Read the Breakout Format Intel", href: "breakout-format-intel.html", source: "The 2026 Breakout-Format Intel (intel file)", detail: "The kinds of video growing fastest right now, with the research attached. Borrow the shape. Never copy it blind." },
        { id: "g-drill-metrics", kind: "drill", title: "Learn your twelve numbers", tool: "api-explorer", doneWhen: "You can say what each of the twelve numbers means, from your own channel's data in the API Explorer. No word left fuzzy." },
        { id: "g-drill-outreach", kind: "drill", title: "Send one pitch to another creator", tool: "outreach", doneWhen: "The Outreach Center holds one real pitch to a named creator in your topic: written, sent, and logged." }
      ]
    },
    {
      id: "career",
      name: "Turn It Into a Career",
      promise: "Add the money in the right order. Then run it like a real job: price card, deal board, books, first helper. This stage holds the whole money toolkit. This is where you use it.",
      doVerdict: "Done when you can price a deal from your own card. You can talk it through without bluffing. You can say what your channel earned last month, from records, not memory.",
      tools: ["rate-card-builder", "deal-analyzer", "deal-room", "deal-builder", "negotiation-kit", "negotiation-script-builder", "deal-pipeline", "follow-through", "repeat-sponsor-book", "sponsor-income-ledger", "receivables-register", "brand-ledger", "platform-ledger", "hiring-calculator", "simulator"],
      lessons: [
        { id: "c-read-phase5", kind: "read", title: "Read Phase 5: The Monetization Stack", href: "phase-5-monetization-stack.html", source: "Phase 5: The Monetization Stack (chapter)", detail: "The ways money comes in, in the right order: ads, brand deals, paid links, things you sell. Read this one twice." },
        { id: "c-read-phase6", kind: "read", title: "Read Phase 6: Merch & Brand", href: "phase-6-merch-and-brand.html", source: "Phase 6: Merch & Brand (chapter)", detail: "Your name as a thing you can sell: when merch makes sense, when it does not, and the profit numbers nobody posts." },
        { id: "c-read-phase7", kind: "read", title: "Read Phase 7: The Business", href: "phase-7-the-business.html", source: "Phase 7: The Business (chapter)", detail: "Company papers, taxes, and keeping the money apart. The dull papers that keep the fun part legal. Teaching, not advice." },
        { id: "c-read-phase8", kind: "read", title: "Read Phase 8: Scale", href: "phase-8-scale.html", source: "Phase 8: Scale (chapter)", detail: "Helpers, systems, and stepping back: how a channel stops needing your every day." },
        { id: "c-read-ratecard", kind: "read", title: "Read the Rate Card intel file", href: "rate-card.html", source: "The 2026 Rate Card (intel file)", detail: "What brands really pay, by topic and size. This is the proof your own rate card stands on." },
        { id: "c-read-sponsor", kind: "read", title: "Read the Sponsor Playbook", href: "sponsor-playbook.html", source: "The 2026 Sponsor Playbook (intel file)", detail: "How brand deals are found, pitched, priced, and won again when a pro runs them." },
        { id: "c-read-rules", kind: "read", title: "Read the Platform Rules Bible", href: "platform-rules-bible.html", source: "The 2026 Platform Rules Bible (intel file)", detail: "The standing rules of every app you earn on. (What changes week to week lives in Algorithm Watch, not here.)" },
        { id: "c-drill-ratecard", kind: "drill", title: "Build your rate card", tool: "rate-card-builder", doneWhen: "The Rate Card Builder holds your card: every kind of post priced from your numbers, ready to send as it is." },
        { id: "c-drill-firstdeal", kind: "drill", title: "Price the first real inquiry", tool: "deal-analyzer", doneWhen: "The first brand price question, or a practice one, has been priced in the Deal Analyzer and answered from the Negotiation Kit. No number invented in the reply." },
        { id: "c-drill-pipeline", kind: "drill", title: "Put every deal on one board", tool: "deal-pipeline", doneWhen: "Every live deal sits on the Deal Pipeline board at its true stage. The Follow-Through Queue is your morning list." },
        { id: "c-drill-books", kind: "drill", title: "Run the books once", tool: "sponsor-income-ledger", doneWhen: "The four money books have each been read against the board. You know what landed, what is owed, and what rests on one app." },
        { id: "c-drill-hire", kind: "drill", title: "Price the first helper before you hire", tool: "hiring-calculator", doneWhen: "The Hiring Cost Calculator and the Empire Simulator have both priced the same helper. The choice is written down with its numbers." }
      ]
    }
  ];

  /* Honest provenance, derived from the lesson record itself:
   * a drill was authored for this path, a read is drawn from the
   * committed chapter/intel file its `source` names. Anything else
   *, an unknown kind, or a read with no source recorded, is the
   * honest unknown, never a guessed label. */
  function lessonProvenance(lesson) {
    if (!lesson) return { origin: "unknown", label: "Provenance not recorded" };
    if (lesson.kind === "drill") {
      return { origin: "creator-academy", label: "Creator Academy: original drill" };
    }
    if (lesson.kind === "read" && typeof lesson.source === "string" && lesson.source) {
      return { origin: "read", label: "Read \u00b7 from " + lesson.source, source: lesson.source };
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
   * buildPath as stale, a renamed lesson never silently vanishes. */
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

  /* The lesson spec table (rotation 22, data/v1/lessons.json): the
   * manual's name formula made data. buildPath accepts the table as an
   * optional second argument and merges it onto each lesson: number,
   * state word, time, difficulty, needs, steps, and the conclusion line
   * naming the artifact produced. Without the table the fields are null
   * and the UI says "Spec not recorded", the same honest fallback the
   * provenance labelling uses. Parity between this file's STAGES and
   * lessons.json is pinned by tests/creator-r22.test.js. */
  function buildPath(done, specMap) {
    var raw = Array.isArray(done) ? done : [];
    var clean = normalizeProgress(raw);
    var doneSet = {};
    clean.forEach(function (id) { doneSet[id] = true; });
    var known = {};
    lessonIds().forEach(function (id) { known[id] = true; });
    var stale = [];
    raw.forEach(function (id) { if (typeof id === "string" && !known[id] && stale.indexOf(id) < 0) stale.push(id); });
    var specs = specMap || {};

    var stages = STAGES.map(function (s, si) {
      var total = s.lessons.length;
      var doneCount = s.lessons.filter(function (l) { return doneSet[l.id]; }).length;
      return {
        id: s.id, name: s.name, number: si + 1, promise: s.promise, doVerdict: s.doVerdict,
        tools: s.tools.slice(),
        reads: s.lessons.filter(function (l) { return l.kind === "read"; }).length,
        drills: s.lessons.filter(function (l) { return l.kind === "drill"; }).length,
        lessons: s.lessons.map(function (l, li) {
          var prov = lessonProvenance(l);
          var spec = specs[l.id] || null;
          return { id: l.id, kind: l.kind, title: l.title, href: l.href || null, tool: l.tool || null, detail: l.detail || null, doneWhen: l.doneWhen || null, source: l.source || null, provenance: prov.origin, provenanceLabel: prov.label, done: !!doneSet[l.id],
            number: (si + 1) + "." + (li + 1), state: spec && spec.state ? spec.state : "current",
            time: spec ? spec.time || null : null, difficulty: spec ? spec.difficulty || null : null,
            needs: spec && Array.isArray(spec.needs) ? spec.needs.slice() : null,
            steps: spec && Array.isArray(spec.steps) ? spec.steps.slice() : null,
            artifact: spec ? spec.artifact || null : null };
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
    var lines = ["ZERO-TO-CAREER PATH, your progress (this browser only, never sent anywhere)"];
    lines.push(p.doneCount + " of " + p.totalLessons + " lessons done (" + p.pct + "%)" +
      (p.complete ? ", path complete" : ", you are in Stage: " + p.currentStageName));
    if (p.nextStep) lines.push("Next step: [" + p.nextStep.stageName + "] " + (p.nextStep.lesson.number ? p.nextStep.lesson.number + " \u00b7 " : "") + p.nextStep.lesson.title);
    p.stages.forEach(function (s, i) {
      lines.push("");
      lines.push("STAGE " + (i + 1) + ", " + s.name.toUpperCase() + ": " + s.doneCount + "/" + s.total + " (" + s.status + ")");
      lines.push("After this stage you can: " + s.doVerdict);
      s.lessons.forEach(function (l) {
        lines.push("  [" + (l.done ? "x" : " ") + "] " + (l.number || "") + " \u00b7 " + l.title + " \u00b7 " + l.kind + " \u00b7 " + (l.state || "current") + " (" + (l.provenanceLabel || "Provenance not recorded") + ")");
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
