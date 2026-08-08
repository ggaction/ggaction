import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { searchGgaction } from "../knowledge/task-resolver.js";
import {
  docsFallbackResources,
  SEARCH_TOOL,
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../src/mcp/adapter.js";
import {
  assertSupportedStrictToolSchema,
  createKnowledgeAdapter as createV3KnowledgeAdapter,
  createOpenAIResponse,
  evaluateSubmission as evaluateV3Submission,
  loadApiKey,
  projectedRequestInputTokens,
  root
} from "./compact-paid-smoke.js";

export { createOpenAIResponse, loadApiKey, projectedRequestInputTokens, root };

export const paidSmokeRootV4 = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-smoke-v4"
);
export const routeOracleFileV4 = path.join(paidSmokeRootV4, "ROUTE_ORACLE.json");
export const paidSmokePlanFileV4 = path.join(paidSmokeRootV4, "PLAN.json");
const paidSmokeGateFileV4 = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_F.md"
);
const docsRoot = path.join(root, "docs");
const corpusRoots = Object.freeze({
  repair: path.join(root, "evaluation", "compact-authoring-repair"),
  policy: path.join(root, "evaluation", "compact-authoring-policy")
});
const ignoredSearchTerms = new Set([
  "a", "an", "and", "as", "for", "in", "make", "of", "the", "then",
  "to", "use", "with"
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function taskPlan(packet) {
  return packet.actionPlan.map(entry => ({
    id: entry.id,
    options: entry.requiredOptions
  }));
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

const docsToolsV4 = Object.freeze([
  functionTool(
    "search_docs",
    "Search current public ggaction documentation and return bounded canonical routes and summaries.",
    { query: { type: "string", minLength: 1, maxLength: 500 } },
    ["query"]
  ),
  functionTool(
    "read_doc",
    "Read one current public ggaction documentation URL returned by search_docs.",
    { url: { type: "string", minLength: 1, maxLength: 500 } },
    ["url"]
  )
]);

export const submitResultToolV4 = functionTool(
  "submit_result",
  "Submit one complete chart program, terminal unsupported IDs, and any still-open decision IDs for validation.",
  {
    status: { enum: ["program", "unsupported"] },
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

function normalizeSearchText(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function meaningfulTerms(value) {
  return [...new Set(normalizeSearchText(value).split(" ").filter(term =>
    term.length > 1 && !ignoredSearchTerms.has(term)
  ))];
}

export function searchPublicDocsV4(index, query) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTerms = meaningfulTerms(query);
  const ranked = index.map((entry, order) => {
    const title = normalizeSearchText(`${entry.pageTitle ?? ""} ${entry.sectionTitle ?? ""}`);
    const summary = normalizeSearchText(entry.summary ?? "");
    const keywords = (entry.keywords ?? []).map(normalizeSearchText);
    const searchable = `${title} ${keywords.join(" ")} ${summary}`;
    const phraseScore = keywords.reduce((score, keyword) => {
      if (keyword.length === 0 || !normalizedQuery.includes(keyword)) return score;
      return score + 8 + meaningfulTerms(keyword).length * 2;
    }, 0);
    const termScore = queryTerms.reduce((score, term) =>
      score + (title.includes(term) ? 4 : 0) +
        (keywords.some(keyword => keyword.includes(term)) ? 2 : 0) +
        (summary.includes(term) ? 1 : 0), 0);
    return { entry, order, score: phraseScore + termScore, searchable };
  }).filter(entry => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.order - right.order);

  const seenPages = new Set();
  return ranked.filter(({ entry }) => {
    const page = entry.url.split("#")[0];
    if (seenPages.has(page)) return false;
    seenPages.add(page);
    return true;
  }).slice(0, 6).map(({ entry }) => ({
    title: entry.sectionTitle === undefined
      ? entry.pageTitle
      : `${entry.pageTitle} — ${entry.sectionTitle}`,
    url: entry.url,
    kind: entry.kind,
    summary: String(entry.summary ?? "").slice(0, 320)
  }));
}

function normalizeDocRoute(url) {
  if (typeof url !== "string" || !url.startsWith("/")) {
    throw new TypeError("Public documentation URL must start with /.");
  }
  const parsed = new URL(url, "https://ggaction.github.io");
  if (parsed.origin !== "https://ggaction.github.io") {
    throw new Error("Public documentation reads must stay on the ggaction route set.");
  }
  return {
    route: parsed.pathname.replace(/^\/+|\/+$/gu, ""),
    fragment: decodeURIComponent(parsed.hash.slice(1))
  };
}

function markdownSlug(value) {
  return value
    .toLowerCase()
    .replace(/`/gu, "")
    .replace(/\{#[^}]+\}\s*$/u, "")
    .replace(/[^a-z0-9\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-");
}

function sectionText(source, fragment) {
  if (fragment === "") return source.slice(0, 8000);
  const lines = source.split("\n");
  const start = lines.findIndex(line => {
    const match = line.match(/^(#{1,6})\s+(.+)$/u);
    if (!match) return false;
    const explicit = match[2].match(/\{#([^}]+)\}\s*$/u)?.[1];
    return explicit === fragment || markdownSlug(match[2]) === fragment;
  });
  if (start === -1) return source.slice(0, 8000);
  const level = lines[start].match(/^#+/u)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{1,6})\s+/u);
    if (heading && heading[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").slice(0, 8000);
}

async function readPublicDocV4(url) {
  const { route, fragment } = normalizeDocRoute(url);
  const candidates = route === ""
    ? [path.join(docsRoot, "index.md")]
    : [path.join(docsRoot, `${route}.md`), path.join(docsRoot, route, "index.md")];
  for (const file of candidates) {
    const relative = path.relative(docsRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Public documentation read escaped docs/.");
    }
    try {
      return {
        url,
        file: path.join("docs", relative),
        text: sectionText(await readFile(file, "utf8"), fragment)
      };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Unknown public documentation URL: ${url}`);
}

async function createDocsAdapterV4() {
  const index = await json(path.join(docsRoot, "search-index.json"));
  let allowedUrls = new Set();
  let searches = 0;
  let reads = 0;
  return Object.freeze({
    tools: docsToolsV4,
    instruction: "Use public documentation only. Search once, read at most one returned canonical URL, then submit.",
    async handle(call) {
      const args = JSON.parse(call.arguments);
      if (call.name === "search_docs") {
        searches += 1;
        const results = searchPublicDocsV4(index, args.query);
        allowedUrls = new Set(results.map(entry => entry.url));
        return JSON.stringify(results);
      }
      if (call.name === "read_doc") {
        if (!allowedUrls.has(args.url)) {
          throw new Error("read_doc accepts only a URL returned by the latest search_docs call.");
        }
        reads += 1;
        return JSON.stringify(await readPublicDocV4(args.url));
      }
      throw new Error(`Unknown public-docs tool: ${call.name}`);
    },
    snapshot: () => ({ toolCalls: searches + reads, searches, docsReads: reads }),
    async close() {}
  });
}

export async function createKnowledgeAdapterV4(condition) {
  if (condition === "A") return createDocsAdapterV4();
  const adapter = await createV3KnowledgeAdapter(condition);
  if (condition === "D") {
    return Object.freeze({
      ...adapter,
      instruction: "Call search_ggaction once with only the exact Task text. Treat unsupported entries as terminal. Read every URI in unresolved[].resources together only when that list is non-empty, then submit."
    });
  }
  return Object.freeze({
    ...adapter,
    instruction: condition === "B"
      ? "Call search_ggaction exactly once through the direct adapter with only the exact Task text, then submit."
      : "Call search_ggaction exactly once through local MCP with only the exact Task text, do not read docs, then submit."
  });
}

async function sourceTask(spec) {
  const directory = corpusRoots[spec.source.corpus];
  if (!directory) throw new Error(`Unknown paid smoke corpus: ${spec.source.corpus}`);
  const [split, datasets] = await Promise.all([
    json(path.join(directory, `${spec.source.split}.json`)),
    json(path.join(directory, "datasets.json"))
  ]);
  const task = split.tasks.find(entry => entry.id === spec.id);
  if (!task) throw new Error(`Unknown paid smoke task: ${spec.id}`);
  const dataset = datasets.datasets.find(entry => entry.id === task.dataset);
  if (!dataset) throw new Error(`${spec.id} uses unknown dataset ${task.dataset}.`);
  if (task.stratum !== spec.stratum) throw new Error(`${spec.id} stratum drifted.`);

  const packet = searchGgaction(task.query);
  const actualFallbacks = docsFallbackResources(packet).map(resource => resource.uri);
  const checks = [
    [packet.schemaVersion, 3, "packet schema"],
    [taskPlan(packet), spec.expectedPlan, "plan"],
    [packet.unsupported.map(entry => entry.constraint), spec.expectedUnsupported, "unsupported"],
    [packet.unresolved.map(entry => entry.constraint), spec.expectedUnresolved, "unresolved"],
    [actualFallbacks, spec.expectedFallbacks, "fallback resources"]
  ];
  for (const [actual, expected, label] of checks) {
    if (!same(actual, expected)) {
      throw new Error(`${spec.id} v4 ${label} drifted: ${JSON.stringify(actual)}`);
    }
  }
  return Object.freeze({ ...spec, query: task.query, dataset });
}

export async function loadRouteOracleV4() {
  const bytes = await readFile(routeOracleFileV4);
  const oracle = JSON.parse(bytes);
  if (
    oracle.schemaVersion !== 1 ||
    oracle.id !== "compact-authoring-paid-smoke-route-oracle-v4" ||
    oracle.inheritsTaskSet !== "compact-authoring-paid-smoke-v3" ||
    oracle.packetSchemaVersion !== 3 ||
    oracle.tasks.length !== 4 ||
    oracle.conditions.length !== 4
  ) {
    throw new Error("Paid smoke v4 route oracle identity is invalid.");
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

function assertPlanShapeV4(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-smoke-v4" ||
    plan.requiredGate !== "R54-P5-F"
  ) {
    throw new Error("Paid smoke v4 plan identity is invalid.");
  }
  if (plan.runOrder.length !== 16 || new Set(plan.runOrder).size !== 16) {
    throw new Error("Paid smoke v4 run order must contain 16 unique task-condition pairs.");
  }
  if (
    plan.limits.maximumModelCallsPerTask !== 3 ||
    plan.limits.projectedInputBytesPerToken !== 1 ||
    plan.limits.maximumRequestBodyBytesPerCall !== 262144 ||
    plan.limits.maximumRequestBodyBytesPerTask !== 524288
  ) {
    throw new Error("Paid smoke v4 limits are invalid.");
  }
  const cost = planCost(plan);
  if (
    Math.abs(cost.expected - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(cost.maximum - plan.costProjection.calculatedMaximumUsd) > 1e-12 ||
    cost.maximum >= plan.limits.hardCostUsd
  ) {
    throw new Error("Paid smoke v4 cost projection does not match its envelopes.");
  }
}

export async function loadPaidSmokePlanV4() {
  const [planBytes, oracle] = await Promise.all([
    readFile(paidSmokePlanFileV4),
    loadRouteOracleV4()
  ]);
  const plan = JSON.parse(planBytes);
  assertPlanShapeV4(plan);
  if (plan.routeOracleSha256 !== oracle.oracleSha256) {
    throw new Error("Paid smoke v4 route oracle hash drifted.");
  }
  for (const [relative, expected] of Object.entries(plan.sourceFiles)) {
    const actual = sha256(await readFile(path.join(root, relative)));
    if (actual !== expected) throw new Error(`Paid smoke v4 source hash drifted: ${relative}`);
  }
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", plan.productCandidateCommit, "HEAD"], {
      cwd: root,
      stdio: "ignore"
    });
  } catch {
    throw new Error("Paid smoke v4 product candidate is not an ancestor of the current HEAD.");
  }
  return Object.freeze({
    ...plan,
    conditions: oracle.conditions,
    tasks: oracle.tasks,
    planSha256: sha256(planBytes)
  });
}

export async function assertPaidSmokeAuthorizedV4(plan) {
  const approved = plan ?? await loadPaidSmokePlanV4();
  const gate = await readFile(paidSmokeGateFileV4, "utf8");
  const state = gate.match(/^## Gate state\n\n`([^`]+)`$/mu)?.[1];
  if (state !== "approved") {
    throw new Error(`${approved.requiredGate} is not approved; credential read and paid calls are blocked.`);
  }
  if (!gate.includes(approved.productCandidateCommit) || !gate.includes(approved.planSha256)) {
    throw new Error(`${approved.requiredGate} does not authorize this candidate and plan hash.`);
  }
  return approved;
}

export async function preflightPaidSmokeToolsV4() {
  for (const condition of ["A", "B", "C", "D"]) {
    const adapter = await createKnowledgeAdapterV4(condition);
    try {
      for (const tool of [...adapter.tools, submitResultToolV4]) {
        assertSupportedStrictToolSchema(tool);
      }
    } finally {
      await adapter.close();
    }
  }
}

export async function evaluateSubmissionV4({ submission, task, artifactRoot }) {
  const failures = [];
  if (!same(submission.unsupported, task.expectedUnsupported)) {
    failures.push(`unsupported-mismatch:${JSON.stringify(submission.unsupported)}`);
  }
  if (!same(submission.unresolved, task.expectedUnresolved)) {
    failures.push(`unresolved-mismatch:${JSON.stringify(submission.unresolved)}`);
  }
  if (task.role === "supported" && submission.unsupported.length !== 0) {
    failures.push("supported-task-reported-unsupported");
  }
  if (failures.length > 0) return { passed: false, failures };
  return evaluateV3Submission({
    artifactRoot,
    task: {
      ...task,
      expectedUnresolved: [...task.expectedUnsupported, ...task.expectedUnresolved]
    },
    submission: {
      status: submission.status,
      source: submission.source,
      renderer: submission.renderer,
      unresolved: [...submission.unsupported, ...submission.unresolved]
    }
  });
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

function taskPromptV4(task, adapter) {
  return [
    "Create the requested ggaction result using only public APIs.",
    adapter.instruction,
    "For a supported chart, submit status=program, the required renderer, empty unsupported and unresolved arrays, and a complete ESM module.",
    "The module must import ggaction, export function buildChart(rows), create a 640x400 Canvas with margin 50, store rows as the source dataset, and return the final ChartProgram.",
    "For SVG, also import renderToSVG from ggaction/svg and export function renderChart(program) that returns renderToSVG(program).",
    "For a terminal limitation, submit status=unsupported, source=null, every exact unsupported ID, and every still-open unresolved ID in packet order. Preserve any supported renderer that the task explicitly requests.",
    `Required evaluation renderer: ${task.expectedRenderer ?? "none (submit null)"}.`,
    "Never invent support, use extension primitives, access files or network, or include markdown fences.",
    `Task: ${task.query}`,
    `Dataset (${task.dataset.id}): ${JSON.stringify(task.dataset.values)}`
  ].join("\n");
}

function baseRequestV4(plan, task, adapter, input, maximumOutputTokens) {
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
    tools: [...adapter.tools, submitResultToolV4],
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
  const projectedInputTokens = projectedRequestInputTokens(request, {
    bytesPerToken: plan.limits.projectedInputBytesPerToken,
    priorReasoningTokens
  });
  if (state.projectedInputTokens + projectedInputTokens > plan.limits.maximumInputTokensPerTask) {
    throw new Error("task-token-envelope: projected billable input would be exceeded");
  }
  const worstRequestCost = (
    projectedInputTokens * plan.pricingPerMillionTokens.cacheWrite +
    request.max_output_tokens * plan.pricingPerMillionTokens.output
  ) / 1_000_000;
  if (ledger.costUsd + worstRequestCost > plan.limits.hardCostUsd) {
    throw new Error("global-cost-cap: next request could exceed the approved hard cap");
  }
  state.requestBodyBytes += bytes;
  state.projectedInputTokens += projectedInputTokens;
  return { bytes, projectedInputTokens };
}

function routeFailuresV4(condition, task, snapshot) {
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

function activeTaskSnapshotV4({ task, condition, usage, state, adapter, trace }) {
  return JSON.parse(JSON.stringify({
    id: `${task.id}:${condition}`,
    task: task.id,
    condition,
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

export async function runPaidSmokeTaskV4({
  plan,
  task,
  condition,
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
  let input = [{ role: "user", content: [{ type: "input_text", text: taskPromptV4(task, adapter) }] }];
  let lastEvaluation;
  try {
    for (let callIndex = 0; callIndex < plan.limits.maximumModelCallsPerTask; callIndex += 1) {
      const remainingOutput = plan.limits.maximumOutputTokensPerTask - usage.outputTokens;
      if (remainingOutput <= 0) break;
      const request = baseRequestV4(
        plan,
        task,
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
        await onProgress(activeTaskSnapshotV4({
          task,
          condition,
          usage,
          state,
          adapter,
          trace
        }));
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
      await onProgress(activeTaskSnapshotV4({
        task,
        condition,
        usage,
        state,
        adapter,
        trace
      }));
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
        const failures = routeFailuresV4(condition, task, adapter.snapshot());
        lastEvaluation = failures.length > 0
          ? { passed: false, failures }
          : await evaluateSubmissionV4({ submission, task, artifactRoot });
        trace.at(-1).evaluation = lastEvaluation;
        await onProgress(activeTaskSnapshotV4({
          task,
          condition,
          usage,
          state,
          adapter,
          trace
        }));
        if (lastEvaluation.passed) {
          return {
            id: `${task.id}:${condition}`,
            task: task.id,
            condition,
            stratum: task.stratum,
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
        await onProgress(activeTaskSnapshotV4({
          task,
          condition,
          usage,
          state,
          adapter,
          trace
        }));
      }
    }
    return {
      id: `${task.id}:${condition}`,
      task: task.id,
      condition,
      stratum: task.stratum,
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

function canonicalSubmission(task) {
  if (task.id === "repair-val-histogram") {
    return {
      status: "program",
      renderer: "svg",
      unsupported: [],
      unresolved: [],
      source: [
        'import { chart } from "ggaction";',
        'import { renderToSVG } from "ggaction/svg";',
        "export function buildChart(rows) {",
        "  return chart()",
        "    .createCanvas({ width: 640, height: 400, margin: 50 })",
        "    .createData({ values: rows })",
        '    .createHistogram({ field: "value", guides: {} });',
        "}",
        "export function renderChart(program) { return renderToSVG(program); }",
        ""
      ].join("\n")
    };
  }
  if (task.id === "repair-hold-regression-layers") {
    return {
      status: "program",
      renderer: "canvas",
      unsupported: [],
      unresolved: [],
      source: [
        'import { chart } from "ggaction";',
        "export function buildChart(rows) {",
        "  return chart()",
        "    .createCanvas({ width: 640, height: 400, margin: 50 })",
        "    .createData({ values: rows })",
        "    .createPointMark({})",
        '    .encodeX({ field: "x" })',
        '    .encodeY({ field: "y" })',
        "    .createRegression({})",
        "    .createAxes({});",
        "}",
        ""
      ].join("\n")
    };
  }
  return {
    status: "unsupported",
    source: null,
    renderer: task.expectedRenderer,
    unsupported: task.expectedUnsupported,
    unresolved: task.expectedUnresolved
  };
}

export async function runPaidSmokeDryRunV4({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v4-dry")
} = {}) {
  const oracle = await loadRouteOracleV4();
  await preflightPaidSmokeToolsV4();
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
          if (search[0]?.url.split("#")[0] !== "/llm-authoring/") {
            throw new Error(`${task.id}: bounded LLM authoring route was not first`);
          }
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
    const evaluation = await evaluateSubmissionV4({
      submission: canonicalSubmission(task),
      task,
      artifactRoot: path.join(artifactRoot, task.id)
    });
    if (!evaluation.passed) {
      throw new Error(`${task.id} canonical v4 evaluator failed: ${evaluation.failures.join(", ")}`);
    }
  }
  return {
    schemaVersion: 1,
    routeOracleSha256: oracle.oracleSha256,
    checks: checks.length,
    passed: checks.every(check => check.passed),
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0,
    details: checks
  };
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

export async function runPaidSmokeV4({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-v4"),
  now = () => new Date(),
  onProgress = async () => {}
} = {}) {
  const plan = await assertPaidSmokeAuthorizedV4(suppliedPlan ?? await loadPaidSmokePlanV4());
  await preflightPaidSmokeToolsV4();
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const ledger = { usage: emptyUsage(), costUsd: 0, modelCalls: 0 };
  const results = [];
  let activeTask = null;
  const startedAt = now().toISOString();
  for (const run of plan.runOrder) {
    const separator = run.lastIndexOf(":");
    const taskId = run.slice(0, separator);
    const condition = run.slice(separator + 1);
    let result;
    try {
      result = await runPaidSmokeTaskV4({
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
      throw Object.assign(new Error(failure.error), { paidSmokeFailure: failure });
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
    conditions: summarizeResults(results),
    results
  };
}
