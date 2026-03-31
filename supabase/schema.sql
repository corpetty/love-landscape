-- Love Landscape: Anonymous Research Submissions
-- Run this in your Supabase SQL Editor

-- Table for submissions
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 9 terrain parameters, each 0-1
  p_deep_friendships REAL NOT NULL CHECK (p_deep_friendships BETWEEN 0 AND 1),
  p_romantic_love REAL NOT NULL CHECK (p_romantic_love BETWEEN 0 AND 1),
  p_tender_middle REAL NOT NULL CHECK (p_tender_middle BETWEEN 0 AND 1),
  p_casual_touch REAL NOT NULL CHECK (p_casual_touch BETWEEN 0 AND 1),
  p_empty_phys_barrier REAL NOT NULL CHECK (p_empty_phys_barrier BETWEEN 0 AND 1),
  p_ungrounded_barrier REAL NOT NULL CHECK (p_ungrounded_barrier BETWEEN 0 AND 1),
  p_uncertainty_tolerance REAL NOT NULL CHECK (p_uncertainty_tolerance BETWEEN 0 AND 1),
  p_openness REAL NOT NULL CHECK (p_openness BETWEEN 0 AND 1),
  p_mapped REAL NOT NULL CHECK (p_mapped BETWEEN 0 AND 1),

  -- Optional demographics
  age_range TEXT CHECK (age_range IS NULL OR age_range IN ('18-25', '26-35', '36-45', '46-55', '56+')),
  relationship_structure TEXT CHECK (relationship_structure IS NULL OR relationship_structure IN ('monogamous', 'enm-polyamorous', 'single-exploring', 'other')),
  gender_identity TEXT -- free text, max 100 chars enforced client-side
);

-- RLS: anonymous inserts allowed, no direct reads
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts"
  ON submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- No SELECT policy for anon — reads happen through RPC functions only

-------------------------------------------------------------------
-- Aggregate RPC functions (callable with anon key, return only aggregates)
-------------------------------------------------------------------

-- Total count
CREATE OR REPLACE FUNCTION get_submission_count()
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT count(*)::integer FROM submissions;
$$;

-- Parameter means
CREATE OR REPLACE FUNCTION get_param_means()
RETURNS TABLE (
  p_deep_friendships REAL, p_romantic_love REAL, p_tender_middle REAL,
  p_casual_touch REAL, p_empty_phys_barrier REAL, p_ungrounded_barrier REAL,
  p_uncertainty_tolerance REAL, p_openness REAL, p_mapped REAL
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    avg(p_deep_friendships)::real, avg(p_romantic_love)::real,
    avg(p_tender_middle)::real, avg(p_casual_touch)::real,
    avg(p_empty_phys_barrier)::real, avg(p_ungrounded_barrier)::real,
    avg(p_uncertainty_tolerance)::real, avg(p_openness)::real,
    avg(p_mapped)::real
  FROM submissions;
$$;

-- Histogram for a given parameter (10 bins)
CREATE OR REPLACE FUNCTION get_param_histogram(param_name TEXT)
RETURNS TABLE (bin_start REAL, bin_end REAL, count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF param_name NOT IN (
    'p_deep_friendships','p_romantic_love','p_tender_middle',
    'p_casual_touch','p_empty_phys_barrier','p_ungrounded_barrier',
    'p_uncertainty_tolerance','p_openness','p_mapped'
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
  IF field NOT IN ('age_range', 'relationship_structure', 'gender_identity') THEN
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

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION get_submission_count TO anon;
GRANT EXECUTE ON FUNCTION get_param_means TO anon;
GRANT EXECUTE ON FUNCTION get_param_histogram TO anon;
GRANT EXECUTE ON FUNCTION get_demographic_breakdown TO anon;
