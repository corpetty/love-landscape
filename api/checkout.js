/**
 * api/checkout.js — Create a Stripe Checkout session for reading credits
 *
 * POST /api/checkout
 * Body: { sessionId: string }
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_ID
 *   STRIPE_CREDITS_PER_PACK (default: 20)
 *   VITE_PUBLIC_URL         (default: https://love-landscape.com)
 */

const CREDITS_PER_PACK = parseInt(process.env.STRIPE_CREDITS_PER_PACK || '20', 10);

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, sku, resultId, partnerCode } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const isFullReading = sku === 'full_reading';
  const isCompatibility = sku === 'compatibility';
  const priceId = isFullReading ? process.env.STRIPE_PRICE_FULL_READING
    : isCompatibility ? process.env.STRIPE_PRICE_COMPATIBILITY
    : process.env.STRIPE_PRICE_ID;

  if (!stripeKey || !priceId) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://love-landscape.com';

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('metadata[session_id]', sessionId);
  params.append('allow_promotion_codes', 'true');

  if (isFullReading) {
    // Full Reading (F0.4): success returns to the purchased result's page.
    if (!resultId || !/^[0-9a-f-]{36}$/i.test(resultId)) {
      return res.status(400).json({ error: 'Missing resultId' });
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: result } = await supabase.from('results').select('code').eq('id', resultId).maybeSingle();
    if (!result) return res.status(404).json({ error: 'Result not found' });

    params.append('metadata[sku]', 'full_reading');
    params.append('metadata[result_id]', resultId);
    params.append('success_url', `${baseUrl}/?code=${encodeURIComponent(result.code)}&purchase=success`);
    params.append('cancel_url', `${baseUrl}/?code=${encodeURIComponent(result.code)}`);
  } else if (isCompatibility) {
    // Compatibility Report: needs the buyer's result AND the partner's code.
    // Success returns to the comparison so the report unlocks in place.
    if (!resultId || !/^[0-9a-f-]{36}$/i.test(resultId)) {
      return res.status(400).json({ error: 'Missing resultId' });
    }
    if (!partnerCode || !/^L[12]_[0-9A-Za-z_-]+$/.test(partnerCode)) {
      return res.status(400).json({ error: 'Missing or invalid partnerCode' });
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: result } = await supabase.from('results').select('code').eq('id', resultId).maybeSingle();
    if (!result) return res.status(404).json({ error: 'Result not found' });

    params.append('metadata[sku]', 'compatibility');
    params.append('metadata[result_id]', resultId);
    params.append('metadata[partner_code]', partnerCode);
    const back = `${baseUrl}/?code=${encodeURIComponent(result.code)}&compare=${encodeURIComponent(partnerCode)}`;
    params.append('success_url', `${back}&purchase=success`);
    params.append('cancel_url', back);
  } else {
    // Legacy credits pack — unchanged.
    params.append('success_url', `${baseUrl}?payment=success&session_id=${encodeURIComponent(sessionId)}`);
    params.append('cancel_url', `${baseUrl}?payment=cancelled`);
    params.append('metadata[credits]', String(CREDITS_PER_PACK));
  }

  let stripeResponse;
  try {
    stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  } catch (err) {
    return res.status(503).json({ error: 'Could not reach payment service' });
  }

  if (!stripeResponse.ok) {
    const errData = await stripeResponse.json().catch(() => ({}));
    return res.status(502).json({ error: errData.error?.message || 'Payment service error' });
  }

  const session = await stripeResponse.json();

  return res.json({
    checkoutUrl: session.url,
    creditsPerPack: CREDITS_PER_PACK,
  });
}
