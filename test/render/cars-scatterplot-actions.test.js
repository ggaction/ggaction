import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderToPNG } from "ggaction/png";

import { createCarsScatterplotActions } from "../programs/carsScatterplotActions.js";

const carsPath = new URL("../../data/cars.json", import.meta.url);
const outputPath = new URL(
  "../output/cars-scatterplot-actions.png",
  import.meta.url
);

test("writes the canvas-action scatterplot as a PNG", async () => {
  const cars = JSON.parse(await readFile(carsPath, "utf8"));
  const program = createCarsScatterplotActions(cars);
  const result = await renderToPNG(program, {
    output: fileURLToPath(outputPath),
    pixelRatio: 2
  });
  const png = await readFile(result.output);

  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1280);
  assert.equal(png.readUInt32BE(20), 800);
  assert.equal(result.pixelRatio, 2);
  assert.equal(png.length > 1_000, true);
});
