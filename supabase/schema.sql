-- Love Landscape: Full database schema
-- Run this in a fresh Supabase project (or apply migrations/ incrementally)

-- ─────────────────────────────────────────────────────────────────────────────
-- Reading sessions — tracks managed LLM credit balance per anonymous browser session
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE reading_sessions (
  session_id        UUID PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT now(),
  free_credits      INT NOT NULL DEFAULT 5,
  readings_used     INT NOT NULL DEFAULT 0,
  credits_purchased INT NOT NULL DEFAULT 0
);

-- Only API functions (service role) interact with this table
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Submissions — anonymous research contribution
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE submissions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- All 13 terrain parameters (0-1)
  p_deep_friendships      REAL NOT NULL CHECK (p_deep_friendships      BETWEEN 0 AND 1),
  p_romantic_love         REAL NOT NULL CHECK (p_romantic_love         BETWEEN 0 AND 1),
  p_tender_middle         REAL NOT NULL CHECK (p_tender_middle         BETWEEN 0 AND 1),
  p_casual_touch          REAL NOT NULL CHECK (p_casual_touch          BETWEEN 0 AND 1),
  p_empty_phys_barrier    REAL NOT NULL CHECK (p_empty_phys_barrier    BETWEEN 0 AND 1),
  p_ungrounded_barrier    REAL NOT NULL CHECK (p_ungrounded_barrier    BETWEEN 0 AND 1),
  p_uncertainty_tolerance REAL NOT NULL CHECK (p_uncertainty_tolerance BETWEEN 0 AND 1),
  p_openness              REAL NOT NULL CHECK (p_openness              BETWEEN 0 AND 1),
  p_mapped                REAL NOT NULL CHECK (p_mapped                BETWEEN 0 AND 1),
  p_self_intimacy         REAL NOT NULL CHECK (p_self_intimacy         BETWEEN 0 AND 1),
  p_conflict_approach     REAL NOT NULL CHECK (p_conflict_approach     BETWEEN 0 AND 1),
  p_playfulness           REAL NOT NULL CHECK (p_playfulness           BETWEEN 0 AND 1),
  p_attachment_security   REAL NOT NULL CHECK (p_attachment_security   BETWEEN 0 AND 1),

  -- Core optional demographics
  age_range             TEXT CHECK (age_range IS NULL OR age_range IN ('18-25', '26-35', '36-45', '46-55', '56+')),
  relationship_structure TEXT CHECK (relationship_structure IS NULL OR relationship_structure IN (
    'monogamous', 'enm-polyamorous', 'single-exploring', 'other'
  )),
  gender_identity       TEXT, -- free text, max 100 chars enforced client-side

  -- Extended optional demographics
  attachment_style      TEXT CHECK (attachment_style IS NULL OR attachment_style IN (
    'secure', 'anxious', 'avoidant', 'fearful-avoidant'
  )),
  relationship_count    TEXT CHECK (relationship_count IS NULL OR relationship_count IN (
    'exploring', '1-2', '3-5', '6+'
  )),

  -- Optional AI reading (with explicit consent)
  ai_reading_text       TEXT,
  ai_reading_consented  BOOLEAN DEFAULT FALSE
);

-- RLS: anonymous inserts allowed, no direct reads
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts"
  ON submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- No SELECT policy for anon — reads happen through RPC functions only

-- ─────────────────────────────────────────────────────────────────────────────
-- Aggregate RPC functions (callable with anon key — return aggregates only)
-- ─────────────────────────────────────────────────────────────────────────────

-- Total count
CREATE OR REPLACE FUNCTION get_submission_count()
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT count(*)::integer FROM submissions;
$$;

-- Parameter means (all 13)
CREATE OR REPLACE FUNCTION get_param_means()
RETURNS TABLE (
  p_deep_friendships      REAL,
  p_romantic_love         REAL,
  p_tender_middle         REAL,
  p_casual_touch          REAL,
  p_empty_phys_barrier    REAL,
  p_ungrounded_barrier    REAL,
  p_uncertainty_tolerance REAL,
  p_openness              REAL,
  p_mapped                REAL,
  p_self_intimacy         REAL,
  p_conflict_approach     REAL,
  p_playfulness           REAL,
  p_attachment_security   REAL
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    avg(p_deep_friendships)::real,      avg(p_romantic_love)::real,
    avg(p_tender_middle)::real,         avg(p_casual_touch)::real,
    avg(p_empty_phys_barrier)::real,    avg(p_ungrounded_barrier)::real,
    avg(p_uncertainty_tolerance)::real, avg(p_openness)::real,
    avg(p_mapped)::real,                avg(p_self_intimacy)::real,
    avg(p_conflict_approach)::real,     avg(p_playfulness)::real,
    avg(p_attachment_security)::real
  FROM submissions;
$$;

-- Histogram for any of the 13 parameters (10 bins, 0.1 width)
CREATE OR REPLACE FUNCTION get_param_histogram(param_name TEXT)
RETURNS TABLE (bin_start REAL, bin_end REAL, count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF param_name NOT IN (
    'p_deep_friendships', 'p_romantic_love', 'p_tender_middle',
    'p_casual_touch', 'p_empty_phys_barrier', 'p_ungrounded_barrier',
    'p_uncertainty_tolerance', 'p_openness', 'p_mapped',
    'p_self_intimacy', 'p_conflict_approach', 'p_playfulness',
    'p_attachment_security'
  ) THEN
    RAISE EXCEPTION 'Invalid parameter name: %', param_name;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT (b * 0.1)::real AS bin_start,
            ((b + 1) * 0.1)::real AS bin_end,
            (count(*) FILTER (WHERE %I >= b * 0.1 AND (%I < (b + 1) * 0.1 OR (b = 9 AND %I <= 1.0))))::integer
     FROM generate_series(0, 9) AS b
     LEFT JOIN submissions ON true
     GROUP BY b
     ORDER BY b',
    param_name, param_name, param_name
  );
END;
$$;

-- Demographic breakdowns
CREATE OR REPLACE FUNCTION get_demographic_breakdown(field TEXT)
RETURNS TABLE (value TEXT, count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF field NOT IN (
    'age_range', 'relationship_structure', 'gender_identity',
    'attachment_style', 'relationship_count'
  ) THEN
    RAISE EXCEPTION 'Invalid field name: %', field;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT COALESCE(%I, ''not provided'')::text AS value, count(*)::integer
     FROM submissions
     GROUP BY 1
     ORDER BY count(*) DESC',
    field
  );
END;
$$;

-- How many people consented to share AI readings
CREATE OR REPLACE FUNCTION get_reading_consent_count()
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT count(*)::integer FROM submissions WHERE ai_reading_consented = TRUE;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION get_submission_count       TO anon;
GRANT EXECUTE ON FUNCTION get_param_means            TO anon;
GRANT EXECUTE ON FUNCTION get_param_histogram        TO anon;
GRANT EXECUTE ON FUNCTION get_demographic_breakdown  TO anon;
GRANT EXECUTE ON FUNCTION get_reading_consent_count  TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Coupon codes — admin-created codes that grant reading credits
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

CREATE UNIQUE INDEX coupon_codes_code_lower_idx ON coupon_codes (lower(code));
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Coupon redemptions — tracks which sessions redeemed which codes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE coupon_redemptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id     UUID NOT NULL REFERENCES coupon_codes(id),
  session_id    UUID NOT NULL,
  credits       INT NOT NULL,
  redeemed_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (coupon_id, session_id)
);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
