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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_PRICE_ID;

  if (!stripeKey || !priceId) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://love-landscape.com';

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', `${baseUrl}?payment=success&session_id=${encodeURIComponent(sessionId)}`);
  params.append('cancel_url', `${baseUrl}?payment=cancelled`);
  params.append('metadata[session_id]', sessionId);
  params.append('metadata[credits]', String(CREDITS_PER_PACK));
  params.append('allow_promotion_codes', 'true');

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
