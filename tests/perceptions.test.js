import { describe, it, expect, beforeEach } from 'vitest';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemoryStorage();

const { getPerception, savePerception, clearPerception } = await import('../src/data/perceptions.js');
const store = await import('../src/data/perceptions.js');

const A = 'L2_aaaaaaaaaaaaaaaaaa';
const B = 'L2_bbbbbbbbbbbbbbbbbb';
const PARAMS = Array.from({ length: 13 }, (_, i) => i / 12);

describe('perceptions store', () => {
  beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

  it('returns nothing for a person never guessed about', () => {
    expect(getPerception(A)).toBeNull();
    expect(getPerception(null)).toBeNull();
  });

  it('remembers a guess against the person it was about', () => {
    savePerception(A, PARAMS);
    expect(getPerception(A).params).toEqual(PARAMS);
  });

  it('keeps people apart', () => {
    savePerception(A, PARAMS);
    savePerception(B, PARAMS.map(() => 0.1));
    expect(getPerception(A).params[12]).toBe(1);
    expect(getPerception(B).params[12]).toBe(0.1);
  });

  it('replaces rather than accumulates when the same person is re-answered', () => {
    savePerception(A, PARAMS);
    savePerception(A, PARAMS.map(() => 0.5));
    expect(getPerception(A).params.every((v) => v === 0.5)).toBe(true);
    expect(JSON.parse(globalThis.localStorage.getItem('ll-perceptions-v1'))).toHaveLength(1);
  });

  it('clears one person without touching another', () => {
    savePerception(A, PARAMS);
    savePerception(B, PARAMS);
    clearPerception(A);
    expect(getPerception(A)).toBeNull();
    expect(getPerception(B)).not.toBeNull();
  });

  it('refuses to store an unusable guess', () => {
    expect(savePerception(null, PARAMS)).toBeNull();
    expect(savePerception(A, 'nope')).toBeNull();
    expect(getPerception(A)).toBeNull();
  });

  it('survives unreadable storage and a storage that refuses writes', () => {
    globalThis.localStorage.setItem('ll-perceptions-v1', 'not json');
    expect(getPerception(A)).toBeNull();
    expect(() => savePerception(A, PARAMS)).not.toThrow();
    globalThis.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
    expect(() => savePerception(B, PARAMS)).not.toThrow();
  });

  it('offers no way to export a guess about somebody else', () => {
    // A private read on another person should not be easy to hand around. If
    // an export is ever added, that has to be a deliberate decision, not a
    // helper someone reached for.
    expect(Object.keys(store).sort()).toEqual(['clearPerception', 'getPerception', 'savePerception']);
  });
});
