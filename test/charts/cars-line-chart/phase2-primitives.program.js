import { createCarsLineChartPrimitives } from "./primitive.program.js";
import {
  createCarsLineCurvePrimitiveValues
} from "./phase2-reference-values.js";

export function createCurveStepPrimitives(cars) {
  const values = createCarsLineCurvePrimitiveValues(cars);

  return createCarsLineChartPrimitives(cars)
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.stepCommands
    });
}

export function createCurveMonotoneEditPrimitives(cars) {
  const values = createCarsLineCurvePrimitiveValues(cars);

  return createCarsLineChartPrimitives(cars)
    .editGraphics({
      target: "trends",
      property: "commands",
      value: values.monotoneCommands
    })
    .editGraphics({
      target: "trends",
      property: "strokeWidth",
      value: 4
    });
}
