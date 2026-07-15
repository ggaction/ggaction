import { createCarsHistogram } from "../../../examples/cars-histogram/program.js";
import { loadCars } from "../../support/data.js";
import {
  defineVisualVariant,
  registerVisualVariantTests
} from "../../support/visual-variants.js";
import { createCarsHistogramPrimitives } from "./primitive.program.js";

const cars = loadCars();

registerVisualVariantTests([defineVisualVariant({
  chart: "cars-histogram",
  variant: "baseline",
  title: "Cars Histogram",
  callChain: "createCarsHistogram(rows)",
  primitive: createCarsHistogramPrimitives(cars),
  userFacing: createCarsHistogram(cars),
  width: 432,
  height: 460,
  colors: ["#4c78a8", "#f58518", "#e45756"],
  regions: [{ name: "plot", x: 80, y: 80, width: 292, height: 250, minimumInkPixels: 100 }],
  artifact: false
})]);
