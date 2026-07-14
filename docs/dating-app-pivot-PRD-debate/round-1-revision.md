# PRD: Love Landscape → Relational-Depth Dating Platform

**Status:** Draft v2 (post adversarial-review round 1) · July 2026
**Author:** Corey Petty (research compiled with Claude)
**Decision requested:** Approve **Phase 0 only** — a 4-month, near-zero-cash experiment (solo effort, ~$100–200/mo infra + LLM costs) that tests whether the assessment can earn distribution and whether its takers include singles with dating intent. **The dating pivot itself is not approvable today** and this document does not ask for that approval: Phases 1–2 become decisions only if Phase 0 produces the evidence defined in §9.

---

## 1. Executive Summary

Love Landscape is today a free, anonymous, 17-question relational assessment that renders a personal "relationship terrain" in 3D, generates AI narrative readings, and lets two people compare landscapes via shareable codes. The code for an LLM backend (OpenRouter via Vercel functions), Stripe credit purchases, and Supabase research-data collection is implemented (deployed state and end-to-end payment flow unverified; the repo has no tests) — but there are no accounts, no matching, no messaging, and effectively **zero distribution**: the app is a blog companion with no measured user base.

**What the market research supports:** the swipe-format dating economy is contracting while depth-positioned products are the segment's only growers, and the psychometric/attachment niche is culturally huge but unclaimed by any app at scale (§3). A compatibility-depth product is the right *kind* of thing to build in 2026.

**What the market research does not support:** that *this* product can become a dating app. Two facts from our own comparables analysis cut against it, and this document treats them as the central risks rather than footnotes:

1. **The quiz-to-dating conversion has never been done.** No free assessment/quiz product in our comp set — 16personalities (1.5B tests taken), 5 Love Languages (20M+ books), the Attachment Project — has ever converted its funnel into a dating pool. The products that resemble our endgame (Birdy, So Syncd, REDDI) are all sub-scale or shut down. Our thesis for why we could differ — the product delivers standalone value before liquidity exists, and success converts to a couples product instead of churn — is a hypothesis, not a precedent.
2. **Virality is not dating intent.** People who screenshot a terrain are doing identity-entertainment; a dating pool needs people who are single, local, and looking. These may be different people. Phase 0 therefore measures dating intent directly (F0.8) — not just shares — and the Phase 0 gate cannot be passed on virality alone.

**Proposed structure — three phases, each a separate decision:**

1. **Phase 0 — Viral Assessment + Intent Probe** (now → +4 months, solo, near-zero cash): harden and instrument what exists, add accounts, make the terrain artifact shareable, sell a one-time premium reading, and measure whether takers are singles who want to meet each other. Kill criteria are numeric, pre-committed, and published (§9).
2. **Phase 1 — Relationship Layer** (+4 → +9 months, decided on Phase 0 data): couples subscription, AI relational guide, psychometric validation study.
3. **Phase 2 — Matching Layer** (decided on Phase 1 data; requires ~$500K–1M for trust & safety, native apps, and liquidity marketing — i.e., a raise or revenue far above the illustrative projections in §7): the actual dating app, city-scoped.

The cheapest way to find out whether the dating thesis is real is Phase 0. If the artifact doesn't spread, or spreads only among the coupled and the curious, the pivot dies in four months for the cost of nights-and-weekends effort — and the app remains what it is today, plus accounts and a revenue stream.

---

## 2. Background: What Exists Today

Current-state inventory (July 2026, `main` branch; verified against code during review):

| Area | State |
|---|---|
| Assessment | 17 fixed, sequential questions → 13 psychological parameters (attachment security, uncertainty tolerance, openness, self-intimacy, conflict approach, etc.) — [questions.js](../src/data/questions.js), [paramCompute.js](../src/data/paramCompute.js). An LLM pass can adjust parameters post-hoc from user context; the questionnaire itself is not adaptive. |
| Visualization | Three.js 3D terrain (Gaussian basis functions on a 100×100 field), radar chart, contour map — [src/terrain/](../src/terrain/) |
| Sharing | ~21-char versioned codes (`L2_` + 18 base64 chars) encode all params; partner loads code and sees yours/theirs/combined terrain |
| AI | 4-provider LLM client (managed OpenRouter proxy default, BYO Claude/OpenRouter/Ollama); parameter refinement + individual and pair readings — [llmClient.js](../src/data/llmClient.js) |
| Payments | Stripe checkout + webhook code for LLM credits — [api/checkout.js](../api/checkout.js). Implemented; live end-to-end flow unverified. |
| Data | Supabase: anonymous session credits + opt-in research submissions (13 params + demographics), admin analytics dashboard |
| Infra | Vite static site + 4 Vercel serverless functions; ~6.0K LOC (JS/JSX in `src/` + `api/`, `wc -l`); mobile responsive; **no automated tests** |
| Distribution | **Effectively zero.** Blog-companion launch only; no marketing has been done. Cumulative assessment counts and share-code usage must be pulled from the Supabase admin dashboard before Phase 0 gates are finalized; all §9 targets assume a from-scratch baseline. |
| Missing for dating | Accounts/auth, persistent profiles, photos, matching, discovery, messaging, moderation, verification, native apps |

The assessment model is the asset. The 13-parameter space covers attachment, ambiguity tolerance, exclusivity orientation, physicality grounding, self-intimacy, conflict, and playfulness — dimensions that map to what compatibility-based matching would need, and that no mainstream app measures. It is a thoughtful synthesis, **not a validated psychometric instrument** — the implications run through this whole document (§5, §8).

### Who this is for, initially

The Phase 0 taker is the existing audience of the blog and its adjacencies: analytically minded people who read long-form writing about relationships, therapy-literate, roughly 25–45, comfortable with self-assessment as entertainment and reflection. This is a plausible seed audience for content-led growth and for the couples product; whether it contains enough *singles with dating intent* is exactly what F0.8 measures. The Phase 2 beachhead audience is deliberately undecided (§10, Q2) until that data exists.

---

## 3. Market Opportunity

### 3.1 The swipe economy is contracting; depth incumbents are the only growers

- Dating **app** revenue declined for the first time in industry history in 2025 (~$6.07B, Business of Apps estimate — [source](https://www.businessofapps.com/data/dating-app-market/)). Broader market forecasts ($6–13B for 2026 depending on scope) conflict with observed app-level declines; this PRD leans on operator-reported data and treats analyst CAGRs (7–8%) skeptically.
- Match Group FY2025: revenue flat at $3.5B, payers −5% to 13.8M; Tinder direct revenue **−4% (−5% FX-neutral), its first annual decline** ([Match Q4 2025 release](https://www.prnewswire.com/news-releases/match-group-announces-fourth-quarter-and-full-year-results-302678116.html)). Bumble: revenue −14%, paying users −21% YoY in Q1 2026, reportedly exploring a sale ([TechCrunch, May 2026](https://techcrunch.com/2026/05/05/bumbles-paying-users-are-slipping-as-it-bets-on-an-overhaul-later-this-year/)).
- The growers are all depth-positioned: **Hinge** +28% direct revenue, payers +15%, RPP $33.13 (≈2× Tinder's $17.56) ([Match Q1 2026 8-K](https://www.sec.gov/Archives/edgar/data/0000891103/000089110326000072/mtch8-k20260505ex991.htm)); **Feeld** $65M revenue 2024, +26% YoY, £9.3M pre-tax profit, independent and reportedly built on minimal outside capital (fundraising history not independently verified); **eharmony** est. $200–300M (private; third-party estimates, unconfirmed) at $37–45/mo on an 80-question assessment.
- **Caveat this comparison honestly:** each grower has an advantage unavailable to us — Hinge has Match Group's distribution and marketing machine; Feeld's niche identity (ENM/kink community) *is itself dating intent* plus a decade of brand; eharmony has legacy TV-era brand equity. "Depth incumbents grow" does not imply "a new depth entrant will grow"; the observed record for new, small, depth-positioned entrants is the graveyard row of §4. What the incumbent data does establish: *where* the remaining willingness-to-pay in this market sits (intentioned daters, ~$25–40/mo), and that the swipe format specifically — not online dating — is what's declining. An alternative reading that we cannot rule out: the category is a shrinking pie consolidating toward incumbents, and depth-positioning is who survives contraction rather than a growth vector for entrants.

### 3.2 Fatigue is real, but read it carefully

- 78% of dating-app users report burnout, Gen Z highest at ~79% (Forbes Health/OnePoll, n=1,000, fielded March–April 2024, measuring exhaustion felt "sometimes, often or always" — [source](https://www.forbes.com/health/dating/dating-app-fatigue/)). Named drivers: no meaningful connections (40%), disappointment (35%), rejection (27%), repetitive conversations (24%).
- US searches for "matchmaker" roughly doubled Jan 2025 → Jan 2026 ([GDI](https://www.globaldatinginsights.com/news/gen-z-dating-app-burnout-drives-surge-in-matchmaker-interest/)). Pew's most recent major study (2023) showed "ever used" adoption stable — note this is a slow-moving stock metric and predates the 2025–26 contraction.
- **The fatigue data points to *delegation*, not necessarily depth.** Burnt-out users' revealed alternatives are matchmakers, IRL events, and exiting apps — all *less* user effort, while a 17-question assessment is *more*. Our design answer is that the effort sits upfront and once (the assessment), and everything downstream is delegation-shaped: few curated matches, pre-scaffolded conversations, no swiping labor. Keeper's 300K completed deep intakes prove users will do long assessments *when the outcome promise is credible* — and Keeper's promise ($50K success-fee matchmaking) is one we cannot make at zero liquidity. This tension is real and unresolved until Phase 0/2 data exists.
- Venture activity confirms the no-swipe thesis is live — and crowded: Sitch ($6.7M, AI matchmaker — [GDI](https://www.globaldatinginsights.com/news/sitch-reaches-6-7m-in-funding-and-tens-of-thousands-of-users/)), Known ($9.7M, pay-per-date), 222 ($10.1M Series A, personality-matched group dinners), Ditto ($9.2M, one match/week, ~150K users), Overtone (Hinge founder's AI voice-first app, Match-backed). All but Sitch are single-sourced to one Forbes piece ([Jul 2026](https://www.forbes.com/sites/sofiachierchio/2026/07/11/these-gen-z-founders-are-reinventing-dating-apps-without-the-swipe/)); treat magnitudes as approximate.

### 3.3 The specific opening — stated at its true size

Attachment theory and relational psychology have large organic cultural pull (the Attachment Project ran a 44,435-user dating study — [source](https://www.attachmentproject.com/research/psychology-dating-apps-study/); attachment content is a durable high-engagement genre on TikTok/Instagram), and no app has capitalized the mechanic at scale — REDDI and peers are sub-scale. **But be precise about what this is:** an unclaimed *content-and-assessment* niche, demonstrably; an unclaimed *dating* niche, only by hypothesis (§5). And the funded entrants above are already attacking adjacent wedges (curation, logistics, AI matchmaking) with an 18–24 month head start on liquidity before our Phase 2 could begin. There is no "moat from investor pessimism"; the honest version of *why now* is narrower: the psychometric-artifact wedge specifically is unoccupied, our Phase 0 cost is near zero, and waiting doesn't make the wedge cheaper.

**Conclusion:** the market justifies a cheap probe of this wedge now. It does not yet justify a dating app. That is what the phase gates are for.

---

## 4. Comparable Analysis

| Comp | Model | Price | Scale | Lesson for us |
|---|---|---|---|---|
| **Feeld** | Sub-only freemium, no ads | $8–12/mo (to $30 by geo) | $65M rev 2024 (company-reported), £9.3M pre-tax profit | A sharp psychological/identity niche reaches ~$65M with minimal paid acquisition; brand content (Kinsey reports, magazine) is the marketing. Their 2023 replatform disaster nearly killed trust — don't break the core artifact. Caveat: Feeld's users arrive *with* dating intent; ours arrive with curiosity. |
| **Hinge** | Freemium sub | $20–50/mo, RPP $33.13 | 2M payers, +15% | "Designed to be deleted" turns success-churn into brand equity. Intentioned daters pay ~2× Tinder rates. |
| **eharmony** | Hard-paywall assessment | $37–45/mo | ~$200–300M, ~750K payers (third-party est., private co.) | Assessment rigor supports 3–5× swipe ARPU. Its format (question wall, no shareable artifact) aged out of under-35s. |
| **OkCupid** | Freemium (Match Group) | — | Declining segment (−14%/yr) | **Cautionary tale:** question-based matching was the moat; Tinder-fying the UX destroyed the brand. Protect the assessment as *the product*. |
| **Coffee Meets Bagel** | Freemium, curated daily matches | ~$35/mo | Mid-scale survivor | Few-matches-per-day cadence is a viable, monetizable anti-swipe format. |
| **So Syncd / Birdy / REDDI** | Freemium personality-matchers | — | All sub-scale or shut down (So Syncd's founders framed their 2024 shutdown as a pivot to content/testing) | Personality-first attracts women (Birdy reported ~60% female — inverse of industry; note this can be read as asset *or* as the supply/demand imbalance that kills small dating apps) and introverts. Whatever the proximate cause of each death, none solved the cold-start problem. Canonical statement of the liquidity lesson — referenced throughout. |
| **Keeper** | Success fee (~$50K bounty, ~$5K/date — [keeper.ai/faqs](https://www.keeper.ai/faqs)) | Outcome pricing | 1.5M signups, 300K completed deep intakes (company-reported); $4M pre-seed closed Oct 2024, announced Dec 2025 | Deep assessments complete when the outcome promise is credible. |
| **Paired** (couples) | One sub covers both partners | $59.99/yr | 8M downloads; ~$2.4M/yr est. (~$0.30/download — the category monetizes weakly) | Category-standard couples pricing and the daily-ritual retention mechanic. Couples mode is a retention/LTV extender, not a primary engine. |
| **Thursday** | Events + $19/mo cap-lift sub | Ticketed | 150+ cities, 1.5M+ users | IRL events monetize the unmatched majority; city-density launch playbook. |
| **16personalities** | Free result + ads + $32.99/yr premium | Free core | 1.5B tests taken, <20 staff, $15–25M/yr (est., private) | The playbook: free full result, shareable identity artifact, SEO/content compounding. **And the warning: it never became, and never tried to become, a dating product.** |
| **Duolicious** | Open-source, free | — | Small | Progressive assessment UX (value from answer #1, refine forever) beats a front-loaded question wall. |
| **5 Love Languages / We're Not Really Strangers (WNRS, the card-game brand)** | Franchise / physical product | $16–30 | 20M books / TikTok-native brand | A simple shareable vocabulary outlives even scientific criticism. Questions-as-content is a free growth engine. |

**What this table shows:** Feeld is the business benchmark, 16personalities the growth benchmark, Paired the retention benchmark, OkCupid the tombstone.
**What this table cannot show — because no example exists:** a quiz/assessment product converting its audience into a dating pool. Every path in this PRD past Phase 0 crosses that unprecedented step. This is the document's central acknowledged unknown, and Phase 0 is designed to price it (F0.8) before any dating commitment is made.

---

## 5. Differentiator Assessment (honest)

### What we genuinely have

1. **A screenshot-native artifact.** A personal 3D terrain is visually unique per person and inherently shareable. Caveat: MBTI's "INTJ" is socially legible *in text* — it travels in a bio; a terrain image requires the viewer to care. Whether our artifact's beauty beats MBTI's legibility is an empirical Phase 0 question (F0.3 CTR metric), not an assumption.
2. **A richer measurement space than any comparable.** 13 continuous parameters vs. MBTI's 4 binary letters or attachment theory's 3 buckets. The pair comparison (combined terrain, saddles between two people's valleys) is a *candidate* matching primitive no competitor has — "candidate" because the instrument is unvalidated (see below).
3. **Pre-liquidity value.** Useful alone and as a couple before any matching pool exists. Necessary for our strategy — but explicitly not sufficient: 16personalities had maximal pre-liquidity value and never crossed into dating (§4).
4. **A success-churn hypothesis worth testing.** Dating success removes two users; our couples mode could convert matched pairs into subscribers instead. No comparable has this two-sided lifecycle — which cuts both ways: it may be an unexploited structural advantage, or unexploited because matched couples don't want to keep using the app that matched them. It is an untested hypothesis, priced accordingly (nothing in §7 depends on it).
5. **Implemented monetization plumbing** (Stripe, credits, LLM pipeline) and a consented research dataset — with a hard constraint on the latter (§8, consent risk).
6. **Founder-content fit.** Companion to "The Geometry of Intimacy"; content-led acquisition is native to the project.

### What we do not have

1. **Scientific validation.** The 13 parameters are a synthesis, not a validated instrument. Be precise about the fix: **test-retest reliability and convergent validity** (vs. established scales like ECR-R) are achievable in months and cheap — that's the Phase 1 study. **Predictive validity for relationship outcomes** — what matching claims actually require — takes years of longitudinal pairs and has embarrassed better-funded attempts (eharmony's published evidence base is famously thin). Consequences: (a) until validated, all product language frames the terrain as a *reflective/conversation tool*, and Phase 2 matching is positioned as *shared-language introduction*, not predicted compatibility; (b) "validation comes back negative" is a listed risk (§8), not an assumed success.
2. **Distribution.** Zero installed base. The entire Phase 0 thesis is that the artifact earns distribution organically — plausible by comparison (16personalities, WNRS), unproven for us, hence the gate.
3. **Liquidity, and no precedent for our path to it.** The canonical liquidity lesson lives in §4 (So Syncd/Birdy/REDDI row); our exposure is worse than theirs in one respect — our funnel's strongest hooks (couples comparison, couples subscription) actively recruit non-singles. Phase 0 measures the single-and-looking fraction directly rather than assuming it.
4. **Trust & safety capacity, and capital.** Verification, moderation, compliance (UK Online Safety Act age assurance, US state age-verification laws, GDPR special-category data) make Phase 2 a funded-team problem, not a solo project (§7, §8).

**Verdict:** a real wedge, not a moat, and one unprecedented conversion step between the wedge and the dating business. The moat, if it comes, is built later from validation + proprietary pair dataset + community. This justifies Phase 0's cost. It does not justify more, yet.

---

## 6. Product Strategy & Requirements

**Resourcing assumption for Phases 0–1:** one founder, nights-and-weekends (~10–15 hrs/wk), LLM-assisted development; out-of-pocket costs limited to infra + LLM inference (~$100–200/mo). Every Phase 0 requirement below is scoped to that budget; the 4-month clock is calibrated to it. If effort drops materially below this, the gate deadline moves, not the bar.

### Phase 0 — Viral Assessment + Intent Probe (now → +4 mo)

Goal: prove the artifact spreads, and find out who it spreads *to*.

- **F0.0 Hardening & instrumentation** — verify the Stripe flow end-to-end in production; smoke tests for encoding/param computation (the two things that must never break — Feeld's replatform lesson); analytics events for every funnel step (start, complete, share, load-code, signup, purchase). *Acceptance: payment verified with a real transaction; funnel dashboard live.*
- **F0.1 Accounts** (Supabase Auth magic-link/OAuth) — optional, offered after results ("save your landscape"). Anonymous flow stays; localStorage results migrate on signup.
- **F0.2 Persistent landscape profile** — assessment history, saved partner comparisons.
- **F0.3 Shareable result page** — public opt-in URL per landscape with server-rendered OG image of the terrain and "take yours" CTA. *Acceptance: shared-page → assessment-start conversion is measured; target in §9.*
- **F0.4 Premium depth SKU** — one-time "Full Reading" ($9–14): extended AI reading, per-parameter deep dive, pair compatibility report. Replaces the credit system.
- **F0.5 Web-first checkout** — keep Stripe on web (see §7 for the App Store economics).
- **F0.6 Content seed (scoped honestly)** — this is the actual growth mechanism of every comp we cite, and it is a years-long compounding job, not a feature. Phase 0 scope: 13 parameter explainer pages (SEO-structured, one per parameter) + repurposing assessment questions as social content, sequenced after F0.0–F0.4 ship. Phase 0 tests whether this channel shows *any* signal; building the full engine is Phase 1+ work.
- **F0.7 Progressive assessment** — show a rough terrain after ~5 answers, refine as answers accumulate (the Duolicious lesson, §4), lifting completion rate.
- **F0.8 Dating-intent probe (the gate-critical requirement)** — at results, ask relationship status and, for singles: "would you want to meet people whose landscapes fit yours?" — opt-in waitlist with city. No matching is built; this measures the thing every other quiz product never measured. *Acceptance: intent data captured for >90% of completers.*

**Non-goals:** photos, matching, messaging, native apps, "engagement" features.

### Phase 1 — Relationship Layer (+4 → +9 mo; decided on Phase 0 data)

Goal: prove recurring willingness to pay, and validate the instrument.

- **F1.1 Couples subscription** ($59.99/yr, one sub covers both — Paired's price point): longitudinal terrain tracking, weekly conversation prompts generated from the specific pair terrain, re-assessment deltas. *Acceptance: live SKU, ≥100 paying couples, cycle-2 renewal measured against the 69–77% dating-category benchmark ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps) / [datingadvice.com](https://www.datingadvice.com/studies/dating-app-churn-rate-statistics)).*
- **F1.2 AI relational guide** — subscription-gated conversational layer on the existing LLM pipeline. Demand context: AI use in dating grew 333% in a year to 26% of singles, and nearly half of Gen Z singles have used AI somewhere in their dating lives (Match/Kinsey Singles in America, Jun 2025 — [source](https://match.mediaroom.com/2025-06-10-Match-and-The-Kinsey-Institute-Unveil-14th-Annual-Singles-in-America-Study)); note this measures AI-in-dating broadly, not paid-coach demand specifically. *Acceptance: shipped behind the couples/premium sub; attach rate measured.*
- **F1.3 Validation study** — reliability + convergent validity vs. established scales (ECR-R attachment), run on fresh, purpose-consented data; pre-registered; published either way. An annual "State of Relational Terrain" report (the Feeld/Kinsey PR play) from consented data. *Acceptance: study fielded before Phase 2 decision; results published.*

### Phase 2 — Matching Layer (decided on Phase 1 data; requires capital)

Goal: the actual dating product, launched into an existing user base. **Entry requires: §9 gates passed, validation study supportive, and a funding decision (~$500K–1M for T&S, apps, liquidity marketing) — the illustrative revenue in §7 does not self-fund this phase.**

- **F2.1 Opt-in matching pool** — activated from the F0.8 waitlist, city-scoped; profile = terrain + minimal photos (terrain-first — Birdy's mechanic).
- **F2.2 Terrain-based introductions** — a few curated matches/week (CMB/Ditto cadence), ranked by pair-terrain features, *positioned as shared-language introductions, not predicted compatibility*, until predictive validation exists. No grid, no swiping (OkCupid lesson, §4).
- **F2.3 Conversation scaffolding** — matches open with a generated pair-reading excerpt, not a blank chat box (attacks the "repetitive conversations" burnout driver — 24%, §3.2).
- **F2.4 Trust & safety** — selfie/ID verification vendor, report/block, human moderation coverage, age assurance (UK OSA, US state laws), GDPR special-category handling. Budgeted before launch; no Phase 2 without it.
- **F2.5 Premium tier** ($24.99–34.99/mo, Hinge-anchored): full pair-terrain breakdown with matches, more introductions, filters.
- **F2.6 City-by-city launch** (the density playbook of 222/Thursday, §4), starting where F0.8 waitlist density is highest.
- **Phase 2 exit criteria (kill conditions for the dating layer itself):** if after 2 quarters in the first launch city, match→conversation rate <30% or waitlist→active conversion <20% or verified-pool growth is flat, wind down matching and continue as assessment/couples business.

### Explicit non-requirements (all phases)

- No swipe interface, no engagement-bait notifications, no ads, no consumables.
- **No use of the research-consented dataset for commercial matching.** Data contributed under the research flow stays in research. Matching runs only on data collected under its own explicit consent (F0.8 onward). No sale or third-party sharing of psychological data, ever. Premium features monetize *the user's own results back to them* — never access to others' profiles beyond what both parties opted into.

---

## 7. Monetization Model

| Stream | Phase | Price | Benchmark basis |
|---|---|---|---|
| One-time Full Reading / Pair Report | 0 | $9–14 | 16personalities premium $32.99/yr as the assessment-depth comp |
| Couples subscription (covers both) | 1 | $59.99/yr | Paired's exact price point |
| AI relational guide | 1 | $7.99/mo | AI-coach market clusters $10–20/mo; priced under |
| Dating premium | 2 | $24.99–34.99/mo | Hinge RPP $33.13 — the intentioned-dater benchmark |
| Events / IRL (optional) | 2+ | Ticketed | Thursday/Feeld Social model |

**Unit-economics guardrails:** dating's median subscriber lifetime is ~5 months ([RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps)) ⇒ LTV ≈ 5 × ARPPU ⇒ at $30 ARPPU, CAC ceiling ≈ $50/payer at 3:1. The model only works if organic/content CAC dominates — which is precisely what Phase 0 tests. Conversion benchmarks: 1.4–2.8% download→paid cross-industry median (RevenueCat); the oft-cited 3–8% "niche dating" range comes from a dating-platform vendor's marketing content ([PG Dating Pro](https://www.datingpro.com/blog/dating-platform-benchmarks/)) — treat as directional only, and note it describes dating apps, not quiz products.

**App Store economics:** web checkout currently preserves up to ~30 points minus ~3% processing on US iOS, under the post-Epic injunction (external links at 0% while the district court sets a "cost-based" rate; SCOTUS granted cert June 30, 2026 — legal state fluid). If Apple ultimately gets its proposed 27% external-payment fee, most of that margin disappears; architecture must tolerate either outcome. Match Group's own web-checkout push (~$110M projected 2026 savings — [Feb 2026 8-K](https://www.sec.gov/Archives/edgar/data/891103/000089110326000020/mtch8-k20260203ex992.htm)) shows the incentive at scale.

**Illustrative Phase 2 scenario — and what it does not show:** 250K cumulative assessments → 40K matching-pool members → ~4% premium conversion + couples subs ≈ $600–900K ARR. Every rate in that chain is an assumption without precedent (the 16% assessment→pool conversion especially — no quiz product has ever demonstrated *any* such rate; F0.8 exists to replace this guess with a measurement). And note the arithmetic that matters for the decision: **this success scenario does not fund the ~$500K–1M Phase 2 build.** Phase 2 therefore implies either outside capital (Keeper's Oct 2024 pre-seed, announced Dec 2025, suggests "relationship science" framing can still raise) or Phase 0/1 results that dramatically exceed these illustrations. There is no version of this plan where Phase 2 happens by default.

**Success-churn hypothesis:** a successful match converts to the couples product instead of deleting the app. Untested (§5.4); modeled at zero in every number above. If it works, it is upside; the plan cannot rest on it.

---

## 8. Risks

| Risk | Severity | Mitigation / honest exposure |
|---|---|---|
| Artifact doesn't spread (Phase 0 thesis fails) | High | Cheap to discover (~4 months, near-zero cash). Pre-committed numeric kill criteria (§9), published to advisors for external accountability. |
| Artifact spreads but takers aren't singles-with-intent (funnel selects for couples/curious) | **High — the central risk** | F0.8 measures it directly; the Phase 0 gate cannot pass without intent numbers. No precedent exists either way; this is the experiment. |
| Validation study comes back weak/negative | Medium-High | Pre-registered, published either way. Product survives as reflective tool (framing already assumes non-predictive language); matching positioning would need rework or abandonment. This risk is real and not mitigated away. |
| "Unscientific" criticism | Medium | Non-predictive framing until validation; the study itself is the answer. |
| Funded no-swipe competitors (Sitch, Known, 222, Ditto, Overtone) close the window | Medium | They attack curation/logistics wedges, not the psychometric-artifact wedge; but they have 18–24 months' head start on liquidity. If one pivots into assessment-first matching before our Phase 2, the dating layer likely dies — the assessment/couples business survives. |
| Liquidity failure in Phase 2 despite funnel | High | City-scoped launch seeded from F0.8 waitlist density; Phase 2 exit criteria (§6) bound the loss. |
| Trust & safety incident | Existential (Phase 2) | Verification vendor + human moderation budgeted pre-launch; no Phase 2 without it. |
| Psychological data breach or consent violation | Existential | Research data firewalled from commercial use (§6 non-requirements); GDPR special-category handling; encryption; data minimization. Feeld's 2024 vulnerability disclosure is the cautionary tale. |
| Founder bandwidth (~10–15 hrs/wk vs. the plan) | High | Phase 0 scope cut to 8 requirements with F0.6 explicitly de-scoped; the deadline flexes with effort, the bar doesn't. Phase 2 is a funded-team decision by construction. |
| Platform/legal shifts (Apple fee, age-verification laws) | Medium | Web-first funnel; architecture tolerant of either SCOTUS outcome; compliance review gate before Phase 2. |
| Incumbent copies the terrain visual | Low-Med | The visual is copyable; instrument + pair dataset + community are the durable assets — which is why F1.3 (validation) precedes Phase 2. |

---

## 9. The Scoreboard (single authoritative list — gates and metrics)

All thresholds below are **provisional first-principles targets, not benchmarked** (no benchmark exists for a quiz-to-dating funnel); they will be finalized against the first month of instrumented baseline data from F0.0, then frozen and shared with two outside advisors who hold the kill decision to public account.

**Phase 0 gate (evaluated at +4 months of ~10–15 hrs/wk effort):**
- ≥25,000 completed assessments, with positive week-over-week organic growth in the final 6 weeks and no paid acquisition
- ≥25% of completers share or load a partner code; shared-page → new-assessment-start ≥15% (F0.3)
- ≥10% of completers create accounts; assessment completion rate ≥70% (F0.7)
- Premium reading attach ≥2% of completers (revenue signal, not profit)
- **Dating-intent: ≥20% of single completers join the F0.8 waitlist, and ≥2,000 waitlisted singles in at least one metro** — the gate cannot be passed on virality alone
- *Kill: any of the first three misses by >50% → stop; the app remains a free tool + reading SKU. Intent line misses while virality passes → continue as assessment/couples business (Phase 1), drop the dating pivot.*

**Phase 1 gate (evaluated at +9 months):**
- ≥3% of monthly-active users paying across SKUs (directional benchmark, vendor-sourced — §7)
- ≥100 paying couples; cycle-2 renewal ≥60%
- LTV:CAC ≥3 on any paid channel tested; organic still majority of acquisition
- ≥100K cumulative assessments; F0.8 waitlist ≥5,000 in the top metro
- Validation study fielded, results in hand
- *Kill: payment rates <1% or renewal <40% → no Phase 2; run as content/assessment business.*

**Phase 2 operating metrics (post-launch):** match→conversation ≥30%, conversation→date (self-reported) tracked, verified-profile ≥80%, report-rate SLA, pool growth per city — with the exit criteria in §6 as the binding kill conditions.

---

## 10. Open Questions

1. **Brand:** does "Love Landscape" carry to a dating product, or does the dating layer need its own name with Love Landscape as the instrument?
2. **Phase 2 beachhead audience:** decided from F0.8 waitlist data (density by city/demographic), not from speculation. Candidates: therapy-literate 25–40s, introverts, secure-attachment-seekers.
3. **Raise vs. bootstrap at Phase 2:** ~$500K–1M minimum; decide only with Phase 1 data in hand (§7 shows revenue alone won't fund it).
4. **Validation partner:** which lab/researcher; the existing schema captures the 13 params + attachment style + demographics, but the study needs fresh purpose-consented data with co-administered established scales (§6 non-requirements bar reuse of research submissions).
5. **Research mission and the pivot:** the position that commercialization funds the research must be earned openly — stated in-product, with the data firewall (§6) as the enforcement mechanism, and revisited if contributors object.

---

## Appendix A: Source Notes

Market and competitor figures compiled July 2026 from: Match Group Q4 2025 & Q1 2026 filings, Bumble Q1 2026 release, Forbes Health/OnePoll burnout survey (fielded 2024), Pew Research (2023), Match/Kinsey Singles in America (2025), Sensor Tower estimates, RevenueCat State of Subscription Apps 2025/2026, Business of Apps, Global Dating Insights, company pricing/FAQ pages (Feeld, eharmony, Paired, Keeper, Thursday), and press coverage (TechCrunch, Forbes, Semafor). Sourcing discipline: company-reported figures are used where available and third-party estimates are marked "(est.)" with their limitations noted inline; single-sourced claims are flagged inline (§3.2 funding roster); vendor marketing content is identified as such where used (§7). Codebase claims in §2 were verified against `main` during adversarial review (July 2026). Known weaknesses that survived review are carried in §8 rather than resolved by assumption.
