import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { syntheticPassingResult } from "../../scripts/llm-eval/dry-run.js";
import { orderedRuns } from "../../scripts/llm-eval/run-paid-conditions.js";
import {
  assertCorrectiveFullEvaluationPlan,
  initializeOrValidateFullEvaluationOutput,
  prepareCorrectiveFullEvaluation,
  runCorrectiveFullEvaluationSequence,
  runExecutableRecipeFull
} from "../../scripts/llm-eval/run-executable-recipe-full.js";
import { generateCorrectedComparison } from "../../scripts/llm-eval/summarize-corrected-comparison.js";

const fullPlanUrl = new URL("../llm/corrective-full-evaluation-plan.json", import.meta.url);
const evaluationPlanUrl = new URL("../llm/evaluation-plan.json", import.meta.url);
const corpusUrl = new URL("../llm/tasks.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/index.json", import.meta.url);
const knowledgeSearchUrl = new URL("../../knowledge/search-index.json", import.meta.url);
const publicRecipeUrl = new URL("../../docs/llms-recipes.json", import.meta.url);
const candidateCommit = "e88fbea9761ddc46268c400be1af280e838b71a2";

function evaluationResult(prepared, condition, run, {
  failureCategory = null,
  costUsd = 0.01,
  totalTokens = 1000,
  modelCalls = 3,
  timeToValidMs = 1000
} = {}) {
  const valid = failureCategory === null;
  const base = syntheticPassingResult(run.task, condition);
  return {
    ...base,
    runId: `${condition}-${run.task.id}-r${run.repetition}`,
    knowledge: { ...base.knowledge, commit: candidateCommit },
    model: {
      provider: prepared.evaluationPlan.provider,
      name: prepared.evaluationPlan.model.name,
      resolvedName: prepared.evaluationPlan.model.name,
      reasoningEffort: prepared.evaluationPlan.model.reasoningEffort,
      reasoningMode: prepared.evaluationPlan.model.reasoningMode,
      textVerbosity: prepared.evaluationPlan.model.textVerbosity,
      serviceTier: prepared.evaluationPlan.model.serviceTier,
      store: prepared.evaluationPlan.model.store,
      maxOutputTokensPerCall: prepared.evaluationPlan.tokenBudgetPerTask.maximumOutputTokensPerCall,
      maxCumulativeInputTokens: prepared.evaluationPlan.tokenBudgetPerTask.maximumCumulativeInputTokens,
      maxCumulativeOutputTokens: prepared.evaluationPlan.tokenBudgetPerTask.maximumCumulativeOutputTokens
    },
    metrics: {
      promptTokens: totalTokens - 100,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      completionTokens: 100,
      reasoningTokens: 0,
      totalTokens,
      modelCalls,
      mcpCalls: condition === "C" ? 3 : 0,
      repairRounds: 0,
      timeToValidMs: valid ? timeToValidMs : null,
      estimatedCostUsd: costUsd
    },
    outcome: {
      firstPassValid: valid,
      finalValid: valid,
      failureCategory
    }
  };
}

async function frozenInputs() {
  const [
    fullPlanBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  ] = await Promise.all([
    readFile(fullPlanUrl),
    readFile(evaluationPlanUrl),
    readFile(corpusUrl),
    readFile(knowledgeUrl),
    readFile(knowledgeSearchUrl),
    readFile(publicRecipeUrl)
  ]);
  return {
    fullPlanBytes,
    hashes: { evaluationPlanBytes, corpusBytes, knowledgeBytes, knowledgeSearchBytes, publicRecipeBytes }
  };
}

test("locks complete paid evaluation scope and spend before credentials are read", async () => {
  const { fullPlanBytes, hashes } = await frozenInputs();
  const fullPlan = JSON.parse(fullPlanBytes);
  const validated = assertCorrectiveFullEvaluationPlan(fullPlan, hashes);
  const prepared = await prepareCorrectiveFullEvaluation();

  assert.equal(validated.candidateCommit, candidateCommit);
  assert.deepEqual(validated.conditions, ["B", "C"]);
  assert.equal(validated.maximumRuns, 96);
  assert.equal(validated.runsPerCondition, 48);
  assert.equal(validated.outputRoot, ".artifacts/llm-eval/executable-recipe-full-e88fbea9");
  assert.deepEqual(validated.spendUsd, {
    planningPerRun: 0.025,
    calculatedMaximumPerRun: 0.156,
    planningPerCondition: 1.2,
    approvedCapPerCondition: 3,
    approvedCombinedCap: 6
  });
  assert.equal(prepared.corpus.tasks.length, 24);

  for (const mutation of [
    { approvalStatus: "planned" },
    { approvedOn: "2026-08-08" },
    { candidateCommit: "f".repeat(40) },
    { taskCount: 23 },
    { repetitionsPerTask: 1 },
    { runsPerCondition: 24 },
    { conditions: ["C", "B"] },
    { maximumRuns: 95 },
    { orderSeed: "other" },
    { maximumConsecutiveInfrastructureFailures: 4 },
    { outputRoot: ".artifacts/llm-eval/other" },
    { knowledgeSha256: "f".repeat(64) },
    { knowledgeSearchSha256: "f".repeat(64) },
    { publicRecipeSha256: "f".repeat(64) },
    { spendUsd: { ...fullPlan.spendUsd, approvedCombinedCap: 7 } }
  ]) {
    assert.throws(
      () => assertCorrectiveFullEvaluationPlan({ ...fullPlan, ...mutation }, hashes),
      /Corrective full evaluation/u
    );
  }

  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-full-plan-"));
  const unapprovedPlan = path.join(temporary, "plan.json");
  await writeFile(unapprovedPlan, JSON.stringify({ ...fullPlan, approvalStatus: "planned" }));
  let credentialReads = 0;
  await assert.rejects(
    () => runExecutableRecipeFull({
      fullPlanFile: unapprovedPlan,
      loadApiKeyImpl: async () => {
        credentialReads += 1;
        return `sk-${"x".repeat(40)}`;
      }
    }),
    /not approved/u
  );
  assert.equal(credentialReads, 0);
});

test("creates an exact resumable manifest and rejects unmanaged output", async () => {
  const prepared = await prepareCorrectiveFullEvaluation();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-full-output-"));
  const outputRoot = path.join(temporary, "run");
  const isolated = { ...prepared, outputRoot };

  const fresh = await initializeOrValidateFullEvaluationOutput(isolated);
  assert.equal(fresh.fresh, true);
  assert.deepEqual(fresh.results, { B: [], C: [] });
  const resumed = await initializeOrValidateFullEvaluationOutput(isolated);
  assert.equal(resumed.fresh, false);
  assert.deepEqual(resumed.spentUsd, { B: 0, C: 0 });

  await writeFile(path.join(outputRoot, "unexpected.txt"), "unmanaged");
  await assert.rejects(
    () => initializeOrValidateFullEvaluationOutput(isolated),
    /not managed/u
  );
});

test("records invalid programs, completes B before C, and blocks C on infrastructure faults", async () => {
  const base = await prepareCorrectiveFullEvaluation();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-full-sequence-"));
  const prepared = { ...base, outputRoot: temporary };
  const runs = orderedRuns(prepared.corpus, prepared.evaluationPlan);
  const calls = [];
  const appendResult = async () => {};
  const state = { results: { B: [], C: [] }, spentUsd: { B: 0, C: 0 } };

  const complete = await runCorrectiveFullEvaluationSequence({
    prepared,
    state,
    apiKey: `sk-${"x".repeat(40)}`,
    appendResult,
    runnersByCondition: {
      B: async ({ task, repetition }) => {
        const run = { task, repetition };
        calls.push(`B-${task.id}-r${repetition}`);
        return evaluationResult(prepared, "B", run, {
          failureCategory: calls.length === 1 ? "invalid-program" : null
        });
      },
      C: async ({ task, repetition }) => {
        const run = { task, repetition };
        calls.push(`C-${task.id}-r${repetition}`);
        return evaluationResult(prepared, "C", run);
      }
    }
  });
  assert.deepEqual(complete.runs, { B: 48, C: 48 });
  assert.equal(complete.complete, true);
  assert.equal(calls[47], `B-${runs[47].task.id}-r${runs[47].repetition}`);
  assert.equal(calls[48], `C-${runs[0].task.id}-r${runs[0].repetition}`);

  calls.length = 0;
  const blocked = await runCorrectiveFullEvaluationSequence({
    prepared,
    state,
    apiKey: `sk-${"x".repeat(40)}`,
    appendResult,
    runnersByCondition: {
      B: async ({ task, repetition }) => {
        const run = { task, repetition };
        calls.push(`B-${task.id}-r${repetition}`);
        return evaluationResult(prepared, "B", run, {
          failureCategory: calls.length === 1 ? "provider-error" : null
        });
      },
      C: async () => {
        throw new Error("Condition C must not start after a Condition B infrastructure fault.");
      }
    }
  });
  assert.deepEqual(blocked.runs, { B: 48, C: 0 });
  assert.equal(blocked.stopReason, "condition-b-infrastructure-fault");
});

test("stops after three consecutive infrastructure failures", async () => {
  const base = await prepareCorrectiveFullEvaluation();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-full-stop-"));
  const prepared = { ...base, outputRoot: temporary };
  const result = await runCorrectiveFullEvaluationSequence({
    prepared,
    state: { results: { B: [], C: [] }, spentUsd: { B: 0, C: 0 } },
    apiKey: `sk-${"x".repeat(40)}`,
    appendResult: async () => {},
    runnersByCondition: {
      B: async ({ task, repetition }) => evaluationResult(prepared, "B", { task, repetition }, {
        failureCategory: "timeout"
      }),
      C: async () => {
        throw new Error("Condition C must not start after repeated infrastructure failures.");
      }
    }
  });
  assert.deepEqual(result.runs, { B: 3, C: 0 });
  assert.equal(result.stopReason, "consecutive-infrastructure-failures");
});

test("stops when a returned result reaches the approved spend boundary", async () => {
  const base = await prepareCorrectiveFullEvaluation();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-full-budget-"));
  const prepared = { ...base, outputRoot: temporary };
  const result = await runCorrectiveFullEvaluationSequence({
    prepared,
    state: { results: { B: [], C: [] }, spentUsd: { B: 0, C: 0 } },
    apiKey: `sk-${"x".repeat(40)}`,
    appendResult: async () => {},
    runnersByCondition: {
      B: async ({ task, repetition }) => evaluationResult(prepared, "B", { task, repetition }, {
        costUsd: 3.01
      }),
      C: async () => {
        throw new Error("Condition C must not start after the approved spend boundary.");
      }
    }
  });
  assert.deepEqual(result.runs, { B: 1, C: 0 });
  assert.equal(result.stopReason, "budget-exceeded");
});

test("generates a candidate-aware corrected comparison without replacing historical evidence", async () => {
  const prepared = await prepareCorrectiveFullEvaluation();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-corrected-comparison-"));
  const runs = orderedRuns(prepared.corpus, prepared.evaluationPlan);
  const resultFiles = {
    B: path.join(temporary, "b.jsonl"),
    C: path.join(temporary, "c.jsonl")
  };
  const results = Object.fromEntries(["B", "C"].map(condition => [condition, runs.map(run =>
    evaluationResult(prepared, condition, run, {
      costUsd: 0.01,
      totalTokens: condition === "C" ? 8000 : 9000,
      modelCalls: 2,
      timeToValidMs: condition === "C" ? 7000 : 7500
    })
  )]));
  await Promise.all(Object.entries(resultFiles).map(([condition, file]) =>
    writeFile(file, `${results[condition].map(result => JSON.stringify(result)).join("\n")}\n`)
  ));
  const jsonFile = path.join(temporary, "comparison.json");
  const markdownFile = path.join(temporary, "comparison.md");
  const report = await generateCorrectedComparison({ prepared, resultFiles, jsonFile, markdownFile });

  assert.equal(report.candidateCommit, candidateCommit);
  assert.deepEqual(report.rawEvidence.B.runs, 48);
  assert.deepEqual(report.rawEvidence.C.runs, 48);
  assert.equal(report.acceptance.passed, true);
  assert.equal(report.paidSpendUsd, 0.96);
  assert.match(await readFile(markdownFile, "utf8"), /Corrected A\/B\/C LLM Comparison/u);
  assert.match(await readFile(markdownFile, "utf8"), /\*\*PASSED\.\*\*/u);
});
