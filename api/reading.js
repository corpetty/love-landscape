/**
 * api/reading.js — the $12 Full Reading (spec AD-6).
 *
 * POST /api/reading with { op: 'status' | 'get' | 'regen', ... }
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

const MODEL_QUALITY = process.env.MANAGED_MODEL_QUALITY || 'anthropic/claude-sonnet-4-5';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

/** Owner check (JWT or bearer token) + paid purchase lookup, in one place. */
async function authorize(req, supabase, body) {
  const { result_id, owner_token } = body;
  const sku = body.sku === 'compatibility' ? 'compatibility' : 'full_reading';
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

  // partner_code only exists after migration 006 — request it only for the
  // compatibility sku (dormant until infra) so the full_reading path is
  // unaffected on databases where the column isn't present yet.
  const cols = 'id, status, reading_text, regen_count, created_at' +
    (sku === 'compatibility' ? ', partner_code' : '');
  const { data: purchase } = await supabase
    .from('purchases')
    .select(cols)
    .eq('result_id', result_id)
    .eq('sku', sku)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { row, purchase: purchase || null, sku };
}

async function generate(params, partnerParams, sku = 'full_reading') {
  const { systemMessage, userMessage } = sku === 'compatibility'
    ? buildCompatibilityPrompt(params, partnerParams)
    : buildFullReadingPrompt(params, partnerParams);
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
  const { row, purchase, sku } = auth;

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

  let reading;
  try {
    reading = await generate(params, partnerParams, sku);
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
