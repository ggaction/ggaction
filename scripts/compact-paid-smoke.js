import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createCanvas as createNativeCanvas } from "@napi-rs/canvas";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { searchGgaction } from "../knowledge/task-resolver.js";
import { render } from "../src/index.js";
import {
  docsFallbackResources,
  SEARCH_TOOL,
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../src/mcp/adapter.js";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const paidSmokeRoot = path.join(
  root,
  "evaluation",
  "compact-authoring-paid-smoke-v2"
);
export const paidSmokePlanFile = path.join(paidSmokeRoot, "PLAN.json");
const paidSmokeGateFile = path.join(
  root,
  "agent_docs",
  "impl",
  "roadmap5.4",
  "phase5",
  "GATE_B.md"
);
const execFile = promisify(execFileCallback);
const generatedProgramHarness = path.join(
  root,
  "scripts",
  "run-compact-generated-program.js"
);

const corpusRoots = Object.freeze({
  repair: path.join(root, "evaluation", "compact-authoring-repair"),
  policy: path.join(root, "evaluation", "compact-authoring-policy")
});
const docsRoot = path.join(root, "docs");
const allowedImports = new Set([
  "ggaction",
  "ggaction/basic",
  "ggaction/pdf",
  "ggaction/png",
  "ggaction/svg"
]);
const forbiddenSourcePatterns = Object.freeze([
  [/\b(?:process|globalThis|require|eval|Function|fetch|XMLHttpRequest|WebSocket|Deno|Bun)\b/u, "forbidden global"],
  [/\b(?:constructor|__proto__|prototype)\b/u, "prototype escape"],
  [/\bimport\.meta\b/u, "import.meta access"],
  [/\bimport\s*\(/u, "dynamic import"],
  [/\b(?:while|for)\s*\(\s*;\s*;/u, "unbounded loop"]
]);
const supportedSchemaKeywords = new Set([
  "$defs",
  "$ref",
  "additionalProperties",
  "anyOf",
  "const",
  "description",
  "enum",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "format",
  "items",
  "maximum",
  "maxItems",
  "maxLength",
  "minimum",
  "minItems",
  "minLength",
  "multipleOf",
  "pattern",
  "properties",
  "required",
  "type"
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

function planCost(plan) {
  const pricing = plan.pricingPerMillionTokens;
  const projection = plan.costProjection;
  const taskRuns = plan.runOrder.length;
  const expected = taskRuns * (
    projection.taskRunExpectedInputTokens * pricing.uncachedInput +
    projection.taskRunExpectedOutputTokens * pricing.output
  ) / 1_000_000;
  const maximum = taskRuns * (
    plan.limits.maximumInputTokensPerTask * pricing.cacheWrite +
    plan.limits.maximumOutputTokensPerTask * pricing.output
  ) / 1_000_000;
  return { expected, maximum };
}

function assertPlanShape(plan) {
  if (
    plan.schemaVersion !== 1 ||
    plan.id !== "compact-authoring-paid-smoke-v2" ||
    plan.requiredGate !== "R54-P5-B"
  ) {
    throw new Error("Paid smoke plan identity is invalid.");
  }
  if (plan.conditions.length !== 4 || plan.tasks.length !== 4) {
    throw new Error("Paid smoke requires exactly four conditions and four tasks.");
  }
  if (plan.runOrder.length !== 16 || new Set(plan.runOrder).size !== 16) {
    throw new Error("Paid smoke run order must contain 16 unique task-condition pairs.");
  }
  if (
    plan.limits.maximumModelCallsPerTask !== 3 ||
    plan.limits.maximumInputTokensPerTask <= 0 ||
    plan.limits.maximumOutputTokensPerTask <= 0 ||
    plan.limits.requestTokenEstimateBytesPerToken !== 1
  ) {
    throw new Error("Paid smoke token and model-call limits are invalid.");
  }
  const allowedRuns = new Set(plan.tasks.flatMap(task =>
    plan.conditions.map(condition => `${task.id}:${condition.id}`)
  ));
  for (const id of plan.runOrder) {
    if (!allowedRuns.has(id)) throw new Error(`Unknown paid smoke run: ${id}`);
  }
  const cost = planCost(plan);
  if (
    Math.abs(cost.expected - plan.costProjection.expectedUsd) > 1e-12 ||
    Math.abs(cost.maximum - plan.costProjection.calculatedMaximumUsd) > 1e-12 ||
    cost.maximum >= plan.limits.hardCostUsd
  ) {
    throw new Error("Paid smoke cost projection does not match its token envelopes.");
  }
}

async function loadSourceTask(spec) {
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
  if (!same(taskPlan(packet), spec.expectedPlan)) {
    throw new Error(`${spec.id} paid oracle plan drifted: ${JSON.stringify(taskPlan(packet))}`);
  }
  if (!same(packet.unresolved.map(entry => entry.constraint), spec.expectedUnresolved)) {
    throw new Error(`${spec.id} paid oracle unresolved constraints drifted.`);
  }
  if (!same(actualFallbacks, spec.expectedFallbacks)) {
    throw new Error(`${spec.id} paid oracle fallback resources drifted.`);
  }
  return Object.freeze({ ...spec, query: task.query, dataset });
}

export async function loadPaidSmokePlan() {
  const planBytes = await readFile(paidSmokePlanFile);
  const plan = JSON.parse(planBytes);
  assertPlanShape(plan);
  for (const [relative, expected] of Object.entries(plan.sourceFiles)) {
    const actual = sha256(await readFile(path.join(root, relative)));
    if (actual !== expected) throw new Error(`Paid smoke source hash drifted: ${relative}`);
  }
  try {
    execFileSync("git", [
      "merge-base",
      "--is-ancestor",
      plan.productCandidateCommit,
      "HEAD"
    ], { cwd: root, stdio: "ignore" });
  } catch {
    throw new Error("Paid smoke product candidate is not an ancestor of the current HEAD.");
  }
  const tasks = await Promise.all(plan.tasks.map(loadSourceTask));
  return Object.freeze({
    ...plan,
    tasks: Object.freeze(tasks),
    planSha256: sha256(planBytes)
  });
}

export async function assertPaidSmokeAuthorized(plan) {
  const approvedPlan = plan ?? await loadPaidSmokePlan();
  const gate = await readFile(paidSmokeGateFile, "utf8");
  const state = gate.match(/^## Gate state\n\n`([^`]+)`$/mu)?.[1];
  if (state !== "approved") {
    throw new Error(
      `${approvedPlan.requiredGate} is not approved; credential read and paid calls are blocked.`
    );
  }
  if (
    !gate.includes(approvedPlan.productCandidateCommit) ||
    !gate.includes(approvedPlan.planSha256)
  ) {
    throw new Error(
      `${approvedPlan.requiredGate} does not authorize this candidate and plan hash.`
    );
  }
  return approvedPlan;
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

const docsTools = Object.freeze([
  functionTool(
    "search_docs",
    "Search the current public ggaction documentation and return bounded routes and summaries.",
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

const compactSearchTool = Object.freeze({
  type: "function",
  name: SEARCH_TOOL.name,
  description: SEARCH_TOOL.description,
  strict: true,
  parameters: SEARCH_TOOL.inputSchema
});

const readMcpResourcesTool = functionTool(
  "read_mcp_resources",
  "Read every unresolved-only ggaction://docs resource in one call after search_ggaction reports the matching unresolved constraints.",
  {
    uris: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "string", pattern: "^ggaction://docs/[a-z0-9-]+$" }
    }
  },
  ["uris"]
);

export const submitResultTool = functionTool(
  "submit_result",
  "Submit one complete chart program or an exact unsupported-capability decision for validation.",
  {
    status: { enum: ["program", "unsupported"] },
    source: { type: ["string", "null"], maxLength: 30000 },
    renderer: { enum: ["canvas", "svg", "png", "pdf", null] },
    unresolved: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 100 }
    }
  },
  ["status", "source", "renderer", "unresolved"]
);

function terms(value) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9-]+/gu) ?? [])];
}

function searchDocs(index, query) {
  const queryTerms = terms(query);
  return index
    .map((entry, order) => {
      const title = `${entry.pageTitle ?? ""} ${entry.sectionTitle ?? ""}`.toLowerCase();
      const text = `${title} ${entry.summary ?? ""} ${(entry.keywords ?? []).join(" ")}`
        .toLowerCase();
      const score = queryTerms.reduce((sum, term) =>
        sum + (title.includes(term) ? 4 : 0) + (text.includes(term) ? 1 : 0), 0);
      return { entry, order, score };
    })
    .filter(entry => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, 6)
    .map(({ entry }) => ({
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

function docCandidates(route) {
  if (route === "") return [path.join(docsRoot, "index.md")];
  return [
    path.join(docsRoot, `${route}.md`),
    path.join(docsRoot, route, "index.md")
  ];
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
  if (fragment === "") return source.slice(0, 5000);
  const lines = source.split("\n");
  const start = lines.findIndex(line => {
    const match = line.match(/^(#{1,6})\s+(.+)$/u);
    if (!match) return false;
    const explicit = match[2].match(/\{#([^}]+)\}\s*$/u)?.[1];
    return explicit === fragment || markdownSlug(match[2]) === fragment;
  });
  if (start === -1) return source.slice(0, 5000);
  const level = lines[start].match(/^#+/u)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{1,6})\s+/u);
    if (heading && heading[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").slice(0, 5000);
}

async function readPublicDoc(url) {
  const { route, fragment } = normalizeDocRoute(url);
  for (const file of docCandidates(route)) {
    const relative = path.relative(docsRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Public documentation read escaped docs/.");
    }
    try {
      const source = await readFile(file, "utf8");
      return {
        url,
        file: path.join("docs", relative),
        text: sectionText(source, fragment)
      };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Unknown public documentation URL: ${url}`);
}

async function createDocsAdapter() {
  const index = await json(path.join(docsRoot, "search-index.json"));
  let allowedUrls = new Set();
  let searches = 0;
  let reads = 0;
  return Object.freeze({
    tools: docsTools,
    instruction: "Use public documentation only. Search once, read at most one returned URL, then submit.",
    async handle(call) {
      const args = JSON.parse(call.arguments);
      if (call.name === "search_docs") {
        searches += 1;
        const results = searchDocs(index, args.query);
        allowedUrls = new Set(results.map(entry => entry.url));
        return JSON.stringify(results);
      }
      if (call.name === "read_doc") {
        if (!allowedUrls.has(args.url)) {
          throw new Error("read_doc accepts only a URL returned by the latest search_docs call.");
        }
        reads += 1;
        return JSON.stringify(await readPublicDoc(args.url));
      }
      throw new Error(`Unknown public-docs tool: ${call.name}`);
    },
    snapshot: () => ({
      toolCalls: searches + reads,
      searches,
      docsReads: reads
    }),
    async close() {}
  });
}

function createDirectAdapter() {
  let calls = 0;
  return Object.freeze({
    tools: Object.freeze([compactSearchTool]),
    instruction: "Call search_ggaction exactly once with the exact text after Task:. Do not copy the dataset, scaffold, or commentary into the query. Then submit.",
    async handle(call) {
      if (call.name !== SEARCH_TOOL_NAME) throw new Error(`Unknown direct tool: ${call.name}`);
      const args = JSON.parse(call.arguments);
      calls += 1;
      return searchGgactionText(args.query);
    },
    snapshot: () => ({ toolCalls: calls, searches: calls, docsReads: 0 }),
    async close() {}
  });
}

function createMcpAdapter({ fallback }) {
  let client;
  let connecting;
  let transport;
  let calls = 0;
  let readCalls = 0;
  let reads = 0;
  let allowedDocs = new Set();

  async function connection() {
    if (client) return client;
    connecting ??= (async () => {
      transport = new StdioClientTransport({
        command: process.execPath,
        args: [path.join(root, "src", "mcp", "cli.js")],
        cwd: root,
        stderr: "pipe"
      });
      const next = new Client(
        { name: "ggaction-paid-smoke", version: "1.0.0" },
        { capabilities: {} }
      );
      await next.connect(transport);
      client = next;
      return next;
    })();
    return connecting;
  }

  return Object.freeze({
    tools: Object.freeze(fallback
      ? [compactSearchTool, readMcpResourcesTool]
      : [compactSearchTool]),
    instruction: fallback
      ? "Call search_ggaction once with the exact text after Task:, without dataset or scaffold. If it returns fallback resources, read every URI together in one read_mcp_resources call, then submit. unsupported.* maps to unsupported-capabilities and renderer.format maps to choose-renderer."
      : "Call search_ggaction exactly once through local MCP with the exact text after Task:, without dataset or scaffold. Do not read docs, then submit.",
    async handle(call) {
      const connected = await connection();
      const args = JSON.parse(call.arguments);
      if (call.name === SEARCH_TOOL_NAME) {
        calls += 1;
        const result = await connected.callTool({
          name: SEARCH_TOOL_NAME,
          arguments: args
        });
        if (result.isError) throw new Error(result.content?.[0]?.text ?? "MCP search failed.");
        const text = result.content?.find(entry => entry.type === "text")?.text;
        if (typeof text !== "string") throw new Error("MCP search returned no text.");
        if (text !== searchGgactionText(args.query)) {
          throw new Error("Direct and MCP task packets are not byte-equal.");
        }
        allowedDocs = new Set(docsFallbackResources(JSON.parse(text)).map(entry => entry.uri));
        return text;
      }
      if (call.name === "read_mcp_resources" && fallback) {
        const expectedUris = [...allowedDocs];
        if (!same(args.uris, expectedUris)) {
          throw new Error(
            "read_mcp_resources requires every recommended URI exactly once and in packet order."
          );
        }
        readCalls += 1;
        const resources = [];
        for (const uri of args.uris) {
          const result = await connected.readResource({ uri });
          const text = result.contents?.find(entry => "text" in entry)?.text;
          if (typeof text !== "string") throw new Error(`MCP resource ${uri} returned no text.`);
          reads += 1;
          resources.push({ uri, text });
        }
        return JSON.stringify(resources);
      }
      throw new Error(`Unknown MCP tool: ${call.name}`);
    },
    snapshot: () => ({
      toolCalls: calls + readCalls,
      searches: calls,
      docsReadCalls: readCalls,
      docsReads: reads
    }),
    async close() {
      await client?.close();
      client = undefined;
      connecting = undefined;
      transport = undefined;
    }
  });
}

export async function createKnowledgeAdapter(condition) {
  if (condition === "A") return createDocsAdapter();
  if (condition === "B") return createDirectAdapter();
  if (condition === "C") return createMcpAdapter({ fallback: false });
  if (condition === "D") return createMcpAdapter({ fallback: true });
  throw new Error(`Unknown paid smoke condition: ${condition}`);
}

function assertSchemaNode(node, pathLabel) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new Error(`provider-schema-preflight: ${pathLabel} is not a schema object`);
  }
  for (const keyword of Object.keys(node)) {
    if (!supportedSchemaKeywords.has(keyword)) {
      throw new Error(
        `provider-schema-preflight: unsupported keyword ${keyword} at ${pathLabel}`
      );
    }
  }
  if (node.type === "object") {
    if (node.additionalProperties !== false) {
      throw new Error(`provider-schema-preflight: ${pathLabel} must close additionalProperties`);
    }
    const properties = node.properties ?? {};
    const propertyNames = Object.keys(properties);
    if (!same(node.required ?? [], propertyNames)) {
      throw new Error(`provider-schema-preflight: ${pathLabel} must require every property in order`);
    }
    for (const [name, property] of Object.entries(properties)) {
      assertSchemaNode(property, `${pathLabel}.properties.${name}`);
    }
  }
  if (node.items) assertSchemaNode(node.items, `${pathLabel}.items`);
  for (const [index, branch] of (node.anyOf ?? []).entries()) {
    assertSchemaNode(branch, `${pathLabel}.anyOf[${index}]`);
  }
  for (const [name, definition] of Object.entries(node.$defs ?? {})) {
    assertSchemaNode(definition, `${pathLabel}.$defs.${name}`);
  }
}

export function assertSupportedStrictToolSchema(tool) {
  if (tool?.type !== "function" || tool.strict !== true) {
    throw new Error("provider-schema-preflight: every model-visible tool must be strict function");
  }
  assertSchemaNode(tool.parameters, tool.name);
}

export async function preflightPaidSmokeTools() {
  for (const condition of ["A", "B", "C", "D"]) {
    const adapter = await createKnowledgeAdapter(condition);
    try {
      for (const tool of [...adapter.tools, submitResultTool]) {
        assertSupportedStrictToolSchema(tool);
      }
    } finally {
      await adapter.close();
    }
  }
}

function importsFromSource(source) {
  return [
    ...source.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu),
    ...source.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/gu)
  ].map(match => match[1]);
}

function validateGeneratedSource(source) {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new Error("A supported task requires non-empty JavaScript source.");
  }
  if (source.length > 30000) throw new Error("Submitted source exceeds 30,000 characters.");
  const imports = importsFromSource(source);
  if (imports.length === 0) throw new Error("Submitted source must import ggaction.");
  for (const specifier of imports) {
    if (!allowedImports.has(specifier)) throw new Error(`Import ${specifier} is not allowed.`);
  }
  for (const [pattern, label] of forbiddenSourcePatterns) {
    if (pattern.test(source)) throw new Error(`Submitted source uses a ${label}.`);
  }
  if (!/\bexport\s+(?:async\s+)?function\s+buildChart\s*\(/u.test(source)) {
    throw new Error("Submitted source must export function buildChart(rows).");
  }
}

function hasGraphicInk(program) {
  return Object.entries(program.graphicSpec?.objects ?? {}).some(([id, graphic]) =>
    id !== "canvas" && id !== "plot-main" && (
      (Array.isArray(graphic.items) && graphic.items.length > 0) ||
      (graphic.properties && Object.keys(graphic.properties).length > 0)
    )
  );
}

function expectedActionNames(task) {
  return task.expectedPlan
    .filter(entry => entry.id.startsWith("action."))
    .map(entry => entry.id.slice("action.".length));
}

function canvasGraphic(program) {
  return Object.values(program.graphicSpec?.objects ?? {})
    .find(graphic => graphic.type === "canvas");
}

async function executeGeneratedProgram({ artifactRoot, programFile, task, renderer }) {
  const datasetFile = path.join(artifactRoot, "dataset.json");
  const resultFile = path.join(artifactRoot, "execution.json");
  await writeFile(datasetFile, `${JSON.stringify(task.dataset.values)}\n`);
  try {
    await execFile(process.execPath, [
      "--experimental-permission",
      "--max-old-space-size=128",
      `--allow-fs-read=${generatedProgramHarness}`,
      `--allow-fs-read=${path.join(root, "package.json")}`,
      `--allow-fs-read=${path.join(root, "src")}`,
      `--allow-fs-read=${artifactRoot}`,
      `--allow-fs-write=${artifactRoot}`,
      generatedProgramHarness,
      programFile,
      datasetFile,
      resultFile,
      renderer
    ], {
      cwd: root,
      env: {},
      timeout: 10_000,
      maxBuffer: 1_000_000
    });
  } catch (error) {
    const text = String(error?.stderr ?? error?.message ?? error);
    const issue = text.split("\n").find(line =>
      /^(?:Error|RangeError|ReferenceError|SyntaxError|TypeError):/u.test(line)
    );
    throw new Error(`generated-program-error:${(issue ?? "isolated execution failed").slice(0, 500)}`);
  }
  return json(resultFile);
}

async function evaluateProgramSubmission({ submission, task, artifactRoot }) {
  const failures = [];
  try {
    validateGeneratedSource(submission.source);
    await mkdir(artifactRoot, { recursive: true });
    const programFile = path.join(artifactRoot, "program.mjs");
    await writeFile(programFile, submission.source);
    const execution = await executeGeneratedProgram({
      artifactRoot,
      programFile,
      task,
      renderer: task.expectedRenderer
    });
    const program = execution.program;
    if (!program?.semanticSpec || !program?.graphicSpec || !program?.trace) {
      throw new Error("buildChart did not return a ChartProgram.");
    }
    const sourceOwned = program.semanticSpec.datasets?.some(dataset =>
      same(dataset.values, task.dataset.values)
    );
    if (!sourceOwned) failures.push("source-dataset-mismatch");
    const actualActions = (program.trace.children ?? [])
      .map(node => node.op)
      .filter(name => !["createCanvas", "createData"].includes(name));
    const expectedActions = expectedActionNames(task);
    if (!same(actualActions, expectedActions)) {
      failures.push(`action-plan-mismatch:${JSON.stringify(actualActions)}`);
    }
    const canvas = canvasGraphic(program);
    const width = canvas?.properties?.width;
    const height = canvas?.properties?.height;
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      failures.push("missing-canvas-dimensions");
    } else if (!hasGraphicInk(program)) {
      failures.push("missing-graphic-ink");
    } else {
      const before = JSON.stringify(program);
      if (task.expectedRenderer === "svg") {
        const svg = execution.svg;
        if (typeof svg !== "string" || !/^<svg[\s>]/u.test(svg)) {
          failures.push("invalid-svg-output");
        } else {
          await writeFile(path.join(artifactRoot, "chart.svg"), svg);
        }
      } else {
        const target = createNativeCanvas(width, height);
        render(program, target.getContext("2d"));
        await writeFile(path.join(artifactRoot, "canvas.png"), target.toBuffer("image/png"));
      }
      if (before !== JSON.stringify(program)) failures.push("renderer-mutated-program");
    }
    return {
      passed: failures.length === 0,
      failures,
      sourceSha256: sha256(submission.source),
      sourceBytes: Buffer.byteLength(submission.source, "utf8")
    };
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { passed: false, failures };
  }
}

export async function evaluateSubmission({ submission, task, artifactRoot }) {
  const failures = [];
  if (submission.renderer !== task.expectedRenderer) {
    failures.push(`renderer-mismatch:${submission.renderer}`);
  }
  if (!same(submission.unresolved, task.expectedUnresolved)) {
    failures.push(`unresolved-mismatch:${JSON.stringify(submission.unresolved)}`);
  }
  if (task.role === "unsupported") {
    if (submission.status !== "unsupported") failures.push("expected-unsupported-status");
    if (submission.source !== null) failures.push("unsupported-task-invented-source");
    return { passed: failures.length === 0, failures };
  }
  if (submission.status !== "program") failures.push("expected-program-status");
  if (submission.unresolved.length !== 0) failures.push("supported-task-reported-unresolved");
  if (failures.length > 0) return { passed: false, failures };
  return evaluateProgramSubmission({ submission, task, artifactRoot });
}

function normalizeApiKeyText(text) {
  let value = text.trim();
  const assignment = value.match(/^OPENAI_API_KEY\s*=\s*(.+)$/u);
  if (assignment) value = assignment[1].trim();
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) value = value.slice(1, -1);
  if (value.length < 20 || /\s/u.test(value)) {
    throw new Error("The API key file does not contain one valid token.");
  }
  return value;
}

export async function loadApiKey(file) {
  return normalizeApiKeyText(await readFile(file, "utf8"));
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

export async function createOpenAIResponse({ apiKey, request, timeoutMilliseconds }) {
  if (typeof apiKey !== "string" || apiKey.length < 20) throw new Error("OpenAI API key is required.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        payload?.error?.message ?? `OpenAI Responses API returned HTTP ${response.status}.`
      );
      error.status = response.status;
      error.code = payload?.error?.code;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function taskPrompt(task, adapter) {
  return [
    "Create the requested ggaction result using only public APIs.",
    adapter.instruction,
    "For a supported chart, submit status=program, the expected renderer, no unresolved IDs, and a complete ESM module.",
    "The module must import ggaction, export function buildChart(rows), create a 640x400 Canvas with margin 50, store rows with createData, and return the final ChartProgram.",
    "For SVG, also import renderToSVG from ggaction/svg and export function renderChart(program) that returns renderToSVG(program).",
    "For an unsupported requirement, submit status=unsupported, source=null, every exact unresolved ID in order, and any supported renderer that can still be honored.",
    `Required evaluation renderer: ${task.expectedRenderer ?? "none (submit null)"}.`,
    "Never invent support, use extension primitives, access files/network, or include markdown fences.",
    `Task: ${task.query}`,
    `Dataset (${task.dataset.id}): ${JSON.stringify(task.dataset.values)}`
  ].join("\n");
}

function baseRequest(plan, task, adapter, input, maximumOutputTokens) {
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
    tools: [...adapter.tools, submitResultTool],
    instructions: "Complete one bounded ggaction authoring task. Use the required knowledge route before submitting. A passing submit_result ends the task.",
    input
  };
}

function sanitizedArguments(call) {
  const args = JSON.parse(call.arguments);
  if (call.name !== "submit_result") return args;
  return {
    status: args.status,
    renderer: args.renderer,
    unresolved: args.unresolved,
    sourceBytes: typeof args.source === "string" ? Buffer.byteLength(args.source, "utf8") : 0,
    sourceSha256: typeof args.source === "string" ? sha256(args.source) : null
  };
}

function responseFunctionCalls(response) {
  return (response.output ?? []).filter(entry => entry.type === "function_call");
}

function recordBudgetBeforeRequest({ plan, ledger, taskState, request }) {
  const bytes = Buffer.byteLength(JSON.stringify(request), "utf8");
  const estimatedInputTokens = Math.ceil(
    bytes / plan.limits.requestTokenEstimateBytesPerToken
  );
  if (
    taskState.estimatedInputTokens + estimatedInputTokens >
    plan.limits.maximumInputTokensPerTask
  ) {
    throw new Error("task-token-envelope: conservative input estimate would be exceeded");
  }
  const worstRequestCost = (
    estimatedInputTokens * plan.pricingPerMillionTokens.cacheWrite +
    request.max_output_tokens * plan.pricingPerMillionTokens.output
  ) / 1_000_000;
  if (ledger.costUsd + worstRequestCost > plan.limits.hardCostUsd) {
    throw new Error("global-cost-cap: next request could exceed the approved hard cap");
  }
  taskState.requestBodyBytes += bytes;
  taskState.estimatedInputTokens += estimatedInputTokens;
  return { bytes, estimatedInputTokens };
}

function knowledgeRouteFailures(condition, task, snapshot) {
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

export async function runPaidSmokeTask({
  plan,
  task,
  condition,
  apiKey,
  ledger,
  artifactRoot,
  createResponse = createOpenAIResponse
}) {
  const adapter = await createKnowledgeAdapter(condition);
  const started = performance.now();
  const usage = emptyUsage();
  const taskState = { requestBodyBytes: 0, estimatedInputTokens: 0 };
  const trace = [];
  let input = [{
    role: "user",
    content: [{ type: "input_text", text: taskPrompt(task, adapter) }]
  }];
  let lastEvaluation;
  try {
    for (let callIndex = 0; callIndex < plan.limits.maximumModelCallsPerTask; callIndex += 1) {
      const remainingOutput = plan.limits.maximumOutputTokensPerTask - usage.outputTokens;
      if (remainingOutput <= 0) break;
      const request = baseRequest(
        plan,
        task,
        adapter,
        input,
        Math.min(plan.limits.maximumOutputTokensPerResponse, remainingOutput)
      );
      const requestBudget = recordBudgetBeforeRequest({ plan, ledger, taskState, request });
      const response = await createResponse({
        apiKey,
        request,
        timeoutMilliseconds: plan.limits.timeoutMilliseconds
      });
      if (response.model !== plan.api.model) {
        throw new Error(`model-mismatch: expected ${plan.api.model}, received ${response.model}`);
      }
      if (response.service_tier !== plan.api.serviceTier) {
        throw new Error(
          `service-tier-mismatch: expected ${plan.api.serviceTier}, received ${response.service_tier}`
        );
      }
      if (!completeUsage(response.usage)) {
        throw new Error("incomplete-billing-usage: response omitted required billing fields");
      }
      const responseUsage = normalizedUsage(response.usage);
      addUsage(usage, responseUsage);
      addUsage(ledger.usage, responseUsage);
      const costUsd = usageCost(responseUsage, plan.pricingPerMillionTokens);
      ledger.costUsd += costUsd;
      ledger.modelCalls += 1;
      if (
        usage.inputTokens > plan.limits.maximumInputTokensPerTask ||
        usage.outputTokens > plan.limits.maximumOutputTokensPerTask
      ) {
        throw new Error("task-token-envelope: provider usage exceeded the approved task envelope");
      }
      if (ledger.costUsd > plan.limits.hardCostUsd) {
        throw new Error("global-cost-cap: provider usage exceeded the approved hard cap");
      }
      const calls = responseFunctionCalls(response);
      if (calls.length !== 1) {
        throw new Error(`provider-failure: expected one function call, received ${calls.length}`);
      }
      const call = calls[0];
      trace.push({
        modelCall: callIndex + 1,
        requestBytes: requestBudget.bytes,
        estimatedInputTokens: requestBudget.estimatedInputTokens,
        tool: call.name,
        arguments: sanitizedArguments(call),
        usage: responseUsage,
        costUsd
      });
      input = [...input, ...(response.output ?? [])];
      if (call.name === "submit_result") {
        const submission = JSON.parse(call.arguments);
        const routeFailures = knowledgeRouteFailures(condition, task, adapter.snapshot());
        lastEvaluation = routeFailures.length > 0
          ? { passed: false, failures: routeFailures }
          : await evaluateSubmission({ submission, task, artifactRoot });
        trace.at(-1).evaluation = lastEvaluation;
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
            requestBodyBytes: taskState.requestBodyBytes,
            estimatedInputTokens: taskState.estimatedInputTokens,
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
      requestBodyBytes: taskState.requestBodyBytes,
      estimatedInputTokens: taskState.estimatedInputTokens,
      knowledge: adapter.snapshot(),
      failures: lastEvaluation?.failures ?? ["No passing submission within the call limit."],
      trace
    };
  } finally {
    await adapter.close();
  }
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

export async function runPaidSmoke({
  plan: suppliedPlan,
  apiKey,
  createResponse = createOpenAIResponse,
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke"),
  now = () => new Date(),
  onProgress = async () => {}
} = {}) {
  const plan = await assertPaidSmokeAuthorized(suppliedPlan ?? await loadPaidSmokePlan());
  await preflightPaidSmokeTools();
  const taskById = new Map(plan.tasks.map(task => [task.id, task]));
  const ledger = { usage: emptyUsage(), costUsd: 0, modelCalls: 0 };
  const results = [];
  const startedAt = now().toISOString();
  for (const run of plan.runOrder) {
    const separator = run.lastIndexOf(":");
    const taskId = run.slice(0, separator);
    const condition = run.slice(separator + 1);
    let result;
    try {
      result = await runPaidSmokeTask({
        plan,
        task: taskById.get(taskId),
        condition,
        apiKey,
        ledger,
        artifactRoot: path.join(artifactRoot, `${taskId}-${condition}`),
        createResponse
      });
    } catch (error) {
      const failure = {
        schemaVersion: 1,
        id: plan.id,
        planSha256: plan.planSha256,
        productCandidateCommit: plan.productCandidateCommit,
        startedAt,
        abortedAt: now().toISOString(),
        abortedRun: run,
        error: error instanceof Error ? error.message : String(error),
        ledger,
        results
      };
      await onProgress({ plan, ledger, results: [...results], failure });
      throw Object.assign(new Error(failure.error), { paidSmokeFailure: failure });
    }
    results.push(result);
    await onProgress({ plan, ledger, results: [...results] });
  }
  return {
    schemaVersion: 1,
    id: plan.id,
    planSha256: plan.planSha256,
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

function canonicalSource(task) {
  if (task.id === "repair-val-histogram") {
    return [
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
    ].join("\n");
  }
  if (task.id === "repair-hold-regression-layers") {
    return [
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
    ].join("\n");
  }
  return null;
}

export async function runPaidSmokeDryRun({
  artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-paid-smoke-dry")
} = {}) {
  const plan = await loadPaidSmokePlan();
  const checks = [];
  for (const task of plan.tasks) {
    for (const condition of plan.conditions.map(entry => entry.id)) {
      const adapter = await createKnowledgeAdapter(condition);
      try {
        if (condition === "A") {
          const search = JSON.parse(await adapter.handle({
            name: "search_docs",
            arguments: JSON.stringify({ query: task.query })
          }));
          if (search.length === 0) throw new Error(`${task.id}: docs search returned no result`);
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
          if (condition === "D") {
            if (task.expectedFallbacks.length > 0) {
              await adapter.handle({
                name: "read_mcp_resources",
                arguments: JSON.stringify({ uris: task.expectedFallbacks })
              });
            }
          }
        }
        checks.push({ task: task.id, condition, passed: true, knowledge: adapter.snapshot() });
      } finally {
        await adapter.close();
      }
    }
    if (task.role === "supported") {
      const submission = {
        status: "program",
        source: canonicalSource(task),
        renderer: task.expectedRenderer,
        unresolved: []
      };
      const evaluated = await evaluateSubmission({
        submission,
        task,
        artifactRoot: path.join(artifactRoot, task.id)
      });
      if (!evaluated.passed) {
        throw new Error(`${task.id} canonical evaluator failed: ${evaluated.failures.join(", ")}`);
      }
    }
  }
  return {
    schemaVersion: 1,
    planSha256: plan.planSha256,
    productCandidateCommit: plan.productCandidateCommit,
    checks: checks.length,
    passed: checks.every(check => check.passed),
    externalCalls: 0,
    spendUsd: 0,
    details: checks
  };
}
