import { describe, it, expect } from 'vitest';
import { encodeParams, decodeParams } from '../src/data/encoding.js';

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
