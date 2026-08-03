import { chart, hconcat } from "../../../src/index.js";
import { createCarsRegressionScatterplot } from
  "../../../examples/cars-regression-scatterplot/program.js";

import {
  CARS_LEGEND_TARGET,
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
  const shifted = shiftGraphics(program, [
    ["seriesLegendSymbolLines", ["x1", "x2"]],
    ["seriesLegendSymbolPoints", ["x"]]
  ], CARS_LEGEND_TARGET.categoricalSymbolShiftX);
  const titled = shiftGraphics(
    shifted,
    [["seriesLegendTitle", ["x"]]],
    CARS_LEGEND_TARGET.categoricalTitleShiftX
  );
  return shiftGraphics(
    titled,
    [["seriesLegendLabels", ["x"]]],
    CARS_LEGEND_TARGET.categoricalLabelShiftX
  );
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

function fillItems(program, id, property, value) {
  const graphic = program.graphicSpec.objects[id];
  if (!Array.isArray(graphic?.items)) {
    throw new Error(`Review graphic "${id}" does not contain items.`);
  }
  return program.editGraphics({
    target: id,
    property,
    value: Array(graphic.items.length).fill(value)
  });
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

function alignMultiLegendLane(program) {
  let next = program
    .editGraphics({
      target: "colorLegendTitle",
      property: "x",
      value: MULTI_LEGEND_TARGET.titleX
    })
    .editGraphics({
      target: "sizeLegendTitle",
      property: "x",
      value: MULTI_LEGEND_TARGET.titleX
    })
    .editGraphics({
      target: "opacityLegendTitle",
      property: "x",
      value: MULTI_LEGEND_TARGET.titleX
    });
  next = fillItems(
    next,
    "colorLegendSymbols",
    "x",
    MULTI_LEGEND_TARGET.categoricalRectX
  );
  next = fillItems(
    next,
    "sizeLegendSymbols",
    "x",
    MULTI_LEGEND_TARGET.symbolCenterX
  );
  next = fillItems(
    next,
    "opacityLegendSymbols",
    "x",
    MULTI_LEGEND_TARGET.symbolCenterX
  );
  for (const id of [
    "colorLegendLabels", "sizeLegendLabels", "opacityLegendLabels"
  ]) {
    next = fillItems(next, id, "x", MULTI_LEGEND_TARGET.labelX);
  }
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

export function createThreeBlockLegendComparison(cars) {
  const current = addReviewLabel(
    createMultiLegendProgram(cars),
    "CURRENT · columns drift + blocks overlap"
  );
  const target = addReviewLabel(
    alignMultiLegendLane(createMultiLegendProgram(cars)),
    "TARGET · aligned symbols, labels + 24 px stack"
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
