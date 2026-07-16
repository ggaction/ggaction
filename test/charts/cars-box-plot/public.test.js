import test from "node:test";

import {
  createCarsBoxPlot,
  createCarsBoxPlotWithoutOutliers,
  createCarsStyledFactorBoxPlot,
  createCarsHorizontalMinmaxBoxPlot
} from "../../../examples/cars-box-plot/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsBoxPlotPrimitives } from "./primitive.program.js";
import { createCarsHorizontalMinmaxPrimitives } from
  "./variants/horizontal-minmax.program.js";
import {
  createCarsOutliersOffPrimitives,
  createCarsStyledFactorPrimitives
} from "./variants/options/primitive.program.js";

test("matches the approved vertical Tukey primitive with createBoxPlot", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createCarsBoxPlotPrimitives(cars),
    publicProgram: createCarsBoxPlot(cars)
  });
});

test("matches the approved horizontal minmax primitive with createBoxPlot", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createCarsHorizontalMinmaxPrimitives(cars),
    publicProgram: createCarsHorizontalMinmaxBoxPlot(cars)
  });
});

test("matches the approved factor and style primitive with createBoxPlot", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createCarsStyledFactorPrimitives(cars),
    publicProgram: createCarsStyledFactorBoxPlot(cars)
  });
});

test("matches the approved outliers-off primitive with createBoxPlot", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createCarsOutliersOffPrimitives(cars),
    publicProgram: createCarsBoxPlotWithoutOutliers(cars)
  });
});
