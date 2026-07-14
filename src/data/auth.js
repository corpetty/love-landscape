/**
 * auth.js — email OTP auth (spec AD-3) + account linking (spec AD-8).
 *
 * 6-digit code typed in-app, never a magic link: mobile mail apps open links
 * in a different browser, orphaning the localStorage results the account
 * exists to save. Requires the Supabase email template to send {{ .Token }}.
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { record, setUserId, isDev } from './journey.js';
import { ensureSynced, markClaimed, getOwnedResults } from './resultsClient.js';

export const authAvailable = Boolean(supabase);

export async function requestOtp(email) {
  if (!supabase) return { error: 'Auth not configured' };
  record('otp_sent');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return { error: error?.message || null };
}

export async function verifyOtpCode(email, token) {
  if (!supabase) return { error: 'Auth not configured' };
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data?.session) return { error: error?.message || 'Invalid code' };
  record('otp_verified');
  setUserId(data.session.user.id);
  return { session: data.session };
}

async function authedPost(body) {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  if (!jwt) return { error: 'Not signed in' };
  try {
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ ...body, is_dev: isDev() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json.error || `Request failed (${res.status})` };
    return json;
  } catch {
    return { error: 'Network error' };
  }
}

/**
 * Post-verification bookkeeping: profile row + signup milestone, plus the
 * implicit claim of the result the user was looking at when they signed up.
 */
export async function completeSignup(currentEntry) {
  let claimFields = {};
  if (currentEntry) {
    const synced = await ensureSynced(currentEntry.client_result_id);
    if (synced) {
      claimFields = {
        client_result_id: currentEntry.client_result_id,
        owner_token: currentEntry.owner_token,
      };
    }
  }
  const result = await authedPost({ op: 'signup', ...claimFields });
  if (!result.error && result.claimed_result && currentEntry) {
    markClaimed(currentEntry.client_result_id);
  }
  return result;
}

/** Explicit claim of selected local results (shared-device safe: user picks). */
export async function claimResults(entries) {
  const syncable = [];
  for (const e of entries) {
    const synced = await ensureSynced(e.client_result_id);
    if (synced) syncable.push(e);
  }
  if (syncable.length === 0) return { claimed: [] };
  const result = await authedPost({ op: 'claim', tokens: syncable.map((e) => e.owner_token) });
  if (!result.error) {
    for (const e of syncable) markClaimed(e.client_result_id);
  }
  return result;
}

/** Local results not yet linked to an account (candidates for the claim step). */
export function getUnclaimedResults() {
  return getOwnedResults().filter((r) => !r.claimed && r.owner_token);
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  setUserId(null);
}

/** React hook: current auth user (null when anonymous or auth unavailable). */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user || null;
      setUser(u);
      if (u) setUserId(u.id);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user || null;
      setUser(u);
      setUserId(u?.id || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  return { user, ready };
}
