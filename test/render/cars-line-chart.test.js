import test from "node:test";

import { createCarsLineChart } from "../../examples/cars-line-chart/program.js";
import { loadCars } from "../fixtures/data.js";
import { assertRenderedPNG } from "../helpers/renderPNG.js";
import { createCarsLineChartPrimitives } from "../programs/carsLineChartPrimitives.js";

const cars = loadCars();

test("renders the public and primitive line charts with visible series", async () => {
  for (const [name, program] of [
    ["cars-line-chart", createCarsLineChart(cars)],
    ["cars-line-chart-primitives", createCarsLineChartPrimitives(cars)]
  ]) {
    await assertRenderedPNG(program, {
      name,
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }
});
