import { readFile } from "node:fs/promises";

const responsesUrl = "https://api.openai.com/v1/responses";

export function normalizeApiKeyText(text) {
  if (typeof text !== "string") throw new TypeError("API key text must be a string.");
  let value = text.trim();
  const assignment = value.match(/^OPENAI_API_KEY\s*=\s*(.+)$/u);
  if (assignment) value = assignment[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) value = value.slice(1, -1);
  if (value.length < 20 || /\s/u.test(value)) {
    throw new Error("The API key file does not contain one valid non-whitespace token.");
  }
  return value;
}

export async function loadApiKey(file) {
  return normalizeApiKeyText(await readFile(file, "utf8"));
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function normalizeResponseUsage(usage = {}) {
  const inputDetails = usage.input_tokens_details ?? {};
  const outputDetails = usage.output_tokens_details ?? {};
  const promptTokens = nonNegativeInteger(usage.input_tokens);
  const completionTokens = nonNegativeInteger(usage.output_tokens);
  return Object.freeze({
    promptTokens,
    cachedInputTokens: nonNegativeInteger(inputDetails.cached_tokens),
    cacheWriteTokens: nonNegativeInteger(inputDetails.cache_write_tokens),
    completionTokens,
    reasoningTokens: nonNegativeInteger(outputDetails.reasoning_tokens),
    totalTokens: nonNegativeInteger(usage.total_tokens) || promptTokens + completionTokens
  });
}

export function estimateResponseCostUsd(usage, pricing) {
  const normalized = normalizeResponseUsage(usage);
  const cached = Math.min(normalized.cachedInputTokens, normalized.promptTokens);
  const cacheWrites = Math.min(
    normalized.cacheWriteTokens,
    normalized.promptTokens - cached
  );
  const uncached = normalized.promptTokens - cached - cacheWrites;
  return (
    uncached * pricing.uncachedInput +
    cached * pricing.cachedInput +
    cacheWrites * pricing.cacheWrite +
    normalized.completionTokens * pricing.output
  ) / 1_000_000;
}

export async function createOpenAIResponse({ apiKey, request, fetchImpl = globalThis.fetch, signal }) {
  if (typeof apiKey !== "string" || apiKey.length < 20) {
    throw new Error("An OpenAI API key is required.");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function.");
  const response = await fetchImpl(responsesUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(request),
    ...(signal === undefined ? {} : { signal })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message ?? `OpenAI Responses API returned HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}
