# Phase 0 Implementation Spec — Viral Assessment + Intent Probe

**Status:** Draft v2 (post adversarial-review round 1) · July 2026
**Parent document:** [dating-app-pivot-PRD.md](./dating-app-pivot-PRD.md) (v4) — implements Step 0, F0.0–F0.8, and the §9 gate instrumentation.
**Resourcing envelope (from PRD):** one founder, ~10–15 hrs/wk, ~$100–200/mo, LLM-assisted development.

---

## 0. Purpose, scope, non-goals

**Purpose:** ship the Phase 0 experiment — accounts, persistent results, shareable public result pages, a one-time premium reading SKU, progressive assessment, the dating-intent probe, and instrumentation that makes the PRD §9 gate evaluable.

**Non-goals (hard):** photos, matching, messaging, native apps, push notifications, framework migration (the Vite SPA stays), terrain-engine redesign, any use of the research-consented `submissions` table for commercial features (PRD §6 firewall).

**Success condition:** at gate date, every §9 metric is computable by one committed SQL function over first-party data, with known and stated bias direction.

**Named deviations from the PRD** (per its governance posture, deviations are declared, not silent):
1. *Public push moves from week 6 to week 9.* The PRD's clock starts at threshold freeze, which this spec places at end of week 8 — after the full gating funnel (share pages, status probe, waitlist) is shipped and shaken down. Rationale: pushing before the intent probe exists would depress gate metrics H/I mechanically (round-1 adversary finding).
2. *F0.6 pages land by week 12, not week 8* (first five by week 10). Consequence of deviation 1; content's in-window role is social/launch material — SEO cannot index and compound inside a 16-week window and is not counted on.
3. *(Resolved)* PRD F0.3 says "server-rendered OG terrain image"; v1 of this spec chose client capture; v2 returns to server rendering (AD-2) — no deviation remains.

---

## 1. Current architecture (summary)

- **Frontend:** Vite + React 19 SPA; single-file state machine in [App.jsx](../src/App.jsx) (`intro → assessment → refining → results`, plus `loadCode`; `?admin=true`, `?code=` deep links; no router). App.jsx rewrites `url.searchParams` on mount and on results display — any new query params must be audited against lines 40–96.
- **Params/encoding:** 17 fixed questions → 13 params ([paramCompute.js](../src/data/paramCompute.js) — already tolerates partial answer maps, defaulting unanswered to 0.5); params ↔ ~21-char `L2_` code ([encoding.js](../src/data/encoding.js)) — the code IS the serialized result.
- **Backend:** 4 Vercel functions (`chat`, `credits`, `checkout`, `webhook`); Supabase `reading_sessions` + `submissions` + aggregate RPCs (all `GRANT EXECUTE TO anon`); RLS: anon INSERT on submissions only.
- **Known deficiencies this spec must fix, not inherit:** `api/webhook.js` has correct Stripe signature verification but **no idempotency** (re-delivered events double-grant; unkeyed read-modify-write). AdminDashboard's "auth" is a client-side SHA-256 gate against a hash of the literal password `password`, shipped in the public bundle — it is cosmetic. Terrain labels are DOM overlays ([labelOverlay.js](../src/terrain/labelOverlay.js)), not WebGL content. No tests, no analytics, no auth.

---

## 2. Architecture decisions

### AD-1: Share pages serve the SPA shell with injected OG tags — no redirect

`vercel.json` rewrite `/r/:slug → /api/share`. The function loads the result by slug (public rows only), reads the built `dist/index.html`, and returns it with (a) OG/Twitter meta tags injected into `<head>` (image → AD-2 endpoint; title/description generic and static — **no user-provided text**), and (b) a `window.__SHARE__ = { slug, code }` bootstrap script. The SPA, on seeing `__SHARE__`, renders the shared landscape directly and fires `share_page_view` (client-side — JS execution is the crawler filter; no server pixel exists) and tags any subsequent `assessment_start` with `props.from='share'` in memory (no query param involved — immune to App.jsx's URL rewriting).

Crawlers get valid OG tags from the HTML; humans get the app at the same URL with no redirect. Share-page loads never touch the `?code=` partner-compare path, so they cannot contaminate `partner_code_load` (round-1 metric-C fix).

**Error paths:** unknown/unpublished/deleted slug → 410 page ("this landscape is no longer shared") with a CTA into the assessment; `api/share.js` HTML-escapes every interpolated value as a matter of course even though no user text is emitted.

*Rejected:* meta-refresh redirect shell (v1) — crawlers don't need it, humans lose attribution to URL rewriting, and Google canonicalizes away the share page.

### AD-2: OG images are server-rendered 2D composites, deterministic per code

`api/og.js`, routed as `/api/og/:slug.png`: look up code by slug (public rows only) → decode params → generate a stylized 2D contour composite (marching-squares bands at 5–6 elevation levels over the same 100×100 Gaussian field, computed by importing [fieldGenerator.js](../src/terrain/fieldGenerator.js) — pure JS, portable) → build a 1200×630 SVG (a few hundred path elements + static label positions from [constants.js](../src/terrain/constants.js) + brand frame) → rasterize with `@resvg/resvg-js` → PNG, `Cache-Control: public, s-maxage=86400`.

Properties: no client capture, no upload, no Storage bucket, no publish-time failure mode, labels included (from the same constants the DOM overlay uses), identical quality regardless of the publishing device, and unpublish = slug lookup fails → 404 (CDN staleness bounded at 24h, disclosed in consent copy).

*Rejected:* client canvas capture (v1) — labels are DOM overlays and would be missing; mobile capture is upscaled and blurry; anonymous Storage upload is an abuse surface; `preserveDrawingBuffer` cost. The 2D composite is a deliberate aesthetic (a "map" of the terrain), not a degraded 3D shot.

### AD-3: Auth is Supabase email OTP (6-digit code), custom SMTP from day one

`signInWithOtp` + `verifyOtp` with a 6-digit code typed into the app — **not** a magic link: mobile magic links open in mail-app webviews or a different browser, orphaning localStorage results and breaking the PKCE exchange; OTP keeps the whole flow in the browser that holds the data (round-1 finding). Google OAuth deferred until funnel data demands it.

**Custom SMTP is a pre-push prerequisite, not an option:** Supabase's built-in sender is ~2 auth emails/hour and not for production. Provider: Resend or Postmark (free tier suffices at Phase 0 volume), with SPF/DKIM on the app domain. Budgeted in F0.1.

### AD-4: Gate metrics derive from functional writes; events are diagnostics

Round 1 established two attacks on event-based gating: ad blockers (the audience plausibly blocks 25–40% of analytics calls; EasyPrivacy blocks `/track` paths by name) and spoofing (curl + rotating session_ids inflates absolute-floor metrics). v2 principle:

- **Gating metrics (A, C, E, H, I) derive from functional server writes** — tables the product requires to work, which blockers do not block and which carry validation:
  - **A** = `results` rows created (every assessment completion POSTs its result — see AD-8; the write requires a *decodable L2 code*, and the results screen renders from the server response, making the write functionally load-bearing).
  - **C** = results rows with `is_public=true` (publish is a server write) ∪ persons with a saved comparison (`comparisons` write) — both components functional; numerator constrained to persons in A (coherent rate, round-1 fix).
  - **E** = `profiles` rows joined to A-persons.
  - **H, I** = `results.status` + `waitlist` rows — both functional.
- **Diagnostic metrics (B, D, F, G)** and funnel detail use the `events` table (best-effort, client-sent). Known bias: blockers cause **undercount only** — conservative for pass/fail decisions (can cause a false KILL, never a false PASS); stated in the freeze artifact. D's numerator (`from='share'` starts) and denominator (`share_page_view`) are both client-fired, so blocker bias roughly cancels in the ratio.
- **Naming:** the event endpoint is `api/sync.js` and the client module `src/data/journey.js` — no `track`/`analytics`/`telemetry` strings in paths (EasyPrivacy-pattern avoidance; a residual block rate is measured during shakedown by comparing `results` writes vs. `assessment_complete` events, and recorded in the freeze artifact).
- **Abuse resistance for functional writes (`api/results.js`):** payload must contain a valid decodable code; per-IP and per-session Postgres-counter rate limits (`rate_counters` table, atomic upsert, 30/day per session, 100/day per IP — serverless-safe because state lives in Postgres); founder/test traffic excluded via a documented dev flag (localStorage `ll-dev=1` sent as header) plus an IP list committed in the freeze artifact; daily raw counts visible to advisors (anomaly review at gate is part of the §9 evaluation).
- **Honest limit:** a determined adversary can still submit valid codes through the rate limits. Accepted at Phase 0 scale; the gate evaluation includes an anomaly pass (velocity, IP concentration, code-entropy distribution) and the advisors see the raw series.

*Rejected:* PostHog (processor relationship for behavior adjacent to psychological data); anon-key direct INSERT (no validation); in-function token buckets (stateless instances make them decorative).

### AD-5: Results are stored as codes, not columns (unchanged from v1)

`results.code TEXT` carries the L2 serialization; no param columns outside the research pipeline.

### AD-6: Premium SKU replaces credits; webhook made idempotent first

- **Idempotency lands in F0.0** (before any new SKU): `stripe_events (event_id TEXT PRIMARY KEY, processed_at)` — the webhook inserts the Stripe event id first (`ON CONFLICT DO NOTHING`; if conflicted, exit 200), then processes. Fixes the existing double-grant bug for credits too.
- **SKU:** "Full Reading," $12 one-time, per result. `api/checkout.js` generalized: `{ sku, resultId, sessionId | userId }` → Checkout session with `metadata: { sku, result_id, session_id }`, `STRIPE_PRICE_FULL_READING`. Webhook upserts `purchases` (`stripe_session_id` UNIQUE) with status `paid`.
- **Reading generation:** on first entitled request to `api/reading.js` (not in the webhook — webhook stays fast and retry-safe). Request auth: Supabase JWT (owner) **or** the result's `owner_token` (AD-8). Generated via the managed quality model; cached to `purchases.reading_text`; `regen_count ≤ 3`. **Failure path:** generation errors return a retriable state to the client (purchase remains valid; retry is free); if generation still fails after 48h the documented remedy is a manual Stripe refund (runbook in `docs/payments-runbook.md`) — status `refunded` revokes reading access.
- **Refund events:** webhook also consumes `charge.refunded` → status `refunded`.
- **Credits:** existing balances keep working (chat path unchanged) until drained; buy-credits UI removed at F0.4 ship. BYO-key users keep free readings.

### AD-7: A/B via deterministic hash, with a kill switch

`variant = fnv1a(session_id) % 2` (0 = A = control/current, 1 = B = progressive); computed in `journey.js`, attached to all events and to the `results` write. Kill switch: `VITE_FORCE_VARIANT=A` env (build-time) plus a `?variant=A` override for testing (override traffic carries the dev flag and is excluded).

### AD-8: Anonymous data plane — `api/results.js` with bearer owner-tokens

The missing piece flagged unanimously in round 1. One function, four operations (POST create / PATCH update / POST claim / POST compare):

- **Create** (on assessment completion, before results render): body `{ code, status, variant }` → validates code decodes; inserts `results` row; generates `owner_token` (32 random bytes, **stored as SHA-256 hash**, returned once to the client, kept in localStorage alongside the code). Anonymous ownership = possession of the token: bearer semantics, stated plainly.
- **Update** (label, publish/unpublish, status correction): requires `owner_token` (hash-compared) or Supabase JWT with matching `user_id`. Publish assigns the slug (10 chars, base58, crypto-random, retry-on-collision — one canonical definition).
- **Claim** (at signup, F0.1): body = list of owner_tokens → sets `user_id` on matching `results` and `purchases` rows, and inserts into `identities` (below). Second-device sign-in claims nothing but still links identity via the login itself.
- **Compare** (partner code loaded and saved): records a `comparisons` row `{ owner (person), partner_code }` — the functional write behind C's partner-compare component. Loading a code without saving remains client-only (counted only in diagnostics).

**Identity stitching (`identities` table):** `(user_id, session_id, linked_at)` — a row per (login × device session). Written on every successful OTP verification. `gate_metrics()` resolves *persons* as: `user_id` when the session maps to one, else `session_id`; all gate metrics count persons. This is the dedup rule, in the schema, testable.

### AD-9: Admin access via server-verified token, not the client-side hash

New `api/admin.js` (single endpoint, `op` parameter) fronts all new aggregate reads (`funnel_counts`, `gate_metrics`, `waitlist_by_city`): requires `Authorization: Bearer <ADMIN_TOKEN>` (env secret, constant-time compare). The AdminDashboard funnel tab prompts for the token (sessionStorage, never persisted to code). New RPCs are **service-role only — no anon grants**. The legacy dashboard tabs and their anon aggregate RPCs stay as-is (aggregates only, low sensitivity); `waitlist_by_city` is explicitly NOT anon-callable. The `sha256("password")` gate is acknowledged as cosmetic and is removed from the new tab's path.

---

## 3. Data model (`supabase/migrations/002_phase0.sql`; Step 0 ships `001b_step0.sql` with `fakedoor_signups` + `rate_counters` only)

```sql
-- Step 0 (001b_step0.sql)
CREATE TABLE fakedoor_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  city TEXT,
  UNIQUE (email)
);
-- RLS: service-role only. Written by api/fakedoor.js (standalone, no dependency on Phase 0 code).

CREATE TABLE rate_counters (
  bucket TEXT PRIMARY KEY,          -- e.g. 'results:ip:1.2.3.4:2026-07-14'
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: service-role only. Atomic upsert-increment via RPC.

-- Phase 0 (002_phase0.sql)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE identities (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  owner_token_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT,                              -- private; never rendered on public pages
  status TEXT CHECK (status IN ('single','partnered','complicated','prefer-not')),
  variant SMALLINT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  slug TEXT UNIQUE,
  is_dev BOOLEAN NOT NULL DEFAULT FALSE    -- founder/test exclusion flag
);
CREATE TABLE comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID NOT NULL,
  user_id UUID,
  partner_code TEXT NOT NULL
);
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  result_id UUID REFERENCES results(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  country TEXT
);
-- Second join by same user = UPSERT (city/result updated, created_at preserved).
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  sku TEXT NOT NULL DEFAULT 'full_reading',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded')),
  amount_cents INT,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  result_id UUID REFERENCES results(id) ON DELETE SET NULL,
  reading_text TEXT,
  regen_count INT NOT NULL DEFAULT 0
);
CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID NOT NULL,                -- client-only events; no server pixels exist
  user_id UUID,
  name TEXT NOT NULL CHECK (name IN (
    'assessment_start','assessment_complete','results_view',
    'share_page_view','share_page_cta','partner_code_load',
    'signup_start','reading_view','waitlist_view','content_page_view','checkout_start'
  )),
  props JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 1024)
);
CREATE INDEX events_name_created ON events (name, created_at);
```

**RLS:** `profiles` owner-only; `results`/`comparisons`/`waitlist` written exclusively through API functions (service role) — no anon table grants; `purchases`/`events`/`stripe_events`/`fakedoor_signups`/`rate_counters`/`identities` service-role only. New aggregate RPCs (`gate_metrics(from,to)`, `funnel_counts(from,to)`, `waitlist_by_city()`) are SECURITY DEFINER with **no anon grant** — callable only via `api/admin.js` (AD-9). **Retention:** `events` rows older than 12 months are purged (scheduled function); stated in the privacy page.

**Firewall (PRD §6):** nothing links `submissions` to any table above; the research flow is untouched.

---

## 4. Implementation, requirement by requirement

### S0 — Step 0 (week 0; precedes approval; standalone by construction)

| Item | Design | Effort |
|---|---|---|
| S0.1 Stripe verification | Runbook: test-mode purchase → webhook → credits granted; one live $1 promo transaction, refunded (clears Stripe's $0.50 minimum). Live-mode webhook endpoint + price configured and documented. | 3–4h |
| S0.2 Baseline report | Existing RPCs (`get_submission_count`, `get_demographic_breakdown('relationship_structure')`) + blog analytics → `docs/step-0-baseline.md`. Notes explicitly: opt-in submissions are a self-selected lower bound (PRD). | 2h |
| S0.3 Fake-door | `public/meet.html` (static, honest copy) + standalone `api/fakedoor.js` (email+city → `fakedoor_signups`; validates email shape; per-IP rate limit) + `001b_step0.sql`. **No dependency on journey.js/api/sync.js** (round-1 sequencing fix). Promoted via one blog/newsletter post. | 5–7h |
| S0.4 Advisors | Outreach (not engineering). | — |

### F0.0 — Hardening & instrumentation (weeks 1–2)

- **Webhook idempotency rewrite** (AD-6): `stripe_events` dedup + race-safe grant. This fixes a live bug in the credits path and is a precondition for the F0.4 SKU.
- **Tests (Vitest):** encoding round-trip (boundary + random params, L1/L2, malformed rejection); paramCompute snapshots of the 8 personas from [analysis/personas.js](../analysis/personas.js); partial-answer behavior (already supported — tests only, no refactor); webhook idempotency (event replayed twice grants once); `api/results.js` validation (bad codes rejected, rate limits enforced). CI: GitHub Actions (test + build) on push.
- **Instrumentation:** `src/data/journey.js` (session/user/variant attach; batching; sendBeacon on hide) → `api/sync.js` (name allowlist, props cap, rate-limited). `api/results.js` create path (AD-8) wired into `handleAssessmentComplete`.
- **Dashboard:** AdminDashboard funnel tab via `api/admin.js` (AD-9).
- *Acceptance:* live transaction verified; funnel dashboard shows real events + results writes; baseline report written; CI green.
- **Effort:** 22–28h.

### F0.1 — Accounts (weeks 3–5)

- Supabase Auth email OTP (AD-3); custom SMTP (Resend/Postmark) with SPF/DKIM **set up and deliverability-tested first**. `AuthPanel` rendered as a modal over the results screen (entry: "Save your landscape" card; also from intro for returning users). On first verify: `profiles` row; `identities` row; claim call with stored owner_tokens (AD-8).
- *Acceptance:* signup, result claim, and re-login verified on iOS Safari, Android Chrome, desktop; OTP email lands in inbox (not spam) on Gmail/Outlook/iCloud test accounts.
- **Effort:** 20–28h (auth QA and deliverability are the budget, not the API calls).

### F0.2 — Persistent profile (week 5)

- "My landscapes" view (modal/screen off results): list owned `results` (label, date, open, publish toggle, delete), saved `comparisons`. Delete: removes row (slug dies → share 410; OG cache ≤24h staleness).
- *Acceptance:* returning user retrieves every past result and comparison.
- **Effort:** 8–12h.

### F0.3 — Share pages + OG (weeks 6–7)

- `api/share.js` (AD-1) + `api/og.js` (AD-2) + publish flow in ResultsScreen: opt-in dialog with **explicit revocability copy**: "Anyone with the link can view this landscape. Messaging apps may cache the preview image after you unpublish. The landscape code itself, once shared, can be decoded by anyone who has it — unpublishing removes the page, not codes already copied." Publish requires nothing but the owner token (no account needed).
- Marching-squares contour module (`src/terrain/contour2d.js`, shared client/server, pure JS) — also usable later by ContourView.
- *Acceptance:* previews verified in iMessage, WhatsApp, X, Slack (manual matrix); D computable (client-fired view + from-share starts); unknown slug → 410 page.
- **Effort:** 20–26h.

### F0.8 — Dating-intent probe (week 8; gate-critical, before push)

- Status question as its own screen between assessment completion and the results render ("Which best describes you right now?" single / partnered / it's complicated / prefer not to say) — written on the `results` create call (server-side, gate-grade). PRD ordering honored: before any results are shown.
- Singles see a waitlist card on results: honest copy ("we're exploring introductions between compatible landscapes — nothing exists yet; joining = telling us you'd want it"); join flow = inline OTP auth (if anonymous) + city field → `waitlist` upsert.
- *Acceptance:* status present on >90% of new `results` rows (screen is unskippable except "prefer not"); waitlist join works end-to-end from an anonymous session.
- **Effort:** 8–10h.

**→ Threshold freeze: end of week 8 (full gating funnel live + shaken down). Public push: week 9. Gate: freeze + 16 weeks. Hard stop: freeze + 7 months. (PRD clock rules; deviation 1.)**

### F0.4 / F0.5 — Premium SKU (weeks 9–12, post-push; G is diagnostic, not gated)

- Per AD-6: generalized checkout, idempotent webhook (already done in F0.0), `api/reading.js` with owner-token/JWT auth, retriable generation, refund handling, credits UI removal.
- *Acceptance:* end-to-end purchase in production; paid-generation-failure path tested (forced LLM error → retry succeeds; refund runbook written).
- **Effort:** 18–24h.

### F0.7 — Progressive assessment (weeks 12–14)

- Variant B (AD-7): live mini-terrain preview after question 5 (existing fieldGenerator on partial params). Kill switch per AD-7.
- *Acceptance:* A/B live; completion rate by variant on the dashboard; forced-variant override works and is dev-flag-excluded.
- **Effort:** 10–14h.

### F0.6 — Content seed (writing from week 6; pages live weeks 9–12)

- 13 static explainer pages (`/learn/<param-slug>`), generated at build time by a script (`scripts/build-learn.js`) from markdown sources into `dist/learn/*.html` (static for crawlers, `content_page_view` tracked, CTA into the assessment, cross-linked from ResultsScreen parameter labels).
- First 5 live at push (week 9), all 13 by week 12 (deviation 2). SEO explicitly not counted on in-window; the pages are the social/launch calendar.
- *Acceptance:* pages served statically; attributed starts reported at gate (diagnostic).
- **Effort:** 8h engineering + ~20h writing (interleaved weeks 6–12).

### Cross-cutting: account deletion & privacy page (week 7, small)

- `api/delete-account.js` (JWT-required): deletes auth user (cascades `profiles`/`identities`/`results`/`waitlist`), anonymizes `purchases` (keep financial record, null user linkage), leaves `events` (12-month purge handles them; no PII in props). UI entry in AuthPanel.
- `public/privacy.html`: what's stored, retention (events 12mo), deletion path, the share-revocability caveat, and the research-data separation. US-first launch: no consent banner is required for first-party analytics under current US rules; **if an EU push happens, an ePrivacy consent gate must precede it** — recorded as a §8 constraint, not solved silently.
- **Effort:** 6–8h.

## 5. Gate-metric mapping (PRD §9 → committed SQL)

`gate_metrics(from, to)` — service-role RPC; its SQL text is committed to `docs/phase-0-gate.md` at freeze with the thresholds and the founder-exclusion list (dev flag + IPs). *Persons* = `identities`-resolved (AD-8); all `is_dev` rows and dev-flagged sessions excluded.

| Metric | Source (kind) | Definition |
|---|---|---|
| A — completions | `results` (functional) | persons with ≥1 results row in window |
| B — growth trend | `results` (functional) | weekly A, final 6 weeks |
| C — share-or-compare | `results.is_public` + `comparisons` (functional) | persons in A with (published result ∪ saved comparison) ÷ A; components reported split |
| D — share page → start | `events` (diagnostic) | `assessment_start[from=share]` ÷ `share_page_view`, both client-fired (blocker bias ≈ cancels) |
| E — accounts | `profiles` × A (functional) | persons in A with a profile ÷ A |
| F — completion rate | `events` + `results` | results-create persons ÷ `assessment_start` persons; by variant |
| G — premium attach | `purchases` (functional) | persons in A with a paid purchase ÷ A |
| H — waitlist among singles | `waitlist` + `results.status` (functional) | waitlist persons ÷ persons in A with status='single' |
| I — intent validity | `results.status` + `waitlist` (functional) | singles ÷ A (denominator = completers, per PRD — status-missing rows count in the denominator); national waitlist count; per-metro via `waitlist_by_city()` |

Bias statement (frozen with the artifact): functional metrics are exact up to deliberate fraud (rate-limited, anomaly-reviewed); event metrics undercount under blockers — conservative direction only. Shakedown measures the residual block rate (`assessment_complete` events ÷ results writes).

## 6. Security & privacy

- **Write path:** all new tables service-role only; every mutation goes through an API function with validation; anon key can write nothing new. Bearer `owner_token` (hashed at rest) authorizes anonymous mutations; Supabase JWT authorizes owned rows.
- **`api/share.js`/`api/og.js`:** no user text emitted (labels are private by schema comment and by §4 F0.3 copy); all interpolation escaped anyway; slugs unguessable (crypto base58, 10 chars ≈ 58^10).
- **Payments:** signature verification (existing) + `stripe_events` idempotency (F0.0) + `stripe_session_id` uniqueness; refund webhook consumed.
- **Rate limiting:** Postgres counters (serverless-safe), per-session and per-IP, on `results`, `sync`, `fakedoor` endpoints.
- **CORS:** all new endpoints restrict `Access-Control-Allow-Origin` to the deployed origin (env-derived; preview deployments use the preview URL env). Existing endpoints tightened in F0.0.
- **Admin:** `ADMIN_TOKEN` bearer on `api/admin.js` (constant-time compare); no new anon RPC grants; `waitlist_by_city` never anon-callable. (Legacy cosmetic dashboard gate acknowledged; legacy anon RPCs are aggregates and stay.)
- **Consent boundaries:** publish, waitlist, and research contribution remain three separate opt-ins; research `submissions` untouched and unlinked.

## 7. Sequencing and effort budget

| Weeks | Work | Hours |
|---|---|---|
| 0 | Step 0 | 10–13 |
| 1–2 | F0.0 (incl. webhook rewrite, CI) | 22–28 |
| 3–5 | F0.1 (incl. SMTP), F0.2 | 28–40 |
| 6–7 | F0.3, deletion + privacy page | 26–34 |
| 8 | F0.8; **freeze** | 8–10 |
| 9 | **Public push** | — |
| 9–12 | F0.4/F0.5; F0.6 pages live | 26–32 |
| 12–14 | F0.7 | 10–14 |
| 6–12 | F0.6 writing (interleaved) | 20 |
| — | Slack/bugfix (~15%) | 22–28 |
| **Total** | | **~172–219h** |

Pre-push critical path (Step 0 → F0.8) is ~94–125h across 8 calendar weeks → 12–16 h/wk: **at the top of the PRD envelope; stated, not hidden.** If actual pace is 10 h/wk, freeze slips to week 10–11 — acceptable (the PRD clock starts at freeze; the hard stop is freeze-relative). Post-push work (F0.4–F0.7) rides inside the measurement window and only touches diagnostic metrics.

**Infra costs (monthly, from push):** Vercel Pro $20 (Hobby prohibits commercial use — required, not optional), Supabase Pro $25 (free tier pauses after 7 idle days), SMTP $0–15, domain/misc ≈ $10, LLM inference variable. ≈ **$55–90/mo** — inside the PRD's $100–200 envelope.

## 8. Testing & CI

- Vitest: encoding, paramCompute personas, partial answers, webhook idempotency, results-create validation, rate-limit behavior, journey.js name allowlist.
- GitHub Actions: test + build on push; Vercel git deploys.
- Manual matrices per release touching the area: OG previews (iMessage/WhatsApp/X/Slack), OTP auth (iOS Safari/Android Chrome/desktop; Gmail/Outlook/iCloud deliverability), production purchase.

## 9. Launch plan (public push, week 9)

1. Blog post ("your relationship has a shape") linking the assessment; fake-door list (S0.3) gets first access — it converts into the real funnel and its intent prior is compared against F0.8's live numbers.
2. Share pages, status probe, and waitlist live from day one of the push (guaranteed by the week-8 freeze ordering).
3. Social: terrain OG images + one parameter explainer per week (F0.6 calendar).
4. Communities: 2–3 relevant spaces with mod permission — no astroturfing.

## 10. Environment & config inventory (new)

| Var | Where | Purpose |
|---|---|---|
| `STRIPE_PRICE_FULL_READING` | Vercel | F0.4 price id |
| `ADMIN_TOKEN` | Vercel | api/admin.js bearer secret |
| `PUBLIC_ORIGIN` | Vercel | CORS + share URL base |
| `SMTP_*` (per provider) | Supabase Auth settings | OTP email delivery |
| `VITE_FORCE_VARIANT` | Vercel (build) | F0.7 kill switch |
| Existing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` (legacy credits), `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MANAGED_MODEL_FAST/QUALITY`, `VITE_PUBLIC_URL` | Vercel | documented in S0.1 runbook |

## 11. Open technical questions (reduced)

1. `@resvg/resvg-js` cold-start latency in a Vercel function (wasm init) — measure; if >1.5s, pre-render PNGs at publish time into Supabase Storage *from the server* (keeps AD-2's determinism; adds storage but not client upload).
2. Marching-squares band count/styling for legible 1200×630 output — design iteration budgeted inside F0.3.
3. Whether the `?variant=` override should survive to production builds or be dev-only.
