# Round 1 — Editorial Notes (spec)

Abbreviations: RA = Research Advocate, NA = Narrative Advocate, AD = Adversary.

## Addressed — design reversals (the round's big wins)

1. **AD#1/#2 — share-page architecture rebuilt.** Meta-refresh redirect replaced with SPA-shell injection (`window.__SHARE__` bootstrap, no query params, no redirect). Kills the `from=share` stripping risk (App.jsx URL rewriting), the metric-C contamination (share loads never touch the `?code=` path), and the Google canonicalization problem. Metric D moves fully client-side (JS execution = crawler filter), resolving AD#6's unspecifiable server-pixel filtering and NA#4's NOT NULL conflict in one move.
2. **AD#9 + RA#8 — OG images reversed to server-rendered 2D composites** (`api/og.js`, marching-squares over the shared fieldGenerator math, resvg-js). v1's client capture was missing the DOM-rendered labels, blurry from mobile, and required an anonymous-upload abuse surface. This also resolves the PRD deviation (PRD said server-rendered all along) and simplifies unpublish semantics. Residual risk (resvg cold start) is Open Question 1 with a fallback that preserves determinism.
3. **AD#7 + RA#6 — auth switched from magic link to email OTP**, keeping the flow in the browser that owns localStorage; custom SMTP promoted from open question to hard F0.1 prerequisite with deliverability acceptance criteria and budget.
4. **AD#4/#5 — gate metrics moved off blockable/spoofable events onto functional writes.** A/C/E/H/I now derive from `results`/`comparisons`/`profiles`/`waitlist` server writes (validated, rate-limited via Postgres counters, dev-traffic-excluded); events remain for diagnostics with the bias direction (undercount-only = conservative) stated in the freeze artifact; endpoint/module names avoid EasyPrivacy patterns; shakedown measures residual block rate. The honest limit (deliberate fraud through rate limits) is stated with the anomaly-review mitigation.

## Addressed — gaps filled

5. **NA#1 + AD#10 — the anonymous data plane exists now:** AD-8 (`api/results.js`: create/update/claim/compare) with bearer owner-tokens (hashed at rest), publish-without-account defined, slug generation canonicalized (base58/10/crypto/collision-retry — fixes NA#8's drift).
6. **NA#2 + AD#3 — identity stitching specified:** `identities` table written at every OTP verification; persons-resolution rule stated and used by all gate metrics; purchases claimed alongside results at signup.
7. **RA#1 + AD#8 — webhook idempotency scheduled where it's tested:** `stripe_events` dedup lands in F0.0 (also fixing the live credits double-grant bug); Stripe live-mode config added to S0.1.
8. **RA#2 + NA#3 — Step 0 decoupled:** standalone `api/fakedoor.js` + `001b_step0.sql` (with `fakedoor_signups` DDL, fixing the undefined table); no dependency on Phase 0 instrumentation; email lives in its own table (AD-4's no-PII rule intact).
9. **RA#3 — false refactor claim removed:** paramCompute already handles partial answers; F0.7 keeps tests only.
10. **RA#5 + AD#12 — admin boundary designed:** AD-9 (`api/admin.js`, `ADMIN_TOKEN` bearer, constant-time compare); new RPCs service-role only; `waitlist_by_city` never anon; the legacy `sha256("password")` gate named as cosmetic in §1.
11. **AD#11 — unpublish honesty:** consent copy now states platform preview caching, 24h CDN staleness, and that shared codes decode forever; §4 F0.3 quotes the copy.
12. **AD#13 — XSS:** share/og emit no user text (labels schema-documented as private); escaping mandated regardless.
13. **AD#14 + NA#6 — schedule rebuilt:** freeze end of week 8 (after the full gating funnel ships), push week 9 — declared as PRD deviation 1 with rationale; F0.8 moved before the SKU and A/B work; F0.6 horizon unified (5 pages at push, 13 by week 12 — deviation 2; RA#4's contradiction resolved); the push-timing trade (clock burn vs. funnel completeness) is now explicit.
14. **AD#15 — honest hours:** total re-derived at ~172–219h; pre-push critical path 12–16 h/wk labeled "top of the envelope, stated not hidden," with the slip rule (freeze slips, clock is freeze-relative). Previously-missing items budgeted: SMTP, webhook rewrite, admin endpoint, deletion + privacy page, results API.
15. **AD#16 — compliance:** Vercel Pro $20 required (ToS), Supabase Pro $25, costed; events retention 12 months + purge; US-first analytics posture stated with the EU-consent-gate constraint recorded rather than solved silently.
16. **RA#7 — metric I denominator fixed to completers** (per PRD); status-missing rows count in the denominator.
17. **NA#7/#9/#10/#11 — error paths specified:** share 410 page; reading auth (JWT or owner_token), retriable generation, 48h refund runbook, `charge.refunded` consumed; waitlist UPSERT semantics + `ON DELETE SET NULL`; account deletion endpoint + purchases anonymization.
18. **NA#12 — env inventory added (§10).** **NA#13 — frontend integration points named** (AuthPanel modal over results; My Landscapes off results; status probe as its own screen; publish dialog in ResultsScreen). **NA#14 — FNV-1a, variant 0=control, kill switch specified.**

## Rejected

1. **AD#14's implicit suggestion to weigh pushing even later (full funnel incl. SKU/A-B live).** Rejected: G and F are diagnostics; delaying the push past week 9 burns calendar without protecting any gating metric. The week-8 freeze already guarantees every *gating* surface is live at push.
2. **AD#4's fullest reading — treat bot inflation of A as unsolved.** Partially rejected: beyond validated writes + rate limits + dev exclusion + anomaly review, further hardening (Turnstile, fingerprinting) contradicts the product's privacy posture and adds friction to the exact funnel being measured. Accepted residual risk, stated in §5's bias statement and visible to advisors as raw daily series.
3. **NA#13's fullest version — specify every App.jsx state transition.** Rejected as over-specification: component entry points and their host screens are named; exact state-machine wiring is implementation detail the builder (the founder) can own without a spec amendment.

## Conflicts resolved

1. **AD wants maximal anti-fraud on metrics; the product's privacy posture forbids fingerprinting.** Resolved by moving gate metrics to validated functional writes (raises the fraud cost above curl), accepting the residual openly, and giving advisors the raw series — integrity through auditability rather than surveillance.
2. **RA#6/AD#7 (SMTP mandatory) vs. the hours envelope.** Resolved by budgeting F0.1 at 20–28h with deliverability as the named cost, and extending the pre-push window to 8 weeks (freeze moved) rather than pretending auth is cheap.
