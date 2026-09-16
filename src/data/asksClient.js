/**
 * asksClient.js — the client half of the growth-journey ask link.
 *
 * Phase A passes V2_ codes by hand. This is the same exchange with the copying
 * removed: the owner creates an ask and sends /ask/<slug>; the partner answers
 * in one screen with no account and no assessment.
 *
 * Two tokens, two different people:
 *   - the owner proves ownership the way every other owner action does (a
 *     Supabase JWT for claimed results, the bearer owner_token otherwise);
 *   - the partner gets an answer_token, minted here and kept on their device,
 *     which is the only thing that lets them revise or delete what they said.
 *     It is deliberately not tied to an account: requiring one to take back an
 *     answer would mean the retraction is harder than the answer was.
 */

import { supabase } from './supabase.js';
import { getSessionId, isDev } from './journey.js';
import { ensureSynced } from './resultsClient.js';

const ANSWER_TOKENS_KEY = 'll-ask-answers-v1';

function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readTokens() {
  try { return JSON.parse(localStorage.getItem(ANSWER_TOKENS_KEY)) || {}; } catch { return {}; }
}

/**
 * The token this device used to answer a given ask, minting one on first use.
 * Stable per slug: answering again with the same token is a revision, while a
 * different token is a different person and the server refuses it.
 */
export function answerTokenFor(slug) {
  const all = readTokens();
  if (all[slug]) return all[slug];
  const token = randomHex(32);
  try {
    localStorage.setItem(ANSWER_TOKENS_KEY, JSON.stringify({ ...all, [slug]: token }));
  } catch { /* a device that cannot remember simply cannot revise */ }
  return token;
}

export function hasAnswered(slug) {
  return Boolean(readTokens()[slug]);
}

function forgetAnswerToken(slug) {
  const all = readTokens();
  delete all[slug];
  try { localStorage.setItem(ANSWER_TOKENS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

async function call(body, { entry } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (entry?.claimed && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch('/api/results', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...body,
      ...(entry ? { result_id: entry.result_id, owner_token: entry.claimed ? undefined : entry.owner_token } : {}),
      session_id: getSessionId(),
      is_dev: isDev() || undefined,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json;
}

/**
 * Open the owner's landscape to the question, with their own pin already
 * placed. Returns the slug; the same landscape reuses its open ask, so a link
 * that was already sent keeps working.
 */
export async function createAsk(clientResultId, point, wish) {
  const synced = await ensureSynced(clientResultId);
  if (!synced?.result_id) throw new Error("Couldn't reach the server — try again in a moment.");
  // `wish` undefined leaves any stored wish alone; null clears it.
  const body = { op: 'ask_create', point };
  if (wish !== undefined) body.wish = wish;
  return call(body, { entry: synced });
}

/** Has the question come back? Owner-only. */
export async function fetchAskStatus(clientResultId) {
  const synced = await ensureSynced(clientResultId);
  if (!synced?.result_id) return null;
  return call({ op: 'ask_status' }, { entry: synced });
}

/** The owner closes the ask for good; the link 410s from then on. */
export async function withdrawAsk(clientResultId) {
  const synced = await ensureSynced(clientResultId);
  if (!synced?.result_id) throw new Error("Couldn't reach the server — try again in a moment.");
  return call({ op: 'ask_withdraw' }, { entry: synced });
}

/** What an unanswered ask page may know: the landscape, and nothing else. */
export async function fetchAsk(slug) {
  return call({ op: 'ask_get', slug });
}

/** Answer it. The response carries the reveal the caller could not see before. */
export async function answerAsk(slug, point) {
  return call({ op: 'ask_answer', slug, point, answer_token: answerTokenFor(slug) });
}

/** Take an answer back. Only the device that wrote it can. */
export async function withdrawAnswer(slug) {
  const token = readTokens()[slug];
  if (!token) throw new Error('This device did not answer this question.');
  const out = await call({ op: 'ask_withdraw', slug, answer_token: token });
  forgetAnswerToken(slug);
  return out;
}

export function askUrl(slug) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/ask/${slug}`;
}
