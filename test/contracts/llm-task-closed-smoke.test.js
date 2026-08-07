import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertHistoricalPaidPlansUnchanged,
  assertTaskClosedSmokePlan,
  prepareTaskClosedSmoke,
  runTaskClosedSmoke
} from "../../scripts/llm-eval/run-task-closed-smoke.js";
import { runSystematicRecipeSmokeSequence } from "../../scripts/llm-eval/run-systematic-recipe-smoke.js";

const planUrl = new URL("../llm/task-closed-smoke-plan.json", import.meta.url);
const evidenceUrls = Object.freeze({
  evaluationPlanBytes: new URL("../llm/evaluation-plan.json", import.meta.url),
  corpusBytes: new URL("../llm/tasks.json", import.meta.url),
  knowledgeBytes: new URL("../../knowledge/index.json", import.meta.url),
  knowledgeSearchBytes: new URL("../../knowledge/search-index.json", import.meta.url),
  publicRecipeBytes: new URL("../../docs/llms-recipes.json", import.meta.url),
  deliveryMatrixBytes: new URL("../llm/recipe-delivery-matrix.json", import.meta.url)
});

async function fixture() {
  return {
    plan: JSON.parse(await readFile(planUrl)),
    hashes: Object.fromEntries(await Promise.all(Object.entries(evidenceUrls).map(async ([key, url]) => [
      key,
      await readFile(url)
    ])))
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

test("locks the approved task-closed candidate, inputs, order, and spend", async () => {
  const { plan, hashes } = await fixture();
  const validated = assertTaskClosedSmokePlan(plan, hashes);
  const prepared = await prepareTaskClosedSmoke();

  assert.equal(validated.candidateCommit, "622286f9501bd76b89e0a4e8a694c5f3b603f098");
  assert.deepEqual(validated.taskIds, ["cars-box-plot", "composed-dashboard", "renderer-parity"]);
  assert.deepEqual(validated.conditions, ["B", "C"]);
  assert.equal(validated.maximumRuns, 6);
  assert.equal(validated.outputRoot, ".artifacts/llm-eval/task-closed-smoke-622286f9");
  assert.deepEqual(validated.spendUsd, {
    expectedPerRun: 0.025,
    calculatedMaximumPerRun: 0.156,
    approvedCapPerCondition: 0.3,
    approvedCombinedCap: 0.6
  });
  assert.deepEqual(prepared.tasks.map(task => task.id), validated.taskIds);
  await assertHistoricalPaidPlansUnchanged();

  for (const mutation of [
    { approvalStatus: "planned" },
    { candidateCommit: "f".repeat(40) },
    { taskIds: [...plan.taskIds].reverse() },
    { conditions: ["C", "B"] },
    { maximumRuns: 7 },
    { outputRoot: ".artifacts/llm-eval/other" },
    { deliveryMatrixSha256: "f".repeat(64) },
    { spendUsd: { ...plan.spendUsd, approvedCombinedCap: 1 } }
  ]) {
    assert.throws(() => assertTaskClosedSmokePlan({ ...plan, ...mutation }, hashes), /Task-closed/u);
  }
});

test("rejects unapproved or occupied execution before reading credentials", async () => {
  const { plan } = await fixture();
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-task-closed-smoke-"));
  const unapprovedPlan = path.join(temporary, "plan.json");
  await writeFile(unapprovedPlan, JSON.stringify({ ...plan, approvalStatus: "planned" }));
  let credentialReads = 0;
  const loadApiKeyImpl = async () => {
    credentialReads += 1;
    return `sk-${"x".repeat(40)}`;
  };

  await assert.rejects(() => runTaskClosedSmoke({ planFile: unapprovedPlan, loadApiKeyImpl }), /not approved/u);
  assert.equal(credentialReads, 0);
  await assert.rejects(
    () => runTaskClosedSmoke({
      loadApiKeyImpl,
      requireEmptyOutputRootImpl: async () => {
        throw new Error("Task-closed smoke output root is not empty.");
      }
    }),
    /not empty/u
  );
  assert.equal(credentialReads, 0);
});

test("runs all B tasks and blocks C when one B result needs repair", async () => {
  const prepared = await prepareTaskClosedSmoke();
  const calls = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async options => {
        calls.push(`B:${options.task.id}`);
        return result(prepared, "B", options.task.id, options.task.id === "composed-dashboard" ? {
          firstPassValid: false,
          repairRounds: 1
        } : {});
      },
      C: async () => {
        throw new Error("C must remain blocked.");
      }
    },
    appendResult: async () => {}
  });

  assert.deepEqual(calls, prepared.tasks.map(task => `B:${task.id}`));
  assert.equal(summary.stopReason, "condition-b-not-first-pass-valid");
  assert.equal(summary.results.length, 3);
});

test("stops immediately on unsafe B or a reached spend cap", async () => {
  const prepared = await prepareTaskClosedSmoke();
  for (const [options, expectedReason] of [
    [{ firstPassValid: false, finalValid: false, failureCategory: "provider-error" }, "unsafe-b-outcome"],
    [{ cost: 0.3 }, "spend-cap-reached"]
  ]) {
    const calls = [];
    const summary = await runSystematicRecipeSmokeSequence({
      prepared,
      apiKey: `sk-${"x".repeat(40)}`,
      runnersByCondition: {
        B: async run => {
          calls.push(run.task.id);
          return result(prepared, "B", run.task.id, options);
        },
        C: async () => {
          throw new Error("C must remain blocked.");
        }
      },
      appendResult: async () => {}
    });
    assert.deepEqual(calls, ["cars-box-plot"]);
    assert.equal(summary.stopReason, expectedReason);
  }
});

test("runs C only after all B tasks pass and stops on the first invalid C result", async () => {
  const prepared = await prepareTaskClosedSmoke();
  const calls = [];
  const summary = await runSystematicRecipeSmokeSequence({
    prepared,
    apiKey: `sk-${"x".repeat(40)}`,
    runnersByCondition: {
      B: async options => {
        calls.push(`B:${options.task.id}`);
        return result(prepared, "B", options.task.id);
      },
      C: async options => {
        calls.push(`C:${options.task.id}`);
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
    ...prepared.tasks.map(task => `B:${task.id}`),
    "C:cars-box-plot",
    "C:composed-dashboard"
  ]);
  assert.equal(summary.stopReason, "condition-c-not-first-pass-valid");
  assert.equal(summary.results.length, 5);
});

test("completes exactly six successful runs inside both caps", async () => {
  const prepared = await prepareTaskClosedSmoke();
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
});
