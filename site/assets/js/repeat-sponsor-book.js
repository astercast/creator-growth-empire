/* Repeat Sponsor Book — engine (UMD, importable in node for tests).
 *
 * Tool 27. Every tool in the money chain drops a deal when it is
 * paid: the Deal Pipeline (Tool 25) gives the paid stage no nudge,
 * the Negotiation Script Builder (Tool 24) attaches no script to a
 * paid deal, and the Follow-Through Queue (Tool 26) never queues
 * one. This tool holds the paid deals as a group — the brands that
 * already paid are the re-approach list.
 *
 * It COMPOSES and adds nothing of its own: the board, the stage
 * ages, and the totals are the Deal Pipeline's (buildBoard); each
 * deal's current pricing is Tool 25's priceDeal output, which is
 * the Rate Card Builder's (Tool 23) card with its provenance
 * intact. The only logic here is the ordering — longest since
 * payment first — and setting the entered paid amount beside the
 * current card total Tool 23 builds. That ordering is NOT a
 * renewal-due claim: this repo carries no renewal-timing data, so
 * the book names no due date and invents no window.
 *
 * Pitch wording is deliberately NOT composed. No template in the
 * repo describes a repeat pitch: the Outreach Center's three are a
 * cold pitch (a brand that has never heard of you), a one-time
 * follow-up nudge, and a warm intro that requires a real mutual
 * connection who agreed to be named. Attaching any of them to a
 * brand that already paid would mislabel it, so each item states
 * the exclusion instead.
 *
 * Demo deals never enter the book: demo paid deals are counted
 * apart, the same discipline pipelineTotals applies to demo money.
 * An empty board, a board with no paid deals yet, and a demo-only
 * board are different states and this engine says which one it is.
 *
 * A planning aid — not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RepeatSponsorBook = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var ADVICE = "Planning aid, not financial, legal, or tax advice.";
  var PITCH_EXCLUSION = "No repeat-sponsor pitch is attached: the repo's templates are a cold pitch (a brand that has never heard of you), a one-time follow-up nudge, and a warm intro (only when a mutual connection is real and has agreed to be named) — none describes a pitch to a brand that already paid, so none is mislabeled as one here.";

  function dep(name, file) {
    if (root && root[name]) return root[name];
    if (typeof require === "function") {
      try { return require(file); } catch (e) { return null; }
    }
    return null;
  }
  function fmt(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function fmtRange(r) {
    if (!r) return "no range";
    return fmt(r[0]) + "\u2013" + fmt(r[1]);
  }

  /* Where the entered paid amount sits against the current card
   * total range Tool 23 built — a comparison of two composed
   * figures, not new pricing. */
  function relation(amount, totalRange) {
    if (!totalRange) return "unknown";
    if (amount < totalRange[0]) return "below";
    if (amount > totalRange[1]) return "above";
    return "inside";
  }

  /* Join a Tool 25 board's paid deals into the book. Demo paid
   * deals are counted apart, never booked. Pure: no mutation. */
  function bookFromBoard(board) {
    if (!board || !board.ok) return { ok: false, errors: ["a Deal Pipeline board is required (Tool 25)"] };
    var items = [], demoPaid = 0, demoPaidValue = 0;
    board.deals.forEach(function (e) {
      var deal = e.deal;
      if (!deal || deal.stage !== "paid") return;
      if (deal.demo) { demoPaid++; demoPaidValue += Number(deal.amount) || 0; return; }
      var rc = e.rateCard && e.rateCard.ok ? e.rateCard : null;
      var totalRange = rc && rc.total ? rc.total.range : null;
      var amount = Number(deal.amount) || 0;
      items.push({
        dealId: deal.id || null, brand: deal.brand || "(no brand)",
        amount: amount, paidAgeDays: e.ageDays,
        rateCard: rc ? {
          ok: true, platform: rc.platform, tierLabel: rc.tierLabel,
          primary: rc.primary, total: rc.total, provenance: rc.provenance
        } : { ok: false, reason: e.rateCard ? (e.rateCard.errors || []).join("; ") : "no rate card could be built for this deal" },
        relation: relation(amount, totalRange),
        pitch: { ok: false, reason: PITCH_EXCLUSION }
      });
    });
    items.sort(function (x, y) {
      var ax = x.paidAgeDays == null ? -1 : x.paidAgeDays;
      var ay = y.paidAgeDays == null ? -1 : y.paidAgeDays;
      if (ay !== ax) return ay - ax;
      if (y.amount !== x.amount) return y.amount - x.amount;
      return String(x.brand).localeCompare(String(y.brand));
    });
    var realDeals = board.totals.totalDeals;
    return {
      ok: true, items: items,
      paidCount: items.length,
      collected: board.totals.paidTotal,
      demoPaid: demoPaid, demoPaidValue: demoPaidValue,
      emptyBoard: realDeals === 0 && board.totals.demoCount === 0,
      demoOnly: items.length === 0 && realDeals === 0 && board.totals.demoCount > 0,
      noPaidYet: items.length === 0 && realDeals > 0,
      totals: board.totals,
      generatedFor: board.generatedFor,
      advice: ADVICE
    };
  }

  /* Build the book straight from entered deals — the board is
   * Tool 25's buildBoard with the caller's own data and clock. */
  function buildBook(deals, opts) {
    opts = opts || {};
    var DP = opts.dp || dep("DealPipeline", "./deal-pipeline.js");
    if (!DP) return { ok: false, errors: ["Deal Pipeline engine is required (assets/js/deal-pipeline.js)"] };
    var board = DP.buildBoard(deals, opts);
    return bookFromBoard(board);
  }

  function exportBook(book) {
    if (!book || !book.ok) return "";
    var out = [];
    var date = String(book.generatedFor || "").slice(0, 10);
    out.push("REPEAT SPONSOR BOOK — " + book.paidCount + " paid brand(s), " +
      fmt(book.collected) + " collected" + (date ? " · " + date : ""));
    if (book.emptyBoard) {
      out.push("No deals on the board — this book is empty because the Deal Pipeline is empty, not because no brand has paid yet.");
    } else if (book.demoOnly) {
      out.push("Only demo deals are on the board — demo data stays out of the real book.");
    } else if (book.noPaidYet) {
      out.push("No brand has paid yet. Deals reach this book when they reach the paid stage on the Deal Pipeline — a deal still in negotiation belongs on the board and in the Follow-Through Queue, not here.");
    }
    if (book.demoPaid) {
      out.push("Plus " + book.demoPaid + " DEMO paid deal(s) worth " + fmt(book.demoPaidValue) +
        " — demo data, excluded from this book.");
    }
    book.items.forEach(function (it, i) {
      out.push("");
      out.push((i + 1) + ". " + it.brand + " · paid " + fmt(it.amount) +
        " · " + (it.paidAgeDays == null ? "?" : it.paidAgeDays) + "d since the deal entered the paid stage");
      if (it.rateCard.ok) {
        out.push("   Current card (Tool 23, from this deal's entered figures): total " +
          fmtRange(it.rateCard.total.range) + " — the amount paid sits " + it.relation + " that range.");
        out.push("   " + it.rateCard.provenance);
      } else {
        out.push("   Current card: none — " + it.rateCard.reason);
      }
      out.push("   Pitch: " + it.pitch.reason);
    });
    out.push("");
    out.push(book.advice + " Order is longest since payment first — an ordering, not a renewal-due date; this book claims no renewal window. Paid deals and totals from the Deal Pipeline (Tool 25); current pricing from the Rate Card Builder (Tool 23). Amounts are the figures entered on the board.");
    return out.join("\n");
  }

  return {
    buildBook: buildBook, bookFromBoard: bookFromBoard,
    exportBook: exportBook, relation: relation, fmt: fmt,
    PITCH_EXCLUSION: PITCH_EXCLUSION, ADVICE: ADVICE
  };
});
