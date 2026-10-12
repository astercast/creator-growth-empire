/* The Deal Room — browser UI wiring (no pure math here).
 * Storage: localStorage only (keys cge.deal-room.*), no accounts, no network
 * writes. Math lives in window.DealRoom (assets/js/deal-room.js, UMD);
 * benchmarks come from api/v1/calculators.json, scripts/checklists/tiers from
 * api/v1/deal-templates.json. Negotiation aid, not financial/legal advice. */
(function () {
  "use strict";
  var root = document.getElementById("deal-room");
  if (!root || !window.DealRoom) return;
  var D = window.DealRoom;

  var LS = { deals: "cge.deal-room.deals.v1", flags: "cge.deal-room.redflags.v1" };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function store() {
    try {
      return {
        get: function (k, fb) {
          var v = window.localStorage.getItem(k);
          return v === null ? fb : JSON.parse(v);
        },
        set: function (k, v) { window.localStorage.setItem(k, JSON.stringify(v)); }
      };
    } catch (e) { return null; }
  }
  var db = store();

  var cfg = null;   /* calculators.json */
  var tpl = null;   /* deal-templates.json */
  var deals = db ? db.get(LS.deals, []) : [];
  var checkedFlags = db ? db.get(LS.flags, []) : [];

  function save() { if (db) db.set(LS.deals, deals); }

  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
  var USAGE_LABELS = {
    organic: "Organic only", paid30: "Paid ads, 30 days", paid180: "Paid ads, 6 months",
    paid365: "Paid ads, 12 months", perpetual: "Unlimited / perpetual"
  };
  var EXCL_LABELS = { none: "None", 30: "30-day exclusivity", 90: "60–90 day exclusivity", broad: "Broad / category lock" };
  var PAY_LABELS = { 15: "Net 15 or better", 30: "Net 30", 60: "Net 60", 90: "Net 90+" };
  var DELIV_LABELS = { integrated: "Integrated slot", dedicated: "Dedicated video", short: "Short-form video" };

  function scoreDeal(deal) {
    var rc = cfg.sponsorship_rate_card_2026;
    var tier = D.tierOf(+deal.followers || 0);
    var rng = rc.per_video_or_post_by_tier[tier][deal.platform || "youtube"];
    var s = D.scoreOffer(+deal.offer || 0, rng[0], rng[1]);
    s.range = rng; s.tier = tier;
    return s;
  }

  function badge(kind, text) {
    var cls = kind === "good" ? "money" : kind === "bad" ? "hot" : "warn";
    return '<span class="badge ' + cls + '">' + esc(text) + "</span>";
  }

  /* ---------------- 1. deal tracker ---------------- */
  var dealsOut = document.getElementById("dr-deals");
  var filterSel = document.getElementById("dr-filter");

  function nextStatus(s) {
    var i = D.STATUSES.indexOf(s);
    return i >= 0 && i < D.STATUSES.length - 1 ? D.STATUSES[i + 1] : null;
  }

  function renderDeals() {
    var f = filterSel ? filterSel.value : "all";
    var list = deals.filter(function (d) { return f === "all" || d.status === f; });
    var counts = {};
    deals.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
    if (!list.length) {
      dealsOut.innerHTML = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">◫</span>' +
        "<strong>No deals here yet.</strong>" +
        (deals.length ? "Nothing matches this filter — try another status." : "Log your first offer above. Every deal gets scored against the 2026 rate card.") + "</div>";
      return;
    }
    dealsOut.innerHTML = list.map(function (d) {
      var s = scoreDeal(d);
      var kind = s.verdict === "under" ? "bad" : s.verdict === "over" ? "good" : "warn";
      var nx = nextStatus(d.status);
      return '<li class="deal-card"><div class="deal-head"><strong>' + esc(d.brand || "(no brand)") + "</strong>" +
        badge(kind, s.badge) +
        '<span class="badge">' + esc(D.STATUS_LABELS[d.status] || d.status) + "</span></div>" +
        '<p class="muted">' + esc(DELIV_LABELS[d.deliverable] || d.deliverable) + " · " +
        esc(PLATFORM_LABELS[d.platform] || d.platform) + " · " + esc(D.tierLabel(s.tier)) +
        " · offered " + D.fmt(+d.offer || 0) + " (range " + D.fmt(s.range[0]) + "–" + D.fmt(s.range[1]) + ")</p>" +
        '<p class="muted">' + esc(USAGE_LABELS[d.usage] || d.usage) + " · " + esc(EXCL_LABELS[d.excl] || "") +
        " · " + esc(PAY_LABELS[d.payTerms] || "") + (d.timeline ? " · due " + esc(d.timeline) : "") + "</p>" +
        (d.notes ? '<p class="muted">“' + esc(d.notes) + "”</p>" : "") +
        '<div class="deal-actions">' +
        (nx ? '<button type="button" class="btn btn-ghost" data-advance="' + esc(d.id) + '">Advance → ' + esc(D.STATUS_LABELS[nx]) + "</button>" : "") +
        '<button type="button" class="btn btn-ghost" data-del="' + esc(d.id) + '">Delete</button></div></li>';
    }).join("");
  }

  dealsOut.addEventListener("click", function (e) {
    var adv = e.target.getAttribute && e.target.getAttribute("data-advance");
    var del = e.target.getAttribute && e.target.getAttribute("data-del");
    if (adv) {
      deals.forEach(function (d) { if (d.id === adv) d.status = nextStatus(d.status) || d.status; });
      save(); renderDeals(); refreshMemoSelect();
    } else if (del) {
      deals = deals.filter(function (d) { return d.id !== del; });
      save(); renderDeals(); refreshMemoSelect();
    }
  });
  if (filterSel) filterSel.addEventListener("change", renderDeals);

  var form = document.getElementById("dr-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var deal = {
      id: "dr-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36),
      brand: v("dr-brand"), platform: v("dr-platform"),
      followers: Math.max(0, parseFloat(v("dr-followers")) || 0),
      deliverable: v("dr-deliverable"),
      views: Math.max(0, parseFloat(v("dr-views")) || 0),
      offer: Math.max(0, parseFloat(v("dr-offer")) || 0),
      usage: v("dr-usage"), excl: v("dr-excl"), payTerms: v("dr-pay"),
      timeline: v("dr-timeline"), notes: v("dr-notes"),
      status: "offer", createdAt: new Date().toISOString()
    };
    deals.unshift(deal);
    save(); renderDeals(); refreshMemoSelect();
    form.reset();
    var live = document.getElementById("dr-confirm");
    live.textContent = "Deal logged — " + (deal.brand || "untitled") + " scored " +
      scoreDeal(deal).badge + " against the rate card.";
  });

  /* ---------------- 2. usage-rights pricing ---------------- */
  var usageOut = document.getElementById("dr-usage-out");
  function renderUsage() {
    var base = Math.max(0, parseFloat(document.getElementById("dr-base").value) || 0);
    var tierId = document.getElementById("dr-tier").value;
    var tiers = tpl.usage_rights_tiers;
    var u = D.priceUsage(base, tierId, tiers);
    var tier = tiers.filter(function (t) { return t.id === tierId; })[0] || {};
    var html = '<div class="calc-out"><div class="lbl">Usage line item — ' + esc(tier.label || "") + "</div>";
    if (tierId === "whitelisting") {
      var rate = Math.max(0, parseFloat(document.getElementById("dr-white-rate").value) || 0);
      var months = Math.max(0, parseFloat(document.getElementById("dr-white-months").value) || 0);
      var total = rate * months;
      html += '<div class="big">' + D.fmt(rate) + "/mo</div>" +
        '<div class="range">' + D.fmt(total) + " for " + months + " month(s) — separate line, monthly, revocable.</div></div>";
    } else if (u && u.addonLo !== null) {
      var addon = u.addonHi === null || u.addonHi === u.addonLo
        ? D.fmt(u.addonLo)
        : D.fmt(u.addonLo) + "–" + D.fmt(u.addonHi);
      var totalTxt = u.totalHi === null || u.totalHi === u.totalLo
        ? D.fmt(u.totalLo)
        : D.fmt(u.totalLo) + "–" + D.fmt(u.totalHi);
      html += '<div class="big">' + esc(addon) + "</div>" +
        '<div class="range">Line item on top of the ' + D.fmt(base) + " post fee · counter total " + esc(totalTxt) + ".</div></div>";
    } else {
      html += '<div class="big">No safe number</div>' +
        '<div class="range">' + esc(u ? u.note : "") + "</div></div>";
    }
    html += '<p class="muted">' + esc(tier.basis || "") +
      (tier.reported ? ' <strong>Reported range — not gospel.</strong>' : "") + "</p>";
    usageOut.innerHTML = html;
  }
  document.getElementById("dr-usage-form").addEventListener("input", renderUsage);
  document.getElementById("dr-usage-form").addEventListener("submit", function (e) { e.preventDefault(); renderUsage(); });
  document.getElementById("dr-tier").addEventListener("change", function () {
    document.getElementById("dr-white-extra").style.display =
      document.getElementById("dr-tier").value === "whitelisting" ? "" : "none";
  });

  /* ---------------- 3. negotiation scripts ---------------- */
  var scriptsOut = document.getElementById("dr-scripts");
  var scriptCtx = document.getElementById("dr-script-ctx");
  function ctxVars() {
    var out = {};
    Array.prototype.forEach.call(scriptCtx.querySelectorAll("input"), function (el) {
      out[el.name] = el.value.trim();
    });
    return out;
  }
  function renderScripts() {
    var vars = ctxVars();
    scriptsOut.innerHTML = tpl.negotiation_scripts.map(function (s) {
      return '<div class="script-card"><h3>' + esc(s.title) + "</h3>" +
        '<p class="muted"><strong>Use when:</strong> ' + esc(s.when) + "</p>" +
        '<blockquote class="script-text">' + esc(D.renderScript(s, vars)) + "</blockquote>" +
        '<p class="muted"><strong>Why this works:</strong> ' + esc(s.tip) + "<br>" +
        '<strong>Grounded in:</strong> ' + esc(s.grounded_in) + "</p>" +
        '<button type="button" class="btn btn-ghost" data-copy-script="' + esc(s.id) + '">Copy script</button></div>';
    }).join("");
  }
  scriptCtx.addEventListener("input", renderScripts);
  function announce(msg) {
    var live = document.getElementById("dr-copy-live");
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
  scriptsOut.addEventListener("click", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-copy-script");
    if (!id) return;
    var s = tpl.negotiation_scripts.filter(function (x) { return x.id === id; })[0];
    if (s) copyText(D.renderScript(s, ctxVars()), "Script copied — paste it into your reply.");
  });

  /* ---------------- 4. red-flag checklist ---------------- */
  var flagsOut = document.getElementById("dr-flags-out");
  var flagsForm = document.getElementById("dr-flags");
  function renderFlags() {
    flagsForm.innerHTML = tpl.red_flags.map(function (f) {
      var sev = f.severity === "walk_away" ? "bad" : "warn";
      return '<label class="flag-row"><input type="checkbox" name="flag" value="' + esc(f.id) + '"' +
        (checkedFlags.indexOf(f.id) !== -1 ? " checked" : "") + ">" +
        "<span><strong>" + esc(f.title) + "</strong> " + badge(sev, f.severity === "walk_away" ? "WALK-AWAY" : "MAJOR") +
        '<br><span class="muted">' + esc(f.detail) + "<br><strong>Fix:</strong> " + esc(f.fix) + "</span></span></label>";
    }).join("");
    scoreFlags();
  }
  function scoreFlags() {
    checkedFlags = [];
    Array.prototype.forEach.call(flagsForm.querySelectorAll("input:checked"), function (el) {
      checkedFlags.push(el.value);
    });
    if (db) db.set(LS.flags, checkedFlags);
    var r = D.redFlagScore(checkedFlags, tpl.red_flags);
    var kind = r.verdict === "clean" ? "good" : r.verdict === "caution" ? "warn" : "bad";
    flagsOut.innerHTML = '<div class="calc-out"><div class="lbl">Deal score</div><div class="big">' +
      badge(kind, r.verdict === "clean" ? "CLEAN" : r.verdict === "caution" ? "CAUTION" : "WALK AWAY") + "</div>" +
      '<div class="range">' + esc(r.verdictText) + (r.score ? " (" + r.score + " points)" : "") + "</div></div>" +
      '<p class="muted">' + esc(tpl.scoring.note) + "</p>";
  }
  flagsForm.addEventListener("change", scoreFlags);

  /* ---------------- 5. deal memo ---------------- */
  var memoSel = document.getElementById("dr-memo-deal");
  var memoOut = document.getElementById("dr-memo-out");
  function refreshMemoSelect() {
    var cur = memoSel.value;
    memoSel.innerHTML = deals.length
      ? deals.map(function (d) {
          return '<option value="' + esc(d.id) + '">' + esc(d.brand || "(no brand)") + " — " +
            esc(D.STATUS_LABELS[d.status]) + " — " + D.fmt(+d.offer || 0) + "</option>";
        }).join("")
      : '<option value="">No deals logged yet</option>';
    if (cur && deals.some(function (d) { return d.id === cur; })) memoSel.value = cur;
    renderMemo();
  }
  function renderMemo() {
    var d = deals.filter(function (x) { return x.id === memoSel.value; })[0];
    if (!d) {
      memoOut.innerHTML = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">▦</span>' +
        "<strong>No deal selected.</strong>Log a deal above and it will appear here.</div>";
      return;
    }
    var scored = scoreDeal(d);
    var checkedTitles = tpl.red_flags.filter(function (f) { return checkedFlags.indexOf(f.id) !== -1; })
      .map(function (f) { return f.title; });
    var r = D.redFlagScore(checkedFlags, tpl.red_flags);
    var memo = D.dealMemo(d, scored, { verdictText: r.verdictText, checkedTitles: checkedTitles });
    memoOut.innerHTML = "<pre class='memo-pre'>" + esc(memo) + "</pre>";
    memoOut._text = memo;
  }
  memoSel.addEventListener("change", renderMemo);
  document.getElementById("dr-copy-memo").addEventListener("click", function () {
    if (memoOut._text) copyText(memoOut._text, "Deal memo copied — paste it into your records.");
  });
  document.getElementById("dr-download-memo").addEventListener("click", function () {
    if (!memoOut._text) return;
    var blob = new Blob([memoOut._text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "deal-memo-" + (memoSel.options[memoSel.selectedIndex].text.split(" — ")[0] || "deal")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".txt";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    announce("Deal memo downloaded as a text file.");
  });

  /* ---------------- data boot ---------------- */
  function boot() {
    Promise.all([
      fetch("api/v1/calculators.json").then(function (r) { return r.json(); }),
      fetch("api/v1/deal-templates.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      cfg = res[0]; tpl = res[1];
      renderDeals(); renderUsage(); renderScripts(); renderFlags(); refreshMemoSelect();
    }).catch(function () {
      root.innerHTML = '<div class="error-state" role="alert">' +
        "<strong>CONFIG LOAD FAILED</strong>" +
        "<p>Could not load the rate card or deal templates (<code>api/v1/calculators.json</code>, <code>api/v1/deal-templates.json</code>). " +
        "Check that <code>api/v1/</code> is deployed alongside this page, then try again.</p>" +
        '<button type="button" class="btn btn-ghost" data-retry>Try again</button></div>';
    });
  }
  root.addEventListener("click", function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-retry") !== null) boot();
  });
  boot();
})();
