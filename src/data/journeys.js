/**
 * journeys.js — growth journeys remembered on this device.
 *
 * Phase A is code-only: no server, no account. A journey is stored against the
 * pair of landscapes it is about, so revisiting a comparison brings back the
 * pins that were already placed.
 *
 * Privacy: pins and notes are the most personal thing this app holds — they are
 * one person's reading of a specific named relationship. They never leave the
 * device except in a code the person copies themselves, and they are never
 * attached to a share page, an OG image, or research data.
 */

const KEY = 'll-journeys-v1';
const MAX = 12;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* ignore */ }
}

/** One journey per pair of landscapes, in one direction. */
function idFor(ownerCode, otherCode) {
  return `${ownerCode || ''}::${otherCode || ''}`;
}

/**
 * @returns {{
 *   placement: {x, y}|null,
 *   desire: {x, y, exclusivity, note}|null,
 *   name: string|null,
 *   updated_at: number
 * }|null}
 */
export function getJourney(ownerCode, otherCode) {
  return readAll().find((j) => j.id === idFor(ownerCode, otherCode)) || null;
}

/** Merge fields into a journey, creating it if needed. */
export function saveJourney(ownerCode, otherCode, patch) {
  const id = idFor(ownerCode, otherCode);
  const list = readAll();
  const i = list.findIndex((j) => j.id === id);
  const base = i >= 0 ? list[i] : { id, placement: null, desire: null, name: null };
  const next = { ...base, ...patch, updated_at: Date.now() };
  if (i >= 0) list.splice(i, 1);
  list.unshift(next);
  writeAll(list);
  return next;
}

export function clearJourney(ownerCode, otherCode) {
  writeAll(readAll().filter((j) => j.id !== idFor(ownerCode, otherCode)));
}
