-- Step 0: fake-door intent test + rate limiting (standalone — no Phase 0 dependencies)
-- Apply after 001_managed_llm_and_research.sql. Additive only.

-- ─────────────────────────────────────────────────────────────────────────────
-- Fake-door signups — "would you want Love Landscape to help singles meet?"
-- Written only by api/fakedoor.js (service role). Never exposed to anon.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE fakedoor_signups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  email      TEXT NOT NULL UNIQUE,
  city       TEXT
);

ALTER TABLE fakedoor_signups ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.

-- ─────────────────────────────────────────────────────────────────────────────
-- Rate counters — fixed-window (UTC daily) buckets, serverless-safe because
-- state lives here, not in function instances. Bucket key convention:
--   '<scope>:<key>:<YYYY-MM-DD>'   e.g. 'fakedoor:ip:203.0.113.7:2026-07-14'
-- Old buckets: purge manually during Step 0 (cron lands in F0.0):
--   DELETE FROM rate_counters WHERE updated_at < now() - interval '7 days';
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rate_counters (
  bucket     TEXT PRIMARY KEY,
  count      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rate_counters ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.

-- Atomic increment-and-check. Returns TRUE if the call is within the limit.
-- SECURITY DEFINER but NOT granted to anon/authenticated — service role only.
CREATE OR REPLACE FUNCTION rate_limit_hit(p_bucket TEXT, p_limit INT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO rate_counters (bucket, count, updated_at)
  VALUES (p_bucket, 1, now())
  ON CONFLICT (bucket)
  DO UPDATE SET count = rate_counters.count + 1, updated_at = now()
  RETURNING count <= p_limit;
$$;

REVOKE EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT) FROM authenticated;

-- Aggregate read for the Step 0 baseline report (count + cities only, no emails).
CREATE OR REPLACE FUNCTION get_fakedoor_summary()
RETURNS TABLE (total INTEGER, with_city INTEGER)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT count(*)::integer, count(city)::integer FROM fakedoor_signups;
$$;

REVOKE EXECUTE ON FUNCTION get_fakedoor_summary() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_fakedoor_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION get_fakedoor_summary() FROM authenticated;
