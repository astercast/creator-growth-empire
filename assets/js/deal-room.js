/* The Deal Room 2.0 — pure deal math (no DOM).
 * UMD: works in the browser (window.DealRoom) and in node (module.exports).
 *
 * HONESTY CONTRACT: every benchmark is a reported range from the 2026 rate
 * card (data/v1/calculators.json sponsorship_rate_card_2026), never a quote.
 * Deal Room 2.0 adds the quoted-prices lens (sponsorship_quoted_prices_2026:
 * Cheerful's Sep-2026 negotiation data, reported; Click Analytic's 2026
 * Instagram model, labeled modeled) and the Algorithm Watch digest
 * (data/v1/changes.json — dated, sourced, confidence-flagged). Usage-rights
 * multipliers are the wave-2 research band (+50–100%), flagged per tier as
 * reported vs. definitional. Not financial, legal, or tax advice.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.DealRoom = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Creators list rates ~23% above what they accept — from the 2026 rate card
   * chapter. Quoted in deal memos and tracker scorecards as the reason to
   * quote at the top of the range and expect to be negotiated down. */
  var LISTED_VS_ACCEPTED = 0.23;

  /* Status pipeline for the tracker: offer -> negotiating -> signed ->
   * delivered -> paid. */
  var STATUSES = ["offer", "negotiating", "signed", "delivered", "paid"];
  var STATUS_LABELS = {
    offer: "Offer",
    negotiating: "Negotiating",
    signed: "Signed",
    delivered: "Delivered",
    paid: "Paid"
  };

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

  /* Score one offer against a rate-card range. Returns "under" | "fair" |
   * "over". The ~23% note travels with every verdict. */
  function scoreOffer(offer, lo, hi) {
    var verdict = offer < lo ? "under" : offer > hi ? "over" : "fair";
    return {
      verdict: verdict,
      badge: verdict === "under" ? "UNDERPAID" : verdict === "over" ? "STRONG" : "FAIR",
      note: "Creators list rates ~" + Math.round(LISTED_VS_ACCEPTED * 100) +
        "% above what they accept — quote at the top of the range and expect " +
        "to be negotiated down."
    };
  }

  /* Price one usage-rights tier against a base post fee. tiers is
   * deal-templates.json usage_rights_tiers. Returns {addonLo, addonHi,
   * totalLo, totalHi, label, note}; whitelisting/buyout have no safe
   * multiplier and return nulls with guidance instead of fake numbers. */
  function priceUsage(baseFee, tierId, tiers) {
    var tier = null;
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i].id === tierId) { tier = tiers[i]; break; }
    }
    if (!tier) return null;
    var m = tier.multiplier;
    if (!m) {
      return { addonLo: null, addonHi: null, totalLo: null, totalHi: null,
        label: tier.label,
        note: "No research-backed multiplier exists for this tier (" +
          tier.basis + "). Price it as its own line item — enter your own " +
          "monthly rate (whitelisting) or negotiate a separate figure (buyout)." };
    }
    var addonLo = Math.max(0, (m[0] - 1)) * baseFee;
    var addonHi = m[1] === null ? null : Math.max(0, (m[1] - 1)) * baseFee;
    return {
      addonLo: addonLo, addonHi: addonHi,
      totalLo: baseFee + addonLo,
      totalHi: addonHi === null ? null : baseFee + addonHi,
      label: tier.label,
      reported: !!tier.reported,
      note: tier.multiplier_label + ". " + tier.basis
    };
  }

  /* Score the interactive red-flag checklist. selectedIds is the array of
   * checked red_flags[].id; flags is the red_flags array from
   * deal-templates.json. Any walk_away flag -> walk_away; otherwise
   * score = 2*major + 1*minor; 0 clean, 1-2 caution, 3+ walk_away. */
  function redFlagScore(selectedIds, flags) {
    var byId = {};
    flags.forEach(function (f) { byId[f.id] = f; });
    var walkAway = [];
    var score = 0;
    selectedIds.forEach(function (id) {
      var f = byId[id];
      if (!f) return;
      if (f.severity === "walk_away") walkAway.push(f);
      else if (f.severity === "major") score += 2;
      else if (f.severity === "minor") score += 1;
    });
    var verdict, verdictText;
    if (walkAway.length) {
      verdict = "walk_away";
      verdictText = "Walk away — a walk-away clause is checked, and no price fixes a hostile structure.";
    } else if (score >= 3) {
      verdict = "walk_away";
      verdictText = "Walk away — the flagged terms stack up to a deal that costs you more than it pays.";
    } else if (score >= 1) {
      verdict = "caution";
      verdictText = "Caution — fix the flagged terms in writing before you sign.";
    } else {
      verdict = "clean";
      verdictText = "Clean — no structural red flags checked. Price the post next.";
    }
    return { score: score, verdict: verdict, verdictText: verdictText,
             walkAwayFlags: walkAway.map(function (f) { return f.title; }) };
  }

  /* Fill a negotiation script's {{placeholders}} from vars. Unknown
   * placeholders are left visible as-is so nothing silently lies. */
  function renderScript(script, vars) {
    return String(script.body).replace(/\{\{(\w+)\}\}/g, function (m, key) {
      return (vars && vars[key] !== undefined && vars[key] !== null)
        ? String(vars[key]) : m;
    });
  }

  /* Build the one-page deal memo (plain text) for the creator's records. */
  function dealMemo(deal, scored, flagsSummary) {
    var L = [];
    L.push("DEAL MEMO — " + (deal.brand || "(brand TBD)") + " · " +
      (deal.createdAt || "").slice(0, 10));
    L.push("Generated by the Deal Room (Creator Growth Empire).");
    L.push("");
    L.push("TERMS");
    L.push("  Status: " + (STATUS_LABELS[deal.status] || deal.status));
    L.push("  Deliverable: " + (deal.deliverable || "—") + " on " + (deal.platform || "—"));
    L.push("  Offered pay: " + fmt(deal.offer || 0));
    L.push("  Usage rights: " + (deal.usage || "—"));
    L.push("  Exclusivity: " + (deal.exclusivity || "—"));
    L.push("  Payment terms: " + (deal.payTerms || "—"));
    L.push("  Timeline: " + (deal.timeline || "—"));
    if (deal.notes) L.push("  Notes: " + deal.notes);
    L.push("");
    L.push("RATE-CARD SCORE");
    L.push("  Verdict: " + (scored ? scored.badge : "UNAVAILABLE"));
    if (scored) {
      L.push("  " + scored.note);
    }
    L.push("");
    L.push("RED FLAGS" + (flagsSummary ? " (" + flagsSummary.verdictText + ")" : ""));
    if (flagsSummary && flagsSummary.checkedTitles && flagsSummary.checkedTitles.length) {
      flagsSummary.checkedTitles.forEach(function (t) { L.push("  - " + t); });
    } else {
      L.push("  (none checked)");
    }
    L.push("");
    L.push("Counters from the rate card: quote at the top of your range; " +
      "usage rights as separate line items; decide your walk-away rate " +
      "before the call, not during it.");
    L.push("A negotiation aid, not financial, legal, or tax advice. " +
      "Benchmarks disagree 2–3x within tiers — verify against current " +
      "creator rate reports before you quote.");
    return L.join("\n");
  }

  /* ================= Deal Room 2.0 ================= */

  /* Sponsor niche multiplier — the same table as the Deal Analyzer's
   * NICHE_MULT and the Empire Simulator's sponsorNicheMult (rate-card rule
   * of thumb: finance/tech 2–3x, entertainment lower). tests/deal-room.test.js
   * pins parity with DealAnalyzer.nicheMult for every shared key. */
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
  var NICHES = Object.keys(NICHE_MULT);

  function nicheMult(niche) {
    if (!niche || NICHE_MULT[niche] == null) {
      return { mult: 1.0, label: null,
               note: "No niche selected — finance/tech benchmarks run ~2.5× the base range; entertainment, gaming, and music run ~0.6×." };
    }
    return { mult: NICHE_MULT[niche], label: NICHE_LABELS[niche],
             note: "Niche-adjusted ×" + NICHE_MULT[niche] + " (" + NICHE_LABELS[niche] +
                   ") — the rate-card rule of thumb (finance/tech 2–3×, entertainment lower)." };
  }

  /* Score a tracker deal end to end: tier range from the rate card,
   * niche-adjusted, with the implied CPM when the deal carries views.
   * deal = { platform, followers, offer, views, niche } (tracker shape). */
  function scoreDeal(deal, rateCard) {
    var tier = tierOf(+deal.followers || 0);
    var tiers = (rateCard && rateCard.per_video_or_post_by_tier) || {};
    var base = (tiers[tier] || {})[deal.platform || "youtube"] || null;
    var nm = nicheMult(deal.niche);
    var range = base ? [nice(base[0] * nm.mult), nice(base[1] * nm.mult)] : null;
    var scored = range ? scoreOffer(+deal.offer || 0, range[0], range[1])
                       : { verdict: "unknown", badge: "NO BENCHMARK", note: "" };
    var impliedCpm = null;
    if (+deal.views > 0 && +deal.offer > 0) {
      impliedCpm = Math.round((+deal.offer / +deal.views * 1000) * 100) / 100;
    }
    return {
      verdict: scored.verdict, badge: scored.badge, note: scored.note,
      tier: tier, tierLabel: tierLabel(tier),
      range: range, baseRange: base,
      niche: deal.niche || null, nicheLabel: nm.label, nicheMult: nm.mult,
      nicheNote: nm.note, impliedCpm: impliedCpm
    };
  }

  /* The full 2026 rate card as structured panel data for the benchmark
   * table: every tier × platform range, the platform multipliers, the
   * sponsored CPMs, and the quoted-prices block — each figure carrying its
   * basis so reported and modeled numbers never blur. */
  function rateCardTable(rateCard, quoted) {
    var order = ["nano_1k_10k", "micro_10k_100k", "macro_100k_1m", "mega_1m_plus"];
    var tiers = (rateCard && rateCard.per_video_or_post_by_tier) || {};
    var cpms = (rateCard && rateCard.sponsored_cpms) || {};
    return {
      tiers: order.map(function (id) {
        var t = tiers[id] || {};
        return { id: id, label: tierLabel(id), followers: t.followers || "",
                 youtube: t.youtube || null, tiktok: t.tiktok || null,
                 instagram: t.instagram || null, basis: "reported" };
      }),
      multipliers: (rateCard && rateCard.platform_multipliers_at_equal_followers) || null,
      cpms: {
        youtubeIntegrated: cpms.youtube_integrated_slot || null,
        youtubeGeneral: cpms.youtube_general || null,
        general: cpms.tiktok_youtube_general || null,
        igReelMedian: cpms.ig_sponsored_reel_median || null,
        dedicated: { range: [50, 90], basis: "reported",
                     source: "AIR Media-Tech compilation of 2026 agency benchmarks (Oct 2026)" }
      },
      disclaimer: (rateCard && rateCard.disclaimer) || "",
      quoted: quoted || null
    };
  }

  /* Quoted-price check (Cheerful, Sep 2026 — reported): what creators
   * typically QUOTE for this format, and what creators at this follower
   * count typically ASK. Asking prices, not closing prices — the ~23%
   * listed-vs-accepted gap still applies. Unmapped formats return null:
   * no benchmark is stretched to fit. */
  var FORMAT_QUOTE_MAP = {
    "instagram:short": "instagram_reel",
    "tiktok:short": "tiktok_video", "tiktok:integrated": "tiktok_video",
    "tiktok:dedicated": "tiktok_video",
    "youtube:integrated": "video_integration"
  };
  function quotedPriceCheck(deal, quoted) {
    if (!quoted) return { formatQuote: null, ask: null };
    var out = { formatQuote: null, ask: null };
    var key = (deal.platform || "youtube") + ":" + (deal.deliverable || "integrated");
    var fid = FORMAT_QUOTE_MAP[key];
    if (fid) {
      var f = null;
      (quoted.typical_quoted_by_format || []).forEach(function (q) {
        if (q.id === fid) f = q;
      });
      if (f) {
        var ratio = f.quoted_usd > 0 ? Math.round((+deal.offer || 0) / f.quoted_usd * 100) / 100 : null;
        out.formatQuote = {
          label: f.label, quoted: f.quoted_usd, basis: f.basis, source: f.source,
          ratio: ratio,
          position: ratio === null ? null : ratio < 0.8 ? "below" : ratio > 1.2 ? "above" : "near"
        };
      }
    }
    var followers = +deal.followers || 0;
    (quoted.typical_ask_by_followers || []).forEach(function (a) {
      var hi = a.max_followers === null ? Infinity : a.max_followers;
      if (followers >= a.min_followers && followers < hi) {
        out.ask = { band: a.band, ask: a.ask_usd, basis: a.basis, source: a.source };
      }
    });
    return out;
  }

  /* Pipeline summary over the creator's OWN logged deals — counts and sums
   * by status, verdict counts from scoreDeal, and the underpaid deals still
   * in play. Arithmetic on the user's numbers only; no close-probability
   * weighting is invented. */
  function pipelineSummary(deals, rateCard) {
    var counts = {}, totals = {}, verdicts = { under: 0, fair: 0, over: 0, unknown: 0 };
    STATUSES.forEach(function (s) { counts[s] = 0; totals[s] = 0; });
    var openUnderpaid = [];
    (deals || []).forEach(function (d) {
      var st = STATUSES.indexOf(d.status) >= 0 ? d.status : "offer";
      counts[st]++; totals[st] += (+d.offer || 0);
      var s = scoreDeal(d, rateCard);
      verdicts[s.verdict] = (verdicts[s.verdict] || 0) + 1;
      if (s.verdict === "under" && (st === "offer" || st === "negotiating")) {
        openUnderpaid.push({ brand: d.brand || "(no brand)", offer: +d.offer || 0,
                             range: s.range, status: st });
      }
    });
    var totalOffered = 0;
    STATUSES.forEach(function (s) { totalOffered += totals[s]; });
    return {
      counts: counts, totals: totals, verdicts: verdicts,
      totalDeals: (deals || []).length,
      totalOffered: totalOffered,
      committed: totals.signed + totals.delivered + totals.paid,
      paidTotal: totals.paid,
      openUnderpaid: openUnderpaid
    };
  }

  /* ---------- Algorithm Watch digest ----------
   * Reads the changes feed (data/changes.json shape) and returns the
   * deal-relevant digest: newest first, dated, sourced, confidence-flagged,
   * each entry paired with a plain "what it means for your next deal" line.
   * DEAL_NOTES are this site's editorial read on the entry — labeled as
   * such, never presented as part of the source reporting. */
  var PLATFORM_LABELS = { youtube: "YouTube", tiktok: "TikTok",
    instagram: "Instagram", facebook: "Facebook", x: "X", twitch: "Twitch", other: "Industry" };
  var DEAL_NOTES = {
    "lifetak-microdrama-premiere-2026": "A funded buyer is entering vertical drama. If you make microdramas, this is a licensing conversation, not a sponsorship one — keep your rights paperwork clean.",
    "agentic-commerce-protocol-2026": "Too early to price against. Don't let a brand discount your rate today for agent-commerce revenue that does not exist yet.",
    "yt-ypp-overhaul-2026": "From Feb 2027 partner status gets harder to earn, and scarcer partner inventory is worth more. If you will clear the new bar, say so in pitches; if a deal spans the changeover, keep YPP status out of the guarantees.",
    "yt-inauthentic-policy-2026": "Brands read these rules too. If your back catalog leans on reused formats, expect diligence questions before signing — clean channels sign faster.",
    "yt-shorts-originality-2026": "Reposted-clip inventory is losing reach, which lowers its sponsor value. Original Shorts are the asset that holds its price — quote them that way.",
    "yt-view-counting-2026": "View counts now start at playback start, so reported views run higher while earnings math is unchanged. When a brand compares your views against an older media kit, name the counting change before they discount your CPM.",
    "yt-branded-content-2026": "Paid placements sit under the Branded Content Policy now — disclosure language belongs in the contract, not just the caption. Check the deal's disclosure clause against it.",
    "yt-shopping-affiliate-2026": "More affiliate surface means more hybrid offers (flat fee + commission). Price the flat fee on its own merits; treat commission as upside, never as the fee.",
    "tt-creator-rewards-range-2026": "Creator Rewards pays on qualified views only. A brand quoting your raw TikTok views is using the bigger number — negotiate on the qualified-view basis you are actually paid on.",
    "ig-no-per-view-payout-2026": "Instagram views pay $0, so a sponsored Reel is often the only income those views produce. That is the argument for holding your Reel rate: the brand is buying the whole revenue line, not topping one up.",
    "ig-ranking-signals-2026": "DM shares are a stated ranking signal. Content built to be sent is what brands want to attach to — pitch the share mechanic, not just the view count.",
    "ig-oct2026-engagement-shift": "Engagement-weighted distribution favors posts that start conversations. If your rate justification cites reach, bring engagement evidence — that is the currency the ranking now pays in.",
    "fb-content-monetization-originality-2026": "Facebook pay now runs through one program with an originality gate behind it. If a brand wants your Facebook cut of a campaign, ask whether the deliverable is your original footage — reposted or lightly edited inventory can lose reach and pay, and that risk belongs in the contract, not on you.",
    "x-original-content-rewards-2026": "X pays on qualified impressions now — Premium viewers, Home Timeline, half the post on screen — and published no rate. If a brand prices an X post off the old Revenue Sharing numbers or your raw view count, they are pricing a program that ended September 7; negotiate the post as sponsored media, not as a share of an unknown pool.",
    "x-payouts-x-money-2026": "If you earn on X from the U.S., your money now lands in X's own wallet before it reaches your bank — there is no Stripe option left to choose. Open and verify X Money before your next payout is due, then sweep the balance out on your own schedule; a payout rail you did not pick is a term of the deal whether you negotiated it or not.",
    "twitch-sponsorships-affiliates-2026": "Affiliates can now take brand campaigns through Twitch itself — no Partner gate, just the Sponsorship Certification and a finished Creator Profile. If a brand wants your Twitch audience, the platform is now a second door to the same deal: compare any Twitch-routed offer against your own rate before you accept the first number the dashboard shows you.",
    "tt-community-guidelines-2026h2": "A serious TikTok violation can now reach associated accounts, so a backup account is not deal insurance. If a brand asks about account risk mid-negotiation, the honest answer is the ladder and the 90-day status window — and your main account's standing is now an asset worth naming in the pitch.",
    "tt-one-pay-plus-2026": "TikTok One Pay promises campaign money within 30 days of posting, and One Plus adds 15% on Custom Collab deals. If a brand still pushes net-60 terms on a TikTok One deal, the platform's own payment rail is the comparison to put on the table — payment speed is part of the price.",
    "spotify-partner-program-expansion-2026": "From October 20, a video podcast in 37 more markets earns Premium video revenue plus half the ads Spotify sells in — and you keep every dollar of sponsorships you sell yourself. If a network or sponsor claims a cut of your integrated reads on Spotify, this is the entry to quote back at them.",
    "meta-bytedance-ad-ban-2026": "Paid cross-promotion just lost a lane: in the seven listed markets a Meta campaign can no longer send viewers to your TikTok. If a brand deal includes paid amplification pointing at TikTok, name the destination in the contract and agree who re-plans the spend if Meta rejects it at review — that is a media-plan problem, not a creator-performance problem.",
    "fb-link-post-cap-test-2026": "On a capped Page your link posts are now a rationed asset: two free a month. If a brand deal promises Facebook posts that drive to a landing page, count the links the deliverable needs before you sign — and price the paid tier, or the native rewrite, into the deal instead of discovering the cap mid-campaign.",
    "tt-smart-plus-creative-selection-2026": "If a brand finds your video through Smart+ Creative Selection, the campaign runs on TikTok's approval flow, not your rate card. Keep paid-usage terms — term, territory, and fee — in your own contract for any clip a brand wants to run as an ad, and ask how the video entered the pool before you agree it can stay there.",
    "kenya-withholding-platform-payouts-2026": "If you are paid through a Kenyan payout account, the 5% now leaves before the money reaches you on Meta (from January) and YouTube (from September earnings). Quote and budget on the net figure, keep your KRA PIN current in AdSense, and file the withholding certificates at year end — the deduction is a credit, but only if the paperwork ties it to you."
  };
  var DEAL_NOTE_FALLBACK = {
    monetization: "Money rules moved. Recheck what this platform pays you directly before you quote a sponsor — your rate covers the gap.",
    policy: "Policy moved. Read the contract's compliance and disclosure clauses against the new rule before you sign.",
    algorithm: "Distribution moved. If your pitch leans on reach, refresh the numbers you are quoting before the next negotiation.",
    other: "Worth knowing before your next deal conversation on this platform."
  };

  function watchDigest(feed, opts) {
    opts = opts || {};
    var days = opts.days || 90;
    var limit = opts.limit || 12;
    var now = opts.now ? new Date(opts.now) : new Date();
    var cutoff = new Date(now.getTime() - days * 86400000);
    var all = (feed && feed.changes) || [];
    var inWindow = all.filter(function (e) {
      var t = new Date(e.detected_at || 0);
      return !isNaN(t) && t >= cutoff && t <= now;
    }).sort(function (a, b) {
      return String(b.detected_at).localeCompare(String(a.detected_at));
    });
    var byCategory = {}, byConfidence = {};
    inWindow.forEach(function (e) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      byConfidence[e.confidence] = (byConfidence[e.confidence] || 0) + 1;
    });
    var entries = inWindow.slice(0, limit).map(function (e) {
      return {
        id: e.id, date: String(e.detected_at || "").slice(0, 10),
        announced: e.announced_at ? String(e.announced_at).slice(0, 10) : null,
        effective: e.effective_at ? String(e.effective_at).slice(0, 10) : null,
        platform: e.platform, platformLabel: PLATFORM_LABELS[e.platform] || e.platform,
        category: e.category, confidence: e.confidence,
        title: e.title, summary: e.summary,
        sources: (e.sources || []).map(function (s) { return { name: s.name, url: s.url }; }),
        dealNote: DEAL_NOTES[e.id] || DEAL_NOTE_FALLBACK[e.category] || DEAL_NOTE_FALLBACK.other
      };
    });
    return {
      windowDays: days, total: inWindow.length, shown: entries.length,
      entries: entries, byCategory: byCategory, byConfidence: byConfidence,
      feedUpdated: (feed && feed.updated) || null,
      disclaimer: (feed && feed.disclaimer) ||
        "Platform changes are reported by the sources cited; verify live before acting."
    };
  }

  /* The digest as copy-ready plaintext for a newsletter, a note to a
   * manager, or the creator's own records. */
  function digestText(digest) {
    var L = [];
    L.push("ALGORITHM WATCH — DEAL DIGEST (last " + digest.windowDays + " days, " +
      digest.shown + " of " + digest.total + " changes)");
    L.push("Platform policy, monetization, and algorithm changes that move deal prices. " +
      "Dated and sourced; the 'For your next deal' lines are this site's editorial read, not source reporting.");
    L.push("");
    digest.entries.forEach(function (e) {
      L.push(e.date + " · " + e.platformLabel + " · " + String(e.category).toUpperCase() +
        " · " + e.confidence);
      if (e.announced || e.effective) {
        var when = [];
        if (e.announced) when.push("announced " + e.announced);
        if (e.effective) when.push("takes effect " + e.effective);
        L.push("  (" + when.join(" · ") + " · logged " + e.date + ")");
      }
      L.push("  " + e.title);
      L.push("  " + e.summary);
      L.push("  For your next deal: " + e.dealNote);
      if (e.sources.length) {
        L.push("  Sources: " + e.sources.map(function (s) {
          return s.name + " (" + s.url + ")";
        }).join("; "));
      }
      L.push("");
    });
    L.push(digest.disclaimer);
    L.push("Full feed: what-changed.html · A negotiation aid, not financial, legal, or tax advice.");
    return L.join("\n");
  }

  return {
    LISTED_VS_ACCEPTED: LISTED_VS_ACCEPTED,
    STATUSES: STATUSES,
    STATUS_LABELS: STATUS_LABELS,
    tierOf: tierOf,
    tierLabel: tierLabel,
    nice: nice,
    fmt: fmt,
    scoreOffer: scoreOffer,
    priceUsage: priceUsage,
    redFlagScore: redFlagScore,
    renderScript: renderScript,
    dealMemo: dealMemo,
    NICHES: NICHES,
    NICHE_LABELS: NICHE_LABELS,
    nicheMult: nicheMult,
    scoreDeal: scoreDeal,
    rateCardTable: rateCardTable,
    quotedPriceCheck: quotedPriceCheck,
    pipelineSummary: pipelineSummary,
    watchDigest: watchDigest,
    digestText: digestText,
    PLATFORM_LABELS: PLATFORM_LABELS
  };
});
