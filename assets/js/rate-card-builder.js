/* Rate Card Builder — engine (UMD, importable in node for tests).
 *
 * Turns the site's own benchmark data into a creator's rate card:
 * one row per format, every row priced from a named block of
 * data/v1/calculators.json (the 2026 tier table, the sponsored-CPM
 * bands, the reported typical quotes, the usage-rights benchmarks)
 * with the reasoning printed next to the number. Where the data
 * carries no benchmark for a platform or format, the row says so —
 * it never borrows a number silently. The one stated exception is
 * the proxy row: platforms with no tier table of their own show the
 * YouTube band unadjusted and labeled as a reference, not a rate.
 *
 * The Algorithm Watch feed (data/v1/changes.json) rides along: the
 * newest logged changes for the chosen platform print under the
 * card, because a rate quoted against a rule that just moved is a
 * rate quoted blind.
 *
 * Planning aid — ranges, not quotes. Not financial, legal, or tax
 * advice. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RateCardBuilder = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var HONESTY = "Ranges, not quotes — every figure traces to a named " +
    "benchmark block in this site's data, and rows with no benchmark " +
    "say so instead of borrowing one.";
  var ADVICE = "Planning aid, not financial, legal, or tax advice.";

  /* Same sponsor niche table as DealRoom.NICHE_MULT,
   * DealAnalyzer.nicheMult, and NegotiationKit — tests pin parity
   * across all four. */
  var NICHE_MULT = {
    finance_investing: 2.5, tech_software: 2.5,
    education: 1.0, health_fitness: 1.0, lifestyle: 1.0,
    gaming: 0.6, comedy_entertainment: 0.6, music: 0.6,
    kids: 0.6, asmr: 0.6, creator_economy: 1.5,
    challenges_stunts: 0.6, ai_ml: 2.5, true_crime: 0.6,
    entertainment: 0.6, science: 1.0
  };
  var NICHE_LABELS = {
    finance_investing: "Finance / Investing", tech_software: "Tech / Software",
    education: "Education", health_fitness: "Health / Fitness",
    lifestyle: "Lifestyle", gaming: "Gaming",
    comedy_entertainment: "Comedy / Entertainment", music: "Music",
    kids: "Kids Content", asmr: "ASMR",
    creator_economy: "Creator Economy", challenges_stunts: "Challenges & Stunts",
    ai_ml: "AI & ML", true_crime: "True Crime",
    entertainment: "Entertainment & Comedy", science: "Science Explainers"
  };

  /* Platforms the 2026 tier table prices directly. Every other
   * platform the watch covers gets the proxy treatment — the data
   * has no tier band and no platform multiplier for it. */
  var TIER_PLATFORMS = ["youtube", "tiktok", "instagram"];
  var PLATFORMS = ["youtube", "tiktok", "instagram", "twitch", "kick", "facebook", "x"];
  var PLATFORM_LABELS = {
    youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
    twitch: "Twitch", kick: "Kick", facebook: "Facebook", x: "X"
  };
  var FORMATS = ["dedicated", "integrated", "short", "ugc"];
  var FORMAT_LABELS = {
    dedicated: "Dedicated video / post",
    integrated: "Integrated slot (mid-roll mention)",
    short: "Short-form video (Short / TikTok / Reel)",
    ugc: "UGC (no posting)"
  };
  /* Which reported typical quote (Cheerful, Sep 2026) honestly maps
   * to which platform+format. Unmapped pairs return null — the same
   * discipline the Negotiation Kit's evidence panel keeps. */
  var QUOTED_MAP = {
    "youtube:integrated": "video_integration",
    "tiktok:short": "tiktok_video",
    "instagram:short": "instagram_reel",
    "any:ugc": "ugc_no_post"
  };
  var UGC_RANGE = [150, 1000]; /* Storika Oct 2026, single-source —
    the same band DealBuilder prices UGC from. */

  var LISTED_VS_ACCEPTED = 0.23; /* rate-card disclaimer: creators
    list ~23% above what they accept — shared with the Deal Room. */

  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  /* Honest rounding for card numbers: 2 significant figures — the
   * same rounding Outreach, DealAnalyzer, and DealBuilder use. */
  function nice(n) {
    if (!isFinite(n) || n <= 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }
  function niceRange(r) { return r ? [nice(r[0]), nice(r[1])] : null; }
  function scale(r, m) { return r ? [r[0] * m, r[1] * m] : null; }

  function nicheMult(niche) {
    if (!niche || NICHE_MULT[niche] == null) return { mult: 1.0, label: null };
    return { mult: NICHE_MULT[niche], label: NICHE_LABELS[niche] };
  }

  function tierOf(followers) {
    if (followers >= 1000000) return "mega_1m_plus";
    if (followers >= 100000) return "macro_100k_1m";
    if (followers >= 10000) return "micro_10k_100k";
    return "nano_1k_10k";
  }

  function validInput(input) {
    var errors = [];
    function bad(cond, msg) { if (cond) errors.push(msg); }
    if (!input || typeof input !== "object") return { ok: false, errors: ["no input"] };
    bad(PLATFORMS.indexOf(input.platform) < 0, "unknown platform");
    bad(FORMATS.indexOf(input.format) < 0, "unknown format");
    bad(!(Number(input.followers) >= 1000), "followers must be at least 1,000 (the rate card's nano floor)");
    bad(input.niche && NICHE_MULT[input.niche] == null, "unknown niche");
    bad(input.expectedViews != null && !(Number(input.expectedViews) >= 0), "expected views must be 0 or more");
    bad(input.whitelistingMonths != null &&
        !(Number(input.whitelistingMonths) >= 0 && Number(input.whitelistingMonths) <= 24),
        "whitelisting months must be 0–24");
    return { ok: errors.length === 0, errors: errors };
  }

  function quotedFor(quoted, platform, format) {
    var id = QUOTED_MAP[platform + ":" + format] || QUOTED_MAP["any:" + format];
    if (!id || !quoted || !quoted.typical_quoted_by_format) return null;
    var hit = quoted.typical_quoted_by_format.filter(function (q) { return q.id === id; })[0];
    return hit || null;
  }

  function askFor(quoted, followers) {
    if (!quoted || !quoted.typical_ask_by_followers) return null;
    var hit = quoted.typical_ask_by_followers.filter(function (b) {
      return followers >= b.min_followers && (b.max_followers == null || followers < b.max_followers);
    })[0];
    return hit || null;
  }

  /* One format row. Returns { id, label, range|null, basis, source,
   * reasoning } — range is null exactly when the data has no honest
   * number for the pair, and reasoning says why. */
  function formatRow(format, ctx) {
    var rc = ctx.rateCard, cpms = rc.sponsored_cpms || {};
    var tierBand = ctx.tierBand, nm = ctx.nm;
    var nicheNote = nm.label ? " × niche " + nm.mult + " (" + nm.label + ")" : "";
    if (format === "dedicated") {
      if (tierBand) {
        return { id: format, label: FORMAT_LABELS[format],
          range: niceRange(scale(tierBand, nm.mult)), basis: "benchmark",
          source: "sponsorship_rate_card_2026 tier table (" + ctx.tierLabel + ")",
          reasoning: "Tier table " + fmt(tierBand[0]) + "–" + fmt(tierBand[1]) + " for " +
            PLATFORM_LABELS[ctx.platform] + " at " + ctx.tierLabel + nicheNote + "." };
      }
      var ytBand = (rc.per_video_or_post_by_tier[ctx.tier] || {}).youtube;
      return { id: format, label: FORMAT_LABELS[format],
        range: niceRange(scale(ytBand, nm.mult)), basis: "proxy",
        source: "sponsorship_rate_card_2026 tier table (YouTube column, proxy)",
        reasoning: "This site's data carries no sponsorship tier band and no platform " +
          "multiplier for " + PLATFORM_LABELS[ctx.platform] + ". Shown unadjusted: the " +
          "YouTube band at your tier (" + fmt(ytBand[0]) + "–" + fmt(ytBand[1]) + ")" + nicheNote +
          " — a reference ceiling to sanity-check against, not a " +
          PLATFORM_LABELS[ctx.platform] + " rate." };
    }
    if (format === "integrated") {
      if (ctx.platform !== "youtube") {
        return { id: format, label: FORMAT_LABELS[format], range: null, basis: "none",
          source: "no benchmark in this site's data",
          reasoning: "Integrated slots are priced in this site's data as a YouTube " +
            "long-form CPM band. No integrated benchmark exists for " +
            PLATFORM_LABELS[ctx.platform] + " — the card leaves the row blank rather " +
            "than stretch a YouTube number across platforms." };
      }
      if (!(ctx.views > 0)) {
        return { id: format, label: FORMAT_LABELS[format], range: null, basis: "none",
          source: "sponsored_cpms.youtube_integrated_slot (needs your average views)",
          reasoning: "Integrated slots price off views, not followers: the reported " +
            "band is " + fmt(cpms.youtube_integrated_slot[0]) + "–" + fmt(cpms.youtube_integrated_slot[1]) +
            " CPM. Add your last-10 average views and this row prices itself." };
      }
      var cpm = cpms.youtube_integrated_slot;
      var raw = [cpm[0] * ctx.views / 1000, cpm[1] * ctx.views / 1000];
      return { id: format, label: FORMAT_LABELS[format],
        range: niceRange(scale(raw, nm.mult)), basis: "benchmark",
        source: "sponsored_cpms.youtube_integrated_slot",
        reasoning: "Reported integrated-slot CPM " + fmt(cpm[0]) + "–" + fmt(cpm[1]) +
          " × " + Math.round(ctx.views).toLocaleString("en-US") + " average views" +
          nicheNote + "." };
    }
    if (format === "short") {
      if (ctx.views > 0) {
        var g = cpms.tiktok_youtube_general;
        var rawS = [g[0] * ctx.views / 1000, g[1] * ctx.views / 1000];
        return { id: format, label: FORMAT_LABELS[format],
          range: niceRange(scale(rawS, nm.mult)), basis: "benchmark",
          source: "sponsored_cpms.tiktok_youtube_general",
          reasoning: "General sponsored CPM " + fmt(g[0]) + "–" + fmt(g[1]) +
            " (TikTok/YouTube band in the rate card) × " +
            Math.round(ctx.views).toLocaleString("en-US") + " average views" + nicheNote + "." };
      }
      var q = quotedFor(ctx.quoted, ctx.platform, "short");
      if (q) {
        return { id: format, label: FORMAT_LABELS[format],
          range: [q.quoted_usd, q.quoted_usd], basis: "reported",
          source: q.source + " — typical quoted price (" + q.label + ")",
          reasoning: "No average views given, so no CPM math. The reported typical " +
            "quote for this format is " + fmt(q.quoted_usd) + " across tiers (" + q.source +
            ") — a cross-tier reference point, not a price scaled to your follower band." };
      }
      return { id: format, label: FORMAT_LABELS[format], range: null, basis: "none",
        source: "no benchmark in this site's data",
        reasoning: "Short-form prices in this site's data come from a CPM band (needs " +
          "your average views) or a reported typical quote — and no typical quote is " +
          "carried for " + PLATFORM_LABELS[ctx.platform] + " shorts. The row stays blank." };
    }
    /* ugc */
    return { id: format, label: FORMAT_LABELS[format],
      range: UGC_RANGE.slice(), basis: "single-source",
      source: "Storika, Oct 2026 — UGC per-30s band (single-source)",
      reasoning: "UGC is production work, not audience rental: beginner " +
        fmt(150) + "–" + fmt(400) + " / intermediate " + fmt(400) + "–" + fmt(1000) +
        " per 30 seconds (Storika, Oct 2026, single-source). Tier and niche do not " +
        "scale it — your footage quality does." };
  }

  function buildCard(input, calculators, changesFeed) {
    var v = validInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    var rc = calculators.sponsorship_rate_card_2026;
    var quoted = calculators.sponsorship_quoted_prices_2026;
    var usageTiers = (calculators.usage_rights_benchmarks_2026 || {}).tiers || [];
    var platform = input.platform;
    var tier = tierOf(Number(input.followers));
    var tierRow = rc.per_video_or_post_by_tier[tier] || {};
    var nm = nicheMult(input.niche);
    var ctx = {
      rateCard: rc, quoted: quoted, platform: platform, tier: tier,
      tierLabel: tierRow.followers || tier,
      tierBand: TIER_PLATFORMS.indexOf(platform) >= 0 ? tierRow[platform] : null,
      nm: nm, views: Number(input.expectedViews) || 0
    };
    var rows = FORMATS.map(function (f) { return formatRow(f, ctx); });
    var primary = rows.filter(function (r) { return r.id === input.format; })[0];

    /* Usage add-on rides on the primary row — the format the card
     * is being built around. */
    var usageId = input.usage || "organic_only";
    var usageTier = usageTiers.filter(function (t) { return t.id === usageId; })[0] || usageTiers[0];
    var addons = [];
    if (usageTier && usageTier.id !== "organic_only") {
      if (primary.range) {
        var pct = usageTier.addon_pct;
        addons.push({ id: "usage", label: "Paid-ad usage — " + usageTier.label,
          range: pct[1] == null
            ? [nice(primary.range[0] * pct[0] / 100), null]
            : niceRange([primary.range[0] * pct[0] / 100, primary.range[1] * pct[1] / 100]),
          openEnded: pct[1] == null, basis: "reported",
          source: "usage_rights_benchmarks_2026 (" + usageTier.label + ")",
          reasoning: usageTier.note + " Priced as its own line: +" + pct[0] + "%" +
            (pct[1] == null ? " and up" : "–" + pct[1] + "%") + " of the primary format's fee." });
      } else {
        addons.push({ id: "usage", label: "Paid-ad usage — " + usageTier.label,
          range: null, openEnded: false, basis: "none",
          source: "usage_rights_benchmarks_2026 (" + usageTier.label + ")",
          reasoning: "Usage prices as a percentage of the primary format's fee — and " +
            "that row has no benchmark, so no usage number is invented here either. " +
            usageTier.note });
      }
    }
    var wlMonths = Number(input.whitelistingMonths) || 0;
    if (wlMonths > 0) {
      var wl = calculators.usage_rights_benchmarks_2026.whitelisting_per_month_pct || [30, 100];
      if (primary.range) {
        addons.push({ id: "whitelisting", label: "Whitelisting — " + wlMonths + " month" + (wlMonths === 1 ? "" : "s"),
          range: niceRange([primary.range[0] * wl[0] / 100 * wlMonths,
                            primary.range[1] * wl[1] / 100 * wlMonths]),
          openEnded: false, basis: "reported",
          source: "usage_rights_benchmarks_2026.whitelisting_per_month_pct",
          reasoning: "Whitelisting runs " + wl[0] + "–" + wl[1] + "% of the post fee " +
            "per month (2026 benchmarks) × " + wlMonths + " month" + (wlMonths === 1 ? "" : "s") +
            " — a separate line, never folded into the post fee." });
      } else {
        addons.push({ id: "whitelisting", label: "Whitelisting — " + wlMonths + " month" + (wlMonths === 1 ? "" : "s"),
          range: null, openEnded: false, basis: "none",
          source: "usage_rights_benchmarks_2026.whitelisting_per_month_pct",
          reasoning: "Whitelisting is a percentage of the post fee (" + wl[0] + "–" + wl[1] +
            "% per month) and the primary row has no benchmark — no number is invented." });
      }
    }

    var total = null;
    if (primary.range) {
      var lo = primary.range[0], hi = primary.range[1];
      addons.forEach(function (a) {
        if (a.range) { lo += a.range[0]; hi += a.range[1] == null ? a.range[0] : a.range[1]; }
      });
      total = { range: [lo, hi],
        openEnded: addons.some(function (a) { return a.openEnded; }),
        expectedClose: [nice(lo * (1 - LISTED_VS_ACCEPTED)), nice(hi * (1 - LISTED_VS_ACCEPTED))] };
    }

    /* Evidence — reported typical quotes, kept apart from the
     * benchmark rows; the modeled Instagram cross-check rides
     * separately and only for Instagram, exactly as the Deal Room
     * keeps the two bases apart. */
    var evidence = [];
    var pq = quotedFor(quoted, platform, input.format);
    if (pq) evidence.push({ kind: "reported-quote", label: pq.label,
      value: pq.quoted_usd, basis: "reported", source: pq.source,
      note: "What creators typically quote for this format (reported asks, not closes)." });
    var ask = askFor(quoted, Number(input.followers));
    if (ask) evidence.push({ kind: "reported-ask", label: ask.band,
      value: ask.ask_usd, basis: "reported", source: ask.source,
      note: "Typical ask in your follower band (reported). Only two bands are " +
            "published in the source — no band is interpolated for you." });
    if (platform === "instagram" && quoted.instagram_feed_post_modeled) {
      evidence.push({ kind: "modeled-crosscheck", label: "Instagram feed post (modeled)",
        value: null, basis: "modeled", source: "Click Analytic, Creator Pricing Report 2026",
        note: "A modeled cross-check lives in the Deal Room's rate-card table — " +
              "kept out of this card's math so reported and modeled bases never mix." });
    }

    /* The watch: newest logged changes for this platform. */
    var watch = [];
    if (changesFeed && changesFeed.changes) {
      watch = changesFeed.changes
        .filter(function (c) { return c.platform === platform; })
        .slice(0, 3)
        .map(function (c) {
          return { id: c.id, title: c.title, category: c.category,
            confidence: c.confidence,
            announced_at: c.announced_at || null,
            detected_at: c.detected_at || null };
        });
    }

    return {
      ok: true, platform: platform, platformLabel: PLATFORM_LABELS[platform],
      tier: tier, tierLabel: ctx.tierLabel,
      followers: Number(input.followers), niche: nm,
      primaryFormat: input.format, rows: rows, primary: primary,
      addons: addons, total: total, evidence: evidence, watch: watch,
      notes: [
        "Creators list rates ~23% above what they accept — the card's total " +
        "carries the expected landing zone at ×0.77 so the gap is priced in, not discovered mid-thread.",
        "41% of creators offer package discounts on 3+ posts (rate-card data) — " +
        "a bundle price is a choice, stated on the card, never an assumed discount.",
        rc.holiday_2026_note ? "Seasonality, from the rate card: " + rc.holiday_2026_note : ""
      ].filter(Boolean),
      honesty: HONESTY, advice: ADVICE,
      disclaimer: rc.disclaimer || ""
    };
  }

  function rangeText(r, openEnded) {
    if (!r) return "no benchmark";
    if (r[1] == null) return fmt(r[0]) + "+";
    if (r[0] === r[1]) return fmt(r[0]);
    return fmt(r[0]) + "–" + fmt(r[1]) + (openEnded ? "+" : "");
  }

  function exportCard(card) {
    if (!card || !card.ok) return "";
    var out = [];
    out.push("RATE CARD — " + card.platformLabel + " · " + card.tierLabel +
      " followers" + (card.niche.label ? " · " + card.niche.label + " (×" + card.niche.mult + ")" : ""));
    out.push("");
    card.rows.forEach(function (r) {
      out.push((r.id === card.primaryFormat ? "▸ " : "  ") + r.label + ": " +
        rangeText(r.range) + "  [" + r.basis + " — " + r.source + "]");
      out.push("    " + r.reasoning);
    });
    card.addons.forEach(function (a) {
      out.push("+ " + a.label + ": " + rangeText(a.range, a.openEnded) +
        "  [" + a.basis + " — " + a.source + "]");
    });
    if (card.total) {
      out.push("");
      out.push("CARD TOTAL (primary format + add-ons): " + rangeText(card.total.range, card.total.openEnded));
      out.push("Expected landing zone (×0.77 — creators list ~23% above accepted): " +
        rangeText(card.total.expectedClose));
    }
    if (card.evidence.length) {
      out.push("");
      out.push("EVIDENCE (reported, kept apart from the benchmark rows):");
      card.evidence.forEach(function (e) {
        out.push("- " + e.label + (e.value != null ? ": " + fmt(e.value) : "") +
          " [" + e.basis + " — " + e.source + "] " + e.note);
      });
    }
    if (card.watch.length) {
      out.push("");
      out.push("ON THE WATCH for " + card.platformLabel + " (Algorithm Watch feed):");
      card.watch.forEach(function (w) {
        out.push("- " + w.title + " [" + w.category + " · " + w.confidence + "]");
      });
    }
    out.push("");
    out.push(card.honesty);
    out.push(card.advice);
    return out.join("\n");
  }

  return {
    buildCard: buildCard, exportCard: exportCard, validInput: validInput,
    tierOf: tierOf, nicheMult: nicheMult, quotedFor: quotedFor, askFor: askFor,
    NICHE_MULT: NICHE_MULT, NICHE_LABELS: NICHE_LABELS,
    PLATFORMS: PLATFORMS, FORMATS: FORMATS, TIER_PLATFORMS: TIER_PLATFORMS,
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED, UGC_RANGE: UGC_RANGE,
    HONESTY: HONESTY, ADVICE: ADVICE, fmt: fmt, nice: nice
  };
});
