import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCanvas } from "@napi-rs/canvas";
import gifenc from "gifenc";
import { render } from "ggaction";

import {
  createReadmeAuthoringDemo,
  README_ACTION_LINES
} from "../examples/readme-authoring-sequence/program.js";

const { applyPalette, GIFEncoder, quantize } = gifenc;

export const README_DEMO_WIDTH = 960;
export const README_DEMO_HEIGHT = 540;
export const README_DEMO_DURATION_MS = 15000;
export const README_DEMO_MAX_BYTES = 5 * 1024 * 1024;

const CHART_PANEL_WIDTH = 556;
const CODE_PANEL_X = CHART_PANEL_WIDTH;
const CHART_X = 8;
const CHART_Y = 55;
const CHART_WIDTH = 540;
const CHART_HEIGHT = 430;
const GIF_COLORS = 256;
const FIRST_CHART_ACTION_INDEX = README_ACTION_LINES.findIndex(
  actionLine => actionLine.id === "size"
);
const GIF_OUTPUT = new URL(
  "../docs/assets/images/readme-authoring-sequence.gif",
  import.meta.url
);
const PNG_OUTPUT = new URL(
  "../docs/assets/images/readme-authoring-sequence.png",
  import.meta.url
);

function drawActionPanel(context, stage) {
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = "600 14px monospace";
  context.fillStyle = "#7c3aed";
  const codeX = CODE_PANEL_X + 27;
  context.fillText("const", codeX, 68);
  const keywordWidth = context.measureText("const").width;
  context.fillStyle = "#334155";
  context.fillText(" program = ", codeX + keywordWidth, 68);
  const assignmentWidth = context.measureText(" program = ").width;
  context.fillStyle = "#2563eb";
  context.fillText("chart", codeX + keywordWidth + assignmentWidth, 68);
  const chartWidth = context.measureText("chart").width;
  context.fillStyle = "#64748b";
  context.fillText("()", codeX + keywordWidth + assignmentWidth + chartWidth, 68);

  const firstY = 100;
  const lineHeight = 25;
  for (const [index, actionLine] of README_ACTION_LINES.entries()) {
    const y = firstY + (index * lineHeight);
    const active = index === stage.actionIndex;
    const complete = index < stage.actionIndex;

    const match = actionLine.code.match(/^(\.)([A-Za-z]+)(.*)$/);
    const punctuation = active ? "#c65d00" : complete ? "#64748b" : "#cbd5e1";
    const method = active ? "#c65d00" : complete ? "#2563eb" : "#94a3b8";
    context.font = `${active ? 700 : 500} 14px monospace`;
    context.fillStyle = method;
    const chainStart = `  .${match[2]}`;
    context.fillText(chainStart, CODE_PANEL_X + 27, y + 1);
    context.fillStyle = punctuation;
    const methodWidth = context.measureText(chainStart).width;
    context.fillText(match[3], CODE_PANEL_X + 27 + methodWidth, y + 1);
  }
}

function drawChartPanel(context, stage, chartCanvas) {
  context.drawImage(chartCanvas, CHART_X, CHART_Y, CHART_WIDTH, CHART_HEIGHT);
  if (stage.actionIndex < FIRST_CHART_ACTION_INDEX) {
    context.fillStyle = "#94a3b8";
    context.font = "500 13px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      "Chart appears after x · y · size",
      CHART_PANEL_WIDTH / 2,
      README_DEMO_HEIGHT / 2
    );
  }
}

function renderChart(program) {
  const canvas = createCanvas(1, 1);
  render(program, canvas.getContext("2d"));
  if (canvas.width !== CHART_WIDTH || canvas.height !== CHART_HEIGHT) {
    throw new Error(
      `README chart rendered at ${canvas.width}×${canvas.height}; expected ` +
      `${CHART_WIDTH}×${CHART_HEIGHT}.`
    );
  }
  return canvas;
}

function createFrames(stages) {
  let chartCanvas;
  return stages.map(stage => {
    if (stage.renderable) chartCanvas = renderChart(stage.program);
    if (chartCanvas === undefined) {
      throw new Error(`Stage "${stage.id}" has no valid chart frame.`);
    }
    const frame = createCanvas(README_DEMO_WIDTH, README_DEMO_HEIGHT);
    const context = frame.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, README_DEMO_WIDTH, README_DEMO_HEIGHT);
    drawChartPanel(context, stage, chartCanvas);
    drawActionPanel(context, stage);
    return Object.freeze({ stage, frame });
  });
}

function globalPalette(frames) {
  const framePixels = frames.map(({ frame }) => frame
    .getContext("2d")
    .getImageData(0, 0, README_DEMO_WIDTH, README_DEMO_HEIGHT)
    .data);
  const pixels = new Uint8Array(
    framePixels.reduce((length, frame) => length + frame.length, 0)
  );
  let offset = 0;
  for (const frame of framePixels) {
    pixels.set(frame, offset);
    offset += frame.length;
  }
  return { framePixels, palette: quantize(pixels, GIF_COLORS) };
}

function encodeGif(frames) {
  const { framePixels, palette } = globalPalette(frames);
  const gif = GIFEncoder();
  for (const [index, { stage }] of frames.entries()) {
    const indexed = applyPalette(framePixels[index], palette);
    gif.writeFrame(indexed, README_DEMO_WIDTH, README_DEMO_HEIGHT, {
      ...(index === 0 ? { palette, repeat: 0 } : {}),
      delay: stage.delayMs
    });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

function skipSubBlocks(bytes, start) {
  let offset = start;
  while (offset < bytes.length) {
    const length = bytes[offset];
    offset += 1;
    if (length === 0) return offset;
    offset += length;
  }
  throw new Error("GIF contains an unterminated data block.");
}

export function inspectReadmeGif(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const signature = String.fromCharCode(...data.subarray(0, 6));
  if (signature !== "GIF89a" && signature !== "GIF87a") {
    throw new Error("README GIF has an invalid signature.");
  }
  const width = data[6] | (data[7] << 8);
  const height = data[8] | (data[9] << 8);
  const packed = data[10];
  let offset = 13;
  if ((packed & 0x80) !== 0) {
    offset += 3 * (2 ** ((packed & 0x07) + 1));
  }
  let pendingDelay = 0;
  const delays = [];
  while (offset < data.length) {
    const introducer = data[offset];
    offset += 1;
    if (introducer === 0x3b) break;
    if (introducer === 0x21) {
      const label = data[offset];
      offset += 1;
      if (label === 0xf9) {
        const blockSize = data[offset];
        if (blockSize !== 4) throw new Error("GIF has an invalid control block.");
        pendingDelay = (data[offset + 2] | (data[offset + 3] << 8)) * 10;
      }
      offset = skipSubBlocks(data, offset);
      continue;
    }
    if (introducer !== 0x2c) {
      throw new Error(`GIF contains unknown block 0x${introducer.toString(16)}.`);
    }
    const imagePacked = data[offset + 8];
    offset += 9;
    if ((imagePacked & 0x80) !== 0) {
      offset += 3 * (2 ** ((imagePacked & 0x07) + 1));
    }
    offset += 1;
    offset = skipSubBlocks(data, offset);
    delays.push(pendingDelay);
    pendingDelay = 0;
  }
  return Object.freeze({
    width,
    height,
    frameCount: delays.length,
    durationMs: delays.reduce((sum, delay) => sum + delay, 0),
    delays: Object.freeze(delays)
  });
}

export function inspectReadmePng(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => data[index] === value)) {
    throw new Error("README PNG has an invalid signature.");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return Object.freeze({
    width: view.getUint32(16),
    height: view.getUint32(20)
  });
}

function validateOutputs(gifBytes, pngBytes, expectedFrames) {
  if (gifBytes.length === 0 || pngBytes.length === 0) {
    throw new Error("README demo outputs must not be empty.");
  }
  if (gifBytes.length > README_DEMO_MAX_BYTES) {
    throw new Error(`README GIF exceeds ${README_DEMO_MAX_BYTES} bytes.`);
  }
  const gif = inspectReadmeGif(gifBytes);
  const png = inspectReadmePng(pngBytes);
  for (const image of [gif, png]) {
    if (image.width !== README_DEMO_WIDTH || image.height !== README_DEMO_HEIGHT) {
      throw new Error("README demo output dimensions are invalid.");
    }
  }
  if (gif.frameCount !== expectedFrames) {
    throw new Error(
      `README GIF has ${gif.frameCount} frames; expected ${expectedFrames}.`
    );
  }
  if (gif.durationMs !== README_DEMO_DURATION_MS) {
    throw new Error(
      `README GIF duration is ${gif.durationMs}ms; expected ` +
      `${README_DEMO_DURATION_MS}ms.`
    );
  }
  return { gif, png };
}

export async function generateReadmeDemoAssets() {
  const cars = JSON.parse(await readFile(
    new URL("../data/cars.json", import.meta.url),
    "utf8"
  ));
  const { stages } = createReadmeAuthoringDemo(cars);
  const frames = createFrames(stages);
  const gifBytes = encodeGif(frames);
  const pngBytes = frames.at(-1).frame.toBuffer("image/png");
  const inspected = validateOutputs(gifBytes, pngBytes, frames.length);
  const gifPath = fileURLToPath(GIF_OUTPUT);
  const pngPath = fileURLToPath(PNG_OUTPUT);
  await mkdir(dirname(gifPath), { recursive: true });
  await Promise.all([
    writeFile(gifPath, gifBytes),
    writeFile(pngPath, pngBytes)
  ]);

  process.stdout.write(
    `generated ${inspected.gif.width}×${inspected.gif.height} README GIF · ` +
    `${inspected.gif.frameCount} frames · ${inspected.gif.durationMs}ms · ` +
    `${gifBytes.length} bytes\n${gifPath}\n`
  );
  process.stdout.write(
    `generated ${inspected.png.width}×${inspected.png.height} README PNG · ` +
    `${pngBytes.length} bytes\n${pngPath}\n`
  );
  return Object.freeze({
    ...inspected,
    gifBytes: gifBytes.length,
    pngBytes: pngBytes.length,
    gifPath,
    pngPath
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateReadmeDemoAssets();
}
