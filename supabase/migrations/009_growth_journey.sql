-- 009_growth_journey.sql
-- Additive. Enables the Growth Journey ask link: /ask/<slug>.
--
-- Phase A of this feature works entirely on-device with V2_ codes passed by
-- hand. Phase B adds the server half so one person can send a link instead of
-- a code, and the answer comes back without anyone copy-pasting.
--
-- Shape of the thing being stored: an ASK is one person opening their own
-- landscape to one question — "where do you want this bond to be?" — and a
-- PLACEMENT is one answer to it, a single point on that landscape.
--
-- Privacy notes that the schema enforces rather than merely intends:
--   * Placements hang off an ask, which hangs off a result, which hangs off
--     the account. Deleting the account cascades all the way down without any
--     application code, and deleting one landscape takes its asks with it.
--   * A note is free text written by the *partner*, not the owner. It is
--     content, never analytics: it is never copied into milestones or events.
--   * No ask row carries a name. The only identity in this feature is the
--     landscape it is about.

CREATE TABLE asks (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT now(),
  slug             TEXT UNIQUE NOT NULL,          -- base58 x10, same shape as results.slug
  owner_result_id  UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  owner_session_id UUID,                          -- milestone person_key when anonymous
  -- 'open' accepts answers; 'answered' has one; 'withdrawn' serves 410 forever.
  -- Withdrawal is one-way on purpose: a link that can come back to life is not
  -- a link anyone can safely send.
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'withdrawn')),
  is_dev           BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX asks_owner_result ON asks (owner_result_id);
ALTER TABLE asks ENABLE ROW LEVEL SECURITY;
-- Service-role only: every read and write goes through api/results.js, which
-- owns the authorization rules (JWT or bearer owner_token for the owner, a
-- separate bearer answer_token for the guest who answered).

CREATE TABLE placements (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  ask_id            UUID NOT NULL REFERENCES asks(id) ON DELETE CASCADE,
  author_role       TEXT NOT NULL CHECK (author_role IN ('owner', 'partner')),
  -- 'current' = where the bond stands; 'desired' = where it wants to be;
  -- 'wish' = where the owner would like it (the optional third pin, Phase D).
  kind              TEXT NOT NULL CHECK (kind IN ('current', 'desired', 'wish')),
  x                 REAL NOT NULL CHECK (x BETWEEN 0 AND 1),
  y                 REAL NOT NULL CHECK (y BETWEEN 0 AND 1),
  -- Optional by product decision: the map's two axes cannot express an
  -- agreement, so this is nullable and silence means silence.
  exclusivity       REAL CHECK (exclusivity IS NULL OR exclusivity BETWEEN 0 AND 1),
  note              TEXT CHECK (note IS NULL OR length(note) <= 280),
  -- The guest's bearer token (SHA-256), so someone with no account can come
  -- back and revise or delete their own answer. Null for the owner's own pins,
  -- which are authorized by the result they belong to.
  answer_token_hash TEXT,
  -- One pin per person per kind per ask: answering twice revises, never
  -- duplicates, so a reveal can never show two contradictory answers.
  UNIQUE (ask_id, author_role, kind)
);
CREATE INDEX placements_ask ON placements (ask_id);
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

-- Diagnostic events for the ask funnel. Same allowlist pattern as 003.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_name_check;
ALTER TABLE events ADD CONSTRAINT events_name_check CHECK (name IN (
  'assessment_start','assessment_complete','results_view','share_page_view','share_page_cta',
  'partner_code_load','signup_start','otp_sent','otp_verified','reading_view',
  'content_page_view','checkout_start',
  'ask_create','ask_open','ask_answer','placement_set','path_view'
));

-- Server-truth funnel for the ask loop. 'ask' is the growth action (a person
-- put the product in front of someone else); 'ask_answered' is the conversion.
-- Existing kinds are untouched, so the frozen Phase-0 gate metrics are
-- unaffected — admin_metrics() aggregates by kind and simply gains two keys.
ALTER TABLE milestones DROP CONSTRAINT IF EXISTS milestones_kind_check;
ALTER TABLE milestones ADD CONSTRAINT milestones_kind_check CHECK (kind IN (
  'create','publish','signup','purchase','compare','ask','ask_answered'
));

-- Retention: placements and asks are user content and follow the owning
-- result. There is no separate purge — deleting the landscape or the account
-- removes them by cascade.
