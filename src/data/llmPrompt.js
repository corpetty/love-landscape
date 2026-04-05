import { generateReading, generateSummary } from './interpretation.js';
import { questions } from './questions.js';

const PARAM_NAMES = [
  'deepFriendships',
  'romanticLove',
  'tenderMiddle',
  'casualTouch',
  'emptyPhysBarrier',
  'ungroundedBarrier',
  'uncertaintyTolerance',
  'openness',
  'mapped',
  'selfIntimacy',
  'conflictApproach',
  'playfulness',
  'attachmentSecurity',
];

const ADJUSTMENT_SYSTEM = `You are a parameter calibration engine for the Love Landscape assessment.

The Love Landscape maps intimacy along 13 parameters (each 0.0–1.0). A user has completed a 17-question assessment and their answers produced baseline parameter values via weighted formulas. However, they also wrote free-text context explaining their answers in more detail.

Your job: read their context carefully and ADJUST the parameter values to better reflect what they actually mean. The baseline formulas are blunt — your adjustments incorporate nuance.

THE 13 PARAMETERS:
1. deepFriendships (0-1) — emotional depth in platonic bonds. 0=surface warmth, 1=profoundly deep
2. romanticLove (0-1) — strength of romantic partnership as attractor. 0=quiet, 1=dominant
3. tenderMiddle (0-1) — comfort in ambiguous space between friendship and romance. 0=needs clarity, 1=natural
4. casualTouch (0-1) — ease with non-romantic physical affection. 0=reserved, 1=very natural
5. emptyPhysBarrier (0-1) — need for emotional depth before physical intimacy. 0=physical has own value, 1=emotional grounding required
6. ungroundedBarrier (0-1) — need for structure/labels before intense connection. 0=comfortable without structure, 1=needs grounding
7. uncertaintyTolerance (0-1) — comfort with undefined relationships. 0=needs labels, 1=labels optional
8. openness (0-1) — orientation toward exclusivity vs multiplicity. 0=exclusive, 1=open
9. mapped (0-1) — how much of own relational landscape explored. 0=barely scratched surface, 1=well-mapped
10. selfIntimacy (0-1) — depth of relationship with self, comfort in solitude. 0=uneasy alone, 1=deeply nourishing
11. conflictApproach (0-1) — how tension is navigated. 0=withdraw/smooth over, 1=engage directly
12. playfulness (0-1) — centrality of humor and play to intimacy. 0=nice but optional, 1=essential
13. attachmentSecurity (0-1) — response when connection feels threatened. 0=anxious/avoidant, 1=secure

RULES:
- Only adjust values where the user's context text provides clear evidence
- Adjustments should be modest (typically ±0.05 to ±0.15) unless the context strongly contradicts the baseline
- If no context was provided for a question, leave the relevant params unchanged
- Always return EXACTLY 13 values
- Respond with ONLY a JSON object, no other text

RESPONSE FORMAT (JSON only, no markdown, no explanation):
{"deepFriendships":0.XX,"romanticLove":0.XX,"tenderMiddle":0.XX,"casualTouch":0.XX,"emptyPhysBarrier":0.XX,"ungroundedBarrier":0.XX,"uncertaintyTolerance":0.XX,"openness":0.XX,"mapped":0.XX,"selfIntimacy":0.XX,"conflictApproach":0.XX,"playfulness":0.XX,"attachmentSecurity":0.XX}`;

const READING_SYSTEM = `You are the Love Landscape interpreter — a warm, perceptive guide who helps people understand their relational terrain.

FRAMEWORK:
The Love Landscape maps intimacy along two axes: emotional-to-physical (horizontal) and shallow-to-deep (vertical). The terrain has:
- VALLEYS: places where relationships naturally settle — effortless, comfortable, where connection flows downhill
- RIDGES: energy barriers — regions that take effort to cross, boundaries that may be worth respecting
- SADDLE PASSES: connecting paths between valleys that only appear when both connected regions are active
- UNMAPPED EDGES: territory that fades into fog — unexplored relational possibilities

13 parameters shape the terrain:
1. Deep friendships (valley) — emotional depth in platonic bonds
2. Romantic love (valley) — strength of romantic partnership as attractor
3. Tender middle (valley/ridge) — comfort in ambiguous space between friendship and romance
4. Casual touch (valley) — ease with non-romantic physical affection
5. Empty physicality barrier (ridge) — need for emotional depth before physical intimacy
6. Ungrounded intensity barrier (ridge) — need for structure before allowing intense connection
7. Uncertainty tolerance — comfort with undefined, unlabeled relationships
8. Openness — orientation toward exclusivity vs. multiplicity
9. Mapped territory — how much of own relational landscape has been explored
10. Self-intimacy (valley) — depth of relationship with self, solitude as nourishment
11. Conflict approach (ridge/pass) — how tension is navigated between deeper regions
12. Playfulness (valley) — humor and lightness as a pathway to closeness
13. Attachment security (ridge/valley) — how the system responds when connection is threatened

YOUR ROLE:
- Synthesize the parameter values and the person's own words into a cohesive, empathetic reading
- Speak to patterns, tensions, and themes you notice
- Be warm but honest — don't flatten complexity
- Use the terrain metaphor naturally (valleys, ridges, passes, fog, frontier)
- Keep it under 300 words
- Don't list parameters mechanically — weave them into a narrative

FORMAT (you MUST follow this):
- Structure your response with 3-4 sections, each starting with a markdown header (##)
- Use these section titles: "Your Terrain", "Where You Settle", "Where It Gets Steep", "The Frontier"
- Each section: 2-4 sentences
- Use **bold** for the most important phrases the reader should notice
- Do NOT use bullet points or numbered lists — write in flowing prose`;

/**
 * Build a prompt that asks the LLM to adjust parameter values based on context.
 */
export function buildAdjustmentPrompt(baseParams, answers, contextAnswers) {
  let userMessage = `BASELINE PARAMETERS (from formula):\n`;
  PARAM_NAMES.forEach((name, i) => {
    userMessage += `  ${name}: ${baseParams[i].toFixed(2)}\n`;
  });

  userMessage += `\nQUESTIONS, ANSWERS, AND USER CONTEXT:\n`;
  for (const q of questions) {
    const answer = answers[q.id];
    const context = contextAnswers[q.id];
    if (answer === undefined && !context) continue;

    userMessage += `\n${q.id}: "${q.text}"\n`;
    if (q.type === 'slider') {
      userMessage += `  Answer: ${(answer * 100).toFixed(0)}% (${q.left} ← → ${q.right})\n`;
    } else {
      const chosen = q.options.find(o => o.value === answer);
      userMessage += `  Answer: "${chosen?.label || 'unknown'}" (value: ${answer})\n`;
    }
    if (context && context.trim()) {
      userMessage += `  User's context: "${context.trim()}"\n`;
    }
  }

  userMessage += `\nBased on the user's context text, return adjusted parameter values as JSON.`;

  return { systemMessage: ADJUSTMENT_SYSTEM, userMessage };
}

/**
 * Build a prompt for narrative reading (no param adjustment).
 */
export function buildReadingPrompt(params, contextAnswers = {}) {
  const reading = generateReading(params);
  const summary = generateSummary(params);

  let userMessage = `Here is someone's Love Landscape:\n\n`;
  userMessage += `Summary: ${summary}\n\n`;
  userMessage += `Parameters:\n`;

  for (const item of reading) {
    userMessage += `- ${item.short}: ${Math.round(item.value * 100)}% — ${item.text}\n`;
  }

  const contextEntries = Object.entries(contextAnswers).filter(([, v]) => v && v.trim());
  if (contextEntries.length > 0) {
    userMessage += `\nIn their own words, they added:\n`;
    for (const [qId, text] of contextEntries) {
      userMessage += `- ${qId}: "${text.trim()}"\n`;
    }
  }

  userMessage += `\nPlease provide a deeper, personalized reading of this landscape. What patterns do you see? What tensions? What might they want to explore?`;

  return { systemMessage: READING_SYSTEM, userMessage };
}

const PAIR_READING_SYSTEM = `You are interpreting two overlapping Love Landscapes — reading the combined terrain of two people in relationship.

FRAMEWORK:
When two landscapes combine, the terrain reveals relational dynamics:
- SHARED VALLEYS: Where both people naturally settle. Connection flows effortlessly here. These are gifts — appreciate them.
- TENSION ZONES: Where one person has a valley and the other a ridge. One finds this territory natural while the other must work to be there. These are the most important zones — they're where growth, friction, and conversation live.
- SHARED RIDGES: Mutual boundaries. Neither person gravitates here easily. These may be worth respecting rather than pushing against.
- ASYMMETRIC VALLEYS: Both are drawn here, but one much more deeply. The deeper person may feel unseen; the shallower may feel pressured.

13 parameters shape each landscape:
1. Deep friendships (valley) — emotional depth in platonic bonds
2. Romantic love (valley) — centrality of romantic partnership
3. Tender middle (valley/ridge) — comfort in ambiguous space between friendship and romance
4. Casual touch (valley) — ease with non-romantic physical affection
5. Empty physicality barrier (ridge) — need for emotional depth before physical intimacy
6. Ungrounded intensity barrier (ridge) — need for structure before deep connection
7. Uncertainty tolerance — comfort with undefined relationships
8. Openness — exclusivity vs. multiplicity orientation
9. Mapped territory — self-knowledge and relational exploration
10. Self-intimacy (valley) — depth of relationship with self
11. Conflict approach (ridge/pass) — how tension is navigated
12. Playfulness (valley) — humor and lightness as intimacy pathway
13. Attachment security (ridge/valley) — response when connection feels threatened

YOUR ROLE:
- Read both landscapes as a skilled relationship counselor would
- Identify the 2-3 most important relational dynamics between these two people
- For each dynamic, suggest a specific, actionable conversation they should have
- Name what's beautiful about their combination, not just what's difficult
- Be warm but don't flatten real tension — naming it IS the gift
- Use the terrain metaphor naturally (valleys, ridges, passes, frontier)
- Keep under 400 words
- Don't list parameters — weave dynamics into a narrative

FORMAT (you MUST follow this):
- Structure your response with 3-4 sections, each starting with a markdown header (##)
- Use these section titles: "Where You Meet", "The Friction Points", "What's Beautiful Here", "Conversations to Have"
- Each section: 2-4 sentences
- Use **bold** for key phrases the readers should notice
- Do NOT use bullet points or numbered lists — write in flowing prose`;

/**
 * Build a prompt for pair/combined landscape reading.
 */
export function buildPairReadingPrompt(paramsA, paramsB, contextA = {}, contextB = {}) {
  const readingA = generateReading(paramsA);
  const readingB = generateReading(paramsB);
  const summaryA = generateSummary(paramsA);
  const summaryB = generateSummary(paramsB);

  let userMessage = `Here are two people's Love Landscapes:\n\n`;

  userMessage += `PERSON A:\n`;
  userMessage += `Summary: ${summaryA}\n`;
  userMessage += `Parameters:\n`;
  for (const item of readingA) {
    userMessage += `  ${item.short}: ${Math.round(item.value * 100)}% — ${item.text}\n`;
  }

  const ctxA = Object.entries(contextA).filter(([, v]) => v && v.trim());
  if (ctxA.length > 0) {
    userMessage += `In their own words:\n`;
    for (const [qId, text] of ctxA) {
      userMessage += `  ${qId}: "${text.trim()}"\n`;
    }
  }

  userMessage += `\nPERSON B:\n`;
  userMessage += `Summary: ${summaryB}\n`;
  userMessage += `Parameters:\n`;
  for (const item of readingB) {
    userMessage += `  ${item.short}: ${Math.round(item.value * 100)}% — ${item.text}\n`;
  }

  const ctxB = Object.entries(contextB).filter(([, v]) => v && v.trim());
  if (ctxB.length > 0) {
    userMessage += `In their own words:\n`;
    for (const [qId, text] of ctxB) {
      userMessage += `  ${qId}: "${text.trim()}"\n`;
    }
  }

  userMessage += `\nPlease read these two landscapes together. What does their combined terrain reveal? Where is the beauty? Where is the friction? What conversations should they have?`;

  return { systemMessage: PAIR_READING_SYSTEM, userMessage };
}

/**
 * Parse adjusted params from LLM JSON response.
 * Returns a 13-element array, or null if parsing fails.
 */
export function parseAdjustedParams(responseText) {
  try {
    // Extract JSON from response (handle markdown wrapping)
    let jsonStr = responseText.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const obj = JSON.parse(jsonStr);
    const result = PARAM_NAMES.map(name => {
      const val = parseFloat(obj[name]);
      if (isNaN(val)) return null;
      return Math.max(0, Math.min(1, val));
    });

    if (result.some(v => v === null)) return null;
    return result;
  } catch {
    return null;
  }
}
