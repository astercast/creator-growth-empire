/* The Deal Builder, package a sponsor deal from deliverables into a
 * line-item quote, a ready-to-send proposal, and a deal checklist.
 * UMD: works in the browser (window.DealBuilder) and in node
 * (module.exports).
 *
 * HONESTY CONTRACT: every rate is a reported range read from the real
 * 2026 rate card (data/v1/calculators.json sponsorship_rate_card_2026)
 * and the 2026 usage-rights benchmarks (usage_rights_benchmarks_2026),
 * never a quote, never a promise. The quote is the TOP of the range
 * (creators list ~23% above what they accept; the expected close lands
 * ~23% lower) and the output says so. Pitch text never invents stats,
 * every number the creator hasn't supplied stays a [bracket]. The
 * checklist is a negotiation aid, NOT legal advice. Not financial,
 * legal, or tax advice.
 *
 * Differentiation: the Outreach Center quotes a single deliverable and
 * the Deal Analyzer evaluates an inbound offer. The Deal Builder is the
 * package layer, multiple deliverables, usage + whitelisting + 
 * exclusivity as stacked line items, exclusivity-window conflict checks,
 * a proposal email built from the actual quote, and a checklist built
 * from the actual terms. Same data, new job.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.DealBuilder = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Creators list rates ~23% above what they accept (projectcasting /
   * InfluenceFlow 2026, 1,347 creator profiles; re-verified Oct 2026).
   * Parity pin: Outreach.LISTED_VS_ACCEPTED and DealAnalyzer use the
   * same constant, the site's quote math is one number everywhere. */
  var LISTED_VS_ACCEPTED = 0.23;

  var PLATFORMS = ["youtube", "tiktok", "instagram"];
  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
  var KINDS = ["dedicated", "integrated", "short", "ugc"];
  var KIND_LABELS = {
    dedicated: "Dedicated video",
    integrated: "Integrated slot",
    short: "Short-form video",
    ugc: "UGC (no posting)"
  };
  var USAGE_IDS = ["organic_only", "paid_3mo", "paid_6mo", "paid_12mo", "perpetual"];
  var USAGE_LABELS = {
    organic_only: "Organic only",
    paid_3mo: "Paid ads · 3 months",
    paid_6mo: "Paid ads · 3–6 months",
    paid_12mo: "Paid ads · 6–12 months",
    perpetual: "Perpetual / unlimited"
  };
  var EXCL_SCOPES = ["none", "named", "category"];

  /* Storika Oct 2026 (single-source): UGC per-30s rates, creator-reported.
   * Kept as a constant range rather than a per-level input, the tool
   * quotes the honest band and says which end is which. */
  var UGC_RANGE = [150, 1000];

  /* Honest rounding for quote numbers: 2 significant figures. Same as
   * Outreach.nice / DealAnalyzer, the site's quote math rounds the same. */
  function nice(n) {
    if (n <= 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function fmtRange(r) { return fmt(r[0]) + "–" + fmt(r[1]); }

  function mo(n) { return n === 1 ? "1 month" : n + " months"; }

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

  function validInput(input) {
    var errors = [];
    function bad(cond, msg) { if (cond) errors.push(msg); }
    bad(!input || typeof input !== "object", "input must be an object");
    var inp = input || {};
    bad(!(inp.followers >= 1000), "followers must be at least 1,000 (nano floor)");
    bad(inp.followers >= 100000000, "followers above 100M is outside the benchmark universe");
    var dels = inp.deliverables;
    bad(!Array.isArray(dels) || dels.length === 0, "add at least one deliverable");
    bad(Array.isArray(dels) && dels.length > 8, "more than 8 deliverable lines, split into two deals");
    (Array.isArray(dels) ? dels : []).forEach(function (d, i) {
      var at = "deliverable " + (i + 1);
      bad(PLATFORMS.indexOf(d.platform) < 0, at + ": unknown platform");
      bad(KINDS.indexOf(d.kind) < 0, at + ": unknown deliverable kind");
      bad(!(d.count >= 1) || d.count > 12, at + ": count must be 1–12");
    });
    bad(typeof inp.viewsAvg !== "undefined" && !(inp.viewsAvg >= 0),
        "viewsAvg must be 0 or a positive number");
    bad(USAGE_IDS.indexOf(inp.usage) < 0, "unknown usage tier");
    bad(!(inp.whitelistingMonths >= 0) || inp.whitelistingMonths > 24,
        "whitelistingMonths must be 0–24");
    var ex = inp.exclusivity || { scope: "none", months: 0 };
    bad(EXCL_SCOPES.indexOf(ex.scope) < 0, "unknown exclusivity scope");
    bad(!(ex.months >= 0) || ex.months > 24, "exclusivity months must be 0–24");
    bad(ex.scope === "none" && ex.months > 0, "exclusivity months set but scope is none");
    bad(ex.scope !== "none" && !(ex.months >= 1), "exclusivity scope set but months is 0");
    if (inp.affiliate) {
      bad(!(inp.affiliate.commissionPct >= 0) || inp.affiliate.commissionPct > 90,
          "affiliate commissionPct must be 0–90");
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function norm(input) {
    var out = {
      followers: Number(input.followers),
      viewsAvg: input.viewsAvg ? Number(input.viewsAvg) : 0,
      deliverables: input.deliverables.map(function (d) {
        return { platform: d.platform, kind: d.kind, count: Math.floor(Number(d.count)) };
      }),
      usage: input.usage,
      whitelistingMonths: Math.floor(Number(input.whitelistingMonths || 0)),
      exclusivity: {
        scope: (input.exclusivity && input.exclusivity.scope) || "none",
        months: Math.floor(Number((input.exclusivity && input.exclusivity.months) || 0))
      },
      affiliate: input.affiliate ? {
        include: !!input.affiliate.include,
        commissionPct: Number(input.affiliate.commissionPct || 0)
      } : { include: false, commissionPct: 0 }
    };
    return out;
  }

  /* Per-unit base range for one deliverable, from the real rate card.
   * Returns {range:[lo,hi], basis, note}, basis names the data used so
   * the UI can cite it; note carries the honest fallback when views are
   * missing for CPM-anchored kinds. */
  function deliverableBase(kind, platform, tier, viewsAvg, rateCard) {
    var card = rateCard.sponsorship_rate_card_2026;
    var tierBand = card.per_video_or_post_by_tier[tier][platform];
    var cpms = card.sponsored_cpms;
    if (kind === "dedicated") {
      return { range: [tierBand[0], tierBand[1]], basis: "rate card tier range",
               note: tierLabel(tier) + " " + PLATFORM_LABELS[platform] + " per-video band" };
    }
    if (kind === "ugc") {
      return { range: [UGC_RANGE[0], UGC_RANGE[1]], basis: "Storika UGC band (single-source)",
               note: "UGC without posting: beginner $150–$400 / intermediate $400–$1,000 per 30s (Storika, Oct 2026, single-source)" };
    }
    /* integrated + short anchor to sponsored CPM bands when the creator
     * supplied a real views average, sponsors buy views, not subs.
     * Without views, the honest fallback is half the tier band, labeled. */
    var cpmBand = (kind === "integrated" && platform === "youtube")
      ? cpms.youtube_integrated_slot
      : cpms.tiktok_youtube_general;
    if (viewsAvg > 0) {
      var lo = viewsAvg / 1000 * cpmBand[0];
      var hi = viewsAvg / 1000 * cpmBand[1];
      return { range: [lo, hi], basis: "sponsored CPM × your views",
               note: "Sponsored CPM $" + cpmBand[0] + "–$" + cpmBand[1] +
                     " × " + Math.round(viewsAvg).toLocaleString("en-US") +
                     " avg views (" + (kind === "integrated" && platform === "youtube"
                       ? "YouTube integrated slot" : "short-form general") + " band)" };
    }
    return { range: [tierBand[0] * 0.5, tierBand[1] * 0.5], basis: "tier range × 0.5 (no views supplied)",
             note: "No views average supplied, priced at half the tier band. Supply your last-10-video average for the CPM-anchored math." };
  }

  /* Look up the usage tier record from calculators.json
   * usage_rights_benchmarks_2026 (calculators v1.5.0). */
  function usageTier(id, usageRights) {
    var tiers = (usageRights && usageRights.tiers) || [];
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i].id === id) return tiers[i];
    }
    return null;
  }

  /* The full package quote. All inputs validated first; rateCard and
   * usageRights are the real JSON docs (calculators.json blocks).
   * Returns lines[], totals, flags, and the honesty notes. */
  function buildQuote(input, rateCard, usageRights) {
    var v = validInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    var inp = norm(input);
    var tier = tierOf(inp.followers);
    var notes = [];

    var lines = inp.deliverables.map(function (d) {
      var b = deliverableBase(d.kind, d.platform, tier, inp.viewsAvg, rateCard);
      return {
        label: d.count + "× " + KIND_LABELS[d.kind] + " · " + PLATFORM_LABELS[d.platform],
        kind: d.kind, platform: d.platform, count: d.count,
        perUnit: [nice(b.range[0]), nice(b.range[1])],
        line: [nice(b.range[0] * d.count), nice(b.range[1] * d.count)],
        basis: b.basis, note: b.note
      };
    });

    function sumRange(rs) {
      return [rs.reduce(function (a, r) { return a + r[0]; }, 0),
              rs.reduce(function (a, r) { return a + r[1]; }, 0)];
    }
    var baseTotal = sumRange(lines.map(function (l) { return l.line; }));
    baseTotal = [nice(baseTotal[0]), nice(baseTotal[1])];

    /* Usage add-on: priced on the post-fee base of the non-UGC lines.
     * UGC is production-only; paid-ad usage of UGC is the whole product
     * and gets its own flag, not silent math. */
    var licensable = sumRange(lines.filter(function (l) { return l.kind !== "ugc"; })
      .map(function (l) { return l.line; }));
    var usage = usageTier(inp.usage, usageRights);
    var usageAddon = [0, 0], usageNote = "Organic only, no paid-ad usage priced.";
    if (usage && inp.usage !== "organic_only") {
      var pct = usage.addon_pct;
      var hiPct = pct[1] === null ? null : pct[1];
      usageAddon = [nice(licensable[0] * pct[0] / 100),
                    hiPct === null ? Infinity : nice(licensable[1] * hiPct / 100)];
      usageNote = usage.label + ": +" + pct[0] + (hiPct === null ? "% or more" : "–" + hiPct + "%") +
                  " of the post-fee base, as its own line item.";
      if (inp.usage === "perpetual") {
        notes.push("Perpetual usage is open-ended, the high end has no ceiling. " +
                   "Price it from 2× base as its own line item, or refuse.");
      }
    }

    /* Whitelisting: monthly on the post-fee base, 30–100%/mo. */
    var wlPct = (usageRights && usageRights.whitelisting_per_month_pct) || [30, 100];
    var wlAddon = [0, 0], wlNote = "No whitelisting.";
    if (inp.whitelistingMonths > 0) {
      wlAddon = [nice(licensable[0] * wlPct[0] / 100 * inp.whitelistingMonths),
                 nice(licensable[1] * wlPct[1] / 100 * inp.whitelistingMonths)];
      wlNote = "Whitelisting " + inp.whitelistingMonths + " mo × " + wlPct[0] + "–" + wlPct[1] +
               "% of post-fee base per month, monthly, revocable, never perpetual.";
    }

    /* Exclusivity premium: named-competitor windows have benchmark
     * pricing; broad category locks get flagged, not invented. */
    var ex = inp.exclusivity;
    var exAddon = [0, 0], exNote = "No exclusivity.";
    var exFlag = null;
    if (ex.scope === "named") {
      var exPct = ex.months <= 1 ? 25 : 50;
      exAddon = [nice(licensable[0] * exPct / 100), nice(licensable[1] * exPct / 100)];
      exNote = "Named-competitor exclusivity, " + ex.months + " mo: +" + exPct +
               "% of post-fee base (benchmark: +25% for 30d, +50% for 60–90d).";
    } else if (ex.scope === "category") {
      exNote = "Broad category exclusivity, " + ex.months + " mo: no benchmark multiplier, " +
               "the premium must cover the deals you'd lose. Narrow to named competitors or price the lost pipeline.";
      if (ex.months >= 6) {
        exFlag = { level: "walk_away",
          text: "Broad category exclusivity for " + ex.months + " months without a priced premium " +
                "can freeze out a quarter of your sponsor income. Narrow it to named competitors " +
                "or don't sign it as written." };
      }
    }

    function addR(a, b) {
      var hi = (a[1] === Infinity || b[1] === Infinity) ? Infinity : a[1] + b[1];
      return [a[0] + b[0], hi];
    }
    var total = addR(addR(addR(baseTotal, usageAddon), wlAddon), exAddon);
    total = [nice(total[0]), total[1] === Infinity ? Infinity : nice(total[1])];

    /* Quote at the top of the range; the market lands ~23% lower. */
    var expectedClose = [nice(total[0] * (1 - LISTED_VS_ACCEPTED)),
                         total[1] === Infinity ? Infinity : nice(total[1] * (1 - LISTED_VS_ACCEPTED))];

    var totalUnits = inp.deliverables.reduce(function (a, d) { return a + d.count; }, 0);
    if (totalUnits >= 3) {
      notes.push("41% of creators offer package discounts on 3+ posts (InfluenceFlow 2026), " +
                 "build a 10–15% bundle line into the proposal rather than conceding it under pressure.");
    }
    var platforms = {};
    inp.deliverables.forEach(function (d) { platforms[d.platform] = 1; });
    if (Object.keys(platforms).length > 1) {
      notes.push("Multi-platform bundles add 30–50% over single-platform pricing (rate-card negotiation data), " +
                 "the same concept across platforms is more than the sum of the parts.");
    }
    if (inp.followers >= 10000000) {
      notes.push("Above 10M followers the public benchmarks thin out, verify against current creator rate reports before quoting.");
    }
    if (inp.usage === "organic_only" && inp.whitelistingMonths > 0) {
      notes.push("Whitelisting implies paid usage, with organic-only usage selected, add an explicit paid-ad usage line or the brand gets ads for free.");
    }
    notes.push("Quote at the top of the range: creators list ~23% above what they accept, " +
               "so the expected landing zone is " + fmtRange(expectedClose) +
               (expectedClose[1] === Infinity ? " (open-ended on the high side)" : "") + ".");
    notes.push("Ranges, not quotes, niche, engagement, and geography move the real number. " +
               "Verify against current creator rate reports before you send.");

    return {
      ok: true, tier: tier, tierLabel: tierLabel(tier),
      lines: lines, baseTotal: baseTotal,
      usage: { label: usage ? usage.label : inp.usage, addon: usageAddon, note: usageNote },
      whitelisting: { months: inp.whitelistingMonths, addon: wlAddon, note: wlNote },
      exclusivity: { scope: ex.scope, months: ex.months, addon: exAddon, note: exNote, flag: exFlag },
      total: total, expectedClose: expectedClose,
      affiliate: inp.affiliate, notes: notes,
      disclaimer: DISCLAIMER
    };
  }

  /* Exclusivity / usage-window conflict checks. Returns flags with
   * level (note|flag|walk_away) and text. These are structural checks,
   * the tool can't see your other contracts, and it says so. */
  function exclusivityConflicts(input) {
    var v = validInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    var inp = norm(input);
    var flags = [];
    var ex = inp.exclusivity;

    var usageMonths = { organic_only: 0, paid_3mo: 3, paid_6mo: 6, paid_12mo: 12, perpetual: Infinity }[inp.usage];
    if (ex.scope !== "none" && usageMonths > 0 && usageMonths !== Infinity && ex.months < usageMonths) {
      flags.push({ level: "flag",
        text: "Your exclusivity ends at " + mo(ex.months) + " but the brand's paid-ad usage runs " +
              mo(usageMonths) + ", your face advertises them while you're free to promote a competitor. " +
              "Align the windows in writing." });
    }
    if (ex.scope === "category" && ex.months >= 6) {
      flags.push({ level: "walk_away",
        text: "Broad category lock for " + mo(ex.months) + ": the premium must cover the deals you'd lose. " +
              "Narrow to named competitors with a term, or walk away as written." });
    }
    if (ex.scope === "category" && ex.months >= 3 && ex.months < 6) {
      flags.push({ level: "flag",
        text: "Category exclusivity without named competitors, 'competing' is whatever their lawyer says. " +
              "Name the competitors in the contract." });
    }
    if (inp.usage === "perpetual" && ex.scope !== "none") {
      flags.push({ level: "flag",
        text: "Perpetual paid-ad usage plus exclusivity: the creative runs forever while the lock expires. " +
              "If the usage is forever, the exclusivity math needs to match, or the usage needs a term." });
    }
    if (inp.whitelistingMonths > 0 && ex.scope !== "none" && inp.whitelistingMonths > ex.months) {
      flags.push({ level: "flag",
        text: "Whitelisting runs " + mo(inp.whitelistingMonths) + " but exclusivity ends at " + mo(ex.months) +
              ", ads from your account outlive the lock. Align the terms." });
    }
    if (inp.whitelistingMonths > 12) {
      flags.push({ level: "flag",
        text: mo(inp.whitelistingMonths) + " of whitelisting is a long rental of your credibility, " +
              "keep it revocable in writing and set a re-negotiation point, never an auto-renew." });
    }
    var onlyUgc = inp.deliverables.every(function (d) { return d.kind === "ugc"; });
    if (inp.affiliate.include && onlyUgc && inp.followers < 100000) {
      flags.push({ level: "flag",
        text: "Affiliate on a UGC-only package under 100K followers: no distribution " +
              "behind the creative, and the audience isn't large enough for commission " +
              "math to beat a flat fee. Price the UGC as production work." });
    }
    if (inp.affiliate.include && inp.affiliate.commissionPct >= 30) {
      flags.push({ level: "note",
        text: "A " + inp.affiliate.commissionPct + "% commission is generous, brands sometimes " +
              "use big affiliate rates to justify dropping the flat fee. Keep the fee; " +
              "the affiliate is the bonus, not the deal." });
    }
    var ugcPaid = inp.deliverables.some(function (d) { return d.kind === "ugc"; }) &&
                  inp.usage !== "organic_only";
    if (ugcPaid) {
      flags.push({ level: "note",
        text: "UGC with paid-ad usage selected: the usage IS the product here, price it as the main line, " +
              "not an add-on to a post fee that doesn't exist." });
    }
    flags.push({ level: "note",
      text: "This check can't see your other contracts, if you're under an existing exclusivity, " +
             "the overlap is yours to verify before you sign." });
    return { ok: true, flags: flags };
  }

  /* The deal checklist, generated from the quote's actual terms.
   * Groups of {id, title, items[]}, items are {id, text, detail}. */
  function buildChecklist(quote) {
    if (!quote || !quote.ok) return { ok: false, errors: ["build the quote first"] };
    function item(id, text, detail) { return { id: id, text: text, detail: detail || "" }; }
    var groups = [
      { id: "usage", title: "Usage rights",
        items: [
          item("usage-line", "Paid-ad usage is its own line item, never folded into the post fee",
            quote.usage.label + (quote.usage.addon[0] > 0 ? ", priced at " + fmtRange(quote.usage.addon) : "") + "."),
          item("usage-term", "The usage term has a hard end date in the contract",
            quote.usage.label === "Organic only"
              ? "Organic only selected, if the brand runs a single paid impression, that's a new line item."
              : "End date written in: no auto-renew, no 'all media hereafter devised' without a term."),
          item("usage-perpetual", "Perpetual usage is priced from 2× base or refused",
            quote.usage.label.indexOf("Perpetual") === 0
              ? "Perpetual selected, the open-ended high end is the point. Refuse or price it like forever."
              : "Not selected, keep it that way unless the line item reflects it.")
        ] },
      { id: "payment", title: "Payment terms",
        items: [
          item("pay-upfront", "50% upfront from any brand you haven't worked with", "New-brand rule, no exceptions."),
          item("pay-net", "Net-30 in the contract, with late-payment terms", "Net-60 is a negotiation; net-90 without escrow is a walk-away flag."),
          item("pay-kill", "Kill fee if they cancel after you've filmed", "Standard shape: 50% of the fee once production starts.")
        ] },
      { id: "revisions", title: "Revisions & approvals",
        items: [
          item("rev-rounds", "Two revision rounds included; additional rounds at a named rate", "An open revision clause is a blank check on your time."),
          item("rev-approval", "Approvals are talking points, not scripts", "The brand approves factual accuracy and brand safety, not your personality."),
          item("rev-window", "Approval window with silence = approval", "48–72 hours keeps one slow legal department from holding your calendar hostage.")
        ] },
      { id: "exclusivity", title: "Exclusivity",
        items: [
          item("ex-named", "Competitors named in the contract, never a bare category",
            quote.exclusivity.scope === "category"
              ? "Category scope selected, narrow it to named competitors before signing."
              : quote.exclusivity.scope === "named"
                ? "Named scope selected for " + quote.exclusivity.months + " months, write the names in."
                : "No exclusivity selected, the cleanest term there is."),
          item("ex-premium", "The exclusivity premium is priced, not implied",
            quote.exclusivity.addon[0] > 0
              ? "Priced at " + fmtRange(quote.exclusivity.addon) + " on the quote."
              : "No premium priced, broad locks without one are the most expensive signature in the file."),
          item("ex-windows", "Exclusivity window aligns with the usage window",
            "If the windows disagree, fix the mismatch in writing before you sign.")
        ] },
      { id: "ftc", title: "FTC disclosure",
        items: [
          item("ftc-require", "The contract REQUIRES disclosure, never implies hiding it",
            "A contract that hides disclosure asks you to break the law for them. 2026 fines: $53,088/violation under the FTC Act; $51,744 under the reviews rule."),
          item("ftc-how", "#ad early and verbal + on-screen, the platform tag alone isn't enough",
            "Clear and conspicuous: first lines of the description, spoken in the video, on screen. Disclosure doesn't cost engagement, disclosed posts hold 10.4% TikTok / 3.9% IG median engagement."),
          item("ftc-ai", "AI-generated endorsement? It needs its own disclosure too",
            "2026 enforcement priority: AI endorsements and deepfakes. Double disclosure, paid AND AI.")
        ] },
      { id: "deliverables", title: "Deliverables & timeline",
        items: [
          item("del-spec", "Every deliverable named, counted, and dated",
            quote.lines.map(function (l) { return l.label; }).join("; ") + ". 'Other promotional activities as reasonably requested' is a second deal you haven't priced."),
          item("del-wl", "Whitelisting is monthly, revocable, and dated",
            quote.whitelisting.months > 0
              ? quote.whitelisting.months + " months priced at " + fmtRange(quote.whitelisting.addon) + ", revocation clause in writing."
              : "No whitelisting selected, if they ask later, it's a new line item."),
          item("del-affiliate", "Affiliate terms written: rate, cookie window, payout schedule",
            quote.affiliate.include
              ? quote.affiliate.commissionPct + "% commission selected, get the cookie window and payout timing in writing."
              : "No affiliate selected, if they add one later, it's a bonus on the flat fee, not a replacement.")
        ] },
      { id: "walkaway", title: "Your walk-away line",
        items: [
          item("wa-number", "Walk-away number decided BEFORE the call, written down",
            "Below " + fmt(quote.expectedClose[0]) + " (the low end of the expected landing zone) you keep the slot for your own affiliate push. Decided calm, held firm."),
          item("wa-lawyer", "Above $500, or with indemnification, IP assignment, or jurisdiction clauses, a real lawyer reads it",
            "This checklist scores structure. A lawyer judges enforceability. Not legal advice.")
        ] }
    ];
    return { ok: true, groups: groups, disclaimer: DISCLAIMER };
  }

  /* The proposal email, built from the actual quote. Every stat the
   * creator hasn't supplied stays a [bracket], the generator never
   * invents a number. Returns {subject, body}. */
  function renderPitch(input, quote) {
    var v = validInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (!quote || !quote.ok) return { ok: false, errors: ["build the quote first"] };
    var inp = norm(input);
    var lines = quote.lines.map(function (l) {
      return "- " + l.label + ", " + fmtRange(l.line) + " (" + l.basis + ")";
    }).join("\n");
    var totalLine = quote.total[1] === Infinity
      ? fmt(quote.total[0]) + "+ (open-ended: perpetual usage has no ceiling)"
      : fmtRange(quote.total);
    var extras = [];
    if (quote.usage.addon[0] > 0) extras.push("Usage: " + quote.usage.label + " at " + fmtRange(quote.usage.addon));
    if (quote.whitelisting.months > 0) extras.push("Whitelisting: " + quote.whitelisting.months + " mo at " + fmtRange(quote.whitelisting.addon));
    if (quote.exclusivity.addon[0] > 0) extras.push("Exclusivity: " + quote.exclusivity.note);
    if (inp.affiliate.include) extras.push("Affiliate: " + inp.affiliate.commissionPct + "% commission on top of the flat fee");

    var subject = "[Channel] x [Brand], sponsorship package proposal";
    var body =
      "Hi [Contact name],\n" +
      "\n" +
      "I'm [Your name], I make [niche in one line] for [audience size + descriptor]. " +
      "My last 10 videos averaged [X] views, [Y%] in [their market].\n" +
      "\n" +
      "Here's the package I'd build for [Brand]:\n" +
      "\n" +
      lines + "\n" +
      "\n" +
      "Package total: " + totalLine + "\n" +
      (extras.length ? extras.join("\n") + "\n" : "") +
      "\n" +
      "Usage rights are priced as their own line item above, the post fee covers organic placement only. " +
      "Payment: 50% upfront, net-30 on delivery. Two revision rounds included; approvals on talking points.\n" +
      "\n" +
      "Timeline: I can deliver the first piece [date, ~2 weeks out]. " +
      (quote.exclusivity.scope !== "none"
        ? "Exclusivity as priced above (" + quote.exclusivity.scope + ", " + quote.exclusivity.months + " mo), competitors named in the contract.\n" : "") +
      "\n" +
      "Open to a 15-minute call this week to lock the scope?\n" +
      "\n" +
      "[Your name] · [channel link] · [media kit link]\n" +
      "\n" +
      "·\n" +
      "Ranges from the 2026 creator rate card (benchmarks, not quotes). Not financial, legal, or tax advice.";
    return { ok: true, subject: subject, body: body,
             bracketCount: (body.match(/\[/g) || []).length, disclaimer: DISCLAIMER };
  }

  var DISCLAIMER = "Negotiation aid, not financial, legal, or tax advice. " +
    "Rates are reported 2026 benchmarks (ranges, never quotes). The contract " +
    "checklist is not legal advice; contracts above $500 deserve a real lawyer's eyes.";

  return {
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED,
    PLATFORMS: PLATFORMS, PLATFORM_LABELS: PLATFORM_LABELS,
    KINDS: KINDS, KIND_LABELS: KIND_LABELS,
    USAGE_IDS: USAGE_IDS, USAGE_LABELS: USAGE_LABELS,
    EXCL_SCOPES: EXCL_SCOPES, UGC_RANGE: UGC_RANGE,
    DISCLAIMER: DISCLAIMER,
    validInput: validInput, norm: norm, _mo: mo,
    tierOf: tierOf, tierLabel: tierLabel,
    nice: nice, fmt: fmt, fmtRange: fmtRange,
    deliverableBase: deliverableBase, usageTier: usageTier,
    buildQuote: buildQuote, exclusivityConflicts: exclusivityConflicts,
    buildChecklist: buildChecklist, renderPitch: renderPitch
  };
});
