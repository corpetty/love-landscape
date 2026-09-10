import { describe, it, expect } from 'vitest';
import { describePoint, heightAt, mappednessAt, quadrantWords, featureContributions, constrainToMap } from '../src/terrain/placement.js';
import { generateField } from '../src/terrain/fieldGenerator.js';
import { GRID_SIZE, FEATURE_LABELS } from '../src/terrain/constants.js';
import { computeParams } from '../src/data/paramCompute.js';
import { personas } from '../analysis/personas.js';

const NEUTRAL = Array(13).fill(0.5);
const ELENA = computeParams(personas.find((p) => p.name === 'Elena').answers);

describe('heightAt', () => {
  it('agrees with the rendered field it describes', () => {
    // The pin must report the terrain the person is looking at, so the
    // analytic evaluation has to match generateField() at grid points.
    const { field } = generateField(ELENA);
    const N = GRID_SIZE;
    for (const [i, j] of [[10, 10], [50, 50], [80, 30], [99, 99], [0, 0]]) {
      const x = i / (N - 1);
      const y = j / (N - 1);
      expect(heightAt(x, y, ELENA).height).toBeCloseTo(field[j * N + i], 8);
    }
  });

  it('applies the fog mask, so unmapped ground flattens', () => {
    const unmapped = [...NEUTRAL];
    unmapped[8] = 0;
    const far = heightAt(0.95, 0.95, unmapped);
    expect(far.mappedness).toBe(0);
    expect(Math.abs(far.height)).toBe(0);
    expect(far.raw).not.toBe(0); // the feature is there; it just isn't known
  });
});

describe('mappednessAt', () => {
  it('is fully mapped at the centre and fades outward', () => {
    expect(mappednessAt(0.40, 0.55, NEUTRAL)).toBe(1);
    expect(mappednessAt(0.99, 0.01, NEUTRAL)).toBe(0);
  });

  it('widens as self-knowledge rises', () => {
    const low = [...NEUTRAL]; low[8] = 0;
    const high = [...NEUTRAL]; high[8] = 1;
    expect(mappednessAt(0.85, 0.85, high)).toBeGreaterThan(mappednessAt(0.85, 0.85, low));
  });
});

describe('quadrantWords', () => {
  it.each([
    [0.1, 0.9, 'emotional', 'deep'],
    [0.9, 0.1, 'physical', 'light'],
    [0.5, 0.5, 'balanced between emotional and physical', 'moderately deep'],
  ])('describes (%s, %s)', (x, y, across, down) => {
    expect(quadrantWords(x, y)).toMatchObject({ across, down });
  });
});

describe('featureContributions', () => {
  it('reads ridge-or-valley from the sign, not from the category', () => {
    // The tender middle is defined as a trough but pushes UP when P2 is low —
    // assuming its category would mislabel it for exactly the people whose
    // reading depends on it.
    const closed = [...NEUTRAL]; closed[2] = 0;
    const open = [...NEUTRAL]; open[2] = 1;
    const at = (params) => featureContributions(0.5, 0.5, params).find((c) => c.name === 'Tender middle');
    expect(at(closed).isRidge).toBe(true);
    expect(at(open).isRidge).toBe(false);
  });

  it('attaches a parameter index to every named feature', () => {
    for (const c of featureContributions(0.5, 0.5, NEUTRAL)) {
      expect(c.paramIndex, c.name).not.toBeNull();
      expect(c.paramIndex).toBeGreaterThanOrEqual(0);
      expect(c.paramIndex).toBeLessThan(13);
    }
  });

  it("carries each feature's own extreme, so a crossing can be read against it", () => {
    const walled = [...NEUTRAL]; walled[4] = 1;
    const onRidge = featureContributions(0.5, 0.15, walled).find((c) => c.name === 'Empty physicality');
    const offCentre = featureContributions(0.5, 0.24, walled).find((c) => c.name === 'Empty physicality');
    expect(onRidge.value).toBeCloseTo(onRidge.peak, 6);
    expect(offCentre.value).toBeLessThan(offCentre.peak);
    expect(offCentre.peak).toBe(onRidge.peak);
  });
});

describe('describePoint', () => {
  it('names the feature a pin sits on', () => {
    expect(describePoint(0.18, 0.82, ELENA).label).toBe('Deep friendships');
    expect(describePoint(0.62, 0.85, ELENA).label).toBe('Romantic love');
  });

  it('falls back to the axes when a pin sits on open ground', () => {
    const d = describePoint(0.02, 0.02, NEUTRAL);
    expect(d.nearest).toBeNull();
    expect(d.label).toBe('emotional, light');
  });

  it('lists the neighbouring features that also register', () => {
    // Between the friendship valley and the secure base — the reading should be
    // able to say "at the edge of".
    const d = describePoint(0.27, 0.86, ELENA);
    expect(d.nearest).toBeTruthy();
    expect(d.alsoNear.length).toBeGreaterThan(0);
  });

  it('flags a valley, high ground, and fog', () => {
    expect(describePoint(0.18, 0.82, ELENA).inValley).toBe(true);
    const walled = [...NEUTRAL]; walled[4] = 1;
    expect(describePoint(0.5, 0.15, walled).onHighGround).toBe(true);
    const unmapped = [...NEUTRAL]; unmapped[8] = 0;
    expect(describePoint(0.95, 0.95, unmapped).inFog).toBe(true);
  });
});

describe('constrainToMap', () => {
  it('leaves a point inside the drawn circle alone', () => {
    expect(constrainToMap(0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
    expect(constrainToMap(0.18, 0.82)).toEqual({ x: 0.18, y: 0.82 });
  });

  it('keeps every named map feature reachable', () => {
    // A pin the picker cannot place on a feature makes that feature
    // undescribable, so the radius must not exclude any of them.
    for (const f of FEATURE_LABELS) {
      expect(constrainToMap(f.x, f.y), f.name).toEqual({ x: f.x, y: f.y });
    }
  });

  it('projects an outside point onto the rim rather than into a corner', () => {
    const c = constrainToMap(0.02, 0.02);
    expect(Math.hypot(c.x - 0.5, c.y - 0.5)).toBeCloseTo(0.47, 6);
    // Projection preserves the direction the person was aiming.
    expect(c.x).toBeCloseTo(c.y, 6);
    expect(c.x).toBeLessThan(0.5);
  });

  it('handles the exact centre without dividing by zero', () => {
    expect(constrainToMap(0.5, 0.5, 0)).toEqual({ x: 0.5, y: 0.5 });
  });
});
