import { createCarsRegressionScatterplot } from
  "../../../examples/cars-regression-scatterplot/program.js";
import { loadCars } from "../../support/data.js";
import {
  defineVisualVariant,
  registerVisualVariantTests
} from "../../support/visual-variants.js";
import { createCarsRegressionScatterplotPrimitives } from
  "./primitive.program.js";

const cars = loadCars();

registerVisualVariantTests([defineVisualVariant({
  chart: "cars-regression-scatterplot",
  variant: "baseline",
  title: "Cars Regression Scatterplot",
  callChain: "createCarsRegressionScatterplot(rows)",
  primitive: createCarsRegressionScatterplotPrimitives(cars),
  userFacing: createCarsRegressionScatterplot(cars),
  width: 760,
  height: 480,
  colors: ["#4c78a8", "#f58518"],
  regions: [{ name: "plot", x: 80, y: 40, width: 490, height: 370, minimumInkPixels: 200 }],
  artifact: false
})]);
