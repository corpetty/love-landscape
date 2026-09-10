import { describe, it, expect } from 'vitest';
import { encodeParams, decodeParams, encodeView, decodeView, VIEW_KINDS } from '../src/data/encoding.js';

// One byte of precision per param: round-trip error is bounded by half a step.
const QUANT = 1 / 255;

describe('encodeParams / decodeParams round-trip', () => {
  it('round-trips boundary values exactly', () => {
    const params = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const decoded = decodeParams(encodeParams(params));
    expect(decoded).toHaveLength(13);
    decoded.forEach((v, i) => expect(v).toBeCloseTo(params[i], 10));
  });

  it('round-trips arbitrary values within quantization error', () => {
    // Deterministic pseudo-random values — no Math.random in tests.
    const params = Array.from({ length: 13 }, (_, i) => ((i * 37 + 11) % 100) / 100);
    const decoded = decodeParams(encodeParams(params));
    decoded.forEach((v, i) => {
      expect(Math.abs(v - params[i])).toBeLessThanOrEqual(QUANT / 2 + 1e-9);
    });
  });

  it('produces the documented code shape (L2_ + 18 chars, URL-safe)', () => {
    const code = encodeParams(Array(13).fill(0.5));
    expect(code).toMatch(/^L2_[A-Za-z0-9\-_]{18}$/);
  });

  it('clamps out-of-range and defaults missing params to 0.5', () => {
    const decoded = decodeParams(encodeParams([2, -1]));
    expect(decoded[0]).toBe(1);
    expect(decoded[1]).toBe(0);
    for (let i = 2; i < 13; i++) expect(decoded[i]).toBeCloseTo(0.5, 2);
  });
});

describe('decodeParams version handling', () => {
  it('decodes L1 codes to 13 params with 0.5 padding', () => {
    // Build a valid 9-byte L1 payload by hand.
    const bytes = [0, 51, 102, 128, 153, 204, 255, 25, 230];
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    const payload = btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const decoded = decodeParams('L1_' + payload);
    expect(decoded).toHaveLength(13);
    expect(decoded[0]).toBe(0);
    expect(decoded[6]).toBe(1);
    for (let i = 9; i < 13; i++) expect(decoded[i]).toBe(0.5);
  });

  it('accepts the known-good test code', () => {
    expect(decodeParams('L1_v8yZgGZZs6az')).toHaveLength(13);
  });
});

describe('decodeParams rejection', () => {
  it.each([
    [null], [undefined], [''], [42], ['no-prefix'], ['X9_abcdefghijklmnop'],
    ['L2_'], ['L2_!!!!'],
    ['L2_' + 'AAAA'],            // wrong byte length for v2
    ['L1_' + 'AAAAAAAAAAAAAAAAAAAAAAAA'], // wrong byte length for v1
  ])('returns null for %j', (input) => {
    expect(decodeParams(input)).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    const code = encodeParams(Array(13).fill(0.5));
    expect(decodeParams(`  ${code}  `)).toHaveLength(13);
  });
});

describe('encodeView / decodeView — a point on a landscape', () => {
  const params = Array.from({ length: 13 }, (_, i) => i / 12);

  it('round-trips the terrain, the point, and the wish', () => {
    const code = encodeView({ kind: 'desire', params, x: 0.62, y: 0.85, exclusivity: 0.75 });
    const view = decodeView(code);
    expect(view.kind).toBe('desire');
    expect(view.params).toHaveLength(13);
    view.params.forEach((v, i) => expect(Math.abs(v - params[i])).toBeLessThanOrEqual(QUANT / 2 + 1e-9));
    expect(view.x).toBeCloseTo(0.62, 2);
    expect(view.y).toBeCloseTo(0.85, 2);
    expect(view.exclusivity).toBeCloseTo(0.75, 2);
  });

  it('carries the terrain, so a view code stands alone', () => {
    // The whole point of embedding the params: no second code, no server.
    const view = decodeView(encodeView({ kind: 'placement', params, x: 0.5, y: 0.5 }));
    expect(view.params[12]).toBeCloseTo(1, 2);
  });

  it('distinguishes an unset exclusivity wish from a wish for openness', () => {
    expect(decodeView(encodeView({ kind: 'desire', params, x: 0, y: 0 })).exclusivity).toBeNull();
    expect(decodeView(encodeView({ kind: 'desire', params, x: 0, y: 0, exclusivity: null })).exclusivity).toBeNull();
    expect(decodeView(encodeView({ kind: 'desire', params, x: 0, y: 0, exclusivity: 0 })).exclusivity).toBe(0);
  });

  it('round-trips every kind', () => {
    for (const kind of VIEW_KINDS) {
      expect(decodeView(encodeView({ kind, params, x: 0.3, y: 0.7 })).kind).toBe(kind);
    }
  });

  it('produces the documented code shape (V2_ + 23 chars, URL-safe)', () => {
    const code = encodeView({ kind: 'wish', params, x: 1, y: 1, exclusivity: 1 });
    expect(code).toMatch(/^V2_[A-Za-z0-9\-_]{23}$/);
  });

  it('clamps out-of-range coordinates', () => {
    const view = decodeView(encodeView({ kind: 'placement', params, x: -2, y: 9, exclusivity: 5 }));
    expect(view.x).toBe(0);
    expect(view.y).toBe(1);
    expect(view.exclusivity).toBe(1);
  });

  it('refuses a view it cannot build', () => {
    expect(encodeView()).toBeNull();
    expect(encodeView({ kind: 'nonsense', params, x: 0, y: 0 })).toBeNull();
    expect(encodeView({ kind: 'desire', params: [0.5], x: 0, y: 0 })).toBeNull();
    expect(encodeView({ kind: 'desire', params, x: NaN, y: 0 })).toBeNull();
  });
});

describe('the two code families never cross', () => {
  const params = Array(13).fill(0.5);

  it('will not read a landscape code as a view', () => {
    expect(decodeView(encodeParams(params))).toBeNull();
    expect(decodeView('L1_v8yZgGZZs6az')).toBeNull();
  });

  it('will not read a view code as a landscape', () => {
    expect(decodeParams(encodeView({ kind: 'desire', params, x: 0.5, y: 0.5 }))).toBeNull();
  });

  it.each([
    [null], [undefined], [''], [42], ['V2_'], ['V2_!!!!'],
    ['V2_AAAA'],                       // wrong byte length
    ['V2_' + 'BwAAAAAAAAAAAAAAAAAAAAA'], // valid length, unknown kind
  ])('returns null for %j', (input) => {
    expect(decodeView(input)).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    const code = encodeView({ kind: 'desire', params, x: 0.5, y: 0.5 });
    expect(decodeView(`  ${code}  `)).not.toBeNull();
  });
});
