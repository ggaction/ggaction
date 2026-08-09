import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../src/mcp/adapter.js";
import { evaluateFullSubmissionV2 } from "./compact-full-evaluator-v2.js";
import {
  assertSupportedStrictToolSchema,
  loadApiKey
} from "./compact-paid-smoke.js";
import {
  createKnowledgeAdapterV4,
  createOpenAIResponse,
  root
} from "./compact-paid-smoke-v4.js";
import {
  loadRouteOracleV5,
  submitResultToolV5
} from "./compact-paid-smoke-v5.js";
import { runBoundedToolStateMachineV1 } from "./compact-paid-state-machine-v1.js";
import { canonicalRuntimeClosureSource } from "./compact-runtime-closure-v2.js";

export { root };

export { createOpenAIResponse, loadApiKey };

export const paidSmokeRootV6 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-smoke-v6"
);
export const paidSmokePlanFileV6 = path.join(paidSmokeRootV6, "PLAN.json");
const paidSmokeGateFileV6 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_I.md"
);
const productPaths = Object.freeze(["src", "types", "knowledge", "docs", "package.json"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function assertPlanShapeV6(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-smoke-v6" ||
    plan.requiredGate !== "R54-P5-I"
  ) {
    throw new Error("Paid smoke v6 plan identity is invalid.");
  }
  if (plan.runOrder.length !== 32 || new Set(plan.runOrder).size !== 32) {
    throw new Error("Paid smoke v6 run order must contain 32 unique task-condition pairs.");
  }
  if (
    !plan.evaluatorSourceFiles ||
    typeof plan.evaluatorSourceFiles !== "object" ||
    Array.isArray(plan.evaluatorSourceFiles) ||
    !plan.productSourceTrees ||
    typeof plan.productSourceTrees !== "object" ||
    Array.isArray(plan.productSourceTrees)
  ) {
    throw new Error("Paid smoke v6 evaluator files and product trees must be frozen.");
  }
  if (
    plan.limits.maximumModelCallsPerTask !== 4 ||
    plan.limits.maximumModelCallsTotal !== 128 ||
    plan.limits.maximumInputTokensPerTask !== 36000 ||
    plan.limits.maximumOutputTokensPerTask !== 12000 ||
    plan.limits.projectedInputBytesPerToken !== 1 ||
    plan.limits.maximumRequestBodyBytesPerCall !== 262144 ||
    plan.limits.maximumRequestBodyBytesPerTask !== 786432
  ) {
    throw new Error("Paid smoke v6 limits are invalid.");
  }
  const cost = planCost(plan);
  if (
    Math.abs(cost.expected - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(cost.maximum - plan.costProjection.calculatedMaximumUsd) > 1e-12 ||
    plan.costProjection.calculatedMaximumWithRegionalUpliftUsd >= plan.limits.hardCostUsd
  ) {
    throw new Error("Paid smoke v6 cost projection does not match its envelopes.");
  }
}

function commitFile(commit, relative, label) {
  try {
    return execFileSync("git", ["show", `${commit}:${relative}`], {
      cwd: root,
      maxBuffer: 30_000_000
    });
  } catch {
    throw new Error(`Paid smoke v6 ${label} is unavailable: ${relative}`);
  }
}

function commitTree(commit, relative) {
  try {
    return execFileSync("git", ["rev-parse", `${commit}:${relative}`], {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    throw new Error(`Paid smoke v6 product tree is unavailable: ${relative}`);
  }
}

function assertAncestor(commit, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error(`Paid smoke v6 ${label} is not an ancestor of the current HEAD.`);
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
    throw new Error("Paid smoke v6 current product differs from its frozen candidate.");
  }
}

export async function loadPaidSmokePlanV6() {
  const [planBytes, oracle] = await Promise.all([
    readFile(paidSmokePlanFileV6),
    loadRouteOracleV5()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV6(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Paid smoke v6 route oracle hash drifted.");
  }
  for (const [relative, expected] of Object.entries(plan.evaluatorSourceFiles)) {
    const frozen = commitFile(plan.evaluatorCheckpointCommit, relative, "evaluator source");
    if (sha256(frozen) !== expected) {
      throw new Error(`Paid smoke v6 evaluator source hash drifted: ${relative}`);
    }
    const current = await readFile(path.join(root, relative));
    if (sha256(current) !== expected) {
      throw new Error(`Paid smoke v6 current evaluator source drifted: ${relative}`);
    }
  }
  for (const [relative, expected] of Object.entries(plan.productSourceTrees)) {
    if (commitTree(plan.productCandidateCommit, relative) !== expected) {
      throw new Error(`Paid smoke v6 product tree hash drifted: ${relative}`);
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

export async function assertPaidSmokeAuthorizedV6(plan) {
  const approved = plan ?? await loadPaidSmokePlanV6();
  const gate = await readFile(paidSmokeGateFileV6, "utf8");
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

export function paidSmokeRouteV6(condition, task) {
  if (condition === "A") return Object.freeze(["search_docs", "read_doc", "submit_result"]);
  if (condition === "B" || condition === "C") {
    return Object.freeze([SEARCH_TOOL_NAME, "submit_result"]);
  }
  if (condition === "D") {
    return Object.freeze([
      SEARCH_TOOL_NAME,
      ...(task.expectedFallbacks.length > 0 ? ["read_mcp_resources"] : []),
      "submit_result"
    ]);
  }
  throw new Error(`Unknown paid smoke condition: ${condition}`);
}

function rendererWrapperInstruction(renderer) {
  if (renderer === "canvas") {
    return [
      'Evaluator wrapper contract: use import { render } from "ggaction".',
      "Use exactly export function renderChart(program, context) { render(program, context); } with the supplied context."
    ].join(" ");
  }
  if (renderer === "svg") {
    return [
      'Evaluator wrapper contract: use import { renderToSVG } from "ggaction/svg".',
      "Use exactly export function renderChart(program) { return renderToSVG(program); }."
    ].join(" ");
  }
  if (renderer === "png") {
    return [
      'Evaluator wrapper contract: use import { renderToPNG } from "ggaction/png".',
      "Use exactly export async function renderChart(program, output) { return renderToPNG(program, { output }); }.",
      "The evaluator supplies output; never use a literal or hard-coded output path."
    ].join(" ");
  }
  if (renderer === "pdf") {
    return [
      'Evaluator wrapper contract: use import { renderToPDF } from "ggaction/pdf".',
      "Use exactly export async function renderChart(program, output) { return renderToPDF(program, { output }); }.",
      "The evaluator supplies output; never use a literal or hard-coded output path."
    ].join(" ");
  }
  return "Do not invent a renderer wrapper for a non-program result.";
}

export function taskPromptV6(task, adapter) {
  return [
    "Create the requested ggaction result using only public APIs.",
    adapter.instruction,
    "For a supported chart, submit status=program, the required renderer, empty unsupported and unresolved arrays, and a complete ESM module.",
    "The module must import ggaction, export function buildChart(rows), create a 640x400 Canvas with margin 50, store rows as the source dataset, and return the final ChartProgram.",
    rendererWrapperInstruction(task.expectedRenderer),
    "The renderer wrapper above is an evaluator adapter contract; ordinary product examples may choose their own output path.",
    "For a terminal limitation, submit status=unsupported, source=null, every exact unsupported ID, and every still-open unresolved ID in packet order.",
    "When no terminal limitation exists but a decision remains open, submit status=needs-input, source=null, and every exact unresolved ID in packet order.",
    "Preserve the renderer named by the task even when the result needs input.",
    `Required evaluation renderer: ${task.expectedRenderer ?? "none (submit null)"}.`,
    "Never invent support, use extension primitives, access files or network, or include markdown fences.",
    `Task: ${task.query}`,
    `Dataset (${task.dataset.id}): ${JSON.stringify(task.dataset.values)}`
  ].join("\n");
}

function routeFailuresV6(condition, task, snapshot) {
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

export async function evaluateSubmissionV6({ submission, task, artifactRoot }) {
  return evaluateFullSubmissionV2({ submission, task, artifactRoot });
}

export async function preflightPaidSmokeToolsV6() {
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

export async function runPaidSmokeTaskV6(options) {
  return runBoundedToolStateMachineV1({
    ...options,
    route: paidSmokeRouteV6(options.condition, options.task),
    createAdapter: createKnowledgeAdapterV4,
    submitTool: submitResultToolV5,
    evaluateSubmission: evaluateSubmissionV6,
    promptBuilder: taskPromptV6,
    validateRoute: routeFailuresV6
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

export async function runPaidSmokeDryRunV6({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v6-dry")
} = {}) {
  const oracle = await loadRouteOracleV5();
  await preflightPaidSmokeToolsV6();
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
        const failures = routeFailuresV6(condition, task, adapter.snapshot());
        if (failures.length > 0) throw new Error(failures.join(","));
        checks.push({
          task: task.id,
          condition,
          route,
          knowledge: adapter.snapshot()
        });
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
  return {
    checks: checks.length,
    evaluatorChecks: evaluatorChecks.length,
    passed: true,
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

export async function runPaidSmokeV6({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v6"),
  now = () => new Date(),
  onProgress = async () => {}
} = {}) {
  const plan = await assertPaidSmokeAuthorizedV6(suppliedPlan ?? await loadPaidSmokePlanV6());
  await preflightPaidSmokeToolsV6();
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
      const result = await runPaidSmokeTaskV6({
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
