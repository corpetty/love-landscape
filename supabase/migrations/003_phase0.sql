-- Phase 0: persistence data plane + payment idempotency + first-party analytics.
-- Additive only. Apply after 002_coupon_codes.sql.
--
-- Deferred (dating route parked, July 2026): the waitlist table and the F0.8
-- status screen. `results.status` stays in the schema (nullable, write-once)
-- so the column exists if the intent probe is ever revived.
--
-- All tables here are service-role only: every mutation goes through an API
-- function. No anon grants, no anon policies.

-- ─────────────────────────────────────────────────────────────────────────────
-- Stripe webhook idempotency (used by api/webhook.js immediately)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE stripe_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Accounts & persisted results
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE results (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_result_id UUID UNIQUE NOT NULL,        -- create idempotency key
  created_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id       UUID NOT NULL,
  owner_token_hash TEXT,                        -- nulled at claim (bearer access ends)
  code             TEXT NOT NULL,               -- L2_ serialized params
  label            TEXT,                        -- private; never rendered publicly
  status           TEXT CHECK (status IN ('single','partnered','complicated','prefer-not')), -- write-once; unused while dating is parked
  variant          SMALLINT,                    -- A/B assignment at creation
  is_public        BOOLEAN NOT NULL DEFAULT FALSE,
  first_published_at TIMESTAMPTZ,               -- set once, never cleared
  slug             TEXT UNIQUE,                 -- crypto base58 ×10
  is_dev           BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX results_owner_token ON results (owner_token_hash);
CREATE INDEX results_session ON results (session_id);
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Anonymous→account linking, resolved at read time (no milestone rewriting).
CREATE TABLE claims (
  client_result_id UUID PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Saved comparisons: owned user content (retention 24 months; owner-deletable).
CREATE TABLE comparisons (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT now(),
  session_id   UUID NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL
);
ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Premium entitlements (F0.4; table lands now to avoid migration churn)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchases (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT now(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  sku               TEXT NOT NULL DEFAULT 'full_reading',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded')),
  amount_cents      INT,
  user_id           UUID REFERENCES auth.users(id),
  session_id        UUID,
  result_id         UUID REFERENCES results(id) ON DELETE SET NULL,
  reading_text      TEXT,                       -- nulled on account deletion
  regen_count       INT NOT NULL DEFAULT 0
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics: append-only milestones (server-truth funnel) + client events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE milestones (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at      TIMESTAMPTZ DEFAULT now(),   -- server receipt (anomaly/velocity checks)
  happened_at      TIMESTAMPTZ NOT NULL,        -- client time, bounded by receipt (analysis windows)
  kind             TEXT NOT NULL CHECK (kind IN ('create','publish','signup','purchase','compare')),
  person_key       TEXT NOT NULL,               -- user_id or session_id at write time; immutable
  client_result_id UUID,                        -- set on result-anchored kinds
  meta             JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_dev           BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX milestones_create_once ON milestones (client_result_id) WHERE kind = 'create';
CREATE INDEX milestones_kind_time ON milestones (kind, happened_at);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
-- Append-only: no UPDATE path exists in application code; the only permitted
-- mutation is the account-deletion anonymization pass (dedicated function, F0.1+).

CREATE TABLE events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID NOT NULL,
  user_id    UUID,
  name       TEXT NOT NULL CHECK (name IN (
    'assessment_start','assessment_complete','results_view','share_page_view','share_page_cta',
    'partner_code_load','signup_start','otp_sent','otp_verified','reading_view',
    'content_page_view','checkout_start'
  )),
  props      JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 1024)
);
CREATE INDEX events_name_created ON events (name, created_at);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- Retention: purge events older than 12 months, comparisons older than 24
-- (scheduled job; manual until the cron lands):
--   DELETE FROM events WHERE created_at < now() - interval '12 months';
--   DELETE FROM comparisons WHERE created_at < now() - interval '24 months';
