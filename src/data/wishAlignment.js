/**
 * wishAlignment.js — do the two of you want the same thing?
 *
 * The growth journey so far has two pins on one landscape: where a bond stands
 * and where the other person says they want it. The wish adds a third — where
 * the landscape's owner would like it — and with it the question the whole
 * feature has been circling.
 *
 * The distance between the two DESTINATIONS is a better question than either
 * route. Two people can both be asking for a long, steep crossing and be
 * asking for the same crossing; two people can both be asking for a small move
 * and be asking for opposite ones. A reading that only compares how far each
 * wants to travel cannot tell those apart, and they are the whole matter.
 *
 * Nothing here is shown to the person who answered the question. A wish is the
 * owner's own statement about a relationship, made after seeing where that
 * relationship stands; it is theirs to share in their own words if they choose.
 */

import { describePoint } from '../terrain/placement.js';
import { featurePhrase } from './pathNarrative.js';

/** A move this small is not really a move. */
const STAYING_PUT = 0.1;
/** Two destinations this close are the same place. */
const SAME_PLACE = 0.12;
/** Below this, "who wants the bigger move" is not a real difference. */
const EVEN_ENOUGH = 0.15;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * @param {number[]} params      the owner's landscape — both wishes live on it
 * @param {{x,y}} current        where the bond stands
 * @param {{x,y}} theirDesire    where the other person wants it
 * @param {{x,y}} ownWish        where the owner wants it
 */
export function compareWishes(params, current, theirDesire, ownWish) {
  if (!Array.isArray(params) || !current || !theirDesire || !ownWish) return null;

  const theirMove = dist(current, theirDesire);
  const ownMove = dist(current, ownWish);
  const apart = dist(theirDesire, ownWish);

  const theirPoint = describePoint(theirDesire.x, theirDesire.y, params);
  const ownPoint = describePoint(ownWish.x, ownWish.y, params);
  const sameFeature = Boolean(
    theirPoint.nearest && ownPoint.nearest && theirPoint.nearest.name === ownPoint.nearest.name,
  );

  // Do the two wishes pull the bond the same way out of where it sits? Compared
  // as directions from the CURRENT point, because two destinations can be far
  // apart and still lie the same way from here.
  let pull = 'same-way';
  if (theirMove > STAYING_PUT && ownMove > STAYING_PUT) {
    const tx = (theirDesire.x - current.x) / theirMove;
    const ty = (theirDesire.y - current.y) / theirMove;
    const ox = (ownWish.x - current.x) / ownMove;
    const oy = (ownWish.y - current.y) / ownMove;
    const dot = tx * ox + ty * oy;
    pull = dot < -0.2 ? 'opposite' : dot < 0.5 ? 'diverging' : 'same-way';
  }

  const ownStays = ownMove < STAYING_PUT;
  const theyStay = theirMove < STAYING_PUT;

  let verdict;
  if (ownStays && theyStay) verdict = 'both-content';
  else if (apart < SAME_PLACE) verdict = 'same-place';
  else if (ownStays) verdict = 'you-would-stay';
  else if (theyStay) verdict = 'they-would-stay';
  else if (pull === 'opposite') verdict = 'opposite-ways';
  else if (sameFeature) verdict = 'same-region';
  else verdict = 'different-places';

  return {
    apart,
    theirMove,
    ownMove,
    sameFeature,
    pull,
    verdict,
    theirPoint,
    ownPoint,
    /** Who is asking for the bigger move, when that is a real difference. */
    biggerMove: Math.abs(theirMove - ownMove) < EVEN_ENOUGH
      ? 'even'
      : (theirMove > ownMove ? 'them' : 'you'),
  };
}

/**
 * The reading of the two wishes together. One section, because this is a
 * single fact about the relationship and padding it out would dilute it.
 *
 * @param {object} cmp   result of compareWishes
 * @param {string|null} name what to call the other person
 */
export function buildWishSection(cmp, name = null) {
  if (!cmp) return null;
  const them = name || 'they';
  const themObject = name || 'them';
  const theirPlace = cmp.theirPoint.nearest ? `your ${featurePhrase(cmp.theirPoint.nearest)}` : 'open ground';
  const ownPlace = cmp.ownPoint.nearest ? `your ${featurePhrase(cmp.ownPoint.nearest)}` : 'open ground';

  const BODY = {
    'both-content': {
      title: 'You both want it where it is',
      text: `Neither of you is asking for a move. That is worth saying out loud, because a bond `
        + `nobody wants to change is easy to leave unspoken until one of you assumes the other is `
        + `waiting for something.`,
    },
    'same-place': {
      title: 'You want the same thing',
      text: `You marked ${ownPlace}; ${them} marked essentially the same ground. Whatever makes `
        + `this hard, it is not that you want different things — which is the rarer and more `
        + `fortunate problem to have. What is left is the crossing itself, and you are on the same `
        + `side of it.`,
    },
    'same-region': {
      title: 'You want the same kind of thing',
      text: `You marked ${ownPlace} and ${them} marked the same region, though not the same spot. `
        + `The shape of what you both want matches; the difference is in degree, and degree is `
        + `usually negotiable in a way that direction is not.`,
    },
    'you-would-stay': {
      title: 'You would leave it where it is',
      text: `${cap(them)} marked ${theirPlace}. You marked where the bond already sits. `
        + `That is not a refusal and it is not nothing: it means the thing ${them} ${name ? 'is' : 'are'} asking for is `
        + `a change you have not asked for. Worth being honest about early, because "not yet" and `
        + `"not this" sound identical from the outside and are very different to live with.`,
    },
    'they-would-stay': {
      title: 'They would leave it where it is',
      text: `You marked ${ownPlace}. ${cap(them)} marked where the bond already sits. `
        + `The move you want is one ${them} ${name ? 'has' : 'have'} not asked for — which does not make it wrong to `
        + `want, and does make it yours to raise rather than to wait for.`,
    },
    'opposite-ways': {
      title: 'You want it to go different ways',
      text: `From where this bond stands, your two marks lie in opposite directions: you toward `
        + `${ownPlace}, ${them} toward ${theirPlace}. This is the hardest version of this page and `
        + `the most useful one, because it is the case most likely to be mistaken for a pace problem `
        + `— as though the difference were how fast, when it is actually which way.`,
    },
    'different-places': {
      title: 'You want different things',
      text: `You marked ${ownPlace}; ${them} marked ${theirPlace}. Not opposite, but genuinely `
        + `different places on your map. Most of the effort in a bond like this goes into the `
        + `crossing, and it is worth checking first that you are both crossing toward the same side.`,
    },
  };

  const body = BODY[cmp.verdict];
  const tail = cmp.verdict === 'both-content' || cmp.verdict === 'same-place'
    ? ''
    : cmp.biggerMove === 'even'
      ? ` Both of you are asking for a move of about the same size, whatever its direction.`
      : cmp.biggerMove === 'them'
        ? ` ${cap(them)} ${name ? 'is' : 'are'} also asking for the bigger move of the two.`
        : ` You are also asking for the bigger move of the two.`;

  return {
    kind: 'wishes',
    title: body.title,
    text: body.text + tail + `\n\nOne caution worth keeping: a wish is where you would like this to `
      + `go, not a promise or a demand. ${cap(themObject)} answered without seeing yours, which is what `
      + `makes both answers worth anything.`,
  };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
