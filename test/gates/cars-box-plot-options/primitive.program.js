import { createCarsBoxPlotPrimitives } from "../../charts/cars-box-plot/primitive.program.js";
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
  }).editGraphics({
    target: "chartSubtitle",
    property: "text",
    value: "Factor 1.0 with custom styling"
  });
}

export function createCarsOutliersOffPrimitives(cars) {
  return createCarsBoxPlotPrimitives(cars, {
    outliers: false
  }).editGraphics({
    target: "chartSubtitle",
    property: "text",
    value: "Tukey summaries with outlier points disabled"
  });
}
