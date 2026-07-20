import { describe, it, expect } from 'vitest';
import { computeParams } from '../src/data/paramCompute.js';
import { ARCHETYPES, computeArchetype } from '../src/data/archetypes.js';
import { personas } from '../analysis/personas.js';

// Each seed persona anchors one archetype — a taxonomy change that reassigns
// them is an editorial decision, not a tuning accident.
const INTENDED = {
  Elena: 'archipelago',
  Marcus: 'volcano',
  Rin: 'mesa',
  Devi: 'terraces',
  James: 'frontier',
  Sofia: 'watershed',
  Kai: 'hotsprings',
  Amara: 'canyon',
};

describe('archetype taxonomy', () => {
  it('has 10 archetypes with complete editorial content and valid prototypes', () => {
    expect(ARCHETYPES).toHaveLength(10);
    for (const a of ARCHETYPES) {
      expect(a.key).toBeTruthy();
      expect(a.name).toMatch(/^The /);
      expect(a.epithet).toBeTruthy();
      expect(a.essence).toBeTruthy();
      expect(a.description.length).toBeGreaterThan(100);
      expect(a.prototype).toHaveLength(13);
      a.prototype.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
      a.signature.forEach((i) => expect(i).toBeGreaterThanOrEqual(0));
      a.signature.forEach((i) => expect(i).toBeLessThan(13));
    }
    const keys = new Set(ARCHETYPES.map((a) => a.key));
    expect(keys.size).toBe(10);
  });

  it('maps every seed persona to its intended archetype', () => {
    for (const p of personas) {
      const result = computeArchetype(computeParams(p.answers));
      expect(result.archetype.key, `persona ${p.name}`).toBe(INTENDED[p.name]);
    }
  });

  it('assigns an archetype to any landscape (total coverage, deterministic)', () => {
    const neutral = computeArchetype(Array(13).fill(0.5));
    expect(neutral.archetype).toBeTruthy();
    expect(neutral.margin).toBeGreaterThanOrEqual(0);

    const zeros = computeArchetype(Array(13).fill(0));
    const ones = computeArchetype(Array(13).fill(1));
    expect(zeros.archetype).toBeTruthy();
    expect(ones.archetype).toBeTruthy();

    // determinism
    const v = Array.from({ length: 13 }, (_, i) => (i * 7 % 13) / 13);
    expect(computeArchetype(v).archetype.key).toBe(computeArchetype(v).archetype.key);
  });

  it('every archetype is reachable from real answer-space', () => {
    // Deterministic LCG over random answer sets pushed through computeParams —
    // the same distribution real assessments live in.
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const qids = Array.from({ length: 19 }, (_, i) => `q${i + 1}`);
    const reached = new Set();
    for (let i = 0; i < 3000; i++) {
      const answers = Object.fromEntries(qids.map((q) => [q, rnd()]));
      reached.add(computeArchetype(computeParams(answers)).archetype.key);
    }
    expect(reached.size).toBe(10);
  });

  it('returns null for malformed input', () => {
    expect(computeArchetype(null)).toBeNull();
    expect(computeArchetype([0.5, 0.5])).toBeNull();
    expect(computeArchetype('L2_abc')).toBeNull();
  });
});
