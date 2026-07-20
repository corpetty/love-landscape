/**
 * Terrain archetypes — the shareable vocabulary layer over the 13 parameters.
 *
 * Each archetype is a terrain form (the meme unit: "I'm an Archipelago") with a
 * human epithet as subtitle. Assignment is nearest-prototype in parameter space,
 * weighted toward each archetype's signature parameters, so every possible
 * landscape maps to exactly one archetype and coverage is total by construction.
 *
 * Param order (matches computeParams / encoding):
 * [P0 deepFriendships, P1 romanticLove, P2 tenderMiddle, P3 casualTouch,
 *  P4 emptyPhysBarrier, P5 ungroundedBarrier, P6 uncertaintyTolerance,
 *  P7 openness, P8 mapped, P9 selfIntimacy, P10 conflictApproach,
 *  P11 playfulness, P12 attachmentSecurity]
 */

const SIGNATURE_WEIGHT = 3;

export const ARCHETYPES = [
  {
    key: 'archipelago',
    name: 'The Archipelago',
    epithet: 'the sovereign connector',
    essence: 'Deep bonds, many shores.',
    description:
      'Your intimacy is distributed, not diluted: several profound bonds, each with its own ' +
      'shoreline, held together by a secure sense of self. Openness comes naturally because no ' +
      'single island has to be everything. The water between your islands isn\'t distance — ' +
      'it\'s what lets each connection keep its own shape.',
    prototype: [0.9, 0.35, 0.6, 0.75, 0.35, 0.25, 0.75, 0.85, 0.8, 0.85, 0.7, 0.6, 0.8],
    signature: [0, 7, 9, 12],
  },
  {
    key: 'canyon',
    name: 'The Canyon',
    epithet: 'the devoted guardian',
    essence: 'Depth by devotion.',
    description:
      'You love by concentration. Devotion, exclusivity, and structure aren\'t restrictions — ' +
      'they\'re the canyon walls that let the river run deep. What you offer is rare: total ' +
      'presence within chosen boundaries. The walls are expressions of love, not fear.',
    prototype: [0.8, 0.95, 0.3, 0.3, 0.85, 0.9, 0.1, 0.05, 0.8, 0.7, 0.4, 0.4, 0.65],
    signature: [1, 5, 6, 7],
  },
  {
    key: 'volcano',
    name: 'The Volcano',
    epithet: 'the all-in romantic',
    essence: 'Heat that makes new land.',
    description:
      'You connect through intensity — the body leads, the heart follows fast. Romance isn\'t ' +
      'one valley in your landscape; it\'s the engine under all of it. The heat is real, and ' +
      'so is the pressure beneath it: eruptions make new land, but it takes time to become soil.',
    prototype: [0.3, 0.95, 0.4, 0.7, 0.5, 0.55, 0.15, 0.15, 0.3, 0.3, 0.35, 0.6, 0.15],
    signature: [1, 8, 12],
  },
  {
    key: 'mesa',
    name: 'The Mesa',
    epithet: 'the inner fortress',
    essence: 'High ground, chosen guests.',
    description:
      'High ground with steep sides: your richest terrain is on top, and the climb is ' +
      'deliberate. Few are invited; those who are find humor, depth, and a fully-furnished ' +
      'inner world. Solitude isn\'t your fallback — it\'s your capital city.',
    prototype: [0.3, 0.4, 0.2, 0.15, 0.7, 0.4, 0.8, 0.55, 0.75, 0.95, 0.7, 0.85, 0.3],
    signature: [3, 9, 11, 12],
  },
  {
    key: 'frontier',
    name: 'The Frontier',
    epithet: 'the freefall explorer',
    essence: 'The fog is the destination.',
    description:
      'Most of your map is gloriously unmarked. You dive into connection the way explorers ' +
      'cross ridgelines — for the view on the other side. Low walls, light labels, high ' +
      'tolerance for not-knowing. The fog isn\'t hiding anything from you; it\'s where ' +
      'you\'re headed next.',
    prototype: [0.5, 0.55, 0.7, 0.85, 0.2, 0.15, 0.85, 0.85, 0.4, 0.4, 0.7, 0.9, 0.55],
    signature: [6, 7, 8, 9],
  },
  {
    key: 'watershed',
    name: 'The Watershed',
    epithet: 'the integrated guide',
    essence: 'Everything connects.',
    description:
      'Your valleys are linked by passes, your streams reach the same sea: friendship, ' +
      'romance, solitude, and play flow into each other without drama. This kind of balance ' +
      'isn\'t blandness — it\'s infrastructure, built through years of actual repair work.',
    prototype: [0.8, 0.7, 0.85, 0.65, 0.55, 0.35, 0.7, 0.6, 0.85, 0.7, 0.75, 0.6, 0.8],
    signature: [2, 8, 10, 12],
  },
  {
    key: 'hotsprings',
    name: 'The Hot Springs',
    epithet: 'the physical poet',
    essence: 'Warmth is a language.',
    description:
      'Touch, play, and shared movement carry what other people put into words — the body is ' +
      'where your emotional intelligence lives. People relax around you before they understand ' +
      'why. Depth doesn\'t always arrive through conversation; sometimes it soaks in.',
    prototype: [0.3, 0.5, 0.65, 0.95, 0.15, 0.3, 0.7, 0.55, 0.5, 0.5, 0.7, 0.9, 0.55],
    signature: [3, 4, 11],
  },
  {
    key: 'estuary',
    name: 'The Estuary',
    epithet: 'the tender-middle native',
    essence: 'Richest where waters mix.',
    description:
      'You live where the river meets the sea — the fertile mixing zone between friendship and ' +
      'romance that most maps refuse to chart. Unlabeled doesn\'t mean unserious: estuaries are ' +
      'the richest ecosystems there are. Your best connections may never fit a category, and ' +
      'they don\'t need to.',
    prototype: [0.65, 0.45, 0.9, 0.7, 0.35, 0.2, 0.9, 0.7, 0.6, 0.6, 0.6, 0.65, 0.6],
    signature: [2, 6],
  },
  {
    key: 'highlands',
    name: 'The Highlands',
    epithet: 'the self-companioned',
    essence: 'Clear air, long views.',
    description:
      'Your relationship with yourself is the deepest valley on the map, held with security ' +
      'rather than defense. Others are genuinely welcome — and their absence is not an ' +
      'emergency. You bring a settled quality to connection that can\'t be faked: the company ' +
      'of someone who is already home.',
    prototype: [0.55, 0.35, 0.4, 0.35, 0.6, 0.5, 0.6, 0.45, 0.85, 0.95, 0.65, 0.45, 0.8],
    signature: [8, 9, 12],
  },
  {
    key: 'terraces',
    name: 'The Terraces',
    epithet: 'the careful romantic',
    essence: 'Grown level by level.',
    description:
      'You build love the way terraces are farmed: patiently, level by level, with real ' +
      'engineering under the green. Emotional grounding before physical closeness, trust ' +
      'before intensity. Slow is not timid — it\'s how you grow things that last.',
    prototype: [0.85, 0.9, 0.45, 0.25, 0.9, 0.6, 0.3, 0.2, 0.8, 0.75, 0.25, 0.4, 0.6],
    signature: [0, 1, 4, 10],
  },
];

/**
 * Weighted distance between a landscape and an archetype prototype.
 * Signature params count SIGNATURE_WEIGHT×; the rest 1×.
 */
function distance(params, archetype) {
  let sum = 0;
  let wsum = 0;
  for (let i = 0; i < archetype.prototype.length; i++) {
    const w = archetype.signature.includes(i) ? SIGNATURE_WEIGHT : 1;
    const d = (params[i] ?? 0.5) - archetype.prototype[i];
    sum += w * d * d;
    wsum += w;
  }
  return Math.sqrt(sum / wsum);
}

/**
 * Assign an archetype to a 13-param landscape.
 * Returns { archetype, runnerUp, margin } where margin ∈ [0,1] is the distance
 * gap to the runner-up (small margin = "with edges of the runner-up").
 */
export function computeArchetype(params) {
  if (!Array.isArray(params) || params.length < 13) return null;

  const ranked = ARCHETYPES
    .map((a) => ({ archetype: a, dist: distance(params, a) }))
    .sort((a, b) => a.dist - b.dist);

  return {
    archetype: ranked[0].archetype,
    runnerUp: ranked[1].archetype,
    margin: ranked[1].dist - ranked[0].dist,
  };
}
