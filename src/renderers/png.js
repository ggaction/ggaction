import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createCanvas } from "@napi-rs/canvas";

import { render } from "./canvas.js";

export async function renderToPNG(program, { output, pixelRatio = 1 } = {}) {
  if (typeof output !== "string" || output.length === 0) {
    throw new TypeError("renderToPNG requires a non-empty output path.");
  }

  const canvas = createCanvas(1, 1);
  const context = canvas.getContext("2d");
  render(program, context, { pixelRatio });

  const path = resolve(output);
  const buffer = canvas.toBuffer("image/png");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);

  return Object.freeze({
    output: path,
    width: canvas.width,
    height: canvas.height,
    pixelRatio,
    bytes: buffer.length
  });
}
