const LLM_CONFIG_KEY = 'love-landscape-llm-config';

/**
 * Load LLM config from localStorage.
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
 * Save LLM config to localStorage.
 */
export function saveLLMConfig(config) {
  try {
    localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

/**
 * Get a default model name for a provider.
 */
export function getDefaultModel(provider) {
  switch (provider) {
    case 'ollama': return 'llama3.2';
    case 'claude': return 'claude-sonnet-4-20250514';
    case 'openrouter': return 'anthropic/claude-sonnet-4-20250514';
    default: return '';
  }
}

/**
 * Send a chat completion request to the configured LLM provider.
 *
 * @param {Object} config - { provider, apiKey, baseUrl, model }
 * @param {string} systemMessage - System prompt
 * @param {string} userMessage - User prompt
 * @returns {Promise<string>} - The LLM response text
 */
export async function chatCompletion(config, systemMessage, userMessage) {
  const { provider, apiKey, baseUrl, model } = config;

  if (provider === 'claude') {
    return claudeCompletion(apiKey, model, systemMessage, userMessage);
  }

  // Ollama and OpenRouter both use OpenAI-compatible format
  const url = provider === 'ollama'
    ? `${baseUrl || 'http://localhost:11434'}/v1/chat/completions`
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers = {
    'Content-Type': 'application/json',
  };

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
        { role: 'user', content: userMessage },
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
 * Claude API has a different request format.
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
      messages: [
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Claude API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

/**
 * Call LLM to adjust params based on user context.
 * Returns { adjustedParams: number[13], raw: string } or throws.
 */
export async function adjustParams(config, baseParams, answers, contextAnswers) {
  const { buildAdjustmentPrompt, parseAdjustedParams } = await import('./llmPrompt.js');
  const { systemMessage, userMessage } = buildAdjustmentPrompt(baseParams, answers, contextAnswers);
  const raw = await chatCompletion(config, systemMessage, userMessage);
  const adjusted = parseAdjustedParams(raw);
  if (!adjusted) {
    throw new Error('Failed to parse adjusted parameters from LLM response.');
  }
  return { adjustedParams: adjusted, raw };
}

/**
 * Call LLM to generate a pair/combined landscape reading.
 * Returns { reading: string } or throws.
 */
export async function pairReading(config, paramsA, paramsB, contextA = {}, contextB = {}) {
  const { buildPairReadingPrompt } = await import('./llmPrompt.js');
  const { systemMessage, userMessage } = buildPairReadingPrompt(paramsA, paramsB, contextA, contextB);
  const reading = await chatCompletion(config, systemMessage, userMessage);
  return { reading };
}

/**
 * Test the connection to the configured LLM provider.
 */
export async function testConnection(config) {
  try {
    const result = await chatCompletion(
      config,
      'You are a test assistant.',
      'Say "connected" in one word.'
    );
    return { ok: true, message: result.slice(0, 50) };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
