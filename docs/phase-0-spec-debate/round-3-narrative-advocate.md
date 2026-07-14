# Round 3 — Narrative Advocate

1. **Upsert-conflict semantics for the queued create unspecified** — the exact seam v3 added. On `client_result_id` conflict: overwrite, ignore, reject? A stale queued create could overwrite write-once `status` through the back door, and write a second `create` milestone. Needs: milestone written only when the upsert inserts; conflicting fields ignored/rejected.

2. **Claim × retry queue race — an uncounted third identity bias.** Eager create fails → queued; user claims; queue flushes anonymously afterward → new session-keyed create milestone; one human = two persons in A. Nothing orders re-key against concurrent inserts. Fix: flush-before-claim, or read-time resolution (see 10).

3. **Session-level re-keying contradicts the selective-claim checkboxes.** Both partners' results share one session_id; excluding a partner's result still sweeps that session's milestones. Milestones have no result reference, so result-scoped re-keying is inexpressible in the schema — a builder cannot implement both sentences.

4. **"Never updated, never deleted" followed by two UPDATE paths in the same paragraph** (claim re-key, deletion hash). Say "append-only except X, enforced by Y."

5. **`signup` milestone has no author** — auth is client→Supabase; no API function is in that path; who writes profiles + the signup milestone? Metric E is uncomputable until invented.

6. **AD-7 × AD-8 dev-exclusion mechanisms don't connect:** a client-side `ll-dev` flag cannot produce the `X-LL-Dev: <DEV_SECRET>` header without shipping the secret.

7. **Status-screen placement guessable-wrong:** before or after the `refining` screen? What if the user abandons during the ~30s refine?

8. **Deviation-3 date contradiction** (also RA#1).

9. **Missing error path: feature-triggered create fails** — publish/save/purchase require the row; blocked, queued, or optimistic? The one place "render is never blocked" can't hold.

10. **Simplification (solo-founder complexity):** replace claim-time re-key UPDATE with a tiny claims link table (session→user or result→user), resolve persons at read time via join in `gate_metrics()`. Truly append-only, no race, shared-device exclusion expressible. Also `rate_counters` ships without bucket-key/window semantics — state a fixed-window convention.

11. **AD-5/AD-9 are stubs referencing v2** ("unchanged") — inline them; the document should be self-contained.

12. **Minor:** AD-4's meta mentions "share `kind`" but no `share` milestone kind exists (dangling); `session_id` minting/key/lifetime never specified; flush-time `occurred_at` skews B's weekly buckets with no bias note.

Close — the AD-4/AD-8 core is well-argued; items 1–3, 5, 6 are load-bearing semantics a builder must invent; item 3 is a direct contradiction in the flagship machinery.
