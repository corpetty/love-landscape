# Campaign Links — First Batch (copy-paste ready)

**Status:** 2026-07-21. Companion to [social-campaign-plan.md](./social-campaign-plan.md) (see Appendix A for the tagging scheme). Attribution is live — these tags flow into the per-source funnel in the admin dashboard.

## How to use

- **`utm_source`** is the split key in the dashboard. Use the exact strings below — `tiktok` ≠ `TikTok` would create two rows.
- **`utm_campaign=concept_validation`** is on every link so the whole 6-week probe groups together (add a second burst tag later, e.g. `ph_week5`, by appending — but keep `concept_validation` too only if you re-tag; simplest is to leave campaign as-is for the whole run).
- **`utm_content`** is per-post. Bump the number for each new post so you can see which creative pulled (`terrain_morph_01`, `_02`, …).
- Values are sanitized server-side to `[a-zA-Z0-9_.-]`, max 64 chars. No spaces/emojis.
- **TikTok/IG use one bio link** — rotate the `utm_content` to match whichever post is currently pinned/active.
- Links to `/a/<key>` land the viewer on that specific archetype's page (its own OG card + take-the-assessment CTA); links to `/` land on the main intro. Both capture UTM.

Base pattern:
`https://www.love-landscape.com/<path>?utm_source=<src>&utm_medium=<med>&utm_campaign=concept_validation&utm_content=<id>`

---

## Weeks 1–2 seed channels

### TikTok — `utm_source=tiktok` (bio link, rotate content)

| Post | Link |
|---|---|
| Terrain morph #1 | `https://www.love-landscape.com/?utm_source=tiktok&utm_medium=video&utm_campaign=concept_validation&utm_content=terrain_morph_01` |
| Terrain morph #2 | `https://www.love-landscape.com/?utm_source=tiktok&utm_medium=video&utm_campaign=concept_validation&utm_content=terrain_morph_02` |
| Archetype: The Mesa | `https://www.love-landscape.com/a/mesa?utm_source=tiktok&utm_medium=video&utm_campaign=concept_validation&utm_content=arch_mesa_01` |
| Archetype: The Volcano | `https://www.love-landscape.com/a/volcano?utm_source=tiktok&utm_medium=video&utm_campaign=concept_validation&utm_content=arch_volcano_01` |
| Pairing: Volcano × Mesa | `https://www.love-landscape.com/?utm_source=tiktok&utm_medium=video&utm_campaign=concept_validation&utm_content=pair_volcano_mesa_01` |

### Instagram Reels — `utm_source=reels` (bio link, rotate content)

| Post | Link |
|---|---|
| Terrain morph #1 | `https://www.love-landscape.com/?utm_source=reels&utm_medium=video&utm_campaign=concept_validation&utm_content=terrain_morph_01` |
| Archetype: The Mesa | `https://www.love-landscape.com/a/mesa?utm_source=reels&utm_medium=video&utm_campaign=concept_validation&utm_content=arch_mesa_01` |
| Pairing: Volcano × Mesa | `https://www.love-landscape.com/?utm_source=reels&utm_medium=video&utm_campaign=concept_validation&utm_content=pair_volcano_mesa_01` |

### YouTube Shorts — `utm_source=shorts`

| Post | Link |
|---|---|
| Terrain morph #1 | `https://www.love-landscape.com/?utm_source=shorts&utm_medium=video&utm_campaign=concept_validation&utm_content=terrain_morph_01` |
| Archetype: The Volcano | `https://www.love-landscape.com/a/volcano?utm_source=shorts&utm_medium=video&utm_campaign=concept_validation&utm_content=arch_volcano_01` |

### Instagram carousels — `utm_source=instagram`

| Post | Link |
|---|---|
| Archetype gallery carousel | `https://www.love-landscape.com/?screen=archetypes&utm_source=instagram&utm_medium=carousel&utm_campaign=concept_validation&utm_content=arch_gallery_01` |
| Pairing matchup carousel | `https://www.love-landscape.com/?utm_source=instagram&utm_medium=carousel&utm_campaign=concept_validation&utm_content=pair_volcano_mesa_01` |

### X/Twitter — `utm_source=x` (one archetype thread each; native OG cards render)

| Thread | Link |
|---|---|
| The Archipelago | `https://www.love-landscape.com/a/archipelago?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_archipelago_01` |
| The Canyon | `https://www.love-landscape.com/a/canyon?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_canyon_01` |
| The Volcano | `https://www.love-landscape.com/a/volcano?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_volcano_01` |
| The Mesa | `https://www.love-landscape.com/a/mesa?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_mesa_01` |
| The Frontier | `https://www.love-landscape.com/a/frontier?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_frontier_01` |
| The Watershed | `https://www.love-landscape.com/a/watershed?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_watershed_01` |
| The Hot Springs | `https://www.love-landscape.com/a/hotsprings?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_hotsprings_01` |
| The Estuary | `https://www.love-landscape.com/a/estuary?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_estuary_01` |
| The Highlands | `https://www.love-landscape.com/a/highlands?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_highlands_01` |
| The Terraces | `https://www.love-landscape.com/a/terraces?utm_source=x&utm_medium=thread&utm_campaign=concept_validation&utm_content=arch_terraces_01` |

### Reddit — `utm_source=reddit` (lead with substance; `utm_content` = subreddit)

| Post | Link |
|---|---|
| r/InternetIsBeautiful (the 3D viz) | `https://www.love-landscape.com/?utm_source=reddit&utm_medium=post&utm_campaign=concept_validation&utm_content=r_internetisbeautiful` |
| r/SampleSize (survey framing) | `https://www.love-landscape.com/?utm_source=reddit&utm_medium=post&utm_campaign=concept_validation&utm_content=r_samplesize` |
| r/polyamory | `https://www.love-landscape.com/?utm_source=reddit&utm_medium=post&utm_campaign=concept_validation&utm_content=r_polyamory` |

### Friends & family — `utm_source=ff` (exclude from readout / first 48h)

| Post | Link |
|---|---|
| Personal share | `https://www.love-landscape.com/?utm_source=ff&utm_medium=dm&utm_campaign=concept_validation&utm_content=ff_launch` |

---

## Later channels (weeks 2–5)

### Hacker News — `utm_source=hn` (Show HN, week 2–3)

`https://www.love-landscape.com/?utm_source=hn&utm_medium=post&utm_campaign=concept_validation&utm_content=show_hn`

### Product Hunt — `utm_source=producthunt` (week 4–5)

`https://www.love-landscape.com/?utm_source=producthunt&utm_medium=launch&utm_campaign=concept_validation&utm_content=ph_launch`

### Typology communities — `utm_source=typology` (opportunistic)

`https://www.love-landscape.com/?screen=archetypes&utm_source=typology&utm_medium=post&utm_campaign=concept_validation&utm_content=mbti_forum_01`

---

## Note on the organic loop

The share round-trip (someone opens a shared result → takes the assessment) is measured **separately** from UTM, via the existing `from=share` tag and the `share_loop` stat in the dashboard. So even where a platform strips your link params, the viral pull metric still registers. Don't UTM-tag the in-product share links — they carry `from=share` on their own.
