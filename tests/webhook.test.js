import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { Readable } from 'stream';

// ── Mock Supabase with an in-memory store ───────────────────────────────────
const db = {
  stripe_events: new Set(),
  reading_sessions: new Map(), // session_id → row
  dedupUnavailable: false,     // simulate migration not applied
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
    };
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
  db.dedupUnavailable = false;
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
