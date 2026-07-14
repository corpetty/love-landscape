/**
 * api/fakedoor.js — Step 0 fake-door intent test (standalone; no Phase 0 dependencies)
 *
 * POST /api/fakedoor
 * Body: { email: string, city?: string, website?: string }
 *
 * `website` is a honeypot: real users never see the field; bots that fill it
 * get a fake success and nothing is stored.
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: PUBLIC_ORIGIN (CORS; falls back to VITE_PUBLIC_URL, then *)
 */

import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAILY_IP_LIMIT = 10;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, city, website } = req.body || {};

  // Honeypot: pretend success, store nothing.
  if (website) return res.json({ ok: true });

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanEmail || cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const cleanCity = typeof city === 'string' && city.trim() ? city.trim().slice(0, 100) : null;

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Service not configured' });

  // Fixed-window daily rate limit per IP (bucket convention: scope:key:YYYY-MM-DD, UTC).
  const day = new Date().toISOString().slice(0, 10);
  const bucket = `fakedoor:ip:${clientIp(req)}:${day}`;
  const { data: allowed, error: rlError } = await supabase.rpc('rate_limit_hit', {
    p_bucket: bucket,
    p_limit: DAILY_IP_LIMIT,
  });
  if (rlError) return res.status(503).json({ error: 'Please try again later.' });
  if (allowed === false) return res.status(429).json({ error: 'Too many requests — try again tomorrow.' });

  // Idempotent join: duplicate email is success, not an enumeration oracle.
  const { error } = await supabase
    .from('fakedoor_signups')
    .upsert({ email: cleanEmail, city: cleanCity }, { onConflict: 'email', ignoreDuplicates: true });

  if (error) return res.status(503).json({ error: 'Could not save — please try again.' });

  return res.json({ ok: true });
}
