import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createCarsPolarGuidePrimitives } from "./primitive.program.js";

const cars = loadCars();

export const targetCallChain = `chart()
  .createCanvas({ width: 620, height: 620, margin: 78 })
  .createData({ values: cars })
  .createPointMark({ opacity: 0.78 })
  .encodeTheta({ field: "Acceleration" })
  .encodeR({ field: "Horsepower", scale: { zero: true } })
  .encodeColor({ field: "Origin" })
  .encodePointRadius({ value: 3 })
  .createGuides();`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-polar-guides",
    variant: "default",
    title: "Cars Polar Guides",
    callChain: targetCallChain,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase3",
      capability: "polar-guides"
    },
    primitive: () => createCarsPolarGuidePrimitives(cars),
    width: 620,
    height: 620,
    colors: ["#d7e0ea", "#475569"],
    regions: [{
      name: "polar-guides",
      x: 48,
      y: 48,
      width: 524,
      height: 560,
      minimumInkPixels: 500
    }]
  })
]);
