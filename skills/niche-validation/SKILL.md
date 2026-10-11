---
name: niche-validation
description: Validate a creator niche before committing — demand, competition, monetization, and winnability scored in one pass.
---

# Niche Validation

## Use when
- Choosing a niche for a new channel (Phase 0)
- Deciding between two candidate niches
- Auditing whether a struggling channel's niche is the problem

## Inputs
- Candidate niche statement: "I make [format] about [topic] for [person] who wants [transformation]"
- 10 competitor channels in the 50k–500k subscriber band
- Access to the site's `api/v1/calculators.json` for RPM bands

## Procedure
1. **Demand check.** Search the niche on YouTube. Count channels in the 50k–500k band posting in the last 30 days. Fewer than 5 active = demand risk. Note the top 3 videos' view-to-subscriber ratios — 5x+ means the algorithm is hunting for winners.
2. **Competition audit.** For each of the 10 competitors, record: 6-month sub growth (growing/flat/declining), upload cadence, and outlier ratio (% of videos at 10x their average). Flat growth across the board = saturated or dying niche.
3. **Monetization check.** Pull the niche's RPM band from `calculators.json`. Check competitor descriptions for sponsors, affiliates, merch, digital products. No monetization footprints anywhere = money may not exist here.
4. **Winnability score.** Can you beat the #5 competitor's packaging with your current skills + 90 days of reps? Be brutally honest. "Yes, with better thumbnails" counts. "Only if I learn motion graphics" doesn't.
5. **The energy test.** Could you make 100 videos on this without dread? If the answer isn't an easy yes, nothing else matters.
6. **Score it.** Demand /10, Monetization /10, Winnability /10. 21+ = commit. 15–20 = sharpen the angle and re-test. Under 15 = pick another niche.

## Worked example
Candidate: "10-minute breakdowns of failed startups for 20-something founders."
- Demand: 8/10 — 7 active channels in band, top videos at 8–15x sub counts.
- Monetization: 9/10 — finance/business RPM band ($15–$30), sponsors visible (SaaS, banking apps).
- Winnability: 7/10 — current packaging is weak (text-heavy thumbnails); beatable with style lock.
- Energy: yes — founder has startup experience and strong opinions.
- **Total: 24/30 → commit.**

## API references
- `GET api/v1/calculators.json` → `youtube_longform_rpm_bands` for niche RPM ranges
- `GET api/v1/chapters.json` → Phase 0 chapter for the niche triangle framework

## Pitfalls
- Confusing "no competition" with "opportunity" — it usually means no audience.
- Validating with friends instead of data — friends lie kindly; analytics don't.
- Picking a niche for the money while hating the topic — you'll quit by video 30.
- Skipping the energy test because the spreadsheet looks good.
