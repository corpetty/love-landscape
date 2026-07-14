# Phase 0 Implementation Spec — Viral Assessment + Intent Probe

**Status:** Draft v3 (post adversarial-review round 2) · July 2026
**Parent document:** [dating-app-pivot-PRD.md](./dating-app-pivot-PRD.md) (v4) — implements Step 0, F0.0–F0.8, and the §9 gate instrumentation.
**Resourcing envelope (from PRD):** one founder, ~10–15 hrs/wk, ~$100–200/mo, LLM-assisted development.

---

## 0. Purpose, scope, non-goals, declared deviations

**Purpose:** ship the Phase 0 experiment — accounts, persistent results, shareable public result pages, a one-time premium reading SKU, progressive assessment, the dating-intent probe, and instrumentation that makes the PRD §9 gate evaluable.

**Non-goals (hard):** photos, matching, messaging, native apps, push notifications, framework migration, terrain-engine redesign, any use of the research-consented `submissions` table for commercial features (PRD §6 firewall).

**Success condition:** at gate date, every §9 metric is computable by one committed SQL function over an append-only milestones table, with known and stated bias direction.

**Declared deviations from the PRD:**
1. **Metric A counts *persons*, not raw completions.** PRD §9's threshold (25,000) is written against "completed assessments"; this spec counts distinct persons (see §5 identity rule) — strictly harder against the same frozen number, i.e. conservative. Declared so the freeze artifact means one thing.
2. **Auth is email OTP (6-digit code), not magic-link/OAuth as PRD F0.1 states.** Rationale: mobile magic links open in a different browser/webview, orphaning localStorage results and breaking the claim flow — the PRD's own acceptance criterion ("signup, migration, re-login work on mobile") is better served by OTP. OAuth deferred until funnel data demands it.
3. **F0.6 pages land by week 12** (first five at push), not the PRD's week 8 — consequence of the schedule in §7; content's in-window role is social/launch material, not SEO.

*(Schedule note, not a deviation: freeze is planned for end of week 10, push week 11. The PRD fixes no push week — it requires freeze-before-push, a two-week shakedown after F0.0, a 16-week gate clock from freeze, and a hard stop at freeze+7 months; all are satisfied. The PRD's clock is freeze-relative by design, so build-phase slippage moves the clock, not the bar.)*

---

## 1. Current architecture (summary)

- **Frontend:** Vite + React 19 SPA; single-file state machine in [App.jsx](../src/App.jsx) (`intro → assessment → refining → results`, plus `loadCode`; `?admin=true`, `?code=` deep links; no router). Three App.jsx behaviors constrain new work: (a) lines 40–67 read `?code=` and localStorage on mount; (b) lines 75–81 persist `code` to localStorage whenever code+params are set; (c) lines 84–96 rewrite the URL on the results screen. **The assessment flow is two-stage:** `handleAssessmentComplete` (lines 106–140) computes base params immediately, then optionally runs a ~seconds-to-30s LLM refinement (`adjustParams`) producing a second, adjusted code; the user can skip; errors fall back to base.
- **Params/encoding:** 17 fixed questions → 13 params ([paramCompute.js](../src/data/paramCompute.js) — tolerates partial answer maps, 0.5 default); params ↔ ~21-char `L2_` code ([encoding.js](../src/data/encoding.js)). Any 13-byte payload decodes — code validity is a format check, not proof of humanity.
- **Terrain:** [fieldGenerator.js](../src/terrain/fieldGenerator.js) is pure JS importable server-side (verified); feature *positions* are param-dependent while the DOM label overlay uses fixed positions — labels cannot be naively transplanted into a static image.
- **Backend:** 4 Vercel functions; Supabase `reading_sessions` + `submissions` + anon aggregate RPCs; current `vercel.json` has only `functions.maxDuration` (no rewrites — those are added by this spec, with `includeFiles` where functions read build artifacts).
- **Known deficiencies fixed, not inherited:** webhook verifies Stripe signatures but has **no idempotency** (live double-grant bug); AdminDashboard's gate is a cosmetic client-side hash; no tests, no analytics, no auth.

---

## 2. Architecture decisions

### AD-1: Share pages serve the SPA shell with injected OG tags; the SPA gets a dedicated shared-view state

`vercel.json`: rewrite `/r/:slug → /api/share?slug=:slug`; `functions["api/share.js"].includeFiles: "dist/index.html"` (functions bundle only statically-traced files — the read must be declared). The function looks up the result by slug (public rows only), returns `dist/index.html` with OG/Twitter meta injected (image → AD-2; title/description static — **no user text**) plus `window.__SHARE__ = { slug, code }`.

**SPA behavior (new `sharedView` screen):** when `__SHARE__` exists the app enters `sharedView`, which renders the shared landscape read-only from a dedicated prop — it does **not** set the owner `code`/`params` state, so App.jsx's localStorage-persistence effect (would clobber the visitor's own saved result) and URL-rewrite effect (would append `?code=` and pollute re-shares) never fire; both effects are additionally gated to owner screens as a defense in depth. `share_page_view` fires from `sharedView` mount (client-fired — JS execution is the crawler filter; no server pixels exist). The CTA ("Take the assessment — see your own shape") fires `share_page_cta` and enters the assessment with an in-memory `from='share'` flag that tags the subsequent `assessment_start` (no query param — immune to URL rewriting). A "compare with mine" affordance appears only for visitors with a saved result; using it records a compare milestone tagged `source='share'`.

**Error paths:** unknown/unpublished/deleted slug → **410** (both `api/share.js` and `api/og.js` — one status code, one rule) with a take-the-assessment page. All interpolation HTML-escaped even though no user text is emitted.

### AD-2: OG images are server-rendered contour art — no per-feature labels

`api/og.js` (`/api/og/:slug.png`): slug → code (public only) → params → marching-squares contour bands (5–6 elevation levels over the 100×100 field via the shared [fieldGenerator.js](../src/terrain/fieldGenerator.js)) → 1200×630 SVG → PNG via `@resvg/resvg-js` (**napi native binding, not wasm** — prebuilt `.node`, ~9MB; verify Vercel's tracer bundles the linux-x64 artifact; the wasm package `@resvg/resvg-wasm` is the fallback if tracing fights back). `Cache-Control: public, s-maxage=86400` (24h staleness after unpublish, disclosed in consent copy).

**Design decision — no feature labels in the image.** Feature positions move with params and flip ridge/valley polarity; static label placement is a collision generator, and 13 labels are illegible at preview size anyway. The image is: contour art + wordmark + a fixed tagline ("the shape of my relational landscape"). Exactly **one bundled font** (an OFL-licensed subset, e.g. Inter, loaded via `fontBuffers` — serverless has **no system fonts**; without this, resvg renders no text at all).

*Rejected:* client canvas capture (round-1 reasons: DOM labels missing, mobile blur, upload abuse surface); labeled server render (this round: collision/legibility).

### AD-3: Auth is Supabase email OTP; paid email from day one

`signInWithOtp` + `verifyOtp({ type: 'email' })` with a 6-digit code typed in-app (declared deviation 2). **Supabase's default email template sends a link — it must be customized to emit `{{ .Token }}`.** Email provider: **Resend paid ($20/mo) from push** — free tiers are disqualified by arithmetic (Postmark free = 100/mo; Resend free = 100/day, binding on exactly the spike days the experiment needs); SPF/DKIM on the app domain, deliverability tested pre-push. UX handles Supabase's 60s resend cooldown (visible countdown). **Abandoned verifications:** `signInWithOtp` creates an auth user on send; a weekly cron purges auth users with no `profiles` row older than 7 days. Diagnostic events `otp_sent`/`otp_verified` make abandonment visible (it is otherwise a silent H/E depressant).

### AD-4: Gate metrics come from an append-only milestones table written by functional endpoints

Round 1 moved gating off blockable client events; round 2 showed state tables (`is_public`, surviving rows) aren't event-grade either (publish-then-unpublish vanishes; deletions rewrite history; deleters aren't random). v3 lands the design:

- **`milestones` (append-only, no content):** `{ occurred_at, kind, person_key, meta }` — kinds: `create`, `publish`, `signup`, `waitlist_join`, `purchase`, `compare`; `meta` carries only what gating needs (`status` at create, `variant`, compare `source`, share `kind`). Written server-side, inside the same API call as the state change, transactionally. Never updated, never deleted; on account deletion the person_key is irreversibly re-keyed to a salted hash (documented in the privacy page as "anonymous counters are retained").
- **Person rule (replaces v2's identities table, which failed the shared-device case and didn't solve the two-device case):** `person_key = user_id if known at write time, else session_id`. At claim, the claimed sessions' existing milestones are re-keyed to the user_id (one UPDATE per claim). Residual known biases, stated in the freeze artifact: a never-logged-in second device double-counts (inflates A slightly); a shared device merges two humans (deflates A; misattributes one partner's status). Both are small, structural, and disclosed — not fingerprint-solvable within the product's privacy posture.
- **Gate SQL becomes trivial:** every §9 metric is a count over `milestones` (§5). C counts publish/compare *actions* (a publish with zero visitors still counts — the freeze artifact says so plainly; metric D is the did-anyone-come cross-check).
- **Client events (`events` via `journey.js` → `api/sync.js`)** remain for diagnostics (D, F's denominator, funnel detail). Bias statement, corrected: event undercount is conservative for D (both terms client-fired, bias ≈ cancels) and for pure-event counts, but **inflates F** (functional numerator ÷ event denominator) — F is interpreted alongside the shakedown block-rate estimate, stated in the artifact.
- **Naming:** endpoints `api/results.js`, `api/sync.js`; client module `src/data/journey.js` (no track/analytics/telemetry strings).
- **Anomaly review at gate:** velocity and IP-concentration checks (primary); the code-distribution check is included **only if** `scripts/code-reference-dist.js` (reference distribution of real paramCompute outputs from simulated answer profiles + personas) is built before freeze — otherwise it is dropped from the §9 evaluation description rather than left as a vibe. Raw daily milestone series visible to advisors.

### AD-5: Results are stored as codes, not columns (unchanged)

### AD-6: Premium SKU — idempotent payments first, defined product, restored pair report

- **Webhook idempotency lands in F0.0** behind `stripe_events` (event_id PK, insert-first, conflict → exit 200), deployed behind a `WEBHOOK_V2` env flag for instant rollback on a live payment path. Fixes the existing credits double-grant too.
- **Product definition (was missing):** the $12 Full Reading is a ~2,500–3,500-word structured document: overview; 13 parameters in 4 thematic groups (~2 paragraphs each); "your ridges" (growth edges); conversation starters; **and — restoring PRD F0.4 scope (round-2 finding) — an optional pair-compatibility section** generated when the buyer attaches a partner code (their own saved comparison). Differentiation from the free reading: free stays ≤300 words, narrative-only; Full is per-parameter, structural, and includes the pair section. Regeneration: a visible "regenerate" button, `regen_count ≤ 3`.
- **Flow:** generalized `api/checkout.js` (`{ sku, resultId, sessionId|userId, client ref }`), webhook upserts `purchases` (unique `stripe_session_id`); generation on first entitled `api/reading.js` request (JWT or owner_token), cached; failures retriable free; >48h broken → manual refund per `docs/payments-runbook.md`; `charge.refunded` consumed → access revoked. **Lost-token orphaned purchase remedy (was missing):** the Stripe receipt email contains the checkout session id; support path = founder locates the purchase by `stripe_session_id` and re-links — runbook line.
- Credits grandfathered read-only; BYO-key readings stay free.

### AD-7: A/B via deterministic hash, kill switch, audited override

`variant = fnv1a(session_id) % 2` (0 = control). Kill switch `VITE_FORCE_VARIANT`. The `?variant=` override is consumed by `journey.js` at init — read, applied, **immediately stripped via `history.replaceState` before App.jsx's mount effect runs**, and it auto-sets the `ll-dev` flag (override traffic is dev-excluded by construction). This satisfies §1's own demand that new query params be audited against App.jsx's URL handling.

### AD-8: Anonymous data plane — `api/results.js`, best-effort with a durable retry queue

**Resolution of round 2's central dilemma (load-bearing vs. availability): the results screen always renders locally.** The create write is **required-for-features, not required-for-render**: publish, save-to-account, purchase, and waitlist all need the row and will create it on demand if the eager write failed. Metric A therefore counts: everyone whose eager write landed, plus everyone who touched any server feature. The loss (completers whose eager write failed and who never touched a feature) is undercount-only — conservative — and bounded by the retry queue below. This voids neither AD-4 (milestones are still server-truth) nor availability (an outage costs telemetry, not user experience).

- **Create:** fired once, when final params settle (post-refine, post-skip, or immediately when no refinement runs — the two-stage refine flow in §1 is thereby specified: one create, carrying the code the user actually sees). Body: `{ client_result_id (UUID, minted at assessment start — the idempotency key; server upserts on it), code, status, variant }`. Response: `{ result_id, owner_token }`. On failure: exponential backoff in-session, then a **durable localStorage queue** flushed on later visits and before any feature call.
- **Client ownership store (`ll-results-v1` in localStorage):** array of `{ client_result_id, result_id, code, owner_token, created_at, label? }`. This is the schema the claim call reads.
- **Update (op-based body, one endpoint):** `{ op:'update', result_id, owner_token | JWT, fields: { label?, is_public? } }`. **`status` is write-once at create — not updatable** (round-2 finding: post-results edits reopen the post-flattery bias F0.8's ordering exists to close; the v2 "status correction" capability is cut).
- **Claim:** `{ op:'claim', tokens: [≤20] }`, **JWT required — the user_id comes from the verified token, never the body.** The claim UI lists the device's local results (label, date, mini preview) with checkboxes — on a shared phone, a partner's results are visible and excludable rather than silently swept. Semantics: rows already claimed by another user are skipped and reported; claimed rows get `user_id` set and their **owner_token invalidated** (hash nulled — bearer access ends at claim, shrinking the theft window); the sessions' milestones are re-keyed; purchases are claimed **via the claimed result_ids only**.
- **Compare:** `{ op:'compare', partner_code }` → compare milestone with `partner_code_hash` only. **Saved comparisons** (the F0.2 feature) store the partner code as user content in `comparisons` — owned, deletable, 24-month retention, and the privacy page states that saving someone's code stores it (round-2 compliance finding).
- **Rate limits (CGNAT-safe — round-2 fix):** per-session 30/day; **per-IP 2,000/day** (a rejected write degrades to the retry queue, never a broken screen); `api/sync.js` 120/day/session; `api/fakedoor.js` 10/day/IP. **Rejection counts are a dashboard panel with an email alert** — silent rate-limit kills are themselves a gate threat.
- **Dev exclusion mechanism (was unimplementable as prose):** requests carrying header `X-LL-Dev: <DEV_SECRET>` or from an IP in `DEV_IPS` (env, comma-separated) write `is_dev=true` on rows and milestones; `gate_metrics()` excludes them; both env values are recorded in the freeze artifact.

### AD-9: Admin access via `ADMIN_TOKEN` bearer on `api/admin.js` (unchanged from v2; new RPCs service-role only; `waitlist_by_city` never anon)

---

## 3. Data model

`001b_step0.sql` (Step 0, standalone): `fakedoor_signups` (id, created_at, email UNIQUE, city) + `rate_counters` (bucket PK, count, updated_at) — both service-role only.

`002_phase0.sql`:

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_result_id UUID UNIQUE NOT NULL,      -- create idempotency key
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  owner_token_hash TEXT,                      -- nulled at claim
  code TEXT NOT NULL,
  label TEXT,                                 -- private; never on public pages
  status TEXT CHECK (status IN ('single','partnered','complicated','prefer-not')), -- write-once
  variant SMALLINT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  first_published_at TIMESTAMPTZ,             -- set once, never cleared
  slug TEXT UNIQUE,
  is_dev BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX results_owner_token ON results (owner_token_hash);
CREATE TABLE milestones (                     -- append-only; gate source of truth
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  kind TEXT NOT NULL CHECK (kind IN ('create','publish','signup','waitlist_join','purchase','compare')),
  person_key TEXT NOT NULL,                   -- user_id or session_id; re-keyed at claim; hashed at deletion
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,    -- status/variant at create; source on compare; is_dev
  is_dev BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX milestones_kind_time ON milestones (kind, occurred_at);
CREATE TABLE comparisons (                    -- saved comparisons: user content
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL                  -- retention: 24 months; owner-deletable
);
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  result_id UUID REFERENCES results(id) ON DELETE SET NULL,
  city TEXT NOT NULL, country TEXT            -- free text; normalized at gate via a reviewed mapping (human step, documented)
);
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  sku TEXT NOT NULL DEFAULT 'full_reading',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded')),
  amount_cents INT,
  user_id UUID REFERENCES auth.users(id), session_id UUID,
  result_id UUID REFERENCES results(id) ON DELETE SET NULL,
  reading_text TEXT,                          -- nulled on account deletion
  regen_count INT NOT NULL DEFAULT 0
);
CREATE TABLE stripe_events (event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE events (                         -- diagnostics only
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID NOT NULL, user_id UUID,
  name TEXT NOT NULL CHECK (name IN (
    'assessment_start','assessment_complete','results_view','share_page_view','share_page_cta',
    'partner_code_load','signup_start','otp_sent','otp_verified','reading_view','waitlist_view',
    'content_page_view','checkout_start'
  )),
  props JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 1024)
);
CREATE INDEX events_name_created ON events (name, created_at);
```

**RLS:** all new tables service-role only (every mutation via API functions); no new anon grants. **Retention:** `events` purged at 12 months, `comparisons` at 24 (Vercel cron, monthly job). **Deletion (account):** cascades profiles/results/waitlist/comparisons; purchases keep financial fields, **`reading_text` nulled** and `session_id` nulled; milestones person_key re-keyed to salted hash. **Firewall:** nothing links `submissions` to any table above.

---

## 4. Implementation, requirement by requirement

### S0 — Step 0 (week 0; standalone)

| Item | Design | Effort |
|---|---|---|
| S0.1 Stripe verification | Runbook: test-mode e2e; one live $1 promo transaction, refunded; live webhook + price config documented. | 3–4h |
| S0.2 Baseline report | Existing RPCs + blog analytics → `docs/step-0-baseline.md` (opt-in counts flagged as self-selected lower bound). | 2h |
| S0.3 Fake-door | `public/meet.html` + standalone `api/fakedoor.js` + `001b_step0.sql`. No Phase-0 dependencies. One blog/newsletter promo. | 5–7h |
| S0.4 Advisors | Outreach. | — |

### F0.0 — Hardening & instrumentation (weeks 1–3)

Webhook idempotency rewrite behind `WEBHOOK_V2` flag; Vitest (encoding round-trip; paramCompute persona snapshots; partial answers; webhook idempotency; results-create validation incl. idempotent upsert; rate limits); CI (GitHub Actions: test+build); `journey.js` (batch: flush at 10 events / 5s / page-hide) → `api/sync.js`; `api/results.js` (all four ops + milestones + retry-queue client); `api/admin.js` + dashboard funnel tab **including the rate-limit-rejection panel + email alert**. *Acceptance:* live transaction verified; dashboard shows milestones + events; CI green; baseline report written. **Effort: 30–38h** (was 22–28; round-2 finding — this row was overloaded and is now split across three weeks).

### F0.1 — Accounts (weeks 4–6)

OTP per AD-3 (template customization, Resend paid, SPF/DKIM, deliverability matrix: Gmail/Outlook/iCloud; iOS Safari/Android Chrome/desktop); AuthPanel modal; claim UI with per-result checkboxes (AD-8); abandoned-user cleanup cron. *Acceptance:* signup, selective claim, re-login verified on the matrix; OTP lands in inbox; abandoned-verification purge observed. **Effort: 22–30h.**

### F0.2 — Persistent profile (week 6)

"My landscapes": owned results (label, date, open, publish toggle, delete) + saved comparisons (delete). Deletes are content deletes; milestones persist (§3). *Acceptance:* returning user retrieves everything; deleting a published result kills its share page (410) within 24h cache staleness. **Effort: 8–12h.**

### F0.3 — Share pages + OG (weeks 7–8)

`api/share.js` (includeFiles config) + `api/og.js` (font bundling, contour art per AD-2) + `sharedView` screen **including the App.jsx effect-gating refactor** (persistence and URL-rewrite effects scoped to owner screens — round-2 finding, budgeted) + publish dialog with the revocability copy (platform caches; 24h image staleness; *codes, once shared, decode forever*). *Acceptance:* preview matrix (iMessage/WhatsApp/X/Slack); visiting a share page does not touch the visitor's saved result (regression test); D computable; dead slug → 410. **Effort: 26–34h** (was 20–26; refactor + font/design iteration added).

### F0.8 — Dating-intent probe (week 9)

Status screen between completion and results (write-once, carried on create); singles see the waitlist card (honest copy); join = inline OTP + city → waitlist row + milestone. *Acceptance:* status non-null on ≥99% of non-dev creates (measured over shakedown creates; the 1% is client-error allowance — the screen is unskippable except "prefer not"); waitlist join works from anonymous start; `otp_sent→otp_verified→waitlist_join` funnel visible. **Effort: 8–10h.**

### Cross-cutting (week 9, parallel): deletion + privacy + compliance

`api/delete-account.js` (JWT; cascades per §3; purchases anonymized with reading_text nulled); `public/privacy.html` (stored data, retention, deletion, share revocability, saved-codes disclosure, anonymous-counters disclosure, research separation); **state-health-law diligence: review WA My Health My Data applicability (mental-health inferences reach non-resident processors) before push — checklist item with 3h budgeted, output = one page in `docs/compliance-notes.md`.** US-first: no consent banner; an EU push requires an ePrivacy consent gate first (constraint recorded). **Effort: 9–12h.**

**→ Freeze: end of week 10 (gating funnel live + 2-week shakedown data). Push: week 11. Gate: freeze + 16 weeks. Hard stop: freeze + 7 months.**

### F0.4/F0.5 — Premium SKU (weeks 11–14, post-push; G diagnostic)

Per AD-6 (product content spec, pair section, retriable generation, refunds, lost-token runbook; credits UI removed). *Acceptance:* production purchase e2e; forced-failure retry works; pair section renders when a comparison is attached. **Effort: 20–26h.**

### F0.7 — Progressive assessment (weeks 14–16)

Per AD-7. *Acceptance:* A/B live; completion by variant on dashboard; override strips itself from the URL and dev-flags. **Effort: 10–14h.**

### F0.6 — Content seed (writing weeks 8–14; pages live 11–14)

13 explainer pages via `scripts/build-learn.js` → static `dist/learn/*.html`; **tracking mechanism specified:** the build script injects an inline snippet (reads the same localStorage session id, posts `content_page_view` to `api/sync.js` directly — no journey.js import on static pages). First 5 at push, all 13 by week 14 (deviation 3 adjusted). **Effort: 8h engineering + ~20h writing.**

---

## 5. Gate-metric mapping (PRD §9 → committed SQL over `milestones`)

`gate_metrics(from,to)` — service-role; SQL committed to `docs/phase-0-gate.md` at freeze with thresholds, DEV_SECRET/DEV_IPS values, and the bias statement. Person = `person_key` (rule in AD-4; known residual biases stated there).

| Metric | Source | Definition |
|---|---|---|
| A | milestones (functional) | persons with a `create` in window (declared deviation 1: persons, not raw completions) |
| B | milestones | weekly A, final 6 weeks |
| C | milestones | persons in A with `publish` ∪ `compare` ÷ A (actions, not proven reach — D is the reach cross-check) |
| D | events (diagnostic) | `assessment_start[from=share]` ÷ `share_page_view` — both client-fired; blocker bias ≈ cancels |
| E | milestones | persons in A with `signup` ÷ A |
| F | events + milestones | `create` persons ÷ `assessment_start` persons, by variant — **inflated under blockers (functional ÷ event); read with the shakedown block-rate estimate** |
| G | milestones | persons in A with `purchase` ÷ A |
| H | milestones | `waitlist_join` persons ÷ persons with create-meta `status='single'` |
| I | milestones + waitlist | singles ÷ A (denominator = all completers, per PRD); national waitlist count; per-metro via reviewed city normalization |

Bias statement (frozen): milestone metrics are append-only and immune to state churn and content deletion; residual identity biases per AD-4; event metrics undercount under blockers (conservative except F, flagged); deliberate fraud is rate-limited, dev-excluded, and anomaly-reviewed (velocity, IP concentration; code-distribution check only if the reference-distribution script ships pre-freeze), with raw daily series visible to advisors.

---

## 6. Security & privacy

- All new tables service-role only; every mutation through an API function; JWT for owned rows, `owner_token` (hashed at rest, indexed, invalidated at claim) for anonymous rows; claim requires JWT and explicit per-result selection.
- `api/share.js`/`api/og.js`: no user text; escaping regardless; slugs crypto-base58×10; 410 on dead slugs.
- Payments: signature verification + `stripe_events` idempotency (F0.0, flag-revertable) + unique `stripe_session_id`; `charge.refunded` consumed.
- Rate limits per AD-8 with rejection monitoring; CORS restricted to `PUBLIC_ORIGIN` (+ preview URL) on all new endpoints, existing ones tightened in F0.0.
- Admin per AD-9. Dev-traffic exclusion per AD-8.
- Privacy: three separate opt-ins (publish, waitlist, research); research data untouched; retention (events 12mo, comparisons 24mo); deletion path incl. reading_text; milestone anonymization; WA MHMDA diligence pre-push; EU = consent gate first.

## 7. Sequencing and effort budget

| Weeks | Work | Hours |
|---|---|---|
| 0 | Step 0 | 10–13 |
| 1–3 | F0.0 | 30–38 |
| 4–6 | F0.1, F0.2 | 30–42 |
| 7–8 | F0.3 | 26–34 |
| 9 | F0.8 + deletion/privacy/compliance | 17–22 |
| 10 | Shakedown buffer, freeze prep, bugfix | 8–12 |
| 11 | **Push** | — |
| 11–14 | F0.4/F0.5 | 20–26 |
| 14–16 | F0.7 | 10–14 |
| 8–14 | F0.6 (8h eng + 20h writing, interleaved) | 28 |
| **Total** | | **~179–229h + writing** |

**Pre-push critical path: ~121–161h over 10 weeks = 12–16 h/wk.** Stated plainly: this is the top of the PRD envelope and the plan, not a contingency, is that at a 10 h/wk reality the freeze slips to ~week 13 — legal under the PRD's freeze-relative clock, and better than pushing with a half-built funnel. Post-push work touches only diagnostic metrics.

**Costs from push:** Vercel Pro $20 + Supabase Pro $25 + Resend $20 + domain/misc ~$10 ≈ **$75–95/mo** + LLM inference — inside the PRD envelope.

## 8. Testing & CI

Vitest (encoding; personas; partial answers; webhook idempotency incl. replay; results upsert idempotency; rate limits; journey allowlist; App.jsx effect-gating regression for sharedView). GitHub Actions test+build. Manual matrices: OG previews, OTP deliverability/devices, production purchase. Rollback notes: webhook behind `WEBHOOK_V2`; migrations are additive-only (no destructive DDL in Phase 0).

## 9. Launch plan (push, week 11)

Blog post; fake-door list gets first access (its conversion vs. F0.8's live numbers is reported at gate); share pages + status probe + waitlist live day one (guaranteed by freeze ordering); social calendar = terrain art + one explainer/week; 2–3 communities with mod permission.

## 10. Environment & config inventory

New: `STRIPE_PRICE_FULL_READING`, `ADMIN_TOKEN`, `PUBLIC_ORIGIN`, `DEV_SECRET`, `DEV_IPS`, `WEBHOOK_V2`, `VITE_FORCE_VARIANT`, Resend/SMTP settings (Supabase Auth), Vercel cron entries (events/comparisons purge; abandoned-auth purge). Existing vars documented in the S0.1 runbook. `vercel.json` additions: `/r/:slug` and `/api/og/:slug.png` rewrites; `includeFiles` for `api/share.js`.

## 11. Open technical questions

1. Vercel tracer × `@resvg/resvg-js` native binary — verify bundling in the first F0.3 spike; fallback `@resvg/resvg-wasm` (different API, manual font/init).
2. Contour band count/palette for legible 1200×630 art — design iteration inside F0.3's budget.
3. Whether the fake-door list's early-access email doubles as the deliverability warm-up send (probably yes — cheap DKIM warm-up).
