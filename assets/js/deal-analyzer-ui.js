/* The Deal Analyzer 2.0, browser UI wiring (no pure math here).
 * Storage: localStorage only (keys cge.dealanalyzer.*), no accounts, no
 * network writes. Math lives in window.DealAnalyzer
 * (assets/js/deal-analyzer.js, UMD); benchmarks come from
 * data/v1/calculators.json (sponsorship_rate_card_2026 +
 * usage_rights_benchmarks_2026 (calculators v1.5.0)), the contract checklist from
 * data/v1/deal-templates.json contract_flags. A negotiation aid, not
 * financial, legal, or tax advice; the contract checklist is not legal
 * advice. */
(function () {
  "use strict";
  var root = document.getElementById("deal-analyzer");
  if (!root || !window.DealAnalyzer) return;
  var DA = window.DealAnalyzer;

  var LS_INPUTS = "cge.dealanalyzer.v1";
  var LS_DEALS = "cge.dealanalyzer.deals.v1";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>\"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function storeGet(k, fb) {
    try {
      var v = window.localStorage.getItem(k);
      return v === null ? fb : JSON.parse(v);
    } catch (e) { return fb; }
  }
  function storeSet(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  var cfg = null, dealData = null;
  var lastAnalysis = null; /* {brand, deal, evaluation, termFlags, contractFlagIds, contractRisk, counter} */

  var FIELDS = ["da-brand", "da-platform", "da-deliverable", "da-niche", "da-followers",
    "da-views", "da-offer", "da-posts", "da-usage", "da-white", "da-excl",
    "da-pay", "da-timeline", "da-c-ip", "da-c-cancel", "da-c-usagewords",
    "da-c-exclrenew", "da-c-paymetrics", "da-c-morals", "da-c-payschedule",
    "da-c-approval", "da-c-ftc", "da-c-scope"];

  function readForm() {
    var v = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
    return {
      brand: v("da-brand").trim(),
      platform: v("da-platform"),
      deliverable: v("da-deliverable"),
      niche: v("da-niche") || null,
      followers: v("da-followers"),
      expectedViews: v("da-views"),
      offerUsd: v("da-offer"),
      postCount: v("da-posts"),
      usage: v("da-usage"),
      whitelisting: v("da-white"),
      exclusivity: v("da-excl"),
      paymentTerms: v("da-pay"),
      timeline: v("da-timeline"),
      contract: {
        ip: v("da-c-ip"), cancel: v("da-c-cancel"),
        usageWords: v("da-c-usagewords"), exclRenew: v("da-c-exclrenew"),
        payMetrics: v("da-c-paymetrics"), morals: v("da-c-morals"),
        paySchedule: v("da-c-payschedule"), approval: v("da-c-approval"),
        ftc: v("da-c-ftc"), scope: v("da-c-scope")
      }
    };
  }

  function writeForm(d) {
    var set = function (id, val) { var el = document.getElementById(id); if (el && val != null) el.value = val; };
    set("da-brand", d.brand); set("da-platform", d.platform);
    set("da-deliverable", d.deliverable); set("da-niche", d.niche || "");
    set("da-followers", d.followers);
    set("da-views", d.expectedViews); set("da-offer", d.offerUsd);
    set("da-posts", d.postCount); set("da-usage", d.usage);
    set("da-white", d.whitelisting); set("da-excl", d.exclusivity);
    set("da-pay", d.paymentTerms); set("da-timeline", d.timeline);
    var c = d.contract || {};
    var cmap = { ip: "da-c-ip", cancel: "da-c-cancel", usageWords: "da-c-usagewords",
      exclRenew: "da-c-exclrenew", payMetrics: "da-c-paymetrics", morals: "da-c-morals",
      paySchedule: "da-c-payschedule", approval: "da-c-approval", ftc: "da-c-ftc",
      scope: "da-c-scope" };
    Object.keys(cmap).forEach(function (k) { set(cmap[k], c[k]); });
  }

  function badge(kind, text) {
    var cls = kind === "good" ? "money" : kind === "bad" ? "hot" : "warn";
    return '<span class="badge ' + cls + '">' + esc(text) + "</span>";
  }

  function flagIcon(kind) {
    return kind === "bad" ? "⛔" : kind === "warn" ? "⚠️" : "✅";
  }

  function basisTag(basis) {
    var labels = {
      benchmark: "2026 benchmark", benchmark_2026: "2026 benchmark",
      chapter: "chapter rule", rule_of_thumb: "working rule", rule: "no number"
    };
    return labels[basis] ? ' <span class="muted">(' + labels[basis] + ")</span>" : "";
  }

  /* ---------- render ---------- */
  function renderReport() {
    var out = document.getElementById("da-results");
    var a = lastAnalysis;
    if (!a) return;
    var ev = a.evaluation, co = a.counter, cr = a.contractRisk;

    var verdictBadge = ev.verdict === "UNDERPAID" ? badge("bad", "UNDERPAID")
      : ev.verdict === "STRONG" ? badge("good", "STRONG") : badge("warn", "FAIR");

    var cpmHtml = "";
    if (ev.impliedCpm) {
      cpmHtml = "<p class='muted'>Implied CPM: <strong>$" +
        ev.impliedCpm.value.toFixed(2) + "</strong> (" + DA.fmt(a.deal.offerUsd) +
        " ÷ " + Math.round(a.deal.expectedViews).toLocaleString("en-US") +
        " views), " + ev.impliedCpm.position + " the " +
        esc(ev.impliedCpm.band.label) + ".</p>";
    }

    var catHtml = "";
    if (ev.categoryCheck) {
      var cc = ev.categoryCheck;
      catHtml = "<p class='muted'>Category check (" + esc(cc.source) + "): " +
        esc(cc.category) + " sponsors pay ~<strong>$" + cc.cpm +
        "/1K views</strong>, at " +
        Math.round(a.deal.expectedViews).toLocaleString("en-US") +
        " expected views that's ~" + DA.fmt(cc.impliedValue) +
        " of category-rate value, " + cc.position + " your " +
        DA.fmt(a.deal.offerUsd) + " offer.</p>";
    }

    var crossHtml = "<p class='muted'>" + esc(ev.multNote) + "<br>" +
      ev.crossPlatform.map(function (c) {
        return esc(c.label) + ": " + (c.range ? DA.fmt(c.range[0]) + "–" + DA.fmt(c.range[1]) : "n/a");
      }).join(" · ") + " at your tier.</p>";

    var termHtml = a.termFlags.map(function (f) {
      return '<li><strong>' + flagIcon(f.kind) + " " + esc(f.title) +
        "</strong><br><span class='muted'>" + esc(f.detail) + "</span></li>";
    }).join("");

    var contractBadge = cr.verdict === "dont_sign" ? badge("bad", "DON'T SIGN")
      : cr.verdict === "caution" ? badge("warn", "CAUTION") : badge("good", "CLEAN");
    var contractHtml = '<div class="calc-out" style="text-align:left;border-left:4px solid var(--gold)">' +
      "<p><strong>Contract verdict: " + contractBadge + "</strong> " + esc(cr.verdictText) + "</p></div>";
    if (cr.items.length) {
      contractHtml += '<ul class="checklist">' + cr.items.map(function (it) {
        var icon = it.severity === "walk_away" ? "⛔" : it.severity === "major" ? "⚠️" : "ℹ️";
        return '<li><strong>' + icon + " " + esc(it.title) + "</strong> <span class='muted'>[" +
          esc(it.severity.replace(/_/g, " ")) + "]</span><br><span class='muted'>" +
          esc(it.detail) + "</span><br><strong>Fix:</strong> <span class='muted'>" +
          esc(it.fix) + "</span></li>";
      }).join("") + "</ul>";
    }
    contractHtml += '<p class="muted"><strong>Not legal advice:</strong> ' + esc(cr.disclaimer) + "</p>";

    var counterHtml = '<ul class="checklist">' + co.lines.map(function (ln) {
      return "<li><strong>" + esc(ln.label) + "</strong>" + basisTag(ln.basis) +
        "<br><span class='muted'>" + esc(ln.detail) + "</span></li>";
    }).join("") + "</ul>" +
      '<div class="calc-out"><div class="lbl">Counter-offer total</div><div class="big">' +
      esc(co.totalLabel) + '</div><div class="range">' + esc(co.expectedCloseNote) + "</div></div>" +
      (co.bundleNote ? '<p class="muted">' + esc(co.bundleNote) + "</p>" : "");

    var usageRows = DA.usageAddons(co.base,
      cfg.usage_rights_benchmarks_2026).map(function (u) {
      return "<tr><th scope='row'>" + esc(u.label) + "</th><td>" +
        (u.lo === 0 && u.hi === 0 ? "·" : esc(DA.fmtRange(u.lo, u.hi))) +
        '</td><td class="muted" style="font-size:.85rem">' + esc(u.note) + "</td></tr>";
    }).join("");
    var usageHtml = '<p class="muted">Usage rights are where creators leave money on the table, ' +
      "a brand paying $300 for a video and running it as a paid ad for a year without usage fees " +
      "is getting a multi-thousand-dollar asset for $300 (projectcasting, 2026). Price it separately. Always.</p>" +
      '<div class="table-wrap"><table><caption>Usage-rights add-ons on a ' +
      DA.fmt(co.base) + " base fee, 2026 benchmarks, separate line items.</caption>" +
      "<thead><tr><th scope='col'>License</th><th scope='col'>Add-on</th><th scope='col'>Note</th></tr></thead>" +
      "<tbody>" + usageRows + "</tbody></table></div>";

    function eyebrow(n, title) {
      return '<p class="eyebrow" aria-hidden="true">' + n + ", " + title + "</p>";
    }

    var html =
      '<div class="deal-report" id="da-report">' +
      "<h2>Evaluation" + (a.brand ? ": " + esc(a.brand) : "") + "</h2>" +
      eyebrow("01", "The rate-card verdict") +
      '<div class="calc-grid">' +
      '<div class="calc-out"><div class="lbl">Your benchmark range</div><div class="big">' +
      DA.fmt(ev.range[0]) + "–" + DA.fmt(ev.range[1]) +
      '</div><div class="range">' + esc(ev.tierLabel) + " · " + esc(ev.platformLabel) +
      " · " + esc(ev.deliverableLabel) + "</div></div>" +
      '<div class="calc-out"><div class="lbl">Their offer</div><div class="big">' +
      DA.fmt(a.deal.offerUsd) + '</div><div class="range">' + esc(ev.verdictText) +
      " " + verdictBadge + "</div></div></div>" +
      "<p class='muted'>" + esc(ev.nicheNote) +
      (ev.niche && ev.baseRange ? " Base all-niche band: " + DA.fmt(ev.baseRange[0]) +
        "–" + DA.fmt(ev.baseRange[1]) + "; your niche-adjusted band: " +
        DA.fmt(ev.range[0]) + "–" + DA.fmt(ev.range[1]) + "." : "") + "</p>" +
      cpmHtml + catHtml + crossHtml +
      '<p class="muted">Expected landing zone: <strong>' + DA.fmt(ev.expectedClose) +
      "</strong>, the 23% listed-above-accepted benchmark's math (" +
      "quote ÷ 1.23), not a promise.</p>" +
      eyebrow("02", "Offer-term flags") +
      "<h3>Offer-term flags</h3><ul class='checklist'>" + termHtml + "</ul>" +
      eyebrow("03", "Contract checklist") +
      "<h3>Contract checklist (wave-22 flags, applied to this deal)</h3>" + contractHtml +
      eyebrow("04", "Counter-offer calculator") +
      "<h3>Counter-offer calculator</h3>" + counterHtml +
      eyebrow("05", "Usage-rights add-on math") +
      "<h3>Usage-rights add-on math</h3>" + usageHtml +
      '<p class="muted">' + esc(ev.disclaimer) + " " + esc(co.disclaimer) +
      " Decide your walk-away rate before the call, not during it.</p>" +
      "</div>" +
      '<div class="no-print" style="margin-top:1rem">' +
      '<button type="button" class="btn" id="da-save">Save this deal</button> ' +
      '<button type="button" class="btn btn-ghost" id="da-copy">Copy the evaluation</button> ' +
      '<button type="button" class="btn btn-ghost" id="da-print">Print / save PDF</button> ' +
      '<span id="da-action-status" class="muted" role="status"></span></div>';

    /* Same-document view transition (Baseline 2026): the results swap reads
     * as one choreographed beat, not a flash. Reduced-motion users and
     * unsupporting browsers get the plain swap. */
    var REDUCED = typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    function swap() {
      out.innerHTML = html;
      wireReportActions();
    }
    if (!REDUCED && document.startViewTransition) {
      document.startViewTransition(swap);
    } else {
      swap();
    }
  }

  function wireReportActions() {
    var status = function (msg) {
      var el = document.getElementById("da-action-status");
      if (el) el.textContent = msg;
    };
    var saveBtn = document.getElementById("da-save");
    if (saveBtn) saveBtn.addEventListener("click", function () {
      if (!lastAnalysis) return;
      var deals = storeGet(LS_DEALS, []);
      var a = lastAnalysis;
      deals.unshift({
        id: "d" + Date.now(),
        savedAt: new Date().toISOString().slice(0, 10),
        brand: a.brand || "(no brand named)",
        deal: a.deal,
        verdict: a.evaluation.verdict,
        range: a.evaluation.range,
        expectedClose: a.evaluation.expectedClose,
        counterTotalLabel: a.counter.totalLabel,
        contractVerdict: a.contractRisk.verdict,
        flagCount: a.contractRisk.items.length
      });
      storeSet(LS_DEALS, deals.slice(0, 24));
      status("Saved, it lives only in this browser.");
      renderHistory();
    });
    var copyBtn = document.getElementById("da-copy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var text = DA.exportReport(lastAnalysis);
      function done(m) { status(m); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          done("Copied, paste it anywhere.");
        }, function () { done("Copy blocked by the browser, select and copy manually."); });
      } else { done("Clipboard unavailable, use Print / save PDF instead."); }
    });
    var printBtn = document.getElementById("da-print");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  /* ---------- history + comparison mode ---------- */
  function renderHistory() {
    var host = document.getElementById("da-history");
    if (!host) return;
    var deals = storeGet(LS_DEALS, []);
    if (!deals.length) {
      host.innerHTML = '<p class="muted">No saved deals yet. Analyze an offer, hit "Save this deal", and your negotiation history builds here, in this browser only, never transmitted.</p>';
      return;
    }
    host.innerHTML =
      '<div class="table-wrap"><table><caption>Saved deal evaluations. Tick two to compare them side by side.</caption>' +
      "<thead><tr><th scope='col'>Compare</th><th scope='col'>Brand</th><th scope='col'>Saved</th>" +
      "<th scope='col'>Offer</th><th scope='col'>Verdict</th><th scope='col'>Counter</th>" +
      "<th scope='col'>Contract</th><th scope='col'>Actions</th></tr></thead><tbody>" +
      deals.map(function (d) {
        var vBadge = d.verdict === "UNDERPAID" ? badge("bad", "UNDERPAID")
          : d.verdict === "STRONG" ? badge("good", "STRONG") : badge("warn", "FAIR");
        var cBadge = d.contractVerdict === "dont_sign" ? badge("bad", "DON'T SIGN")
          : d.contractVerdict === "caution" ? badge("warn", "CAUTION") : badge("good", "CLEAN");
        return "<tr><td><input type='checkbox' data-cmp='" + esc(d.id) +
          "' aria-label='Select " + esc(d.brand) + " for comparison'></td>" +
          "<th scope='row'>" + esc(d.brand) + "</th><td>" + esc(d.savedAt) + "</td>" +
          "<td>" + DA.fmt(d.deal.offerUsd) + "</td><td>" + vBadge + "</td>" +
          "<td>" + esc(d.counterTotalLabel) + "</td><td>" + cBadge + "</td>" +
          "<td><button type='button' class='btn btn-ghost' data-load='" + esc(d.id) +
          "'>Load</button> <button type='button' class='btn btn-ghost' data-del='" +
          esc(d.id) + "'>Delete</button></td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<div style="margin-top:0.75rem"><button type="button" class="btn" id="da-compare">Compare selected (2)</button> ' +
      '<span id="da-history-status" class="muted" role="status"></span></div>' +
      '<div id="da-compare-out" aria-live="polite" style="margin-top:1rem"></div>';

    host.querySelectorAll("[data-load]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = storeGet(LS_DEALS, []).filter(function (x) { return x.id === b.getAttribute("data-load"); })[0];
        if (d) { writeForm(Object.assign({ brand: d.brand }, d.deal)); runAnalysis(); }
      });
    });
    host.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del");
        storeSet(LS_DEALS, storeGet(LS_DEALS, []).filter(function (x) { return x.id !== id; }));
        renderHistory();
      });
    });
    var cmpBtn = document.getElementById("da-compare");
    if (cmpBtn) cmpBtn.addEventListener("click", function () {
      var checked = Array.prototype.slice.call(
        host.querySelectorAll("[data-cmp]:checked")).map(function (c) { return c.getAttribute("data-cmp"); });
      var statusEl = document.getElementById("da-history-status");
      var dealsNow = storeGet(LS_DEALS, []);
      if (checked.length !== 2) {
        if (statusEl) statusEl.textContent = "Tick exactly two deals to compare.";
        return;
      }
      var A = dealsNow.filter(function (x) { return x.id === checked[0]; })[0];
      var B = dealsNow.filter(function (x) { return x.id === checked[1]; })[0];
      renderCompare(A, B);
    });
  }

  function renderCompare(A, B) {
    var host = document.getElementById("da-compare-out");
    if (!host) return;
    var cmp = DA.compareDeals(A, B);
    var rows = cmp.rows.map(function (r) {
      return "<tr" + (r.differs ? " style='background:var(--bg-3)'" : "") +
        "><th scope='row'>" + esc(r.label) + "</th><td>" + esc(r.a) +
        "</td><td>" + esc(r.b) + "</td></tr>";
    }).join("");
    var diffs = cmp.differingTerms.length
      ? "<h4>Terms that differ</h4><ul class='checklist'>" +
        cmp.differingTerms.map(function (d) {
          return "<li><strong>" + esc(d.term) + ":</strong> " + esc(d.a) +
            " vs " + esc(d.b) + "</li>";
        }).join("") + "</ul>"
      : "<p class='muted'>Same terms, only the evaluations differ.</p>";
    host.innerHTML =
      '<div class="table-wrap"><table><caption>Side-by-side: ' + esc(A.brand) +
      " vs " + esc(B.brand) + ". Highlighted rows differ.</caption>" +
      "<thead><tr><th scope='col'>Metric</th><th scope='col'>" + esc(A.brand) +
      "</th><th scope='col'>" + esc(B.brand) + "</th></tr></thead><tbody>" +
      rows + "</tbody></table></div>" + diffs;
    host.scrollIntoView();
  }

  /* ---------- analysis ---------- */
  function runAnalysis() {
    var raw = readForm();
    storeSet(LS_INPUTS, raw);
    var v = DA.validInput(raw);
    var out = document.getElementById("da-results");
    if (!v.ok) {
      lastAnalysis = null;
      out.innerHTML = '<div class="error-state" role="alert"><strong>Check your inputs</strong><ul>' +
        v.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") +
        "</ul></div>";
      return;
    }
    if (!cfg || !dealData) {
      out.innerHTML = '<p class="muted">Still loading the 2026 rate data, try again in a second.</p>';
      return;
    }
    var deal = v.deal;
    var evaluation = DA.evaluate(deal, cfg.sponsorship_rate_card_2026);
    var termFlags = DA.offerTermFlags(deal);
    var flagIds = DA.mapTermsToFlags(deal);
    var risk = DA.contractRisk(flagIds, dealData.contract_flags);
    var counter = DA.counterOffer(deal, cfg.sponsorship_rate_card_2026,
      cfg.usage_rights_benchmarks_2026);
    lastAnalysis = {
      brand: raw.brand, deal: deal, evaluation: evaluation,
      termFlags: termFlags, contractFlagIds: flagIds,
      contractRisk: risk, counter: counter
    };
    renderReport();
    out.scrollIntoView();
  }

  /* ---------- boot ---------- */
  function boot() {
    var saved = storeGet(LS_INPUTS, null);
    if (saved) { try { writeForm(saved); } catch (e) {} }
    var form = document.getElementById("da-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      runAnalysis();
    });
    renderHistory();
    var pending = 2;
    function ready() {
      if (--pending === 0) {
        var note = document.getElementById("da-data-note");
        if (note) note.textContent =
          "Live data: rate card + usage benchmarks v" + cfg.version +
          " · contract checklist v" + dealData.version + ".";
      }
    }
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); })
      .then(function (c) { cfg = c; ready(); })
      .catch(function () { cfg = null; ready(); });
    fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); })
      .then(function (d) { dealData = d; ready(); })
      .catch(function () { dealData = null; ready(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
