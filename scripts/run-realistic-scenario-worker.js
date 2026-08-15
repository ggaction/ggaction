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

export async function decodedPngEvidence(bytes, rendered, label, dependencies) {
  assert.equal(bytes.length >= 24, true, `${label} PNG header length`);
  assert.deepEqual([...bytes.subarray(0, 8)], PNG_SIGNATURE, label);
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR", `${label} PNG IHDR`);
  assert.equal(bytes.readUInt32BE(16), rendered.width, `${label} PNG width`);
  assert.equal(bytes.readUInt32BE(20), rendered.height, `${label} PNG height`);
  const image = await dependencies.loadImage(bytes);
  assert.equal(image.width, rendered.width, `${label} decoded PNG width`);
  assert.equal(image.height, rendered.height, `${label} decoded PNG height`);
  const width = Math.min(256, image.width);
  const height = Math.min(256, image.height);
  const canvas = dependencies.createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  let referenceColor;
  let nonBlank = false;
  let scannedPixels = 0;
  let scannedTiles = 0;
  scan: for (let y = 0; y < image.height; y += height) {
    for (let x = 0; x < image.width; x += width) {
      const tileWidth = Math.min(width, image.width - x);
      const tileHeight = Math.min(height, image.height - y);
      context.clearRect(0, 0, width, height);
      context.drawImage(
        image,
        x,
        y,
        tileWidth,
        tileHeight,
        0,
        0,
        tileWidth,
        tileHeight
      );
      const pixels = context.getImageData(0, 0, tileWidth, tileHeight).data;
      scannedTiles += 1;
      scannedPixels += tileWidth * tileHeight;
      for (let index = 0; index < pixels.length; index += 4) {
        referenceColor ??= Object.freeze([
          pixels[index],
          pixels[index + 1],
          pixels[index + 2],
          pixels[index + 3]
        ]);
        if (
          pixels[index] !== referenceColor[0] ||
          pixels[index + 1] !== referenceColor[1] ||
          pixels[index + 2] !== referenceColor[2] ||
          pixels[index + 3] !== referenceColor[3]
        ) {
          nonBlank = true;
          break scan;
        }
      }
    }
  }
  assert.equal(nonBlank, true, `${label} PNG is unexpectedly blank`);
  return Object.freeze({
    signature: true,
    dimensions: true,
    decoded: true,
    nonBlankChecked: true,
    nonBlank: true,
    sampleWidth: width,
    sampleHeight: height,
    nativePixelScan: true,
    scannedPixels,
    scannedTiles
  });
}

function pdfDictionaryBeforeStream(source, streamIndex) {
  let dictionaryEnd = streamIndex;
  while (/\s/u.test(source[dictionaryEnd - 1] ?? "")) dictionaryEnd -= 1;
  if (source.slice(dictionaryEnd - 2, dictionaryEnd) !== ">>") return undefined;
  const tokens = [...source.slice(0, dictionaryEnd).matchAll(/<<|>>/gu)];
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token[0] === ">>") depth += 1;
    else depth -= 1;
    if (depth === 0) return source.slice(token.index, dictionaryEnd);
  }
  return undefined;
}

function pdfNumericObjects(source) {
  const values = new Map();
  for (const match of source.matchAll(
    /(?:^|[\r\n])\s*(\d+)\s+(\d+)\s+obj\s+(\d+)\s+endobj\b/gu
  )) {
    values.set(`${match[1]}:${match[2]}`, Number(match[3]));
  }
  return values;
}

function pdfStreamLength(dictionary, numericObjects) {
  const match = dictionary.match(/\/Length\s+(\d+)(?:\s+(\d+)\s+R)?\b/u);
  if (match === null) return undefined;
  if (match[2] !== undefined) return numericObjects.get(`${match[1]}:${match[2]}`);
  return Number(match[1]);
}

function decodedPdfStreams(bytes) {
  const source = bytes.toString("latin1");
  const numericObjects = pdfNumericObjects(source);
  const streams = [];
  for (const match of source.matchAll(/\bstream(?:\r\n|\n|\r)/gu)) {
    const dictionary = pdfDictionaryBeforeStream(source, match.index);
    if (dictionary === undefined) continue;
    const length = pdfStreamLength(dictionary, numericObjects);
    if (!Number.isSafeInteger(length) || length < 0) continue;
    const start = match.index + match[0].length;
    const end = start + length;
    if (end > bytes.length) continue;
    if (!/^(?:\r\n|\n|\r)?endstream\b/u.test(source.slice(end, end + 16))) {
      continue;
    }
    let decoded = bytes.subarray(start, end);
    const hasFilter = /\/Filter\b/u.test(dictionary);
    const hasFlateFilter = /\/Filter\s*(?:\/FlateDecode|\[\s*\/FlateDecode\s*\])/u
      .test(dictionary);
    if (hasFilter && !hasFlateFilter) continue;
    if (hasFlateFilter) decoded = inflateSync(decoded);
    streams.push(decoded.toString("latin1"));
  }
  return streams;
}

export function pdfEvidence(bytes, rendered, label) {
  const source = bytes.toString("latin1");
  assert.equal(source.startsWith("%PDF-"), true, `${label} PDF signature`);
  assert.match(source, /%%EOF\s*$/u, `${label} PDF trailer`);
  assert.match(source, /\/Type\s*\/Page\b/u, `${label} PDF page`);
  assert.equal(
    source.includes(`/MediaBox [0 0 ${rendered.width} ${rendered.height}]`),
    true,
    `${label} PDF MediaBox`
  );
  const streams = decodedPdfStreams(bytes);
  const content = streams.join("\n");
  const textObjects = [...content.matchAll(/\bBT\b([\s\S]*?)\bET\b/gu)];
  assert.equal(textObjects.length > 0, true, `${label} PDF text content`);
  assert.equal(
    textObjects.some(match =>
      /(?:\([^)]*\)|<[0-9A-Fa-f\s]+>|\[[^\]]*\])\s*(?:Tj|TJ)\b/u.test(match[1])
    ),
    true,
    `${label} PDF text show content`
  );
  assert.match(content, /(?:^|\s)(?:m|l|c|re)(?:\s|$)/u, `${label} PDF drawing content`);
  return Object.freeze({
    signature: true,
    trailer: true,
    page: true,
    dimensions: true,
    textContent: true,
    textShowContent: true,
    drawingContent: true,
    decodedStreamCount: streams.length,
    textObjectCount: textObjects.length
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
