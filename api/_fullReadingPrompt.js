/**
 * _fullReadingPrompt.js — the $12 Full Reading prompt (spec AD-6).
 * Underscore prefix: not a route; shared by api/reading.js and tests.
 *
 * The product: a ~2,500–3,500 word structured document — overview, the 13
 * parameters in four thematic groups, growth edges, conversation starters,
 * and (when a partner code is attached) a pair-compatibility section.
 * Server-side only: params come from the stored result's code, so the
 * reading always matches the purchased result.
 */

const PARAMS = [
  { key: 'deepFriendships',    label: 'Deep friendships',              group: 0, desc: 'emotional depth in platonic bonds (valley)' },
  { key: 'romanticLove',       label: 'Romantic love',                 group: 0, desc: 'strength of romantic partnership as attractor (valley)' },
  { key: 'tenderMiddle',       label: 'The tender middle',             group: 0, desc: 'comfort in ambiguous space between friendship and romance (valley/ridge)' },
  { key: 'casualTouch',        label: 'Casual touch',                  group: 1, desc: 'ease with non-romantic physical affection (valley)' },
  { key: 'emptyPhysBarrier',   label: 'Empty physicality barrier',     group: 1, desc: 'need for emotional depth before physical intimacy (ridge)' },
  { key: 'ungroundedBarrier',  label: 'Ungrounded intensity barrier',  group: 2, desc: 'need for structure before intense connection (ridge)' },
  { key: 'uncertaintyTolerance', label: 'Uncertainty tolerance',       group: 2, desc: 'comfort with undefined, unlabeled relationships' },
  { key: 'openness',           label: 'Openness',                      group: 2, desc: 'orientation toward exclusivity vs. multiplicity' },
  { key: 'mapped',             label: 'Mapped territory',              group: 3, desc: 'how much of the relational landscape has been explored' },
  { key: 'selfIntimacy',       label: 'Self-intimacy',                 group: 3, desc: 'depth of relationship with self; solitude as nourishment (valley)' },
  { key: 'conflictApproach',   label: 'Conflict approach',             group: 3, desc: 'how tension is navigated (ridge/pass)' },
  { key: 'playfulness',        label: 'Playfulness',                   group: 0, desc: 'humor and lightness as a pathway to closeness (valley)' },
  { key: 'attachmentSecurity', label: 'Attachment security',           group: 3, desc: 'response when connection feels threatened (ridge/valley)' },
];

const GROUPS = [
  'Where Connection Lives',
  'The Physical Dimension',
  'Structure & Uncertainty',
  'The Inner Landscape',
];

const FULL_READING_SYSTEM = `You are the Love Landscape interpreter writing a purchased, in-depth reading — the "Full Reading." The reader paid for depth: give them substance, not padding.

FRAMEWORK:
The Love Landscape maps intimacy along two axes: emotional-to-physical (horizontal) and shallow-to-deep (vertical). VALLEYS are where relationships settle effortlessly; RIDGES take effort to cross; SADDLE PASSES connect active valleys; UNMAPPED EDGES fade into fog.

YOUR TASK — write a complete reading of 2,500–3,500 words with EXACTLY this structure (markdown ## headers):

## The Shape of Your Landscape
An overview: the 3-4 defining features of this terrain, how they interact, what kind of relational life this landscape supports. (~300 words)

## Where Connection Lives
## The Physical Dimension
## Structure & Uncertainty
## The Inner Landscape
For each of these four sections: interpret the listed parameters together as one region of the terrain — roughly two paragraphs per parameter, woven as narrative rather than a list. Name specific interactions between the parameters (e.g. how high uncertainty tolerance changes what a low ungrounded-intensity barrier means). (~500-600 words each)

## Your Ridges: Where Growth Lives
The 2-3 steepest gradients in this landscape — tensions between parameters, places where effort is required. Honest, not flattering. What crossing each ridge would ask of them, and what it might open. (~300 words)

## Conversations Worth Having
5-7 specific, concrete conversation starters this person could bring to a partner, a close friend, or a therapist — each one anchored to a specific feature of THEIR terrain, not generic advice. Format as bold opener + one sentence of why. (~250 words)

RULES:
- Ground every claim in the actual parameter values given — never contradict them
- Percentages may be referenced sparingly ("your uncertainty tolerance sits near the top of the scale"), never as a data dump
- Warm but honest; complexity is the product — don't flatten it
- Use the terrain metaphor naturally throughout
- **Bold** the sentences that matter most
- No bullet points except in Conversations Worth Having`;

const PAIR_ADDENDUM = `

ADDITIONALLY: a partner's landscape is provided. After "Conversations Worth Having", add one final section:

## Your Two Terrains Together
Read the two landscapes as a pair (~400-500 words): shared valleys (where connection flows for both), tension zones (one's valley, the other's ridge — the most important places), shared ridges (mutual boundaries worth respecting), and asymmetric valleys (both drawn, one deeper). End with the single most important conversation these two people should have. Warm but do not flatten real tension.`;

function paramLines(values) {
  return PARAMS.map((p, i) => `- ${p.label}: ${Math.round(values[i] * 100)}% — ${p.desc}`).join('\n');
}

/**
 * @param {number[]} params - the 13 decoded values for the purchased result
 * @param {number[]|null} partnerParams - optional partner values for the pair section
 */
export function buildFullReadingPrompt(params, partnerParams = null) {
  const groupIndex = GROUPS.map((g, gi) =>
    `${g}: ${PARAMS.filter((p) => p.group === gi).map((p) => p.label).join(', ')}`,
  ).join('\n');

  let userMessage = `THE READER'S LANDSCAPE:\n${paramLines(params)}\n\nSECTION-TO-PARAMETER MAP:\n${groupIndex}\n`;
  if (partnerParams) {
    userMessage += `\nTHEIR PARTNER'S LANDSCAPE (for the final pair section):\n${paramLines(partnerParams)}\n`;
  }
  userMessage += `\nWrite the Full Reading now.`;

  return {
    systemMessage: FULL_READING_SYSTEM + (partnerParams ? PAIR_ADDENDUM : ''),
    userMessage,
  };
}
