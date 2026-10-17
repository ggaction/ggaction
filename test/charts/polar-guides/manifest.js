import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createCarsPolarGuidePrimitives } from "./primitive.program.js";
import { createCarsPolarGuides } from
  "../../../examples/polar-guides/program.js";

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
      capability: "polar-guides"
    },
    primitive: () => createCarsPolarGuidePrimitives(cars),
    userFacing: () => createCarsPolarGuides(cars),
    width: 620,
    height: 620,
    colors: ["#d7e0ea", "#475569"],
    visualSignature: {
      inkRatio: { min: 0.0438, max: 0.0537 },
      inkBounds: {
        // Native platform fonts have distinct ink extents; keep the same tolerance
        // and exact same-run primitive/public pixels on each supported platform.
        ...(process.platform === "linux"
          ? { x: 50.5, y: 64, width: 520.5, height: 525 }
          : { x: 51.5, y: 60.25, width: 519, height: 528 }),
        tolerance: { x: 2.5, y: 1.5, width: 4.5, height: 1.5 }
      }
    },
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
