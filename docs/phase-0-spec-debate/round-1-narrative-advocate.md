# Round 1 — Narrative Advocate

1. **Missing API surface for anonymous results — the biggest hole.** §3's results RLS says "anon INSERT/UPDATE via api functions only," but no listed function creates or updates a `results` row. Required by F0.3 (publish), F0.8 (status stored pre-results), F0.4 (checkout takes resultId). Does every completion create a row? Does publishing require an account? Which endpoint writes? Ripples through four requirements.

2. **Anonymous-purchase-then-signup entitlement migration unspecified.** Claiming `purchases` rows at login; results claimed from a second device (different session_id); the session→user identity-stitching rule behind §5's "uniques by session_id unioned with user_id" is never stated — and it's the dedup basis for every gate metric.

3. **`fakedoor_signups` referenced, never defined** (no DDL); S0.3 implies track.js dual-writes email — contradicting AD-4's no-PII rule; also the week-0-depends-on-week-2 inversion.

4. **`events.session_id NOT NULL` conflicts with F0.3's server-side pixel** — a crawler request has no session UUID. Undefined, directly under metric D's denominator.

5. **AD-4's rate limiting not executable as written.** In-function token bucket doesn't survive stateless multi-instance serverless; the daily-cap mechanism is unspecified. Junk protection was AD-4's entire justification.

6. **Sequencing contradiction:** §7/§9 promise share pages + waitlist live at week-6 push; F0.8 is scheduled weeks 6–7. H/I are gate metrics — the post-freeze window could start with the intent probe dark.

7. **Share-page error paths undefined:** slug not found, unpublished-after-circulation, deleted result, deleted account (cascade removes row, orphans Storage image). 404 vs. generic page vs. redirect — unspecified.

8. **OG upload path and Storage policy unspecified:** who writes to the public bucket, under what policy; slug spec drifts ("random 10-char" vs "10 random base58"); collision handling unstated.

9. **`api/reading.js` authorization unspecified** for anonymous purchasers (replayable result_id + guessed session?); generation timing ambiguity (webhook-generates vs on-request); no paid-but-LLM-fails path (customer paid $12, no reading, no retry/refund behavior).

10. **Refund handling half-specified:** `'refunded'` status exists; consumed webhook events beyond checkout completion and refund's effect on access are not.

11. **Waitlist edge cases:** `UNIQUE(user_id)` — second join / city change: upsert, error, ignore? `result_id` lacks ON DELETE handling, breaking §6's deletion story.

12. **No environment/config inventory** for new vars (STRIPE_PRICE_FULL_READING named once; bucket, service-role usage, CORS origins incl. previews).

13. **Frontend integration WHAT without WHERE:** how new screens (status probe, My Landscapes, AuthPanel, publish dialog, reading card) slot into the App.jsx state machine — new states? modals? ReadingRenderer referenced as if introduced.

14. **Minor:** AD-7 names no hash function or control-variant mapping; nothing states who attaches `props.from='share'`; F0.7 lacks a kill switch.

Acceptance criteria otherwise genuinely testable; §5's "gate = the function's output" is exemplary; scope relative to PRD is clean. Items 1–6 are the ones a builder cannot resolve without inventing architecture.
