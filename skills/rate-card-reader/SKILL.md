---
name: rate-card-reader
description: Look up fair 2026 sponsorship price ranges for any follower tier, platform, and deliverable — straight from the site's rate-card data.
---

# Rate Card Reader

## Use when
- Quoting a price on any brand deal (inbound or outbound)
- Checking whether a quote you received is in the right neighborhood
- Comparing what the same audience costs across Instagram, TikTok, and YouTube

## Inputs
- Follower/subscriber count on the platform being sold
- Platform: Instagram, TikTok, or YouTube
- Deliverable type: integrated slot, dedicated video, or short-form post

## Procedure
1. **Load the data.** `GET api/v1/calculators.json` → `sponsorship_rate_card_2026`. Everything below reads from that block — never from memory.
2. **Find the tier.** nano: 1K–10K · micro: 10K–100K · macro: 100K–1M · mega: 1M+. Read `per_video_or_post_by_tier.<tier>.<platform>` → `[low, high]`. That range is a per-video/post negotiation band.
3. **Adjust for platform.** At equal followers: YouTube pays ~1.7x Instagram, TikTok ~0.85x (`platform_multipliers_at_equal_followers`). Use this when a brand asks to move a deal cross-platform, not to inflate a number you can't defend.
4. **Adjust for deliverable.** Implied-CPM benchmarks (`sponsored_cpms`): YouTube integrated slot $20–$35, dedicated YouTube video $50–$90, TikTok/YouTube general $10–$30, IG sponsored Reel median $22.40. A 60-second integration and a dedicated video are different products — price them like it.
5. **Apply the negotiation layer.** Creators list rates ~23% above what they accept, so quote near the top of the band; 41% offer package discounts on 3+ posts — build the discount into a bundle offer rather than discounting one-offs.
6. **Read the disclaimer out loud.** Benchmarks disagree 2–3x within tiers. Niche (finance/tech 2–3x entertainment), engagement rate, and audience geography move numbers as much as follower count. This is a negotiation starting point, not a quote — and not financial advice.

## Worked example
Creator: 45K Instagram followers, brand wants one sponsored Reel, expected reach ~40K.
- Tier: micro (10K–100K) → Instagram range **$200–$3,200**.
- CPM cross-check: 40K expected views × $22.40 median IG CPM ÷ 1000 = **$896** — inside the band, toward the lower third (entertainment niche, average engagement).
- Quote: top of the realistic third = **$1,200** for the single post; bundle offer of 3 Reels at **$3,000** (package discount built in). Paid-ad usage rights quoted separately, never included.

## API references
- `GET api/v1/calculators.json` → `sponsorship_rate_card_2026` (all tiers, platforms, multipliers, CPMs, negotiation notes)
- Reference page: `rate-card.html` (the human-readable 2026 rate card with methodology)

## Pitfalls
- Treating the band as a price list — it's a negotiation range; engagement and niche move the real number.
- Forgetting the ~23% listing buffer — quoting the middle of the band leaves money on the table by construction.
- Pricing cross-platform by followers instead of the multipliers — 100K on YouTube ≠ 100K on TikTok.
- Never updating the quote process — benchmarks age fast; check the `updated` field in `calculators.json` and verify against current creator rate reports before you quote.
