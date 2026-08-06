import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runConditionATask } from "../../scripts/llm-eval/condition-a-runner.js";
import {
  assertCorrectiveSmokePlan,
  prepareCorrectiveSmoke,
  runCorrectiveSmoke
} from "../../scripts/llm-eval/run-corrective-smoke.js";

const smokePlanUrl = new URL("../llm/corrective-smoke-plan.json", import.meta.url);
const evaluationPlanUrl = new URL("../llm/evaluation-plan.json", import.meta.url);
const corpusUrl = new URL("../llm/tasks.json", import.meta.url);

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
