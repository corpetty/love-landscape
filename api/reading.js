/**
 * api/reading.js — the $12 Full Reading (spec AD-6).
 *
 * POST /api/reading with { op: 'status' | 'get' | 'regen', ... }
 *
 * Three skus share this endpoint: the Full Reading, the Compatibility Report
 * (entitled per pairing), and the Journey Reading (entitled per ask).
 *
 * Entitlement = a paid `purchases` row for the result. Ownership proof:
 * Supabase JWT (claimed results) or the result's bearer owner_token
 * (anonymous results) — same model as api/results.js.
 *
 * Generation happens here, not in the webhook: the webhook stays fast and
 * retry-safe, and a failed generation costs the buyer nothing (free retry;
 * >48h broken → manual refund per docs/payments-runbook.md). The reading is
 * cached on the purchase row; "regen" allows up to 3 regenerations.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY,
 *      optional MANAGED_MODEL_QUALITY, PUBLIC_ORIGIN
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { decodeParams } from '../src/data/encoding.js';
import { buildFullReadingPrompt, buildCompatibilityPrompt } from './_fullReadingPrompt.js';
import { buildJourneyReadingPrompt } from './_pathReadingPrompt.js';
import { findPath } from '../src/terrain/pathfinder.js';

const MODEL_QUALITY = process.env.MANAGED_MODEL_QUALITY || 'anthropic/claude-sonnet-4-5';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[1-9A-HJ-NP-Za-km-z]{10}$/;
const SKUS = new Set(['full_reading', 'compatibility', 'journey']);
const TOKEN_RE = /^[0-9a-f]{64}$/;
const MAX_REGENS = 3;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

async function verifyJwt(req, supabase) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const { data, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * The ask a journey reading is about, if it belongs to this result.
 *
 * Checking the ask against the result is what stops a slug from being a
 * capability: anyone can hold an ask link, but only the landscape owner — who
 * has already proved ownership above — can buy or read a reading of it.
 *
 * Deliberately independent of whether the question currently has two answers.
 * Entitlement follows the purchase; whether there is something to read is a
 * separate question, asked later. Collapsing the two would tell a buyer whose
 * partner withdrew their answer that no purchase exists, which reads as if
 * their money had vanished.
 */
async function loadAsk(supabase, resultId, slug) {
  if (!slug || !SLUG_RE.test(slug)) return null;
  const { data: ask } = await supabase
    .from('asks')
    .select('id, owner_result_id')
    .eq('slug', slug)
    .maybeSingle();
  if (!ask || ask.owner_result_id !== resultId) return null;
  return ask;
}

/** The two pins a reading is written from, or null if the pair is incomplete. */
async function loadPins(supabase, askId) {
  const { data: pins } = await supabase
    .from('placements')
    .select('author_role, kind, x, y, exclusivity, note')
    .eq('ask_id', askId);

  const start = (pins || []).find((p) => p.author_role === 'owner' && p.kind === 'current');
  const end = (pins || []).find((p) => p.author_role === 'partner' && p.kind === 'desired');
  if (!start || !end) return null;
  return { start, end };
}

/** Owner check (JWT or bearer token) + paid purchase lookup, in one place. */
async function authorize(req, supabase, body) {
  const { result_id, owner_token } = body;
  const sku = SKUS.has(body.sku) ? body.sku : 'full_reading';
  if (!result_id || !UUID_RE.test(result_id)) return { error: 'Invalid result_id', code: 400 };

  const { data: row } = await supabase
    .from('results')
    .select('id, code, user_id, owner_token_hash')
    .eq('id', result_id)
    .maybeSingle();
  if (!row) return { error: 'Not found', code: 404 };

  const user = await verifyJwt(req, supabase);
  const owned =
    (user && row.user_id === user.id) ||
    (!row.user_id && owner_token && TOKEN_RE.test(owner_token) && row.owner_token_hash === sha256(owner_token));
  if (!owned) return { error: 'Not authorized', code: 403 };

  // Optional columns land with later migrations (partner_code in 007, ask_id in
  // 010) — request each only for the sku that needs it, so the other readings
  // keep working on a database where that migration has not run yet.
  const cols = 'id, status, reading_text, regen_count, created_at'
    + (sku === 'compatibility' ? ', partner_code' : '')
    + (sku === 'journey' ? ', ask_id' : '');
  let query = supabase
    .from('purchases')
    .select(cols)
    .eq('result_id', result_id)
    .eq('sku', sku)
    .eq('status', 'paid');

  // A compatibility purchase is entitled per PAIRING: match the specific partner
  // so each comparison has its own report (no partner → not entitled here).
  if (sku === 'compatibility') {
    if (!body.partner_code) return { row, purchase: null, sku };
    query = query.eq('partner_code', body.partner_code);
  }

  // A journey purchase is entitled per ASK — one crossing, one reading. A
  // second question about the same landscape is a different journey and is
  // not covered by an earlier purchase.
  let ask = null;
  if (sku === 'journey') {
    ask = await loadAsk(supabase, result_id, body.ask_slug);
    if (!ask) return { row, purchase: null, sku, ask: null };
    query = query.eq('ask_id', ask.id);
  }

  const { data: purchase } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { row, purchase: purchase || null, sku, ask };
}

async function generate({ systemMessage, userMessage }) {
  const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://love-landscape.com',
      'X-Title': 'Love Landscape Full Reading', // ASCII only: HTTP headers are ByteStrings; an em dash here killed every request
    },
    body: JSON.stringify({
      model: MODEL_QUALITY,
      // ~3,000 words ≈ 4,500-6,000 tokens. Kept tight because OpenRouter
      // pre-authorizes credits against max_tokens — an 8k reservation can 402
      // on a thin balance even though the actual generation would fit.
      max_tokens: 6500,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!orResponse.ok) {
    const detail = await orResponse.text().catch(() => '');
    console.error('full reading generation failed:', orResponse.status, detail.slice(0, 500));
    throw new Error(`AI service error (${orResponse.status}): ${detail.slice(0, 200)}`);
  }
  const data = await orResponse.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (content.length < 500) {
    console.error('full reading came back short:', JSON.stringify(data).slice(0, 500));
    throw new Error(`Generation came back empty (finish: ${data.choices?.[0]?.finish_reason || 'unknown'})`);
  }
  return content;
}

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  const op = body?.op;
  if (!['status', 'get', 'regen'].includes(op)) return res.status(400).json({ error: 'Unknown op' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Not configured' });

  const auth = await authorize(req, supabase, body || {});
  if (auth.error) return res.status(auth.code).json({ error: auth.error });
  const { row, purchase, sku, ask } = auth;

  if (op === 'status') {
    return res.json({
      entitled: Boolean(purchase),
      has_reading: Boolean(purchase?.reading_text),
      regen_count: purchase?.regen_count ?? 0,
      regens_left: purchase ? Math.max(0, MAX_REGENS - (purchase.regen_count ?? 0)) : 0,
    });
  }

  if (!purchase) return res.status(402).json({ error: 'No purchase found for this landscape' });

  if (op === 'get' && purchase.reading_text) {
    return res.json({ reading: purchase.reading_text, regens_left: Math.max(0, MAX_REGENS - purchase.regen_count) });
  }

  if (op === 'regen' && purchase.regen_count >= MAX_REGENS) {
    return res.status(429).json({ error: 'Regeneration limit reached', reading: purchase.reading_text });
  }

  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI service not configured' });

  const params = decodeParams(row.code);
  if (!params) return res.status(500).json({ error: 'Stored result is unreadable' });

  // What each reading is about, resolved before any tokens are spent.
  let prompt;
  if (sku === 'journey') {
    // Recomputed here rather than trusted from the client: the route is the
    // substance of the reading, and a buyer must not be able to shape it by
    // posting different facts than the pins on the server support.
    const pins = ask ? await loadPins(supabase, ask.id) : null;
    if (!pins) {
      return res.status(409).json({
        error: 'This question does not have two answers right now, so there is no journey to read. '
          + 'Your purchase is safe — if the answer was withdrawn, it can be given again.',
      });
    }
    const path = findPath(params, pins.start, pins.end, { exclusivity: pins.end.exclusivity });
    if (!path) return res.status(500).json({ error: 'The route could not be computed' });
    prompt = buildJourneyReadingPrompt(params, path, {
      otherName: typeof body.other_name === 'string' ? body.other_name.trim().slice(0, 40) || null : null,
      note: pins.end.note || null,
    });
  } else {
    // Partner landscape: for a compatibility report it's fixed at purchase time
    // (stored on the row); for a full reading it's an optional section the owner
    // attaches at generation time.
    let partnerParams = null;
    if (sku === 'compatibility') {
      partnerParams = purchase.partner_code ? decodeParams(purchase.partner_code) : null;
      if (!partnerParams) return res.status(500).json({ error: 'This compatibility purchase is missing its partner landscape' });
    } else if (body.partner_code) {
      partnerParams = decodeParams(body.partner_code);
      if (!partnerParams) return res.status(400).json({ error: 'Invalid partner code' });
    }
    prompt = sku === 'compatibility'
      ? buildCompatibilityPrompt(params, partnerParams)
      : buildFullReadingPrompt(params, partnerParams);
  }

  let reading;
  try {
    reading = await generate(prompt);
  } catch (err) {
    // Purchase stays valid; the retry is free.
    return res.status(503).json({ error: 'Generation failed — your purchase is safe, please try again.', detail: err.message });
  }

  const update = { reading_text: reading };
  if (op === 'regen') update.regen_count = (purchase.regen_count ?? 0) + 1;
  await supabase.from('purchases').update(update).eq('id', purchase.id);

  return res.json({
    reading,
    regens_left: Math.max(0, MAX_REGENS - (update.regen_count ?? purchase.regen_count ?? 0)),
  });
}
