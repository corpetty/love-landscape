-- Migration 001: Managed LLM credit system + full 13-param submissions
-- Run in your Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reading sessions (managed LLM credit tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reading_sessions (
  session_id        UUID PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT now(),
  free_credits      INT NOT NULL DEFAULT 5,
  readings_used     INT NOT NULL DEFAULT 0,
  credits_purchased INT NOT NULL DEFAULT 0
);

-- Service role manages this table; no anon access needed
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
-- (No anon policies — only the API functions use the service role key)

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Expand submissions: add 4 missing parameters
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS p_self_intimacy       REAL NOT NULL DEFAULT 0.5
    CHECK (p_self_intimacy BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS p_conflict_approach   REAL NOT NULL DEFAULT 0.5
    CHECK (p_conflict_approach BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS p_playfulness         REAL NOT NULL DEFAULT 0.5
    CHECK (p_playfulness BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS p_attachment_security REAL NOT NULL DEFAULT 0.5
    CHECK (p_attachment_security BETWEEN 0 AND 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Expand submissions: richer optional demographics
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS attachment_style TEXT
    CHECK (attachment_style IS NULL OR attachment_style IN (
      'secure', 'anxious', 'avoidant', 'fearful-avoidant'
    )),
  ADD COLUMN IF NOT EXISTS relationship_count TEXT
    CHECK (relationship_count IS NULL OR relationship_count IN (
      'exploring', '1-2', '3-5', '6+'
    )),
  ADD COLUMN IF NOT EXISTS ai_reading_text      TEXT,
  ADD COLUMN IF NOT EXISTS ai_reading_consented BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Update aggregate RPC functions to include all 13 parameters
-- ─────────────────────────────────────────────────────────────────────────────

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
    avg(p_deep_friendships)::real,
    avg(p_romantic_love)::real,
    avg(p_tender_middle)::real,
    avg(p_casual_touch)::real,
    avg(p_empty_phys_barrier)::real,
    avg(p_ungrounded_barrier)::real,
    avg(p_uncertainty_tolerance)::real,
    avg(p_openness)::real,
    avg(p_mapped)::real,
    avg(p_self_intimacy)::real,
    avg(p_conflict_approach)::real,
    avg(p_playfulness)::real,
    avg(p_attachment_security)::real
  FROM submissions;
$$;

-- Update histogram to allow all 13 params
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

-- Expand demographic breakdown to include new fields
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

-- Reading consent summary (for research transparency)
CREATE OR REPLACE FUNCTION get_reading_consent_count()
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT count(*)::integer FROM submissions WHERE ai_reading_consented = TRUE;
$$;

GRANT EXECUTE ON FUNCTION get_param_means TO anon;
GRANT EXECUTE ON FUNCTION get_param_histogram TO anon;
GRANT EXECUTE ON FUNCTION get_demographic_breakdown TO anon;
GRANT EXECUTE ON FUNCTION get_reading_consent_count TO anon;
