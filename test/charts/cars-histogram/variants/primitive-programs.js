import { createCarsHistogramPrimitiveProgram } from "../primitive.program.js";

export function createBinStepPrimitives(cars) {
  return createCarsHistogramPrimitiveProgram(cars, {
    field: "Displacement",
    binStep: 60
  });
}

export function createBinBoundariesPrimitives(cars) {
  return createCarsHistogramPrimitiveProgram(cars, {
    field: "Displacement",
    binBoundaries: [50, 100, 150, 225, 300, 400, 500]
  });
}

export function createFieldReassignmentPrimitives(cars) {
  return createCarsHistogramPrimitiveProgram(cars, {
    field: "Horsepower",
    maxBins: 8
  });
}

export function createNormalizedStackPrimitives(cars) {
  return createCarsHistogramPrimitiveProgram(cars, {
    field: "Displacement",
    maxBins: 10,
    stack: "normalize",
    colorLayout: "fill"
  });
}
