import test from "node:test";

import { loadCars } from "../fixtures/data.js";
import { assertRenderedPNG } from "../helpers/renderPNG.js";
import { createCarsRegressionScatterplotPrimitives } from
  "../programs/carsRegressionScatterplotPrimitives.js";

test("renders the primitive regression scatterplot with visible layered marks", async () => {
  await assertRenderedPNG(
    createCarsRegressionScatterplotPrimitives(loadCars()),
    {
      name: "cars-regression-scatterplot-primitives",
      width: 760,
      height: 480,
      colors: ["#4c78a8", "#f58518"],
      minimumInkPixels: 1000
    }
  );
});
