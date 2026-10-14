---
name: sponsorship-pitch
description: Build a complete sponsor outreach system, targeting, email, pricing, and negotiation for creator brand deals.
---

# Sponsorship Pitch

## Use when
- Sending outbound sponsor emails (Phase 5, 1k–50k subs)
- Building a media kit for inbound sponsors (50k+ subs)
- Negotiating rates, usage rights, or contract terms

## Inputs
- Channel analytics: last-10-video average views, audience demographics, top geographies
- List of 20 target brands in your niche (start with brands already sponsoring adjacent channels)
- Your rate card (from `data/v1/calculators.json` sponsor CPM rule of thumb)

## Procedure
1. **Build the target list.** 20 brands/week. Prioritize: brands sponsoring channels 1 size above yours (they have budget and creator experience), then direct competitors of those brands (FOMO is real).
2. **Find the human.** Marketing manager, influencer lead, founder (for small brands). Never "dear partnerships team."
3. **Write the email (under 120 words).** Subject: "[Channel] x [Brand], 60-second integration idea". Body: who you are (one line), your numbers (one line: avg views + audience descriptor), one specific integration concept tied to *their* product, your rate, one call to action.
4. **Price it.** Start at $20–$50 per 1,000 expected views (last-10-video average, not your best). Finance/tech 2–3x. Raise 20% every 3 closed deals until close rate drops to ~1 in 3.
5. **Negotiate.** Levers: exclusivity (+25%), usage rights (+50–100%), whitelisting (premium), bundles (3 videos, 15% off). Red lines: talking points not scripts, 50% upfront for new brands, kill fee, mandatory disclosure.
6. **Price usage rights separately, the most-neglected line item.** When a brand re-runs your $300 video as paid ads for a year, they're capturing thousands in value. Never fold paid-ad usage into the post fee; quote it as its own line item, every deal.
6. **Track the pipeline.** Simple CRM: brand, contact, date sent, follow-up date (7 days), status. Follow up exactly once, then move on. 5% reply rate is normal; the system works on volume.

## Worked example
Channel: 25k subs, tech niche, last-10 average 40k views.
- Target: a note-taking app sponsoring adjacent productivity channels.
- Email: "I'm [name], I make AI tool breakdowns for 25k productivity nerds. Last 10 videos averaged 40k views, 68% US. Idea: I rebuild my entire video workflow in [App] on camera, the 'before/after' your ads can't show. Dedicated 90s integrations at $1,600. Open to a call Thursday?"
- Math: 40k views × $40 CPM = $1,600. Clean, defensible, closes.

## API references
- `GET data/v1/calculators.json` → `sponsorship_rule_of_thumb` for CPM ranges
- `GET data/v1/chapters.json` → Phase 5 chapter (outreach system, negotiation)

## Pitfalls
- Pitching subscriber count instead of views, sponsors buy views, not subs.
- Accepting "exposure" deals, they pay in a currency that doesn't exist.
- Working without a contract above $500, handshake deals end friendships.
- Promoting products you haven't vetted, your audience blames *you*, not the brand.
- No follow-up, 50% of replies come after the nudge.
