/**
 * api/admin.js — funnel metrics behind a server-verified bearer token.
 *
 * GET /api/admin?days=30
 * Header: Authorization: Bearer <ADMIN_TOKEN>
 *
 * The legacy dashboard password gate is cosmetic (client-side hash in the
 * bundle); THIS token is the real boundary. Comparison is constant-time over
 * hashes so neither content nor length leaks.
 *
 * Env: ADMIN_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function tokenValid(provided, expected) {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: 'Admin access not configured' });

  const auth = req.headers.authorization || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!tokenValid(provided, expected)) return res.status(401).json({ error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Not configured' });
  const supabase = createClient(url, key);

  const days = Math.min(365, Math.max(1, parseInt(req.query?.days, 10) || 30));
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000);

  const { data, error } = await supabase.rpc('admin_metrics', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) return res.status(503).json({ error: 'Metrics unavailable', detail: error.message });

  return res.json({ from: from.toISOString(), to: to.toISOString(), days, ...data });
}
