import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { createKnowledgeAdapterV4 } from "./compact-paid-smoke-v4.js";
import {
  loadRouteOracleV5,
  root,
  submitResultToolV5
} from "./compact-paid-smoke-v5.js";
import {
  createOpenAIResponse,
  evaluateSubmissionV6,
  loadApiKey,
  paidSmokeRouteV6,
  preflightPaidSmokeToolsV6,
  runPaidSmokeDryRunV6,
  taskPromptV6
} from "./compact-paid-smoke-v6.js";
import { runBoundedToolStateMachineV2 } from "./compact-paid-state-machine-v2.js";
import { summarizePaidSmokeComparisonV1 } from "./compact-paid-comparison-v1.js";

export { createOpenAIResponse, loadApiKey, root };

export const paidSmokeRootV7 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-smoke-v7"
);
export const paidSmokePlanFileV7 = path.join(paidSmokeRootV7, "PLAN.json");
const paidSmokeGateFileV7 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_J.md"
);
const productPaths = Object.freeze(["src", "types", "knowledge", "docs", "package.json"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function planCost(plan) {
  const taskRuns = plan.runOrder.length;
  const expected = taskRuns * (
      plan.costProjection.taskRunExpectedInputTokens * plan.pricingPerMillionTokens.uncachedInput +
      plan.costProjection.taskRunExpectedOutputTokens * plan.pricingPerMillionTokens.output
    ) / 1_000_000;
  const maximum = taskRuns * (
      plan.limits.maximumInputTokensPerTask * plan.pricingPerMillionTokens.cacheWrite +
      plan.limits.maximumOutputTokensPerTask * plan.pricingPerMillionTokens.output
    ) / 1_000_000;
  return {
    expected,
    maximum,
    conservativeExpected: expected * plan.costAccountingMultiplier,
    conservativeMaximum: maximum * plan.costAccountingMultiplier
  };
}

function assertPlanShapeV7(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-smoke-v7" ||
    plan.requiredGate !== "R54-P5-J"
  ) {
    throw new Error("Paid smoke v7 plan identity is invalid.");
  }
  if (plan.runOrder.length !== 32 || new Set(plan.runOrder).size !== 32) {
    throw new Error("Paid smoke v7 run order must contain 32 unique task-condition pairs.");
  }
  if (
    !plan.evaluatorSourceFiles ||
    typeof plan.evaluatorSourceFiles !== "object" ||
    Array.isArray(plan.evaluatorSourceFiles) ||
    !plan.productSourceTrees ||
    typeof plan.productSourceTrees !== "object" ||
    Array.isArray(plan.productSourceTrees)
  ) {
    throw new Error("Paid smoke v7 evaluator files and product trees must be frozen.");
  }
  if (
    plan.limits.maximumModelCallsPerTask !== 5 ||
    plan.limits.maximumModelCallsTotal !== 138 ||
    plan.limits.maximumSubmissionAttemptsPerTask !== 3 ||
    plan.limits.maximumInputTokensPerTask !== 80000 ||
    plan.limits.maximumOutputTokensPerTask !== 28000 ||
    plan.limits.maximumKnowledgeOutputTokensPerResponse !== 2000 ||
    plan.limits.maximumSubmissionOutputTokensPerResponse !== 8000 ||
    plan.limits.projectedInputBytesPerToken !== 1 ||
    plan.limits.maximumRequestBodyBytesPerCall !== 524288 ||
    plan.limits.maximumRequestBodyBytesPerTask !== 2097152 ||
    plan.costAccountingMultiplier !== 1.1
  ) {
    throw new Error("Paid smoke v7 limits are invalid.");
  }
  const cost = planCost(plan);
  if (
    Math.abs(cost.expected - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(cost.maximum - plan.costProjection.calculatedMaximumUsd) > 1e-12 ||
    Math.abs(
      cost.conservativeExpected - plan.costProjection.expectedWithRegionalUpliftUsd
    ) > 1e-12 ||
    Math.abs(
      cost.conservativeMaximum - plan.costProjection.calculatedMaximumWithRegionalUpliftUsd
    ) > 1e-12 ||
    cost.conservativeMaximum >= plan.limits.hardCostUsd
  ) {
    throw new Error("Paid smoke v7 cost projection does not match its envelopes.");
  }
}

export function counterbalancedRunOrderV7(tasks, conditionIds = ["A", "B", "C", "D"]) {
  if (
    conditionIds.length !== 4 ||
    new Set(conditionIds).size !== conditionIds.length ||
    !tasks.every(task => typeof task?.id === "string" && task.id.length > 0)
  ) {
    throw new Error("Paid smoke v7 counterbalance requires tasks and four unique conditions.");
  }
  return tasks.flatMap((task, taskIndex) => conditionIds.map((_, conditionOffset) => {
    const condition = conditionIds[(taskIndex + conditionOffset) % conditionIds.length];
    return `${task.id}:${condition}`;
  }));
}

export function modelCallEnvelopeV7(tasks, conditionIds, maximumSubmissionAttempts) {
  let expected = 0;
  let maximum = 0;
  for (const task of tasks) {
    for (const condition of conditionIds) {
      const route = paidSmokeRouteV6(condition, task);
      expected += route.length;
      maximum += route.length - 1 + maximumSubmissionAttempts;
    }
  }
  return { expected, maximum };
}

function commitFile(commit, relative, label) {
  try {
    return execFileSync("git", ["show", `${commit}:${relative}`], {
      cwd: root,
      maxBuffer: 30_000_000
    });
  } catch {
    throw new Error(`Paid smoke v7 ${label} is unavailable: ${relative}`);
  }
}

function commitTree(commit, relative) {
  try {
    return execFileSync("git", ["rev-parse", `${commit}:${relative}`], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    throw new Error(`Paid smoke v7 product tree is unavailable: ${relative}`);
  }
}

function assertAncestor(commit, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error(`Paid smoke v7 ${label} is not an ancestor of the current HEAD.`);
  }
}

function assertCurrentProduct(candidate) {
  try {
    execFileSync("git", ["diff", "--quiet", candidate, "--", ...productPaths], {
      cwd: root,
      stdio: "ignore"
    });
    const status = execFileSync("git", ["status", "--porcelain", "--", ...productPaths], {
      cwd: root,
      encoding: "utf8"
    }).trim();
    if (status !== "") throw new Error("dirty");
  } catch {
    throw new Error("Paid smoke v7 current product differs from its frozen candidate.");
  }
}

export async function loadPaidSmokePlanV7() {
  const [planBytes, oracle] = await Promise.all([
    readFile(paidSmokePlanFileV7),
    loadRouteOracleV5()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV7(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Paid smoke v7 route oracle hash drifted.");
  }
  const expectedRunOrder = counterbalancedRunOrderV7(
    oracle.tasks,
    oracle.conditions.map(condition => condition.id)
  );
  if (JSON.stringify(plan.runOrder) !== JSON.stringify(expectedRunOrder)) {
    throw new Error("Paid smoke v7 run order is not the frozen counterbalanced matrix.");
  }
  const callEnvelope = modelCallEnvelopeV7(
    oracle.tasks,
    oracle.conditions.map(condition => condition.id),
    plan.limits.maximumSubmissionAttemptsPerTask
  );
  if (
    callEnvelope.expected !== plan.costProjection.expectedModelCallsIfFirstPass ||
    callEnvelope.maximum !== plan.limits.maximumModelCallsTotal
  ) {
    throw new Error("Paid smoke v7 model-call envelope drifted from the frozen routes.");
  }
  for (const [relative, expected] of Object.entries(plan.evaluatorSourceFiles)) {
    const frozen = commitFile(plan.evaluatorCheckpointCommit, relative, "evaluator source");
    if (sha256(frozen) !== expected) {
      throw new Error(`Paid smoke v7 evaluator source hash drifted: ${relative}`);
    }
    const current = await readFile(path.join(root, relative));
    if (sha256(current) !== expected) {
      throw new Error(`Paid smoke v7 current evaluator source drifted: ${relative}`);
    }
  }
  for (const [relative, expected] of Object.entries(plan.productSourceTrees)) {
    if (commitTree(plan.productCandidateCommit, relative) !== expected) {
      throw new Error(`Paid smoke v7 product tree hash drifted: ${relative}`);
    }
  }
  assertAncestor(plan.productCandidateCommit, "product candidate");
  assertAncestor(plan.evaluatorCheckpointCommit, "evaluator checkpoint");
  assertCurrentProduct(plan.productCandidateCommit);
  return Object.freeze({
    ...plan,
    conditions: oracle.conditions,
    tasks: oracle.tasks,
    planSha256: sha256(planBytes)
  });
}

export async function assertPaidSmokeAuthorizedV7(plan) {
  const approved = plan ?? await loadPaidSmokePlanV7();
  const gate = await readFile(paidSmokeGateFileV7, "utf8");
  const state = gate.match(/^## Gate state\n\n`([^`]+)`$/mu)?.[1];
  if (state !== "approved") {
    throw new Error(`${approved.requiredGate} is not approved; credential read and paid calls are blocked.`);
  }
  if (
    !gate.includes(approved.productCandidateCommit) ||
    !gate.includes(approved.evaluatorCheckpointCommit) ||
    !gate.includes(approved.planSha256)
  ) {
    throw new Error(`${approved.requiredGate} does not authorize this candidate and plan hash.`);
  }
  return approved;
}

function routeFailuresV7(condition, task, snapshot) {
  const failures = [];
  if (snapshot.searches !== 1) failures.push(`knowledge-search-count:${snapshot.searches}`);
  if (condition === "A") {
    if (snapshot.docsReads !== 1) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if (snapshot.toolCalls !== 2) failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
  } else if (condition === "B" || condition === "C") {
    if (snapshot.docsReads !== 0) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if (snapshot.toolCalls !== 1) failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
  } else if (condition === "D") {
    const expectedReadCalls = task.expectedFallbacks.length > 0 ? 1 : 0;
    if (snapshot.docsReads !== task.expectedFallbacks.length) {
      failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    }
    if ((snapshot.docsReadCalls ?? 0) !== expectedReadCalls) {
      failures.push(`knowledge-docs-call-count:${snapshot.docsReadCalls ?? 0}`);
    }
    if (snapshot.toolCalls !== 1 + expectedReadCalls) {
      failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
    }
  }
  return failures;
}

export async function preflightPaidSmokeToolsV7() {
  return preflightPaidSmokeToolsV6();
}

export async function runPaidSmokeTaskV7(options) {
  return runBoundedToolStateMachineV2({
    ...options,
    route: paidSmokeRouteV6(options.condition, options.task),
    createAdapter: createKnowledgeAdapterV4,
    submitTool: submitResultToolV5,
    evaluateSubmission: evaluateSubmissionV6,
    promptBuilder: taskPromptV6,
    validateRoute: routeFailuresV7
  });
}

export async function runPaidSmokeDryRunV7({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v7-dry")
} = {}) {
  const [result, oracle] = await Promise.all([
    runPaidSmokeDryRunV6({ artifactRoot }),
    loadRouteOracleV5()
  ]);
  return {
    ...result,
    runOrder: counterbalancedRunOrderV7(
      oracle.tasks,
      oracle.conditions.map(condition => condition.id)
    )
  };
}

function emptyUsage() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };
}

export async function runPaidSmokeV7({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v7"),
  now = () => new Date(),
  onProgress = async () => {}
} = {}) {
  const plan = await assertPaidSmokeAuthorizedV7(suppliedPlan ?? await loadPaidSmokePlanV7());
  await preflightPaidSmokeToolsV7();
  return runPaidSmokeMatrixV7({
    plan,
    apiKey,
    createResponse,
    artifactRoot,
    now,
    onProgress
  });
}

export async function runPaidSmokeMatrixV7({
  plan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v7"),
  now = () => new Date(),
  onProgress = async () => {},
  runTask = runPaidSmokeTaskV7
}) {
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const ledger = { usage: emptyUsage(), standardCostUsd: 0, costUsd: 0, modelCalls: 0 };
  const results = [];
  let activeTask = null;
  const startedAt = now().toISOString();
  for (const run of plan.runOrder) {
    const separator = run.lastIndexOf(":");
    const taskId = run.slice(0, separator);
    const condition = run.slice(separator + 1);
    try {
      const result = await runTask({
        plan,
        task: taskById.get(taskId),
        condition,
        apiKey,
        ledger,
        artifactRoot: path.join(artifactRoot, `${taskId}-${condition}`),
        createResponse,
        onProgress: async progress => {
          activeTask = progress;
          await onProgress({ plan, ledger, results: [...results], activeTask });
        }
      });
      results.push({ ...result, runPosition: results.length + 1 });
      activeTask = null;
      await onProgress({ plan, ledger, results: [...results], activeTask: null });
    } catch (error) {
      const failure = {
        schemaVersion: 1,
        id: plan.id,
        planSha256: plan.planSha256,
        routeOracleSha256: plan.routeOracleSha256,
        productCandidateCommit: plan.productCandidateCommit,
        evaluatorCheckpointCommit: plan.evaluatorCheckpointCommit,
        startedAt,
        abortedAt: now().toISOString(),
        abortedRun: run,
        error: error instanceof Error ? error.message : String(error),
        ledger,
        activeTask,
        results
      };
      await onProgress({ plan, ledger, results: [...results], failure });
      throw Object.assign(new Error(failure.error), { paidSmokeFailure: failure });
    }
  }
  return {
    schemaVersion: 1,
    id: plan.id,
    planSha256: plan.planSha256,
    routeOracleSha256: plan.routeOracleSha256,
    productCandidateCommit: plan.productCandidateCommit,
    evaluatorCheckpointCommit: plan.evaluatorCheckpointCommit,
    startedAt,
    completedAt: now().toISOString(),
    taskRuns: results.length,
    passedTaskRuns: results.filter(result => result.passed).length,
    ledger,
    comparison: summarizePaidSmokeComparisonV1(
      results,
      plan.conditions.map(condition => condition.id)
    ),
    results
  };
}
