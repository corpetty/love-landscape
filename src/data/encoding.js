const VERSION_V1 = 'L1';
const VERSION_V2 = 'L2';
const CURRENT_VERSION = VERSION_V2;
const V1_PARAM_COUNT = 9;
const V2_PARAM_COUNT = 13;

/**
 * View codes (`V2_`) — one person's answer about a bond on a landscape.
 *
 * A view is a *point on a terrain*, so the code carries the terrain with it:
 * it decodes on its own, with no server and no second code to pair it with.
 * That keeps the growth-journey feature working the way landscape codes
 * already do — paste it anywhere, it means the same thing.
 *
 * Layout: kind(1) + params(13) + x(1) + y(1) + exclusivity(1) = 17 bytes.
 * The exclusivity byte is optional in the product but always present in the
 * code, so the length is fixed; 255 is the sentinel for "not set".
 */
const VERSION_VIEW = 'V2';
const VIEW_BYTES = 17;
const EXCLUSIVITY_UNSET = 255;
const EXCLUSIVITY_MAX = 254;

/** What a view code asserts. Order is part of the format — append only. */
export const VIEW_KINDS = ['placement', 'desire', 'wish'];

/**
 * Encode 13 params (each 0–1) into a shareable string like "L2_82g01VfsdGgABCD".
 */
export function encodeParams(params) {
  const bytes = new Uint8Array(V2_PARAM_COUNT);
  for (let i = 0; i < V2_PARAM_COUNT; i++) {
    bytes[i] = Math.round(Math.max(0, Math.min(1, params[i] ?? 0.5)) * 255);
  }

  return CURRENT_VERSION + '_' + bytesToPayload(bytes);
}

// Shared base64 helpers: the two code families differ only in payload.
function bytesToPayload(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function payloadToBytes(payload) {
  let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  try {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const toByte = (v) => Math.round(clamp01(v) * 255);

/**
 * Encode one view of a landscape: whose terrain, and the point on it.
 *
 * @param {object} view
 * @param {string} view.kind        one of VIEW_KINDS
 * @param {number[]} view.params    the 13 params of the terrain being marked
 * @param {number} view.x           0 = emotional, 1 = physical
 * @param {number} view.y           0 = shallow, 1 = deep
 * @param {number|null} [view.exclusivity]  optional wish, 0 = open … 1 = exclusive
 * @returns {string|null} a `V2_` code, or null if the view is unusable
 */
export function encodeView({ kind, params, x, y, exclusivity = null } = {}) {
  const kindIndex = VIEW_KINDS.indexOf(kind);
  if (kindIndex < 0) return null;
  if (!Array.isArray(params) || params.length < V2_PARAM_COUNT) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const bytes = new Uint8Array(VIEW_BYTES);
  bytes[0] = kindIndex;
  for (let i = 0; i < V2_PARAM_COUNT; i++) bytes[1 + i] = toByte(params[i] ?? 0.5);
  bytes[14] = toByte(x);
  bytes[15] = toByte(y);
  bytes[16] = (exclusivity == null || !Number.isFinite(exclusivity))
    ? EXCLUSIVITY_UNSET
    : Math.round(clamp01(exclusivity) * EXCLUSIVITY_MAX);

  return VERSION_VIEW + '_' + bytesToPayload(bytes);
}

/**
 * Decode a `V2_` view code. Returns null for anything else — including a
 * landscape code, which is a different thing and must not silently pass.
 */
export function decodeView(code) {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (!trimmed.startsWith(VERSION_VIEW + '_')) return null;

  const bytes = payloadToBytes(trimmed.slice(VERSION_VIEW.length + 1));
  if (!bytes || bytes.length !== VIEW_BYTES) return null;

  const kind = VIEW_KINDS[bytes[0]];
  if (!kind) return null;

  const params = [];
  for (let i = 0; i < V2_PARAM_COUNT; i++) params.push(bytes[1 + i] / 255);

  return {
    kind,
    params,
    x: bytes[14] / 255,
    y: bytes[15] / 255,
    exclusivity: bytes[16] === EXCLUSIVITY_UNSET ? null : bytes[16] / EXCLUSIVITY_MAX,
  };
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
