/* Hiring Cost Calculator: monthly/annual hire cost + ad revenue needed to cover it.
   Honest math from calculators.json RPM bands. Not financial advice. */
(function () {
  "use strict";
  var form = document.getElementById("hire-form");
  var out = document.getElementById("hire-results");
  if (!form || !out) return;

  var HINTS = {
    editor: "Typical 2026 range for this role: $150–$500/video, or $25–$75/hr (see the hiring guide).",
    thumbnail: "Typical 2026 range for this role: $5–$40/thumbnail (see the hiring guide).",
    va: "Typical 2026 range for this role: $3–$25/hr offshore, $25–$50/hr US (see the hiring guide).",
    manager: "No public 2026 benchmark on file, price off the value of the hours returned (see the hiring guide)."
  };
  var ROLE_LABEL = { editor: "Video editor", thumbnail: "Thumbnail designer", va: "Virtual assistant", manager: "Channel manager" };

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function range(lo, hi) { return fmt(lo) + " – " + fmt(hi); }

  var roleSel = document.getElementById("h-role");
  var hint = document.getElementById("h-rate-hint");
  function updHint() { hint.textContent = HINTS[roleSel.value] || ""; }
  roleSel.addEventListener("change", updHint);
  updHint();

  function card(lbl, big, sub) {
    return '<div class="calc-out"><div class="lbl">' + lbl + '</div>' +
      '<div class="big">' + big + '</div>' +
      (sub ? '<div class="range">' + sub + "</div>" : "") + "</div>";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (id) { return Math.max(0, parseFloat(document.getElementById(id).value) || 0); };
    var model = document.getElementById("h-model").value;
    var rate = v("h-rate"), hours = v("h-hours"), units = v("h-units");
    var views = v("h-views"), niche = document.getElementById("h-niche").value;
    var role = ROLE_LABEL[roleSel.value] || "Hire";

    fetch("data/v1/calculators.json").then(function (r) { return r.json(); }).then(function (cfg) {
      var monthly;
      var basis;
      if (model === "hourly") {
        monthly = rate * hours * 52 / 12;
        basis = fmt(rate) + "/hr × " + hours + " hrs/wk";
      } else if (model === "pervideo") {
        monthly = rate * units;
        basis = fmt(rate) + " × " + units + " units/mo";
      } else {
        monthly = rate;
        basis = fmt(rate) + "/mo retainer";
      }
      // add a 15% operating-overhead allowance (management time, revisions,
      // payment fees) per the hiring guide's true-cost guidance
      var loaded = monthly * 1.15;
      var annual = monthly * 12, annualLoaded = loaded * 12;

      var band = (cfg.youtube_longform_rpm_bands[niche] || [2, 10]);
      var adLo = views / 1000 * band[0], adHi = views / 1000 * band[1];
      var midAd = (adLo + adHi) / 2;
      var pctLo = midAd > 0 ? (loaded / midAd * 100) : 0;
      // views needed to cover loaded cost at band RPMs (low RPM = worst case)
      var needLo = band[1] > 0 ? (loaded / band[1] * 1000) : 0;
      var needHi = band[0] > 0 ? (loaded / band[0] * 1000) : 0;
      var threeMo = loaded * 3;

      var num = function (n) { return Math.round(n).toLocaleString("en-US"); };

      out.innerHTML =
        card("Monthly cost, " + role, range(monthly, loaded),
          basis + " · upper end includes ~15% operating overhead (management, revisions, fees)") +
        card("Annual cost", range(annual, annualLoaded), "sticker rate vs loaded") +
        card("Share of your ad revenue", pctLo > 0 ? "~" + Math.round(pctLo) + "%" : "·",
          "loaded cost vs mid-range ad revenue from " + num(views) + " monthly views (RPM $" + band[0] + "–$" + band[1] + ")") +
        card("Monthly views needed to cover it", num(needLo) + " – " + num(needHi),
          "at this niche's RPM band, lower RPM needs more views") +
        '<div class="calc-out" style="border-color:var(--cyan)"><div class="lbl">3-month coverage reserve</div>' +
        '<div class="big">' + range(threeMo / 1.15, threeMo) + "</div>" +
        '<div class="range">The hiring rule: cover 3 months from revenue before you sign. Not a guarantee, a math check.</div></div>';
    }).catch(function () {
      out.innerHTML = '<div class="error-state" role="alert" style="grid-column:1/-1">' +
        "<strong>CONFIG LOAD FAILED</strong>" +
        "<p>Could not load the calculator config (<code>data/v1/calculators.json</code>). " +
        "Check that <code>data/v1/</code> is deployed alongside this page, then try again, your inputs are still here.</p>" +
        '<button type="button" class="btn btn-ghost" data-retry>Try again</button></div>';
    });
  });

  /* error-state retry button re-submits the form */
  out.addEventListener("click", function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-retry") !== null) {
      form.requestSubmit();
    }
  });
})();
