// Hosted LLM providers for the assistant. Groq is tried first (fast), Gemini is the fallback.
// Keys are read from the server environment only; they are never sent to the browser.

const DEFAULT_TIMEOUT_MS = 12000;

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export class ProviderError extends Error {
  constructor(provider, message, status) {
    super(`${provider}: ${message}`);
    this.provider = provider;
    this.status = status;
  }
}

async function postJson(provider, url, headers, body, timeoutMs) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? `timed out after ${timeoutMs} ms` : 'network error';
    throw new ProviderError(provider, reason);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message || response.statusText || 'request failed';
    throw new ProviderError(provider, `HTTP ${response.status} ${String(detail).slice(0, 200)}`, response.status);
  }
  return data;
}

/** messages: [{ role: 'user' | 'assistant', content: string }] */
async function callGroq({ system, messages, temperature, maxTokens, json }) {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, ...messages],
  };
  if (json) body.response_format = { type: 'json_object' };
  // gpt-oss models reason before answering; keep it short for quick lookups and leave token room for the answer.
  if (/gpt-oss/.test(model)) {
    body.reasoning_effort = 'low';
    body.include_reasoning = false;
    body.max_tokens = maxTokens + 800;
  }
  const data = await postJson(
    'groq',
    'https://api.groq.com/openai/v1/chat/completions',
    { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body,
    envNumber('GROQ_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
  );
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callGemini({ system, messages, temperature, maxTokens, json }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const generationConfig = { temperature, maxOutputTokens: maxTokens };
  if (json) generationConfig.responseMimeType = 'application/json';
  // 2.5 models spend output tokens on "thinking" by default; lookups don't need it.
  if (/^gemini-2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const data = await postJson(
    'gemini',
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { 'x-goog-api-key': process.env.GEMINI_API_KEY },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig,
    },
    envNumber('GEMINI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
  );
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('');
}

// Groq's free tier allows about 8k tokens per minute, so large prompts go straight to Gemini.
const PROVIDERS = [
  { name: 'groq', label: 'Groq', keyEnv: 'GROQ_API_KEY', call: callGroq, maxPromptTokens: () => envNumber('GROQ_MAX_PROMPT_TOKENS', 3500) },
  { name: 'gemini', label: 'Gemini', keyEnv: 'GEMINI_API_KEY', call: callGemini, maxPromptTokens: () => envNumber('GEMINI_MAX_PROMPT_TOKENS', 200000) },
];

/** Provider name -> time (ms) until which it is skipped after a rate limit. */
const cooldownUntil = new Map();

export function configuredProviders() {
  return PROVIDERS.filter((p) => Boolean(process.env[p.keyEnv]?.trim()));
}

/** Rough token estimate (about four characters per token for English text). */
export function estimateTokens(system, messages) {
  return Math.ceil((system.length + messages.reduce((sum, m) => sum + m.content.length, 0)) / 4);
}

/**
 * Ask the first provider that answers. Returns { text, provider } or null when no
 * provider is configured or all of them failed (the caller then uses its own fallback).
 */
/** json: ask the provider for a single JSON object instead of prose. */
export async function completeChat({ system, messages, temperature = 0.2, maxTokens = 700, json = false }) {
  const errors = [];
  const promptTokens = estimateTokens(system, messages);
  for (const provider of configuredProviders()) {
    if (promptTokens > provider.maxPromptTokens()) {
      errors.push(`${provider.name}: skipped, prompt ~${promptTokens} tokens`);
      continue;
    }
    if ((cooldownUntil.get(provider.name) ?? 0) > Date.now()) {
      errors.push(`${provider.name}: skipped, rate-limited`);
      continue;
    }
    try {
      const text = (await provider.call({ system, messages, temperature, maxTokens, json })).trim();
      if (text) {
        if (errors.length) console.warn('[assistant] fell back to', provider.name, '-', errors.join(' | '));
        return { text, provider: provider.name, providerLabel: provider.label };
      }
      errors.push(`${provider.name}: empty response`);
    } catch (error) {
      if (error.status === 429) cooldownUntil.set(provider.name, Date.now() + envNumber('LLM_RATE_LIMIT_COOLDOWN_MS', 20000));
      errors.push(error.message);
    }
  }
  if (errors.length) console.warn('[assistant] LLM providers failed:', errors.join(' | '));
  return null;
}
