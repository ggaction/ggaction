function retryAfterMilliseconds(response) {
  const milliseconds = Number(response.headers.get("retry-after-ms"));
  if (Number.isFinite(milliseconds) && milliseconds >= 0) return milliseconds;
  const value = response.headers.get("retry-after");
  if (value === null) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

export function isRetryableProviderErrorV2(error) {
  if (!(error instanceof Error)) return false;
  if ([408, 409, 429, 500, 502, 503, 504].includes(error.status)) return true;
  return error.status === undefined && (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    error.name === "TypeError" ||
    error.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT"
  );
}

export function sanitizedProviderErrorV2(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    status: Number.isInteger(error?.status) ? error.status : null,
    code: typeof error?.code === "string" ? error.code : null,
    requestId: typeof error?.requestId === "string" ? error.requestId : null,
    retryAfterMilliseconds: Number.isFinite(error?.retryAfterMilliseconds)
      ? error.retryAfterMilliseconds
      : null,
    retryable: isRetryableProviderErrorV2(error)
  };
}

export function providerRetryDelayV2(error, retryIndex, random = Math.random) {
  const retryAfter = Number.isFinite(error?.retryAfterMilliseconds)
    ? error.retryAfterMilliseconds
    : 0;
  const exponential = Math.min(10_000, 1000 * (2 ** retryIndex));
  const jitter = Math.floor(Math.max(0, Math.min(1, random())) * 250);
  return Math.max(retryAfter, exponential + jitter);
}

export async function createOpenAIResponseV2({ apiKey, request, timeoutMilliseconds }) {
  if (typeof apiKey !== "string" || apiKey.length < 20) throw new Error("OpenAI API key is required.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        payload?.error?.message ?? `OpenAI Responses API returned HTTP ${response.status}.`
      );
      error.status = response.status;
      error.code = payload?.error?.code;
      error.requestId = response.headers.get("x-request-id");
      error.retryAfterMilliseconds = retryAfterMilliseconds(response);
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}
