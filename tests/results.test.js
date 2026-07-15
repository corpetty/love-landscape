import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ── In-memory Supabase mock (tables used by api/results.js create/compare) ──
const db = {
  results: new Map(),      // client_result_id → row
  milestones: [],
  comparisons: [],
  rateAllowed: true,
  tombstoned: new Set(),   // erased session_ids
};

function findResult(col, val) {
  return [...db.results.values()].find((r) => r[col] === val) || null;
}

function resultsTable() {
  return {
    upsert: (row, opts) => ({
      select: () => ({
        maybeSingle: async () => {
          if (db.results.has(row.client_result_id)) return { data: null, error: null }; // ignoreDuplicates
          const stored = { id: crypto.randomUUID(), user_id: null, ...row };
          db.results.set(row.client_result_id, stored);
          return { data: { id: stored.id }, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (col, val) => ({
        maybeSingle: async () => ({ data: findResult(col, val) }),
        order: async () => ({ data: [...db.results.values()].filter((r) => r[col] === val), error: null }),
      }),
    }),
    delete: () => ({
      eq: async (col, val) => {
        const row = findResult(col, val);
        if (row) db.results.delete(row.client_result_id);
        return { error: null };
      },
    }),
  };
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      if (table === 'results') return resultsTable();
      if (table === 'milestones') return { insert: async (row) => { db.milestones.push(row); return { error: null }; } };
      if (table === 'comparisons') return { insert: async (row) => { db.comparisons.push(row); return { error: null }; } };
      if (table === 'deleted_sessions') {
        return {
          select: () => ({
            eq: (_c, sid) => ({
              maybeSingle: async () => ({ data: db.tombstoned.has(sid) ? { session_id: sid } : null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: async () => ({ data: db.rateAllowed, error: null }),
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));

const { default: handler } = await import('../api/results.js');

function mockReq(body, headers = {}) {
  return { method: 'POST', headers, socket: { remoteAddress: '203.0.113.7' }, body };
}
function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = () => {};
  res.end = () => res;
  return res;
}

const SESSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CRID = '12345678-1234-1234-1234-123456789abc';
const TOKEN = 'a'.repeat(64);
const GOOD_CODE = 'L2_' + 'AAAAAAAAAAAAAAAAAA'; // 13 zero bytes — decodes

function createBody(overrides = {}) {
  return {
    op: 'create',
    client_result_id: CRID,
    session_id: SESSION,
    code: GOOD_CODE,
    owner_token: TOKEN,
    variant: 1,
    completed_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  db.results.clear();
  db.milestones.length = 0;
  db.comparisons.length = 0;
  db.rateAllowed = true;
  db.tombstoned.clear();
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('results create', () => {
  it('creates a result and writes exactly one create milestone', async () => {
    const res = mockRes();
    await handler(mockReq(createBody()), res);
    expect(res.statusCode).toBeNull(); // res.json without explicit status → 200 path
    expect(res.body.created).toBe(true);
    expect(res.body.result_id).toBeTruthy();
    expect(db.milestones.filter((m) => m.kind === 'create')).toHaveLength(1);
  });

  it('is idempotent: a retry returns the same result_id and writes no second milestone', async () => {
    const res1 = mockRes();
    await handler(mockReq(createBody()), res1);
    const res2 = mockRes();
    await handler(mockReq(createBody()), res2);
    expect(res2.body.created).toBe(false);
    expect(res2.body.result_id).toBe(res1.body.result_id);
    expect(db.milestones.filter((m) => m.kind === 'create')).toHaveLength(1);
  });

  it('rejects an undecodable code', async () => {
    const res = mockRes();
    await handler(mockReq(createBody({ code: 'L2_short' })), res);
    expect(res.statusCode).toBe(400);
    expect(db.results.size).toBe(0);
  });

  it.each([
    ['client_result_id', 'not-a-uuid'],
    ['session_id', 'nope'],
    ['owner_token', 'tooshort'],
    ['status', 'married'],
  ])('rejects invalid %s', async (field, value) => {
    const res = mockRes();
    await handler(mockReq(createBody({ [field]: value })), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 429 when rate limited, storing nothing', async () => {
    db.rateAllowed = false;
    const res = mockRes();
    await handler(mockReq(createBody()), res);
    expect(res.statusCode).toBe(429);
    expect(db.results.size).toBe(0);
  });

  it('clamps a future happened_at to now', async () => {
    await handler(mockReq(createBody({ completed_at: '2999-01-01T00:00:00Z' })), mockRes());
    const m = db.milestones.find((x) => x.kind === 'create');
    expect(Date.parse(m.happened_at)).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('flags dev traffic from the self-declared body flag', async () => {
    await handler(mockReq(createBody({ is_dev: true })), mockRes());
    const m = db.milestones.find((x) => x.kind === 'create');
    expect(m.is_dev).toBe(true);
    expect(db.results.get(CRID).is_dev).toBe(true);
  });
});

describe('results compare', () => {
  it('writes a compare milestone with a code hash, not the code', async () => {
    const res = mockRes();
    await handler(mockReq({ op: 'compare', session_id: SESSION, partner_code: GOOD_CODE }), res);
    expect(res.body.ok).toBe(true);
    const m = db.milestones.find((x) => x.kind === 'compare');
    expect(m.meta.partner_code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(m)).not.toContain(GOOD_CODE);
    expect(db.comparisons).toHaveLength(0); // save not requested
  });

  it('stores the code as owned content only when save is requested', async () => {
    await handler(mockReq({ op: 'compare', session_id: SESSION, partner_code: GOOD_CODE, save: true }), mockRes());
    expect(db.comparisons).toHaveLength(1);
    expect(db.comparisons[0].partner_code).toBe(GOOD_CODE);
  });
});

describe('router', () => {
  it('rejects unknown ops', async () => {
    const res = mockRes();
    await handler(mockReq({ op: 'delete_everything' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('requires sign-in for claim and list', async () => {
    for (const body of [{ op: 'claim', tokens: [TOKEN] }, { op: 'list' }]) {
      const res = mockRes();
      await handler(mockReq(body), res);
      expect(res.statusCode).toBe(401);
    }
  });

  it('delete requires ownership proof', async () => {
    await handler(mockReq(createBody()), mockRes());
    const resultId = db.results.get(CRID).id;
    // No token, no JWT → 403; wrong token → 403; right token → ok.
    const res1 = mockRes();
    await handler(mockReq({ op: 'delete', result_id: resultId }), res1);
    expect(res1.statusCode).toBe(403);
    const res2 = mockRes();
    await handler(mockReq({ op: 'delete', result_id: resultId, owner_token: 'b'.repeat(64) }), res2);
    expect(res2.statusCode).toBe(403);
    const res3 = mockRes();
    await handler(mockReq({ op: 'delete', result_id: resultId, owner_token: TOKEN }), res3);
    expect(res3.body?.ok).toBe(true);
    expect(db.results.size).toBe(0);
  });
});

describe('deletion tombstones', () => {
  it('rejects creates from an erased session with 410', async () => {
    db.tombstoned.add(SESSION);
    const res = mockRes();
    await handler(mockReq(createBody()), res);
    expect(res.statusCode).toBe(410);
    expect(res.body.drop).toBe(true);
    expect(db.results.size).toBe(0);
    expect(db.milestones).toHaveLength(0);
  });
});
