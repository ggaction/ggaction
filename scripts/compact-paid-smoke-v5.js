import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { searchGgaction } from "../knowledge/task-resolver.js";
import {
  docsFallbackResources,
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../src/mcp/adapter.js";
import { evaluateFullSubmissionV1 } from "./compact-full-evaluator-v1.js";
import {
  assertSupportedStrictToolSchema,
  loadApiKey,
  projectedRequestInputTokens
} from "./compact-paid-smoke.js";
import {
  createKnowledgeAdapterV4,
  createOpenAIResponse,
  root,
  runPaidSmokeTaskV4
} from "./compact-paid-smoke-v4.js";
import { canonicalRuntimeClosureSource } from "./compact-runtime-closure-v2.js";

export { createOpenAIResponse, loadApiKey, projectedRequestInputTokens, root };

export const paidSmokeRootV5 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-smoke-v5"
);
export const routeOracleFileV5 = path.join(paidSmokeRootV5, "ROUTE_ORACLE.json");
export const paidSmokePlanFileV5 = path.join(paidSmokeRootV5, "PLAN.json");
const finalRootV3 = path.join(root, "evaluation", "compact-authoring-final-v3");
const paidSmokeGateFileV5 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_H.md"
);
const productPaths = Object.freeze(["src", "types", "knowledge", "docs", "package.json"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function functionTool(name, description, properties, required) {
  return Object.freeze({
    type: "function",
    name,
    description,
    strict: true,
    parameters: Object.freeze({
      type: "object",
      additionalProperties: false,
      required,
      properties: Object.freeze(properties)
    })
  });
}

export const submitResultToolV5 = functionTool(
  "submit_result",
  "Submit one complete chart program, terminal unsupported IDs, or exact open decision IDs for validation.",
  {
    status: { enum: ["program", "unsupported", "needs-input"] },
    source: { type: ["string", "null"], maxLength: 30000 },
    renderer: { enum: ["canvas", "svg", "png", "pdf", null] },
    unsupported: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 100 }
    },
    unresolved: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 100 }
    }
  },
  ["status", "source", "renderer", "unsupported", "unresolved"]
);

function role(packet) {
  if (packet.unsupported.length > 0) return "unsupported";
  if (packet.unresolved.length > 0) return "needs-input";
  return "supported";
}

function packetPlan(packet) {
  return packet.actionPlan.map(entry => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    options: entry.requiredOptions
  }));
}

async function sourceTasks(oracle) {
  const [finalOracleBytes, datasetsBytes] = await Promise.all([
    readFile(path.join(finalRootV3, "ROUTE_ORACLE.json")),
    readFile(path.join(finalRootV3, "datasets.json"))
  ]);
  if (sha256(finalOracleBytes) !== oracle.sourceFinalOracleSha256) {
    throw new Error("Paid smoke v5 source final oracle drifted.");
  }
  const finalOracle = JSON.parse(finalOracleBytes);
  const datasets = JSON.parse(datasetsBytes);
  if (finalOracle.productCandidateCommit !== oracle.productCandidateCommit) {
    throw new Error("Paid smoke v5 product candidate drifted from final v3.");
  }
  const datasetById = new Map(datasets.datasets.map(dataset => [dataset.id, dataset]));
  const finalTaskById = new Map(finalOracle.tasks.map(task => [task.id, task]));
  return oracle.tasks.map(selection => {
    const task = finalTaskById.get(selection.id);
    if (!task) throw new Error(`Unknown paid smoke v5 task: ${selection.id}`);
    const dataset = datasetById.get(task.dataset);
    if (!dataset) throw new Error(`${selection.id} uses unknown dataset ${task.dataset}.`);
    if (task.role !== selection.role) throw new Error(`${selection.id} role drifted.`);
    const packet = searchGgaction(task.query);
    const expectedFallbacks = docsFallbackResources(packet).map(resource => resource.uri);
    const checks = [
      [role(packet), task.role, "role"],
      [packetPlan(packet), task.expectedPlan, "plan"],
      [packet.unsupported.map(entry => entry.constraint), task.expectedUnsupported, "unsupported"],
      [packet.unresolved.map(entry => entry.constraint), task.expectedUnresolved, "unresolved"],
      [expectedFallbacks, task.expectedFallbacks, "fallback resources"]
    ];
    for (const [actual, expected, label] of checks) {
      if (!same(actual, expected)) {
        throw new Error(`${selection.id} v5 ${label} drifted: ${JSON.stringify(actual)}`);
      }
    }
    const expectedDRoute = [
      SEARCH_TOOL_NAME,
      ...(expectedFallbacks.length > 0 ? ["read_mcp_resources"] : []),
      "submit_result"
    ];
    if (!same(expectedDRoute, selection.expectedDRoute)) {
      throw new Error(`${selection.id} v5 D route drifted.`);
    }
    return Object.freeze({
      ...task,
      dataset,
      repairCoverage: selection.repairCoverage,
      expectedDRoute: selection.expectedDRoute
    });
  });
}

export async function loadRouteOracleV5() {
  const bytes = await readFile(routeOracleFileV5);
  const oracle = JSON.parse(bytes);
  if (
    oracle.schemaVersion !== 1 ||
    oracle.id !== "compact-authoring-paid-smoke-route-oracle-v5" ||
    oracle.sourceFinalCorpus !== "compact-authoring-final-v3" ||
    oracle.packetSchemaVersion !== 3 ||
    oracle.tasks.length !== 8 ||
    oracle.conditions.length !== 4 ||
    new Set(oracle.tasks.map(task => task.id)).size !== 8
  ) {
    throw new Error("Paid smoke v5 route oracle identity is invalid.");
  }
  const tasks = await sourceTasks(oracle);
  return Object.freeze({
    ...oracle,
    tasks: Object.freeze(tasks),
    oracleSha256: sha256(bytes)
  });
}

function planCost(plan) {
  const taskRuns = plan.runOrder.length;
  return {
    expected: taskRuns * (
      plan.costProjection.taskRunExpectedInputTokens * plan.pricingPerMillionTokens.uncachedInput +
      plan.costProjection.taskRunExpectedOutputTokens * plan.pricingPerMillionTokens.output
    ) / 1_000_000,
    maximum: taskRuns * (
      plan.limits.maximumInputTokensPerTask * plan.pricingPerMillionTokens.cacheWrite +
      plan.limits.maximumOutputTokensPerTask * plan.pricingPerMillionTokens.output
    ) / 1_000_000
  };
}

function assertPlanShapeV5(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-smoke-v5" ||
    plan.requiredGate !== "R54-P5-H"
  ) {
    throw new Error("Paid smoke v5 plan identity is invalid.");
  }
  if (plan.runOrder.length !== 32 || new Set(plan.runOrder).size !== 32) {
    throw new Error("Paid smoke v5 run order must contain 32 unique task-condition pairs.");
  }
  if (
    !plan.evaluatorSourceFiles ||
    typeof plan.evaluatorSourceFiles !== "object" ||
    Array.isArray(plan.evaluatorSourceFiles) ||
    !plan.productSourceTrees ||
    typeof plan.productSourceTrees !== "object" ||
    Array.isArray(plan.productSourceTrees)
  ) {
    throw new Error("Paid smoke v5 evaluator files and product trees must be frozen.");
  }
  if (
    plan.limits.maximumModelCallsPerTask !== 3 ||
    plan.limits.projectedInputBytesPerToken !== 1 ||
    plan.limits.maximumRequestBodyBytesPerCall !== 262144 ||
    plan.limits.maximumRequestBodyBytesPerTask !== 524288
  ) {
    throw new Error("Paid smoke v5 limits are invalid.");
  }
  const cost = planCost(plan);
  if (
    Math.abs(cost.expected - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(cost.maximum - plan.costProjection.calculatedMaximumUsd) > 1e-12 ||
    cost.maximum >= plan.limits.hardCostUsd
  ) {
    throw new Error("Paid smoke v5 cost projection does not match its envelopes.");
  }
}

function commitFile(commit, relative, label) {
  try {
    return execFileSync("git", ["show", `${commit}:${relative}`], {
      cwd: root,
      maxBuffer: 30_000_000
    });
  } catch {
    throw new Error(`Paid smoke v5 ${label} is unavailable: ${relative}`);
  }
}

function commitTree(commit, relative) {
  try {
    return execFileSync("git", ["rev-parse", `${commit}:${relative}`], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    throw new Error(`Paid smoke v5 product tree is unavailable: ${relative}`);
  }
}

function assertAncestor(commit, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error(`Paid smoke v5 ${label} is not an ancestor of the current HEAD.`);
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
    throw new Error("Paid smoke v5 current product differs from its frozen candidate.");
  }
}

export async function loadPaidSmokePlanV5() {
  const [planBytes, oracle] = await Promise.all([
    readFile(paidSmokePlanFileV5),
    loadRouteOracleV5()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV5(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Paid smoke v5 route oracle hash drifted.");
  }
  for (const [relative, expected] of Object.entries(plan.evaluatorSourceFiles)) {
    const frozen = commitFile(plan.evaluatorCheckpointCommit, relative, "evaluator source");
    if (sha256(frozen) !== expected) {
      throw new Error(`Paid smoke v5 evaluator source hash drifted: ${relative}`);
    }
    const current = await readFile(path.join(root, relative));
    if (sha256(current) !== expected) {
      throw new Error(`Paid smoke v5 current evaluator source drifted: ${relative}`);
    }
  }
  for (const [relative, expected] of Object.entries(plan.productSourceTrees)) {
    if (commitTree(plan.productCandidateCommit, relative) !== expected) {
      throw new Error(`Paid smoke v5 product tree hash drifted: ${relative}`);
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

export async function assertPaidSmokeAuthorizedV5(plan) {
  const approved = plan ?? await loadPaidSmokePlanV5();
  const gate = await readFile(paidSmokeGateFileV5, "utf8");
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

export async function preflightPaidSmokeToolsV5() {
  for (const condition of ["A", "B", "C", "D"]) {
    const adapter = await createKnowledgeAdapterV4(condition);
    try {
      for (const tool of [...adapter.tools, submitResultToolV5]) {
        assertSupportedStrictToolSchema(tool);
      }
    } finally {
      await adapter.close();
    }
  }
}

function taskPromptV5(task, adapter) {
  return [
    "Create the requested ggaction result using only public APIs.",
    adapter.instruction,
    "For a supported chart, submit status=program, the required renderer, empty unsupported and unresolved arrays, and a complete ESM module.",
    "The module must import ggaction, export function buildChart(rows), create a 640x400 Canvas with margin 50, store rows as the source dataset, and return the final ChartProgram.",
    "The module must also export function renderChart(program) using the required public Canvas, SVG, PNG, or PDF renderer.",
    "For a terminal limitation, submit status=unsupported, source=null, every exact unsupported ID, and every still-open unresolved ID in packet order.",
    "When no terminal limitation exists but a decision remains open, submit status=needs-input, source=null, and every exact unresolved ID in packet order.",
    "Preserve the renderer named by the task even when the result needs input.",
    `Required evaluation renderer: ${task.expectedRenderer ?? "none (submit null)"}.`,
    "Never invent support, use extension primitives, access files or network, or include markdown fences.",
    `Task: ${task.query}`,
    `Dataset (${task.dataset.id}): ${JSON.stringify(task.dataset.values)}`
  ].join("\n");
}

export async function evaluateSubmissionV5({ submission, task, artifactRoot }) {
  return evaluateFullSubmissionV1({ submission, task, artifactRoot });
}

function routeFailuresV5(condition, task, snapshot) {
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

export async function runPaidSmokeTaskV5(options) {
  return runPaidSmokeTaskV4({
    ...options,
    createAdapter: createKnowledgeAdapterV4,
    submitTool: submitResultToolV5,
    evaluateSubmission: evaluateSubmissionV5,
    promptBuilder: taskPromptV5,
    validateRoute: routeFailuresV5
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

export async function runPaidSmokeDryRunV5({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v5-dry")
} = {}) {
  const oracle = await loadRouteOracleV5();
  await preflightPaidSmokeToolsV5();
  const checks = [];
  for (const task of oracle.tasks) {
    for (const condition of oracle.conditions.map(entry => entry.id)) {
      const adapter = await createKnowledgeAdapterV4(condition);
      try {
        if (condition === "A") {
          const search = JSON.parse(await adapter.handle({
            name: "search_docs",
            arguments: JSON.stringify({ query: task.query })
          }));
          if (!search[0]?.url) throw new Error(`${task.id}: public docs route was empty`);
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
        const routeFailures = routeFailuresV5(condition, task, adapter.snapshot());
        if (routeFailures.length > 0) throw new Error(routeFailures.join(", "));
        checks.push({ task: task.id, condition, passed: true, knowledge: adapter.snapshot() });
      } finally {
        await adapter.close();
      }
    }
    const evaluation = await evaluateSubmissionV5({
      submission: canonicalSubmission(task),
      task,
      artifactRoot: path.join(artifactRoot, task.id)
    });
    if (!evaluation.passed) {
      throw new Error(`${task.id} canonical v5 evaluator failed: ${evaluation.failures.join(", ")}`);
    }
  }
  return {
    schemaVersion: 1,
    routeOracleSha256: oracle.oracleSha256,
    checks: checks.length,
    evaluatorChecks: oracle.tasks.length,
    passed: checks.every(check => check.passed),
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0,
    details: checks
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

function addUsage(target, usage) {
  for (const key of Object.keys(target)) target[key] += usage[key] ?? 0;
}

function summarizeResults(results) {
  const conditions = {};
  for (const condition of ["A", "B", "C", "D"]) {
    const entries = results.filter(result => result.condition === condition);
    const usage = emptyUsage();
    for (const entry of entries) addUsage(usage, entry.usage);
    conditions[condition] = {
      tasks: entries.length,
      passed: entries.filter(entry => entry.passed).length,
      modelCalls: entries.reduce((sum, entry) => sum + entry.modelCalls, 0),
      usage,
      costUsd: entries.reduce((sum, entry) => sum + entry.costUsd, 0),
      timeToValidMilliseconds: entries
        .filter(entry => entry.passed)
        .reduce((sum, entry) => sum + entry.timeToValidMilliseconds, 0)
    };
  }
  return conditions;
}

export async function runPaidSmokeV5({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v5"),
  now = () => new Date(),
  onProgress = async () => {}
} = {}) {
  const plan = await assertPaidSmokeAuthorizedV5(suppliedPlan ?? await loadPaidSmokePlanV5());
  await preflightPaidSmokeToolsV5();
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const ledger = { usage: emptyUsage(), costUsd: 0, modelCalls: 0 };
  const results = [];
  let activeTask = null;
  const startedAt = now().toISOString();
  for (const run of plan.runOrder) {
    const separator = run.lastIndexOf(":");
    const taskId = run.slice(0, separator);
    const condition = run.slice(separator + 1);
    try {
      const result = await runPaidSmokeTaskV5({
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
      results.push(result);
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
    conditions: summarizeResults(results),
    results
  };
}
