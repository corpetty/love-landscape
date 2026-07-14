# Round 1 — Adversary

1. **AD-1's meta-refresh redirect solves the wrong problem.** Crawlers don't execute redirects (previews fine), so the redirect exists only for humans who don't need it. Serve the SPA shell directly at `/r/<slug>` with OG tags injected. Worse: App.jsx (lines 40–92) rewrites `url.searchParams` on mount/results — `from=share` is at real risk of being stripped before `assessment_start` fires; metric D's attribution hangs on an unaudited URL-rewrite path. And meta-refresh-0 makes Google canonicalize share pages to `/?code=...` — zero SEO identity, unstated.

2. **Metric C is wired to inflate itself.** The share redirect lands on the `?code=` handler that legacy partner-compare links use; unless `from=share` reliably suppresses `partner_code_load`, every share-page visitor increments a gate metric. Also C's numerator (code loaders, possibly never completers) isn't a subset of its denominator A — not a coherent rate. If this SQL freezes, the gate evaluates garbage and the no-post-freeze-changes rule forbids fixing it.

3. **"session_id unioned with user_id" dedup is not implementable.** No identity-resolution mapping exists in the schema; second-device sign-ins double-count in A and skew C/E asymmetrically. The freeze artifact's core arithmetic is unspecified.

4. **Ad blockers will silently gut the gate metrics.** The audience (analytical, privacy-conscious) plausibly runs 25–40% blockers; EasyPrivacy blocks paths matching `/track` and files named `track.js` — the spec names both. Metric A is an absolute floor (≥25,000): undercounting doesn't cancel; a real pass reads as KILL. No innocuous-path consideration, no functional-write derivation, no shakedown block-rate estimate.

5. **Rate limiting fails at its stated purpose.** Per-instance token buckets multiply limits and reset on cold start; the per-session daily cap is bypassed by rotating session_ids — and each rotation is a new unique in metric A. `api/track.js` accepts any allowlisted name from curl; no validation an `assessment_complete` corresponds to anything real, no founder-traffic exclusion. The experiment's entire output is these numbers.

6. **Metric D's crawler filtering is asserted, not specified.** The server pixel fires for WhatsApp prefetch, unfurlers, SafeLinks (spoofed Chrome UAs), every thread re-render. `NOT NULL session_id` breaks. Honest alternative: count client-side after render — JS execution IS the human filter — which contradicts the pixel design and isn't discussed.

7. **Magic-link-only auth is in tension with the 10% account gate and breaks migration.** Mobile magic links open in mail-app webviews or a different browser — no localStorage results, PKCE verifier mismatch: "save your landscape" silently no-ops for many mobile users. 6-digit OTP is never considered. Supabase built-in email (~2/hr) makes custom SMTP a hard pre-push prerequisite with zero hours budgeted.

8. **F0.0's webhook test is specified against code that will fail it** (unkeyed read-modify-write, no event dedup, race-prone) with no rewrite budgeted. Stripe CLI setup and live-mode product/webhook config also unbudgeted.

9. **The OG capture pipeline is missing its labels — literally.** labelOverlay.js renders labels as DOM elements, not into the WebGL canvas; `toDataURL()` captures a bare, semantically mute terrain. Compositing labels = reimplementing projection math (the "second rendering implementation" AD-2 claimed to avoid). Mobile: renderer sized to container width, pixelRatio ≤2 → ~760px source upscaled to 1200×630, blurry from exactly the publishing devices. The rejected server-side alternative was strawmanned — a 2D composite (they already have Radar/Contour geometry) eliminates capture, upload, storage, publish-failure, and unpublish-cache problems in one move.

10. **The anonymous `results` data plane doesn't exist.** No function inserts anonymous rows, flips is_public, or assigns slugs for never-signed-in users. Direct anon-key Storage upload = anyone can write arbitrary PNGs to your public bucket (illegal-content hosting under your domain). Client-claimed session_id as ownership = bearer semantics never stated. Missing API function + missing threat model in the most user-visible feature.

11. **Unpublish is overstated and partially irrevocable.** Platform preview caches; CDN TTLs; and every visitor was redirected to `/?code=<full L2 code>` — the code IS the complete result, decodes forever. The consent copy must say this or it misrepresents revocability of psychological data — the PRD's named existential risk.

12. **Admin security model is self-contradictory.** Dashboard gate is `sha256("password")` client-side in the public bundle; new RPCs described as "service-role or admin-only" but consumed by a browser dashboard holding the anon key. Either anon-callable (funnel + per-city waitlist publicly queryable) or the dashboard can't call them. A real authenticated admin path is neither designed nor budgeted.

13. **`api/share.js` is an XSS surface.** HTML built by string interpolation from DB fields; `results.label` is free-text. Escape everything; state whether labels appear on public pages at all.

14. **Sequencing: freeze-earliest-then-build burns the gate clock.** Week-6 push promised while F0.3 runs through week 6 and F0.8 through week 7 — zero slack; slipping means the intent probe is dark while its denominator accrues. F0.7 lands week 9–11 (rump A/B window); F0.6 content lands weeks 8–16 into a ~week-21 gate — SEO can't index in-window, so content contributes ~nothing to the 2,200/week math. Nothing forces push at week 6; pushing at week 8–9 with the full funnel live was never weighed.

15. **Effort is optimistic ~1.5–2× in load-bearing rows; several items absent entirely:** F0.1 realistic 20–30h (cross-browser auth QA, migration conflicts); F0.3 omits label compositing, storage security, escaping, preview-matrix iteration; missing: anonymous-results API, SMTP setup, webhook rewrite, admin auth, account-deletion endpoint + UI, crawler filtering, privacy.md. Honest total ~180–230h → 15–23 weeks at the stated pace; breaks the "fits the envelope" claim and the week-5 freeze schedule.

16. **Compliance gap in AD-4's justification.** Consent/ePrivacy attaches to the tracking (persistent identifier + behavioral events incl. relationship status), not the vendor; first-party ≠ no lawful-basis question. No consent, no retention period for events, status in an analytics table. Also: Stripe checkout on Vercel Hobby is a ToS violation, not an open question — budget the $20.

17. **PRD deviation left implicit:** PRD F0.3 says "server-rendered OG"; the spec silently overrides. Name deviations.

Priority: #2/#3 (gate SQL correctness), #4/#5 (metric integrity), #7 (OTP), #10 (anonymous data plane), #14/#15 (re-derive schedule from honest hours before committing a freeze date).
