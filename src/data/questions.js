export const questions = [
  {
    id: 'q1',
    type: 'slider',
    text: 'How deeply do your closest friendships go emotionally?',
    left: 'Surface warmth',
    right: 'Profoundly deep',
    helperText: 'Think about your closest non-romantic relationships. Do you share your fears, dreams, and vulnerabilities — or keep things warm but light?',
    articleConcept: 'Deep friendships',
  },
  {
    id: 'q2',
    type: 'slider',
    text: 'How comfortable are you with physical affection outside of romantic relationships?',
    left: 'Reserved',
    right: 'Very natural',
    helperText: 'Think hugging, hand-holding, leaning on someone, an arm around a shoulder, cuddling on the couch — physical warmth that isn\'t sexual or romantic.',
    articleConcept: 'Casual touch',
  },
  {
    id: 'q3',
    type: 'slider',
    text: 'For you, how connected are physical intimacy and emotional intimacy?',
    left: 'Inseparable',
    right: 'Fully independent',
    helperText: 'Can physical closeness exist without emotional depth, or does one always require the other? Neither answer is better — this is about your wiring.',
    articleConcept: 'Empty physicality barrier',
  },
  {
    id: 'q4',
    type: 'scenario',
    text: 'A close friend begins being more physically affectionate — holding your hand, leaning into you, cuddling on the couch.',
    helperText: 'This is about the tender middle — the space between friendship and romance where physical warmth and emotional depth coexist without labels.',
    articleConcept: 'Tender middle',
    options: [
      { label: "I'd need to set a boundary", value: 0 },
      { label: 'It depends entirely on the person and context', value: 0.35 },
      { label: "That's natural — I'm like this with close people", value: 0.7 },
      { label: "I'd welcome it — closeness deepens connection", value: 1.0 },
    ],
  },
  {
    id: 'q5',
    type: 'scenario',
    text: "You have an intense physical connection with someone, but the emotional depth isn't there yet.",
    helperText: 'This explores whether physical intensity without emotional grounding feels exciting, incomplete, or uncomfortable to you.',
    articleConcept: 'Ungrounded intensity',
    options: [
      { label: 'That feels empty — I need emotional grounding first', value: 0 },
      { label: "Fun but incomplete — I'd want more eventually", value: 0.35 },
      { label: 'Physical connection has its own value', value: 0.75 },
      { label: 'Sometimes the physical opens the door to emotional', value: 0.55 },
    ],
  },
  {
    id: 'q18',
    type: 'slider',
    text: 'How strong is the pull toward romantic partnership in your life?',
    left: 'A quiet presence',
    right: 'A defining force',
    helperText: 'Romantic partnership here means a bond that combines emotional depth, physical intimacy, and some shared life — whatever its structure, and however many such bonds you\'re open to. Is that pull central to the life you want, or peripheral?',
    articleConcept: 'Romantic love',
  },
  {
    id: 'q19',
    type: 'scenario',
    text: 'Think about falling in love — the charge of it, the wanting to weave your life together with someone\'s.',
    helperText: 'This is about romantic passion itself — whether that experience is something you seek, savor, or could happily live without. No answer is better; some of the richest landscapes have quiet romantic valleys.',
    articleConcept: 'Romantic love',
    options: [
      { label: 'That pull isn\'t really part of how I connect', value: 0 },
      { label: 'Lovely when it happens, but I don\'t seek it out', value: 0.35 },
      { label: 'A powerful current I make room for', value: 0.7 },
      { label: 'One of the most important experiences in my life', value: 1.0 },
    ],
  },
  {
    id: 'q6',
    type: 'slider',
    text: 'How important is exclusivity in your intimate relationships?',
    left: 'Essential',
    right: 'Not important',
    helperText: 'This isn\'t about what you practice — it\'s about what feels natural. Does sharing intimacy across multiple people feel threatening, neutral, or enriching?',
    articleConcept: 'Openness',
  },
  {
    id: 'q7',
    type: 'scenario',
    text: 'Your partner develops a deep emotional bond with someone else — not sexual, but genuinely intimate.',
    helperText: 'This measures how you experience your partner\'s intimacy with others — as a threat to your bond, or as something separate from it.',
    articleConcept: 'Openness',
    options: [
      { label: "That intimacy belongs to us — I'd feel threatened", value: 0 },
      { label: "Uncomfortable, but I'd want to talk about it", value: 0.35 },
      { label: "I'd be curious about the connection", value: 0.7 },
      { label: 'Meaningful connections with others enrich a person', value: 1.0 },
    ],
  },
  {
    id: 'q8',
    type: 'scenario',
    text: "You find yourself in a relationship that doesn't fit any conventional label — not quite friends, not quite partners, something unnamed.",
    helperText: 'Some people need to name what a relationship is. Others are comfortable letting it exist without a category. This is about your tolerance for relational ambiguity.',
    articleConcept: 'Uncertainty tolerance',
    options: [
      { label: "That ambiguity would stress me — I need to define it", value: 0 },
      { label: "I could sit with it for a while, but I'd want clarity", value: 0.35 },
      { label: "Labels feel constraining — I'd let it be what it is", value: 0.75 },
      { label: 'Most of my meaningful connections resist labels', value: 1.0 },
    ],
  },
  {
    id: 'q9',
    type: 'scenario',
    text: 'Someone you deeply trust suggests exploring a dimension of your relationship you\'ve never considered.',
    helperText: 'This is about your willingness to step into unmapped territory — relational experiences you haven\'t had before, with someone you trust.',
    articleConcept: 'Mapped territory',
    options: [
      { label: "I know what I want — I'd probably decline", value: 0 },
      { label: "Anxious but intrigued — I'd need time", value: 0.4 },
      { label: 'Cautious but open — careful exploration appeals to me', value: 0.65 },
      { label: 'Excited — this is how I learn about myself', value: 1.0 },
    ],
  },
  {
    id: 'q10',
    type: 'slider',
    text: "How much of your own relational landscape do you feel you've explored?",
    left: 'Barely scratched the surface',
    right: 'Well-mapped',
    helperText: 'Do you feel like you know yourself relationally — your needs, your boundaries, your patterns? Or is there significant territory you haven\'t ventured into yet?',
    articleConcept: 'Mapped territory',
  },
  {
    id: 'q11',
    type: 'slider',
    text: 'How comfortable are you being emotionally vulnerable with multiple people at once?',
    left: 'Only with one person',
    right: 'Openly with many',
    helperText: 'Some people concentrate emotional depth into a single relationship. Others distribute vulnerability across many. Neither is more authentic — it\'s about capacity.',
    articleConcept: 'Deep friendships',
  },
  {
    id: 'q12',
    type: 'scenario',
    text: 'When you think about intimacy — all forms of it — what resonates most?',
    helperText: 'Your answer here shapes the overall orientation of your landscape. There\'s no wrong choice — it\'s about what draws you.',
    options: [
      { label: 'Safety — it requires protection and clear boundaries', value: 0 },
      { label: 'Connection — depth of understanding between people', value: 0.45 },
      { label: 'Discovery — every relationship reveals something new', value: 0.75 },
      { label: 'Freedom — intimacy flourishes when unconstrained', value: 1.0 },
    ],
  },
  {
    id: 'q13',
    type: 'slider',
    text: 'How comfortable are you spending extended time alone — not lonely, but genuinely with yourself?',
    left: 'Uneasy alone',
    right: 'Deeply nourishing',
    helperText: 'This is about your relationship with yourself — whether solitude feels restorative or depleting. It\'s not about introversion, but about whether you find intimacy in your own company.',
    articleConcept: 'Self-intimacy',
  },
  {
    id: 'q14',
    type: 'scenario',
    text: 'When tension arises in a close relationship, what\'s your first instinct?',
    helperText: 'How you move through conflict shapes the terrain between your deeper connections — whether ridges form or passes open.',
    articleConcept: 'Conflict approach',
    options: [
      { label: 'Pull back — I need space before I can engage', value: 0 },
      { label: 'Smooth it over — harmony matters most', value: 0.35 },
      { label: 'Address it directly — clarity comes from honesty', value: 0.75 },
      { label: 'Let it breathe — not everything needs resolution', value: 1.0 },
    ],
  },
  {
    id: 'q15',
    type: 'slider',
    text: 'How important is playfulness and humor in your intimate connections?',
    left: 'Nice but optional',
    right: 'Absolutely essential',
    helperText: 'Some people connect deepest through laughter, teasing, and play. Others find depth through seriousness and sincerity. Where does levity sit in your intimacy?',
    articleConcept: 'Playfulness',
  },
  {
    id: 'q16',
    type: 'scenario',
    text: 'Someone you\'re close to suddenly pulls away without explanation.',
    helperText: 'This reveals something about your attachment wiring — how your system responds when connection feels threatened.',
    articleConcept: 'Attachment security',
    options: [
      { label: 'I\'d feel panicked and pursue them for reassurance', value: 0 },
      { label: 'I\'d feel hurt and pull away myself', value: 0.3 },
      { label: 'I\'d give them space and check in when it felt right', value: 0.7 },
      { label: 'I\'d notice but not be too affected — people need space', value: 1.0 },
    ],
  },
  {
    id: 'q17',
    type: 'scenario',
    text: 'A new connection is forming that excites you. What pace feels right?',
    helperText: 'The speed at which you approach new relational territory says something about how you balance openness with caution.',
    articleConcept: 'Pace preference',
    options: [
      { label: 'Slow and careful — trust is built in small steps', value: 0 },
      { label: 'Let it unfold naturally — no need to force or hold back', value: 0.4 },
      { label: 'Dive in — intensity is how I learn what\'s real', value: 0.8 },
      { label: 'Match their pace — attunement matters more than speed', value: 0.55 },
    ],
  },
];

/**
 * The same nineteen questions, asked about somebody else.
 *
 * This is the perception layer: you answer as you think THEY would, and the
 * result is your model of them — which, held against their own answers, says
 * how much of them you can see.
 *
 * Two things the wording has to do, and both are easy to get wrong:
 *
 * 1. **Ask for a guess, not a verdict.** "What do you think they'd say" leaves
 *    room to be wrong. "What are they like" does not, and turns every gap into
 *    an accusation — of them for being unreadable, or of you for not paying
 *    attention.
 * 2. **Keep the scenario theirs.** A question about "your partner" becomes
 *    ambiguous the moment the subject changes: whose partner? So the scenarios
 *    are rewritten around them, not translated pronoun by pronoun.
 *
 * Only what changes is listed. Values never change — the same answer means the
 * same thing on both sides, which is the whole basis for comparing them.
 */
export const ABOUT_PHRASINGS = {
  q1: {
    text: 'How deeply do you think their closest friendships go emotionally?',
    helperText: "Think about their closest non-romantic relationships. Do they share their fears, dreams and vulnerabilities — or keep things warm but light?",
  },
  q2: {
    text: 'How comfortable do you think they are with physical affection outside of romantic relationships?',
    helperText: "Hugging, hand-holding, leaning on someone, an arm around a shoulder, cuddling on the couch — physical warmth that isn't sexual or romantic.",
  },
  q3: {
    text: 'For them, how connected do you think physical and emotional intimacy are?',
    helperText: 'Can physical closeness exist for them without emotional depth, or does one always require the other? Neither answer is better — this is about their wiring.',
  },
  q4: {
    text: 'A close friend of theirs starts being more physically affectionate — holding their hand, leaning into them, cuddling on the couch.',
    helperText: 'This is about the tender middle — the space between friendship and romance where physical warmth and emotional depth coexist without labels.',
    options: [
      "They'd need to set a boundary",
      'It would depend entirely on the person and context',
      "That's natural for them — they're like this with close people",
      "They'd welcome it — closeness deepens connection",
    ],
  },
  q5: {
    text: "They have an intense physical connection with someone, but the emotional depth isn't there yet.",
    helperText: 'This explores whether physical intensity without emotional grounding would feel exciting, incomplete, or uncomfortable to them.',
    options: [
      "It would feel empty — they need emotional grounding first",
      "Fun but incomplete — they'd want more eventually",
      'Physical connection has its own value for them',
      'Sometimes the physical opens the door to the emotional for them',
    ],
  },
  q18: {
    text: 'How strong is the pull toward romantic partnership in their life?',
    helperText: "Romantic partnership here means a bond combining emotional depth, physical intimacy and some shared life, whatever its structure. Is that pull central to the life they want, or peripheral?",
  },
  q19: {
    text: 'Think about them falling in love — the charge of it, the wanting to weave a life together with someone.',
    helperText: "This is about romantic passion itself — whether that experience is something they seek, savour, or could happily live without. No answer is better.",
    options: [
      "That pull isn't really part of how they connect",
      "Lovely when it happens, but they don't seek it out",
      'A powerful current they make room for',
      'One of the most important experiences in their life',
    ],
  },
  q6: {
    text: 'How important do you think exclusivity is in their intimate relationships?',
    helperText: "Not what they practise — what feels natural to them. Does sharing intimacy across multiple people feel threatening, neutral, or enriching?",
  },
  q7: {
    text: 'A partner of theirs develops a deep emotional bond with someone else — not sexual, but genuinely intimate.',
    helperText: "This measures how they'd experience a partner's intimacy with others — as a threat to the bond, or as something separate from it.",
    options: [
      "That intimacy belongs to the two of them — they'd feel threatened",
      "Uncomfortable, but they'd want to talk about it",
      "They'd be curious about the connection",
      'Meaningful connections with others enrich a person',
    ],
  },
  q8: {
    text: "They find themselves in a relationship that doesn't fit any conventional label — not quite friends, not quite partners, something unnamed.",
    helperText: 'Some people need to name what a relationship is. Others are comfortable letting it exist without a category. This is about their tolerance for relational ambiguity.',
    options: [
      "That ambiguity would stress them — they'd need to define it",
      "They could sit with it for a while, but they'd want clarity",
      "Labels would feel constraining — they'd let it be what it is",
      'Most of their meaningful connections resist labels',
    ],
  },
  q9: {
    text: "Someone they deeply trust suggests exploring a dimension of the relationship they've never considered.",
    helperText: "This is about their willingness to step into unmapped territory — relational experiences they haven't had before, with someone they trust.",
    options: [
      "They know what they want — they'd probably decline",
      "Anxious but intrigued — they'd need time",
      'Cautious but open — careful exploration appeals to them',
      'Excited — this is how they learn about themselves',
    ],
  },
  q10: {
    text: "How much of their own relational landscape do you think they've explored?",
    helperText: 'Do they know themselves relationally — their needs, their boundaries, their patterns? Or is there significant territory they have not ventured into?',
  },
  q11: {
    text: 'How comfortable do you think they are being emotionally vulnerable with multiple people at once?',
    helperText: 'Some people concentrate emotional depth into a single relationship. Others distribute vulnerability across many. Neither is more authentic — it is about capacity.',
  },
  q12: {
    text: 'When they think about intimacy — all forms of it — what do you think resonates most?',
    helperText: 'Your answer here shapes the overall orientation of the landscape you are sketching for them.',
  },
  q13: {
    text: 'How comfortable do you think they are spending extended time alone — not lonely, but genuinely with themselves?',
    helperText: 'This is about their relationship with themselves — whether solitude is restorative or depleting for them. Not introversion, but whether they find intimacy in their own company.',
  },
  q14: {
    text: 'When tension arises in a close relationship, what do you think their first instinct is?',
    helperText: 'How a person moves through conflict shapes the terrain between their deeper connections — whether ridges form or passes open.',
    options: [
      'Pull back — they need space before they can engage',
      'Smooth it over — harmony matters most to them',
      'Address it directly — clarity comes from honesty',
      'Let it breathe — not everything needs resolution',
    ],
  },
  q15: {
    text: 'How important do you think playfulness and humour are in their intimate connections?',
    helperText: 'Some people connect deepest through laughter, teasing and play. Others find depth through seriousness and sincerity. Where does levity sit for them?',
  },
  q16: {
    text: "Someone they're close to suddenly pulls away without explanation.",
    helperText: 'This reveals something about their attachment wiring — how their system responds when connection feels threatened.',
    options: [
      "They'd feel panicked and pursue them for reassurance",
      "They'd feel hurt and pull away themselves",
      "They'd give them space and check in when it felt right",
      "They'd notice but not be too affected — people need space",
    ],
  },
  q17: {
    text: 'A new connection is forming that excites them. What pace do you think feels right to them?',
    helperText: 'The speed at which a person approaches new relational territory says something about how they balance openness with caution.',
    options: [
      'Slow and careful — trust is built in small steps',
      'Let it unfold naturally — no need to force or hold back',
      "Dive in — intensity is how they learn what's real",
      "Match the other person's pace — attunement matters more than speed",
    ],
  },
};

/**
 * The question set for a given mode.
 *
 * @param {'self'|'about'} mode
 * @returns {Array} the questions, with "about them" wording merged in
 */
export function questionsFor(mode = 'self') {
  if (mode !== 'about') return questions;
  return questions.map((q) => {
    const about = ABOUT_PHRASINGS[q.id];
    if (!about) return q;
    const merged = { ...q, ...about };
    // Option LABELS are rewritten; option VALUES never are. The same answer has
    // to score the same on both sides or the two landscapes are not comparable.
    if (q.options) {
      merged.options = q.options.map((opt, i) => ({
        ...opt,
        label: about.options?.[i] ?? opt.label,
      }));
    }
    return merged;
  });
}
