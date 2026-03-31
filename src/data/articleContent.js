const ARTICLE_URL = 'https://bayesianpersuasion.com/posts/the-shape-of-intimacy';

export { ARTICLE_URL };

/**
 * Definitions for each terrain feature, drawn from the original article.
 */
export const FEATURE_DEFINITIONS = {
  'Deep friendships': {
    name: 'Deep friendships',
    shortDef: 'A valley where emotionally intimate platonic bonds settle naturally.',
    longDef: 'This valley represents your capacity and desire for deep emotional connection in friendships — the kind where you share vulnerabilities, fears, and inner worlds with people you\'re not romantically involved with. A deep valley here means these bonds form effortlessly. A shallow one means you keep friendships warm but bounded.',
    isRidge: false,
  },
  'Romantic love': {
    name: 'Romantic love',
    shortDef: 'A valley where romantic partnership settles — emotional and physical depth combined.',
    longDef: 'This represents the pull toward romantic intimacy as a primary mode of deep connection. A deep valley means romantic love is one of the strongest attractors in your landscape. The width of this valley is shaped by your openness — the more open you are to multiple connections, the broader it becomes.',
    isRidge: false,
  },
  'Tender middle': {
    name: 'Tender middle',
    shortDef: 'The ambiguous space between friendship and romance — warm, embodied, deep, but uncategorized.',
    longDef: 'This is the region where emotional and physical intimacy are balanced, where a connection is warm and embodied and deep but doesn\'t fit neatly into "friend" or "partner." Most people\'s default landscapes have a ridge here, because culture teaches that this space is dangerous. For some, it\'s where the most meaningful connections live.',
    isRidge: false,
  },
  'Casual touch': {
    name: 'Casual touch',
    shortDef: 'A valley where comfortable, non-romantic physical warmth settles.',
    longDef: 'This represents your comfort with physical affection in non-romantic contexts — hugging friends, leaning on someone, physical warmth that isn\'t sexual. A deep valley means this comes naturally. A shallow one means physical touch is reserved for more defined intimate contexts.',
    isRidge: false,
  },
  'Mentorship': {
    name: 'Mentorship',
    shortDef: 'A valley for deep but asymmetric emotional bonds — guidance, care, teaching.',
    longDef: 'This valley represents intimate connections that have a mentoring quality — depth and care without the symmetry of friendship or the charge of romance. These are relationships where one person holds more experience or guidance, and the intimacy flows through that asymmetry.',
    isRidge: false,
  },
  'Empty physicality': {
    name: 'Empty physicality barrier',
    shortDef: 'A ridge that resists physical intimacy without emotional grounding.',
    longDef: 'This barrier represents the energy required to engage in physical intimacy when emotional depth isn\'t present. A tall ridge means you strongly need emotional connection before physical closeness — the physical without the emotional feels hollow. A low ridge means the physical has its own independent value for you.',
    isRidge: true,
  },
  'Ungrounded intensity': {
    name: 'Ungrounded intensity barrier',
    shortDef: 'A ridge that resists intense relational energy without clear structure.',
    longDef: 'This is about intense relational energy — deep attraction, emotional flooding, rapid bonding — that lacks clear structure, labels, or agreements. The barrier measures your need for grounding (definitions, frameworks, mutual understanding) before allowing intensity to build. A tall ridge means unstructured intensity feels unsafe. A low one means you\'re comfortable letting intensity exist without containing it.',
    isRidge: true,
  },
  'Uncertainty ridge': {
    name: 'Uncertainty tolerance',
    shortDef: 'A ridge (or valley) that reflects how you handle relational ambiguity.',
    longDef: 'When this is a ridge, it represents resistance to undefined relationships — you need labels, clarity, and structure. When it flattens or becomes a valley, ambiguity becomes comfortable territory. This isn\'t about indecisiveness — it\'s about whether the undefined space between relational categories feels stressful or generative.',
    isRidge: true,
  },
  'Self-intimacy': {
    name: 'Self-intimacy',
    shortDef: 'A valley representing the depth of your relationship with yourself.',
    longDef: 'This valley represents your capacity for solitude as a form of intimacy — not loneliness, but genuine self-connection. A deep valley means you find extended time alone nourishing, restorative, even essential. A shallow one means you draw your energy and grounding primarily from connection with others.',
    isRidge: false,
  },
  'Playful connection': {
    name: 'Playful connection',
    shortDef: 'A valley where lightness, humor, and play create closeness.',
    longDef: 'This valley represents the role of playfulness in your experience of intimacy. Some people connect most deeply through laughter, teasing, games, and shared absurdity. A deep valley here means levity isn\'t a distraction from depth — it\'s a pathway to it. A shallow one means your intimacy runs through more serious registers.',
    isRidge: false,
  },
  'Conflict ridge': {
    name: 'Conflict approach',
    shortDef: 'A ridge (or pass) that reflects how tension shapes the terrain between your deeper connections.',
    longDef: 'This ridge sits between your deeper valleys, representing how conflict and tension are navigated. When it\'s tall, friction creates real barriers between regions of depth — avoidance or smoothing-over means tension stays unresolved. When it flattens into a pass, direct engagement with conflict actually creates pathways between your deeper connections.',
    isRidge: true,
  },
  'Attachment ridge': {
    name: 'Attachment security',
    shortDef: 'A ridge (or valley) shaped by your attachment wiring — how your system responds when connection is threatened.',
    longDef: 'This feature reflects your attachment style\'s impact on your terrain. When insecurity is high, it forms a wide ridge between your deep valleys — anxiety or avoidance creates barriers to reaching your most vulnerable places. As security increases, the ridge dissolves and can even become a valley, creating a "secure base" at the deepest part of your landscape.',
    isRidge: true,
  },
  'Secure base': {
    name: 'Secure base',
    shortDef: 'A deep valley that only appears when attachment security is strong — a "home" in your landscape.',
    longDef: 'The secure base is a valley that emerges only for people with strong attachment security. It represents the deep, grounded center from which all other connections extend — the internal sense that you are fundamentally safe in relationship. When present, it sits at the deepest part of the landscape, creating a home base that other valleys orbit around.',
    isRidge: false,
  },
};

/**
 * Core terrain concepts from the article framework.
 */
export const TERRAIN_CONCEPTS = {
  valley: {
    name: 'Valley',
    definition: 'A place where relationships naturally settle — effortless, comfortable. Water flows downhill into valleys. Your deepest valleys represent the kinds of intimacy that come most naturally to you.',
  },
  ridge: {
    name: 'Ridge',
    definition: 'An energy barrier — a region you\'d have to push hard to cross. Ridges represent the kinds of intimacy that require effort, discomfort, or active choice to engage with. They\'re not walls — they can be crossed — but they take energy.',
  },
  unmapped: {
    name: 'Unmapped territory',
    definition: 'Regions that fade into fog at the edges of your landscape. There might be deep valleys out there that you\'ve never found because you\'ve never had a relationship with enough energy to push past the explored frontier. The unknown isn\'t empty — it\'s uncharted.',
  },
  combined: {
    name: 'Combined landscape',
    definition: 'When two people enter a relationship, they superimpose their landscapes. Where both have valleys, the combined terrain drops deeper — shared openness, effortless connection. Where one has a valley and the other a ridge, the terrain is navigable but requires energy, conversation, care. Where both have ridges — that\'s a mutual boundary worth respecting.',
  },
};
