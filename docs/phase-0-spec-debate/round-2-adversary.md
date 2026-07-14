# Round 2 — Adversary

1. **The load-bearing results POST is impaled on an unresolved dilemma.** If the failure path is "render locally anyway" (the product is fully client-computable today), the write isn't load-bearing and blocker undercount returns, voiding AD-4's rationale. If there's no fallback, an outage/500/rate-limit blocks a user from seeing a result their own browser computed. The spec claims both properties; pick a horn and write it down.

2. **Per-IP rate limiting breaks the product at exactly the viral moment.** 100/day/IP + load-bearing write: CGNAT (mobile carriers, campuses) puts thousands of users behind one IP; one good day on one platform → legitimate completions rejected, broken results screens, A undercounted, growth-axis false KILL manufactured by your own anti-fraud layer. No rate-limit-rejection monitoring exists.

3. **Create is not idempotent.** No client idempotency key; timeout-retry yields two rows with two tokens, client keeps one, orphaning the other — mattering the moment publish/purchase targets the orphan. One `client_result_id` UUID fixes it; the spec lectures about webhook idempotency and omits it on its own new write.

4. **The create/refine interaction is undesigned.** `handleAssessmentComplete` (App.jsx:106–140) produces two codes when LLM refinement runs (base immediately, adjusted after async, or skip/error). Does create fire with the base code, the adjusted code (after a 30s LLM call), or twice? The spec never mentions the refining flow.

5. **Status "correction" via PATCH un-fixes what F0.8 exists to fix.** Editing status after seeing results and the waitlist pitch reopens the post-flattery bias channel the pre-results ordering was designed to close; gate SQL reads the corrected value with no record.

6. **"Functional metrics are exact" is false under state churn.** `is_public` and surviving rows are current state, not events: publish-then-unpublish vanishes from C; deletes remove rows from A/C/E/H/I retroactively; deleters aren't a random sample. And C's public component measures "clicked publish," not "shared" — no evidence anyone visited. Log immutable milestones or stop calling these exact.

7. **The identities table doesn't solve its own hard case and is redundant otherwise.** No login on device A → no identities row → same human counts twice; `coalesce(results.user_id, results.session_id)` achieves the same resolution without a new table. Worse: on a shared device (the product's flagship partner-compare scenario), the identities row binds the device session to whichever partner verified last — merging two humans into one person and misattributing status rows.

8. **Bias-direction claim wrong for F** (functional numerator ÷ blocked-event denominator = inflated, anti-conservative, against a ≥70% target). The frozen bias statement as written is false for F.

9. **"Valid decodable code" is ~zero-entropy validation** — every random 18-char base64 payload decodes. Fine as a concession, but the anomaly pass leans on "code-entropy distribution," which requires a reference distribution of real paramCompute outputs nobody has committed to computing before freeze. Budget it or drop it.

10. **Claim op: authorization unstated; token theft = permanent transfer of psychological data.** Claim must require a verified JWT (say it). Tokens live indefinitely in localStorage; on a shared phone, partner B's signup sweeps ALL stored tokens — partner A's result, status, and purchased reading permanently attach to B's account. No expiry, no dispute path, no pre-first-login sanity check. For a bearer credential guarding intimate data, disclosure is not mitigation.

11. **api/og.js: no fonts in serverless, and the label design is a collision generator.** SVG text renders only with bundled font files (fontBuffers) — never mentioned. §11 frets about wasm init but resvg-js is a native napi binary (~9MB, needs correct linux-x64 tracing). FEATURE_LABELS are fixed positions while actual features move with params (cx: 0.62−P7·0.04; "Tender middle" flips ridge/valley by P2); several labels sit within 0.05–0.1 of each other; the field is square, the canvas 1.9:1. (fieldGenerator itself is clean server-side — verified.)

12. **AD-1's share view collides with App.jsx's existing behavior.** Rendering a shared landscape through the normal results path (a) clobbers the visitor's own saved result via the localStorage effect (lines 75–81), and (b) rewrites the URL to append `?code=` (lines 84–96) — re-shared, that bypasses the share page and pollutes attribution. No F0.3 line item covers the owner-view/shared-view refactor (hide publish controls, suppress persistence and URL rewrite) in a 227-line switch-statement app with no tests.

13. **OTP email ceilings bind at pass-bar traffic.** Postmark free = 100/mo; Resend free = 100/day — OTPs silently stop arriving on spike days from a cold domain, depressing E and H (gate metrics) in a way anomaly review reads as "low intent." Supabase's own throttles (60s resend cooldown, verify limits) sit at the funnel's most fragile point; `signInWithOtp` creates users on send — abandoned inline waitlist verifications litter auth.users and every one is a lost H data point with no diagnostic.

14. **Schedule arithmetic works only by excluding pre-push items it schedules pre-push.** Add the pre-push slack share and week-6–8 content writing: ~117–153h over 8 weeks = 14.6–19 h/wk — above the ceiling at midpoint, before the refine-flow work (#4), share-view refactor (#12), or font/design iteration (#11). F0.0 packs seven deliverables into 22–28h in a codebase with zero tests. The honest sentence is "pre-push exceeds the envelope unless slack goes unused"; the slip plan should be the stated plan.

15. **Compliance: `comparisons.partner_code` stores a third party's full psychometric profile indefinitely** — no notice, no consent, no deletion path (unfindable by design), no retention rule. Account deletion "anonymizes purchases" but retains `reading_text` (an AI psychological reading) keyed to a surviving session_id joinable to 12 months of events — a re-identification vector, arguably not deletion. "No consent banner under US rules" ignores state health-data statutes (WA My Health My Data reaches mental-health inferences and non-residents). Cheap fixes; claim the posture only after making them.

v2's fixes genuinely hold elsewhere (fieldGenerator portability, slug/token entropy, Postgres counters, freeze-relative clock). Blocking items: 1–2 (the write's dual personality), 4 (refine flow), 7+10 (identities/claim on shared devices).
