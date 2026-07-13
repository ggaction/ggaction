import { chart } from "../../src/index.js";

export function createCarsRegressionScatterplot(cars) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .filterData({
      id: "selectedCars",
      field: "Origin",
      oneOf: ["Japan", "USA"]
    })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "Displacement",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      field: "Acceleration",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 })
    .createRegression({
      confidence: 0.95,
      band: { color: "#111111", opacity: 0.18 },
      line: { strokeWidth: 3 }
    })
    .createGuides();
}
