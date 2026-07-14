import test from "node:test";

import { createCarsScatterplot } from "../../../examples/cars-scatterplot/program.js";
import { loadCars } from "../../support/data.js";
import { assertRenderedPNG } from "../../support/png.js";
import { createCarsScatterplotPrimitives } from "./primitive.program.js";

const cars = loadCars();

test("renders the public and primitive scatterplots with visible points", async () => {
  const programs = [
    [
      "cars-scatterplot",
      "user-facing",
      createCarsScatterplot(cars),
      ["#4c78a8", "#f58518", "#e45756"]
    ],
    [
      "cars-scatterplot-primitives",
      "primitive",
      createCarsScatterplotPrimitives(cars),
      ["#4c78a8", "#f58518", "#54a24b"]
    ]
  ];

  for (const [name, , program, colors] of programs) {
    await assertRenderedPNG(program, {
      name,
      width: 640,
      height: 400,
      colors
    });
  }

  for (const [, kind, program, colors] of programs) {
    await assertRenderedPNG(program, {
      artifact: {
        roadmap: "roadmap2",
        chart: "cars-scatterplot",
        variant: "baseline",
        kind
      },
      width: 640,
      height: 400,
      colors
    });
  }
});
