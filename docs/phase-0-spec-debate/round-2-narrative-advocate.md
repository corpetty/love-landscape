# Round 2 — Narrative Advocate

1. **AD-8 (Create) — the load-bearing write has no failure path.** What renders when the results POST fails (endpoint down, network error, blocker that blocks `api/results.js` anyway)? Local fallback → the write isn't load-bearing and A undercounts silently; no fallback → an outage bricks the core experience. Retry semantics, offline behavior, create-idempotency (double-tap → two rows?) unspecified. The most consequential guess in the spec.

2. **AD-8 — localStorage ownership schema undefined.** Multiple owned results per device: key names, token↔result_id↔code mapping, versioning, claim-list assembly — all invented by the builder. Server-side claim matching (hash each token → `owner_token_hash` lookup; no index declared) and where the claiming user_id comes from (JWT, presumably) unstated.

3. **AD-8 (Claim) — three undefined edge cases.** (a) Token matching a result already claimed by a different user: overwrite/skip/error? (b) Purchases carry no owner_token — claimed via result_id or session_id? Different answers claim different rows. (c) Token lost + no account: result and any paid purchase permanently orphaned; refund runbook covers generation failure only.

4. **AD-1 — `window.__SHARE__` vs. the visitor's own state unspecified.** Which App.jsx state hosts the share view? Compare-with-yours affordance (which would touch the `partner_code_load` path AD-1 promises share pages never touch)? `share_page_cta` exists in the schema but nothing defines the CTA.

5. **AD-8 — routing and request/response contracts absent.** Three POSTs + PATCH on one endpoint with no disambiguation, no body/response schemas; update's target row (result_id in body?) unstated.

6. **Founder IP-exclusion has no enforcement mechanism.** No table stores an IP; `is_dev` must be set server-side from an env/config IP list at write time (unstated) or the exclusion is unimplementable — the freeze artifact is markdown, not config `gate_metrics()` can read.

7. **Bias-statement contradiction for metric F.** F = functional numerator ÷ event denominator: blocker loss *inflates* F — the anti-conservative direction, against a ≥70% target. The frozen bias statement is wrong for F as drafted.

8. **The "Full Reading" product is never specified.** Price and plumbing exist; content (prompt/length/structure per PRD F0.4), regen triggers, and differentiation from the still-alive free readings (credits/BYO) don't. The SKU's value and UI can't be built from this.

9. **Deletion path misses `comparisons`.** No FK on `comparisons.user_id`; rows containing a *partner's* decodable code survive account deletion. No retention rule for `partner_code`.

10. **WHAT without HOW MUCH:** rate limits absent for `sync`/`fakedoor`; journey.js batch size/flush undefined; events purge scheduler unnamed (Vercel cron? pg_cron?); claim-list size unbounded; `waitlist.city` free text feeds `waitlist_by_city()` with no normalization — the per-metro I clause is squishy at gate time.

11. **Status codes disagree:** AD-1/F0.2 say 410 for dead slugs; AD-2 says 404 on the OG endpoint.

12. **F0.7/AD-7 override underspecified:** `?variant=A` "carries the dev flag" — by what mechanism? No audit of `?variant=` against App.jsx's URL rewriting (which §1 itself demands). Open question 3 defers a kill-switch decision that belongs in the spec.

13. **F0.6 tracking on static pages has no mechanism.** `dist/learn/*.html` are outside the SPA; does `build-learn.js` inject `journey.js`? Session shared via same-origin localStorage? Unstated — and it's F0.6's whole measurement basis.

14. **`api/share.js` reading `dist/index.html` needs a bundling approach** (Vercel functions don't include build artifacts by default: includeFiles config or build copy step). Day-one blocker for whoever builds AD-1.

15. **Minor:** F0.8's ">90% status" untestable as pass/fail when the screen is unskippable by construction (state the measured population and why 100% isn't the bar); "status correction" update capability has no shipped UI (spec it or cut it); no migration rollback notes (the F0.0 webhook rewrite touches a live payment path).

Items 1–6 must be resolved before this is buildable without questions; the architecture decisions and metric derivations are otherwise unusually rigorous.
