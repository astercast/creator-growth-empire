---
name: thumbnail-teardown
description: Systematically diagnose why a thumbnail underperforms and produce a concrete redesign brief.
---

# Thumbnail Teardown

## Use when
- CTR is under 2% on a video with decent retention
- Doing the 48-hour packaging review (Phase 2)
- Training a thumbnail designer on your style lock

## Inputs
- The thumbnail image + video title
- CTR and impression data from YouTube Analytics
- Your channel's style lock (fonts, colors, composition rules from Phase 0)

## Procedure
1. **The 10% test.** Shrink the thumbnail to 10% size. Can you still identify the focal point and read any text? If no, the design fails at the only size that matters.
2. **The 3-second read.** Show it to someone unfamiliar for 3 seconds, then hide it. Ask: what was the video about, and how did it make you feel? If they can't answer both, curiosity and clarity are both broken.
3. **Focal point audit.** Exactly one dominant element. Count them — two faces + product + text = four focal points = none.
4. **Text audit.** 3 words max, 60pt+ equivalent, high contrast against background. If the title already says it, the thumbnail shouldn't repeat it.
5. **Emotion check.** Does the human element (if any) show a readable, genuine emotion tied to the video's payoff? Neutral faces are invisible.
6. **Style-lock compliance.** Same fonts? Same color system? Same composition family as your last 5 uploads? Inconsistency resets recognition to zero.
7. **Competitor contrast.** Line it up against 5 competing thumbnails in search/browse. Does it *pop* or blend in? Same-color thumbnails in the same niche all lose.
8. **Write the redesign brief.** One paragraph: what to keep, what to change, the new focal point, the new text (if any), and the emotion. Specific enough that a designer can execute without asking questions.

## Worked example
Video: "I built a $200 home studio" — CTR 1.4%, retention 52% (good).
- 10% test: FAIL — text "home studio setup tour 2026" unreadable, 7 words.
- 3-second read: "something about a desk?" — no payoff visible.
- Focal point: desk photo, no human, no contrast.
- Redesign brief: "Keep the desk photo but reframe tight on the finished setup. Add creator pointing at it, surprised expression. Text: '$200 STUDIO' in Archivo Black, acid-yellow on dark. Kill the year — dates age thumbnails."
- Result after repackage: CTR 4.1%.

## API references
- `GET data/v1/chapters.json` → Phase 1 (packaging) and Phase 2 (48-hour playbook)

## Pitfalls
- Redesigning the thumbnail when retention is the problem — packaging can't save bad content.
- Changing thumbnails before 48 hours of data — you reset the test.
- Adding *more* elements to fix a weak thumbnail — subtraction beats addition.
- Copying a competitor's thumbnail instead of contrasting with it.
