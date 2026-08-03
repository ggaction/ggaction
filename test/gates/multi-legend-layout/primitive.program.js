import { chart, hconcat } from "../../../src/index.js";
import { createCarsRegressionScatterplot } from
  "../../../examples/cars-regression-scatterplot/program.js";

import {
  CARS_LEGEND_TARGET,
  MULTI_LEGEND_ROWS,
  MULTI_LEGEND_TARGET,
  REVIEW_LAYOUT
} from "./reference-values.js";

function editOffset(program, id, property, offset) {
  const graphic = program.graphicSpec.objects[id];
  if (graphic === undefined) {
    throw new Error(`Missing review graphic "${id}".`);
  }
  const current = graphic.items === undefined
    ? graphic.properties[property]
    : graphic.items.map(item => item.properties[property]);
  const value = Array.isArray(current)
    ? current.map(item => item + offset)
    : current + offset;
  return program.editGraphics({ target: id, property, value });
}

function shiftGraphics(program, definitions, offset) {
  let next = program;
  for (const [id, properties] of definitions) {
    for (const property of properties) {
      next = editOffset(next, id, property, offset);
    }
  }
  return next;
}

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

function alignCarsCombinedLegend(program) {
  return shiftGraphics(program, [
    ["seriesLegendSymbolLines", ["x1", "x2"]],
    ["seriesLegendSymbolPoints", ["x"]],
    ["seriesLegendLabels", ["x"]],
    ["seriesLegendTitle", ["x"]]
  ], CARS_LEGEND_TARGET.categoricalShiftX);
}

function createMultiLegendProgram() {
  return chart()
    .createCanvas({
      width: REVIEW_LAYOUT.multiWidth,
      height: REVIEW_LAYOUT.multiHeight,
      margin: { top: 40, right: 240, bottom: 60, left: 60 }
    })
    .createData({ id: "rows", values: MULTI_LEGEND_ROWS })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group", fieldType: "nominal" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "alpha" })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["size"], count: 3 })
    .createLegend({ target: "points", channels: ["opacity"], count: 3 });
}

function alignMultiLegendLane(program) {
  let next = shiftGraphics(program, [
    ["colorLegendSymbols", ["x"]],
    ["colorLegendLabels", ["x"]],
    ["colorLegendTitle", ["x"]]
  ], MULTI_LEGEND_TARGET.categoricalShiftX);
  next = shiftGraphics(next, [
    ["sizeLegendSymbols", ["y"]],
    ["sizeLegendLabels", ["y"]],
    ["sizeLegendTitle", ["y"]]
  ], MULTI_LEGEND_TARGET.size.shiftY);
  return shiftGraphics(next, [
    ["opacityLegendSymbols", ["y"]],
    ["opacityLegendLabels", ["y"]],
    ["opacityLegendTitle", ["y"]]
  ], MULTI_LEGEND_TARGET.opacity.shiftY);
}

export function createCarsCombinedLegendComparison(cars) {
  const current = addReviewLabel(
    createCarsRegressionScatterplot(cars),
    "CURRENT · split content anchors"
  );
  const target = addReviewLabel(
    alignCarsCombinedLegend(createCarsRegressionScatterplot(cars)),
    "TARGET · one aligned lane"
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

export function createThreeBlockLegendComparison() {
  const current = addReviewLabel(
    createMultiLegendProgram(),
    "CURRENT · blocks overlap"
  );
  const target = addReviewLabel(
    alignMultiLegendLane(createMultiLegendProgram()),
    "TARGET · aligned 24 px stack"
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
