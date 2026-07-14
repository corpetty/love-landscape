import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { Readable } from 'stream';

// ── Mock Supabase with an in-memory store ───────────────────────────────────
const db = {
  stripe_events: new Set(),
  reading_sessions: new Map(), // session_id → row
  purchases: new Map(),        // stripe_session_id → row
  results: new Map(),          // id → row
  milestones: [],
  dedupUnavailable: false,     // simulate migration not applied
  purchasesError: null,        // 'column' = payment_intent missing; 'hard' = always fail
};

function mockFrom(table) {
  if (table === 'stripe_events') {
    return {
      insert: async ({ event_id }) => {
        if (db.dedupUnavailable) {
          return { error: { code: '42P01', message: 'relation "stripe_events" does not exist' } };
        }
        if (db.stripe_events.has(event_id)) {
          return { error: { code: '23505', message: 'duplicate key' } };
        }
        db.stripe_events.add(event_id);
        return { error: null };
      },
      delete: () => ({
        eq: async (_col, eventId) => {
          db.stripe_events.delete(eventId);
          return { error: null };
        },
      }),
    };
  }
  if (table === 'purchases') {
    return {
      upsert: (row) => ({
        select: () => ({
          maybeSingle: async () => {
            if (db.purchasesError === 'hard') {
              return { data: null, error: { message: 'insert failed' } };
            }
            if (db.purchasesError === 'column' && 'payment_intent' in row) {
              return { data: null, error: { message: "Could not find the 'payment_intent' column of 'purchases' in the schema cache" } };
            }
            if (db.purchases.has(row.stripe_session_id)) return { data: null, error: null };
            const stored = { id: `p-${db.purchases.size + 1}`, user_id: null, ...row };
            db.purchases.set(row.stripe_session_id, stored);
            return { data: { id: stored.id }, error: null };
          },
        }),
      }),
      update: (fields) => ({
        eq: async (col, val) => {
          for (const p of db.purchases.values()) {
            if (p[col === 'payment_intent' ? 'payment_intent' : col] === val || p.id === val) {
              if (p[col] === val) Object.assign(p, fields);
            }
          }
          return { error: null };
        },
      }),
    };
  }
  if (table === 'results') {
    return {
      select: () => ({
        eq: (_c, id) => ({ maybeSingle: async () => ({ data: db.results.get(id) || null }) }),
      }),
    };
  }
  if (table === 'milestones') {
    return { insert: async (row) => { db.milestones.push(row); return { error: null }; } };
  }
  if (table === 'reading_sessions') {
    return {
      select: () => ({
        eq: (_col, id) => ({
          maybeSingle: async () => ({ data: db.reading_sessions.get(id) ?? null }),
        }),
      }),
      update: (fields) => ({
        eq: async (_col, id) => {
          const row = db.reading_sessions.get(id);
          if (row) Object.assign(row, fields);
          return { error: null };
        },
      }),
      insert: async (row) => {
        db.reading_sessions.set(row.session_id, { ...row });
        return { error: null };
      },
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

const { default: handler } = await import('../api/webhook.js');

// ── Request/response helpers with real Stripe signatures ────────────────────
const SECRET = 'whsec_test_secret';

function signedRequest(event) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', SECRET).update(`${t}.${body}`, 'utf8').digest('hex');
  const req = Readable.from([Buffer.from(body)]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': `t=${t},v1=${v1}` };
  return req;
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

function checkoutEvent(id, sessionId, credits) {
  return {
    id,
    type: 'checkout.session.completed',
    data: { object: { metadata: { session_id: sessionId, credits: String(credits) } } },
  };
}

const SESSION = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  db.stripe_events.clear();
  db.reading_sessions.clear();
  db.purchases.clear();
  db.results.clear();
  db.milestones.length = 0;
  db.dedupUnavailable = false;
  db.purchasesError = null;
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('webhook signature verification', () => {
  it('rejects a missing signature', async () => {
    const req = Readable.from([Buffer.from('{}')]);
    req.method = 'POST';
    req.headers = {};
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a tampered body', async () => {
    const req = signedRequest(checkoutEvent('evt_1', SESSION, 20));
    // Re-wrap with a different body but the original (now wrong) signature.
    const tampered = Readable.from([Buffer.from('{"id":"evt_1","type":"checkout.session.completed"}')]);
    tampered.method = 'POST';
    tampered.headers = req.headers;
    const res = mockRes();
    await handler(tampered, res);
    expect(res.statusCode).toBe(400);
  });
});

describe('webhook idempotency', () => {
  it('grants credits once on first delivery', async () => {
    const res = mockRes();
    await handler(signedRequest(checkoutEvent('evt_1', SESSION, 20)), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.creditsAdded).toBe(20);
    expect(db.reading_sessions.get(SESSION).credits_purchased).toBe(20);
  });

  it('does not grant twice for a redelivered event', async () => {
    await handler(signedRequest(checkoutEvent('evt_1', SESSION, 20)), mockRes());
    const res2 = mockRes();
    await handler(signedRequest(checkoutEvent('evt_1', SESSION, 20)), res2);
    expect(res2.statusCode).toBe(200);
    expect(res2.body.duplicate).toBe(true);
    expect(db.reading_sessions.get(SESSION).credits_purchased).toBe(20); // unchanged
  });

  it('grants separately for distinct events on the same session', async () => {
    await handler(signedRequest(checkoutEvent('evt_1', SESSION, 20)), mockRes());
    await handler(signedRequest(checkoutEvent('evt_2', SESSION, 20)), mockRes());
    expect(db.reading_sessions.get(SESSION).credits_purchased).toBe(40);
  });

  it('fails open (legacy behavior) when the dedup table is missing', async () => {
    db.dedupUnavailable = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = mockRes();
    await handler(signedRequest(checkoutEvent('evt_1', SESSION, 20)), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.creditsAdded).toBe(20);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ignores non-checkout events without touching the dedup table', async () => {
    const res = mockRes();
    await handler(signedRequest({ id: 'evt_x', type: 'invoice.paid', data: { object: {} } }), res);
    expect(res.statusCode).toBe(200);
    expect(db.stripe_events.size).toBe(0);
  });
});

describe('webhook full_reading purchases (F0.4)', () => {
  const RESULT_ID = '99999999-9999-4999-8999-999999999999';

  function fullReadingEvent(id, stripeSessionId) {
    return {
      id,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: stripeSessionId,
          amount_total: 1200,
          payment_intent: 'pi_123',
          metadata: { sku: 'full_reading', result_id: RESULT_ID, session_id: SESSION },
        },
      },
    };
  }

  beforeEach(() => {
    db.results.set(RESULT_ID, { id: RESULT_ID, client_result_id: 'crid-1', user_id: null, is_dev: false });
  });

  it('records the purchase and exactly one milestone', async () => {
    const res = mockRes();
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), res);
    expect(res.body.purchaseRecorded).toBe(true);
    const p = db.purchases.get('cs_1');
    expect(p).toMatchObject({ sku: 'full_reading', status: 'paid', amount_cents: 1200, payment_intent: 'pi_123' });
    expect(db.milestones.filter((m) => m.kind === 'purchase')).toHaveLength(1);
  });

  it('redelivered event neither duplicates the purchase nor the milestone', async () => {
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), mockRes());
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), mockRes());
    expect(db.purchases.size).toBe(1);
    expect(db.milestones.filter((m) => m.kind === 'purchase')).toHaveLength(1);
  });

  it('same purchase under a different event id still records once (stripe_session_id unique)', async () => {
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), mockRes());
    await handler(signedRequest(fullReadingEvent('evt_fr2', 'cs_1')), mockRes());
    expect(db.purchases.size).toBe(1);
    expect(db.milestones.filter((m) => m.kind === 'purchase')).toHaveLength(1);
  });

  it('charge.refunded revokes by payment_intent', async () => {
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), mockRes());
    const res = mockRes();
    await handler(signedRequest({
      id: 'evt_refund1',
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_123' } },
    }), res);
    expect(res.body.refundProcessed).toBe(true);
    expect(db.purchases.get('cs_1').status).toBe('refunded');
  });

  it('legacy credits purchases still work alongside', async () => {
    await handler(signedRequest(checkoutEvent('evt_c1', SESSION, 20)), mockRes());
    expect(db.reading_sessions.get(SESSION).credits_purchased).toBe(20);
    expect(db.purchases.size).toBe(0);
  });

  it('falls back without payment_intent when migration 005 is missing (paying customer > refund mapping)', async () => {
    db.purchasesError = 'column';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = mockRes();
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), res);
    expect(res.body.purchaseRecorded).toBe(true);
    const p = db.purchases.get('cs_1');
    expect(p.status).toBe('paid');
    expect('payment_intent' in p).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('on a hard write failure: releases the dedup row and 500s so Stripe retries can succeed', async () => {
    db.purchasesError = 'hard';
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res1 = mockRes();
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), res1);
    expect(res1.statusCode).toBe(500);
    expect(db.stripe_events.has('evt_fr1')).toBe(false); // released — not eaten
    expect(db.purchases.size).toBe(0);

    // Stripe retries after the underlying problem is fixed:
    db.purchasesError = null;
    const res2 = mockRes();
    await handler(signedRequest(fullReadingEvent('evt_fr1', 'cs_1')), res2);
    expect(res2.body.purchaseRecorded).toBe(true);
    expect(db.purchases.get('cs_1').status).toBe('paid');
    errSpy.mockRestore();
  });
});
