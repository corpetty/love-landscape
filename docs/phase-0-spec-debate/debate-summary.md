# Adversarial Review — Debate Summary (Phase 0 Implementation Spec)

**Draft:** `docs/phase-0-spec.md` (Phase 0 implementation spec, child of `docs/dating-app-pivot-PRD.md` v4)
**Process:** 3 rounds × 3 independent critics (research advocate with codebase+PRD+web ground truth, narrative advocate judging buildability, adversary doing hostile design review), synthesizer revision after each round. Final (v4) copied over `docs/phase-0-spec.md`.
**Convergence:** cap reached without a formal all-clear, but each round moved down a level of abstraction — round 1 reversed architectures, round 2 redesigned the data plane, round 3 found implementation-order bugs with one-to-three-sentence fixes, all applied in v4. The round-3 adversary's own assessment: the machinery "genuinely closes the v1/v2 holes it targets."

## Architecture reversals forced by the debate

1. **Share pages (round 1):** v1's meta-refresh redirect shell was solving a problem crawlers don't have while breaking attribution for humans (App.jsx rewrites URL params) and contaminating gate metric C through the `?code=` path. Final: SPA shell served with injected OG tags, one-shot `window.__SHARE__`, dedicated `sharedView` screen, CTA pathname reset.
2. **OG images (round 1):** v1's client canvas capture would have shipped label-less (labels are DOM overlays), blurry from mobile, with an anonymous-upload abuse surface. Final: server-rendered contour art via resvg (native binding, bundled font), no per-feature labels (they're param-dependent — static placement is a collision generator).
3. **Auth (round 1):** magic links break on mobile (different browser = orphaned localStorage = dead migration). Final: 6-digit email OTP (declared PRD deviation), paid Resend from day one (free tiers fail launch-spike arithmetic), Turnstile on auth endpoints only.
4. **Metric sourcing (rounds 1–3):** client analytics events are blockable (the audience is exactly the ad-blocker demographic) and spoofable. Final: gate metrics derive from an append-only `milestones` table written by functional endpoints, windowed on client-true `happened_at` bounded by server receipt, with a `claims` link table resolving persons at read time — replacing v3's re-key UPDATE, which round 3 showed raced queue flushes and swept shared-device partners' data.

## Gate-integrity bugs caught before they could freeze

- Metric C self-inflation via the share redirect (round 1) — would have been frozen into the gate SQL with no legal fix post-freeze.
- H inflatable in the PASS direction via status-less on-demand creates (round 3) — the one bias direction the whole plan promises never to have; closed by making the retry queue carry the full create payload and server-rejecting waitlist joins without a prior create.
- E structurally uncomputable for inline-OTP users (round 3) — fixed by implicit single-result claims.
- Shakedown data leaking past freeze via flush-time timestamps (round 3) — fixed by `happened_at`.
- CGNAT rate limits breaking real users at the viral moment (round 2) — per-IP limit raised 20×, rejections degrade to a retry queue, rejection monitoring added.

## Factual corrections (research advocate, cumulative)

Webhook idempotency doesn't exist where v1 tested it (and the live credits path double-grants — now fixed in F0.0 behind a flag); paramCompute already handles partial answers (v1 budgeted a phantom refactor); the "admin-only" RPC boundary didn't exist (dashboard gate is sha256("password") client-side); Supabase's built-in email is ~2/hour (SMTP is a prerequisite, not an option); Postmark free tier is 100/month (disqualified); resvg-js is a native binding, not wasm; `dist/index.html` needs `includeFiles`; the PRD's pair-compatibility report had silently vanished from the SKU (restored); Supabase OTP requires `{{ .Token }}` template customization; four undeclared PRD deviations were found and declared (metric-A persons, OTP auth, F0.6 dates, F0.8 denominator).

## Known risks carried openly (not resolved)

- Residual identity biases: a never-logged-in second device double-counts; a shared device with no signups merges two humans. Quantified in direction, disclosed in the freeze artifact, not fingerprint-solvable within the privacy posture.
- Deliberate fraud can pass the rate limits with valid-format codes; mitigated by velocity + IP-concentration review and raw daily series to advisors (the code-distribution check was cut as unbudgeted rather than left as theater).
- Metric F is inflated under ad blockers (functional numerator ÷ event denominator) — flagged in the frozen bias statement, read against the shakedown block-rate estimate.
- The pre-push path (~139–182h over 11 weeks ≈ 13–17 h/wk) exceeds the PRD's 10–15 h/wk envelope at midpoint; the stated plan is that freeze slips to week 12–13 at realistic pace (legal under the PRD's freeze-relative clock).
- WA My Health My Data applicability is unresolved; the spec carries a stop-the-line rule (positive finding delays freeze/push and forces a documented decision) rather than a 3-hour hand-wave.
- resvg-on-Vercel bundling and Turnstile's effect on inline-waitlist conversion are open questions with named fallbacks (§11).
