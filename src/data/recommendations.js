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

const RECOMMENDATION_RULES = [
  {
    param: 0, // deepFriendships
    close: { type: 'shared', title: 'Shared ground: deep friendships', text: 'You both value emotional depth in friendships. This shared capacity is a foundation you can build on.' },
    far: { type: 'conversation', title: 'Conversation: friendship depth', text: 'You differ in how deeply friendships go emotionally. Understanding what "close friend" means to each of you may reveal important expectations.' },
  },
  {
    param: 2, // tenderMiddle
    close: { type: 'shared', title: 'Shared ground: the tender middle', text: 'You both navigate the space between friendship and romance similarly. That ambiguous tenderness is comfortable territory for both of you.' },
    far: { type: 'conversation', title: 'Conversation: ambiguous intimacy', text: 'The tender space between friendship and romance feels different for each of you. This is worth exploring — it often holds unspoken assumptions.' },
  },
  {
    param: 4, // emptyPhysBarrier
    close: { type: 'boundary', title: 'Mutual boundary: physical grounding', text: 'You share a similar need for emotional grounding in physical connection. This alignment creates safety.' },
    far: { type: 'conversation', title: 'Conversation: physical-emotional link', text: 'You experience the connection between physical and emotional intimacy differently. Neither is wrong — but understanding the difference prevents hurt.' },
  },
  {
    param: 7, // openness
    close: { type: 'shared', title: 'Shared ground: openness', text: 'You share a similar orientation toward openness in relationships. This alignment reduces friction around boundaries.' },
    far: { type: 'conversation', title: 'Conversation: exclusivity', text: 'You have different relationships to exclusivity and openness. This is one of the most important conversations to have honestly.' },
  },
  {
    param: 6, // uncertaintyTolerance
    close: { type: 'shared', title: 'Shared ground: ambiguity tolerance', text: 'You both handle relational ambiguity similarly — whether that means needing clarity or being comfortable with the undefined.' },
    far: { type: 'conversation', title: 'Conversation: need for definition', text: 'One of you needs more relational clarity than the other. Understanding this difference can prevent unnecessary anxiety.' },
  },
  {
    param: 8, // mapped
    closeSpecial: { type: 'frontier', title: 'Shared frontier', text: 'Neither of you feels fully mapped in your relational landscape. Exploring together — with care — could be meaningful.' },
    close: { type: 'shared', title: 'Shared ground: self-knowledge', text: 'You both have a similar sense of how well you know your own relational landscape.' },
    far: { type: 'conversation', title: 'Conversation: exploration gap', text: 'One of you has explored more relational territory than the other. This can create a helpful dynamic — or an uncomfortable one. Talk about it.' },
  },
  {
    param: 9, // selfIntimacy
    close: { type: 'shared', title: 'Shared ground: solitude', text: 'You relate to alone time similarly. This alignment around solitude and self-connection reduces friction about "needing space."' },
    far: { type: 'conversation', title: 'Conversation: alone time', text: 'One of you draws more from solitude than the other. What feels like healthy space to one person can feel like withdrawal to the other.' },
  },
  {
    param: 10, // conflictApproach
    close: { type: 'shared', title: 'Shared ground: conflict style', text: 'You navigate tension similarly. This shared instinct means fewer meta-conflicts about how to have conflicts.' },
    far: { type: 'conversation', title: 'Conversation: conflict styles', text: 'You handle tension differently — one of you moves toward it while the other pulls back. Understanding this pattern is essential for navigating hard moments.' },
  },
  {
    param: 11, // playfulness
    close: { type: 'shared', title: 'Shared ground: playfulness', text: 'You share a similar appetite for lightness and humor in connection. This shared register makes everyday closeness easier.' },
    far: { type: 'conversation', title: 'Conversation: levity vs. gravity', text: 'One of you leans more on play and humor in connection, while the other gravitates toward seriousness. Neither is wrong, but misreading the register can create friction.' },
  },
  {
    param: 12, // attachmentSecurity
    close: { type: 'shared', title: 'Shared ground: attachment wiring', text: 'Your attachment systems respond similarly when connection feels threatened. This symmetry can create mutual understanding — or mutual spiraling.' },
    far: { type: 'conversation', title: 'Conversation: attachment patterns', text: 'Your attachment systems differ significantly. When one person feels anxious and the other withdraws, a painful cycle can emerge. Naming this pattern is the first step.' },
  },
];

const CLOSE_THRESHOLD = 0.15;
const FAR_THRESHOLD = 0.27;
const HIGH_AVG = 0.6;
const LOW_AVG = 0.35;

/**
 * Generate recommendations from two parameter arrays.
 * Returns an array of { type, title, text }.
 */
export function generateRecommendations(paramsA, paramsB) {
  const results = [];

  for (const rule of RECOMMENDATION_RULES) {
    const a = paramsA[rule.param];
    const b = paramsB[rule.param];
    if (a == null || b == null) continue;
    const diff = Math.abs(a - b);
    const avg = (a + b) / 2;

    if (diff < CLOSE_THRESHOLD) {
      // Close — check for special cases
      if (rule.closeSpecial && avg < LOW_AVG) {
        results.push(rule.closeSpecial);
      } else if (avg > HIGH_AVG) {
        results.push(rule.close);
      }
    } else if (diff > FAR_THRESHOLD) {
      results.push(rule.far);
    }
  }

  return results;
}

export const DISCLAIMER = "Starting points, not diagnoses. Your landscape is a projection — reality has more dimensions than any model can hold.";
