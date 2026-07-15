import { createCarsDensityArea } from
  "../../../examples/cars-density-area/program.js";
import { loadCars } from "../../support/data.js";
import {
  defineVisualVariant,
  registerVisualVariantTests
} from "../../support/visual-variants.js";
import { createCarsDensityAreaPrimitives } from "./primitive.program.js";

const cars = loadCars();

registerVisualVariantTests([defineVisualVariant({
  chart: "cars-density-area",
  variant: "baseline",
  title: "Cars Density Area",
  callChain: "createCarsDensityArea(rows)",
  primitive: createCarsDensityAreaPrimitives(cars),
  userFacing: createCarsDensityArea(cars),
  width: 720,
  height: 500,
  colors: ["#4c78a8", "#f58518", "#e45756"],
  regions: [{ name: "plot", x: 80, y: 130, width: 600, height: 300, minimumInkPixels: 200 }],
  artifact: false
})]);
