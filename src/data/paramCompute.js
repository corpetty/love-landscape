/**
 * The 13 terrain parameters, as a weighted combination of assessment answers.
 *
 * PARAM_WEIGHTS is the single source of truth: computeParams() derives the
 * score from it, and the interactive terrain-engine page (TerrainEngine.jsx)
 * reads the same table to render the weight matrix and per-question
 * contributions. Keeping one table means the UI can never drift from the
 * actual scoring — change a weight here and both update together.
 *
 * A negative coefficient means the dimension is defined as the *inverse* of
 * that question (e.g. emptyPhysBarrier rises as q3 falls) — algebraically
 * identical to the original `(1 - g(qX)) * w` form, just flattened into a
 * constant + linear-coefficients shape so it's data instead of arithmetic.
 */
export const PARAM_WEIGHTS = [
  { key: 'deepFriendships', constant: 0.15, coefs: { q1: 0.5, q11: 0.25, q13: 0.1 } },
  { key: 'romanticLove', constant: 0.05, coefs: { q18: 0.55, q19: 0.4 } },
  { key: 'tenderMiddle', constant: 0.1, coefs: { q4: 0.45, q8: 0.15, q2: 0.1, q3: 0.1, q15: 0.1 } },
  { key: 'casualTouch', constant: 0.1, coefs: { q2: 0.45, q5: 0.25, q3: 0.15 } },
  { key: 'emptyPhysBarrier', constant: 0.9, coefs: { q3: -0.45, q5: -0.3, q4: -0.1 } },
  { key: 'ungroundedBarrier', constant: 0.8, coefs: { q6: -0.3, q17: -0.25, q8: -0.2 } },
  { key: 'uncertaintyTolerance', constant: 0.1, coefs: { q8: 0.35, q17: 0.2, q7: 0.15, q12: 0.1 } },
  { key: 'openness', constant: 0.05, coefs: { q6: 0.3, q7: 0.25, q11: 0.2, q12: 0.15 } },
  { key: 'mapped', constant: 0.1, coefs: { q10: 0.3, q9: 0.25, q13: 0.15, q17: 0.1, q4: 0.05 } },
  { key: 'selfIntimacy', constant: 0.1, coefs: { q13: 0.5, q10: 0.15, q12: 0.1 } },
  { key: 'conflictApproach', constant: 0.1, coefs: { q14: 0.45, q8: 0.15, q16: 0.15 } },
  { key: 'playfulness', constant: 0.1, coefs: { q15: 0.5, q4: 0.15, q12: 0.1 } },
  { key: 'attachmentSecurity', constant: 0.1, coefs: { q16: 0.4, q7: 0.15, q1: 0.1, q14: 0.1 } },
];

/**
 * Compute the 13 terrain parameters from assessment answers.
 * @param {Object} answers - Map of question id → value (0–1)
 * @returns {number[]} Array of 13 params, each clamped to [0, 1]
 */
export function computeParams(answers) {
  const g = (id) => answers[id] ?? 0.5;
  const clamp = (v) => Math.max(0, Math.min(1, v));

  return PARAM_WEIGHTS.map(({ constant, coefs }) => {
    let v = constant;
    for (const qid in coefs) v += coefs[qid] * g(qid);
    return clamp(v);
  });
}
