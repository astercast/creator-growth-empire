/* Hook Builder: one topic -> five filmed-ready hook variants, one per structure.
   Flip-through card deck with full keyboard support and ARIA.
   Craft templates from the Short-Form Playbook chapter, technique, not platform data. */
(function () {
  "use strict";

  var form = document.getElementById("hb-form");
  var topicInput = document.getElementById("hb-topic");
  var out = document.getElementById("hb-results");
  if (!form || !topicInput || !out) return;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* One short clause of the topic for templates (first clause, ~70 chars). */
  function stub(idea) {
    var s = String(idea).split(/[.!?;:,]/)[0].trim();
    if (s.length > 70) s = s.slice(0, 70).trim() + "\u2026";
    return s;
  }

  function lowerFirst(s) {
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  var STRUCTURES = [
    {
      id: "open-loop",
      name: "The Open Loop",
      desc: "State a payoff, withhold the answer. The brain hates unfinished patterns, the loop closes only if they keep watching.",
      formula: "I [did X]: and [surprising result] is at the end.",
      variant: function (t, s) {
        return "\u201CI tried " + lowerFirst(s) + ": and one result broke the experiment. Watch to the end.\u201D";
      },
      example: "\u201CI posted at 3am for 30 days. one video broke the experiment.\u201D",
      tip: "Be specific about the payoff and vague about the answer. \u201CSomething amazing happened\u201D is noise; \u201Cone thing changed my channel\u201D is a loop."
    },
    {
      id: "cold-start",
      name: "The Cold Start",
      desc: "Begin mid-action: hands already moving, the result already on screen, you mid-sentence. No logo, no \u201Chey guys welcome back.\u201D",
      formula: "[Mid-action, already talking:] Forget the intro, [topic].",
      variant: function (t, s) {
        return "\u201CForget the intro: " + lowerFirst(s) + ". Watch this.\u201D";
      },
      example: "\u201CForget the intro: this $30 mic beat the $300 one. Listen.\u201D",
      tip: "Film the hook last if you have to: shoot the most visual 3 seconds of the video, then put it first."
    },
    {
      id: "contrarian",
      name: "The Contrarian Take",
      desc: "A clean contradiction gives the viewer a reason to stay: either you're wrong (they'll comment) or they're wrong (they'll watch). Make it defensible, not bait.",
      formula: "Everything you've been told about [X] is backwards.",
      variant: function (t, s) {
        return "\u201CEverything you've been told about " + lowerFirst(s) + " is backwards.\u201D";
      },
      example: "\u201CEverything you've been told about posting daily is backwards.\u201D",
      tip: "You must actually argue the take in the video. A contrarian hook with a conventional video reads as clickbait and kills trust."
    },
    {
      id: "numbered",
      name: "The Numbered Promise",
      desc: "A numbered list is a micro-series inside one video: each item is a mini-payoff and the finale is a second hook. Strongest for how-to and educational content.",
      formula: "3 [things/mistakes] about [X], #2 is the one that matters.",
      variant: function (t, s) {
        return "\u201C3 mistakes that are killing your " + lowerFirst(s) + ": #2 is why you're stuck.\u201D";
      },
      example: "\u201C3 mistakes killing your retention, #2 is why you're stuck.\u201D",
      tip: "Actually rank them. If #2 isn't the strongest item, the structure collapses. put your best payoff in the promised slot."
    },
    {
      id: "question",
      name: "The Question as Hook",
      desc: "Ask the exact question the video answers, out loud, in the first line. The question is a contract: the viewer stays to collect the answer, and retention spikes at the reveal.",
      formula: "Why do some people [win at X] while everyone else [loses]?",
      variant: function (t, s) {
        return "\u201CWhy do some people nail " + lowerFirst(s) + " while everyone else struggles?\u201D";
      },
      example: "\u201CWhy do some shorts get 10x the views of identical ones?\u201D",
      tip: "Answer the question fully before the video ends. An unanswered hook question is the fastest way to train viewers to swipe early next time."
    }
  ];

  var current = 0;
  var cards = [];
  var dotsWrap = null;
  var announcer = null;

  function show(i, focusCard) {
    current = (i + STRUCTURES.length) % STRUCTURES.length;
    cards.forEach(function (card, idx) {
      var active = idx === current;
      card.hidden = !active;
      card.setAttribute("aria-label", (idx + 1) + " of " + STRUCTURES.length);
    });
    if (dotsWrap) {
      Array.prototype.forEach.call(dotsWrap.children, function (dot, idx) {
        var active = idx === current;
        dot.setAttribute("aria-current", active ? "true" : "false");
        dot.classList.toggle("hb-dot-active", active);
      });
    }
    if (announcer) {
      announcer.textContent = "Card " + (current + 1) + " of " + STRUCTURES.length + ": " + STRUCTURES[current].name;
    }
    if (focusCard && cards[current]) {
      cards[current].setAttribute("tabindex", "-1");
      cards[current].focus({ preventScroll: true });
    }
  }

  function copyVariant(text, btn) {
    function done() {
      var orig = btn.textContent;
      btn.textContent = "Copied \u2713";
      setTimeout(function () { btn.textContent = orig; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  }

  function build(topic) {
    var s = stub(topic);
    out.innerHTML = "";
    cards = [];

    var deck = document.createElement("div");
    deck.className = "hb-deck";
    deck.setAttribute("role", "region");
    deck.setAttribute("aria-roledescription", "carousel");
    deck.setAttribute("aria-label", "Hook formula cards for: " + topic);
    deck.setAttribute("tabindex", "0");

    var track = document.createElement("div");
    track.className = "hb-track";

    STRUCTURES.forEach(function (st, idx) {
      var variantText = st.variant(topic, s).replace(/^[\u201C"]|[\u201D"]$/g, "");
      var card = document.createElement("article");
      card.className = "hb-card";
      card.setAttribute("role", "group");
      card.setAttribute("aria-roledescription", "slide");
      card.setAttribute("aria-label", (idx + 1) + " of " + STRUCTURES.length);
      if (idx !== 0) card.hidden = true;
      card.innerHTML =
        '<p class="hb-kicker">Structure ' + (idx + 1) + " of " + STRUCTURES.length + ": " + esc(st.name) + "</p>" +
        "<h3>" + esc(st.name) + "</h3>" +
        '<p class="hb-desc">' + esc(st.desc) + "</p>" +
        '<blockquote class="hb-variant"><span class="hb-variant-label">Your hook:</span> ' + esc(st.variant(topic, s)) + "</blockquote>" +
        '<p class="hb-formula"><strong>Formula:</strong> <code>' + esc(st.formula) + "</code></p>" +
        '<p class="hb-example"><strong>Worked example:</strong> ' + esc(st.example) + "</p>" +
        '<p class="hb-tip"><strong>Delivery tip:</strong> ' + esc(st.tip) + "</p>" +
        '<button type="button" class="btn btn-secondary hb-copy">Copy hook</button>';
      var btn = card.querySelector(".hb-copy");
      btn.addEventListener("click", function () { copyVariant(variantText, btn); });
      track.appendChild(card);
      cards.push(card);
    });

    deck.appendChild(track);

    var controls = document.createElement("div");
    controls.className = "hb-controls";
    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn btn-secondary";
    prev.textContent = "\u2190 Prev";
    prev.setAttribute("aria-label", "Previous hook structure");
    var next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn-secondary";
    next.textContent = "Next \u2192";
    next.setAttribute("aria-label", "Next hook structure");
    prev.addEventListener("click", function () { show(current - 1, false); });
    next.addEventListener("click", function () { show(current + 1, false); });

    dotsWrap = document.createElement("div");
    dotsWrap.className = "hb-dots";
    dotsWrap.setAttribute("role", "group");
    dotsWrap.setAttribute("aria-label", "Choose hook structure");
    STRUCTURES.forEach(function (st, idx) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hb-dot" + (idx === 0 ? " hb-dot-active" : "");
      dot.setAttribute("aria-label", "Go to structure " + (idx + 1) + ": " + st.name);
      dot.setAttribute("aria-current", idx === 0 ? "true" : "false");
      dot.textContent = String(idx + 1);
      dot.addEventListener("click", function () { show(idx, false); });
      dotsWrap.appendChild(dot);
    });

    controls.appendChild(prev);
    controls.appendChild(dotsWrap);
    controls.appendChild(next);
    deck.appendChild(controls);

    announcer = document.createElement("p");
    announcer.className = "visually-hidden";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("role", "status");
    deck.appendChild(announcer);

    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault(); show(current + 1, false);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault(); show(current - 1, false);
      } else if (e.key === "Home") {
        e.preventDefault(); show(0, false);
      } else if (e.key === "End") {
        e.preventDefault(); show(STRUCTURES.length - 1, false);
      }
    });

    out.appendChild(deck);
    show(0, false);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var topic = topicInput.value.trim();
    if (!topic) {
      topicInput.focus();
      return;
    }
    build(topic);
    var deck = out.querySelector(".hb-deck");
    if (deck) deck.focus({ preventScroll: true });
  });
})();
