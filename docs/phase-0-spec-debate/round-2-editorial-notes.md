# Round 2 — Editorial Notes (spec)

Abbreviations: RA = Research Advocate, NA = Narrative Advocate, AD = Adversary.

## Addressed — design changes

1. **AD#1/#2 + NA#1 — the load-bearing dilemma resolved by choosing a horn.** The results screen always renders locally; the create write is *required-for-features, not required-for-render*, with a client idempotency key (`client_result_id`, fixing AD#3), exponential backoff, a durable localStorage retry queue, and create-on-demand from any server feature. A = eager writes + feature-touchers; loss is undercount-only. Rate limits made CGNAT-safe (per-IP raised to 2,000/day; rejections degrade to the queue, never a broken screen) with a rejection-monitoring panel + alert (AD#2's "you won't even know" fixed).
2. **AD#4 — create/refine interaction specified:** one create, fired when final params settle (post-refine/skip/error), carrying the code the user actually sees. §1 now documents the two-stage flow.
3. **AD#5 + NA#15 — status is write-once at create;** the "status correction" capability is cut.
4. **AD#6 — gate metrics moved to an append-only `milestones` table** written transactionally by the functional endpoints; immune to publish-toggling and deletion churn; C explicitly counts actions (publish/compare) with D as the reach cross-check; deletion re-keys person_key to a salted hash (privacy-page disclosure added).
5. **AD#7 — identities table dropped.** Person rule = user_id-if-known-else-session_id at milestone-write time; claim re-keys the claimed sessions' milestones. The two residual biases (second device never logged in; shared device merging partners) are named in AD-4 and the freeze artifact instead of being "solved" wrongly.
6. **AD#10 + NA#2/#3 — claim redesigned:** JWT mandatory (user_id never from the body); per-result checkbox UI (shared-phone partner results visible and excludable); already-claimed rows skipped and reported; owner_token invalidated at claim (bearer window ends); purchases claimed via claimed result_ids only; lost-token purchase recovery via Stripe receipt → runbook. localStorage ownership schema defined (`ll-results-v1`); claim list ≤20; `owner_token_hash` indexed.
7. **AD#11 + RA#5 — OG design rebuilt:** no per-feature labels (param-dependent positions make static labels a collision generator); contour art + wordmark + fixed tagline; one bundled OFL font via `fontBuffers` (serverless has no system fonts); resvg-js correctly framed as a napi native binary with the wasm package as fallback; tracer verification is F0.3's first spike.
8. **AD#12 + NA#4 — `sharedView` specified:** dedicated screen; owner code/params state untouched; App.jsx persistence and URL-rewrite effects gated to owner screens (regression-tested); CTA defined (= `share_page_cta`); compare-with-mine tagged `source='share'`. Refactor hours added to F0.3.
9. **AD#13 + RA#4 — email arithmetic fixed:** Resend paid ($20/mo) from push; Supabase template customized to `{{ .Token }}` (RA#3); 60s-cooldown UX; abandoned-auth purge cron; `otp_sent`/`otp_verified` diagnostics so abandonment is visible rather than a silent H/E depressant.
10. **AD#14 — schedule re-derived:** F0.0 split across 3 weeks at 30–38h; F0.3 raised for the refactor + font iteration; freeze moved to week 10 / push week 11 as the *stated plan*; pre-push 121–161h over 10 weeks (12–16 h/wk) labeled top-of-envelope with the slip-to-week-13 plan explicit.
11. **AD#15 — compliance fixes:** metric-C compares store only `partner_code_hash`; saved comparisons are owned user content (deletable, 24-month retention, disclosed); `reading_text` nulled on account deletion (plus session_id); WA My Health My Data diligence budgeted pre-push with a named output doc; "US-first ≠ US-uniform" reflected.
12. **AD#9 — anomaly pass made honest:** the code-distribution check is conditional on shipping the reference-distribution script pre-freeze, else dropped from the §9 evaluation description.

## Addressed — corrections and contracts

13. **RA#1 — pair compatibility report restored** to the Full Reading (PRD F0.4 scope), generated when a saved comparison is attached; product content spec added (NA#8).
14. **RA#2 — metric-A persons-vs-completions declared** (deviation 1); AD-4/§5 contradiction on B removed (B is milestone-sourced).
15. **RA#3 — OTP declared** as deviation 2 with rationale. **RA#6 + NA#14 — `includeFiles` + rewrite query-param plumbing specified.** **RA#7 — deviation 1 relabeled** as a schedule note (the PRD fixes no push week).
16. **NA#5 — op-based API contract** with bodies/responses sketched for create/update/claim/compare.
17. **NA#6 — dev exclusion now implementable:** `X-LL-Dev: DEV_SECRET` header or `DEV_IPS` env → `is_dev` at write time; values recorded in the freeze artifact.
18. **NA#7/AD#8 — F's bias direction corrected** in AD-4, §5, and the frozen bias statement (inflated under blockers; read with the shakedown block-rate estimate).
19. **NA#9 — comparisons deletion/retention fixed** (user_id FK CASCADE, 24-month purge, owner-deletable).
20. **NA#10 — numbers filled in:** sync 120/day/session, fakedoor 10/day/IP, journey flush (10 events/5s/hide), purge scheduler = Vercel cron, claim ≤20, city normalization = reviewed mapping at gate (human step, documented).
21. **NA#11 — status code unified at 410** for share and og. **NA#12 — `?variant=` audit performed:** consumed and stripped by journey.js before App.jsx mount effects; auto-dev-flags; production behavior decided. **NA#13 — learn-page tracking mechanism specified** (inline snippet, no journey.js import). **NA#15 — F0.8 acceptance restated** (≥99% non-null over non-dev shakedown creates); webhook rewrite behind `WEBHOOK_V2` for rollback; migrations additive-only.

## Rejected

1. **AD#6's fullest reading — that C must measure proven reach.** Rejected: C's PRD definition is a share-or-compare *rate of user behavior*; requiring visitor evidence would make C depend on recipients' devices and blockers. The freeze artifact states C counts actions; D is the reach check. (The "exact" overclaim was dropped as demanded.)
2. **AD#7's implicit alternative — fingerprinting to fix the two-device/shared-device biases.** Rejected on the product's privacy posture; biases are quantified in direction, disclosed, and small at Phase 0 scale.
3. **NA#15's suggestion to spec a status-correction UI.** Moot — the capability was cut for bias reasons (AD#5), which dominates.
4. **AD#13's implicit push toward SMS OTP or OAuth-first.** Rejected for Phase 0: SMS adds cost/PII; OAuth adds consent-screen scope creep; paid email + template fix covers the failure mode identified. OAuth remains the trigger-on-data option per AD-3.

## Conflicts resolved

1. **AD wants A immune to blockers (server truth); AD also wants zero availability coupling.** Resolved by decoupling render from write and accepting a measured, conservative undercount, bounded by the retry queue — server truth for what's counted, local truth for what's seen.
2. **NA wants exhaustive interface contracts; the builder is the author.** Resolved at the op/body/response sketch level (enough for a contractor), stopping short of full JSON-schema (over-spec for a solo repo).
3. **AD#15 (partner-code consent) vs. the saved-comparisons feature the PRD requires.** Resolved by splitting: metric writes take hashes only; content storage is owned, disclosed, deletable, and time-bounded.
