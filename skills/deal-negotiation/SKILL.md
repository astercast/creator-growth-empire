---
name: deal-negotiation
description: Evaluate a sponsorship offer against the 2026 rate card — benchmark the price, flag contract traps, and build a defensible counter-offer.
---

# Deal Negotiation

## Use when
- A brand sends an offer and you need a verdict before replying (Phase 5, sponsorship stage)
- Pricing usage rights, whitelisting, or exclusivity as separate line items
- Deciding whether a deal is underpaid, fair, or strong — with numbers, not vibes

## Inputs
- The offer terms: pay, platform, deliverable (integrated slot / dedicated video / short-form post), follower count, expected views (last-10-video average)
- The contract terms: usage rights (organic repost / paid ads 30d / 6mo / 12mo / perpetual), whitelisting (none / ≤30d / 31–90d / perpetual), exclusivity (none / 30d / 60–90d / broad), payment terms (net-30 / net-60 / net-90+)
- Your walk-away rate — decided BEFORE the negotiation starts (Phase 5 rule), not during the call

## Procedure
1. **Find your tier.** Load `data/v1/calculators.json` → `sponsorship_rate_card_2026.per_video_or_post_by_tier`. Tiers: nano 1K–10K, micro 10K–100K, macro 100K–1M, mega 1M+. Read the range for your platform: Instagram, TikTok, or YouTube.
2. **Benchmark the offer.** Below the range floor = underpaid. Inside = fair. Above the ceiling = strong. Cross-check with the implied CPM: offer ÷ expected views × 1000, compared against `sponsored_cpms` (YouTube integrated slot $20–$35, dedicated YouTube video $50–$90, TikTok/YouTube general $10–$30, IG sponsored Reel median $22.40).
3. **Run the red-flag checklist.** Perpetual or unlimited usage rights (refuse, or price as its own line item — never fold it into the post fee). Perpetual whitelisting (price per month, revocable). Broad/category exclusivity 6+ months (narrow to named competitors, or demand a premium that covers the lost deals). Net-60+ payment (counter net-30, and 50% upfront from any brand you haven't worked with).
4. **Build the counter.** Base = top of your tier range — creators list ~23% above what they accept, so quote high. Add line items: paid-ad usage +50% (30 days), +75% (6 months), +100% (12 months); exclusivity +25% (30 days), +50% (60–90 days); whitelisting as a separate monthly premium. Total = base + line items. The same logic powers the [Sponsor Deal Analyzer](../deal-analyzer.html) tool — agents can run it or reproduce it from this data. When the reply itself is the work, [The Negotiation Kit](../negotiation-kit.html) builds the counter with its typical-quote evidence, fills the reply script for the situation (counter, lowball, exposure-only, usage rights, whitelisting, late payment), and checks the offer against your walk-away number and your own Deal Room pipeline.
5. **State your terms in writing.** Talking points, not scripts. Kill fee, 50% upfront for new brands, mandatory FTC disclosure, narrow exclusivity list named in the contract. Never accept a handshake deal above $500.

## Worked example
Brand offers $5,000 for a YouTube integrated slot. Creator: 60,000 subscribers (micro tier 10K–100K), last-10 average 85K views.
- Tier range (micro, YouTube): $1,000–$10,000 → $5,000 is inside = **fair**, not strong.
- Implied CPM: $5,000 ÷ 85,000 × 1000 = **$58.82** — above the integrated-slot benchmark ($20–$35), which means the offer is fair for an *integrated slot* but priced like a light dedication. Counter-offer: base $10,000 (top of range). Contract asks for paid-ad usage 6 months: +75% = $7,500. 30-day exclusivity: +25% = $2,500. Counter total: **$20,000**, then let them negotiate down toward the 23% buffer. Walk-away rate decided up front: $7,000 (below which you keep the slot for your own affiliate push).

## API references
- `GET data/v1/calculators.json` → `sponsorship_rate_card_2026` (tier ranges, platform multipliers, sponsored CPMs, usage-rights note, ~23% negotiation buffer)
- `GET data/v1/chapters.json` → Phase 5 chapter (negotiation walk-away rule, contract levers)
- `skills/sponsorship-pitch/` (this skill's sibling — outbound pricing and targeting)

## Pitfalls
- Pricing off subscriber count instead of views — sponsors buy views, not subs.
- Letting paid-ad usage hide inside the post fee — the most-neglected line item, and the most expensive one.
- Accepting broad exclusivity without naming competitors — one clause can freeze out six months of sponsor revenue.
- Net-90 payment terms — you are financing the brand's marketing for a quarter.
- Negotiating without a walk-away rate — decided before the call, not during it.
- This is a negotiation aid, not financial or legal advice — contracts above $500 deserve a real lawyer's eyes.
