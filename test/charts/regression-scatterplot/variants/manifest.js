import {
  createCarsRegressionScatterplot,
  createComponentEditCarsRegressionScatterplot
} from
  "../../../../examples/cars-regression-scatterplot/program.js";
import { loadCars } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createCarsRegressionScatterplotPrimitives } from
  "../primitive.program.js";
import { createComponentEditPrimitives } from "./primitive-programs.js";

const cars = loadCars();

const shared = Object.freeze({
  chart: "cars-regression-scatterplot",
  width: 760,
  height: 480,
  colors: ["#4c78a8", "#f58518"],
  regions: [Object.freeze({
    name: "plot",
    x: 80,
    y: 40,
    width: 490,
    height: 370,
    minimumInkPixels: 200
  })]
});

const baselineCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 190, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .filterData({
    id: "selectedCars",
    field: "Origin",
    oneOf: ["Japan", "USA"]
  })
  .createPointMark({ id: "points" })
  .encodeX({
    field: "Displacement",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "Acceleration",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 })
  .createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  })
  .createGuides();`;

export const visualVariants = Object.freeze([defineVisualVariant({
  ...shared,
  variant: "baseline",
  title: "Canonical Regression Scatterplot Baseline",
  callChain: baselineCallChain,
  primitive: createCarsRegressionScatterplotPrimitives(cars),
  userFacing: createCarsRegressionScatterplot(cars)
}), defineVisualVariant({
  ...shared,
  variant: "component-edit",
  title: "Regression Component Edit",
  callChain: `${baselineCallChain.slice(0, -1)}
  .editRegressionBand({
    target: "pointsRegressionBands",
    color: "#475569",
    opacity: 0.12,
    stroke: "#111827",
    strokeWidth: 1.5
  })
  .editRegressionLine({
    target: "pointsRegressionLines",
    strokeWidth: 5
  });`,
  primitive: createComponentEditPrimitives(cars),
  userFacing: createComponentEditCarsRegressionScatterplot(cars)
})]);
