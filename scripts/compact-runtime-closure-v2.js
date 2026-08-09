import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { searchGgaction } from "../knowledge/task-resolver.js";
import {
  docsFallbackResources,
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../src/mcp/adapter.js";
import { createKnowledgeAdapterV4 } from "./compact-paid-smoke-v4.js";

const execFile = promisify(execFileCallback);
export const root = fileURLToPath(new URL("../", import.meta.url));
const harness = path.join(root, "scripts", "run-compact-full-generated-program.js");
const evaluationRoot = path.join(root, "evaluation", "compact-runtime-closure-v2");
const artifactRoot = path.join(root, ".artifacts", "evaluation", "compact-runtime-closure-v2");
const sourceCorpora = Object.freeze([
  { corpus: "repair", directory: "compact-authoring-repair", split: "validation" },
  { corpus: "repair", directory: "compact-authoring-repair", split: "held-out" },
  { corpus: "policy", directory: "compact-authoring-policy", split: "validation" },
  { corpus: "policy", directory: "compact-authoring-policy", split: "held-out" }
]);
const conditions = Object.freeze([
  Object.freeze({ id: "A", mode: "public-docs" }),
  Object.freeze({ id: "B", mode: "compact-direct" }),
  Object.freeze({ id: "C", mode: "compact-mcp" }),
  Object.freeze({ id: "D", mode: "mcp-first-explicit-fallback" })
]);
const rendererWrappers = Object.freeze({
  canvas: "export function renderChart(program, context) { render(program, context); }",
  svg: "export function renderChart(program) { return renderToSVG(program); }",
  png: "export async function renderChart(program, output) { return renderToPNG(program, { output }); }",
  pdf: "export async function renderChart(program, output) { return renderToPDF(program, { output }); }"
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalImports(packet, renderer) {
  if (renderer !== "canvas") return packet.authoring.imports;
  return packet.authoring.imports.map(entry =>
    entry.endsWith('from "ggaction";') && !/\brender\b/u.test(entry)
      ? entry.replace(/ \} from "ggaction";$/u, ', render } from "ggaction";')
      : entry
  );
}

function expectedRenderer(packet) {
  const runtime = packet.actionPlan.findLast(entry => entry.kind === "runtime")?.name;
  return ({ render: "canvas", renderToSVG: "svg", renderToPNG: "png", renderToPDF: "pdf" })[runtime] ??
    (packet.unsupported.length === 0 && packet.unresolved.length === 0 ? "canvas" : null);
}

function role(packet) {
  if (packet.unsupported.length > 0) return "unsupported";
  if (packet.unresolved.length > 0) return "needs-input";
  return "supported";
}

function expectedPlan(packet) {
  return packet.actionPlan.map(entry => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    options: entry.requiredOptions
  }));
}

async function loadSourceTasks() {
  const tasks = [];
  for (const source of sourceCorpora) {
    const directory = path.join(root, "evaluation", source.directory);
    const [split, datasets] = await Promise.all([
      readFile(path.join(directory, `${source.split}.json`), "utf8").then(JSON.parse),
      readFile(path.join(directory, "datasets.json"), "utf8").then(JSON.parse)
    ]);
    for (const task of split.tasks) {
      const dataset = datasets.datasets.find(entry => entry.id === task.dataset);
      if (!dataset) throw new Error(`${task.id} uses unknown dataset ${task.dataset}.`);
      const packet = searchGgaction(task.query);
      tasks.push(Object.freeze({
        id: task.id,
        query: task.query,
        stratum: task.stratum,
        source: { corpus: source.corpus, split: source.split },
        dataset,
        role: role(packet),
        expectedRenderer: expectedRenderer(packet),
        expectedPlan: expectedPlan(packet),
        expectedUnsupported: packet.unsupported.map(entry => entry.constraint),
        expectedUnresolved: packet.unresolved.map(entry => entry.constraint),
        expectedFallbacks: docsFallbackResources(packet).map(resource => resource.uri)
      }));
    }
  }
  return tasks;
}

export function canonicalRuntimeClosureSource(task) {
  const packet = searchGgaction(task.query);
  const actionSteps = packet.actionPlan.flatMap((entry, index) =>
    entry.kind === "action" || ["hconcat", "vconcat"].includes(entry.name)
      ? [`  ${packet.authoring.steps[index]};`]
      : []
  );
  return [
    ...canonicalImports(packet, task.expectedRenderer),
    "export function buildChart(rows) {",
    "  const values = rows;",
    `  ${packet.authoring.initialize};`,
    ...packet.authoring.prerequisites.map(entry => `  ${entry.call};`),
    ...actionSteps,
    "  return program;",
    "}",
    rendererWrappers[task.expectedRenderer],
    ""
  ].join("\n");
}

function outputExtension(renderer) {
  return renderer === "svg" ? "svg" : renderer === "pdf" ? "pdf" : "png";
}

function validOutput(renderer, output) {
  if (renderer === "svg") return output.toString("utf8").startsWith("<svg");
  if (renderer === "pdf") return output.subarray(0, 5).toString("ascii") === "%PDF-";
  return output.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
}

function hasGraphicInk(program) {
  return Object.entries(program.graphicSpec?.objects ?? {}).some(([id, graphic]) =>
    !["canvas", "plot-main"].includes(id) && (
      (Array.isArray(graphic.items) && graphic.items.length > 0) ||
      (graphic.properties && Object.keys(graphic.properties).length > 0)
    )
  );
}

function canvasGraphic(program) {
  return Object.values(program.graphicSpec?.objects ?? {})
    .find(graphic => graphic.type === "canvas");
}

function containsSourceDataset(program, values) {
  if (program.semanticSpec?.datasets?.some(dataset => same(dataset.values, values))) {
    return true;
  }
  return Object.values(program.children ?? {})
    .some(child => containsSourceDataset(child, values));
}

function expectedActionNames(task) {
  const composition = task.expectedPlan.findLast(entry =>
    entry.kind === "runtime" && ["hconcat", "vconcat"].includes(entry.name)
  );
  if (composition) return [composition.name];
  return task.expectedPlan
    .filter(entry => entry.kind === "action")
    .map(entry => entry.name)
    .filter(name => !["createCanvas", "createData"].includes(name));
}

async function executeProgram(task, source, artifactDirectory = artifactRoot) {
  const directory = path.join(artifactDirectory, task.id);
  const programFile = path.join(directory, "program.mjs");
  const datasetFile = path.join(directory, "dataset.json");
  const resultFile = path.join(directory, "execution.json");
  const outputFile = path.join(directory, `chart.${outputExtension(task.expectedRenderer)}`);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(programFile, source),
    writeFile(datasetFile, `${JSON.stringify(task.dataset.values)}\n`)
  ]);
  try {
    await execFile(process.execPath, [
      "--experimental-permission",
      "--allow-addons",
      "--max-old-space-size=128",
      `--allow-fs-read=${harness}`,
      `--allow-fs-read=${path.join(root, "package.json")}`,
      `--allow-fs-read=${path.join(root, "src")}`,
      `--allow-fs-read=${path.join(root, "node_modules")}`,
      `--allow-fs-read=${directory}`,
      `--allow-fs-write=${directory}`,
      harness,
      programFile,
      datasetFile,
      resultFile,
      task.expectedRenderer,
      outputFile
    ], {
      cwd: root,
      env: {},
      timeout: 15_000,
      maxBuffer: 8_000_000
    });
  } catch (error) {
    const detail = String(error?.stderr ?? error?.message ?? error);
    const issue = detail.split("\n").find(line =>
      /^(?:Error|RangeError|ReferenceError|SyntaxError|TypeError):/u.test(line)
    );
    throw new Error((issue ?? "isolated execution failed").slice(0, 500));
  }
  return {
    execution: JSON.parse(await readFile(resultFile, "utf8")),
    output: await readFile(outputFile)
  };
}

export async function evaluateRuntimeClosureTask(
  task,
  { artifactDirectory = artifactRoot } = {}
) {
  const source = canonicalRuntimeClosureSource(task);
  const failures = [];
  try {
    const { execution, output } = await executeProgram(task, source, artifactDirectory);
    const program = execution.program;
    if (!program?.semanticSpec || !program?.graphicSpec || !program?.trace) {
      throw new Error("buildChart did not return a ChartProgram.");
    }
    if (!containsSourceDataset(program, task.dataset.values)) {
      failures.push("source-dataset-mismatch");
    }
    const actualActions = (program.trace.children ?? [])
      .map(node => node.op)
      .filter(name => !["createCanvas", "createData"].includes(name));
    if (!same(actualActions, expectedActionNames(task))) {
      failures.push(`action-plan-mismatch:${JSON.stringify(actualActions)}`);
    }
    const canvas = canvasGraphic(program);
    if (!Number.isFinite(canvas?.properties?.width) || !Number.isFinite(canvas?.properties?.height)) {
      failures.push("missing-canvas-dimensions");
    }
    if (!hasGraphicInk(program)) failures.push("missing-graphic-ink");
    if (execution.rendererMutatedProgram) failures.push("renderer-mutated-program");
    if (!validOutput(task.expectedRenderer, output)) {
      failures.push(`invalid-${task.expectedRenderer}-output`);
    }
    return {
      passed: failures.length === 0,
      failures,
      sourceSha256: sha256(source),
      sourceBytes: Buffer.byteLength(source),
      outputBytes: output.length,
      actions: actualActions
    };
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { passed: false, failures, sourceSha256: sha256(source) };
  }
}

export async function checkRuntimeClosureRoutes(task) {
  const checks = [];
  for (const condition of conditions) {
    const adapter = await createKnowledgeAdapterV4(condition.id);
    try {
      if (condition.id === "A") {
        const search = JSON.parse(await adapter.handle({
          name: "search_docs",
          arguments: JSON.stringify({ query: task.query })
        }));
        if (!search[0]?.url) throw new Error("public docs search returned no route");
        await adapter.handle({
          name: "read_doc",
          arguments: JSON.stringify({ url: search[0].url })
        });
      } else {
        const text = await adapter.handle({
          name: SEARCH_TOOL_NAME,
          arguments: JSON.stringify({ query: task.query })
        });
        if (text !== searchGgactionText(task.query)) throw new Error("task packet drifted");
        if (condition.id === "D" && task.expectedFallbacks.length > 0) {
          await adapter.handle({
            name: "read_mcp_resources",
            arguments: JSON.stringify({ uris: task.expectedFallbacks })
          });
        }
      }
      checks.push({ task: task.id, condition: condition.id, passed: true });
    } catch (error) {
      checks.push({
        task: task.id,
        condition: condition.id,
        passed: false,
        failure: error instanceof Error ? error.message : String(error)
      });
    } finally {
      await adapter.close();
    }
  }
  return checks;
}

function oracleTask(task) {
  const { dataset, ...entry } = task;
  return { ...entry, dataset: dataset.id };
}

export async function runRuntimeClosureV2() {
  const tasks = await loadSourceTasks();
  const routeChecks = [];
  const evaluations = [];
  for (const task of tasks) {
    routeChecks.push(...await checkRuntimeClosureRoutes(task));
    const evaluation = task.role === "supported"
      ? await evaluateRuntimeClosureTask(task)
      : { passed: true, failures: [] };
    evaluations.push({ task: task.id, role: task.role, ...evaluation });
  }
  const oracle = {
    schemaVersion: 1,
    id: "compact-runtime-closure-v2",
    packetSchemaVersion: 3,
    productCandidateCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8"
    }).trim(),
    sourceCorpora: ["compact-authoring-repair-v1", "compact-authoring-policy-v1"],
    conditions,
    tasks: tasks.map(oracleTask)
  };
  const oracleBytes = `${JSON.stringify(oracle, null, 2)}\n`;
  return {
    oracle,
    oracleBytes,
    result: {
      schemaVersion: 1,
      id: "compact-runtime-closure-v2-result",
      oracleSha256: sha256(oracleBytes),
      tasks: tasks.length,
      routeChecks: routeChecks.length,
      evaluatorChecks: evaluations.length,
      roles: Object.fromEntries(["supported", "unsupported", "needs-input"].map(value => [
        value,
        tasks.filter(task => task.role === value).length
      ])),
      passed: routeChecks.every(check => check.passed) &&
        evaluations.every(evaluation => evaluation.passed),
      externalCalls: 0,
      credentialReads: 0,
      spendUsd: 0,
      routes: routeChecks,
      evaluations
    }
  };
}

async function writeResult(run) {
  await mkdir(evaluationRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(evaluationRoot, "ROUTE_ORACLE.json"), run.oracleBytes),
    writeFile(path.join(evaluationRoot, "RESULT.json"), `${JSON.stringify(run.result, null, 2)}\n`)
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const run = await runRuntimeClosureV2();
  if (process.argv.includes("--write")) await writeResult(run);
  const output = process.argv.includes("--verbose")
    ? run.result
    : {
        schemaVersion: run.result.schemaVersion,
        id: run.result.id,
        oracleSha256: run.result.oracleSha256,
        tasks: run.result.tasks,
        routeChecks: run.result.routeChecks,
        evaluatorChecks: run.result.evaluatorChecks,
        roles: run.result.roles,
        passed: run.result.passed,
        externalCalls: run.result.externalCalls,
        credentialReads: run.result.credentialReads,
        spendUsd: run.result.spendUsd,
        failures: run.result.evaluations
          .filter(entry => !entry.passed)
          .map(entry => ({ task: entry.task, failures: entry.failures }))
      };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!run.result.passed) process.exitCode = 1;
}
