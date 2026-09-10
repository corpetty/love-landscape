/**
 * pathNarrative.js — the free, deterministic reading of a growth journey.
 *
 * Templates over path facts, the same way recommendations.js builds the
 * Conversation Map. No LLM, no network, instant. The paid Journey Reading
 * (a later phase) uses the same facts with more room.
 *
 * The single rule that governs every line here: **a ridge on this route is the
 * landscape owner's own need, never the other person's fault.** The copy says
 * "your grounding ridge stands high" to the owner and "their grounding ridge
 * stands high" to the partner. It never says anyone is asking for too much,
 * and it never treats the desired point as the correct one.
 */

import { PARAM_LABELS } from './interpretation.js';

/** Section kinds, so the renderer can style them without parsing text. */
export const SECTION_KINDS = ['standing', 'wanting', 'distance', 'route', 'asks', 'fog', 'exclusivity', 'conversations'];

const STORY = {
  'short-walk': {
    title: 'A short walk',
    text: 'The place this bond stands and the place it wants to be are close together, on ground that runs level between them. Most of the distance here is in the naming, not the terrain.',
  },
  'the-wall': {
    title: 'A wall, not a distance',
    text: 'These two points are close on the map — but the ground rises between them. That is a particular kind of difficulty: not a different sort of relationship, just something standing in the way of it.',
  },
  'long-road': {
    title: 'A long road',
    text: 'This is a real distance across the map, but the ground runs open the whole way. Nothing here is blocked. It is a matter of steps, and of time.',
  },
  'expedition': {
    title: 'An expedition',
    text: 'This is both a long way and a steep one. A bond that makes this crossing does not arrive as the same thing it set out as — which can be the point, as long as both people know that is what is being asked.',
  },
};

/**
 * Bands, so the reading talks in words and keeps numbers out of the prose.
 * The third boundary is NEAR_PATH_LENGTH from the path engine: below it the
 * story is a "near" one, so the words must not call the same route far.
 */
function distanceWord(pathLength) {
  if (pathLength < 0.15) return 'a few steps';
  if (pathLength < 0.3) return 'a short way';
  if (pathLength < 0.45) return 'a moderate distance';
  if (pathLength < 0.7) return 'a fair way across';
  return 'most of the map';
}

/** The two story types whose defining feature is the climb. */
const STEEP_STORY = new Set(['the-wall', 'expedition']);

function heightWord(height) {
  if (height < 0.25) return 'a low rise';
  if (height < 0.5) return 'a real climb';
  if (height < 0.75) return 'a steep one';
  return 'one of the steepest walls on this map';
}

function depthWord(depth) {
  if (depth < 0.3) return 'a shallow dip';
  if (depth < 0.6) return 'a settled valley';
  return 'one of the deepest valleys here';
}

/**
 * Voice.
 *
 * Every sentence about the terrain belongs to whoever owns it, so the reading
 * has to know whether it is speaking to that person or about them — and it has
 * to get the pronoun case and the verb agreement right, because "for they" in
 * the middle of a reading about someone's relationship destroys the trust the
 * rest of the copy is built on.
 */
const IRREGULAR_VERBS = { have: 'has', are: 'is', do: 'does', stay: 'stays' };

function speaker(isYou, name) {
  // Only a named third person takes singular agreement: both "you" and the
  // singular "they" conjugate as plural.
  const singular = !isYou && Boolean(name);
  return {
    isYou,
    subject: isYou ? 'you' : (name || 'they'),
    object: isYou ? 'you' : (name || 'them'),
    possessive: isYou ? 'your' : (name ? `${name}'s` : 'their'),
    /** Conjugate a bare verb for this speaker. */
    v: (base) => (singular ? (IRREGULAR_VERBS[base] || `${base}s`) : base),
  };
}

/**
 * @param {'owner'|'partner'} perspective whose screen this is
 * @param {string|null} otherName what to call the other person
 */
function voice(perspective, otherName) {
  const other = speaker(false, otherName);
  const you = speaker(true, null);
  // The terrain belongs to the owner; the mover is the bond's other end.
  return perspective === 'owner'
    ? { terrain: you, mover: other }
    : { terrain: other, mover: you };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function paramName(index) {
  return PARAM_LABELS[index]?.short?.toLowerCase() || 'this dimension';
}

/**
 * Feature names are map labels ("Deep friendships"), which do not survive being
 * dropped into a sentence after a possessive. These are the same features said
 * as English. A feature not listed here falls back to its label plus the word
 * the sign of its contribution earns it, so a new terrain feature still reads.
 */
const FEATURE_PHRASE = {
  'Deep friendships': 'deep-friendship valley',
  'Romantic love': 'romantic valley',
  'Tender middle': 'tender middle',
  'Casual touch': 'casual-touch valley',
  Mentorship: 'mentorship valley',
  'Self-intimacy': 'self-intimacy valley',
  'Playful connection': 'playful valley',
  'Secure base': 'secure base',
  'Empty physicality': 'empty-physicality ridge',
  'Ungrounded intensity': 'ungrounded-intensity ridge',
  'Uncertainty ridge': 'uncertainty ridge',
  'Conflict ridge': 'conflict ridge',
  'Attachment ridge': 'attachment ridge',
  'Friendship–Romance pass': 'pass between friendship and romance',
  'Tender–Touch pass': 'pass between the tender middle and touch',
  'Friendship–Self pass': 'pass between friendship and solitude',
};

export function featurePhrase(feature) {
  if (!feature) return null;
  const known = FEATURE_PHRASE[feature.name];
  if (known) {
    // The tender middle is a valley for some people and a ridge for others, so
    // the noun has to follow the sign rather than the feature's category.
    if (feature.isRidge && known.endsWith(' valley')) return known.replace(/ valley$/, ' ridge');
    if (!feature.isRidge && known.endsWith(' ridge')) return known.replace(/ ridge$/, ' valley');
    return known;
  }
  return `${feature.name.toLowerCase()} ${feature.isRidge ? 'ridge' : 'valley'}`;
}

/** The place without a preposition, for use as the subject of a sentence. */
function barePlace(point, possessive) {
  return point.nearest ? `${possessive} ${featurePhrase(point.nearest)}` : `this ground — ${point.quadrant.phrase}`;
}

/** "in your deep-friendship valley" / "on open ground, emotional and deep" */
function placePhrase(point, possessive) {
  if (point.nearest) {
    const phrase = featurePhrase(point.nearest);
    const where = point.nearest.isRidge ? `on ${possessive} ${phrase}` : `in ${possessive} ${phrase}`;
    const edge = point.alsoNear[0] ? `, at the edge of the ${featurePhrase(point.alsoNear[0])}` : '';
    return where + edge;
  }
  return `on open ground — ${point.quadrant.phrase}`;
}

/**
 * Build the reading.
 *
 * @param {object} path            result of findPath()
 * @param {object} [opts]
 * @param {'owner'|'partner'} [opts.perspective] whose screen this is
 * @param {string|null} [opts.otherName]         what to call the other person
 * @param {string|null} [opts.note]              the mover's own words
 * @returns {{story: object, sections: Array<{kind: string, title: string, text: string}>}|null}
 */
export function buildPathNarrative(path, opts = {}) {
  if (!path || !path.start || !path.end) return null;
  const { perspective = 'owner', otherName = null, note = null } = opts;
  const { terrain, mover } = voice(perspective, otherName);
  const story = STORY[path.storyType] || STORY['long-road'];
  const sections = [];

  // 1. Where they stand.
  sections.push({
    kind: 'standing',
    title: 'Where this bond stands',
    text: `${cap(mover.subject)} ${mover.v('stand')} ${placePhrase(path.start, terrain.possessive)}. `
      + (path.start.inValley
        ? `That is ${depthWord(-path.start.height)} — ground a relationship settles into and does not drift out of by accident.`
        : path.start.onHighGround
          ? 'That is raised ground: a place that takes some effort to hold, rather than one a bond rests in.'
          : 'That is level ground — neither held in place nor hard to keep.'),
  });

  // 2. Where they want to be.
  const wantText = `${cap(mover.subject)} ${mover.v('want')} to be ${placePhrase(path.end, terrain.possessive)}`
    + (path.end.inValley
      ? `, ${depthWord(-path.end.height)} on ${terrain.possessive} map.`
      : path.end.onHighGround
        ? `. On ${terrain.possessive} map that is high ground, not a resting place — worth knowing before anyone sets out for it.`
        : '.');
  sections.push({
    kind: 'wanting',
    title: 'Where it wants to be',
    text: note ? `${wantText}\n\nIn ${mover.possessive} own words: “${note.trim()}”` : wantText,
  });

  // 3. The distance, in words.
  sections.push({
    kind: 'distance',
    title: story.title,
    text: `${story.text} The route covers ${distanceWord(path.pathLength)}`
      + (path.detourRatio > 1.25
        ? ', and it does not run straight — the ground pushes it sideways before it arrives.'
        : '.'),
  });

  // 4. The route. One primary reading of the ground, plus — always, when it
  // applies — what the direct line would have hit and this route did not. The
  // two are independent facts: a journey can climb out of a deep valley AND
  // bend around a ridge, and dropping either one makes the route sound simpler
  // than it is.
  const climbIsTheValley = path.ridgesCrossed.length === 0
    && STEEP_STORY.has(path.storyType)
    && path.start.inValley;

  let routeTitle;
  let routeText;
  if (path.ridgesCrossed.length > 0) {
    routeTitle = path.ridgesCrossed.length === 1 ? 'The ridge on the way' : 'The ridges on the way';
    routeText = `Every rise on this route is a feature of ${terrain.possessive} own landscape — a need, not an obstacle someone put there.\n\n`
      + path.ridgesCrossed.map((r) => {
        const lower = r.lowerCrossing
          ? ' The route crosses it well below its summit, so there is a lower way over than the obvious one.'
          : '';
        return `**${cap(featurePhrase({ ...r, isRidge: true }))}** — ${terrain.possessive} ${paramName(r.paramIndex)}, `
          + `and ${heightWord(r.height)} where this route meets it.${lower}`;
      }).join('\n\n');
  } else if (climbIsTheValley) {
    routeTitle = 'The climb is the valley itself';
    routeText = `No ridge stands between these two points. The work is getting out of where this bond already is. `
      + `${cap(barePlace(path.start, terrain.possessive))} is ${depthWord(-path.start.height)}, and deep ground holds what settles in it. `
      + `Nothing is stopping this move except how well the current place fits.`;
  } else {
    routeTitle = 'Open ground';
    routeText = `Nothing on ${terrain.possessive} map stands between these two points. `
      + `Whatever makes this hard, it is not a barrier in ${terrain.possessive} own wiring — which usually means the difficulty `
      + `is in circumstance, timing, or something neither of you has said yet.`;
  }

  if (path.ridgesSkirted.length > 0) {
    const names = path.ridgesSkirted.map((r) => featurePhrase({ ...r, isRidge: true })).join(', ');
    routeText += `\n\nThe direct line would have run into ${terrain.possessive} ${names}. This route goes around instead — `
      + `which is part of why it is longer than it looks, and does not make the barrier any smaller.`;
  }

  sections.push({ kind: 'route', title: routeTitle, text: routeText });

  // 5. What it asks of each person — one line per ridge, both sides.
  if (climbIsTheValley) {
    sections.push({
      kind: 'asks',
      title: 'What the climb asks',
      text: `For ${terrain.object}: this bond is somewhere that works. Moving it means giving up a fit that is genuinely good, `
        + `which is a real loss even when the destination is better. For ${mover.object}: `
        + `what looks like reluctance here is usually attachment to something that already works, not a verdict on the ask.`,
    });
  } else if (path.ridgesCrossed.length > 0) {
    const asks = path.ridgesCrossed.map((r) => {
      const dim = paramName(r.paramIndex);
      return `**${cap(featurePhrase({ ...r, isRidge: true }))}.** For ${terrain.object}: notice what ${dim} is protecting, and whether it still needs to be this high here. `
        + `For ${mover.object}: treat it as real. It is not resistance to ${mover.object} — it is how ${terrain.subject} ${terrain.v('stay')} safe.`;
    });
    sections.push({
      kind: 'asks',
      title: 'What the crossing asks',
      text: asks.join('\n\n'),
    });
  }

  // 6. Fog: unexplored ground is nobody's fault and everybody's risk.
  if (path.flags.includes('end-in-fog') || path.flags.includes('route-through-fog')) {
    sections.push({
      kind: 'fog',
      title: 'Unmapped ground',
      text: path.flags.includes('end-in-fog')
        ? `Where this bond wants to go is territory ${terrain.subject} ${terrain.v('have')} not explored. `
          + `That is not a warning — it means nobody can say in advance what it is like there, so the honest version of this conversation includes not knowing.`
        : `Much of this route crosses ground ${terrain.subject} ${terrain.v('have')} not walked. Expect the map to be wrong in places.`,
    });
  }

  // 7. Exclusivity — only when the wish was actually set.
  if (path.exclusivity) {
    const e = path.exclusivity;
    sections.push({
      kind: 'exclusivity',
      title: 'The shape of the agreement',
      text: e.aligned
        ? `The exclusivity ${mover.subject} ${mover.v('want')} sits close to how ${terrain.subject} ${terrain.v('are')} already wired. This part is not the hard part.`
        : e.direction === 'wants-more-exclusive'
          ? `${cap(mover.subject)} ${mover.v('want')} more exclusivity than ${terrain.possessive} landscape leans toward. The two axes of this map cannot show that — it is not a place, it is an agreement — and it does not resolve by moving closer. It resolves by being said out loud.`
          : `${cap(mover.subject)} ${mover.v('want')} more openness than ${terrain.possessive} landscape leans toward. That is its own conversation, separate from the distance on the map, and it will not be settled by either of you moving.`,
    });
  }

  // 8. Conversations — one per ridge, plus one for the journey as a whole.
  const conversations = path.ridgesCrossed.map((r) => ({
    title: cap(featurePhrase({ ...r, isRidge: true })),
    text: `What does ${terrain.possessive} ${paramName(r.paramIndex)} need in order to feel safe here — and what would it look like to meet that, rather than to cross it quickly?`,
  }));
  if (climbIsTheValley) {
    conversations.push({
      title: 'What the current place gives',
      text: `What does this bond, exactly as it is now, give ${terrain.object}? Moving it costs that — so it belongs in the conversation.`,
    });
  }
  conversations.push(storyConversation(path.storyType, mover));
  if (path.flags.includes('end-in-fog')) {
    conversations.push({
      title: 'The unmapped part',
      text: `Neither of you has been there. What would a small, reversible step in that direction look like?`,
    });
  }
  sections.push({
    kind: 'conversations',
    title: 'Worth talking about',
    text: conversations.map((c) => `**${c.title}** — ${c.text}`).join('\n\n'),
  });

  return { story, sections };
}

function storyConversation(storyType, mover) {
  switch (storyType) {
    case 'short-walk':
      return {
        title: 'The naming',
        text: `If the ground between these two points is this level, what is actually holding the bond where it is?`,
      };
    case 'the-wall':
      return {
        title: 'The one thing in the way',
        text: `This is close to being the relationship ${mover.subject} ${mover.v('want')}, with one thing in the way. Is that thing negotiable, or is it load-bearing?`,
      };
    case 'long-road':
      return {
        title: 'The pace',
        text: `Nothing is blocking this, but it is a long way. What is the right speed, and how would each of you know if it had stalled?`,
      };
    default:
      return {
        title: 'Whether to set out',
        text: `This crossing would change the bond, not just move it. Do both of you want the thing on the other side, or only the leaving of where you are?`,
      };
  }
}

/**
 * One sentence about the two directions together — the actual "love
 * difference". Given both journeys (each on its own owner's terrain), say
 * whether the two people are asking for the same size of move.
 */
export function symmetryLine(pathA, pathB) {
  if (!pathA || !pathB) return null;
  const a = pathA.pathLength;
  const b = pathB.pathLength;
  const diff = Math.abs(a - b);
  const both = a + b;

  if (both < 0.2) return 'Neither of you is asking for much of a move. You are close to where you both already want to be.';
  if (diff < 0.15) return 'You are asking for moves of about the same size. Whatever the difficulty is here, you are carrying it evenly.';
  const further = a > b ? 'first' : 'second';
  return further === 'first'
    ? 'One of you is asking for a considerably bigger move than the other. That asymmetry is worth naming plainly — it is easy to mistake for indifference on one side, or for pressure on the other.'
    : 'One of you is asking for a considerably bigger move than the other. Naming it directly usually goes better than letting it show up as pace.';
}
