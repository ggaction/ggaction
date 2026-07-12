import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderToPNG } from "ggaction/png";

import { createCarsLineChartActions } from "../programs/carsLineChartActions.js";

const carsPath = new URL("../../data/cars.json", import.meta.url);
const outputPath = new URL(
  "../output/cars-line-chart-actions.png",
  import.meta.url
);

test("writes the line-mark-action cars line chart as a PNG", async () => {
  const cars = JSON.parse(await readFile(carsPath, "utf8"));
  const program = createCarsLineChartActions(cars);
  const result = await renderToPNG(program, {
    output: fileURLToPath(outputPath),
    pixelRatio: 2
  });
  const png = await readFile(result.output);

  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1440);
  assert.equal(png.readUInt32BE(20), 920);
  assert.equal(result.pixelRatio, 2);
  assert.equal(png.length > 1_000, true);
});
