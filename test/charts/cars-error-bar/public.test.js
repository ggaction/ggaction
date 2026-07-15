import test from "node:test";

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
} from "./gate-c.program.js";
import {
  createEncodedLayerInferenceProgram,
  createErrorBarProgram,
  createExplicitIntervalProgram,
  createHorizontalErrorBarProgram,
  createStyledCapsProgram,
  createRuleGeometryProgram
} from "./public.program.js";

test("matches rule geometry with public rule actions", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createRuleGeometryPrimitives(),
    publicProgram: createRuleGeometryProgram()
  });
});

test("matches the canonical error-bar primitive with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createErrorBarBaselinePrimitives(cars),
    publicProgram: createErrorBarProgram(cars)
  });
});

test("matches encoded-layer inference with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createEncodedLayerInferencePrimitives(cars),
    publicProgram: createEncodedLayerInferenceProgram(cars)
  });
});

test("matches the horizontal error-bar primitive with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createHorizontalErrorBarPrimitives(cars),
    publicProgram: createHorizontalErrorBarProgram(cars)
  });
});

test("matches explicit intervals without caps with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createExplicitIntervalPrimitives(cars),
    publicProgram: createExplicitIntervalProgram(cars)
  });
});

test("matches styled error-bar caps with public actions", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    primitiveProgram: createStyledCapsPrimitives(cars),
    publicProgram: createStyledCapsProgram(cars)
  });
});
