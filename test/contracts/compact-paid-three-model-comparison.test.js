import assert from "node:assert/strict";
import test from "node:test";

import { summarizePaidComparisonV3 } from "../../scripts/compact-paid-comparison-v3.js";
import { loadPaidComparisonPlanV8 } from "../../scripts/compact-paid-comparison-v8.js";
import {
  runPaidComparisonDryRunV9,
  runPaidComparisonMatrixV9,
  runPaidComparisonTaskV9
} from "../../scripts/compact-paid-comparison-v9.js";
import {
  loadRouteOracleV9,
  modelCallEnvelopeV9,
  threeModelRunOrderV9
} from "../../scripts/compact-paid-oracle-v9.js";

const models = ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4-nano"];
const conditions = ["A", "B", "C", "D"];

function modelConfigs() {
  return [
    {
      id: models[0],
      cacheWriteBillingBasis: "explicit-cache-write",
      pricingPerMillionTokens: {
        uncachedInput: 2,
        cachedInput: 0.2,
        cacheWrite: 2.5,
        maximumInput: 2.5,
        output: 12
      }
    },
    {
      id: models[1],
      cacheWriteBillingBasis: "explicit-cache-write",
      pricingPerMillionTokens: {
        uncachedInput: 0.2,
        cachedInput: 0.02,
        cacheWrite: 0.25,
        maximumInput: 0.25,
        output: 1.2
      }
    },
    {
      id: models[2],
      cacheWriteBillingBasis: "uncached-input-fallback",
      pricingPerMillionTokens: {
        uncachedInput: 0.2,
        cachedInput: 0.02,
        cacheWrite: 0.2,
        maximumInput: 0.2,
        output: 1.25
      }
    }
  ];
}

function matrixPlan(runOrder) {
  return {
    id: "three-model-contract",
    planSha256: "test-plan",
    routeOracleSha256: "test-oracle",
    productCandidateCommit: "test-product",
    evaluatorCheckpointCommit: "test-evaluator",
    models: modelConfigs(),
    api: {
      reasoningEffort: "medium",
      textVerbosity: "low",
      serviceTier: "default",
      store: false,
      include: ["reasoning.encrypted_content"]
    },
    conditions: conditions.map(id => ({ id })),
    tasks: [...new Set(runOrder.map(run => run.split(":r")[0]))].map(id => ({ id })),
    runOrder,
    limits: {
      maximumConsecutiveProviderFailureTaskRuns: 3
    }
  };
}

function result({ task, repetition, model, condition, passed, submissions = 1 }) {
  const cost = model === models[0] ? 0.01 : 0.001;
  return {
    id: `${task}:r${repetition}:${model}:${condition}`,
    task,
    repetition,
    model,
    condition,
    passed,
    modelCalls: 2,
    requestAttempts: 2,
    providerRetries: 0,
    submissionAttempts: submissions,
    timeToValidMilliseconds: passed ? 100 : null,
    elapsedMilliseconds: 120,
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 50,
      reasoningTokens: 10,
      totalTokens: 150
    },
    standardCostUsd: cost / 1.1,
    costUsd: cost,
    uncertainCostReserveUsd: 0,
    exposureCostUsd: cost,
    knowledge: { toolCalls: 1, searches: 1, docsReads: 0 },
    failures: passed ? [] : ["strict-evaluator-failure"],
    trace: [{
      modelLatencyMilliseconds: 80,
      toolLatencyMilliseconds: condition === "C" ? 20 : 2,
      evaluationLatencyMilliseconds: 10,
      toolResultBytes: 100
    }]
  };
}

test("balances all twelve model-condition cells across the expanded matrix", async () => {
  const oracle = await loadRouteOracleV9();
  const order = threeModelRunOrderV9(oracle.tasks, models, conditions, 2);
  assert.equal(order.length, 576);
  assert.equal(new Set(order).size, 576);
  const positions = new Map();
  for (let index = 0; index < order.length; index += 1) {
    const [, , model, condition] = order[index].split(":");
    const cell = `${model}:${condition}`;
    if (!positions.has(cell)) positions.set(cell, Array(12).fill(0));
    positions.get(cell)[index % 12] += 1;
  }
  assert.equal(positions.size, 12);
  for (const counts of positions.values()) assert.deepEqual(counts, Array(12).fill(4));
  assert.deepEqual(
    modelCallEnvelopeV9(oracle.tasks, models, conditions, 2, 3),
    {
      expected: 1308,
      maximum: 2460,
      expectedPerModelRepetition: 218,
      maximumPerModelRepetition: 410
    }
  );
});

test("compares every model pair and every route interaction", () => {
  const results = [];
  for (const repetition of [1, 2]) {
    for (const model of models) {
      for (const condition of conditions) {
        const passed = model === models[2]
          ? condition !== "C"
          : condition !== "A";
        results.push(result({ task: "task-one", repetition, model, condition, passed }));
      }
    }
  }
  const summary = summarizePaidComparisonV3(results, models, conditions);
  assert.equal(summary.schemaVersion, 3);
  assert.equal(summary.taskRuns, 24);
  assert.equal(Object.keys(summary.withinConditionModelPairs.A).length, 3);
  assert.equal(Object.keys(summary.interactions).length, 9);
  assert.equal(
    summary.interactions[`${models[0]}:${models[2]}:A:C`]
      .rightMinusLeftRouteImprovement.passRate,
    -2
  );
  assert.equal(summary.directVsMcp[models[2]].pairedTaskRepetitions, 2);
});

test("normalizes absent Nano cache-write usage without inventing a billed write rate", async () => {
  const v8 = await loadPaidComparisonPlanV8();
  const plan = {
    ...v8,
    models: modelConfigs()
  };
  const task = v8.tasks.find(entry => entry.id === "final3-27-geo");
  const requestedModels = [];
  let index = 0;
  const tools = [
    ["search_ggaction", { query: task.query }],
    ["submit_result", {
      status: "unsupported",
      source: null,
      renderer: "svg",
      unsupported: ["unsupported.geo"],
      unresolved: []
    }]
  ];
  const ledger = {
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
  const execution = await runPaidComparisonTaskV9({
    plan,
    task,
    model: models[2],
    condition: "B",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger,
    artifactRoot: "/unused",
    createResponse: async ({ request }) => {
      requestedModels.push(request.model);
      const [name, args] = tools[index];
      index += 1;
      return {
        model: models[2],
        service_tier: "default",
        status: "completed",
        incomplete_details: null,
        error: null,
        output: [{
          type: "function_call",
          status: "completed",
          name,
          call_id: `${name}-${index}`,
          arguments: JSON.stringify(args)
        }],
        usage: {
          input_tokens: 100,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 50,
          output_tokens_details: { reasoning_tokens: 10 },
          total_tokens: 150
        }
      };
    }
  });
  assert.equal(execution.passed, true);
  assert.equal(execution.model, models[2]);
  assert.deepEqual(requestedModels, [models[2], models[2]]);
  assert.equal(execution.usage.cacheWriteTokens, 0);
  assert.ok(execution.costUsd < 0.001);
});

test("uses the generalized comparison after a three-model matrix", async () => {
  const runOrder = models.flatMap(model =>
    conditions.map(condition => `one:r1:${model}:${condition}`)
  );
  const plan = matrixPlan(runOrder);
  const completed = await runPaidComparisonMatrixV9({
    plan,
    apiKey: "test-key-with-more-than-twenty-characters",
    runTask: async ({ task, model, condition }) => result({
      task: task.id,
      repetition: 1,
      model,
      condition,
      passed: condition !== "A"
    })
  });
  assert.equal(completed.taskRuns, 12);
  assert.equal(completed.comparison.schemaVersion, 3);
  assert.equal(Object.keys(completed.comparison.interactions).length, 9);
});

test("dry-runs all 96 routes and 24 canonical evaluator cases without spend", async () => {
  const dry = await runPaidComparisonDryRunV9();
  assert.equal(dry.checks, 96);
  assert.equal(dry.evaluatorChecks, 24);
  assert.equal(dry.matrixCells, 576);
  assert.equal(dry.passed, true);
  assert.equal(dry.externalCalls, 0);
  assert.equal(dry.credentialReads, 0);
  assert.equal(dry.spendUsd, 0);
});
