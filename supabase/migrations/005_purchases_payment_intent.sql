-- F0.4: refund handling needs to map Stripe charge.refunded events (which
-- carry a payment_intent, not a checkout session id) back to purchases.
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_intent TEXT;
CREATE INDEX IF NOT EXISTS purchases_payment_intent ON purchases (payment_intent);
