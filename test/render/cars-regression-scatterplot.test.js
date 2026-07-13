import test from "node:test";

import { createCarsRegressionScatterplot } from
  "../../examples/cars-regression-scatterplot/program.js";
import { loadCars } from "../fixtures/data.js";
import { assertRenderedPNG } from "../helpers/renderPNG.js";
import { createCarsRegressionScatterplotPrimitives } from
  "../programs/carsRegressionScatterplotPrimitives.js";

test("renders public and primitive regression scatterplots at 2x", async () => {
  const cars = loadCars();
  for (const [name, program] of [
    ["cars-regression-scatterplot", createCarsRegressionScatterplot(cars)],
    [
      "cars-regression-scatterplot-primitives",
      createCarsRegressionScatterplotPrimitives(cars)
    ]
  ]) {
    await assertRenderedPNG(program, {
      name,
      width: 760,
      height: 480,
      pixelRatio: 2,
      colors: ["#4c78a8", "#f58518"],
      minimumInkPixels: 1000
    });
  }
});
