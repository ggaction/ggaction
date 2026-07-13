import test from "node:test";

import { loadCars } from "../fixtures/data.js";
import { assertRenderedPNG } from "../helpers/renderPNG.js";
import { createCarsDensityAreaPrimitives } from
  "../programs/carsDensityAreaPrimitives.js";

test("renders the primitive density area chart at 2x", async () => {
  await assertRenderedPNG(
    createCarsDensityAreaPrimitives(loadCars()),
    {
      name: "cars-density-area-primitives",
      width: 720,
      height: 500,
      pixelRatio: 2,
      colors: ["#4c78a8", "#f58518", "#e45756"],
      minimumInkPixels: 1000
    }
  );
});
