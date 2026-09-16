/**
 * perceptions.js — your model of another person, kept on this device.
 *
 * A perceived landscape is the most sensitive thing this app holds: it is one
 * person's private read on somebody else, recorded without that person's
 * involvement. It is therefore local-only by design — no server, no code to
 * paste, nothing to share. There is deliberately no export: a guess about
 * someone is not yours to hand around, and making it easy to send would turn a
 * reflective exercise into something you could confront a person with.
 */

const KEY = 'll-perceptions-v1';
const MAX = 8;

function readAll() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* ignore */ }
}

/** One perception per person you have taken it about, keyed by their code. */
export function getPerception(partnerCode) {
  if (!partnerCode) return null;
  return readAll().find((p) => p.partner_code === partnerCode) || null;
}

/**
 * @param {string} partnerCode  the landscape you were guessing about
 * @param {number[]} params     the 13 parameters your answers produced
 */
export function savePerception(partnerCode, params) {
  if (!partnerCode || !Array.isArray(params)) return null;
  const entry = { partner_code: partnerCode, params, updated_at: Date.now() };
  writeAll([entry, ...readAll().filter((p) => p.partner_code !== partnerCode)]);
  return entry;
}

export function clearPerception(partnerCode) {
  writeAll(readAll().filter((p) => p.partner_code !== partnerCode));
}
