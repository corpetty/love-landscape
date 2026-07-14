# Round 1 — Research Advocate

Verification complete — codebase audited, ten load-bearing market figures spot-checked via web.

1. **Section 2, Assessment row — "17 adaptive questions" is contradicted by the code.** `src/data/questions.js` is a fixed, linear array of 17 questions; `src/components/AssessmentScreen.jsx` advances strictly sequentially (`next()`), with no branching or adaptivity. The draft itself concedes this in F0.7, which calls the current format "front-loaded 17" that progressive assessment would fix — an internal contradiction. The LLM "parameter refinement" is post-hoc adjustment, not adaptive questioning. Change to "17 fixed questions."

2. **Section 2, Visualization row — "256×256 field" is false.** `src/terrain/constants.js` line 3: `export const GRID_SIZE = 100;` — the field is 100×100. ("Gaussian basis functions" is confirmed by `fieldGenerator.js`.)

3. **Section 2, Sharing row — "~15-char base64 codes" is wrong.** `src/data/encoding.js` encodes 13 bytes → 18 base64 chars plus a 3-char `L2_` version prefix ≈ 21 characters.

4. **Section 2, Infra row — "~5.6K LOC" is understated.** `wc -l` over all JS/JSX in `src/` + `api/` gives 6,029 lines on current `main`. State the measurement basis or update the number.

5. **Section 3.1 — Tinder's "−5.2%" decline is misattributed to Match's Q4 2025 press release.** Match's company-reported figure is FY2025 Tinder direct revenue **−4%** (−5% FX-neutral) to $1.9B. The −5.2% figure is Business of Apps' third-party estimate. Violates Appendix A's stated methodology ("company-reported numbers are used where available").

6. **Comp table (Keeper) and Risks table — "$4M raised Dec 2025" misdates the round.** Keeper's $4M pre-seed closed October 2024, announced December 2025. The Risks-table inference ("relationship science framing still funds" in the current cold market) rests on the announcement date, not when capital committed. Weaken or re-date.

7. **F1.2 — "AI coach usage grew 333% in a year; ~half of Gen Z singles use one" misstates the underlying stat twice.** Source (Match/Kinsey Singles in America, June 2025): AI use in dating **generally** grew 333%, reaching 26% of singles; nearly half of Gen Z singles have **ever used AI in their dating lives** — not that half use an AI coach. Inflates demand evidence for the paid AI-guide SKU.

8. **Section 3.2 — Forbes Health stat presented without material context; one driver misnamed.** 78%/79% figures check out but come from a 1,000-person OnePoll survey fielded March 27–April 1, 2024 measuring exhaustion "sometimes, often, or always" — draft dates it "Jul 2025" (article update date). §3.2 lists "repetitive swiping" as a driver; the survey item is **repetitive conversations (24%)** — which F2.3 cites correctly (internal inconsistency).

9. **Section 3.3 — "#AnxiousAttachment >300M TikTok views" is uncited and effectively unverifiable** (TikTok no longer displays hashtag view counts). One of two legs of the white-space argument; needs a dated source or removal. (The Attachment Project 44,435-user study verifies.)

10. **Feeld "founder-owned on ~$500K total raised" is uncited and unmarked as an estimate.** Revenue/profit verify ($65.2M/£48.9M, +26%, £9.3M pre-tax). The fundraising-history claim did not surface in spot-checks.

11. **Keeper "$50K bounty, $5K/date" pricing is uncited** in the draft (funding coverage describes the success-fee model but not these figures). The 300K-deep-intake claim verifies.

12. **Hedged figures concealing unverifiable claims:** eharmony "~$200–300M (est.)" / "~750K payers (est.)" have no named source; Metrics section's "69–77% renewal" has no source; "Birdy: 60% female" uncited; "Pew data shows 'ever used' adoption is stable" cites no report/year (Pew's last major dating study predates the 2025–26 window — extrapolation presented as current data).

13. **Section 7 — "~27 points of margin on iOS" is a muddled figure.** The store cut is 15–30%. "27" appears to derive from Apple's 27% external-payment fee — precisely the fee web checkout would NOT escape if Apple prevails; under the current injunction the preserved margin is up to 30 points. (SCOTUS cert June 30, 2026 verifies; Match's guided savings are ~$110M so "~$100M/yr" is acceptable.)

14. **Executive Summary — "died on the same rock: matching liquidity" asserts an unsourced cause of death.** So Syncd shut down (May 2024) framed by founders as a business pivot to content/personality testing. The liquidity diagnosis is interpretation presented as fact, and it is the premise of the entire phased strategy.

15. **Section 3.2 — the 2026 funding roster (Known, 222, Ditto, Overtone) rests on a single Forbes article**; only Sitch independently corroborated. Flag as single-sourced.

16. **Executive Summary — "working LLM backend... Stripe credit purchases" states operational strength the repo alone cannot confirm.** Code is complete and coherent but depends on unverifiable env/deployment state, and the repo has zero tests. "Implemented; deployed state unverified" is the honest strength.

**Verified accurate:** 13 parameters; 4 LLM providers (managed OpenRouter default); 4 Vercel functions; Supabase schema supports Open Question 4; mobile responsiveness; the "Missing for dating" list; Hinge Q1 2026 +28% revenue/+15% payers/RPP $33.13 vs Tinder $17.56; Bumble −14.1%/−21.1% and sale exploration; Business of Apps $6.07B first decline; Paired $59.99/yr and ~$2.4M/yr run-rate; 16personalities 1.5B tests/$32.99/<20 staff; RevenueCat 5-month median dating-subscriber lifetime (§7 arithmetic internally consistent); Phase 2 illustration math checks against its own assumptions.

**Bottom line:** the market thesis largely survives verification. Integrity problems cluster in (a) Section 2's four overstatements about the product itself, and (b) misattributed third-party estimates and unmarked estimates contradicting Appendix A's stated discipline. None, corrected, reverses the recommendation's evidentiary basis.
