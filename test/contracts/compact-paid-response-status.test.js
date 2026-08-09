import assert from "node:assert/strict";
import test from "node:test";

import { runBoundedToolStateMachineV2 } from "../../scripts/compact-paid-state-machine-v2.js";

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
      maximumModelCallsPerTask: 1,
      maximumModelCallsTotal: 1,
      maximumInputTokensPerTask: 10000,
      maximumOutputTokensPerTask: 4000,
      maximumOutputTokensPerResponse: 4000,
      projectedInputBytesPerToken: 1,
      maximumRequestBodyBytesPerCall: 262144,
      maximumRequestBodyBytesPerTask: 262144,
      timeoutMilliseconds: 30000,
      hardCostUsd: 1
    },
    pricingPerMillionTokens: {
      uncachedInput: 2,
      cachedInput: 0.2,
      cacheWrite: 2.5,
      output: 12
    }
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
    costUsd: 0,
    modelCalls: 0
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

function response({ status, reason = null, output = [], outputTokens = 4000, reasoningTokens = 3979 }) {
  return {
    model: "gpt-5.6-terra",
    service_tier: "default",
    status,
    incomplete_details: reason === null ? null : { reason },
    error: null,
    output,
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      output_tokens: outputTokens,
      output_tokens_details: { reasoning_tokens: reasoningTokens },
      total_tokens: 100 + outputTokens
    }
  };
}

function options({
  runLedger,
  createResponse,
  runPlan = plan(),
  evaluateSubmission = async () => ({ passed: true, failures: [] }),
  onProgress = async () => {}
}) {
  return {
    plan: runPlan,
    task: { id: "bounded-task", stratum: "complex" },
    condition: "A",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: runLedger,
    artifactRoot: "/unused",
    route: ["submit_result"],
    createAdapter: async () => adapter(),
    submitTool,
    evaluateSubmission,
    promptBuilder: () => "Build one program.",
    createResponse,
    onProgress
  };
}

test("retains the prior evaluator failure when a correction exhausts its output budget", async () => {
  const runLedger = ledger();
  const runPlan = plan();
  runPlan.limits.maximumModelCallsPerTask = 2;
  runPlan.limits.maximumModelCallsTotal = 2;
  runPlan.limits.maximumOutputTokensPerTask = 8000;
  let call = 0;
  const result = await runBoundedToolStateMachineV2(options({
    runLedger,
    runPlan,
    evaluateSubmission: async () => ({ passed: false, failures: ["generated-program-error"] }),
    createResponse: async () => {
      call += 1;
      if (call === 1) {
        return response({
          status: "completed",
          outputTokens: 100,
          reasoningTokens: 50,
          output: [{
            type: "function_call",
            status: "completed",
            name: "submit_result",
            call_id: "submit-1",
            arguments: JSON.stringify({ status: "program" })
          }]
        });
      }
      return response({
        status: "incomplete",
        reason: "max_output_tokens",
        output: [{ type: "reasoning", status: "incomplete" }]
      });
    }
  }));

  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, [
    "generated-program-error",
    "model-output-budget-exhausted:max_output_tokens"
  ]);
  assert.equal(result.modelCalls, 2);
  assert.equal(runLedger.modelCalls, 2);
});

test("records max-output incompleteness as a bounded task failure and preserves provider metadata", async () => {
  const runLedger = ledger();
  const progress = [];
  const result = await runBoundedToolStateMachineV2(options({
    runLedger,
    createResponse: async () => response({
      status: "incomplete",
      reason: "max_output_tokens",
      output: [{ type: "reasoning", status: "incomplete" }]
    }),
    onProgress: async snapshot => progress.push(snapshot)
  }));

  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, ["model-output-budget-exhausted:max_output_tokens"]);
  assert.equal(result.modelCalls, 1);
  assert.equal(runLedger.modelCalls, 1);
  assert.equal(runLedger.usage.outputTokens, 4000);
  assert.equal(result.trace[0].provider.status, "incomplete");
  assert.deepEqual(result.trace[0].provider.incompleteDetails, { reason: "max_output_tokens" });
  assert.deepEqual(result.trace[0].provider.outputItems, [
    { type: "reasoning", status: "incomplete", name: null }
  ]);
  assert.equal(progress.at(-1).trace[0].billingUsageComplete, true);
});

test("keeps completed zero-call responses as provider protocol mismatches after accounting", async () => {
  const runLedger = ledger();
  await assert.rejects(
    runBoundedToolStateMachineV2(options({
      runLedger,
      createResponse: async () => response({
        status: "completed",
        output: [{ type: "reasoning", status: "completed" }],
        outputTokens: 50,
        reasoningTokens: 40
      })
    })),
    /provider-protocol-mismatch: forced submit_result, received 0 function calls/u
  );
  assert.equal(runLedger.modelCalls, 1);
  assert.equal(runLedger.usage.outputTokens, 50);
});

test("stops the run for unknown incomplete reasons after preserving usage", async () => {
  const runLedger = ledger();
  await assert.rejects(
    runBoundedToolStateMachineV2(options({
      runLedger,
      createResponse: async () => response({
        status: "incomplete",
        reason: "content_filter",
        output: []
      })
    })),
    /provider-response-status:incomplete:content_filter/u
  );
  assert.equal(runLedger.modelCalls, 1);
  assert.equal(runLedger.usage.outputTokens, 4000);
});
