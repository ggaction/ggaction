import assert from "node:assert/strict";
import test from "node:test";

import { summarizePaidComparisonV2 } from "../../scripts/compact-paid-comparison-v2.js";
import {
  loadPaidComparisonPlanV8,
  planForModelV8,
  runPaidComparisonDryRunV8,
  runPaidComparisonMatrixV8,
  runPaidComparisonTaskV8
} from "../../scripts/compact-paid-comparison-v8.js";
import {
  dualModelRunOrderV8,
  loadRouteOracleV8,
  modelCallEnvelopeV8
} from "../../scripts/compact-paid-oracle-v8.js";

const models = ["gpt-5.6-terra", "gpt-5.6-luna"];
const conditions = ["A", "B", "C", "D"];

function modelConfigs() {
  return [
    {
      id: models[0],
      pricingPerMillionTokens: {
        uncachedInput: 2,
        cachedInput: 0.2,
        cacheWrite: 2.5,
        output: 12
      }
    },
    {
      id: models[1],
      pricingPerMillionTokens: {
        uncachedInput: 0.2,
        cachedInput: 0.02,
        cacheWrite: 0.25,
        output: 1.2
      }
    }
  ];
}

function matrixPlan(runOrder) {
  return {
    id: "dual-model-contract",
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
    tasks: [...new Set(runOrder.map(run => run.split(":")[0]))].map(id => ({ id })),
    runOrder,
    limits: {
      maximumConsecutiveProviderFailureTaskRuns: 3
    }
  };
}

function result({ task, repetition, model, condition, passed, submissions = 1, cost = 0.01 }) {
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

test("balances every model-condition cell across all eight block positions", async () => {
  const oracle = await loadRouteOracleV8();
  const order = dualModelRunOrderV8(oracle.tasks, models, conditions, 2);
  assert.equal(order.length, 256);
  assert.equal(new Set(order).size, 256);
  const positions = new Map();
  for (let index = 0; index < order.length; index += 1) {
    const [, , model, condition] = order[index].split(":");
    const cell = `${model}:${condition}`;
    if (!positions.has(cell)) positions.set(cell, Array(8).fill(0));
    positions.get(cell)[index % 8] += 1;
  }
  assert.equal(positions.size, 8);
  for (const counts of positions.values()) assert.deepEqual(counts, Array(8).fill(4));
  assert.deepEqual(
    modelCallEnvelopeV8(oracle.tasks, models, conditions, 2, 3),
    {
      expected: 584,
      maximum: 1096,
      expectedPerModelRepetition: 146,
      maximumPerModelRepetition: 274
    }
  );
});

test("selects exact model pricing without changing the shared experiment plan", () => {
  const plan = matrixPlan([]);
  const terra = planForModelV8(plan, models[0]);
  const luna = planForModelV8(plan, models[1]);
  assert.equal(terra.api.model, models[0]);
  assert.equal(luna.api.model, models[1]);
  assert.equal(terra.pricingPerMillionTokens.output, 12);
  assert.equal(luna.pricingPerMillionTokens.output, 1.2);
  assert.equal(plan.api.model, undefined);
});

test("freezes the dual-model matrix, evaluator checkpoint, and rolling exposure cap", async () => {
  const plan = await loadPaidComparisonPlanV8();
  assert.equal(plan.planSha256, "498cbbd01c3618cc5fc39cd57fe40a55c589a0f01f319e08fd1cfca19bd773a2");
  assert.equal(plan.evaluatorCheckpointCommit, "39d35cefe750c513703e99cb3e088fc7065c401c");
  assert.equal(plan.routeOracleSha256, "dc241f8b717ee2d80a81762e23e870a1fdf57215f15bd3a30e4292dc39dca6a1");
  assert.equal(plan.tasks.length, 16);
  assert.equal(plan.runOrder.length, 256);
  assert.equal(plan.limits.repetitions, 2);
  assert.equal(plan.limits.maximumModelCallsTotal, 1096);
  assert.equal(plan.limits.maximumApiRequestAttemptsTotal, 1128);
  assert.equal(plan.limits.maximumProviderRetriesTotal, 32);
  assert.equal(plan.limits.maximumProviderRetryDelayMilliseconds, 30000);
  assert.equal(plan.limits.maximumConsecutiveProviderFailureTaskRuns, 3);
  assert.equal(plan.costProjection.expectedWithRegionalUpliftUsd, 11.15136);
  assert.equal(plan.costProjection.theoreticalTokenEnvelopeMaximumWithRegionalUpliftUsd, 98.50368);
  assert.equal(plan.limits.hardCostUsd, 30);
});

test("executes the same forced-tool contract with Luna and Luna pricing", async () => {
  const plan = await loadPaidComparisonPlanV8();
  const task = plan.tasks.find(entry => entry.id === "final3-27-geo");
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
  const result = await runPaidComparisonTaskV8({
    plan,
    task,
    model: "gpt-5.6-luna",
    condition: "B",
    apiKey: "test-key-with-more-than-twenty-characters",
    ledger,
    artifactRoot: "/unused",
    createResponse: async ({ request }) => {
      requestedModels.push(request.model);
      const [name, args] = tools[index];
      assert.deepEqual(request.tool_choice, { type: "function", name });
      index += 1;
      return {
        model: "gpt-5.6-luna",
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
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
          output_tokens: 50,
          output_tokens_details: { reasoning_tokens: 10 },
          total_tokens: 150
        }
      };
    }
  });
  assert.equal(result.passed, true);
  assert.equal(result.model, "gpt-5.6-luna");
  assert.deepEqual(requestedModels, ["gpt-5.6-luna", "gpt-5.6-luna"]);
  assert.equal(result.modelCalls, 2);
  assert.ok(result.costUsd < 0.001);
});

test("compares routes within models, models within routes, and route-by-model interactions", () => {
  const results = [];
  for (const repetition of [1, 2]) {
    for (const model of models) {
      for (const condition of conditions) {
        let passed = true;
        if (condition === "A" && repetition === 1) passed = false;
        if (model === models[1] && condition === "C" && repetition === 1) passed = false;
        results.push(result({
          task: "task-one",
          repetition,
          model,
          condition,
          passed,
          submissions: passed && repetition === 2 ? 2 : 1,
          cost: model === models[0] ? 0.01 : 0.001
        }));
      }
    }
  }
  const summary = summarizePaidComparisonV2(results, models, conditions);
  assert.equal(summary.taskRuns, 16);
  assert.equal(summary.cells[`${models[0]}:B`].passed, 2);
  assert.equal(summary.directVsMcp[models[0]].pairedTaskRepetitions, 2);
  assert.equal(
    summary.withinConditionModelPairs.C[`${models[0]}:${models[1]}`].rightMinusLeft.passRate,
    -0.5
  );
  assert.equal(summary.interactions["A:C"].completeTaskRepetitions, 2);
  assert.equal(summary.interactions["A:C"].lunaMinusTerraRouteImprovement.passRate, -0.5);
  assert.equal(summary.repetitionStability[`${models[1]}:C`].passAgreementRate, 0);
});

test("continues isolated provider failures and resets the circuit breaker on another outcome", async () => {
  const runOrder = [
    "one:r1:gpt-5.6-terra:A",
    "two:r1:gpt-5.6-terra:A",
    "three:r1:gpt-5.6-terra:A",
    "four:r1:gpt-5.6-terra:A"
  ];
  const plan = matrixPlan(runOrder);
  const outputs = [
    ["provider-request-failure:503"],
    ["provider-request-failure:503"],
    ["strict-evaluator-failure"],
    ["provider-request-failure:503"]
  ];
  const completed = await runPaidComparisonMatrixV8({
    plan,
    apiKey: "test-key-with-more-than-twenty-characters",
    runTask: async ({ task, model, condition }) => ({
      ...result({ task: task.id, repetition: 1, model, condition, passed: false }),
      failures: outputs.shift()
    })
  });
  assert.equal(completed.taskRuns, 4);
  assert.equal(completed.ledger.consecutiveProviderFailureTaskRuns, 1);
});

test("stops after three consecutive provider-failed task runs", async () => {
  const runOrder = [
    "one:r1:gpt-5.6-terra:A",
    "two:r1:gpt-5.6-terra:A",
    "three:r1:gpt-5.6-terra:A",
    "four:r1:gpt-5.6-terra:A"
  ];
  const plan = matrixPlan(runOrder);
  let failure;
  await assert.rejects(
    runPaidComparisonMatrixV8({
      plan,
      apiKey: "test-key-with-more-than-twenty-characters",
      onProgress: async progress => {
        if (progress.failure) failure = progress.failure;
      },
      runTask: async ({ task, model, condition }) => ({
        ...result({ task: task.id, repetition: 1, model, condition, passed: false }),
        failures: ["provider-request-failure:503"]
      })
    }),
    /provider-circuit-breaker/u
  );
  assert.equal(failure.results.length, 3);
  assert.equal(failure.ledger.consecutiveProviderFailureTaskRuns, 3);
  assert.equal(failure.abortedRun, runOrder[2]);
});

test("dry-runs all expanded routes and canonical evaluator cases without spend", async () => {
  const result = await runPaidComparisonDryRunV8();
  assert.equal(result.checks, 64);
  assert.equal(result.evaluatorChecks, 16);
  assert.equal(result.matrixCells, 256);
  assert.equal(result.passed, true);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.credentialReads, 0);
  assert.equal(result.spendUsd, 0);
});
