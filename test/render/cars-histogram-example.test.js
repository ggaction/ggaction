import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderToPNG } from "ggaction/png";

import { createCarsHistogram } from "../../examples/cars-histogram/program.js";

const carsPath = new URL("../../data/cars.json", import.meta.url);
const outputPath = new URL("../output/cars-histogram.png", import.meta.url);

test("writes the public cars histogram as a PNG", async () => {
  const cars = JSON.parse(await readFile(carsPath, "utf8"));
  const program = createCarsHistogram(cars);
  const result = await renderToPNG(program, {
    output: fileURLToPath(outputPath),
    pixelRatio: 2
  });
  const png = await readFile(result.output);

  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 864);
  assert.equal(png.readUInt32BE(20), 920);
  assert.equal(result.pixelRatio, 2);
  assert.equal(png.length > 1_000, true);
});
