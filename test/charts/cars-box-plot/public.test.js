import test from "node:test";

import { createCarsBoxPlot } from "../../../examples/cars-box-plot/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsBoxPlotPrimitives } from "./primitive.program.js";

test("matches the approved vertical Tukey primitive with createBoxPlot", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createCarsBoxPlotPrimitives(cars),
    publicProgram: createCarsBoxPlot(cars)
  });
});
