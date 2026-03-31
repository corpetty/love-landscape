/**
 * Compute the 13 terrain parameters from assessment answers.
 * @param {Object} answers - Map of question id → value (0–1)
 * @returns {number[]} Array of 13 params, each clamped to [0, 1]
 */
export function computeParams(answers) {
  const g = (id) => answers[id] ?? 0.5;
  const clamp = (v) => Math.max(0, Math.min(1, v));

  return [
    /* P0  deepFriendships      */ clamp(0.15 + g('q1') * 0.5 + g('q11') * 0.25 + g('q13') * 0.1),
    /* P1  romanticLove         */ clamp(0.05 + (1 - g('q6')) * 0.3 + (1 - g('q1')) * 0.2 + (1 - g('q7')) * 0.2 + (1 - g('q11')) * 0.15),
    /* P2  tenderMiddle         */ clamp(g('q4') * 0.45 + g('q8') * 0.15 + g('q2') * 0.1 + g('q3') * 0.1 + g('q15') * 0.1 + 0.1),
    /* P3  casualTouch          */ clamp(g('q2') * 0.45 + g('q5') * 0.25 + g('q3') * 0.15 + 0.1),
    /* P4  emptyPhysBarrier     */ clamp((1 - g('q3')) * 0.45 + (1 - g('q5')) * 0.3 + (1 - g('q4')) * 0.1 + 0.05),
    /* P5  ungroundedBarrier    */ clamp((1 - g('q6')) * 0.3 + (1 - g('q17')) * 0.25 + (1 - g('q8')) * 0.2 + 0.05),
    /* P6  uncertaintyTolerance */ clamp(g('q8') * 0.35 + g('q17') * 0.2 + g('q7') * 0.15 + g('q12') * 0.1 + 0.1),
    /* P7  openness             */ clamp(g('q6') * 0.3 + g('q7') * 0.25 + g('q11') * 0.2 + g('q12') * 0.15 + 0.05),
    /* P8  mapped               */ clamp(g('q10') * 0.3 + g('q9') * 0.25 + g('q13') * 0.15 + g('q17') * 0.1 + g('q4') * 0.05 + 0.1),
    /* P9  selfIntimacy         */ clamp(g('q13') * 0.5 + g('q10') * 0.15 + g('q12') * 0.1 + 0.1),
    /* P10 conflictApproach     */ clamp(g('q14') * 0.45 + g('q8') * 0.15 + g('q16') * 0.15 + 0.1),
    /* P11 playfulness          */ clamp(g('q15') * 0.5 + g('q4') * 0.15 + g('q12') * 0.1 + 0.1),
    /* P12 attachmentSecurity   */ clamp(g('q16') * 0.4 + g('q7') * 0.15 + g('q1') * 0.1 + g('q14') * 0.1 + 0.1),
  ];
}
