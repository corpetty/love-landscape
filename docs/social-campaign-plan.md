# Social Campaign Plan — Concept Validation (Faceless)

**Status:** Draft v1, 2026-07-21
**Companion docs:** [dating-app-pivot-PRD.md](./dating-app-pivot-PRD.md) (gates), [phase-0-spec.md](./phase-0-spec.md) (instrumentation), [step-0-runbook.md](./step-0-runbook.md)

## 1. Objective

Test whether the core concept — *map your relational shape onto a terrain, get an archetype, compare with a partner* — spreads and converts **without founder identity attached**. Generate enough attributed funnel data in 6 weeks to justify (or kill) further investment, ahead of the full Phase 0 gate (25K completions / 16 weeks).

This is a **campaign-scale probe**, not the Phase 0 gate itself. Success here = evidence to run Phase 0 seriously.

### What "has legs" means (decision metrics)

| # | Metric | Signal threshold | Where measured |
|---|--------|-----------------|----------------|
| 1 | Completion rate (assessment_start → complete) | ≥ 60% | journey events |
| 2 | Share/publish rate (complete → publish or copy-link) | ≥ 20% | milestones `publish` + `share_page_cta` |
| 3 | Viral pull (share_page_view → assessment_start tagged `from=share`) | ≥ 15% | journey `from` attribution |
| 4 | Pair round-trip (starts with `?compare=` partner code) | ≥ 8% of completions | `partner_code_load` / `compare` milestone |
| 5 | Any purchase intent ($12 Full Reading or Compatibility) | ≥ 1.5% of completions | `purchase` milestone |

Interpretation mirrors the PRD kill-test: **spread without intent** (1–4 pass, 5 fails) → the quiz is entertainment, keep it cheap; **intent without spread** → concept resonates but distribution is wrong, iterate channels not product; **both** → green-light Phase 0 build-out. (The F0.8 dating-intent waitlist probe is scrapped — purchase is the sole intent signal for this campaign.)

Volume target: **2,000 completions** over the 6 weeks. Below ~500 total, the conversion metrics are noise — treat that as a distribution failure, not a concept failure.

## 2. Pre-launch build list

**Shipped 2026-07-21:**
1. ✅ **Prod deploys main** — verified tracking `main`.
2. ✅ **UTM capture** — first-touch `utm_source/medium/campaign/content/term` persisted set-once, stripped from the URL, stamped onto client events and the server-truth `create` milestone (`src/data/journey.js`, `api/results.js`). See Appendix A.
3. ✅ **Metrics dashboard** — per-source funnel + the 5 §1 metrics in FunnelPanel, backed by `admin_metrics` (migration 008).

**Remaining (blocking — see §3.5 on why these are not optional):**
4. **"Who made this / why" page.** A named human, honest intent, one paragraph. Defuses the anonymous-scam prior without putting the founder's face/personality in the growth loop. Small build.
5. **Anti-scam landing copy.** Surface the trust tells the product already earns: *no signup, no email required, results shown immediately, here's the method.* Copy-only change to `IntroScreen.jsx` + the share card. Half day.

**Nice-to-have, not blocking:**
6. Downloadable/9:16 version of the archetype card (the OG image is 1200×630; vertical video/stories need portrait). Can ship in week 2.

## 3. Why faceless works here

The product already produces the influencer: **the archetype card is the content unit.** Every completed assessment mints a shareable artifact (OG card with archetype name, epithet, essence, signature bars) and a link that renders it on every social platform. The campaign's job is to seed archetype content into channels where personality-quiz and relationship-discourse culture already lives; the loop (`share → view → take → share`) does the rest or it doesn't — which is exactly the test.

Brand voice replaces founder voice: the account persona is **"the cartographer"** — speaks in the archetype/terrain register, never first-person-founder. All assets are product-generated visuals (3D terrain screen recordings, archetype cards, pairing graphics) plus text.

## 3.5 Credibility: defusing the scam prior (design constraint)

*Added 2026-07-21 from external feedback.* A relationship quiz that spreads virally on social **pattern-matches to the Facebook IQ/personality-quiz clickfarm genre.** This means faceless doesn't start at zero trust — it starts at a **negative prior.** The share loop that drives growth is the same mechanic every engagement-farm uses, so the first reaction from a cold viewer is "is this a scammy data-harvest?" This is a first-class constraint, not a footnote: the shareable artifact and landing must *carry* the credibility, not defer it to whoever clicks through to the methodology.

The product already earns the exact trust signals scam quizzes fake — we just have to lead with them:

- **No email / no signup to see results.** The single biggest anti-scam tell: clickfarm quizzes gate the payoff behind your personal data; we don't. Say it out loud on the landing page and in bios.
- **No "share to unlock."** Results are instant, no dark pattern. Say it.
- **The 3D terrain is itself the signal.** A genuinely novel visualization reads as "a real person built this," not a template farm cranking 500 variants of a cheesy badge.
- **Methodology in reach, not three clicks deep.** The honesty copy already exists; surface it and link it from the share card.

**Faceless ≠ anonymous.** The *content/virality layer* stays faceless (no personal brand, no founder image required). The *entity* must not be anonymous — total anonymity is what reads as "hiding something." A short, factual "who made this and why" page (named human, honest intent) is the cheapest, highest-leverage fix and is fully compatible with keeping the founder out of the growth loop.

**Channel implication:** the scam prior is strongest on cold paid social — exactly where this genre proliferates (Facebook). That arena is deliberately **out** of the channel plan (§4). Reddit / HN / typology communities are far more forgiving of the format *if* posts lead with substance, and they self-select for the skeptical-but-curious who can tell us apart from a clickfarm.

**This is testable, not just a worry.** If the scam prior is real, it shows up in the by-source dashboard as low completion / high bounce on cold social vs. the substance-led channels. The data adjudicates.

## 4. Channels & content pillars

### Content pillars (all channels remix these)

- **P1 — Archetype identity:** "The Mesa: high ground, chosen guests." One archetype per post, gallery link `/a/<key>`. Identity-claim content is the engine of quiz virality — people share what describes them.
- **P2 — Pairing drama:** "A Volcano dating a Mesa: what the saddle between them looks like." Uses the pair-compatibility layer; drives the `?compare=` round-trip. Highest comment-bait potential ("tag your Mesa").
- **P3 — The terrain visual:** screen recordings of the 3D landscape morphing as answers change. The scroll-stopper; no other quiz renders results as terrain. Pure product footage, zero face.
- **P4 — Methodology/credibility:** the 13 dimensions, what the research does and doesn't support (honesty copy already exists). This is the HN/Reddit-longform pillar, not the TikTok pillar.

### Channel plan

| Channel | Format | Pillar | Cadence | Notes |
|---|---|---|---|---|
| **TikTok + Reels + Shorts** (one account, cross-post) | 20–40s faceless video: terrain morphs, archetype card reveals, text-to-speech or captions | P3, P1, P2 | 4–5/wk | The main bet. Quiz/archetype content ("which one are you") is a proven faceless format. Each video's utm in bio link (single link, rotate `utm_content`). |
| **Instagram carousels** | 10-slide archetype gallery carousels; pairing matchups | P1, P2 | 2–3/wk | Carousels are saved/shared; archetype cards are pre-made art. |
| **X/Twitter** | Threads: one per archetype; pairing hot-takes; quote-RT bait ("QT with your terrain") | P1, P2, P4 | daily-ish, cheap | OG cards render natively — every shared result link is a free ad. |
| **Reddit** | Genuine-participation posts, not ads: r/nonmonogamy, r/polyamory, r/attachment_theory-adjacent subs, r/InternetIsBeautiful (the 3D angle), r/SampleSize (explicitly for surveys) | P3, P4 | 1–2/wk, per-sub rules | Highest-intent audience for the openness dimensions. Self-promo rules are real: lead with the visualization or the research framing, disclose being the builder. |
| **Hacker News** | One "Show HN: I mapped relationship openness onto 3D terrain" | P4 + P3 | once, week 2–3 | Tech-audience spike + feedback; time it after week-1 bugs are shaken out. |
| **Product Hunt** | Standard launch | all | once, week 4–5 | After iteration from earlier channels; PH audience skews single + curious. |
| **Quiz-culture platforms** (uquiz/Tumblr-adjacent, personality-typology communities e.g. PDB forums) | Archetype content seeded where MBTI/enneagram people live | P1 | opportunistic | These communities *seek out* new typologies; highest organic-spread odds per hour spent. |

**Explicitly out:** LinkedIn, founder-voice posting, podcast circuit — all require the personal brand this plan avoids. **Paid:** hold $0 for weeks 1–3. If one channel shows organic pull, optionally put $200–500 behind the single best-performing video in weeks 4–6 to test paid amplification of a proven creative — never to rescue a dead one.

## 5. Six-week run plan

- **Week 0 (prep):** build list §2; produce first content batch (10 archetype cards formatted per-platform, 5 terrain screen recordings, all 10 X threads drafted). Register handles.
- **Weeks 1–2 (seed):** start TikTok/Reels/Shorts + X cadence. 2 Reddit posts in the most on-topic subs. Watch completion rate and share rate daily — if completion < 50%, pause and fix the assessment funnel before spending more content.
- **Week 2–3:** Show HN. Fold feedback into copy.
- **Weeks 3–4 (double down):** kill the two worst-performing formats, double the best. Ship 9:16 share card if P3/P1 video is working. Seed typology communities.
- **Week 4–5:** Product Hunt launch.
- **Week 6 (readout):** freeze, compile the 6 metrics by utm_source, write `docs/campaign-readout.md`, make the call against §1.

Time budget assumption: this is a ~5–8 hr/week operation once the week-0 batch exists, because content is product-generated, not filmed.

## 6. Measurement & review ritual

- All external links carry `utm_source` (channel) + `utm_content` (post ID). Bio-link rotation on TikTok/IG since inline links aren't allowed.
- Weekly 30-min readout against the §1 table, per channel (~10 min once the dashboard exists). Kill/double decisions happen weekly, not at the end.
- Guardrails from the PRD apply: watch for velocity anomalies (one viral spike ≠ repeatable channel; require ≥2 distinct posts driving traffic before calling a channel "working").
- Research-submission opt-in data stays firewalled from marketing use, as already designed.

## 7. Risks

- **Scam prior (not just cold-start):** the format pattern-matches to Facebook clickfarm quizzes, so faceless starts at a *negative* prior, not zero. This is elevated to a design constraint in §3.5 — mitigations (no-email trust copy, "who made this" page, substance-led channel posts) are pre-launch tasks, not afterthoughts.
- **Platform link-suppression:** TikTok/IG throttle link-out content. Mitigation: the *card* is the content; the link lives in bio; measure via utm, expect lossy attribution and lean on `from=share` for the organic loop.
- **Metric contamination:** friends-and-family traffic in week 1. Tag it (`utm_source=ff`) or exclude the first 48h from the readout.
- **The quiz spreads but nobody pays:** that's not a failure of the campaign — it's the branch-B answer the PRD kill-test is designed to surface. The campaign succeeds by producing a clean answer either way. Note that with the waitlist probe scrapped, purchase is the only intent signal, and it's a high bar ($12); a spread-but-no-purchase result may warrant a cheaper intent probe before fully writing off intent.

## Appendix A — UTM tagging scheme

Attribution is live (shipped 2026-07-21): the app captures first-touch `utm_*` on landing, persists it set-once, strips the params from the URL (so they don't leak into copied/shared links), and stamps `utm_source` onto the server-truth `create` milestone. The admin funnel dashboard (FunnelPanel) splits the five §1 metrics by `utm_source`. Tag every outbound link so the dashboard buckets match what you hand out.

**`utm_source` is the split key** (the dashboard groups on the raw string) — keep it a fixed vocabulary. `utm_content` is your per-post granularity for spotting which specific creative drove traffic. Values are sanitized server-side to `[a-zA-Z0-9_.-]`, max 64 chars: no spaces, emojis, or capitals-vs-lowercase drift (`tiktok` ≠ `TikTok` → two rows).

| Channel | `utm_source` | `utm_medium` | `utm_content` (example) |
|---|---|---|---|
| TikTok / Reels / Shorts | `tiktok`, `reels`, `shorts` | `video` | `terrain_morph_01` |
| Instagram carousels | `instagram` | `carousel` | `archetype_mesa` |
| X/Twitter | `x` | `thread` / `post` | `volcano_mesa_pairing` |
| Reddit | `reddit` | `post` | `r_polyamory` (subreddit) |
| Hacker News | `hn` | `post` | `show_hn` |
| Product Hunt | `producthunt` | `launch` | `ph_launch` |
| Friends & family (exclude from readout) | `ff` | `dm` | — |

Example link: `https://<domain>/?utm_source=tiktok&utm_medium=video&utm_content=terrain_morph_01`

Fields captured: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` (only those present are stored). Use `utm_campaign` to group a burst across channels (e.g. `utm_campaign=ph_week5`). The global viral-pull stat (share_page_view → assessment_start tagged `from=share`) is tracked separately from UTM via the existing share round-trip, so organic loop spread is measured even where platforms strip link params.
