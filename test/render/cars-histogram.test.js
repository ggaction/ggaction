import test from "node:test";

import { createCarsHistogram } from "../../examples/cars-histogram/program.js";
import { loadCars } from "../fixtures/data.js";
import { assertRenderedPNG } from "../helpers/renderPNG.js";
import { createCarsHistogramPrimitives } from "../programs/carsHistogramPrimitives.js";

const cars = loadCars();

test("renders the public and primitive histograms with visible colored bars", async () => {
  for (const [name, program] of [
    ["cars-histogram", createCarsHistogram(cars)],
    ["cars-histogram-primitives", createCarsHistogramPrimitives(cars)]
  ]) {
    await assertRenderedPNG(program, {
      name,
      width: 432,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }
});
