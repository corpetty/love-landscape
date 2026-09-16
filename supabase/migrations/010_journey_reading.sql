-- 010_journey_reading.sql
-- Additive. Enables the paid Journey Reading — a deep reading of one growth
-- journey. Apply before setting STRIPE_PRICE_JOURNEY + VITE_JOURNEY_PRICE.
--
-- What a journey reading is about: ONE ask. That is the whole reason this
-- column exists rather than reusing `partner_code` (which the compatibility
-- report uses to mean "the other person's landscape"). A journey is not a
-- pairing of two landscapes — it is two pins on one landscape, and the ask row
-- is the only thing that identifies which two.
--
-- ON DELETE SET NULL, matching `result_id`: if the ask goes, the buyer keeps
-- the reading already generated and cached on this row. Only regeneration
-- stops working, which is the right trade — a purchase must not evaporate
-- because the question it was about was later closed and cleaned up.
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ask_id UUID REFERENCES asks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS purchases_ask ON purchases (ask_id) WHERE ask_id IS NOT NULL;

-- `purchases.sku` has no enum constraint, so 'journey' needs no change there.
-- Analytics reuse existing allowlisted events (checkout_start / reading_view).
