/**
 * placement.js — a point on a landscape, described in words.
 *
 * The terrain is a fixed map: every feature sits at a known (x, y), and only
 * its depth or height changes with the 13 parameters (src/terrain/constants.js).
 * That is what lets a relationship be a *point*: "how emotional vs. physical is
 * this bond, and how deep does it go" is exactly the map's two axes.
 *
 * Coordinates are normalized [0,1]:
 *   x: 0 = emotional  → 1 = physical
 *   y: 0 = shallow    → 1 = deep
 *
 * Everything here is analytic (the Gaussian sum evaluated at a point), not
 * sampled off the 100×100 grid, so a pin's description never depends on grid
 * resolution. The height formula mirrors generateField() exactly — including
 * the mappedness mask — so the number matches the terrain the person is
 * looking at.
 */

import { getTroughs, getRidges, getSaddles, MAPPED_CENTER, FEATURE_LABELS } from './constants.js';

/** Which parameter each named feature belongs to, for narrative attribution. */
const FEATURE_PARAM = FEATURE_LABELS.reduce((acc, f) => {
  if (!(f.name in acc)) acc[f.name] = f.paramIndex;
  return acc;
}, {});

// Saddles aren't in FEATURE_LABELS (they're connective tissue, never labelled
// on the map), but the narrative names them, so they need parameters too.
const SADDLE_PARAM = {
  'Friendship–Romance pass': 0,
  'Tender–Touch pass': 2,
  'Friendship–Self pass': 9,
};

/** Mappedness (1 = known ground, 0 = fog) at a point — mirrors fieldGenerator. */
export function mappednessAt(x, y, params) {
  const P8 = params[8];
  const rx = (0.32 + P8 * 0.28) + 0.16;
  const ry = (0.32 + P8 * 0.28) + 0.14;
  const mdx = (x - MAPPED_CENTER.x) / rx;
  const mdy = (y - MAPPED_CENTER.y) / ry;
  const d = Math.sqrt(mdx * mdx + mdy * mdy);
  if (d < 0.55) return 1;
  if (d > 1.05) return 0;
  return 1 - (d - 0.55) / 0.5;
}

/** One Gaussian's signed contribution at a point. */
function contribution(g, x, y) {
  const dx = (x - g.cx) / g.sx;
  const dy = (y - g.cy) / g.sy;
  return g.amplitude * Math.exp(-0.5 * (dx * dx + dy * dy));
}

/**
 * Every named feature's signed contribution at a point.
 * Negative = pulling the ground down (a valley), positive = pushing it up
 * (a barrier). A feature defined as a valley can push *up* when its parameter
 * is low — the tender middle is the clearest case — so `isRidge` is read from
 * the sign here, never assumed from the feature's category.
 */
export function featureContributions(x, y, params) {
  const groups = [
    { list: getTroughs(params), kind: 'valley' },
    { list: getRidges(params), kind: 'ridge' },
    { list: getSaddles(params), kind: 'pass' },
  ];
  const out = [];
  for (const { list, kind } of groups) {
    for (const g of list) {
      const value = contribution(g, x, y);
      out.push({
        name: g.name,
        kind,
        paramIndex: FEATURE_PARAM[g.name] ?? SADDLE_PARAM[g.name] ?? null,
        value,
        // The feature's own extreme — how high this ridge ever gets, or how
        // deep this valley ever gets. A route that crosses a ridge well below
        // its peak found a lower place to cross, which is a real and usable
        // fact about the journey.
        peak: g.amplitude,
        isRidge: value > 0,
        at: [g.cx, g.cy],
      });
    }
  }
  return out;
}

/**
 * The terrain height at a point, the way the renderer draws it.
 * Returns { raw, mappedness, height } where height = raw · m² (the fog mask).
 */
export function heightAt(x, y, params) {
  const all = [...getTroughs(params), ...getRidges(params), ...getSaddles(params)];
  let raw = 0;
  for (const g of all) raw += contribution(g, x, y);
  const m = mappednessAt(x, y, params);
  return { raw, mappedness: m, height: raw * m * m };
}

/** Plain-language position on the two axes, e.g. "emotional and deep". */
export function quadrantWords(x, y) {
  const across = x < 0.38 ? 'emotional' : x > 0.62 ? 'physical' : 'balanced between emotional and physical';
  const down = y < 0.38 ? 'light' : y > 0.62 ? 'deep' : 'moderately deep';
  return { across, down, phrase: `${across}, ${down}` };
}

const NEAR_FEATURE = 0.12; // contribution magnitude that counts as "at" a feature

/**
 * Describe a point on someone's landscape.
 *
 * `nearest` is the strongest feature at that point — the one whose name the pin
 * should carry. `alsoNear` are the others that still register, which is what
 * makes a pin readable as "in your friendship valley, at the edge of the
 * tender middle" rather than a bare coordinate.
 */
export function describePoint(x, y, params) {
  const { raw, mappedness, height } = heightAt(x, y, params);
  const contribs = featureContributions(x, y, params)
    .filter((c) => Math.abs(c.value) >= NEAR_FEATURE)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const words = quadrantWords(x, y);
  return {
    x,
    y,
    height,
    raw,
    mappedness,
    inFog: mappedness < 0.5,
    onHighGround: height > 0.15,
    inValley: height < -0.15,
    nearest: contribs[0] || null,
    alsoNear: contribs.slice(1, 3),
    quadrant: words,
    /** A short label for the pin itself. */
    label: contribs[0] ? contribs[0].name : words.phrase,
  };
}

/**
 * Keep a point inside the circle the map is actually drawn in.
 *
 * The terrain is computed over the unit square but rendered through a circular
 * mask, so a pin at a corner would be invisible and would describe ground the
 * person never saw. Points outside are projected back onto the rim rather than
 * clamped per-axis, which would slide them along the edge into a corner.
 */
export function constrainToMap(x, y, radius = 0.47) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const d = Math.hypot(dx, dy);
  if (d <= radius) return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  const scale = radius / (d || 1e-9);
  return { x: 0.5 + dx * scale, y: 0.5 + dy * scale };
}
