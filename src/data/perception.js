/**
 * perception.js — how much of someone you can actually see.
 *
 * You answer the nineteen questions as you think THEY would. That produces a
 * perceived landscape, and holding it against their own answers gives a signed
 * gap per dimension.
 *
 * THE FRAMING THAT MATTERS MOST, and the one a naive implementation gets
 * wrong: this does not measure whether you are right about them. It measures
 * the distance between your model of them and THEIR OWN account of
 * themselves. Both can be off. A person can describe themselves in a way their
 * behaviour does not match; a person can also keep a whole dimension hidden
 * from someone who loves them. So a gap is never evidence of failure on either
 * side — it marks a place where two accounts differ, which is exactly the kind
 * of place worth a conversation.
 *
 * Direction is kept throughout. Believing someone needs more structure than
 * they say they do, and believing they need less, lead to opposite mistakes,
 * and a reading that collapses them to "you were off by a lot" is useless.
 *
 * Pure functions, no React, no network. A perceived landscape is a private
 * guess about another person: it never leaves the device, is never published,
 * and is never contributed to research.
 */

import { PARAM_LABELS } from './interpretation.js';
import { COMPAT_LABELS } from './recommendations.js';

/**
 * Bands for one dimension's gap. Deliberately wider than they could be: a
 * one-or-two-item dimension is not precise enough to call a small difference
 * a misreading, and the copy would be making an accusation out of noise.
 */
export const CLOSE_ENOUGH = 0.15;
export const WIDE_GAP = 0.3;

/** Bands for the whole picture, on the mean absolute gap across dimensions. */
const OVERALL_BANDS = [
  { max: 0.12, key: 'close', title: 'You see them clearly', text: 'Across almost every dimension, your sense of them matches how they describe themselves. That is not luck — it is what paying attention over time looks like.' },
  { max: 0.2, key: 'good', title: 'You know them well, with blind spots', text: 'Most of your picture matches theirs. A few dimensions do not, and those few are where this gets interesting.' },
  { max: 0.3, key: 'partial', title: 'You know parts of them well', text: 'Some of this landscape you have clearly walked. Other parts you are sketching from the outside — which may say as much about what has been shown to you as about what you noticed.' },
  { max: Infinity, key: 'distant', title: 'Your picture and theirs differ widely', text: 'The person you described and the person they describe are not the same. That happens most often when a relationship is new, when it lives in one context only, or when someone has been keeping a lot of themselves out of view.' },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** The spoken form, for sentences a person could actually say to someone. */
function dimensionName(index) {
  return COMPAT_LABELS[index] || PARAM_LABELS[index]?.short?.toLowerCase() || 'this dimension';
}

/**
 * Compare a perceived landscape with the person's own.
 *
 * @param {number[]} perceived  your answers, given as you think they would
 * @param {number[]} actual     their own answers
 * @returns {object|null} the gap, dimension by dimension, with direction kept
 */
export function computePerceptionGap(perceived, actual) {
  if (!Array.isArray(perceived) || !Array.isArray(actual)) return null;
  const n = Math.min(perceived.length, actual.length, PARAM_LABELS.length);
  if (n === 0) return null;

  const dimensions = [];
  for (let i = 0; i < n; i++) {
    const guess = clamp01(perceived[i]);
    const theirs = clamp01(actual[i]);
    const delta = guess - theirs;
    const size = Math.abs(delta);
    dimensions.push({
      index: i,
      name: PARAM_LABELS[i].short,
      label: dimensionName(i),
      perceived: guess,
      actual: theirs,
      delta,
      size,
      // 'over' = you credited them with more of this than they claim;
      // 'under' = less. Kept apart because they are different mistakes.
      direction: size < CLOSE_ENOUGH ? 'match' : (delta > 0 ? 'over' : 'under'),
      band: size < CLOSE_ENOUGH ? 'close' : size < WIDE_GAP ? 'off' : 'wide',
    });
  }

  const meanGap = dimensions.reduce((sum, d) => sum + d.size, 0) / n;
  const overall = OVERALL_BANDS.find((b) => meanGap < b.max);
  const bySize = [...dimensions].sort((a, b) => b.size - a.size);

  return {
    dimensions,
    meanGap,
    overall,
    /** Where the two accounts differ most — the material for the reading. */
    widest: bySize.filter((d) => d.band !== 'close').slice(0, 3),
    /** Where they agree AND the dimension is actually present in both. */
    seen: dimensions
      .filter((d) => d.band === 'close')
      .sort((a, b) => ((b.perceived + b.actual) - (a.perceived + a.actual)))
      .slice(0, 3),
    counts: {
      close: dimensions.filter((d) => d.band === 'close').length,
      off: dimensions.filter((d) => d.band === 'off').length,
      wide: dimensions.filter((d) => d.band === 'wide').length,
      total: n,
    },
  };
}

/**
 * What a gap in each direction actually costs, which is the part worth saying.
 *
 * Over- and under-estimating are opposite mistakes with opposite consequences:
 * one asks more of a person than they have, the other withholds something they
 * would have welcomed. A reading that says "you were off" in both cases has
 * told the reader nothing they can act on. Several phrasings per direction, so
 * three gaps in a row do not read as one sentence pasted three times.
 */
const CONSEQUENCE = {
  over: [
    'Crediting someone with more of this than they feel usually shows up as expecting something they cannot easily give — and as their quiet sense of falling short of a version of themselves they never claimed.',
    'Where you credit someone with more of this than they claim, you may be reading a capacity into them that is not there yet, and building plans on it.',
    'Believing this runs higher in someone than it does tends to surface later, as puzzlement that they did not meet a moment you assumed was easy for them.',
  ],
  under: [
    'Reading someone as having less of this than they claim usually shows up as not offering something they would have welcomed — a door left closed because you assumed it was locked.',
    'Where you read this lower in someone than they do, the risk is not conflict but omission: you may simply never raise the thing they were open to.',
    'Underestimating this in someone can look, from their side, like not being seen in a part of themselves they consider central.',
  ],
};

/**
 * How a single dimension's difference should be said out loud.
 *
 * The other person appears twice in one sentence, once as an object and once
 * as a subject — "you place THEM further than THEY describe themselves" — so
 * the two forms have to be kept apart. A single variable produces "you place
 * they", which is the kind of slip that makes a reading about someone's
 * relationship feel machine-written.
 */
function dimensionLine(d, name, variant = 0) {
  const subject = name || 'they';
  const object = name || 'them';
  const verb = name ? 'describes' : 'describe';
  const more = d.direction === 'over' ? 'more' : 'less';
  const strength = d.band === 'wide' ? 'considerably' : 'somewhat';
  const consequence = CONSEQUENCE[d.direction][variant % CONSEQUENCE[d.direction].length];
  return `**${d.name}.** You place ${object} ${strength} ${more} toward this than ${subject} ${verb} themselves. ${consequence}`;
}

/**
 * The reading. Same rule as the growth-journey narrative: no numbers in the
 * prose, and nothing here is allowed to make either person wrong.
 *
 * @param {object} gap  result of computePerceptionGap
 * @param {string|null} name what to call the other person
 */
export function buildPerceptionNarrative(gap, name = null) {
  if (!gap) return null;
  const them = name || 'they';
  const themObject = name || 'them';
  const sections = [];

  sections.push({
    kind: 'overall',
    title: gap.overall.title,
    text: `${gap.overall.text}\n\nOne thing to hold on to before reading further: this compares your picture of ${themObject} `
      + `with ${name ? `${name}'s` : 'their'} own account of ${name ? 'themselves' : 'themselves'}. Neither is the truth. Where the two differ, it may be that you `
      + `have not seen a part of ${themObject} yet, or that ${them} ${name ? 'sees' : 'see'} ${name ? 'themselves' : 'themselves'} differently from how ${them} ${name ? 'comes' : 'come'} across. `
      + `Both are worth knowing, and neither is a failing.`,
  });

  if (gap.seen.length) {
    sections.push({
      kind: 'seen',
      title: 'Where you see them clearly',
      text: `Your sense of ${themObject} matches ${name ? `${name}'s` : 'their'} own on ${listNames(gap.seen)}. `
        + `This is the part people skip past, and it should not be skipped: knowing someone accurately on a dimension that actually matters to them is not a small thing, and it is the ground everything harder stands on.`,
    });
  }

  if (gap.widest.length) {
    sections.push({
      kind: 'gaps',
      title: gap.widest.length === 1 ? 'Where your pictures differ' : 'Where your pictures differ most',
      text: gap.widest.map((d, i) => dimensionLine(d, name, i)).join('\n\n'),
    });

    sections.push({
      kind: 'reading',
      title: 'How to read a gap',
      text: `A difference here has at least three innocent explanations, and it is worth ruling them out before reaching for a harder one. `
        + `${cap(them)} may never have had reason to show you that part. It may be a dimension ${them} ${name ? 'is' : 'are'} still working out, so ${name ? 'their' : 'their'} own answer is a moving target. `
        + `Or the two of you may simply mean different things by the same question — which is common, and is itself the conversation.`,
    });
  } else {
    sections.push({
      kind: 'reading',
      title: 'How to read this',
      text: `Nothing here differs enough to call a gap. That is a genuinely good result, and worth one piece of caution: `
        + `matching on every dimension can also mean you answered as you would, rather than as ${them} would. `
        + `The useful test is whether any of ${name ? `${name}'s` : 'their'} answers surprised you. If none did, it may be worth asking ${themObject} directly about the two or three that matter most to you.`,
    });
  }

  sections.push({
    kind: 'conversations',
    title: 'Worth asking them',
    text: (gap.widest.length
      ? gap.widest.map((d, i) => `**${d.name}** — “${OPENERS[d.direction][i % OPENERS[d.direction].length].replace('{dimension}', d.label)}”`)
      : gap.seen.slice(0, 2).map((d) => `**${d.name}** — “I think I read you accurately on ${d.label}. Is that right, or have I just been lucky?”`)
    ).join('\n\n'),
  });

  return { sections };
}

/** Openers a person could actually say out loud, rather than quiz language. */
const OPENERS = {
  over: [
    'When you answered about {dimension}, what were you picturing? I had you further along than you put yourself, and I would rather know than keep assuming.',
    'I think I have been assuming more {dimension} in you than you would claim. Is that fair?',
    'Have I been expecting something of you around {dimension} that you have never actually said you wanted?',
  ],
  under: [
    'I put you lower on {dimension} than you put yourself. Is there something there I have not been making room for?',
    'When you answered about {dimension}, what were you picturing? I may have been closing a door you would rather I left open.',
    'Is {dimension} more a part of you than I have been treating it as?',
  ],
};

function listNames(items) {
  const names = items.map((d) => d.label);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The reading as markdown, for ReadingRenderer. */
export function perceptionToMarkdown(narrative) {
  if (!narrative?.sections?.length) return '';
  return narrative.sections.map((s) => `## ${s.title}\n\n${s.text}`).join('\n\n');
}
