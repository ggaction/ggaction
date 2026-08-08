import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePairedAcceptance,
  summarizePairedEvaluationResults
} from "../../scripts/llm-eval/paired-summary.js";

const commit = "e".repeat(40);

function result({
  condition,
  taskId,
  repetition = 1,
  valid = true,
  tokens = 100,
  calls = 2,
  cost = 0.01,
  timeToValidMs = tokens * 2 - 1,
  forced = false,
  firstValid = valid,
  retrieval = condition !== "A"
}) {
  return {
    schemaVersion: 2,
    condition,
    taskId,
    repetition,
    knowledge: {
      commit,
      mode: { A: "docs-only", B: "structured-direct", C: "structured-mcp", D: "docs-plus-mcp" }[condition]
    },
    model: {
      provider: "openai",
      name: "test-model",
      reasoningEffort: "medium",
      textVerbosity: "low",
      serviceTier: "default",
      store: false
    },
    metrics: {
      totalTokens: tokens,
      modelCalls: calls,
      knowledgeToolCalls: condition === "A" ? 0 : 1,
      knowledgeToolCallsExecuted: condition === "A" ? 0 : 1,
      knowledgeToolCallsRejected: 0,
      submissions: 1,
      taskLoopDurationMs: tokens * 2,
      endToEndDurationMs: tokens * 2 + 5,
      timeToValidMs: valid ? timeToValidMs : null,
      estimatedCostUsd: cost,
      mcpOperations: { total: ["C", "D"].includes(condition) ? 1 : 0 }
    },
    outcome: {
      retrievalSucceeded: retrieval,
      naturalSubmission: !forced,
      forcedSubmissionUsed: forced,
      firstSubmissionValid: firstValid,
      finalValid: valid,
      failureCategory: valid ? null : "validation-failed"
    }
  };
}

test("compares efficiency only for the same successful task and repetition", () => {
  const summary = summarizePairedEvaluationResults([
    result({ condition: "B", taskId: "shared-success", tokens: 100 }),
    result({ condition: "C", taskId: "shared-success", tokens: 70 }),
    result({ condition: "B", taskId: "only-b-succeeds", tokens: 10 }),
    result({ condition: "C", taskId: "only-b-succeeds", valid: false, tokens: 900 }),
    result({ condition: "B", taskId: "only-c-succeeds", valid: false, tokens: 800 }),
    result({ condition: "C", taskId: "only-c-succeeds", tokens: 20 })
  ]);
  const comparison = summary.comparisons["transport-b-vs-c"];
  assert.equal(comparison.matchedRuns, 3);
  assert.equal(comparison.successfulPairs, 1);
  assert.equal(comparison.pairedCoverage, 1 / 3);
  assert.equal(comparison.metrics.totalTokens.meanDelta, -30);
  assert.equal(comparison.metrics.totalTokens.meanRelativeReduction, 0.3);
  assert.equal(comparison.metrics.totalTokens.medianRelativeReduction, 0.3);
  assert.equal(comparison.metrics.timeToValidMs.medianRelativeReduction, 60 / 199);
});

test("includes failed runs in accuracy and failure cost", () => {
  const summary = summarizePairedEvaluationResults([
    result({ condition: "A", taskId: "pass", tokens: 100, cost: 0.01 }),
    result({ condition: "A", taskId: "fail", valid: false, tokens: 700, calls: 6, cost: 0.08, forced: true })
  ]);
  const condition = summary.conditions.A;
  assert.equal(condition.stages.finalCorrectness.rate, 0.5);
  assert.equal(condition.stages.retrieval.eligibleRuns, 2);
  assert.equal(condition.failureCost.runs, 1);
  assert.equal(condition.failureCost.totalTokens, 700);
  assert.equal(condition.failureCost.modelCalls, 6);
  assert.equal(condition.failureCost.estimatedCostUsd, 0.08);
});

test("groups repetitions under task-level uncertainty", () => {
  const rows = [
    result({ condition: "B", taskId: "task-1", repetition: 1, tokens: 100 }),
    result({ condition: "C", taskId: "task-1", repetition: 1, tokens: 90 }),
    result({ condition: "B", taskId: "task-1", repetition: 2, tokens: 120 }),
    result({ condition: "C", taskId: "task-1", repetition: 2, tokens: 80 }),
    result({ condition: "B", taskId: "task-2", repetition: 1, tokens: 200 }),
    result({ condition: "C", taskId: "task-2", repetition: 1, tokens: 170 })
  ];
  const first = summarizePairedEvaluationResults(rows);
  const second = summarizePairedEvaluationResults(rows);
  const metric = first.comparisons["transport-b-vs-c"].metrics.totalTokens;
  assert.equal(metric.pairedRunCount, 3);
  assert.equal(metric.taskCount, 2);
  assert.equal(metric.meanDelta, -27.5);
  assert.equal(metric.medianRelativeReduction, (13 / 60 + 0.15) / 2);
  assert.deepEqual(metric.uncertainty95, second.comparisons["transport-b-vs-c"].metrics.totalTokens.uncertainty95);
});

test("applies the predeclared correctness and task-level median efficiency rule", () => {
  const rows = [];
  for (let task = 1; task <= 10; task += 1) {
    const taskId = `task-${task}`;
    rows.push(
      result({ condition: "A", taskId, tokens: 100, calls: 2, timeToValidMs: 200 }),
      result({ condition: "B", taskId, tokens: 75, calls: 2, timeToValidMs: 170 }),
      result({ condition: "C", taskId, tokens: 70, calls: 1, timeToValidMs: 150 }),
      result({ condition: "D", taskId, tokens: 95, calls: 2, timeToValidMs: 230 })
    );
  }
  const summary = summarizePairedEvaluationResults(rows);
  const mcp = evaluatePairedAcceptance(summary, { candidate: "C" });
  assert.equal(mcp.accepted, true);
  assert.equal(mcp.efficiencyThresholdsPassed, 3);
  assert.deepEqual(mcp.efficiency.map(check => check.actual), [0.3, 0.5, 0.25]);

  const combined = evaluatePairedAcceptance(summary, { candidate: "D" });
  assert.equal(combined.accepted, false);
  assert.equal(combined.efficiencyThresholdsPassed, 0);
  assert.equal(combined.efficiency.find(check => check.metric === "timeToValidMs").noLargeRegression, false);
});

test("enforces low-baseline first-pass improvement and structured transport correctness", () => {
  const lowFirstPassRows = [];
  for (let task = 1; task <= 10; task += 1) {
    const taskId = `low-first-${task}`;
    lowFirstPassRows.push(
      result({ condition: "A", taskId, firstValid: task > 2, tokens: 100, calls: 2, timeToValidMs: 200 }),
      result({ condition: "B", taskId, tokens: 75, calls: 2, timeToValidMs: 170 }),
      result({ condition: "C", taskId, firstValid: task > 2, tokens: 70, calls: 1, timeToValidMs: 150 })
    );
  }
  const lowFirstPass = evaluatePairedAcceptance(summarizePairedEvaluationResults(lowFirstPassRows));
  assert.equal(lowFirstPass.accepted, false);
  assert.equal(
    lowFirstPass.correctness.find(check => check.id === "first-submission-correctness-vs-docs").passed,
    false
  );

  const transportRows = [];
  for (let task = 1; task <= 10; task += 1) {
    const taskId = `transport-${task}`;
    const valid = task > 1;
    transportRows.push(
      result({ condition: "A", taskId, valid, tokens: 100, calls: 2, timeToValidMs: 200 }),
      result({ condition: "B", taskId, tokens: 75, calls: 2, timeToValidMs: 170 }),
      result({ condition: "C", taskId, valid, tokens: 70, calls: 1, timeToValidMs: 150 })
    );
  }
  const transport = evaluatePairedAcceptance(summarizePairedEvaluationResults(transportRows));
  assert.equal(transport.accepted, false);
  assert.equal(
    transport.correctness.find(check => check.id === "final-correctness-vs-structured-direct").passed,
    false
  );
});

test("rejects mixed commits and duplicate run identities", () => {
  const row = result({ condition: "B", taskId: "task" });
  assert.throws(() => summarizePairedEvaluationResults([row, structuredClone(row)]), /duplicate/u);
  const changed = result({ condition: "C", taskId: "task" });
  changed.knowledge.commit = "f".repeat(40);
  assert.throws(() => summarizePairedEvaluationResults([row, changed]), /mix candidate commits/u);
});
