import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  loadRouteOracleV5,
  preflightPaidSmokeToolsV5,
  root,
  runPaidSmokeDryRunV5,
  runPaidSmokeTaskV5,
  submitResultToolV5
} from "../../scripts/compact-paid-smoke-v5.js";

function planForMocks() {
  return {
    api: {
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      textVerbosity: "low",
      serviceTier: "default",
      store: false,
      parallelToolCalls: false,
      include: ["reasoning.encrypted_content"]
    },
    limits: {
      maximumModelCallsPerTask: 3,
      maximumInputTokensPerTask: 120000,
      maximumOutputTokensPerTask: 12000,
      maximumOutputTokensPerResponse: 4000,
      projectedInputBytesPerToken: 1,
      maximumRequestBodyBytesPerCall: 262144,
      maximumRequestBodyBytesPerTask: 524288,
      timeoutMilliseconds: 30000,
      hardCostUsd: 6
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

function response(call, index) {
  return {
    model: "gpt-5.6-terra",
    service_tier: "default",
    output: [{
      type: "reasoning",
      id: `reasoning-${index}`,
      summary: [],
      encrypted_content: "opaque"
    }, call],
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      output_tokens: 50,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 150
    }
  };
}

test("freezes the eight repaired v5 smoke tasks and their exact D routes", async () => {
  const oracle = await loadRouteOracleV5();
  assert.equal(oracle.oracleSha256, "27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4");
  assert.equal(oracle.productCandidateCommit, "4e211ba418cd437d7c66c4fb986fcc714cf579ea");
  assert.deepEqual(
    oracle.tasks.map(task => [task.id, task.role, task.expectedDRoute]),
    [
      ["final3-03-bars-png", "supported", ["search_ggaction", "submit_result"]],
      ["final3-08-violin-canvas", "supported", ["search_ggaction", "submit_result"]],
      ["final3-12-rule-canvas", "supported", ["search_ggaction", "submit_result"]],
      ["final3-18-raw-bars-canvas", "supported", ["search_ggaction", "submit_result"]],
      ["final3-22-composition-svg", "supported", ["search_ggaction", "submit_result"]],
      ["final3-23-labels-png", "supported", ["search_ggaction", "submit_result"]],
      [
        "final3-37-rule-endpoint",
        "needs-input",
        ["search_ggaction", "read_mcp_resources", "submit_result"]
      ],
      [
        "final3-38-scale-consumer",
        "needs-input",
        ["search_ggaction", "read_mcp_resources", "submit_result"]
      ]
    ]
  );
});

test("preflights the v5 decision-aware submission schema", async () => {
  await preflightPaidSmokeToolsV5();
  assert.deepEqual(submitResultToolV5.parameters.properties.status.enum, [
    "program",
    "unsupported",
    "needs-input"
  ]);
});

test("dry-runs all 32 v5 routes and eight strict evaluations without spend", async () => {
  const result = await runPaidSmokeDryRunV5();
  assert.equal(result.checks, 32);
  assert.equal(result.evaluatorChecks, 8);
  assert.equal(result.passed, true);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.credentialReads, 0);
  assert.equal(result.spendUsd, 0);
  const dRoutes = result.details.filter(entry => entry.condition === "D");
  assert.deepEqual(dRoutes.map(entry => entry.knowledge.docsReads), [0, 0, 0, 0, 0, 0, 1, 1]);
});

test("uses the explicit fallback before submitting an exact needs-input decision", async () => {
  const oracle = await loadRouteOracleV5();
  const task = oracle.tasks.find(entry => entry.id === "final3-37-rule-endpoint");
  let index = 0;
  const result = await runPaidSmokeTaskV5({
    plan: planForMocks(),
    task,
    condition: "D",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger: ledger(),
    artifactRoot: path.join(root, ".artifacts", "test", "paid-smoke-v5-open"),
    createResponse: async () => {
      const call = [
        {
          type: "function_call",
          name: "search_ggaction",
          arguments: JSON.stringify({ query: task.query }),
          call_id: "search"
        },
        {
          type: "function_call",
          name: "read_mcp_resources",
          arguments: JSON.stringify({ uris: task.expectedFallbacks }),
          call_id: "read"
        },
        {
          type: "function_call",
          name: "submit_result",
          arguments: JSON.stringify({
            status: "needs-input",
            source: null,
            renderer: "canvas",
            unsupported: [],
            unresolved: ["encoding.rule.endpoint"]
          }),
          call_id: "submit"
        }
      ][index];
      index += 1;
      return response(call, index);
    }
  });
  assert.equal(result.passed, true);
  assert.equal(result.modelCalls, 3);
  assert.deepEqual(result.trace.map(entry => entry.tool), task.expectedDRoute);
});
