/**
 * api/results.js — the anonymous-results data plane (docs/phase-0-spec.md AD-8).
 *
 * POST /api/results with { op: 'create' | 'update' | 'claim' | 'compare' | 'signup', ... }
 *
 * Ownership model: anonymous rows are controlled by a bearer owner_token.
 * The CLIENT mints the token (32 random bytes, hex) and sends it with create;
 * the server stores only its SHA-256 hash. Because retries of the same create
 * carry the same token, a lost response cannot orphan a result. Tokens are
 * invalidated at claim — from then on the row is JWT-owned.
 *
 * Milestones are written only when state actually changes (insert paths),
 * making them append-only server-truth for the funnel.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional PUBLIC_ORIGIN,
 *      DEV_SECRET, DEV_IPS (comma-separated founder IPs)
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { decodeParams } from '../src/data/encoding.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[0-9a-f]{64}$/;
const STATUSES = new Set(['single', 'partnered', 'complicated', 'prefer-not']);
const UTM_FIELDS = ['source', 'medium', 'campaign', 'content', 'term'];
const UTM_VALUE_RE = /^[a-zA-Z0-9_.\-]{1,64}$/;

// Defense-in-depth: the client already sanitizes, but never trust a body.
// Returns a clean {source,medium,...} object, or null if nothing valid.
function cleanUtm(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const f of UTM_FIELDS) {
    const v = raw[f];
    if (typeof v === 'string' && UTM_VALUE_RE.test(v)) out[f] = v;
  }
  return Object.keys(out).length ? out : null;
}
const SLUG_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; // base58
const SESSION_DAILY_LIMIT = 30;
const IP_DAILY_LIMIT = 2000; // CGNAT-safe
const MAX_CLAIM_TOKENS = 20;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function makeSlug() {
  const bytes = crypto.randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function requestIsDev(req, body) {
  if (req.headers['x-ll-dev'] && req.headers['x-ll-dev'] === process.env.DEV_SECRET) return true;
  const devIps = (process.env.DEV_IPS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (devIps.includes(clientIp(req))) return true;
  return body?.is_dev === true; // self-declared: can only EXCLUDE traffic, so spoofing is self-defeating
}

/** Client-supplied time, bounded: never in the future, never older than 30 days. */
function boundedHappenedAt(iso) {
  const now = Date.now();
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return new Date(now).toISOString();
  const min = now - 30 * 24 * 3600 * 1000;
  return new Date(Math.min(Math.max(t, min), now)).toISOString();
}

async function verifyJwt(req, supabase) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const { data, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

async function rateLimited(supabase, req, sessionId) {
  const day = new Date().toISOString().slice(0, 10);
  const checks = [
    { p_bucket: `results:session:${sessionId}:${day}`, p_limit: SESSION_DAILY_LIMIT },
    { p_bucket: `results:ip:${clientIp(req)}:${day}`, p_limit: IP_DAILY_LIMIT },
  ];
  for (const c of checks) {
    const { data: allowed, error } = await supabase.rpc('rate_limit_hit', c);
    if (error) return false; // fail open: a broken limiter must not block the product
    if (allowed === false) return true;
  }
  return false;
}

async function insertMilestone(supabase, { kind, personKey, clientResultId = null, meta = {}, isDev, happenedAt }) {
  await supabase.from('milestones').insert({
    kind,
    person_key: personKey,
    client_result_id: clientResultId,
    meta,
    is_dev: isDev,
    happened_at: happenedAt || new Date().toISOString(),
  });
}

// ── op handlers ──────────────────────────────────────────────────────────────

async function opCreate(req, res, supabase, body, isDev) {
  const { client_result_id, session_id, code, owner_token, status, variant, completed_at } = body;
  const utm = cleanUtm(body.utm);

  if (!client_result_id || !UUID_RE.test(client_result_id)) return res.status(400).json({ error: 'Invalid client_result_id' });
  if (!session_id || !UUID_RE.test(session_id)) return res.status(400).json({ error: 'Invalid session_id' });
  if (!owner_token || !TOKEN_RE.test(owner_token)) return res.status(400).json({ error: 'Invalid owner_token' });
  if (!decodeParams(code)) return res.status(400).json({ error: 'Invalid code' });
  if (status != null && !STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status' });

  if (await rateLimited(supabase, req, session_id)) return res.status(429).json({ error: 'Rate limited' });

  // Erasure tombstone: a deleted account's device queue must not resurrect
  // data. 410 tells the client to drop the queued entry permanently.
  const { data: tombstone } = await supabase
    .from('deleted_sessions').select('session_id').eq('session_id', session_id).maybeSingle();
  if (tombstone) return res.status(410).json({ error: 'This session was erased', drop: true });

  const happenedAt = boundedHappenedAt(completed_at);
  const row = {
    client_result_id,
    session_id,
    owner_token_hash: sha256(owner_token),
    code,
    status: status ?? null,
    variant: variant === 0 || variant === 1 ? variant : null,
    is_dev: isDev,
  };

  // Idempotent create: on conflict the incoming fields are IGNORED (write-once
  // status can't be overwritten by a stale retry) and no milestone is written.
  const { data: inserted, error } = await supabase
    .from('results')
    .upsert(row, { onConflict: 'client_result_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();

  if (error) return res.status(503).json({ error: 'Storage error' });

  if (inserted) {
    await insertMilestone(supabase, {
      kind: 'create',
      personKey: session_id,
      clientResultId: client_result_id,
      meta: { status: status ?? null, variant: row.variant, ...(utm ? { utm } : {}) },
      isDev,
      happenedAt,
    });
    return res.json({ result_id: inserted.id, created: true });
  }

  // Duplicate: return the existing row's id (retry after a lost response).
  const { data: existing } = await supabase
    .from('results')
    .select('id')
    .eq('client_result_id', client_result_id)
    .maybeSingle();
  if (!existing) return res.status(503).json({ error: 'Storage error' });
  return res.json({ result_id: existing.id, created: false });
}

async function authorizeResult(supabase, body, user) {
  const { result_id, owner_token } = body;
  if (!result_id || !UUID_RE.test(result_id)) return { error: 'Invalid result_id' };

  const { data: row } = await supabase
    .from('results')
    .select('id, client_result_id, session_id, user_id, owner_token_hash, is_public, slug, first_published_at, is_dev')
    .eq('id', result_id)
    .maybeSingle();
  if (!row) return { error: 'Not found', code: 404 };

  if (user && row.user_id === user.id) return { row };
  if (!row.user_id && owner_token && TOKEN_RE.test(owner_token) && row.owner_token_hash === sha256(owner_token)) return { row };
  return { error: 'Not authorized', code: 403 };
}

async function opUpdate(req, res, supabase, body, isDev) {
  const user = await verifyJwt(req, supabase);
  const auth = await authorizeResult(supabase, body, user);
  if (auth.error) return res.status(auth.code || 400).json({ error: auth.error });
  const { row } = auth;

  const fields = body.fields || {};
  const update = {};

  if (typeof fields.label === 'string') update.label = fields.label.slice(0, 100);
  if (fields.label === null) update.label = null;

  let publishMilestone = false;
  if (fields.is_public === true && !row.is_public) {
    update.is_public = true;
    if (!row.slug) update.slug = makeSlug();
    if (!row.first_published_at) {
      update.first_published_at = new Date().toISOString();
      publishMilestone = true; // first publish only — set-once guard
    }
  }
  if (fields.is_public === false && row.is_public) {
    update.is_public = false;
    update.slug = null; // share page 410s; re-publish mints a fresh slug
  }

  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  let query = supabase.from('results').update(update).eq('id', row.id);
  const { error } = await query;
  if (error) {
    // Slug collision retry (unique index) — one retry with a fresh slug.
    if (error.code === '23505' && update.slug) {
      update.slug = makeSlug();
      const retry = await supabase.from('results').update(update).eq('id', row.id);
      if (retry.error) return res.status(503).json({ error: 'Storage error' });
    } else {
      return res.status(503).json({ error: 'Storage error' });
    }
  }

  if (publishMilestone) {
    await insertMilestone(supabase, {
      kind: 'publish',
      personKey: row.user_id || row.session_id,
      clientResultId: row.client_result_id,
      isDev: isDev || row.is_dev,
    });
  }

  const { data: fresh } = await supabase
    .from('results').select('id, label, is_public, slug').eq('id', row.id).maybeSingle();
  return res.json({ ok: true, result: fresh });
}

async function opClaim(req, res, supabase, body, isDev) {
  const user = await verifyJwt(req, supabase);
  if (!user) return res.status(401).json({ error: 'Sign in required' });

  const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, MAX_CLAIM_TOKENS) : [];
  if (tokens.length === 0) return res.status(400).json({ error: 'No tokens' });

  const claimed = [];
  const skipped = [];
  for (const token of tokens) {
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) { skipped.push({ reason: 'invalid' }); continue; }
    const hash = sha256(token);
    const { data: row } = await supabase
      .from('results')
      .select('id, client_result_id, user_id')
      .eq('owner_token_hash', hash)
      .maybeSingle();
    if (!row) { skipped.push({ reason: 'not_found' }); continue; }
    if (row.user_id && row.user_id !== user.id) { skipped.push({ reason: 'claimed_by_other' }); continue; }

    // Bearer access ends at claim: null the hash, bind to the account.
    const { error } = await supabase
      .from('results')
      .update({ user_id: user.id, owner_token_hash: null })
      .eq('id', row.id);
    if (error) { skipped.push({ reason: 'error' }); continue; }

    await supabase.from('claims').upsert(
      { client_result_id: row.client_result_id, user_id: user.id },
      { onConflict: 'client_result_id', ignoreDuplicates: true },
    );
    // Purchases claimed via the claimed result only (never by session sweep).
    await supabase.from('purchases').update({ user_id: user.id }).eq('result_id', row.id).is('user_id', null);
    claimed.push(row.id);
  }

  return res.json({ ok: true, claimed, skipped });
}

async function opCompare(req, res, supabase, body, isDev) {
  const { session_id, partner_code, save } = body;
  if (!session_id || !UUID_RE.test(session_id)) return res.status(400).json({ error: 'Invalid session_id' });
  if (!decodeParams(partner_code)) return res.status(400).json({ error: 'Invalid code' });
  if (await rateLimited(supabase, req, session_id)) return res.status(429).json({ error: 'Rate limited' });

  const user = await verifyJwt(req, supabase);
  const personKey = user?.id || session_id;

  await insertMilestone(supabase, {
    kind: 'compare',
    personKey,
    meta: { partner_code_hash: sha256(partner_code), source: body.source === 'share' ? 'share' : 'direct' },
    isDev,
  });

  if (save === true) {
    // Saved comparison stores the code as owned user content (24-month retention).
    const { error } = await supabase.from('comparisons').insert({
      session_id,
      user_id: user?.id || null,
      partner_code,
    });
    if (error) return res.status(503).json({ error: 'Storage error' });
  }

  return res.json({ ok: true });
}

async function opSignup(req, res, supabase, body, isDev) {
  const user = await verifyJwt(req, supabase);
  if (!user) return res.status(401).json({ error: 'Sign in required' });

  const { data: inserted } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('user_id')
    .maybeSingle();

  if (inserted) {
    await insertMilestone(supabase, { kind: 'signup', personKey: user.id, isDev });
  }

  // Implicit single-result claim: the result on screen when the user signed up.
  let claimedResult = null;
  if (body.client_result_id && body.owner_token && TOKEN_RE.test(body.owner_token)) {
    const hash = sha256(body.owner_token);
    const { data: row } = await supabase
      .from('results')
      .select('id, client_result_id, user_id')
      .eq('client_result_id', body.client_result_id)
      .eq('owner_token_hash', hash)
      .maybeSingle();
    if (row && !row.user_id) {
      await supabase.from('results').update({ user_id: user.id, owner_token_hash: null }).eq('id', row.id);
      await supabase.from('claims').upsert(
        { client_result_id: row.client_result_id, user_id: user.id },
        { onConflict: 'client_result_id', ignoreDuplicates: true },
      );
      await supabase.from('purchases').update({ user_id: user.id }).eq('result_id', row.id).is('user_id', null);
      claimedResult = row.id;
    }
  }

  return res.json({ ok: true, new_profile: Boolean(inserted), claimed_result: claimedResult });
}

async function opList(req, res, supabase) {
  const user = await verifyJwt(req, supabase);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  const { data, error } = await supabase
    .from('results')
    .select('id, client_result_id, code, label, created_at, is_public, slug')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(503).json({ error: 'Storage error' });
  return res.json({ ok: true, results: data });
}

async function opDelete(req, res, supabase, body) {
  const user = await verifyJwt(req, supabase);
  const auth = await authorizeResult(supabase, body, user);
  if (auth.error) return res.status(auth.code || 400).json({ error: auth.error });

  // Content delete only: milestones are append-only by design and persist.
  const { error } = await supabase.from('results').delete().eq('id', auth.row.id);
  if (error) return res.status(503).json({ error: 'Storage error' });
  return res.json({ ok: true });
}

// ── router ───────────────────────────────────────────────────────────────────

const OPS = { create: opCreate, update: opUpdate, claim: opClaim, compare: opCompare, signup: opSignup, list: opList, delete: opDelete };

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-LL-Dev');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const op = OPS[body?.op];
  if (!op) return res.status(400).json({ error: 'Unknown op' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Not configured' });

  const isDev = requestIsDev(req, body);
  try {
    return await op(req, res, supabase, body, isDev);
  } catch (err) {
    console.error('results op failed:', body?.op, err?.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
