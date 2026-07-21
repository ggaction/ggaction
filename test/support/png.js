import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNG } from "ggaction/png";

import { ensureVariantMetadata } from "./artifact-metadata.js";
import { resolvePngArtifactPath } from "./artifact-paths.js";

const signature = [137, 80, 78, 71, 13, 10, 26, 10];

function resolveCssColor(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Expected PNG colors must be non-empty strings.");
  }
  const canvas = createCanvas(1, 1);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  return [...context.getImageData(0, 0, 1, 1).data];
}

export function normalizeExpectedColor(expectation) {
  const normalized = typeof expectation === "string"
    ? { value: expectation }
    : expectation;
  if (
    normalized === null ||
    typeof normalized !== "object" ||
    Array.isArray(normalized) ||
    !["value", "tolerance", "minimumPixels"].every(key =>
      Object.keys(normalized).includes(key) || key !== "value"
    ) ||
    Object.keys(normalized).some(key =>
      !["value", "tolerance", "minimumPixels"].includes(key)
    ) ||
    !Number.isFinite(normalized.tolerance ?? 0) ||
    (normalized.tolerance ?? 0) < 0 ||
    !Number.isInteger(normalized.minimumPixels ?? 1) ||
    (normalized.minimumPixels ?? 1) <= 0
  ) {
    throw new TypeError("Expected PNG color has an invalid contract.");
  }
  return Object.freeze({
    value: normalized.value,
    rgba: Object.freeze(resolveCssColor(normalized.value)),
    tolerance: normalized.tolerance ?? 0,
    minimumPixels: normalized.minimumPixels ?? 1
  });
}

export function pixelMatchesColor(pixel, expected) {
  return pixel.every((channel, index) =>
    Math.abs(channel - expected.rgba[index]) <= expected.tolerance
  );
}

export function pixelDiffersFromBackground(pixel, background, tolerance = 5) {
  return pixel.some((channel, index) =>
    Math.abs(channel - background[index]) > tolerance
  );
}

function rootBackground(program) {
  const root = program.graphicSpec.order
    .map(id => program.graphicSpec.objects[id])
    .find(graphic => graphic?.type === "canvas");
  return root?.properties?.background === undefined
    ? [0, 0, 0, 0]
    : resolveCssColor(root.properties.background);
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
    backgroundTolerance = 5,
    regions = [],
    visualSignature
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
  const background = rootBackground(program);
  let inkPixels = 0;
  let inkLeft = image.width;
  let inkTop = image.height;
  let inkRight = -1;
  let inkBottom = -1;
  const expectedColors = colors.map(normalizeExpectedColor);
  const colorCounts = new Map(expectedColors.map(color => [color.value, 0]));

  for (let index = 0; index < pixels.length; index += 4) {
    const rgba = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    if (pixelDiffersFromBackground(rgba, background, backgroundTolerance)) {
      inkPixels += 1;
      const pixelIndex = index / 4;
      const x = pixelIndex % image.width;
      const y = Math.floor(pixelIndex / image.width);
      inkLeft = Math.min(inkLeft, x);
      inkTop = Math.min(inkTop, y);
      inkRight = Math.max(inkRight, x);
      inkBottom = Math.max(inkBottom, y);
    }
    for (const color of expectedColors) {
      if (pixelMatchesColor(rgba, color)) {
        colorCounts.set(color.value, colorCounts.get(color.value) + 1);
      }
    }
  }

  const label = name ?? `${artifact.chart}/${artifact.variant}/${artifact.kind}`;
  assert.equal(inkPixels >= minimumInkPixels, true, `${label} is unexpectedly blank`);
  for (const color of expectedColors) {
    assert.equal(
      colorCounts.get(color.value) >= color.minimumPixels,
      true,
      `${label} does not contain enough ${color.value} pixels`
    );
  }

  const compactSignature = Object.freeze({
    inkRatio: inkPixels / pixels.length * 4,
    inkBounds: Object.freeze({
      x: inkLeft / pixelRatio,
      y: inkTop / pixelRatio,
      width: (inkRight - inkLeft + 1) / pixelRatio,
      height: (inkBottom - inkTop + 1) / pixelRatio
    })
  });
  if (visualSignature) {
    assert.equal(
      compactSignature.inkRatio >= visualSignature.inkRatio.min &&
        compactSignature.inkRatio <= visualSignature.inkRatio.max,
      true,
      `${label} ink ratio ${compactSignature.inkRatio} left its approved range`
    );
    const tolerance = visualSignature.inkBounds.tolerance ?? 0;
    const toleranceFor = key =>
      typeof tolerance === "number" ? tolerance : tolerance[key];
    const mismatchedBounds = ["x", "y", "width", "height"].filter(key =>
      Math.abs(
        compactSignature.inkBounds[key] - visualSignature.inkBounds[key]
      ) > toleranceFor(key)
    );
    assert.deepEqual(
      mismatchedBounds,
      [],
      `${label} ink bounds changed from its approved signature ` +
        `(actual ${JSON.stringify(compactSignature.inkBounds)}, ` +
        `expected ${JSON.stringify(visualSignature.inkBounds)}, ` +
        `tolerance ${JSON.stringify(tolerance)})`
    );
  }

  const regionResults = regions.map(region => {
    const left = Math.floor(region.x * pixelRatio);
    const top = Math.floor(region.y * pixelRatio);
    const right = Math.ceil((region.x + region.width) * pixelRatio);
    const bottom = Math.ceil((region.y + region.height) * pixelRatio);
    let regionInk = 0;
    const expected = (region.colors ?? []).map(normalizeExpectedColor);
    const counts = new Map(expected.map(color => [color.value, 0]));

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const index = (y * image.width + x) * 4;
        const rgba = [
          pixels[index],
          pixels[index + 1],
          pixels[index + 2],
          pixels[index + 3]
        ];
        if (pixelDiffersFromBackground(rgba, background, backgroundTolerance)) {
          regionInk += 1;
        }
        for (const color of expected) {
          if (pixelMatchesColor(rgba, color)) {
            counts.set(color.value, counts.get(color.value) + 1);
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
    for (const color of expected) {
      assert.equal(
        counts.get(color.value) >= color.minimumPixels,
        true,
        `${regionLabel} does not contain enough ${color.value} pixels`
      );
    }
    return Object.freeze({ name: region.name, inkPixels: regionInk, colorCounts: counts });
  });

  return {
    ...result,
    inkPixels,
    colorCounts,
    regionResults,
    visualSignature: compactSignature,
    pixelHash: createHash("sha256").update(pixels).digest("hex")
  };
}
