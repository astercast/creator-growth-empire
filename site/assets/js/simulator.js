/* Empire Simulator page wiring: inputs -> EmpireSim engine -> SVG charts + table.
 * Runs in-browser only; the engine itself (sim-engine.js) is DOM-free and node-testable.
 * Wave 13: scenario library, A/B comparison mode, team hiring P&L, 24-month
 * year-2 runs, and the "Copy my empire plan" export.
 */
(function () {
  "use strict";
  var form = document.getElementById("sim-form");
  var out = document.getElementById("sim-output");
  if (!form || !out || typeof EmpireSim === "undefined") return;

  var NICHE_NAMES = {
    finance_investing: "Finance / Investing",
    tech_software: "Tech / Software",
    education: "Education",
    health_fitness: "Health / Fitness",
    lifestyle: "Lifestyle",
    gaming: "Gaming",
    comedy_entertainment: "Comedy / Entertainment",
    music: "Music",
    kids_content: "Kids Content (low RPM, see Phase 0)",
    kids: "Kids Content",
    asmr: "ASMR",
    creator_economy: "Creator Economy",
    challenges_stunts: "Challenges & Stunts",
    ai_ml: "AI & ML",
    true_crime: "True Crime",
    entertainment: "Entertainment & Comedy",
    science: "Science Explainers"
  };
  var STREAMS = [
    { key: "adsLong",   label: "Long-form ads", color: "var(--cyan)" },
    { key: "adsShorts", label: "Shorts ads",    color: "var(--gold)" },
    { key: "tiktok",    label: "TikTok Rewards", color: "var(--gold-dim)" },
    { key: "sponsor",   label: "Sponsors",      color: "var(--stamp)" },
    { key: "affiliates",label: "Affiliates",    color: "var(--sage)" },
    { key: "digital",   label: "Digital product", color: "var(--cyan)" }
  ];
  var HIRE_FIELDS = [
    { type: "editor",    check: "s-hire-editor",    month: "s-hire-editor-month",    cost: "s-hire-editor-cost" },
    { type: "thumbnail", check: "s-hire-thumbnail", month: "s-hire-thumbnail-month", cost: "s-hire-thumbnail-cost" },
    { type: "va",        check: "s-hire-va",        month: "s-hire-va-month",        cost: "s-hire-va-cost" }
  ];

  var cfg = null;
  var nichesData = null;
  var currentScenarioName = "Custom settings";
  /* Wave-2 flagship: the niche picker is a card grid of the 10 real study
   * niches, no <select>, no made-up factors. selectedNiche is the source of
   * truth; cards re-render once the data lands. */
  var selectedNiche = "education";
  var QUALITY_LABELS = ["Low", "Solid", "Excellent"];
  var QUALITY_VALUES = ["low", "solid", "excellent"];

  /* 4.0: reduced-motion-safe scrolling, smooth scroll only when the user
   * hasn't asked for reduced motion. Revision 2026-10-15: the old manual
   * "calm mode" toggle is gone site-wide (a first-time visitor could not
   * tell what it did). Motion here is gentle by default and the device's
   * reduced-motion setting is honored on its own, no switch needed. */
  function motionReduced() {
    return typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function scrollToEl(el) {
    if (!el || !el.scrollIntoView) return;
    if (motionReduced()) el.scrollIntoView({ block: "start" });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fmtMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function fmtSigned(n) {
    var v = Math.round(n);
    return (v < 0 ? "−$" : "+$") + Math.abs(v).toLocaleString("en-US");
  }
  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Math.round(n).toString();
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function nicheName(k) { return NICHE_NAMES[k] || k; }

  /* ---------- what-if event cards (wave 24) ----------
   * Rendered from the engine's DEFAULTS.eventCards so the card copy can
   * never drift from the engine that applies the effects. */
  function renderEventCards() {
    var grid = document.getElementById("event-grid");
    if (!grid || typeof EmpireSim.DEFAULTS.eventCards === "undefined") return;
    grid.innerHTML = EmpireSim.DEFAULTS.eventCards.map(function (c) {
      var id = "s-ev-" + c.id;
      return '<div class="calc-out" style="text-align:left">' +
        '<label class="check"><input type="checkbox" id="' + id + '"> <strong>' +
        esc(c.name) + "</strong></label>" +
        '<label>Card lands <input type="number" id="' + id + '-month" min="1" max="36" value="6" step="1" aria-label="' +
        esc(c.name) + ' start month"></label>' +
        '<p class="muted" style="font-size:.82rem"><strong>Assumed effect:</strong> ' + esc(c.assumedEffect) + "</p>" +
        '<p class="muted" style="font-size:.78rem"><strong>Basis:</strong> ' + esc(c.basis) + "</p>" +
        "</div>";
    }).join("");
  }

  /* ---------- scenario library ---------- */
  function scenarioById(id) {
    for (var i = 0; i < EmpireSim.SCENARIOS.length; i++) {
      if (EmpireSim.SCENARIOS[i].id === id) return EmpireSim.SCENARIOS[i];
    }
    return null;
  }

  /* Wave-2 flagship: niche cards from the real data. Each card carries the
   * study median, the RPM band + its honest basis, and the competition chip.
   * Rendered from niches.json (names/competition) + calculators.json
   * (niche_rpm_2026 bands); falls back to the engine DEFAULTS medians. */
  function studyNiches() {
    return Object.keys(EmpireSim.DEFAULTS.nicheMedianGrowth).map(function (id) {
      var rec = null;
      if (nichesData && nichesData.niches) {
        for (var i = 0; i < nichesData.niches.length; i++) {
          if (nichesData.niches[i].id === id) { rec = nichesData.niches[i]; break; }
        }
      }
      var median = EmpireSim.DEFAULTS.nicheMedianGrowth[id];
      var bandInfo = cfg ? EmpireSim.rpmBandForNiche(id, cfg)
        : { band: [0, 0], basis: "fallback", source: "" };
      return {
        id: id,
        name: rec ? rec.name : (NICHE_NAMES[id] || id),
        median: median,
        band: bandInfo.band,
        basis: bandInfo.basis,
        competition: rec ? rec.competition : null
      };
    }).sort(function (a, b) { return b.median - a.median; });
  }
  function basisChip(basis) {
    if (basis === "reported") return '<span class="chip chip-verified">reported</span>';
    if (basis === "cpm-reported") return '<span class="chip">CPM-reported</span>';
    return '<span class="chip">proxy</span>';
  }
  function renderNicheCards() {
    var wrap = document.getElementById("niche-cards");
    if (!wrap) return;
    var niches = studyNiches();
    wrap.innerHTML = niches.map(function (n) {
      var bandTxt = n.band[0] === n.band[1]
        ? "$" + n.band[0] : "$" + n.band[0] + "–$" + n.band[1];
      var compTxt = n.competition ? ' · <span class="muted">' + esc(n.competition) + " competition</span>" : "";
      return '<label class="niche-card' + (n.id === selectedNiche ? " niche-card-selected" : "") + '">' +
        '<input type="radio" name="s-niche" value="' + esc(n.id) + '"' +
        (n.id === selectedNiche ? " checked" : "") + ' class="sr-only">' +
        '<span class="niche-card-name">' + esc(n.name) + "</span>" +
        '<span class="niche-card-median">' + (n.median * 100).toFixed(2) + "%/mo <span class='muted'>median</span></span>" +
        '<span class="niche-card-rpm">RPM ' + bandTxt + " " + basisChip(n.basis) + "</span>" +
        '<span class="niche-card-comp">' + compTxt.replace(/^ · /, "") + "</span>" +
        "</label>";
    }).join("");
    updateNicheMedianLine();
  }
  function updateNicheMedianLine() {
    var line = document.getElementById("s-niche-median-line");
    if (!line) return;
    var info = EmpireSim.nicheMedianInfo(selectedNiche);
    var bandInfo = cfg ? EmpireSim.rpmBandForNiche(selectedNiche, cfg) : null;
    var txt = nicheName(selectedNiche) + ": study median " +
      (info.median * 100).toFixed(2) + "%/mo, " + info.note;
    if (bandInfo) {
      var bandTxt = bandInfo.band[0] === bandInfo.band[1]
        ? "$" + bandInfo.band[0] : "$" + bandInfo.band[0] + "–$" + bandInfo.band[1];
      txt += " RPM band " + bandTxt + " (" + bandInfo.basis + ": " + bandInfo.source + ").";
    }
    line.textContent = txt;
  }
  function selectNiche(id) {
    selectedNiche = id;
    renderNicheCards();
    var st = document.getElementById("briefing-status");
    if (st) st.textContent = "ORDERS UPDATED";
  }

  function renderScenarioGrid() {
    var grid = document.getElementById("scenario-grid");
    if (!grid) return;
    grid.innerHTML = EmpireSim.SCENARIOS.map(function (sc) {
      var bandInfo = cfg ? EmpireSim.rpmBandForNiche(sc.inputs.niche, cfg) : null;
      var band = bandInfo ? bandInfo.band : null;
      var bandTxt = band ? " · RPM $" + band[0] + "–$" + band[1] : "";
      return '<div class="calc-out" style="text-align:left">' +
        '<div class="lbl">' + esc(sc.name) + "</div>" +
        '<p class="muted" style="font-size:.85rem;margin:.4rem 0">' + esc(sc.tagline) + "</p>" +
        '<p class="muted" style="font-size:.8rem">' + esc(nicheName(sc.inputs.niche)) + bandTxt +
        " · " + sc.inputs.longformPerWeek + " long + " + sc.inputs.shortsPerWeek + " shorts/wk</p>" +
        '<p class="muted" style="font-size:.75rem">Source: ' + esc(sc.source) + "</p>" +
        '<button type="button" class="btn btn-ghost" data-scenario="' + esc(sc.id) +
        '">Load scenario →</button></div>';
    }).join("");
  }
  function loadScenario(id) {
    var sc = scenarioById(id);
    if (!sc) return;
    var inp = EmpireSim.scenarioInputs(id);
    selectNiche(inp.niche);
    document.getElementById("s-subs").value = inp.startSubs;
    setRange("s-long", inp.longformPerWeek);
    setRange("s-shorts", inp.shortsPerWeek);
    setQuality(inp.quality);
    growthRange.value = Math.round(inp.growthRate * 100);
    growthOut.value = growthRange.value + "%";
    var radios = document.querySelectorAll('input[name="s-rpm"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === inp.rpmLevel);
    q4Range.value = Math.round(inp.q4Uplift * 100);
    q4Out.value = q4Range.value + "%";
    document.getElementById("s-ads").checked = !!inp.ads;
    document.getElementById("s-sponsors").checked = !!inp.sponsors;
    document.getElementById("s-aff").checked = !!inp.affiliates;
    document.getElementById("s-digital").checked = !!inp.digital;
    document.getElementById("s-dig-month").value = inp.digitalStartMonth;
    document.getElementById("s-dig-price").value = inp.digitalPrice;
    document.getElementById("s-pf-tiktok").checked = !!inp.tiktok;
    document.getElementById("s-pf-reels").checked = !!inp.reels;
    HIRE_FIELDS.forEach(function (f) { document.getElementById(f.check).checked = false; });
    eventCardIds().forEach(function (id2) {
      var box = document.getElementById("s-ev-" + id2);
      if (box) box.checked = false;
    });
    currentScenarioName = sc.name;
    var note = "Loaded: " + sc.name + ", tweak anything, then run the simulation.";
    if (sc.nicheProxyNote) note += " " + sc.nicheProxyNote;
    document.getElementById("scenario-active").textContent = note;
    updateMixLine();
  }

  /* Wave-2: fetch both data files, then build the picker + scenario grid. */
  function loadData() {
    var got = 0;
    function done() {
      got++;
      if (got < 2) return;
      renderNicheCards();
      renderScenarioGrid();
      updateMixLine();
    }
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }).then(function (c) {
      cfg = c; done();
    }).catch(function () {
      var line = document.getElementById("s-niche-median-line");
      if (line) line.textContent = "Could not load live RPM bands, using engine fallbacks.";
      done();
    });
    fetch("data/v1/niches.json").then(function (r) { return r.json(); }).then(function (n) {
      nichesData = n; done();
    }).catch(function () { done(); });
  }
  loadData();
  renderNicheCards();
  renderScenarioGrid();
  renderEventCards();

  var grid = document.getElementById("scenario-grid");
  if (grid) {
    grid.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-scenario]") : null;
      if (btn) loadScenario(btn.getAttribute("data-scenario"));
    });
  }

  /* Wave-2: niche card selection (delegated, cards re-render on data load). */
  document.getElementById("niche-cards").addEventListener("change", function (e) {
    var radio = e.target && e.target.closest ? e.target.closest('input[name="s-niche"]') : null;
    if (radio && radio.value !== selectedNiche) selectNiche(radio.value);
  });
  document.getElementById("s-use-median").addEventListener("click", function () {
    var info = EmpireSim.nicheMedianInfo(selectedNiche);
    if (info.median == null) return;
    growthRange.value = Math.round(info.median * 10000) / 100;
    growthOut.value = growthRange.value + "%";
    growthRange.dispatchEvent(new Event("input", { bubbles: true }));
  });

  /* Wave-2: cadence + quality sliders. */
  function setRange(id, v) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function qualityValue() {
    var v = parseInt(document.getElementById("s-quality").value, 10);
    return QUALITY_VALUES[Math.max(0, Math.min(2, isNaN(v) ? 1 : v))];
  }
  function setQuality(q) {
    var i = QUALITY_VALUES.indexOf(q);
    setRange("s-quality", i === -1 ? 1 : i);
  }
  function wireSlider(id, outId, fmt) {
    var el = document.getElementById(id), o = document.getElementById(outId);
    if (!el || !o) return;
    el.addEventListener("input", function () { o.value = fmt(el.value); });
    o.value = fmt(el.value);
  }
  wireSlider("s-long", "s-long-out", function (v) { return v + "/wk"; });
  wireSlider("s-shorts", "s-shorts-out", function (v) { return v + "/wk"; });
  wireSlider("s-quality", "s-quality-out", function (v) {
    return QUALITY_LABELS[Math.max(0, Math.min(2, parseInt(v, 10) || 0))];
  });

  /* Wave-2: publishing mix readout, the normalized shares, stated plainly. */
  function updateMixLine() {
    var line = document.getElementById("s-mix-line");
    if (!line) return;
    var tiktok = document.getElementById("s-pf-tiktok").checked;
    var reels = document.getElementById("s-pf-reels").checked;
    var mix = EmpireSim.shortMixShares({ tiktok: tiktok, reels: reels });
    line.textContent = "Current mix: " + Math.round(mix.shorts * 100) + "% Shorts" +
      (tiktok ? " / " + Math.round(mix.tiktok * 100) + "% TikTok" : "") +
      (reels ? " / " + Math.round(mix.reels * 100) + "% Reels" : "") + ".";
  }
  document.getElementById("s-pf-tiktok").addEventListener("change", updateMixLine);
  document.getElementById("s-pf-reels").addEventListener("change", updateMixLine);

  /* Wave-2: the Money Map feeds starting stats. The quiz answers live in
   * localStorage under cge.moneymap.v1 (see money-map.js); validAnswers()
   * is MoneyMap's own gate, exposed on window.MoneyMap. */
  (function moneyMapFeed() {
    var row = document.getElementById("s-moneymap-row");
    var btn = document.getElementById("s-moneymap-load");
    var note = document.getElementById("s-moneymap-note");
    if (!row || !btn) return;
    var answers = null;
    try {
      var raw = localStorage.getItem("cge.moneymap.v1");
      var store = raw ? JSON.parse(raw) : null;
      if (store && store.answers && window.MoneyMap &&
          typeof window.MoneyMap.validAnswers === "function" &&
          window.MoneyMap.validAnswers(store.answers)) {
        answers = store.answers;
      }
    } catch (e) { answers = null; }
    if (!answers) return;
    row.hidden = false;
    var stageName = "";
    try {
      var placed = window.MoneyMap.placeStage(answers);
      stageName = " (Money Map placed you at Stage " + placed.stage + ", " +
        window.MoneyMap.STAGES[placed.stage].name + ")";
    } catch (e) { /* placement is a nicety, not a gate */ }
    note.textContent = "Found your Money Map survey" + stageName +
      ", one click carries your audience band, platform, cadence, and team over as starting stats.";
    btn.addEventListener("click", function () {
      var mapped = EmpireSim.moneyMapToInputs(answers);
      var inp = mapped.inputs;
      if (inp.startSubs != null) document.getElementById("s-subs").value = inp.startSubs;
      if (inp.longformPerWeek != null) setRange("s-long", inp.longformPerWeek);
      if (inp.shortsPerWeek != null) setRange("s-shorts", inp.shortsPerWeek);
      if (inp.tiktok) document.getElementById("s-pf-tiktok").checked = true;
      if (inp.reels) document.getElementById("s-pf-reels").checked = true;
      if (inp.sponsors) document.getElementById("s-sponsors").checked = true;
      HIRE_FIELDS.forEach(function (f) { document.getElementById(f.check).checked = false; });
      (inp.hires || []).forEach(function (h) {
        for (var i = 0; i < HIRE_FIELDS.length; i++) {
          if (HIRE_FIELDS[i].type === h.type) {
            document.getElementById(HIRE_FIELDS[i].check).checked = true;
            document.getElementById(HIRE_FIELDS[i].month).value = h.startMonth;
          }
        }
      });
      updateMixLine();
      note.textContent = "Carried over: " + mapped.mapped.join("; ") + ". Tweak anything, then run.";
      var st = document.getElementById("briefing-status");
      if (st) st.textContent = "MONEY MAP LINKED";
    });
  })();

  var growthRange = document.getElementById("s-growth");
  var growthOut = document.getElementById("s-growth-out");
  var q4Range = document.getElementById("s-q4");
  var q4Out = document.getElementById("s-q4-out");
  growthRange.addEventListener("input", function () { growthOut.value = growthRange.value + "%"; });
  q4Range.addEventListener("input", function () { q4Out.value = q4Range.value + "%"; });

  // any manual tweak after a load = custom settings again (programmatic loads don't fire this)
  form.addEventListener("input", function () {
    if (currentScenarioName !== "Custom settings") {
      currentScenarioName = "Custom settings";
      document.getElementById("scenario-active").textContent =
        "No scenario loaded, your current form settings are custom.";
    }
  });

  // fixed-assumption list, rendered from the engine so it can't drift
  (function () {
    var ul = document.getElementById("s-assumption-list");
    if (!ul) return;
    var d = EmpireSim.DEFAULTS;
    var items = [
      "Base monthly growth " + (d.baseGrowthRate * 100) + "% × cadence × quality (compounding, deterministic, no viral lottery)",
      "Niche growth medians (TubeAI Sep 2026, 10K–100K cohort; all-channel median 0.97%/mo): " +
        Object.keys(d.nicheMedianGrowth).map(function (k) {
          return nicheName(k) + " " + (d.nicheMedianGrowth[k] * 100).toFixed(2) + "%"; }).join(", ") +
        ", context for the growth slider, NOT multipliers. " + d.nicheMedianGrowthNote,
      "Quality multipliers: low 0.7× / solid 1× / excellent 1.35×",
      "Cadence factor: 1 + 0.12 per long-form + 0.03 per short (cap 2.5×)",
      "Views per sub per month: " + d.viewsPerSubLong + " (long-form), " +
        d.viewsPerSubShort + " (shorts)",
      "Shorts RPM $" + d.shortsRpmMid + " (mid of the 2026 Shorts band); " +
        "TikTok Creator Rewards: qualifying views ≈ " + Math.round(d.tiktokQualifyingRatio * 100) +
        "% of raw views at the rewards RPM band, past the " +
        d.tiktokGateSubs.toLocaleString("en-US") + "-follower gate; Reels pay $0/view (2026)",
      "Short-form mix shares (normalized across armed platforms): Shorts " +
        Math.round(d.shortMixShares.shorts * 100) + "% / TikTok " +
        Math.round(d.shortMixShares.tiktok * 100) + "% / Reels " +
        Math.round(d.shortMixShares.reels * 100) + "%",
      "Sponsor tiers nano → mega with " +
        d.sponsorTiers.slice().reverse().map(function (t) {
          return t.id + " " + t.dealsPerMonth + "/mo"; }).join(", ") + " deals",
      "Affiliates $" + d.affiliatePer1kViews + " per 1K long-form views; " +
        "digital " + (d.digitalConvPerMonth * 100) + "% of subs buy per month at price you set",
      "Team hires: editor $1,400/mo (+1 long-form/wk, quality +12%), thumbnail $120/mo (quality +8%), " +
        "VA $900/mo (+0.5 long-form/wk), from the First Hire guide; first month at 50% (ramp-up)",
      "Year-2 (12/24+ month horizons): monthly growth decays ×" + d.year2Decay + "/mo after month 12; year-3 decays ×" + d.year3Decay + "/mo after month 24, our diminishing-returns curve, labeled; growth stays positive (plateau, not collapse)",
      "What-if event cards (our labeled assumptions, chapter-cited): algorithm change (Shorts views ×" + d.eventAssumptions.algoReachMult + " from the card month), viral hit (one month ×" + d.eventAssumptions.viralLongViewsMult + " long views, +8% subs once, ×" + d.eventAssumptions.viralTailMult + " tail next month), burnout break (2 months: growth 0%, subs −0.5%/mo, views ×" + d.eventAssumptions.burnoutViewsMult + "), policy change (Feb-2027 YPP rules: Shorts ads $0 in months under the 10M/90d floor)",
      "Money Map stages placed per month by net revenue: <$100 stage 0 · <$1K stage 1 · <$10K stage 2 · ≥$10K stage 3 · team + ≥$10K stage 4"
    ];
    ul.innerHTML = items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  })();

  function readHires() {
    var hires = [];
    HIRE_FIELDS.forEach(function (f) {
      if (document.getElementById(f.check).checked) {
        hires.push({
          type: f.type,
          startMonth: Math.max(1, Math.min(36,
            parseInt(document.getElementById(f.month).value, 10) || 1)),
          monthlyCost: Math.max(0,
            parseFloat(document.getElementById(f.cost).value) || 0)
        });
      }
    });
    return hires;
  }

  function eventCardIds() {
    var ids = [];
    if (typeof EmpireSim.DEFAULTS.eventCards === "undefined") return ids;
    EmpireSim.DEFAULTS.eventCards.forEach(function (c) { ids.push(c.id); });
    return ids;
  }

  function readEvents() {
    var evs = [];
    eventCardIds().forEach(function (id) {
      var box = document.getElementById("s-ev-" + id);
      if (box && box.checked) {
        var mo = parseInt(document.getElementById("s-ev-" + id + "-month").value, 10);
        evs.push({ id: id, startMonth: Math.max(1, Math.min(36, mo || 1)) });
      }
    });
    return evs;
  }

  function readInputs() {
    var rpmLevel = "mid";
    var radios = document.querySelectorAll('input[name="s-rpm"]');
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) rpmLevel = radios[i].value;
    return {
      niche: selectedNiche,
      startSubs: Math.max(0, parseFloat(document.getElementById("s-subs").value) || 0),
      longformPerWeek: Math.max(0, parseFloat(document.getElementById("s-long").value) || 0),
      shortsPerWeek: Math.max(0, parseFloat(document.getElementById("s-shorts").value) || 0),
      quality: qualityValue(),
      growthRate: (parseFloat(growthRange.value) || 12) / 100,
      rpmLevel: rpmLevel,
      q4Uplift: (parseFloat(q4Range.value) || 60) / 100,
      tiktok: document.getElementById("s-pf-tiktok").checked,
      reels: document.getElementById("s-pf-reels").checked,
      ads: document.getElementById("s-ads").checked,
      sponsors: document.getElementById("s-sponsors").checked,
      affiliates: document.getElementById("s-aff").checked,
      digital: document.getElementById("s-digital").checked,
      digitalStartMonth: parseInt(document.getElementById("s-dig-month").value, 10) || 1,
      digitalPrice: Math.max(1, parseFloat(document.getElementById("s-dig-price").value) || 49),
      horizon: parseInt(document.getElementById("s-horizon").value, 10) || 12,
      hires: readHires(),
      events: readEvents()
    };
  }

  /* ---------- SVG charts (static, responsive, labelled) ---------- */
  function chartTicks(N) {
    if (N === 12) return [1, 4, 7, 10, 12];
    return [1, Math.round(N / 4), Math.round(N / 2), Math.round(3 * N / 4), N];
  }

  /* Wave-2 flagship: "watch the empire build." The animated subscriber
   * chart reveals the curve month by month with milestone celebrations as
   * the curve crosses them. Reduced-motion/calm users get the full static
   * chart (subsChart) instantly, the animation is delight, never the only
   * way to read the data. */
  function subsChartGeom(months) {
    var N = months.length;
    var W = 640, H = 260, pl = 46, pr = 14, pt = 18, pb = 30;
    var max = Math.max.apply(null, months.map(function (m) { return m.subs; })) * 1.08;
    return {
      N: N, W: W, H: H, pl: pl, pr: pr, pt: pt, pb: pb, max: max,
      slot: (W - pl - pr) / N,
      X: function (i) { return pl + (W - pl - pr) * (i / (N - 1)); },
      Y: function (v) { return pt + (H - pt - pb) * (1 - v / max); }
    };
  }
  function subsChartShell(months, res) {
    var g = subsChartGeom(months);
    var bands = months.map(function (m, i) {
      var bx = g.pl + g.slot * i;
      return '<rect x="' + bx.toFixed(1) + '" y="' + g.pt + '" width="' +
        (g.slot + 0.6).toFixed(1) + '" height="' + (g.H - g.pt - g.pb) +
        '" class="stage-band-' + m.stage + '" aria-hidden="true"></rect>' +
        '<text x="' + (bx + g.slot / 2).toFixed(1) + '" y="' + (g.H - g.pb + g.pt - 24).toFixed(1) +
        '" text-anchor="middle" class="chart-stage-num" aria-hidden="true">S' + m.stage + "</text>";
    }).join("");
    var ticks = [0, g.max / 2, g.max].map(function (v) {
      return '<line x1="' + g.pl + '" y1="' + g.Y(v) + '" x2="' + (g.W - g.pr) + '" y2="' + g.Y(v) +
        '" class="chart-grid"/><text x="' + (g.pl - 6) + '" y="' + (g.Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtCompact(v) + "</text>";
    }).join("");
    var months_ticks = chartTicks(g.N).map(function (mm) {
      return '<text x="' + g.X(mm - 1) + '" y="' + (g.H - 8) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    var stageLegend = [0, 1, 2, 3, 4].map(function (s) {
      return '<span class="legend-item"><span class="swatch stage-swatch-' + s +
        '"></span>S' + s + " \u00b7 " + esc(EmpireSim.STAGES[s].name) + "</span>";
    }).join("");
    return '<div class="chart-stage" data-months="' + g.N + '">' +
      '<div class="chart-hud" aria-hidden="true"><span class="chart-hud-month" data-hud-month>M1</span>' +
      '<span class="chart-hud-subs" data-hud-subs></span></div>' +
      '<div class="chart-toast" role="status" aria-live="polite" data-toast></div>' +
      '<svg viewBox="0 0 ' + g.W + " " + g.H + '" class="chart" role="img" ' +
      'aria-label="Animated subscriber growth curve over ' + g.N + " months, ending at " +
      fmtCompact(months[g.N - 1].subs) + ' subscribers">' +
      '<g aria-hidden="true">' + bands + "</g>" + ticks +
      '<polygon points="" class="chart-area" data-area/>' +
      '<polyline points="" class="chart-line" data-line/>' +
      '<g data-marks></g>' +
      months_ticks + "</svg>" +
      '<div class="chart-legend" aria-hidden="true">' + stageLegend + "</div>" +
      '<div class="chart-actions"><button type="button" class="btn btn-ghost" data-replay hidden>Replay the build ↻</button></div>' +
      "</div>";
  }
  function animateSubsChart(stage, months, res) {
    var g = subsChartGeom(months);
    var line = stage.querySelector("[data-line]");
    var area = stage.querySelector("[data-area]");
    var marks = stage.querySelector("[data-marks]");
    var hudMonth = stage.querySelector("[data-hud-month]");
    var hudSubs = stage.querySelector("[data-hud-subs]");
    var toast = stage.querySelector("[data-toast]");
    var replay = stage.querySelector("[data-replay]");
    var milestoneByMonth = {};
    (res.milestones || []).forEach(function (ms) { milestoneByMonth[ms.month] = ms; });
    var svgNS = "http://www.w3.org/2000/svg";
    function pt(i) { return g.X(i).toFixed(1) + "," + g.Y(months[i].subs).toFixed(1); }
    function milestoneDot(i, ms) {
      var grp = document.createElementNS(svgNS, "g");
      grp.setAttribute("tabindex", "0");
      grp.setAttribute("role", "img");
      var lbl = ms.label + ", month " + ms.month + ", " + fmtCompact(months[i].subs) + " subscribers";
      grp.setAttribute("aria-label", lbl);
      grp.setAttribute("class", "chart-mark chart-dot-pop");
      var c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", g.X(i).toFixed(1));
      c.setAttribute("cy", g.Y(months[i].subs).toFixed(1));
      c.setAttribute("r", "4.5");
      c.setAttribute("class", "chart-dot");
      var title = document.createElementNS(svgNS, "title");
      title.textContent = lbl;
      c.appendChild(title);
      grp.appendChild(c);
      return grp;
    }
    var i = 0, timer = null;
    function celebrate(ms) {
      /* Milestone celebration: a stamp-slam toast + the dot pops onto the
       * curve. Transform/opacity only; the aria-live region announces it. */
      toast.innerHTML = '<span class="milestone-toast"><span class="stamp stamp-gold" aria-hidden="true">★</span> ' +
        "<strong>MILESTONE, " + esc(ms.label).toUpperCase() + "</strong></span>";
      var t = toast.firstChild;
      if (t) { t.classList.remove("toast-slam"); void t.offsetWidth; t.classList.add("toast-slam"); }
    }
    function frame() {
      var pts = [];
      for (var k = 0; k <= i; k++) pts.push(pt(k));
      line.setAttribute("points", pts.join(" "));
      area.setAttribute("points",
        g.pl + "," + g.Y(0).toFixed(1) + " " + pts.join(" ") + " " +
        g.X(i).toFixed(1) + "," + g.Y(0).toFixed(1));
      hudMonth.textContent = "M" + months[i].month;
      hudSubs.textContent = fmtCompact(months[i].subs) + " subs · S" + months[i].stage;
      var ms = milestoneByMonth[months[i].month];
      if (ms) {
        marks.appendChild(milestoneDot(i, ms));
        celebrate(ms);
      }
      if (months[i].eventsActive.length) {
        var lbl = "What-if active, month " + months[i].month + ": " +
          months[i].eventsActive.map(cardName).join(", ");
        var tg = document.createElementNS(svgNS, "g");
        tg.setAttribute("tabindex", "0");
        tg.setAttribute("role", "img");
        tg.setAttribute("aria-label", lbl);
        tg.setAttribute("class", "chart-mark");
        var tt = document.createElementNS(svgNS, "text");
        tt.setAttribute("x", g.X(i).toFixed(1));
        tt.setAttribute("y", (g.Y(months[i].subs) - 14).toFixed(1));
        tt.setAttribute("text-anchor", "middle");
        tt.setAttribute("class", "chart-event");
        tt.textContent = "⚡";
        var ttitle = document.createElementNS(svgNS, "title");
        ttitle.textContent = lbl;
        tt.appendChild(ttitle);
        tg.appendChild(tt);
        marks.appendChild(tg);
      }
      i++;
      if (i < months.length) {
        timer = setTimeout(frame, 150);
      } else {
        /* Final frame: the end label + replay affordance. */
        var end = document.createElementNS(svgNS, "text");
        end.setAttribute("x", (g.X(g.N - 1) - 4).toFixed(1));
        end.setAttribute("y", (g.Y(months[g.N - 1].subs) - 10).toFixed(1));
        end.setAttribute("text-anchor", "end");
        end.setAttribute("class", "chart-tick");
        end.textContent = fmtCompact(months[g.N - 1].subs) + " subs";
        marks.appendChild(end);
        if (replay) replay.hidden = false;
        if (toast) toast.innerHTML = '<span class="muted">Empire built, ' + g.N +
          ' months, ' + fmtCompact(months[g.N - 1].subs) + ' subs. A model, not a prediction.</span>';
      }
    }
    function start() {
      if (timer) clearTimeout(timer);
      line.setAttribute("points", "");
      area.setAttribute("points", "");
      marks.innerHTML = "";
      if (replay) replay.hidden = true;
      i = 0;
      frame();
    }
    if (replay) replay.addEventListener("click", start);
    stage._replayChart = start;
    start();
    return start;
  }
  function subsChart(months, res) {
    var N = months.length;
    var W = 640, H = 260, pl = 46, pr = 14, pt = 18, pb = 30;
    var max = Math.max.apply(null, months.map(function (m) { return m.subs; })) * 1.08;
    var X = function (i) { return pl + (W - pl - pr) * (i / (N - 1)); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var pts = months.map(function (m, i) { return X(i).toFixed(1) + "," + Y(m.subs).toFixed(1); });
    var area = pl + "," + Y(0).toFixed(1) + " " + pts.join(" ") + " " + X(N - 1).toFixed(1) + "," + Y(0).toFixed(1);
    var slot = (W - pl - pr) / N;
    /* 4.0: Money Map stage bands behind the curve, the journey, visible. */
    var bands = months.map(function (m, i) {
      /* watch item (wave 26/29): stage meaning must not live in color+opacity
         alone, every band carries an S-numeral label (non-color encoding)
         plus the <title> for assistive tech. */
      var bx = pl + slot * i;
      return '<rect x="' + bx.toFixed(1) + '" y="' + pt + '" width="' +
        (slot + 0.6).toFixed(1) + '" height="' + (H - pt - pb) + '" class="stage-band-' +
        m.stage + '"><title>Month ' + m.month + ": Stage " + m.stage + " (" +
        esc(EmpireSim.STAGES[m.stage].name) + ")</title></rect>" +
        '<text x="' + (bx + slot / 2).toFixed(1) + '" y="' + (H - pt - pb + pt - 6).toFixed(1) +
        '" text-anchor="middle" class="chart-stage-num" aria-hidden="true">S' + m.stage + "</text>";
    }).join("");
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtCompact(v) + "</text>";
    }).join("");
    var months_ticks = chartTicks(N).map(function (mm) {
      return '<text x="' + X(mm - 1) + '" y="' + (H - 8) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    /* 4.0: milestone dots on the curve + what-if event markers. */
    /* 4.0 + round-2 dataviz: milestone dots are keyboard-focusable groups
     * with labels (hover AND keyboard tooltips), never color-only, never
     * hover-only. Event markers likewise. Bands stay decorative (aria-hidden). */
    var dots = (res.milestones || []).map(function (ms) {
      var i = Math.max(0, Math.min(N - 1, ms.month - 1));
      var lbl = esc(ms.label) + ", month " + ms.month + ", " +
        fmtCompact(months[i].subs) + " subscribers";
      return '<g tabindex="0" role="img" class="chart-mark" aria-label="' + lbl + '">' +
        '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(months[i].subs).toFixed(1) +
        '" r="4.5" class="chart-dot" tabindex="-1"><title>' + lbl + "</title></circle></g>";
    }).join("");
    var evMarks = months.map(function (m, i) {
      if (!m.eventsActive.length) return "";
      var lbl = "What-if active, month " + m.month + ": " +
        esc(m.eventsActive.map(cardName).join(", "));
      return '<g tabindex="0" role="img" class="chart-mark" aria-label="' + lbl + '">' +
        '<text x="' + X(i).toFixed(1) + '" y="' + (Y(m.subs) - 14).toFixed(1) +
        '" text-anchor="middle" class="chart-event" tabindex="-1">⚡<title>' + lbl + "</title></text></g>";
    }).join("");
    var endLabel = '<text x="' + (X(N - 1) - 4).toFixed(1) + '" y="' +
      (Y(months[N - 1].subs) - 10).toFixed(1) +
      '" text-anchor="end" class="chart-tick">' + fmtCompact(months[N - 1].subs) + " subs</text>";
    var stageLegend = [0, 1, 2, 3, 4].map(function (s) {
      return '<span class="legend-item"><span class="swatch stage-swatch-' + s +
        '"></span>S' + s + " \u00b7 " + esc(EmpireSim.STAGES[s].name) + "</span>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Subscriber growth curve over ' + N + " months, ending at " + fmtCompact(months[N - 1].subs) + ' subscribers">' +
      '<g aria-hidden="true">' + bands + "</g>" +
      ticks + '<polygon points="' + area + '" class="chart-area"/>' +
      '<polyline points="' + pts.join(" ") + '" class="chart-line"/>' +
      dots + evMarks +
      endLabel + months_ticks + "</svg>" +
      '<div class="chart-legend" aria-hidden="true">' + stageLegend + "</div>";
  }

  function revenueChart(months, res) {
    var N = months.length;
    var W = 640, H = 280, pl = 52, pr = 14, pt = 18, pb = 44;
    var max = Math.max.apply(null, months.map(function (m) { return m.total; })) * 1.08 || 1;
    var slot = (W - pl - pr) / N, bw = Math.min(34, slot * 0.62);
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var best = months.reduce(function (a, b) { return b.total > a.total ? b : a; }, months[0]);
    var labelEvery = N > 12 ? 3 : 1; /* 4.0: keep month labels readable at 24/36 mo */
    var bars = months.map(function (m, i) {
      var x = pl + slot * i + (slot - bw) / 2, y0 = Y(0), segs = "";
      var acc = 0;
      STREAMS.forEach(function (s) {
        var v = m[s.key];
        if (v <= 0) return;
        var y1 = Y(acc + v);
        segs += '<rect x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + (Y(acc) - y1).toFixed(1) + '" fill="' + s.color + '">' +
          "<title>" + esc(s.label) + " M" + m.month + ": " + fmtMoney(v) + "</title></rect>";
        acc += v;
      });
      /* 4.0: what-if event marker above the bar + best-month value label. */
      var mark = "";
      if (m.eventsActive.length) {
        mark = '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Y(acc) - 8).toFixed(1) +
          '" text-anchor="middle" class="chart-event">\u26a1<title>What-if active, month ' +
          m.month + ": " + esc(m.eventsActive.map(cardName).join(", ")) + "</title></text>";
      }
      if (m.month === best.month && best.total > 0) {
        mark += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Y(acc) - (m.eventsActive.length ? 22 : 8)).toFixed(1) +
          '" text-anchor="middle" class="chart-tick">' + fmtMoney(best.total) + "</text>";
      }
      var mlabel = ((m.month - 1) % labelEvery === 0)
        ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 24) +
          '" class="chart-tick" text-anchor="middle">' + m.month + "</text>"
        : "";
      return '<g aria-hidden="true"><title>Month ' + m.month + " total " + fmtMoney(m.total) + "</title>" + segs +
        mark + mlabel + "</g>";
    }).join("");
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtMoney(v) + "</text>";
    }).join("");
    var legend = STREAMS.map(function (s) {
      return '<span class="legend-item"><span class="swatch" style="background:' + s.color +
        '"></span>' + esc(s.label) + "</span>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Monthly revenue stacked by stream over ' + N + " months. Peak month " + fmtMoney(max / 1.08) + '">' +
      ticks + bars +
      '<text x="' + pl + '" y="' + (H - 6) + '" class="chart-tick">month</text></svg>' +
      '<div class="chart-legend" aria-hidden="true">' + legend + "</div>";
  }

  /* round-2 dataviz recipe: non-hover readouts, exact values reachable via
   * keyboard/touch through a toggleable data table under each chart.
   * Native <details> = free keyboard behavior, zero component code. */
  function subsDataTable(months) {
    var rows = months.map(function (m) {
      return "<tr><th scope='row'>" + m.month + "</th><td>" +
        Math.round(m.subs).toLocaleString("en-US") + "</td><td>" + m.stage + "</td><td>" +
        Math.round(m.longViews).toLocaleString("en-US") + "</td><td>" +
        Math.round(m.shortViews).toLocaleString("en-US") + "</td></tr>";
    }).join("");
    return '<details class="chart-data"><summary>Subscriber data as a table</summary>' +
      '<div class="table-wrap"><table><caption>Month-by-month subscribers, Money Map stage, and views.</caption>' +
      "<thead><tr><th scope='col'>Month</th><th scope='col'>Subs</th><th scope='col'>Stage</th>" +
      "<th scope='col'>Long views</th><th scope='col'>Shorts views</th></tr></thead><tbody>" +
      rows + "</tbody></table></div></details>";
  }
  function revenueDataTable(months) {
    var rows = months.map(function (m) {
      return "<tr><th scope='row'>" + m.month + "</th><td>" + fmtMoney(m.total) + "</td><td>" +
        fmtMoney(m.teamCost) + "</td><td><strong>" + fmtMoney(m.net) + "</strong></td></tr>";
    }).join("");
    return '<details class="chart-data"><summary>Revenue data as a table</summary>' +
      '<div class="table-wrap"><table><caption>Month-by-month total revenue, team cost, and net.</caption>' +
      "<thead><tr><th scope='col'>Month</th><th scope='col'>Total</th><th scope='col'>Team cost</th>" +
      "<th scope='col'>Net</th></tr></thead><tbody>" + rows + "</tbody></table></div></details>";
  }

  /* ---------- render ---------- */
  var STICKER_VARIANTS = ["", "sticker-coral", "sticker-gold", "sticker-violet"];

  function hireSummary(res) {
    var hires = res.meta.hires || [];
    if (!hires.length) return "no hires, gross = net";
    return hires.map(function (h) {
      var t = EmpireSim.DEFAULTS.hireTypes[h.type];
      return (t ? t.label : h.type) + " $" + Math.round(h.monthlyCost) + "/mo from M" + h.startMonth;
    }).join(" · ");
  }

  function cardName(id) {
    var cards = EmpireSim.DEFAULTS.eventCards || [];
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].id === id) return cards[i].name;
    }
    return id;
  }

  function stageTimeline(res) {
    var html = '<h3>The stage journey</h3><div class="sticker-row" aria-label="Money Map stage transitions">' +
      res.stages.map(function (s, i) {
        return '<span class="sticker ' + STICKER_VARIANTS[i % 4] + '">M' + s.month +
          " · Stage " + s.stage + ", " + esc(s.name) + "</span>";
      }).join("") + "</div>" +
      '<p class="muted" style="font-size:.85rem">Stages placed per month from net revenue plus team: ' +
      "&lt;$100 = stage 0 (The Start Line) · &lt;$1K = stage 1 (First $100) · &lt;$10K = stage 2 (The Engine Runs) · " +
      "≥$10K = stage 3 (The Business) · team + ≥$10K = stage 4 (The Company). " +
      "Ends at stage " + res.endStage + " (" + esc(EmpireSim.STAGES[res.endStage].name) + ").</p>";
    return html;
  }

  /* 4.0: year-by-year summary cards for 24/36-month runs, the multi-year
   * story at a glance, before the month-by-month ledger. */
  function yearCards(res) {
    var months = res.months;
    if (months.length <= 12) return "";
    var cards = "";
    for (var y = 0; y < months.length / 12; y++) {
      var slice = months.slice(y * 12, y * 12 + 12);
      var gross = slice.reduce(function (a, m) { return a + m.total; }, 0);
      var team = slice.reduce(function (a, m) { return a + m.teamCost; }, 0);
      var last = slice[slice.length - 1];
      cards += '<div class="calc-out"><div class="lbl">Year ' + (y + 1) + "</div>" +
        '<div class="big">' + fmtMoney(gross - team) + '</div><div class="range">net · ' +
        fmtCompact(last.subs) + " subs · ends Stage " + last.stage + " (" +
        esc(EmpireSim.STAGES[last.stage].name) + ")</div>" +
        '<p class="muted" style="font-size:.82rem;margin:.4rem 0">Gross ' +
        fmtMoney(gross) + " − team " + fmtMoney(team) + "</p></div>";
    }
    return '<h3>The years</h3><div class="calc-grid">' + cards + "</div>";
  }

  /* 4.0: the assumptions panel, always visible in the results, never
   * hidden behind the drawer. Reuses the engine's assumptionLines(). */
  function assumptionsBlock(inputs, res) {
    return "<h3>Assumptions: always visible</h3>" +
      '<div class="calc-out" style="text-align:left">' +
      "<ul style='font-size:.88rem;margin:.5rem 0;padding-left:1.2rem'>" +
      EmpireSim.assumptionLines(inputs, res).map(function (l) {
        return "<li>" + esc(l) + "</li>";
      }).join("") + "</ul></div>";
  }

  /* Wave-2 flagship: the kind hard truths, rendered as their own debrief
   * section, the sim shows the math AND the base rates. */
  function realityChecksBlock(inputs, res) {
    var checks = EmpireSim.realityChecks(inputs, res);
    if (!checks.length) return "";
    return "<h3>Reality checks: kind hard truths</h3>" +
      '<div class="reality-checks" role="note" aria-label="Reality checks">' +
      checks.map(function (c) {
        return '<div class="calc-out reality-check" style="text-align:left">' +
          '<p class="lbl">◉ ' + esc(c.headline) + "</p>" +
          '<p style="font-size:.9rem">' + esc(c.detail) + "</p>" +
          '<p class="muted" style="font-size:.78rem">Basis: ' + esc(c.basis) + "</p></div>";
      }).join("") + "</div>";
  }

  function render(inputs, res, opts) {
    opts = opts || {};
    var months = res.months, totals = res.totals;
    var N = months.length;
    var best = months.reduce(function (a, b) { return b.total > a.total ? b : a; }, months[0]);
    /* Wave-2: the animated chart plays on explicit runs only (submit +
     * launch). Live re-runs swap the static chart, no flicker, no replay
     * storm. Reduced-motion/calm always gets the static chart. */
    var animateChart = opts.animate === true && !motionReduced();

    var horizonNote = N > 24
      ? " · 36-month run (year-2 ×" + res.meta.year2Decay + "/mo, year-3 ×" + res.meta.year3Decay + "/mo)"
      : (N > 12 ? " · 24-month run (year-2 decay ×" + res.meta.year2Decay + "/mo)" : "");
    var evNote = (res.meta.events && res.meta.events.length)
      ? " · What-if: " + res.meta.events.map(function (e) {
          return esc(cardName(e.id)) + " (M" + e.startMonth + ")";
        }).join(", ") : "";

    var stats = '<div class="stat-grid">' +
      stat("End of run subs", fmtCompact(res.endSubs), res.startSubs + " → " + fmtCompact(res.endSubs)) +
      stat("Gross revenue", fmtMoney(totals.total), "all streams, before taxes") +
      stat("Team spend", fmtMoney(totals.teamCost), hireSummary(res)) +
      stat("Net revenue", fmtMoney(totals.net), "gross minus team") +
      stat("Best month", fmtMoney(best.total), "month " + best.month) +
      stat("End stage", "Stage " + res.endStage, esc(EmpireSim.STAGES[res.endStage].name) + " (Money Map)") +
      "</div>";

    var meta = '<p class="muted">Model used: ' + (inputs.growthRate * 100).toFixed(0) +
      "% base growth × " + res.meta.cadenceMult.toFixed(2) +
      " cadence × " + res.meta.qualityMult + " quality = <strong>" +
      (res.meta.monthlyGrowth * 100).toFixed(1) + "%/mo</strong> · RPM $" +
      res.meta.rpm.toFixed(2) + " (" + inputs.rpmLevel + " of $" + res.meta.rpmBand[0] +
      "–$" + res.meta.rpmBand[1] + ", " + esc(res.meta.rpmBandBasis) + ") · mix " +
      Math.round(res.meta.shortMix.shorts * 100) + "/" +
      Math.round(res.meta.shortMix.tiktok * 100) + "/" +
      Math.round(res.meta.shortMix.reels * 100) + " Shorts/TikTok/Reels" +
      horizonNote + evNote +
      " · Team: " + esc(hireSummary(res)) + ".</p>";

    var miles = res.milestones.length
      ? '<div class="sticker-row" aria-label="Empire milestones">' + res.milestones.map(function (m, i) {
          return '<span class="sticker ' + STICKER_VARIANTS[i % 4] + '">M' + m.month +
            " · " + esc(m.label) + "</span>";
        }).join("") + "</div>"
      : '<p class="muted">No milestones hit, raise the cadence, the quality, or the growth assumption and run it again.</p>';

    var rows = months.map(function (m) {
      var ads = m.adsLong + m.adsShorts + m.tiktok;
      var moCell = m.month + (m.eventsActive.length
        ? ' <span title="What-if active: ' + esc(m.eventsActive.map(cardName).join(", ")) +
          '" aria-label="what-if event active this month">⚡</span>' : "");
      return "<tr><th scope='row'>" + moCell + "</th><td>" + fmtCompact(m.subs) + "</td>" +
        "<td>S" + m.stage + "</td>" +
        "<td>" + fmtCompact(m.longViews) + "</td><td>" + fmtCompact(m.shortViews) + "</td>" +
        "<td>" + fmtMoney(ads) + "</td><td>" + fmtMoney(m.sponsor) + "</td>" +
        "<td>" + fmtMoney(m.affiliates) + "</td><td>" + fmtMoney(m.digital) + "</td>" +
        "<td>" + fmtMoney(m.teamCost) + "</td><td><strong>" + fmtMoney(m.net) + "</strong></td></tr>";
    }).join("");

    var html =
      '<div class="hud-panel" style="margin-top:2rem"><div class="hud-head">' +
      "<span>SIMULATION COMPLETE // " + N + "-MONTH EMPIRE PROJECTION</span>" +
      '<span class="hud-status">MODEL, NOT PROPHECY</span></div><div class="hud-body">' +
      "<h2>Your empire, month by month</h2>" + meta + stats +
      yearCards(res) + miles + stageTimeline(res) +
      "<h3>Subscriber curve</h3>" +
      (animateChart
        ? '<div id="subs-chart-live">' + subsChartShell(months, res) + "</div>"
        : subsChart(months, res)) +
      subsDataTable(months) +
      "<h3>Revenue by stream</h3>" + revenueChart(months, res) + revenueDataTable(months) +
      realityChecksBlock(inputs, res) +
      assumptionsBlock(inputs, res) +
      "<h3>The ledger (month-by-month P&amp;L)</h3><div class=\"table-wrap\"><table><caption>Month-by-month projection. " +
      "Compact numbers; revenue rounded. Net = total − team cost. ⚡ marks months with an active what-if event.</caption><thead><tr><th scope='col'>Mo</th>" +
      "<th scope='col'>Subs</th><th scope='col'>Stage</th><th scope='col'>Long views</th><th scope='col'>Shorts views</th>" +
      "<th scope='col'>Ads</th><th scope='col'>Sponsors</th><th scope='col'>Affiliates</th>" +
      "<th scope='col'>Digital</th><th scope='col'>Team</th><th scope='col'>Net</th></tr></thead><tbody>" + rows +
      "</tbody></table></div>" +
      '<div style="margin-top:1.5rem"><button type="button" class="btn btn-ghost" id="s-share">Copy my empire plan</button> ' +
      '<span id="s-share-status" class="muted" role="status"></span></div>' +
      '<p class="muted" style="margin-top:1rem">A model, not a prediction. Revenue is pre-tax and pre-reality. ' +
      "Not financial, legal, or tax advice. " +
      'Verify every platform number live before making decisions.</p>' +
      "</div></div>";

    /* Same-document view transition (Baseline 2026) on explicit runs, the
     * new results crossfade in as one choreographed beat. Live re-runs pass
     * transition:false to swap plainly (no flicker); reduced-motion users
     * and unsupporting browsers always get the plain swap. */
    function swap() {
      out.innerHTML = html;
      wireShare(inputs, res);
      if (animateChart) {
        var stage = out.querySelector(".chart-stage");
        if (stage) animateSubsChart(stage, months, res);
      }
      if (opts.scroll !== false) scrollToEl(out);
    }
    if (opts.transition !== false && !motionReduced() && document.startViewTransition) {
      document.startViewTransition(swap);
    } else {
      swap();
    }
  }

  function stat(label, big, sub) {
    return '<div class="calc-out"><div class="lbl">' + esc(label) + '</div><div class="big">' +
      esc(big) + '</div><div class="range">' + esc(sub) + "</div></div>";
  }

  function wireShare(inputs, res) {
    var btn = document.getElementById("s-share");
    var status = document.getElementById("s-share-status");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text = EmpireSim.exportPlan(currentScenarioName, inputs, res);
      function done(okMsg) { status.textContent = okMsg; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          done("Copied, paste it anywhere.");
        }, function () { done("Copy blocked by the browser, select and copy manually."); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done("Copied, paste it anywhere."); }
        catch (e) { done("Copy blocked by the browser, select and copy manually."); }
        document.body.removeChild(ta);
      }
    });
  }

  /* shared net-revenue chart: both paths on one clock, two lines */
  function compareNetChart(ma, mb, nameA, nameB) {
    var N = ma.length;
    var W = 640, H = 280, pl = 52, pr = 14, pt = 18, pb = 44;
    var max = Math.max.apply(null,
      ma.concat(mb).map(function (m) { return m.net; })) * 1.08 || 1;
    var X = function (i) { return pl + (W - pl - pr) * (i / (N - 1)); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    function line(months) {
      return months.map(function (m, i) {
        return X(i).toFixed(1) + "," + Y(m.net).toFixed(1);
      }).join(" ");
    }
    var ticks = [0, max / 2, max].map(function (v) {
      return '<line x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W - pr) + '" y2="' + Y(v) +
        '" class="chart-grid"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) +
        '" class="chart-tick" text-anchor="end">' + fmtMoney(v) + "</text>";
    }).join("");
    var monthsTicks = chartTicks(N).map(function (mm) {
      return '<text x="' + X(mm - 1) + '" y="' + (H - 24) +
        '" class="chart-tick" text-anchor="middle">M' + mm + "</text>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" ' +
      'aria-label="Net revenue per month over ' + N + " months: " + esc(nameA) + " versus " + esc(nameB) + '">' +
      ticks +
      '<polyline points="' + line(ma) + '" class="chart-line" style="stroke:var(--cyan)"/>' +
      '<polyline points="' + line(mb) + '" class="chart-line" style="stroke:var(--stamp)"/>' +
      monthsTicks +
      '<text x="' + pl + '" y="' + (H - 6) + '" class="chart-tick">month</text></svg>' +
      '<div class="chart-legend" aria-hidden="true">' +
      '<span class="legend-item"><span class="swatch" style="background:var(--cyan)"></span>A · ' + esc(nameA) + "</span>" +
      '<span class="legend-item"><span class="swatch" style="background:var(--stamp)"></span>B · ' + esc(nameB) + "</span></div>";
  }

  var cmpOut = document.getElementById("cmp-output");
  function cmpSelectOptions() {
    var html = '<option value="custom">My current settings (form above)</option>';
    EmpireSim.SCENARIOS.forEach(function (sc) {
      html += '<option value="' + esc(sc.id) + '">Scenario: ' + esc(sc.name) + "</option>";
    });
    return html;
  }
  function cmpSide(sel, horizon) {
    if (sel === "custom") {
      var inp = readInputs();
      inp.horizon = horizon;
      return { name: "My current settings", inputs: inp };
    }
    var sc = scenarioById(sel);
    var sinc = EmpireSim.scenarioInputs(sel);
    sinc.horizon = horizon;
    return { name: sc ? sc.name : sel, inputs: sinc };
  }
  function renderCompare(cmp, A, B) {
    var N = cmp.a.meta.horizon;
    function sideCard(res, name) {
      var best = res.months.reduce(function (x, y) { return y.total > x.total ? y : x; }, res.months[0]);
      return '<div class="calc-out" style="text-align:left"><div class="lbl">' + esc(name) + "</div>" +
        '<div class="big">' + fmtMoney(res.totals.net) + '</div><div class="range">net over ' + N + " months</div>" +
        '<p class="muted" style="font-size:.85rem;margin:.4rem 0">' +
        fmtCompact(res.endSubs) + " subs · gross " + fmtMoney(res.totals.total) +
        " · team " + fmtMoney(res.totals.teamCost) +
        " · best month " + fmtMoney(best.total) + " (M" + best.month + ")</p></div>";
    }
    function deltaRow(label, aVal, bVal, fmt) {
      var d = bVal - aVal;
      var cls = d > 0 ? ' style="color:var(--cyan)"' : (d < 0 ? ' style="color:var(--stamp)"' : "");
      return "<tr><th scope='row'>" + label + "</th><td>" + fmt(aVal) + "</td><td>" + fmt(bVal) +
        '</td><td' + cls + "><strong>" + fmtSigned(d) + "</strong></td></tr>";
    }
    function assumptionsPanel(name, inputs, res) {
      return '<div class="calc-out" style="text-align:left"><div class="lbl">Assumptions · ' + esc(name) + "</div>" +
        "<ul style='font-size:.85rem;margin:.5rem 0;padding-left:1.2rem'>" +
        EmpireSim.assumptionLines(inputs, res).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") +
        "</ul></div>";
    }
    var bestA = cmp.a.months.reduce(function (x, y) { return y.total > x.total ? y : x; }, cmp.a.months[0]);
    var bestB = cmp.b.months.reduce(function (x, y) { return y.total > x.total ? y : x; }, cmp.b.months[0]);
    var deltaTable =
      '<div class="table-wrap"><table><caption>Delta table, every Δ is Path B minus Path A.</caption>' +
      "<thead><tr><th scope='col'>Metric</th><th scope='col'>A · " + esc(cmp.nameA) +
      "</th><th scope='col'>B · " + esc(cmp.nameB) + "</th><th scope='col'>Δ (B − A)</th></tr></thead><tbody>" +
      deltaRow("End subs", cmp.a.endSubs, cmp.b.endSubs, fmtCompact) +
      deltaRow("Gross revenue", cmp.a.totals.total, cmp.b.totals.total, fmtMoney) +
      deltaRow("Team spend", cmp.a.totals.teamCost, cmp.b.totals.teamCost, fmtMoney) +
      deltaRow("Net revenue", cmp.a.totals.net, cmp.b.totals.net, fmtMoney) +
      deltaRow("Best month", bestA.total, bestB.total, fmtMoney) +
      deltaRow("Milestones hit", cmp.a.milestones.length, cmp.b.milestones.length, function (v) { return String(v); }) +
      "</tbody></table></div>";
    cmpOut.innerHTML =
      '<div class="hud-panel" style="margin-top:1.5rem"><div class="hud-head">' +
      "<span>COMPARE COMPLETE // " + N + "-MONTH DELTAS</span>" +
      '<span class="hud-status">MODEL, NOT PROPHECY</span></div><div class="hud-body">' +
      '<div class="calc-grid">' + sideCard(cmp.a, cmp.nameA) + sideCard(cmp.b, cmp.nameB) + "</div>" +
      "<h3>The shared chart: net revenue, same clock</h3>" +
      compareNetChart(cmp.a.months, cmp.b.months, cmp.nameA, cmp.nameB) +
      "<h3>Which path wins</h3>" +
      '<div class="calc-out" style="text-align:left;border-left:4px solid var(--gold)">' +
      "<p><strong>Verdict:</strong> " + esc(cmp.verdict) + "</p></div>" +
      "<h3>The delta table</h3>" + deltaTable +
      "<h3>Assumptions: always visible, both sides</h3>" +
      '<div class="calc-grid">' + assumptionsPanel(cmp.nameA, A.inputs, cmp.a) +
      assumptionsPanel(cmp.nameB, B.inputs, cmp.b) + "</div>" +
      '<p class="muted" style="margin-top:1rem">Models, not predictions. Not financial, legal, or tax advice.</p>' +
      "</div></div>";
    scrollToEl(cmpOut);
  }

  var cmpA = document.getElementById("cmp-a");
  var cmpB = document.getElementById("cmp-b");
  if (cmpA && cmpB) {
    cmpA.innerHTML = cmpSelectOptions();
    cmpB.innerHTML = cmpSelectOptions();
    cmpA.value = "asmr-bedroom";
    cmpB.value = "tech-reviewer";
    document.getElementById("cmp-run").addEventListener("click", function () {
      if (!cfg) {
        cmpOut.innerHTML = '<p class="muted">Still loading the 2026 rate data, try again in a second.</p>';
        return;
      }
      var horizon = parseInt(document.getElementById("s-horizon").value, 10) || 12;
      var A = cmpSide(cmpA.value, horizon);
      var B = cmpSide(cmpB.value, horizon);
      renderCompare(EmpireSim.compare(A.name, A.inputs, B.name, B.inputs, cfg), A, B);
    });
  }

  /* wow wave 1: the explicit run path is factored so the mission-control
   * launch sequence (assets/js/simulator-launch.js) can drive it. The launch
   * script intercepts submit in the capture phase; when it declines, this
   * listener runs the plain instant path. */
  function computeRun() {
    if (!cfg) {
      out.innerHTML = '<p class="muted">Still loading the 2026 rate data, try again in a second.</p>';
      return null;
    }
    var inputs = readInputs();
    return { inputs: inputs, res: EmpireSim.simulate(inputs, cfg) };
  }
  function renderRun(pair, opts) {
    if (!pair) return;
    render(pair.inputs, pair.res, opts);
  }
  form.addEventListener("submit", function (e) {
    if (typeof window !== "undefined" && window.SimLaunch &&
        window.SimLaunch.interceptSubmit(e)) return;
    e.preventDefault();
    /* explicit run: the full choreography, view transition + the animated
     * "watch the empire build" chart. */
    renderRun(computeRun(), { animate: true });
  });

  window.EmpireSimUI = {
    readInputs: readInputs,
    hasConfig: function () { return !!cfg; },
    engineReady: function () {
      return typeof EmpireSim !== "undefined" &&
        typeof EmpireSim.simulate === "function";
    },
    computeRun: computeRun,
    renderRun: renderRun,
    scenarioName: function () { return currentScenarioName; },
    assumptionCount: function (pair) {
      if (!pair || !pair.res) return 0;
      return EmpireSim.assumptionLines(pair.inputs, pair.res).length;
    },
    stageNames: function () {
      return EmpireSim.STAGES.map(function (s) { return s.name; });
    }
  };

  /* ---------- 4.0: live re-run (debounced) ----------
   * The sandbox re-simulates as you type, the charts stay in sync with the
   * form without a round-trip through the Run button. Explicit runs keep the
   * view transition + scroll; live runs swap plainly and stay put. */
  var liveTimer = null;
  var liveBox = document.getElementById("s-live");
  var liveStatus = document.getElementById("s-live-status");
  form.addEventListener("input", function () {
    if (!liveBox || !liveBox.checked || !cfg) return;
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      var inputs = readInputs();
      var res = EmpireSim.simulate(inputs, cfg);
      render(inputs, res, { scroll: false, transition: false });
      if (liveStatus) {
        var d = new Date();
        var hh = ("0" + d.getHours()).slice(-2);
        var mm = ("0" + d.getMinutes()).slice(-2);
        var ss = ("0" + d.getSeconds()).slice(-2);
        liveStatus.textContent = "Live re-ran at " + hh + ":" + mm + ":" + ss + ".";
      }
    }, 800);
  });

  /* ---------- 4.0: "what would it take?" goal solver ----------
   * Inverts the model: binary-searches base growth (or long-form cadence)
   * until the target lands by the target month. The answer is the model's,
   * labeled as such, never a promise. */
  var goalBtn = document.getElementById("s-goal-run");
  if (goalBtn) {
    var goalTarget = document.getElementById("s-goal-target");
    var goalStageRow = document.getElementById("s-goal-stage-row");
    goalTarget.addEventListener("change", function () {
      if (goalStageRow) {
        goalStageRow.style.display = goalTarget.value === "stage" ? "" : "none";
      }
    });
    goalBtn.addEventListener("click", function () {
      var goalOut = document.getElementById("s-goal-out");
      if (!cfg) {
        goalOut.innerHTML = '<p class="muted">Still loading the 2026 rate data, try again in a second.</p>';
        return;
      }
      var target = goalTarget.value;
      var goal = {
        target: target,
        value: target === "stage"
          ? parseInt(document.getElementById("s-goal-stage").value, 10)
          : parseFloat(document.getElementById("s-goal-value").value) || 0,
        month: Math.max(1, Math.min(36,
          parseInt(document.getElementById("s-goal-month").value, 10) || 12)),
        variable: document.getElementById("s-goal-var").value
      };
      var inputs = readInputs();
      var r = EmpireSim.solveForGoal(inputs, cfg, goal);
      var html;
      if (r.ok) {
        html = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--cyan)">' +
          "<p><strong>What it would take: " + esc(r.valueLabel) + "</strong></p>" +
          "<p class='muted'>" + esc(r.note) + "</p>" +
          (r.alreadyThere ? "" :
            "<p class='muted'>Model check: at " + esc(r.valueLabel) + " the run reaches " +
            esc(r.achievedLabel) + " by month " + r.month + ".</p>") +
          "</div>";
      } else if (r.reason === "stage4_needs_team") {
        html = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--gold)">' +
          "<p><strong>Blocked:</strong> " + esc(r.note) + "</p></div>";
      } else if (r.reason === "unreachable") {
        html = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--stamp)">' +
          "<p><strong>Not reachable in this model.</strong></p>" +
          "<p class='muted'>" + esc(r.note) + "</p></div>";
      } else {
        html = '<p class="muted">Enter a target above zero first.</p>';
      }
      html += '<p class="muted" style="font-size:.82rem">Single-source reality check (Lilach Bullock, Oct 2026): ' +
        "under 1% of YouTube channels ever reach 100K subscribers, plan around loyal-subscriber math, not virality. " +
        "The solver is model math, not a plan.</p>";
      goalOut.innerHTML = html;
      scrollToEl(goalOut);
    });
  }
})();
