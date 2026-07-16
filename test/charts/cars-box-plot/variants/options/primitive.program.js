import { createCarsBoxPlotPrimitives } from "../../primitive.program.js";
import {
  STYLED_FACTOR_STYLE,
  createCarsStyledFactorReferenceValues
} from "./reference-values.js";

export function createCarsStyledFactorPrimitives(cars) {
  const values = createCarsStyledFactorReferenceValues(cars);
  return createCarsBoxPlotPrimitives(cars, {
    factor: STYLED_FACTOR_STYLE.factor,
    values,
    color: false,
    box: {
      fill: STYLED_FACTOR_STYLE.boxFill,
      opacity: STYLED_FACTOR_STYLE.boxOpacity,
      stroke: STYLED_FACTOR_STYLE.boxStroke,
      strokeWidth: STYLED_FACTOR_STYLE.boxStrokeWidth
    },
    median: {
      stroke: STYLED_FACTOR_STYLE.medianStroke,
      strokeWidth: STYLED_FACTOR_STYLE.medianStrokeWidth
    }
  }).editTitle({ subtitle: "Factor 1.0 with custom styling" });
}

export function createCarsOutliersOffPrimitives(cars) {
  return createCarsBoxPlotPrimitives(cars, {
    outliers: false
  }).editTitle({ subtitle: "Tukey summaries with outlier points disabled" });
}
