/* Diagnose My Video, the analytics troubleshooter engine (no DOM in the core).
 * UMD: works in the browser (window.VideoDoctor) and in node (module.exports).
 *
 * HONESTY CONTRACT: every diagnosis is drawn from the site's own chapters
 * (Phase 1, Phase 2, the Short-Form Playbook). Every threshold is labeled as
 * a creator-reported rule of thumb, never platform-published data. The
 * chapters are the source of truth; this tool only routes the symptom to the
 * right chapter fix. A diagnostic aid, not financial, legal, or tax advice,
 * and never an income promise.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.VideoDoctor = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- vocab ---------- */
  var SYMPTOM_IDS = [
    "low-ctr", "early-dropoff", "good-retention-no-subs", "sawtooth",
    "single-cliff", "shorts-no-crossover", "flat-low", "end-collapse"
  ];
  var PLATFORMS = ["longform", "shorts", "tiktok", "reels"];
  var EXPERIENCE = ["under-50", "over-50"];

  var PLATFORM_LABEL = {
    longform: "YouTube long-form", shorts: "YouTube Shorts",
    tiktok: "TikTok", reels: "Instagram Reels"
  };

  /* ---------- the eight symptoms ---------- */
  var SYMPTOMS = [
    {
      id: "low-ctr", label: "Low click-through rate",
      desc: "Impressions are there. Clicks aren't.",
      summary: "CTR below ~2% is a packaging problem (creator-reported rule of thumb); 4–10% is healthy, but cold audiences always CTR lower than subscribers.",
      watchThis: "CTR per video vs your own channel average, never someone else's.",
      causes: [
        {
          cause: "Packaging problem",
          why: "Phase 2's creator-reported rule of thumb: CTR below ~2% signals packaging, 4–10% is healthy. The title/thumbnail promised something the audience didn't want enough to click. Context matters: a video shown to a broad cold audience always CTRs lower than one shown to subscribers.",
          fixes: [
            "At 48 hours: CTR under 2% with good retention? Repackage, new thumbnail and title, don't abandon the video. (Phase 2's 48-hour rule.)",
            "Rebuild the package around one clear promise: the searchable thing in the title's first half, a thumbnail that shows it.",
            "Run the topic through the Hook Builder for five packaging angles before you re-shoot anything."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (the analytics that matter)", page: "phase-2-youtube-mastery.html" },
            { label: "Hook Builder", page: "hook-builder.html" }
          ]
        },
        {
          cause: "Topic is narrow by design",
          why: "Search/intent-driven videos CTR lower than browse videos, that's the format, not a failure. A tutorial earning for years can live at low CTR happily. Compare against your own channel average, never someone else's.",
          fixes: [
            "Benchmark this video's CTR against your own average, not a guru's screenshot.",
            "If the video is search-driven, judge it on watch time over months, slow, compounding, nearly immortal (Phase 2)."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (browse vs search)", page: "phase-2-youtube-mastery.html" },
            { label: "The Metrics Glossary (what CTR actually means)", page: "metrics-glossary.html" }
          ]
        },
        {
          cause: "Video still inside its test window",
          why: "Phase 2: don't touch the packaging for 48 hours, changing the title or thumbnail resets the test. Any single video's first 24 hours doesn't matter (Phase 2's don't-matter list).",
          fixes: [
            "Wait out the 48-hour test window before diagnosing anything.",
            "Re-read the numbers at 48 hours with the retention graph next to the CTR."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (the 48-hour rule)", page: "phase-2-youtube-mastery.html" }
          ]
        }
      ]
    },
    {
      id: "early-dropoff", label: "Viewers leave in the first 30 seconds",
      desc: "The hook failed, the opening didn't deliver.",
      summary: "A drop in the first 30 seconds means the packaging promised something the opening didn't deliver instantly. Move the payoff to second 5.",
      watchThis: "The first-30-seconds slope on your retention graph, video over video.",
      causes: [
        {
          cause: "The payoff arrived too late",
          why: "Phase 2's retention repair: a drop in the first 30 seconds means the hook failed, the packaging promised something the opening didn't deliver instantly. The fix is mechanical: move the payoff moment to second 5.",
          fixes: [
            "Open on the payoff: the most visual 3 seconds of the video go first, film the hook last if you have to.",
            "No logo, no \u201chey guys welcome back\u201d, start mid-action (the Playbook's cold start)."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" },
            { label: "The Short-Form Playbook (the five hook structures)", page: "shortform-playbook.html" }
          ]
        },
        {
          cause: "The packaging overpromised",
          why: "The click was earned by a promise the opening didn't keep. Clickbait-shaped packaging buys one click and loses the viewer, and trains the audience not to trust the next title.",
          fixes: [
            "Make the first 30 seconds deliver the title's exact promise, word for word.",
            "Next time, write the hook before the title, the Hook Builder's five structures keep the promise filmable."
          ],
          links: [
            { label: "Hook Builder", page: "hook-builder.html" },
            { label: "Phase 2, YouTube Mastery", page: "phase-2-youtube-mastery.html" }
          ]
        }
      ]
    },
    {
      id: "good-retention-no-subs", label: "Great retention, nobody subscribes",
      desc: "They watch. They don't stay.",
      summary: "Retention without subscribers is usually a missing door (no next video promised) or entertainment without loyalty (one-off topics, no series).",
      watchThis: "Returning viewers vs new viewers, a healthy channel converts new into returning.",
      causes: [
        {
          cause: "No door at the end",
          why: "Phase 1: end with a door, close the loop you opened, then open one more (the next video). Retention into the next video is how channels compound. A video that ends cleanly gives the viewer nothing to subscribe for.",
          fixes: [
            "Script the last 20 seconds: close this loop, open the next one (\u201cif you thought this was wild, next week I'm breaking down\u2026\u201d).",
            "Pin a comment asking the question the video raises, pinned comments double comment rates."
          ],
          links: [
            { label: "Phase 1, The Content Engine (endings that compound)", page: "phase-1-content-engine.html" }
          ]
        },
        {
          cause: "Entertainment without loyalty",
          why: "Phase 2: all-new viewers with no returning = entertainment without loyalty. One-off topics get watched; series get subscribed to. The viewer needs a reason to believe the next video is also for them.",
          fixes: [
            "Build a series format viewers can subscribe to, the Playbook's series formats are the compounding engine.",
            "Give the channel a promise: same lane, weekly. Repetition is what turns viewers into returners."
          ],
          links: [
            { label: "The Short-Form Playbook (series formats that compound)", page: "shortform-playbook.html" },
            { label: "Phase 4, Audience to Community", page: "phase-4-audience-to-community.html" }
          ]
        },
        {
          cause: "Channel packaging is blank",
          why: "Before subscribing, new viewers check the banner, the trailer, and the last five titles. If none of them say what they're signing up for, the subscription never happens, the video did its job, the channel didn't.",
          fixes: [
            "Write a one-line channel promise; put it in the banner and the About section.",
            "Make your last five titles read like episodes of one show, not five different channels."
          ],
          links: [
            { label: "Phase 4, Audience to Community", page: "phase-4-audience-to-community.html" }
          ]
        }
      ]
    },
    {
      id: "sawtooth", label: "Sawtooth curve, sliding down",
      desc: "Re-hooks fire, but the slide continues.",
      summary: "A sawtooth grinding downward is a pacing problem: long unbroken segments. The chapter fix is a pattern interrupt every 30–60 seconds.",
      watchThis: "Whether the teeth bounce back up (re-hooks working) or grind down (pacing failing).",
      causes: [
        {
          cause: "Pacing: long unbroken segments",
          why: "Phase 2's retention repair: sawtooth decline means pacing, long unbroken stretches where nothing changes. The fix is a pattern interrupt every 30–60 seconds in the rewrite: a new angle, a new visual, a new question.",
          fixes: [
            "Add a pattern interrupt every 30–60 seconds: new camera angle, new visual, a question restated.",
            "Run the edit through the Playbook's retention-editing checklist (cuts, captions, interrupts)."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" },
            { label: "The Short-Form Playbook (retention editing)", page: "shortform-playbook.html" }
          ]
        },
        {
          cause: "The video is longer than the idea",
          why: "Phase 2: if viewers leave at 40% consistently, your videos are 40% too long. Teeth that bounce back but keep sinking mean there isn't enough worth staying for, the idea ran out before the runtime did.",
          fixes: [
            "Cut the next video to its engaging core; compress tangents to 20% of their length.",
            "One idea per video, no passengers, script tighter before you film longer."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" }
          ]
        }
      ]
    },
    {
      id: "single-cliff", label: "One sharp cliff mid-video",
      desc: "The shape tells you exactly where to look.",
      summary: "A single cliff means one bad section, a tangent, a slow demo, an off-topic rant. Watch that timestamp, then cut it or compress it to 20%.",
      watchThis: "The exact timestamp of the steepest drop, go watch that moment.",
      causes: [
        {
          cause: "One bad section",
          why: "Phase 2's retention repair: a single cliff means one bad section, a tangent, a slow demo, an off-topic rant. The graph is pointing at the timestamp; the fix is to go watch that exact moment and be honest about it.",
          fixes: [
            "Find the steepest drop, watch that section, then cut it or compress it to 20% length.",
            "If tangents keep causing cliffs, the script is the problem, tighten the outline before filming."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" },
            { label: "Phase 1, The Content Engine (scripting retention)", page: "phase-1-content-engine.html" }
          ]
        }
      ]
    },
    {
      id: "shorts-no-crossover", label: "Shorts pop, long-form doesn't",
      desc: "Two audiences, no bridge.",
      summary: "Shorts and long-form are different businesses sharing a channel. The fix is a funnel: 30-second trailers within 24 hours and pinned comments pointing at the long video's payoff.",
      watchThis: "How many long-form views arrive via the Shorts trailer, build the bridge, then measure it.",
      causes: [
        {
          cause: "No funnel between the formats",
          why: "Phase 2's launch checklist: the long-form video gets a 30-second vertical trailer within 24 hours, free discovery for work already done. Pinned comments double comment rates, and comments are browse-signal fuel. Without the bridge, the Shorts audience never meets the long video.",
          fixes: [
            "Cut a 30-second vertical trailer for every long video within 24 hours of posting.",
            "Pin a comment on the short that points at the long video's payoff, make the click a continuation, not a detour."
          ],
          links: [
            { label: "The Short-Form Playbook (YouTube Shorts playbook)", page: "shortform-playbook.html" },
            { label: "Phase 2, YouTube Mastery (shorts vs long-form)", page: "phase-2-youtube-mastery.html" }
          ]
        },
        {
          cause: "Different games, same channel",
          why: "Shorts want punchy, loopable, high-retention; long-form wins on packaging plus a satisfying watch (Phase 2 / Playbook). One audience rarely auto-converts to the other, the short has to sell the long video's question, not just entertain.",
          fixes: [
            "Make shorts that are trailers for the long video's question, open loops, not standalone snacks.",
            "Use series formats: the short is the episode, the long video is the deep cut."
          ],
          links: [
            { label: "The Short-Form Playbook (series formats that compound)", page: "shortform-playbook.html" }
          ]
        }
      ]
    },
    {
      id: "flat-low", label: "Flat, low retention everywhere",
      desc: "Nothing is catching, yet.",
      summary: "Flat and low with no recovery usually means the topic/packaging promise didn't match what the audience wanted. Under 50 videos, though, the data isn't in yet, that's the tuition phase, not a verdict.",
      watchThis: "Retention trend video-over-video, climbing beats high.",
      causes: [
        {
          cause: "Topic/packaging mismatch at scale",
          why: "When the curve is flat and low across the whole video with no recovery, the promise didn't match what the audience wanted. Phase 2's pivot rule: 50+ videos, flat retention, no outliers, and honestly fixed packaging, then pivot the format or angle (\u201csame topic, new packaging\u201d first, \u201cnew topic\u201d last).",
          fixes: [
            "Repackage the same topic three ways before abandoning the topic.",
            "Run the monthly ritual: rank last month's videos by views-per-subscriber (outliers) and by retention (quality), the overlap is your format."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (when to pivot vs persist)", page: "phase-2-youtube-mastery.html" },
            { label: "The Metrics Glossary (reading the curve)", page: "metrics-glossary.html" }
          ]
        },
        {
          cause: "Still in the tuition phase",
          why: "Phase 2: persist when retention is climbing video-over-video, some videos pop, comments are engaged, and you're under 50 videos. You're in the tuition phase; the data isn't in yet. Flatness before 50 videos is a small sample, not a sentence.",
          fixes: [
            "Ship to 50 before diagnosing flatness as a verdict.",
            "Track the Phase 1 engine metrics, ideas banked, videos shipped, average retention, not subscribers."
          ],
          links: [
            { label: "Phase 1, The Content Engine (the engine metrics)", page: "phase-1-content-engine.html" },
            { label: "Phase 2, YouTube Mastery (when to pivot vs persist)", page: "phase-2-youtube-mastery.html" }
          ]
        }
      ]
    },
    {
      id: "end-collapse", label: "Everyone leaves near the end",
      desc: "Probably normal. Check where it starts.",
      summary: "End collapse is normal, unless it starts before 50%. If viewers consistently leave at 40%, your videos are 40% too long.",
      watchThis: "Where the collapse starts as a percentage of runtime, before or after the payoff.",
      causes: [
        {
          cause: "Normal end collapse",
          why: "Phase 2: end collapse is normal, unless it's before 50%. Viewers leaving once the payoff lands is healthy; the video did its job and they left satisfied.",
          fixes: [
            "Check where the collapse starts: after the payoff, it's healthy, stop worrying.",
            "Move anything that matters (sponsor read, CTA, the door to the next video) before the natural end."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" }
          ]
        },
        {
          cause: "Collapse starting before the halfway mark",
          why: "Phase 2: if viewers leave at 40% consistently, your videos are 40% too long. A collapse that starts early isn't an ending problem, it's a length problem wearing an ending costume.",
          fixes: [
            "Shorten the next video by the dead percentage, if they leave at 40%, make it 40% shorter.",
            "Front-load: move the weakest section's value earlier, or cut the section."
          ],
          links: [
            { label: "Phase 2, YouTube Mastery (retention repair)", page: "phase-2-youtube-mastery.html" }
          ]
        }
      ]
    }
  ];

  var BY_ID = {};
  SYMPTOMS.forEach(function (s) { BY_ID[s.id] = s; });

  /* ---------- validation ---------- */
  function validInput(a) {
    if (!a || typeof a !== "object") return false;
    return SYMPTOM_IDS.indexOf(a.symptom) !== -1 &&
           PLATFORMS.indexOf(a.platform) !== -1 &&
           EXPERIENCE.indexOf(a.experience) !== -1;
  }

  /* ---------- diagnosis ---------- */
  function diagnose(a) {
    if (!validInput(a)) throw new Error("video-doctor: invalid input");
    var s = BY_ID[a.symptom];
    var notes = [];
    if (a.experience === "under-50") {
      notes.push("Tuition phase: under 50 videos, the data isn't in yet (Phase 2). " +
        "Diagnose, fix one thing, ship the next one. don't overhaul the channel on thin data.");
    }
    if (a.symptom === "low-ctr" && a.platform !== "longform") {
      notes.push("On swipe feeds (" + PLATFORM_LABEL[a.platform] + ") the click metric is completion " +
        "rate, not CTR: run this diagnosis on your long-form videos instead, or pick a " +
        "short-form symptom from the Playbook's platform chapters.");
    }
    if (a.symptom === "shorts-no-crossover" && a.platform === "longform") {
      notes.push("Diagnosing from the long-form side: your Shorts audience was built on Shorts. " +
        "The bridge has to be built deliberately. it never forms on its own.");
    }
    return {
      symptom: { id: s.id, label: s.label, desc: s.desc },
      summary: s.summary,
      watchThis: s.watchThis,
      causes: s.causes.map(function (c, i) {
        return {
          rank: i + 1, cause: c.cause, why: c.why,
          fixes: c.fixes.slice(), links: c.links.slice()
        };
      }),
      notes: notes
    };
  }

  /* ---------- browser UI (guarded: engine stays DOM-free for node) ---------- */
  var STORE_KEY = "cge.videodoctor.v1";

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

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderPicker(host) {
    host.innerHTML = "";
    var fs = el("fieldset", "quiz-q");
    var legend = el("legend", null, "What's the symptom?");
    fs.appendChild(legend);
    var grid = el("div", "quiz-opts vd-symptom-grid");
    grid.setAttribute("role", "radiogroup");
    grid.setAttribute("aria-label", "Pick the symptom you see in your analytics");
    SYMPTOMS.forEach(function (s) {
      var lab = el("label", "quiz-opt vd-symptom");
      var radio = el("input");
      radio.type = "radio"; radio.name = "vd-symptom"; radio.value = s.id;
      var wrap = el("span", "vd-symptom-text");
      var strong = el("strong", null, s.label);
      var span = el("span", "muted", s.desc);
      wrap.appendChild(strong); wrap.appendChild(document.createElement("br")); wrap.appendChild(span);
      lab.appendChild(radio); lab.appendChild(wrap);
      grid.appendChild(lab);
    });
    fs.appendChild(grid);
    host.appendChild(fs);
  }

  function renderDiagnosis(host, d, a) {
    host.innerHTML = "";
    var card = el("div", "vd-result");
    var kick = el("p", "vd-result-kicker", "DIAGNOSIS // " + PLATFORM_LABEL[a.platform].toUpperCase());
    card.appendChild(kick);
    card.appendChild(el("h3", null, d.symptom.label));
    card.appendChild(el("p", "vd-summary", d.summary));
    d.notes.forEach(function (n) {
      var note = el("p", "vd-note", n);
      note.setAttribute("role", "note");
      card.appendChild(note);
    });
    var ol = el("ol", "vd-causes");
    d.causes.forEach(function (c) {
      var li = el("li", "vd-cause");
      var head = el("div", "vd-cause-head");
      head.appendChild(el("span", "vd-rank", "Likely cause #" + c.rank));
      head.appendChild(el("h4", null, c.cause));
      li.appendChild(head);
      li.appendChild(el("p", null, c.why));
      var fh = el("p", null);
      var fs = el("strong", null, "Fix it: ");
      fh.appendChild(fs);
      li.appendChild(fh);
      var ful = el("ul", "vd-fixes");
      c.fixes.forEach(function (f) { ful.appendChild(el("li", null, f)); });
      li.appendChild(ful);
      var links = el("p", "vd-links");
      links.appendChild(el("strong", null, "Read next: "));
      c.links.forEach(function (l, i) {
        if (i > 0) links.appendChild(document.createTextNode(" \u00b7 "));
        var an = el("a", null, l.label);
        an.setAttribute("href", l.page);
        links.appendChild(an);
      });
      li.appendChild(links);
      ol.appendChild(li);
    });
    card.appendChild(ol);
    var watch = el("p", "vd-watch");
    watch.appendChild(el("strong", null, "Watch this next: "));
    watch.appendChild(document.createTextNode(d.watchThis));
    card.appendChild(watch);
    var disc = el("p", "muted vd-disclaimer",
      "Thresholds above are creator-reported rules of thumb from the site's chapters: " +
      "never platform-published benchmarks. Your own channel average is the real baseline. " +
      "A diagnostic aid, not financial, legal, or tax advice.");
    card.appendChild(disc);
    host.appendChild(card);
    try { host.setAttribute("tabindex", "-1"); host.focus({ preventScroll: false }); } catch (e) {}
  }

  function init() {
    var pickerHost = document.getElementById("vd-picker");
    var platformSel = document.getElementById("vd-platform");
    var expSel = document.getElementById("vd-experience");
    var btn = document.getElementById("vd-diagnose");
    var reset = document.getElementById("vd-reset");
    var out = document.getElementById("vd-results");
    if (!pickerHost || !platformSel || !expSel || !btn || !out) return;

    renderPicker(pickerHost);
    var store = loadStore();
    if (store.last && validInput(store.last)) {
      var prev = pickerHost.querySelector('input[value="' + store.last.symptom + '"]');
      if (prev) { prev.checked = true; prev.closest("label").classList.add("selected"); }
      platformSel.value = store.last.platform;
      expSel.value = store.last.experience;
      btn.disabled = false;
    }

    pickerHost.addEventListener("change", function (e) {
      var labs = pickerHost.querySelectorAll(".quiz-opt");
      for (var i = 0; i < labs.length; i++) labs[i].classList.remove("selected");
      var lab = e.target.closest("label");
      if (lab) lab.classList.add("selected");
      btn.disabled = !pickerHost.querySelector('input[name="vd-symptom"]:checked');
    });
    /* keyboard: arrow keys move between symptom radios (radiogroup pattern) */
    pickerHost.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowRight" &&
          e.key !== "ArrowUp" && e.key !== "ArrowLeft") return;
      var radios = Array.prototype.slice.call(
        pickerHost.querySelectorAll('input[name="vd-symptom"]'));
      var idx = radios.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      var next = (e.key === "ArrowDown" || e.key === "ArrowRight")
        ? (idx + 1) % radios.length
        : (idx - 1 + radios.length) % radios.length;
      radios[next].focus();
      radios[next].checked = true;
      radios[next].dispatchEvent(new Event("change", { bubbles: true }));
    });

    btn.addEventListener("click", function () {
      var checked = pickerHost.querySelector('input[name="vd-symptom"]:checked');
      if (!checked) return;
      var input = {
        symptom: checked.value,
        platform: platformSel.value,
        experience: expSel.value
      };
      if (!validInput(input)) return;
      saveStore({ last: input });
      renderDiagnosis(out, diagnose(input), input);
    });

    if (reset) reset.addEventListener("click", function () {
      renderPicker(pickerHost);
      platformSel.selectedIndex = 0;
      expSel.selectedIndex = 0;
      btn.disabled = true;
      out.innerHTML = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">◬</span><strong>Nothing diagnosed yet.</strong>Pick the symptom above and the likely causes. ranked, with chapter fixes. land here.</div>';
      saveStore({ last: null });
      btn.disabled = true;
    });
  }

  if (typeof document !== "undefined" && document.readyState !== "loading") {
    init();
  } else if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  return {
    SYMPTOMS: SYMPTOMS, SYMPTOM_IDS: SYMPTOM_IDS,
    PLATFORMS: PLATFORMS, EXPERIENCE: EXPERIENCE,
    PLATFORM_LABEL: PLATFORM_LABEL,
    validInput: validInput, diagnose: diagnose
  };
});
