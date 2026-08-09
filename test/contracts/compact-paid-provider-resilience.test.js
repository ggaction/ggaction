import assert from "node:assert/strict";
import test from "node:test";

import {
  isRetryableProviderErrorV2,
  providerRetryDelayV2,
  sanitizedProviderErrorV2
} from "../../scripts/compact-openai-response-v2.js";
import { runBoundedToolStateMachineV3 } from "../../scripts/compact-paid-state-machine-v3.js";

const submitTool = Object.freeze({
  type: "function",
  name: "submit_result",
  description: "Submit one result.",
  strict: true,
  parameters: Object.freeze({
    type: "object",
    additionalProperties: false,
    required: ["status"],
    properties: Object.freeze({ status: { const: "program" } })
  })
});

function plan() {
  return {
    api: {
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      textVerbosity: "low",
      serviceTier: "default",
      store: false,
      include: ["reasoning.encrypted_content"]
    },
    limits: {
      maximumModelCallsPerTask: 5,
      maximumModelCallsTotal: 20,
      maximumApiRequestAttemptsTotal: 24,
      maximumProviderRetriesPerRequest: 1,
      maximumProviderRetriesTotal: 4,
      maximumProviderRetryDelayMilliseconds: 30000,
      maximumSubmissionAttemptsPerTask: 3,
      maximumInputTokensPerTask: 80000,
      maximumOutputTokensPerTask: 28000,
      maximumKnowledgeOutputTokensPerResponse: 2000,
      maximumSubmissionOutputTokensPerResponse: 8000,
      projectedInputBytesPerToken: 1,
      maximumRequestBodyBytesPerCall: 524288,
      maximumRequestBodyBytesPerTask: 2097152,
      timeoutMilliseconds: 30000,
      hardCostUsd: 1
    },
    pricingPerMillionTokens: {
      uncachedInput: 2,
      cachedInput: 0.2,
      cacheWrite: 2.5,
      output: 12
    },
    costAccountingMultiplier: 1.1
  };
}

function ledger() {
  return {
    usage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0
    },
    standardCostUsd: 0,
    costUsd: 0,
    uncertainCostReserveUsd: 0,
    exposureCostUsd: 0,
    modelCalls: 0,
    apiRequestAttempts: 0,
    providerRetries: 0
  };
}

function adapter() {
  return {
    tools: [],
    instruction: "Submit once.",
    snapshot: () => ({ toolCalls: 0 }),
    async close() {}
  };
}

function completedResponse() {
  return {
    model: "gpt-5.6-terra",
    service_tier: "default",
    status: "completed",
    incomplete_details: null,
    error: null,
    output: [{
      type: "function_call",
      status: "completed",
      name: "submit_result",
      call_id: "submit-1",
      arguments: JSON.stringify({ status: "program" })
    }],
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      output_tokens: 50,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 150
    }
  };
}

function providerError(status, options = {}) {
  const error = new Error(options.message ?? `provider ${status}`);
  if (status !== null) error.status = status;
  if (options.name) error.name = options.name;
  if (options.code) error.code = options.code;
  if (options.requestId) error.requestId = options.requestId;
  if (options.retryAfterMilliseconds !== undefined) {
    error.retryAfterMilliseconds = options.retryAfterMilliseconds;
  }
  return error;
}

function options({ runPlan = plan(), runLedger = ledger(), createResponse, sleep = async () => {} }) {
  return {
    plan: runPlan,
    task: { id: "provider-resilience", stratum: "complex" },
    condition: "A",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: runLedger,
    artifactRoot: "/unused",
    route: ["submit_result"],
    createAdapter: async () => adapter(),
    submitTool,
    evaluateSubmission: async () => ({ passed: true, failures: [] }),
    promptBuilder: () => "Build one program.",
    createResponse,
    sleep,
    random: () => 0
  };
}

test("classifies only bounded transient provider errors as retryable", () => {
  for (const status of [408, 409, 429, 500, 502, 503, 504]) {
    assert.equal(isRetryableProviderErrorV2(providerError(status)), true);
  }
  assert.equal(isRetryableProviderErrorV2(providerError(401)), false);
  assert.equal(isRetryableProviderErrorV2(providerError(400)), false);
  assert.equal(isRetryableProviderErrorV2(providerError(null, { name: "AbortError" })), true);
  assert.equal(isRetryableProviderErrorV2(providerError(null, { code: "ECONNRESET" })), true);
  assert.deepEqual(sanitizedProviderErrorV2(providerError(503, {
    requestId: "req-test",
    retryAfterMilliseconds: 2500
  })), {
    name: "Error",
    message: "provider 503",
    status: 503,
    code: null,
    requestId: "req-test",
    retryAfterMilliseconds: 2500,
    retryable: true
  });
  assert.equal(providerRetryDelayV2(providerError(429, { retryAfterMilliseconds: 2500 }), 0, () => 0), 2500);
});

test("retries one transient request and preserves its uncertain cost reserve", async () => {
  const runLedger = ledger();
  const delays = [];
  let attempts = 0;
  const result = await runBoundedToolStateMachineV3(options({
    runLedger,
    createResponse: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw providerError(503, { requestId: "req-retry", retryAfterMilliseconds: 1500 });
      }
      return completedResponse();
    },
    sleep: async delay => delays.push(delay)
  }));

  assert.equal(result.passed, true);
  assert.equal(result.modelCalls, 1);
  assert.equal(result.requestAttempts, 2);
  assert.equal(result.providerRetries, 1);
  assert.deepEqual(delays, [1500]);
  assert.equal(runLedger.apiRequestAttempts, 2);
  assert.equal(runLedger.modelCalls, 1);
  assert.equal(runLedger.providerRetries, 1);
  assert.ok(runLedger.uncertainCostReserveUsd > 0);
  assert.equal(
    runLedger.exposureCostUsd,
    runLedger.costUsd + runLedger.uncertainCostReserveUsd
  );
  assert.equal(result.trace[0].providerRequestError.requestId, "req-retry");
  assert.equal(result.trace[0].retryDelayMilliseconds, 1500);
  assert.equal(result.trace[1].billingUsageComplete, true);
});

test("returns a task-local provider failure after the one approved retry", async () => {
  const runLedger = ledger();
  let attempts = 0;
  const result = await runBoundedToolStateMachineV3(options({
    runLedger,
    createResponse: async () => {
      attempts += 1;
      throw providerError(500, { requestId: `req-${attempts}` });
    }
  }));

  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, ["provider-request-failure:500"]);
  assert.equal(result.modelCalls, 0);
  assert.equal(result.requestAttempts, 2);
  assert.equal(result.providerRetries, 1);
  assert.equal(runLedger.apiRequestAttempts, 2);
  assert.equal(runLedger.modelCalls, 0);
  assert.equal(runLedger.providerRetries, 1);
  assert.equal(runLedger.uncertainCostReserveUsd, result.uncertainCostReserveUsd);
});

test("does not retry authentication or invalid-request failures", async () => {
  const runLedger = ledger();
  let attempts = 0;
  await assert.rejects(
    runBoundedToolStateMachineV3(options({
      runLedger,
      createResponse: async () => {
        attempts += 1;
        throw providerError(401, { code: "invalid_api_key" });
      }
    })),
    /provider 401/u
  );
  assert.equal(attempts, 1);
  assert.equal(runLedger.apiRequestAttempts, 1);
  assert.equal(runLedger.providerRetries, 0);
  assert.ok(runLedger.uncertainCostReserveUsd > 0);
});

test("stops when the global provider retry budget is exhausted", async () => {
  const runLedger = ledger();
  const runPlan = plan();
  runPlan.limits.maximumProviderRetriesTotal = 0;
  await assert.rejects(
    runBoundedToolStateMachineV3(options({
      runPlan,
      runLedger,
      createResponse: async () => {
        throw providerError(503);
      }
    })),
    /global-provider-retry-cap/u
  );
  assert.equal(runLedger.apiRequestAttempts, 1);
  assert.equal(runLedger.providerRetries, 0);
});

test("charges the uncertainty reserve against the hard cap before retrying", async () => {
  const runLedger = ledger();
  const runPlan = plan();
  runPlan.limits.hardCostUsd = 0.12;
  let attempts = 0;
  await assert.rejects(
    runBoundedToolStateMachineV3(options({
      runPlan,
      runLedger,
      createResponse: async () => {
        attempts += 1;
        throw providerError(503);
      }
    })),
    /global-cost-cap/u
  );
  assert.equal(attempts, 1);
  assert.equal(runLedger.apiRequestAttempts, 1);
  assert.equal(runLedger.providerRetries, 0);
  assert.ok(runLedger.exposureCostUsd > 0);
});

test("does not violate an excessive Retry-After delay", async () => {
  const runLedger = ledger();
  const delays = [];
  let attempts = 0;
  const result = await runBoundedToolStateMachineV3(options({
    runLedger,
    createResponse: async () => {
      attempts += 1;
      throw providerError(429, { retryAfterMilliseconds: 60000 });
    },
    sleep: async delay => delays.push(delay)
  }));
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, ["provider-request-failure:429"]);
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
  assert.equal(runLedger.providerRetries, 0);
  assert.equal(result.trace[0].retrySkippedReason, "retry-delay-envelope");
});
