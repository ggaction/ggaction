import { chart, hconcat } from "../../../src/index.js";
import { createCarsRegressionScatterplot } from
  "../../../examples/cars-regression-scatterplot/program.js";

import {
  REVIEW_LAYOUT
} from "./reference-values.js";

function addReviewLabel(program, text) {
  return program
    .createGraphics({ id: "reviewLabel", parent: "canvas", type: "text" })
    .editGraphics({ target: "reviewLabel", property: "x", value: 80 })
    .editGraphics({ target: "reviewLabel", property: "y", value: 17 })
    .editGraphics({ target: "reviewLabel", property: "text", value: text })
    .editGraphics({ target: "reviewLabel", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "reviewLabel", property: "fontSize", value: 13 })
    .editGraphics({ target: "reviewLabel", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "reviewLabel", property: "fontWeight", value: 700 })
    .editGraphics({ target: "reviewLabel", property: "textAlign", value: "left" })
    .editGraphics({ target: "reviewLabel", property: "textBaseline", value: "middle" });
}

function validMultiLegendCars(cars) {
  return cars.filter(car =>
    Number.isFinite(car.Displacement) &&
    Number.isFinite(car.Miles_per_Gallon) &&
    Number.isFinite(car.Horsepower) &&
    Number.isFinite(car.Acceleration) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
  );
}

function createMultiLegendProgram(cars) {
  return chart()
    .createCanvas({
      width: REVIEW_LAYOUT.multiWidth,
      height: REVIEW_LAYOUT.multiHeight,
      margin: { top: 40, right: 240, bottom: 60, left: 70 }
    })
    .createData({ id: "cars", values: validMultiLegendCars(cars) })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin", fieldType: "nominal" })
    .encodeSize({ field: "Horsepower" })
    .encodeOpacity({ field: "Acceleration" })
    .createGuides({
      axes: {
        x: { title: { text: "Displacement" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: false
    })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["size"], count: 3 })
    .createLegend({ target: "points", channels: ["opacity"], count: 3 });
}

export function createCarsCombinedLegendComparison(cars) {
  const current = addReviewLabel(
    createCarsRegressionScatterplot(cars),
    "RUNTIME · public actions"
  );
  const target = addReviewLabel(
    createCarsRegressionScatterplot(cars),
    "APPROVED TARGET · exact match"
  );
  return hconcat({
    id: "carsCombinedLegendComparison",
    programs: [
      { id: "current", program: current },
      { id: "target", program: target }
    ],
    gap: REVIEW_LAYOUT.gap,
    padding: REVIEW_LAYOUT.padding,
    align: "start"
  });
}

export function createThreeBlockLegendComparison(cars) {
  const current = addReviewLabel(
    createMultiLegendProgram(cars),
    "RUNTIME · public actions"
  );
  const target = addReviewLabel(
    createMultiLegendProgram(cars),
    "APPROVED TARGET · exact match"
  );
  return hconcat({
    id: "threeBlockLegendComparison",
    programs: [
      { id: "current", program: current },
      { id: "target", program: target }
    ],
    gap: REVIEW_LAYOUT.gap,
    padding: REVIEW_LAYOUT.padding,
    align: "start"
  });
}
