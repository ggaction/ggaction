import test from "node:test";

import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars, loadGapminder } from "../../support/data.js";
import { createCarsHorizontalErrorBandPrimitives } from
  "./cars-horizontal.primitive.program.js";
import { createGapminderErrorBandPrimitives } from "./primitive.program.js";
import {
  createCarsHorizontalErrorBand,
  createGapminderErrorBand
} from "./public.program.js";

test("matches the approved Gapminder error-band primitive exactly", () => {
  const gapminder = loadGapminder();
  assertChartProgramsEquivalent({
    primitiveProgram: createGapminderErrorBandPrimitives(gapminder),
    publicProgram: createGapminderErrorBand(gapminder)
  });
});

test("matches the approved Cars horizontal error-band primitive exactly", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createCarsHorizontalErrorBandPrimitives(cars),
    publicProgram: createCarsHorizontalErrorBand(cars)
  });
});
