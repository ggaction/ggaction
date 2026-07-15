import { createCarsRegressionScatterplotPrimitives } from
  "../primitive.program.js";

export function createComponentEditPrimitives(cars) {
  return createCarsRegressionScatterplotPrimitives(cars)
    .editGraphics({
      target: "pointsRegressionBands",
      property: "fill",
      value: "#475569"
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "opacity",
      value: 0.12
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "stroke",
      value: "#111827"
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "strokeWidth",
      value: 1.5
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "strokeWidth",
      value: 5
    });
}
