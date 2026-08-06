import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadEvaluationCorpus,
  validateEvaluationCorpus,
  validateEvaluationResult
} from "../../scripts/llm-eval/corpus.js";
import { runEvaluationDryRun, syntheticPassingResult } from "../../scripts/llm-eval/dry-run.js";
import { scoreEvaluationEvidence } from "../../scripts/llm-eval/score.js";

const evaluationPlanFile = new URL("../llm/evaluation-plan.json", import.meta.url);

test("keeps a balanced, versioned, unambiguous LLM evaluation corpus", async () => {
  const corpus = await loadEvaluationCorpus();
  const summary = await validateEvaluationCorpus(corpus);

  assert.deepEqual(summary, {
    taskCount: 24,
    splitCounts: { authoring: 12, heldout: 12 },
    datasetCount: 5
  });
  assert.equal(new Set(corpus.tasks.map(task => task.category)).size >= 12, true);
  assert.equal(corpus.tasks.filter(task => task.difficulty === "repair").length >= 3, true);
  assert.equal(corpus.tasks.some(task => task.oracle.renderers.length === 4), true);
});

test("dry-runs every task without an external model call", async () => {
  const dryRun = await runEvaluationDryRun();

  assert.equal(dryRun.summary.total, 24);
  assert.equal(dryRun.summary.successful, 24);
  assert.equal(dryRun.summary.failed, 0);
  assert.equal(dryRun.summary.tokensPerSuccessfulChart, 0);
  assert.equal(dryRun.summary.modelCallsPerSuccessfulChart, 0);
});

test("keeps the approved paid evaluation bounded and internally consistent", async () => {
  const plan = JSON.parse(await readFile(evaluationPlanFile, "utf8"));
  const runs = plan.sampling.taskCount * plan.sampling.repetitionsPerTask;
  const expectedPerRun = (
    plan.tokenBudgetPerTask.expectedInputTokens * plan.pricingUsdPerMillionTokens.uncachedInput +
    plan.tokenBudgetPerTask.expectedOutputTokens * plan.pricingUsdPerMillionTokens.output
  ) / 1_000_000;
  const maximumPerRun = (
    plan.tokenBudgetPerTask.maximumCumulativeInputTokens * plan.pricingUsdPerMillionTokens.cacheWrite +
    plan.tokenBudgetPerTask.maximumCumulativeOutputTokens * plan.pricingUsdPerMillionTokens.output
  ) / 1_000_000;

  assert.equal(plan.approvalStatus, "approved");
  assert.equal(runs, plan.sampling.runsPerCondition);
  assert.equal(Number((expectedPerRun * runs).toFixed(2)), plan.costPerConditionUsd.expected);
  assert.equal(Number((maximumPerRun * runs).toFixed(2)), plan.costPerConditionUsd.calculatedMaximum);
  assert.equal(plan.costPerConditionUsd.calculatedMaximum < plan.costPerConditionUsd.approvedSpendCap, true);
  assert.deepEqual(plan.conditions, {
    A: "current-docs",
    B: "structured-knowledge",
    C: "local-mcp"
  });
});

test("rejects missing oracle evidence and mismatched result conditions", async () => {
  const corpus = await loadEvaluationCorpus();
  const task = corpus.tasks[0];
  const result = syntheticPassingResult(task);
  const missingValidation = task.oracle.requiredValidations[0];
  const incompleteEvidence = {
    ...result.evidence,
    validations: result.evidence.validations.filter(validation => validation.id !== missingValidation)
  };

  assert.deepEqual(scoreEvaluationEvidence(task, incompleteEvidence), {
    valid: false,
    failures: [`failed-validation:${missingValidation}`]
  });
  assert.throws(
    () => validateEvaluationResult({
      ...result,
      condition: "C"
    }, corpus),
    /matching knowledge mode/
  );
});
