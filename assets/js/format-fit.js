/* Format Fit Finder, the breakout-format assessment (tool 20).
   UMD: browser window.FormatFit + node module.exports.
   What it does: scores the creator's real situation (experience, weekly
   hours, on-camera comfort, budget, monetization goal, risk tolerance)
   against the 10 breakout-format dossiers (data/niches.json v2.1.0
   breakout_format_dossiers) and returns a ranked fit list with honest
   reasoning per match: why it fits, the catch, the pay reality (ranges,
   never promises), and the first 3 moves.
   FORMATS mirrors the dossier data (id, name, dossier_no order, pay and
   competition labels); tests/format-fit.test.js pins them in sync, because
   the dossiers are the source of truth and this table is a read model.
   Rate-card context comes from data/calculators.json
   (sponsorship_rule_of_thumb / integrated_vs_ad_rpm, air.io Oct 2026).
   It NEVER promises revenue, every pay figure is a creator-reported
   range, and the engine says so in every output. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FormatFit = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* --- Inputs --- */
  var EXPERIENCE = ["teacher", "tech", "finance", "legal", "health",
                    "audio", "writer", "operator", "none-yet"];
  var EXP_LABELS = {
    "teacher": "Teaching / coaching",
    "tech": "Tech / AI / software",
    "finance": "Money / investing experience",
    "legal": "Legal / tax / compliance work",
    "health": "Health / medical / caregiving",
    "audio": "Audio / music production",
    "writer": "Writing / storytelling",
    "operator": "Operations / automation nerd",
    "none-yet": "No experience yet, starting from zero"
  };
  var CAMERA = ["face", "voice", "hands", "anything"];
  var CAMERA_LABELS = {
    "face": "Love being on camera",
    "voice": "Voiceover fine, camera no",
    "hands": "Show my work/hands, not my face",
    "anything": "I'll do whatever the format needs"
  };
  var BUDGET = ["free", "modest", "real"];
  var BUDGET_LABELS = {
    "free": "Near $0, free tools only",
    "modest": "Modest, a few hundred for gear/tools",
    "real": "Real, $500+/mo for production"
  };
  var GOALS = ["fast", "mid", "slow"];
  var GOAL_LABELS = {
    "fast": "Revenue in under 6 months",
    "mid": "Sustainable in 6–18 months",
    "slow": "The long game, 18+ months"
  };
  var RISKS = ["safe", "balanced", "bold"];
  var RISK_LABELS = {
    "safe": "Play it safe",
    "balanced": "Balanced",
    "bold": "High risk, high reward"
  };

  /* Rate-card context (data/calculators.json, sponsorship_rule_of_thumb /
     integrated_vs_ad_rpm, air.io Oct 2026): the one honest anchor the pay
     reality lines stand on. */
  var RATE_CONTEXT =
    "Rate-card context: an integrated YouTube sponsor slot pays $20–$35 per 1,000 " +
    "views vs ~$2.30 median ad RPM (9–15x), sponsorships dwarf platform payouts " +
    "(air.io, Oct 2026). So niche advertiser density matters as much as any CPM " +
    "figure. All pay figures below are creator-reported ranges, never promises.";

  /* Camera requirement per format, as a minimum comfort tier:
     face > voice > screen > none. Derived from each dossier's
     entry_requirements field (Oct-11-2026 dossiers). */
  var CAM = { face: 3, voice: 2, screen: 1, none: 0 };

  /* The 10 breakout formats. Field order mirrors the dossiers:
     id, name, dossier_no first, tests/format-fit.test.js parses them. */
  var FORMATS = [
    { id: "betrayal-revenge-minidramas", name: "Betrayal & Revenge Mini-Dramas",
      dossier_no: "01",
      payLabel: "$20–25 CPM creator-reported (OutlierKit), ranges, never promises",
      payTier: "high",
      compLabel: "Low (OutlierKit)", competition: "low",
      expTags: ["writer"],
      expNote: "scripted-drama production: cliffhanger scripts, recurring cast, directing, clean dialogue audio",
      camera: "face",
      minHours: 15,
      budget: "real",
      timeToMoney: "mid", risk: "high",
      catch: "Supply glut: 1 in 77 Douyin AI dramas recouped its investment in H1 2026 (The Paper/DataEye); " +
             "mass-produced AI video is excluded by the Jan-2026 inauthentic enforcement; the Feb-2027 10M/90d Shorts revenue floor applies.",
      first3: [
        "Write 3 complete 60–90-second scripts with real cliffhangers before filming anything, the script is the product, not the camera.",
        "Cast from your circle: one reliable face per character, and film all dialogue in one quiet room, clean audio decides whether episode 2 gets watched.",
        "Publish as a Shorts Series with numbered episodes; keep every frame original, volume-farmed AI versions were demonetized in Jan 2026."
      ] },
    { id: "english-learning-podcasts", name: "English-Learning Podcasts",
      dossier_no: "02",
      payLabel: "$18–22 CPM (OutlierKit); $11.88 RPM (UTubeKit, Jul 2026), creator-reported ranges",
      payTier: "high",
      compLabel: "Low (OutlierKit)", competition: "low",
      expTags: ["teacher"],
      expNote: "teaching ability, clear warm audio, consistent schedule; a lesson plan per episode",
      camera: "voice",
      minHours: 6,
      budget: "free",
      timeToMoney: "mid", risk: "low",
      catch: "Language-education advertisers are a specific buyer set; the key figures are single-source, " +
             "find a second source before spending real money on production.",
      first3: [
        "Pick ONE learner level (e.g. B1 intermediate) and write a 10-episode lesson plan before episode 1, structure is the moat.",
        "Record in video-podcast format for YouTube discovery; warm, clear audio is the classroom, bad audio ends this format.",
        "End every episode with one listener assignment; consistency across months is what compounds here."
      ] },
    { id: "senior-health", name: "Senior Health",
      dossier_no: "03",
      payLabel: "No reported range in the Oct 2026 research; lifestyle mid-tier proxy ~$4–10 RPM (directional only)",
      payTier: "unknown",
      compLabel: "Ultra-low (OutlierKit)", competition: "very-low",
      expTags: ["health"],
      expNote: "correct, clearly explained, sourced health information; warm patient delivery; large-type visuals, education only, never diagnoses",
      camera: "voice",
      minHours: 5,
      budget: "free",
      timeToMoney: "slow", risk: "medium",
      catch: "Bright red line: health education is fine, medical-advice claims get flagged (TikTok removes; AI health personas are unmonetizable). " +
             "No creator-reported pay range exists, do not model revenue until one does.",
      first3: [
        "Pick one lane you can source correctly (e.g. medication organization, fall prevention), education only, never diagnoses or treatment recommendations.",
        "Script every video from a cited source and keep the links in the description; accuracy is the brand.",
        "Large type, warm patient delivery, slow pace, accessibility is the format."
      ] },
    { id: "sleep-ambient", name: "Sleep & Ambient",
      dossier_no: "04",
      payLabel: "Mid-tier via lifestyle proxy ~$4–10 RPM (directional); long, loyal watching suits retention-based monetization",
      payTier: "mid",
      compLabel: "Low (OutlierKit)", competition: "low",
      expTags: ["audio"],
      expNote: "audio production quality, the sound IS the product; hours-long session design; a field recorder or DAW + a quiet room",
      camera: "none",
      minHours: 8,
      budget: "modest",
      timeToMoney: "slow", risk: "medium",
      catch: "The Jan-2026 enforcement hit low-effort faceless channels hardest: original audio and real production are required, " +
             "'faceless works only with visible human creativity'. The catalog compounds, but slowly.",
      first3: [
        "Get a field recorder or a treated-room DAW setup, the sound IS the product, and phone mics do not survive this format.",
        "Design one 3-hour session architecture (intro → deep → fade), not random loops; consistency of craft is the product line.",
        "Upload on a rigid schedule with original audio only, low-effort re-uploads are exactly what Jan-2026 enforcement removed."
      ] },
    { id: "ai-tools-tutorials", name: "AI Tools & Tutorials",
      dossier_no: "05",
      payLabel: "$8–20 CPM (OutlierKit, Sep); $15–22 CPM breakout high-water mark (OutlierKit), ranges, never promises",
      payTier: "high",
      compLabel: "Rising fast, specificity wins", competition: "rising",
      expTags: ["tech"],
      expNote: "technical fluency, fast iteration as tools change; on-screen teaching in your own voice; screen recording + microphone",
      camera: "screen",
      minHours: 6,
      budget: "free",
      timeToMoney: "mid", risk: "medium",
      catch: "Tool half-lives decay the catalog, yesterday's tutorial is today's archive; disclosure rules tighten " +
             "(May-2026 auto-labeling; TikTok's Oct 2026 AI-transparency push labeled 3B+ videos). Competition is rising fast.",
      first3: [
        "Pick ONE tool you use weekly and master it past the tutorial layer, shallow demos are the part of the lane being eaten.",
        "Teach in your own voice with your own screen recordings, the inauthentic policy lets tutorials grow while excluding mass-produced AI video.",
        "Niche the angle: 'AI for one profession or workflow' beats generic AI tips as the lane gets crowded."
      ] },
    { id: "no-code-automation", name: "No-Code & Automation",
      dossier_no: "06",
      payLabel: "$10–25 CPM (OutlierKit, Sep), creator-reported ranges; business/operator-audience advertisers pay for this buyer set",
      payTier: "high",
      compLabel: "Low-to-underserved ('most underserved', single-source)", competition: "very-low",
      expTags: ["operator", "tech"],
      expNote: "real automations built and documented, proof-of-work; screen recorder + actual workflows; niche B2B explainer angle",
      camera: "screen",
      minHours: 8,
      budget: "modest",
      timeToMoney: "mid", risk: "medium",
      catch: "Single-source weight on the core 'most underserved' claim, verify with a second source; and your channel inherits " +
             "every pricing/feature change of the tools it depends on.",
      first3: [
        "Build 3 real automations for your own work first, proof-of-work is the entry ticket, not a talking head about automation.",
        "Document the build, not just the result: show the messy middle, the errors, the fixes, that's what operators subscribe for.",
        "Angle every video on hours saved: business buyers pay for their operators' time back."
      ] },
    { id: "genz-personal-finance", name: "Gen Z Personal Finance",
      dossier_no: "07",
      payLabel: "$18–45 CPM (OutlierKit); finance/business $8–35 RPM vs gaming/entertainment $1–5, creator-reported ranges",
      payTier: "high",
      compLabel: "High, the dossier's central tension", competition: "high",
      expTags: ["finance"],
      expNote: "real financial literacy, research depth; educational content NOT financial advice, disclaimer on page, in video, and in your head",
      camera: "voice",
      minHours: 10,
      budget: "free",
      timeToMoney: "slow", risk: "high",
      catch: "The dossier's central tension: best pay plus the highest measured breakout rate (16.7%), in the most contested lane. " +
             "And advertiser CPMs are not channel medians. AIR: the top 10% take 58% of ad revenue within the same niches.",
      first3: [
        "Build real money literacy first: one wrong claim kills the channel, the disclaimer lives on the page, in the video, and in your head.",
        "Pick the sub-lane (budgeting, first-job investing, credit), the lane is contested; the niche inside it is winnable.",
        "Make research depth the moat: sources on screen, numbers checked twice, every claim dated."
      ] },
    { id: "cybersecurity-privacy", name: "Cybersecurity & Privacy",
      dossier_no: "08",
      payLabel: "$12–28 CPM (OutlierKit, Sep); security-vendor / B2B-software buyer set, creator-reported ranges",
      payTier: "high",
      compLabel: "Thin (single-source)", competition: "low",
      expTags: ["tech"],
      expNote: "real technical knowledge, credibility niche; demo-based content (show the attack, show the fix); a lab environment (VM), screen recorder",
      camera: "screen",
      minHours: 8,
      budget: "modest",
      timeToMoney: "mid", risk: "medium",
      catch: "Single-source weight on the competition and pay figures; the advertiser base is concentrated (security vendors, B2B software); " +
             "and the wrongness stakes are high, a wrong tutorial here can get someone hacked.",
      first3: [
        "Set up a lab VM, never demo attacks on live systems or anyone else's infrastructure.",
        "Show the attack, then the fix: demo-based content is the format, not theory lectures.",
        "Treat accuracy as load-bearing: corrections ship in the next video, same day."
      ] },
    { id: "legal-tax-education", name: "Legal & Tax Education",
      dossier_no: "09",
      payLabel: "$15–40 CPM (Famety, Sep); legal $10–35 CPM (upGrowth, Sep), creator-reported ranges",
      payTier: "high",
      compLabel: "Low, the credential is the moat", competition: "low",
      expTags: ["legal"],
      expNote: "real legal/tax knowledge; explainer-driven content (new rules, common filing errors, deadline calendars); cite the actual statute or form",
      camera: "voice",
      minHours: 8,
      budget: "free",
      timeToMoney: "slow", risk: "medium",
      catch: "Educational content is NOT legal or tax advice, the disclaimer is load-bearing, not decoration; and laws change by " +
             "jurisdiction and year, so the catalog needs constant maintenance.",
      first3: [
        "Stay inside your lane of real knowledge, paralegals explain procedure, not strategy; the credential is the moat.",
        "Cite the actual statute or form in every video, the citation IS the content's moat.",
        "Build the evergreen library: deadline calendars and common filing errors; date every claim, because laws change."
      ] },
    { id: "story-narration-audio-dramas", name: "Story Narration & Audio Dramas",
      dossier_no: "10",
      payLabel: "$12.82 RPM creator-reported (UTubeKit, Jul 2026), a single reported range with a wide error bar; varies by geography and watch time",
      payTier: "high",
      compLabel: "Medium; enforcement is the real gate", competition: "medium",
      expTags: ["writer", "audio"],
      expNote: "narration voice, original scripts or licensed/public-domain material, real audio production; microphone + DAW + patience for 40-minute episodes",
      camera: "voice",
      minHours: 10,
      budget: "modest",
      timeToMoney: "slow", risk: "medium",
      catch: "Rights are the gate: copyrighted narration without transformation is reused content (Jan-2026 wave precedent); " +
             "templated top-5s and article readings are explicitly reused. And one 40-minute episode a week is the real entry bar.",
      first3: [
        "Start with public-domain or licensed material, copyrighted narration without transformation is reused content.",
        "Microphone + DAW + a treated room: the voice is the entire product, so the recording chain is the investment.",
        "One patient 40-minute episode per week beats five rushed ones, patience is the entry bar, not the ceiling."
      ] }
  ];

  var DISCLAIMER =
    "This is a matching tool, not a prediction: it scores your stated situation against the 10 breakout-format dossiers " +
    "(Oct-11-2026 research). Pay figures are creator-reported ranges, they describe what some creators reported, not what you will earn. " +
    "Fit never guarantees views, revenue, or growth. A planning aid, not financial, legal, or tax advice.";

  var HOUR_ESTIMATE_NOTE =
    "Weekly-hour estimates per format are starting estimates derived from the Cadence Coach per-piece defaults (film+edit+publish), not benchmarks.";

  function clampNum(v, lo, hi, fallback) {
    var n = parseFloat(v);
    if (isNaN(n) || !isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  function validInput(o) {
    var errors = [];
    o = o || {};
    if (EXPERIENCE.indexOf(o.experience) === -1) errors.push("Experience must be one of: " + EXPERIENCE.join(", ") + ".");
    var h = parseFloat(o.weeklyHours);
    if (isNaN(h) || h < 1 || h > 80) errors.push("Weekly hours must be between 1 and 80.");
    if (CAMERA.indexOf(o.camera) === -1) errors.push("Camera comfort must be one of: " + CAMERA.join(", ") + ".");
    if (BUDGET.indexOf(o.budget) === -1) errors.push("Budget must be one of: " + BUDGET.join(", ") + ".");
    if (GOALS.indexOf(o.goal) === -1) errors.push("Goal must be one of: " + GOALS.join(", ") + ".");
    if (RISKS.indexOf(o.risk) === -1) errors.push("Risk tolerance must be one of: " + RISKS.join(", ") + ".");
    return { ok: errors.length === 0, errors: errors };
  }

  function norm(o) {
    o = o || {};
    return {
      experience: o.experience,
      weeklyHours: clampNum(o.weeklyHours, 1, 80, 5),
      camera: o.camera,
      budget: o.budget,
      goal: o.goal,
      risk: o.risk
    };
  }

  /* --- Axis scorers. Each returns {points, why[], flags[]}. --- */

  function scoreExperience(fmt, n) {
    var tags = fmt.expTags, out = { points: 0, why: [], flags: [] };
    if (n.experience === "none-yet") {
      out.points = 0;
      out.why.push("You are starting from zero, the entry bar (" + fmt.expNote + ") is learnable, but plan a tuition phase first.");
      return out;
    }
    if (tags.indexOf(n.experience) !== -1) {
      out.points = 3;
      out.why.push("Your " + EXP_LABELS[n.experience].toLowerCase() + " background is the dossier's entry ticket (" + fmt.expNote + ").");
    } else {
      out.points = 0;
      out.flags.push("experience gap: the dossier suits " + fmt.expNote + ", your " +
        EXP_LABELS[n.experience].toLowerCase() + " background doesn't transfer directly.");
    }
    return out;
  }

  function scoreCamera(fmt, n) {
    var out = { points: 0, why: [], flags: [] };
    var need = CAM[fmt.camera];
    var have = { face: 3, voice: 2, hands: 1, anything: 3 }[n.camera];
    var needWord = { face: "on-camera presence", voice: "your voice", screen: "screen recording", none: "no camera at all" }[fmt.camera];
    if (have >= need) {
      out.points = 2;
      if (n.camera === "anything" || n.camera === "face")
        out.why.push("You will do whatever the format needs, its entry bar is " + needWord + ".");
      else if (n.camera === "voice")
        out.why.push("Voiceover comfort fits: the format's entry bar is " + needWord + ", not face time.");
      else
        out.why.push("Hands/work-only fits: the format needs " + needWord + ", your face stays out of it.");
    } else if (have + 1 >= need) {
      out.points = 1;
      out.why.push("Close on camera fit: the format needs " + needWord + ", mostly workable for you, with some adjustment.");
    } else {
      out.points = -2;
      out.flags.push("camera clash: this format needs on-camera presence (" + fmt.expNote +
        ") but you want your face out of it, this is a hard mismatch, not a preference.");
    }
    return out;
  }

  function scoreHours(fmt, n) {
    var out = { points: 0, why: [], flags: [] };
    var h = n.weeklyHours, need = fmt.minHours;
    if (h >= need * 1.5) {
      out.points = 2;
      out.why.push("Your " + h + " hrs/week covers the ~" + need + " hrs/week it needs, with slack for bad weeks.");
    } else if (h >= need) {
      out.points = 1;
      out.why.push("Your " + h + " hrs/week meets the ~" + need + " hrs/week estimate, tight, no slack.");
    } else if (h >= need * 0.6) {
      out.points = 0;
      out.flags.push("hours shortfall: ~" + need + " hrs/week is the starting estimate, you have " + h +
        ", the format still works, but only at half pace (see first moves).");
    } else {
      out.points = -2;
      out.flags.push("hours mismatch: needs ~" + need + " hrs/week, you have " + h +
        ", below the honest minimum. This format cannot run on your hours.");
    }
    return out;
  }

  function scoreBudget(fmt, n) {
    var out = { points: 0, why: [], flags: [] };
    var lvl = { free: 0, modest: 1, real: 2 };
    var need = lvl[fmt.budget], have = lvl[n.budget];
    var needWord = { free: "free tools", modest: "a modest spend (gear/tools)", real: "real production spend ($500+/mo)" }[fmt.budget];
    if (have >= need) {
      out.points = 2;
      if (fmt.budget === "free") out.why.push("It runs on free tools, your budget is not the constraint.");
      else out.why.push("Your budget covers what it needs (" + needWord + ").");
    } else if (have + 1 >= need) {
      out.points = 0;
      out.flags.push("budget squeeze: it wants " + needWord + ", your budget is " +
        BUDGET_LABELS[n.budget].toLowerCase() + ", bridgeable, but the first moves may need to wait.");
    } else {
      out.points = -1;
      out.flags.push("budget gap: it needs " + needWord + ", you have near $0, either wait or pick a format that runs free.");
    }
    return out;
  }

  function scoreGoal(fmt, n) {
    var out = { points: 0, why: [], flags: [] };
    var g = n.goal, t = fmt.timeToMoney;
    var tWord = { fast: "can pay inside 6 months", mid: "typically takes 6–18 months to sustain", slow: "is a 18+ month catalog game" }[t];
    if (g === "fast") {
      if (t === "fast") { out.points = 2; out.why.push("Your timeline matches: it " + tWord + "."); }
      else if (t === "mid") { out.points = 1; out.why.push("Your timeline is aggressive but plausible: it " + tWord + "."); }
      else { out.points = -1; out.flags.push("timeline mismatch: you want revenue in under 6 months, but it " + tWord + "."); }
    } else if (g === "mid") {
      if (t === "mid") { out.points = 2; out.why.push("Your timeline matches: it " + tWord + "."); }
      else if (t === "fast") { out.points = 1; out.why.push("Faster than your window, upside, not a problem."); }
      else { out.points = 1; out.why.push("Slower than your window, but your window has room, the catalog game compounds."); }
    } else {
      out.points = 2;
      out.why.push("Long-game horizon fits: it " + tWord + ", which is exactly how you said you want to play it.");
    }
    return out;
  }

  function scoreRisk(fmt, n) {
    var out = { points: 0, why: [], flags: [] };
    var r = n.risk, f = fmt.risk;
    var fWord = { low: "low-risk", medium: "medium-risk", high: "high-risk" }[f];
    if (r === "safe") {
      if (f === "low") { out.points = 2; out.why.push("Low-risk format, fits how you want to play it."); }
      else if (f === "medium") { out.points = 1; out.why.push("Medium risk, inside your comfort zone."); }
      else { out.points = -1; out.flags.push("risk mismatch: you want to play it safe, but this is a high-risk lane (" + fmt.catch.split(";")[0] + ")."); }
    } else if (r === "balanced") {
      if (f === "medium") { out.points = 2; out.why.push("Medium risk, the middle of your stated range."); }
      else if (f === "low") { out.points = 1; out.why.push("Low risk, safer than your stated range, fine."); }
      else { out.points = 1; out.why.push("High risk, the bold end of your stated range."); }
    } else {
      if (f === "high") { out.points = 2; out.why.push("High risk, exactly the swing you said you want."); }
      else if (f === "medium") { out.points = 1; out.why.push("Medium risk, tamer than your stated appetite."); }
      else { out.points = 0; out.why.push("Low risk, safer than your appetite; the upside ceiling is lower too."); }
    }
    return out;
  }

  /* Score ceiling: 3 + 2 + 2 + 2 + 2 + 2 = 13. */
  function scoreFormat(fmt, n) {
    var parts = [
      scoreExperience(fmt, n), scoreCamera(fmt, n), scoreHours(fmt, n),
      scoreBudget(fmt, n), scoreGoal(fmt, n), scoreRisk(fmt, n)
    ];
    var total = 0, why = [], flags = [];
    parts.forEach(function (p) {
      total += p.points;
      p.why.forEach(function (w) { why.push(w); });
      p.flags.forEach(function (f) { flags.push(f); });
    });
    return { format: fmt, score: total, why: why, flags: flags };
  }

  function bandFor(score) {
    if (score >= 9) return "strong";
    if (score >= 6) return "workable";
    return "weak";
  }

  function recommend(raw) {
    var v = validInput(raw);
    if (!v.ok) return { ok: false, errors: v.errors };
    var n = norm(raw);

    var ranked = FORMATS.map(function (f) { return scoreFormat(f, n); });
    ranked.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return parseInt(a.format.dossier_no, 10) - parseInt(b.format.dossier_no, 10);
    });

    /* Global honesty flags, the anti-theater layer. */
    var globalFlags = [];
    if (n.experience === "none-yet") {
      globalFlags.push("You are starting from zero experience: every format below assumes a tuition phase, " +
        "expect 3–6 months of craft-building before any of them behaves like its dossier. The Niche Picker quiz pairs well with this tool.");
    }
    if (n.weeklyHours < 3) {
      globalFlags.push("Under 3 hrs/week is below the honest minimum for every breakout format, the lowest estimate on the list is ~5. " +
        "That is not a judgment; it is capacity. Raise the hours, or treat this as a planning exercise for later.");
    }
    if (n.goal === "fast" && n.risk === "safe") {
      globalFlags.push("Fast money plus play-it-safe is the tightest corner on the board: the fast lanes are high-risk and the safe lanes are slow. " +
        "One of the two has to bend.");
    }

    var top = ranked[0];
    var verdict = bandFor(top.score) === "strong" ? "strong"
      : bandFor(top.score) === "workable" ? "workable" : "no-fit";

    /* Every ranked entry: the full honest record for the UI + agents. */
    var matches = ranked.map(function (r) {
      return {
        id: r.format.id,
        dossier_no: r.format.dossier_no,
        name: r.format.name,
        score: r.score,
        band: bandFor(r.score),
        why: r.why,
        catch: r.format.catch,
        pay: r.format.payLabel,
        payTier: r.format.payTier,
        competition: r.format.compLabel,
        flags: r.flags,
        first3: r.format.first3,
        timeToMoney: r.format.timeToMoney,
        risk: r.format.risk,
        minHours: r.format.minHours
      };
    });

    return {
      ok: true,
      inputs: n,
      verdict: verdict,
      top: matches[0],
      matches: matches,
      globalFlags: globalFlags,
      rateContext: RATE_CONTEXT,
      hourEstimateNote: HOUR_ESTIMATE_NOTE,
      disclaimer: DISCLAIMER
    };
  }

  return {
    EXPERIENCE: EXPERIENCE,
    EXP_LABELS: EXP_LABELS,
    CAMERA: CAMERA,
    CAMERA_LABELS: CAMERA_LABELS,
    BUDGET: BUDGET,
    BUDGET_LABELS: BUDGET_LABELS,
    GOALS: GOALS,
    GOAL_LABELS: GOAL_LABELS,
    RISKS: RISKS,
    RISK_LABELS: RISK_LABELS,
    FORMATS: FORMATS,
    RATE_CONTEXT: RATE_CONTEXT,
    HOUR_ESTIMATE_NOTE: HOUR_ESTIMATE_NOTE,
    DISCLAIMER: DISCLAIMER,
    validInput: validInput,
    norm: norm,
    scoreFormat: scoreFormat,
    bandFor: bandFor,
    recommend: recommend
  };
}));
