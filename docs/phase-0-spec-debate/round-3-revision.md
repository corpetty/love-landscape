# Phase 0 Implementation Spec — Viral Assessment + Intent Probe

**Status:** v4 (final, post 3-round adversarial review) · July 2026
**Parent document:** [dating-app-pivot-PRD.md](./dating-app-pivot-PRD.md) (v4) — implements Step 0, F0.0–F0.8, and the §9 gate instrumentation.
**Resourcing envelope (from PRD):** one founder, ~10–15 hrs/wk, ~$100–200/mo, LLM-assisted development.

---

## 0. Purpose, scope, non-goals, declared deviations

**Purpose:** ship the Phase 0 experiment — accounts, persistent results, shareable public result pages, a one-time premium reading SKU, progressive assessment, the dating-intent probe, and instrumentation that makes the PRD §9 gate evaluable.

**Non-goals (hard):** photos, matching, messaging, native apps, push notifications, framework migration, terrain-engine redesign, any use of the research-consented `submissions` table for commercial features (PRD §6 firewall).

**Success condition:** at gate date, every §9 metric is computable by one committed SQL function over an append-only milestones table (+ a claims join), with known and stated bias direction.

**Declared deviations from the PRD:**
1. **Metric A counts *persons*, not raw completions** — strictly harder against the same frozen 25,000; conservative.
2. **Auth is email OTP (6-digit), not magic-link/OAuth** (PRD F0.1). Mobile magic links open in a different browser/webview, orphaning localStorage results; OTP keeps the flow in the browser that owns the data. OAuth deferred until funnel data demands it.
3. **F0.6 pages: first 5 at push (week 11), all 13 by week 14** (PRD said week 8) — consequence of the §7 schedule; content's in-window role is social/launch material, not SEO.
4. **F0.8 acceptance measures status on *creates*, not completers** (≥99% non-null on non-dev creates vs. PRD's ">90% of completers") — creates exclude completers whose server write failed; the threshold is stricter and the substitution is stated.

*(Schedule note, not a deviation: freeze end of week 10, push week 11. The PRD fixes no push week; freeze-before-push, the two-week shakedown, the 16-week freeze-relative clock, and the freeze+7-month hard stop are all satisfied. Build slippage moves the clock, not the bar.)*

---

## 1. Current architecture (summary)

- **Frontend:** Vite + React 19 SPA; single-file state machine in [App.jsx](../src/App.jsx) (`intro → assessment → refining → results`, plus `loadCode`; `?admin=true`, `?code=` deep links; no router). Three behaviors constrain new work: (a) lines 40–67 read `?code=`/localStorage on mount; (b) lines 75–81 persist `code` whenever code+params are set; (c) lines 84–96 rewrite the URL on results. **The assessment flow is two-stage:** `handleAssessmentComplete` (106–140) computes base params, then optionally runs a seconds-to-30s LLM refinement producing a second code; the user can skip; errors fall back to base.
- **Session identity:** a UUIDv4 minted on first app load, stored at localStorage `ll-session-v1`, no expiry. This is the `session_id` used everywhere below.
- **Params/encoding:** 17 questions → 13 params ([paramCompute.js](../src/data/paramCompute.js), partial-answer-tolerant); params ↔ 21-char `L2_` code ([encoding.js](../src/data/encoding.js)). Any 13-byte payload decodes — code validity is a format check, not proof of humanity.
- **Terrain:** [fieldGenerator.js](../src/terrain/fieldGenerator.js) is pure JS, importable server-side; feature positions are param-dependent, label overlay is DOM-based with fixed positions.
- **Backend:** 4 Vercel functions; Supabase `reading_sessions` + `submissions` + anon aggregate RPCs; `vercel.json` currently has only `functions.maxDuration` (this spec adds rewrites + `includeFiles`).
- **Known deficiencies fixed, not inherited:** webhook verifies Stripe signatures but has no idempotency (live double-grant bug); AdminDashboard's gate is a cosmetic client-side hash; no tests, no analytics, no auth.

---

## 2. Architecture decisions

### AD-1: Share pages serve the SPA shell with injected OG tags; dedicated one-shot `sharedView`

`vercel.json`: rewrite `/r/:slug → /api/share?slug=:slug`; `functions["api/share.js"].includeFiles: "dist/index.html"`. The function looks up the slug (public rows only) and returns `dist/index.html` with OG/Twitter meta injected (image → AD-2; static title/description — **no user text**) plus `window.__SHARE__ = { slug, code }`.

**SPA behavior:** `__SHARE__` is **consumed one-shot** (read then deleted) and **takes precedence over `?code=`**. The app enters a dedicated `sharedView` screen rendering the shared landscape read-only from its own prop — owner `code`/`params` state is never set, and the localStorage-persistence and URL-rewrite effects are additionally gated to owner screens. `share_page_view` fires on `sharedView` mount (client-fired; JS execution is the crawler filter — no server pixels exist anywhere). **The CTA ("Take the assessment") first does `history.replaceState(null, '', '/')`** — the pathname leak fix: without it, the visitor finishes the assessment still on `/r/slug`, the owner-screen URL-rewrite appends their code to the *original owner's* share path, and mid-assessment refreshes re-serve `__SHARE__` and re-fire `share_page_view`, inflating D's denominator asymmetrically. The CTA sets an in-memory `from='share'` flag tagging the next `assessment_start` (no query param). "Compare with mine" (visitors with a saved result) records a compare milestone tagged `source='share'`.

**Errors:** unknown/unpublished/deleted slug → **410** (share and og alike) with a take-the-assessment page. All interpolation HTML-escaped.

### AD-2: OG images — server-rendered contour art, no per-feature labels

`api/og.js` (`/api/og/:slug.png`): slug → code (public only) → marching-squares contour bands (5–6 levels, 100×100 field via shared fieldGenerator) → 1200×630 SVG → PNG via `@resvg/resvg-js` (**napi native binary** — verify Vercel's tracer bundles the linux-x64 artifact in the first F0.3 spike; fallback `@resvg/resvg-wasm`). `Cache-Control: public, s-maxage=86400` (24h post-unpublish staleness, disclosed in consent copy). Image = contour art + wordmark + fixed tagline; **one bundled OFL font via `fontBuffers`** (serverless has no system fonts — without this resvg renders no text). No feature labels: positions are param-dependent and flip polarity; static labels are a collision generator and illegible at preview size.

### AD-3: Auth — Supabase email OTP, paid email, abuse-capped

`signInWithOtp` + `verifyOtp({type:'email'})`, 6-digit code typed in-app (deviation 2). **The default Supabase template sends a link — customize it to emit `{{ .Token }}`.** Email: **Resend paid ($20/mo) from push** (Postmark free = 100/mo, Resend free = 100/day — both disqualified by launch-spike arithmetic); SPF/DKIM on the domain; deliverability tested pre-push (the S0.3 fake-door early-access email doubles as domain warm-up). UX shows the 60s resend cooldown. **OTP-send abuse control (new):** enable Supabase Auth captcha (Cloudflare Turnstile) **on auth endpoints only** — the assessment funnel itself stays challenge-free — plus Supabase auth rate limits configured; otherwise an attacker can burn the Resend quota and torch the fresh domain's sending reputation in launch week (an E/H outage in disguise). Weekly cron purges auth users with no `profiles` row older than 7 days (abandoned verifications). `otp_sent`/`otp_verified` diagnostic events make abandonment visible.

### AD-4: Gate metrics — append-only milestones + a claims join; person resolution at read time

- **`milestones` is truly append-only.** No re-key UPDATE exists (v3's design — round 3 showed it races queue flushes and sweeps shared-device partners). The single exception is the deletion-anonymization pass (below), enforced by revoking UPDATE from every role except the deletion function.
- **Rows:** `{ occurred_at (server receipt), happened_at (client-supplied, bounded: server rejects happened_at > receipt or older than 30 days), kind, person_key, client_result_id (nullable), meta, is_dev }`. Kinds: `create, publish, signup, waitlist_join, purchase, compare`. `meta` carries only gate needs (`status` + `variant` on create; `source` on compare). **Gate SQL windows on `happened_at`** — a retry-queue flush after freeze cannot leak shakedown completions into the gate window, and B's weekly trend reflects when things happened, not when they synced (the velocity anomaly check uses `occurred_at` and is documented as flush-aware).
- **Idempotency:** a milestone is written **only when its state change actually happens** — for creates, only when the `results` upsert *inserts*; a partial unique index on `(kind, client_result_id) WHERE kind='create'` backstops replays. Publish/waitlist/purchase milestones key off their own first-transition guards (`first_published_at` set-once; waitlist UPSERT writes a milestone only on insert; `stripe_session_id` uniqueness).
- **Person resolution (read time, via `claims`):** `claims (client_result_id PK, user_id, claimed_at)`. A create's person = `claims.user_id` if claimed else `person_key`; result-anchored milestones (publish/purchase/compare with a result) resolve the same way; `signup`/`waitlist_join` are user-keyed at write. **Result-scoped claims fix the shared-device case:** claiming your results never sweeps your partner's (round-3 finding); a late queue flush is harmless (its `client_result_id` is already in `claims` and resolves correctly) — the v3 person-splitting race is gone structurally.
- **E's linkage (round-3 fix):** any inline OTP verification performed *in context of a current result* (the waitlist join flow, the save-your-landscape flow) **implicitly claims that one result** — unambiguous, single-result, no sweep. The explicit checkbox claim UI handles historical results. E is therefore computable: persons in A whose create resolves to a user with a `signup` milestone.
- **Residual identity biases, stated in the freeze artifact:** a never-logged-in second device double-counts one human (slightly inflates A); a shared device where neither partner signs up merges two humans (slightly deflates A, may misattribute one `status`). Not fingerprint-solvable within the privacy posture; small at Phase 0 scale.
- **Client events** (`journey.js` → `api/sync.js`; flush at 10 events/5s/page-hide) remain diagnostics-only. Bias statement: event metrics undercount under blockers — conservative for D (both terms client-fired; bias ≈ cancels); **F is inflated under blockers** (functional numerator ÷ event denominator) and is read against the shakedown block-rate estimate.
- **Anomaly review at gate (decided now, not at freeze):** velocity (occurred_at, flush-aware) + IP-concentration checks + raw daily series to advisors. The code-distribution check is **cut** — its reference distribution isn't budgeted, and an unbuilt check stays out of the §9 evaluation description.

### AD-5: Results are stored as codes, not columns

`results.code TEXT` carries the full L2 serialization; no param columns exist outside the consented research pipeline. One serialization to maintain; public pages and OG rendering decode on demand.

### AD-6: Premium SKU — idempotent payments first, defined product, pair report included

- **Webhook idempotency in F0.0**, behind `WEBHOOK_V2` env flag (instant rollback on a live payment path): `stripe_events` insert-first dedup. Fixes the existing credits double-grant.
- **Product:** the $12 Full Reading is a ~2,500–3,500-word structured document — overview; 13 parameters in 4 thematic groups; growth edges; conversation starters; **optional pair-compatibility section** when the buyer attaches a saved comparison (PRD F0.4 scope). Free reading stays ≤300 words narrative. "Regenerate" button, `regen_count ≤ 3`.
- **Flow:** generalized `api/checkout.js` (`{sku, resultId, sessionId|userId}`); webhook upserts `purchases`; generation on first entitled `api/reading.js` request (JWT or owner_token), cached; failure → free retry; >48h broken → manual refund (`docs/payments-runbook.md`); `charge.refunded` consumed → access revoked. **Lost-token recovery:** locate the purchase by the `stripe_session_id` on the buyer's Stripe receipt; runbook line.
- Credits grandfathered read-only; BYO-key readings stay free.

### AD-7: A/B — deterministic hash, kill switch, audited override

`variant = fnv1a(session_id) % 2` (0 = control). Kill switch `VITE_FORCE_VARIANT`. `?variant=` is consumed by `journey.js` at init — read, applied, stripped via `history.replaceState` **before** App.jsx's mount effects — and sets the local `ll-dev` flag. (Same init hook consumes `?src=` from content pages — see F0.6.)

**Dev exclusion, two mechanisms (round-3 disconnect fixed):** (1) founder traffic: header `X-LL-Dev: <DEV_SECRET>` or IP ∈ `DEV_IPS` → `is_dev` server-side; (2) self-declared: when local `ll-dev` is set, the client sends `is_dev: true` in bodies — trivially spoofable, but it can only *exclude* traffic from the gate, so spoofing is self-defeating. Both recorded in the freeze artifact.

### AD-8: Anonymous data plane — `api/results.js`, best-effort create with a durable full-payload queue

**The results screen always renders locally; the create write is required-for-features, not required-for-render.** An outage costs telemetry, never user experience; the undercount (completers whose eager write failed and who never touched a feature) is conservative and bounded by the queue.

- **Create:** fired once, when final params settle (post-refine / post-skip / immediately if no refinement). Body: `{ client_result_id (UUID minted at assessment start — idempotency key), code, status, variant, completed_at }`. Server: **upsert on `client_result_id`; on conflict, incoming fields are ignored (write-once `status` cannot be overwritten through the back door) and the response returns the existing row; the create milestone is written only when the upsert inserts.** Response `{ result_id, owner_token }`. Failure → exponential backoff, then a **durable localStorage queue entry holding the full create payload** (so a later flush is byte-identical — there is no degraded, status-less create path; round-3's H-inflation hole is closed by construction). Queue TTL 30 days; cleared on account deletion.
- **No phantom creates:** loaded partner codes never mint `results` rows; publish/purchase require an owned result; waitlist joins are **rejected server-side unless the person has a create** (flush-first contract — this makes H's numerator ⊆ denominator structural, not aspirational). Feature calls flush the pending queue entry first; if the flush fails, the feature shows "couldn't sync — retry," the one place render-never-blocks cannot apply (features need the row; stated).
- **Client ownership store `ll-results-v1`:** `[{ client_result_id, result_id, code, owner_token, status, variant, completed_at, created_at, label? }]`.
- **Ops on one endpoint (`op` in body):** `create` (above) · `update` `{result_id, owner_token|JWT, fields:{label?, is_public?}}` — status is not updatable · `claim` `{tokens:[≤20]}` — **JWT required; user_id from the verified token, never the body**; per-result checkbox UI (label + date + status chip — no terrain thumbnails; round-3 budget cut); already-claimed rows skipped and reported; claimed rows get `user_id` set, `owner_token` invalidated (bearer window ends), and a `claims` row written per result · `compare` `{partner_code}` → milestone with `partner_code_hash` only · `signup` — called by the client after `verifyOtp` (JWT): creates the `profiles` row, writes the `signup` milestone, and performs the implicit single-result claim when a current result is in context (AD-4). Retried like create on failure. (This is the `signup` milestone's author — it was unauthored in v3.)
- **Rate limits (fixed UTC daily windows, `rate_counters` buckets `scope:key:YYYY-MM-DD`, atomic increment-and-check RPC):** results 30/day/session, **2,000/day/IP** (CGNAT-safe; rejected writes degrade to the queue); sync 120/day/session; fakedoor 10/day/IP. **Rejection counts are a dashboard panel with an email alert.**
- **Deletion tombstones:** `deleted_sessions (session_id, deleted_at)` written by account deletion; creates from tombstoned sessions are rejected 410 and the client clears its queue — no zombie flush resurrecting data after erasure (round-3 finding).

### AD-9: Admin access

`api/admin.js` (single endpoint, `op` param) fronts `gate_metrics(from,to)`, `funnel_counts(from,to)`, `waitlist_by_city()` — all SECURITY DEFINER, **service-role only, no anon grants** (`waitlist_by_city` especially). Auth: `Authorization: Bearer <ADMIN_TOKEN>` (env secret, constant-time compare), entered in the AdminDashboard funnel tab, held in sessionStorage. The legacy dashboard's client-side hash gate is acknowledged as cosmetic; legacy anon RPCs (aggregates) stay.

---

## 3. Data model

`001b_step0.sql` (Step 0, standalone): `fakedoor_signups (id, created_at, email UNIQUE, city)`; `rate_counters (bucket PK, count, updated_at)` — service-role only.

`002_phase0.sql` (additive only; no destructive DDL in Phase 0):

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_result_id UUID UNIQUE NOT NULL,
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
  slug TEXT UNIQUE,                           -- crypto base58 ×10, retry on collision
  is_dev BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX results_owner_token ON results (owner_token_hash);
CREATE TABLE milestones (                     -- append-only; gate source of truth
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at TIMESTAMPTZ DEFAULT now(),      -- server receipt (anomaly checks)
  happened_at TIMESTAMPTZ NOT NULL,           -- client time, bounded by receipt (gate windows)
  kind TEXT NOT NULL CHECK (kind IN ('create','publish','signup','waitlist_join','purchase','compare')),
  person_key TEXT NOT NULL,                   -- user_id or session_id at write time; immutable
  client_result_id UUID,                      -- set on result-anchored kinds
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_dev BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX milestones_create_once ON milestones (client_result_id) WHERE kind = 'create';
CREATE INDEX milestones_kind_time ON milestones (kind, happened_at);
CREATE TABLE claims (
  client_result_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE comparisons (                    -- saved comparisons: owned user content
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL                  -- retention 24 months; owner-deletable; disclosed
);
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  result_id UUID REFERENCES results(id) ON DELETE SET NULL,
  city TEXT NOT NULL, country TEXT            -- normalized at gate via a reviewed mapping (documented human step)
);                                            -- second join = UPSERT (milestone only on first insert)
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
CREATE TABLE deleted_sessions (session_id UUID PRIMARY KEY, deleted_at TIMESTAMPTZ DEFAULT now());
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

**RLS:** all new tables service-role only; every mutation via API functions. **Append-only enforcement:** UPDATE revoked on `milestones` for all roles; the deletion-anonymization pass runs as a dedicated SECURITY DEFINER function (the sole documented exception).
**Retention:** `events` 12 months, `comparisons` 24 months (monthly Vercel cron).
**Deletion (account):** cascades profiles/results/waitlist/comparisons/claims; purchases keep financial fields with `reading_text` and `session_id` nulled; milestones' `person_key` re-keyed to a hash **salted with a per-deletion random salt that is discarded** (actually irreversible — "anonymous counters" on the privacy page is then a true claim); `deleted_sessions` tombstone written.
**Firewall:** nothing links `submissions` to any table above.

---

## 4. Implementation, requirement by requirement

### S0 — Step 0 (week 0; standalone)

| Item | Design | Effort |
|---|---|---|
| S0.1 Stripe verification | Runbook: test-mode e2e; one live $1 promo transaction, refunded; live webhook + price config documented. | 3–4h |
| S0.2 Baseline report | Existing RPCs + blog analytics → `docs/step-0-baseline.md` (opt-in counts flagged as self-selected lower bound). | 2h |
| S0.3 Fake-door | `public/meet.html` + standalone `api/fakedoor.js` + `001b_step0.sql`; one blog/newsletter promo (doubles as email-domain warm-up). | 5–7h |
| S0.4 Advisors | Outreach. | — |

### F0.0 — Hardening & instrumentation (weeks 1–3) — 30–38h

Webhook idempotency (flagged `WEBHOOK_V2`); Vitest (encoding round-trip; persona snapshots; partial answers; webhook replay; results upsert idempotency incl. conflict-ignores-fields and milestone-only-on-insert; rate limits; tombstone rejection); CI; `journey.js` + `api/sync.js`; `api/results.js` (all ops + milestones + queue client); `api/admin.js` + dashboard funnel tab **with the rate-limit-rejection panel + alert**.
*Acceptance:* live transaction verified; dashboard shows milestones + events; CI green; baseline written.

### F0.1 — Accounts (weeks 4–6) — 24–33h

OTP per AD-3 (template `{{ .Token }}`, Resend paid, SPF/DKIM, Turnstile on auth, Supabase auth rate limits, deliverability matrix Gmail/Outlook/iCloud × iOS Safari/Android Chrome/desktop); AuthPanel modal; `signup` op with implicit current-result claim; explicit claim UI (checkboxes: label/date/status chip); abandoned-auth purge cron.
*Acceptance:* signup, selective claim, re-login on the matrix; OTP in inbox; purge observed; implicit claim links create→user (E computable — verified by a test query).

### F0.2 — Persistent profile (week 6) — 8–12h

"My landscapes" (owned results: label/date/open/publish-toggle/delete; saved comparisons: delete). Deletes are content deletes; milestones persist.
*Acceptance:* returning user retrieves everything; deleting a published result 410s its share page within 24h cache staleness.

### F0.3 — Share pages + OG (weeks 7–8) — 26–34h

`api/share.js` (includeFiles) + `api/og.js` (font bundling, contour art, tracer spike first) + `sharedView` (one-shot `__SHARE__`, precedence over `?code=`, CTA `replaceState('/')`, App.jsx effect-gating refactor) + publish dialog with revocability copy (platform caches; 24h image staleness; *codes, once shared, decode forever*).
*Acceptance:* preview matrix (iMessage/WhatsApp/X/Slack); share visit doesn't touch visitor's saved result (regression test); post-CTA refresh does not re-fire `share_page_view` (pathname test); dead slug → 410.

### F0.8 — Dating-intent probe (week 9) — 8–10h

Status screen **immediately after the last question, before the `refining` screen** (abandonment during refine → no create, no result seen; acceptable and noted); write-once, carried on create. Singles see the waitlist card (honest copy); join = inline OTP (with implicit claim) + city → waitlist UPSERT + milestone (insert only) — **server rejects joins from persons with no create** (flush-first contract).
*Acceptance:* status non-null on ≥99% of non-dev creates over shakedown (deviation 4); anonymous-start join works end-to-end; `otp_sent→otp_verified→waitlist_join` funnel visible.

### Cross-cutting (week 9, parallel) — 9–12h

`api/delete-account.js` (JWT; §3 deletion semantics incl. tombstone + queue-clear signal); `public/privacy.html` (stored data, retention, deletion, share revocability, saved-codes disclosure, anonymous-counters claim, research separation); **WA My Health My Data diligence (3h, output `docs/compliance-notes.md`) with a stop-the-line rule: if the conclusion is "applies," freeze and push are delayed, advisors are notified, and the consent-architecture-vs.-scope decision is documented before any launch** — a positive finding is weeks of work, not hours, and pretending otherwise would gut the privacy posture the product claims. US-first: no consent banner; EU push requires an ePrivacy consent gate first.

### Week 10 — freeze prep — 14–20h

Shakedown review; **`gate_metrics()` + `funnel_counts()` + `waitlist_by_city()` implementation and the freeze artifact (`docs/phase-0-gate.md`: SQL text, thresholds, bias statement, DEV_SECRET/DEV_IPS, anomaly procedure)** — this is the spec's success condition and now has its own budget line; block-rate estimate from shakedown (create milestones vs. `assessment_complete` events); bugfix.
**→ Freeze: end of week 10. Push: week 11. Gate: freeze + 16 weeks. Hard stop: freeze + 7 months.**

### F0.4/F0.5 — Premium SKU (weeks 11–14, post-push; G diagnostic) — 20–26h

Per AD-6. *Acceptance:* production purchase e2e; forced-failure retry; pair section renders with an attached comparison.

### F0.7 — Progressive assessment (weeks 14–16) — 10–14h

Per AD-7. *Acceptance:* A/B live; completion by variant on dashboard; override strips itself and dev-flags.

### F0.6 — Content seed (writing weeks 8–14; pages live 11–14) — 8h eng + ~20h writing

13 explainer pages via `scripts/build-learn.js` → static `dist/learn/*.html`; inline snippet posts `content_page_view` to `api/sync.js` (no journey.js import); **attribution (round-3 fix): learn-page CTAs link with `?src=learn-<slug>`, consumed and stripped by journey.js at init (the AD-7 hook), tagging the next `assessment_start` with `props.src`** — PRD F0.6's "attributed starts" criterion is now actually measurable. First 5 at push, all 13 by week 14 (deviation 3).

---

## 5. Gate-metric mapping (PRD §9 → committed SQL)

`gate_metrics(from,to)` — service-role; SQL committed to `docs/phase-0-gate.md` at freeze. Windows on `happened_at`; `is_dev` excluded; **person(create) = claims.user_id if claimed else person_key**; signup/waitlist are user-keyed.

| Metric | Source | Definition |
|---|---|---|
| A | milestones | persons with a `create` in window (deviation 1) |
| B | milestones | weekly A (happened_at), final 6 weeks |
| C | milestones | persons in A with `publish` ∪ `compare` ÷ A — actions, not proven reach; D is the reach cross-check |
| D | events | `assessment_start[from=share]` ÷ `share_page_view` (both client-fired; bias ≈ cancels; refresh-inflation removed by the AD-1 pathname fix) |
| E | milestones + claims | persons in A whose create resolves to a user with `signup` ÷ A |
| F | events + milestones | create persons ÷ `assessment_start` persons, by variant — **inflated under blockers; read with the shakedown block-rate estimate** |
| G | milestones | persons in A with `purchase` ÷ A |
| H | milestones | `waitlist_join` persons ÷ persons with create-meta `status='single'` — numerator ⊆ denominator is server-enforced (AD-8 flush-first) |
| I | milestones + waitlist | singles ÷ A (denominator = all completers, per PRD); national waitlist count; per-metro via reviewed city normalization |

**Bias statement (frozen):** milestone metrics are append-only, churn-immune, windowed on client-true time bounded by receipt; residual identity biases per AD-4; event metrics undercount under blockers (conservative except F, flagged); fraud is rate-limited, dev-excluded, and reviewed by velocity (flush-aware) + IP-concentration checks with raw daily series to advisors.

## 6. Security & privacy

Service-role-only tables; JWT for owned rows; hashed, indexed, claim-invalidated owner tokens; JWT-only claims with explicit per-result selection; no user text on public surfaces; escaping everywhere; crypto slugs; 410s. Payments: signatures + `stripe_events` + unique session ids; refunds consumed. Rate limits with rejection monitoring; CORS restricted to `PUBLIC_ORIGIN`; Turnstile on auth only. Dev exclusion per AD-7. Privacy: three separate opt-ins; research firewall; retention (events 12mo, comparisons 24mo, queue TTL 30d); deletion with tombstones, reading-text nulling, and per-deletion-salt anonymization; **known plaintext-at-rest caveat:** the retry queue holds `{code, status}` in localStorage (as the saved result's code already is today) — disclosed in the privacy page; WA MHMDA stop-the-line rule; EU = consent gate first.

## 7. Sequencing and effort budget

| Weeks | Work | Hours |
|---|---|---|
| 0 | Step 0 | 10–13 |
| 1–3 | F0.0 | 30–38 |
| 4–6 | F0.1 + F0.2 | 32–45 |
| 7–8 | F0.3 | 26–34 |
| 9 | F0.8 + cross-cutting | 17–22 |
| 10 | Freeze prep (incl. gate SQL + artifact) | 14–20 |
| 8–10 | F0.6 writing landing pre-push | ~10 |
| **Pre-push total (weeks 0–10 = 11 calendar weeks)** | | **~139–182h ≈ 13–17 h/wk** |
| 11 | **Push** | — |
| 11–14 | F0.4/F0.5 | 20–26 |
| 14–16 | F0.7 | 10–14 |
| 8–14 | F0.6 (8h eng + remaining ~10h writing) | 18 |
| **Total** | | **~187–240h** |

**Stated plainly: the pre-push path exceeds the PRD's 10–15 h/wk envelope at the midpoint.** The plan is honest about the consequence, not the arithmetic: at a realistic 10–12 h/wk, freeze lands week 12–13 instead of 10 — fully legal under the PRD's freeze-relative clock, and strictly better than pushing a half-built funnel. Post-push work touches only diagnostic metrics.

**Costs from push:** Vercel Pro $20 + Supabase Pro $25 + Resend $20 + domain/misc ~$10 ≈ **$75–95/mo** + LLM inference — inside the PRD envelope.

## 8. Testing & CI

Vitest: encoding; personas; partial answers; webhook replay; create upsert idempotency (conflict ignores fields; milestone only on insert); tombstone rejection; rate limits; journey allowlist; sharedView effect-gating and pathname-reset regressions. GitHub Actions test+build. Manual matrices: OG previews; OTP deliverability/devices; production purchase. Rollback: `WEBHOOK_V2` flag; additive-only migrations.

## 9. Launch plan (push, week 11)

Blog post; fake-door list gets first access (its conversion vs. F0.8's live numbers reported at gate); share pages + status probe + waitlist live day one; social calendar = terrain art + one explainer/week; 2–3 communities with mod permission.

## 10. Environment & config inventory

New: `STRIPE_PRICE_FULL_READING`, `ADMIN_TOKEN`, `PUBLIC_ORIGIN`, `DEV_SECRET`, `DEV_IPS`, `WEBHOOK_V2`, `VITE_FORCE_VARIANT`, Resend/SMTP (Supabase Auth), Turnstile keys (Supabase Auth), Vercel cron entries (retention purges; abandoned-auth purge). Existing vars documented in the S0.1 runbook. `vercel.json`: `/r/:slug` and `/api/og/:slug.png` rewrites; `includeFiles` for `api/share.js`.

## 11. Open technical questions

1. Vercel tracer × `@resvg/resvg-js` native binary — first F0.3 spike; fallback `@resvg/resvg-wasm`.
2. Contour band count/palette for legible 1200×630 art — design iteration inside F0.3.
3. Whether Turnstile on Supabase auth meaningfully dents inline-waitlist conversion — watch the `otp_sent→verified` funnel during shakedown; if it does, the trade (quota protection vs. H friction) goes to the advisors with the freeze artifact.
