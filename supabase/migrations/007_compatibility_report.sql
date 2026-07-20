-- 007_compatibility_report.sql
-- Additive. Enables the paid one-time Compatibility Report (a new `purchases`
-- sku). Apply before setting STRIPE_PRICE_COMPATIBILITY + VITE_COMPATIBILITY_PRICE.
--
-- Only one change is needed: store the partner landscape's code on the purchase,
-- so the report is fixed to the pairing that was bought and regenerations use it.
-- `purchases.sku` has no enum constraint, so 'compatibility' needs no change there.
-- Analytics reuse existing allowlisted events (checkout_start / reading_view /
-- content_page_view) with a sku/page prop, so the events CHECK is untouched.

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS partner_code TEXT;
