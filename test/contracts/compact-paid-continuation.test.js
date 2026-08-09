import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadPaidComparisonPlanV10 } from "../../scripts/compact-paid-comparison-v10.js";
import {
  continuationSourceFileV11,
  initializeContinuationV11,
  loadPaidComparisonPlanV11,
  runPaidComparisonMatrixV11,
  validateContinuationSourceV11
} from "../../scripts/compact-paid-comparison-v11.js";

test("freezes the append-only continuation plan and cumulative ledger boundary", async () => {
  const plan = await loadPaidComparisonPlanV11();
  assert.equal(plan.planSha256, "fec1c8dce0b2adb89e8db7652d74cd59df95727545adcd1e4129c1b33b3df5a6");
  assert.equal(plan.evaluatorCheckpointCommit, "97029c53689e215a33376f724b41ee0734ca858d");
  assert.equal(plan.basePlanSha256, "48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950");
  assert.equal(plan.continuation.sourceSha256, "1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381");
  assert.equal(plan.continuation.completedTaskRuns, 214);
  assert.equal(plan.continuation.remainingTaskRuns, 362);
  assert.equal(plan.continuation.nextRunPosition, 215);
  assert.equal(plan.continuation.nextRun, "final3-09-gradient-svg:r2:gpt-5.6-terra:D");
  assert.equal(plan.continuation.carryModelCalls, 620);
  assert.equal(plan.continuation.carryApiRequestAttempts, 634);
  assert.equal(plan.continuation.carryProviderRetries, 8);
  assert.equal(plan.continuation.carryExposureCostUsd, 3.269178747999999);
  assert.equal(plan.limits.hardCostUsd, 50);
});

function continuation(source) {
  return {
    source: "evaluation/compact-authoring-paid-comparison-v10/results/IN_PROGRESS.json",
    sourceSha256: "1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381",
    completedTaskRuns: 214,
    remainingTaskRuns: 362,
    nextRunPosition: 215,
    nextRun: "final3-09-gradient-svg:r2:gpt-5.6-terra:D",
    lastCompletedRun: "final3-09-gradient-svg:r2:gpt-5.6-terra:C",
    stoppedConsecutiveProviderFailures: 3,
    approvedCircuitReset: 0,
    carryExposureCostUsd: source.ledger.exposureCostUsd
  };
}

async function fixture() {
  const [base, sourceBytes] = await Promise.all([
    loadPaidComparisonPlanV10(),
    readFile(continuationSourceFileV11)
  ]);
  const source = JSON.parse(sourceBytes);
  return {
    source,
    plan: {
      ...base,
      id: "compact-authoring-paid-comparison-v11-test",
      basePlanSha256: base.planSha256,
      continuation: continuation(source),
      continuationSource: source
    }
  };
}

function syntheticResult({ task, condition, model }) {
  return {
    id: `${task.id}:${condition}`,
    task: task.id,
    condition,
    model,
    stratum: task.stratum,
    passed: true,
    modelCalls: 1,
    requestAttempts: 1,
    providerRetries: 0,
    submissionAttempts: 1,
    timeToValidMilliseconds: 1,
    elapsedMilliseconds: 1,
    usage: {
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      totalTokens: 2
    },
    standardCostUsd: 0,
    costUsd: 0,
    uncertainCostReserveUsd: 0,
    exposureCostUsd: 0,
    requestBodyBytes: 1,
    projectedInputTokens: 1,
    knowledge: { toolCalls: 1, searches: 1, docsReads: 0 },
    failures: [],
    trace: []
  };
}

test("resets only the reviewed consecutive-failure circuit and preserves the source ledger", async () => {
  const { plan, source } = await fixture();
  const before = JSON.stringify(source);
  const initialized = initializeContinuationV11(plan);

  assert.equal(initialized.startIndex, 214);
  assert.equal(initialized.results.length, 214);
  assert.equal(initialized.ledger.modelCalls, 620);
  assert.equal(initialized.ledger.apiRequestAttempts, 634);
  assert.equal(initialized.ledger.providerRetries, 8);
  assert.equal(initialized.ledger.exposureCostUsd, 3.269178747999999);
  assert.equal(initialized.ledger.consecutiveProviderFailureTaskRuns, 0);
  assert.equal(source.ledger.consecutiveProviderFailureTaskRuns, 3);
  assert.equal(JSON.stringify(source), before);
});

test("continues at run 215 and produces one exact 576-cell result without rerunning source cells", async () => {
  const { plan, source } = await fixture();
  const before = JSON.stringify(source);
  const calls = [];
  const result = await runPaidComparisonMatrixV11({
    plan,
    apiKey: "test-key-with-more-than-twenty-characters",
    now: () => new Date("2026-08-10T00:00:00.000Z"),
    runTask: async options => {
      calls.push({
        task: options.task.id,
        repetition: options.repetition,
        model: options.model,
        condition: options.condition,
        consecutive: options.ledger.consecutiveProviderFailureTaskRuns
      });
      options.ledger.modelCalls += 1;
      options.ledger.apiRequestAttempts += 1;
      options.ledger.usage.inputTokens += 1;
      options.ledger.usage.outputTokens += 1;
      options.ledger.usage.totalTokens += 2;
      return syntheticResult(options);
    }
  });

  assert.equal(calls.length, 362);
  assert.deepEqual(calls[0], {
    task: "final3-09-gradient-svg",
    repetition: 2,
    model: "gpt-5.6-terra",
    condition: "D",
    consecutive: 0
  });
  assert.equal(result.initialTaskRuns, 214);
  assert.equal(result.continuedTaskRuns, 362);
  assert.equal(result.taskRuns, 576);
  assert.equal(new Set(result.results.map(entry => entry.id)).size, 576);
  assert.deepEqual(
    result.results.map(entry => entry.id),
    plan.runOrder
  );
  assert.equal(result.results[213].id, source.results[213].id);
  assert.equal(result.results[214].id, plan.runOrder[214]);
  assert.equal(result.ledger.modelCalls, 982);
  assert.equal(result.ledger.apiRequestAttempts, 996);
  assert.equal(JSON.stringify(source), before);
});

test("rejects a continuation whose preserved result order was changed", async () => {
  const { plan, source } = await fixture();
  const tampered = structuredClone(source);
  [tampered.results[0], tampered.results[1]] = [tampered.results[1], tampered.results[0]];
  assert.throws(
    () => validateContinuationSourceV11(plan, tampered),
    /continuation source order is invalid/u
  );
});
