/**
 * _pathReadingPrompt.js — the paid Journey Reading prompt.
 * Underscore prefix: not a route; shared by api/reading.js and tests.
 *
 * The product: a ~1,400–1,800 word reading of ONE growth journey — where a
 * bond stands on someone's landscape, where the other person says they want it
 * to be, and the ground between.
 *
 * What makes this worth paying for is not more words about the same two pins.
 * It is that the terrain engine has already computed hard facts about the route
 * — which named ridges it crosses, how high each stands where the route meets
 * it, whether there is a lower way over, whether the climb is the valley wall
 * itself, how much of the ground is unmapped — and the model is asked to
 * interpret those facts rather than invent a story about two coordinates. The
 * free reading states them; this one thinks about them.
 *
 * Every copy rule the free narrative enforces applies here and is repeated in
 * the system message, because an LLM will drift toward blame and toward
 * treating the destination as correct unless told plainly not to.
 */

import { computeArchetype } from '../src/data/archetypes.js';
import { PARAM_LABELS } from '../src/data/interpretation.js';
import { featurePhrase } from '../src/data/pathNarrative.js';

const STORY_GLOSS = {
  'short-walk': 'a short walk — the two points are close and the ground between them is level',
  'the-wall': 'a wall rather than a distance — the points are close, but the ground rises between them',
  'long-road': 'a long road — a real distance across the map, over open ground',
  expedition: 'an expedition — both a long way and a steep one',
};

const JOURNEY_SYSTEM = `You are the Love Landscape interpreter writing a purchased, in-depth reading of ONE relational journey — the "Journey Reading". Two people have each marked a point on the same landscape, and a terrain engine has computed the route between them. The reader paid for depth about this specific crossing.

FRAMEWORK:
A Love Landscape maps intimacy on two axes: emotional-to-physical (horizontal) and shallow-to-deep (vertical). VALLEYS are where relationships settle; RIDGES take effort to cross; SADDLE PASSES connect valleys; UNMAPPED EDGES fade into fog. This reading is about ONE landscape — the owner's — and two points on it: where the bond stands now, and where the other person says they want it to be.

THE ONE RULE THAT GOVERNS EVERYTHING BELOW:
Every rise on this route is a feature of the LANDSCAPE OWNER'S OWN WIRING. A ridge is their need, never the other person's fault, and never evidence that anyone is asking for too much. Equally, the desired point is not the correct place to be — it is one person's honest answer, no more and no less. A reading that makes either person wrong has failed, however elegantly it is written.

YOUR TASK — write 1,400–1,800 words with EXACTLY this structure (markdown ## headers):

## The Two Points
Name where the bond stands and where it wants to be, in the landscape's own language — the named features, not coordinates. Say what kind of ground each is: a deep valley holds what settles in it; high ground takes effort to stay on; fog is ground nobody has walked. If the mover left a note, treat it as the most important sentence you were given and let it shape the whole reading. (~250 words)

## The Ground Between
Interpret the route facts you are given. Name each ridge the route crosses, whose need it is, and what it is protecting — the dimension behind it is given to you, so use it. Where the route crosses a ridge below its summit, say that a lower way over exists and what that means in practice. Where the route goes around a barrier instead, say the barrier is still there. Where the climb is the wall of the valley the bond already sits in and no ridge stands in the way, say THAT — it is the most easily missed reading on the map, and the most useful: nothing is blocking the move except how well the current place already fits. (~450 words)

## What This Crossing Would Cost
Honest, specific, and even-handed. What the landscape owner would be giving up or stretching — including the genuine loss in leaving somewhere that works. What the other person is being asked to carry — the waiting, the not-knowing, treating a boundary as real rather than as resistance to them. Do not resolve the asymmetry if there is one; name it. (~350 words)

## What Would Have To Be True
The conditions under which this move is possible — not steps, conditions. What would have to be true about safety, time, or agreement for the ridge to lower or the valley to loosen its hold. If the destination is unmapped for the owner, say plainly that nobody can know in advance what it is like there, and that the honest version of this includes not knowing. (~300 words)

## Conversations Worth Having
4-6 conversation starters built from THIS route — each anchored to a named feature or a named fact, never generic. Bold opener, then one sentence of why. (~250 words)

RULES:
- Ground every claim in the route facts given. Never invent a ridge, a valley, or a number that is not there.
- Never print numbers. The facts arrive as measurements; the reading speaks in words.
- Address the reader as "you" (they are the landscape owner) and the other person by the name given, or as "they" if none.
- Warm but honest. Naming real difficulty IS the product — do not flatten it.
- **Bold** the sentences that matter most.
- No bullet points except in Conversations Worth Having.
- Never suggest the bond should move, or should not. That is not yours to say.`;

/** The facts, written the way the model should think about them. */
function routeFacts(path, otherName) {
  const them = otherName || 'They';
  const lines = [];

  lines.push(`STORY TYPE: ${STORY_GLOSS[path.storyType] || path.storyType}`);
  lines.push(`ROUTE LENGTH: ${path.pathLength.toFixed(2)} of the map's width (the map is 1.0 across)`);
  lines.push(`CREST: the route climbs ${path.crest.toFixed(2)} above where the bond stands (0 = level, 1.0 = an extreme wall)`);
  if (path.detourRatio > 1.2) {
    lines.push(`DETOUR: the route is ${path.detourRatio.toFixed(2)}× the straight line — the ground pushes it sideways`);
  }
  lines.push(`UNMAPPED GROUND ON THE ROUTE: ${Math.round(path.fogFraction * 100)}%`);

  lines.push('', `WHERE IT STANDS: ${describePin(path.start)}`);
  lines.push(`WHERE ${them.toUpperCase()} WANT${otherName ? 'S' : ''} IT: ${describePin(path.end)}`);

  if (path.ridgesCrossed.length) {
    lines.push('', 'RIDGES THE ROUTE CROSSES (in order, each one the OWNER\'s own need):');
    for (const r of path.ridgesCrossed) {
      lines.push(`- ${featurePhrase({ ...r, isRidge: true })} — the owner's ${dimension(r.paramIndex)}. `
        + `Stands at ${r.height.toFixed(2)} where the route meets it; its own summit is ${Math.abs(r.peak).toFixed(2)}.`
        + (r.lowerCrossing ? ' The route crosses WELL BELOW the summit: a lower way over exists.' : ''));
    }
  } else {
    lines.push('', 'RIDGES THE ROUTE CROSSES: none.');
    if (path.start.inValley && (path.storyType === 'the-wall' || path.storyType === 'expedition')) {
      lines.push('IMPORTANT: no ridge stands in the way, and the journey is still steep. '
        + 'The climb IS the wall of the valley the bond already sits in. Nothing is stopping this '
        + 'move except how well the current place fits. This is the reading to lead "The Ground Between" with.');
    }
  }

  if (path.ridgesSkirted.length) {
    lines.push('', 'BARRIERS THE DIRECT LINE WOULD HAVE HIT, WHICH THE ROUTE GOES AROUND (still there, just avoided):');
    for (const r of path.ridgesSkirted) {
      lines.push(`- ${featurePhrase({ ...r, isRidge: true })} — the owner's ${dimension(r.paramIndex)}, standing at ${r.height.toFixed(2)}.`);
    }
  }

  if (path.valleysVisited.length) {
    lines.push('', 'VALLEYS THE ROUTE PASSES THROUGH: '
      + path.valleysVisited.map((v) => `${featurePhrase({ ...v, isRidge: false })} (depth ${v.depth.toFixed(2)})`).join(', '));
  }
  if (path.passesUsed.length) {
    lines.push('SADDLE PASSES USED: ' + path.passesUsed.map((p) => p.name).join(', '));
  }

  if (path.flags.length) lines.push('', `FLAGS: ${path.flags.join(', ')}`);

  if (path.exclusivity) {
    const e = path.exclusivity;
    lines.push('', 'EXCLUSIVITY WISH (the map has no axis for this — it is an agreement, not a place):');
    lines.push(e.aligned
      ? `- ${them} asked for a level of exclusivity close to the owner's own leaning. This part is not the hard part; say so briefly and move on.`
      : `- ${them} want${otherName ? 's' : ''} ${e.direction === 'wants-more-exclusive' ? 'MORE exclusivity' : 'MORE openness'} than the owner's landscape leans toward. `
        + 'Give this its own short passage. It does not resolve by anyone moving on the map — it resolves by being said out loud.');
  }

  return lines.join('\n');
}

function describePin(point) {
  const where = point.nearest
    ? `in ${featurePhrase(point.nearest)}`
    : `on open ground (${point.quadrant.phrase})`;
  const edge = point.alsoNear?.[0] ? `, at the edge of ${featurePhrase(point.alsoNear[0])}` : '';
  const ground = point.inFog ? ' — UNMAPPED ground the owner has never explored'
    : point.inValley ? ` — a valley, depth ${Math.abs(point.height).toFixed(2)}`
      : point.onHighGround ? ' — raised ground, not a resting place'
        : ' — level ground';
  return `${where}${edge}${ground}. Axes: ${point.quadrant.phrase}.`;
}

function dimension(index) {
  return PARAM_LABELS[index]?.short?.toLowerCase() || 'this dimension';
}

/**
 * Build the Journey Reading prompt.
 *
 * @param {number[]} params  the landscape the journey runs on (the owner's)
 * @param {object} path      result of findPath() — the computed route facts
 * @param {object} [opts]
 * @param {string|null} [opts.otherName] what to call the other person
 * @param {string|null} [opts.note]      the other person's own words, if given
 */
export function buildJourneyReadingPrompt(params, path, opts = {}) {
  const { otherName = null, note = null } = opts;
  const arch = computeArchetype(params)?.archetype;

  const userMessage = [
    arch ? `THE LANDSCAPE THIS JOURNEY RUNS ON: ${arch.name} — ${arch.essence} ${arch.description}` : '',
    '',
    `THE OTHER PERSON IS CALLED: ${otherName || 'unnamed — use "they"'}`,
    note ? `\nTHEIR OWN WORDS ABOUT WHERE THEY WANT TO BE (the most important line here): "${note}"` : '',
    '',
    'ROUTE FACTS (computed from the terrain — do not contradict them, and do not invent any):',
    routeFacts(path, otherName),
    '',
    'Write the Journey Reading now.',
  ].filter((l) => l !== null).join('\n');

  return { systemMessage: JOURNEY_SYSTEM, userMessage };
}
