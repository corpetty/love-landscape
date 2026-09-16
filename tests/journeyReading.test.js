import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

/**
 * The paid Journey Reading: entitlement per ask, and a prompt grounded in the
 * route the engine computed rather than in anything the buyer posted.
 *
 * Its own file with its own mock, because this sku reads across three tables
 * (results, asks, placements) where the other two read one.
 */
const db = { results: [], asks: [], placements: [], purchases: [] };
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const matches = (row, f) => f.every(([c, v]) => row[c] === v);

class Query {
  constructor(rows) { this.rows = rows; this.filters = []; this.mode = 'select'; }
  select() { return this; }
  eq(c, v) { this.filters.push([c, v]); return this; }
  order() { return this; }
  limit() { return this; }
  update(p) { this.mode = 'update'; this.payload = p; return this; }
  _hit() { return this.rows.filter((r) => matches(r, this.filters)); }
  async maybeSingle() {
    if (this.mode === 'update') { this._hit().forEach((r) => Object.assign(r, this.payload)); return { data: null, error: null }; }
    return { data: this._hit()[0] ?? null, error: null };
  }
  then(res, rej) {
    if (this.mode === 'update') { this._hit().forEach((r) => Object.assign(r, this.payload)); return Promise.resolve({ error: null }).then(res, rej); }
    return Promise.resolve({ data: this._hit(), error: null }).then(res, rej);
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (name) => {
      const t = { results: db.results, asks: db.asks, placements: db.placements, purchases: db.purchases };
      if (!t[name]) throw new Error(`unexpected table ${name}`);
      return new Query(t[name]);
    },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));

const { default: handler } = await import('../api/reading.js');
const { buildJourneyReadingPrompt } = await import('../api/_pathReadingPrompt.js');
const { findPath } = await import('../src/terrain/pathfinder.js');
const { computeParams } = await import('../src/data/paramCompute.js');
const { personas } = await import('../analysis/personas.js');

const TOKEN = 'a'.repeat(64);
const RESULT_ID = '99999999-9999-4999-8999-999999999999';
const OTHER_RESULT_ID = '88888888-8888-4888-8888-888888888888';
const CODE = 'L2_5ma_WbNNmUCMzKaAsw';
const SLUG = 'Ab3xY9kQ2z';
const ASK_ID = '11111111-1111-4111-8111-111111111111';

const LONG_READING = '## The Two Points\n' + 'insight. '.repeat(120);
function mockOpenRouter(content = LONG_READING) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }),
  });
}

function seed({ pins = 'both', purchase = null, askOwner = RESULT_ID } = {}) {
  db.results.push({ id: RESULT_ID, code: CODE, user_id: null, owner_token_hash: sha256(TOKEN) });
  db.results.push({ id: OTHER_RESULT_ID, code: CODE, user_id: null, owner_token_hash: sha256('b'.repeat(64)) });
  db.asks.push({ id: ASK_ID, slug: SLUG, owner_result_id: askOwner, status: 'answered' });
  if (pins === 'both' || pins === 'owner') {
    db.placements.push({ ask_id: ASK_ID, author_role: 'owner', kind: 'current', x: 0.18, y: 0.82, exclusivity: null, note: 'stalled, I think' });
  }
  if (pins === 'both') {
    db.placements.push({ ask_id: ASK_ID, author_role: 'partner', kind: 'desired', x: 0.80, y: 0.30, exclusivity: 0.9, note: 'closer, and soon' });
  }
  if (purchase) db.purchases.push({ id: 'p1', result_id: RESULT_ID, sku: 'journey', status: 'paid', reading_text: null, regen_count: 0, ...purchase });
}

const call = async (body) => {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = () => {};
  res.end = () => res;
  await handler({ method: 'POST', headers: {}, body }, res);
  return res;
};
const owner = (extra) => ({ sku: 'journey', result_id: RESULT_ID, owner_token: TOKEN, ask_slug: SLUG, ...extra });

beforeEach(() => {
  db.results.length = 0; db.asks.length = 0; db.placements.length = 0; db.purchases.length = 0;
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
});
afterEach(() => vi.restoreAllMocks());

describe('journey reading — entitlement', () => {
  it('reports entitlement for the ask that was actually bought', async () => {
    seed({ purchase: { ask_id: ASK_ID } });
    expect((await call(owner({ op: 'status' }))).body).toMatchObject({ entitled: true, regens_left: 3 });
  });

  it('does not carry a purchase over to a different question on the same landscape', async () => {
    // A second ask is a different crossing. Reusing one purchase across every
    // question about a landscape would make the sku meaningless.
    seed({ purchase: { ask_id: 'some-other-ask' } });
    expect((await call(owner({ op: 'status' }))).body.entitled).toBe(false);
    expect((await call(owner({ op: 'get' }))).statusCode).toBe(402);
  });

  it('refuses a caller who cannot prove they own the landscape', async () => {
    seed({ purchase: { ask_id: ASK_ID } });
    expect((await call(owner({ op: 'status', owner_token: 'c'.repeat(64) }))).statusCode).toBe(403);
  });

  it("refuses an ask that belongs to someone else's landscape", async () => {
    // Holding a link must never be enough: the ask has to hang off the result
    // whose ownership was just proved.
    seed({ purchase: { ask_id: ASK_ID }, askOwner: OTHER_RESULT_ID });
    expect((await call(owner({ op: 'status' }))).body.entitled).toBe(false);
  });

  it.each([['missing'], ['notaslug'], ['!!!!!!!!!!']])('is not entitled with the slug %j', async (slug) => {
    seed({ purchase: { ask_id: ASK_ID } });
    expect((await call(owner({ op: 'status', ask_slug: slug }))).body.entitled).toBe(false);
  });
});

describe('journey reading — generation', () => {
  it('generates from the pins on the server, caches, then serves the cache', async () => {
    seed({ purchase: { ask_id: ASK_ID } });
    const spy = mockOpenRouter();
    const first = await call(owner({ op: 'get' }));
    expect(first.body.reading).toContain('The Two Points');
    expect(db.purchases[0].reading_text).toBe(first.body.reading);
    const second = await call(owner({ op: 'get' }));
    expect(second.body.reading).toBe(first.body.reading);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ignores route facts posted by the caller and uses the stored pins', async () => {
    // The route is the substance of the reading. A buyer who could post their
    // own pins could commission a reading of a journey that never happened.
    seed({ purchase: { ask_id: ASK_ID } });
    const spy = mockOpenRouter();
    await call(owner({ op: 'get', point: { x: 0, y: 0 }, path: { storyType: 'short-walk' } }));
    const sent = JSON.parse(spy.mock.calls[0][1].body).messages[1].content;
    expect(sent).toContain('deep-friendship valley');   // from the stored owner pin
    expect(sent).toContain('casual-touch valley');      // from the stored partner pin
    expect(sent).not.toContain('short-walk');
  });

  it("passes the answerer's words through and keeps the owner's note out", async () => {
    // The owner's note was written before the question went out — it is their
    // private reading of the bond, not part of the answer they asked for.
    seed({ purchase: { ask_id: ASK_ID } });
    const spy = mockOpenRouter();
    await call(owner({ op: 'get' }));
    const sent = JSON.parse(spy.mock.calls[0][1].body).messages[1].content;
    expect(sent).toContain('closer, and soon');
    expect(sent).not.toContain('stalled, I think');
  });

  it('keeps a buyer entitled when the answer is withdrawn, and says what happened', async () => {
    // The worst version of this is telling someone who paid that no purchase
    // exists. Entitlement follows the purchase; having something to read is a
    // separate question with its own answer.
    seed({ pins: 'owner', purchase: { ask_id: ASK_ID } });
    expect((await call(owner({ op: 'status' }))).body.entitled).toBe(true);
    const res = await call(owner({ op: 'get' }));
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('Your purchase is safe');
  });

  it('generates normally once the answer is given again', async () => {
    seed({ pins: 'owner', purchase: { ask_id: ASK_ID } });
    expect((await call(owner({ op: 'get' }))).statusCode).toBe(409);
    db.placements.push({ ask_id: ASK_ID, author_role: 'partner', kind: 'desired', x: 0.8, y: 0.3, exclusivity: null, note: null });
    mockOpenRouter();
    expect((await call(owner({ op: 'get' }))).body.reading).toContain('The Two Points');
  });

  it('caps regenerations like the other paid readings', async () => {
    seed({ purchase: { ask_id: ASK_ID, reading_text: 'old', regen_count: 3 } });
    expect((await call(owner({ op: 'regen' }))).statusCode).toBe(429);
  });
});

describe('buildJourneyReadingPrompt', () => {
  const P = (n) => computeParams(personas.find((p) => p.name === n).answers);
  const prompt = (name, a, b, opts, wish) =>
    buildJourneyReadingPrompt(P(name), findPath(P(name), a, b, { exclusivity: wish ?? null }), opts || {});

  const FRIENDSHIP = { x: 0.18, y: 0.82 };
  const TOUCH = { x: 0.80, y: 0.30 };
  const TENDER = { x: 0.50, y: 0.50 };
  const DEEP_PHYSICAL = { x: 0.80, y: 0.75 };

  it('states the copy rule that governs the whole reading', () => {
    const { systemMessage } = prompt('Elena', FRIENDSHIP, TOUCH);
    expect(systemMessage).toContain('never the other person');
    expect(systemMessage).toContain('not the correct place to be');
  });

  it('forbids inventing terrain and printing numbers', () => {
    const { systemMessage } = prompt('Elena', FRIENDSHIP, TOUCH);
    expect(systemMessage).toMatch(/Never invent a ridge/);
    expect(systemMessage).toMatch(/Never print numbers/);
  });

  it('names crossed ridges with the dimension behind them', () => {
    const { userMessage } = prompt('Amara', TENDER, DEEP_PHYSICAL);
    expect(userMessage).toContain('ungrounded-intensity ridge');
    expect(userMessage).toMatch(/structure need/i);
  });

  it('flags the valley-wall reading, which is the one a model would miss', () => {
    const { userMessage } = prompt('Elena', TENDER, DEEP_PHYSICAL);
    expect(userMessage).toContain('RIDGES THE ROUTE CROSSES: none');
    expect(userMessage).toContain('The climb IS the wall of the valley');
  });

  it('reports a barrier the route went around as still standing', () => {
    const { userMessage } = prompt('Amara', FRIENDSHIP, TOUCH);
    expect(userMessage).toMatch(/GOES AROUND \(still there/);
    expect(userMessage).toContain('uncertainty ridge');
  });

  it('says nothing about exclusivity when no wish was set', () => {
    expect(prompt('Elena', FRIENDSHIP, TOUCH).userMessage).not.toContain('EXCLUSIVITY');
  });

  it('gives a mismatched exclusivity wish its own instruction', () => {
    const { userMessage } = prompt('Elena', FRIENDSHIP, TOUCH, { otherName: 'Sam' }, 1);
    expect(userMessage).toContain('EXCLUSIVITY WISH');
    expect(userMessage).toContain('MORE exclusivity');
    expect(userMessage).toContain('said out loud');
  });

  it("treats the answerer's note as the most important line", () => {
    const { userMessage } = prompt('Elena', FRIENDSHIP, TOUCH, { note: 'I want to be first' });
    expect(userMessage).toContain('the most important line here');
    expect(userMessage).toContain('I want to be first');
  });

  it('uses a name when given and falls back to "they" when not', () => {
    expect(prompt('Elena', FRIENDSHIP, TOUCH, { otherName: 'Sam' }).userMessage).toContain('WHERE SAM WANTS IT');
    expect(prompt('Elena', FRIENDSHIP, TOUCH).userMessage).toContain('THEY WANT IT');
  });

  it('builds a usable prompt for every persona and journey', () => {
    for (const p of personas) {
      for (const [a, b] of [[FRIENDSHIP, TOUCH], [TENDER, DEEP_PHYSICAL], [TOUCH, FRIENDSHIP]]) {
        const { userMessage } = buildJourneyReadingPrompt(P(p.name), findPath(P(p.name), a, b), {});
        expect(userMessage, p.name).toContain('STORY TYPE:');
        expect(userMessage).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });
});
