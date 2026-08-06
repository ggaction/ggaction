import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateDocFiles,
  readCurrentDoc,
  searchCurrentDocs
} from "../../scripts/llm-eval/current-docs.js";
import {
  createOpenAIResponse,
  estimateResponseCostUsd,
  normalizeApiKeyText,
  normalizeResponseUsage
} from "../../scripts/llm-eval/openai-responses.js";

test("keeps condition A documentation reads bounded inside public docs", async () => {
  const routing = await readCurrentDoc("./llms.txt");
  const actions = await readCurrentDoc("./reference/actions/");
  const search = await searchCurrentDocs("regression scatterplot", { limit: 3 });

  assert.equal(routing.file, "docs/llms.txt");
  assert.equal(routing.truncated, false);
  assert.equal(actions.file, "docs/reference/actions.md");
  assert.equal(actions.text.includes("Action Reference"), true);
  assert.equal(search.length, 3);
  assert.equal(search.some(result => result.url.includes("regression")), true);
  assert.equal(candidateDocFiles("./reference/actions/").length, 2);
  await assert.rejects(() => readCurrentDoc("../../package.json"), /inside docs/u);
});

test("normalizes API key files without exposing or weakening the token", () => {
  const token = `sk-${"x".repeat(40)}`;

  assert.equal(normalizeApiKeyText(`${token}\n`), token);
  assert.equal(normalizeApiKeyText(`OPENAI_API_KEY='${token}'\n`), token);
  assert.throws(() => normalizeApiKeyText("short"), /valid non-whitespace token/u);
});

test("normalizes response usage and uses the conservative price classes", () => {
  const usage = {
    input_tokens: 1000,
    input_tokens_details: { cached_tokens: 200, cache_write_tokens: 300 },
    output_tokens: 400,
    output_tokens_details: { reasoning_tokens: 250 },
    total_tokens: 1400
  };
  const normalized = normalizeResponseUsage(usage);

  assert.deepEqual(normalized, {
    promptTokens: 1000,
    cachedInputTokens: 200,
    cacheWriteTokens: 300,
    completionTokens: 400,
    reasoningTokens: 250,
    totalTokens: 1400
  });
  assert.equal(estimateResponseCostUsd(usage, {
    uncachedInput: 2.5,
    cachedInput: 0.25,
    cacheWrite: 3.125,
    output: 15
  }), 0.0082375);
});

test("sends one bounded Responses request and never logs the credential", async () => {
  const token = `sk-${"x".repeat(40)}`;
  let received;
  const payload = await createOpenAIResponse({
    apiKey: token,
    request: { model: "test-model", input: "hello", store: false },
    fetchImpl: async (url, init) => {
      received = { url, init };
      return {
        ok: true,
        async json() {
          return { id: "resp_test", output: [], usage: {} };
        }
      };
    }
  });

  assert.equal(received.url, "https://api.openai.com/v1/responses");
  assert.equal(received.init.headers.authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(received.init.body), {
    model: "test-model",
    input: "hello",
    store: false
  });
  assert.equal(payload.id, "resp_test");
});
