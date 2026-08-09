import assert from "node:assert/strict";
import test from "node:test";

import { summarizePaidSmokeComparisonV1 } from "../../scripts/compact-paid-comparison-v1.js";
import { runPaidSmokeMatrixV7 } from "../../scripts/compact-paid-smoke-v7.js";

function result({ task, condition, passed, costUsd, outputTokens, elapsed, attempts, failures = [] }) {
  return {
    task,
    condition,
    passed,
    runPosition: 1,
    modelCalls: attempts + 1,
    submissionAttempts: attempts,
    timeToValidMilliseconds: passed ? elapsed : null,
    elapsedMilliseconds: elapsed,
    costUsd,
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens,
      reasoningTokens: outputTokens / 2,
      totalTokens: 100 + outputTokens
    },
    knowledge: { toolCalls: 1, searches: 1, docsReads: 0 },
    trace: [{
      toolResultBytes: 50,
      modelLatencyMilliseconds: 10,
      toolLatencyMilliseconds: 5,
      evaluationLatencyMilliseconds: 3
    }],
    failures
  };
}

test("reports condition totals and paired direct-versus-MCP deltas without survivorship bias", () => {
  const results = [
    result({ task: "one", condition: "A", passed: false, costUsd: 0.04, outputTokens: 4000, elapsed: 90, attempts: 2, failures: ["invalid-program"] }),
    result({ task: "one", condition: "B", passed: true, costUsd: 0.02, outputTokens: 900, elapsed: 50, attempts: 1 }),
    result({ task: "one", condition: "C", passed: true, costUsd: 0.021, outputTokens: 950, elapsed: 55, attempts: 1 }),
    result({ task: "one", condition: "D", passed: true, costUsd: 0.023, outputTokens: 1000, elapsed: 60, attempts: 2 }),
    result({ task: "two", condition: "A", passed: true, costUsd: 0.03, outputTokens: 1200, elapsed: 70, attempts: 1 }),
    result({ task: "two", condition: "B", passed: false, costUsd: 0.05, outputTokens: 5000, elapsed: 100, attempts: 3, failures: ["budget"] }),
    result({ task: "two", condition: "C", passed: true, costUsd: 0.025, outputTokens: 1100, elapsed: 65, attempts: 2 }),
    result({ task: "two", condition: "D", passed: false, costUsd: 0.045, outputTokens: 4500, elapsed: 95, attempts: 3, failures: ["budget"] })
  ];
  results.forEach((entry, index) => { entry.runPosition = index + 1; });

  const summary = summarizePaidSmokeComparisonV1(results);
  assert.equal(summary.taskRuns, 8);
  assert.equal(summary.uniqueTasks, 2);
  assert.equal(summary.conditions.A.passRate, 0.5);
  assert.equal(summary.conditions.B.firstSubmissionPasses, 1);
  assert.equal(summary.conditions.C.passed, 2);
  assert.equal(summary.conditions.D.failures.budget, 1);
  assert.equal(summary.directVsMcp.pairedTasks, 2);
  assert.equal(summary.directVsMcp.bothPassed, 1);
  assert.equal(summary.directVsMcp.rightOnlyPassed, 1);
  assert.ok(Math.abs(summary.directVsMcp.rightMinusLeft.costUsdMean - (-0.012)) < 1e-12);
  assert.equal(summary.directVsMcp.rightMinusLeft.knowledgeToolLatencyMillisecondsMean, 0);
  assert.equal(summary.conditions.C.latencyMilliseconds.model.count, 2);
  assert.equal(summary.runOrder.length, 8);
});

test("continues the fixed matrix after a returned task failure and compares the next condition", async () => {
  const plan = {
    id: "matrix-test",
    planSha256: "plan",
    routeOracleSha256: "oracle",
    productCandidateCommit: "product",
    evaluatorCheckpointCommit: "evaluator",
    runOrder: ["one:A", "one:B"],
    tasks: [{ id: "one" }],
    conditions: [{ id: "A" }, { id: "B" }]
  };
  const calls = [];
  const matrix = await runPaidSmokeMatrixV7({
    plan,
    apiKey: "unused",
    runTask: async ({ condition }) => {
      calls.push(condition);
      return result({
        task: "one",
        condition,
        passed: condition === "B",
        costUsd: condition === "A" ? 0.04 : 0.02,
        outputTokens: condition === "A" ? 4000 : 900,
        elapsed: condition === "A" ? 90 : 50,
        attempts: condition === "A" ? 2 : 1,
        failures: condition === "A" ? ["invalid-program"] : []
      });
    }
  });

  assert.deepEqual(calls, ["A", "B"]);
  assert.equal(matrix.taskRuns, 2);
  assert.equal(matrix.passedTaskRuns, 1);
  assert.equal(matrix.comparison.conditions.A.passed, 0);
  assert.equal(matrix.comparison.conditions.B.passed, 1);
  assert.deepEqual(matrix.results.map(entry => entry.runPosition), [1, 2]);
});
