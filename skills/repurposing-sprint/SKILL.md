---
name: repurposing-sprint
description: Execute the 5-platform pillar-to-everywhere SOP from the Phase 3 playbook, one pillar video becomes five native posts on a staggered schedule.
---

# Repurposing Sprint

## Use when
- One pillar video (long-form, stream, or podcast) is done and needs the full distribution treatment
- Building a weekly repurposing habit: ~2 hours of marginal effort per pillar, the highest-leverage system in the playbook
- Deciding whether a pillar deserves the full SOP or a lighter pillar-only pass

## Inputs
- One pillar asset: long video (8–15 min), livestream recording, or podcast episode, with the core insight summarized in one line
- The Phase 3 repurposing SOP (chapters.json → Phase 3 chapter), or the [Repurposing Planner](../repurpose.html) tool, which encodes the same SOP interactively

## Procedure
1. **Run the atom test.** Self-score the pillar: can its core insight survive as a standalone 60-second clip without the other 9 minutes? If yes → full SOP. If no → pillar-only pass this week (not every pillar earns the sprint).
2. **Prep the pillar.** Export the full pillar with the hook inside the first 15 seconds, everything downstream is cut from it, and a weak pillar makes five weak children.
3. **Run the five mission cards on the staggered schedule.**
   - **YouTube, Day 0 (the pillar itself):** packaging sells it, title + thumbnail must sell the payoff in 3 seconds.
   - **Short, Day +1 (~45 min):** new first 2 seconds, restate the payoff before any context. Re-hook it; never clip the old intro.
   - **TikTok, Day +2 (~50 min):** text-on-screen the single most surprising 60–90 seconds; trending audio underneath at 10%.
   - **Instagram Reel, Day +3 (~30 min):** aesthetic hook, frame it as a transformation or save-worthy reveal in the first 2 seconds.
   - **Facebook, Day +4 (~10 min):** discussion hook, end the caption with the pillar's debatable claim phrased as a direct question.
4. **Enforce native grammar.** Check every cut: not a copy-paste, not a cross-posted watermark. Each platform gets its own hook, captions, and pacing, the SOP fails the moment a clip looks exported.
5. **Log and review.** Mark mission cards done (the planner tool tracks checkboxes, printable). Note which platform overperformed, the analytics-review skill reads that log next month and tells you what to make more of.

## Worked example
Pillar: 12-minute video, "I tested 5 budget mics; the $30 one won." Core insight: price ≠ quality in budget audio.
- Atom test: passes, "the $30 mic beat the $200 one" stands alone.
- Day +1 Short: new first 2 seconds, "$200 mic vs $30 mic. The cheap one won." (re-hooked, not clipped).
- Day +2 TikTok: text-on-screen the side-by-side audio test; trending lo-fi beat at 10%.
- Day +3 Reel: aesthetic hook, desk setup transformation, mic swap as the reveal.
- Day +4 Facebook: caption ends with "Is expensive gear just a tax on people who don't test?", debatable claim as a direct question.
- Total marginal effort: ~2.5 hours for five platform-native assets from one shoot.

## API references
- `GET data/v1/chapters.json` → Phase 3 chapter (the full pillar-to-everywhere SOP, native-grammar rules)
- Tool: `repurpose.html` (interactive mission-card generator, same SOP, hook adaptations auto-built from your idea line)
- `skills/content-repurposing/` (sibling skill, the strategy-level repackaging system; this skill is the execution SOP)

## Pitfalls
- Skipping the atom test, repurposing a pillar with no standalone insight wastes 2 hours.
- Clipping the old intro instead of re-hooking, the first 2 seconds must be written for the platform, not lifted.
- Posting all five on the same day, the staggered schedule is the point; same-day dumps cannibalize each other.
- Cross-posting with watermarks, platforms throttle it, audiences smell it; native grammar or nothing.
