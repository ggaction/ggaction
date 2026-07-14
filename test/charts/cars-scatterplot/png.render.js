import test from "node:test";

import { createCarsScatterplot } from "../../../examples/cars-scatterplot/program.js";
import { loadCars } from "../../support/data.js";
import { assertRenderedPNG } from "../../support/png.js";
import { createCarsScatterplotPrimitives } from "./primitive.program.js";

const cars = loadCars();
const baselineArtifact = Object.freeze({
  roadmap: "roadmap2",
  chart: "cars-scatterplot",
  variant: "baseline",
  title: "Baseline",
  userFacingCallChain: `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  });`
});

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
        ...baselineArtifact,
        kind
      },
      width: 640,
      height: 400,
      colors
    });
  }
});
