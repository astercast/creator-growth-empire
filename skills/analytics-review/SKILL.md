---
name: analytics-review
description: Run the monthly analytics ritual, find outliers, diagnose retention, and decide what to make more of.
---

# Analytics Review

## Use when
- First week of every month (the scheduled ritual, Phase 2)
- Deciding next month's content calendar
- Diagnosing a channel-wide slump

## Inputs
- YouTube Analytics: last 30–90 days, per-video CTR, AVD, retention graphs, traffic sources, returning vs. new viewers
- Your content pillars and format rotation (Phase 1)

## Procedure
1. **Rank by views-per-subscriber.** Divide each video's views by your sub count at publish time. Anything at 5x+ is an outlier, the algorithm found new audiences for it. List every outlier from the period.
2. **Rank by retention.** Sort by average view duration / average percentage viewed. High retention + low views = packaging problem (repackage, don't abandon). Low retention + high views = the packaging overpromised (study the drop-off, fix the content).
3. **Find the overlap.** Videos that are *both* outliers and high-retention are your format. This is the single most important output of the ritual, it tells you what to make more of.
4. **Read the retention graphs of the top 3 and bottom 3.** Mark the steepest drop on each. Categorize: hook failure (first 30s), pacing (sawtooth), single cliff (one bad section), end collapse (video too long). Patterns across videos = systemic fixes.
5. **Check traffic sources.** Browse-heavy month: your packaging is winning, protect thumbnail/title quality. Search-heavy: your library is compounding, keep building evergreen. Suggested-heavy: you're riding adjacency, study *which* videos you're suggested against.
6. **Check returning vs. new.** Growing channel health = steady new viewers converting to returning. All-new/no-returning = entertainment without loyalty (add community, Phase 4). All-returning/no-new = preaching to the choir (add discovery formats).
7. **Write the 3 decisions.** Every ritual ends with exactly three: one format to double down on, one to fix or kill, one experiment to try. Write them where you'll see them when planning.

## Worked example
Month: 8 videos. Outliers: "Studio build" (12x), "Gear I regret" (7x). Both high retention (55%+). Overlap = "honest gear content" format.
- Retention cliffs: two videos drop at ~3:00, both had sponsor reads placed mid-video. Decision: move sponsor reads to natural breaks, test end-roll.
- Traffic: 60% browse, packaging is the lever. Decision: thumbnail-teardown skill on the 3 lowest-CTR videos.
- Three decisions: (1) double honest-gear format, (2) fix sponsor-read placement, (3) experiment: one contrarian take video.

## API references
- `GET data/v1/chapters.json` → Phase 2 chapter (analytics that matter, retention repair)

## Pitfalls
- Reviewing too often, weekly analytics-checking is anxiety, not strategy. Monthly.
- Comparing against other channels instead of your own baseline.
- Killing a format after 3 videos, the data isn't in yet under 50 videos.
- Optimizing for subscribers instead of views and retention.
- Changing packaging before 48 hours, you reset the test (Phase 2 playbook).
