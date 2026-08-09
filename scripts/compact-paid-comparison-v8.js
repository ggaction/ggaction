import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { SEARCH_TOOL_NAME, searchGgactionText } from "../src/mcp/adapter.js";
import { createKnowledgeAdapterV4 } from "./compact-paid-smoke-v4.js";
import { submitResultToolV5 } from "./compact-paid-smoke-v5.js";
import {
  evaluateSubmissionV6,
  loadApiKey,
  paidSmokeRouteV6,
  preflightPaidSmokeToolsV6,
  taskPromptV6
} from "./compact-paid-smoke-v6.js";
import { createOpenAIResponseV2 } from "./compact-openai-response-v2.js";
import { summarizePaidComparisonV2 } from "./compact-paid-comparison-v2.js";
import {
  dualModelRunOrderV8,
  loadRouteOracleV8,
  modelCallEnvelopeV8,
  paidComparisonRootV8,
  parseDualModelRunV8
} from "./compact-paid-oracle-v8.js";
import { runBoundedToolStateMachineV3 } from "./compact-paid-state-machine-v3.js";
import { canonicalRuntimeClosureSource, root } from "./compact-runtime-closure-v2.js";

export { createOpenAIResponseV2, loadApiKey, root };
export { dualModelRunOrderV8, loadRouteOracleV8, modelCallEnvelopeV8, parseDualModelRunV8 };
export { paidComparisonRootV8 };

export const paidComparisonPlanFileV8 = path.join(paidComparisonRootV8, "PLAN.json");
const paidComparisonGateFileV8 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_L.md"
);
const productPaths = Object.freeze(["src", "types", "knowledge", "docs", "package.json"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function initialLedger() {
  return {
    usage: emptyUsage(),
    standardCostUsd: 0,
    costUsd: 0,
    uncertainCostReserveUsd: 0,
    exposureCostUsd: 0,
    modelCalls: 0,
    apiRequestAttempts: 0,
    providerRetries: 0,
    consecutiveProviderFailureTaskRuns: 0
  };
}

function modelConfig(plan, modelId) {
  const model = plan.models.find(entry => entry.id === modelId);
  if (!model) throw new Error(`Unknown paid comparison v8 model: ${modelId}`);
  return model;
}

export function planForModelV8(plan, modelId) {
  const model = modelConfig(plan, modelId);
  return {
    ...plan,
    api: { ...plan.api, model: model.id },
    pricingPerMillionTokens: model.pricingPerMillionTokens
  };
}

function projectionCost(plan, maximum = false) {
  let standard = 0;
  for (const run of plan.runOrder) {
    const { model } = parseDualModelRunV8(run);
    const pricing = modelConfig(plan, model).pricingPerMillionTokens;
    const inputTokens = maximum
      ? plan.limits.maximumInputTokensPerTask
      : plan.costProjection.taskRunExpectedInputTokens;
    const outputTokens = maximum
      ? plan.limits.maximumOutputTokensPerTask
      : plan.costProjection.taskRunExpectedOutputTokens;
    standard += (
      inputTokens * (maximum ? pricing.cacheWrite : pricing.uncachedInput) +
      outputTokens * pricing.output
    ) / 1_000_000;
  }
  return {
    standard,
    conservative: standard * plan.costAccountingMultiplier
  };
}

function assertPlanShapeV8(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-comparison-v8" ||
    plan.requiredGate !== "R54-P5-L"
  ) {
    throw new Error("Paid comparison v8 plan identity is invalid.");
  }
  if (
    plan.models.length !== 2 ||
    plan.models[0].id !== "gpt-5.6-terra" ||
    plan.models[1].id !== "gpt-5.6-luna" ||
    new Set(plan.models.map(model => model.id)).size !== 2
  ) {
    throw new Error("Paid comparison v8 models are invalid.");
  }
  const expectedPricing = {
    "gpt-5.6-terra": [2, 0.2, 2.5, 12],
    "gpt-5.6-luna": [0.2, 0.02, 0.25, 1.2]
  };
  for (const model of plan.models) {
    const actual = [
      model.pricingPerMillionTokens.uncachedInput,
      model.pricingPerMillionTokens.cachedInput,
      model.pricingPerMillionTokens.cacheWrite,
      model.pricingPerMillionTokens.output
    ];
    if (JSON.stringify(actual) !== JSON.stringify(expectedPricing[model.id])) {
      throw new Error(`Paid comparison v8 pricing drifted for ${model.id}.`);
    }
  }
  if (plan.runOrder.length !== 256 || new Set(plan.runOrder).size !== 256) {
    throw new Error("Paid comparison v8 run order must contain 256 unique cells.");
  }
  if (
    !plan.evaluatorSourceFiles ||
    typeof plan.evaluatorSourceFiles !== "object" ||
    Array.isArray(plan.evaluatorSourceFiles) ||
    !plan.productSourceTrees ||
    typeof plan.productSourceTrees !== "object" ||
    Array.isArray(plan.productSourceTrees)
  ) {
    throw new Error("Paid comparison v8 evaluator files and product trees must be frozen.");
  }
  if (
    plan.limits.repetitions !== 2 ||
    plan.limits.maximumModelCallsPerTask !== 5 ||
    plan.limits.maximumModelCallsTotal !== 1096 ||
    plan.limits.maximumApiRequestAttemptsTotal !== 1128 ||
    plan.limits.maximumProviderRetriesPerRequest !== 1 ||
    plan.limits.maximumProviderRetriesTotal !== 32 ||
    plan.limits.maximumProviderRetryDelayMilliseconds !== 30000 ||
    plan.limits.maximumConsecutiveProviderFailureTaskRuns !== 3 ||
    plan.limits.maximumSubmissionAttemptsPerTask !== 3 ||
    plan.limits.maximumInputTokensPerTask !== 120000 ||
    plan.limits.maximumOutputTokensPerTask !== 28000 ||
    plan.limits.maximumKnowledgeOutputTokensPerResponse !== 2000 ||
    plan.limits.maximumSubmissionOutputTokensPerResponse !== 8000 ||
    plan.limits.projectedInputBytesPerToken !== 1 ||
    plan.limits.maximumRequestBodyBytesPerCall !== 524288 ||
    plan.limits.maximumRequestBodyBytesPerTask !== 3145728 ||
    plan.limits.hardCostUsd !== 30 ||
    plan.costAccountingMultiplier !== 1.1
  ) {
    throw new Error("Paid comparison v8 limits are invalid.");
  }
  const expected = projectionCost(plan);
  const maximum = projectionCost(plan, true);
  if (
    Math.abs(expected.standard - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(expected.conservative - plan.costProjection.expectedWithRegionalUpliftUsd) > 1e-12 ||
    Math.abs(maximum.standard - plan.costProjection.theoreticalTokenEnvelopeMaximumUsd) > 1e-12 ||
    Math.abs(
      maximum.conservative -
      plan.costProjection.theoreticalTokenEnvelopeMaximumWithRegionalUpliftUsd
    ) > 1e-12 ||
    expected.conservative >= plan.limits.hardCostUsd ||
    maximum.conservative <= plan.limits.hardCostUsd
  ) {
    throw new Error("Paid comparison v8 cost projection does not match its rolling cap.");
  }
}

function commitFile(commit, relative, label) {
  try {
    return execFileSync("git", ["show", `${commit}:${relative}`], {
      cwd: root,
      maxBuffer: 30_000_000
    });
  } catch {
    throw new Error(`Paid comparison v8 ${label} is unavailable: ${relative}`);
  }
}

function commitTree(commit, relative) {
  try {
    return execFileSync("git", ["rev-parse", `${commit}:${relative}`], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    throw new Error(`Paid comparison v8 product tree is unavailable: ${relative}`);
  }
}

function assertAncestor(commit, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error(`Paid comparison v8 ${label} is not an ancestor of the current HEAD.`);
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
    throw new Error("Paid comparison v8 current product differs from its frozen candidate.");
  }
}

export async function loadPaidComparisonPlanV8() {
  const [planBytes, oracle] = await Promise.all([
    readFile(paidComparisonPlanFileV8),
    loadRouteOracleV8()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV8(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Paid comparison v8 route oracle hash drifted.");
  }
  const modelIds = plan.models.map(model => model.id);
  const conditionIds = oracle.conditions.map(condition => condition.id);
  const expectedRunOrder = dualModelRunOrderV8(
    oracle.tasks,
    modelIds,
    conditionIds,
    plan.limits.repetitions
  );
  if (JSON.stringify(plan.runOrder) !== JSON.stringify(expectedRunOrder)) {
    throw new Error("Paid comparison v8 run order is not the frozen 8-cell Latin square.");
  }
  const callEnvelope = modelCallEnvelopeV8(
    oracle.tasks,
    modelIds,
    conditionIds,
    plan.limits.repetitions,
    plan.limits.maximumSubmissionAttemptsPerTask
  );
  if (
    callEnvelope.expected !== plan.costProjection.expectedModelCallsIfFirstPass ||
    callEnvelope.maximum !== plan.limits.maximumModelCallsTotal
  ) {
    throw new Error("Paid comparison v8 model-call envelope drifted from the frozen routes.");
  }
  for (const [relative, expected] of Object.entries(plan.evaluatorSourceFiles)) {
    const frozen = commitFile(plan.evaluatorCheckpointCommit, relative, "evaluator source");
    if (sha256(frozen) !== expected) {
      throw new Error(`Paid comparison v8 evaluator source hash drifted: ${relative}`);
    }
    const current = await readFile(path.join(root, relative));
    if (sha256(current) !== expected) {
      throw new Error(`Paid comparison v8 current evaluator source drifted: ${relative}`);
    }
  }
  for (const [relative, expected] of Object.entries(plan.productSourceTrees)) {
    if (commitTree(plan.productCandidateCommit, relative) !== expected) {
      throw new Error(`Paid comparison v8 product tree hash drifted: ${relative}`);
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

export async function assertPaidComparisonAuthorizedV8(plan) {
  const approved = plan ?? await loadPaidComparisonPlanV8();
  const gate = await readFile(paidComparisonGateFileV8, "utf8");
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

function routeFailuresV8(condition, task, snapshot) {
  const failures = [];
  if (snapshot.searches !== 1) failures.push(`knowledge-search-count:${snapshot.searches}`);
  if (condition === "A") {
    if (snapshot.docsReads !== 1) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if (snapshot.toolCalls !== 2) failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
  } else if (condition === "B" || condition === "C") {
    if (snapshot.docsReads !== 0) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if (snapshot.toolCalls !== 1) failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
  } else {
    const expectedReads = task.expectedFallbacks.length;
    const expectedReadCalls = expectedReads > 0 ? 1 : 0;
    if (snapshot.docsReads !== expectedReads) {
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

export async function preflightPaidComparisonToolsV8() {
  return preflightPaidSmokeToolsV6();
}

export async function runPaidComparisonTaskV8(options) {
  const taskPlan = planForModelV8(options.plan, options.model);
  return runBoundedToolStateMachineV3({
    ...options,
    plan: taskPlan,
    route: paidSmokeRouteV6(options.condition, options.task),
    createAdapter: createKnowledgeAdapterV4,
    submitTool: submitResultToolV5,
    evaluateSubmission: evaluateSubmissionV6,
    promptBuilder: taskPromptV6,
    validateRoute: routeFailuresV8
  });
}

function canonicalSubmission(task) {
  if (task.role === "supported") {
    return {
      status: "program",
      source: canonicalRuntimeClosureSource(task),
      renderer: task.expectedRenderer,
      unsupported: [],
      unresolved: []
    };
  }
  return {
    status: task.role,
    source: null,
    renderer: task.expectedRenderer,
    unsupported: task.expectedUnsupported,
    unresolved: task.expectedUnresolved
  };
}

export async function runPaidComparisonDryRunV8({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-comparison-v8-dry")
} = {}) {
  const oracle = await loadRouteOracleV8();
  await preflightPaidComparisonToolsV8();
  const checks = [];
  for (const task of oracle.tasks) {
    for (const condition of oracle.conditions.map(entry => entry.id)) {
      const adapter = await createKnowledgeAdapterV4(condition);
      try {
        const route = paidSmokeRouteV6(condition, task);
        if (condition === "A") {
          const search = JSON.parse(await adapter.handle({
            name: "search_docs",
            arguments: JSON.stringify({ query: task.query })
          }));
          if (search.length === 0) throw new Error(`${task.id}: public docs search returned no route`);
          await adapter.handle({
            name: "read_doc",
            arguments: JSON.stringify({ url: search[0].url })
          });
        } else {
          const text = await adapter.handle({
            name: SEARCH_TOOL_NAME,
            arguments: JSON.stringify({ query: task.query })
          });
          if (text !== searchGgactionText(task.query)) {
            throw new Error(`${task.id}:${condition} packet drifted`);
          }
          if (condition === "D" && task.expectedFallbacks.length > 0) {
            await adapter.handle({
              name: "read_mcp_resources",
              arguments: JSON.stringify({ uris: task.expectedFallbacks })
            });
          }
        }
        const failures = routeFailuresV8(condition, task, adapter.snapshot());
        if (failures.length > 0) throw new Error(failures.join(","));
        checks.push({ task: task.id, condition, route, knowledge: adapter.snapshot() });
      } finally {
        await adapter.close();
      }
    }
  }
  const evaluatorChecks = [];
  for (const task of oracle.tasks) {
    const result = await evaluateSubmissionV6({
      task,
      artifactRoot: path.join(artifactRoot, task.id),
      submission: canonicalSubmission(task)
    });
    if (!result.passed) throw new Error(`${task.id}: ${result.failures.join(",")}`);
    evaluatorChecks.push({ task: task.id, passed: true });
  }
  const runOrder = dualModelRunOrderV8(
    oracle.tasks,
    ["gpt-5.6-terra", "gpt-5.6-luna"],
    oracle.conditions.map(entry => entry.id),
    2
  );
  return {
    checks: checks.length,
    evaluatorChecks: evaluatorChecks.length,
    matrixCells: runOrder.length,
    passed: true,
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0,
    details: checks,
    runOrder
  };
}

function terminalProviderFailure(result) {
  return (result.failures ?? []).some(failure => failure.startsWith("provider-request-failure:"));
}

function failureRecord({ plan, startedAt, now, run, ledger, activeTask, results, error }) {
  return {
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
}

export async function runPaidComparisonMatrixV8({
  plan,
  apiKey,
  createResponse = createOpenAIResponseV2,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-comparison-v8"),
  now = () => new Date(),
  sleep,
  random,
  onProgress = async () => {},
  runTask = runPaidComparisonTaskV8
}) {
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const ledger = initialLedger();
  const results = [];
  let activeTask = null;
  const startedAt = now().toISOString();
  for (let runIndex = 0; runIndex < plan.runOrder.length; runIndex += 1) {
    const run = plan.runOrder[runIndex];
    const { taskId, repetition, model, condition } = parseDualModelRunV8(run);
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
          await onProgress({ plan, ledger, results: [...results], activeTask });
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
      await onProgress({ plan, ledger, results: [...results], activeTask: null });
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
        startedAt,
        now,
        run,
        ledger,
        activeTask,
        results,
        error
      });
      await onProgress({ plan, ledger, results: [...results], failure });
      throw Object.assign(new Error(failure.error), { paidComparisonFailure: failure });
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
    comparison: summarizePaidComparisonV2(
      results,
      plan.models.map(model => model.id),
      plan.conditions.map(condition => condition.id)
    ),
    results
  };
}

export async function runPaidComparisonV8({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponseV2,
  artifactRoot,
  now,
  sleep,
  random,
  onProgress
} = {}) {
  const plan = await assertPaidComparisonAuthorizedV8(
    suppliedPlan ?? await loadPaidComparisonPlanV8()
  );
  await preflightPaidComparisonToolsV8();
  return runPaidComparisonMatrixV8({
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
