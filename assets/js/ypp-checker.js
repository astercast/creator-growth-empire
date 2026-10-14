/* YPP 2027 Eligibility Checker, the monetization-gate engine (no DOM in the core).
 * UMD: works in the browser (window.YppChecker) and in node (module.exports).
 *
 * HONESTY CONTRACT: thresholds are YouTube-published / press-reported program
 * rules, labeled with sources and observation dates, never forecasts, never
 * promises. Rules change; every verdict tells the creator to verify live with
 * YouTube. This is an educational aid, not financial, legal, or tax advice,
 * and never an income promise. "Qualified" numbers (watch hours, Shorts views)
 * are YouTube's own filters, the number in Studio and the qualifying number
 * can differ.
 *
 * THRESHOLD SOURCES (as observed Oct 11, 2026):
 * - Current rules: YouTube published eligibility, restated by AIR Media-Tech
 *   (air.io/en/monetization/youtube-partner-program-requirements-2026-the-complete-guide,
 *   updated ~Oct 10, 2026) and multi-source press (ytmoneycalculator, auxmode,
 *   brightbean).
 * - 2027 rules: announced by YouTube Aug 10, 2026 (blog + Creator Insider
 *   video); reported by AIR Media-Tech, AuditSocials
 *   (auditsocials.com/blog/youtube-partner-program-2027-shorts-revenue-entry-thresholds),
 *   Tablet News (tablet-news.com), GSMDome (gsmdome.com), Eastleigh Voice,
 *   passionfru.it, multi-source, consistent.
 * - Oct-1-2026 Shorts originality update: announced by YouTube Creator Liaison
 *   Rene Ritchie via Creator Insider; reported by TechJuice (techjuice.pk),
 *   Digital Trends, ppc.land, Search Engine Journal, multi-source.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.YppChecker = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- vocab ---------- */
  var ORIGINALITY = ["original", "repurposed", "reposted"];
  var FORMAT_MIX = ["longform", "shorts", "both"];

  var ORIGINALITY_LABEL = {
    original: "Mostly original, your own footage, commentary, or storytelling",
    repurposed: "Mostly repurposed, others' clips with your edits/voiceover",
    reposted: "Mostly reposted, clips with little or no transformation"
  };
  var FORMAT_LABEL = {
    longform: "Mostly long-form",
    shorts: "Mostly Shorts",
    both: "A mix of both"
  };

  /* ---------- thresholds: each rule set carries its own sources ---------- */
  var RULES = {
    current: {
      id: "current",
      title: "Current rules, through Jan 31, 2027",
      sources: [
        "YouTube published YPP eligibility, restated by AIR Media-Tech (air.io, updated ~Oct 10, 2026)",
        "Multi-source press restatements: ytmoneycalculator, auxmode, brightbean (Sep–Oct 2026)"
      ],
      full: {
        subs: 1000,
        watchHours12mo: 4000,
        shortsViews90d: 10000000,
        note: "1,000 subs + (4,000 qualified watch hours in 12 months OR 10M qualified Shorts views in 90 days)"
      },
      fanFunding: {
        subs: 500,
        uploads90d: 3,
        watchHours12mo: 3000,
        shortsViews90d: 3000000,
        note: "500 subs + 3 uploads in 90 days + (3,000 qualified watch hours in 12 months OR 3M qualified Shorts views in 90 days)"
      },
      qualNotes: [
        "Only ONE of the watch-hours / Shorts-views paths is needed, plus the subscriber minimum.",
        "Also required: no active Community Guidelines strikes, 2-Step Verification, a linked AdSense account, residence in a YPP-eligible country, advanced-features access.",
        "The numeric bar is one gate. YouTube's qualitative review (the \"inauthentic content\" policy, Jul 2025) is the other, mass-produced or AI-generated content without meaningful transformation can fail review even when the numbers pass. Application review typically takes ~1 month."
      ]
    },
    y2027: {
      id: "y2027",
      title: "2027 rules, from Feb 1, 2027",
      sources: [
        "Announced by YouTube Aug 10, 2026 (official blog + Creator Insider video w/ Amjad Hanif)",
        "Reported consistently by AIR Media-Tech, AuditSocials, Tablet News, GSMDome, Eastleigh Voice, passionfru.it (Aug–Oct 2026)"
      ],
      full: {
        subs: 1000,
        watchHours12mo: 8000,
        shortsViews90d: 20000000,
        note: "1,000 subs + (8,000 qualified watch hours in 365 days OR 20M qualified Shorts views in 90 days). The first entry-bar change since 2018."
      },
      shortsFloor: {
        shortsViews90d: 10000000,
        note: "10M qualified Shorts views in the last 90 days, checked MONTHLY, to earn from the Shorts Creator Pool + Shorts Premium revenue. Miss it and you keep YPP + long-form earnings; Shorts pay resumes once you're back over the floor."
      },
      activity: {
        watchHours12mo: 1000,
        shortsViews90d: 1000000,
        longs90d: 2,
        shorts90d: 5,
        note: "New activity test for partners: 1,000 qualified watch hours in 365 days OR 1M qualified Shorts views in 90 days OR 2 long videos / 5 Shorts in 90 days. Miss all three and a 90-day window opens to recover (1,000 hours or 1M Shorts views) before monetization is at risk."
      },
      fanFunding: {
        subs: 500,
        uploads90d: 3,
        watchHours12mo: 3000,
        shortsViews90d: 3000000,
        note: "Fan-funding tier (memberships, Supers, Shopping, Creator Partnerships) is UNCHANGED in 2027."
      },
      qualNotes: [
        "Applications that reach YouTube by 23:59 UTC on Jan 31, 2027 are judged against the current 4,000-hour bar, even if the decision lands later (AIR partner-support team, Oct 2026).",
        "Existing partners are grandfathered on entry, no re-qualifying at the higher bar. But they must accept updated terms in YouTube Studio by Jan 31, 2027, and they face the new activity test + the monthly 10M Shorts check.",
        "A channel in the 500-sub fan-funding tier keeps fan funding, but its first ad-revenue application after Feb 1 is judged at the 8,000-hour / 20M-Shorts bar.",
        "Below the 10M Shorts floor, YouTube promises incentives instead of revenue: YouTube Shopping bonuses, brand-deal incentives, trend boosts (details pending)."
      ]
    }
  };

  /* ---------- the Oct-2026 Shorts originality warning (multi-source) ---------- */
  var ORIGINALITY_WARNING = {
    source: "Announced by YouTube Creator Liaison Rene Ritchie via Creator Insider (Oct 1, 2026); reported by TechJuice, Digital Trends, ppc.land, Search Engine Journal",
    text: "Since Oct 1, 2026, Shorts recommendations deprioritize channels that mainly re-upload others' clips without significant changes. VO narration of what's on screen, minor technical edits, or template bulk-changes don't count as original, commentary, analysis, or storytelling does. A channel can pass the numeric bar and still lose the reach (and the views) the bar needs."
  };

  /* ---------- validation ---------- */
  function validInput(a) {
    if (!a || typeof a !== "object") return false;
    return typeof a.subs === "number" && isFinite(a.subs) && a.subs >= 0 &&
           typeof a.watchHours === "number" && isFinite(a.watchHours) && a.watchHours >= 0 &&
           typeof a.shortsViews === "number" && isFinite(a.shortsViews) && a.shortsViews >= 0 &&
           typeof a.uploads90d === "number" && isFinite(a.uploads90d) && a.uploads90d >= 0 &&
           ORIGINALITY.indexOf(a.originality) !== -1 &&
           FORMAT_MIX.indexOf(a.formatMix) !== -1;
  }

  /* ---------- helpers ---------- */
  function fmt(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function gap(n) {
    return n > 0 ? n : 0;
  }

  /* ---------- verdicts ---------- */
  function fullVerdict(rule, a) {
    var subsOk = a.subs >= rule.full.subs;
    var hoursOk = a.watchHours >= rule.full.watchHours12mo;
    var shortsOk = a.shortsViews >= rule.full.shortsViews90d;
    return {
      eligible: subsOk && (hoursOk || shortsOk),
      checks: [
        { label: "Subscribers", have: a.subs, need: rule.full.subs, pass: subsOk },
        { label: "Watch hours (12 mo)", have: a.watchHours, need: rule.full.watchHours12mo, pass: hoursOk },
        { label: "Shorts views (90 d)", have: a.shortsViews, need: rule.full.shortsViews90d, pass: shortsOk }
      ],
      via: subsOk ? (hoursOk ? "watch-hours path" : (shortsOk ? "shorts path" : null)) : null,
      hoursGap: gap(rule.full.watchHours12mo - a.watchHours),
      shortsGap: gap(rule.full.shortsViews90d - a.shortsViews),
      subsGap: gap(rule.full.subs - a.subs)
    };
  }

  function fanVerdict(rule, a) {
    var subsOk = a.subs >= rule.fanFunding.subs;
    var upOk = a.uploads90d >= rule.fanFunding.uploads90d;
    var hoursOk = a.watchHours >= rule.fanFunding.watchHours12mo;
    var shortsOk = a.shortsViews >= rule.fanFunding.shortsViews90d;
    return {
      eligible: subsOk && upOk && (hoursOk || shortsOk),
      checks: [
        { label: "Subscribers", have: a.subs, need: rule.fanFunding.subs, pass: subsOk },
        { label: "Uploads (90 d)", have: a.uploads90d, need: rule.fanFunding.uploads90d, pass: upOk },
        { label: "Watch hours (12 mo)", have: a.watchHours, need: rule.fanFunding.watchHours12mo, pass: hoursOk },
        { label: "Shorts views (90 d)", have: a.shortsViews, need: rule.fanFunding.shortsViews90d, pass: shortsOk }
      ],
      hoursGap: gap(rule.fanFunding.watchHours12mo - a.watchHours),
      shortsGap: gap(rule.fanFunding.shortsViews90d - a.shortsViews),
      subsGap: gap(rule.fanFunding.subs - a.subs),
      uploadsGap: gap(rule.fanFunding.uploads90d - a.uploads90d)
    };
  }

  function shortsFloorVerdict(rule, a) {
    var pass = a.shortsViews >= rule.shortsFloor.shortsViews90d;
    return { pass: pass, gapViews: gap(rule.shortsFloor.shortsViews90d - a.shortsViews) };
  }

  function activityVerdict(rule, a) {
    var hoursOk = a.watchHours >= rule.activity.watchHours12mo;
    var shortsOk = a.shortsViews >= rule.activity.shortsViews90d;
    var outputOk = a.uploads90d >= rule.activity.shorts90d;
    return {
      pass: hoursOk || shortsOk || outputOk,
      checks: [
        { label: "Watch hours (12 mo) ≥ 1,000", pass: hoursOk },
        { label: "Shorts views (90 d) ≥ 1M", pass: shortsOk },
        { label: "Output (5+ uploads/90 d)", pass: outputOk }
      ],
      hoursGap: gap(rule.activity.watchHours12mo - a.watchHours),
      shortsGap: gap(rule.activity.shortsViews90d - a.shortsViews),
      uploadsGap: gap(rule.activity.shorts90d - a.uploads90d)
    };
  }

  /* ---------- close-the-gap plan (chapter-grounded, never invented advice) ---------- */
  function plan(rule, full, a) {
    var steps = [];
    if (full.subsGap > 0) {
      steps.push({
        goal: "Close the subscriber gap, " + fmt(full.subsGap) + " more subs",
        actions: [
          "Packaging first: CTR below ~2% is a packaging problem (Phase 2's creator-reported rule). Run every upcoming video through the Hook Builder before you film.",
          "Format discipline: one lane, weekly. Repetition is what turns viewers into subscribers (Phase 4)."
        ],
        links: [
          { label: "Phase 2, YouTube Mastery (packaging)", page: "phase-2-youtube-mastery.html" },
          { label: "Hook Builder", page: "hook-builder.html" },
          { label: "Phase 4, Audience to Community", page: "phase-4-audience-to-community.html" }
        ]
      });
    }
    if (full.hoursGap > 0) {
      var perDay = full.hoursGap / 90;
      steps.push({
        goal: "Close the watch-hours gap, " + fmt(full.hoursGap) + " more hours (≈ " + fmt(perDay) + "/day over 90 days)",
        actions: [
          "Ship volume toward the 50-video tuition line before judging: the data isn't in yet under 50 videos (Phase 2).",
          "Watch-time comes from retention, not length: re-hook every 30–60 seconds (Phase 2's retention repair).",
          "The 90-Day Planner turns cadence into a schedule, consistency beats volume (Phase 1)."
        ],
        links: [
          { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" },
          { label: "90-Day Planner", page: "planner.html" },
          { label: "Phase 1, The Content Engine", page: "phase-1-content-engine.html" }
        ]
      });
    }
    if (full.shortsGap > 0) {
      var perDayS = full.shortsGap / 90;
      steps.push({
        goal: "Close the Shorts-views gap, " + fmt(full.shortsGap) + " more views (≈ " + fmt(perDayS) + "/day over 90 days)",
        actions: [
          "Post 1–3 Shorts/day in a series format viewers can subscribe to, series compound, one-offs don't (Short-Form Playbook).",
          "Cut every long video into a 30-second vertical trailer within 24 hours, free discovery for work already done (Phase 2 launch checklist).",
          "Series formats live in the Playbook; the diagnosed weak points live in the Video Doctor."
        ],
        links: [
          { label: "The Short-Form Playbook (series formats)", page: "shortform-playbook.html" },
          { label: "Diagnose My Video", page: "video-doctor.html" },
          { label: "The Money Map (where this fits)", page: "money-map.html" }
        ]
      });
    }
    if (!steps.length) {
      steps.push({
        goal: "Numbers are at or above the bar, now the second gate matters",
        actions: [
          "Numeric eligibility is only the first gate. YouTube's qualitative review (inauthentic-content policy, Jul 2025) rejects mass-produced or templated channels on content grounds, original, human-made content passes; factory output doesn't.",
          "Before applying: 2-Step Verification on, no active strikes, AdSense linked, YPP-eligible country, then apply in Studio → Earn and budget ~1 month for review."
        ],
        links: [
          { label: "Phase 5, The Monetization Stack (the YPP chapter)", page: "phase-5-monetization-stack.html" },
          { label: "Diagnose My Video", page: "video-doctor.html" }
        ]
      });
    }
    return steps;
  }

  /* ---------- main check ---------- */
  function check(a) {
    if (!validInput(a)) throw new Error("ypp-checker: invalid input");

    var now = {
      id: "current",
      title: RULES.current.title,
      sources: RULES.current.sources.slice(),
      note: RULES.current.full.note,
      full: fullVerdict(RULES.current, a),
      fanFunding: fanVerdict(RULES.current, a),
      qualNotes: RULES.current.qualNotes.slice()
    };
    var next = {
      id: "y2027",
      title: RULES.y2027.title,
      sources: RULES.y2027.sources.slice(),
      note: RULES.y2027.full.note,
      full: fullVerdict(RULES.y2027, a),
      fanFunding: fanVerdict(RULES.y2027, a),
      shortsFloor: shortsFloorVerdict(RULES.y2027, a),
      activity: activityVerdict(RULES.y2027, a),
      qualNotes: RULES.y2027.qualNotes.slice()
    };

    var warnOriginality = a.originality !== "original" &&
      (a.formatMix !== "longform" || a.shortsViews > 0);

    // Which path is the shorter walk (informational, not advice)?
    var hoursGap = next.full.hoursGap, shortsGap = next.full.shortsGap;
    var shorterWalk = null;
    if (!next.full.eligible) {
      shorterWalk = {
        hoursHours: hoursGap,
        shortsViews: shortsGap,
        note: hoursGap === 0 && shortsGap > 0
          ? "Your hours are at/above the 2027 bar, the Shorts path is the remaining walk."
          : (shortsGap === 0 && hoursGap > 0
            ? "Your Shorts views are at/above the 2027 bar, the watch-hours path is the remaining walk."
            : "Only ONE path needs clearing (hours OR Shorts), chase whichever is closer to your current engine.")
      };
    }

    return {
      input: {
        subs: a.subs, watchHours: a.watchHours, shortsViews: a.shortsViews,
        uploads90d: a.uploads90d,
        originality: { id: a.originality, label: ORIGINALITY_LABEL[a.originality] },
        formatMix: { id: a.formatMix, label: FORMAT_LABEL[a.formatMix] }
      },
      now: now,
      y2027: next,
      originalityWarning: warnOriginality ? ORIGINALITY_WARNING : null,
      plan2027: plan(RULES.y2027, next.full, a),
      shorterWalk: shorterWalk,
      disclaimer: "Thresholds are YouTube-published / press-reported program rules as observed Oct 11, 2026, not forecasts. Rules change; verify live in YouTube Studio's Earn tab before planning around them. This checker is an educational aid, not financial, legal, or tax advice, and never an income promise."
    };
  }

  /* ---------- browser UI (guarded: engine stays DOM-free for node) ---------- */
  var STORE_KEY = "cge.yppchecker.v1";

  function loadStore() {
    try {
      var raw = (typeof localStorage !== "undefined") ? localStorage.getItem(STORE_KEY) : null;
      return raw ? JSON.parse(raw) : { last: null };
    } catch (e) { return { last: null }; }
  }
  function saveStore(s) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
    catch (e) { /* storage unavailable: nothing persists */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function renderCheckList(host, checks) {
    var ul = el("ul", "ypp-checks");
    checks.forEach(function (c) {
      var li = el("li", "ypp-check " + (c.pass ? "pass" : "fail"));
      var badge = el("span", "ypp-badge", c.pass ? "✓" : "✗");
      badge.setAttribute("aria-hidden", "true");
      li.appendChild(badge);
      var t = el("strong", null, c.label + ": ");
      var v = el("span", null, fmt(c.have) + " / need " + fmt(c.need));
      li.appendChild(t); li.appendChild(v);
      li.setAttribute("aria-label", c.label + ": " + fmt(c.have) + " of " + fmt(c.need) + ", " + (c.pass ? "pass" : "not yet"));
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  function renderVerdict(host, title, sources, verdict, verdictLabel) {
    var sec = el("section", "ypp-verdict " + (verdict.eligible ? "eligible" : "not-eligible"));
    var h = el("h4", null, title);
    sec.appendChild(h);
    var p = el("p", "ypp-rule-note", verdictLabel);
    sec.appendChild(p);
    var st = el("p", "ypp-status " + (verdict.eligible ? "yes" : "no"));
    st.textContent = verdict.eligible
      ? "✓ ELIGIBLE on the numbers, " + (verdict.via ? "via the " + verdict.via + "." : "")
      : "✗ Not yet on the numbers.";
    st.setAttribute("role", "status");
    sec.appendChild(st);
    renderCheckList(sec, verdict.checks);
    var s = el("p", "muted ypp-sources");
    s.textContent = "Sources: " + sources.join(" · ");
    sec.appendChild(s);
    host.appendChild(sec);
  }

  function renderPlan(host, planSteps) {
    var h = el("h3", null, "The plan to close the 2027 gap");
    host.appendChild(h);
    var ol = el("ol", "ypp-plan");
    planSteps.forEach(function (step) {
      var li = el("li", "ypp-step");
      li.appendChild(el("h4", null, step.goal));
      var ul = el("ul");
      step.actions.forEach(function (ac) { ul.appendChild(el("li", null, ac)); });
      li.appendChild(ul);
      var links = el("p", "ypp-links");
      links.appendChild(el("strong", null, "Read next: "));
      step.links.forEach(function (l, i) {
        if (i > 0) links.appendChild(document.createTextNode(" · "));
        var a = el("a", null, l.label);
        a.setAttribute("href", l.page);
        links.appendChild(a);
      });
      li.appendChild(links);
      ol.appendChild(li);
    });
    host.appendChild(ol);
  }

  function renderResult(host, d) {
    host.innerHTML = "";
    var card = el("div", "ypp-result");
    card.appendChild(el("p", "ypp-result-kicker", "YPP ELIGIBILITY // CURRENT vs FEB 2027"));
    card.appendChild(el("h3", null, "Your two verdicts"));

    var nsec = el("section", "ypp-rule-block");
    nsec.appendChild(el("h4", null, d.now.title));
    renderVerdict(nsec, "Ad-revenue tier (full YPP)", d.now.sources, d.now.full, d.now.note);
    var fv = d.now.fanFunding;
    var fp = el("p", "ypp-fanline " + (fv.eligible ? "yes" : "no"));
    fp.textContent = fv.eligible
      ? "Also inside the fan-funding tier (500 subs + uploads): memberships, Supers, Shopping, ad revenue still needs the full tier."
      : "Fan-funding tier (500 subs + 3 uploads/90d): not inside yet, the checks are the same shape, lower numbers.";
    nsec.appendChild(fp);
    card.appendChild(nsec);

    var ssec = el("section", "ypp-rule-block");
    ssec.appendChild(el("h4", null, d.y2027.title));
    renderVerdict(ssec, "Ad-revenue tier (new applicants)", d.y2027.sources, d.y2027.full, d.y2027.note);
    var fl = d.y2027.shortsFloor;
    var flp = el("p", "ypp-floorline " + (fl.pass ? "yes" : "no"));
    flp.textContent = fl.pass
      ? "Shorts revenue floor (monthly check): ✓ inside, 10M qualified Shorts views/90d keeps your Shorts Creator Pool + Shorts Premium revenue flowing."
      : "Shorts revenue floor (monthly check): ✗ " + fmt(fl.gapViews) + " more qualified Shorts views needed each 90-day window to keep Shorts pay flowing from Feb 2027. Below it you stay in YPP, long-form keeps paying, Shorts doesn't that month.";
    flp.setAttribute("role", "status");
    ssec.appendChild(flp);
    var act = d.y2027.activity;
    var actp = el("p", "ypp-activityline " + (act.pass ? "yes" : "no"));
    actp.textContent = act.pass
      ? "Activity test (existing partners): ✓ passes, at least one of 1,000 hours/365d, 1M Shorts views/90d, or 2 longs / 5 Shorts per 90 days."
      : "Activity test (existing partners): ✗, you'd miss all three legs; 90 days to recover (1,000 hours or 1M Shorts views) before monetization is at risk.";
    ssec.appendChild(actp);
    card.appendChild(ssec);

    if (d.originalityWarning) {
      var w = el("div", "ypp-warning");
      w.setAttribute("role", "alert");
      var wt = el("h4", null, "⚠ Shorts-originality warning, this can cost you the views the bar needs");
      w.appendChild(wt);
      w.appendChild(el("p", null, d.originalityWarning.text));
      var ws = el("p", "muted ypp-sources", "Source: " + d.originalityWarning.source);
      w.appendChild(ws);
      card.appendChild(w);
    }

    if (d.shorterWalk) {
      var sw = el("p", "ypp-walk", "One path only: " + d.shorterWalk.note);
      card.appendChild(sw);
    }

    renderPlan(card, d.plan2027);

    var qn = el("section", "ypp-qual");
    qn.appendChild(el("h3", null, "The second gate, the numbers aren't the whole application"));
    var qul = el("ul");
    d.y2027.qualNotes.forEach(function (n) { qul.appendChild(el("li", null, n)); });
    d.now.qualNotes.forEach(function (n) { qul.appendChild(el("li", null, n)); });
    qn.appendChild(qul);
    card.appendChild(qn);

    var disc = el("p", "muted ypp-disclaimer", d.disclaimer);
    card.appendChild(disc);

    host.appendChild(card);
    try { host.setAttribute("tabindex", "-1"); host.focus({ preventScroll: false }); } catch (e) {}
  }

  function readInputs() {
    function num(id) {
      var v = parseFloat(document.getElementById(id).value);
      return isNaN(v) ? 0 : v;
    }
    return {
      subs: num("ypp-subs"),
      watchHours: num("ypp-hours"),
      shortsViews: num("ypp-shorts"),
      uploads90d: num("ypp-uploads"),
      originality: document.getElementById("ypp-originality").value,
      formatMix: document.getElementById("ypp-mix").value
    };
  }

  function init() {
    var form = document.getElementById("ypp-form");
    var btn = document.getElementById("ypp-check-btn");
    var reset = document.getElementById("ypp-reset");
    var out = document.getElementById("ypp-results");
    if (!form || !btn || !out) return;

    var store = loadStore();
    if (store.last && validInput(store.last)) {
      ["subs", "hours", "shorts", "uploads"].forEach(function (k) {
        var idEl = document.getElementById("ypp-" + k);
        if (idEl && typeof store.last[{subs: "subs", hours: "watchHours", shorts: "shortsViews", uploads: "uploads90d"}[k]] === "number") {
          idEl.value = store.last[{subs: "subs", hours: "watchHours", shorts: "shortsViews", uploads: "uploads90d"}[k]];
        }
      });
      var o = document.getElementById("ypp-originality");
      if (o && ORIGINALITY.indexOf(store.last.originality) !== -1) o.value = store.last.originality;
      var m = document.getElementById("ypp-mix");
      if (m && FORMAT_MIX.indexOf(store.last.formatMix) !== -1) m.value = store.last.formatMix;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = readInputs();
      if (!validInput(input)) {
        out.innerHTML = '<div class="empty-state" role="alert"><span class="empty-icon" aria-hidden="true">!</span><strong>Check your numbers.</strong>Enter non-negative values for subscribers, watch hours, Shorts views, and uploads.</div>';
        return;
      }
      saveStore({ last: input });
      renderResult(out, check(input));
    });

    if (reset) reset.addEventListener("click", function () {
      form.reset();
      out.innerHTML = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">⌖</span><strong>Nothing checked yet.</strong>Enter your numbers above, the checker compares them against the current YPP bar and the Feb-2027 bar, side by side.</div>';
      saveStore({ last: null });
    });
  }

  if (typeof document !== "undefined" && document.readyState !== "loading") {
    init();
  } else if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  return {
    RULES: RULES, ORIGINALITY: ORIGINALITY, FORMAT_MIX: FORMAT_MIX,
    ORIGINALITY_LABEL: ORIGINALITY_LABEL, FORMAT_LABEL: FORMAT_LABEL,
    ORIGINALITY_WARNING: ORIGINALITY_WARNING,
    validInput: validInput, check: check,
    fullVerdict: fullVerdict, fanVerdict: fanVerdict,
    shortsFloorVerdict: shortsFloorVerdict, activityVerdict: activityVerdict, plan: plan
  };
});
