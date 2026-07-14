# Round 2 — Research Advocate

1. **AD-6/F0.4 — undeclared scope cut from PRD F0.4.** PRD includes a "pair compatibility report" in the Full Reading; the spec's SKU is a single per-result `reading_text`. Declare or restore.

2. **§5 — metric A redefined without declaration; AD-4/§5 contradict on B.** PRD counts "completed assessments" (25,000); spec counts *persons* — stricter against the same frozen threshold; not in the deviations list. AD-4 says diagnostics "use the events table" while §5 sources B from `results` (functional) — internal contradiction (§5's version is better).

3. **AD-3 vs PRD F0.1 — auth mechanism change argued but never declared** (PRD says magic-link/OAuth; spec ships OTP). Also: 6-digit email OTP requires customizing the Supabase email template to emit `{{ .Token }}` (default sends a link) — [Supabase passwordless docs](https://supabase.com/docs/guides/auth/auth-email-passwordless); `verifyOtp({type:'email'})` exists as claimed.

4. **AD-3 — "Resend or Postmark (free tier suffices)" is false for Postmark** (100 emails/month — [pricing](https://postmarkapp.com/pricing)); Resend free is 3,000/mo but 100/day — binds on launch spikes. At pass-level funnel (~600+ OTP emails/mo minimum) the claim steers into a broken config.

5. **§11 Q1 — resvg risk mischaracterized.** `@resvg/resvg-js` is a napi-rs **native binding** (prebuilt .node); the wasm build is a separate package (`@resvg/resvg-wasm`). "Wasm init" cold-start describes the wrong package ([resvg-js repo](https://github.com/thx/resvg-js)).

6. **AD-1 — reading `dist/index.html` needs `functions["api/share.js"].includeFiles` in vercel.json** (functions bundle only statically-traced files — [Vercel KB](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions)); current vercel.json has only maxDuration entries, no rewrites; the rewrite must pass the slug as a query param to reach the function.

7. **§0 deviation 1 mislabeled (cosmetic):** the PRD fixes no push week — week 6 was the v1 spec's own timeline. The actual PRD constraints (freeze before push, 16-week clock, freeze+7mo stop, two-week shakedown) are genuinely satisfied by week-8/9 — deviation 1 isn't a PRD deviation.

Verified true: §1's codebase summary in every particular (App.jsx lines, paramCompute 0.5 default, 21-char codes, webhook signature-yes/idempotency-no, sha256("password"), DOM labels via constants.js FEATURE_LABELS/AXIS_LABELS, fieldGenerator pure JS importable server-side); gate/diagnostic split matches PRD §9 exactly; I denominator = completers ✓; Step 0 fake-door matches PRD ✓; `pg_column_size` CHECK works (tested on PG16) ✓; Vercel cron on Pro ✓; Hobby non-commercial + Supabase pausing correctly stated ✓.
