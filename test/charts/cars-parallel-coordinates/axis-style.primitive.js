import { createCarsParallelPrimitives } from "./primitive.program.js";

export function createStyledCarsParallelPrimitives(cars) {
  return createCarsParallelPrimitives(cars)
    .editGraphics({ target: "parallelAxisLines", property: "stroke", value: ["#7c3aed", "#475569", "#475569", "#475569"] })
    .editGraphics({ target: "parallelAxisLines", property: "strokeWidth", value: [3, 1.25, 1.25, 1.25] })
    .editGraphics({ target: "parallelAxisTitles", property: "text", value: ["Fuel economy", "Horsepower", "Weight (lb)", "Acceleration"] })
    .editGraphics({ target: "parallelAxisTitles", property: "fontWeight", value: [700, 600, 600, 600] });
}
