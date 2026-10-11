/* Revenue Calculator: honest-range projections from calculators.json config. */
(function () {
  "use strict";
  var form = document.getElementById("calc-form");
  var out = document.getElementById("calc-results");
  if (!form || !out) return;

  function fmt(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function range(lo, hi) {
    return fmt(lo) + " – " + fmt(hi);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (id) { return Math.max(0, parseFloat(document.getElementById(id).value) || 0); };
    var views = v("c-views"), shorts = v("c-shorts"), sponsors = v("c-sponsors"),
        sviews = v("c-sviews"), aff = v("c-aff");
    var niche = document.getElementById("c-niche").value;

    fetch("api/v1/calculators.json").then(function (r) { return r.json(); }).then(function (cfg) {
      var band = (cfg.youtube_longform_rpm_bands[niche] || [2, 10]);
      var adLo = views / 1000 * band[0], adHi = views / 1000 * band[1];
      var sh = cfg.shorts_rpm_per_1000;
      var shLo = shorts / 1000 * sh[0], shHi = shorts / 1000 * sh[1];
      var sp = cfg.sponsorship_rule_of_thumb.dedicated_cpm_range;
      var spLo = sponsors * (sviews / 1000) * sp[0], spHi = sponsors * (sviews / 1000) * sp[1];
      var affLo = aff * 0.7, affHi = aff * 1.3;

      var totLo = adLo + shLo + spLo + affLo, totHi = adHi + shHi + spHi + affHi;

      out.innerHTML =
        card("Long-form ads", range(adLo, adHi), "RPM $" + band[0] + "–$" + band[1] + " · " + Math.round(views).toLocaleString() + " views") +
        card("Shorts ads", range(shLo, shHi), "RPM $" + sh[0] + "–$" + sh[1] + " · pooled 45% model") +
        card("Sponsorships", range(spLo, spHi), sponsors + " video(s) × ~$" + sp[0] + "–$" + sp[1] + " CPM") +
        card("Affiliate / products", range(affLo, affHi), "your input ±30%") +
        '<div class="calc-out" style="border-color:var(--acid)"><div class="lbl">Estimated monthly total</div>' +
        '<div class="big">' + range(totLo, totHi) + "</div>" +
        '<div class="range">Annualized: ' + range(totLo * 12, totHi * 12) + " · before taxes, fees, costs</div></div>" +
        '<p class="muted" style="grid-column:1/-1">Ranges, not promises. Ad rates move with season (Q4 pays ~30–50% more), geography, and niche. Sponsors are usually 50–80% of a mid-size creator\'s income — notice how they dominate the math above.</p>';
    }).catch(function () {
      out.innerHTML = "<p>Could not load calculator config.</p>";
    });
  });

  function card(label, big, sub) {
    return '<div class="calc-out"><div class="lbl">' + label + '</div><div class="big">' + big +
      '</div><div class="range">' + sub + "</div></div>";
  }
})();
