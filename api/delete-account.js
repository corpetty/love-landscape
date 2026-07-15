/**
 * api/delete-account.js — account erasure (spec §3 deletion semantics).
 *
 * POST /api/delete-account  (Authorization: Bearer <supabase JWT>)
 *
 * Order matters:
 * 1. Collect the user's session_ids (from their results) → tombstones, so a
 *    device's queued creates can't resurrect erased data (results.js → 410)
 * 2. Anonymize purchases: keep the financial record (Stripe reconciliation),
 *    null the reading_text (an AI psychological reading is not a financial
 *    record) and the user/session linkage
 * 3. Anonymize milestones: person_key re-keyed with a per-deletion random
 *    salt that is DISCARDED — the retained rows are anonymous counters,
 *    which is exactly what the privacy page promises
 * 4. Delete the auth user — profiles/results/claims/comparisons cascade
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional PUBLIC_ORIGIN
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Not configured' });

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in required' });
  const { data: userData, error: userError } = await supabase.auth.getUser(auth.slice(7));
  if (userError || !userData?.user) return res.status(401).json({ error: 'Sign in required' });
  const userId = userData.user.id;

  try {
    // 1. Tombstone every session that ever created a result on this account.
    const { data: results } = await supabase
      .from('results').select('session_id').eq('user_id', userId);
    const sessionIds = [...new Set((results || []).map((r) => r.session_id).filter(Boolean))];
    if (sessionIds.length > 0) {
      await supabase.from('deleted_sessions').upsert(
        sessionIds.map((session_id) => ({ session_id })),
        { onConflict: 'session_id', ignoreDuplicates: true },
      );
    }

    // 2. Purchases: financial skeleton stays, everything personal goes.
    await supabase
      .from('purchases')
      .update({ reading_text: null, session_id: null, user_id: null })
      .eq('user_id', userId);

    // 3. Milestones: irreversible re-key (salt is generated and discarded here).
    const salt = crypto.randomBytes(32).toString('hex');
    const rekey = (v) => crypto.createHash('sha256').update(salt + v, 'utf8').digest('hex');
    for (const key of [userId, ...sessionIds]) {
      await supabase.from('milestones').update({ person_key: rekey(key) }).eq('person_key', key);
    }

    // 4. The account itself; profiles/results/claims/comparisons cascade via FK.
    const { error: delError } = await supabase.auth.admin.deleteUser(userId);
    if (delError) throw new Error(delError.message);

    return res.json({ ok: true });
  } catch (err) {
    console.error('account deletion failed:', err.message);
    return res.status(500).json({ error: 'Deletion failed — please try again or contact us.' });
  }
}
