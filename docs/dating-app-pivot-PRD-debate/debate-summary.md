# Adversarial Review — Debate Summary

**Draft:** `docs/dating-app-pivot-PRD.md` (dating-app pivot PRD)
**Process:** 3 rounds × 3 independent critics (research advocate, narrative advocate, adversary), synthesizer revision after each round. Final revision (v4) copied over the original.
**Convergence:** not reached within the 3-round cap — but the trajectory was steep: round 1 attacked the thesis and framing (16 factual + 11 structural + 15 argument findings), round 2 attacked the gate governance (10 + 7 + 17), round 3 found mechanism bugs and calibration details (7 + 10 + 10, with the research advocate approaching clean). The document stabilized; the remaining findings were fixable at paragraph level and were fixed in v4.

## Critiques that drove the biggest changes

1. **"The GO is a rebranded NO-GO" (R1 adversary).** The original asked approval for the whole phased pivot on zero dating-specific evidence. The final document asks approval for Phase 0 only, states the dating pivot is not approvable today, and adds Step 0 (baseline audit + payment verification + fake-door intent test) *before* the approval decision.
2. **"No gate ever measures dating intent" (R1 adversary).** Created F0.8 (pre-results status capture + singles waitlist) and made intent a gate axis that virality cannot substitute for.
3. **"The precedent gap" (R1 adversary).** No quiz product has ever converted its audience into a dating pool — elevated from unstated to the document's central acknowledged risk.
4. **"Pre-committed gates that freeze after a month of data are post-registration" + "the gate arithmetic is impossible" (R2–R3 adversary/narrative).** The freeze moved to before the public push; the decision table was rebuilt as a mechanical algorithm (5 gating metrics, exhaustive branches, conservative middle-band defaults) and made arithmetically consistent, with the consistency check shown in-document.
5. **"~90% no-regret is circular and asserted" (R3 adversary).** Replaced with a derived effort split (~60/35/5) and an explicit regret case.
6. **Codebase overstatements (R1 research advocate).** Four errors about our own product ("adaptive" questions, 256×256 grid, 15-char codes, LOC) corrected; later rounds verified §2 fully clean.
7. **Factual hygiene (R1–R3 research advocate).** ~30 corrections total: misattributed Tinder decline, misdated Keeper round, misstated AI-coach stat, unverifiable TikTok stat removed, 16personalities pricing model, OkCupid segment attribution, RevenueCat figures relabeled, estimate-marking discipline enforced, and an Appendix A verification trail added.

## Known weaknesses that survived (carried in §8, not resolved)

- **No precedent for the quiz→dating conversion** — Phase 0 prices the first step only; liquidity and dating-motivated intake completion are untestable before Phase 2.
- **The gate measures channel × seed audience jointly with the product**, and the sharing and intent metrics are structurally coupled against each other (partner-compare recruits non-singles). Split-tracking makes this visible; it cannot be eliminated.
- **Governance cannot fully bind a solo founder.** The mechanism (pre-launch freeze, advisor sign-off, one bounded extension, hard stop, strict fallbacks) makes goalpost-moving visible and effortful, not impossible. The R2 adversary's point stands as an accepted limit.
- **Phase 2 may never be fundable** — the plan's own success scenario doesn't fund the build, and raise evidence is thin. The document prices this in rather than solving it.
- **The depth-demand causal story is plausible, not proven** (confounded by incumbent capital reallocation and post-hoc category construction).
- **The pass bar is ambitious** (~2,200 organic starts/week from zero); missing it is the likeliest outcome, stated in the summary.

## Verdict shift across the debate

- v1: "Qualified GO on a phased pivot."
- v4: "GO on Step 0 (days) and, if its data doesn't kill the prior, a mostly-shared-cost Phase 0 experiment with a mechanical, advisor-witnessed kill gate. The dating pivot itself: not approvable today, killable in one branch, and honest that its likeliest outcome is discovering the answer is no — cheaply."
