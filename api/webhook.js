/**
 * api/webhook.js — Stripe webhook handler
 *
 * Listens for checkout.session.completed and credits the user's
 * reading_sessions row in Supabase.
 *
 * Required env vars:
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing so we can verify the raw Stripe signature
export const config = {
  api: { bodyParser: false },
};

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(rawBody, sigHeader, secret) {
  try {
    const parts = sigHeader.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});

    if (!parts.t || !parts.v1) return false;

    const payloadToSign = `${parts.t}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', secret).update(payloadToSign, 'utf8').digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(parts.v1, 'hex'),
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: 'Webhook secret not configured' });
  }

  const rawBody = await getRawBody(req);
  const sigHeader = req.headers['stripe-signature'];

  if (!sigHeader || !verifyStripeSignature(rawBody.toString('utf8'), sigHeader, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const { session_id: sessionId, credits } = session.metadata || {};

  if (!sessionId || !credits) {
    return res.status(200).json({ received: true, warning: 'Missing metadata' });
  }

  const creditsToAdd = parseInt(credits, 10);
  if (!creditsToAdd || creditsToAdd <= 0) {
    return res.status(200).json({ received: true, warning: 'Invalid credits value' });
  }

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('reading_sessions')
    .select('credits_purchased')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('reading_sessions')
      .update({ credits_purchased: existing.credits_purchased + creditsToAdd })
      .eq('session_id', sessionId);
  } else {
    await supabase
      .from('reading_sessions')
      .insert({
        session_id: sessionId,
        free_credits: parseInt(process.env.FREE_CREDITS || '5', 10),
        readings_used: 0,
        credits_purchased: creditsToAdd,
      });
  }

  return res.status(200).json({ received: true, creditsAdded: creditsToAdd });
}
