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

  const supabase = getSupabase();

  // Refunds (F0.4): revoke Full Reading access. charge.refunded carries a
  // payment_intent, which we stored on the purchase at checkout completion.
  if (event.type === 'charge.refunded') {
    const paymentIntent = event.data.object?.payment_intent;
    if (paymentIntent) {
      await supabase
        .from('purchases')
        .update({ status: 'refunded' })
        .eq('payment_intent', paymentIntent);
    }
    return res.status(200).json({ received: true, refundProcessed: Boolean(paymentIntent) });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  // Idempotency: record the Stripe event id before acting on it. A redelivered
  // event hits the primary-key conflict and exits without granting twice.
  // Fail-open on any other error (e.g. migration not yet applied) — that is
  // exactly the legacy behavior, so this deploy can precede the migration.
  if (event.id) {
    const { error: dedupError } = await supabase
      .from('stripe_events')
      .insert({ event_id: event.id });
    if (dedupError) {
      if (dedupError.code === '23505') {
        return res.status(200).json({ received: true, duplicate: true });
      }
      console.warn('stripe_events dedup unavailable, proceeding without:', dedupError.message);
    }
  }

  const session = event.data.object;
  const { session_id: sessionId, credits, sku, result_id: resultId } = session.metadata || {};

  // Full Reading purchase (F0.4): record the entitlement + funnel milestone.
  // Generation happens on first api/reading.js request, not here.
  if (sku === 'full_reading') {
    if (!resultId) return res.status(200).json({ received: true, warning: 'Missing result_id' });

    const { data: inserted } = await supabase
      .from('purchases')
      .upsert({
        stripe_session_id: session.id,
        sku: 'full_reading',
        status: 'paid',
        amount_cents: session.amount_total ?? null,
        session_id: sessionId || null,
        result_id: resultId,
        payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      }, { onConflict: 'stripe_session_id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle();

    if (inserted) {
      // Milestone written only on the genuine first processing (upsert inserted).
      const { data: resultRow } = await supabase
        .from('results')
        .select('client_result_id, user_id, is_dev')
        .eq('id', resultId)
        .maybeSingle();
      await supabase.from('milestones').insert({
        kind: 'purchase',
        person_key: resultRow?.user_id || sessionId || 'unknown',
        client_result_id: resultRow?.client_result_id || null,
        meta: { sku: 'full_reading', amount_cents: session.amount_total ?? null },
        is_dev: Boolean(resultRow?.is_dev),
        happened_at: new Date().toISOString(),
      });
      // If the result already belongs to an account, attach the purchase to it.
      if (resultRow?.user_id) {
        await supabase.from('purchases').update({ user_id: resultRow.user_id }).eq('id', inserted.id);
      }
    }

    return res.status(200).json({ received: true, purchaseRecorded: true });
  }

  if (!sessionId || !credits) {
    return res.status(200).json({ received: true, warning: 'Missing metadata' });
  }

  const creditsToAdd = parseInt(credits, 10);
  if (!creditsToAdd || creditsToAdd <= 0) {
    return res.status(200).json({ received: true, warning: 'Invalid credits value' });
  }

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
