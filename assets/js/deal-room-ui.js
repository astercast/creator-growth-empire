/* The Deal Room 2.0 — browser UI wiring (no pure math here).
 * Storage: localStorage only (keys cge.deal-room.*), no accounts, no network
 * writes. Math lives in window.DealRoom (assets/js/deal-room.js, UMD);
 * benchmarks come from data/v1/calculators.json, scripts/checklists/tiers from
 * data/v1/deal-templates.json, the Algorithm Watch digest from
 * data/v1/changes.json. Negotiation aid, not financial/legal advice. */
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
  var feed = null;  /* changes.json (Algorithm Watch) — optional, digest only */
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
    return D.scoreDeal(deal, cfg.sponsorship_rate_card_2026);
  }

  function quotedLine(deal) {
    var qc = D.quotedPriceCheck(deal, cfg.sponsorship_quoted_prices_2026);
    if (!qc.formatQuote) return "";
    var q = qc.formatQuote;
    var pct = q.ratio === null ? "" :
      " — this offer is " + Math.round(q.ratio * 100) + "% of the typical quote";
    return '<p class="muted">Typical quote for a ' + esc(q.label.toLowerCase()) + ": <strong>" +
      D.fmt(q.quoted) + "</strong> (" + esc(q.source) + " · reported)" + esc(pct) +
      ". Asking prices, not closing prices.</p>";
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
      renderPipeline();
      return;
    }
    dealsOut.innerHTML = list.map(function (d) {
      var s = scoreDeal(d);
      var kind = s.verdict === "under" ? "bad" : s.verdict === "over" ? "good" : "warn";
      var nx = nextStatus(d.status);
      var rangeTxt = s.range ? " (range " + D.fmt(s.range[0]) + "–" + D.fmt(s.range[1]) +
        (s.nicheLabel ? ", " + esc(s.nicheLabel) + " ×" + s.nicheMult : "") + ")" : "";
      return '<li class="deal-card"><div class="deal-head"><strong>' + esc(d.brand || "(no brand)") + "</strong>" +
        badge(kind, s.badge) +
        '<span class="badge">' + esc(D.STATUS_LABELS[d.status] || d.status) + "</span></div>" +
        '<p class="muted">' + esc(DELIV_LABELS[d.deliverable] || d.deliverable) + " · " +
        esc(PLATFORM_LABELS[d.platform] || d.platform) + " · " + esc(D.tierLabel(s.tier)) +
        " · offered " + D.fmt(+d.offer || 0) + rangeTxt + "</p>" +
        (s.impliedCpm ? '<p class="muted">Implied CPM at ' + Number(d.views).toLocaleString("en-US") +
          " expected views: <strong>$" + s.impliedCpm.toFixed(2) + "</strong></p>" : "") +
        quotedLine(d) +
        '<p class="muted">' + esc(USAGE_LABELS[d.usage] || d.usage) + " · " + esc(EXCL_LABELS[d.excl] || "") +
        " · " + esc(PAY_LABELS[d.payTerms] || "") + (d.timeline ? " · due " + esc(d.timeline) : "") + "</p>" +
        (d.notes ? '<p class="muted">“' + esc(d.notes) + "”</p>" : "") +
        '<div class="deal-actions">' +
        (nx ? '<button type="button" class="btn btn-ghost" data-advance="' + esc(d.id) + '">Advance → ' + esc(D.STATUS_LABELS[nx]) + "</button>" : "") +
        '<button type="button" class="btn btn-ghost" data-del="' + esc(d.id) + '">Delete</button></div></li>';
    }).join("");
    renderPipeline();
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
      niche: v("dr-niche") || null,
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

  /* ---------------- 2. pipeline summary ---------------- */
  var pipeOut = document.getElementById("dr-pipeline");
  function statCard(k, v, s, cls) {
    return '<div class="dr2-stat' + (cls ? " " + cls : "") + '"><div class="k">' + esc(k) +
      '</div><div class="v">' + esc(v) + '</div><div class="s">' + esc(s) + "</div></div>";
  }
  function renderPipeline() {
    if (!pipeOut || !cfg) return;
    var p = D.pipelineSummary(deals, cfg.sponsorship_rate_card_2026);
    if (!p.totalDeals) {
      pipeOut.innerHTML = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">▤</span>' +
        "<strong>Nothing in the pipeline.</strong>Log a deal and this strip totals your offers, signed value, and paid money — and names the underpaid deals still worth a counter.</div>";
      return;
    }
    var html = '<div class="dr2-pipe">' +
      statCard("Deals tracked", String(p.totalDeals),
        p.counts.offer + " offer · " + p.counts.negotiating + " negotiating") +
      statCard("Total offered", D.fmt(p.totalOffered), "every logged offer, all stages") +
      statCard("Committed", D.fmt(p.committed), "signed + delivered + paid", "good") +
      statCard("Paid out", D.fmt(p.paidTotal), p.counts.paid + " deal(s) fully paid", "good") +
      statCard("Verdicts", p.verdicts.fair + " fair · " + p.verdicts.over + " strong",
        p.verdicts.under + " underpaid vs the rate card", p.verdicts.under ? "hot" : "") +
      "</div>";
    if (p.openUnderpaid.length) {
      html += '<div class="calc-out dr2-under"><div class="lbl">Still in play — and underpaid</div>' +
        '<div class="range">' + p.openUnderpaid.map(function (u) {
          return "<strong>" + esc(u.brand) + "</strong> at " + D.fmt(u.offer) +
            (u.range ? " vs a " + D.fmt(u.range[0]) + "–" + D.fmt(u.range[1]) + " benchmark" : "");
        }).join(" · ") + ". Counter before these go stale — the scripts below carry the wording.</div></div>";
    }
    pipeOut.innerHTML = html;
  }

  /* ---------------- 4. the 2026 rate card, in full ---------------- */
  var rcOut = document.getElementById("dr-ratecard");
  var followersInput = document.getElementById("dr-followers");
  function moneyRange(r) {
    if (!r) return "—";
    return r[1] === null ? "from " + D.fmt(r[0]) : D.fmt(r[0]) + "–" + D.fmt(r[1]);
  }
  function renderRatecard() {
    if (!rcOut || !cfg) return;
    var t = D.rateCardTable(cfg.sponsorship_rate_card_2026, cfg.sponsorship_quoted_prices_2026);
    var myTier = D.tierOf(Math.max(0, parseFloat(followersInput.value) || 0));
    var html = '<div class="dr2-table-wrap"><table class="dr2-table"><caption class="muted" style="text-align:left;padding:0.6rem 0.8rem">' +
      "Per video / per post, by follower tier — reported 2026 agency benchmarks. Your row (from the tracker's follower count) is lit in gold.</caption>" +
      "<thead><tr><th scope=\"col\">Tier</th><th scope=\"col\">YouTube</th><th scope=\"col\">TikTok</th><th scope=\"col\">Instagram</th></tr></thead><tbody>";
    t.tiers.forEach(function (row) {
      html += '<tr' + (row.id === myTier ? ' class="you"' : "") + '><th scope="row">' +
        esc(row.label) + '</th><td>' + moneyRange(row.youtube) + '</td><td>' +
        moneyRange(row.tiktok) + '</td><td>' + moneyRange(row.instagram) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    if (t.multipliers) {
      html += '<p class="muted">At equal followers: YouTube ≈ <strong>' + t.multipliers.youtube +
        "×</strong> Instagram · TikTok ≈ <strong>" + t.multipliers.tiktok +
        "×</strong> Instagram. Sponsored CPMs: integrated slot " +
        moneyRange(t.cpms.youtubeIntegrated) + " · dedicated video " +
        moneyRange(t.cpms.dedicated.range) + " (" + esc(t.cpms.dedicated.source) + ") · IG Reel median $" +
        t.cpms.igReelMedian + ".</p>";
    }
    var q = t.quoted;
    if (q) {
      html += '<h3>What creators actually quote (reported)</h3><div class="dr2-lens">' +
        q.typical_quoted_by_format.map(function (f) {
          return '<div class="dr2-lens-card"><div class="lbl">' + esc(f.label) +
            '</div><div class="big">' + D.fmt(f.quoted_usd) + '</div><p>Typical quoted price · ' +
            esc(f.source) + " · reported</p></div>";
        }).join("") + "</div>" +
        '<p class="muted">Typical asking prices by size: ' + q.typical_ask_by_followers.map(function (a) {
          return "<strong>" + D.fmt(a.ask_usd) + "</strong> at " + esc(a.band);
        }).join(" · ") + " (" + esc(q.sources[0].name.split(" — ")[0]) +
        "). Quoted prices are asks, not closes — the ~23% listed-vs-accepted gap still applies.</p>";
      html += '<h3>Instagram feed post — the modeled cross-check</h3><div class="dr2-table-wrap"><table class="dr2-table">' +
        "<thead><tr><th scope=\"col\">Tier (Click Analytic cuts)</th><th scope=\"col\">One sponsored feed post</th><th scope=\"col\">Basis</th></tr></thead><tbody>" +
        q.instagram_feed_post_modeled.map(function (r) {
          return '<tr><th scope="row">' + esc(r.label) + "</th><td>" + moneyRange(r.range_usd) +
            "</td><td>modeled</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<p class="muted">' + esc(q.instagram_modeled_note) + " " + esc(q.audience_quality_note) + "</p>";
      html += '<p class="muted">Sources: ' + q.sources.map(function (s) {
        return '<a href="' + esc(s.url) + '" rel="noopener">' + esc(s.name.split(" — ")[0]) +
          "</a> (" + esc(s.basis) + ")";
      }).join(" · ") + "</p>";
    }
    html += '<p class="muted">' + esc(t.disclaimer) + "</p>";
    rcOut.innerHTML = html;
  }
  if (followersInput) followersInput.addEventListener("input", renderRatecard);

  /* ---------------- 7. Algorithm Watch digest ---------------- */
  var digestOut = document.getElementById("dr-digest");
  var digestCache = null;
  function renderDigest() {
    if (!digestOut) return;
    if (!feed) {
      digestOut.innerHTML = '<div class="empty-state" role="status"><span class="empty-icon" aria-hidden="true">◔</span>' +
        "<strong>Digest unavailable offline.</strong>The feed file (data/v1/changes.json) did not load — the full feed lives at " +
        '<a href="what-changed.html">Algorithm Watch</a>.</div>';
      return;
    }
    var dg = D.watchDigest(feed, { limit: 50 });
    digestCache = dg;
    var counts = Object.keys(dg.byCategory).map(function (c) {
      return dg.byCategory[c] + " " + c;
    }).join(" · ");
    var html = '<div class="dr2-digest-head"><span class="badge gold">LAST ' + dg.windowDays +
      " DAYS</span><span class=\"muted\">" + dg.shown + " of " + dg.total + " changes · " +
      esc(counts) + " · feed updated " + esc(String(dg.feedUpdated || "").slice(0, 10)) + "</span></div>";
    html += dg.entries.map(function (e) {
      return '<article class="dr2-entry"><div class="meta"><span>' + esc(e.date) + "</span><span>" +
        esc(e.platformLabel) + "</span><span>" + esc(e.category.toUpperCase()) + "</span>" +
        badge(e.confidence === "verified" ? "good" : "warn", e.confidence.toUpperCase()) + "</div>" +
        "<h3>" + esc(e.title) + '</h3><p class="muted">' + esc(e.summary) + "</p>" +
        '<p class="note"><strong>For your next deal:</strong> ' + esc(e.dealNote) + "</p>" +
        '<p class="srcs">Sources: ' + e.sources.map(function (s) {
          return '<a href="' + esc(s.url) + '" rel="noopener">' + esc(s.name) + "</a>";
        }).join(" · ") + "</p></article>";
    }).join("");
    html += '<p class="muted">' + esc(dg.disclaimer) +
      ' Confidence: verified = corroborated by 2+ sources or the platform; single-source = one report, treat as directional. ' +
      'The "For your next deal" lines are this site\'s editorial read, not source reporting.</p>';
    digestOut.innerHTML = html;
  }
  var digestBtn = document.getElementById("dr-copy-digest");
  if (digestBtn) digestBtn.addEventListener("click", function () {
    if (digestCache) copyText(D.digestText(digestCache), "Digest copied — paste it into your notes or newsletter draft.");
    else announce("Digest hasn't loaded yet — give it a second and try again.");
  });

  /* ---------------- data boot ---------------- */
  function boot() {
    var feedFetch = fetch("data/v1/changes.json").then(function (r) { return r.json(); })
      .catch(function () { return null; });
    Promise.all([
      fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
      fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); }),
      feedFetch
    ]).then(function (res) {
      cfg = res[0]; tpl = res[1]; feed = res[2];
      renderDeals(); renderUsage(); renderRatecard(); renderScripts(); renderFlags(); refreshMemoSelect(); renderDigest();
    }).catch(function () {
      root.innerHTML = '<div class="error-state" role="alert">' +
        "<strong>CONFIG LOAD FAILED</strong>" +
        "<p>Could not load the rate card or deal templates (<code>data/v1/calculators.json</code>, <code>data/v1/deal-templates.json</code>). " +
        "Check that <code>data/v1/</code> is deployed alongside this page, then try again.</p>" +
        '<button type="button" class="btn btn-ghost" data-retry>Try again</button></div>';
    });
  }
  root.addEventListener("click", function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-retry") !== null) boot();
  });
  boot();
})();
