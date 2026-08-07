import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import { root } from "./action-knowledge.js";
import {
  captureProgramWorkflow,
  evaluatePreparedProgram
} from "./llm-eval/program-evaluator.js";
import { scoreEvaluationEvidence } from "./llm-eval/score.js";
import { recipeTaskPrograms } from "../test/llm/recipe-task-programs.js";
import {
  loadCars,
  loadGapminder,
  loadImdbSelected,
  loadJobs,
  loadNightingaleRose
} from "../test/support/data.js";

const corpusFile = path.join(root, "test/llm/tasks.json");
export const defaultRecipeTaskArtifactRoot = path.join(root, ".artifacts/llm-eval/recipe-task-programs");

function datasets() {
  return Object.freeze({
    cars: loadCars(),
    jobs: loadJobs(),
    gapminder: loadGapminder(),
    nightingale: loadNightingaleRose(),
    imdb: loadImdbSelected()
  });
}

function relative(file) {
  return path.relative(root, file);
}

async function createContactSheet(results, split, artifactRoot) {
  const entries = results.filter(result => result.split === split);
  const columns = 3;
  const rows = Math.ceil(entries.length / columns);
  const cardWidth = 400;
  const cardHeight = 310;
  const headerHeight = 66;
  const gap = 18;
  const padding = 24;
  const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = padding * 2 + rows * cardHeight + (rows - 1) * gap;
  const sheet = createCanvas(width, height);
  const context = sheet.getContext("2d");
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);

  for (const [index, entry] of entries.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = padding + column * (cardWidth + gap);
    const y = padding + row * (cardHeight + gap);
    context.fillStyle = "#ffffff";
    context.fillRect(x, y, cardWidth, cardHeight);
    context.strokeStyle = "#dbe4ee";
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, cardWidth - 1, cardHeight - 1);
    context.fillStyle = "#0f172a";
    context.font = "600 16px sans-serif";
    context.fillText(entry.taskId, x + 16, y + 25);
    context.fillStyle = "#64748b";
    context.font = "12px sans-serif";
    context.fillText(`recipe: ${entry.recipeId}`, x + 16, y + 46);

    const image = await loadImage(path.join(root, entry.canvasPNG));
    const availableWidth = cardWidth - 24;
    const availableHeight = cardHeight - headerHeight - 12;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    context.drawImage(
      image,
      x + (cardWidth - imageWidth) / 2,
      y + headerHeight + (availableHeight - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
  }

  const output = path.join(artifactRoot, `${split}-contact-sheet.png`);
  await writeFile(output, sheet.toBuffer("image/png"));
  return output;
}

async function createRendererParitySheet(results, artifactRoot) {
  const entry = results.find(result => result.taskId === "renderer-parity");
  if (entry === undefined) throw new Error("Renderer parity task evidence is missing.");
  const files = Object.fromEntries(entry.rendererFiles.map(file => [path.extname(file), path.join(root, file)]));
  const pdfRasterPrefix = path.join(artifactRoot, "renderer-parity-pdf");
  const rendered = spawnSync("pdftoppm", [
    "-png",
    "-r",
    "144",
    "-singlefile",
    files[".pdf"],
    pdfRasterPrefix
  ], { encoding: "utf8" });
  if (rendered.status !== 0) {
    throw new Error(`PDF visual rendering failed: ${rendered.stderr || rendered.error?.message || "unknown error"}`);
  }
  const variants = [
    ["Canvas", path.join(root, entry.canvasPNG)],
    ["SVG", files[".svg"]],
    ["PNG (2x)", files[".png"]],
    ["PDF (vector)", `${pdfRasterPrefix}.png`]
  ];
  const cardWidth = 330;
  const cardHeight = 300;
  const gap = 18;
  const padding = 24;
  const sheet = createCanvas(padding * 2 + variants.length * cardWidth + (variants.length - 1) * gap, cardHeight + padding * 2);
  const context = sheet.getContext("2d");
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, sheet.width, sheet.height);
  for (const [index, [label, file]] of variants.entries()) {
    const x = padding + index * (cardWidth + gap);
    context.fillStyle = "#ffffff";
    context.fillRect(x, padding, cardWidth, cardHeight);
    context.strokeStyle = "#dbe4ee";
    context.strokeRect(x + 0.5, padding + 0.5, cardWidth - 1, cardHeight - 1);
    context.fillStyle = "#0f172a";
    context.font = "600 16px sans-serif";
    context.fillText(label, x + 16, padding + 26);
    const image = await loadImage(file);
    const availableWidth = cardWidth - 24;
    const availableHeight = cardHeight - 58;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    context.drawImage(
      image,
      x + (cardWidth - imageWidth) / 2,
      padding + 46 + (availableHeight - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
  }
  const output = path.join(artifactRoot, "renderer-parity-contact-sheet.png");
  await writeFile(output, sheet.toBuffer("image/png"));
  return output;
}

export async function verifyRecipeTaskPrograms({ artifactRoot = defaultRecipeTaskArtifactRoot } = {}) {
  const corpus = JSON.parse(await readFile(corpusFile, "utf8"));
  const actionIndex = JSON.parse(await readFile(path.join(root, "agent_docs/contract/ACTION_INDEX.json"), "utf8"));
  const actionNames = actionIndex.actions.map(action => action.name);
  const data = datasets();
  const results = [];
  await mkdir(artifactRoot, { recursive: true });

  if (Object.keys(recipeTaskPrograms).length !== corpus.tasks.length) {
    throw new Error(`Recipe task inventory has ${Object.keys(recipeTaskPrograms).length} programs for ${corpus.tasks.length} tasks.`);
  }

  for (const task of corpus.tasks) {
    const definition = recipeTaskPrograms[task.id];
    if (definition === undefined) throw new Error(`${task.id}: missing recipe-backed task program.`);
    const taskRoot = path.join(artifactRoot, task.id);
    const captured = await captureProgramWorkflow(() => definition.createProgram(data), actionNames);
    const evaluation = await evaluatePreparedProgram({
      program: captured.program,
      task,
      artifactRoot: taskRoot,
      runtimeFunctions: definition.runtimeFunctions,
      workflowActions: captured.actions
    });
    const score = scoreEvaluationEvidence(task, evaluation);
    const canvasFile = evaluation.artifacts.rendererFiles.find(file => path.basename(file) === "canvas.png");
    const result = Object.freeze({
      taskId: task.id,
      split: task.split,
      recipeId: definition.recipeId,
      valid: score.valid,
      failures: score.failures,
      actions: evaluation.actions,
      validations: evaluation.validations,
      renderers: evaluation.renderers,
      canvasPNG: canvasFile === undefined ? null : relative(canvasFile),
      rendererFiles: evaluation.artifacts.rendererFiles.map(relative)
    });
    results.push(result);
    if (!score.valid) {
      process.stderr.write(`${task.id}: ${score.failures.join(", ")}\n`);
    }
  }

  const contactSheets = await Promise.all([
    createContactSheet(results, "authoring", artifactRoot),
    createContactSheet(results, "heldout", artifactRoot),
    createRendererParitySheet(results, artifactRoot)
  ]);
  const manifest = Object.freeze({
    schemaVersion: 1,
    total: results.length,
    successful: results.filter(result => result.valid).length,
    splits: Object.freeze(Object.fromEntries(["authoring", "heldout"].map(split => {
      const splitResults = results.filter(result => result.split === split);
      return [split, Object.freeze({
        total: splitResults.length,
        successful: splitResults.filter(result => result.valid).length
      })];
    }))),
    contactSheets: Object.freeze(contactSheets.map(relative)),
    results: Object.freeze(results)
  });
  await writeFile(path.join(artifactRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (manifest.successful !== manifest.total) {
    throw new Error(`Recipe-backed offline tasks passed ${manifest.successful}/${manifest.total}.`);
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifest = await verifyRecipeTaskPrograms();
  process.stdout.write(`${JSON.stringify({
    tasks: `${manifest.successful}/${manifest.total}`,
    authoring: `${manifest.splits.authoring.successful}/${manifest.splits.authoring.total}`,
    heldout: `${manifest.splits.heldout.successful}/${manifest.splits.heldout.total}`,
    artifactRoot: relative(defaultRecipeTaskArtifactRoot)
  })}\n`);
}
