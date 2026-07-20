import { ARTICLE_URL } from './articleContent.js';
import { scoreBand, generateReading } from './interpretation.js';

/**
 * Per-dimension scientific grounding, surfaced in the reading.
 *
 * One entry per parameter, in the SAME order as PARAM_LABELS in interpretation.js
 * (P0..P12). Each maps a dimension onto the psychological construct/instrument it
 * draws on, says how a low/mid/high score reads in that framework (the "as a Z"),
 * names what a curious reader would gain, and links to a source.
 *
 * Honesty first (see docs/science-grounding.md): the `tier` says how strong the
 * grounding actually is. Update this file and every reading re-grounds — bump
 * SCIENCE_VERSION when the mapping materially changes.
 *
 * Source URLs for grounded/related tiers were fetched + (mostly) adversarially
 * verified in the research pass. Mapping/frontier tiers link to the essay rather
 * than claim an external instrument validates them.
 */

export const SCIENCE_VERSION = 1;

export const SCIENCE_TIERS = {
  grounded: { label: 'Grounded in research', blurb: 'maps onto a validated instrument' },
  related:  { label: 'Related to research', blurb: 'connects to a studied construct; not independently validated here' },
  frontier: { label: 'Our own contribution', blurb: 'little prior research — original to this framework' },
  mapping:  { label: 'Mapping in progress', blurb: 'established literature exists; we haven\'t formally mapped it yet' },
};

/**
 * Format the per-dimension grounding as prompt context for the LLM readings.
 * Each line gives the dimension, the instrument/construct it maps to, the
 * honesty tier, and how this reader's score reads in that framework — so the
 * model can name the science accurately (and only where it's actually grounded).
 */
export function sciencePromptContext(params) {
  const reading = generateReading(params);
  return SCIENCE_MAP.map((s, i) => {
    const band = scoreBand(params[i] ?? 0.5);
    return `- ${reading[i].name} → ${s.instrument} (${s.construct}) ` +
      `[${SCIENCE_TIERS[s.tier].label}]: reads as ${s.maps[band]}`;
  }).join('\n');
}

export const SCIENCE_MAP = [
  { // P0 Deep friendships
    instrument: 'the Miller Social Intimacy Scale',
    construct: 'friendship intimacy',
    tier: 'mapping',
    maps: {
      low: 'friendships you keep at comfortable warmth',
      mid: 'friendships with real but bounded emotional depth',
      high: 'friendship as a primary site of intimacy',
    },
    whatYoudLearn: 'How closeness in non-romantic bonds gets measured — and why some people route their deepest intimacy through friendship rather than romance.',
    source: { label: 'The Shape of Intimacy (our framing)', url: ARTICLE_URL },
    caveat: null,
  },
  { // P1 Romantic love
    instrument: 'Sternberg’s triangular theory of love',
    construct: 'intimacy, passion, and commitment',
    tier: 'mapping',
    maps: {
      low: 'romance as a quiet, non-central pull',
      mid: 'romance as one strong attractor among several',
      high: 'romantic partnership as a defining force',
    },
    whatYoudLearn: 'How Sternberg splits love into intimacy, passion, and commitment — and where your pull sits among the three.',
    source: { label: 'The Shape of Intimacy (our framing)', url: ARTICLE_URL },
    caveat: null,
  },
  { // P2 Tender middle
    instrument: 'the friendship–romance borderland',
    construct: 'relational ambiguity',
    tier: 'frontier',
    maps: {
      low: 'a preference for clear categories over the in-between',
      mid: 'a workable but effortful comfort with the in-between',
      high: 'the space between friendship and romance as natural home ground',
    },
    whatYoudLearn: 'Why this in-between space is under-studied — and how our framework charts a region most instruments skip entirely.',
    source: { label: 'The Shape of Intimacy (our framing)', url: ARTICLE_URL },
    caveat: null,
  },
  { // P3 Casual touch
    instrument: 'the Comfort with Interpersonal Touch (CIT) scale',
    construct: 'affectionate communication',
    tier: 'grounded',
    maps: {
      low: 'touch reserved for defined, trusted contexts',
      mid: 'context-dependent ease with non-romantic touch',
      high: 'physical warmth that flows naturally across relationships',
    },
    whatYoudLearn: 'How researchers separate comfort with initiating touch from receiving it — two tendencies a single slider blends together.',
    source: { label: 'Webb & Peck (2015) — CIT scale', url: 'https://www.sciencedirect.com/science/article/abs/pii/S1057740814000874' },
    caveat: null,
  },
  { // P4 Empty physicality barrier
    instrument: 'the Sociosexual Orientation Inventory (SOI-R)',
    construct: 'the attitude facet of sociosexuality',
    tier: 'related',
    maps: {
      low: 'physical connection that can stand on its own',
      mid: 'a flexible preference for some emotional grounding',
      high: 'a strong need for emotional depth before physical intimacy',
    },
    whatYoudLearn: 'How sociosexuality research measures attitudes toward intimacy without emotional bonds — the axis this barrier sits on.',
    source: { label: 'Revised Sociosexual Orientation Inventory (SOI-R)', url: 'https://db.arabpsychology.com/scales/revised-sociosexual-orientation-inventory/' },
    caveat: null,
  },
  { // P5 Ungrounded intensity barrier
    instrument: 'the Need for Closure Scale (NFCS)',
    construct: 'need for structure and predictability',
    tier: 'grounded',
    maps: {
      low: 'comfort with intensity before labels or structure',
      mid: 'some need for structure, with room to flex',
      high: 'a strong need for grounding before going deep',
    },
    whatYoudLearn: 'How the Need for Closure Scale measures the pull toward certainty and order — and how it shapes the pace of connection.',
    source: { label: 'Roets & Van Hiel (2011) — 15-item NFCS', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0191886910004344' },
    caveat: null,
  },
  { // P6 Uncertainty tolerance
    instrument: 'the NFCS discomfort-with-ambiguity facet',
    construct: 'tolerance of ambiguity',
    tier: 'grounded',
    maps: {
      low: 'a preference for clearly defined relationships',
      mid: 'some tolerance for ambiguity, with an eventual want for clarity',
      high: 'genuine ease with undefined, unlabeled connections',
    },
    whatYoudLearn: 'Why "need for structure" and "tolerance of ambiguity" are distinct traits — they correlate only weakly (r ≈ .29).',
    source: { label: 'Need for Closure Scale — ambiguity facet', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0191886910004344' },
    caveat: null,
  },
  { // P7 Openness
    instrument: 'sociosexuality & consensual non-monogamy research',
    construct: 'exclusivity vs. multiplicity',
    tier: 'related',
    maps: {
      low: 'exclusivity held closely',
      mid: 'openness guided by context and trust',
      high: 'multiplicity that feels natural, not threatening',
    },
    whatYoudLearn: 'What research on sociosexuality and consensual non-monogamy finds when exclusivity is treated as a spectrum, not a binary.',
    source: { label: 'Revised Sociosexual Orientation Inventory (SOI-R)', url: 'https://db.arabpsychology.com/scales/revised-sociosexual-orientation-inventory/' },
    caveat: null,
  },
  { // P8 Mapped territory
    instrument: 'the Self-Reflection and Insight Scale (SRIS)',
    construct: 'relational self-awareness',
    tier: 'grounded',
    maps: {
      low: 'significant unexplored relational territory',
      mid: 'a fair amount explored, with frontier remaining',
      high: 'a well-mapped sense of your own patterns',
    },
    whatYoudLearn: 'Why self-reflection and insight are different things — and why more self-focus isn\'t automatically healthier.',
    source: { label: 'Grant et al. — Self-Reflection and Insight Scale', url: 'https://www.researchgate.net/publication/233563192' },
    caveat: 'The SRIS finds self-reflection (rumination) and insight move differently; a high score here is exploration, not a health verdict.',
  },
  { // P9 Self-intimacy
    instrument: 'Burger’s Preference for Solitude Scale',
    construct: 'capacity to be alone',
    tier: 'grounded',
    maps: {
      low: 'solitude that tends to deplete more than restore',
      mid: 'a balance of solitude and company',
      high: 'solitude as a genuine source of nourishment',
    },
    whatYoudLearn: 'How solitude research splits into needing it, enjoying it, and being productive in it — three separable facets.',
    source: { label: 'Burger (1995) — Preference for Solitude Scale', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0191886997001670' },
    caveat: null,
  },
  { // P10 Conflict approach
    instrument: 'the Rahim ROCI-II & Gottman’s demand-withdraw research',
    construct: 'conflict style',
    tier: 'grounded',
    maps: {
      low: 'a tendency to withdraw or smooth tension over',
      mid: 'a mix of directness and patience with conflict',
      high: 'moving toward friction and engaging it directly',
    },
    whatYoudLearn: 'How conflict-style research maps concern-for-self against concern-for-other — and Gottman\'s work on the demand-withdraw pattern.',
    source: { label: 'Weibel — ROCI-II critique', url: 'https://journals.sagepub.com/doi/10.1177/0893318988001003005' },
    caveat: 'The ROCI-II\'s factor structure is contested; treat conflict "styles" as tendencies, not fixed types.',
  },
  { // P11 Playfulness
    instrument: 'the OLIW model of adult playfulness',
    construct: 'playfulness',
    tier: 'grounded',
    maps: {
      low: 'connection that runs through sincerity over play',
      mid: 'humor balanced with more serious registers',
      high: 'play and laughter as central to how you bond',
    },
    whatYoudLearn: 'How the OLIW model breaks adult playfulness into four styles — Other-directed, Lighthearted, Intellectual, and Whimsical.',
    source: { label: 'Proyer (2017) — OLIW playfulness model', url: 'https://compass.onlinelibrary.wiley.com/doi/10.1111/spc3.12589' },
    caveat: null,
  },
  { // P12 Attachment security
    instrument: 'the ECR-R (Experiences in Close Relationships–Revised)',
    construct: 'attachment anxiety and avoidance',
    tier: 'grounded',
    maps: {
      low: 'an anxious or avoidant pattern when connection feels threatened',
      mid: 'a mostly-secure base that can wobble under stress',
      high: 'secure attachment — staying grounded when someone pulls away',
    },
    whatYoudLearn: 'How the ECR-R separates fear-of-distance (anxiety) from self-protective withdrawal (avoidance) — two independent axes, not one scale.',
    source: { label: 'Sibley et al. — ECR-R reliability & validity', url: 'https://www.researchgate.net/publication/7557313' },
    caveat: null,
  },
];
