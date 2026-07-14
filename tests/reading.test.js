import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// ── In-memory store ──────────────────────────────────────────────────────────
const db = { results: new Map(), purchases: new Map() }; // keyed by id

function table(name) {
  if (name === 'results') {
    return {
      select: () => ({
        eq: (_c, id) => ({ maybeSingle: async () => ({ data: db.results.get(id) || null }) }),
      }),
    };
  }
  if (name === 'purchases') {
    return {
      select: () => ({
        eq: (_c, resultId) => ({
          eq: () => ({
            eq: (_c3, status) => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: [...db.purchases.values()].find((p) => p.result_id === resultId && p.status === status) || null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      update: (fields) => ({
        eq: async (_c, id) => {
          const p = db.purchases.get(id);
          if (p) Object.assign(p, fields);
          return { error: null };
        },
      }),
    };
  }
  throw new Error(`unexpected table ${name}`);
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: table, auth: { getUser: async () => ({ data: { user: null }, error: null }) } }),
}));

const { default: handler } = await import('../api/reading.js');

const TOKEN = 'a'.repeat(64);
const RESULT_ID = '99999999-9999-4999-8999-999999999999';
const GOOD_CODE = 'L2_' + 'AAAAAAAAAAAAAAAAAA';

function seedResult({ withPurchase = false, readingText = null, regens = 0 } = {}) {
  db.results.set(RESULT_ID, {
    id: RESULT_ID,
    code: GOOD_CODE,
    user_id: null,
    owner_token_hash: crypto.createHash('sha256').update(TOKEN).digest('hex'),
  });
  if (withPurchase) {
    db.purchases.set('p1', {
      id: 'p1', result_id: RESULT_ID, sku: 'full_reading', status: 'paid',
      reading_text: readingText, regen_count: regens,
    });
  }
}

function mockReq(body) {
  return { method: 'POST', headers: {}, body };
}
function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = () => {};
  res.end = () => res;
  return res;
}

const LONG_READING = '## The Shape of Your Landscape\n' + 'insight. '.repeat(120);

function mockOpenRouter(content = LONG_READING, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

beforeEach(() => {
  db.results.clear();
  db.purchases.clear();
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
});
afterEach(() => vi.restoreAllMocks());

describe('api/reading authorization', () => {
  it('403s without ownership proof', async () => {
    seedResult({ withPurchase: true });
    const res = mockRes();
    await handler(mockReq({ op: 'status', result_id: RESULT_ID }), res);
    expect(res.statusCode).toBe(403);
  });

  it('status reports entitlement to the owner', async () => {
    seedResult({ withPurchase: true });
    const res = mockRes();
    await handler(mockReq({ op: 'status', result_id: RESULT_ID, owner_token: TOKEN }), res);
    expect(res.body).toMatchObject({ entitled: true, has_reading: false, regens_left: 3 });
  });

  it('402s on get without a purchase', async () => {
    seedResult({ withPurchase: false });
    const res = mockRes();
    await handler(mockReq({ op: 'get', result_id: RESULT_ID, owner_token: TOKEN }), res);
    expect(res.statusCode).toBe(402);
  });
});

describe('api/reading generation', () => {
  it('generates on first get, caches, and serves the cache afterwards', async () => {
    seedResult({ withPurchase: true });
    const fetchSpy = mockOpenRouter();
    const res1 = mockRes();
    await handler(mockReq({ op: 'get', result_id: RESULT_ID, owner_token: TOKEN }), res1);
    expect(res1.body.reading).toContain('The Shape of Your Landscape');
    expect(db.purchases.get('p1').reading_text).toBe(res1.body.reading);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const res2 = mockRes();
    await handler(mockReq({ op: 'get', result_id: RESULT_ID, owner_token: TOKEN }), res2);
    expect(res2.body.reading).toBe(res1.body.reading);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // cache hit — no second generation
  });

  it('keeps the purchase valid when generation fails (free retry)', async () => {
    seedResult({ withPurchase: true });
    mockOpenRouter('', false);
    const res = mockRes();
    await handler(mockReq({ op: 'get', result_id: RESULT_ID, owner_token: TOKEN }), res);
    expect(res.statusCode).toBe(503);
    expect(db.purchases.get('p1').status).toBe('paid');
    expect(db.purchases.get('p1').reading_text).toBeNull();
  });

  it('enforces the regeneration limit', async () => {
    seedResult({ withPurchase: true, readingText: 'old', regens: 3 });
    const res = mockRes();
    await handler(mockReq({ op: 'regen', result_id: RESULT_ID, owner_token: TOKEN }), res);
    expect(res.statusCode).toBe(429);
    expect(res.body.reading).toBe('old'); // still get the cached one back
  });

  it('regen increments the counter and replaces the cache', async () => {
    seedResult({ withPurchase: true, readingText: 'old', regens: 1 });
    mockOpenRouter();
    const res = mockRes();
    await handler(mockReq({ op: 'regen', result_id: RESULT_ID, owner_token: TOKEN }), res);
    expect(res.body.regens_left).toBe(1);
    expect(db.purchases.get('p1').regen_count).toBe(2);
    expect(db.purchases.get('p1').reading_text).not.toBe('old');
  });

  it('rejects an invalid partner code before spending tokens', async () => {
    seedResult({ withPurchase: true });
    const fetchSpy = mockOpenRouter();
    const res = mockRes();
    await handler(mockReq({ op: 'get', result_id: RESULT_ID, owner_token: TOKEN, partner_code: 'garbage' }), res);
    expect(res.statusCode).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
