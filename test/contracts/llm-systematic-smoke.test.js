import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertSystematicRecipeSmokePlan,
  prepareSystematicRecipeSmoke,
  runSystematicRecipeSmoke,
  runSystematicRecipeSmokeSequence
} from "../../scripts/llm-eval/run-systematic-recipe-smoke.js";

const planUrl = new URL("../llm/systematic-recipe-smoke-plan.json", import.meta.url);
const evaluationPlanUrl = new URL("../llm/evaluation-plan.json", import.meta.url);
const corpusUrl = new URL("../llm/tasks.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/index.json", import.meta.url);
const knowledgeSearchUrl = new URL("../../knowledge/search-index.json", import.meta.url);
const publicRecipeUrl = new URL("../../docs/llms-recipes.json", import.meta.url);

async function planFixture() {
  const [
    planBytes,
    evaluationPlanBytes,
    corpusBytes,
    knowledgeBytes,
    knowledgeSearchBytes,
    publicRecipeBytes
  ] = await Promise.all([
    readFile(planUrl),
    readFile(evaluationPlanUrl),
    readFile(corpusUrl),
    readFile(knowledgeUrl),
    readFile(knowledgeSearchUrl),
    readFile(publicRecipeUrl)
  ]);
  return {
    plan: JSON.parse(planBytes),
    hashes: { evaluationPlanBytes, corpusBytes, knowledgeBytes, knowledgeSearchBytes, publicRecipeBytes }
  };
}

function result(prepared, condition, taskId, {
  cost = 0.01,
  firstPassValid = true,
  finalValid = true,
  failureCategory = null,
  repairRounds = 0,
  resolvedName = prepared.evaluationPlan.model.name
} = {}) {
  return {
    runId: `${condition}-${taskId}-r1`,
    taskId,
    condition,
    model: { resolvedName },
    metrics: { estimatedCostUsd: cost, repairRounds },
    outcome: { firstPassValid, finalValid, failureCategory }
  };
}

test("locks the systematic recipe smoke scope, hashes, order, and spend", async () => {
  const { plan, hashes } = await planFixture();
  const validated = assertSystematicRecipeSmokePlan(plan, hashes);
  const prepared = await prepareSystematicRecipeSmoke();

  assert.equal(validated.candidateCommit, "a44d3d4eb2c99526f8174d6af5fa2ebed087ec60");
  assert.deepEqual(validated.taskIds, ["cars-box-plot", "composed-dashboard", "renderer-parity"]);
  assert.deepEqual(validated.conditions, ["B", "C"]);
  assert.equal(validated.maximumRuns, 6);
  assert.equal(validated.outputRoot, ".artifacts/llm-eval/systematic-recipe-smoke-a44d3d4e");
  assert.deepEqual(validated.spendUsd, {
    expectedPerRun: 0.025,
    calculatedMaximumPerRun: 0.156,
    approvedCapPerCondition: 0.3,
    approvedCombinedCap: 0.6
  });
  assert.deepEqual(prepared.tasks.map(task => task.id), validated.taskIds);

  for (const mutation of [
    { approvalStatus: "planned" },
    { candidateCommit: "f".repeat(40) },
    { taskIds: [...plan.taskIds].reverse() },
    { repetition: 2 },
    { conditions: ["C", "B"] },
    { maximumRuns: 7 },
    { outputRoot: ".artifacts/llm-eval/other" },
    { knowledgeSha256: "f".repeat(64) },
    { knowledgeSearchSha256: "f".repeat(64) },
    { publicRecipeSha256: "f".repeat(64) },
    { spendUsd: { ...plan.spendUsd, approvedCombinedCap: 1 } }
  ]) {
    assert.throws(
      () => assertSystematicRecipeSmokePlan({ ...plan, ...mutation }, hashes),
      /Systematic recipe/u
    );
  }
});

test("rejects an unapproved plan and occupied output before reading credentials", async () => {
  const { plan } = await planFixture();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-systematic-smoke-"));
  const unapprovedPlan = path.join(temporary, "plan.json");
  await writeFile(unapprovedPlan, JSON.stringify({ ...plan, approvalStatus: "planned" }));
  let credentialReads = 0;
  await assert.rejects(
    () => runSystematicRecipeSmoke({
      planFile: unapprovedPlan,
      loadApiKeyImpl: async () => {
        credentialReads += 1;
        return `sk-${"x".repeat(40)}`;
      }
    }),
    /not approved/u
  );
  assert.equal(credentialReads, 0);

  await assert.rejects(
    () => runSystematicRecipeSmoke({
      requireEmptyOutputRootImpl: async () => {
        throw new Error("Systematic recipe smoke output root is not empty.");
      },
      loadApiKeyImpl: async () => {
        credentialReads += 1;
        return `sk-${"x".repeat(40)}`;
      }
    }),
    /not empty/u
  );
  assert.equal(credentialReads, 0);
});

test("runs all B tasks but blocks C when any B task is not first-pass valid", async () => {
  const prepared = await prepareSystematicRecipeSmoke();
  const calls = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async options => {
        calls.push(`B:${options.task.id}`);
        return result(prepared, "B", options.task.id, options.task.id === "composed-dashboard" ? {
          firstPassValid: false,
          finalValid: true,
          repairRounds: 1
        } : {});
      },
      C: async options => {
        calls.push(`C:${options.task.id}`);
        throw new Error("Condition C must not start unless every B task is first-pass valid.");
      }
    },
    appendResult: async () => {}
  });

  assert.deepEqual(calls, prepared.tasks.map(task => `B:${task.id}`));
  assert.equal(summary.results.length, 3);
  assert.equal(summary.stopReason, "condition-b-not-first-pass-valid");
  assert.equal(summary.actualCombinedSpendUsd, 0.03);
});

test("stops the entire sequence immediately on an unsafe B outcome", async () => {
  const prepared = await prepareSystematicRecipeSmoke();
  const calls = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async options => {
        calls.push(`B:${options.task.id}`);
        return result(prepared, "B", options.task.id, {
          firstPassValid: false,
          finalValid: false,
          failureCategory: "provider-error"
        });
      },
      C: async () => {
        throw new Error("Condition C must not start after an unsafe B outcome.");
      }
    },
    appendResult: async () => {}
  });

  assert.deepEqual(calls, ["B:cars-box-plot"]);
  assert.equal(summary.results.length, 1);
  assert.equal(summary.stopReason, "unsafe-b-outcome");
});

test("does not start another run after a returned result reaches the spend cap", async () => {
  const prepared = await prepareSystematicRecipeSmoke();
  const calls = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async options => {
        calls.push(`B:${options.task.id}`);
        return result(prepared, "B", options.task.id, { cost: 0.3 });
      },
      C: async () => {
        throw new Error("Condition C must not start after the spend cap is reached.");
      }
    },
    appendResult: async () => {}
  });

  assert.deepEqual(calls, ["B:cars-box-plot"]);
  assert.equal(summary.results.length, 1);
  assert.equal(summary.stopReason, "spend-cap-reached");
  assert.equal(summary.actualCombinedSpendUsd, 0.3);
});

test("runs C only after all B tasks pass and stops at the first invalid C result", async () => {
  const prepared = await prepareSystematicRecipeSmoke();
  const calls = [];
  const remaining = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async options => {
        calls.push(`B:${options.task.id}`);
        remaining.push(options.remainingSpendUsd);
        return result(prepared, "B", options.task.id);
      },
      C: async options => {
        calls.push(`C:${options.task.id}`);
        remaining.push(options.remainingSpendUsd);
        return result(prepared, "C", options.task.id, options.task.id === "composed-dashboard" ? {
          firstPassValid: false,
          finalValid: false,
          failureCategory: "validation-failed"
        } : {});
      }
    },
    appendResult: async () => {}
  });

  assert.deepEqual(calls, [
    "B:cars-box-plot",
    "B:composed-dashboard",
    "B:renderer-parity",
    "C:cars-box-plot",
    "C:composed-dashboard"
  ]);
  assert.deepEqual(remaining.map(value => Number(value.toFixed(2))), [0.3, 0.29, 0.28, 0.3, 0.29]);
  assert.equal(summary.results.length, 5);
  assert.equal(summary.stopReason, "condition-c-not-first-pass-valid");
  assert.equal(summary.actualCombinedSpendUsd, 0.05);
});

test("completes the exact six-run sequence inside both condition caps", async () => {
  const prepared = await prepareSystematicRecipeSmoke();
  const calls = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: Object.fromEntries(["B", "C"].map(condition => [
      condition,
      async options => {
        calls.push(`${condition}:${options.task.id}`);
        return result(prepared, condition, options.task.id);
      }
    ])),
    appendResult: async () => {}
  });

  assert.deepEqual(calls, [
    ...prepared.tasks.map(task => `B:${task.id}`),
    ...prepared.tasks.map(task => `C:${task.id}`)
  ]);
  assert.equal(summary.results.length, 6);
  assert.equal(summary.stopReason, null);
  assert.deepEqual(summary.conditionSpendUsd, { B: 0.03, C: 0.03 });
  assert.equal(summary.actualCombinedSpendUsd, 0.060000000000000005);
});
