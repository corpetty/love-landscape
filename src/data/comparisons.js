import { computeArchetype } from './archetypes.js';
import { decodeParams } from './encoding.js';

/**
 * Recent partner comparisons, remembered on-device so one person can revisit
 * A-vs-B, A-vs-C, … without re-pasting codes. Purely local (no accounts).
 */
const KEY = 'll-comparisons-v1';
const MAX = 8;

export function getRecentComparisons() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Record a compared partner code with a friendly archetype label. */
export function addRecentComparison(code) {
  if (!code) return;
  const params = decodeParams(code);
  if (!params) return;
  const label = computeArchetype(params)?.archetype?.name || 'A landscape';
  try {
    const list = getRecentComparisons().filter((c) => c.code !== code);
    list.unshift({ code, label });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore */ }
}
