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
import { assertSupportedStrictToolSchema } from "./compact-paid-smoke.js";
import {
  createKnowledgeAdapterV4,
  createOpenAIResponse,
  preflightPaidSmokeToolsV4,
  projectedRequestInputTokens,
  root
} from "./compact-paid-smoke-v4.js";
import { evaluateFullSubmissionV1 } from "./compact-full-evaluator-v1.js";

export { createOpenAIResponse, root };
export { loadApiKey } from "./compact-paid-smoke-v4.js";

export const fullEvaluationRootV1 = path.join(
  root,
  "evaluation",
  "compact-authoring-full-v1"
);
export const fullOracleFileV1 = path.join(fullEvaluationRootV1, "ROUTE_ORACLE.json");
export const fullPlanFileV1 = path.join(fullEvaluationRootV1, "PLAN.json");
const fullGateFileV1 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_G.md"
);
const corpusRoots = Object.freeze({
  repair: path.join(root, "evaluation", "compact-authoring-repair"),
  policy: path.join(root, "evaluation", "compact-authoring-policy")
});

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

export const submitFullResultToolV1 = functionTool(
  "submit_result",
  "Submit one complete chart program, terminal limitation IDs, and any still-open decision IDs for validation.",
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

function taskPlan(packet) {
  return packet.actionPlan.map(entry => ({
    id: entry.id,
    options: entry.requiredOptions
  }));
}

function packetRole(packet) {
  if (packet.unsupported.length > 0) return "unsupported";
  if (packet.unresolved.length > 0) return "needs-input";
  return "supported";
}

async function sourceTask(spec) {
  const directory = corpusRoots[spec.source.corpus];
  if (!directory) throw new Error(`Unknown full evaluation corpus: ${spec.source.corpus}`);
  const [split, datasets] = await Promise.all([
    readFile(path.join(directory, `${spec.source.split}.json`), "utf8").then(JSON.parse),
    readFile(path.join(directory, "datasets.json"), "utf8").then(JSON.parse)
  ]);
  const task = split.tasks.find(entry => entry.id === spec.id);
  if (!task) throw new Error(`Unknown full evaluation task: ${spec.id}`);
  const dataset = datasets.datasets.find(entry => entry.id === task.dataset);
  if (!dataset) throw new Error(`${spec.id} uses unknown dataset ${task.dataset}.`);
  if (task.stratum !== spec.stratum) throw new Error(`${spec.id} stratum drifted.`);

  const packet = searchGgaction(task.query);
  const checks = [
    [packet.schemaVersion, 3, "packet schema"],
    [taskPlan(packet), spec.expectedPlan, "plan"],
    [packet.unsupported.map(entry => entry.constraint), spec.expectedUnsupported, "unsupported"],
    [packet.unresolved.map(entry => entry.constraint), spec.expectedUnresolved, "unresolved"],
    [docsFallbackResources(packet).map(resource => resource.uri), spec.expectedFallbacks, "fallback resources"],
    [packetRole(packet), spec.role, "role"]
  ];
  for (const [actual, expected, label] of checks) {
    if (!same(actual, expected)) {
      throw new Error(`${spec.id} full evaluation ${label} drifted: ${JSON.stringify(actual)}`);
    }
  }
  return Object.freeze({ ...spec, query: task.query, dataset });
}

export async function loadFullOracleV1() {
  const bytes = await readFile(fullOracleFileV1);
  const oracle = JSON.parse(bytes);
  if (
    oracle.schemaVersion !== 1 ||
    oracle.id !== "compact-authoring-full-route-oracle-v1" ||
    oracle.packetSchemaVersion !== 3 ||
    oracle.tasks.length !== 38 ||
    oracle.conditions.length !== 4 ||
    new Set(oracle.tasks.map(task => task.id)).size !== 38
  ) {
    throw new Error("Full evaluation v1 route oracle identity is invalid.");
  }
  const tasks = await Promise.all(oracle.tasks.map(sourceTask));
  return Object.freeze({
    ...oracle,
    tasks: Object.freeze(tasks),
    oracleSha256: sha256(bytes)
  });
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
  return { expected, maximum };
}

function parseRun(run) {
  const match = run.match(/^(.+):([ABCD]):r([12])$/u);
  if (!match) throw new Error(`Invalid full evaluation run identity: ${run}`);
  return { taskId: match[1], condition: match[2], repetition: Number(match[3]) };
}

function assertPlanShapeV1(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-full-v1" ||
    plan.requiredGate !== "R54-P5-G" ||
    plan.limits.repetitions !== 2
  ) {
    throw new Error("Full evaluation v1 plan identity is invalid.");
  }
  if (plan.runOrder.length !== 304 || new Set(plan.runOrder).size !== 304) {
    throw new Error("Full evaluation run order must contain 304 unique task-condition-repetition entries.");
  }
  for (const run of plan.runOrder) parseRun(run);
  if (
    !plan.sourceFiles || typeof plan.sourceFiles !== "object" || Array.isArray(plan.sourceFiles) ||
    !plan.sourceTrees || typeof plan.sourceTrees !== "object" || Array.isArray(plan.sourceTrees) ||
    Object.keys(plan.sourceTrees).length === 0
  ) {
    throw new Error("Full evaluation source files and trees must be frozen.");
  }
  if (
    plan.limits.maximumModelCallsPerTask !== 3 ||
    plan.limits.projectedInputBytesPerToken !== 1 ||
    plan.limits.maximumRequestBodyBytesPerCall !== 262144 ||
    plan.limits.maximumRequestBodyBytesPerTask !== 524288
  ) {
    throw new Error("Full evaluation limits are invalid.");
  }
  const cost = planCost(plan);
  if (
    Math.abs(cost.expected - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(cost.maximum - plan.costProjection.calculatedMaximumUsd) > 1e-12 ||
    cost.maximum >= plan.limits.hardCostUsd
  ) {
    throw new Error("Full evaluation cost projection does not match its envelopes.");
  }
}

export async function loadFullPlanV1() {
  const [planBytes, oracle] = await Promise.all([
    readFile(fullPlanFileV1),
    loadFullOracleV1()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV1(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Full evaluation route oracle hash drifted.");
  }
  const taskIds = new Set(oracle.tasks.map(task => task.id));
  for (const run of plan.runOrder) {
    if (!taskIds.has(parseRun(run).taskId)) throw new Error(`Full evaluation run uses unknown task: ${run}`);
  }
  for (const [relative, expected] of Object.entries(plan.sourceFiles)) {
    const actual = sha256(await readFile(path.join(root, relative)));
    if (actual !== expected) throw new Error(`Full evaluation source hash drifted: ${relative}`);
  }
  for (const [relative, expected] of Object.entries(plan.sourceTrees)) {
    let actual;
    try {
      actual = execFileSync("git", ["rev-parse", `HEAD:${relative}`], {
        cwd: root,
        encoding: "utf8"
      }).trim();
    } catch {
      throw new Error(`Full evaluation source tree is unavailable: ${relative}`);
    }
    if (actual !== expected) throw new Error(`Full evaluation source tree drifted: ${relative}`);
    const dirty = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all", "--", relative],
      { cwd: root, encoding: "utf8" }
    ).trim();
    if (dirty.length > 0) throw new Error(`Full evaluation source tree is dirty: ${relative}`);
  }
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", plan.productCandidateCommit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error("Full evaluation product candidate is not an ancestor of the current HEAD.");
  }
  return Object.freeze({
    ...plan,
    conditions: oracle.conditions,
    tasks: oracle.tasks,
    planSha256: sha256(planBytes)
  });
}

export async function assertFullEvaluationAuthorizedV1(plan) {
  const approved = plan ?? await loadFullPlanV1();
  const gate = await readFile(fullGateFileV1, "utf8");
  const state = gate.match(/^## Gate state\n\n`([^`]+)`$/mu)?.[1];
  if (state !== "approved") {
    throw new Error(`${approved.requiredGate} is not approved; credential read and paid calls are blocked.`);
  }
  if (!gate.includes(approved.productCandidateCommit) || !gate.includes(approved.planSha256)) {
    throw new Error(`${approved.requiredGate} does not authorize this candidate and plan hash.`);
  }
  return approved;
}

export async function preflightFullToolsV1() {
  await preflightPaidSmokeToolsV4();
  assertSupportedStrictToolSchema(submitFullResultToolV1);
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

function completeUsage(usage) {
  return Number.isInteger(usage?.input_tokens) && usage.input_tokens >= 0 &&
    Number.isInteger(usage?.input_tokens_details?.cached_tokens) &&
    usage.input_tokens_details.cached_tokens >= 0 &&
    Number.isInteger(usage?.input_tokens_details?.cache_write_tokens) &&
    usage.input_tokens_details.cache_write_tokens >= 0 &&
    Number.isInteger(usage?.output_tokens) && usage.output_tokens >= 0 &&
    Number.isInteger(usage?.total_tokens) && usage.total_tokens >= 0;
}

function normalizedUsage(usage) {
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.input_tokens_details.cached_tokens,
    cacheWriteTokens: usage.input_tokens_details.cache_write_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
    totalTokens: usage.total_tokens
  };
}

function addUsage(target, usage) {
  for (const key of Object.keys(target)) target[key] += usage[key] ?? 0;
}

function usageCost(usage, pricing) {
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const writes = Math.min(usage.cacheWriteTokens, usage.inputTokens - cached);
  const uncached = usage.inputTokens - cached - writes;
  return (
    uncached * pricing.uncachedInput +
    cached * pricing.cachedInput +
    writes * pricing.cacheWrite +
    usage.outputTokens * pricing.output
  ) / 1_000_000;
}

function rendererWrapperInstruction(renderer) {
  if (renderer === "canvas") {
    return "Also export function renderChart(program, context) that renders the program into the supplied Canvas context.";
  }
  if (renderer === "svg") {
    return "Also export function renderChart(program) that returns the SVG string.";
  }
  if (renderer === "png" || renderer === "pdf") {
    return `Also export async function renderChart(program, output) that writes the ${renderer.toUpperCase()} to the supplied output path and returns the renderer result.`;
  }
  return "Do not invent a program or renderer wrapper while a terminal limitation or open decision blocks authoring.";
}

function taskPrompt(task, adapter) {
  return [
    "Create the requested ggaction result using only public APIs.",
    adapter.instruction,
    "For a supported chart, submit status=program, the required renderer, empty unsupported and unresolved arrays, and a complete ESM module.",
    "The module must import ggaction, export function buildChart(rows), create an 800x600 Canvas with margins { top: 100, right: 200, bottom: 100, left: 120 }, store rows as the source dataset, and return the final ChartProgram.",
    rendererWrapperInstruction(task.expectedRenderer),
    "For one or more terminal limitations, submit status=unsupported, source=null, every exact unsupported ID, and every still-open unresolved ID in packet order.",
    "For only open decisions and no terminal limitation, submit status=needs-input, source=null, no unsupported IDs, and every exact unresolved ID in packet order.",
    "Preserve a supported renderer explicitly requested by the task; otherwise submit renderer=null for a non-program result.",
    `Required evaluation renderer: ${task.expectedRenderer ?? "none (submit null)"}.`,
    "Never invent support, use extension primitives, access files or network, or include markdown fences.",
    `Task: ${task.query}`,
    `Dataset (${task.dataset.id}): ${JSON.stringify(task.dataset.values)}`
  ].join("\n");
}

function baseRequest(plan, adapter, input, maximumOutputTokens) {
  return {
    model: plan.api.model,
    reasoning: { effort: plan.api.reasoningEffort },
    text: { verbosity: plan.api.textVerbosity },
    service_tier: plan.api.serviceTier,
    store: plan.api.store,
    parallel_tool_calls: plan.api.parallelToolCalls,
    include: plan.api.include,
    max_output_tokens: maximumOutputTokens,
    tool_choice: "auto",
    tools: [...adapter.tools, submitFullResultToolV1],
    instructions: "Complete one bounded ggaction authoring task. Use the assigned knowledge route before submitting. A passing submit_result ends the task.",
    input
  };
}

function responseFunctionCalls(response) {
  return (response.output ?? []).filter(entry => entry.type === "function_call");
}

function sanitizedArguments(call) {
  const args = JSON.parse(call.arguments);
  if (call.name !== "submit_result") return args;
  return {
    status: args.status,
    renderer: args.renderer,
    unsupported: args.unsupported,
    unresolved: args.unresolved,
    sourceBytes: typeof args.source === "string" ? Buffer.byteLength(args.source, "utf8") : 0,
    sourceSha256: typeof args.source === "string" ? sha256(args.source) : null
  };
}

function recordBudgetBeforeRequest({ plan, ledger, state, request, priorReasoningTokens }) {
  const bytes = Buffer.byteLength(JSON.stringify(request), "utf8");
  if (bytes > plan.limits.maximumRequestBodyBytesPerCall) {
    throw new Error("request-transport-envelope: request body exceeds the per-call limit");
  }
  if (state.requestBodyBytes + bytes > plan.limits.maximumRequestBodyBytesPerTask) {
    throw new Error("request-transport-envelope: cumulative request bodies exceed the task limit");
  }
  const projectedInput = projectedRequestInputTokens(request, {
    bytesPerToken: plan.limits.projectedInputBytesPerToken,
    priorReasoningTokens
  });
  if (state.projectedInputTokens + projectedInput > plan.limits.maximumInputTokensPerTask) {
    throw new Error("task-token-envelope: projected billable input would be exceeded");
  }
  const worstRequestCost = (
    projectedInput * plan.pricingPerMillionTokens.cacheWrite +
    request.max_output_tokens * plan.pricingPerMillionTokens.output
  ) / 1_000_000;
  if (ledger.costUsd + worstRequestCost > plan.limits.hardCostUsd) {
    throw new Error("global-cost-cap: next request could exceed the approved hard cap");
  }
  state.requestBodyBytes += bytes;
  state.projectedInputTokens += projectedInput;
  return { bytes, projectedInputTokens: projectedInput };
}

function routeFailures(condition, task, snapshot) {
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
    if (snapshot.docsReads !== expectedReads) failures.push(`knowledge-docs-read-count:${snapshot.docsReads}`);
    if ((snapshot.docsReadCalls ?? 0) !== expectedReadCalls) {
      failures.push(`knowledge-docs-call-count:${snapshot.docsReadCalls ?? 0}`);
    }
    if (snapshot.toolCalls !== 1 + expectedReadCalls) {
      failures.push(`knowledge-tool-call-count:${snapshot.toolCalls}`);
    }
  }
  return failures;
}

function activeSnapshot({ task, condition, repetition, usage, state, adapter, trace }) {
  return JSON.parse(JSON.stringify({
    id: `${task.id}:${condition}:r${repetition}`,
    task: task.id,
    condition,
    repetition,
    stratum: task.stratum,
    modelCalls: trace.length,
    usage,
    costUsd: trace.reduce((sum, entry) => sum + (entry.costUsd ?? 0), 0),
    requestBodyBytes: state.requestBodyBytes,
    projectedInputTokens: state.projectedInputTokens,
    knowledge: adapter.snapshot(),
    trace
  }));
}

export async function runFullTaskV1({
  plan,
  task,
  condition,
  repetition,
  apiKey,
  ledger,
  artifactRoot,
  createResponse = createOpenAIResponse,
  onProgress = async () => {}
}) {
  const adapter = await createKnowledgeAdapterV4(condition);
  const started = performance.now();
  const usage = emptyUsage();
  const state = { requestBodyBytes: 0, projectedInputTokens: 0 };
  const trace = [];
  let input = [{ role: "user", content: [{ type: "input_text", text: taskPrompt(task, adapter) }] }];
  let lastEvaluation;
  try {
    for (let callIndex = 0; callIndex < plan.limits.maximumModelCallsPerTask; callIndex += 1) {
      const remainingOutput = plan.limits.maximumOutputTokensPerTask - usage.outputTokens;
      if (remainingOutput <= 0) break;
      const request = baseRequest(
        plan,
        adapter,
        input,
        Math.min(plan.limits.maximumOutputTokensPerResponse, remainingOutput)
      );
      const budget = recordBudgetBeforeRequest({
        plan,
        ledger,
        state,
        request,
        priorReasoningTokens: usage.reasoningTokens
      });
      const response = await createResponse({
        apiKey,
        request,
        timeoutMilliseconds: plan.limits.timeoutMilliseconds
      });
      const calls = responseFunctionCalls(response);
      if (!completeUsage(response.usage)) {
        trace.push({
          modelCall: callIndex + 1,
          requestBytes: budget.bytes,
          projectedInputTokens: budget.projectedInputTokens,
          functionCallCount: calls.length,
          tool: null,
          arguments: null,
          usage: null,
          costUsd: null,
          billingUsageComplete: false
        });
        await onProgress(activeSnapshot({ task, condition, repetition, usage, state, adapter, trace }));
        throw new Error("incomplete-billing-usage: response omitted required billing fields");
      }
      const responseUsage = normalizedUsage(response.usage);
      addUsage(usage, responseUsage);
      addUsage(ledger.usage, responseUsage);
      const costUsd = usageCost(responseUsage, plan.pricingPerMillionTokens);
      ledger.costUsd += costUsd;
      ledger.modelCalls += 1;
      trace.push({
        modelCall: callIndex + 1,
        requestBytes: budget.bytes,
        projectedInputTokens: budget.projectedInputTokens,
        functionCallCount: calls.length,
        tool: null,
        arguments: null,
        usage: responseUsage,
        costUsd,
        billingUsageComplete: true
      });
      await onProgress(activeSnapshot({ task, condition, repetition, usage, state, adapter, trace }));
      if (response.model !== plan.api.model || response.service_tier !== plan.api.serviceTier) {
        throw new Error("provider-response-identity-mismatch");
      }
      if (
        usage.inputTokens > plan.limits.maximumInputTokensPerTask ||
        usage.outputTokens > plan.limits.maximumOutputTokensPerTask
      ) {
        throw new Error("task-token-envelope: provider usage exceeded the approved task envelope");
      }
      if (ledger.costUsd > plan.limits.hardCostUsd) {
        throw new Error("global-cost-cap: provider usage exceeded the approved hard cap");
      }
      if (calls.length !== 1) {
        throw new Error(`provider-failure: expected one function call, received ${calls.length}`);
      }
      const call = calls[0];
      trace.at(-1).tool = call.name;
      trace.at(-1).arguments = sanitizedArguments(call);
      input = [...input, ...(response.output ?? [])];
      if (call.name === "submit_result") {
        const submission = JSON.parse(call.arguments);
        const failures = routeFailures(condition, task, adapter.snapshot());
        lastEvaluation = failures.length > 0
          ? { passed: false, failures }
          : await evaluateFullSubmissionV1({ submission, task, artifactRoot });
        trace.at(-1).evaluation = lastEvaluation;
        await onProgress(activeSnapshot({ task, condition, repetition, usage, state, adapter, trace }));
        if (lastEvaluation.passed) {
          return {
            id: `${task.id}:${condition}:r${repetition}`,
            task: task.id,
            condition,
            repetition,
            stratum: task.stratum,
            role: task.role,
            passed: true,
            modelCalls: callIndex + 1,
            timeToValidMilliseconds: performance.now() - started,
            usage,
            costUsd: trace.reduce((sum, entry) => sum + entry.costUsd, 0),
            requestBodyBytes: state.requestBodyBytes,
            projectedInputTokens: state.projectedInputTokens,
            knowledge: adapter.snapshot(),
            trace
          };
        }
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(lastEvaluation)
        });
      } else {
        const output = await adapter.handle(call);
        trace.at(-1).toolResultBytes = Buffer.byteLength(output, "utf8");
        input.push({ type: "function_call_output", call_id: call.call_id, output });
        await onProgress(activeSnapshot({ task, condition, repetition, usage, state, adapter, trace }));
      }
    }
    return {
      id: `${task.id}:${condition}:r${repetition}`,
      task: task.id,
      condition,
      repetition,
      stratum: task.stratum,
      role: task.role,
      passed: false,
      modelCalls: trace.length,
      timeToValidMilliseconds: null,
      usage,
      costUsd: trace.reduce((sum, entry) => sum + entry.costUsd, 0),
      requestBodyBytes: state.requestBodyBytes,
      projectedInputTokens: state.projectedInputTokens,
      knowledge: adapter.snapshot(),
      failures: lastEvaluation?.failures ?? ["No passing submission within the call limit."],
      trace
    };
  } finally {
    await adapter.close();
  }
}

function canonicalSource(task) {
  const packet = searchGgaction(task.query);
  const actionSteps = packet.actionPlan.flatMap((entry, index) => {
    if (!entry.id.startsWith("action.")) return [];
    if (["action.createCanvas", "action.createData"].includes(entry.id)) return [];
    return [`  ${packet.authoring.steps[index]};`];
  });
  const rendererImport = {
    canvas: 'import { chart, render } from "ggaction";',
    svg: 'import { chart } from "ggaction";\nimport { renderToSVG } from "ggaction/svg";',
    png: 'import { chart } from "ggaction";\nimport { renderToPNG } from "ggaction/png";',
    pdf: 'import { chart } from "ggaction";\nimport { renderToPDF } from "ggaction/pdf";'
  }[task.expectedRenderer];
  const wrapper = {
    canvas: "export function renderChart(program, context) { render(program, context); }",
    svg: "export function renderChart(program) { return renderToSVG(program); }",
    png: "export async function renderChart(program, output) { return renderToPNG(program, { output }); }",
    pdf: "export async function renderChart(program, output) { return renderToPDF(program, { output }); }"
  }[task.expectedRenderer];
  return [
    rendererImport,
    "export function buildChart(rows) {",
    "  const values = rows;",
    "  let program = chart();",
    "  program = program.createCanvas({ width: 800, height: 600, margin: { top: 100, right: 200, bottom: 100, left: 120 } });",
    "  program = program.createData({ values });",
    ...actionSteps,
    "  return program;",
    "}",
    wrapper,
    ""
  ].join("\n");
}

function canonicalSubmission(task) {
  if (task.role === "supported") {
    return {
      status: "program",
      source: canonicalSource(task),
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

export async function runFullDryRunV1({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-authoring-full-v1-dry")
} = {}) {
  const oracle = await loadFullOracleV1();
  await preflightFullToolsV1();
  const checks = [];
  const evaluatorFailures = [];
  for (const task of oracle.tasks) {
    for (const condition of oracle.conditions.map(entry => entry.id)) {
      const adapter = await createKnowledgeAdapterV4(condition);
      try {
        if (condition === "A") {
          const search = JSON.parse(await adapter.handle({
            name: "search_docs",
            arguments: JSON.stringify({ query: task.query })
          }));
          if (!search[0]?.url) throw new Error(`${task.id}: public docs search returned no route`);
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
        checks.push({ task: task.id, condition, passed: true, knowledge: adapter.snapshot() });
      } finally {
        await adapter.close();
      }
    }
    const evaluation = await evaluateFullSubmissionV1({
      submission: canonicalSubmission(task),
      task,
      artifactRoot: path.join(artifactRoot, task.id)
    });
    if (!evaluation.passed) {
      evaluatorFailures.push({ task: task.id, failures: evaluation.failures });
    }
  }
  return {
    schemaVersion: 1,
    routeOracleSha256: oracle.oracleSha256,
    tasks: oracle.tasks.length,
    routeChecks: checks.length,
    evaluatorChecks: oracle.tasks.length,
    passed: checks.every(check => check.passed) && evaluatorFailures.length === 0,
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0,
    details: checks,
    evaluatorFailures
  };
}

function summarize(results, key) {
  const groups = {};
  for (const value of [...new Set(results.map(result => result[key]))]) {
    const entries = results.filter(result => result[key] === value);
    const usage = emptyUsage();
    for (const entry of entries) addUsage(usage, entry.usage);
    groups[value] = {
      taskRuns: entries.length,
      passed: entries.filter(entry => entry.passed).length,
      modelCalls: entries.reduce((sum, entry) => sum + entry.modelCalls, 0),
      usage,
      costUsd: entries.reduce((sum, entry) => sum + entry.costUsd, 0),
      timeToValidMilliseconds: entries
        .filter(entry => entry.passed)
        .reduce((sum, entry) => sum + entry.timeToValidMilliseconds, 0)
    };
  }
  return groups;
}

export async function runFullEvaluationV1({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-authoring-full-v1"),
  now = () => new Date(),
  onProgress = async () => {}
} = {}) {
  const plan = await assertFullEvaluationAuthorizedV1(suppliedPlan ?? await loadFullPlanV1());
  await preflightFullToolsV1();
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const ledger = { usage: emptyUsage(), costUsd: 0, modelCalls: 0 };
  const results = [];
  let activeTask = null;
  const startedAt = now().toISOString();
  for (const run of plan.runOrder) {
    const { taskId, condition, repetition } = parseRun(run);
    let result;
    try {
      result = await runFullTaskV1({
        plan,
        task: taskById.get(taskId),
        condition,
        repetition,
        apiKey,
        ledger,
        artifactRoot: path.join(artifactRoot, `${taskId}-${condition}-r${repetition}`),
        createResponse,
        onProgress: async progress => {
          activeTask = progress;
          await onProgress({ plan, ledger, results: [...results], activeTask });
        }
      });
    } catch (error) {
      const failure = {
        schemaVersion: 1,
        id: plan.id,
        planSha256: plan.planSha256,
        routeOracleSha256: plan.routeOracleSha256,
        productCandidateCommit: plan.productCandidateCommit,
        startedAt,
        abortedAt: now().toISOString(),
        abortedRun: run,
        error: error instanceof Error ? error.message : String(error),
        ledger,
        activeTask,
        results
      };
      await onProgress({ plan, ledger, results: [...results], failure });
      throw Object.assign(new Error(failure.error), { fullEvaluationFailure: failure });
    }
    results.push(result);
    activeTask = null;
    await onProgress({ plan, ledger, results: [...results], activeTask: null });
  }
  return {
    schemaVersion: 1,
    id: plan.id,
    planSha256: plan.planSha256,
    routeOracleSha256: plan.routeOracleSha256,
    productCandidateCommit: plan.productCandidateCommit,
    startedAt,
    completedAt: now().toISOString(),
    taskRuns: results.length,
    passedTaskRuns: results.filter(result => result.passed).length,
    ledger,
    conditions: summarize(results, "condition"),
    strata: summarize(results, "stratum"),
    roles: summarize(results, "role"),
    results
  };
}
