# Step 0 Baseline Report

**Pulled:** 2026-07-14, from production (`www.love-landscape.com` → Supabase project `cqxpatlgwldrglmojijn`), via the anon-callable aggregate RPCs.
**Purpose:** the pre-experiment baseline required by [phase-0-spec.md](./phase-0-spec.md) S0.2 and the PRD §9 freeze protocol. Gate thresholds are calibrated against this plus the two-week instrumentation shakedown.

## Product usage (Supabase)

| Measure | Value | Source |
|---|---|---|
| Opt-in research submissions, all time | **1** | `get_submission_count()` |
| `relationship_structure` breakdown | enm-polyamorous: 1 | `get_demographic_breakdown` |
| `age_range` breakdown | 36–45: 1 | `get_demographic_breakdown` |
| AI-reading consents | 1 | `get_reading_consent_count()` |

**Reading:** the single submission is almost certainly the founder's own test. The effective baseline is **zero** — which matches the PRD §2 assumption ("effectively zero distribution") exactly. There is no meaningful `single-exploring` fraction to even caveat: the F0.8 intent thresholds get no calibration signal from this dataset, and the §9 starting values stand as printed pending shakedown data.

**Mandatory caveat (PRD §2, carried forward):** even at future volume, opt-in research submissions are a self-selected lower bound on usage, and the `single-exploring` fraction is a post-results research-volunteer proxy — directional only, never calibration-grade for intent thresholds.

## Founder-only items (fill in; service-role / external analytics)

Run in the Supabase SQL editor:

```sql
SELECT count(*) AS credit_sessions,
       count(*) FILTER (WHERE readings_used > 0)     AS used_a_reading,
       count(*) FILTER (WHERE credits_purchased > 0) AS ever_purchased
FROM reading_sessions;
```

- Anonymous credit sessions: ______ · used a reading: ______ · ever purchased: ______
- Blog/newsletter audience: subscribers ______ · monthly readers of the Geometry of Intimacy post ______ (from blog analytics)

## Fake-door snapshot (append ~2 weeks after the S0.3 promo send)

```sql
SELECT * FROM get_fakedoor_summary();
SELECT city, count(*) FROM fakedoor_signups GROUP BY 1 ORDER BY 2 DESC;
```

- Total signups: ______ · with city: ______ · top cities: ______
- Interpretation per PRD §6.0: seed-audience stated intent only. Near-zero from a real send → sharply lower the F0.8 prior before building; meaningful uptake → proceed, direction only.

## Implications for the Phase 0 gate

1. **A (25,000 completions) is a from-scratch target** — no installed base contributes. The §9 channel math (~2,200 starts/week) starts at literal zero.
2. **No threshold adjustment is warranted from this baseline** — there is nothing to adjust against; the one-time pre-freeze calibration (PRD §9.2) will rest entirely on the shakedown fortnight.
3. The `single-exploring` prior is unknown. The fake-door snapshot above is the only intent signal available before F0.8 ships.
