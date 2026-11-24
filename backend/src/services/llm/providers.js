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
async function callGroq({ system, messages, temperature, maxTokens }) {
  const data = await postJson(
    'groq',
    'https://api.groq.com/openai/v1/chat/completions',
    { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    },
    envNumber('GROQ_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
  );
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callGemini({ system, messages, temperature, maxTokens }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const generationConfig = { temperature, maxOutputTokens: maxTokens };
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

const PROVIDERS = [
  { name: 'groq', label: 'Groq', keyEnv: 'GROQ_API_KEY', call: callGroq },
  { name: 'gemini', label: 'Gemini', keyEnv: 'GEMINI_API_KEY', call: callGemini },
];

export function configuredProviders() {
  return PROVIDERS.filter((p) => Boolean(process.env[p.keyEnv]?.trim()));
}

/**
 * Ask the first provider that answers. Returns { text, provider } or null when no
 * provider is configured or all of them failed (the caller then uses its own fallback).
 */
export async function completeChat({ system, messages, temperature = 0.2, maxTokens = 700 }) {
  const errors = [];
  for (const provider of configuredProviders()) {
    try {
      const text = (await provider.call({ system, messages, temperature, maxTokens })).trim();
      if (text) return { text, provider: provider.name, providerLabel: provider.label };
      errors.push(`${provider.name}: empty response`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length) console.warn('[assistant] LLM providers failed:', errors.join(' | '));
  return null;
}
