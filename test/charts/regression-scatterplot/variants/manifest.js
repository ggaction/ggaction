import {
  createCarsRegressionScatterplot,
  createComparisonFilterCarsRegressionScatterplot,
  createComponentEditCarsRegressionScatterplot,
  createLoessCarsRegressionScatterplot,
  createPolynomialCarsRegressionScatterplot,
  createPredictionIntervalCarsRegressionScatterplot,
  createRangeFilterCarsRegressionScatterplot
} from
  "../../../../examples/cars-regression-scatterplot/program.js";
import { loadCars } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createCarsRegressionScatterplotPrimitives } from
  "../primitive.program.js";
import {
  createComparisonFilterPrimitives,
  createComponentEditPrimitives,
  createLoessRegressionPrimitives,
  createPolynomialRegressionPrimitives,
  createPredictionIntervalPrimitives,
  createRangeFilterPrimitives
} from "./primitive-programs.js";

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
  .filterMark({
    field: "Origin",
    oneOf: ["Japan", "USA"]
  })
  .createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  })
  .createGuides();`;

const baselineFilterCall = `  .filterMark({
    field: "Origin",
    oneOf: ["Japan", "USA"]
  })`;

function withFilterCall(filterCall) {
  return baselineCallChain.replace(baselineFilterCall, filterCall);
}

const baselineRegressionCall = `  .createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  })`;

function withRegressionCall(regressionCall) {
  return baselineCallChain.replace(baselineRegressionCall, regressionCall);
}

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
}), defineVisualVariant({
  ...shared,
  variant: "comparison-filter",
  title: "Horsepower at Least 150",
  colors: ["#4c78a8"],
  callChain: withFilterCall(`  .filterMark({
    field: "Horsepower",
    predicate: { op: "gte", value: 150 }
  })`),
  primitive: createComparisonFilterPrimitives(cars),
  userFacing: createComparisonFilterCarsRegressionScatterplot(cars)
}), defineVisualVariant({
  ...shared,
  variant: "range-filter",
  title: "Inclusive Displacement Range",
  colors: ["#4c78a8", "#f58518", "#e45756"],
  callChain: withFilterCall(`  .filterMark({
    field: "Displacement",
    range: { min: 100, max: 300, inclusive: true }
  })`),
  primitive: createRangeFilterPrimitives(cars),
  userFacing: createRangeFilterCarsRegressionScatterplot(cars)
}), defineVisualVariant({
  ...shared,
  variant: "polynomial-degree-2",
  title: "Quadratic Regression",
  callChain: withRegressionCall(`  .createRegression({
    method: "polynomial",
    degree: 2
  })`),
  primitive: createPolynomialRegressionPrimitives(cars),
  userFacing: createPolynomialCarsRegressionScatterplot(cars)
}), defineVisualVariant({
  ...shared,
  variant: "loess-span",
  title: "LOESS Span 0.55",
  callChain: withRegressionCall(`  .createRegression({
    method: "loess",
    span: 0.55,
    band: false
  })`),
  primitive: createLoessRegressionPrimitives(cars),
  userFacing: createLoessCarsRegressionScatterplot(cars)
}), defineVisualVariant({
  ...shared,
  variant: "prediction-interval",
  title: "95% Prediction Interval",
  callChain: withRegressionCall(`  .createRegression({
    interval: "prediction"
  })`),
  primitive: createPredictionIntervalPrimitives(cars),
  userFacing: createPredictionIntervalCarsRegressionScatterplot(cars)
})]);
