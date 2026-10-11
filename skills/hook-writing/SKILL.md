---
name: hook-writing
description: Write and stress-test video hooks — the first 30 seconds (long-form) or first 2 seconds (short-form) that decide everything.
---

# Hook Writing

## Use when
- Scripting any video (Phase 1 — write the hook last, place it first)
- CTR is fine but retention drops in the first 30 seconds
- Re-hooking clips for short-form repurposing

## Inputs
- The video's single best moment or payoff
- The title + thumbnail (the hook must *continue* the promise, not repeat it)
- Target format: long-form (30s hook) or short-form (2s hook)

## Procedure
1. **Extract the payoff.** One sentence: what does the viewer *get*? Not the topic — the transformation. "A $200 studio" is a topic; "this $200 setup replaced $5,000 of gear" is a payoff.
2. **Pick a hook archetype:**
   - **The payoff upfront** — state the result, then "here's how." ("I gained 10k subs in 60 days. Here's the exact system.")
   - **The open loop** — promise something specific coming later. ("The third tool broke my entire workflow — in the best way.")
   - **The contrarian claim** — challenge a belief. ("Everything you know about thumbnails is wrong.")
   - **The cold open** — start mid-action, no intro. (Show the result first, explain after.)
   - **The question** — ask what the video answers. ("Why do some videos get millions of views and identical ones get twelve?")
3. **Write 5 versions.** Not 1, not 2 — five. The first is always the obvious one; the good one is usually #4.
4. **Stress-test each:** (a) does it contain the payoff or a specific promise? (b) could it only be *your* video? (c) does it create a gap the viewer must close by watching? (d) is it under 15 words for short-form, under 30 seconds spoken for long-form?
5. **Kill the throat-clearing.** Delete "hey guys," "welcome back," "so today I wanted to." The hook starts at the first interesting word — everything before it is gone.
6. **Match the thumbnail.** Hook + title + thumbnail = one continuous promise. If the thumbnail shows the result, the hook explains how. Never make all three say the same thing.

## Worked example
Video: budget home studio build. Title: "I Built a $200 Home Studio."
- v1: "Hey guys, welcome back — today I'm showing my studio." (throat-clearing, no payoff — kill)
- v2: "Here's my home studio tour." (topic, not payoff — weak)
- v3: "This $200 setup replaced $5,000 of gear." (payoff upfront — good)
- v4: "My $5,000 setup is collecting dust. This $200 one isn't." (payoff + open loop + contrarian — best)
- v5: "Stop buying gear. Buy this list instead." (contrarian — strong backup)
- Winner: v4 for long-form; v3's text-on-screen version for the short-form cut.

## API references
- `GET api/v1/chapters.json` → Phase 1 chapter (scripting, hook rewrite teardown)

## Pitfalls
- Burying the hook after branding — no animated logo before the payoff. Ever.
- The "wait for it" hook — not a hook, a hostage situation.
- Overpromising — the video must deliver *more* than the hook. Trust compounds; clickbait bankrupts.
- Writing the hook first — write it last, when you know the video's best moment.
- Same hook for long and short — short-form needs the payoff in 2 seconds; long-form gets 30.
