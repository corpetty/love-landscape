/**
 * api/chat.js — Managed LLM proxy for Love Landscape
 *
 * Vercel serverless function. Proxies requests to OpenRouter, enforces
 * per-session credit limits, and returns credits remaining to the client.
 *
 * Required env vars (set in Vercel project settings):
 *   OPENROUTER_API_KEY        — OpenRouter API key (sk-or-...)
 *   SUPABASE_URL              — Same as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (bypasses RLS)
 *
 * Optional:
 *   MANAGED_MODEL_FAST    — Model for param adjustment (default: anthropic/claude-haiku-4-5)
 *   MANAGED_MODEL_QUALITY — Model for narrative/pair readings (default: anthropic/claude-sonnet-4-5)
 *   FREE_CREDITS          — Free credits per new session (default: 5)
 */

const { createClient } = require('@supabase/supabase-js');

const MODEL_FAST    = process.env.MANAGED_MODEL_FAST    || 'anthropic/claude-haiku-4-5';
const MODEL_QUALITY = process.env.MANAGED_MODEL_QUALITY || 'anthropic/claude-sonnet-4-5';
const FREE_CREDITS  = parseInt(process.env.FREE_CREDITS || '5', 10);

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getOrCreateSession(supabase, sessionId) {
  // Try fetching existing session
  const { data } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (data) return data;

  // Create new session with free credits
  const { data: created, error } = await supabase
    .from('reading_sessions')
    .insert({ session_id: sessionId, free_credits: FREE_CREDITS, readings_used: 0, credits_purchased: 0 })
    .select()
    .single();

  if (error) return null;
  return created;
}

module.exports = async function handler(req, res) {
  // CORS headers so the browser can call this from the same domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { systemMessage, userMessage, sessionId, callType = 'read' } = req.body || {};

  if (!systemMessage || !userMessage) {
    return res.status(400).json({ error: 'Missing systemMessage or userMessage' });
  }
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  // Credit check
  const session = await getOrCreateSession(supabase, sessionId);
  if (!session) {
    return res.status(500).json({ error: 'Failed to initialize session' });
  }

  const creditsRemaining = session.free_credits + session.credits_purchased - session.readings_used;

  if (creditsRemaining <= 0) {
    return res.status(402).json({
      error: 'No reading credits remaining.',
      creditsRemaining: 0,
      upgradeAvailable: true,
    });
  }

  // Optimistically deduct credit before calling OpenRouter
  await supabase
    .from('reading_sessions')
    .update({ readings_used: session.readings_used + 1 })
    .eq('session_id', sessionId);

  // Choose model based on call type
  const model = callType === 'adjust' ? MODEL_FAST : MODEL_QUALITY;

  let orResponse;
  try {
    orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://love-landscape.com',
        'X-Title': 'Love Landscape',
      },
      body: JSON.stringify({
        model,
        max_tokens: callType === 'adjust' ? 512 : 1024,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user',   content: userMessage },
        ],
      }),
    });
  } catch (err) {
    // Network error — refund the credit
    await supabase
      .from('reading_sessions')
      .update({ readings_used: session.readings_used })
      .eq('session_id', sessionId);
    return res.status(503).json({ error: 'Could not reach AI service. Please try again.' });
  }

  if (!orResponse.ok) {
    // API error — refund the credit
    await supabase
      .from('reading_sessions')
      .update({ readings_used: session.readings_used })
      .eq('session_id', sessionId);
    const errText = await orResponse.text().catch(() => '');
    return res.status(502).json({ error: 'AI service error. Please try again.', detail: errText.slice(0, 200) });
  }

  const aiData = await orResponse.json();
  const content = aiData.choices?.[0]?.message?.content || '';

  return res.status(200).json({
    content,
    creditsRemaining: creditsRemaining - 1,
    model,
  });
};
