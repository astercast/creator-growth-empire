---
name: shortform-hook-craft
description: Craft and stress-test short-form hooks using the five Short-Form Playbook structures — open loop, cold start, contrarian take, numbered promise, question-as-hook — with retention editing rules and the anti-hook checklist.
---

# Short-Form Hook Craft

## Use when
- Scripting any short-form video (TikTok, YouTube Shorts, Instagram Reels) — Phase: the Short-Form Playbook
- A short gets impressions but dies in the first 3 seconds
- Re-hooking long-form content for short-form cuts
- Driving the Hook Builder tool's logic programmatically (input schema in `api/v1/tools.json`, tool `hook-builder`)

## Inputs
- The video topic in one line (the payoff works best — what does the viewer *get*?)
- Target platform: TikTok, Shorts, or Reels (each runs a different ranking machine)
- The video's single best moment or payoff

## Procedure
1. **Extract the payoff.** One sentence: the transformation, not the topic. The hook is not packaging — on short-form it *is* the product, because every short is judged by strangers (interest graph, cold-audience audition, test-pool cascade).
2. **Write one hook per structure** (all five, fill-in-the-blank — same five the Hook Builder tool generates):
   - **The Open Loop** — state a payoff, withhold the answer. "I tried posting at 3am for 30 days — one video broke the experiment." The payoff must be *specific*; "something amazing happened" is noise, not a loop.
   - **The Cold Start** — begin mid-action: hands already moving, the result on screen, you mid-sentence. No logo animations, no "hey guys welcome back."
   - **The Contrarian Take** — a clean, defensible contradiction. "Everything you know about posting daily is backwards." Highest-comment hook; make the take defensible, not rage-bait (undisclosed rage-bait is documented as not-recommended engagement-bait).
   - **The Numbered Promise** — "Three mistakes killing your retention — number two is why you're stuck." A micro-series inside one video; strongest for educational/how-to.
   - **The Question as Hook** — ask the exact question the video answers, out loud, first line. The question is a contract: the viewer stays to collect the answer.
3. **Run the anti-hook checklist.** Kill: "wait for it," asking for follows before you've earned it, recapping what you're about to do, starting with your channel name. If the first 3 seconds would work as a podcast intro, it's not a hook.
4. **Stress-test each survivor:** (a) does it contain the payoff or a specific promise? (b) could it only be *your* video? (c) does it create a gap the viewer must close by watching? (d) is it one sentence or one visual?
5. **Plan the retention edit behind the hook.** Cut density (meaning/angle/energy shift every 1–3 seconds), burned-in captions (big, kinetic, word-by-word — most short-form is watched muted), pattern interrupts every 5–8 seconds (rotate at least three types), loopability (end where you began — free rewatches), and a mid-video re-hook at the 40% mark.
6. **Native-grammar check.** TikTok optimizes completion rate and watch time per impression; Shorts punishes re-uploads; Reels weights sends per reach highest. No watermarks, no copy-paste across platforms.

## Worked example
Topic: "I tested 5 budget microphones."
- Open loop: "I tested 5 budget mics — the $25 one embarrassed the $200 one."
- Cold start: [audio of the $25 mic, already recording] "That's a twenty-five-dollar microphone."
- Contrarian: "Stop buying expensive mics. You're paying for the logo."
- Numbered: "Three mic mistakes ruining your audio — number two costs you nothing to fix."
- Question: "Why does the cheapest mic in this test sound the best?"
- Winner: cold start for TikTok (immediate proof, no throat-clearing); numbered promise for the Shorts cut (educational skew).

## API references
- `GET api/v1/tools.json` → tool `hook-builder` → `input_schema` (the programmatic contract: `{ topic }` → 5 hooks)
- `GET api/v1/chapters.json` → the Short-Form Playbook chapter id; full text in `llms-full.txt`
- `GET api/v1/calculators.json` → `platform_rules_2026` (TikTok / Shorts / Reels 2026 rules with sources and dates — verify live)

## Pitfalls
- Hook formulas are craft technique, not platform documentation — never present them as how the algorithm works.
- Platform claims age fast: every 2026 rule cited is sourced October 2026 and flagged verify-live in `calculators.json`.
- Same hook across platforms without native adaptation — the structures travel, the grammar doesn't.
- Overpromising — the video must deliver *more* than the hook. Trust compounds; clickbait bankrupts.
- Forgetting the mid-video re-hook — retention curves droop in the middle; restate the stakes at 40%.
