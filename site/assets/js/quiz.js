/* Niche Picker: 6 questions -> ranked niche suggestions with reasoning. */
(function () {
  "use strict";

  var NICHES = [
    { id: "finance", name: "Money & Finance", rpm: "high", competition: "high",
      desc: "Budgeting, investing basics, side hustles, money psychology.",
      why: "Highest ad rates on YouTube. Every view is worth 3–5x an entertainment view. Brutal competition, but the math forgives a smaller audience.",
      fit: ["numbers", "teaching", "research"] },
    { id: "tech", name: "Tech & Software", rpm: "high", competition: "high",
      desc: "App breakdowns, AI tools, coding, gadget reviews, tech explainers.",
      why: "Top-tier RPMs and endless new-product cycles to cover. Sponsors (SaaS, apps) pay extremely well for trusted reviewers.",
      fit: ["building", "teaching", "research"] },
    { id: "education", name: "Education & Explainers", rpm: "mid-high", competition: "medium",
      desc: "History, science, economics, 'how things work' — curiosity as a product.",
      why: "Evergreen by nature. One great explainer earns for years. Lower ceiling per video than finance, but the catalog compounds beautifully.",
      fit: ["teaching", "research", "story"] },
    { id: "fitness", name: "Fitness & Health", rpm: "mid", competition: "high",
      desc: "Training, nutrition, transformation journeys, sport science.",
      why: "Massive, evergreen demand and strong affiliate potential (supplements, programs, gear). Transformation content is inherently bingeable.",
      fit: ["doing", "teaching", "story"] },
    { id: "gaming", name: "Gaming", rpm: "low-mid", competition: "extreme",
      desc: "Gameplay, commentary, esports, game design analysis.",
      why: "The most crowded niche on earth — but also the biggest audience. Wins come from personality + format innovation, not from playing games well.",
      fit: ["doing", "entertaining", "story"] },
    { id: "lifestyle", name: "Lifestyle & Vlogs", rpm: "mid", competition: "high",
      desc: "Day-in-the-life, routines, travel, personal growth.",
      why: "Sells parasocial connection better than any other format. Sponsors love it. But 'my life is interesting' is not a strategy — you need a lens.",
      fit: ["story", "entertaining", "doing"] },
    { id: "comedy", name: "Comedy & Sketches", rpm: "low", competition: "extreme",
      desc: "Sketches, commentary comedy, memes-as-craft.",
      why: "Lowest ad rates, hardest to sustain — but the biggest viral upside and the strongest brand-deal magnet when it hits. Only pick this if you'd do it for free.",
      fit: ["entertaining", "story"] },
    { id: "diy", name: "DIY, Making & Crafts", rpm: "mid", competition: "medium",
      desc: "Builds, repairs, cooking, woodworking, restorations.",
      why: "Deeply satisfying watch-time (process = retention), strong affiliate play (tools, materials), and underserved in short-form.",
      fit: ["doing", "teaching"] },
    { id: "career", name: "Career & Productivity", rpm: "high", competition: "medium",
      desc: "Resumes, interviews, freelancing, study systems, workplace reality.",
      why: "High-value audience (employed adults), great B2B sponsors, and endless search demand. Less sexy, more profitable.",
      fit: ["teaching", "research", "numbers"] },
    { id: "local", name: "Local / City Explorer", rpm: "low-mid", competition: "low",
      desc: "Your city's food, hidden spots, history, cost of living.",
      why: "Almost nobody does this well, and local businesses pay cash for attention. Smaller ceiling, but you can own a geography outright.",
      fit: ["doing", "story", "entertaining"] },
  ];

  var QUESTIONS = [
    { id: "q1", text: "What could you talk about for 100 videos without getting bored?",
      options: [
        { label: "Money, numbers, markets", tags: ["numbers"] },
        { label: "Teaching / explaining things", tags: ["teaching"] },
        { label: "Making / doing stuff with my hands", tags: ["doing"] },
        { label: "Stories, drama, entertaining people", tags: ["story", "entertaining"] },
        { label: "Researching rabbit holes", tags: ["research"] },
      ]},
    { id: "q2", text: "How do you feel on camera?",
      options: [
        { label: "Love it — give me the spotlight", tags: ["entertaining"] },
        { label: "Fine with voiceover, shy on camera", tags: ["teaching", "research"] },
        { label: "Prefer showing my hands/work, not my face", tags: ["doing"] },
        { label: "I'll do whatever the format needs", tags: ["story", "numbers"] },
      ]},
    { id: "q3", text: "What matters more to you?",
      options: [
        { label: "Maximum money per view (smaller audience OK)", tags: ["numbers", "teaching"], rpmPref: "high" },
        { label: "Biggest possible audience (money per view less important)", tags: ["entertaining", "story"], rpmPref: "low" },
        { label: "Balance of both", tags: ["doing", "research"], rpmPref: "mid" },
      ]},
    { id: "q4", text: "Your unfair advantage?",
      options: [
        { label: "A skill or credential (job, degree, craft)", tags: ["teaching", "numbers"] },
        { label: "Personality / humor", tags: ["entertaining", "story"] },
        { label: "Access (a city, a workshop, a community)", tags: ["doing", "story"] },
        { label: "Curiosity + research stamina", tags: ["research", "teaching"] },
      ]},
    { id: "q5", text: "Preferred format?",
      options: [
        { label: "Long-form deep dives (8–20 min)", tags: ["teaching", "research", "story"], form: "long" },
        { label: "Short-form bangers (under 60s)", tags: ["entertaining", "doing"], form: "short" },
        { label: "Both — long-form anchors, shorts as trailers", tags: ["story", "teaching"], form: "both" },
      ]},
    { id: "q6", text: "How much competition can you stomach?",
      options: [
        { label: "Bring it on — I'll out-execute", tags: [], comp: "extreme" },
        { label: "Prefer a real shot at standing out", tags: [], comp: "medium" },
        { label: "Want the emptiest lane possible", tags: [], comp: "low" },
      ]},
  ];

  var COMP_ORDER = { low: 0, medium: 1, high: 2, extreme: 3 };

  var answers = {};
  var qWrap = document.getElementById("quiz-questions");
  var submit = document.getElementById("quiz-submit");
  var results = document.getElementById("quiz-results");
  if (!qWrap) return;

  var EMPTY = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">◉</span>' +
    "<strong>Nothing brewing yet.</strong>Your top-3 niches land here once you answer all 6 questions.</div>";

  QUESTIONS.forEach(function (q, qi) {
    var fs = document.createElement("fieldset");
    fs.className = "quiz-q";
    var lg = document.createElement("legend");
    lg.textContent = (qi + 1) + ". " + q.text;
    fs.appendChild(lg);
    var opts = document.createElement("div");
    opts.className = "quiz-opts";
    q.options.forEach(function (opt, oi) {
      var label = document.createElement("label");
      label.className = "quiz-opt";
      var radio = document.createElement("input");
      radio.type = "radio"; radio.name = q.id; radio.value = oi;
      radio.addEventListener("change", function () {
        answers[q.id] = opt;
        label.parentElement.querySelectorAll(".quiz-opt").forEach(function (l) { l.classList.remove("selected"); });
        label.classList.add("selected");
        submit.disabled = Object.keys(answers).length < QUESTIONS.length;
      });
      var span = document.createElement("span");
      span.textContent = opt.label;
      label.appendChild(radio); label.appendChild(span);
      opts.appendChild(label);
    });
    fs.appendChild(opts);
    qWrap.appendChild(fs);
  });

  function score(niche) {
    var s = 0, reasons = [];
    var tagHits = {};
    Object.keys(answers).forEach(function (qid) {
      (answers[qid].tags || []).forEach(function (t) { tagHits[t] = (tagHits[t] || 0) + 1; });
    });
    niche.fit.forEach(function (t) {
      if (tagHits[t]) { s += tagHits[t] * 2; reasons.push("matches your interest in " + t); }
    });
    var rpmPref = answers.q3 && answers.q3.rpmPref;
    if (rpmPref === "high" && niche.rpm === "high") { s += 3; reasons.push("fits your max-money-per-view goal"); }
    if (rpmPref === "low" && (niche.rpm === "low" || niche.rpm === "low-mid")) { s += 3; reasons.push("fits your max-audience goal"); }
    if (rpmPref === "mid" && (niche.rpm === "mid" || niche.rpm === "mid-high")) { s += 2; reasons.push("balanced money/audience fit"); }
    var compPref = answers.q6 && answers.q6.comp;
    if (compPref) {
      var diff = COMP_ORDER[niche.competition] - COMP_ORDER[compPref];
      if (diff <= 0) { s += 2; reasons.push("competition level you're comfortable with"); }
      else { s -= diff; reasons.push("note: more competitive than you wanted — needs a sharper angle"); }
    }
    return { score: s, reasons: reasons };
  }

  submit.addEventListener("click", function () {
    var ranked = NICHES.map(function (n) {
      var r = score(n);
      return { niche: n, score: r.score, reasons: r.reasons };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    var html = "<h2>Your top 3 niches</h2>";
    ranked.forEach(function (r, i) {
      html += '<div class="result-card"><h3>#' + (i + 1) + " — " + r.niche.name + "</h3>" +
        "<p>" + r.niche.desc + "</p><p><strong>Why it fits:</strong> " + r.niche.why + "</p>" +
        "<p><strong>RPM:</strong> " + r.niche.rpm + " · <strong>Competition:</strong> " + r.niche.competition + "</p>" +
        (r.reasons.length ? "<p class='muted'>Matched: " + r.reasons.join("; ") + ".</p>" : "") + "</div>";
    });
    html += "<p class='muted'>Next step: run the <strong>niche-validation</strong> skill (Phase 0) before you commit — a quiz is a starting point, not a decision.</p>";
    results.innerHTML = html;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("quiz-reset").addEventListener("click", function () {
    answers = {};
    qWrap.querySelectorAll("input[type=radio]").forEach(function (r) { r.checked = false; });
    qWrap.querySelectorAll(".quiz-opt").forEach(function (l) { l.classList.remove("selected"); });
    results.innerHTML = EMPTY;
    submit.disabled = true;
  });
})();
