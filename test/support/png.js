import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNG } from "ggaction/png";

import { ensureVariantMetadata } from "./artifact-metadata.js";
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
    minimumInkPixels = 100,
    regions = []
  }
) {
  const output = resolvePngArtifactPath({ name, artifact });
  if (artifact !== undefined) {
    await ensureVariantMetadata(artifact);
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
  const parsedColors = new Map(colors.map(color => [color, parseHex(color)]));
  const colorCounts = new Map(colors.map(color => [color, 0]));

  for (let index = 0; index < pixels.length; index += 4) {
    const rgba = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    if (rgba[3] > 0 && (rgba[0] < 250 || rgba[1] < 250 || rgba[2] < 250)) {
      inkPixels += 1;
    }
    for (const [color, [red, green, blue]] of parsedColors) {
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

  const regionResults = regions.map(region => {
    const left = Math.floor(region.x * pixelRatio);
    const top = Math.floor(region.y * pixelRatio);
    const right = Math.ceil((region.x + region.width) * pixelRatio);
    const bottom = Math.ceil((region.y + region.height) * pixelRatio);
    let regionInk = 0;
    const expected = new Map(
      (region.colors ?? []).map(color => [color, parseHex(color)])
    );
    const counts = new Map([...expected.keys()].map(color => [color, 0]));

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const index = (y * image.width + x) * 4;
        const rgba = [
          pixels[index],
          pixels[index + 1],
          pixels[index + 2],
          pixels[index + 3]
        ];
        if (rgba[3] > 0 && (rgba[0] < 250 || rgba[1] < 250 || rgba[2] < 250)) {
          regionInk += 1;
        }
        for (const [color, [red, green, blue]] of expected) {
          if (rgba[0] === red && rgba[1] === green && rgba[2] === blue && rgba[3] === 255) {
            counts.set(color, counts.get(color) + 1);
          }
        }
      }
    }

    const regionLabel = `${label} ${region.name}`;
    const requiredInk = (region.minimumInkPixels ?? 1) * pixelRatio ** 2;
    assert.equal(
      regionInk >= requiredInk,
      true,
      `${regionLabel} is unexpectedly blank`
    );
    for (const [color, count] of counts) {
      assert.equal(count > 0, true, `${regionLabel} does not contain ${color}`);
    }
    return Object.freeze({ name: region.name, inkPixels: regionInk, colorCounts: counts });
  });

  return {
    ...result,
    inkPixels,
    colorCounts,
    regionResults,
    pixelHash: createHash("sha256").update(pixels).digest("hex")
  };
}
