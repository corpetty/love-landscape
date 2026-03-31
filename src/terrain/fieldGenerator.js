import { GRID_SIZE, getTroughs, getRidges, getSaddles, MAPPED_CENTER } from './constants.js';

/**
 * Generate the scalar field from 13 parameters.
 * Returns { field: Float32Array, mappedness: Float32Array, min, max }
 * Both arrays are GRID_SIZE * GRID_SIZE, row-major (y * GRID_SIZE + x).
 */
export function generateField(params) {
  const N = GRID_SIZE;
  const gaussians = [...getTroughs(params), ...getRidges(params), ...getSaddles(params)];
  const P8 = params[8];

  // Mappedness radii
  const rx = (0.32 + P8 * 0.28) + 0.16;
  const ry = (0.32 + P8 * 0.28) + 0.14;

  const field = new Float32Array(N * N);
  const mappedness = new Float32Array(N * N);

  let min = Infinity;
  let max = -Infinity;

  for (let j = 0; j < N; j++) {
    const y = j / (N - 1);
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const idx = j * N + i;

      // Sum of Gaussians
      let val = 0;
      for (const g of gaussians) {
        const dx = (x - g.cx) / g.sx;
        const dy = (y - g.cy) / g.sy;
        val += g.amplitude * Math.exp(-0.5 * (dx * dx + dy * dy));
      }

      // Mappedness
      const mdx = (x - MAPPED_CENTER.x) / rx;
      const mdy = (y - MAPPED_CENTER.y) / ry;
      const d = Math.sqrt(mdx * mdx + mdy * mdy);
      let m;
      if (d < 0.55) m = 1;
      else if (d > 1.05) m = 0;
      else m = 1 - (d - 0.55) / 0.5;

      mappedness[idx] = m;

      // Apply mappedness to height
      val *= m * m;

      field[idx] = val;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }

  return { field, mappedness, min, max };
}

/**
 * Generate the raw scalar field (no mappedness masking) for analysis.
 * Returns { field: Float32Array, mappedness: Float32Array, min, max }
 */
export function generateRawField(params) {
  const N = GRID_SIZE;
  const gaussians = [...getTroughs(params), ...getRidges(params), ...getSaddles(params)];
  const P8 = params[8];

  const rx = (0.32 + P8 * 0.28) + 0.16;
  const ry = (0.32 + P8 * 0.28) + 0.14;

  const field = new Float32Array(N * N);
  const mappedness = new Float32Array(N * N);

  let min = Infinity;
  let max = -Infinity;

  for (let j = 0; j < N; j++) {
    const y = j / (N - 1);
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const idx = j * N + i;

      let val = 0;
      for (const g of gaussians) {
        const dx = (x - g.cx) / g.sx;
        const dy = (y - g.cy) / g.sy;
        val += g.amplitude * Math.exp(-0.5 * (dx * dx + dy * dy));
      }

      // Mappedness computed but NOT applied to field
      const mdx = (x - MAPPED_CENTER.x) / rx;
      const mdy = (y - MAPPED_CENTER.y) / ry;
      const d = Math.sqrt(mdx * mdx + mdy * mdy);
      let m;
      if (d < 0.55) m = 1;
      else if (d > 1.05) m = 0;
      else m = 1 - (d - 0.55) / 0.5;

      mappedness[idx] = m;
      field[idx] = val;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }

  return { field, mappedness, min, max };
}

/**
 * Generate a combined (averaged) field from two parameter sets.
 */
export function generateCombinedField(paramsA, paramsB) {
  const N = GRID_SIZE;
  const a = generateField(paramsA);
  const b = generateField(paramsB);

  const field = new Float32Array(N * N);
  const mappedness = new Float32Array(N * N);

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < N * N; i++) {
    field[i] = (a.field[i] + b.field[i]) / 2;
    mappedness[i] = Math.max(a.mappedness[i], b.mappedness[i]);
    if (field[i] < min) min = field[i];
    if (field[i] > max) max = field[i];
  }

  return { field, mappedness, min, max };
}
