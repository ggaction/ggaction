import test from "node:test";

import {
  createCarsErrorBar,
  createCarsErrorBarOverlay,
  createCarsHorizontalErrorBar,
  createExplicitIntervalErrorBar,
  createRuleGeometryExample,
  createStyledCarsErrorBar
} from "../../../examples/cars-error-bar/program.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import {
  createEncodedLayerInferencePrimitives,
  createErrorBarBaselinePrimitives,
  createRuleGeometryPrimitives
} from "./primitive.program.js";
import {
  createExplicitIntervalPrimitives,
  createHorizontalErrorBarPrimitives,
  createStyledCapsPrimitives
} from "./variants/error-bar-modes.primitive.program.js";
import { createExplicitIntervalReferenceValues } from "./reference-values.js";

test("matches rule geometry with public rule actions", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createRuleGeometryPrimitives(),
    publicProgram: createRuleGeometryExample()
  });
});

test("matches the canonical error-bar primitive with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createErrorBarBaselinePrimitives(cars),
    publicProgram: createCarsErrorBar(cars)
  });
});

test("matches encoded-layer inference with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createEncodedLayerInferencePrimitives(cars),
    publicProgram: createCarsErrorBarOverlay(cars)
  });
});

test("matches the horizontal error-bar primitive with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createHorizontalErrorBarPrimitives(cars),
    publicProgram: createCarsHorizontalErrorBar(cars)
  });
});

test("matches explicit intervals without caps with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createExplicitIntervalPrimitives(cars),
    publicProgram: createExplicitIntervalErrorBar(
      createExplicitIntervalReferenceValues(cars).sourceRows
    )
  });
});

test("matches styled error-bar caps with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createStyledCapsPrimitives(cars),
    publicProgram: createStyledCarsErrorBar(cars)
  });
});
