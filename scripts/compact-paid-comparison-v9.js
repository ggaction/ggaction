import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { SEARCH_TOOL_NAME, searchGgactionText } from "../src/mcp/adapter.js";
import { createKnowledgeAdapterV4 } from "./compact-paid-smoke-v4.js";
import {
  evaluateSubmissionV6,
  paidSmokeRouteV6
} from "./compact-paid-smoke-v6.js";
import { summarizePaidComparisonV3 } from "./compact-paid-comparison-v3.js";
import {
  createOpenAIResponseV2,
  loadApiKey,
  planForModelV8,
  preflightPaidComparisonToolsV8,
  runPaidComparisonMatrixV8,
  runPaidComparisonTaskV8
} from "./compact-paid-comparison-v8.js";
import {
  loadRouteOracleV9,
  modelCallEnvelopeV9,
  paidComparisonRootV9,
  parseThreeModelRunV9,
  threeModelRunOrderV9
} from "./compact-paid-oracle-v9.js";
import { canonicalRuntimeClosureSource, root } from "./compact-runtime-closure-v2.js";

export { loadApiKey, paidComparisonRootV9, root };
export { loadRouteOracleV9, modelCallEnvelopeV9, parseThreeModelRunV9, threeModelRunOrderV9 };

export const paidComparisonPlanFileV9 = path.join(paidComparisonRootV9, "PLAN.json");
const paidComparisonGateFileV9 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase6",
  "GATE_A.md"
);
const productPaths = Object.freeze(["src", "types", "knowledge", "docs", "package.json"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function modelConfig(plan, modelId) {
  const model = plan.models.find(entry => entry.id === modelId);
  if (!model) throw new Error(`Unknown paid comparison v9 model: ${modelId}`);
  return model;
}

export function planForModelV9(plan, modelId) {
  return planForModelV8(plan, modelId);
}

function projectionCost(plan, maximum = false) {
  const runCounts = new Map(plan.models.map(model => [model.id, 0]));
  for (const run of plan.runOrder) {
    const { model } = parseThreeModelRunV9(run);
    runCounts.set(model, runCounts.get(model) + 1);
  }
  let standard = 0;
  for (const [model, count] of runCounts) {
    const pricing = modelConfig(plan, model).pricingPerMillionTokens;
    const inputTokens = maximum
      ? plan.limits.maximumInputTokensPerTask
      : plan.costProjection.taskRunExpectedInputTokens;
    const outputTokens = maximum
      ? plan.limits.maximumOutputTokensPerTask
      : plan.costProjection.taskRunExpectedOutputTokens;
    standard += count * (
      inputTokens * (maximum ? pricing.maximumInput : pricing.uncachedInput) +
      outputTokens * pricing.output
    ) / 1_000_000;
  }
  return {
    standard,
    conservative: standard * plan.costAccountingMultiplier
  };
}

function assertPlanShapeV9(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-comparison-v9" ||
    plan.requiredGate !== "R54-P6-A"
  ) {
    throw new Error("Paid comparison v9 plan identity is invalid.");
  }
  const expectedModels = ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4-nano"];
  if (
    plan.models.length !== 3 ||
    !plan.models.every((model, index) => model.id === expectedModels[index]) ||
    new Set(plan.models.map(model => model.id)).size !== 3
  ) {
    throw new Error("Paid comparison v9 models are invalid.");
  }
  const expectedPricing = {
    "gpt-5.6-terra": [2, 0.2, 2.5, 2.5, 12, "explicit-cache-write"],
    "gpt-5.6-luna": [0.2, 0.02, 0.25, 0.25, 1.2, "explicit-cache-write"],
    "gpt-5.4-nano": [0.2, 0.02, 0.2, 0.2, 1.25, "uncached-input-fallback"]
  };
  for (const model of plan.models) {
    const pricing = model.pricingPerMillionTokens;
    const actual = [
      pricing.uncachedInput,
      pricing.cachedInput,
      pricing.cacheWrite,
      pricing.maximumInput,
      pricing.output,
      model.cacheWriteBillingBasis
    ];
    if (JSON.stringify(actual) !== JSON.stringify(expectedPricing[model.id])) {
      throw new Error(`Paid comparison v9 pricing drifted for ${model.id}.`);
    }
  }
  if (plan.runOrder.length !== 576 || new Set(plan.runOrder).size !== 576) {
    throw new Error("Paid comparison v9 run order must contain 576 unique cells.");
  }
  if (
    !plan.evaluatorSourceFiles ||
    typeof plan.evaluatorSourceFiles !== "object" ||
    Array.isArray(plan.evaluatorSourceFiles) ||
    !plan.productSourceTrees ||
    typeof plan.productSourceTrees !== "object" ||
    Array.isArray(plan.productSourceTrees)
  ) {
    throw new Error("Paid comparison v9 evaluator files and product trees must be frozen.");
  }
  if (
    plan.limits.repetitions !== 2 ||
    plan.limits.maximumModelCallsPerTask !== 5 ||
    plan.limits.maximumModelCallsTotal !== 2460 ||
    plan.limits.maximumApiRequestAttemptsTotal !== 2532 ||
    plan.limits.maximumProviderRetriesPerRequest !== 1 ||
    plan.limits.maximumProviderRetriesTotal !== 72 ||
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
    plan.limits.hardCostUsd !== 50 ||
    plan.costAccountingMultiplier !== 1.1
  ) {
    throw new Error("Paid comparison v9 limits are invalid.");
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
    throw new Error("Paid comparison v9 cost projection does not match its rolling cap.");
  }
}

function commitFile(commit, relative, label) {
  try {
    return execFileSync("git", ["show", `${commit}:${relative}`], {
      cwd: root,
      maxBuffer: 30_000_000
    });
  } catch {
    throw new Error(`Paid comparison v9 ${label} is unavailable: ${relative}`);
  }
}

function commitTree(commit, relative) {
  try {
    return execFileSync("git", ["rev-parse", `${commit}:${relative}`], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    throw new Error(`Paid comparison v9 product tree is unavailable: ${relative}`);
  }
}

function assertAncestor(commit, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error(`Paid comparison v9 ${label} is not an ancestor of the current HEAD.`);
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
    throw new Error("Paid comparison v9 current product differs from its frozen candidate.");
  }
}

export async function loadPaidComparisonPlanV9() {
  const [planBytes, oracle] = await Promise.all([
    readFile(paidComparisonPlanFileV9),
    loadRouteOracleV9()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV9(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Paid comparison v9 route oracle hash drifted.");
  }
  const modelIds = plan.models.map(model => model.id);
  const conditionIds = oracle.conditions.map(condition => condition.id);
  const expectedRunOrder = threeModelRunOrderV9(
    oracle.tasks,
    modelIds,
    conditionIds,
    plan.limits.repetitions
  );
  if (JSON.stringify(plan.runOrder) !== JSON.stringify(expectedRunOrder)) {
    throw new Error("Paid comparison v9 run order is not the frozen 12-cell Latin square.");
  }
  const callEnvelope = modelCallEnvelopeV9(
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
    throw new Error("Paid comparison v9 model-call envelope drifted from the frozen routes.");
  }
  for (const [relative, expected] of Object.entries(plan.evaluatorSourceFiles)) {
    const frozen = commitFile(plan.evaluatorCheckpointCommit, relative, "evaluator source");
    if (sha256(frozen) !== expected) {
      throw new Error(`Paid comparison v9 evaluator source hash drifted: ${relative}`);
    }
    const current = await readFile(path.join(root, relative));
    if (sha256(current) !== expected) {
      throw new Error(`Paid comparison v9 current evaluator source drifted: ${relative}`);
    }
  }
  for (const [relative, expected] of Object.entries(plan.productSourceTrees)) {
    if (commitTree(plan.productCandidateCommit, relative) !== expected) {
      throw new Error(`Paid comparison v9 product tree hash drifted: ${relative}`);
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

export async function assertPaidComparisonAuthorizedV9(plan) {
  const approved = plan ?? await loadPaidComparisonPlanV9();
  const gate = await readFile(paidComparisonGateFileV9, "utf8");
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

function routeFailuresV9(condition, task, snapshot) {
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

export async function preflightPaidComparisonToolsV9() {
  return preflightPaidComparisonToolsV8();
}

export async function runPaidComparisonTaskV9(options) {
  const model = modelConfig(options.plan, options.model);
  const createResponse = options.createResponse ?? createOpenAIResponseV2;
  return runPaidComparisonTaskV8({
    ...options,
    createResponse: async request => {
      const response = await createResponse(request);
      if (
        model.cacheWriteBillingBasis === "uncached-input-fallback" &&
        Number.isInteger(response?.usage?.input_tokens_details?.cached_tokens) &&
        response.usage.input_tokens_details.cache_write_tokens === undefined
      ) {
        return {
          ...response,
          usage: {
            ...response.usage,
            input_tokens_details: {
              ...response.usage.input_tokens_details,
              cache_write_tokens: 0
            }
          }
        };
      }
      return response;
    }
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

export async function runPaidComparisonDryRunV9({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-comparison-v9-dry")
} = {}) {
  const oracle = await loadRouteOracleV9();
  await preflightPaidComparisonToolsV9();
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
        const failures = routeFailuresV9(condition, task, adapter.snapshot());
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
  const runOrder = threeModelRunOrderV9(
    oracle.tasks,
    ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4-nano"],
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

export async function runPaidComparisonMatrixV9(options) {
  const result = await runPaidComparisonMatrixV8(options);
  return {
    ...result,
    comparison: summarizePaidComparisonV3(
      result.results,
      options.plan.models.map(model => model.id),
      options.plan.conditions.map(condition => condition.id)
    )
  };
}

export async function runPaidComparisonV9({
  plan: suppliedPlan,
  apiKey,
  createResponse,
  artifactRoot,
  now,
  sleep,
  random,
  onProgress
} = {}) {
  const plan = await assertPaidComparisonAuthorizedV9(
    suppliedPlan ?? await loadPaidComparisonPlanV9()
  );
  await preflightPaidComparisonToolsV9();
  return runPaidComparisonMatrixV9({
    plan,
    apiKey,
    createResponse,
    artifactRoot,
    now,
    sleep,
    random,
    onProgress,
    runTask: runPaidComparisonTaskV9
  });
}
