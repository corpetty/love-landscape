import { describe, it, expect } from 'vitest';
import { generateCompatibility } from '../src/data/recommendations.js';
import { computeArchetype } from '../src/data/archetypes.js';

const A = [0.9, 0.35, 0.6, 0.75, 0.35, 0.25, 0.75, 0.85, 0.8, 0.85, 0.7, 0.6, 0.8];

describe('generateCompatibility', () => {
  it('returns a bounded score with shared + tension picks', () => {
    const B = A.map((v) => Math.min(1, Math.max(0, v + 0.1)));
    const c = generateCompatibility(A, B);
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
    expect(typeof c.topShared).toBe('string');
    expect(typeof c.topTension).toBe('string');
  });

  it('scores identical at 100 and less-aligned pairs strictly lower', () => {
    expect(generateCompatibility(A, A).score).toBe(100);
    const near = A.map((v) => Math.min(1, v + 0.1));
    const opposite = A.map((v) => 1 - v);
    // more divergence → lower score (monotonic)
    expect(generateCompatibility(A, opposite).score)
      .toBeLessThan(generateCompatibility(A, near).score);
    expect(generateCompatibility(A, near).score).toBeLessThan(100);
  });

  it('picks the widest-gap dimension as the tension and is deterministic', () => {
    const B = [...A];
    B[7] = A[7] - 0.6; // force a big gap on "openness" (index 7)
    const c = generateCompatibility(A, B);
    expect(c.topTension).toBe('openness');
    expect(generateCompatibility(A, B)).toEqual(c); // deterministic
  });

  it('returns null on malformed input', () => {
    expect(generateCompatibility(null, A)).toBeNull();
    expect(generateCompatibility([], [])).toBeNull();
  });
});

describe('archetype pairing (compatibility headline)', () => {
  it('resolves both sides deterministically', () => {
    const B = A.map((v) => 1 - v);
    const a1 = computeArchetype(A).archetype.name;
    const b1 = computeArchetype(B).archetype.name;
    expect(a1).toMatch(/^The /);
    expect(b1).toMatch(/^The /);
    expect(computeArchetype(A).archetype.name).toBe(a1); // stable
  });
});
