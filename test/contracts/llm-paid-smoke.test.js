import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runConditionATask } from "../../scripts/llm-eval/condition-a-runner.js";
import {
  assertCorrectiveSmokePlan,
  assertCorrectiveSmokeRetryPlan,
  assertExecutableRecipeSmokePlan,
  prepareCorrectiveSmoke,
  prepareCorrectiveSmokeRetry,
  prepareExecutableRecipeSmoke,
  runCorrectiveSmoke,
  runCorrectiveSmokeSequence,
  runExecutableRecipeSmoke
} from "../../scripts/llm-eval/run-corrective-smoke.js";

const smokePlanUrl = new URL("../llm/corrective-smoke-plan.json", import.meta.url);
const retryPlanUrl = new URL("../llm/corrective-smoke-retry-plan.json", import.meta.url);
const executableRecipePlanUrl = new URL("../llm/executable-recipe-smoke-plan.json", import.meta.url);
const evaluationPlanUrl = new URL("../llm/evaluation-plan.json", import.meta.url);
const corpusUrl = new URL("../llm/tasks.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/index.json", import.meta.url);
const knowledgeSearchUrl = new URL("../../knowledge/search-index.json", import.meta.url);
const publicRecipeUrl = new URL("../../docs/llms-recipes.json", import.meta.url);

test("locks paid smoke scope and spend before credentials are read", async () => {
  const [smokePlanBytes, evaluationPlanBytes, corpusBytes] = await Promise.all([
    readFile(smokePlanUrl),
    readFile(evaluationPlanUrl),
    readFile(corpusUrl)
  ]);
  const smokePlan = JSON.parse(smokePlanBytes);
  const validated = assertCorrectiveSmokePlan(smokePlan, { evaluationPlanBytes, corpusBytes });
  const prepared = await prepareCorrectiveSmoke();

  assert.equal(validated.taskId, "cars-scatter-origin");
  assert.deepEqual(validated.conditions, ["B", "C"]);
  assert.equal(validated.maximumRuns, 2);
  assert.deepEqual(validated.spendUsd, {
    expectedPerRun: 0.072,
    calculatedMaximumPerRun: 0.156,
    approvedCapPerCondition: 0.2,
    approvedCombinedCap: 0.4
  });
  assert.equal(prepared.task.id, validated.taskId);
  assert.match(prepared.outputRoot, /\.artifacts\/llm-eval\/corrective-smoke-ea50b0c1$/u);
  assert.equal(JSON.stringify(smokePlan).includes("OPENAI_API_KEY"), false);

  for (const mutation of [
    { approvalStatus: "planned" },
    { taskId: "cars-multi-legend" },
    { repetition: 2 },
    { conditions: ["C", "B"] },
    { maximumRuns: 3 },
    { candidateCommit: "f".repeat(40) },
    { outputRoot: ".artifacts/llm-eval/other" },
    { spendUsd: { ...smokePlan.spendUsd, approvedCombinedCap: 1 } }
  ]) {
    assert.throws(
      () => assertCorrectiveSmokePlan({ ...smokePlan, ...mutation }, { evaluationPlanBytes, corpusBytes }),
      /Corrective/u
    );
  }

  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-smoke-guard-"));
  const unapprovedPlan = path.join(temporary, "plan.json");
  await writeFile(unapprovedPlan, JSON.stringify({ ...smokePlan, approvalStatus: "planned" }));
  let credentialReads = 0;
  await assert.rejects(
    () => runCorrectiveSmoke({
      smokePlanFile: unapprovedPlan,
      loadApiKeyImpl: async () => {
        credentialReads += 1;
        return `sk-${"x".repeat(40)}`;
      }
    }),
    /not approved/u
  );
  assert.equal(credentialReads, 0);
});

test("locks the corrected paid smoke retry and stops before C on an unsafe B outcome", async () => {
  const [retryPlanBytes, evaluationPlanBytes, corpusBytes] = await Promise.all([
    readFile(retryPlanUrl),
    readFile(evaluationPlanUrl),
    readFile(corpusUrl)
  ]);
  const retryPlan = JSON.parse(retryPlanBytes);
  const validated = assertCorrectiveSmokeRetryPlan(retryPlan, { evaluationPlanBytes, corpusBytes });
  const prepared = await prepareCorrectiveSmokeRetry();

  assert.equal(validated.candidateCommit, "060a13f1017485f2a19579ef640a768b86a63417");
  assert.deepEqual(validated.conditions, ["B", "C"]);
  assert.equal(validated.maximumRuns, 2);
  assert.equal(validated.outputRoot, ".artifacts/llm-eval/corrective-smoke-retry-060a13f1");
  assert.deepEqual(validated.spendUsd, {
    expectedPerRun: 0.072,
    calculatedMaximumPerRun: 0.156,
    approvedCapPerCondition: 0.2,
    approvedCombinedCap: 0.4
  });
  assert.equal(prepared.task.id, validated.taskId);

  for (const mutation of [
    { approvalStatus: "planned" },
    { taskId: "cars-multi-legend" },
    { repetition: 2 },
    { conditions: ["C", "B"] },
    { maximumRuns: 3 },
    { candidateCommit: "f".repeat(40) },
    { outputRoot: ".artifacts/llm-eval/other" },
    { spendUsd: { ...retryPlan.spendUsd, approvedCombinedCap: 1 } }
  ]) {
    assert.throws(
      () => assertCorrectiveSmokeRetryPlan(
        { ...retryPlan, ...mutation },
        { evaluationPlanBytes, corpusBytes }
      ),
      /Corrective/u
    );
  }

  const calls = [];
  const result = await runCorrectiveSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async () => {
        calls.push("B");
        return {
          model: { resolvedName: prepared.evaluationPlan.model.name },
          metrics: { estimatedCostUsd: 0 },
          outcome: { failureCategory: "provider-error" }
        };
      },
      C: async () => {
        calls.push("C");
        throw new Error("Condition C must not start after an unsafe B outcome.");
      }
    },
    appendResult: async () => {}
  });

  assert.deepEqual(calls, ["B"]);
  assert.equal(result.results.length, 1);
  assert.equal(result.actualCombinedSpendUsd, 0);
});

test("locks the executable recipe smoke and requires a valid B before C", async () => {
  const [
    smokePlanBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  ] = await Promise.all([
    readFile(executableRecipePlanUrl),
    readFile(evaluationPlanUrl),
    readFile(corpusUrl),
    readFile(knowledgeUrl),
    readFile(knowledgeSearchUrl),
    readFile(publicRecipeUrl)
  ]);
  const smokePlan = JSON.parse(smokePlanBytes);
  const hashes = {
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  };
  const validated = assertExecutableRecipeSmokePlan(smokePlan, hashes);
  const prepared = await prepareExecutableRecipeSmoke();

  assert.equal(validated.candidateCommit, "e88fbea9761ddc46268c400be1af280e838b71a2");
  assert.deepEqual(validated.conditions, ["B", "C"]);
  assert.equal(validated.maximumRuns, 2);
  assert.equal(validated.outputRoot, ".artifacts/llm-eval/executable-recipe-smoke-e88fbea9");
  assert.deepEqual(validated.spendUsd, {
    expectedPerRun: 0.025,
    calculatedMaximumPerRun: 0.156,
    approvedCapPerCondition: 0.1,
    approvedCombinedCap: 0.2
  });
  assert.equal(prepared.task.id, validated.taskId);

  for (const mutation of [
    { approvalStatus: "planned" },
    { taskId: "cars-multi-legend" },
    { repetition: 2 },
    { conditions: ["C", "B"] },
    { maximumRuns: 3 },
    { candidateCommit: "f".repeat(40) },
    { outputRoot: ".artifacts/llm-eval/other" },
    { knowledgeSha256: "f".repeat(64) },
    { knowledgeSearchSha256: "f".repeat(64) },
    { publicRecipeSha256: "f".repeat(64) },
    { spendUsd: { ...smokePlan.spendUsd, approvedCombinedCap: 1 } }
  ]) {
    assert.throws(
      () => assertExecutableRecipeSmokePlan({ ...smokePlan, ...mutation }, hashes),
      /(?:Corrective|Executable recipe)/u
    );
  }

  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-recipe-smoke-guard-"));
  const unapprovedPlan = path.join(temporary, "plan.json");
  await writeFile(unapprovedPlan, JSON.stringify({ ...smokePlan, approvalStatus: "planned" }));
  let credentialReads = 0;
  await assert.rejects(
    () => runExecutableRecipeSmoke({
      smokePlanFile: unapprovedPlan,
      loadApiKeyImpl: async () => {
        credentialReads += 1;
        return `sk-${"x".repeat(40)}`;
      }
    }),
    /not approved/u
  );
  assert.equal(credentialReads, 0);

  const calls = [];
  const invalid = await runCorrectiveSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    stopAfterInvalid: true,
    runnersByCondition: {
      B: async () => {
        calls.push("B-invalid");
        return {
          model: { resolvedName: prepared.evaluationPlan.model.name },
          metrics: { estimatedCostUsd: 0.01 },
          outcome: { finalValid: false, failureCategory: "runtime-error" }
        };
      },
      C: async () => {
        calls.push("C-invalid");
        throw new Error("Condition C must not start after an invalid B result.");
      }
    },
    appendResult: async () => {}
  });
  assert.deepEqual(calls, ["B-invalid"]);
  assert.equal(invalid.results.length, 1);

  calls.length = 0;
  const validResult = condition => ({
    model: { resolvedName: prepared.evaluationPlan.model.name },
    metrics: { estimatedCostUsd: 0.01 },
    outcome: { finalValid: true, failureCategory: null },
    condition
  });
  const valid = await runCorrectiveSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    stopAfterInvalid: true,
    runnersByCondition: {
      B: async () => {
        calls.push("B-valid");
        return validResult("B");
      },
      C: async () => {
        calls.push("C-valid");
        return validResult("C");
      }
    },
    appendResult: async () => {}
  });
  assert.deepEqual(calls, ["B-valid", "C-valid"]);
  assert.equal(valid.results.length, 2);
  assert.equal(valid.actualCombinedSpendUsd, 0.02);
});

test("classifies an evaluation deadline before starting a second model call", async () => {
  const corpus = JSON.parse(await readFile(corpusUrl, "utf8"));
  const plan = JSON.parse(await readFile(evaluationPlanUrl, "utf8"));
  const task = corpus.tasks.find(candidate => candidate.id === "cars-scatter-origin");
  let calls = 0;
  const result = await runConditionATask({
    apiKey: `sk-${"x".repeat(40)}`,
    corpus,
    task,
    repetition: 1,
    plan,
    outputRoot: new URL("../../.artifacts/llm-eval/timeout-contract", import.meta.url).pathname,
    fetchImpl: async () => {
      calls += 1;
      const error = new Error("evaluation deadline reached");
      error.name = "TimeoutError";
      throw error;
    }
  });

  assert.equal(calls, 1);
  assert.equal(result.metrics.modelCalls, 0);
  assert.equal(result.outcome.failureCategory, "timeout");
  assert.equal(result.outcome.finalValid, false);
});
