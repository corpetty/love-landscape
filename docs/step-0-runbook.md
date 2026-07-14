# Step 0 Runbook

Parent: [phase-0-spec.md](./phase-0-spec.md) §4 S0. Everything here is standalone — no Phase 0 code involved. Output artifacts: this runbook completed with results, plus `docs/step-0-baseline.md`.

## S0.0 — Deploy the Step 0 code (once)

1. Apply the migration in the Supabase SQL editor: `supabase/migrations/001b_step0.sql` (creates `fakedoor_signups`, `rate_counters`, `rate_limit_hit()`, `get_fakedoor_summary()`).
2. Deploy `main` to Vercel (picks up `api/fakedoor.js`, `public/meet.html`, the `vercel.json` entry).
3. Smoke-check: `curl -s -X POST https://<domain>/api/fakedoor -H 'Content-Type: application/json' -d '{"email":"step0-test@example.com","city":"Testville"}'` → `{"ok":true}`; repeat → still `{"ok":true}` (idempotent). Then delete the test row:
   `DELETE FROM fakedoor_signups WHERE email = 'step0-test@example.com';`
4. Visit `https://<domain>/meet.html` on phone + desktop; submit once with a real email; confirm the row lands.

## S0.1 — Stripe verification (end-to-end, both modes)

**Inventory first.** In Vercel → Project → Settings → Environment Variables, record (names only, not values) which of these are actually set, and note it below: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_CREDITS_PER_PACK`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `VITE_PUBLIC_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FREE_CREDITS`, `MANAGED_MODEL_FAST`, `MANAGED_MODEL_QUALITY`.

**Test mode:**
1. Switch the Vercel env `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_ID` to test-mode values on a preview deployment (or use the Stripe CLI: `stripe listen --forward-to https://<preview>/api/webhook`).
2. In the app: Settings → managed provider → buy credits → complete checkout with card `4242 4242 4242 4242`.
3. Verify: Stripe dashboard shows the session; `reading_sessions.credits_purchased` incremented for your `session_id` (localStorage `love-landscape-session-id`); the credits display updates after refresh.
4. **Known bug to observe, not fix here:** re-sending the same webhook event (Stripe dashboard → webhook → resend) double-grants credits. Confirm it, note it, leave it — the idempotency fix is F0.0's first task and this observation is its regression baseline.

**Live mode:**
1. In live Stripe: create a 100%-off promotion code, or a temporary $1 price on the credits product.
2. Complete one real checkout on production; verify webhook delivery (Stripe dashboard → webhooks → recent deliveries → 200) and the credits grant.
3. Refund the charge (Stripe dashboard). Note: the app has no refund handling yet (F0.4 adds it) — the credits will remain granted; that's expected and fine at this scale.
4. Record results below.

**Results (fill in):**
- Env vars present: ☐ all / x missing: FREE_CREDITS
- Test-mode e2e: ☐ pass / notes: ______
- Double-delivery double-grants (expected bug): ☐ confirmed
- Live $1 transaction + webhook 200 + grant: ☐ pass, charge id: ______, refunded: ☐

## S0.2 — Baseline report → `docs/step-0-baseline.md`

Run in the Supabase SQL editor (or via the anon RPCs — first two are anon-callable):

```sql
SELECT get_submission_count();                                  -- total opt-in research submissions
SELECT * FROM get_demographic_breakdown('relationship_structure'); -- incl. 'single-exploring'
SELECT * FROM get_demographic_breakdown('age_range');
SELECT date_trunc('week', created_at) AS wk, count(*)           -- submission cadence over time
FROM submissions GROUP BY 1 ORDER BY 1;
SELECT count(*) AS credit_sessions,                              -- anonymous session activity
       count(*) FILTER (WHERE readings_used > 0) AS used_a_reading,
       count(*) FILTER (WHERE credits_purchased > 0) AS ever_purchased
FROM reading_sessions;
```

Plus: blog/newsletter audience size (subscriber count, monthly readers of the Geometry of Intimacy post — from the blog's own analytics).

Write `docs/step-0-baseline.md` with: the numbers, the date pulled, and the mandatory caveat (PRD §2): **opt-in research submissions are a self-selected lower bound, and the `single-exploring` fraction is a post-results research-volunteer proxy — directional only, not calibration-grade for the F0.8 intent thresholds.**

## S0.3 — Fake-door promotion

1. One blog/newsletter post linking `https://<domain>/meet.html`. Framing matches the page: exploring, nothing exists, signal wanted. (This send also begins warming the email domain for Phase 0's OTP mail.)
2. After ~2 weeks, snapshot: `SELECT * FROM get_fakedoor_summary();` and `SELECT city, count(*) FROM fakedoor_signups GROUP BY 1 ORDER BY 2 DESC;` → append to `docs/step-0-baseline.md`.
3. Interpretation guide (PRD §6.0): this measures *seed-audience* stated intent only. Near-zero (< a handful from a real send) → sharply lower the prior on F0.8 and reconsider before building; meaningful uptake → proceed, calibrate nothing from it beyond direction.

## S0.4 — Advisors

Two named outside advisors, secured **before threshold freeze** (PRD §9: fallback if unsecured = printed thresholds stand, ambiguities resolve to FAIL). They receive: the PRD, the Phase 0 spec, the freeze artifact when it exists, and deviation memos. Ask: one hour at freeze, one at gate, willingness to be named in `docs/phase-0-gate.md`.

- Advisor 1: ______ (asked ☐ agreed ☐)
- Advisor 2: ______ (asked ☐ agreed ☐)

## Exit: the Step 1 decision

Per the PRD's decision block: within two weeks of completing the above, write the go/no-go memo for Phase 0 (share with the advisors). Inputs: S0.1 results (payments actually work), S0.2 baseline, S0.3 fake-door signal, advisor availability.
