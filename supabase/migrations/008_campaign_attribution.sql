-- Campaign attribution: split the funnel by first-touch utm_source.
--
-- The create milestone now carries meta.utm = { source, medium, campaign,
-- content, term } (set in api/results.js from the client's persisted first-touch
-- UTM). Downstream milestones don't carry UTM, so we attribute them back to the
-- create:
--   publish/purchase  → joined by client_result_id (they carry it)
--   compare           → joined by person_key (no client_result_id on compare)
-- assessment_start events carry props.utm.source, giving a per-source denominator
-- for completion rate even when a source produces starts but no completions.
--
-- Additive: extends admin_metrics() with `by_source` and `share_loop`. Re-run to
-- replace the function; grants are unchanged (service-role only via api/admin.js).

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
    -- Per-source funnel: one row per utm_source (unattributed traffic → '(none)').
    'by_source', (
      WITH creates AS (
        SELECT client_result_id, person_key,
               COALESCE(meta->'utm'->>'source', '(none)') AS source
        FROM milestones
        WHERE kind = 'create' AND NOT is_dev
          AND happened_at >= p_from AND happened_at <= p_to
      ),
      starts AS (
        SELECT COALESCE(props->'utm'->>'source', '(none)') AS source,
               count(DISTINCT session_id) AS n
        FROM events
        WHERE name = 'assessment_start'
          AND created_at >= p_from AND created_at <= p_to
          AND NOT COALESCE((props->>'is_dev')::boolean, false)
        GROUP BY 1
      ),
      agg AS (
        SELECT c.source,
          count(DISTINCT c.client_result_id)   AS completions,
          count(DISTINCT pub.client_result_id) AS published,
          count(DISTINCT pur.client_result_id) AS purchases,
          count(DISTINCT cmp.person_key)       AS compares
        FROM creates c
        LEFT JOIN milestones pub
          ON pub.kind = 'publish'  AND pub.client_result_id = c.client_result_id AND NOT pub.is_dev
        LEFT JOIN milestones pur
          ON pur.kind = 'purchase' AND pur.client_result_id = c.client_result_id AND NOT pur.is_dev
        LEFT JOIN milestones cmp
          ON cmp.kind = 'compare'  AND cmp.person_key = c.person_key AND NOT cmp.is_dev
        GROUP BY c.source
      )
      SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'completions')::int DESC, (row->>'starts')::int DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'source',      COALESCE(a.source, s.source),
          'starts',      COALESCE(s.n, 0),
          'completions', COALESCE(a.completions, 0),
          'published',   COALESCE(a.published, 0),
          'compares',    COALESCE(a.compares, 0),
          'purchases',   COALESCE(a.purchases, 0)
        ) AS row
        FROM agg a
        FULL JOIN starts s ON s.source = a.source
      ) rows
    ),
    -- Viral loop: shared-page views vs. assessments started from a share link.
    'share_loop', (
      SELECT jsonb_build_object(
        'share_page_views', COALESCE((
          SELECT count(DISTINCT session_id) FROM events
          WHERE name = 'share_page_view' AND created_at >= p_from AND created_at <= p_to
            AND NOT COALESCE((props->>'is_dev')::boolean, false)
        ), 0),
        'starts_from_share', COALESCE((
          SELECT count(DISTINCT session_id) FROM events
          WHERE name = 'assessment_start' AND props->>'from' = 'share'
            AND created_at >= p_from AND created_at <= p_to
            AND NOT COALESCE((props->>'is_dev')::boolean, false)
        ), 0)
      )
    ),
    'rate_limit_rejections', (
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
