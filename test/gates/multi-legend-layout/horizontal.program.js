import { chart, hconcat } from "../../../src/index.js";

import { REVIEW_LAYOUT } from "./reference-values.js";

function validCars(cars) {
  return cars.filter(car =>
    Number.isFinite(car.Displacement) &&
    Number.isFinite(car.Miles_per_Gallon) &&
    Number.isFinite(car.Acceleration) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
  );
}

function addReviewLabel(program, text) {
  return program
    .createGraphics({ id: "reviewLabel", parent: "canvas", type: "text" })
    .editGraphics({ target: "reviewLabel", property: "x", value: 70 })
    .editGraphics({ target: "reviewLabel", property: "y", value: 17 })
    .editGraphics({ target: "reviewLabel", property: "text", value: text })
    .editGraphics({ target: "reviewLabel", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "reviewLabel", property: "fontSize", value: 13 })
    .editGraphics({ target: "reviewLabel", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "reviewLabel", property: "fontWeight", value: 700 })
    .editGraphics({ target: "reviewLabel", property: "textAlign", value: "left" })
    .editGraphics({ target: "reviewLabel", property: "textBaseline", value: "middle" });
}

function createCarsHorizontalLegendProgram(cars, position) {
  return chart()
    .createCanvas({
      width: REVIEW_LAYOUT.multiWidth,
      height: 620,
      margin: {
        top: position === "top" ? 200 : 40,
        right: 70,
        bottom: position === "bottom" ? 200 : 60,
        left: 70
      }
    })
    .createData({ id: "cars", values: validCars(cars) })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin", fieldType: "nominal" })
    .encodeOpacity({ field: "Acceleration" })
    .createGuides({
      axes: {
        x: { title: { text: "Displacement" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: false
    })
    .createLegend({
      target: "points",
      channels: ["color"],
      position,
      align: "left",
      columns: 3,
      ...(position === "bottom" ? { offset: 60 } : {})
    })
    .createLegend({
      target: "points",
      channels: ["opacity"],
      position,
      align: "right",
      count: 3,
      ...(position === "bottom" ? { offset: 60 } : {})
    });
}

export function createHorizontalLegendLaneComparison(cars) {
  const top = addReviewLabel(
    createCarsHorizontalLegendProgram(cars, "top"),
    "TOP · title and symbol rows aligned"
  );
  const bottom = addReviewLabel(
    createCarsHorizontalLegendProgram(cars, "bottom"),
    "BOTTOM · same-row legends"
  );
  return hconcat({
    id: "horizontalLegendLaneComparison",
    programs: [
      { id: "top", program: top },
      { id: "bottom", program: bottom }
    ],
    gap: REVIEW_LAYOUT.gap,
    padding: REVIEW_LAYOUT.padding,
    align: "start"
  });
}
