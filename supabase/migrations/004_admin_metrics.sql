-- Admin funnel metrics: one SECURITY DEFINER function, callable only via
-- api/admin.js (service role + ADMIN_TOKEN). No anon/authenticated grants.
-- Dev traffic (is_dev) is excluded from all funnel numbers.

CREATE OR REPLACE FUNCTION admin_metrics(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT jsonb_build_object(
    'milestones', (
      SELECT COALESCE(jsonb_object_agg(kind, jsonb_build_object('total', total, 'persons', persons)), '{}'::jsonb)
      FROM (
        SELECT kind, count(*) AS total, count(DISTINCT person_key) AS persons
        FROM milestones
        WHERE NOT is_dev AND happened_at >= p_from AND happened_at <= p_to
        GROUP BY kind
      ) m
    ),
    'events', (
      SELECT COALESCE(jsonb_object_agg(name, jsonb_build_object('total', total, 'sessions', sessions)), '{}'::jsonb)
      FROM (
        SELECT name, count(*) AS total, count(DISTINCT session_id) AS sessions
        FROM events
        WHERE created_at >= p_from AND created_at <= p_to
          AND NOT COALESCE((props->>'is_dev')::boolean, false)
        GROUP BY name
      ) e
    ),
    'daily_creates', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', cnt) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', happened_at)::date AS day, count(DISTINCT person_key) AS cnt
        FROM milestones
        WHERE kind = 'create' AND NOT is_dev AND happened_at >= p_from AND happened_at <= p_to
        GROUP BY 1
      ) d
    ),
    'rate_limit_rejections', (
      -- Buckets that hit their cap today/yesterday hint at limiter pressure.
      SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', bucket, 'count', count) ORDER BY count DESC), '[]'::jsonb)
      FROM (
        SELECT bucket, count FROM rate_counters
        WHERE updated_at >= p_from AND count >= 25
        ORDER BY count DESC LIMIT 20
      ) r
    ),
    'totals', jsonb_build_object(
      'results',              (SELECT count(*) FROM results WHERE NOT is_dev),
      'results_published',    (SELECT count(*) FROM results WHERE is_public AND NOT is_dev),
      'accounts',             (SELECT count(*) FROM profiles),
      'purchases_paid',       (SELECT count(*) FROM purchases WHERE status = 'paid'),
      'comparisons_saved',    (SELECT count(*) FROM comparisons),
      'fakedoor_signups',     (SELECT count(*) FROM fakedoor_signups),
      'research_submissions', (SELECT count(*) FROM submissions)
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION admin_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM authenticated;
