import { loadCars, loadFashionTsne } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";

import {
  createCarsPolarScatterplotPrimitives,
  createFashionTsnePolarPointPrimitives
} from "../primitive.program.js";
import {
  createCarsPolarScatterplot,
  createFashionTsnePolarPoints
} from "../../../../examples/polar-points/program.js";

const cars = loadCars();
const fashionRows = loadFashionTsne();
const artifact = Object.freeze({
  roadmap: "roadmap3",
  phase: "phase2",
  capability: "polar-point"
});

const carsCallChain = `chart()
  .createCanvas({ width: 520, height: 520, margin: 48 })
  .createData({ values: rows })
  .createPointMark()
  .encodeTheta({ field: "Acceleration" })
  .encodeR({ field: "Horsepower" })
  .encodeColor({ field: "Origin" })
  .encodePointRadius({ value: 3 });`;

const fashionCallChain = `chart()
  .createCanvas({ width: 560, height: 560, margin: 40 })
  .createData({ values: fashionRows })
  .createPointMark({ opacity: 0.42 })
  .encodeTheta({ field: "x_pos" })
  .encodeR({ field: "y_pos", scale: { zero: false } })
  .encodeColor({ field: "label_name", palette: "tableau10" })
  .encodePointRadius({ value: 1.4 });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-polar-scatterplot",
    variant: "baseline",
    title: "Cars Polar Scatterplot",
    callChain: carsCallChain,
    artifact,
    primitive: () => createCarsPolarScatterplotPrimitives(cars),
    userFacing: () => createCarsPolarScatterplot(cars),
    width: 520,
    height: 520,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [{ name: "polar-points", x: 48, y: 48, width: 424, height: 424 }]
  }),
  defineVisualVariant({
    chart: "fashion-tsne-polar-points",
    variant: "dense-negative-domain",
    title: "Fashion t-SNE Polar Points",
    callChain: fashionCallChain,
    artifact,
    primitive: () => createFashionTsnePolarPointPrimitives(fashionRows),
    userFacing: () => createFashionTsnePolarPoints(fashionRows),
    width: 560,
    height: 560,
    colors: [],
    regions: [{
      name: "dense-polar-points",
      x: 40,
      y: 40,
      width: 480,
      height: 480,
      minimumInkPixels: 100
    }]
  })
]);
