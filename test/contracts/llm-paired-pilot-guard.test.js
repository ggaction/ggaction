import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertPairedPilotApproval,
  assertPairedPilotRunCanContinue,
  orderedPairedPilotRuns
} from "../../scripts/llm-eval/run-paired-pilot.js";
import { hasCompleteBillingUsage } from "../../scripts/llm-eval/openai-responses.js";
import { assertArchivedEvaluationExecution } from "../../scripts/llm-eval/archived-evaluation.js";
import { loadGeneralizationCorpus } from "../../scripts/llm-eval/paired-corpus.js";

async function fixtures() {
  const [loadedCorpus, plan] = await Promise.all([
    loadGeneralizationCorpus(),
    readFile(new URL("../llm/paired-evaluation-plan.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const taskIds = loadedCorpus.corpus.tasks.slice(0, 3).map(task => task.id);
  const approval = {
    schemaVersion: 1,
    gate: "R53-P6-S",
    status: "approved",
    candidateCommit: "a".repeat(40),
    gateRecordCommit: "b".repeat(40),
    corpusSha256: loadedCorpus.sha256,
    conditions: ["A", "B", "C", "D"],
    taskIds,
    repetitionsPerTask: 1,
    maximumRuns: taskIds.length * 4,
    hardSpendCapUsd: 2,
    credentialReadsAllowed: true,
    externalModelCallsAllowed: true,
    orderSeed: "paired-pilot-contract"
  };
  return { loadedCorpus, plan, approval };
}

test("requires an explicit zero-to-positive Gate S approval transition", async () => {
  const { loadedCorpus, plan, approval } = await fixtures();
  assert.equal(assertPairedPilotApproval({ approval, plan, loadedCorpus }), true);
  for (const [field, value] of [
    ["status", "planned"],
    ["credentialReadsAllowed", false],
    ["externalModelCallsAllowed", false]
  ]) {
    const rejected = { ...approval, [field]: value };
    assert.throws(() => assertPairedPilotApproval({ approval: rejected, plan, loadedCorpus }), /approval|authorize|required/iu);
  }
  assert.throws(() => assertPairedPilotApproval({
    approval: { ...approval, hardSpendCapUsd: 0 }, plan, loadedCorpus
  }), /spend cap/u);
});

test("creates a deterministic complete block-randomized pilot order", async () => {
  const { loadedCorpus, approval } = await fixtures();
  const first = orderedPairedPilotRuns({ approval, corpus: loadedCorpus.corpus });
  const second = orderedPairedPilotRuns({ approval, corpus: loadedCorpus.corpus });
  assert.deepEqual(first.map(run => `${run.condition}:${run.task.id}:r${run.repetition}`),
    second.map(run => `${run.condition}:${run.task.id}:r${run.repetition}`));
  assert.equal(first.length, approval.maximumRuns);
  for (const taskId of approval.taskIds) {
    assert.deepEqual(first.filter(run => run.task.id === taskId).map(run => run.condition).sort(), ["A", "B", "C", "D"]);
  }
});

test("keeps the checked-in paired plan incapable of spending", async () => {
  const { plan } = await fixtures();
  assert.equal(plan.status, "unpaid-validation-only");
  assert.deepEqual(plan.paidPilot, {
    status: "blocked-pending-gate-s",
    credentialReadsAllowed: false,
    externalModelCallsAllowed: false,
    approvedSpendUsd: 0
  });
});

test("stops after any request whose billable usage is unknown", async () => {
  const { plan } = await fixtures();
  const result = failureCategory => ({
    model: { resolvedName: plan.model.name },
    outcome: { failureCategory }
  });
  assert.equal(assertPairedPilotRunCanContinue(result(null), plan), true);
  assert.throws(() => assertPairedPilotRunCanContinue(result("provider-error"), plan), /billable usage/iu);
  assert.throws(() => assertPairedPilotRunCanContinue(result("timeout"), plan), /billable usage/iu);
  assert.throws(() => assertPairedPilotRunCanContinue(result("budget-exceeded"), plan), /hard cap/iu);
  assert.throws(() => assertPairedPilotRunCanContinue({
    ...result(null), model: { resolvedName: "unexpected-model" }
  }, plan), /model mismatch/iu);
});

test("requires all token fields used by paid cost accounting", () => {
  const complete = {
    input_tokens: 100,
    input_tokens_details: { cached_tokens: 10, cache_write_tokens: 20 },
    output_tokens: 30,
    total_tokens: 130
  };
  assert.equal(hasCompleteBillingUsage(complete), true);
  assert.equal(hasCompleteBillingUsage({ ...complete, input_tokens_details: { cached_tokens: 10 } }), false);
  assert.equal(hasCompleteBillingUsage({ ...complete, total_tokens: undefined }), false);
});

test("prevents an archived paid candidate from running at current HEAD", () => {
  assert.throws(() => assertArchivedEvaluationExecution("a".repeat(40)), /cannot run at current HEAD/u);
});
