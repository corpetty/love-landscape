import { describe, it, expect, beforeEach } from 'vitest';

// The store is deliberately localStorage-only (Phase A has no server), so the
// tests supply the one browser API it touches.
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemoryStorage();

const { getJourney, saveJourney, clearJourney } = await import('../src/data/journeys.js');

const MINE = 'L2_aaaaaaaaaaaaaaaaaa';
const THEIRS = 'L2_bbbbbbbbbbbbbbbbbb';
const OTHER = 'L2_cccccccccccccccccc';

describe('journeys store', () => {
  beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

  it('returns nothing for a pairing that has never been marked', () => {
    expect(getJourney(MINE, THEIRS)).toBeNull();
  });

  it('remembers pins against the pairing they belong to', () => {
    saveJourney(MINE, THEIRS, { placement: { x: 0.2, y: 0.8 } });
    expect(getJourney(MINE, THEIRS).placement).toEqual({ x: 0.2, y: 0.8 });
  });

  it('keeps pairings apart, so a comparison switch cannot show the wrong pins', () => {
    saveJourney(MINE, THEIRS, { placement: { x: 0.2, y: 0.8 } });
    saveJourney(MINE, OTHER, { placement: { x: 0.9, y: 0.1 } });
    expect(getJourney(MINE, THEIRS).placement.x).toBe(0.2);
    expect(getJourney(MINE, OTHER).placement.x).toBe(0.9);
  });

  it('treats the two directions of a pairing as one journey', () => {
    saveJourney(MINE, THEIRS, { placement: { x: 0.2, y: 0.8 } });
    saveJourney(MINE, THEIRS, { myDesire: { x: 0.6, y: 0.6 } });
    const j = getJourney(MINE, THEIRS);
    expect(j.placement).toBeTruthy();
    expect(j.myDesire).toBeTruthy();
  });

  it('merges rather than replacing, so saving one pin never drops another', () => {
    saveJourney(MINE, THEIRS, { placement: { x: 0.2, y: 0.8 } });
    saveJourney(MINE, THEIRS, { theirDesire: { x: 0.5, y: 0.5 } });
    expect(getJourney(MINE, THEIRS).placement).toEqual({ x: 0.2, y: 0.8 });
  });

  it('clears one pairing without touching the others', () => {
    saveJourney(MINE, THEIRS, { placement: { x: 0.2, y: 0.8 } });
    saveJourney(MINE, OTHER, { placement: { x: 0.9, y: 0.1 } });
    clearJourney(MINE, THEIRS);
    expect(getJourney(MINE, THEIRS)).toBeNull();
    expect(getJourney(MINE, OTHER)).not.toBeNull();
  });

  it('keeps only the most recent journeys, newest first', () => {
    for (let i = 0; i < 20; i++) saveJourney(MINE, `L2_${i}`, { placement: { x: i / 20, y: 0.5 } });
    expect(getJourney(MINE, 'L2_19')).not.toBeNull();
    expect(getJourney(MINE, 'L2_0')).toBeNull();
  });

  it('survives unreadable storage instead of breaking the results screen', () => {
    globalThis.localStorage.setItem('ll-journeys-v1', 'not json');
    expect(getJourney(MINE, THEIRS)).toBeNull();
    expect(() => saveJourney(MINE, THEIRS, { placement: { x: 0, y: 0 } })).not.toThrow();
    expect(getJourney(MINE, THEIRS)).not.toBeNull();
  });

  it('does not throw when storage refuses to write (private mode, quota)', () => {
    globalThis.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
    expect(() => saveJourney(MINE, THEIRS, { placement: { x: 0, y: 0 } })).not.toThrow();
  });
});
