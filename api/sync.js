/**
 * api/sync.js — diagnostic event ingestion (best-effort client funnel data).
 *
 * POST /api/sync
 * Body: { session_id: uuid, user_id?: uuid, is_dev?: bool, events: [{name, props}] (≤20) }
 *
 * Server-truth funnel data lives in milestones (api/results.js); this table
 * is diagnostics only. Names are allowlisted, props are size-capped, requests
 * are rate-limited per session (Postgres counters — serverless-safe).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional PUBLIC_ORIGIN, DEV_SECRET
 */

import { createClient } from '@supabase/supabase-js';

const ALLOWED_NAMES = new Set([
  'assessment_start', 'assessment_complete', 'results_view', 'share_page_view',
  'share_page_cta', 'partner_code_load', 'signup_start', 'otp_sent', 'otp_verified',
  'reading_view', 'content_page_view', 'checkout_start',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS_PER_REQUEST = 20;
const DAILY_SESSION_LIMIT = 120; // requests per session per UTC day

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LL-Dev');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  const { session_id, user_id, events } = body || {};

  if (!session_id || !UUID_RE.test(session_id)) return res.status(400).json({ error: 'Invalid session_id' });
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'No events' });
  if (events.length > MAX_EVENTS_PER_REQUEST) return res.status(400).json({ error: 'Too many events' });

  const isDev = req.headers['x-ll-dev'] === process.env.DEV_SECRET || body.is_dev === true;

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Not configured' });

  // Rate limit: requests per session per UTC day.
  const day = new Date().toISOString().slice(0, 10);
  const { data: allowed, error: rlError } = await supabase.rpc('rate_limit_hit', {
    p_bucket: `sync:session:${session_id}:${day}`,
    p_limit: DAILY_SESSION_LIMIT,
  });
  if (rlError || allowed === false) return res.status(429).json({ error: 'Rate limited' });

  const rows = [];
  for (const ev of events) {
    if (!ev || typeof ev.name !== 'string' || !ALLOWED_NAMES.has(ev.name)) continue;
    let props = ev.props && typeof ev.props === 'object' ? ev.props : {};
    if (isDev) props = { ...props, is_dev: true };
    if (JSON.stringify(props).length > 1024) props = { truncated: true };
    rows.push({
      session_id,
      user_id: user_id && UUID_RE.test(user_id) ? user_id : null,
      name: ev.name,
      props,
    });
  }

  if (rows.length === 0) return res.status(400).json({ error: 'No valid events' });

  const { error } = await supabase.from('events').insert(rows);
  if (error) return res.status(503).json({ error: 'Storage error' });

  return res.json({ ok: true, stored: rows.length });
}
