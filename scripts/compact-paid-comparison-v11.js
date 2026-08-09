import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { summarizePaidComparisonV3 } from "./compact-paid-comparison-v3.js";
import { createOpenAIResponseV2 } from "./compact-openai-response-v2.js";
import {
  loadApiKey,
  loadPaidComparisonPlanV10,
  preflightPaidComparisonToolsV10,
  runPaidComparisonDryRunV10,
  runPaidComparisonTaskV10,
  root
} from "./compact-paid-comparison-v10.js";
import { parseThreeModelRunV9 } from "./compact-paid-oracle-v9.js";

export { loadApiKey, preflightPaidComparisonToolsV10, root };

export const paidComparisonRootV11 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-comparison-v11"
);
export const paidComparisonPlanFileV11 = path.join(paidComparisonRootV11, "PLAN.json");
export const continuationSourceFileV11 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-comparison-v10",
  "results",
  "IN_PROGRESS.json"
);
const paidComparisonGateFileV11 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase6",
  "GATE_C.md"
);
const productPaths = Object.freeze(["src", "types", "knowledge", "docs", "package.json"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sum(results, property) {
  return results.reduce((total, result) => total + (result[property] ?? 0), 0);
}

function commitFile(commit, relative, label) {
  try {
    return execFileSync("git", ["show", `${commit}:${relative}`], {
      cwd: root,
      maxBuffer: 30_000_000
    });
  } catch {
    throw new Error(`Paid comparison v11 ${label} is unavailable: ${relative}`);
  }
}

function commitTree(commit, relative) {
  try {
    return execFileSync("git", ["rev-parse", `${commit}:${relative}`], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    throw new Error(`Paid comparison v11 product tree is unavailable: ${relative}`);
  }
}

function assertAncestor(commit, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error(`Paid comparison v11 ${label} is not an ancestor of the current HEAD.`);
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
    throw new Error("Paid comparison v11 current product differs from its frozen candidate.");
  }
}

function assertInheritedPlanV11(plan, base) {
  const inherited = [
    "productCandidateCommit",
    "routeOracleSha256",
    "api",
    "models",
    "limits",
    "costAccountingMultiplier",
    "costProjection",
    "runOrder",
    "boundedTaskOutcomes",
    "stopRules",
    "productSourceTrees"
  ];
  for (const property of inherited) {
    if (!same(plan[property], base[property])) {
      throw new Error(`Paid comparison v11 changed inherited experiment field: ${property}`);
    }
  }
}

function usageFromResults(results) {
  const keys = [
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteTokens",
    "outputTokens",
    "reasoningTokens",
    "totalTokens"
  ];
  return Object.fromEntries(keys.map(key => [
    key,
    results.reduce((total, result) => total + (result.usage?.[key] ?? 0), 0)
  ]));
}

export function validateContinuationSourceV11(plan, source) {
  const expected = plan.continuation;
  if (
    source.schemaVersion !== 1 ||
    source.id !== "compact-authoring-paid-comparison-v10" ||
    source.planSha256 !== plan.basePlanSha256 ||
    source.error !== "provider-circuit-breaker: consecutive provider-failed task-runs reached the approved limit" ||
    source.activeTask !== null ||
    source.results.length !== expected.completedTaskRuns ||
    source.results.at(-1)?.id !== expected.lastCompletedRun ||
    source.abortedRun !== expected.lastCompletedRun ||
    source.ledger.consecutiveProviderFailureTaskRuns !== expected.stoppedConsecutiveProviderFailures
  ) {
    throw new Error("Paid comparison v11 continuation source identity is invalid.");
  }
  if (
    new Set(source.results.map(result => result.id)).size !== source.results.length ||
    !source.results.every((result, index) => (
      result.id === plan.runOrder[index] && result.runPosition === index + 1
    ))
  ) {
    throw new Error("Paid comparison v11 continuation source order is invalid.");
  }
  const traces = source.results.flatMap(result => result.trace ?? []);
  const billed = traces.filter(entry => entry.billingUsageComplete);
  const usage = usageFromResults(source.results);
  if (
    billed.length !== source.ledger.modelCalls ||
    traces.length !== source.ledger.apiRequestAttempts ||
    traces.filter(entry => entry.retryIndex > 0).length !== source.ledger.providerRetries ||
    !Object.keys(usage).every(key => usage[key] === source.ledger.usage[key]) ||
    Math.abs(sum(source.results, "standardCostUsd") - source.ledger.standardCostUsd) > 1e-9 ||
    Math.abs(sum(source.results, "costUsd") - source.ledger.costUsd) > 1e-9 ||
    Math.abs(
      sum(source.results, "uncertainCostReserveUsd") - source.ledger.uncertainCostReserveUsd
    ) > 1e-9 ||
    billed.some(entry => {
      const identity = entry.provider?.identity;
      return !identity ||
        identity.requestedModel !== identity.returnedModel ||
        identity.requestedServiceTier !== identity.returnedServiceTier;
    })
  ) {
    throw new Error("Paid comparison v11 continuation source ledger is invalid.");
  }
  return source;
}

function assertPlanShapeV11(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-comparison-v11" ||
    plan.requiredGate !== "R54-P6-C" ||
    plan.basePlanSha256 !== "48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950" ||
    !plan.evaluatorSourceFiles ||
    typeof plan.evaluatorSourceFiles !== "object" ||
    Array.isArray(plan.evaluatorSourceFiles)
  ) {
    throw new Error("Paid comparison v11 plan identity is invalid.");
  }
  const continuation = plan.continuation;
  if (
    continuation.source !== "evaluation/compact-authoring-paid-comparison-v10/results/IN_PROGRESS.json" ||
    continuation.sourceSha256 !== "1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381" ||
    continuation.completedTaskRuns !== 214 ||
    continuation.remainingTaskRuns !== 362 ||
    continuation.nextRunPosition !== 215 ||
    continuation.nextRun !== "final3-09-gradient-svg:r2:gpt-5.6-terra:D" ||
    continuation.lastCompletedRun !== "final3-09-gradient-svg:r2:gpt-5.6-terra:C" ||
    continuation.stoppedConsecutiveProviderFailures !== 3 ||
    continuation.approvedCircuitReset !== 0 ||
    continuation.carryModelCalls !== 620 ||
    continuation.carryApiRequestAttempts !== 634 ||
    continuation.carryProviderRetries !== 8 ||
    continuation.carryStandardCostUsd !== 1.7937806800000011 ||
    continuation.carryCostUsd !== 1.9731587479999992 ||
    continuation.carryUncertainCostReserveUsd !== 1.29602 ||
    continuation.carryExposureCostUsd !== 3.269178747999999
  ) {
    throw new Error("Paid comparison v11 continuation boundary is invalid.");
  }
}

export async function loadPaidComparisonPlanV11() {
  const [planBytes, base, sourceBytes] = await Promise.all([
    readFile(paidComparisonPlanFileV11),
    loadPaidComparisonPlanV10(),
    readFile(continuationSourceFileV11)
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV11(plan);
  assertInheritedPlanV11(plan, base);
  if (plan.basePlanSha256 !== base.planSha256) {
    throw new Error("Paid comparison v11 base plan hash drifted.");
  }
  if (sha256(sourceBytes) !== plan.continuation.sourceSha256) {
    throw new Error("Paid comparison v11 continuation source hash drifted.");
  }
  const source = validateContinuationSourceV11(plan, JSON.parse(sourceBytes));
  for (const [relative, expected] of Object.entries(plan.evaluatorSourceFiles)) {
    const frozen = commitFile(plan.evaluatorCheckpointCommit, relative, "evaluator source");
    if (sha256(frozen) !== expected) {
      throw new Error(`Paid comparison v11 evaluator source hash drifted: ${relative}`);
    }
    const current = await readFile(path.join(root, relative));
    if (sha256(current) !== expected) {
      throw new Error(`Paid comparison v11 current evaluator source drifted: ${relative}`);
    }
  }
  for (const [relative, expected] of Object.entries(plan.productSourceTrees)) {
    if (commitTree(plan.productCandidateCommit, relative) !== expected) {
      throw new Error(`Paid comparison v11 product tree hash drifted: ${relative}`);
    }
  }
  assertAncestor(plan.productCandidateCommit, "product candidate");
  assertAncestor(plan.evaluatorCheckpointCommit, "evaluator checkpoint");
  assertCurrentProduct(plan.productCandidateCommit);
  return Object.freeze({
    ...plan,
    tasks: base.tasks,
    conditions: base.conditions,
    planSha256: sha256(planBytes),
    continuationSource: Object.freeze(source)
  });
}

export async function assertPaidComparisonAuthorizedV11(plan) {
  const approved = plan ?? await loadPaidComparisonPlanV11();
  const gate = await readFile(paidComparisonGateFileV11, "utf8");
  const state = gate.match(/^## Gate state\n\n`([^`]+)`$/mu)?.[1];
  if (state !== "approved") {
    throw new Error(`${approved.requiredGate} is not approved; credential read and paid calls are blocked.`);
  }
  if (
    !gate.includes(approved.productCandidateCommit) ||
    !gate.includes(approved.evaluatorCheckpointCommit) ||
    !gate.includes(approved.planSha256) ||
    !gate.includes(approved.continuation.sourceSha256)
  ) {
    throw new Error(`${approved.requiredGate} does not authorize this continuation.`);
  }
  return approved;
}

export function initializeContinuationV11(plan) {
  const source = validateContinuationSourceV11(plan, plan.continuationSource);
  const ledger = clone(source.ledger);
  ledger.consecutiveProviderFailureTaskRuns = plan.continuation.approvedCircuitReset;
  return {
    sourceStartedAt: source.startedAt,
    sourceAbortedAt: source.abortedAt,
    startIndex: source.results.length,
    results: clone(source.results),
    ledger
  };
}

function terminalProviderFailure(result) {
  return (result.failures ?? []).some(failure => failure.startsWith("provider-request-failure:"));
}

function failureRecord({ plan, continuation, continuedAt, now, run, ledger, activeTask, results, error }) {
  return {
    schemaVersion: 1,
    id: plan.id,
    planSha256: plan.planSha256,
    basePlanSha256: plan.basePlanSha256,
    continuationSourceSha256: plan.continuation.sourceSha256,
    routeOracleSha256: plan.routeOracleSha256,
    productCandidateCommit: plan.productCandidateCommit,
    evaluatorCheckpointCommit: plan.evaluatorCheckpointCommit,
    sourceStartedAt: continuation.sourceStartedAt,
    sourceAbortedAt: continuation.sourceAbortedAt,
    continuedAt,
    abortedAt: now().toISOString(),
    abortedRun: run,
    error: error instanceof Error ? error.message : String(error),
    ledger,
    activeTask,
    results
  };
}

export async function runPaidComparisonMatrixV11({
  plan,
  apiKey,
  createResponse = createOpenAIResponseV2,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-comparison-v11"),
  now = () => new Date(),
  sleep,
  random,
  onProgress = async () => {},
  runTask = runPaidComparisonTaskV10
}) {
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const continuation = initializeContinuationV11(plan);
  const { ledger, results, startIndex } = continuation;
  let activeTask = null;
  const continuedAt = now().toISOString();
  for (let runIndex = startIndex; runIndex < plan.runOrder.length; runIndex += 1) {
    const run = plan.runOrder[runIndex];
    const { taskId, repetition, model, condition } = parseThreeModelRunV9(run);
    try {
      const result = await runTask({
        plan,
        task: taskById.get(taskId),
        repetition,
        model,
        condition,
        apiKey,
        ledger,
        artifactRoot: path.join(artifactRoot, taskId, `r${repetition}`, model, condition),
        createResponse,
        sleep,
        random,
        onProgress: async progress => {
          activeTask = { ...progress, repetition, run };
          await onProgress({ plan, ledger, results: [...results], activeTask, continuedAt });
        }
      });
      const completed = {
        ...result,
        id: run,
        repetition,
        model,
        runPosition: runIndex + 1
      };
      results.push(completed);
      activeTask = null;
      ledger.consecutiveProviderFailureTaskRuns = terminalProviderFailure(completed)
        ? ledger.consecutiveProviderFailureTaskRuns + 1
        : 0;
      await onProgress({ plan, ledger, results: [...results], activeTask: null, continuedAt });
      if (
        ledger.consecutiveProviderFailureTaskRuns >=
        plan.limits.maximumConsecutiveProviderFailureTaskRuns
      ) {
        throw new Error(
          "provider-circuit-breaker: consecutive provider-failed task-runs reached the approved limit"
        );
      }
    } catch (error) {
      const failure = failureRecord({
        plan,
        continuation,
        continuedAt,
        now,
        run,
        ledger,
        activeTask,
        results,
        error
      });
      await onProgress({ plan, ledger, results: [...results], failure, continuedAt });
      throw Object.assign(new Error(failure.error), { paidComparisonFailure: failure });
    }
  }
  return {
    schemaVersion: 1,
    id: plan.id,
    planSha256: plan.planSha256,
    basePlanSha256: plan.basePlanSha256,
    continuationSourceSha256: plan.continuation.sourceSha256,
    routeOracleSha256: plan.routeOracleSha256,
    productCandidateCommit: plan.productCandidateCommit,
    evaluatorCheckpointCommit: plan.evaluatorCheckpointCommit,
    sourceStartedAt: continuation.sourceStartedAt,
    sourceAbortedAt: continuation.sourceAbortedAt,
    continuedAt,
    completedAt: now().toISOString(),
    initialTaskRuns: startIndex,
    continuedTaskRuns: results.length - startIndex,
    taskRuns: results.length,
    passedTaskRuns: results.filter(result => result.passed).length,
    ledger,
    comparison: summarizePaidComparisonV3(
      results,
      plan.models.map(model => model.id),
      plan.conditions.map(condition => condition.id)
    ),
    results
  };
}

export async function runPaidComparisonDryRunV11() {
  const [plan, baseDry] = await Promise.all([
    loadPaidComparisonPlanV11(),
    runPaidComparisonDryRunV10()
  ]);
  const continuation = initializeContinuationV11(plan);
  return {
    passed: true,
    routeChecks: baseDry.checks,
    evaluatorChecks: baseDry.evaluatorChecks,
    matrixCells: plan.runOrder.length,
    preservedTaskRuns: continuation.startIndex,
    remainingTaskRuns: plan.runOrder.length - continuation.startIndex,
    nextRun: plan.runOrder[continuation.startIndex],
    carriedModelCalls: continuation.ledger.modelCalls,
    carriedApiRequestAttempts: continuation.ledger.apiRequestAttempts,
    carriedProviderRetries: continuation.ledger.providerRetries,
    carriedExposureCostUsd: continuation.ledger.exposureCostUsd,
    resetConsecutiveProviderFailures: continuation.ledger.consecutiveProviderFailureTaskRuns,
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0
  };
}

export async function runPaidComparisonV11({
  plan: suppliedPlan,
  apiKey,
  createResponse,
  artifactRoot,
  now,
  sleep,
  random,
  onProgress
} = {}) {
  const plan = await assertPaidComparisonAuthorizedV11(
    suppliedPlan ?? await loadPaidComparisonPlanV11()
  );
  await preflightPaidComparisonToolsV10();
  return runPaidComparisonMatrixV11({
    plan,
    apiKey,
    createResponse,
    artifactRoot,
    now,
    sleep,
    random,
    onProgress
  });
}
