import {
  createBinBoundariesCarsHistogram,
  createBinStepCarsHistogram,
  createCarsHistogram,
  createFieldReassignmentCarsHistogram
} from "../../../../examples/cars-histogram/program.js";
import { loadCars } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createCarsHistogramPrimitives } from "../primitive.program.js";
import {
  createBinBoundariesPrimitives,
  createBinStepPrimitives,
  createFieldReassignmentPrimitives
} from "./primitive-programs.js";

const cars = loadCars();

const shared = Object.freeze({
  chart: "cars-histogram",
  width: 432,
  height: 460,
  colors: ["#4c78a8", "#f58518", "#e45756"],
  regions: [Object.freeze({
    name: "plot",
    x: 80,
    y: 80,
    width: 292,
    height: 250,
    minimumInkPixels: 100
  })]
});

export const visualVariants = Object.freeze([defineVisualVariant({
  ...shared,
  variant: "baseline",
  title: "Canonical Histogram Baseline",
  callChain: `chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({ legend: { position: "bottom" } })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });`,
  primitive: createCarsHistogramPrimitives(cars),
  userFacing: createCarsHistogram(cars),
}), defineVisualVariant({
  ...shared,
  variant: "bin-step",
  title: "Exact 60-Unit Bins",
  callChain: `chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    binStep: 60,
    xScale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .createGuides({ legend: { position: "bottom" } })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });`,
  primitive: createBinStepPrimitives(cars),
  userFacing: createBinStepCarsHistogram(cars)
}), defineVisualVariant({
  ...shared,
  variant: "bin-boundaries",
  title: "Irregular Bin Boundaries",
  callChain: `chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    binBoundaries: [50, 100, 150, 225, 300, 400, 500],
    xScale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .createGuides({ legend: { position: "bottom" } })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });`,
  primitive: createBinBoundariesPrimitives(cars),
  userFacing: createBinBoundariesCarsHistogram(cars)
}), defineVisualVariant({
  ...shared,
  variant: "field-reassignment",
  title: "Histogram Field Reassignment",
  callChain: `chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .createGuides({ legend: { position: "bottom" } })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  })
  .encodeHistogram({
    field: "Horsepower",
    maxBins: 8,
    xScale: { nice: true, zero: false }
  });`,
  primitive: createFieldReassignmentPrimitives(cars),
  userFacing: createFieldReassignmentCarsHistogram(cars)
})]);
