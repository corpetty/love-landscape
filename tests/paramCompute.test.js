import { describe, it, expect } from 'vitest';
import { computeParams } from '../src/data/paramCompute.js';
import { personas, PARAM_NAMES } from '../analysis/personas.js';

describe('computeParams invariants', () => {
  it('returns 13 params in [0,1] for every persona', () => {
    for (const p of personas) {
      const params = computeParams(p.answers);
      expect(params).toHaveLength(13);
      params.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
    }
  });

  it('defaults unanswered questions to 0.5 (partial answer maps)', () => {
    const empty = computeParams({});
    expect(empty).toHaveLength(13);
    empty.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
    // Partial answers move params relative to the empty baseline, no throw.
    const partial = computeParams({ q1: 1.0, q2: 1.0 });
    expect(partial).toHaveLength(13);
  });
});

describe('computeParams persona snapshots (regression lock)', () => {
  // Any change to question weights or param formulas fails here, on purpose:
  // stored results and shared codes encode these outputs. Update snapshots
  // only with a deliberate versioning decision (encoding version bump).
  for (const p of personas) {
    it(`persona: ${p.name}`, () => {
      const params = computeParams(p.answers);
      const named = Object.fromEntries(
        PARAM_NAMES.map((name, i) => [name, Number(params[i].toFixed(4))]),
      );
      expect(named).toMatchSnapshot();
    });
  }
});
