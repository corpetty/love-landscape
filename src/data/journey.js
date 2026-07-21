/**
 * journey.js — session identity, A/B variant, and diagnostic event batching.
 *
 * Design notes (docs/phase-0-spec.md AD-4/AD-7):
 * - Events are best-effort diagnostics; server-truth funnel data comes from
 *   api/results.js milestones. Ad blockers can only cause undercount here.
 * - initJourney() must run before React mounts: it consumes and strips
 *   ?variant= and ?src= from the URL before App.jsx's own URL effects run.
 * - No 'track'/'analytics'/'telemetry' strings in module or endpoint names.
 */

const SESSION_KEY = 'll-session-v1';
const DEV_KEY = 'll-dev';
const VARIANT_OVERRIDE_KEY = 'll-variant-override';
const UTM_KEY = 'll-utm-v1';

// Campaign attribution fields we persist. First-touch: the first campaign link a
// device lands on is credited, and rides along until the assessment completes
// (which may be minutes and several page views later). Sanitized here AND on the
// server (api/results.js) before it reaches a milestone.
const UTM_FIELDS = ['source', 'medium', 'campaign', 'content', 'term'];
const UTM_VALUE_RE = /^[a-zA-Z0-9_.\-]{1,64}$/;

const FLUSH_MAX_EVENTS = 10;
const FLUSH_INTERVAL_MS = 5000;

let buffer = [];
let flushTimer = null;
let pendingSource = null; // 'share' | 'learn-<slug>' — tags the next assessment_start
let userId = null;

export function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '00000000-0000-0000-0000-000000000000';
  }
}

export function isDev() {
  try { return localStorage.getItem(DEV_KEY) === '1'; } catch { return false; }
}

/**
 * First-touch campaign attribution, or null. Shape: { source, medium, campaign,
 * content, term } (only present fields). Stamped onto client events and the
 * create milestone so the funnel can be split by channel/post.
 */
export function getUtm() {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    if (!raw) return null;
    const utm = JSON.parse(raw);
    return utm && typeof utm === 'object' && Object.keys(utm).length ? utm : null;
  } catch { return null; }
}

// Read utm_* from the URL, keep only clean values; returns null if none present.
function parseUtm(url) {
  const utm = {};
  for (const f of UTM_FIELDS) {
    const v = url.searchParams.get(`utm_${f}`);
    if (v && UTM_VALUE_RE.test(v)) utm[f] = v;
  }
  return Object.keys(utm).length ? utm : null;
}

// FNV-1a over the session UUID; even hash = variant 0 (control).
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function getVariant() {
  const forced = import.meta.env?.VITE_FORCE_VARIANT;
  if (forced === 'A') return 0;
  if (forced === 'B') return 1;
  try {
    const override = localStorage.getItem(VARIANT_OVERRIDE_KEY);
    if (override === 'A') return 0;
    if (override === 'B') return 1;
  } catch { /* ignore */ }
  return fnv1a(getSessionId()) % 2;
}

/** Call once in main.jsx, before React mounts. */
export function initJourney() {
  try {
    const url = new URL(window.location.href);
    let dirty = false;

    const variant = url.searchParams.get('variant');
    if (variant === 'A' || variant === 'B') {
      localStorage.setItem(VARIANT_OVERRIDE_KEY, variant);
      localStorage.setItem(DEV_KEY, '1'); // overrides are dev traffic by construction
      url.searchParams.delete('variant');
      dirty = true;
    }

    const src = url.searchParams.get('src');
    if (src && /^[a-z0-9-]{1,40}$/.test(src)) {
      pendingSource = src;
      url.searchParams.delete('src');
      dirty = true;
    }

    // Campaign attribution: persist the first clean utm_* set we ever see on
    // this device (first-touch), then strip all utm_* from the URL either way
    // so they never leak into shared/copied links or later navigations.
    const utm = parseUtm(url);
    if (utm && !localStorage.getItem(UTM_KEY)) {
      localStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }
    for (const f of UTM_FIELDS) {
      if (url.searchParams.has(`utm_${f}`)) { url.searchParams.delete(`utm_${f}`); dirty = true; }
    }

    if (dirty) window.history.replaceState({}, '', url.toString());
  } catch { /* never block app start */ }

  getSessionId(); // mint eagerly

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true);
    });
  }
}

/** Set by the shared-view CTA; consumed by the next assessment_start. */
export function setPendingSource(src) { pendingSource = src; }

// The sharer's code, stashed when a visitor takes the assessment from a share
// link, so their results screen auto-loads the comparison (the round-trip).
let pendingPartner = null;
export function setPendingPartner(code) { pendingPartner = code; }
export function consumePendingPartner() { const p = pendingPartner; pendingPartner = null; return p; }

export function setUserId(id) { userId = id; }

export function record(name, props = {}) {
  const entry = { name, props: { ...props } };
  if (name === 'assessment_start' && pendingSource) {
    entry.props.from = pendingSource;
    pendingSource = null;
  }
  entry.props.variant = getVariant();
  const utm = getUtm();
  if (utm) entry.props.utm = utm;
  buffer.push(entry);

  if (buffer.length >= FLUSH_MAX_EVENTS) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => flush(), FLUSH_INTERVAL_MS);
  }
}

function flush(useBeacon = false) {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (buffer.length === 0) return;

  const payload = JSON.stringify({
    session_id: getSessionId(),
    user_id: userId,
    is_dev: isDev(),
    events: buffer.slice(0, 20),
  });
  buffer = buffer.slice(20);

  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/sync', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => { /* diagnostics are best-effort */ });
    }
  } catch { /* best-effort */ }
}
