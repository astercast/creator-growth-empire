/* Sponsor Deal Analyzer: benchmark an offer against the 2026 rate card.
   Negotiation aid, not financial advice. Data: api/v1/calculators.json
   (sponsorship_rate_card_2026 — compiled 2026 agency benchmarks, not quotes). */
(function () {
  "use strict";
  var form = document.getElementById("deal-form");
  var out = document.getElementById("deal-results");
  if (!form || !out) return;

  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };

  function tierOf(followers) {
    if (followers < 10000) return "nano_1k_10k";
    if (followers < 100000) return "micro_10k_100k";
    if (followers < 1000000) return "macro_100k_1m";
    return "mega_1m_plus";
  }

  function tierLabel(t) {
    return { nano_1k_10k: "Nano (1K–10K)", micro_10k_100k: "Micro (10K–100K)",
             macro_100k_1m: "Macro (100K–1M)", mega_1m_plus: "Mega (1M+)" }[t];
  }

  /* Honest rounding for counter-offer numbers: 2 significant figures. */
  function nice(n) {
    if (n <= 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  function badge(kind, text) {
    var cls = kind === "good" ? "money" : kind === "bad" ? "hot" : "warn";
    return '<span class="badge ' + cls + '">' + text + "</span>";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (id) { return Math.max(0, parseFloat(document.getElementById(id).value) || 0); };
    var sel = function (id) { return document.getElementById(id).value; };
    var platform = sel("d-platform"), deliverable = sel("d-deliverable"),
        usage = sel("d-usage"), white = sel("d-white"),
        excl = sel("d-excl"), pay = sel("d-pay");
    var followers = v("d-followers"), views = v("d-views"), offer = v("d-offer");

    fetch("api/v1/calculators.json").then(function (r) { return r.json(); }).then(function (cfg) {
      var rc = cfg.sponsorship_rate_card_2026;
      var tier = tierOf(followers);
      var tierRange = rc.per_video_or_post_by_tier[tier][platform];
      var lo = tierRange[0], hi = tierRange[1];

      /* CPM benchmarks by deliverable — straight from the rate card's sponsored_cpms. */
      var cpms = rc.sponsored_cpms;
      var cpm = cpms.tiktok_youtube_general.slice();
      var cpmNote = "general sponsored CPM $10–$30";
      if (platform === "youtube" && deliverable === "integrated") {
        cpm = cpms.youtube_integrated_slot.slice(); cpmNote = "YouTube integrated slot $20–$35 CPM";
      } else if (platform === "youtube" && deliverable === "dedicated") {
        cpm = [50, 90]; cpmNote = "dedicated YouTube video $50–$90 CPM";
      } else if (platform === "youtube" && deliverable === "short") {
        cpm = cpms.youtube_general.slice(); cpmNote = "YouTube general $15–$40 CPM";
      } else if (platform === "instagram" && deliverable === "short") {
        cpmNote = "IG sponsored Reel median $22.40 CPM (general range $10–$30)";
      }
      var delivLabel = { integrated: "Integrated slot", dedicated: "Dedicated video", short: "Short-form video" }[deliverable];

      /* ---- verdict ---- */
      var verdict, verdictText;
      if (offer < lo) { verdict = "bad"; verdictText = "Underpaid — below the range floor"; }
      else if (offer > hi) { verdict = "good"; verdictText = "Strong — above the range ceiling"; }
      else { verdict = "ok"; verdictText = "Fair — inside the benchmark range"; }

      var cpmHtml = "";
      if (views > 0 && offer > 0) {
        var implied = offer / views * 1000;
        var cmp = implied < cpm[0] ? "below" : implied > cpm[1] ? "above" : "inside";
        cpmHtml = "<p class='muted'>Implied CPM: <strong>" + fmt(implied) +
          "</strong> (" + fmt(offer) + " ÷ " + Math.round(views).toLocaleString("en-US") +
          " views) — " + cmp + " the " + cpmNote + ".</p>";
      }

      /* ---- red-flag checklist ---- */
      var flags = [];
      function flag(kind, title, detail) { flags.push({ kind: kind, title: title, detail: detail }); }
      if (usage === "perpetual") flag("bad", "Unlimited / perpetual usage rights",
        "This is the single most-neglected line item. A perpetual paid-ads license turns your post into the brand's permanent ad creative — price it as its own line item, or don't grant it.");
      else if (usage === "paid365") flag("warn", "12-month paid-ads window",
        "Long paid-ads usage should add +100% to the post fee. Cap it in writing — don't let 'a year' drift into 'forever'.");
      else if (usage === "paid180") flag("warn", "6-month paid-ads window",
        "Add +75% to the post fee for a half-year paid-ads license. Spell the end date in the contract.");
      else if (usage === "paid30") flag("ok", "30-day paid-ads window",
        "A reasonable paid-ads ask — add +50% to the post fee as a separate line item.");

      if (white === "perpetual") flag("bad", "Perpetual whitelisting",
        "Indefinite ad spend off your account and face. Whitelisting is always a premium, always monthly, always revocable — perpetual is a red line.");
      else if (white === "90") flag("warn", "31–90 day whitelisting",
        "Price it monthly, separately from the post fee. Set a hard end date and keep kill-switch access.");

      if (excl === "broad") flag("bad", "Broad / category exclusivity, 6+ months",
        "This kills other sponsor revenue for half a year. Narrow it to named competitors, or demand a premium that actually covers the lost deals.");
      else if (excl === "90") flag("warn", "60–90 day exclusivity",
        "+25% is the floor for 30 days of exclusivity — 60–90 days needs more. Narrow the competitor list in writing.");

      if (pay === "90") flag("bad", "Net 90+ payment terms",
        "Net-90 means you are financing the brand's marketing for a quarter. Counter with net-30 and 50% upfront.");
      else if (pay === "60") flag("warn", "Net 60 payment terms",
        "Two months is standard for agencies but not for you. Ask net-30 — and 50% upfront from any brand you haven't worked with.");

      if (!flags.length) flags.push({ kind: "ok", title: "No structural red flags",
        detail: "Usage, whitelisting, exclusivity, and payment terms all look sane. Price the post itself next." });

      var flagsHtml = flags.map(function (f) {
        var icon = f.kind === "bad" ? "⛔" : f.kind === "warn" ? "⚠️" : "✅";
        return '<li><strong>' + icon + " " + f.title + "</strong><br><span class='muted'>" + f.detail + "</span></li>";
      }).join("");

      /* ---- counter-offer worksheet ---- */
      var ask = nice(hi); /* quote at the top of the range; creators are negotiated down ~23% */
      var usageAddon = 0, usageLine = "";
      if (usage === "paid30") { usageAddon = nice(ask * 0.5); usageLine = "Paid ads, 30 days (+50%)"; }
      else if (usage === "paid180") { usageAddon = nice(ask * 0.75); usageLine = "Paid ads, 6 months (+75%)"; }
      else if (usage === "paid365") { usageAddon = nice(ask * 1.0); usageLine = "Paid ads, 12 months (+100%)"; }
      else if (usage === "perpetual") { usageAddon = 0; usageLine = "Perpetual usage — price as its OWN line item or refuse"; }
      var exclAddon = 0, exclLine = "";
      if (excl === "30") { exclAddon = nice(ask * 0.25); exclLine = "30-day exclusivity (+25%)"; }
      else if (excl === "90") { exclAddon = nice(ask * 0.5); exclLine = "60–90 day exclusivity (+50%)"; }
      else if (excl === "broad") { exclAddon = 0; exclLine = "Broad exclusivity — narrow it or demand a premium that covers lost deals"; }
      var whiteLine = white === "none" ? "" :
        "Whitelisting (" + ({ 30: "≤30 days", 90: "31–90 days", perpetual: "perpetual" })[white] +
        ") — monthly premium, separate line, revocable";
      var total = ask + usageAddon + exclAddon;

      var sheet = '<li><strong>Base post fee: ' + fmt(ask) + "</strong><br><span class='muted'>" +
        "Top of your " + tierLabel(tier) + " " + PLATFORM_LABELS[platform] +
        " range (" + fmt(lo) + "–" + fmt(hi) + "). Quote high — benchmarks show creators list ~23% above what they accept.</span></li>";
      if (usageAddon) sheet += "<li>Usage rights: <strong>" + usageLine + " — " + fmt(usageAddon) +
        "</strong><br><span class='muted'>The most-neglected line item: price paid-ad usage separately from the post fee, every time.</span></li>";
      else if (usage === "perpetual") sheet += "<li>Usage rights: <strong>" + usageLine + "</strong></li>";
      if (exclAddon) sheet += "<li>Exclusivity: <strong>" + exclLine + " — " + fmt(exclAddon) + "</strong></li>";
      else if (excl === "broad") sheet += "<li>Exclusivity: <strong>" + exclLine + "</strong></li>";
      if (whiteLine) sheet += "<li>" + whiteLine + "</li>";
      if (usageAddon || exclAddon) sheet += "<li><strong>Counter-offer total: " + fmt(total) +
        "</strong> <span class='muted'>(base + line items; whitelisting priced separately per month)</span></li>";

      /* ---- render ---- */
      out.innerHTML =
        '<div class="calc-grid">' +
        '<div class="calc-out"><div class="lbl">Your benchmark range</div><div class="big">' + fmt(lo) + "–" + fmt(hi) +
        '</div><div class="range">' + tierLabel(tier) + " · " + PLATFORM_LABELS[platform] + " · " + delivLabel + "</div></div>" +
        '<div class="calc-out"><div class="lbl">Their offer</div><div class="big">' + fmt(offer) + "</div>" +
        '<div class="range">' + verdictText + " " + badge(verdict, verdict === "bad" ? "UNDERPAID" : verdict === "good" ? "STRONG" : "FAIR") + "</div></div>" +
        "</div>" + cpmHtml +
        '<h3>Red-flag checklist</h3><ul class="checklist">' + flagsHtml + "</ul>" +
        '<h3>Counter-offer worksheet</h3><ul class="checklist">' + sheet + "</ul>" +
        '<p class="muted">A negotiation aid, not financial advice. Benchmarks disagree 2–3x within tiers; niche, engagement, and audience quality move numbers as much as followers (finance/tech 2–3x, entertainment lower). Rates change — verify against current creator rate reports before you quote. The walk-away rule from Phase 5 stands: decide your walk-away rate before the call, not during it.</p>';
    }).catch(function () {
      out.innerHTML = '<div class="error-state" role="alert">' +
        "<strong>CONFIG LOAD FAILED</strong>" +
        "<p>Could not load the calculator config (<code>api/v1/calculators.json</code>). " +
        "Check that <code>api/v1/</code> is deployed alongside this page, then try again — your inputs are still here.</p>" +
        '<button type="button" class="btn btn-ghost" data-retry>Try again</button></div>';
    });
  });

  /* error-state retry button re-submits the form */
  document.getElementById("deal-results").addEventListener("click", function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-retry") !== null) {
      document.getElementById("deal-form").requestSubmit();
    }
  });
})();
