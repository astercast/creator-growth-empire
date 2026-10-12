/* The Negotiation Kit — browser UI wiring (no pure math here).
 * Math lives in window.NegotiationKit (assets/js/negotiation-kit.js, UMD);
 * benchmarks come from data/v1/calculators.json, reply scripts from
 * data/v1/deal-templates.json (negotiation_kit_scripts). The walk-away
 * panel reads the Deal Room's tracker records from this browser's
 * localStorage (read-only, key cge.deal-room.deals.v1) — nothing is
 * uploaded, no accounts. Negotiation aid, not financial/legal advice. */
(function () {
  "use strict";
  var root = document.getElementById("negotiation-kit");
  if (!root || !window.NegotiationKit) return;
  var K = window.NegotiationKit;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(id) { return Math.max(0, parseFloat(document.getElementById(id).value) || 0); }
  function val(id) { return document.getElementById(id).value; }
  function announce(msg) {
    var live = document.getElementById("nk-live");
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 30);
  }
  function copyText(text, okMsg) {
    function done() { announce(okMsg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { announce("Copy failed — select the text manually."); }
      document.body.removeChild(ta);
    }
  }

  var cfg = null;   /* calculators.json */
  var tpl = null;   /* deal-templates.json */
  var lastCounter = null;
  var lastWalk = null;

  function readPipelineDeals() {
    try {
      var v = window.localStorage.getItem("cge.deal-room.deals.v1");
      var parsed = v ? JSON.parse(v) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function counterInput() {
    return {
      brand: val("nk-brand").trim(),
      platform: val("nk-platform"),
      deliverable: val("nk-deliverable"),
      followers: num("nk-followers"),
      expectedViews: num("nk-views"),
      offer: num("nk-offer"),
      niche: val("nk-niche") || null,
      usage: val("nk-usage"),
      whitelistingMonths: num("nk-wl-months"),
      exclusivity: { scope: val("nk-ex-scope"), months: num("nk-ex-months") },
      postCount: Math.max(1, num("nk-posts") || 1),
      creatorFloor: num("nk-floor")
    };
  }

  function badgeFor(verdict) {
    var cls = verdict === "under" ? "hot" : verdict === "over" ? "money" : "warn";
    var txt = verdict === "under" ? "UNDERPAID" : verdict === "over" ? "STRONG" : "FAIR";
    return '<span class="badge ' + cls + '">' + txt + "</span>";
  }

  /* ---------------- 1. counter builder ---------------- */
  var counterOut = document.getElementById("nk-counter-out");
  function renderCounter() {
    var res = K.buildCounter(counterInput(), cfg);
    lastCounter = res.ok ? res : null;
    var errBox = document.getElementById("nk-errors");
    if (!res.ok) {
      errBox.textContent = res.errors.join(" ");
      counterOut.innerHTML = "";
      renderWalk();
      return;
    }
    errBox.textContent = "";
    var c = res;
    var ev = c.evidence;
    var html = '<div class="calc-out nk-counter-card"><div class="lbl">Your counter — ' +
      esc(c.tierLabel) + " · " + esc(K.PLATFORM_LABELS[c.input.platform]) + "</div>" +
      '<div class="big">' + esc(K.fmtRange(c.total)) + "</div>" +
      '<div class="range">The offer of ' + K.fmt(c.input.offer) + " reads " + badgeFor(c.verdict) +
      " against your benchmark range of " + esc(K.fmtRange(c.range)) +
      (c.nicheLabel ? " (" + esc(c.nicheLabel) + " ×" + c.nicheMult + ")" : "") +
      ". Expected landing zone: " + esc(K.fmtRange(c.expectedClose)) +
      " — creators list ~23% above what they accept.</div></div>";

    html += '<div class="nk-table-wrap"><table class="nk-table"><caption class="muted" style="text-align:left;padding:0.6rem 0.8rem">' +
      "How the counter is built — every line with its basis. Usage, whitelisting, and exclusivity are separate lines, never folded into the post fee.</caption>" +
      "<thead><tr><th scope=\"col\">Line</th><th scope=\"col\">Amount</th><th scope=\"col\">Basis</th></tr></thead><tbody>";
    c.lines.forEach(function (l) {
      html += '<tr><th scope="row">' + esc(l.label) + '<br><span class="muted">' + esc(l.source) +
        '</span></th><td>' + esc(K.fmtRange(l.range)) + "</td><td>" + esc(l.basis) + "</td></tr>";
    });
    html += '<tr class="nk-total"><th scope="row">Counter total</th><td>' + esc(K.fmtRange(c.total)) +
      "</td><td>sum of lines</td></tr></tbody></table></div>";

    if (c.cpmCheck) {
      html += '<p class="muted">Implied CPM check: ' + K.fmt(c.input.offer) + " at " +
        Number(c.input.expectedViews).toLocaleString("en-US") + " expected views = <strong>$" +
        c.cpmCheck.implied.toFixed(2) + "</strong> per 1,000 views — " + esc(c.cpmCheck.position) +
        " the $" + c.cpmCheck.range[0] + "–$" + c.cpmCheck.range[1] + " band (" +
        esc(c.cpmCheck.source) + " · " + esc(c.cpmCheck.basis) + ").</p>";
    }
    if (c.exclusivityFlag) {
      html += '<div class="nk-flag" role="note"><strong>Exclusivity flag:</strong> ' + esc(c.exclusivityFlag) + "</div>";
    }

    html += '<h3>The evidence behind the range</h3><div class="nk-evidence">';
    if (ev.formatQuote) {
      html += '<div class="nk-ev-card"><div class="lbl">Typical quote — ' + esc(ev.formatQuote.label) +
        '</div><div class="big">' + K.fmt(ev.formatQuote.quoted) + '</div><p>' +
        esc(ev.formatQuote.source) + " · " + esc(ev.formatQuote.basis) +
        ". What creators quote for this format — an ask, not a close.</p></div>";
    }
    if (ev.typicalAsk) {
      html += '<div class="nk-ev-card"><div class="lbl">Typical ask — ' + esc(ev.typicalAsk.band) +
        '</div><div class="big">' + K.fmt(ev.typicalAsk.ask) + '</div><p>' +
        esc(ev.typicalAsk.source) + " · " + esc(ev.typicalAsk.basis) +
        ". What creators at this size typically ask.</p></div>";
    }
    if (ev.modeledFeedPost) {
      html += '<div class="nk-ev-card nk-ev-modeled"><div class="lbl">Modeled cross-check — ' +
        esc(ev.modeledFeedPost.label) + ' feed post</div><div class="big">' +
        esc(K.fmtRange(ev.modeledFeedPost.range)) + '</div><p>' +
        esc(ev.modeledFeedPost.source) + " · " + esc(ev.modeledFeedPost.basis) +
        ". A source's planning model for one Instagram feed post — shown separately, never blended into the reported figures.</p></div>";
    }
    if (!ev.formatQuote && !ev.typicalAsk && !ev.modeledFeedPost) {
      html += '<p class="muted">No quoted-price evidence maps honestly to this format and size — ' +
        "the kit shows none rather than stretch a benchmark. The tier range above is the evidence.</p>";
    }
    html += "</div>";
    html += c.notes.map(function (n) { return '<p class="muted">' + esc(n) + "</p>"; }).join("");
    html += '<p class="muted">' + esc(c.disclaimer) + "</p>";
    counterOut.innerHTML = html;
    renderScripts();
    renderWalk();
    renderBrief();
  }

  /* ---------------- 2. reply scripts ---------------- */
  var scriptsOut = document.getElementById("nk-scripts");
  var scriptState = {};
  function scriptVars() {
    var extra = {
      brand: val("nk-brand").trim(),
      invoice_amount: document.getElementById("nk-inv-amount").value.trim(),
      invoice_date: document.getElementById("nk-inv-date").value.trim(),
      days_overdue: document.getElementById("nk-inv-days").value.trim()
    };
    if (!lastCounter) return extra;
    var built = K.replyVars(lastCounter, extra);
    return built.ok ? built.vars : extra;
  }
  function renderScripts() {
    if (!tpl || !tpl.negotiation_kit_scripts) return;
    var vars = scriptVars();
    scriptsOut.innerHTML = tpl.negotiation_kit_scripts.map(function (s) {
      var rendered = K.renderReply(s, vars);
      var edited = scriptState[s.id];
      var subject = edited && edited.subject !== undefined ? edited.subject : rendered.subject;
      var body = edited && edited.body !== undefined ? edited.body : rendered.body;
      return '<details class="nk-script"><summary><strong>' + esc(s.title) + '</strong> ' +
        '<span class="muted">— ' + esc(s.when) + "</span></summary>" +
        '<div class="nk-script-body"><label>Subject <input type="text" data-nk-subject="' + esc(s.id) +
        '" value="' + esc(subject) + '"></label>' +
        '<label>Reply — edit freely, it sends as written<textarea rows="12" data-nk-body="' +
        esc(s.id) + '">' + esc(body) + "</textarea></label>" +
        '<p class="muted"><strong>Why this works:</strong> ' + esc(s.tip) + "<br><strong>Grounded in:</strong> " +
        esc(s.grounded_in) + "</p>" +
        '<div class="nk-actions"><button type="button" class="btn btn-ghost" data-nk-copy="' + esc(s.id) +
        '">Copy reply</button>' +
        '<button type="button" class="btn btn-ghost" data-nk-reset="' + esc(s.id) +
        '">Reset to the built version</button></div></div></details>';
    }).join("");
  }
  scriptsOut.addEventListener("input", function (e) {
    var sid = e.target.getAttribute && (e.target.getAttribute("data-nk-body") || e.target.getAttribute("data-nk-subject"));
    if (!sid) return;
    var rec = scriptState[sid] || (scriptState[sid] = {});
    if (e.target.getAttribute("data-nk-body")) rec.body = e.target.value;
    else rec.subject = e.target.value;
  });
  scriptsOut.addEventListener("click", function (e) {
    var copyId = e.target.getAttribute && e.target.getAttribute("data-nk-copy");
    var resetId = e.target.getAttribute && e.target.getAttribute("data-nk-reset");
    if (copyId) {
      var subj = scriptsOut.querySelector('[data-nk-subject="' + copyId + '"]');
      var bod = scriptsOut.querySelector('[data-nk-body="' + copyId + '"]');
      copyText("Subject: " + (subj ? subj.value : "") + "\n\n" + (bod ? bod.value : ""),
        "Reply copied — paste it into your email thread.");
    }
    if (resetId) {
      delete scriptState[resetId];
      renderScripts();
      announce("Script reset to the version built from your numbers.");
    }
  });
  ["nk-inv-amount", "nk-inv-date", "nk-inv-days"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () {
      Object.keys(scriptState).forEach(function (k) {
        if (k === "late_payment_reply") delete scriptState[k];
      });
      renderScripts();
    });
  });

  /* ---------------- 3. walk-away panel ---------------- */
  var walkOut = document.getElementById("nk-walk-out");
  function renderWalk() {
    if (!cfg) return;
    var deals = readPipelineDeals();
    var res = K.walkAwayPanel(counterInput(), deals, cfg);
    lastWalk = res.ok ? res : null;
    if (!res.ok) { walkOut.innerHTML = ""; return; }
    var p = res.pipeline;
    var stanceCls = res.stance === "below" ? "hot" : res.stance === "at_floor" ? "warn" : "money";
    var stanceTxt = res.stance === "below" ? "BELOW WALK-AWAY"
      : res.stance === "at_floor" ? "AT YOUR FLOOR" : "WORKABLE";
    var html = '<div class="calc-out"><div class="lbl">Know your walk-away</div>' +
      '<div class="big">' + K.fmt(res.walkAway) + ' <span class="badge ' + stanceCls + '">' + stanceTxt + "</span></div>" +
      '<div class="range">' + esc(res.action) + "</div></div>";
    html += '<div class="nk-pipe">' +
      '<div class="nk-stat"><div class="k">Deals on file</div><div class="v">' + p.totalDeals + '</div><div class="s">from your Deal Room tracker, this browser</div></div>' +
      '<div class="nk-stat"><div class="k">Committed</div><div class="v">' + K.fmt(p.committed) + '</div><div class="s">signed + delivered + paid</div></div>' +
      '<div class="nk-stat"><div class="k">Paid</div><div class="v">' + K.fmt(p.paidTotal) + '</div><div class="s">' +
      (p.avgPaid !== null ? "average paid deal " + K.fmt(p.avgPaid) : "no paid deals yet") + '</div></div>' +
      '<div class="nk-stat"><div class="k">Still open</div><div class="v">' + p.openCount + '</div><div class="s">offers + negotiating</div></div></div>';
    html += res.reasons.map(function (r) { return '<p class="muted">' + esc(r) + "</p>"; }).join("");
    html += '<p class="muted">' + esc(res.disclaimer) + "</p>";
    walkOut.innerHTML = html;
    renderBrief();
  }

  /* ---------------- 4. the brief ---------------- */
  var briefOut = document.getElementById("nk-brief-out");
  function renderBrief() {
    if (!lastCounter) { briefOut.innerHTML = ""; return; }
    var b = K.exportBrief(lastCounter, lastWalk);
    if (!b.ok) { briefOut.innerHTML = ""; return; }
    briefOut.innerHTML = "<pre class='memo-pre'>" + esc(b.text) + "</pre>";
    briefOut._text = b.text;
  }
  document.getElementById("nk-copy-brief").addEventListener("click", function () {
    if (briefOut._text) copyText(briefOut._text, "Negotiation brief copied — paste it into your records.");
    else announce("Build the counter first — the brief follows your numbers.");
  });
  document.getElementById("nk-download-brief").addEventListener("click", function () {
    if (!briefOut._text) { announce("Build the counter first — the brief follows your numbers."); return; }
    var blob = new Blob([briefOut._text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "negotiation-brief-" + (val("nk-brand").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "deal") + ".txt";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    announce("Negotiation brief downloaded as a text file.");
  });

  /* ---------------- boot ---------------- */
  var form = document.getElementById("nk-form");
  form.addEventListener("submit", function (e) { e.preventDefault(); scriptState = {}; renderCounter(); });
  form.addEventListener("input", function () { renderCounter(); });

  function boot() {
    Promise.all([
      fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
      fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      cfg = res[0]; tpl = res[1];
      renderCounter();
    }).catch(function () {
      root.innerHTML = '<div class="error-state" role="alert">' +
        "<strong>CONFIG LOAD FAILED</strong>" +
        "<p>Could not load the rate card or reply scripts (<code>data/v1/calculators.json</code>, " +
        "<code>data/v1/deal-templates.json</code>). Check that <code>data/v1/</code> is deployed " +
        "alongside this page, then try again.</p>" +
        '<button type="button" class="btn btn-ghost" data-retry>Try again</button></div>';
    });
  }
  root.addEventListener("click", function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-retry") !== null) boot();
  });
  boot();
})();
