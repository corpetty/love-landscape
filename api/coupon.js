/**
 * api/coupon.js — Redeem a coupon code for free AI reading credits
 *
 * POST /api/coupon  { sessionId, code }
 *
 * Returns:
 *   200  { credits, creditsRemaining, message }
 *   400  { error }  — invalid input
 *   404  { error }  — code not found or inactive
 *   409  { error }  — already redeemed by this session
 *   410  { error }  — code expired or fully used
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const FREE_CREDITS = parseInt(process.env.FREE_CREDITS || '5', 10);

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, code } = req.body || {};

  if (!sessionId || !code) {
    return res.status(400).json({ error: 'Missing sessionId or code' });
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return res.status(400).json({ error: 'Code cannot be empty' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  // 1. Look up the coupon (case-insensitive)
  const { data: coupon, error: couponErr } = await supabase
    .from('coupon_codes')
    .select('*')
    .ilike('code', trimmedCode)
    .eq('active', true)
    .maybeSingle();

  if (couponErr || !coupon) {
    return res.status(404).json({ error: 'Invalid or inactive coupon code' });
  }

  // 2. Check validity window
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return res.status(410).json({ error: 'This coupon is not yet active' });
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return res.status(410).json({ error: 'This coupon has expired' });
  }

  // 3. Check usage limits
  if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
    return res.status(410).json({ error: 'This coupon has been fully redeemed' });
  }

  // 4. Check if this session already redeemed this coupon
  const { data: existing } = await supabase
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'You have already redeemed this coupon' });
  }

  // 5. Record the redemption
  const { error: redeemErr } = await supabase
    .from('coupon_redemptions')
    .insert({
      coupon_id: coupon.id,
      session_id: sessionId,
      credits: coupon.credits,
    });

  if (redeemErr) {
    // Unique constraint violation = race condition double-redeem
    if (redeemErr.code === '23505') {
      return res.status(409).json({ error: 'You have already redeemed this coupon' });
    }
    return res.status(500).json({ error: 'Failed to redeem coupon' });
  }

  // 6. Increment usage count on the coupon
  await supabase
    .from('coupon_codes')
    .update({ times_used: coupon.times_used + 1 })
    .eq('id', coupon.id);

  // 7. Add credits to the session (upsert reading_sessions)
  const { data: session } = await supabase
    .from('reading_sessions')
    .select('credits_purchased')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (session) {
    await supabase
      .from('reading_sessions')
      .update({ credits_purchased: session.credits_purchased + coupon.credits })
      .eq('session_id', sessionId);
  } else {
    await supabase
      .from('reading_sessions')
      .insert({
        session_id: sessionId,
        free_credits: FREE_CREDITS,
        readings_used: 0,
        credits_purchased: coupon.credits,
      });
  }

  // 8. Return updated credit balance
  const { data: updated } = await supabase
    .from('reading_sessions')
    .select('free_credits, readings_used, credits_purchased')
    .eq('session_id', sessionId)
    .maybeSingle();

  const creditsRemaining = updated
    ? Math.max(0, updated.free_credits + updated.credits_purchased - updated.readings_used)
    : coupon.credits + FREE_CREDITS;

  return res.status(200).json({
    credits: coupon.credits,
    creditsRemaining,
    message: `${coupon.credits} reading credit${coupon.credits === 1 ? '' : 's'} added!`,
  });
}
