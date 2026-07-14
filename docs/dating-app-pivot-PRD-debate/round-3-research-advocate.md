# Round 3 — Research Advocate

1. **Step 0 / §2 / §9 — "share-code load rate" and "cumulative completions" are not instrumented; the codebase contradicts the claim they can be pulled.** Decoding is client-side (`src/data/encoding.js`) with no logging; the only Supabase writes are opt-in research inserts (`src/data/supabase.js`) and LLM-credit sessions; `AdminDashboard.jsx` queries only submission count/means/histograms/demographics. Only opt-in research submissions (a self-selected lower bound) are countable. Step 0 should say "opt-in submission count"; share-load rate requires new instrumentation (F0.0).

2. **§4 OkCupid row — −14% misattributed again at finer grain.** Q3 2024 8-K: Evergreen & Emerging *segment* −9% Y/Y (−4% ex-live-streaming); the **Evergreen brands subset** (Match, Meetic, POF, OkCupid) declined 14%. Also stale (Q3 2024 in a July 2026 doc) with no note of subsequent quarters.

3. **§4/§7 — 16personalities "1.5B tests" and "$32.99/yr premium" both unsupported.** Company claims "over one billion"; premium products are one-time payments ("no sneaky renewals"), not a yearly subscription; $32.99 unlocatable. This row is the stated price anchor for F0.4.

4. **§4 CMB "~$35/mo" lacks context** — $34.99 is the 1-month sticker; effective $15–35 by commitment; a cheaper Mini tier exists.

5. **§6 F1.2 / §7 — "AI-coach market clusters $10–20/mo" uncited**, absent from Appendix A, yet it prices the $7.99 F1.2 SKU.

6. **§2/§9 — "relationship status" imprecision.** Schema field is `relationship_structure` (`monogamous / enm-polyamorous / single-exploring / other`), optional/nullable, answered post-results by research volunteers only. Conflates "single" with "single-and-exploring"; not directly comparable to F0.8's planned pre-results status question.

7. **Appendix A — Semafor and Sensor Tower listed but nothing attributed to them**; Paired "~$2.4M/yr est." carries no inline source despite the appendix's stated discipline.

Verified clean: Match/Kinsey framing; Keeper figures and dates; RevenueCat 2.0%/1.0–2.9% and the flagged 5-month lifetime; Paired conflict flag; Ditto single-source flag; all §9 and §7 internal arithmetic; all §2 codebase claims (17 questions, 13 params, GRID_SIZE=100, 21-char codes, 4 providers, 4 functions, 6,029 LOC, zero tests).
