/**
 * 8 test personas for Love Landscape analysis.
 *
 * Each persona defines:
 *   - answers: question responses (q1–q17, each 0–1)
 *   - expected: which params should be high/low/moderate
 *   - profile: qualitative description
 *   - terrainExpected: what the terrain should look like
 *   - tensions: internal contradictions worth testing
 */

export const PARAM_NAMES = [
  'deepFriendships',    // P0
  'romanticLove',       // P1
  'tenderMiddle',       // P2
  'casualTouch',        // P3
  'emptyPhysBarrier',   // P4
  'ungroundedBarrier',  // P5
  'uncertaintyTolerance',// P6
  'openness',           // P7
  'mapped',             // P8
  'selfIntimacy',       // P9
  'conflictApproach',   // P10
  'playfulness',        // P11
  'attachmentSecurity', // P12
];

export const personas = [
  // ─────────────────────────────────────────────────────
  // 1. ELENA — "The Sovereign Connector"
  // ─────────────────────────────────────────────────────
  {
    name: 'Elena',
    title: 'The Sovereign Connector',
    age: 38,
    profile: `Polyamorous, secure attachment, deep emotional friendships are her primary intimacy.
Romantic love is present but not dominant — she doesn't organize her life around a partner.
Physical affection flows freely and independently of emotional depth. Extremely well-mapped;
she's done years of intentional relational work. Comfortable with ambiguity, direct about
conflict, and finds solitude deeply nourishing. Her friendships carry the emotional weight
that most people reserve for romantic partners.`,

    answers: {
      q1: 0.95,  // Profoundly deep friendships
      q2: 0.85,  // Very comfortable with physical affection
      q3: 0.80,  // Physical and emotional fairly independent
      q4: 0.90,  // Welcomes affectionate friends (value=1.0)
      q5: 0.75,  // Physical connection has its own value
      q6: 0.90,  // Exclusivity not important
      q7: 1.00,  // Meaningful connections with others enrich
      q8: 0.75,  // Labels feel constraining
      q9: 0.65,  // Cautious but open to exploration
      q10: 0.90, // Well-mapped
      q11: 0.85, // Openly vulnerable with many
      q12: 1.00, // Freedom — intimacy flourishes unconstrained
      q13: 0.90, // Deeply nourishing solitude
      q14: 0.75, // Address directly
      q15: 0.60, // Moderate playfulness
      q16: 0.70, // Give space, check in (secure)
      q17: 0.40, // Let it unfold naturally
    },

    expected: {
      high: [0, 7, 8, 9, 12],    // deepFriendships, openness, mapped, selfIntimacy, attachmentSecurity
      low: [1, 4, 5],             // romanticLove (not central), emptyPhysBarrier, ungroundedBarrier
      moderate: [2, 3, 6, 10, 11],
    },

    terrainExpected: `Deep friendships should be the deepest valley. Romantic love present but moderate.
Very low ridges across the board — few barriers. Wide mapped territory. Prominent secure base.
Friendship-Romance saddle pass should be active (both valleys present + high openness).
Self-intimacy valley should be deep. Overall: an accessible, well-connected landscape.`,

    tensions: [
      'High openness + secure attachment is "easy mode" — does the terrain still have interesting topology?',
      'Romantic love should be wide (from P7) but not deep — can the system distinguish breadth from depth?',
      'Physical independence (high q3) should lower P4 but she still has emotional depth — not empty physicality.',
    ],

    sampleContext: {
      q1: 'My closest friendships are where I do my deepest emotional work. My best friend and I process everything together — grief, joy, fear. These bonds are the bedrock.',
      q4: 'I love this. Several of my close friends and I are physically affectionate — cuddling on the couch, holding hands walking. It\'s not romantic, it\'s just how we are.',
      q6: 'I\'ve been polyamorous for 12 years. Exclusivity feels like scarcity thinking to me. Love isn\'t a finite resource.',
      q12: 'Freedom, absolutely. The most beautiful connections I\'ve had were ones where neither person was trying to contain the other.',
      q13: 'I need significant alone time to stay grounded. My solo morning ritual is sacred — meditation, journaling, coffee in silence.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 2. MARCUS — "The Hungry Romantic"
  // ─────────────────────────────────────────────────────
  {
    name: 'Marcus',
    title: 'The Hungry Romantic',
    age: 29,
    profile: `Intensely romantic, anxiously attached. Connects through physical intensity first —
the body leads, the heart follows. Friendships stay surface-level; he doesn't really share
vulnerabilities with friends. Needs labels badly — "what are we?" comes up fast. Hasn't
explored much of his relational landscape beyond the romantic-physical axis. Playful and
charming on the surface, but the play masks anxiety about whether he's enough.`,

    answers: {
      q1: 0.20,  // Surface warmth in friendships
      q2: 0.70,  // Comfortable with physical affection
      q3: 0.30,  // Physical and emotional quite connected for him
      q4: 0.35,  // Depends on context (value=0.35)
      q5: 0.75,  // Physical connection has its own value
      q6: 0.15,  // Exclusivity essential
      q7: 0.00,  // Partner's bond with others = threatened
      q8: 0.00,  // Ambiguity stresses him
      q9: 0.00,  // Knows what he wants, would decline
      q10: 0.25, // Barely scratched surface
      q11: 0.15, // Vulnerable only with one person
      q12: 0.00, // Safety — needs protection and boundaries
      q13: 0.25, // Uneasy alone — needs connection
      q14: 0.35, // Smooth it over (value=0.35)
      q15: 0.65, // Moderate-high playfulness
      q16: 0.00, // Panics and pursues (value=0)
      q17: 0.80, // Dives in (value=0.8)
    },

    expected: {
      high: [1, 3],                // romanticLove, casualTouch
      low: [0, 6, 7, 8, 12],      // deepFriendships, uncertaintyTolerance, openness, mapped, attachmentSecurity
      moderate: [2, 4, 5, 10, 11],
    },

    terrainExpected: `Romantic love should be the dominant deep valley. Casual touch valley present.
Deep friendships valley very shallow. Large unmapped frontier (low P8). Prominent attachment
ridge between him and the deep valleys. Uncertainty ridge should be tall (low P6 → ridge).
Few saddle passes — isolated valleys. A landscape of intense peaks surrounded by barriers.`,

    tensions: [
      'High physical comfort + low emotional depth — does the empty phys barrier capture this correctly?',
      'Low P12 should create a prominent attachment ridge between him and what he most wants (romantic love).',
      'Playfulness is a defense mechanism here, not genuine lightness — system can\'t distinguish this.',
    ],

    sampleContext: {
      q1: 'I have friends but we mostly hang out, play games, go to bars. I don\'t really talk about feelings with them.',
      q5: 'Honestly the physical part is exciting on its own. The emotional stuff comes later if it comes at all.',
      q8: 'Not knowing where I stand with someone drives me crazy. I need to know if we\'re together or not.',
      q12: 'Safety. I\'ve been hurt before. I need to know someone isn\'t going to just leave.',
      q16: 'This happened to me recently and I spiraled. I texted them like 20 times. I know it\'s not healthy but I couldn\'t stop.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 3. RIN — "The Inner Fortress"
  // ─────────────────────────────────────────────────────
  {
    name: 'Rin',
    title: 'The Inner Fortress',
    age: 33,
    profile: `Non-binary, avoidant attachment, profoundly rich inner life. Very selective about
who enters their world. Connects through humor and playfulness as a testing mechanism — if
you can't be funny together, you can't be close. Comfortable with ambiguity because they
don't invest enough to need labels. Not cold — deeply warm once you're in — but the door
is narrow. Physical touch is reserved for the very few. Has thought about relationships a lot
(high mapped) but from a theoretical, self-protective distance.`,

    answers: {
      q1: 0.30,  // Some depth, but selective
      q2: 0.15,  // Reserved physically
      q3: 0.40,  // Somewhat connected
      q4: 0.00,  // Would set a boundary (value=0)
      q5: 0.00,  // Needs emotional grounding first
      q6: 0.65,  // Moderate — not dogmatic about exclusivity
      q7: 0.70,  // Curious about partner's other bonds
      q8: 1.00,  // Most connections resist labels
      q9: 0.65,  // Cautious but open
      q10: 0.80, // Well-mapped (from observation/analysis)
      q11: 0.20, // Vulnerable with very few
      q12: 0.75, // Discovery — relationships reveal something new
      q13: 0.95, // Deeply nourishing solitude
      q14: 1.00, // Let it breathe (value=1.0)
      q15: 0.90, // Playfulness absolutely essential
      q16: 0.30, // Hurt, pulls away (value=0.3) — avoidant
      q17: 0.00, // Slow and careful
    },

    expected: {
      high: [6, 8, 9, 11],        // uncertaintyTolerance, mapped, selfIntimacy, playfulness
      low: [0, 2, 3, 12],         // deepFriendships, tenderMiddle, casualTouch, attachmentSecurity
      moderate: [1, 4, 5, 7, 10],
    },

    terrainExpected: `Self-intimacy should be the deepest valley. Playful connection valley prominent.
Deep friendships and casual touch valleys very shallow. Tender middle should be a ridge (low P2).
High mapped territory but with few deep valleys in it — a well-known but sparse landscape.
Attachment ridge should be visible. The terrain should feel "observed from a distance."`,

    tensions: [
      'High uncertainty tolerance comes from AVOIDANCE not security — system treats P6 the same either way.',
      'High P8 (mapped) + low P0/P2/P3 = knows the landscape but hasn\'t inhabited most of it.',
      'Playfulness is a gateway mechanism, not pure joy — can this be read from the terrain?',
    ],

    sampleContext: {
      q1: 'I have one person I\'d call truly close. Even with them I hold back. I process most things alone.',
      q2: 'I\'m not a hugger. Physical affection feels like it carries obligations I don\'t want.',
      q8: 'Labels are cages. I genuinely don\'t care what something is called. If it works, it works.',
      q15: 'Humor is how I decide if someone is safe. If you can\'t be absurd with me, I can\'t be real with you.',
      q16: 'Honestly? I\'d probably feel relieved. Space is what I default to. But I\'d notice the absence eventually.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 4. DEVI — "The Careful Romantic"
  // ─────────────────────────────────────────────────────
  {
    name: 'Devi',
    title: 'The Careful Romantic',
    age: 42,
    profile: `Deeply romantic and emotionally available. Her friendships are profound — she's the
person friends call at 2am. But physical intimacy outside committed partnership is
unthinkable. Conflict makes her physically uncomfortable; she'll walk around an issue for
weeks rather than name it. Monogamous by deep orientation, not social pressure. Has done
a lot of self-reflection (high mapped). Solitude is important to her. She knows her patterns
well — including the conflict avoidance — and has made peace with some of them.`,

    answers: {
      q1: 0.90,  // Profoundly deep friendships
      q2: 0.10,  // Very reserved physically
      q3: 0.05,  // Physical and emotional inseparable
      q4: 0.35,  // Depends on the person (value=0.35)
      q5: 0.00,  // Needs emotional grounding first
      q6: 0.10,  // Exclusivity essential
      q7: 0.35,  // Uncomfortable but would talk
      q8: 0.35,  // Could sit with ambiguity briefly
      q9: 0.40,  // Anxious but intrigued
      q10: 0.85, // Well-mapped
      q11: 0.55, // Moderate — deep with several but not many
      q12: 0.45, // Connection — depth of understanding
      q13: 0.80, // Solitude nourishing
      q14: 0.00, // Pulls back — needs space (value=0)
      q15: 0.35, // Nice but not essential
      q16: 0.70, // Gives space, checks in (secure-ish)
      q17: 0.00, // Slow and careful
    },

    expected: {
      high: [0, 1, 4, 8, 9],      // deepFriendships, romanticLove, emptyPhysBarrier, mapped, selfIntimacy
      low: [3, 7, 10],             // casualTouch, openness, conflictApproach
      moderate: [2, 5, 6, 11, 12],
    },

    terrainExpected: `Deep friendships and romantic love as the two dominant valleys. Tall empty
physicality barrier. Very low casual touch. Conflict ridge should be prominent (low P10).
Well-mapped territory. Self-intimacy valley deep. The landscape should feel like deep
valleys separated by tall ridges — rich but compartmentalized.`,

    tensions: [
      'High emotional depth + conflict avoidance = deep valleys with high ridges between them.',
      'She knows her patterns (high P8) but hasn\'t resolved them — mapped ≠ integrated.',
      'P12 should be moderate — she\'s not anxious, but avoidance of conflict limits security.',
    ],

    sampleContext: {
      q1: 'My friendships are everything. My best friend of 20 years knows me better than anyone. We\'ve held each other through divorces, deaths, everything.',
      q2: 'I\'m not physically affectionate with friends. A long hug at the airport, sure. But casual touching? Not my way.',
      q5: 'This makes me deeply uncomfortable. Physical intensity without emotional connection feels violating to me.',
      q14: 'I know I avoid conflict. I\'ll rearrange my entire life to avoid a hard conversation. I\'m working on it in therapy.',
      q10: 'I know myself really well — maybe too well. I can narrate my own patterns in real time but still can\'t change some of them.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 5. JAMES — "The Freefall Explorer"
  // ─────────────────────────────────────────────────────
  {
    name: 'James',
    title: 'The Freefall Explorer',
    age: 26,
    profile: `Queer, dives into new connections headfirst. High comfort with ambiguity and
intensity — he doesn't need to know where something is going to enjoy where it is. Playful,
physical, open to everything. Low mappedness — still discovering what his landscape even
looks like. Moderate attachment security — not particularly anxious, but hasn't been tested
by real loss yet. Friendships have some depth but he's young and hasn't invested decades
in them. Physical affection is casual and frequent.`,

    answers: {
      q1: 0.50,  // Moderate friendship depth
      q2: 0.90,  // Very natural physical affection
      q3: 0.85,  // Physical fairly independent of emotional
      q4: 0.70,  // Natural with close people (value=0.7)
      q5: 0.75,  // Physical connection has its own value
      q6: 0.85,  // Exclusivity not important
      q7: 1.00,  // Connections with others enrich
      q8: 0.75,  // Labels feel constraining
      q9: 1.00,  // Excited — how I learn about myself
      q10: 0.15, // Barely scratched the surface
      q11: 0.70, // Fairly open with many
      q12: 1.00, // Freedom — unconstrained
      q13: 0.35, // Moderate — prefers company
      q14: 0.75, // Address directly
      q15: 0.85, // Playfulness essential
      q16: 0.55, // Middle — gives space (value≈0.5)
      q17: 0.80, // Dives in
    },

    expected: {
      high: [3, 6, 7, 11],        // casualTouch, uncertaintyTolerance, openness, playfulness
      low: [4, 5, 8],             // emptyPhysBarrier, ungroundedBarrier, mapped
      moderate: [0, 1, 2, 9, 10, 12],
    },

    terrainExpected: `Casual touch and playful connection as prominent valleys. Very low ridges
everywhere — accessible, open terrain. Small mapped territory (large frontier). Romantic love
valley moderate but wide (high openness). Most saddle passes should be active — this is a
highly connected landscape. Overall: broad, shallow, interconnected terrain with vast unmapped edges.`,

    tensions: [
      'Low P8 but high P6 = comfortable not knowing, but hasn\'t explored — frontier should dominate visually.',
      'Moderate attachment security is untested — the system can\'t distinguish "secure" from "untested".',
      'Lots of breadth, little depth — does the terrain feel appropriately shallow-but-wide?',
    ],

    sampleContext: {
      q6: 'I\'ve never really understood monogamy as a default. Why would you limit connection? Every person brings something different.',
      q8: 'This IS my life. Most of my meaningful connections are undefined. I love that.',
      q9: 'YES. This is my favorite thing. Someone says "have you ever thought about..." and I\'m immediately in.',
      q10: 'I\'m 26 — I have so much to discover. I barely know what I don\'t know yet.',
      q17: 'Dive in. Always dive in. You learn more in a week of intensity than a year of caution.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 6. SOFIA — "The Integrated Guide"
  // ─────────────────────────────────────────────────────
  {
    name: 'Sofia',
    title: 'The Integrated Guide',
    age: 45,
    profile: `Therapist who has done deep personal work. Secure attachment, comfortable in the
tender middle, direct about conflict, moderate openness (she's been in both monogamous and
open relationships and understands both). The "well-integrated reference landscape." Moderate
playfulness — warm but serious about her work. Deep friendships, solid romantic bond,
comfortable with touch. She represents what a well-explored, well-integrated person looks like.`,

    answers: {
      q1: 0.80,  // Deep friendships
      q2: 0.65,  // Fairly comfortable with touch
      q3: 0.50,  // Balanced — physical and emotional connected but not inseparable
      q4: 1.00,  // Welcomes closeness (value=1.0)
      q5: 0.35,  // Fun but incomplete (value=0.35)
      q6: 0.55,  // Moderate on exclusivity
      q7: 0.70,  // Curious about partner's bonds
      q8: 0.75,  // Labels feel constraining
      q9: 0.65,  // Cautious but open
      q10: 0.90, // Well-mapped
      q11: 0.65, // Moderate vulnerability distribution
      q12: 0.75, // Discovery
      q13: 0.70, // Solitude nourishing
      q14: 0.75, // Address directly
      q15: 0.55, // Moderate playfulness
      q16: 0.70, // Give space, check in (secure)
      q17: 0.40, // Let it unfold
    },

    expected: {
      high: [0, 2, 8, 10, 12],    // deepFriendships, tenderMiddle, mapped, conflictApproach, attachmentSecurity
      low: [],                      // nothing should be truly low
      moderate: [1, 3, 4, 5, 6, 7, 9, 11],
    },

    terrainExpected: `Multiple moderate-to-deep valleys, low ridges. Deep friendships and romantic love
both present. Tender middle is a valley (not ridge). Conflict ridge should be a pass. Secure base
prominent. Large mapped territory. The test: does this landscape look INTERESTING despite balance?
If it's flat and featureless, the system fails to reward integration.`,

    tensions: [
      'A well-integrated person should NOT produce boring terrain — the secure base and rich connectivity should create interest.',
      'Moderate everything is harder to visualize than extremes — the terrain needs topology from the saddle connections.',
      'She\'s the "reference landscape" — if her terrain doesn\'t feel rich, no one\'s will.',
    ],

    sampleContext: {
      q1: 'As a therapist I\'ve learned that deep friendship is itself a practice. My closest relationships are ones where we\'ve done repair work together.',
      q4: 'This is the tender middle the article describes. I live here. Some of my most meaningful connections are this — warm, embodied, deep, unnamed.',
      q10: 'I\'ve spent 20 years in this work — my own therapy, training, relationships. I know my landscape well, though I\'m still surprised sometimes.',
      q14: 'I move toward conflict. Not aggressively — but I know that unspoken things fester. Naming the tension is an act of love.',
      q16: 'I\'d feel it, and I\'d give them space. I trust that if the connection is real, they\'ll come back. And if they don\'t, that\'s information too.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 7. KAI — "The Physical Poet"
  // ─────────────────────────────────────────────────────
  {
    name: 'Kai',
    title: 'The Physical Poet',
    age: 31,
    profile: `Connects primarily through touch, movement, and shared physical experience. A dancer
and massage therapist — the body IS his language of intimacy. Deep emotional conversation makes
him restless; it's not avoidance, it's just not his channel. Physical connection IS emotional
connection for him — they're not separate. High comfort with ambiguity, moderate openness.
Reasonably secure attachment but hasn't been tested emotionally. Playful, light, grounded
in the body.`,

    answers: {
      q1: 0.25,  // Friendships fairly light
      q2: 0.95,  // Extremely natural with touch
      q3: 0.90,  // Physical and emotional fully independent (for him, physical IS emotional)
      q4: 0.70,  // Natural (value=0.7)
      q5: 0.75,  // Physical connection has its own value
      q6: 0.60,  // Moderate on exclusivity
      q7: 0.35,  // Uncomfortable but would talk
      q8: 0.75,  // Labels feel constraining
      q9: 0.65,  // Cautious but open
      q10: 0.50, // Moderate self-knowledge
      q11: 0.30, // Not widely vulnerable
      q12: 0.75, // Discovery
      q13: 0.45, // Moderate — body-based solitude (yoga, dance)
      q14: 0.75, // Address directly (through body language often)
      q15: 0.95, // Playfulness absolutely essential
      q16: 0.55, // Middle ground on attachment
      q17: 0.80, // Dives in
    },

    expected: {
      high: [3, 11, 6],           // casualTouch, playfulness, uncertaintyTolerance
      low: [0, 4],                 // deepFriendships, emptyPhysBarrier
      moderate: [1, 2, 5, 7, 8, 9, 10, 12],
    },

    terrainExpected: `Casual touch should be the deepest valley. Playful connection valley prominent.
Empty physicality barrier nearly absent (very low P4). Deep friendships valley shallow.
Physical/shallow quadrant of the terrain should be where the action is. Tender middle
moderate. The landscape should feel "grounded in the lower-right" — the physical quadrant.`,

    tensions: [
      'For Kai, physical IS emotional — but the system maps them as separate axes. Does the terrain still represent him fairly?',
      'Low deep friendships + low empty phys barrier could look like "shallow person" — but he\'s deeply intimate through touch.',
      'His moderate P12 comes from untested security, same as James — different people, same score.',
    ],

    sampleContext: {
      q1: 'I\'m not great at talking about feelings. But put me in a room with someone and our bodies figure it out. A shared dance says more than a conversation.',
      q2: 'Touch is my first language. I hug everyone. My friends joke that I\'m a professional cuddler (I mean, I am a massage therapist).',
      q3: 'Physical connection and emotional connection are the same thing for me. When I touch someone, I\'m being emotionally intimate. They just don\'t have different words for what I do.',
      q15: 'If we can\'t be playful, I don\'t trust the connection. Play is how bodies learn each other.',
      q5: 'The physical IS the emotional for me. This question doesn\'t quite fit — it assumes they\'re separate.',
    },
  },

  // ─────────────────────────────────────────────────────
  // 8. AMARA — "The Devoted Guardian"
  // ─────────────────────────────────────────────────────
  {
    name: 'Amara',
    title: 'The Devoted Guardian',
    age: 50,
    profile: `Deeply loving mother and partner. Monogamous by deep conviction — fidelity is a
sacred practice, not a restriction. Needs clear structure and labels in all relationships.
Deeply mapped — knows exactly who she is after decades of living deliberately. Strong need
for emotional grounding before physical intimacy. Physical affection within committed bonds
is tender and constant; outside them, minimal. Conflict-avoidant in practice but not
extremely so — she'll name things when pushed. Rich inner life. Her boundaries are
expressions of love, not fear.`,

    answers: {
      q1: 0.85,  // Deep friendships
      q2: 0.20,  // Reserved outside committed bonds
      q3: 0.10,  // Physical and emotional inseparable
      q4: 0.35,  // Depends on the person (value=0.35)
      q5: 0.00,  // Needs emotional grounding first
      q6: 0.05,  // Exclusivity absolutely essential
      q7: 0.00,  // Would feel threatened
      q8: 0.00,  // Ambiguity would stress her
      q9: 0.00,  // Knows what she wants
      q10: 0.90, // Well-mapped
      q11: 0.40, // Moderate — deep with a few
      q12: 0.00, // Safety — protection and boundaries
      q13: 0.75, // Solitude nourishing (prayer, reflection)
      q14: 0.35, // Smooth it over (value=0.35)
      q15: 0.40, // Moderate playfulness
      q16: 0.70, // Give space, check in (secure within her frame)
      q17: 0.00, // Slow and careful
    },

    expected: {
      high: [0, 1, 4, 5, 8, 9],   // deepFriendships, romanticLove, emptyPhysBarrier, ungroundedBarrier, mapped, selfIntimacy
      low: [6, 7],                  // uncertaintyTolerance, openness
      moderate: [2, 3, 10, 11, 12],
    },

    terrainExpected: `Deep friendships and romantic love as the two dominant valleys, but separated
by tall ridges (attachment ridge from moderate P12, uncertainty ridge from low P6). Very tall
empty physicality barrier and ungrounded intensity barrier. Well-mapped territory. The landscape
should feel like deep canyons with high walls — love is intense but contained within firm structure.
Few saddle passes — the ridges enforce separation between connection types.`,

    tensions: [
      'Her boundaries come from love, not fear — but the system encodes them as high barriers either way.',
      'Low P6/P7 could look like "closed-off" — but she\'s deeply open WITHIN her boundaries.',
      'Friendship-Romance saddle should NOT be active (low P7 kills the min(P0,P1)*P7 formula).',
    ],

    sampleContext: {
      q1: 'My daughters and my sister are my deepest relationships outside my marriage. We talk every day. I would do anything for them.',
      q6: 'Exclusivity is sacred to me. It\'s not about jealousy — it\'s about the devotion of choosing one person fully.',
      q3: 'Physical intimacy without emotional intimacy is unthinkable to me. The body follows the heart.',
      q8: 'I need to know what something is. A friendship is a friendship. A marriage is a marriage. Blurring those lines feels disrespectful to both.',
      q13: 'I pray every morning. That time alone with God is where I find my center. Solitude is not loneliness — it\'s communion.',
    },
  },
];

/**
 * 10 key pairs for analysis, with documented expectations.
 */
export const keyPairs = [
  {
    a: 'Elena', b: 'Marcus',
    why: 'Secure-poly meets anxious-mono',
    expectDivergent: [7, 12, 6, 0],  // openness, attachmentSecurity, uncertaintyTolerance, deepFriendships
    expectAligned: [],
    lookFor: 'Massive P7/P12 divergence. Combined terrain should show friction — Elena\'s low ridges averaged with Marcus\'s tall ones.',
  },
  {
    a: 'Elena', b: 'Sofia',
    why: 'Two secure, well-mapped people',
    expectDivergent: [],
    expectAligned: [0, 8, 12],        // deepFriendships, mapped, attachmentSecurity
    lookFor: 'Most harmonious pair. Should still generate some interesting recommendations from moderate differences.',
  },
  {
    a: 'Marcus', b: 'Devi',
    why: 'Both romantic-dominant, opposite physical comfort',
    expectDivergent: [3, 4, 0],       // casualTouch, emptyPhysBarrier, deepFriendships
    expectAligned: [1],                // romanticLove
    lookFor: 'P1 aligned but P3/P4 divergent. System should surface the physical-emotional mismatch.',
  },
  {
    a: 'Rin', b: 'James',
    why: 'Both high uncertainty tolerance, very different reasons',
    expectDivergent: [0, 3, 9, 12],   // deepFriendships, casualTouch, selfIntimacy, attachmentSecurity
    expectAligned: [6],                // uncertaintyTolerance
    lookFor: 'P6 aligned but for different reasons (avoidance vs adventure). System can\'t distinguish this — flag it.',
  },
  {
    a: 'Rin', b: 'Devi',
    why: 'Avoidant meets conflict-avoidant',
    expectDivergent: [3, 11, 6],      // casualTouch, playfulness, uncertaintyTolerance
    expectAligned: [9, 8],            // selfIntimacy, mapped
    lookFor: 'Two withdrawal styles. Both have rich inner lives but express it differently.',
  },
  {
    a: 'James', b: 'Amara',
    why: 'Freedom meets structure',
    expectDivergent: [5, 6, 7, 4],    // ungroundedBarrier, uncertaintyTolerance, openness, emptyPhysBarrier
    expectAligned: [],
    lookFor: 'Maximum divergence. Should generate the most recommendations of any pair.',
  },
  {
    a: 'Sofia', b: 'Kai',
    why: 'Integrated meets physically-wired',
    expectDivergent: [0, 2],          // deepFriendships, tenderMiddle
    expectAligned: [10, 11],          // conflictApproach, playfulness-ish
    lookFor: 'Combined terrain should honor Kai\'s physical orientation. Sofia\'s depth shouldn\'t drown Kai\'s valleys.',
  },
  {
    a: 'Kai', b: 'Marcus',
    why: 'Both physical, different attachment',
    expectDivergent: [0, 12, 6],      // deepFriendships, attachmentSecurity, uncertaintyTolerance
    expectAligned: [3],                // casualTouch
    lookFor: 'Similar P3 but very different P12. System should distinguish physical-and-secure from physical-and-anxious.',
  },
  {
    a: 'Elena', b: 'Amara',
    why: 'Open meets devoted-monogamous',
    expectDivergent: [7, 6, 5],       // openness, uncertaintyTolerance, ungroundedBarrier
    expectAligned: [0, 8, 9],         // deepFriendships, mapped, selfIntimacy
    lookFor: 'P7 maximally divergent, but both share deep friendships and self-intimacy. Shared valleys should be visible through the openness rift.',
  },
  {
    a: 'Devi', b: 'Sofia',
    why: 'Conflict-avoidant meets conflict-direct',
    expectDivergent: [10],            // conflictApproach
    expectAligned: [0, 1, 8, 9],     // deepFriendships, romanticLove, mapped, selfIntimacy
    lookFor: 'Highly aligned except for one critical dimension (P10). A nuanced difference — does the system surface it?',
  },
];
