// Gaussian feature definitions, parameterized by the 13 assessment values (P0–P12)

export const GRID_SIZE = 100;

// Troughs: negative amplitude = valleys
export function getTroughs(params) {
  const [P0, P1, P2, P3, , , , P7, P8, P9, , P11, P12] = params;
  return [
    {
      name: 'Deep friendships',
      cx: 0.18, cy: 0.82,
      sx: 0.14 + P12 * 0.04, sy: 0.14,
      amplitude: -(0.3 + P0 * 0.9),
    },
    {
      name: 'Romantic love',
      cx: 0.62 - P7 * 0.04, cy: 0.85,
      sx: 0.14 + P7 * 0.06, sy: 0.12,
      amplitude: -(0.35 + P1 * 0.7),
    },
    {
      name: 'Tender middle',
      cx: 0.50 + (P3 - P0) * 0.04, cy: 0.50,
      sx: 0.12, sy: 0.12,
      amplitude: P2 > 0.5 ? -(0.1 + (P2 - 0.5) * 1.4) : (0.5 - P2) * 0.8,
    },
    {
      name: 'Casual touch',
      cx: 0.80, cy: 0.30 + P11 * 0.04,
      sx: 0.10, sy: 0.10,
      amplitude: -(0.05 + P3 * 0.55),
    },
    {
      name: 'Mentorship',
      cx: 0.15, cy: 0.40,
      sx: 0.10, sy: 0.12,
      amplitude: -(0.1 + P0 * 0.25),
    },
    {
      name: 'Self-intimacy',
      cx: 0.12, cy: 0.55,
      sx: 0.11 + P8 * 0.04, sy: 0.11,
      amplitude: -(0.05 + P9 * 0.7),
    },
    {
      name: 'Playful connection',
      cx: 0.55, cy: 0.30,
      sx: 0.10, sy: 0.10,
      amplitude: -(0.05 + P11 * 0.5),
    },
    {
      name: 'Secure base',
      cx: 0.35, cy: 0.90,
      sx: 0.10, sy: 0.08,
      amplitude: P12 > 0.5 ? -((P12 - 0.5) * 0.8) : 0,
    },
  ];
}

// Ridges: positive amplitude = barriers
export function getRidges(params) {
  const [, , , , P4, P5, P6, , , , P10, P11, P12] = params;
  return [
    {
      name: 'Empty physicality',
      cx: 0.50, cy: 0.15,
      sx: 0.25 - P11 * 0.06, sy: 0.08,
      amplitude: 0.1 + P4 * 0.8,
    },
    {
      name: 'Ungrounded intensity',
      cx: 0.90, cy: 0.60,
      sx: 0.08, sy: 0.15,
      amplitude: 0.1 + P5 * 0.7,
    },
    {
      name: 'Uncertainty ridge',
      cx: 0.35, cy: 0.70,
      sx: 0.08, sy: 0.08,
      amplitude: P6 > 0.5 ? -((P6 - 0.5) * 0.4) : (0.5 - P6) * 0.8,
    },
    {
      name: 'Conflict ridge',
      cx: 0.40, cy: 0.65,
      sx: 0.08, sy: 0.06,
      amplitude: P10 > 0.5 ? -((P10 - 0.5) * 0.3) : (0.5 - P10) * 0.7,
    },
    {
      name: 'Attachment ridge',
      cx: 0.50, cy: 0.75,
      sx: 0.20, sy: 0.06,
      amplitude: P12 > 0.6 ? -((P12 - 0.6) * 0.3) : (0.6 - P12) * 0.6,
    },
  ];
}

// Saddle passes: connecting topology between valleys
export function getSaddles(params) {
  const [P0, P1, P2, P3, , , , P7, , P9] = params;
  return [
    {
      name: 'Friendship–Romance pass',
      cx: 0.40, cy: 0.83,
      sx: 0.20, sy: 0.04,
      amplitude: -(Math.min(P0, P1) * 0.3 * P7),
    },
    {
      name: 'Tender–Touch pass',
      cx: 0.65, cy: 0.40,
      sx: 0.04, sy: 0.15,
      amplitude: -(Math.min(P2, P3) * 0.35),
    },
    {
      name: 'Friendship–Self pass',
      cx: 0.15, cy: 0.68,
      sx: 0.04, sy: 0.12,
      amplitude: -(Math.min(P0, P9) * 0.3),
    },
  ];
}

// Feature labels that float above the terrain
export const FEATURE_LABELS = [
  { name: 'Deep friendships', x: 0.18, y: 0.82, isRidge: false, paramIndex: 0 },
  { name: 'Romantic love', x: 0.62, y: 0.85, isRidge: false, paramIndex: 1 },
  { name: 'Tender middle', x: 0.50, y: 0.50, isRidge: false, paramIndex: 2 },
  { name: 'Casual touch', x: 0.80, y: 0.30, isRidge: false, paramIndex: 3 },
  { name: 'Empty physicality', x: 0.50, y: 0.13, isRidge: true, paramIndex: 4 },
  { name: 'Ungrounded intensity', x: 0.91, y: 0.60, isRidge: true, paramIndex: 5 },
  { name: 'Uncertainty ridge', x: 0.35, y: 0.70, isRidge: true, paramIndex: 6 },
  { name: 'Mentorship', x: 0.15, y: 0.40, isRidge: false, paramIndex: 0 },
  { name: 'Self-intimacy', x: 0.12, y: 0.55, isRidge: false, paramIndex: 9 },
  { name: 'Playful connection', x: 0.55, y: 0.30, isRidge: false, paramIndex: 11 },
  { name: 'Conflict ridge', x: 0.40, y: 0.65, isRidge: true, paramIndex: 10 },
  { name: 'Attachment ridge', x: 0.50, y: 0.75, isRidge: true, paramIndex: 12 },
  { name: 'Secure base', x: 0.35, y: 0.90, isRidge: false, paramIndex: 12 },
];

// Axis labels at edges
export const AXIS_LABELS = [
  { name: 'Emotional', x: 0.0, y: 0.5 },
  { name: 'Physical', x: 1.0, y: 0.5 },
  { name: 'Shallow', x: 0.5, y: 0.0 },
  { name: 'Deep', x: 0.5, y: 1.0 },
];

// Color ramp: field value → RGB
export const COLOR_RAMP = [
  { val: -1.0, r: 0.10, g: 0.42, b: 0.55 },
  { val: -0.5, r: 0.18, g: 0.58, b: 0.52 },
  { val:  0.0, r: 0.45, g: 0.68, b: 0.40 },
  { val:  0.3, r: 0.78, g: 0.72, b: 0.30 },
  { val:  0.6, r: 0.88, g: 0.52, b: 0.25 },
  { val:  1.0, r: 0.85, g: 0.35, b: 0.32 },
];

// Mappedness ellipse center
export const MAPPED_CENTER = { x: 0.40, y: 0.55 };

// Height multiplier for terrain
export const HEIGHT_SCALE = 0.8;
