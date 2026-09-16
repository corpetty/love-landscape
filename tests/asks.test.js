import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

/**
 * A small chainable Supabase mock — enough of the query builder for the ask
 * ops (filters, order/limit, maybeSingle, thenable arrays, upsert-on-conflict,
 * and the asks→results join). Built once here rather than bolted onto
 * tests/results.test.js, whose mock is deliberately minimal.
 *
 * Two deliberate departures from the real thing, both of which make the tests
 * stricter rather than looser:
 *   - it does NOT apply column defaults, so any code that reads a value it
 *     never wrote shows up here rather than in production;
 *   - it does NOT project columns, so a response that only avoids leaking a
 *     field because of the SELECT string fails here. Privacy has to be in the
 *     code that builds the response.
 */
const db = { results: [], asks: [], placements: [], milestones: [], rateAllowed: true };

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const matches = (row, filters) => filters.every(([kind, col, val]) => (
  kind === 'eq' ? row[col] === val : row[col] !== val
));

class Query {
  constructor(rows, name) {
    this.rows = rows;
    this.name = name;
    this.filters = [];
    this.mode = 'select';
    this.cols = '';
    this.payload = null;
    this.limitN = null;
  }
  select(cols = '') { this.cols = cols; return this; }
  eq(col, val) { this.filters.push(['eq', col, val]); return this; }
  neq(col, val) { this.filters.push(['neq', col, val]); return this; }
  is(col, val) { this.filters.push(['eq', col, val]); return this; }
  order() { return this; }
  limit(n) { this.limitN = n; return this; }

  insert(row) {
    this.mode = 'insert';
    this.payload = row;
    return this;
  }
  upsert(row, opts = {}) {
    this.mode = 'upsert';
    this.payload = row;
    this.conflict = opts.onConflict;
    return this;
  }
  update(patch) { this.mode = 'update'; this.payload = patch; return this; }
  delete() { this.mode = 'delete'; return this; }

  _hydrate(row) {
    if (!row) return row;
    // asks → results join, as written in the real select string.
    if (this.cols.includes('results(')) {
      const r = db.results.find((x) => x.id === row.owner_result_id) || null;
      return { ...row, results: r && { code: r.code, user_id: r.user_id, session_id: r.session_id } };
    }
    return row;
  }

  _run() {
    if (this.mode === 'insert') {
      const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...this.payload };
      if (this.name === 'asks' && db.asks.some((a) => a.slug === row.slug)) {
        return { data: null, error: { code: '23505' } };
      }
      this.rows.push(row);
      return { data: row, error: null };
    }
    if (this.mode === 'upsert') {
      const keys = (this.conflict || '').split(',').map((k) => k.trim()).filter(Boolean);
      const existing = keys.length
        ? this.rows.find((r) => keys.every((k) => r[k] === this.payload[k]))
        : null;
      if (existing) Object.assign(existing, this.payload);
      else this.rows.push({ id: crypto.randomUUID(), ...this.payload });
      return { data: null, error: null };
    }
    const hit = this.rows.filter((r) => matches(r, this.filters));
    if (this.mode === 'update') {
      hit.forEach((r) => Object.assign(r, this.payload));
      return { data: null, error: null };
    }
    if (this.mode === 'delete') {
      for (const r of hit) this.rows.splice(this.rows.indexOf(r), 1);
      return { data: null, error: null };
    }
    const out = this.limitN ? hit.slice(0, this.limitN) : hit;
    return { data: out.map((r) => this._hydrate(r)), error: null };
  }

  async maybeSingle() {
    const { data, error } = this._run();
    if (error) return { data: null, error };
    if (this.mode !== 'select') return { data, error: null };
    return { data: data[0] ?? null, error: null };
  }
  then(resolve, reject) { return Promise.resolve(this._run()).then(resolve, reject); }
}

let currentUser = null;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (name) => {
      if (name === 'milestones') return { insert: async (row) => { db.milestones.push(row); return { error: null }; } };
      const tables = { results: db.results, asks: db.asks, placements: db.placements };
      if (!tables[name]) throw new Error(`unexpected table ${name}`);
      return new Query(tables[name], name);
    },
    rpc: async () => ({ data: db.rateAllowed, error: null }),
    auth: { getUser: async () => ({ data: { user: currentUser }, error: currentUser ? null : { message: 'no' } }) },
  }),
}));

const { default: handler, cleanPoint } = await import('../api/results.js');

const SESSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OTHER_SESSION = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
const CRID = '12345678-1234-1234-1234-123456789abc';
const OWNER_TOKEN = 'a'.repeat(64);
const ANSWER_TOKEN = 'b'.repeat(64);
const OTHER_ANSWER_TOKEN = 'c'.repeat(64);
const CODE = 'L2_AAAAAAAAAAAAAAAAAA';
let RESULT_ID;

function req(body, headers = {}) {
  return { method: 'POST', headers, socket: { remoteAddress: '203.0.113.7' }, body };
}
function res() {
  const r = { statusCode: null, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = () => {};
  r.end = () => r;
  return r;
}
async function call(body, headers) {
  const r = res();
  await handler(req(body, headers), r);
  return r;
}

const ownerAuth = { result_id: () => RESULT_ID, owner_token: OWNER_TOKEN };
const createAsk = (point = { x: 0.2, y: 0.8 }) =>
  call({ op: 'ask_create', result_id: RESULT_ID, owner_token: OWNER_TOKEN, session_id: SESSION, point });

beforeEach(() => {
  db.results.length = 0;
  db.asks.length = 0;
  db.placements.length = 0;
  db.milestones.length = 0;
  db.rateAllowed = true;
  currentUser = null;
  RESULT_ID = crypto.randomUUID();
  db.results.push({
    id: RESULT_ID,
    client_result_id: CRID,
    session_id: SESSION,
    user_id: null,
    owner_token_hash: sha256(OWNER_TOKEN),
    code: CODE,
    is_public: false,
    slug: null,
    first_published_at: null,
    is_dev: false,
  });
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('cleanPoint', () => {
  it('accepts a bare point and leaves the optional fields unset', () => {
    expect(cleanPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75, exclusivity: null, note: null });
  });

  it('keeps an exclusivity wish of zero distinct from no wish at all', () => {
    // 0 means "as open as possible" and null means "did not say" — collapsing
    // them would make the reading assert something nobody claimed.
    expect(cleanPoint({ x: 0.5, y: 0.5, exclusivity: 0 }).exclusivity).toBe(0);
    expect(cleanPoint({ x: 0.5, y: 0.5 }).exclusivity).toBeNull();
    expect(cleanPoint({ x: 0.5, y: 0.5, exclusivity: null }).exclusivity).toBeNull();
  });

  it('trims a note, drops an empty one, and caps the length', () => {
    expect(cleanPoint({ x: 0.5, y: 0.5, note: '  hello  ' }).note).toBe('hello');
    expect(cleanPoint({ x: 0.5, y: 0.5, note: '   ' }).note).toBeNull();
    expect(cleanPoint({ x: 0.5, y: 0.5, note: 'z'.repeat(400) }).note).toHaveLength(280);
  });

  it.each([
    [null], [undefined], ['0.5,0.5'],
    [{ x: 2, y: 0.5 }], [{ x: -0.1, y: 0.5 }], [{ x: 0.5, y: 1.5 }],
    [{ x: NaN, y: 0.5 }], [{ x: '0.5', y: 0.5 }], [{ y: 0.5 }],
  ])('refuses %j', (raw) => {
    expect(cleanPoint(raw).error).toBeTruthy();
  });

  it('refuses an out-of-range exclusivity rather than clamping it', () => {
    expect(cleanPoint({ x: 0.5, y: 0.5, exclusivity: 5 }).error).toBeTruthy();
    expect(cleanPoint({ x: 0.5, y: 0.5, exclusivity: 'high' }).error).toBeTruthy();
  });
});

describe('ask_create', () => {
  it('opens an ask, stores the owner pin, and writes one ask milestone', async () => {
    const r = await createAsk();
    expect(r.body.slug).toMatch(/^[1-9A-HJ-NP-Za-km-z]{10}$/);
    expect(db.asks).toHaveLength(1);
    expect(db.placements).toHaveLength(1);
    expect(db.placements[0]).toMatchObject({ author_role: 'owner', kind: 'current', x: 0.2, y: 0.8 });
    expect(db.milestones.filter((m) => m.kind === 'ask')).toHaveLength(1);
  });

  it('reuses the open ask, so a link already sent keeps working', async () => {
    const first = await createAsk({ x: 0.2, y: 0.8 });
    const second = await createAsk({ x: 0.7, y: 0.3 });
    expect(second.body.slug).toBe(first.body.slug);
    expect(db.asks).toHaveLength(1);
    // The pin is revised in place rather than duplicated.
    expect(db.placements).toHaveLength(1);
    expect(db.placements[0]).toMatchObject({ x: 0.7, y: 0.3 });
    expect(db.milestones.filter((m) => m.kind === 'ask')).toHaveLength(1);
  });

  it('refuses someone who cannot prove they own the landscape', async () => {
    const r = await call({ op: 'ask_create', result_id: RESULT_ID, owner_token: 'd'.repeat(64), session_id: SESSION, point: { x: 0.5, y: 0.5 } });
    expect(r.statusCode).toBe(403);
    expect(db.asks).toHaveLength(0);
  });

  it('refuses a malformed pin', async () => {
    const r = await createAsk({ x: 5, y: 0.5 });
    expect(r.statusCode).toBe(400);
    expect(db.asks).toHaveLength(0);
  });

  it('respects the rate limiter', async () => {
    db.rateAllowed = false;
    expect((await createAsk()).statusCode).toBe(429);
  });
});

describe('ask_get — what the link may know before it is answered', () => {
  it('returns the landscape so the question can be asked', async () => {
    const { body: { slug } } = await createAsk();
    const r = await call({ op: 'ask_get', slug });
    expect(r.body.code).toBe(CODE);
    expect(r.body.answered).toBe(false);
  });

  it('never returns the sender\'s pin', async () => {
    // The sealed reveal is enforced here, not in the UI: a visitor reading the
    // network response must learn nothing they could anchor their answer to.
    const { body: { slug } } = await createAsk({ x: 0.2, y: 0.8 });
    const r = await call({ op: 'ask_get', slug });
    expect(JSON.stringify(r.body)).not.toContain('0.8');
    expect(r.body.owner_point).toBeUndefined();
  });

  it.each([['notaslug'], [''], [null], ['!!!!!!!!!!']])('410s for the malformed slug %j', async (slug) => {
    expect((await call({ op: 'ask_get', slug })).statusCode).toBe(410);
  });

  it('410s for a withdrawn ask', async () => {
    const { body: { slug } } = await createAsk();
    await call({ op: 'ask_withdraw', result_id: RESULT_ID, owner_token: OWNER_TOKEN });
    expect((await call({ op: 'ask_get', slug })).statusCode).toBe(410);
  });
});

describe('ask_answer', () => {
  const answer = (slug, extra = {}) => call({
    op: 'ask_answer',
    slug,
    session_id: OTHER_SESSION,
    answer_token: ANSWER_TOKEN,
    point: { x: 0.8, y: 0.3 },
    ...extra,
  });

  it('stores the answer and reveals the sender\'s pin in the same response', async () => {
    const { body: { slug } } = await createAsk({ x: 0.2, y: 0.8 });
    const r = await answer(slug);
    expect(r.body.ok).toBe(true);
    // Exactly three fields: the place and the agreement, never the words.
    expect(r.body.owner_point).toEqual({ x: 0.2, y: 0.8, exclusivity: null });
    expect(Object.keys(r.body.owner_point)).not.toContain('note');
    expect(r.body.code).toBe(CODE);
    expect(db.placements.filter((p) => p.author_role === 'partner')).toHaveLength(1);
  });

  it('needs no account and no landscape of its own', async () => {
    // currentUser stays null and no result exists for the answerer: a guest
    // answer is the designed path, not a fallback.
    const { body: { slug } } = await createAsk();
    expect((await answer(slug)).body.ok).toBe(true);
  });

  it('marks the ask answered and counts it once', async () => {
    const { body: { slug } } = await createAsk();
    await answer(slug);
    expect(db.asks[0].status).toBe('answered');
    expect(db.milestones.filter((m) => m.kind === 'ask_answered')).toHaveLength(1);
  });

  it('revises rather than duplicating when the same device answers again', async () => {
    const { body: { slug } } = await createAsk();
    await answer(slug);
    const second = await answer(slug, { point: { x: 0.1, y: 0.9 } });
    expect(second.body.revised).toBe(true);
    expect(db.placements.filter((p) => p.author_role === 'partner')).toHaveLength(1);
    expect(db.placements.find((p) => p.author_role === 'partner')).toMatchObject({ x: 0.1, y: 0.9 });
    expect(db.milestones.filter((m) => m.kind === 'ask_answered')).toHaveLength(1);
  });

  it('refuses a second person trying to overwrite the first one\'s answer', async () => {
    const { body: { slug } } = await createAsk();
    await answer(slug);
    const intruder = await answer(slug, { answer_token: OTHER_ANSWER_TOKEN, point: { x: 0, y: 0 } });
    expect(intruder.statusCode).toBe(409);
    expect(db.placements.find((p) => p.author_role === 'partner')).toMatchObject({ x: 0.8, y: 0.3 });
  });

  it('keeps the sender\'s own note private even at reveal', async () => {
    // The owner's note is their private reading of the relationship, written
    // before the question went out. The pin is shared; the words are not.
    await createAsk({ x: 0.2, y: 0.8 });
    db.placements[0].note = 'I think this has stalled';
    const r = await answer(db.asks[0].slug);
    expect(JSON.stringify(r.body)).not.toContain('stalled');
  });

  it('stores the answerer\'s own note and wish', async () => {
    const { body: { slug } } = await createAsk();
    await answer(slug, { point: { x: 0.6, y: 0.8, exclusivity: 0.9, note: 'closer, but slowly' } });
    expect(db.placements.find((p) => p.author_role === 'partner')).toMatchObject({
      exclusivity: 0.9, note: 'closer, but slowly',
    });
  });

  it.each([
    ['answer_token', { answer_token: 'short' }],
    ['session_id', { session_id: 'nope' }],
    ['point', { point: { x: 9, y: 9 } }],
  ])('refuses a bad %s', async (_field, override) => {
    const { body: { slug } } = await createAsk();
    expect((await answer(slug, override)).statusCode).toBe(400);
  });

  it('410s once the sender has closed the question', async () => {
    const { body: { slug } } = await createAsk();
    await call({ op: 'ask_withdraw', result_id: RESULT_ID, owner_token: OWNER_TOKEN });
    expect((await answer(slug)).statusCode).toBe(410);
  });
});

describe('ask_status — the sender checking back', () => {
  it('reports no ask before one is opened', async () => {
    const r = await call({ op: 'ask_status', result_id: RESULT_ID, owner_token: OWNER_TOKEN });
    expect(r.body.ask).toBeNull();
  });

  it('returns both pins once the question comes back', async () => {
    const { body: { slug } } = await createAsk({ x: 0.2, y: 0.8 });
    await call({ op: 'ask_answer', slug, session_id: OTHER_SESSION, answer_token: ANSWER_TOKEN, point: { x: 0.8, y: 0.3, note: 'closer' } });
    const r = await call({ op: 'ask_status', result_id: RESULT_ID, owner_token: OWNER_TOKEN });
    expect(r.body.ask).toMatchObject({ slug, status: 'answered' });
    expect(r.body.owner_point).toMatchObject({ x: 0.2, y: 0.8 });
    expect(r.body.partner_point).toMatchObject({ x: 0.8, y: 0.3, note: 'closer' });
  });

  it('refuses anyone who cannot prove they own the landscape', async () => {
    await createAsk();
    const r = await call({ op: 'ask_status', result_id: RESULT_ID, owner_token: 'd'.repeat(64) });
    expect(r.statusCode).toBe(403);
  });
});

describe('ask_withdraw — taking it back', () => {
  it('lets the sender close the question for good', async () => {
    await createAsk();
    const r = await call({ op: 'ask_withdraw', result_id: RESULT_ID, owner_token: OWNER_TOKEN });
    expect(r.body.withdrawn).toBe('ask');
    expect(db.asks[0].status).toBe('withdrawn');
  });

  it('refuses a stranger trying to close someone else\'s question', async () => {
    await createAsk();
    const r = await call({ op: 'ask_withdraw', result_id: RESULT_ID, owner_token: 'd'.repeat(64) });
    expect(r.statusCode).toBe(403);
    expect(db.asks[0].status).toBe('open');
  });

  it('lets the answerer delete their own answer and reopens the question', async () => {
    const { body: { slug } } = await createAsk();
    await call({ op: 'ask_answer', slug, session_id: OTHER_SESSION, answer_token: ANSWER_TOKEN, point: { x: 0.8, y: 0.3 } });
    const r = await call({ op: 'ask_withdraw', slug, answer_token: ANSWER_TOKEN });
    expect(r.body.withdrawn).toBe('answer');
    expect(db.placements.filter((p) => p.author_role === 'partner')).toHaveLength(0);
    expect(db.asks[0].status).toBe('open');
  });

  it('refuses to delete an answer on the strength of the wrong token', async () => {
    const { body: { slug } } = await createAsk();
    await call({ op: 'ask_answer', slug, session_id: OTHER_SESSION, answer_token: ANSWER_TOKEN, point: { x: 0.8, y: 0.3 } });
    const r = await call({ op: 'ask_withdraw', slug, answer_token: OTHER_ANSWER_TOKEN });
    expect(r.statusCode).toBe(403);
    expect(db.placements.filter((p) => p.author_role === 'partner')).toHaveLength(1);
  });

  it('leaves the owner pin in place when the answer is withdrawn', async () => {
    const { body: { slug } } = await createAsk({ x: 0.2, y: 0.8 });
    await call({ op: 'ask_answer', slug, session_id: OTHER_SESSION, answer_token: ANSWER_TOKEN, point: { x: 0.8, y: 0.3 } });
    await call({ op: 'ask_withdraw', slug, answer_token: ANSWER_TOKEN });
    expect(db.placements.filter((p) => p.author_role === 'owner')).toHaveLength(1);
  });
});
