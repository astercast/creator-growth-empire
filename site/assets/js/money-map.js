/* The Money Map — stage placement + roadmap engine (no DOM).
 * UMD: works in the browser (window.MoneyMap) and in node (module.exports).
 *
 * HONESTY CONTRACT: stages describe where creators typically focus their
 * effort at a given revenue level — never income promises. Placement is
 * anchored on the creator's own reported monthly revenue band (their words,
 * not our model), with audience/team sanity notes. A planning aid,
 * not financial, legal, or tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.MoneyMap = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- the five stages ---------- */
  var STAGES = [
    {
      id: 0, name: "The Start Line", band: "$0",
      goal: "Prove you can ship. Creators at this stage typically focus on output volume and finding a format that fits — not on money, which hasn't arrived yet.",
      moves: [
        { tool: "The Niche Atlas", page: "niche-atlas.html",
          why: "Pick one lane you could fill for 100 videos. The Atlas shows real demand, competition, and revenue bands per niche." },
        { tool: "Idea Bank", page: "idea-bank.html",
          why: "Capture every idea and score it before you film. At this stage the bottleneck is almost always starting, not finishing." },
        { tool: "90-Day Planner", page: "planner.html",
          why: "Turn intention into a cadence you can keep. Consistency is the whole game before you have an audience." }
      ],
      trap: "Tool-collecting instead of posting. New gear, new logos, new software — none of it is the work. Thirty rough videos beat one perfect channel trailer.",
      graduate: "30 pieces posted AND (first 1,000 subs OR first $1 earned). Output first, numbers second."
    },
    {
      id: 1, name: "First $100", band: "first $100",
      goal: "Turn attention into your first real revenue. Creators here typically focus on learning what their audience is worth — usually via ads or affiliates — before chasing sponsors.",
      moves: [
        { tool: "Revenue Calculator", page: "calculator.html",
          why: "See honest revenue ranges for your current views. Knowing the math stops you from underpricing yourself later." },
        { tool: "Hook Builder", page: "hook-builder.html",
          why: "The fastest lever at this stage is retention in the first 3 seconds. Five hooks per topic, one per Playbook structure." },
        { tool: "The Short-Form Playbook", page: "shortform-playbook.html",
          why: "The serialized formats that convert casual viewers into subscribers — subscribers are what sponsors eventually pay for." }
      ],
      trap: "Sponsor-chasing before you have leverage. Saying yes to a $50 brand deal teaches the market you're cheap. Build the audience; the leverage follows.",
      graduate: "$100 in cumulative content revenue — earned, not promised. One lucky month doesn't count; repeatability does."
    },
    {
      id: 2, name: "The Engine Runs", band: "$1K/mo",
      goal: "Make $1K months repeatable. Creators at this stage typically focus on their first real sponsor relationships and on systematizing production so output doesn't depend on motivation.",
      moves: [
        { tool: "The Deal Room", page: "deal-room.html",
          why: "Manage your first deals end-to-end: offer tracking, usage-rights pricing, negotiation scripts, the deal memo." },
        { tool: "Batching Planner", page: "batching.html",
          why: "Does your shoot capacity actually cover your cadence? The honest surplus/shortfall math before you promise a sponsor a schedule." },
        { tool: "Empire Simulator", page: "simulator.html",
          why: "Model 12–24 months of growth and revenue before you live them. A model, not a prediction — it shows what has to be true." }
      ],
      trap: "One revenue stream. Ads-only is a single point of failure — one algorithm change, one demonetization wave. Stack a second stream before you need it.",
      graduate: "Three consecutive $1K+ months from at least two revenue streams. Consistency, then diversification."
    },
    {
      id: 3, name: "The Business", band: "$10K/mo",
      goal: "Treat it like a business, because it is one. Creators at this stage typically focus on their first hire, real contracts, and separating the money from their personal life.",
      moves: [
        { tool: "The First Hire", page: "hiring.html",
          why: "What to hire for first (almost always editing or admin), how to scope the role, and the mistakes that cost creators their momentum." },
        { tool: "Hiring Cost Calculator", page: "hiring-calculator.html",
          why: "The real monthly and annual cost of a hire — and the revenue needed to cover it. Honest math, no promises." },
        { tool: "Phase 7 — The Business", page: "phase-7-the-business.html",
          why: "LLC, taxes, separating accounts. Educational, not legal or tax advice — but the structure that keeps a $10K/mo operation from eating you." }
      ],
      trap: "Hiring before the math works. A full-time salary on shaky revenue turns a good channel into a stressed company. Contractors first, employees when the calculator says so.",
      graduate: "Three consecutive $10K+ months with at least two revenue streams AND your first hire made. Revenue plus leverage."
    },
    {
      id: 4, name: "The Company", band: "company",
      goal: "Build something that runs without your daily input. Creators at this stage typically focus on team P&L, new product lines, and protecting the thing the audience actually loved.",
      moves: [
        { tool: "Empire Simulator — team P&L", page: "simulator.html",
          why: "Model the full team cost against projected revenue. At company scale the question flips: what can we afford to try?" },
        { tool: "Case Files", page: "case-files.html",
          why: "Documented deconstructions — how PTYA scaled a cohort course, how the sleep channels became a network. Proven structures, reported figures." },
        { tool: "Phase 8 — Scale", page: "phase-8-scale.html",
          why: "New formats, new platforms, new products. Scale is a portfolio problem now, not a posting problem." }
      ],
      trap: "Scaling what broke you. Growth at all costs dilutes the voice that got you here. The audience loved a person, not a content factory.",
      graduate: "The operation runs a full month without your daily input — and revenue doesn't dip. That's the company. This is the capstone, not a finish line."
    }
  ];

  /* ---------- the quiz ---------- */
  var QUIZ = [
    { id: "platform", text: "Where do you mainly publish?",
      options: [
        { value: "youtube", label: "YouTube" },
        { value: "tiktok", label: "TikTok" },
        { value: "instagram", label: "Instagram / Reels" },
        { value: "twitch", label: "Twitch" },
        { value: "newsletter", label: "Newsletter / blog" },
        { value: "not-yet", label: "Haven't started publishing" }
      ] },
    { id: "audience", text: "How big is your audience (subs / followers)?",
      options: [
        { value: "zero", label: "Basically zero" },
        { value: "under-1k", label: "Under 1K" },
        { value: "1k-10k", label: "1K – 10K" },
        { value: "10k-100k", label: "10K – 100K" },
        { value: "100k-1m", label: "100K – 1M" },
        { value: "1m-plus", label: "1M+" }
      ] },
    { id: "revenue", text: "Roughly how much do you earn from content in a typical month?",
      options: [
        { value: "0", label: "$0" },
        { value: "1-99", label: "$1 – $99" },
        { value: "100-999", label: "$100 – $999" },
        { value: "1k-9999", label: "$1K – $9,999" },
        { value: "10k-plus", label: "$10K+" }
      ] },
    { id: "cadence", text: "How often do you actually publish?",
      options: [
        { value: "irregular", label: "Irregular — when I feel like it" },
        { value: "weekly", label: "About weekly" },
        { value: "multi-weekly", label: "Multiple times a week" },
        { value: "daily-or-team", label: "Daily, or a team publishes for me" }
      ] },
    { id: "team", text: "Who makes the content?",
      options: [
        { value: "just-me", label: "Just me" },
        { value: "freelancers", label: "Me + freelancers / contractors" },
        { value: "employees", label: "Me + employees" }
      ] },
    { id: "bottleneck", text: "What's your biggest bottleneck right now?",
      options: [
        { value: "ideas", label: "Ideas — what to make" },
        { value: "consistency", label: "Consistency — actually shipping" },
        { value: "growth", label: "Growth — views and subscribers" },
        { value: "monetization", label: "Monetization — turning attention into money" },
        { value: "operations", label: "Operations — too much on my plate" }
      ] },
    { id: "streams", text: "How many revenue streams are actually paying you right now?",
      options: [
        { value: "0", label: "None yet" },
        { value: "1", label: "One" },
        { value: "2-3", label: "Two or three" },
        { value: "4-plus", label: "Four or more" }
      ] }
  ];

  var REVENUE_TO_STAGE = { "0": 0, "1-99": 1, "100-999": 2, "1k-9999": 3, "10k-plus": 4 };
  var BIG_AUDIENCE = { "100k-1m": true, "1m-plus": true };

  function validAnswers(a) {
    if (!a || typeof a !== "object") return false;
    return QUIZ.every(function (q) {
      return q.options.some(function (o) { return o.value === a[q.id]; });
    });
  }

  /* Place the creator on the map. Anchored on their own reported revenue
   * band; audience/team only generate sanity notes, never move the stage
   * more than one step (audience clearly ahead of monetization). */
  function placeStage(a) {
    var base = REVENUE_TO_STAGE[a.revenue];
    if (base === undefined) throw new Error("money-map: unknown revenue band " + a.revenue);
    var stage = base, note = null;
    if (BIG_AUDIENCE[a.audience] && base <= 2) {
      stage = base + 1;
      note = "audience-ahead";
    }
    if (a.team === "employees" && stage <= 2) {
      note = note ? note + "+team-ahead" : "team-ahead";
    }
    return { stage: stage, note: note, baseStage: base };
  }

  /* Bottleneck -> tool moves (stage signature move first, then two
   * bottleneck-driven moves, deduped). */
  var BOTTLENECK_MOVES = {
    ideas: [
      { tool: "Idea Bank", page: "idea-bank.html", why: "Score ideas before you film — your bottleneck is deciding, not doing." },
      { tool: "Hook Builder", page: "hook-builder.html", why: "One topic, five filmed-ready hooks. Turns a vague idea into a shootable one." }
    ],
    consistency: [
      { tool: "90-Day Content Calendar", page: "content-calendar.html", why: "Deal ideas into a grid you can actually keep. Systems beat motivation." },
      { tool: "Batching Planner", page: "batching.html", why: "Check whether your shoot days cover your cadence — the honest capacity math." }
    ],
    growth: [
      { tool: "Hook Builder", page: "hook-builder.html", why: "Growth at this stage is usually a packaging problem, not a quality problem." },
      { tool: "Empire Simulator", page: "simulator.html", why: "See what different growth rates actually compound into over 12–24 months." }
    ],
    monetization: [
      { tool: "Revenue Calculator", page: "calculator.html", why: "Know what your current views are worth in honest ranges before you price anything." },
      { tool: "Sponsor Deal Analyzer", page: "deal-analyzer.html", why: "Benchmark any offer against the 2026 rate card before you say yes." }
    ],
    operations: [
      { tool: "The First Hire", page: "hiring.html", why: "Scope the role that's eating your week — it's almost always editing or admin." },
      { tool: "Repurposing Planner", page: "repurpose.html", why: "One idea, five platforms. Multiplication without more filming." }
    ]
  };

  function roadmap(a) {
    var placed = placeStage(a);
    var stage = STAGES[placed.stage];
    var signature = stage.moves[0];
    var extras = (BOTTLENECK_MOVES[a.bottleneck] || []).filter(function (m) {
      return m.page !== signature.page;
    }).slice(0, 2);
    return {
      stage: placed.stage,
      note: placed.note,
      moves: [signature].concat(extras),
      graduate: stage.graduate,
      trap: stage.trap
    };
  }

  /* ---------- browser UI (guarded: engine stays DOM-free for node) ---------- */
  var STORE_KEY = "cge.moneymap.v1";

  function loadStore() {
    try {
      var raw = (typeof localStorage !== "undefined") ? localStorage.getItem(STORE_KEY) : null;
      return raw ? JSON.parse(raw) : { answers: null, progress: {} };
    } catch (e) { return { answers: null, progress: {} }; }
  }
  function saveStore(s) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
    catch (e) { /* storage unavailable: progress simply isn't persisted */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function noteText(note) {
    if (!note) return null;
    var parts = [];
    if (note.indexOf("audience-ahead") !== -1)
      parts.push("Your audience is ahead of your revenue — creators at your audience size typically focus on monetization first (the Deal Room, the rate card).");
    if (note.indexOf("team-ahead") !== -1)
      parts.push("You have employees but early-stage revenue — run the Hiring Cost Calculator to check the team math against your actual income.");
    return parts.join(" ");
  }

  function renderResults(host, a) {
    var r = roadmap(a);
    var stage = STAGES[r.stage];
    host.innerHTML = "";
    var card = el("div", "map-result");
    var kicker = el("p", "map-result-kicker", "YOU ARE HERE — STAGE " + r.stage);
    var h = el("h3", null, stage.name + " · " + stage.band);
    card.appendChild(kicker); card.appendChild(h);
    card.appendChild(el("p", null, stage.goal));
    var nt = noteText(r.note);
    if (nt) {
      var note = el("p", "map-note", nt);
      note.setAttribute("role", "note");
      card.appendChild(note);
    }
    var mh = el("h4", null, "Your next 3 moves");
    card.appendChild(mh);
    var ol = el("ol", "map-moves");
    r.moves.forEach(function (m, i) {
      var li = el("li", null);
      var link = el("a", null, (i + 1) + ". " + m.tool);
      link.setAttribute("href", m.page);
      li.appendChild(link);
      li.appendChild(el("p", "muted", m.why));
      ol.appendChild(li);
    });
    card.appendChild(ol);
    var grad = el("p", null);
    grad.innerHTML = "<strong>Graduate when:</strong> ";
    grad.appendChild(document.createTextNode(r.graduate));
    card.appendChild(grad);
    var trap = el("p", "map-trap");
    trap.innerHTML = "<strong>The trap:</strong> ";
    trap.appendChild(document.createTextNode(r.trap));
    card.appendChild(trap);
    var jump = el("a", "btn btn-ghost", "Open the full Stage " + r.stage + " playbook ↓");
    jump.setAttribute("href", "#stage-" + r.stage);
    card.appendChild(jump);
    host.appendChild(card);
  }

  function buildQuizUI() {
    var app = document.getElementById("map-quiz-app");
    if (!app) return;
    var store = loadStore();
    var state = { answers: store.answers || {} };

    var qWrap = document.getElementById("map-quiz-questions");
    QUIZ.forEach(function (q, qi) {
      var fs = el("fieldset", "quiz-q");
      var legend = el("legend", null, (qi + 1) + ". " + q.text);
      fs.appendChild(legend);
      var opts = el("div", "quiz-opts");
      q.options.forEach(function (o) {
        var lab = el("label", "quiz-opt");
        var radio = document.createElement("input");
        radio.type = "radio"; radio.name = "map-" + q.id; radio.value = o.value;
        if (state.answers[q.id] === o.value) { radio.checked = true; lab.classList.add("selected"); }
        radio.addEventListener("change", function () {
          state.answers[q.id] = o.value;
          fs.classList.add("answered");
          opts.querySelectorAll(".quiz-opt").forEach(function (l) { l.classList.remove("selected"); });
          lab.classList.add("selected");
          store.answers = state.answers; saveStore(store);
          syncSubmit();
        });
        lab.appendChild(radio);
        lab.appendChild(el("span", null, o.label));
        opts.appendChild(lab);
      });
      if (state.answers[q.id]) fs.classList.add("answered");
      fs.appendChild(opts);
      qWrap.appendChild(fs);
    });

    var results = document.getElementById("map-quiz-results");
    var submit = document.getElementById("map-quiz-submit");
    var reset = document.getElementById("map-quiz-reset");

    function answered() {
      return QUIZ.filter(function (q) { return state.answers[q.id]; }).length;
    }
    function syncSubmit() {
      var n = answered();
      var fill = document.getElementById("map-quiz-meter-fill");
      var meter = document.getElementById("map-quiz-meter");
      var label = document.getElementById("map-quiz-meter-label");
      if (fill) fill.style.width = (n / QUIZ.length * 100) + "%";
      if (meter) meter.setAttribute("aria-valuenow", String(n));
      if (label) label.innerHTML = "<strong>" + n + "/" + QUIZ.length + "</strong> answered — keep going";
      submit.disabled = (n !== QUIZ.length);
    }
    submit.addEventListener("click", function () {
      if (!validAnswers(state.answers)) return;
      renderResults(results, state.answers);
      results.scrollIntoView({ behavior: "smooth", block: "start" });
      markOnMap(placeStage(state.answers).stage);
    });
    reset.addEventListener("click", function () {
      state.answers = {}; store.answers = null; saveStore(store);
      qWrap.querySelectorAll("input[type=radio]").forEach(function (r) { r.checked = false; });
      qWrap.querySelectorAll(".quiz-opt").forEach(function (l) { l.classList.remove("selected"); });
      qWrap.querySelectorAll(".quiz-q").forEach(function (f) { f.classList.remove("answered"); });
      results.innerHTML = "";
      syncSubmit();
    });
    syncSubmit();
    if (validAnswers(state.answers)) renderResults(results, state.answers);
  }

  function markOnMap(stageIdx) {
    document.querySelectorAll(".map-node").forEach(function (n) {
      var here = Number(n.getAttribute("data-stage")) === stageIdx;
      n.classList.toggle("you-are-here", here);
      n.setAttribute("aria-current", here ? "true" : "false");
    });
  }

  function buildProgressUI() {
    var store = loadStore();
    document.querySelectorAll("[data-stage-check]").forEach(function (box) {
      var sid = box.getAttribute("data-stage-check");
      box.checked = !!store.progress[sid];
      box.addEventListener("change", function () {
        store.progress[sid] = box.checked;
        if (!box.checked) delete store.progress[sid];
        saveStore(store);
        syncNodeBadges();
      });
    });
    syncNodeBadges();
    function syncNodeBadges() {
      document.querySelectorAll(".map-node").forEach(function (n) {
        var done = !!store.progress[n.getAttribute("data-stage")];
        n.classList.toggle("stage-done", done);
      });
    }
  }

  function init() {
    buildQuizUI();
    buildProgressUI();
  }

  if (typeof document !== "undefined" && typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }

  return {
    STAGES: STAGES,
    QUIZ: QUIZ,
    placeStage: placeStage,
    roadmap: roadmap,
    validAnswers: validAnswers
  };
});
