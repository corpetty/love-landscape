const LLM_CONFIG_KEY  = 'love-landscape-llm-config';
const SESSION_KEY     = 'love-landscape-session-id';
const CREDITS_KEY     = 'love-landscape-credits';

// ─────────────────────────────────────────────────────────────────────────────
// Session ID (anonymous browser session for managed service credits)
// ─────────────────────────────────────────────────────────────────────────────

export function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

/** Cache credits locally to avoid a round-trip on every render. */
export function getCachedCredits() {
  try {
    const v = localStorage.getItem(CREDITS_KEY);
    return v !== null ? parseInt(v, 10) : null;
  } catch {
    return null;
  }
}

function setCachedCredits(n) {
  try { localStorage.setItem(CREDITS_KEY, String(n)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load saved LLM config from localStorage.
 * Returns null if nothing is saved.
 */
export function loadLLMConfig() {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns the effective config: saved config or the managed default.
 * The managed provider requires no API key — it calls /api/chat.
 */
export function getEffectiveConfig() {
  return loadLLMConfig() ?? { provider: 'managed' };
}

/** Save LLM config to localStorage. */
export function saveLLMConfig(config) {
  try {
    localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

/** Get a default model name for a provider (shown as placeholder in settings). */
export function getDefaultModel(provider) {
  switch (provider) {
    case 'managed':    return 'claude (hosted)';
    case 'ollama':     return 'llama3.2';
    case 'claude':     return 'claude-sonnet-4-20250514';
    case 'openrouter': return 'anthropic/claude-sonnet-4-20250514';
    default:           return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core completion functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main dispatch: route to the correct provider.
 *
 * @param {Object}  config       - { provider, apiKey, baseUrl, model }
 * @param {string}  systemMessage
 * @param {string}  userMessage
 * @param {string}  callType     - 'adjust' | 'read' | 'pair' (used by managed service)
 * @returns {Promise<string>}    - The LLM response text
 */
export async function chatCompletion(config, systemMessage, userMessage, callType = 'read') {
  const { provider, apiKey, baseUrl, model } = config;

  if (provider === 'managed') {
    return managedCompletion(systemMessage, userMessage, callType);
  }

  if (provider === 'claude') {
    return claudeCompletion(apiKey, model, systemMessage, userMessage);
  }

  // Ollama and OpenRouter: OpenAI-compatible format
  const url = provider === 'ollama'
    ? `${baseUrl || 'http://localhost:11434'}/v1/chat/completions`
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers = { 'Content-Type': 'application/json' };
  if (provider === 'openrouter' && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || getDefaultModel(provider),
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${provider} error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Managed completion — calls /api/chat on the same domain.
 * Handles 402 (no credits) by throwing a typed error.
 */
async function managedCompletion(systemMessage, userMessage, callType) {
  const sessionId = getSessionId();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemMessage, userMessage, sessionId, callType }),
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 402) {
    const err = new Error('No reading credits remaining. Purchase more to continue.');
    err.code = 'NO_CREDITS';
    err.upgradeAvailable = true;
    throw err;
  }

  if (!response.ok) {
    throw new Error(data.error || 'Love Landscape AI service error');
  }

  // Cache credits remaining for the UI
  if (typeof data.creditsRemaining === 'number') {
    setCachedCredits(data.creditsRemaining);
  }

  return data.content || '';
}

/**
 * Claude API (direct — user's own key, browser-to-API).
 */
async function claudeCompletion(apiKey, model, systemMessage, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Claude API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// High-level operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adjust params based on user context (uses fast model path for managed).
 */
export async function adjustParams(config, baseParams, answers, contextAnswers) {
  const { buildAdjustmentPrompt, parseAdjustedParams } = await import('./llmPrompt.js');
  const { systemMessage, userMessage } = buildAdjustmentPrompt(baseParams, answers, contextAnswers);
  const raw = await chatCompletion(config, systemMessage, userMessage, 'adjust');
  const adjusted = parseAdjustedParams(raw);
  if (!adjusted) throw new Error('Failed to parse adjusted parameters from LLM response.');
  return { adjustedParams: adjusted, raw };
}

/**
 * Generate a pair/combined landscape reading.
 */
export async function pairReading(config, paramsA, paramsB, contextA = {}, contextB = {}) {
  const { buildPairReadingPrompt } = await import('./llmPrompt.js');
  const { systemMessage, userMessage } = buildPairReadingPrompt(paramsA, paramsB, contextA, contextB);
  const reading = await chatCompletion(config, systemMessage, userMessage, 'pair');
  return { reading };
}

/**
 * Fetch fresh credit count from the server and cache it.
 * Call this when the settings panel opens.
 */
export async function refreshCredits() {
  try {
    const sessionId = getSessionId();
    const res = await fetch(`/api/credits?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    setCachedCredits(data.creditsRemaining);
    return data;
  } catch {
    return null;
  }
}

/**
 * Redeem a coupon code for free reading credits.
 * Returns { credits, creditsRemaining, message } or throws.
 */
export async function redeemCoupon(code) {
  const sessionId = getSessionId();
  const res = await fetch('/api/coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not redeem coupon');
  if (typeof data.creditsRemaining === 'number') {
    setCachedCredits(data.creditsRemaining);
  }
  return data;
}

/**
 * Start a Stripe checkout to purchase more reading credits.
 * Returns { checkoutUrl } or throws.
 */
export async function startCreditCheckout() {
  const sessionId = getSessionId();
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not create checkout session');
  return data;
}

/**
 * Test the connection to the configured LLM provider.
 */
export async function testConnection(config) {
  try {
    const result = await chatCompletion(
      config,
      'You are a test assistant.',
      'Say "connected" in one word.',
      'read',
    );
    return { ok: true, message: result.slice(0, 50) };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
