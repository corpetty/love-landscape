const PARAM_LABELS = [
  {
    name: 'Deep friendships',
    short: 'Friendship depth',
    definition: 'How deeply your platonic bonds go emotionally — whether friendships are a primary site of intimacy or kept at comfortable warmth.',
  },
  {
    name: 'Romantic love',
    short: 'Romantic bond',
    definition: 'The strength of romantic partnership as an attractor in your landscape — how central romantic love is to your relational identity.',
  },
  {
    name: 'Tender middle',
    short: 'Tender middle',
    definition: 'Your comfort in the ambiguous space between friendship and romance — where connection is warm, embodied, and deep but doesn\'t fit a category.',
  },
  {
    name: 'Casual touch',
    short: 'Physical comfort',
    definition: 'How naturally physical affection flows in non-romantic contexts — hugging, leaning, hand-holding with friends and close ones.',
  },
  {
    name: 'Empty physicality barrier',
    short: 'Grounding need',
    definition: 'Your need for emotional depth before physical intimacy feels meaningful — the barrier against physicality without emotional connection.',
  },
  {
    name: 'Ungrounded intensity barrier',
    short: 'Structure need',
    definition: 'Your need for structure, labels, or agreements before allowing intense relational energy to build. High values mean you need grounding before depth.',
  },
  {
    name: 'Uncertainty tolerance',
    short: 'Ambiguity comfort',
    definition: 'How comfortable you are with relationships that resist definition — connections that exist without clear labels or categories.',
  },
  {
    name: 'Openness',
    short: 'Relational openness',
    definition: 'Your orientation toward exclusivity vs. multiplicity in intimate connections — whether deep bonds with multiple people feel natural or threatening.',
  },
  {
    name: 'Mapped territory',
    short: 'Self-knowledge',
    definition: 'How much of your own relational landscape you\'ve explored — whether you know your valleys and ridges well, or have significant frontier ahead.',
  },
  {
    name: 'Self-intimacy',
    short: 'Self-relationship',
    definition: 'The depth and comfort of your relationship with yourself — whether solitude is nourishing, and how well you know your own inner terrain.',
  },
  {
    name: 'Conflict approach',
    short: 'Tension navigation',
    definition: 'How you move through relational friction — whether you withdraw, smooth over, address directly, or let tensions breathe.',
  },
  {
    name: 'Playfulness',
    short: 'Levity in intimacy',
    definition: 'How central humor, lightness, and play are to your experience of closeness — whether connection flows through laughter or through gravity.',
  },
  {
    name: 'Attachment security',
    short: 'Attachment wiring',
    definition: 'How your system responds when connection feels threatened — whether you pursue, withdraw, or remain grounded when someone pulls away.',
  },
];

const INTERPRETATIONS = [
  // P0: deepFriendships
  {
    low: 'You keep friendships relatively light — warmth without heavy emotional weight.',
    mid: 'Your friendships carry meaningful emotional depth, balanced with natural boundaries.',
    high: 'Your friendships run profoundly deep — emotional intimacy is central to how you connect platonically.',
  },
  // P1: romanticLove
  {
    low: 'Romantic love sits quietly in your landscape — present but not a dominant force.',
    mid: 'Romantic connection is an important valley in your landscape, grounded in emotional depth.',
    high: 'Romantic love is one of your deepest valleys — a strong attractor in your relational landscape.',
  },
  // P2: tenderMiddle
  {
    low: 'The tender middle — that ambiguous space between friendship and romance — feels uncomfortable. You prefer clarity.',
    mid: 'You can navigate the space between friendship and romance, though it takes intention.',
    high: 'The tender middle is natural territory for you. Ambiguous intimacy between friendship and romance feels comfortable.',
  },
  // P3: casualTouch
  {
    low: 'Physical affection outside of romantic contexts requires intentional trust for you.',
    mid: 'You\'re moderately comfortable with casual physical connection — context-dependent.',
    high: 'Physical affection comes naturally to you across many relational contexts.',
  },
  // P4: emptyPhysBarrier
  {
    low: 'Physical connection without emotional depth doesn\'t bother you much — the physical has its own value.',
    mid: 'You prefer some emotional connection with physical intimacy, but you\'re flexible.',
    high: 'You have a strong barrier against physical intimacy without emotional grounding. Connection comes first.',
  },
  // P5: ungroundedBarrier
  {
    low: 'You\'re comfortable with intense connection even without clear structure or labels.',
    mid: 'You appreciate some structure in intense relationships, but can flex.',
    high: 'Unstructured intensity makes you uncomfortable. You need grounding before going deep.',
  },
  // P6: uncertaintyTolerance
  {
    low: 'Relational ambiguity is stressful — you prefer clear definitions and boundaries.',
    mid: 'You can sit with some ambiguity, though you\'ll eventually want clarity.',
    high: 'You\'re comfortable with undefined relationships. Labels feel optional — connection speaks for itself.',
  },
  // P7: openness
  {
    low: 'Exclusivity is important to you. Intimate connections are held closely.',
    mid: 'You\'re somewhere in the middle on openness — context and trust guide your boundaries.',
    high: 'You orient toward openness in relationships. Multiple deep connections feel natural, not threatening.',
  },
  // P8: mapped
  {
    low: 'Your relational landscape has significant unexplored territory. There\'s a frontier ahead.',
    mid: 'You\'ve explored a fair amount of your relational territory, with room still to discover.',
    high: 'You\'ve mapped much of your relational landscape. You know your valleys and your ridges well.',
  },
  // P9: selfIntimacy
  {
    low: 'Extended solitude feels depleting — you draw energy and grounding from connection with others.',
    mid: 'You balance time with yourself and time with others. Solitude has value but isn\'t your primary source of intimacy.',
    high: 'Your relationship with yourself is deep and nourishing. Solitude is a form of intimacy for you.',
  },
  // P10: conflictApproach
  {
    low: 'When tension arises, your instinct is to withdraw or smooth things over — preserving harmony matters.',
    mid: 'You navigate conflict with a mix of directness and patience, adjusting to the situation.',
    high: 'You move toward tension rather than away from it. Honest engagement with friction is how you deepen trust.',
  },
  // P11: playfulness
  {
    low: 'Intimacy for you runs through sincerity and depth — playfulness is nice but not essential.',
    mid: 'Humor and play have a real place in your connections, balanced with more serious registers.',
    high: 'Playfulness is central to how you experience closeness. Laughter and lightness are how you know you\'re safe.',
  },
  // P12: attachmentSecurity
  {
    low: 'When connection feels threatened, your system activates strongly — anxiety or withdrawal shapes your response.',
    mid: 'You feel the pull when someone withdraws, but you can hold steady with some effort.',
    high: 'Your attachment wiring is relatively secure. When someone pulls away, you can stay grounded and give space.',
  },
];

/**
 * Get a text interpretation for a single parameter.
 */
function getInterpretation(paramIndex, value) {
  const interp = INTERPRETATIONS[paramIndex];
  if (!interp) return '';
  if (value < 0.35) return interp.low;
  if (value > 0.65) return interp.high;
  return interp.mid;
}

/**
 * Generate a full landscape reading from 13 parameters.
 * Returns an array of { name, short, definition, value, text } objects.
 */
export function generateReading(params) {
  return params.map((val, i) => ({
    name: PARAM_LABELS[i]?.name ?? `Parameter ${i}`,
    short: PARAM_LABELS[i]?.short ?? `P${i}`,
    definition: PARAM_LABELS[i]?.definition ?? '',
    value: val,
    text: getInterpretation(i, val),
  }));
}

/**
 * Generate 2-3 sentence headline summary of the landscape.
 */
export function generateSummary(params) {
  const [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12] = params;

  const traits = [];

  if (P0 > 0.7) traits.push('values deep emotional friendships');
  if (P7 > 0.65) traits.push('orients toward relational openness');
  else if (P7 < 0.35) traits.push('values exclusivity');
  if (P2 > 0.6) traits.push('is comfortable in the tender middle');
  else if (P2 < 0.3) traits.push('prefers clear relational categories');
  if (P4 > 0.65) traits.push('needs emotional grounding for physical intimacy');
  if (P6 > 0.65) traits.push('sits comfortably with ambiguity');
  else if (P6 < 0.3) traits.push('prefers clearly defined relationships');
  if (P9 > 0.7) traits.push('has a deep relationship with solitude');
  if (P12 > 0.7) traits.push('has secure attachment wiring');
  else if (P12 < 0.3) traits.push('carries anxious or avoidant attachment patterns');
  if (P11 > 0.7) traits.push('connects through play and humor');
  if (P10 > 0.7) traits.push('engages conflict directly');
  else if (P10 < 0.3) traits.push('tends to avoid or smooth over tension');
  if (P8 < 0.35) traits.push('has significant unexplored territory');
  else if (P8 > 0.7) traits.push('has mapped much of their relational landscape');

  if (traits.length === 0) {
    return 'Your landscape is balanced — no extreme peaks or valleys dominate the terrain.';
  }

  const picked = traits.slice(0, 3);
  const last = picked.pop();
  const joined = picked.length > 0
    ? picked.join(', ') + ', and ' + last
    : last;

  return `This is someone who ${joined}.`;
}
