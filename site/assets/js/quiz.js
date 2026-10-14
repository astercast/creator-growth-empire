/* Niche Picker: 6-question fit quiz + (wave 20) the "Pick my 2027 niche" branch.
   The 2027 branch scores niches against the Niche Atlas 2.0 outlook layer
   (trajectory badges, growth signals, stream-fit fit) instead of generic fit.
   OUTLOOK_2027 mirrors data/niches.json outlook_2027 trajectories,
   tests/niche-atlas.test.js checks they stay in sync. */
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
      desc: "History, science, economics, 'how things work', curiosity as a product.",
      why: "Evergreen by nature. One great explainer earns for years. Lower ceiling per video than finance, but the catalog compounds beautifully.",
      fit: ["teaching", "research", "story"] },
    { id: "fitness", name: "Fitness & Health", rpm: "mid", competition: "high",
      desc: "Training, nutrition, transformation journeys, sport science.",
      why: "Massive, evergreen demand and strong affiliate potential (supplements, programs, gear). Transformation content is inherently bingeable.",
      fit: ["doing", "teaching", "story"] },
    { id: "gaming", name: "Gaming", rpm: "low-mid", competition: "extreme",
      desc: "Gameplay, commentary, esports, game design analysis.",
      why: "The most crowded niche on earth, but also the biggest audience. Wins come from personality + format innovation, not from playing games well.",
      fit: ["doing", "entertaining", "story"] },
    { id: "lifestyle", name: "Lifestyle & Vlogs", rpm: "mid", competition: "high",
      desc: "Day-in-the-life, routines, travel, personal growth.",
      why: "Sells parasocial connection better than any other format. Sponsors love it. But 'my life is interesting' is not a strategy, you need a lens.",
      fit: ["story", "entertaining", "doing"] },
    { id: "comedy", name: "Comedy & Sketches", rpm: "low", competition: "extreme",
      desc: "Sketches, commentary comedy, memes-as-craft.",
      why: "Lowest ad rates, hardest to sustain, but the biggest viral upside and the strongest brand-deal magnet when it hits. Only pick this if you'd do it for free.",
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

  /* Wave 20: 2027-outlook dataset, one row per atlas niche, mirroring
     data/niches.json (id, outlook_2027.trajectory, skill_fit, formats,
     competition, revenue_tier). Keep fields in this order: id, name,
     trajectory first, tests/niche-atlas.test.js parses them. */
  var OUTLOOK_2027 = [
    { id: "ai-tools", trajectory: "heating", name: "AI Tools & Automation", skill_fit: ["teaching", "research"], formats: ["long-form", "shorts"], competition: "medium", revenue_tier: "high", breakout: true, search: true, growth: true, revenueLabel: "CPM $8–20", basis: "AI tutorials measured 18x growth at $15–22 CPM; search demand +340%." },
    { id: "no-code-automation", trajectory: "heating", name: "No-Code & Automation Workflows", skill_fit: ["teaching", "research"], formats: ["long-form", "shorts"], competition: "low", revenue_tier: "high", breakout: false, search: true, growth: false, revenueLabel: "CPM $10–25 (single-source)", basis: "+220% search growth, 'most underserved' label." },
    { id: "gen-z-finance", trajectory: "stable", name: "Gen Z Personal Finance", skill_fit: ["teaching", "research"], formats: ["long-form", "shorts"], competition: "high", revenue_tier: "high", breakout: true, search: true, growth: false, revenueLabel: "RPM $8–35", basis: "Highest breakout rate (16.7%), but high competition." },
    { id: "cybersecurity", trajectory: "heating", name: "Cybersecurity & Privacy", skill_fit: ["teaching", "research"], formats: ["long-form", "shorts"], competition: "low", revenue_tier: "high", breakout: false, search: true, growth: false, revenueLabel: "CPM $12–28 (single-source)", basis: "+160% search at thin competition." },
    { id: "betrayal-dramas", trajectory: "heating", name: "Betrayal & Revenge Mini-Dramas", skill_fit: ["personality", "voice"], formats: ["shorts", "tiktok"], competition: "low", revenue_tier: "high", breakout: true, search: false, growth: false, revenueLabel: "CPM $20–25", basis: "21x breakout; YouTube's 2027 micro-drama push points the same way." },
    { id: "english-learning", trajectory: "heating", name: "English Learning Podcasts", skill_fit: ["teaching", "voice"], formats: ["long-form"], competition: "low", revenue_tier: "high", breakout: true, search: false, growth: false, revenueLabel: "CPM $18–22", basis: "21x breakout at premium ad rates." },
    { id: "senior-health", trajectory: "heating", name: "Senior Health & Digital Literacy", skill_fit: ["teaching", "personality"], formats: ["long-form"], competition: "very-low", revenue_tier: "unknown", breakout: true, search: false, growth: false, revenueLabel: "no reported range", basis: "19x breakout, ultra-low competition." },
    { id: "sleep-ambient", trajectory: "stable", name: "Sleep & Ambient Channels", skill_fit: ["voice", "hands-on"], formats: ["long-form"], competition: "low", revenue_tier: "mid", breakout: true, search: false, growth: false, revenueLabel: "RPM $4–10 (proxy)", basis: "14x breakout, but only original-production channels survive the Jan-2026 enforcement." },
    { id: "asmr", trajectory: "stable", name: "ASMR", skill_fit: ["voice", "hands-on"], formats: ["long-form"], competition: "medium", revenue_tier: "mid", breakout: false, search: false, growth: true, revenueLabel: "RPM $4–10 (proxy)", basis: "Second-fastest channel growth (1.56%/mo); steady, not surging." },
    { id: "creator-economy", trajectory: "cooling", name: "Creator Economy", skill_fit: ["research", "personality"], formats: ["long-form"], competition: "high", revenue_tier: "unknown", breakout: false, search: true, growth: true, revenueLabel: "no reported range", basis: "Window narrowing, sponsorships do the work here, not ads." },
    { id: "challenges-stunts", trajectory: "stable", name: "Challenges & Stunts", skill_fit: ["personality", "hands-on"], formats: ["long-form", "shorts"], competition: "high", revenue_tier: "low", breakout: false, search: false, growth: true, revenueLabel: "RPM $1–5 (proxy)", basis: "Above-average growth at entertainment rates; economics need scale." },
    { id: "true-crime", trajectory: "stable", name: "True Crime", skill_fit: ["research", "voice", "personality"], formats: ["long-form"], competition: "high", revenue_tier: "low", breakout: true, search: false, growth: true, revenueLabel: "RPM $1–5 (proxy)", basis: "12.5% breakout rate; high competition, research-heavy." },
    { id: "education", trajectory: "heating", name: "Education & Explainers", skill_fit: ["teaching", "research"], formats: ["long-form", "shorts"], competition: "medium", revenue_tier: "high", breakout: false, search: false, growth: true, revenueLabel: "RPM $10.22 (measured)", basis: "Highest measured median RPM; interest-based feeds favor intent niches." },
    { id: "entertainment-comedy", trajectory: "cooling", name: "Entertainment & Comedy", skill_fit: ["personality"], formats: ["long-form", "shorts", "tiktok"], competition: "high", revenue_tier: "low", breakout: false, search: false, growth: true, revenueLabel: "RPM $2.43 (measured)", basis: "Lowest rates at very high competition; shorts-first faces the Feb-2027 floor." },
    { id: "science", trajectory: "heating", name: "Science Explainers", skill_fit: ["research", "teaching"], formats: ["long-form", "shorts"], competition: "medium", revenue_tier: "high", breakout: false, search: false, growth: true, revenueLabel: "RPM $10.22 (measured)", basis: "Education-tier rates with a real accuracy moat." },
    { id: "gaming", trajectory: "cooling", name: "Gaming", skill_fit: ["personality", "hands-on"], formats: ["long-form", "shorts", "live"], competition: "high", revenue_tier: "low", breakout: false, search: false, growth: true, revenueLabel: "RPM $2.05 (measured)", basis: "Most crowded niche; sponsor CPMs only at real scale." },
    { id: "kids", trajectory: "cooling", name: "Kids Content", skill_fit: ["personality", "hands-on"], formats: ["long-form", "shorts"], competition: "high", revenue_tier: "low", breakout: false, search: false, growth: true, revenueLabel: "RPM $0.33 (measured)", basis: "Fastest growth (1.59%/mo), worst pay, the growth-vs-revenue trap." },
    { id: "cooking", trajectory: "heating", name: "Cooking & Food", skill_fit: ["hands-on", "personality"], formats: ["long-form", "shorts", "tiktok"], competition: "medium", revenue_tier: "unknown", breakout: true, search: false, growth: false, revenueLabel: "no reported ad range", basis: "11.7% breakout; YouTube's 2027 shopping priority favors shoppable food." },
    { id: "legal-tax", trajectory: "heating", name: "Legal & Tax Education", skill_fit: ["teaching", "research"], formats: ["long-form", "shorts"], competition: "low", revenue_tier: "high", breakout: false, search: false, growth: false, revenueLabel: "CPM $15–40", basis: "Most underserved high-payer named in the research." },
    { id: "story-narration", trajectory: "stable", name: "Story Narration & Audio Dramas", skill_fit: ["voice", "personality"], formats: ["long-form"], competition: "low", revenue_tier: "high", breakout: false, search: false, growth: false, revenueLabel: "RPM $12.82 (reported)", basis: "Strong RPMs, but reuse-content enforcement demands original production." }
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
        { label: "Love it, give me the spotlight", tags: ["entertaining"] },
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
        { label: "Both, long-form anchors, shorts as trailers", tags: ["story", "teaching"], form: "both" },
      ]},
    { id: "q6", text: "How much competition can you stomach?",
      options: [
        { label: "Bring it on, I'll out-execute", tags: [], comp: "extreme" },
        { label: "Prefer a real shot at standing out", tags: [], comp: "medium" },
        { label: "Want the emptiest lane possible", tags: [], comp: "low" },
      ]},
  ];

  /* Wave 20: the "Pick my 2027 niche" branch, 4 questions scored against the
     atlas outlook layer instead of generic fit. */
  var Q2027 = [
    { id: "q271", text: "What's your 2027 bet?",
      options: [
        { label: "Ride a rising format (serialized series, video podcasts)", bet: "rising" },
        { label: "Ride rising search demand (AI, skills, tutorials)", bet: "search" },
        { label: "Own an underserved lane (the emptiest competition)", bet: "underserved" },
        { label: "Slow and evergreen (a catalog that compounds)", bet: "evergreen" },
      ]},
    { id: "q272", text: "Shorts-first, long-form, or both?",
      options: [
        { label: "Shorts-first, volume is my weapon", formats: ["shorts"] },
        { label: "Long-form, depth is my weapon", formats: ["long"] },
        { label: "Both, shorts as trailers for the catalog", formats: ["shorts", "long"] },
      ]},
    { id: "q273", text: "Which risk can you stomach?",
      options: [
        { label: "Policy risk, the Shorts monetization bar is rising", risk: "policy" },
        { label: "Competition risk, crowded lanes, I'll out-execute", risk: "comp" },
        { label: "Low pay per view, I need scale to win", risk: "lowpay" },
      ]},
    { id: "q274", text: "Your skill fit?",
      options: [
        { label: "Teaching / explaining", skills: ["teaching"] },
        { label: "Research stamina", skills: ["research"] },
        { label: "Personality / voice", skills: ["personality", "voice"] },
        { label: "Hands-on / making", skills: ["hands-on"] },
      ]},
  ];

  var COMP_ORDER = { low: 0, medium: 1, high: 2, extreme: 3 };
  var TRAJ_SCORE = { heating: 3, stable: 1, cooling: -2 };

  var mode = "fit"; // "fit" | "outlook"
  var qWrap = document.getElementById("quiz-questions");
  var submit = document.getElementById("quiz-submit");
  var results = document.getElementById("quiz-results");
  var reset = document.getElementById("quiz-reset");
  var meter = document.getElementById("quiz-meter");
  var meterLabel = document.getElementById("quiz-meter-label");
  var meterFill = document.getElementById("quiz-meter-fill");
  if (!qWrap) return;

  var EMPTY = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">◉</span>' +
    "<strong>Nothing brewing yet.</strong>Your top-3 niches land here once you answer all 6 questions.</div>";
  var EMPTY_2027 = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">◉</span>' +
    "<strong>Nothing brewing yet.</strong>Your 2027 top-3 lands here once you answer all 4 questions.</div>";

  function setMeter(done, total, labelText) {
    if (meter) { meter.setAttribute("aria-valuemax", total); meter.setAttribute("aria-valuenow", done); }
    if (meterFill) meterFill.style.width = (total ? (done / total) * 100 : 0) + "%";
    if (meterLabel) meterLabel.innerHTML = "<strong>" + done + "/" + total + "</strong> " + labelText;
  }

  function buildQuestions(questions, answers, total, doneLabel) {
    qWrap.innerHTML = "";
    questions.forEach(function (q, qi) {
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
          var done = Object.keys(answers).length;
          submit.disabled = done < questions.length;
          setMeter(done, total, doneLabel);
        });
        var span = document.createElement("span");
        span.textContent = opt.label;
        label.appendChild(radio); label.appendChild(span);
        opts.appendChild(label);
      });
      fs.appendChild(opts);
      qWrap.appendChild(fs);
    });
  }

  function score(niche, answers) {
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
      else { s -= diff; reasons.push("note: more competitive than you wanted, needs a sharper angle"); }
    }
    return { score: s, reasons: reasons };
  }

  function score2027(niche, answers) {
    var s = 0, reasons = [], notes = [];
    s += TRAJ_SCORE[niche.trajectory] || 0;
    if (niche.trajectory === "heating") reasons.push("2027 trajectory: heating, multiple signals point up");
    if (niche.trajectory === "cooling") notes.push("2027 trajectory: cooling, the measured risks outweigh the growth signals right now");
    var bet = answers.q271 && answers.q271.bet;
    if (bet === "rising" && niche.breakout) { s += 2; reasons.push("matches your rising-format bet (breakout signal)"); }
    if (bet === "search" && niche.search) { s += 2; reasons.push("matches your search-demand bet"); }
    if (bet === "underserved" && (niche.competition === "low" || niche.competition === "very-low")) {
      s += 2; reasons.push("matches your underserved-lane bet");
    }
    if (bet === "evergreen" && niche.growth) { s += 1; reasons.push("matches your evergreen bet (measured channel growth)"); }
    var fmts = answers.q272 && answers.q272.formats;
    if (fmts) {
      var shortsOnly = fmts.indexOf("shorts") !== -1 && fmts.indexOf("long") === -1;
      var longOnly = fmts.indexOf("long") !== -1 && fmts.indexOf("shorts") === -1;
      if (niche.formats.indexOf("shorts") !== -1 || niche.formats.indexOf("tiktok") !== -1) {
        if (fmts.indexOf("shorts") !== -1) { s += 1; reasons.push("fits your short-form plan"); }
      }
      if (niche.formats.indexOf("long-form") !== -1 && fmts.indexOf("long") !== -1) {
        s += 2; reasons.push("fits your long-form plan");
      }
      if (shortsOnly && niche.formats.indexOf("long-form") === -1) {
        notes.push("Shorts-first: from Feb 1, 2027, Shorts revenue sharing needs 10M qualified Shorts views per 90 days, plan a long-form catalog or a non-ads stream");
      }
      if (longOnly && niche.formats.indexOf("long-form") === -1) {
        s -= 2; notes.push("note: this niche barely exists in long-form, format mismatch");
      }
    }
    var risk = answers.q273 && answers.q273.risk;
    if (risk === "comp" && niche.competition === "high") {
      s += 1; reasons.push("you picked the crowded lane on purpose");
    } else if (risk !== "comp" && niche.competition === "high") {
      s -= 1; notes.push("note: more competitive than your risk pick, needs a sharper angle");
    }
    if (risk === "lowpay" && niche.revenue_tier === "low") {
      s += 1; reasons.push("you're built for the scale game this niche needs");
    } else if (risk !== "lowpay" && niche.revenue_tier === "low") {
      s -= 1; notes.push("note: low pay per view, you said that risk isn't yours");
    }
    var sk = answers.q274 && answers.q274.skills;
    if (sk) {
      var hits = niche.skill_fit.filter(function (f) { return sk.indexOf(f) !== -1; });
      if (hits.length) { s += hits.length * 2; reasons.push("matches your " + hits.join(" + ") + " skill fit"); }
    }
    return { score: s, reasons: reasons, notes: notes };
  }

  function renderFitResults(fitAnswers) {
    var ranked = NICHES.map(function (n) {
      var r = score(n, fitAnswers);
      return { niche: n, score: r.score, reasons: r.reasons };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    var html = "<h2>Your top 3 niches</h2>";
    ranked.forEach(function (r, i) {
      html += '<div class="result-card"><h3>#' + (i + 1) + ": " + r.niche.name + "</h3>" +
        "<p>" + r.niche.desc + "</p><p><strong>Why it fits:</strong> " + r.niche.why + "</p>" +
        "<p><strong>RPM:</strong> " + r.niche.rpm + " · <strong>Competition:</strong> " + r.niche.competition + "</p>" +
        (r.reasons.length ? "<p class='muted'>Matched: " + r.reasons.join("; ") + ".</p>" : "") + "</div>";
    });
    html += "<p class='muted'>Next step: run the <strong>niche-validation</strong> skill (Phase 0) before you commit, a quiz is a starting point, not a decision.</p>";
    results.innerHTML = html;
  }

  function render2027Results(outAnswers) {
    var ranked = OUTLOOK_2027.map(function (n) {
      var r = score2027(n, outAnswers);
      return { niche: n, score: r.score, reasons: r.reasons, notes: r.notes };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    var html = "<h2>Your 2027 top 3</h2>";
    ranked.forEach(function (r, i) {
      html += '<div class="result-card"><h3>#' + (i + 1) + ": " + r.niche.name + "</h3>" +
        '<p><strong>2027 outlook:</strong> <span class="ne-traj ne-traj-' + r.niche.trajectory + '">' +
        r.niche.trajectory + "</span>, " + r.niche.basis + "</p>" +
        "<p><strong>Reported range:</strong> " + r.niche.revenueLabel + " (creator-reported, not a promise)</p>" +
        (r.reasons.length ? "<p><strong>Why it fits:</strong> " + r.reasons.join("; ") + ".</p>" : "") +
        (r.notes.length ? "<p class='muted'>" + r.notes.join(" ") + ".</p>" : "") + "</div>";
    });
    html += "<p class='muted'>Trajectories are directional reads of October-2026 signals, not predictions. " +
      "Cross-check in the <a href=\"niche-atlas.html\">Niche Atlas</a> explorer, then run the " +
      "<strong>niche-validation</strong> skill (Phase 0) before you commit.</p>";
    results.innerHTML = html;
  }

  var fitAnswers = {};
  var outAnswers = {};

  function switchMode(next) {
    mode = next;
    fitAnswers = {}; outAnswers = {};
    submit.disabled = true;
    var fitBtn = document.getElementById("quiz-mode-fit");
    var outBtn = document.getElementById("quiz-mode-outlook");
    if (fitBtn) fitBtn.setAttribute("aria-pressed", mode === "fit" ? "true" : "false");
    if (outBtn) outBtn.setAttribute("aria-pressed", mode === "outlook" ? "true" : "false");
    if (mode === "outlook") {
      buildQuestions(Q2027, outAnswers, Q2027.length, "answered, pick your 2027 lane");
      results.innerHTML = EMPTY_2027;
      submit.textContent = "Pick my 2027 niche →";
      setMeter(0, Q2027.length, "answered, pick your 2027 lane");
    } else {
      buildQuestions(QUESTIONS, fitAnswers, QUESTIONS.length, "answered, keep going, commander");
      results.innerHTML = EMPTY;
      submit.textContent = "Get my niches →";
      setMeter(0, QUESTIONS.length, "answered, keep going, commander");
    }
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  submit.addEventListener("click", function () {
    if (mode === "outlook") {
      render2027Results(outAnswers);
    } else {
      renderFitResults(fitAnswers);
    }
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  reset.addEventListener("click", function () {
    switchMode(mode);
  });

  /* Mode toggle (wave 20): fit quiz vs 2027-outlook quiz. */
  (function mountToggle() {
    var app = document.getElementById("quiz-app");
    if (!app) return;
    var bar = document.createElement("div");
    bar.className = "quiz-mode-bar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Quiz mode");
    var b1 = document.createElement("button");
    b1.type = "button"; b1.id = "quiz-mode-fit"; b1.className = "btn btn-primary quiz-mode-btn";
    b1.setAttribute("aria-pressed", "true"); b1.textContent = "Fit quiz (6 questions)";
    b1.addEventListener("click", function () { switchMode("fit"); });
    var b2 = document.createElement("button");
    b2.type = "button"; b2.id = "quiz-mode-outlook"; b2.className = "btn btn-ghost quiz-mode-btn";
    b2.setAttribute("aria-pressed", "false"); b2.textContent = "Pick my 2027 niche (4 questions)";
    b2.addEventListener("click", function () { switchMode("outlook"); });
    bar.appendChild(b1); bar.appendChild(b2);
    app.insertBefore(bar, app.firstChild);
  })();

  buildQuestions(QUESTIONS, fitAnswers, QUESTIONS.length, "answered, keep going, commander");
})();
