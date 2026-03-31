const VERSION_V1 = 'L1';
const VERSION_V2 = 'L2';
const CURRENT_VERSION = VERSION_V2;
const V1_PARAM_COUNT = 9;
const V2_PARAM_COUNT = 13;

/**
 * Encode 13 params (each 0–1) into a shareable string like "L2_82g01VfsdGgABCD".
 */
export function encodeParams(params) {
  const bytes = new Uint8Array(V2_PARAM_COUNT);
  for (let i = 0; i < V2_PARAM_COUNT; i++) {
    bytes[i] = Math.round(Math.max(0, Math.min(1, params[i] ?? 0.5)) * 255);
  }

  // Convert to base64
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  let b64 = btoa(binary);

  // Strip trailing '=', URL-safe
  b64 = b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

  return CURRENT_VERSION + '_' + b64;
}

/**
 * Decode a shareable string back to 13 params (each 0–1).
 * Supports both L1 (9 params) and L2 (13 params) codes.
 * L1 codes fill P9-P12 with 0.5 (neutral defaults).
 * Returns null if invalid.
 */
export function decodeParams(code) {
  if (!code || typeof code !== 'string') return null;

  const trimmed = code.trim();

  let version;
  let payload;
  if (trimmed.startsWith(VERSION_V2 + '_')) {
    version = 2;
    payload = trimmed.slice(VERSION_V2.length + 1);
  } else if (trimmed.startsWith(VERSION_V1 + '_')) {
    version = 1;
    payload = trimmed.slice(VERSION_V1.length + 1);
  } else {
    return null;
  }

  // Restore base64 chars
  let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');

  // Pad if needed
  while (b64.length % 4 !== 0) b64 += '=';

  let binary;
  try {
    binary = atob(b64);
  } catch {
    return null;
  }

  const expectedLength = version === 1 ? V1_PARAM_COUNT : V2_PARAM_COUNT;
  if (binary.length !== expectedLength) return null;

  const params = [];
  for (let i = 0; i < binary.length; i++) {
    params.push(binary.charCodeAt(i) / 255);
  }

  // If L1, pad with neutral defaults for the 4 new params
  if (version === 1) {
    while (params.length < V2_PARAM_COUNT) {
      params.push(0.5);
    }
  }

  return params;
}
