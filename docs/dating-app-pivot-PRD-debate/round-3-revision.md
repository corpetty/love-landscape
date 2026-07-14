# PRD: Love Landscape → Relational-Depth Dating Platform

**Status:** Draft v4 (final, post 3-round adversarial review) · July 2026
**Author:** Corey Petty (research compiled with Claude)

## Decision requested

**What happens regardless (Step 0, this week — no approval needed):** verify the Stripe flow end-to-end in production and pull what baseline exists. The app does not currently instrument completions or share-code loads (decoding is client-side and unlogged), so the only existing baseline is the opt-in research submission count and its demographic breakdown — a self-selected lower bound. Step 0 also includes a one-page fake-door intent test against the blog audience (landing page + waitlist, days of work): a near-zero result would sharply lower the prior on everything below before any build starts.

**The decision (Step 1):** within two weeks of Step 0 completing, a written go/no-go memo — shared with the two outside advisors described in §9 — decides whether to run **Phase 0 only**: a 4-month, solo (~10–15 hrs/wk), ~$100–200/mo experiment testing whether the assessment earns distribution and whether its takers include singles with dating intent. Starting gate thresholds are printed in §9's table now; they may be adjusted **once**, with advisor sign-off, against Step 0 data plus a two-week instrumentation shakedown, and are then frozen *before* the experiment's public push begins. **The dating pivot itself is not approvable today**, and approving Phase 0 does not make it the default trajectory: one of Phase 0's three exit branches kills it outright (§9).

---

## 1. Executive Summary

Love Landscape is today a free, anonymous, 17-question relational assessment that renders a personal "relationship terrain" in 3D, generates AI narrative readings, and lets two people compare landscapes via shareable codes. The code for an LLM backend (OpenRouter via Vercel functions), Stripe credit purchases, and Supabase research-data collection is implemented but unverified in production (hence Step 0), the repo has no tests, and there are no accounts, no matching, no messaging, and effectively **zero distribution**.

**What the market research supports:** the swipe-format dating economy is contracting while depth-positioned products are the segment's only growers, and the psychometric/attachment niche is culturally large but unclaimed by any app at scale (§3). A compatibility-depth product is the right *kind* of thing to build in 2026.

**What it does not support:** that *this* product can become a dating app. The comparables record contains no precedent for a quiz product converting its audience into a dating pool (the precedent gap, §4), and virality is not dating intent: terrain-screenshotters and single-local-and-looking may be different people. Phase 0 measures intent directly (F0.8), and its gate cannot be passed on virality alone.

**What Phase 0 can and cannot establish.** It is a cheap kill test, not a proof: a failed gate kills the pivot for the cost of nights-and-weekends; a passed gate establishes top-of-funnel and an intent signal, but stated intent is inflated (our own Phase 2 criteria assume up to 80% waitlist evaporation), and true liquidity — and whether dating-motivated users will complete a psychometric intake — remain untestable before Phase 2. **The gate is also genuinely ambitious: the pass bar implies ~2,200 organic assessment starts per week from a near-zero base (§9), and missing it is the likeliest single outcome.** That outcome is informative, not wasted: it prices the question and routes the project to its fallback paths.

**Why run it:** most of Phase 0's engineering — accounts, persistent profiles, the premium SKU, payments verification, instrumentation (roughly 60% by effort) — is work the app needs under every path in which it continues at all; the growth-loop work (share pages, content seed, progressive assessment; ~35%) serves any consumer-growth path including couples-only; the dating-specific increment is one requirement, F0.8 (~5%, days of work). See §6.0 for the alternatives this was weighed against, including the regret case: if Phase 0's growth metrics kill, roughly 200 founder-hours will have mostly been spent learning the audience doesn't exist.

**The three phases, each a separate decision:**

1. **Phase 0 — Viral Assessment + Intent Probe** (4 effort-months): as above. Exits via §9's decision table: unlock Phase 1, kill the pivot but continue toward a couples/assessment business (a new decision, separately justified), or stop feature work.
2. **Phase 1 — Relationship Layer** (decided on Phase 0 data): couples subscription, AI relational guide, psychometric validation study. As specified it likely exceeds solo capacity — entry triggers a resourcing re-plan (§6).
3. **Phase 2 — Matching Layer** (decided on Phase 1 data): the actual dating app, city-scoped. Requires ~$500K–1M in outside capital, since §7's own success scenario does not self-fund it. This option may never become exercisable; the plan's value does not depend on exercising it.

---

## 2. Background: What Exists Today

Current-state inventory (July 2026, `main` branch; codebase claims verified during review — see Appendix A):

| Area | State |
|---|---|
| Assessment | 17 fixed, sequential questions → 13 psychological parameters (attachment security, uncertainty tolerance, openness, self-intimacy, conflict approach, etc.) — [questions.js](../src/data/questions.js), [paramCompute.js](../src/data/paramCompute.js). An LLM pass can adjust parameters post-hoc from user context; the questionnaire itself is not adaptive. |
| Visualization | Three.js 3D terrain (Gaussian basis functions on a 100×100 field), radar chart, contour map — [src/terrain/](../src/terrain/) |
| Sharing | ~21-char versioned codes (`L2_` + 18 base64 chars) encode all params; partner loads code and sees yours/theirs/combined terrain. Loads are client-side and currently unlogged. |
| AI | 4-provider LLM client (managed OpenRouter proxy default, BYO Claude/OpenRouter/Ollama); parameter refinement + individual and pair readings — [llmClient.js](../src/data/llmClient.js) |
| Payments | Stripe checkout + webhook code for LLM credits — [api/checkout.js](../api/checkout.js). Implemented; live end-to-end flow unverified (Step 0). |
| Data | Supabase: anonymous session credits + opt-in research submissions (13 params + optional demographics, including a `relationship_structure` field: monogamous / ENM-polyamorous / single-exploring / other), admin analytics dashboard. This opt-in count is the only existing usage baseline. |
| Infra | Vite static site + 4 Vercel serverless functions; ~6.0K LOC (JS/JSX in `src/` + `api/`, `wc -l`); mobile responsive; **no automated tests** |
| Distribution | **Effectively zero.** Blog-companion launch only; no marketing has been done. |
| Missing for dating | Accounts/auth, persistent profiles, photos, matching, discovery, messaging, moderation, verification, native apps |

The assessment model is the asset. The 13-parameter space covers attachment, ambiguity tolerance, exclusivity orientation, physicality grounding, self-intimacy, conflict, and playfulness — dimensions that map to what compatibility-based matching would need, and that no mainstream app measures. It is a thoughtful synthesis, **not a validated psychometric instrument** — the implications run through §5 and §8.

### Who this is for, initially

The Phase 0 taker is the existing audience of the blog and its adjacencies: analytically minded, therapy-literate, roughly 25–45, comfortable with self-assessment as reflection and entertainment — and plausibly skewed toward partnered people, since the couples-comparison mechanic is the product's strongest hook. This matters for gate interpretation: Phase 0's intent metrics measure *this funnel and this seed audience jointly with the product* (§9); a verdict against dating intent here is a verdict about this audience, not necessarily every audience. The Phase 2 beachhead is deliberately undecided (§10, Q2) until waitlist data exists.

---

## 3. Market Opportunity

### 3.1 The swipe economy is contracting; depth incumbents are the only growers

**What the operator data establishes:** the remaining willingness-to-pay in this market sits with intentioned daters at ~$25–40/mo. **What it does not establish:** *why* — the swipe-format-is-dying reading is plausible but confounded (Match reallocates capital toward Hinge; brand-freshness cycles; "depth-positioned" is partly a category drawn after seeing who grew). This PRD treats depth demand as plausible, not proven.

- Dating **app** revenue declined for the first time in industry history in 2025 (~$6B, Business of Apps estimate). Broader forecasts ($6–13B for 2026 by scope) conflict with observed app-level declines; this PRD leans on operator-reported data.
- Match Group FY2025: revenue flat at $3.5B, payers −5% to 13.8M; Tinder direct revenue **−4% (−5% FX-neutral), its first annual decline** ([Match Q4 2025 release](https://www.prnewswire.com/news-releases/match-group-announces-fourth-quarter-and-full-year-results-302678116.html)). Bumble: revenue −14%, paying users −21% YoY in Q1 2026, reportedly exploring a sale ([TechCrunch, May 2026](https://techcrunch.com/2026/05/05/bumbles-paying-users-are-slipping-as-it-bets-on-an-overhaul-later-this-year/)).
- The growers are depth-positioned: **Hinge** +28% direct revenue, payers +15%, RPP $33.13 vs Tinder's $17.56 ([Match Q1 2026 8-K](https://www.sec.gov/Archives/edgar/data/0000891103/000089110326000072/mtch8-k20260505ex991.htm)); **Feeld** $65M revenue 2024, +26% YoY, £9.3M pre-tax profit, independent; **eharmony** est. $200–300M (App. A) at $37–45/mo on an 80-question assessment.
- **Bound the inference:** each grower has an advantage we lack — Hinge has Match's distribution machine; Feeld's niche identity *is* dating intent plus a decade of brand; eharmony has legacy TV-era brand equity. "Depth incumbents grow" does not imply "a new depth entrant will grow" — the record for new, small depth entrants is the graveyard row of §4 — and we cannot rule out that the category is a shrinking pie consolidating toward incumbents.

### 3.2 Fatigue is real — and points at delegation, which shapes our design

**The design consequence up front:** our answer to fatigue is effort-once-upfront (the assessment), delegation-downstream (few curated introductions, pre-scaffolded conversations, no swiping labor). Whether users accept that trade is untestable before Phase 2 — Phase 0 takers do the quiz as entertainment, with no dating promise attached — and this document treats it as an open tension.

- 78% of dating-app users report burnout; Gen Z and Millennials tied highest at ~79% (Forbes Health/OnePoll, n=1,000, fielded March–April 2024). Confirmed top driver: no meaningful connections (40%); other reported drivers (disappointment, rejection, repetitive conversations) are from secondary coverage (App. A).
- US searches for "matchmaker" roughly doubled Jan 2025 → Jan 2026 ([GDI](https://www.globaldatinginsights.com/news/gen-z-dating-app-burnout-drives-surge-in-matchmaker-interest/)). Burnt-out users' revealed alternatives — matchmakers, IRL events, leaving apps — are all *less* user effort. Keeper's ~300K created-full-accounts (of 1.5M signups, company-reported) suggest users complete deep intakes when the outcome promise is credible; Keeper's promise ($50K success-fee matchmaking) is one we cannot make at zero liquidity.
- Pew's most recent major study (2023) showed "ever used" adoption stable — a slow-moving stock metric predating the 2025–26 contraction.
- Venture activity confirms the no-swipe thesis is live — and crowded: Sitch ($6.7M — [GDI](https://www.globaldatinginsights.com/news/sitch-reaches-6-7m-in-funding-and-tens-of-thousands-of-users/)), Known ($9.7M), 222 ($10.1M Series A), Ditto ($9.2M, ~150K users), Overtone (Hinge founder, Match-backed). All but Sitch single-sourced (App. A).

### 3.3 The specific opening — stated at its true size

Attachment theory and relational psychology have large organic cultural pull (the Attachment Project's study drew 44,435 participants, 31,676 of them active dating-app users — [source](https://www.attachmentproject.com/research/psychology-dating-apps-study/)), and no app has capitalized the mechanic at scale. Be precise: this is an unclaimed *content-and-assessment* niche, demonstrably; an unclaimed *dating* niche only by hypothesis. The funded entrants above attack adjacent wedges with an 18–24 month head start on liquidity before our Phase 2 could begin. **This plan is not racing them.** If one occupies the psychometric wedge first, our dating layer dies (§8) and Phase 0's other outputs retain value. The case for acting now is not urgency; it is that Step 0 + Phase 0 convert a permanently deferred question into a priced one, at low incremental cost over work the app needs anyway (§6.0).

**Conclusion:** the market justifies a cheap, mostly-shared-cost probe. It does not yet justify a dating app. That is what the gates are for.

---

## 4. Comparable Analysis

| Comp | Model | Price | Scale | Lesson for us |
|---|---|---|---|---|
| **Feeld** | Sub-only freemium, no ads | $8–12/mo (to $30 by geo) | $65M rev 2024 (company-reported), £9.3M pre-tax profit | A sharp psychological niche reaches ~$65M with minimal paid acquisition; brand content is the marketing. Their 2023 replatform disaster nearly killed trust — don't break the core artifact. Caveat: Feeld's users arrive *with* dating intent; ours arrive with curiosity. |
| **Hinge** | Freemium sub | $20–50/mo, RPP $33.13 | 2M payers, +15% | "Designed to be deleted" turns success-churn into brand equity. Intentioned daters pay ~2× Tinder rates. |
| **eharmony** | Hard-paywall assessment | $37–45/mo | ~$200–300M, ~750K payers (est., App. A) | Assessment rigor supports 3–5× swipe ARPU. Its format (question wall, no shareable artifact) aged out of under-35s. |
| **OkCupid** | Freemium (Match Group) | — | Not separately disclosed; Match's Evergreen brands subset (Match/Meetic/POF/OkCupid) −14% YoY as of Q3 2024, within a segment −9% (App. A) | **Cautionary tale:** question-based matching was the moat; Tinder-fying the UX destroyed the brand. Protect the assessment as *the product*. |
| **Coffee Meets Bagel** | Freemium, curated daily matches | ~$15–35/mo effective, by commitment length | Mid-scale survivor | Few-matches-per-day cadence is a viable, monetizable anti-swipe format. |
| **So Syncd / Birdy / REDDI** | Freemium personality-matchers | — | All sub-scale or shut down (So Syncd's founders framed their 2024 shutdown as a pivot to content/testing) | Personality-first attracts women (Birdy reported ~60% female — readable as asset *or* as fatal supply/demand imbalance) and introverts. Whatever each proximate cause, none solved the cold-start problem — the liquidity lesson referenced throughout this document. |
| **Keeper** | Success fee (~$50K bounty, ~$5K/date — [keeper.ai/faqs](https://www.keeper.ai/faqs)) | Outcome pricing | 1.5M signups, ~300K full accounts (company-reported); $4M pre-seed closed Oct 2024 | Deep intakes complete when the outcome promise is credible. |
| **Paired** (couples) | One sub covers both partners | ~$60–78/yr (2026 sources conflict; re-verify before pricing F1.1) | 8M downloads; ~$2.4M/yr (Sensor Tower-derived est. — ~$0.30/download; the category monetizes weakly) | Category-standard couples pricing; daily-ritual retention. A retention/LTV extender, not a primary engine. |
| **Thursday** | Events + subscription | Ticketed | 150+ cities (verified Jun 2026; user counts unverified) | IRL events monetize the unmatched majority; city-density launch playbook. |
| **16personalities** | Free result + ads + one-time paid deep-dive reports (no subscription) | Free core | 1B+ tests taken (company claim), <20 staff, $15–25M/yr (est.) | The playbook: free full result, shareable identity artifact, SEO/content compounding. |
| **Duolicious** | Open-source, free | — | Small | Progressive assessment UX (value from answer #1, refine forever) beats a front-loaded question wall. |
| **5 Love Languages / We're Not Really Strangers (WNRS, the card-game brand)** | Franchise / physical product | $16–30 | 20M books / TikTok-native brand | A simple shareable vocabulary outlives scientific criticism. Questions-as-content is a free growth engine. |

**What this table shows:** Feeld is the business benchmark, 16personalities the growth benchmark, Paired the retention benchmark, OkCupid the tombstone.

**The precedent gap.** This table contains no example of a quiz/assessment product converting its audience into a dating pool: 16personalities (1B+ tests), 5 Love Languages (20M books), and the Attachment Project all had enormous pre-liquidity value and none crossed — or attempted — the chasm; every product resembling our endgame is in the graveyard row. Two caveats compound it: the virality comps are *survivors* of tens of thousands of dead quizzes (the base rate of quiz virality is tiny and unknowable), and their growth channel — open-web SEO compounding — has been partially gutted by zero-click search and LLM answer engines since they built it. Everything in this PRD past Phase 0 crosses this gap; F0.8 prices the first meter of it, and §1 states what it cannot price.

---

## 5. Differentiator Assessment

### What we genuinely have

1. **A screenshot-native artifact.** A personal 3D terrain is visually unique and inherently shareable. Caveat: MBTI's "INTJ" is socially legible *in text* — it travels in a bio; a terrain image requires the viewer to care. Whether beauty beats legibility is an empirical Phase 0 question (§9, metric D).
2. **A richer measurement space than any comparable.** 13 continuous parameters vs. MBTI's 4 binary letters or attachment theory's 3 buckets. The pair comparison (combined terrain, saddles between two people's valleys) is a *candidate* matching primitive — "candidate" because the instrument is unvalidated (below).
3. **Pre-liquidity value.** Useful alone and as a couple before any pool exists. Necessary — but not sufficient (see the precedent gap, §4).
4. **A success-churn hypothesis worth testing.** Dating success removes two users; our couples mode could convert matched pairs into subscribers. No comparable has this lifecycle — which cuts both ways: unexploited advantage, or unexploited because matched couples don't want the app that matched them. Untested; modeled at zero in §7.
5. **Implemented monetization plumbing** and a consented research dataset — the latter firewalled from commercial use (§6 non-requirements).
6. **Founder-content fit.** Companion to "The Geometry of Intimacy"; content-led acquisition is native, not bolted on.

### What we do not have

1. **Scientific validation.** The 13 parameters are a synthesis, not a validated instrument. Test-retest reliability and convergent validity (vs. ECR-R and similar) are achievable in months — the Phase 1 study. Predictive validity — what matching claims require — takes years of longitudinal pairs and has embarrassed better-funded attempts. Consequences: all product language frames the terrain as a reflective tool; Phase 2 matching is positioned as *shared-language introduction*, not predicted compatibility; "validation comes back weak" is a listed risk (§8), not an assumed success.
2. **Distribution.** Zero installed base. Phase 0's channel math (§9) is the test.
3. **Liquidity, with the added twist that our funnel's strongest hooks (couples comparison, couples subscription) actively recruit non-singles.** See the §4 liquidity lesson; F0.8 measures the single-and-looking fraction rather than assuming it — and §9 accounts for the resulting tension between the sharing and intent metrics.
4. **A moat — now or guaranteed later.** The terrain visual is copyable. The durable-asset story (validated instrument + consented pair dataset + community) is conditional on everything working: the instrument may not validate, the commercial pair dataset starts at zero (research data is firewalled), the community doesn't exist. Phases 0–1 buy a *chance* to build a moat, not a moat.
5. **Trust & safety capacity, and capital.** Phase 2 is a funded-team problem by construction (§7).

**Verdict:** a real wedge, no moat, and the §4 precedent gap between the wedge and the dating business. That justifies Step 0 and a mostly-shared-cost Phase 0. It does not justify more, yet.

---

## 6. Product Strategy & Requirements

### 6.0 Alternatives considered

Scope premise, stated plainly: the founder intends to continue *this project* in some form; alternatives outside Love Landscape (other projects, other uses of ~200 hours) are not scored here. Within that scope:

| Alternative | Assessment | Disposition |
|---|---|---|
| **Do nothing / blog companion only** | Zero cost, zero information; forfeits monetization and instrumentation of existing traffic | Rejected given the continue-premise; it is the implicit comparison Branch C falls back toward. |
| **Standalone fake-door intent test only** (landing page + waitlist, days, <$500) | Cheapest possible probe of the dating question; measures seed-audience intent but not artifact-driven funnel intent | **Adopted as a component** — runs in Step 0, before any build; a near-zero result lowers the prior and can stop everything early. Not sufficient alone: it can't test the share loop or the funnel's intent composition. |
| **Couples product only, no dating framing** | The safest business (Paired model), weak ceiling (~$0.30/download category economics, §4) | Preserved as Phase 0's exit Branch B — reachable via its own separately-justified decision. |
| **B2B: license the instrument to therapists/coaches — or to an existing dating app** | Plausible, unresearched; requires the same validation study (F1.3) | Deferred, not rejected; natural successor if Branch B fires (§10, Q6). |
| **Build the dating app now** | Maximal speed into the §4 precedent gap with zero evidence | Rejected: this is what killed the graveyard row. |
| **Phase 0 as specified** | Shared-cost build + the intent probe | Chosen. Effort split, derived per requirement: ~60% (accounts, profiles, SKU, payments, instrumentation — needed under every continuing path), ~35% (share pages, content seed, progressive assessment — needed under any consumer-growth path including couples-only), ~5% (F0.8 — dating-specific). |

The cost claim, stated honestly: the work is shared-cost *conditional on continuing*; in the Branch C world (growth metrics kill), most of the ~200 hours will have bought a negative result and little else. That is the price of the information.

**Resourcing (Phases 0–1):** one founder, nights-and-weekends (~10–15 hrs/wk), LLM-assisted development, ~$100–200/mo out-of-pocket. Clock rules in §9 (one extension max, hard calendar stop). Phase 1 as specified exceeds this envelope — see its section.

### Phase 0 — Viral Assessment + Intent Probe (4 effort-months)

Goal: prove the artifact spreads, and find out who it spreads *to*.

- **F0.0 Hardening & instrumentation** — Stripe verified end-to-end in production; smoke tests for encoding/param computation (the two things that must never break — Feeld's replatform lesson, §4); analytics events for every funnel step (start, complete, share, code-load, signup, purchase — none of which are currently logged). *Acceptance: real transaction verified; funnel dashboard live; Step 0 baseline report written.*
- **F0.1 Accounts** (Supabase Auth magic-link/OAuth) — optional, offered after results; anonymous flow stays; localStorage results migrate on signup. *Acceptance: signup, migration, and re-login work on mobile and desktop.*
- **F0.2 Persistent landscape profile** — assessment history, saved partner comparisons. *Acceptance: a returning user can retrieve every past result and comparison.*
- **F0.3 Shareable result page** — public opt-in URL per landscape with server-rendered OG terrain image and "take yours" CTA. *Acceptance: OG image renders in iMessage/WhatsApp/X link previews; shared-page → assessment-start conversion tracked (§9 metric D).*
- **F0.4 Premium depth SKU** — one-time "Full Reading" ($9–14): extended AI reading, per-parameter deep dive, pair compatibility report; replaces the credit system. *Acceptance: purchasable end-to-end; attach rate tracked (§9 metric G).*
- **F0.5 Web-first checkout** — Stripe on web (§7 App Store economics). *Acceptance: no store-mediated payment path exists to be taxed.*
- **F0.6 Content seed** — 13 parameter explainer pages + assessment questions repurposed as social content, sequenced after F0.0–F0.4. The full content engine is a years-long compounding job in a partially eroded SEO era (§4); Phase 0 only tests for signal. *Acceptance: pages live by week 8; attributed organic assessment starts tracked, reported at gate (diagnostic, not gated).*
- **F0.7 Progressive assessment** — rough terrain visible after ~5 answers, refined as answers accumulate (Duolicious lesson, §4). *Acceptance: shipped behind an A/B flag; completion-rate delta measured (§9 metric F).*
- **F0.8 Dating-intent probe (the one dating-specific requirement)** — relationship status asked neutrally *before* results are shown (limits post-flattery inflation); singles then see at results: "would you want to meet people whose landscapes fit yours?" — opt-in waitlist requiring account + city (a small cost gradient; still a weak signal, treated as such in §9). *Acceptance: status captured for >90% of completers; waitlist funnel instrumented; sharing tracked separately for partner-compare vs. public share (§9 interpretation note).*

**Non-goals:** photos, matching, messaging, native apps, engagement-bait features.

### Phase 1 — Relationship Layer (decided at Branch A; requires a resourcing re-plan)

Phase 1 as specified — a couples SKU with renewal targets, an AI guide, a fielded validation study, and continued growth — likely exceeds one person at 10–15 hrs/wk. **Branch A therefore triggers a Phase 1 kickoff decision covering scope, first-contractor vs. scope-cut, and study funding (validation study estimated $5–20K unless university-partnered — unpriced capital, acknowledged).** Phase 1 gate values in §9 are illustrative and are recalibrated and frozen at kickoff under the same advisor protocol.

- **F1.1 Couples subscription** — monthly ($6.99/mo) and annual (~$59.99/yr; re-verify Paired's current pricing, §4) tiers; the monthly tier exists partly so renewal behavior is observable within the Phase 1 window. *Acceptance: live SKU; ≥100 paying couples; monthly cycle-2 renewal measured (annual renewal reported ~month 17 when observable).*
- **F1.2 AI relational guide** — subscription-gated conversational layer on the existing LLM pipeline. Demand context: AI use in dating grew 333% in a year to 26% of singles; nearly half of Gen Z singles have used AI somewhere in their dating lives (Match/Kinsey, Jun 2025 — [source](https://match.mediaroom.com/2025-06-10-Match-and-The-Kinsey-Institute-Unveil-14th-Annual-Singles-in-America-Study)); this measures AI-in-dating broadly, not paid-coach demand, and the $7.99/mo price is our estimate pending market check. *Acceptance: shipped behind the sub; attach rate measured.*
- **F1.3 Validation study** — reliability + convergent validity vs. established scales (ECR-R), on fresh purpose-consented data; pre-registered; published either way. Annual "State of Relational Terrain" report (the Feeld/Kinsey PR play) from consented data. *Acceptance: fielded before any Phase 2 decision; results published.*
- **F1.4 Paid-channel micro-test** — $500–1,000 across 1–2 channels, solely to produce a real CAC datapoint for the Phase 1 gate. *Acceptance: spend executed; CAC per completed assessment and per payer computed.*

### Phase 2 — Matching Layer (decided on Phase 1 data; requires outside capital)

**Entry requires:** §9 Phase 1 gate passed, validation study supportive, and a funding decision (~$500K–1M). §7's success scenario does not self-fund this; if capital is unavailable, the option expires unexercised and the business continues as whatever Phase 1 made it.

- **F2.1 Opt-in matching pool** — activated from the F0.8 waitlist, city-scoped; terrain-first profiles, minimal photos (Birdy's mechanic, §4).
- **F2.2 Terrain-based introductions** — a few curated matches/week (CMB/Ditto cadence), positioned as *shared-language introductions, not predicted compatibility*, until predictive validation exists. No grid, no swiping (OkCupid lesson, §4).
- **F2.3 Conversation scaffolding** — matches open with a generated pair-reading excerpt, not a blank chat box (targets the repetitive-conversation burnout driver reported in §3.2).
- **F2.4 Trust & safety** — selfie/ID verification vendor, report/block, human moderation, age assurance (UK OSA, US state laws), GDPR special-category handling. Budgeted before launch; no Phase 2 without it.
- **F2.5 Premium tier** ($24.99–34.99/mo, Hinge-anchored): full pair-terrain breakdown with matches, more introductions, filters.
- **F2.6 City-by-city launch** (222/Thursday density playbook, §4), starting where waitlist density is highest.
- **Phase 2 exit criteria:** if after 2 quarters in the first city, match→conversation <30% or waitlist→active <20% or verified-pool growth is flat → wind down matching; continue as assessment/couples business.

### Explicit non-requirements (all phases)

- No swipe interface, no engagement-bait notifications, no ads, no consumables.
- **No use of the research-consented dataset for commercial matching.** Research data stays in research; matching runs only on data collected under its own explicit consent (F0.8 onward). No sale or third-party sharing of psychological data, ever. Premium features monetize *the user's own results back to them* — never access to others' data beyond mutual opt-in.

---

## 7. Monetization Model

| Stream | Phase | Price | Benchmark basis |
|---|---|---|---|
| One-time Full Reading / Pair Report | 0 | $9–14 | 16personalities' one-time paid deep-dive reports are the closest comp (App. A) |
| Couples subscription (covers both) | 1 | $6.99/mo or ~$59.99/yr (re-verify Paired, §4) | Paired category-standard pricing |
| AI relational guide | 1 | $7.99/mo (our estimate; market check pending) | AI-coach apps observed at roughly $10–20/mo (est., unverified — App. A); priced under |
| Dating premium | 2 | $24.99–34.99/mo | Hinge RPP $33.13 — the intentioned-dater benchmark |
| Events / IRL (optional) | 2+ | Ticketed | Thursday/Feeld Social model |

**Unit-economics guardrails:** dating's median subscriber lifetime is widely reported as ~5 months from RevenueCat data (unlocated in public report previews — verify before relying; if it holds, LTV ≈ 5 × ARPPU ⇒ at $30 ARPPU, CAC ceiling ≈ $50/payer at 3:1). Cross-industry download→paid: overall median ~2.0%, category medians 1.0–2.9% ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)). The oft-cited 3–8% "niche dating" conversion range is vendor marketing ([PG Dating Pro](https://www.datingpro.com/blog/dating-platform-benchmarks/)) — directional only, and it describes dating apps, not quiz products. The model only works if organic/content CAC dominates — which is what Phase 0 tests, and what F1.4's micro-test benchmarks.

**App Store economics:** web checkout currently preserves up to ~30 points minus ~3% processing on US iOS under the post-Epic injunction (external links at 0% while the district court sets a "cost-based" rate; SCOTUS granted cert June 30, 2026). If Apple ultimately gets its proposed 27% external-payment fee, most of that margin disappears; the architecture must tolerate either outcome. Match Group's web-checkout push (~$110M projected 2026 savings — [Feb 2026 8-K](https://www.sec.gov/Archives/edgar/data/891103/000089110326000020/mtch8-k20260203ex992.htm)) shows the incentive at scale.

**Illustrative Phase 2 scenario — and what it does not show:** 250K cumulative assessments → 40K pool members → ~4% premium conversion + couples subs ≈ $600–900K ARR. Every rate in that chain is an assumption crossing the §4 precedent gap (the 16% assessment→pool conversion especially; F0.8 replaces the first guess with a measurement). **This success scenario does not fund the ~$500K–1M Phase 2 build** — Phase 2 implies outside capital (raise evidence: thin; one comp, Keeper's Oct 2024 pre-seed) or results that dramatically exceed these illustrations. There is no version of this plan where Phase 2 happens by default, and possibly none where it happens at all — priced into §1's framing.

**Success-churn hypothesis:** modeled at zero everywhere (§5.4). Upside if real; the plan cannot rest on it.

---

## 8. Risks

| Risk | Severity | Mitigation / honest exposure |
|---|---|---|
| Artifact doesn't spread (Phase 0 thesis fails) | High — likeliest single outcome (§1) | Cheap to discover; §9 decision table; the Step 0 fake-door can lower the prior before any build. |
| Artifact spreads but takers aren't singles-with-intent | **High — the central risk** | F0.8 measures it; gate cannot pass on virality alone; Branch B kills the pivot while preserving the rest. |
| Gate measures channel × audience, not just product; sharing and intent metrics are structurally coupled (partner-compare recruits non-singles) | High | Sharing tracked split (partner-compare vs. public); §9 interpretation note; a Branch B verdict is scoped to this funnel/audience — retesting under a different audience requires the new-decision path. |
| Stated intent inflates the F0.8 signal | High | Status asked pre-results; waitlist requires account + city; §9 treats the metric as a kill-test, not a proof; true conversion untestable before Phase 2. |
| Escalation of commitment (founder deeper in judges less neutrally) | High | Freeze happens *before* the public push (not mid-experiment); one extension max; hard calendar stop; advisor memo requirement; strict defaults if advisors aren't secured. Honest limit: no external party holds a veto — the mechanism makes goalpost-moving visible and effortful, not impossible. |
| Validation study comes back weak/negative | Medium-High | Pre-registered, published either way; product survives as reflective tool; matching positioning would need rework or abandonment. |
| Funded no-swipe competitors occupy the wedge first | Medium-High | If it happens before our Phase 2, the dating layer likely dies; Phase 0's outputs retain value (§3.3 — the plan does not race). |
| Phase 1 workload exceeds solo capacity | High | Named in §6: Branch A triggers a resourcing re-plan; Phase 1 gate values recalibrated at kickoff rather than pretending the solo envelope stretches. |
| Liquidity failure in Phase 2 despite funnel | High | City-scoped launch from waitlist density; Phase 2 exit criteria bound the loss. |
| Trust & safety incident | Existential (Phase 2) | Verification vendor + human moderation budgeted pre-launch; no Phase 2 without it. |
| Psychological data breach or consent violation | Existential | Research/commercial data firewall (§6); GDPR special-category handling; encryption; minimization. Feeld's 2024 vulnerability disclosure is the cautionary tale. |
| Platform/legal shifts (Apple fee, age-verification laws) | Medium | Web-first funnel; architecture tolerant of either SCOTUS outcome; compliance review before Phase 2. |
| No moat today, none guaranteed | Medium | Stated in §5: Phases 0–1 buy a *chance* to build one, conditional on validation, data, and community all materializing. |

---

## 9. The Scoreboard

### Governance and freeze protocol

1. **Advisors:** two outside advisors, named and agreed **before the freeze** (candidates to be secured during Step 0; §10 Q7). They receive the frozen thresholds, the gate-date evaluation, and any deviation memos. They hold accountability, not a veto. **Fallback:** if two advisors are not secured by freeze date, the printed thresholds below stand unmodified and every ambiguity at gate date resolves to FAIL.
2. **Calibration window:** the printed thresholds may be adjusted **once**, informed by (a) Step 0's baseline (opt-in research submission count and its `relationship_structure` breakdown — a self-selected, post-results proxy, treated as directional only; §2) and (b) a two-week instrumentation shakedown after F0.0 ships, whose data is excluded from gate evaluation.
3. **Freeze:** thresholds are frozen with advisor sign-off **before the experiment's public push begins**. The 16-week gate clock starts at freeze. Nothing after freeze changes a threshold; continuation despite any miss requires a written memo to the advisors.
4. **Clock:** effort-month basis (~10–15 hrs/wk). One extension of at most 8 weeks is available (documented to advisors with a written re-forecast naming which metric must reach what number). Hard calendar stop at **freeze + 7 months** regardless of effort accounting: the decision table executes on whatever the numbers then are, and every remaining ambiguity resolves to FAIL.

### Channel math (so the ambition is visible)

25,000 completions at ≥70% completion ≈ 36,000 starts over 16 weeks ≈ 2,200 starts/week from a near-zero base, no paid acquisition. Channels: the blog audience (sized in Step 0), the share loop (metric D; needs sustained reproduction near 1), the content seed (F0.6; SEO partially eroded by zero-click search), community seeding. Missing this is the likeliest single outcome (§1) and is informative, not renegotiable.

### Gating metrics (five gate; four diagnostic)

Threshold consistency check, shown so the table can be trusted: 25,000 completions × 25% singles × 20% waitlist join = 1,250 ≥ the 1,000 national waitlist floor. The intent floor is national because no Phase 0 channel concentrates geographically; metro concentration is *measured* and becomes the Phase 1 waitlist target and the Phase 2 city choice.

| # | Metric | Pass | Middle | Kill |
|---|---|---|---|---|
| A | Completed assessments (organic, post-freeze) | ≥25,000 | 12,500–25,000 | <12,500 |
| C | Share-or-compare rate (tracked split: public share vs. partner-compare) | ≥25% | 12.5–25% | <12.5% |
| E | Account creation rate | ≥10% | 5–10% | <5% |
| H | Waitlist join among single completers | ≥20% | 10–20% | <10% |
| I | Intent validity: singles fraction of completers / waitlisted singles nationally | ≥25% / ≥1,000 | 15–25% / 500–1,000 | <15% / <500 |

Diagnostics (measured, reported at gate, not branch-determining): B — organic growth trend, final 6 weeks; D — shared-page → assessment-start (target ≥15%); F — completion rate (target ≥70%); G — premium attach (target ≥2%; informs pricing).

### Decision algorithm (mechanical; covers all outcomes)

1. **Resolve ambiguity:** at gate date, any metric in its middle band is AMBIGUOUS. If the extension is unused, one 8-week extension may be taken (per the clock rules); at the final evaluation (or the hard stop), every metric still in a middle band **resolves to KILL** — the conservative default.
2. **Intent axis:** PASS if H and both I clauses pass; FAIL otherwise (after step 1).
3. **Growth axis:** score A, C, E as pass=2/kill=0 (after step 1). PASS if total = 6; FAIL otherwise.
4. **Branch:**
   - Growth PASS ∧ Intent PASS → **Branch A: Phase 1 unlocked** (triggers the §6 Phase 1 kickoff/resourcing decision).
   - Growth PASS ∧ Intent FAIL → **Branch B: dating pivot dead.** F0.8 is removed; no Phase 2 ever proceeds from this thesis. Continuing toward a couples/assessment business is a *new decision* requiring its own one-page case against the §6.0 alternatives (including B2B licensing). Interpretation caveat: this verdict is scoped to this funnel and seed audience (§8).
   - Growth FAIL → **Branch C: stop.** Feature development stops; the app persists in maintenance mode as a free tool + reading SKU. No further investment beyond upkeep.

### Phase 1 gate (illustrative — recalibrated and frozen at Phase 1 kickoff under the same protocol)

- ≥3% of monthly-active users paying across SKUs (directional, vendor-sourced — §7)
- ≥100 paying couples; monthly-tier cycle-2 renewal ≥60% (annual renewal reported when observable)
- LTV:CAC ≥3 on the F1.4 micro-test; organic still the majority of acquisition
- Cumulative assessments ≥3× the Phase 0 result; top-metro waitlist ≥3× the Phase 0 top-metro count
- Validation study fielded, results in hand
- *Kill: paying <1% or monthly renewal <40% → no Phase 2; the business is whatever Phase 1 made it.*

### Phase 2 operating metrics (post-launch)

Match→conversation ≥30%; conversation→date (self-reported) tracked; verified-profile ≥80%; report-rate SLA; pool growth per city — bound by the §6 Phase 2 exit criteria.

---

## 10. Open Questions

1. **Brand:** does "Love Landscape" carry to a dating product, or does the dating layer need its own name with Love Landscape as the instrument?
2. **Phase 2 beachhead audience:** decided from waitlist density data, not speculation.
3. **Raise vs. bootstrap at Phase 2:** ~$500K–1M minimum; §7 shows revenue alone won't fund it; decide only with Phase 1 data.
4. **Validation partner and budget:** which lab/researcher; $5–20K unless partnered (§6); requires fresh purpose-consented data with co-administered established scales.
5. **Research mission and the pivot:** commercialization-funds-research must be earned openly — stated in-product, enforced by the §6 data firewall, revisited if contributors object.
6. **B2B instrument licensing** (therapists, coaches, retreat programs — or an existing dating app): unresearched; the natural path if Branch B fires; depends on F1.3 either way.
7. **Who are the two advisors?** To be secured during Step 0; the §9 fallback applies if they aren't.

---

## Appendix A: Source Notes and Verification Trail

Figures compiled July 2026. Company-reported figures are preferred; third-party estimates are marked "(est.)"; the notes below carry the verification caveats so the body stays readable.

- **Operator filings:** Match Group Q4 2025 & Q1 2026 (Tinder −4% FY2025, −5% FX-neutral; Hinge +28%/RPP $33.13/2M payers; payers 13.8M −5%); Bumble Q1 2026 (−14% revenue, −21% payers). **OkCupid:** revenue not separately disclosed; the −14% YoY figure is Match's *Evergreen brands subset* (Match/Meetic/POF/OkCupid) within an Evergreen & Emerging segment −9% (−4% ex-live-streaming), per the Q3 2024 8-K — the most recent brand-level colour available; note its age relative to this document.
- **Feeld:** $65M revenue 2024 / £9.3M pre-tax profit, company-reported via Companies House coverage; fundraising history ("minimal outside capital") not independently verified.
- **eharmony:** ~$200–300M revenue, ~750K payers — third-party estimates of a private company (ParshipMeet Group); unconfirmed.
- **Burnout:** Forbes Health/OnePoll, n=1,000, fielded Mar 27–Apr 1 2024, exhaustion "sometimes/often/always"; 40% "no meaningful connections" confirmed in accessible coverage; other driver percentages (disappointment 35%, rejection 27%, repetitive conversations 24%) are from the original article via secondary coverage and were not independently re-verified.
- **AI-in-dating:** Match/Kinsey Singles in America (Jun 2025): AI use in dating +333% YoY to 26% of singles; ~half of Gen Z have used AI in their dating lives. Measures AI-in-dating broadly, not paid-coach demand. The "$10–20/mo AI-coach clustering" in §7 is our unverified market observation (est.).
- **Keeper:** 1.5M signups, ~300K full accounts created — company-reported; $4M pre-seed closed Oct 2024, announced Dec 2025; pricing per keeper.ai/faqs.
- **Paired:** ~$2.4M/yr run-rate is a Sensor Tower-derived estimate (~$200K/mo); 2026 pricing sources conflict ($59.99 vs $77.99/yr) — re-verify in-app before pricing F1.1.
- **16personalities:** "1B+ tests" is the company's own claim ("over one billion"); revenue $15–25M/yr (est., private); premium products are one-time payments, not subscriptions.
- **RevenueCat State of Subscription Apps:** overall download→paid median ~2.0%, category medians 1.0–2.9% (public report). The widely-cited "~5-month median dating subscriber lifetime" could not be located in public report previews — verify edition/page before relying on the §7 LTV math.
- **Thursday:** 150+ cities verified June 2026; user counts unverified. **CMB:** effective pricing $15–35/mo by commitment length. **Ditto ~150K users** and the Known/222/Overtone funding roster: single-sourced to one Forbes piece (Jul 2026); Sitch's $6.7M independently corroborated.
- **PG Dating Pro (3–8% niche conversion):** dating-platform vendor marketing; directional only.
- **Pew Research (2023):** last major dating study; "ever used" is a slow-moving stock metric predating the 2025–26 contraction.
- **Codebase claims (§2):** verified against `main`, July 2026 (17 questions; 13 params; GRID_SIZE=100; `L2_`+18-char codes; 4 LLM providers; 4 serverless functions; 6,029 LOC; zero test files; no auth; no completion/share instrumentation — the §9 baseline limitation follows from this). Operational claims (payments, deployment) are gated on Step 0 verification rather than asserted.
- Known weaknesses that survived three review rounds are carried in §8 rather than resolved by assumption; the full adversarial-review audit trail is in `dating-app-pivot-PRD-debate/`.
