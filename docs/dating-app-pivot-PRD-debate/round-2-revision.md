# PRD: Love Landscape → Relational-Depth Dating Platform

**Status:** Draft v3 (post adversarial-review round 2) · July 2026
**Author:** Corey Petty (research compiled with Claude)

**Decision requested — two steps, in order:**

- **Step 0 (this week, no approval needed):** verify the Stripe flow end-to-end and pull the existing baseline from the Supabase admin dashboard (cumulative completions, share-code load rate, and the single/exploring fraction the research flow already captures). Step 0 costs days and could reshape or kill everything below; it deliberately precedes the approval decision.
- **Step 1 (after Step 0 data lands):** approve **Phase 0 only** — a 4-month, solo (~10–15 hrs/wk), ~$100–200/mo experiment testing whether the assessment earns distribution and whether its takers include singles with dating intent. Gate *mechanism* is pre-committed now (§9: metrics, decision table, extension rules, hard calendar stop); gate *numbers* are frozen against the Step 0 baseline plus one month of instrumented data, written into this repo, and shared with two named outside advisors — any continuation despite a miss requires a written memo to them. **The dating pivot itself is not approvable today**, and approving Phase 0 does not make it the default trajectory: one of Phase 0's three exit branches explicitly kills it (§9).

---

## 1. Executive Summary

Love Landscape is today a free, anonymous, 17-question relational assessment that renders a personal "relationship terrain" in 3D, generates AI narrative readings, and lets two people compare landscapes via shareable codes. The code for an LLM backend (OpenRouter via Vercel functions), Stripe credit purchases, and Supabase research-data collection is implemented (deployed state and end-to-end payment flow unverified — hence Step 0; the repo has no tests) — but there are no accounts, no matching, no messaging, and effectively **zero distribution**.

**What the market research supports:** the swipe-format dating economy is contracting while depth-positioned products are the segment's only growers, and the psychometric/attachment niche is culturally large but unclaimed by any app at scale (§3). A compatibility-depth product is the right *kind* of thing to build in 2026.

**What it does not support:** that *this* product can become a dating app. The comparables record contains **no precedent for a quiz product converting its audience into a dating pool** (the precedent gap — stated once, canonically, at the end of §4), and virality is not dating intent: terrain-screenshotters and single-local-and-looking may be different people. Phase 0 measures intent directly (F0.8) and its gate cannot be passed on virality alone.

**Be equally clear about what Phase 0 can and cannot establish.** It is a *cheap kill test, not a proof*: a failed gate kills the pivot for the cost of nights-and-weekends; a passed gate establishes top-of-funnel and an intent signal, but stated intent is inflated (our own Phase 2 criteria assume up to 80% waitlist evaporation), and true liquidity — and whether dating-motivated users will complete a psychometric intake — remain untestable before Phase 2. Phase 0 buys the right to spend more only if the cheap disconfirmations fail to fire.

**Why run it at all, then?** Because roughly 90% of Phase 0's work — accounts, shareable result pages, a revenue SKU, instrumentation, content seed — is **no-regret**: it is the correct next move for the app under every alternative considered (§6.0), including "never do dating." The dating-specific increment is one requirement (F0.8, days of work). The experiment is nearly free *given* the work we'd do anyway; what's being approved is mostly the instrumentation that lets the pivot question be answered rather than perpetually deferred.

**The three phases, each a separate decision:**

1. **Phase 0 — Viral Assessment + Intent Probe** (4 effort-months): as above. Exits via the §9 decision table: unlock Phase 1, kill the pivot but continue as a couples/assessment product (a new decision, separately justified), or stop feature work entirely.
2. **Phase 1 — Relationship Layer** (decided on Phase 0 data): couples subscription, AI relational guide, psychometric validation study.
3. **Phase 2 — Matching Layer** (decided on Phase 1 data): the actual dating app, city-scoped. Requires ~$500K–1M (trust & safety, apps, liquidity marketing) — outside capital, since §7's own success scenario does not self-fund it. This option may never become exercisable; the plan's value does not depend on exercising it.

---

## 2. Background: What Exists Today

Current-state inventory (July 2026, `main` branch; verified against code during review):

| Area | State |
|---|---|
| Assessment | 17 fixed, sequential questions → 13 psychological parameters (attachment security, uncertainty tolerance, openness, self-intimacy, conflict approach, etc.) — [questions.js](../src/data/questions.js), [paramCompute.js](../src/data/paramCompute.js). An LLM pass can adjust parameters post-hoc from user context; the questionnaire itself is not adaptive. |
| Visualization | Three.js 3D terrain (Gaussian basis functions on a 100×100 field), radar chart, contour map — [src/terrain/](../src/terrain/) |
| Sharing | ~21-char versioned codes (`L2_` + 18 base64 chars) encode all params; partner loads code and sees yours/theirs/combined terrain |
| AI | 4-provider LLM client (managed OpenRouter proxy default, BYO Claude/OpenRouter/Ollama); parameter refinement + individual and pair readings — [llmClient.js](../src/data/llmClient.js) |
| Payments | Stripe checkout + webhook code for LLM credits — [api/checkout.js](../api/checkout.js). Implemented; live end-to-end flow unverified (Step 0). |
| Data | Supabase: anonymous session credits + opt-in research submissions (13 params + demographics **including relationship status**), admin analytics dashboard — this is the Step 0 baseline source |
| Infra | Vite static site + 4 Vercel serverless functions; ~6.0K LOC (JS/JSX in `src/` + `api/`, `wc -l`); mobile responsive; **no automated tests** |
| Distribution | **Effectively zero.** Blog-companion launch only; no marketing has been done. Step 0 quantifies the actual baseline. |
| Missing for dating | Accounts/auth, persistent profiles, photos, matching, discovery, messaging, moderation, verification, native apps |

The assessment model is the asset. The 13-parameter space covers attachment, ambiguity tolerance, exclusivity orientation, physicality grounding, self-intimacy, conflict, and playfulness — dimensions that map to what compatibility-based matching would need, and that no mainstream app measures. It is a thoughtful synthesis, **not a validated psychometric instrument** — the implications run through §5 and §8.

### Who this is for, initially

The Phase 0 taker is the existing audience of the blog and its adjacencies: analytically minded people who read long-form writing about relationships, therapy-literate, roughly 25–45, comfortable with self-assessment as entertainment and reflection. This is a plausible seed audience for content-led growth and the couples product; whether it contains enough *singles with dating intent* is exactly what F0.8 measures. The Phase 2 beachhead audience is deliberately undecided (§10, Q2) until that data exists.

---

## 3. Market Opportunity

### 3.1 The swipe economy is contracting; depth incumbents are the only growers

**What the operator data establishes:** the remaining willingness-to-pay in this market sits with intentioned daters at ~$25–40/mo, and it is the swipe *format* — not online dating — that is declining.

- Dating **app** revenue declined for the first time in industry history in 2025 (~$6B, Business of Apps estimate — [source](https://www.businessofapps.com/data/dating-app-market/)). Broader forecasts ($6–13B for 2026 by scope) conflict with observed app-level declines; this PRD leans on operator-reported data.
- Match Group FY2025: revenue flat at $3.5B, payers −5% to 13.8M; Tinder direct revenue **−4% (−5% FX-neutral), its first annual decline** ([Match Q4 2025 release](https://www.prnewswire.com/news-releases/match-group-announces-fourth-quarter-and-full-year-results-302678116.html)). Bumble: revenue −14%, paying users −21% YoY in Q1 2026, reportedly exploring a sale ([TechCrunch, May 2026](https://techcrunch.com/2026/05/05/bumbles-paying-users-are-slipping-as-it-bets-on-an-overhaul-later-this-year/)).
- The growers are all depth-positioned: **Hinge** +28% direct revenue, payers +15%, RPP $33.13 (≈2× Tinder's $17.56) ([Match Q1 2026 8-K](https://www.sec.gov/Archives/edgar/data/0000891103/000089110326000072/mtch8-k20260505ex991.htm)); **Feeld** $65M revenue 2024, +26% YoY, £9.3M pre-tax profit, independent (fundraising history not independently verified); **eharmony** est. $200–300M (private; third-party estimates) at $37–45/mo on an 80-question assessment.
- **Bound the inference:** each grower has an advantage we lack — Hinge has Match's distribution machine; Feeld's niche identity *is* dating intent plus a decade of brand; eharmony has legacy TV-era brand equity. "Depth incumbents grow" does not imply "a new depth entrant will grow" — the record for new, small depth entrants is the graveyard row of §4 — and we cannot rule out that the category is a shrinking pie consolidating toward incumbents.

### 3.2 Fatigue is real — and points at delegation, which shapes our design

**The design consequence up front:** our answer to fatigue is effort-once-upfront (the assessment), delegation-downstream (few curated introductions, pre-scaffolded conversations, no swiping labor). Whether that trade is one users accept is untestable before Phase 2 — Phase 0 takers do the quiz as entertainment, with no dating promise attached — and this document treats it as an open tension, not a solved problem.

- 78% of dating-app users report burnout; Gen Z and Millennials tied highest at ~79% (Forbes Health/OnePoll, n=1,000, fielded March–April 2024, exhaustion felt "sometimes, often or always" — [source](https://www.forbes.com/health/dating/dating-app-fatigue/)). The confirmed top driver: no meaningful connections (40%); other drivers reported in the original article (disappointment, rejection, repetitive conversations) are cited here from secondary coverage and should be re-verified before load-bearing use.
- US searches for "matchmaker" roughly doubled Jan 2025 → Jan 2026 ([GDI](https://www.globaldatinginsights.com/news/gen-z-dating-app-burnout-drives-surge-in-matchmaker-interest/)). Burnt-out users' revealed alternatives — matchmakers, IRL events, leaving apps — are all *less* user effort. Keeper's ~300K created-full-accounts (of 1.5M signups, company-reported) *suggest* users complete deep intakes when the outcome promise is credible; Keeper's promise ($50K success-fee matchmaking) is one we cannot make at zero liquidity.
- Pew's most recent major study (2023) showed "ever used" adoption stable — a slow-moving stock metric predating the 2025–26 contraction.
- Venture activity confirms the no-swipe thesis is live — and crowded: Sitch ($6.7M — [GDI](https://www.globaldatinginsights.com/news/sitch-reaches-6-7m-in-funding-and-tens-of-thousands-of-users/)), Known ($9.7M), 222 ($10.1M Series A), Ditto ($9.2M, ~150K users), Overtone (Hinge founder, Match-backed). All but Sitch single-sourced to one Forbes piece ([Jul 2026](https://www.forbes.com/sites/sofiachierchio/2026/07/11/these-gen-z-founders-are-reinventing-dating-apps-without-the-swipe/)); treat magnitudes as approximate.

### 3.3 The specific opening — stated at its true size

Attachment theory and relational psychology have large organic cultural pull (the Attachment Project's study drew 44,435 participants, 31,676 of them active dating-app users — [source](https://www.attachmentproject.com/research/psychology-dating-apps-study/)), and no app has capitalized the mechanic at scale. **Be precise:** this is an unclaimed *content-and-assessment* niche, demonstrably; an unclaimed *dating* niche only by hypothesis. The funded entrants above attack adjacent wedges (curation, logistics, AI matchmaking) with an 18–24 month head start on liquidity before our Phase 2 could begin. **This plan is not racing them for a window.** If one of them occupies the psychometric wedge first, our dating layer dies (§8) and Phase 0's outputs retain their value. The case for acting now is not urgency; it is that Step 0 + Phase 0 convert a permanently deferred question into a priced one, at near-zero incremental cost over work the app needs anyway (§6.0).

**Conclusion:** the market justifies a cheap, mostly-no-regret probe. It does not yet justify a dating app. That is what the gates are for.

---

## 4. Comparable Analysis

| Comp | Model | Price | Scale | Lesson for us |
|---|---|---|---|---|
| **Feeld** | Sub-only freemium, no ads | $8–12/mo (to $30 by geo) | $65M rev 2024 (company-reported), £9.3M pre-tax profit | A sharp psychological/identity niche reaches ~$65M with minimal paid acquisition; brand content is the marketing. Their 2023 replatform disaster nearly killed trust — don't break the core artifact. Caveat: Feeld's users arrive *with* dating intent; ours arrive with curiosity. |
| **Hinge** | Freemium sub | $20–50/mo, RPP $33.13 | 2M payers, +15% | "Designed to be deleted" turns success-churn into brand equity. Intentioned daters pay ~2× Tinder rates. |
| **eharmony** | Hard-paywall assessment | $37–45/mo | ~$200–300M, ~750K payers (third-party est., private co.) | Assessment rigor supports 3–5× swipe ARPU. Its format (question wall, no shareable artifact) aged out of under-35s. |
| **OkCupid** | Freemium (Match Group) | — | Not separately disclosed; sits in Match's "Evergreen & Emerging" segment, −14% YoY (Q3 2024 8-K) | **Cautionary tale:** question-based matching was the moat; Tinder-fying the UX destroyed the brand. Protect the assessment as *the product*. |
| **Coffee Meets Bagel** | Freemium, curated daily matches | ~$35/mo | Mid-scale survivor | Few-matches-per-day cadence is a viable, monetizable anti-swipe format. |
| **So Syncd / Birdy / REDDI** | Freemium personality-matchers | — | All sub-scale or shut down (So Syncd's founders framed their 2024 shutdown as a pivot to content/testing) | Personality-first attracts women (Birdy reported ~60% female — readable as asset *or* as fatal supply/demand imbalance) and introverts. Whatever each proximate cause, none solved the cold-start problem. **Canonical statement of the liquidity lesson — referenced throughout.** |
| **Keeper** | Success fee (~$50K bounty, ~$5K/date — [keeper.ai/faqs](https://www.keeper.ai/faqs)) | Outcome pricing | 1.5M signups, ~300K full accounts created (company-reported); $4M pre-seed closed Oct 2024, announced Dec 2025 | Deep intakes complete when the outcome promise is credible. |
| **Paired** (couples) | One sub covers both partners | ~$60–78/yr (2026 third-party reviews conflict: $59.99 vs $77.99; re-verify in-app before pricing F1.1) | 8M downloads; ~$2.4M/yr est. (~$0.30/download — the category monetizes weakly) | Category-standard couples pricing and the daily-ritual retention mechanic. A retention/LTV extender, not a primary engine. |
| **Thursday** | Events + subscription | Ticketed | 150+ cities (verified Jun 2026; user counts unverified) | IRL events monetize the unmatched majority; city-density launch playbook. |
| **16personalities** | Free result + ads + $32.99/yr premium | Free core | 1.5B tests taken, <20 staff, $15–25M/yr (est., private) | The playbook: free full result, shareable identity artifact, SEO/content compounding. |
| **Duolicious** | Open-source, free | — | Small | Progressive assessment UX (value from answer #1, refine forever) beats a front-loaded question wall. |
| **5 Love Languages / We're Not Really Strangers (WNRS, the card-game brand)** | Franchise / physical product | $16–30 | 20M books / TikTok-native brand | A simple shareable vocabulary outlives scientific criticism. Questions-as-content is a free growth engine. |

**What this table shows:** Feeld is the business benchmark, 16personalities the growth benchmark, Paired the retention benchmark, OkCupid the tombstone.

**The precedent gap (canonical statement — referenced throughout).** This table contains no example of a quiz/assessment product converting its audience into a dating pool: 16personalities (1.5B tests), 5 Love Languages (20M books), and the Attachment Project all had enormous pre-liquidity value and none crossed — or attempted — the chasm; every product resembling our endgame is in the graveyard row. Two honest caveats compound it: the virality comps are **survivors** of tens of thousands of dead quizzes (the base rate of quiz virality is tiny and unknowable), and their growth channel — open-web SEO compounding — has been partially gutted by zero-click search and LLM answer engines since they built it. Everything in this PRD past Phase 0 crosses this gap; F0.8 exists to price the first meter of it, and §1 states what it cannot price.

---

## 5. Differentiator Assessment (honest)

### What we genuinely have

1. **A screenshot-native artifact.** A personal 3D terrain is visually unique and inherently shareable. Caveat: MBTI's "INTJ" is socially legible *in text* — it travels in a bio; a terrain image requires the viewer to care. Whether beauty beats legibility is an empirical Phase 0 question (F0.3 CTR metric).
2. **A richer measurement space than any comparable.** 13 continuous parameters vs. MBTI's 4 binary letters or attachment theory's 3 buckets. The pair comparison (combined terrain, saddles between two people's valleys) is a *candidate* matching primitive — "candidate" because the instrument is unvalidated (below).
3. **Pre-liquidity value.** Useful alone and as a couple before any pool exists. Necessary — but explicitly not sufficient (see the precedent gap, §4).
4. **A success-churn hypothesis worth testing.** Dating success removes two users; our couples mode could convert matched pairs into subscribers. No comparable has this lifecycle — which cuts both ways: unexploited advantage, or unexploited because matched couples don't want the app that matched them. Untested; modeled at zero in §7.
5. **Implemented monetization plumbing** and a consented research dataset — the latter firewalled from commercial use (§6 non-requirements).
6. **Founder-content fit.** Companion to "The Geometry of Intimacy"; content-led acquisition is native, not bolted on.

### What we do not have

1. **Scientific validation.** The 13 parameters are a synthesis, not a validated instrument. **Test-retest reliability and convergent validity** (vs. ECR-R and similar) are achievable in months — that's the Phase 1 study. **Predictive validity** — what matching claims require — takes years of longitudinal pairs and has embarrassed better-funded attempts. Consequences: all product language frames the terrain as a reflective tool; Phase 2 matching is positioned as *shared-language introduction*, not predicted compatibility; "validation comes back weak" is a listed risk (§8), not an assumed success.
2. **Distribution.** Zero installed base. Phase 0's channel math (§9) is the test.
3. **Liquidity, with the added twist that our funnel's strongest hooks (couples comparison, couples subscription) actively recruit non-singles.** See the §4 liquidity lesson; F0.8 measures the single-and-looking fraction rather than assuming it.
4. **A moat — now or guaranteed later.** The terrain visual is copyable. The durable-asset story (validated instrument + consented pair dataset + community) is **conditional on everything working**: the instrument may not validate, the commercial pair dataset starts at zero (research data is firewalled), the community doesn't exist. What's being bought in Phases 0–1 is a *chance* to build a moat, not a moat.
5. **Trust & safety capacity, and capital.** Phase 2 is a funded-team problem by construction (§7).

**Verdict:** a real wedge, no moat, and the §4 precedent gap between the wedge and the dating business. That justifies Step 0 and a mostly-no-regret Phase 0. It does not justify more, yet.

---

## 6. Product Strategy & Requirements

### 6.0 Alternatives considered (what Phase 0 was compared against)

| Alternative | Assessment | Why not (or: how it's preserved) |
|---|---|---|
| **Do nothing / blog companion only** | Zero cost, zero information | The app already exists and has unmonetized, uninstrumented traffic potential; "do nothing" forfeits the no-regret improvements every other path wants. |
| **Couples product only, no dating framing** | The safest business (Paired model), weak ceiling (~$0.30/download category economics, §4) | **Preserved as Phase 0's exit branch B** — if intent fails but virality passes, this is what the project becomes, via its own separately-justified decision. |
| **B2B: license the instrument to therapists/coaches** | Plausible, unresearched | Deferred, not rejected — requires the same validation study as Phase 1 (F1.3); becomes attractive precisely if branch B fires. Listed as open question (§10, Q6). |
| **Build the dating app now** | Maximal speed into the §4 precedent gap with zero evidence | Rejected: this is what killed the graveyard row. |
| **Phase 0 as specified** | ~90% no-regret work + one dating-specific instrument (F0.8) | Chosen: prices the pivot question at near-zero increment over work the app needs under every alternative above. |

The founder-hours are real (~200 over four months) and their opportunity cost is the alternatives above; the claim is not "free," it is that four of the five paths share ~90% of the same work, so the *marginal* cost of making it an experiment is days.

**Resourcing assumption for Phases 0–1:** one founder, nights-and-weekends (~10–15 hrs/wk), LLM-assisted development; out-of-pocket ~$100–200/mo. Clock rules — including what happens if effort falls short — are governed by §9 (one extension max, hard calendar stop), not by open-ended founder discretion.

### Phase 0 — Viral Assessment + Intent Probe (4 effort-months)

Goal: prove the artifact spreads, and find out who it spreads *to*.

- **F0.0 Step-0 carryover: hardening & instrumentation** — Stripe verified end-to-end in production; smoke tests for encoding/param computation (the two things that must never break — Feeld's replatform lesson, §4); analytics events for every funnel step. *Acceptance: real transaction verified; funnel dashboard live; baseline report written.*
- **F0.1 Accounts** (Supabase Auth magic-link/OAuth) — optional, offered after results. Anonymous flow stays; localStorage results migrate on signup.
- **F0.2 Persistent landscape profile** — assessment history, saved partner comparisons.
- **F0.3 Shareable result page** — public opt-in URL per landscape with server-rendered OG terrain image and "take yours" CTA. *Acceptance: shared-page → assessment-start conversion measured (§9).*
- **F0.4 Premium depth SKU** — one-time "Full Reading" ($9–14): extended AI reading, per-parameter deep dive, pair compatibility report. Replaces the credit system.
- **F0.5 Web-first checkout** — Stripe on web (§7 App Store economics).
- **F0.6 Content seed (scoped honestly)** — 13 parameter explainer pages + assessment questions repurposed as social content, sequenced after F0.0–F0.4. The full content engine is a years-long compounding job (and the SEO channel our comps rode has been eroded by zero-click search); Phase 0 only tests whether the channel shows *any* signal.
- **F0.7 Progressive assessment** — rough terrain after ~5 answers, refined as answers accumulate (Duolicious lesson, §4), lifting completion.
- **F0.8 Dating-intent probe (the one dating-specific requirement)** — relationship status asked *neutrally, before results are shown* (to limit post-flattery inflation); singles then see at results: "would you want to meet people whose landscapes fit yours?" — opt-in waitlist requiring account creation + city (a small cost gradient; still a weak signal, and §9 treats it as such). *Acceptance: status captured for >90% of completers; waitlist funnel instrumented.*

**Non-goals:** photos, matching, messaging, native apps, engagement-bait features.

### Phase 1 — Relationship Layer (decided via §9; clock relative to Phase 0 effort-months)

- **F1.1 Couples subscription** — price re-verified against Paired's current tiers (§4); offer **monthly ($6.99/mo) and annual (~$59.99/yr) tiers** — the monthly tier exists partly so renewal behavior is observable within the Phase 1 window. *Acceptance: live SKU; ≥100 paying couples; monthly cycle-2 renewal measured (annual renewal reported when observable, ~month 17).*
- **F1.2 AI relational guide** — subscription-gated conversational layer on the existing LLM pipeline. Demand context: AI use in dating grew 333% in a year to 26% of singles; nearly half of Gen Z singles have used AI somewhere in their dating lives (Match/Kinsey, Jun 2025 — [source](https://match.mediaroom.com/2025-06-10-Match-and-The-Kinsey-Institute-Unveil-14th-Annual-Singles-in-America-Study)); measures AI-in-dating broadly, not paid-coach demand. *Acceptance: shipped behind the sub; attach rate measured.*
- **F1.3 Validation study** — reliability + convergent validity vs. established scales (ECR-R), on fresh purpose-consented data; pre-registered; published either way. Annual "State of Relational Terrain" report (the Feeld/Kinsey PR play) from consented data. *Acceptance: fielded before any Phase 2 decision; results published.*

### Phase 2 — Matching Layer (decided on Phase 1 data; requires outside capital)

**Entry requires:** §9 Phase 1 gate passed, validation study supportive, and a funding decision (~$500K–1M). §7's success scenario does not self-fund this; if capital is unavailable, this option expires unexercised and the business continues as whatever Phase 1 made it.

- **F2.1 Opt-in matching pool** — activated from the F0.8 waitlist, city-scoped; terrain-first profiles, minimal photos (Birdy's mechanic, §4).
- **F2.2 Terrain-based introductions** — a few curated matches/week (CMB/Ditto cadence), *positioned as shared-language introductions, not predicted compatibility*, until predictive validation exists. No grid, no swiping (OkCupid lesson, §4).
- **F2.3 Conversation scaffolding** — matches open with a generated pair-reading excerpt, not a blank chat box (targets the repetitive-conversation burnout driver reported in §3.2).
- **F2.4 Trust & safety** — selfie/ID verification vendor, report/block, human moderation, age assurance (UK OSA, US state laws), GDPR special-category handling. Budgeted before launch; no Phase 2 without it.
- **F2.5 Premium tier** ($24.99–34.99/mo, Hinge-anchored): full pair-terrain breakdown with matches, more introductions, filters.
- **F2.6 City-by-city launch** (222/Thursday density playbook, §4), starting where F0.8 waitlist density is highest.
- **Phase 2 exit criteria:** if after 2 quarters in the first city, match→conversation <30% or waitlist→active <20% or verified-pool growth is flat → wind down matching; continue as assessment/couples business.

### Explicit non-requirements (all phases)

- No swipe interface, no engagement-bait notifications, no ads, no consumables.
- **No use of the research-consented dataset for commercial matching.** Research data stays in research; matching runs only on data collected under its own explicit consent (F0.8 onward). No sale or third-party sharing of psychological data, ever. Premium features monetize *the user's own results back to them* — never access to others' data beyond mutual opt-in.

---

## 7. Monetization Model

| Stream | Phase | Price | Benchmark basis |
|---|---|---|---|
| One-time Full Reading / Pair Report | 0 | $9–14 | 16personalities premium $32.99/yr as the assessment-depth comp |
| Couples subscription (covers both) | 1 | $6.99/mo or ~$59.99/yr (re-verify Paired, §4) | Paired category-standard pricing |
| AI relational guide | 1 | $7.99/mo | AI-coach market clusters $10–20/mo; priced under |
| Dating premium | 2 | $24.99–34.99/mo | Hinge RPP $33.13 — the intentioned-dater benchmark |
| Events / IRL (optional) | 2+ | Ticketed | Thursday/Feeld Social model |

**Unit-economics guardrails:** dating's median subscriber lifetime is widely reported as ~5 months from RevenueCat data (we could not locate the figure in the public report previews — verify the edition/page before relying on it; if it holds, LTV ≈ 5 × ARPPU ⇒ at $30 ARPPU, CAC ceiling ≈ $50/payer at 3:1). Cross-industry download→paid: overall median ~2.0%, category medians 1.0–2.9% ([RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps)). The oft-cited 3–8% "niche dating" range is vendor marketing content ([PG Dating Pro](https://www.datingpro.com/blog/dating-platform-benchmarks/)) — directional only, and it describes dating apps, not quiz products. The model only works if organic/content CAC dominates — which is what Phase 0 tests.

**App Store economics:** web checkout currently preserves up to ~30 points minus ~3% processing on US iOS under the post-Epic injunction (external links at 0% while the district court sets a "cost-based" rate; SCOTUS granted cert June 30, 2026). If Apple ultimately gets its proposed 27% external-payment fee, most of that margin disappears; architecture must tolerate either outcome. Match Group's web-checkout push (~$110M projected 2026 savings — [Feb 2026 8-K](https://www.sec.gov/Archives/edgar/data/891103/000089110326000020/mtch8-k20260203ex992.htm)) shows the incentive at scale.

**Illustrative Phase 2 scenario — and what it does not show:** 250K cumulative assessments → 40K pool members → ~4% premium conversion + couples subs ≈ $600–900K ARR. Every rate in that chain is an assumption crossing the §4 precedent gap (the 16% assessment→pool conversion especially; F0.8 replaces the first guess with a measurement). **This success scenario does not fund the ~$500K–1M Phase 2 build** — Phase 2 implies outside capital (evidence a raise is possible: thin; one comp, Keeper's Oct 2024 pre-seed) or results that dramatically exceed these illustrations. There is no version of this plan where Phase 2 happens by default, and possibly none where it happens at all — which is priced into §1's framing of Phase 0 as mostly-no-regret work rather than a bet that requires Phase 2 to pay off.

**Success-churn hypothesis:** modeled at zero everywhere (§5.4). Upside if real; the plan cannot rest on it.

---

## 8. Risks

| Risk | Severity | Mitigation / honest exposure |
|---|---|---|
| Artifact doesn't spread (Phase 0 thesis fails) | High | Cheap to discover; §9 decision table + governance. |
| Artifact spreads but takers aren't singles-with-intent | **High — the central risk** | F0.8 measures it; gate cannot pass on virality alone; §9 branch B kills the pivot while preserving the rest. |
| Stated intent inflates the F0.8 signal | High | Status asked pre-results; waitlist requires account + city; §9 treats the metric as a kill-test, not a proof; true conversion untestable before Phase 2 (stated in §1). |
| Escalation of commitment (founder four months deeper judges less neutrally) | High | §9's middle-band rule: one written re-forecast, one extension max, hard calendar stop, advisor memo requirement. Honest limit: no external party holds a veto; the mechanism makes self-deception effortful, not impossible. |
| Validation study comes back weak/negative | Medium-High | Pre-registered, published either way; product survives as reflective tool; matching positioning would need rework or abandonment. |
| Funded no-swipe competitors occupy the wedge first | Medium-High | If it happens before our Phase 2, the dating layer likely dies; Phase 0's outputs retain value (the plan does not race for the window — §3.3). |
| Liquidity failure in Phase 2 despite funnel | High | City-scoped launch from waitlist density; Phase 2 exit criteria bound the loss. |
| Trust & safety incident | Existential (Phase 2) | Verification vendor + human moderation budgeted pre-launch; no Phase 2 without it. |
| Psychological data breach or consent violation | Existential | Research/commercial data firewall (§6); GDPR special-category handling; encryption; minimization. Feeld's 2024 vulnerability disclosure is the cautionary tale. |
| Founder bandwidth | High | Phase 0 scoped to ~10–15 hrs/wk; §9 clock rules govern shortfall; Phase 2 is a funded-team decision by construction. |
| Platform/legal shifts (Apple fee, age-verification laws) | Medium | Web-first funnel; architecture tolerant of either SCOTUS outcome; compliance review before Phase 2. |
| No moat today, none guaranteed | Medium | Stated plainly in §5.4: Phases 0–1 buy a *chance* to build one (validation + consented pair data + community), conditional on everything working. |

---

## 9. The Scoreboard (single authoritative list — gates, decision table, governance)

**Step zero of this section is Step 0 of the decision:** pull the existing Supabase baseline (completions, share-code loads, single/exploring fraction) and verify payments. **Gate numbers below are the pre-committed mechanism's *starting values*; they are finalized against Step 0 + one month of instrumented data, then frozen** — written into this repo, shared with two named outside advisors, with any post-freeze change or continuation-despite-miss requiring a written memo to them. Honest limit, stated once: the advisors hold accountability, not a veto; no governance can fully bind a solo founder, and the mechanism's job is to make goalpost-moving visible and effortful.

**Clock rules (apply to all phases):** phase clocks run on *effort-months* (~10–15 hrs/wk); if effort falls short, the deadline may extend **once, by at most 8 weeks**, documented to the advisors — and regardless of effort accounting there is a **hard calendar stop at +7 months** from Phase 0 start, at which the decision table is executed on whatever the numbers then are. Phase 1's "+9 months" and all later dates shift by exactly any Phase 0 extension.

**Channel math the targets imply (stated so the ambition is visible):** 25,000 completions at ≥70% completion ≈ 36,000 starts over 16 weeks ≈ 2,200 starts/week from a near-zero base, no paid acquisition. Channels: the blog's existing audience (unmeasured — Step 0), the share loop (F0.3; needs sustained K near 1), the content seed (F0.6; SEO channel partially eroded by zero-click search), and community seeding. This may simply be missed — that is an acceptable, informative outcome; the target is a bar for continuing, not a forecast.

### Phase 0 decision table (evaluated at gate date; every metric has a disposition)

| Metric | Pass | Middle band | Kill |
|---|---|---|---|
| A. Completed assessments (organic) | ≥25,000 | 12,500–25,000 | <12,500 |
| B. Organic growth, final 6 weeks | WoW positive | flat | negative |
| C. Share-or-compare rate | ≥25% | 12.5–25% | <12.5% |
| D. Shared-page → new start | ≥15% | 7.5–15% | <7.5% |
| E. Account creation rate | ≥10% | 5–10% | <5% |
| F. Completion rate | ≥70% | 50–70% | <50% |
| G. Premium reading attach | ≥2% | 0.5–2% | <0.5% |
| H. **Intent:** waitlist join among single completers | ≥20% | 10–20% | <10% |
| I. **Intent validity:** singles ≥25% of completers AND ≥2,000 waitlisted singles in one metro | both | one | neither |

**Dispositions (exhaustive):**
- **Branch A — Phase 1 unlocked:** A–F pass or middle-with-passing-trend; H and I pass. G informs pricing, not the gate.
- **Branch B — dating pivot dead:** H or I kill (or middle with A–F passing). F0.8 is removed; **no Phase 2 ever proceeds from this thesis.** Continuing as a couples/assessment business is a *new decision* requiring its own one-page case against the §6.0 alternatives (including B2B licensing) — it is not pre-authorized by this document.
- **Branch C — stop:** two or more of A/C/E kill → feature development stops; the app persists in maintenance mode as a free tool + reading SKU. No further investment beyond upkeep.
- **Middle-band handling:** metrics in the middle band trigger **one** written re-forecast to the advisors naming what changes and what number it must hit; after the single 8-week extension (or at the hard stop), every middle band resolves to its nearer boundary — no second extension, no re-litigation.

### Phase 1 gate (evaluated at +9 months, shifted by any Phase 0 extension)

- ≥3% of monthly-active users paying across SKUs (directional, vendor-sourced — §7)
- ≥100 paying couples; **monthly-tier cycle-2 renewal ≥60%** (annual renewal reported when observable)
- LTV:CAC ≥3 on any paid channel tested; organic still majority of acquisition
- ≥100K cumulative assessments; waitlist ≥5,000 in the top metro
- Validation study fielded, results in hand
- *Kill: paying <1% or monthly renewal <40% → no Phase 2; the business is whatever Phase 1 made it.*

### Phase 2 operating metrics (post-launch)

Match→conversation ≥30%; conversation→date (self-reported) tracked; verified-profile ≥80%; report-rate SLA; pool growth per city — bound by the §6 Phase 2 exit criteria.

---

## 10. Open Questions

1. **Brand:** does "Love Landscape" carry to a dating product, or does the dating layer need its own name with Love Landscape as the instrument?
2. **Phase 2 beachhead audience:** decided from F0.8 waitlist density data, not speculation.
3. **Raise vs. bootstrap at Phase 2:** ~$500K–1M minimum; §7 shows revenue alone won't fund it; decide only with Phase 1 data.
4. **Validation partner:** which lab/researcher; requires fresh purpose-consented data with co-administered established scales (§6 bars reuse of research submissions).
5. **Research mission and the pivot:** commercialization-funds-research must be earned openly — stated in-product, enforced by the §6 data firewall, revisited if contributors object.
6. **B2B instrument licensing** (therapists, coaches, retreat programs): unresearched; becomes the natural path if §9 branch B fires. Depends on F1.3 validation either way.

---

## Appendix A: Source Notes

Market and competitor figures compiled July 2026 from: Match Group Q4 2025 & Q1 2026 filings, Bumble Q1 2026 release, Forbes Health/OnePoll burnout survey (fielded 2024; secondary-coverage caveats noted inline), Pew Research (2023), Match/Kinsey Singles in America (2025), Sensor Tower estimates, RevenueCat State of Subscription Apps (with one figure — the 5-month dating median lifetime — flagged inline as unlocated in public previews), Business of Apps, Global Dating Insights, company pricing/FAQ pages (Feeld, eharmony, Paired — pricing conflict flagged inline, Keeper, Thursday), and press coverage (TechCrunch, Forbes, Semafor). Sourcing discipline: company-reported figures preferred; third-party estimates marked "(est.)" with limitations inline; single-sourced claims flagged (§3.2 roster); vendor marketing identified as such (§7). Codebase claims in §2 verified against `main` during adversarial review (July 2026); operational claims (payments, deployment) are explicitly gated on Step 0 verification rather than asserted. Known weaknesses that survived review are carried in §8 rather than resolved by assumption.
