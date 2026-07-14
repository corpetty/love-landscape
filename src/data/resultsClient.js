/**
 * resultsClient.js — client side of the results data plane (spec AD-8).
 *
 * - The client mints both the idempotency key (client_result_id) and the
 *   bearer owner_token; retries are byte-identical, so a lost response can
 *   never orphan a result.
 * - The results screen NEVER waits on this: creates are best-effort with a
 *   durable localStorage queue (TTL 30 days), flushed on init and before any
 *   server feature that needs the row.
 * - ll-results-v1 is the device's ownership store: [{ client_result_id,
 *   result_id, code, owner_token, status, variant, completed_at, created_at, label }]
 */

import { getSessionId, isDev } from './journey.js';

const STORE_KEY = 'll-results-v1';
const QUEUE_KEY = 'll-create-queue-v1';
const QUEUE_TTL_MS = 30 * 24 * 3600 * 1000;

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getOwnedResults() {
  return read(STORE_KEY);
}

export function getOwnedResult(clientResultId) {
  return read(STORE_KEY).find((r) => r.client_result_id === clientResultId) || null;
}

export function getOwnedResultByCode(code) {
  return read(STORE_KEY).find((r) => r.code === code) || null;
}

/** Mark a result as linked to the signed-in account (bearer token now dead server-side). */
export function markClaimed(clientResultId) {
  const store = read(STORE_KEY);
  const i = store.findIndex((r) => r.client_result_id === clientResultId);
  if (i >= 0) {
    store[i] = { ...store[i], claimed: true };
    write(STORE_KEY, store);
  }
}

export function setLocalLabel(clientResultId, label) {
  const store = read(STORE_KEY);
  const i = store.findIndex((r) => r.client_result_id === clientResultId);
  if (i >= 0) {
    store[i] = { ...store[i], label };
    write(STORE_KEY, store);
  }
}

export function removeOwned(clientResultId) {
  write(STORE_KEY, read(STORE_KEY).filter((r) => r.client_result_id !== clientResultId));
  dequeue(clientResultId);
}

function upsertOwned(entry) {
  const store = read(STORE_KEY);
  const i = store.findIndex((r) => r.client_result_id === entry.client_result_id);
  if (i >= 0) store[i] = { ...store[i], ...entry };
  else store.push(entry);
  write(STORE_KEY, store);
}

async function postCreate(entry) {
  const res = await fetch('/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      op: 'create',
      client_result_id: entry.client_result_id,
      session_id: getSessionId(),
      code: entry.code,
      owner_token: entry.owner_token,
      status: entry.status ?? null,
      variant: entry.variant ?? null,
      completed_at: entry.completed_at,
      is_dev: isDev() || undefined,
    }),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  const data = await res.json();
  upsertOwned({ ...entry, result_id: data.result_id });
  return data;
}

function enqueue(entry) {
  const queue = read(QUEUE_KEY).filter((q) => q.client_result_id !== entry.client_result_id);
  queue.push(entry);
  write(QUEUE_KEY, queue);
}

function dequeue(clientResultId) {
  write(QUEUE_KEY, read(QUEUE_KEY).filter((q) => q.client_result_id !== clientResultId));
}

/**
 * Record a completed assessment. Fire-and-forget: rendering never waits on it.
 * Returns the ownership entry immediately.
 */
export function recordResult({ code, variant = null, status = null }) {
  const entry = {
    client_result_id: crypto.randomUUID(),
    result_id: null,
    code,
    owner_token: randomHex(32),
    status,
    variant,
    completed_at: new Date().toISOString(),
    created_at: Date.now(),
  };
  upsertOwned(entry);

  postCreate(entry).catch(() => enqueue(entry));
  return entry;
}

/** Flush pending creates: on app init and before any feature that needs the row. */
export async function flushCreateQueue() {
  const queue = read(QUEUE_KEY).filter((q) => Date.now() - q.created_at < QUEUE_TTL_MS);
  write(QUEUE_KEY, queue);
  for (const entry of queue) {
    try {
      await postCreate(entry);
      dequeue(entry.client_result_id);
    } catch {
      return false; // still offline/blocked; keep the rest queued
    }
  }
  return true;
}

/**
 * Ensure a result exists server-side (used by publish/purchase later).
 * Returns { result_id, owner_token } or null if the sync cannot complete.
 */
export async function ensureSynced(clientResultId) {
  const entry = getOwnedResult(clientResultId);
  if (!entry) return null;
  if (entry.result_id) return entry;
  try {
    await postCreate(entry);
    dequeue(clientResultId);
    return getOwnedResult(clientResultId);
  } catch {
    return null;
  }
}
