import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNG } from "ggaction/png";

import { ensureRoadmap2VariantMetadata } from "./artifact-metadata.js";
import { resolvePngArtifactPath } from "./artifact-paths.js";

const signature = [137, 80, 78, 71, 13, 10, 26, 10];

function parseHex(color) {
  const value = color.replace(/^#/, "");
  return [0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
}

export async function assertRenderedPNG(
  program,
  {
    name,
    artifact,
    width,
    height,
    pixelRatio = 2,
    colors = ["#4c78a8"],
    minimumInkPixels = 100
  }
) {
  const output = resolvePngArtifactPath({ name, artifact });
  if (artifact !== undefined) {
    await ensureRoadmap2VariantMetadata(artifact);
  }
  const result = await renderToPNG(program, { output, pixelRatio });
  const png = await readFile(result.output);

  assert.deepEqual([...png.subarray(0, 8)], signature);
  assert.equal(result.width, width * pixelRatio);
  assert.equal(result.height, height * pixelRatio);
  assert.equal(png.readUInt32BE(16), width * pixelRatio);
  assert.equal(png.readUInt32BE(20), height * pixelRatio);
  assert.equal(result.pixelRatio, pixelRatio);

  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  let inkPixels = 0;
  const colorCounts = new Map(colors.map(color => [color, 0]));

  for (let index = 0; index < pixels.length; index += 4) {
    const rgba = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    if (rgba[3] > 0 && (rgba[0] < 250 || rgba[1] < 250 || rgba[2] < 250)) {
      inkPixels += 1;
    }
    for (const color of colors) {
      const [red, green, blue] = parseHex(color);
      if (rgba[0] === red && rgba[1] === green && rgba[2] === blue && rgba[3] === 255) {
        colorCounts.set(color, colorCounts.get(color) + 1);
      }
    }
  }

  const label = name ?? `${artifact.chart}/${artifact.variant}/${artifact.kind}`;
  assert.equal(inkPixels >= minimumInkPixels, true, `${label} is unexpectedly blank`);
  for (const [color, count] of colorCounts) {
    assert.equal(count > 0, true, `${label} does not contain ${color}`);
  }

  return { ...result, inkPixels, colorCounts };
}
