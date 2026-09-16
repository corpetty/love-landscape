import { describe, it, expect, beforeEach } from 'vitest';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemoryStorage(); // crypto is already a global in Node 22

const { adoptOwned, getOwnedResult, getOwnedResultByCode, getOwnedResults } =
  await import('../src/data/resultsClient.js');

const CRID = '12345678-1234-1234-1234-123456789abc';
const RESULT_ID = '99999999-9999-4999-8999-999999999999';
const CODE = 'L2_AAAAAAAAAAAAAAAAAA';

const row = (over = {}) => ({ client_result_id: CRID, result_id: RESULT_ID, code: CODE, ...over });

describe('adoptOwned — a landscape that lives only on the account', () => {
  beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

  it('makes the device recognise a result it has never held', () => {
    // Every owner-only feature asks "does this device own the code on screen".
    // Before adoption the answer is no, on a landscape the person plainly owns.
    expect(getOwnedResultByCode(CODE)).toBeNull();
    adoptOwned(row());
    expect(getOwnedResultByCode(CODE)).toMatchObject({ result_id: RESULT_ID, claimed: true });
  });

  it('stores no bearer token, because the account is the stronger proof', () => {
    adoptOwned(row());
    expect(getOwnedResult(CRID).owner_token).toBeUndefined();
    expect(getOwnedResult(CRID).claimed).toBe(true);
  });

  it('carries the label and share state across, so the row does not look new', () => {
    adoptOwned(row({ label: 'After the move', is_public: true, slug: 'Ab3xY9kQ2z' }));
    expect(getOwnedResult(CRID)).toMatchObject({ label: 'After the move', is_public: true, slug: 'Ab3xY9kQ2z' });
  });

  it('never overwrites an entry this device already owns', () => {
    // The local entry may hold a bearer token for an unclaimed result; adoption
    // must not replace it with a weaker, token-less record.
    adoptOwned(row());
    const first = getOwnedResult(CRID);
    adoptOwned(row({ label: 'renamed' }));
    expect(getOwnedResult(CRID).label).toBe(first.label);
    expect(getOwnedResults()).toHaveLength(1);
  });

  it('refuses to adopt an incomplete row rather than storing a broken one', () => {
    expect(adoptOwned({ client_result_id: CRID, code: CODE })).toBeNull();      // no result_id
    expect(adoptOwned({ result_id: RESULT_ID, code: CODE })).toBeNull();        // no client_result_id
    expect(adoptOwned({ client_result_id: CRID, result_id: RESULT_ID })).toBeNull(); // no code
    expect(getOwnedResults()).toHaveLength(0);
  });

  it('keeps landscapes apart when several are adopted', () => {
    adoptOwned(row());
    adoptOwned(row({ client_result_id: '22222222-2222-4222-8222-222222222222', code: 'L2_BBBBBBBBBBBBBBBBBB' }));
    expect(getOwnedResults()).toHaveLength(2);
    expect(getOwnedResultByCode('L2_BBBBBBBBBBBBBBBBBB').client_result_id)
      .toBe('22222222-2222-4222-8222-222222222222');
  });
});
