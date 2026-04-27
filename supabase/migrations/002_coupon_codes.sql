-- Migration 002: Coupon code system for free AI reading credits
-- Run in your Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Coupon codes — admin-created codes that grant reading credits
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE coupon_codes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  credits       INT NOT NULL DEFAULT 5,         -- credits granted per redemption
  max_uses      INT DEFAULT NULL,               -- NULL = unlimited
  times_used    INT NOT NULL DEFAULT 0,
  valid_from    TIMESTAMPTZ DEFAULT now(),
  valid_until   TIMESTAMPTZ DEFAULT NULL,       -- NULL = no expiry
  note          TEXT,                            -- internal note (e.g. "podcast promo")
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Case-insensitive unique index for code lookup
CREATE UNIQUE INDEX coupon_codes_code_lower_idx ON coupon_codes (lower(code));

-- Service role only
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Coupon redemptions — tracks which sessions redeemed which codes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE coupon_redemptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id     UUID NOT NULL REFERENCES coupon_codes(id),
  session_id    UUID NOT NULL,
  credits       INT NOT NULL,
  redeemed_at   TIMESTAMPTZ DEFAULT now(),

  -- Each session can only redeem a given coupon once
  UNIQUE (coupon_id, session_id)
);

-- Service role only
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
