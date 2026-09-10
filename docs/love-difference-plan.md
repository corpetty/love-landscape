# The Growth Journey (working title) — plan

*Status: proposal, September 2026. Nothing in this document is built yet. It lists the concept, the data model, the phases, the files to touch, and the open questions.*

*Naming: the operator chose the "growth journey" direction (Sept 2026). "The Love Difference" below names the measured gap; "Growth Journey" names the feature and the narrative. See §12.5 for the shortlist.*

## 1. The idea in one paragraph

Today the app answers one question: *what is the shape of my intimacy?* Two people can compare shapes. The Love Difference adds a second question: *where does a specific person stand on my landscape, and where do they want to stand?* Person A places Partner B on A's own terrain. B, looking at A's terrain, marks where they want to be. The app draws the route between those two points across A's terrain. The ridges the route must cross are A's real barriers. The valleys it passes through are the stages of the journey. A narrative reads that route as a relationship-growth story. The same happens in the other direction, on B's terrain. The two routes together are the "love difference."

## 2. Why the terrain model supports this

The terrain is a 100×100 scalar field over two axes: emotional→physical (x) and shallow→deep (y). See `src/terrain/constants.js` and `src/terrain/fieldGenerator.js`. Every feature has a fixed location. Only its depth or height changes with the 13 parameters.

| Feature | Location (x, y) | Driven by |
|---|---|---|
| Deep friendships valley | 0.18, 0.82 | P0 |
| Romantic love valley | 0.62, 0.85 | P1, P7 |
| Tender middle | 0.50, 0.50 | P2 (valley or ridge) |
| Casual touch valley | 0.80, 0.30 | P3 |
| Self-intimacy valley | 0.12, 0.55 | P9 |
| Playful connection valley | 0.55, 0.30 | P11 |
| Secure base | 0.35, 0.90 | P12 |
| Empty physicality ridge | 0.50, 0.15 | P4 |
| Ungrounded intensity ridge | 0.90, 0.60 | P5 |
| Uncertainty ridge | 0.35, 0.70 | P6 |
| Conflict ridge | 0.40, 0.65 | P10 |
| Attachment ridge | 0.50, 0.75 | P12 |
| Three saddle passes | fixed | pairs of params |

This gives three things for free:

1. **A relationship is a point.** "How physical vs. emotional is this bond, and how deep does it go?" maps to (x, y).
2. **A route is a least-cost path** over the height field. Climbing costs effort. Descending is free. Fog (low mappedness) adds uncertainty cost.
3. **Every ridge on the route has a name and a parameter.** The route can say *which* of A's barriers B would cross, and *how high* it stands. That is the narrative's raw material.

The terrain already exists for every landscape. No new scoring model is needed for the core feature.

## 3. The three data layers

| Layer | Who answers | About what | Output |
|---|---|---|---|
| **L1 Placement** (core) | A | Where B stands on A's terrain today | point (x, y) on A's field |
| **L1 Desire** (core) | B | Where B wants to stand on A's terrain | point (x, y) on A's field |
| **L2 Wish** (optional) | A | Where A would like B to stand | third point on A's field |
| **L3 Perception** (later) | A | How A thinks B would answer the 17 questions | 13-param "perceived B" landscape |

L1 is the Love Difference. L2 shows whether A and B want the same thing. L3 is the "opinions of a partner" layer: perceived-B against B's real self-landscape gives a per-dimension perception gap ("how well do you know them"). L3 reuses the assessment screen with reworded prompts. It is the most expensive layer and the least novel, so it comes last.

All layers run in both directions (A on B's terrain, B on A's terrain).

## 4. The path engine

New module: `src/terrain/pathfinder.js`. Pure functions, no React, fully unit-testable.

**Input:** A's 13 params, start point, end point.
**Algorithm:** Dijkstra on the 8-connected 100×100 grid (10k nodes; sub-millisecond).
**Step cost:** `distance + λ · max(0, Δheight) + μ · (1 − mappedness) · distance`.
- Descending is free. Leaving a deep valley of A's is expensive. That is the intended meaning.
- λ decides whether the route climbs a ridge or walks around it. Start at λ ≈ 4 and tune on the 8 analysis personas so a 0.6-high ridge costs about the same as a quarter-map detour. The over-or-around choice *is* the narrative signal, so this constant needs care and a test that locks it.
- μ ≈ 1. Fog is not a wall; it is unknown ground.

**Output (the "path facts"):**
```
{
  polyline: [[x, y], ...],
  straightDistance, pathLength, totalClimb, fogFraction,
  ridgesCrossed: [{ name, paramIndex, height, at: [x, y] }],   // ordered along the route
  valleysVisited: [{ name, paramIndex, depth }],
  passesUsed: [{ name }],
  start: { nearestFeature, quadrant, height, mappedness },
  end:   { nearestFeature, quadrant, height, mappedness },
  storyType: 'short-walk' | 'the-wall' | 'long-road' | 'expedition',
  flags: ['end-in-fog', 'end-on-ridge', 'end-on-owner-valley', ...],
  exclusivity: null | { wished, ownerOpenness, ownerStructureNeed, gap }   // only when the wish was set
}
```

Ridge attribution: at each path cell, compute each Gaussian's contribution. A ridge counts as crossed when its positive contribution at the cell exceeds ~0.15. A valley counts as visited when its contribution is below −0.15. Passes below −0.05.

Story type is a 2×2 on distance × climb:

| | Flat route | Steep route |
|---|---|---|
| **Near** | *Short walk* — the difference is mostly naming. | *The wall* — same kind of bond, but one of A's barriers stands between. The most interesting case. |
| **Far** | *Long road* — a different kind of relationship, no single barrier; it takes steps and time. | *Expedition* — different kind and real barriers. |

Two flags change the story more than the type: *end in fog* (A has not explored where B wants to go; nobody knows that ground) and *end on a ridge* (B wants a place that is not a resting place on A's map).

Companion module: `src/terrain/placement.js` — `describePoint(x, y, params)` returns the nearest feature, the quadrant words ("emotional, deep"), the local height and mappedness. Used for pin labels and narrative.

## 5. Elicitation UX

**Placement picker** — new `src/components/PlacementPicker.jsx`. Extend `ContourView.jsx` with `markers` and `onPick` props rather than writing a second canvas. Two steps:

1. Two guided sliders: "Today, is this bond more emotional or more physical?" (x) and "How deep does it go?" (y). A relationship label ("Sam", "my partner") — private, never rendered publicly.
2. The pin appears on the contour map with the nearest-feature name under it. The person drags to adjust. Axis labels already say Emotional / Physical / Shallow / Deep.

Guided-then-adjust beats drag-only: a bare map asks for a spatial judgment most people cannot make cold.

**Desire picker** — the same component on the *other* person's terrain, with the prompt "Where do you want to be on their landscape?" and an optional one-line note ("what would that look like for you?").

**Exclusivity (optional, decision §12.1).** Under the pin, a collapsed "Add more" row offers one slider: "How exclusive do you want this bond to be?" (open → exclusive). It is skippable and has no default. When set, the narrative compares it with the owner's openness (P7) and structure need (P5) as a fourth "route fact": a wish for exclusivity against a high-openness terrain, or a wish for openness against a canyon-like one, is named as its own ridge. When not set, the narrative says nothing about it.

**Reveal** — sealed envelope. Neither party sees the other's pin until both have placed. This prevents anchoring, and it makes the reveal a moment. Locally the app hides the partner's pin until the viewer has set their own.

## 6. Exchange: codes and the ask link

**Codes (stateless, matches AD-5).** A new code family `V2_` for a *view* of a terrain:

```
V2_ + base64( kind(1) + terrainParams(13) + x(1) + y(1) + exclusivity(1) )
kind: 0 = placement by owner, 1 = desire by partner, 2 = owner's wish
exclusivity: 0–254 = wished exclusivity (0 = open, 254 = exclusive); 255 = not set
```

The exclusivity byte is optional (decision, §12.1). It is always present in the code so the length is fixed. The code embeds the terrain it is about, so it decodes alone. Labels are not in the code. `src/data/encoding.js` gains `encodeView` / `decodeView`; `decodeParams` keeps rejecting `V2_` so nothing existing changes.

**The ask link (server, the "query someone else" flow).** A creates an ask from the results screen. The app returns `/ask/<slug>`. B opens it and sees A's terrain read-only (the share page pattern from `SharedView.jsx`), the desire picker, and the CTA to take the assessment. B submits. When A has also placed B, both can view the difference. Every ask is a share, so this feeds the growth loop the Phase 0 spec measures.

B answers as a **guest** (decision, §12.3). No assessment and no account are required to mark a point. The assessment CTA comes after the submit, with the sharer's code stashed via `setPendingPartner` so B's own results auto-compare, the same round-trip `SharedView.jsx` uses. A guest answer attaches to the ask by slug and a bearer token minted for that answer, so B can edit or withdraw it before reveal. If B later takes the assessment, the answer links to B's result. Measure both paths: `ask_answer` with `{ guest: true|false }`, and `assessment_start` with `from: 'ask'`.

Constraints already in the repo:
- The deploy is capped at 12 serverless functions (see commit "Consolidate to 12 serverless functions"). No new function. Ask ops go into `api/results.js` as new `op` values; the `/ask/<slug>` rewrite goes through `api/share.js` next to `/r/<slug>`, with `middleware.js` and `vercel.json` updated.
- Migration `009_love_difference.sql`, additive:
  - `asks(id, slug, owner_result_id → results, partner_result_id nullable, status, created_at, is_dev)`
  - `placements(id, ask_id → asks, author_role owner|partner, kind current|desired|wish, x, y, exclusivity nullable, note, created_at)`
  - Add `ask_create`, `ask_open`, `ask_answer`, `placement_set`, `path_view` to the `events` name CHECK.
- Ownership proof is the existing model: JWT for claimed results, bearer `owner_token` for anonymous ones (`api/reading.js` `authorize()` shows the pattern).

Codes are the fallback when the server is down or the person prefers not to use a link.

## 7. The narrative

Two tiers, same shape as the existing reading ladder.

**Free, deterministic** — `src/data/pathNarrative.js` builds prose from path facts with templates, the way `recommendations.js` does. Sections:

1. **Where they stand** — A's pin, named ("in your deep-friendship valley, at the edge of the tender middle").
2. **Where they want to be** — B's pin, named. B's note if given.
3. **The distance** — story type in words. Numbers on hover only.
4. **The route** — the ridges in order. Each ridge is *A's* parameter, so the copy reads as A's need, never as B's fault: "Your empty-physicality ridge stands at 82%. On your map, physical closeness only feels real after emotional depth. The route B wants goes through that ridge, or around it through the friendship valley."
5. **What this asks of each of you** — one line per ridge for A, one for B.
6. **The fog** — if the destination is unmapped for A: "You have not been there yourself."
7. **Conversations** — one per ridge crossed, reusing the tone of `RECOMMENDATION_RULES`.

**Paid or credit, LLM** — `api/_pathReadingPrompt.js` and a `path` sku in `api/reading.js`, mirroring the compatibility report. The prompt receives both param sets, both pins, the path facts for both directions, and the archetypes. Rules: ground every claim in the path facts; the desired point is not "right"; a ridge is a boundary, not a defect; both directions get equal weight; the asymmetry (one wants closer than the other places them) is named gently and once.

The **mutual view** shows both routes side by side and one sentence about symmetry: "You each want to move closer" / "One of you wants a bigger move than the other."

## 8. Safety, privacy, honesty

This feature can hurt. Where the comparison says "you differ," this one can say "they want less than you do." The copy and the flow have to carry that.

- Sealed reveal, and each person may withdraw before reveal.
- Placements and notes are private. Never on share pages, OG images, or the archetypes gallery. Never in research `submissions` without a separate consent (PRD §6 firewall).
- Deletion: `api/delete-account.js` and the tombstone migration cover `asks` and `placements`.
- The disclaimer in `LandscapeReading.jsx` extends here: a pin is a self-report of a perception, not a measurement.
- No "compatibility verdict" from a pin. Score-free by default; distance and climb shown as bands.
- Rate-limit ask creation per session, like coupon and OTP.

## 9. Science anchors (to verify before publishing on the methods page)

- Ideal Standards Model (Fletcher, Simpson, Thomas & Giles, 1999): the gap between partner ideals and perceptions predicts satisfaction. Direct fit for L1 desired-vs-current.
- Self-Discrepancy Theory (Higgins, 1987): actual / ideal / ought discrepancies. Frames the three pins.
- Empathic accuracy (Ickes): how well people infer a partner's inner state. Frames L3.
- Gottman's "Love Maps": knowing the partner's inner world. Useful public vocabulary.

Treat all four as leads until checked, per the standard in `docs/science-grounding.md`.

## 10. Phases and effort

Solo founder, ~10–15 h/week. Each phase ships alone and is useful alone.

| Phase | Scope | Files | Est. |
|---|---|---|---|
| **A. Engine + local difference** | pathfinder, placement helpers, `V2_` codes, PlacementPicker, LoveDifferenceCard with free narrative. Code-only exchange. Unit tests lock λ and persona routes. | `src/terrain/pathfinder.js`, `src/terrain/placement.js`, `src/data/encoding.js`, `src/data/pathNarrative.js`, `src/components/PlacementPicker.jsx`, `src/components/LoveDifferenceCard.jsx`, `ContourView.jsx`, `ResultsScreen.jsx`, `tests/pathfinder.test.js`, `tests/placement.test.js`, `tests/encoding.test.js` | 20–28 h |
| **B. The ask link** | migration 009, ask ops in `api/results.js`, `/ask/<slug>` in `api/share.js`, ask page in the SPA, sealed reveal, events. | `supabase/migrations/009_love_difference.sql`, `api/results.js`, `api/share.js`, `middleware.js`, `vercel.json`, `src/components/AskScreen.jsx`, `App.jsx`, `tests/results.test.js`, `tests/share.test.js` | 18–24 h |
| **C. Path Reading (LLM)** | prompt, `path` sku, card, dormant until price env set (same pattern as the compatibility report). | `api/_pathReadingPrompt.js`, `api/reading.js`, `api/checkout.js`, `api/webhook.js`, `src/components/PathReadingCard.jsx`, `tests/reading.test.js` | 10–14 h |
| **D. Mutual view + wish pin** | both directions on one screen, L2 wish pin, symmetry sentence. | `LoveDifferenceCard.jsx`, `pathNarrative.js` | 6–10 h |
| **E. Perception layer** | assessment reworded "about them", perceived-B landscape, per-dimension perception gap, radar overlay. | `AssessmentScreen.jsx` (mode prop), `src/data/questions.js` (about-them phrasings), new `PerceptionGap.jsx`, tests | 14–20 h |
| **F. Movement over time** | re-place later, show the route travelled. Needs accounts. | `placements` history, `MyLandscapes.jsx` | later |

Phase A first. It proves the engine and the narrative with zero infrastructure. Phase B is the product the question asks for. C monetizes it on rails that already exist.

## 11. Decisions made in this plan

- The core unit is a **point on a terrain**, not a second 13-vector. It is cheaper, it is visual, and it uses the terrain as more than a picture.
- Routes are computed on the **owner's** terrain only. A's barriers are A's. The combined field is not used for paths; averaging two terrains hides whose ridge it is.
- **Sealed reveal** is not optional. It is the difference between a reflection tool and a weapon.
- No numeric "love difference score" in v1. Bands and words. The alignment percentage on the comparison card already carries the number-shaped hook.

## 12. Open questions and decisions

1. **Decided — exclusivity is optional, not required.** The axes cover kind and depth, not structure. A pin cannot say "I want to be your only." So the desire picker offers one optional exclusivity slider (§5), stored as a nullable byte in the code and a nullable column in `placements` (§6). Unset means the narrative stays silent on it. L3 still covers the full 13 dimensions later.
2. **Tuning λ.** Over-vs-around must feel right on real terrains. Decide the persona test cases before writing the constant.
3. **Decided — guest answers are allowed.** B can mark a point with no assessment and no account. The assessment CTA follows the submit, and the answer links to B's result if B takes it later (§6). Both paths are measured.
4. **Regret path.** Should a person be able to un-send an ask after B has answered but before A has placed? Recommendation: yes, until reveal.
5. **Naming — decided in direction.** The feature is a *growth journey*. Two words carry two jobs, so keep both:
   - **The gap** (a noun for the measurement): "the love difference" stays as the internal and methods-page term.
   - **The feature and narrative** (what people see and share): pick one from the growth-journey family. Shortlist, in terrain vocabulary:
     - **Growth Journey** — plain, clear, the operator's direction. Safe default.
     - **The Journey Between** — names both people and the route.
     - **Growth Route** — shorter; "route" matches the path engine's output.
     - **The Crossing** — keeps the ridge imagery; works as a verb ("make the crossing").
   - UI labels that follow from the default: section header "Your growth journey", ask link CTA "Ask them to mark where they want to be", reveal screen "The journey between you", paid tier "The Journey Reading".
   - Decide the final word before Phase B, because the ask link copy and the `/ask/` page title carry it.
