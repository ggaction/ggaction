import test from "node:test";

import {
  createGapminderBoundaryOverrideErrorBand,
  createGapminderCurvedBoundaryErrorBand,
  createCarsHorizontalErrorBand,
  createGapminderErrorBand
} from "../../../examples/gapminder-error-band/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars, loadGapminder } from "../../support/data.js";
import { createCarsHorizontalErrorBandPrimitives } from
  "./variants/horizontal/primitive.program.js";
import { createGapminderErrorBandPrimitives } from "./primitive.program.js";
import { createGapminderCurvedBoundaryPrimitives } from
  "./variants/curved-boundary.primitive.program.js";

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

for (const variant of [
  {
    name: "inherited cardinal boundaries",
    boundaryCurve: "cardinal",
    create: createGapminderCurvedBoundaryErrorBand
  },
  {
    name: "step boundary override",
    boundaryCurve: "step",
    create: createGapminderBoundaryOverrideErrorBand
  }
]) {
  test(`matches the approved ${variant.name} primitive exactly`, () => {
    const gapminder = loadGapminder();
    assertChartProgramsEquivalent({
      primitiveProgram: createGapminderCurvedBoundaryPrimitives(gapminder, {
        boundaryCurve: variant.boundaryCurve
      }),
      publicProgram: variant.create(gapminder)
    });
  });
}
