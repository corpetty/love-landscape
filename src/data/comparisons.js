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

/** The display name for a comparison: the user's custom name, else the archetype. */
export function comparisonDisplayName(entry) {
  return (entry?.name && entry.name.trim()) || entry?.label || 'A landscape';
}

/** Record a compared partner code with a friendly archetype label (keeps any custom name). */
export function addRecentComparison(code) {
  if (!code) return;
  const params = decodeParams(code);
  if (!params) return;
  const label = computeArchetype(params)?.archetype?.name || 'A landscape';
  try {
    const existing = getRecentComparisons().find((c) => c.code === code);
    const list = getRecentComparisons().filter((c) => c.code !== code);
    list.unshift({ code, label, name: existing?.name || null });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore */ }
}

/** Assign (or clear) a custom name for a compared code. */
export function setComparisonName(code, name) {
  if (!code) return;
  try {
    const list = getRecentComparisons();
    const entry = list.find((c) => c.code === code);
    if (entry) {
      entry.name = name && name.trim() ? name.trim() : null;
    } else {
      const params = decodeParams(code);
      const label = params ? (computeArchetype(params)?.archetype?.name || 'A landscape') : 'A landscape';
      list.unshift({ code, label, name: name && name.trim() ? name.trim() : null });
    }
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore */ }
}

/** The custom name for a code, if any. */
export function getComparisonName(code) {
  return getRecentComparisons().find((c) => c.code === code)?.name || null;
}
