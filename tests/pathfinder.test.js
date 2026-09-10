import { describe, it, expect } from 'vitest';
import { findPath, CLIMB_WEIGHT, FOG_WEIGHT } from '../src/terrain/pathfinder.js';
import { computeParams } from '../src/data/paramCompute.js';
import { personas } from '../analysis/personas.js';

const P = Object.fromEntries(personas.map((p) => [p.name, computeParams(p.answers)]));
const NEUTRAL = Array(13).fill(0.5);

// Named points on the fixed map (src/terrain/constants.js).
const FRIENDSHIP = { x: 0.18, y: 0.82 };
const ROMANCE = { x: 0.62, y: 0.85 };
const TOUCH = { x: 0.80, y: 0.30 };
const TENDER = { x: 0.50, y: 0.50 };
const DEEP_PHYSICAL = { x: 0.80, y: 0.75 };
const LIGHT_PHYSICAL = { x: 0.72, y: 0.20 };

/** How far the drawn route strays from the straight line between the pins. */
function deviation(result, a, b) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
  return Math.max(...result.polyline.map(([x, y]) =>
    Math.abs((x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x)) / len));
}

describe('findPath — shape of the result', () => {
  it('returns a connected route between the two pins', () => {
    const r = findPath(NEUTRAL, FRIENDSHIP, TOUCH);
    expect(r.polyline.length).toBeGreaterThan(1);
    // The drawn route is anchored on the exact pins, not the grid nodes.
    expect(r.polyline[0][0]).toBeCloseTo(FRIENDSHIP.x, 6);
    expect(r.polyline[0][1]).toBeCloseTo(FRIENDSHIP.y, 6);
    expect(r.polyline.at(-1)[0]).toBeCloseTo(TOUCH.x, 6);
    expect(r.polyline.at(-1)[1]).toBeCloseTo(TOUCH.y, 6);
  });

  it('is at least as long as the straight line, and never a wild detour', () => {
    for (const params of Object.values(P)) {
      const r = findPath(params, FRIENDSHIP, TOUCH);
      expect(r.pathLength).toBeGreaterThanOrEqual(r.straightDistance - 1e-6);
      expect(r.detourRatio).toBeLessThan(2.5);
    }
  });

  it('names the endpoints from the terrain, not from coordinates', () => {
    const r = findPath(P.Elena, FRIENDSHIP, TOUCH);
    expect(r.start.label).toBe('Deep friendships');
    expect(r.end.label).toBe('Casual touch');
  });

  it('handles both pins in the same cell without pretending there is a journey', () => {
    const r = findPath(NEUTRAL, TENDER, TENDER);
    expect(r.pathLength).toBe(0);
    expect(r.crest).toBe(0);
    expect(r.ridgesCrossed).toEqual([]);
    expect(r.storyType).toBe('short-walk');
  });

  it('rejects malformed input instead of throwing', () => {
    expect(findPath(null, TENDER, TOUCH)).toBeNull();
    expect(findPath([0.5, 0.5], TENDER, TOUCH)).toBeNull();
    expect(findPath(NEUTRAL, { x: NaN, y: 0 }, TOUCH)).toBeNull();
    expect(findPath(NEUTRAL, TENDER, null)).toBeNull();
  });

  it('clamps pins that fall outside the map', () => {
    const r = findPath(NEUTRAL, { x: -3, y: 5 }, { x: 0.5, y: 0.5 });
    expect(r).not.toBeNull();
    expect(r.polyline[0]).toEqual([0, 1]);
  });

  it('is deterministic', () => {
    const a = findPath(P.Sofia, FRIENDSHIP, ROMANCE);
    const b = findPath(P.Sofia, FRIENDSHIP, ROMANCE);
    expect(b.pathLength).toBe(a.pathLength);
    expect(b.polyline).toEqual(a.polyline);
  });
});

describe('findPath — the terrain actually drives the route', () => {
  it('costs more to leave a deeper valley', () => {
    // Elena's friendship valley is the deepest of the seed personas; Marcus's
    // is shallow. Moving a bond out of it should cost her more, and that
    // difference is the whole point of measuring climb instead of distance.
    const elena = findPath(P.Elena, FRIENDSHIP, TOUCH);
    const marcus = findPath(P.Marcus, FRIENDSHIP, TOUCH);
    expect(elena.start.height).toBeLessThan(marcus.start.height);
    expect(elena.crest).toBeGreaterThan(marcus.crest + 0.4);
  });

  it('charges nothing for descending into a valley', () => {
    // Straight downhill into the romantic valley: some climb is unavoidable
    // leaving the start, but a descent must never add to it.
    const r = findPath(P.Amara, LIGHT_PHYSICAL, ROMANCE);
    expect(r.totalDescent).toBeGreaterThan(r.totalClimb);
  });

  it("reports a crossed ridge with the owner's parameter attached", () => {
    // Amara needs structure before intensity (high P5), which raises the
    // ungrounded-intensity ridge on the physical side of her map.
    const r = findPath(P.Amara, TENDER, DEEP_PHYSICAL);
    const ridge = r.ridgesCrossed.find((x) => x.name === 'Ungrounded intensity');
    expect(ridge).toBeTruthy();
    expect(ridge.paramIndex).toBe(5);
    expect(ridge.height).toBeGreaterThan(0.15);
  });

  it('bends away from a ridge, and reports the wall between the pins', () => {
    // A wall of empty-physicality (high P4) with everything else neutral, and
    // pins on either side of it. The route cannot avoid it, but it should
    // deviate to find the cheapest place to cross — and say a wall is there.
    const walled = [...NEUTRAL];
    walled[4] = 1;
    const open = [...NEUTRAL];
    open[4] = 0;
    const below = { x: 0.50, y: 0.04 };
    const above = { x: 0.50, y: 0.34 };
    const withWall = findPath(walled, below, above);
    const without = findPath(open, below, above);

    expect(deviation(withWall, below, above)).toBeGreaterThan(0.1);
    expect(deviation(without, below, above)).toBeLessThan(0.01);
    expect(withWall.flags).toContain('wall-between');
    expect(without.flags).not.toContain('wall-between');
    expect(withWall.crest).toBeGreaterThan(without.crest + 0.1);
  });

  it('crosses a ridge below its summit when a lower way over exists', () => {
    const walled = [...NEUTRAL];
    walled[4] = 1;
    const r = findPath(walled, { x: 0.50, y: 0.04 }, { x: 0.50, y: 0.34 });
    const ridge = r.ridgesCrossed.find((x) => x.name === 'Empty physicality');
    expect(ridge).toBeTruthy();
    expect(ridge.height).toBeLessThan(ridge.peak);
    expect(ridge.lowerCrossing).toBe(true);
  });

  it('lists a ridge the direct line would hit but the route missed', () => {
    // Amara's uncertainty ridge sits on the direct line from her friendship
    // valley to casual touch; her route does not touch it.
    const r = findPath(P.Amara, FRIENDSHIP, TOUCH);
    expect(r.ridgesSkirted.map((x) => x.name)).toContain('Uncertainty ridge');
    expect(r.ridgesCrossed.map((x) => x.name)).not.toContain('Uncertainty ridge');
  });

  it('marks a destination the owner has never explored as fog', () => {
    const unmapped = [...NEUTRAL];
    unmapped[8] = 0; // nothing explored — the mapped ellipse shrinks
    const r = findPath(unmapped, TENDER, { x: 0.95, y: 0.95 });
    expect(r.end.inFog).toBe(true);
    expect(r.flags).toContain('end-in-fog');
    expect(r.fogFraction).toBeGreaterThan(0.2);
  });
});

describe('findPath — story classification', () => {
  // Locks the tuning of CLIMB_WEIGHT and the crest threshold. These four cases
  // were chosen because each splits the personas rather than the journeys: if a
  // constant moves, the split changes and these fail.
  it('reads a short move inside one valley as a short walk, for everyone', () => {
    for (const [name, params] of Object.entries(P)) {
      const r = findPath(params, TENDER, { x: 0.55, y: 0.56 });
      expect(r.storyType, name).toBe('short-walk');
    }
  });

  it('separates a near-but-steep journey from a near-and-flat one', () => {
    // Same journey, opposite terrain: Elena's tender middle is a deep valley
    // (leaving it is work); Amara's is raised ground (there is nothing to
    // climb out of).
    expect(findPath(P.Elena, TENDER, DEEP_PHYSICAL).storyType).toBe('the-wall');
    expect(findPath(P.Amara, TENDER, DEEP_PHYSICAL).storyType).toBe('short-walk');
  });

  it('separates a far-and-flat journey from a far-and-steep one', () => {
    expect(findPath(P.Marcus, FRIENDSHIP, TOUCH).storyType).toBe('long-road');
    expect(findPath(P.Sofia, FRIENDSHIP, TOUCH).storyType).toBe('expedition');
  });

  it('produces all four story types across the seed personas', () => {
    const journeys = [
      [FRIENDSHIP, TOUCH], [FRIENDSHIP, ROMANCE],
      [TENDER, DEEP_PHYSICAL], [TENDER, { x: 0.55, y: 0.56 }],
    ];
    const seen = new Set();
    for (const params of Object.values(P)) {
      for (const [a, b] of journeys) seen.add(findPath(params, a, b).storyType);
    }
    expect([...seen].sort()).toEqual(['expedition', 'long-road', 'short-walk', 'the-wall']);
  });

  it('keeps the tuning constants at their reviewed values', () => {
    // Not a behavioural test — a tripwire. These two numbers decide whether a
    // route goes over a ridge or around it, which changes what the reading says.
    expect(CLIMB_WEIGHT).toBe(1.6);
    expect(FOG_WEIGHT).toBe(1.0);
  });
});

describe('findPath — the optional exclusivity wish', () => {
  it('says nothing when the wish was left unset', () => {
    expect(findPath(NEUTRAL, TENDER, ROMANCE).exclusivity).toBeNull();
    expect(findPath(NEUTRAL, TENDER, ROMANCE, { exclusivity: null }).exclusivity).toBeNull();
  });

  it('reads a wish for exclusivity against an open landscape as a gap', () => {
    // Elena's openness is high, so a wish to be the only one is a real distance.
    const r = findPath(P.Elena, TENDER, ROMANCE, { exclusivity: 1 });
    expect(r.exclusivity.direction).toBe('wants-more-exclusive');
    expect(r.exclusivity.aligned).toBe(false);
    expect(r.exclusivity.gap).toBeGreaterThan(0.4);
  });

  it('reads a wish for openness against a devoted landscape as the reverse gap', () => {
    const r = findPath(P.Amara, TENDER, ROMANCE, { exclusivity: 0 });
    expect(r.exclusivity.direction).toBe('wants-more-open');
    expect(r.exclusivity.aligned).toBe(false);
  });

  it('calls a matching wish aligned', () => {
    const r = findPath(P.Amara, TENDER, ROMANCE, { exclusivity: 1 });
    expect(r.exclusivity.aligned).toBe(true);
  });
});
