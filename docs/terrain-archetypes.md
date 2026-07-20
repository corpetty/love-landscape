# Terrain Archetypes — first-pass taxonomy

*Status: draft for review (July 2026). Code: `src/data/archetypes.js`, tests: `tests/archetypes.test.js`. Not yet wired into UI or share cards.*

## Why archetypes

The viral unit for assessment products is the **result vocabulary**, not the app name
("I'm an INFJ", "my love language is acts of service"). Love Landscape's share card
currently shows parameter bars — beautiful, but nothing speakable. Archetypes give every
share a "which one am I?" hook, which is the loop Phase-0 metric D measures. Per the
July 2026 branding decision, this layer carries the viral load while the Love Landscape
name stays put.

## Design choices

- **Named as terrain forms, not person-types.** "I'm an Archipelago" is on-brand,
  visual, and permits ironic distance (lower social cost to post than earnest
  self-description). Each has a human epithet as subtitle for the warm reading.
- **Assignment = nearest prototype** in 13-param space, weighted 3× on each archetype's
  signature params. Total coverage by construction; no landscape is unclassifiable.
  `computeArchetype` also returns the runner-up and margin, so results copy can say
  "an Archipelago with Estuary edges" when the margin is small.
- **The 8 analysis personas are the anchors.** Each maps to its intended archetype
  (locked by tests), plus two archetypes for regions the personas don't cover.
- The all-neutral landscape (nothing answered) resolves to **The Frontier** — an
  unanswered map is unmapped terrain. This is intentional.

## The ten archetypes

| Terrain | Epithet | Essence | Signature (weighted 3×) | Anchor persona |
|---|---|---|---|---|
| The Archipelago | the sovereign connector | Deep bonds, many shores. | deep friendships, openness, self-intimacy, security | Elena |
| The Canyon | the devoted guardian | Depth by devotion. | romantic love, structure need, low ambiguity comfort, exclusivity | Amara |
| The Volcano | the all-in romantic | Heat that makes new land. | romantic love, low mapped, low security | Marcus |
| The Mesa | the inner fortress | High ground, chosen guests. | low touch, self-intimacy, playfulness, low security | Rin |
| The Frontier | the freefall explorer | The fog is the destination. | ambiguity comfort, openness, low mapped, low self-intimacy | James |
| The Watershed | the integrated guide | Everything connects. | tender middle, mapped, conflict approach, security | Sofia |
| The Hot Springs | the physical poet | Warmth is a language. | casual touch, low grounding need, playfulness | Kai |
| The Estuary | the tender-middle native | Richest where waters mix. | tender middle, ambiguity comfort | — |
| The Highlands | the self-companioned | Clear air, long views. | mapped, self-intimacy, security | — |
| The Terraces | the careful romantic | Grown level by level. | deep friendships, romantic love, grounding need, low conflict approach | Devi |

Full descriptions (2–3 sentences each, results-screen voice) live in `src/data/archetypes.js`.

## Validation

- 8/8 seed personas → intended archetype (test-locked).
- All 10 archetypes reachable from random answer-space (test-locked).
- Distribution over 3,000 random answer sets: max share ~21% (Volcano), min ~0.4%
  (Canyon — needs genuinely correlated exclusivity+devotion answers, as it should).
  Real distributions will differ; revisit prototypes once live data exists.

## Integration plan (not yet built)

1. **Results screen**: archetype name + epithet + description above the reading;
   "with X edges" when margin < ~0.05.
2. **OG share card** (`api/og.js`): archetype name as the headline, essence as
   subtitle, keep top-parameter bars below. This is the meme unit.
3. **Share page copy** (`api/share.js` + middleware descriptions): "Someone's terrain
   is The Archipelago — what's yours?"
4. **Pair readings**: archetype pairings ("Canyon meets Frontier") are natural
   conversation-starter content and a future content-marketing surface.

## Open editorial questions

- Naming: "Hot Springs" is the cheekiest of the set — keep or swap (The Coastline?).
- Should archetype assignment be stable across retakes (sticky until a big param move)?
- Volcano/low-security copy must stay generous — no archetype should read as a diagnosis.
