# Payments Runbook

Operational procedures for the Full Reading SKU and the credits pack. Everything here was
field-tested during the July 2026 shakedown (see commits `f048fc0`…`e084254`).

## How the pipeline works (30 seconds)

Buy → Stripe Checkout (`api/checkout.js`, sku `full_reading`, metadata carries `result_id` +
`session_id`) → `checkout.session.completed` webhook records a `purchases` row (idempotent by
Stripe event id AND by checkout session id) + a funnel milestone → the buyer lands back on their
result page → `FullReadingCard` polls `api/reading.js op:status` until entitled → `op:get`
generates via OpenRouter (up to 300s), caches to `purchases.reading_text`. Refund → Stripe sends
`charge.refunded` → status flips to `refunded` → reading no longer served.

**Failure posture:** a failed purchase write NEVER returns 200 — the webhook releases its dedup
row and 500s, so Stripe retries automatically (hours→days schedule). A failed generation costs
the buyer nothing; retries are free; the purchase stays `paid`.

## Customer says: "I paid but there's no reading"

1. **Stripe → Payments**: find the charge; open its checkout session; note `cs_...` id and the
   `result_id` in metadata.
2. **Stripe → Webhooks → deliveries** for that event: a non-200 response means the write failed
   and retries are pending — usually just wait, or fix the underlying error and let the retry land.
3. **Supabase**: `SELECT * FROM purchases WHERE stripe_session_id = 'cs_...'`
   - Row exists, `status='paid'`, `reading_text` null → entitlement fine; the customer just needs
     to reload their result page (generation is on-demand and free to retry).
   - No row and no pending retries → manual recovery:
     ```sql
     INSERT INTO purchases (stripe_session_id, sku, status, amount_cents, session_id, result_id, payment_intent)
     VALUES ('cs_...', 'full_reading', 'paid', 1200, '<session_id from metadata>', '<result_id>', '<pi_...>')
     ON CONFLICT (stripe_session_id) DO NOTHING;
     ```
4. To replay an event through the webhook instead: first release its dedup row
   (`DELETE FROM stripe_events WHERE event_id = 'evt_...'`), then Stripe → event → Resend.

## Customer lost access to a purchased reading (cleared browser, no account)

Anonymous ownership is a bearer token in the buyer's localStorage. If it's gone:
their Stripe receipt contains the checkout session id → locate the purchase row → options:
- Ask them to sign in / create an account on the device that still has the result, which claims
  the purchase; or
- Re-link manually: `UPDATE purchases SET user_id = '<their auth uid>' WHERE stripe_session_id = 'cs_...'`
  after they create an account and claim the result.

## Generation stays broken for a customer (>48h)

Refund in Stripe (Payments → charge → Refund). The `charge.refunded` webhook revokes access
automatically. No SQL needed.

## Refunds

Always via Stripe. Revocation is automatic through the `charge.refunded` event, matched by
`payment_intent` (migration 005). If a purchase row predates 005 and lacks `payment_intent`,
flip it manually: `UPDATE purchases SET status='refunded' WHERE stripe_session_id='cs_...'`.

## Known sharp edges (learned the hard way)

- **Every OTP/email code invalidates prior ones**; the newest email wins (code is in the subject).
- **Non-ASCII characters in HTTP headers kill fetch** before the request leaves the server —
  guarded by a test now (`tests/reading.test.js`, "the em-dash incident").
- **Generation time scales with length**: prompt targets ~2,000–2,800 words on purpose;
  `api/reading.js` has `maxDuration: 300`. If readings start timing out again, check whether the
  prompt targets grew.
- **OpenRouter pre-authorizes against `max_tokens`** — a thin credit balance rejects big
  requests (402) while small free-reading calls still pass.
