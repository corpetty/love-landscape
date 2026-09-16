/**
 * pathfinder.js — the route between where a bond stands and where it wants to be.
 *
 * The whole Growth Journey feature rests on one idea: on a terrain, the effort
 * between two points is not the distance, it is the *climb*. Two people can want
 * a small move that crosses a wall, or a large move over flat ground, and those
 * are completely different relationships. A least-cost path over the height
 * field separates them, and — because every bump in the field is a named
 * Gaussian tied to a parameter — it can say which of the owner's barriers the
 * route crosses.
 *
 * Routes are always computed on ONE person's terrain. A's ridges are A's. The
 * combined field is deliberately not used: averaging two terrains hides whose
 * barrier it is, which is exactly the fact the narrative needs.
 *
 * Pure functions, no React, no DOM.
 */

import { GRID_SIZE } from './constants.js';
import { generateField } from './fieldGenerator.js';
import { featureContributions, describePoint } from './placement.js';

/**
 * Cost of one grid step:
 *   distance · (1 + FOG_WEIGHT · fog) + CLIMB_WEIGHT · max(0, Δheight)
 *
 * Descending is free — falling into a valley takes no effort, which is the
 * point of a valley. Only the climb is charged.
 *
 * CLIMB_WEIGHT is the constant that decides whether a route goes over a ridge
 * or around it, so it is the one number in this feature that changes the story.
 * At 1.6, a climb of 0.5 (a moderate barrier) costs 0.8 — about the same as
 * walking most of the way across the map — so a moderate ridge is worth a long
 * detour but a shallow one is not. tests/pathfinder.test.js locks the resulting
 * over-vs-around behaviour on the seed personas; change this and those fail.
 */
export const CLIMB_WEIGHT = 1.6;

/** Fog is not a wall — it is unknown ground, and costs about double to cross. */
export const FOG_WEIGHT = 1.0;

/** Contribution magnitudes at which a feature counts as crossed / visited. */
const RIDGE_ON_ROUTE = 0.15;
const VALLEY_ON_ROUTE = 0.15;
const PASS_ON_ROUTE = 0.05;

/**
 * Story-type bands. `NEAR_PATH_LENGTH` is in map units (the map is 1×1).
 *
 * Steepness is the CREST: how far the route's highest point rises above where
 * the bond stands today. Two rejected alternatives, for the record:
 *   - total climb grows with route length, so a long flat road out-scores a
 *     short wall — it cannot separate the two "far" stories from the two
 *     "near" ones;
 *   - the wall above BOTH endpoints (kept below as `barrier`) is zero on most
 *     real journeys, because the destination is usually itself the high point.
 * The crest is also the honest reading of the model: a deep valley holds a
 * relationship, so moving a bond out of one is real work, and how deep that
 * valley is differs hugely between people.
 *
 * Tuned on the eight seed personas across five representative journeys so that
 * all four story types occur and split the personas rather than the journeys
 * (see tests/pathfinder.test.js, which locks the split).
 */
const NEAR_PATH_LENGTH = 0.45;
const STEEP_CREST = 0.45;

/** A wall standing above BOTH ends of the journey — rarer, and its own flag. */
const TRUE_WALL_BARRIER = 0.1;

/** A ridge the straight line would have hit, for the "went around it" fact. */
const SKIRTED_RIDGE = 0.2;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Nearest grid node to a normalized point. */
function toNode(x, y) {
  const N = GRID_SIZE;
  const i = Math.round(clamp01(x) * (N - 1));
  const j = Math.round(clamp01(y) * (N - 1));
  return j * N + i;
}

function toPoint(idx) {
  const N = GRID_SIZE;
  return [(idx % N) / (N - 1), Math.floor(idx / N) / (N - 1)];
}

/**
 * Minimal binary heap. 10k nodes × 8 neighbours is small, but a linear scan
 * would still make this ~100× slower for no reason, and the picker recomputes
 * the route on every drag.
 */
class MinHeap {
  constructor() { this.keys = []; this.vals = []; }
  get size() { return this.keys.length; }
  push(key, val) {
    this.keys.push(key); this.vals.push(val);
    let i = this.keys.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this._swap(p, i); i = p;
    }
  }
  pop() {
    const topVal = this.vals[0];
    const lastKey = this.keys.pop();
    const lastVal = this.vals.pop();
    if (this.keys.length > 0) {
      this.keys[0] = lastKey; this.vals[0] = lastVal;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this._swap(m, i); i = m;
      }
    }
    return topVal;
  }
  _swap(a, b) {
    const k = this.keys[a]; this.keys[a] = this.keys[b]; this.keys[b] = k;
    const v = this.vals[a]; this.vals[a] = this.vals[b]; this.vals[b] = v;
  }
}

/** Dijkstra over the 8-connected height field. Returns the node index chain. */
function shortestPath(field, mappedness, startIdx, endIdx) {
  const N = GRID_SIZE;
  const step = 1 / (N - 1);
  const total = N * N;
  const dist = new Float64Array(total).fill(Infinity);
  const prev = new Int32Array(total).fill(-1);
  const done = new Uint8Array(total);

  dist[startIdx] = 0;
  const heap = new MinHeap();
  heap.push(0, startIdx);

  while (heap.size > 0) {
    const u = heap.pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === endIdx) break;

    const ui = u % N;
    const uj = (u / N) | 0;
    const uh = field[u];

    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (di === 0 && dj === 0) continue;
        const vi = ui + di;
        const vj = uj + dj;
        if (vi < 0 || vi >= N || vj < 0 || vj >= N) continue;
        const v = vj * N + vi;
        if (done[v]) continue;

        const d = (di !== 0 && dj !== 0) ? step * Math.SQRT2 : step;
        const climb = Math.max(0, field[v] - uh);
        const fog = 1 - (mappedness[u] + mappedness[v]) / 2;
        const cost = d * (1 + FOG_WEIGHT * fog) + CLIMB_WEIGHT * climb;

        const alt = dist[u] + cost;
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
          heap.push(alt, v);
        }
      }
    }
  }

  if (dist[endIdx] === Infinity) return null;
  const chain = [];
  for (let at = endIdx; at !== -1; at = prev[at]) chain.push(at);
  chain.reverse();
  return { chain, cost: dist[endIdx] };
}

/**
 * Drop collinear points so the rendered route is a handful of segments rather
 * than a 200-cell staircase. Perpendicular-distance simplification.
 */
function simplify(points, tolerance = 0.012) {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    let worst = -1;
    let worstIdx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dev = Math.abs((px - ax) * dy - (py - ay) * dx) / len;
      if (dev > worst) { worst = dev; worstIdx = i; }
    }
    if (worst > tolerance) {
      keep[worstIdx] = 1;
      stack.push([a, worstIdx], [worstIdx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Which named features the route actually passes through, in the order it
 * meets them. This is the narrative's raw material: each entry carries the
 * owner's parameter index, so the copy can say "your empty-physicality ridge"
 * instead of an anonymous "a barrier".
 */
function featuresAlongRoute(points, params) {
  const ridges = new Map();
  const valleys = new Map();
  const passes = new Map();

  points.forEach(([x, y], order) => {
    for (const c of featureContributions(x, y, params)) {
      if (c.value > 0 && c.value >= RIDGE_ON_ROUTE) {
        const cur = ridges.get(c.name);
        if (!cur || c.value > cur.height) {
          ridges.set(c.name, {
            name: c.name,
            paramIndex: c.paramIndex,
            height: c.value,
            peak: c.peak,
            // A crossing well below the ridge's own summit means the route
            // found a saddle — worth saying, because it is the difference
            // between "you must climb this" and "there is a lower way over".
            lowerCrossing: c.value < c.peak - 0.08,
            at: [x, y],
            order,
          });
        }
      } else if (c.value < 0) {
        const depth = -c.value;
        const bucket = c.kind === 'pass' ? passes : valleys;
        const threshold = c.kind === 'pass' ? PASS_ON_ROUTE : VALLEY_ON_ROUTE;
        if (depth >= threshold) {
          const cur = bucket.get(c.name);
          if (!cur || depth > cur.depth) {
            bucket.set(c.name, { name: c.name, paramIndex: c.paramIndex, depth, at: [x, y], order });
          }
        }
      }
    }
  });

  const byOrder = (a, b) => a.order - b.order;
  return {
    ridgesCrossed: [...ridges.values()].sort(byOrder),
    valleysVisited: [...valleys.values()].sort(byOrder),
    passesUsed: [...passes.values()].sort(byOrder),
  };
}

/**
 * Ridges the direct line would have crossed but the route went around.
 * "You did not have to cross it" is as much a part of the story as crossing:
 * it says the barrier is real, and that the way around it is longer.
 */
function ridgesSkirted(params, start, end, crossedNames) {
  const found = new Map();
  const STEPS = 60;
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    for (const c of featureContributions(x, y, params)) {
      if (c.value < SKIRTED_RIDGE) continue;
      if (crossedNames.has(c.name)) continue;
      const cur = found.get(c.name);
      if (!cur || c.value > cur.height) {
        found.set(c.name, { name: c.name, paramIndex: c.paramIndex, height: c.value, at: [x, y] });
      }
    }
  }
  return [...found.values()].sort((a, b) => b.height - a.height);
}

/** The 2×2 on distance × crest — see docs/love-difference-plan.md §4. */
function classify(pathLength, crest) {
  const near = pathLength <= NEAR_PATH_LENGTH;
  const steep = crest >= STEEP_CREST;
  if (near && !steep) return 'short-walk';
  if (near && steep) return 'the-wall';
  if (!near && !steep) return 'long-road';
  return 'expedition';
}

/**
 * Compute the route across `params`' terrain from `start` to `end`.
 *
 * @param {number[]} params 13 terrain parameters — whose landscape this is
 * @param {{x:number,y:number}} start where the bond stands today
 * @param {{x:number,y:number}} end where it wants to be
 * @param {{exclusivity?: number|null}} [opts] optional wished exclusivity (0–1)
 * @returns {object|null} path facts, or null on invalid input
 */
export function findPath(params, start, end, opts = {}) {
  if (!Array.isArray(params) || params.length < 13) return null;
  if (!start || !end || !Number.isFinite(start.x) || !Number.isFinite(start.y)
      || !Number.isFinite(end.x) || !Number.isFinite(end.y)) return null;

  const sx = clamp01(start.x), sy = clamp01(start.y);
  const ex = clamp01(end.x), ey = clamp01(end.y);

  const { field, mappedness } = generateField(params);
  const startIdx = toNode(sx, sy);
  const endIdx = toNode(ex, ey);

  const startPoint = describePoint(sx, sy, params);
  const endPoint = describePoint(ex, ey, params);
  const straightDistance = Math.hypot(ex - sx, ey - sy);

  // Same cell: there is no journey to describe, but the caller still wants the
  // two descriptions, so return a well-formed zero-length result.
  if (startIdx === endIdx) {
    return {
      polyline: [[sx, sy], [ex, ey]],
      straightDistance,
      pathLength: straightDistance,
      totalClimb: 0,
      totalDescent: 0,
      peakHeight: startPoint.height,
      crest: 0,
      barrier: 0,
      detourRatio: 1,
      fogFraction: 1 - startPoint.mappedness,
      ridgesCrossed: [],
      ridgesSkirted: [],
      valleysVisited: [],
      passesUsed: [],
      start: startPoint,
      end: endPoint,
      storyType: 'short-walk',
      flags: buildFlags(startPoint, endPoint, 1 - startPoint.mappedness),
      exclusivity: exclusivityFacts(params, opts.exclusivity),
    };
  }

  const result = shortestPath(field, mappedness, startIdx, endIdx);
  if (!result) return null;

  const cells = result.chain.map(toPoint);
  // Anchor the drawn route at the exact pins, not the grid nodes they snapped to.
  cells[0] = [sx, sy];
  cells[cells.length - 1] = [ex, ey];

  let pathLength = 0;
  let totalClimb = 0;
  let totalDescent = 0;
  let fogSum = 0;
  let peakHeight = -Infinity;
  for (let i = 0; i < result.chain.length; i++) {
    fogSum += 1 - mappedness[result.chain[i]];
    if (field[result.chain[i]] > peakHeight) peakHeight = field[result.chain[i]];
    if (i === 0) continue;
    const [px, py] = cells[i - 1];
    const [cx, cy] = cells[i];
    pathLength += Math.hypot(cx - px, cy - py);
    const dh = field[result.chain[i]] - field[result.chain[i - 1]];
    if (dh > 0) totalClimb += dh; else totalDescent -= dh;
  }
  const fogFraction = fogSum / result.chain.length;

  const { ridgesCrossed, valleysVisited, passesUsed } = featuresAlongRoute(cells, params);
  const crest = Math.max(0, peakHeight - startPoint.height);
  const barrier = Math.max(0, peakHeight - Math.max(startPoint.height, endPoint.height));
  const skirted = ridgesSkirted(
    params, { x: sx, y: sy }, { x: ex, y: ey },
    new Set(ridgesCrossed.map((r) => r.name)),
  );

  return {
    polyline: simplify(cells),
    straightDistance,
    pathLength,
    totalClimb,
    totalDescent,
    peakHeight,
    crest,
    barrier,
    detourRatio: straightDistance > 1e-6 ? pathLength / straightDistance : 1,
    fogFraction,
    ridgesCrossed,
    ridgesSkirted: skirted,
    valleysVisited,
    passesUsed,
    start: startPoint,
    end: endPoint,
    storyType: classify(pathLength, crest),
    flags: buildFlags(startPoint, endPoint, fogFraction, barrier),
    exclusivity: exclusivityFacts(params, opts.exclusivity),
  };
}

function buildFlags(startPoint, endPoint, fogFraction, barrier = 0) {
  const flags = [];
  if (barrier >= TRUE_WALL_BARRIER) flags.push('wall-between');
  if (endPoint.inFog) flags.push('end-in-fog');
  if (endPoint.onHighGround) flags.push('end-on-ridge');
  if (endPoint.inValley) flags.push('end-in-valley');
  if (startPoint.inValley) flags.push('start-in-valley');
  if (startPoint.inFog) flags.push('start-in-fog');
  if (fogFraction > 0.4) flags.push('route-through-fog');
  return flags;
}

/**
 * The optional exclusivity wish, set against the owner's own wiring.
 * P7 is openness (high = multiplicity feels natural); P5 is the need for
 * structure before intensity. A wish for exclusivity on a high-openness
 * terrain — or the reverse — is its own kind of ridge, one the map's two axes
 * cannot show. Returns null when the wish was left unset, and the narrative
 * then says nothing about it.
 */
function exclusivityFacts(params, wished) {
  if (wished == null || !Number.isFinite(wished)) return null;
  const w = clamp01(wished);
  const ownerOpenness = params[7];
  // Owner's own implied exclusivity preference is the inverse of openness.
  const ownerExclusivity = 1 - ownerOpenness;
  const gap = w - ownerExclusivity;
  return {
    wished: w,
    ownerOpenness,
    ownerExclusivity,
    ownerStructureNeed: params[5],
    gap,
    aligned: Math.abs(gap) < 0.2,
    direction: gap > 0 ? 'wants-more-exclusive' : gap < 0 ? 'wants-more-open' : 'matched',
  };
}
