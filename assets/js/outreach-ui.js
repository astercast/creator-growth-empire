/* The Outreach Center — browser UI wiring (no pure math here).
 * Storage: localStorage only (keys cge.outreach.*), no accounts, no network
 * writes. Math lives in window.Outreach (assets/js/outreach.js, UMD);
 * benchmarks come from data/v1/calculators.json, templates + contract flags
 * from data/v1/deal-templates.json. Negotiation aid — not financial, legal,
 * or tax advice. */
(function () {
  "use strict";
  var root = document.getElementById("outreach");
  if (!root || !window.Outreach) return;
  var O = window.Outreach;

  var LS = { deals: "cge.outreach.deals.v1", contract: "cge.outreach.contract.v1" };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
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
  var checkedContract = db ? db.get(LS.contract, []) : [];

  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
  var DELIV_LABELS = { integrated: "Integrated slot", dedicated: "Dedicated video", short: "Short-form video" };

  function save() { if (db) db.set(LS.deals, deals); }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function plusDays(iso, n) {
    var p = iso.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- 1 · pipeline ---------------- */
  function renderStats() {
    var s = O.pipelineStats(deals);
    document.getElementById("oc-stats").innerHTML =
      '<div class="stat-cards">' +
      statCard(s.contacted, "brands contacted") +
      statCard(s.responseRate + "%", "response rate") +
      statCard(s.activeDeals, "active deals") +
      statCard(s.signed, "signed") +
      "</div>" +
      '<p class="muted">' + esc(s.note) + "</p>";
  }
  function statCard(v, label) {
    return '<div class="stat-card"><strong>' + esc(String(v)) + "</strong><span>" +
      esc(label) + "</span></div>";
  }
  function renderReminders() {
    var buckets = O.dueFollowUps(deals, todayIso());
    var html = "";
    if (buckets.overdue.length) {
      html += "<p><strong>Overdue follow-ups (" + buckets.overdue.length + "):</strong> " +
        buckets.overdue.map(reminderLine).join(" · ") + "</p>";
    }
    if (buckets.dueToday.length) {
      html += "<p><strong>Due today (" + buckets.dueToday.length + "):</strong> " +
        buckets.dueToday.map(reminderLine).join(" · ") + "</p>";
    }
    if (buckets.upcoming.length) {
      html += '<p class="muted">Upcoming: ' +
        buckets.upcoming.map(reminderLine).join(" · ") + "</p>";
    }
    if (!html) html = '<p class="muted">No follow-ups scheduled. The rule: pitch, set one 7-day nudge, then move on.</p>';
    document.getElementById("oc-reminders").innerHTML = html;
  }
  function reminderLine(d) {
    return esc(d.brand) + " (" + esc(d.followUpDate) + ")";
  }
  function renderDeals() {
    var ul = document.getElementById("oc-deals");
    if (!deals.length) {
      ul.innerHTML = '<li class="muted">No brands in the pipeline yet. Log your first pitch above.</li>';
      return;
    }
    ul.innerHTML = deals.map(function (d, i) {
      var nextIdx = O.STATUSES.indexOf(d.status) + 1;
      var canAdvance = nextIdx < O.STATUSES.length;
      return '<li class="deal-card"><div><strong>' + esc(d.brand) + "</strong> " +
        '<span class="deal-status">' + esc(O.STATUS_LABELS[d.status] || d.status) + "</span>" +
        (d.contactName ? "<br>" + esc(d.contactName) + (d.email ? " · " + esc(d.email) : "") : "") +
        "<br><span class='muted'>Pitched " + esc(d.dateSent || "—") +
        (d.followUpDate ? " · nudge " + esc(d.followUpDate) : "") +
        (d.notes ? " · " + esc(d.notes) : "") + "</span></div>" +
        '<div class="deal-actions">' +
        (canAdvance ? '<button type="button" class="btn btn-ghost" data-adv="' + i + '">Advance →</button>' : "") +
        '<button type="button" class="btn btn-ghost" data-del="' + i + '">Remove</button>' +
        "</div></li>";
    }).join("");
    ul.querySelectorAll("[data-adv]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = deals[Number(b.getAttribute("data-adv"))];
        d.status = O.STATUSES[O.STATUSES.indexOf(d.status) + 1];
        save(); renderAll();
        announce(d.brand + " moved to " + O.STATUS_LABELS[d.status] + ".");
      });
    });
    ul.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = deals.splice(Number(b.getAttribute("data-del")), 1)[0];
        save(); renderAll();
        announce((d ? d.brand : "Deal") + " removed from the pipeline.");
      });
    });
  }
  function renderAll() { renderStats(); renderReminders(); renderDeals(); }
  function announce(msg) {
    var el = document.getElementById("oc-confirm");
    if (el) el.textContent = msg;
  }

  var form = document.getElementById("oc-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = {
        brand: document.getElementById("oc-brand").value.trim(),
        contactName: document.getElementById("oc-contact").value.trim(),
        email: document.getElementById("oc-email").value.trim(),
        dateSent: document.getElementById("oc-date").value || todayIso(),
        status: document.getElementById("oc-status").value,
        followUpDate: document.getElementById("oc-followup").value ||
          plusDays(document.getElementById("oc-date").value || todayIso(), 7),
        notes: document.getElementById("oc-notes").value.trim(),
        id: "d" + Date.now()
      };
      var v = O.validDeal(d);
      if (!v.ok) { announce("Can't log that: " + v.reason + "."); return; }
      deals.unshift(d);
      save(); renderAll();
      form.reset();
      announce(d.brand + " added to the pipeline. One 7-day nudge is scheduled — then move on.");
    });
  }

  /* ---------------- 2 · pitch generator ---------------- */
  function normKey(label) {
    return String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }
  function renderPitchForm() {
    var sel = document.getElementById("oc-pitch-tpl");
    var wrap = document.getElementById("oc-pitch-fields");
    var t = (tpl.pitch_templates || []).filter(function (x) { return x.id === sel.value; })[0];
    if (!t) { wrap.innerHTML = ""; return; }
    document.getElementById("oc-pitch-grounded").textContent = t.grounded_in;
    document.getElementById("oc-pitch-honest").textContent = t.honesty_note;
    wrap.innerHTML = t.placeholders.map(function (ph) {
      return '<label>' + esc(ph) +
        ' <input type="text" data-ph="' + esc(normKey(ph)) + '" maxlength="200" placeholder="' +
        esc(ph) + '"></label>';
    }).join("");
  }
  function generatePitch() {
    var sel = document.getElementById("oc-pitch-tpl");
    var t = (tpl.pitch_templates || []).filter(function (x) { return x.id === sel.value; })[0];
    if (!t) return;
    var vars = {};
    document.querySelectorAll("#oc-pitch-fields [data-ph]").forEach(function (inp) {
      vars[inp.getAttribute("data-ph")] = inp.value;
    });
    var out = O.renderPitch(t, vars);
    var unfilled = (out.match(/\[([^\]]+)\]/g) || []).length;
    document.getElementById("oc-pitch-out").innerHTML =
      "<pre>" + esc(out) + "</pre>" +
      (unfilled ? '<p class="pitch-warn">⚠ ' + unfilled +
        " placeholder(s) still empty — fill every [bracket] with your real numbers before sending. Never invent stats.</p>" : "") +
      '<p class="muted">' + esc(t.honesty_note) + "</p>";
    document.getElementById("oc-pitch-actions").style.display = "block";
  }
  function copyText(text, doneMsg) {
    function done() { announce(doneMsg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { announce("Copy failed — select the text manually."); }
      document.body.removeChild(ta);
    }
  }
  var pitchSel = document.getElementById("oc-pitch-tpl");
  if (pitchSel) {
    pitchSel.addEventListener("change", function () {
      renderPitchForm();
      document.getElementById("oc-pitch-out").innerHTML = "";
      document.getElementById("oc-pitch-actions").style.display = "none";
    });
  }
  var pitchBtn = document.getElementById("oc-pitch-gen");
  if (pitchBtn) pitchBtn.addEventListener("click", generatePitch);
  var pitchCopy = document.getElementById("oc-pitch-copy");
  if (pitchCopy) {
    pitchCopy.addEventListener("click", function () {
      var pre = document.querySelector("#oc-pitch-out pre");
      if (pre) copyText(pre.textContent, "Pitch copied — fill any empty [brackets] before sending.");
    });
  }

  /* ---------------- 3 · rate calculator ---------------- */
  var rateForm = document.getElementById("oc-rate-form");
  if (rateForm) {
    rateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = O.quoteCalc({
        followers: Number(document.getElementById("oc-followers").value),
        platform: document.getElementById("oc-platform").value,
        deliverable: document.getElementById("oc-deliverable").value,
        expectedViews: Number(document.getElementById("oc-views").value)
      }, cfg.sponsorship_rate_card_2026, cfg.sponsorship_rule_of_thumb);
      var html =
        "<h3>" + esc(q.tierLabel) + " · " + esc(PLATFORM_LABELS[q.platform]) + " · " +
        esc(DELIV_LABELS[q.deliverable]) + "</h3>" +
        '<p class="rate-range">Negotiation range: <strong>' + esc(q.rangeLabel) + "</strong></p>" +
        "<p>Quote at the top: <strong>" + esc(O.fmt(q.quotePoint)) + "</strong> — " + esc(q.guidance) + "</p>" +
        "<h4>CPM cross-check (" + esc(q.cpm.deliverableLabel) + ")</h4>" +
        "<p>" + esc(q.cpm.note) + "</p>" +
        '<p class="muted">' + esc(q.crossPlatform) + "</p>" +
        '<p class="muted">' + esc(q.usageRightsNote) + ' <a href="deal-room.html">Price usage rights in the Deal Room →</a></p>' +
        '<p class="muted"><strong>Disclaimer:</strong> ' + esc(q.disclaimer) + "</p>";
      document.getElementById("oc-rate-out").innerHTML = html;
      announce("Rate range calculated for " + q.tierLabel + " " + PLATFORM_LABELS[q.platform] + ".");
    });
  }

  /* ---------------- 4 · contract red-flag checklist ---------------- */
  function renderContract() {
    var formEl = document.getElementById("oc-contract");
    var flags = tpl.contract_flags || [];
    var sevLabel = { walk_away: "WALK AWAY", major: "MAJOR", minor: "MINOR" };
    formEl.innerHTML = flags.map(function (f) {
      var checked = checkedContract.indexOf(f.id) !== -1 ? " checked" : "";
      return '<label class="flag-row"><input type="checkbox" value="' + esc(f.id) + '"' + checked + "> " +
        '<span><strong>' + esc(f.title) + '</strong> <span class="sev sev-' + f.severity + '">' +
        sevLabel[f.severity] + "</span><br><span class='muted'>" + esc(f.detail) + "</span></span></label>";
    }).join("");
    formEl.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        checkedContract = Array.prototype.map.call(
          formEl.querySelectorAll("input[type=checkbox]:checked"),
          function (x) { return x.value; });
        if (db) db.set(LS.contract, checkedContract);
        renderContractOut();
      });
    });
    renderContractOut();
  }
  function renderContractOut() {
    var r = O.contractRisk(checkedContract, tpl.contract_flags || []);
    var html = '<div class="risk-verdict risk-' + r.verdict + '"><strong>' +
      (r.verdict === "clean" ? "CLEAN" : r.verdict === "caution" ? "CAUTION" : "DON'T SIGN AS WRITTEN") +
      "</strong><p>" + esc(r.verdictText) + "</p></div>";
    if (r.items.length) {
      html += "<ul>" + r.items.map(function (it) {
        return "<li><strong>" + esc(it.title) + "</strong><br>" +
          "<span class='muted'>Fix: " + esc(it.fix) + "</span></li>";
      }).join("") + "</ul>";
    }
    html += '<p class="muted"><strong>Not legal advice.</strong> ' + esc(r.disclaimer) +
      " Contracts above $500 deserve a real lawyer's eyes.</p>";
    document.getElementById("oc-contract-out").innerHTML = html;
  }

  /* ---------------- boot ---------------- */
  Promise.all([
    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }),
    fetch("data/v1/deal-templates.json").then(function (r) { return r.json(); })
  ]).then(function (arr) {
    cfg = arr[0];
    tpl = arr[1];
    renderAll();
    /* pitch template select */
    var sel = document.getElementById("oc-pitch-tpl");
    if (sel) {
      sel.innerHTML = (tpl.pitch_templates || []).map(function (t) {
        return '<option value="' + esc(t.id) + '">' + esc(t.title) + "</option>";
      }).join("");
      renderPitchForm();
    }
    renderContract();
  }).catch(function () {
    announce("Couldn't load the rate data (api/v1 JSON unreachable). The benchmarks live at data/v1/calculators.json and data/v1/deal-templates.json.");
  });
})();
