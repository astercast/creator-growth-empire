# Phase 3 — The Everywhere Engine

> One idea, five platforms. The creators who win the 2020s aren't on one platform — they're unavoidable.

## The platform portfolio theory

Relying on one platform is a single point of failure. Algorithms change, accounts get restricted, formats die. But being everywhere *manually* is a burnout machine. The answer: **one idea, natively adapted to five platforms.** You don't 5x the work — you 5x the surface area of the same work.

The portfolio, in priority order for most creators:

1. **YouTube** — the durable core (search + long-form revenue)
2. **TikTok** — the discovery rocket (fastest cold-start audience on earth)
3. **Instagram Reels** — discovery + the most sponsor-friendly audience
4. **Facebook** — the underestimated giant (older, higher-income viewers; real ad revenue via Content Monetization)
5. **X / Threads** — distribution for ideas, not video (text-native authority)

## TikTok: the discovery rocket

**How it works in 2026:** TikTok's Creator Rewards Program pays roughly $0.40–$1.00 per 1,000 *qualified* views — but only for videos over 1 minute, original, with 1,000+ For You views each. Requirements: 18+, 10,000 followers, 100,000 views in 30 days, eligible country. The real money on TikTok was never the fund — it's **TikTok Shop affiliates** (5–20% commissions, no follower minimum for basic links) and brand deals.

**What wins:** native pacing (hook in under 1 second, captions burned in, trending audio used *strategically*), series formats ("day 12 of X" — TikTok's algorithm loves episodic return viewers), and search-value content (TikTok is now a search engine for Gen Z; "how to" content has a long tail here too).

**How the TikTok algorithm actually ranks (2026, per Hootsuite / Vamp / fivebbc consensus):** it's an *interest* graph, not a social graph — follower count is not a direct ranking factor. Every upload is tested against a small audience pool first (~300–500 matched accounts per one creator-lore model — *creator lore, unverified by TikTok*), widened 3–5x per wave only if early signals clear the gate. The signal hierarchy, in order *(verified multi-source — all three agree)*:

1. **Watch time + completion rate** — the dominant signals (one agency estimates 40–50% of ranking weight — *single source, unconfirmed but directionally right*; TikTok publishes no weights)
2. **Rewatches, shares, saves** — next in line
3. **Comments** — quality-weighted, not volume-weighted
4. **Likes** — moderate and *declining* in weight

Two more mechanics, flagged honestly: watch time *per impression* appears to have replaced raw view counts (DMA, single source — a 60s video at 80% completion can beat a 15s clip at 95%), and the "qualified view" bar may have risen from 3s to 5s (virvid.ai, single source, unverified). What TikTok *has* stated in its own docs (via viral.app, Sept 2026): it does not recommend reused, unoriginal, or engagement-bait content — *platform-published*. And because TikTok now functions as a **search engine**, your captions, on-screen text, and *spoken* keywords decide whether a video is discoverable months later — keyword delivery is a real 2026 growth lever, not just an SEO nicety *(Vamp + fivebbc, verified multi-source)*.

**The repost trap:** TikTok's originality filter pays reposts and template-slop at the floor rate. Adapt, don't cross-post blindly.

## Instagram Reels: the sponsor magnet

Instagram doesn't share ad revenue on Reels the way YouTube does — income here is **brand deals, affiliates, and bonuses**. But Reels audiences convert to customers better than any short-form audience, which is exactly why sponsors pay a premium for Instagram reach.

**What wins:** aesthetic consistency (your grid is your portfolio), carousel + Reel combos (carousels still drive saves, a deep algorithm signal on IG), and Stories for the parasocial layer (polls, Q&As, behind-the-scenes — this is where followers become fans).

**How Reels actually rank in 2026 (Mosseri-stated signals — *platform-published*, via Virvid + CreatorFlow):** **sends per reach is the #1 signal** — per Adam Mosseri himself, send rate correlates with reach more than watch time or likes do. Likes matter more for content shown to your *followers*; sends matter more for *unconnected* discovery, and most Reels impressions come from people who don't follow you. Full hierarchy *(Mosseri-stated, corroborated by CreatorFlow + SocialPilot)*: sends per reach > watch time > completion/rewatches > likes per reach > comments. (One caution: "sends are worth 3–5x a like" is an invented number with no source — Instagram publishes no weights.) Two more 2026 rules: **Reels longer than 3 minutes aren't pushed to non-followers** (discovery sweet spot is 7–30 seconds — *single source, orangemonke — guidance, not law*), and TikTok watermarks are explicitly deprioritized alongside low-resolution and engagement-bait content *(FlowShorts, single source)*. Build Reels people want to *send someone* — that's the whole algorithm in one sentence.

## Facebook: the underestimated giant

Everyone under 25 ignores Facebook. That's the opportunity. Facebook's **Content Monetization Program** (2026) unified Reels bonuses, in-stream ads, and performance bonuses into one program: 10,000 followers, 600,000 minutes viewed in 60 days, 5+ videos. Payouts run roughly $1–$10 per 1,000 views — and the audience skews older with real purchasing power.

**What wins:** Facebook rewards *native* long-ish video and community discussion. Cross-post your YouTube videos natively (not YouTube links — native uploads), run a Facebook Page as your broadcast channel, and take comments seriously: Facebook's algorithm heavily weights meaningful discussion.

**The originality crackdown (2026):** Meta's March 2026 policy targets reposted content with low-value changes (borders, captions, speed shifts). Cross-post *your own* content, natively, with platform-specific captions — that's normal practice. Reposting others' videos is what gets reach killed.

## The algorithm cheat sheet (Oct 2026)

The full mechanics — with every claim labeled platform-published, verified multi-source, single-source, or creator lore — live in the [Short-Form Playbook](shortform-playbook.html) and in `api/v1/content-engine.json` → `algorithm_signals`. The working version fits on an index card:

| Platform | Optimize for | The hierarchy that matters |
|---|---|---|
| **TikTok** | Completion rate + watch time per impression | Watch time/completion dominate *(multi-source)* → rewatches, shares, saves → comments (quality-weighted) → likes (declining). TikTok is also a search engine now — spoken + captioned keywords decide long-tail discovery *(Vamp, fivebbc)*. |
| **YouTube Shorts** | Completion rate (nobody clicks — they just don't swipe) | Completion + watch time dominate → rewatches/shares/saves → likes declining. **Oct 1, 2026:** originals prioritized, re-uploads starved *at the channel level*; AI labels don't hurt reach, undisclosed photorealistic AI gets reduced or removed *(Ritchie, platform-published)*. |
| **Instagram Reels** | Sends per reach | Sends *(Mosseri-stated)* > watch time > completion/rewatches > likes per reach > comments. Keep discovery Reels under ~3 min *(single source)*; strip TikTok watermarks. |
| **Facebook** | Meaningful discussion | Discussion-prompting native video; your own content cross-posted natively is fine, reposting others' kills reach *(Meta's March 2026 policy)*. |

Three cross-platform truths: **retention is the currency** everywhere; **shareability is distribution** (DMs on Reels, shares on TikTok); and **originality is now a gate, not a nice-to-have** — all three platforms starve recycled content as of October 2026. The [Cross-Post Optimizer](crosspost.html) turns this table into a per-destination checklist for any clip you're moving.

## The repurposing system: one idea → five platforms

Here's the actual workflow. Start with one long-form video (the "pillar"):

1. **Pillar** (YouTube, 8–15 min) — the full idea, fully produced.
2. **3 Shorts** — the three best moments, each re-hooked for vertical (new first 2 seconds, burned-in captions, 9:16 reframe). Post to Shorts, TikTok, Reels on a staggered schedule.
3. **1 TikTok-native cut** — the most surprising 60–90 seconds, re-edited with TikTok pacing and a text hook overlay. Videos over 1 minute stay Rewards-eligible.
4. **Facebook native upload** — the full pillar uploaded natively to your Page + the best short as a Reel.
5. **Text atomization** — the core insight becomes an X/Threads post, a community tab post, and (eventually) newsletter material.

**Total marginal effort:** ~2 hours beyond the pillar. **Total surface area:** 5 platforms, 8+ touchpoints. This is the highest-leverage system in the entire playbook.

## Platform-native, not cross-posted

The #1 repurposing mistake: uploading the identical file everywhere. Each platform has a native grammar:

- **TikTok** wants raw, fast, text-on-screen, trending audio.
- **Reels** wants polished, aesthetic, save-worthy.
- **Shorts** wants punchy, loopable, high-retention.
- **Facebook** wants discussion-provoking, shareable, slightly longer.

Same idea, four dialects. The reframe takes minutes; the performance difference is enormous. When you're moving a clip, the [Cross-Post Optimizer](crosspost.html) builds the per-destination checklist (aspect, captions, hooks, CTAs, disclosure labels) under the Oct-1 originality rules.

## The 80/20 of being everywhere

You don't need to master five platforms on day one. **Sequence it:** nail YouTube first (the durable asset), add TikTok for discovery (the growth lever), then Reels and Facebook as repurposing destinations (near-zero marginal cost). X/Threads comes when you have ideas worth distributing as text. Each platform should *earn* its place in your week by proving ROI — in views, revenue, or audience quality.

## The content atom: what makes an idea repurposable

Not every idea deserves the five-platform treatment. Before you run the SOP, check the idea against the **atom test** — a repurposable idea has:

1. **A standalone hook** — can the core insight survive without the other 9 minutes? If the value only exists in full context, it's a pillar-only video. That's fine — not everything must be everywhere. The [Hook Builder tool](hook-builder.html) generates five filmed-ready openers per topic from the Short-Form Playbook's five structures.
2. **A visual moment** — one frame or sequence striking enough to stop a scroll. Talking-head wisdom needs a visual anchor for short-form: a demo, a transformation, a surprising graphic.
3. **A quotable line** — one sentence that works as text. If you can't extract a single banger quote, the idea might be interesting but not *spreadable*.
4. **A debatable claim** — the clips that travel furthest are the ones people argue about. A mild take gets mild distribution.

Score your pillar 1–4 before repurposing. 3–4: run the full SOP. 1–2: publish the pillar, skip the repurposing, save the 2 hours. Selectivity applies to distribution too.

## The repurposing SOP: exact checklist per pillar video

Run this every time a long-form video ships. Total: ~2 hours.

- [ ] **Short #1 (45 min):** best self-contained moment → new 2-second hook → burned-in captions → 9:16 reframe → post to Shorts
- [ ] **Short #2 (30 min):** second-best moment, same treatment → post to TikTok (native text overlay, trending audio underneath at 10%)
- [ ] **Short #3 (30 min):** contrarian clip or hot take → post to Reels (polished caption, 5 hashtags)
- [ ] **TikTok-native cut (20 min):** most surprising 60–90s, re-edited pacing → keeps Rewards eligibility (1min+)
- [ ] **Facebook (10 min):** native upload of full pillar to Page + best short as Reel
- [ ] **Text (15 min):** core insight → X/Threads post → community tab version

Save this as a template. When you hire an editor (Phase 7), this SOP is their first assignment.

> **Make it automatic:** the [Repurposing Planner](repurpose.html) turns any single idea into the full 5-platform mission-card checklist above — hook adaptations, native-format notes, and staggered posting order, ready to print.

## The weekly everywhere schedule (worked example)

For a creator doing 1 long-form + 3 shorts per week:

| Day | Action |
|---|---|
| Mon | Film pillar video |
| Tue | Edit pillar; cut short #1 (best moment) |
| Wed | Publish pillar (YouTube) + short #1 (Shorts/TikTok/Reels staggered) |
| Thu | Cut shorts #2–3; write X/Threads post from the core insight |
| Fri | Publish short #2; native Facebook upload of pillar |
| Sat | Publish short #3; community tab post; rest |
| Sun | Analytics review (30 min); idea banking for next week |

Total filming: 1 day. The rest is repurposing — which is why the engine scales.

## X / Threads: the idea distribution layer

Short-form video platforms reward *content*. Text platforms reward *thinking*. Post your video's single sharpest insight as a standalone thread: the hook as the first post, 5–7 posts of substance, the video linked at the end. Threads regularly outperform the video itself for reach — and they build a different kind of authority: *this person thinks clearly.* Sponsors and collaborators live on X. Be findable there.

## What to do when a platform dies (or turns on you)

It will happen — to a format, if not a platform. The survival kit:

1. **Your email list is the lifeboat** (Phase 4). Every platform should be feeding it.
2. **Never build on one format.** If Shorts vanished tomorrow, your long-form library still earns.
3. **Watch the money, not the hype.** When a platform cuts creator payouts (it happens), reallocate that week's repurposing time to the platforms still paying.
4. **Own your content files.** Every video archived locally, in full quality. Platform deletion is rare; account issues aren't.

## Questions you're asking

**"Won't my audience get annoyed seeing the same content everywhere?"** Platform audiences barely overlap — your TikTok followers mostly aren't your YouTube subscribers. And native adaptation means it *isn't* the same content; it's the same idea in four dialects.

**"What about watermarks when cross-posting?"** Strip them. TikTok watermarks on Reels get downranked; native uploads always outperform watermarked reposts. Export clean masters from your editor, then add platform-native text per version. When in doubt, upload native — every platform's algorithm can detect recycled uploads and quietly throttles them.

## Your Phase 3 checklist

- Accounts secured with matching handles on all five platforms
- Repurposing workflow documented (pillar → shorts → native cuts → text)
- TikTok Rewards eligibility tracked (followers, 30-day views)
- Facebook Page created, CMP requirements tracked
- Platform-native adaptations happening (not blind cross-posts)
- Weekly schedule reflects the sequence: YouTube first, TikTok second, rest as repurposing
