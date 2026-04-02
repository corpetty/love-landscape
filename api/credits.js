/**
 * api/credits.js — Query remaining credits for a session
 *
 * GET /api/credits?sessionId=<uuid>
 *
 * Returns:
 *   { creditsRemaining, readingsUsed, creditsPurchased, freeCredits }
 */

const { createClient } = require('@supabase/supabase-js');

const FREE_CREDITS = parseInt(process.env.FREE_CREDITS || '5', 10);

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.query;

  if (!sessionId) {
    // No session yet — return default free credits
    return res.json({ creditsRemaining: FREE_CREDITS, readingsUsed: 0, creditsPurchased: 0, freeCredits: FREE_CREDITS });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.json({ creditsRemaining: FREE_CREDITS, readingsUsed: 0, creditsPurchased: 0, freeCredits: FREE_CREDITS });
  }

  const { data, error } = await supabase
    .from('reading_sessions')
    .select('free_credits, readings_used, credits_purchased')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!data || error) {
    // Session doesn't exist yet — full credits available
    return res.json({ creditsRemaining: FREE_CREDITS, readingsUsed: 0, creditsPurchased: 0, freeCredits: FREE_CREDITS });
  }

  const creditsRemaining = data.free_credits + data.credits_purchased - data.readings_used;

  return res.json({
    creditsRemaining: Math.max(0, creditsRemaining),
    readingsUsed: data.readings_used,
    creditsPurchased: data.credits_purchased,
    freeCredits: data.free_credits,
  });
};
