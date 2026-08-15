import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { inflateSync } from "node:zlib";

import { renderToSVG } from "../src/renderers/svg.js";
import { assertGraphicIntegrity } from "../test/oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../test/oracles/svg-integrity.js";
import { releaseTidyTuesdaySourceCache } from
  "../test/support/datasets/tidytuesday.js";
import {
  runScenario
} from "../test/support/scenarios/engine.js";

const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);
const SAFE_PATH_COMPONENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

let pngDependenciesPromise;
let pdfDependencyPromise;

function pngDependencies() {
  pngDependenciesPromise ??= Promise.all([
    import("@napi-rs/canvas"),
    import("../src/renderers/png.js")
  ]).then(([canvas, png]) => Object.freeze({
    createCanvas: canvas.createCanvas,
    loadImage: canvas.loadImage,
    renderToPNG: png.renderToPNG
  }));
  return pngDependenciesPromise;
}

function pdfDependency() {
  pdfDependencyPromise ??= import("../src/renderers/pdf.js");
  return pdfDependencyPromise;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function serializedError(error) {
  return Object.freeze({
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? String(error)
  });
}

function artifactOutput(task, renderer, extension) {
  const { descriptor } = task;
  for (const [label, value] of [
    ["dataset", descriptor.factors.dataset],
    ["descriptor id", descriptor.id]
  ]) {
    if (typeof value !== "string" || !SAFE_PATH_COMPONENT.test(value)) {
      throw new Error(`Scenario ${label} is not a safe artifact path component.`);
    }
  }
  const root = path.resolve(task.output);
  const output = path.resolve(
    root,
    renderer,
    descriptor.factors.dataset,
    `${descriptor.id}.${extension}`
  );
  const relative = path.relative(root, output);
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Scenario artifact output escaped its run directory.");
  }
  return output;
}

async function decodedPngEvidence(bytes, rendered, label, dependencies) {
  assert.equal(bytes.length >= 24, true, `${label} PNG header length`);
  assert.deepEqual([...bytes.subarray(0, 8)], PNG_SIGNATURE, label);
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR", `${label} PNG IHDR`);
  assert.equal(bytes.readUInt32BE(16), rendered.width, `${label} PNG width`);
  assert.equal(bytes.readUInt32BE(20), rendered.height, `${label} PNG height`);
  const image = await dependencies.loadImage(bytes);
  assert.equal(image.width, rendered.width, `${label} decoded PNG width`);
  assert.equal(image.height, rendered.height, `${label} decoded PNG height`);
  const scale = Math.min(1, 160 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = dependencies.createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const colors = new Set();
  for (let index = 0; index < pixels.length && colors.size < 2; index += 4) {
    colors.add(
      `${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${pixels[index + 3]}`
    );
  }
  assert.equal(colors.size >= 2, true, `${label} PNG is unexpectedly blank`);
  return Object.freeze({
    signature: true,
    dimensions: true,
    decoded: true,
    nonBlankChecked: true,
    nonBlank: true,
    sampleWidth: width,
    sampleHeight: height
  });
}

function decodedPdfStreams(bytes) {
  const source = bytes.toString("latin1");
  return [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/gu)]
    .map(match => {
      const raw = Buffer.from(match[1], "latin1");
      try {
        return inflateSync(raw).toString("latin1");
      } catch {
        return raw.toString("latin1");
      }
    })
    .join("\n");
}

function pdfEvidence(bytes, rendered, label) {
  const source = bytes.toString("latin1");
  assert.equal(source.startsWith("%PDF-"), true, `${label} PDF signature`);
  assert.match(source, /%%EOF\s*$/u, `${label} PDF trailer`);
  assert.match(source, /\/Type\s*\/Page\b/u, `${label} PDF page`);
  assert.equal(
    source.includes(`/MediaBox [0 0 ${rendered.width} ${rendered.height}]`),
    true,
    `${label} PDF MediaBox`
  );
  const content = decodedPdfStreams(bytes);
  assert.match(content, /\bBT\b/u, `${label} PDF text content`);
  assert.match(content, /(?:^|\s)(?:m|l|c|re)(?:\s|$)/u, `${label} PDF drawing content`);
  return Object.freeze({
    signature: true,
    trailer: true,
    page: true,
    dimensions: true,
    textContent: true,
    drawingContent: true
  });
}

async function renderArtifacts(program, descriptor, result, task) {
  const graphic = assertGraphicIntegrity(program, `${descriptor.id} artifact replay`);
  const svg = renderToSVG(program, {
    title: result.metadata?.title ?? descriptor.id,
    description: result.metadata?.analysisQuestion ??
      `Generated ${descriptor.recipe} scenario.`
  });
  assertSvgIntegrity(svg, `${descriptor.id} artifact replay`);
  assert.equal(sha256(svg), result.svgSha256, `${descriptor.id} SVG replay hash`);

  const svgOutput = artifactOutput(task, "svg", "svg");
  const datasetDirectory = path.dirname(svgOutput);
  await mkdir(datasetDirectory, { recursive: true });
  await writeFile(svgOutput, svg, "utf8");
  const artifacts = {
    svg: Object.freeze({
      output: svgOutput,
      bytes: Buffer.byteLength(svg),
      sha256: sha256(svg),
      validation: Object.freeze({ integrity: true, replayHash: true })
    })
  };
  const renderers = new Set(["svg"]);

  if (task.png) {
    const dependencies = await pngDependencies();
    const pngOutput = artifactOutput(task, "png", "png");
    const rendered = await dependencies.renderToPNG(program, {
      output: pngOutput,
      pixelRatio: 1
    });
    const bytes = await readFile(pngOutput);
    const validation = task.visualAudit
      ? await decodedPngEvidence(bytes, rendered, descriptor.id, dependencies)
      : Object.freeze({
          signature: (() => {
            assert.deepEqual([...bytes.subarray(0, 8)], PNG_SIGNATURE, descriptor.id);
            return true;
          })(),
          dimensions: (() => {
            assert.equal(bytes.readUInt32BE(16), rendered.width, descriptor.id);
            assert.equal(bytes.readUInt32BE(20), rendered.height, descriptor.id);
            return true;
          })(),
          decoded: false,
          nonBlankChecked: false
        });
    artifacts.png = Object.freeze({
      ...rendered,
      sha256: sha256(bytes),
      validation
    });
    renderers.add("canvas");
    renderers.add("png");
  }

  if (task.pdf) {
    const { renderToPDF } = await pdfDependency();
    const pdfOutput = artifactOutput(task, "pdf", "pdf");
    const rendered = await renderToPDF(program, {
      output: pdfOutput,
      metadata: {
        title: result.metadata?.title ?? descriptor.id,
        author: "ggaction realistic scenario corpus",
        subject: result.metadata?.analysisQuestion ?? descriptor.recipe,
        keywords: ["ggaction", "TidyTuesday", descriptor.factors.dataset]
      }
    });
    const bytes = await readFile(pdfOutput);
    const validation = pdfEvidence(bytes, rendered, descriptor.id);
    artifacts.pdf = Object.freeze({
      ...rendered,
      sha256: sha256(bytes),
      validation
    });
    renderers.add("pdf");
  }

  return Object.freeze({
    graphic,
    artifacts: Object.freeze(artifacts),
    renderers: Object.freeze([...renderers])
  });
}

let activeDataset;

export async function executeRealisticScenarioTask(task) {
  try {
    if (activeDataset !== undefined && activeDataset !== task.descriptor.factors.dataset) {
      releaseTidyTuesdaySourceCache(activeDataset);
    }
    activeDataset = task.descriptor.factors.dataset;
    let program;
    const result = runScenario(task.descriptor, {
      deterministic: task.deterministic,
      captureProgram(value) {
        program = value;
      }
    });
    const artifactResult = task.artifacts
      ? await renderArtifacts(program, task.descriptor, result, task)
      : Object.freeze({
          artifacts: Object.freeze({}),
          renderers: Object.freeze(["svg"])
        });
    return Object.freeze({
      ok: true,
      index: task.index,
      result: Object.freeze({
        ...result,
        renderers: artifactResult.renderers,
        artifacts: artifactResult.artifacts
      })
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      index: task.index,
      error: serializedError(error)
    });
  }
}

function resourceSnapshot(started, maximumRssBytes) {
  const rssBytes = process.memoryUsage().rss;
  return Object.freeze({
    rssBytes,
    maximumRssBytes: Math.max(
      maximumRssBytes,
      rssBytes,
      process.resourceUsage().maxRSS * 1_024
    ),
    wallTimeMs: performance.now() - started
  });
}

function sendToParent(message) {
  return new Promise((resolve, reject) => {
    if (typeof process.send !== "function") {
      reject(new Error("Realistic scenario execution child requires an IPC channel."));
      return;
    }
    process.send(message, error => {
      if (error === null || error === undefined) resolve();
      else reject(error);
    });
  });
}

async function executeDatasetMessage(message) {
  const started = performance.now();
  let maximumRssBytes = process.memoryUsage().rss;
  const sampleRss = () => {
    maximumRssBytes = Math.max(maximumRssBytes, process.memoryUsage().rss);
  };
  const sampler = setInterval(sampleRss, 10);
  sampler.unref?.();
  try {
    if (
      message?.kind !== "dataset" || typeof message.dataset !== "string" ||
      !Array.isArray(message.tasks) || message.tasks.length === 0 ||
      message.tasks.some(task =>
        task?.descriptor?.factors?.dataset !== message.dataset
      )
    ) {
      throw new TypeError("Realistic scenario execution child received invalid tasks.");
    }
    for (const task of message.tasks) {
      let outcome = await executeRealisticScenarioTask(task);
      sampleRss();
      await sendToParent({
        kind: "outcome",
        dataset: message.dataset,
        outcome,
        resources: resourceSnapshot(started, maximumRssBytes)
      });
      outcome = undefined;
      globalThis.gc?.();
      sampleRss();
    }
    if (activeDataset !== undefined) {
      releaseTidyTuesdaySourceCache(activeDataset);
      activeDataset = undefined;
    }
    globalThis.gc?.();
    sampleRss();
    await sendToParent({
      kind: "resources",
      dataset: message.dataset,
      resources: resourceSnapshot(started, maximumRssBytes)
    });
  } finally {
    clearInterval(sampler);
  }
}

if (typeof process.send === "function") {
  process.once("message", async message => {
    try {
      await executeDatasetMessage(message);
    } catch (error) {
      await sendToParent({ kind: "fatal", error: serializedError(error) }).catch(() => {});
      process.exitCode = 1;
    } finally {
      process.disconnect?.();
    }
  });
}
