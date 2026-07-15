/**
 * api/cron-maintenance.js — daily retention & hygiene (spec §3/§6).
 *
 * Vercel cron (vercel.json) hits this daily. When a CRON_SECRET env var
 * exists, Vercel sends it as "Authorization: Bearer <CRON_SECRET>" and we
 * require it; without the env var the endpoint refuses to run at all.
 *
 * Jobs:
 * - events older than 12 months        → deleted (privacy page promise)
 * - comparisons older than 24 months   → deleted (privacy page promise)
 * - rate_counters older than 7 days    → deleted (dead fixed-window buckets)
 * - auth users with no profile, never confirmed, older than 7 days
 *                                      → deleted (abandoned OTP attempts)
 */

import { createClient } from '@supabase/supabase-js';

const MS_DAY = 24 * 3600 * 1000;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'CRON_SECRET not configured' });
  if ((req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Not configured' });
  const supabase = createClient(url, key);

  const now = Date.now();
  const iso = (msAgo) => new Date(now - msAgo).toISOString();
  const report = {};

  const { error: evErr } = await supabase
    .from('events').delete().lt('created_at', iso(365 * MS_DAY));
  report.events = evErr ? `error: ${evErr.message}` : 'purged >12mo';

  const { error: cmpErr } = await supabase
    .from('comparisons').delete().lt('created_at', iso(2 * 365 * MS_DAY));
  report.comparisons = cmpErr ? `error: ${cmpErr.message}` : 'purged >24mo';

  const { error: rcErr } = await supabase
    .from('rate_counters').delete().lt('updated_at', iso(7 * MS_DAY));
  report.rate_counters = rcErr ? `error: ${rcErr.message}` : 'purged >7d';

  // Abandoned OTP sign-ups: user created by signInWithOtp but code never
  // verified (no confirmation, no profile). Bounded to one page per run —
  // the cron is daily, backlog drains steadily.
  let purgedUsers = 0;
  try {
    const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    const cutoff = now - 7 * MS_DAY;
    const candidates = (page?.users || []).filter(
      (u) => !u.email_confirmed_at && Date.parse(u.created_at) < cutoff,
    );
    for (const u of candidates) {
      const { data: profile } = await supabase
        .from('profiles').select('user_id').eq('user_id', u.id).maybeSingle();
      if (!profile) {
        const { error } = await supabase.auth.admin.deleteUser(u.id);
        if (!error) purgedUsers += 1;
      }
    }
    report.abandoned_auth_users = `purged ${purgedUsers}`;
  } catch (err) {
    report.abandoned_auth_users = `error: ${err.message}`;
  }

  const failed = Object.values(report).some((v) => String(v).startsWith('error'));
  return res.status(failed ? 500 : 200).json({ ok: !failed, ...report });
}
