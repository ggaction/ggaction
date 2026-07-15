import { createCarsDensityAreaPrimitives } from "../primitive.program.js";

export function createAreaOutlineEditPrimitives(cars) {
  return createCarsDensityAreaPrimitives(cars)
    .editGraphics({
      target: "densities",
      property: "opacity",
      value: 0.35
    })
    .editGraphics({
      target: "densities",
      property: "stroke",
      value: "#334155"
    })
    .editGraphics({
      target: "densities",
      property: "strokeWidth",
      value: 1.5
    });
}
