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
  capability: "polar-point"
});

const carsCallChain = `chart()
  .createCanvas({ width: 520, height: 520, margin: 48 })
  .createData({ values: rows })
  .createPolarScatterPlot({
    id: "point",
    theta: "Acceleration",
    radius: "Horsepower",
    color: "Origin",
    point: { radius: 3 },
    guides: false
  });`;

const fashionCallChain = `chart()
  .createCanvas({ width: 560, height: 560, margin: 40 })
  .createData({ values: fashionRows })
  .createPolarScatterPlot({
    id: "point",
    theta: "x_pos",
    radius: { field: "y_pos", scale: { zero: false } },
    color: { field: "label_name", palette: "tableau10" },
    point: { radius: 1.4, opacity: 0.42 },
    guides: false
  });`;

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
    visualSignature: {
      inkRatio: { min: 0.0268, max: 0.0328 },
      inkBounds: { x: 137, y: 65.5, width: 312, height: 351.5, tolerance: 2 }
    },
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
    visualSignature: {
      inkRatio: { min: 0.0109, max: 0.0134 },
      inkBounds: { x: 73, y: 104, width: 442, height: 382.5, tolerance: 2 }
    },
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
