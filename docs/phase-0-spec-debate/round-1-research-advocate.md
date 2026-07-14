# Round 1 — Research Advocate

1. **§6/§4 F0.0 — webhook idempotency doesn't exist and isn't scheduled where it's tested.** `api/webhook.js` (lines 99–119) has no dedup — redelivered `checkout.session.completed` double-grants credits. The `purchases` unique constraint arrives weeks 7–9 but the idempotency test is specified for weeks 1–2. Schedule idempotency work in F0.0 or move the test. (Signature verification claim is accurate: HMAC with `timingSafeEqual` on raw body.)

2. **§4 S0.3 — the week-0 fake-door depends on weeks-1–2 infrastructure** (`api/track.js`, `fakedoor_signups` in `002_phase0.sql`). Contradicts the PRD's fake-door-before-any-build framing and the spec's own "precedes approval" header.

3. **§4 F0.7 — false claim about existing code.** `paramCompute.js` line 7 (`answers[id] ?? 0.5`) already accepts partial answer maps. No refactor required; only tests. Pads the estimate.

4. **§4 F0.6 — acceptance contradicts the PRD and itself.** PRD: "pages live by week 8." Spec: "first batch week 8, all 13 by week 12" but the §7 table says weeks 8–16. Unflagged deviation + two internal horizons.

5. **§2 AD-4/§3 — "admin-only" RPCs lean on an admin boundary that doesn't exist.** `AdminDashboard.jsx` lines 6–7: client-side SHA-256 gate, hash of the literal password "password", in the public bundle; existing RPCs are `GRANT ... TO anon`. New gate-metric RPCs have no enforcement path as described.

6. **§10 Q3 — magic-link email is a hard prerequisite, not an open question.** Supabase's built-in sender is capped ~2 auth emails/hour and explicitly not for production ([auth-smtp docs](https://supabase.com/docs/guides/auth/auth-smtp), [prod checklist](https://supabase.com/docs/guides/deployment/going-into-prod)). F0.1's acceptance is unmeetable without custom SMTP.

7. **§5 metric I denominator deviates from the PRD** ("singles fraction of completers" vs. spec's ÷ `status_captured`): status-screen leakage biases the singles fraction upward. Use completers as denominator or state the deviation.

8. **§4 F0.3 — silent PRD deviation.** PRD F0.3 says "server-rendered OG terrain image"; AD-2 chooses client capture without acknowledging the override.

Verified clean: App.jsx flow, encoding format (21-char L2), 17 questions, schema.sql matches §1, personas.js has 8 full answer maps, `@supabase/supabase-js` present, chat.js quality path, checkout metadata pattern + CORS `*` claim, renderer created *without* `preserveDrawingBuffer` (spec correctly flags it), §5 mapping otherwise matches PRD §9, $12 in PRD band, hour total fits envelope. External: Supabase free tier pauses ~7 days/Pro $25 ✓; Vercel Hobby prohibits commercial use/Pro $20 ✓; $1 Stripe live charge clears the $0.50 minimum ✓.
