import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { root } from "./compact-paid-smoke-v4.js";

const execFile = promisify(execFileCallback);
const harness = path.join(root, "scripts", "run-compact-full-generated-program.js");
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
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
  if (!/\bexport\s+(?:async\s+)?function\s+renderChart\s*\(/u.test(source)) {
    throw new Error("Submitted source must export function renderChart.");
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
  const composition = task.expectedPlan.findLast(entry =>
    entry.kind === "runtime" && ["hconcat", "vconcat"].includes(entry.name)
  );
  if (composition) return [composition.name];
  return task.expectedPlan
    .filter(entry => entry.kind === "action")
    .map(entry => entry.name)
    .filter(name => !["createCanvas", "createData"].includes(name));
}

function collectScaleReferences(value, output) {
  if (Array.isArray(value)) {
    for (const entry of value) collectScaleReferences(entry, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "scale" && typeof entry === "string") output.add(entry);
    else collectScaleReferences(entry, output);
  }
}

function semanticResourceFailures(program, location = "root") {
  const failures = [];
  const semantic = program.semanticSpec;
  if (semantic) {
    const datasetConsumers = new Set([
      ...(semantic.layers ?? []).map(layer => layer.data).filter(Boolean),
      ...(semantic.datasets ?? []).map(dataset => dataset.source).filter(Boolean)
    ]);
    for (const dataset of semantic.datasets ?? []) {
      if (dataset.source !== undefined && !datasetConsumers.has(dataset.id)) {
        failures.push(`unused-derived-dataset:${location}:${dataset.id}`);
      }
    }
    const scaleReferences = new Set();
    for (const layer of semantic.layers ?? []) {
      collectScaleReferences(layer.encoding, scaleReferences);
    }
    collectScaleReferences(semantic.guides, scaleReferences);
    for (const scale of semantic.scales ?? []) {
      if (!scaleReferences.has(scale.id)) failures.push(`unused-scale:${location}:${scale.id}`);
    }
  }
  for (const [id, child] of Object.entries(program.children ?? {})) {
    failures.push(...semanticResourceFailures(child, `${location}/${id}`));
  }
  return failures;
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

function outputExtension(renderer) {
  if (renderer === "svg") return "svg";
  if (renderer === "pdf") return "pdf";
  return "png";
}

async function executeGeneratedProgram({ artifactRoot, programFile, task }) {
  const datasetFile = path.join(artifactRoot, "dataset.json");
  const resultFile = path.join(artifactRoot, "execution.json");
  const outputFile = path.join(artifactRoot, `chart.${outputExtension(task.expectedRenderer)}`);
  await writeFile(datasetFile, `${JSON.stringify(task.dataset.values)}\n`);
  try {
    await execFile(process.execPath, [
      "--experimental-permission",
      "--allow-addons",
      "--max-old-space-size=128",
      `--allow-fs-read=${harness}`,
      `--allow-fs-read=${path.join(root, "package.json")}`,
      `--allow-fs-read=${path.join(root, "src")}`,
      `--allow-fs-read=${path.join(root, "node_modules")}`,
      `--allow-fs-read=${artifactRoot}`,
      `--allow-fs-write=${artifactRoot}`,
      harness,
      programFile,
      datasetFile,
      resultFile,
      task.expectedRenderer,
      outputFile
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
  return {
    execution: JSON.parse(await readFile(resultFile, "utf8")),
    output: await readFile(outputFile)
  };
}

function validOutput(renderer, output) {
  if (renderer === "svg") return output.toString("utf8").startsWith("<svg");
  if (renderer === "pdf") return output.subarray(0, 5).toString("ascii") === "%PDF-";
  return output.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
}

async function evaluateProgramSubmission({ submission, task, artifactRoot }) {
  const failures = [];
  try {
    validateGeneratedSource(submission.source);
    await mkdir(artifactRoot, { recursive: true });
    const programFile = path.join(artifactRoot, "program.mjs");
    await writeFile(programFile, submission.source);
    const { execution, output } = await executeGeneratedProgram({ artifactRoot, programFile, task });
    const program = execution.program;
    if (!program?.semanticSpec || !program?.graphicSpec || !program?.trace) {
      throw new Error("buildChart did not return a ChartProgram.");
    }
    if (!containsSourceDataset(program, task.dataset.values)) {
      failures.push("source-dataset-mismatch");
    }
    failures.push(...semanticResourceFailures(program));
    const actualActions = (program.trace.children ?? [])
      .map(node => node.op)
      .filter(name => !["createCanvas", "createData"].includes(name));
    const expectedActions = expectedActionNames(task);
    if (!same(actualActions, expectedActions)) {
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
      sourceSha256: sha256(submission.source),
      sourceBytes: Buffer.byteLength(submission.source, "utf8"),
      outputBytes: output.length
    };
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { passed: false, failures };
  }
}

export async function evaluateFullSubmissionV1({ submission, task, artifactRoot }) {
  const failures = [];
  if (submission.renderer !== task.expectedRenderer) {
    failures.push(`renderer-mismatch:${submission.renderer}`);
  }
  if (!same(submission.unsupported, task.expectedUnsupported)) {
    failures.push(`unsupported-mismatch:${JSON.stringify(submission.unsupported)}`);
  }
  if (!same(submission.unresolved, task.expectedUnresolved)) {
    failures.push(`unresolved-mismatch:${JSON.stringify(submission.unresolved)}`);
  }
  const expectedStatus = task.role === "supported" ? "program" : task.role;
  if (submission.status !== expectedStatus) failures.push(`status-mismatch:${submission.status}`);

  if (task.role !== "supported") {
    if (submission.source !== null) failures.push("non-program-task-invented-source");
    return { passed: failures.length === 0, failures };
  }
  if (submission.unsupported.length !== 0) failures.push("supported-task-reported-unsupported");
  if (submission.unresolved.length !== 0) failures.push("supported-task-reported-unresolved");
  if (failures.length > 0) return { passed: false, failures };
  return evaluateProgramSubmission({ submission, task, artifactRoot });
}
