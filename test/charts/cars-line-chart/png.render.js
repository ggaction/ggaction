import test from "node:test";

import { createCarsLineChart } from "../../../examples/cars-line-chart/program.js";
import { loadCars } from "../../support/data.js";
import { assertRenderedPNG } from "../../support/png.js";
import { createCarsLineChartPrimitives } from "./primitive.program.js";
import {
  createCurveMonotoneEditPrimitives,
  createCurveStepPrimitives
} from "./phase2-primitives.program.js";

const cars = loadCars();
const baselineArtifact = Object.freeze({
  roadmap: "roadmap2",
  chart: "cars-line-chart",
  variant: "baseline",
  title: "Canonical Line Chart Baseline",
  userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({
    axes: { y: { ticksAndLabels: { count: 6 } } }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });`
});

const curveArtifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "curve-step",
      title: "Step Curve",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends", curve: "step" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });`
    }),
    program: createCurveStepPrimitives(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "curve-monotone-edit",
      title: "Monotone Curve Edit",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  })
  .editLineMark({ target: "trends", curve: "monotone", strokeWidth: 4 });`
    }),
    program: createCurveMonotoneEditPrimitives(cars)
  })
]);

test("renders the public and primitive line charts with visible series", async () => {
  const programs = [
    ["cars-line-chart", "user-facing", createCarsLineChart(cars)],
    ["cars-line-chart-primitives", "primitive", createCarsLineChartPrimitives(cars)]
  ];

  for (const [name, , program] of programs) {
    await assertRenderedPNG(program, {
      name,
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }

  for (const [, kind, program] of programs) {
    await assertRenderedPNG(program, {
      artifact: { ...baselineArtifact, kind },
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }

  for (const { artifact, program } of curveArtifacts) {
    await assertRenderedPNG(program, {
      artifact: { ...artifact, kind: "primitive" },
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }
});
