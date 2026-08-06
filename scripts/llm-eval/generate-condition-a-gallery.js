import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";

const root = fileURLToPath(new URL("../../", import.meta.url));
const artifactRoot = path.join(root, ".artifacts/llm-eval/condition-a");
const defaultOutput = path.join(root, "agent_docs/impl/roadmap5.3/phase0/CURRENT_DOCS_BASELINE_GALLERY.png");

const examples = [
  ["A-cars-scatter-origin-r1", "Scatterplot"],
  ["A-cars-binned-heatmap-r1", "Binned heatmap"],
  ["A-cars-violin-r1", "Violin plot"],
  ["A-gapminder-horizon-r1", "Horizon chart"],
  ["A-nightingale-rose-r1", "Rose chart"],
  ["A-renderer-parity-r1", "Renderer parity"]
];

export async function generateConditionAGallery(output = defaultOutput) {
  const cardWidth = 640;
  const imageHeight = 400;
  const labelHeight = 52;
  const gap = 24;
  const padding = 32;
  const columns = 3;
  const rows = Math.ceil(examples.length / columns);
  const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = padding * 2 + rows * (imageHeight + labelHeight) + (rows - 1) * gap;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  context.fillStyle = "#f7f5f0";
  context.fillRect(0, 0, width, height);
  context.font = "600 22px sans-serif";
  context.textBaseline = "middle";

  for (const [index, [runId, label]] of examples.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = padding + column * (cardWidth + gap);
    const y = padding + row * (imageHeight + labelHeight + gap);
    const image = await loadImage(path.join(artifactRoot, runId, "canvas.png"));

    context.fillStyle = "#ffffff";
    context.fillRect(x, y, cardWidth, imageHeight + labelHeight);
    context.drawImage(image, x, y, cardWidth, imageHeight);
    context.fillStyle = "#28231f";
    context.fillText(label, x + 18, y + imageHeight + labelHeight / 2);
  }

  await writeFile(output, canvas.toBuffer("image/png"));
  return { output, width, height, examples: examples.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await generateConditionAGallery(), null, 2)}\n`);
}
