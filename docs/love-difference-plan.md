# The Growth Journey (working title) — plan

*Status: proposal, September 2026. Nothing in this document is built yet. It lists the concept, the data model, the phases, the files to touch, and the open questions.*

*Naming: the operator chose the "growth journey" direction (Sept 2026). "The Love Difference" below names the measured gap; "Growth Journey" names the feature and the narrative. See §12.5 for the shortlist.*

*All five phases shipped (Sept 2026). See §13–§17 for what was built, what changed against this plan, and why.*

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
| **A. Engine + local difference** ✅ **shipped** | pathfinder, placement helpers, `V2_` codes, PlacementPicker, GrowthJourneyCard with free narrative. Code-only exchange. Unit tests lock the climb weight and the persona routes. | `src/terrain/pathfinder.js`, `src/terrain/placement.js`, `src/data/encoding.js`, `src/data/pathNarrative.js`, `src/data/journeys.js`, `src/components/PlacementPicker.jsx`, `src/components/GrowthJourneyCard.jsx`, `ContourView.jsx`, `ResultsScreen.jsx`, `PairCompatibility.jsx`, plus five test files | done |
| **B. The ask link** ✅ **shipped** | migration 009, ask ops in `api/results.js`, `/ask/<slug>` served by `api/share.js`, ask screen in the SPA, sealed reveal enforced server-side, withdrawal on both sides, events and milestones. | `supabase/migrations/009_growth_journey.sql`, `api/results.js`, `api/share.js`, `vercel.json`, `src/data/asksClient.js`, `src/components/AskScreen.jsx`, `GrowthJourneyCard.jsx`, `Footer.jsx`, `App.jsx`, `public/privacy.html`, `tests/asks.test.js`, `tests/share.test.js` | done |
| **C. Journey Reading (LLM)** ✅ **shipped** | prompt grounded in computed route facts, `journey` sku entitled per ask, card dormant until priced, migration 010. | `supabase/migrations/010_journey_reading.sql`, `api/_pathReadingPrompt.js`, `api/reading.js`, `api/checkout.js`, `api/webhook.js`, `src/components/JourneyReadingCard.jsx`, `GrowthJourneyCard.jsx`, `ResultsScreen.jsx`, `.env.example`, `tests/journeyReading.test.js` | done |
| **D. Mutual view + wish pin** ✅ **shipped** | the owner's wish pin, the two-destination verdict, a third pin tone; both directions and the symmetry sentence already shipped with A and B. | `src/data/wishAlignment.js`, `GrowthJourneyCard.jsx`, `ContourView.jsx`, `api/results.js`, `src/data/asksClient.js`, `tests/wishAlignment.test.js` | done |
| **E. Perception layer** ✅ **shipped** | assessment reworded "about them", perceived landscape, per-dimension signed gap, radar overlay, reading. | `src/data/questions.js` (about phrasings + `questionsFor`), `AssessmentScreen.jsx` (mode prop), `src/data/perception.js`, `src/data/perceptions.js`, `src/components/PerceptionGapCard.jsx`, `RadarView.jsx`, `ResultsScreen.jsx`, `App.jsx`, `tests/perception.test.js`, `tests/perceptions.test.js` | done |
| **F. Movement over time** | re-place later, show the route travelled. Needs accounts. | `placements` history, `MyLandscapes.jsx` | later |

Phase A first. It proves the engine and the narrative with zero infrastructure. Phase B is the product the question asks for. C monetizes it on rails that already exist.

## 11. Decisions made in this plan

- The core unit is a **point on a terrain**, not a second 13-vector. It is cheaper, it is visual, and it uses the terrain as more than a picture.
- Routes are computed on the **owner's** terrain only. A's barriers are A's. The combined field is not used for paths; averaging two terrains hides whose ridge it is.
- **Sealed reveal** is not optional. It is the difference between a reflection tool and a weapon.
- No numeric "love difference score" in v1. Bands and words. The alignment percentage on the comparison card already carries the number-shaped hook.

## 12. Open questions and decisions

1. **Decided — exclusivity is optional, not required.** The axes cover kind and depth, not structure. A pin cannot say "I want to be your only." So the desire picker offers one optional exclusivity slider (§5), stored as a nullable byte in the code and a nullable column in `placements` (§6). Unset means the narrative stays silent on it. L3 still covers the full 13 dimensions later.
2. **Decided in Phase A — the climb weight is 1.6, and steepness is the crest.** Two things changed against this plan while building, both because the first design did not survive contact with real terrains:
   - **λ became `CLIMB_WEIGHT = 1.6`**, not the ~4 sketched in §4. At 4, a moderate ridge cost more than walking the entire map, so every route went around everything.
   - **The steepness measure is the crest** (the climb from the start to the route's high point), not total climb. Total climb is dominated by the cost of leaving the start valley and grows with route length, so it made all eight seed personas an "expedition" on every journey. The barrier above *both* endpoints, the other candidate, is zero on most real journeys because the destination is usually itself the high point; it survives as the `wall-between` flag. Both constants are locked by tests that split the personas rather than the journeys.
3. **Decided — guest answers are allowed.** B can mark a point with no assessment and no account. The assessment CTA follows the submit, and the answer links to B's result if B takes it later (§6). Both paths are measured.
4. **Decided in Phase B — both sides can take their part back, with no time window.** The plan framed this as "un-send until reveal", but the owner places their pin when they *create* the ask, so there is no window in which the owner has not placed. A window would also be fake precision: the server cannot know when the owner read the answer. What shipped instead is two one-way exits, each available to the person whose thing it is — the owner closes the ask (the link 410s for good, including after it has been answered), and the answerer deletes their own answer using the token their device minted. Neither requires an account: retracting must never be harder than answering was.
5. **Naming — decided in direction.** The feature is a *growth journey*. Two words carry two jobs, so keep both:
   - **The gap** (a noun for the measurement): "the love difference" stays as the internal and methods-page term.
   - **The feature and narrative** (what people see and share): pick one from the growth-journey family. Shortlist, in terrain vocabulary:
     - **Growth Journey** — plain, clear, the operator's direction. Safe default.
     - **The Journey Between** — names both people and the route.
     - **Growth Route** — shorter; "route" matches the path engine's output.
     - **The Crossing** — keeps the ridge imagery; works as a verb ("make the crossing").
   - UI labels that follow from the default: section header "Your growth journey", ask link CTA "Ask them to mark where they want to be", reveal screen "The journey between you", paid tier "The Journey Reading".
   - Decide the final word before Phase B, because the ask link copy and the `/ask/` page title carry it.


---

## 13. Phase A as built (September 2026)

Shipped and verified: 205 unit tests pass, and the flow was driven end to end in
a real browser across both directions, naming, code rejection, and reload.

### What exists

| Module | What it does |
|---|---|
| `src/terrain/placement.js` | A point on a landscape, described: analytic height and fog (matching the rendered field exactly), the named features that register there, plain-language axis words, and `constrainToMap` so a pin stays inside the drawn circle. |
| `src/terrain/pathfinder.js` | Dijkstra over the 8-connected height field. Charges climb and fog, never descent. Returns the ridges crossed (with the owner's parameter and whether the crossing was below the summit), the ridges the direct line would have hit, the valleys and passes, and a story type. |
| `src/data/encoding.js` | The `V2_` view-code family: kind + terrain + point + optional exclusivity, 17 bytes. The two code families reject each other. |
| `src/data/pathNarrative.js` | The free reading: sections built from path facts, rendered through the existing `ReadingRenderer`. |
| `src/data/journeys.js` | Pins remembered on-device, filed under the pair of landscapes. |
| `src/components/PlacementPicker.jsx` | Two guided sliders, then a draggable pin, with the live place name. |
| `src/components/GrowthJourneyCard.jsx` | One symmetric direction component used twice. |
| `ContourView.jsx` | Gained `markers`, `route`, `onPick`, `showFeatureLabels`. |

### Changes against the plan, and why

1. **The steepness measure and the climb weight** — see §12.2.
2. **A "lower crossing" fact replaced the rare skirt as the main route signal.**
   §4 expected routes to go *around* ridges. In practice they bend and cross
   lower, because going far enough around to drop a ridge below the reporting
   threshold costs more than climbing. So each crossed ridge now carries the
   feature's own summit height, and the reading can say the route found a lower
   way over. `ridgesSkirted` survives for the case that does occur, and is
   reported *alongside* the primary route reading rather than instead of it.
3. **A steep route with no ridge on it is a real case, and needed its own copy.**
   When the climb is the wall of the valley the bond already sits in, the first
   draft said "open ground" directly after calling the journey steep. It now
   names the valley itself as the climb — arguably the most useful reading on
   the map, and the one a naive implementation loses.
4. **The card requires a loaded partner landscape.** §5 implied the owner could
   place a partner alone. But the partner's landscape code is the only identity
   a pin can be filed under, so without it a placement cannot be told apart from
   one made about somebody else, and it is orphaned on reload. Gating on a
   loaded partner also makes both mirrored directions always available.
5. **The reading needed a real voice layer.** Templates that interpolate a
   pronoun produce "for they" and "they wants". There is now a speaker object
   with subject, object, possessive and verb agreement, and a test that sweeps
   every persona, journey, wish and perspective looking for the failures.

### Copy rules now enforced by tests

- Every ridge is attributed to the landscape owner, never to the other person.
- No text calls the wish too much, unrealistic, or unreasonable.
- Wherever a difficulty is named, both people are given something to do.
- No digits anywhere in the prose; distances and heights are bands in words.
- An unset exclusivity wish produces no text at all.

### Ready for Phase B

The ask link replaces code-passing with `/ask/<slug>`. The pieces it needs are
in place: `V2_` codes already carry the terrain a point was marked on, the
sealed-reveal gate is enforced in the card, and `journeys.js` is the local
mirror of what `placements` will hold. Migration 009 and the ask ops in
`api/results.js` are unchanged from §6.


---

## 14. Phase B as built (September 2026)

Shipped and verified: 259 unit tests pass, and the whole loop was driven in a
browser against the *real* API handlers behind a local harness — create,
answer from a second browser context with no account, reveal, the owner
checking back, closing after an answer, and a closed link serving 410.

### The shape of it

An **ask** is one landscape opened to one question. A **placement** is one
answer: a point on that landscape.

| Route / op | Who | What it does |
|---|---|---|
| `ask_create` | owner | Opens the ask with their own pin already placed, and returns the slug. Reuses an open ask, so a link already sent keeps working. |
| `GET /ask/<slug>` | anyone with the link | Serves the SPA with `window.__ASK__` — the landscape, and nothing else. |
| `ask_get` | anyone with the link | The landscape and whether it is answered. **Never the owner's pin.** |
| `ask_answer` | the partner, as a guest | Stores the answer and returns the reveal in the same response. |
| `ask_status` | owner | Has it come back? Returns both pins once it has. |
| `ask_withdraw` | either | Owner closes the ask; answerer deletes their own answer. |

No new serverless function: `/ask/<slug>` is a rewrite onto `api/share.js`
(alongside `/r/` and `/a/`), and the ops live in `api/results.js` beside the
ownership model they reuse.

### Decisions worth keeping

1. **The sealed reveal is a server rule, not a UI rule.** `ask_get` does not
   return the owner's pin, so a visitor reading the network tab learns nothing
   they could anchor their answer to. Enforcing it in the component would have
   made the guarantee cosmetic.
2. **The reveal is the payoff, and therefore the CTA.** Answering returns the
   owner's pin, the route and the reading — and that screen is where the
   assessment is offered. The growth loop runs through the moment the visitor
   is most interested, not through a wall in front of it.
3. **Guests, by design.** No account and no assessment to answer. Nineteen
   questions in front of a thirty-second question would trade the answer for
   the funnel.
4. **An ask link is not a share page.** noindex, the site's generic image
   rather than the sender's terrain, and a title naming no archetype: a preview
   in a group chat must not reveal what the recipient has not opened. It is
   also `no-store`, because a cached page would keep taking answers to a closed
   question.
5. **Two one-way exits** — see §12.4.

### What the browser run caught that the tests did not

- The footer promised *"your answers never leave your device"* on the one
  screen where that is false. It now takes a per-screen note.
- An answered ask lost its close button, so revoking access became impossible
  by succeeding. Closing is offered in both states.
- Map labels near an edge were clipped — the physical axis read `PHYS`. Labels
  now anchor to their inner side near an edge.

### What the test mock caught

The mock deliberately applies **no column defaults** and **no column
projection**. Both departures found real defects: code that filtered on a
`status` it never wrote, and a reveal whose privacy rested on the SELECT string
rather than on the code building the response. The reveal now goes through a
mapper that names the three fields allowed to travel, so a column added later
cannot leak by default.

### Deployment notes

- Apply `supabase/migrations/009_growth_journey.sql` before deploying. It is
  additive: two tables, plus widened CHECK constraints on `events.name` and
  `milestones.kind`.
- `admin_metrics()` needs no change — it aggregates by kind and simply gains
  `ask` and `ask_answered` keys. The frozen Phase-0 gate metrics are untouched.
- Account deletion needs no new code: `asks` cascade from `results`, and
  `placements` cascade from `asks`.

### Ready for Phase C

The paid Journey Reading needs a `path` sku in `api/reading.js` and a prompt
beside `_fullReadingPrompt.js`. Both directions of path facts are already
available client-side, and the server now holds the pins a purchased reading
would be generated from.


---

## 15. Phase C as built (September 2026)

Shipped and verified: 288 unit tests pass, and the whole purchase path was
driven in a browser with a price set, against the real handlers with Stripe and
the model stubbed — offer hidden until the question has an answer, shown after,
purchase, return, entitlement, generation, render, regenerate.

### What it is

A deep reading of ONE growth journey, **entitled per ask**. A second question
about the same landscape is a different crossing and is not covered by an
earlier purchase. Dormant until `STRIPE_PRICE_JOURNEY` and `VITE_JOURNEY_PRICE`
are both set, the same pattern the compatibility report uses.

What makes it worth paying for is not more words about two pins. The engine has
already computed hard facts — which named ridges the route crosses, how high
each stands where the route meets it, whether a lower way over exists, whether
the climb is the valley wall itself, how much ground is unmapped — and the
prompt asks the model to interpret those. **The free reading states the facts;
the paid one thinks about them**, and the card says exactly that rather than
implying the free version is a teaser.

### Decisions worth keeping

1. **A new column, not an overloaded one.** `purchases.ask_id` rather than
   reusing `partner_code`, which on the compatibility report already means
   "the other person's landscape". A journey is not a pairing of two
   landscapes; it is two pins on one.
2. **The route is recomputed server-side from the stored pins.** A buyer who
   could post their own route facts could commission a reading of a journey
   that never happened.
3. **Entitlement is separate from readability.** Collapsing them told a buyer
   whose partner had withdrawn their answer that no purchase existed, which
   reads as if their money had vanished. They stay entitled and are told what
   actually happened.
4. **The owner's own note never reaches the prompt.** It was written before the
   question went out; it is their private reading of the bond, not part of the
   answer they asked for.
5. **Ask path only.** The codes-only path keeps pins on the device, so the
   server could not regenerate what it sold. The card renders nothing there.

### What the browser run caught that no unit test could

- **The card required a loaded partner landscape.** That gate came from Phase A,
  where a partner's code was the only identity a pin could be filed under — but
  an ask *is* an identity, and the person answering one may have no landscape at
  all. The ask link hid the journey from exactly the people who used it, and
  after returning from checkout the card never mounted to unlock what had just
  been bought. It now shows whenever there is something to file a journey
  under: a loaded partner, or a landscape this device owns.
- **The pins did not survive a page load.** The link panel owned the ask fetch,
  but only rendered once a placement existed, so a device with no local pins
  could never learn about the pins the server already held and would ask the
  owner to place the same bond again. The card owns the fetch now: the ask is
  the durable record, localStorage is the cache.
- **The reading quoted the wrong person.** A note is written by whoever says
  where they want the bond to be, and in the owner's own view that is the other
  person. Keying it to the reader dropped the most personal thing the other
  person said, precisely where it mattered most.

### Deployment notes

- Apply `supabase/migrations/010_journey_reading.sql`. Additive: one nullable
  column on `purchases` plus a partial index.
- Create the Stripe price, then set `STRIPE_PRICE_JOURNEY` and
  `VITE_JOURNEY_PRICE`. Until both exist the offer does not render.
- The webhook resolves the ask slug carried in checkout metadata to an id, and
  degrades gracefully if migration 010 has not been applied — a paying
  customer's entitlement is never held up by a migration.

### What is left

Phase D (the mutual view and the owner's wish pin) and Phase E (the perception
layer) are unchanged from §10. Neither is required by anything shipped so far.


---

## 16. Phase E as built (September 2026)

Shipped and verified: 334 unit tests, and the full flow driven in a browser —
invitation, the nineteen reworded questions, the gap, the reading, and retaking.

### What it is

Answer the same nineteen questions as you think **they** would. That produces
your model of them, and holding it against their own answers gives a signed gap
per dimension. It appears on the results screen whenever a partner's landscape
is loaded, because without their answers there is nothing to check a guess
against.

### The framing, which is the feature

This does not measure whether you are right about someone. It measures the
distance between your picture of them and **their own account of themselves**,
and both can be off. A person can describe themselves in a way their behaviour
does not match; a person can also keep a whole dimension hidden from someone
who loves them.

So the reading says "neither is the truth" before it says anything else, and
offers the innocent explanations — they never had reason to show you, they are
still working it out, you mean different things by the question — before any
harder one. Tests assert both.

**Direction is kept throughout.** Over- and under-reading someone are opposite
mistakes with opposite costs: crediting a person with more of something than
they feel asks for what they cannot easily give, while reading it lower leaves
a door closed they would have walked through. Several phrasings per direction,
so three gaps in a row do not read as one sentence pasted three times.

**Deliberately not scored.** A percentage for how well someone knows their
partner is irresistible to share and impossible to hear well, and one or two
items per dimension cannot support that precision. Bands and words; a
difference under fifteen points is called matched rather than a misreading.

### Decisions worth keeping

1. **Rewritten, not translated.** A scenario about "your partner" becomes
   ambiguous the moment the subject changes — whose partner? Each is rebuilt
   around them. Option *wording* moves; option *values* never do, or the gap
   would be partly an artefact of the copy. Test-locked.
2. **Permission to be wrong, up front.** The intro spends most of its words on
   it. Without that the exercise reads as a test of how good a partner you are,
   people answer as they wish they saw the other person, and the gap
   disappears into flattery.
3. **Local-only, with no export.** A perceived landscape is one person's
   private read on somebody else, recorded without their involvement — the most
   sensitive thing this app holds. Never synced, never published, never offered
   to research. The absence of an export is deliberate and test-locked: a guess
   about someone is not yours to hand around.
4. **No LLM pass.** The self-assessment can refine parameters from free-text
   context. This does not: the notes would be about another person, and sending
   them anywhere is exactly what the local-only rule exists to prevent.

### What the browser run caught

- **Answering about someone dropped the comparison.** It lives in the results
  screen's own state, and that screen unmounts while the questions are being
  answered — so nineteen questions about a specific person returned to a screen
  that no longer knew who they meant, and the feature silently did nothing. The
  partner is handed back on both completion and back-out.
- **Two legends, three names for two colours.** The chart drew its own legend
  calling the guess "Yours", underneath a second legend naming the same colours
  differently. "Yours" was also simply wrong: that series is your picture of
  them, not your own landscape. The chart takes the labels now.

### What is left

Nothing. Phase D closed the set — see §17.


---

## 17. Phase D as built (September 2026)

Shipped and verified: 350 unit tests, and the flow driven in a browser against
the real handlers — the wish withheld until their answer arrives, the verdict,
three pins on the map, the partner's view checked for leakage, and survival
across a reload.

### The question it answers

The journey had two pins on one landscape: where a bond stands, and where the
other person says they want it. The wish adds a third — where the owner would
like it — and with it the question the feature had been circling.

**The distance between the two destinations is a better question than either
route.** Two people can both be asking for a long, steep crossing and be asking
for the *same* crossing; two people can both be asking for a small move and be
asking for *opposite* ones. A reading that compares only how far each wants to
travel cannot tell those apart, and that difference is the whole matter. So the
verdict turns on where the two marks land and which way they pull from the
current point; "who is asking for the bigger move" is a tail, not the headline.

### The seven verdicts

| Verdict | What it names |
|---|---|
| Both content | Neither is asking for a move — easy to leave unspoken until one assumes the other is waiting. |
| Same place | Same ground. The rarer, more fortunate problem: only the crossing is left. |
| Same region | Same shape, different degree — and degree negotiates in a way direction does not. |
| You would stay / They would stay | One of you would leave it exactly where it is. **Explicitly not a refusal**: "not yet" and "not this" sound identical from outside and are very different to live with. |
| Opposite ways | Named as *direction*, not pace — the case most often mistaken for a pace problem. |
| Different places | Not opposite, but genuinely different ground. |

### Decisions worth keeping

1. **The wish is offered only after their answer arrives.** Marking where you
   want a bond to be while still waiting to hear where they want it invites you
   to answer twice — once honestly and once as the thing you would settle for —
   and then to read their answer against whichever of yours it suits. Asking
   afterwards costs nothing: their answer is already sealed.
2. **It is never returned to the person who answered.** `ask_status` carries it
   because that is the owner's own view; `ask_answer` does not. A wish is the
   owner's statement about the relationship, theirs to make in their own words
   rather than to have revealed by a page.
3. **Stored with the ask, not only on the device** — the failure this feature
   has now hit twice.
4. **A wish is neither a promise nor a demand,** said in every verdict, along
   with the fact that their answer was given without sight of it. The sealed
   order is what makes both answers worth anything, and the reading is the only
   place the reader is told it held.

### Already shipped earlier

The plan listed "both directions on one screen" and the symmetry sentence under
Phase D. Both arrived with Phases A and B — the card has always rendered two
mirrored directions, and `symmetryLine` has always compared them. Phase D was
therefore only the wish, which turned out to be the substantial half.
