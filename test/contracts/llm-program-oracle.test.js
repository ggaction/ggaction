import assert from "node:assert/strict";
import test from "node:test";

import { chart, hconcat } from "../../src/index.js";
import { createCarsMultiLegendLayout } from "../../examples/cars-multi-legend-layout/program.js";
import { createHorsepowerRug } from "../../examples/directional-tick-plot/program.js";
import { inspectPreparedProgramValidation } from "../../scripts/llm-eval/program-evaluator.js";
import { loadCars } from "../support/data.js";

function expect(program, ids, value = true) {
  for (const id of ids) assert.equal(inspectPreparedProgramValidation(program, id), value, id);
}

function shiftGraphic(graphic, { x = 0, y = 0 }) {
  const properties = graphic.items === undefined
    ? [graphic.properties]
    : graphic.items.map(item => item.properties);
  for (const entry of properties) {
    if (Number.isFinite(entry.x)) entry.x += x;
    if (Number.isFinite(entry.x1)) entry.x1 += x;
    if (Number.isFinite(entry.x2)) entry.x2 += x;
    if (Number.isFinite(entry.y)) entry.y += y;
    if (Number.isFinite(entry.y1)) entry.y1 += y;
    if (Number.isFinite(entry.y2)) entry.y2 += y;
  }
}

test("measures complete multi-legend geometry instead of semantic presence", () => {
  const valid = createCarsMultiLegendLayout(loadCars(), { position: "top" });
  expect(valid, [
    "legend:count:2",
    "legend:order:left-to-right",
    "legend:titles-aligned",
    "legend:symbols-aligned",
    "legend:label-gaps-aligned",
    "legend:inter-block-gap",
    "legend:plot-offset"
  ]);

  const titleMismatch = structuredClone(valid);
  shiftGraphic(titleMismatch.graphicSpec.objects.opacityLegendTitle, { y: 3 });
  expect(titleMismatch, ["legend:titles-aligned"], false);

  const symbolMismatch = structuredClone(valid);
  shiftGraphic(symbolMismatch.graphicSpec.objects.opacityLegendSymbols, { y: 3 });
  expect(symbolMismatch, ["legend:symbols-aligned"], false);

  const labelGapMismatch = structuredClone(valid);
  shiftGraphic(labelGapMismatch.graphicSpec.objects.opacityLegendLabels, { x: 4 });
  expect(labelGapMismatch, ["legend:label-gaps-aligned"], false);

  const blockGapMismatch = structuredClone(valid);
  for (const id of ["opacityLegendTitle", "opacityLegendSymbols", "opacityLegendLabels"]) {
    shiftGraphic(blockGapMismatch.graphicSpec.objects[id], { x: -20 });
  }
  expect(blockGapMismatch, ["legend:inter-block-gap"], false);

  const plotOffsetMismatch = structuredClone(valid);
  for (const id of [
    "colorLegendTitle", "colorLegendSymbols", "colorLegendLabels",
    "opacityLegendTitle", "opacityLegendSymbols", "opacityLegendLabels"
  ]) shiftGraphic(plotOffsetMismatch.graphicSpec.objects[id], { y: 20 });
  expect(plotOffsetMismatch, ["legend:plot-offset"], false);
});

test("requires concrete Tukey configuration and materialized outlier rows", () => {
  const values = loadCars().filter(row => row.Origin != null && row.Miles_per_Gallon != null);
  const base = () => chart()
    .createCanvas({ width: 640, height: 400, margin: 70 })
    .createData({ values });
  const valid = base().createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    guides: false
  });
  expect(valid, ["whisker:tukey", "outliers:visible", "graphic:box-ink"]);

  const hidden = base().createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    outliers: false,
    guides: false
  });
  expect(hidden, ["outliers:visible"], false);

  const missingGraphic = structuredClone(valid);
  missingGraphic.graphicSpec.objects.boxPlotOutliers.items = [];
  expect(missingGraphic, ["outliers:visible"], false);
});

test("counts one concrete Tick for every materialized valid row", () => {
  const valid = createHorsepowerRug(loadCars());
  expect(valid, ["tick:one-per-valid-row", "graphic:tick-ink"]);
  const missing = structuredClone(valid);
  missing.graphicSpec.objects.ticks.items.pop();
  expect(missing, ["tick:one-per-valid-row", "graphic:tick-ink"], false);
});

function compositionProgram() {
  const scatter = chart()
    .createCanvas({ width: 200, height: 150, margin: 30 })
    .createData({ values: [{ x: 1, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  const initial = chart()
    .createCanvas({ width: 180, height: 150, margin: 30 })
    .createData({ values: [{ category: "A", value: 2 }] })
    .createBarPlot({ x: { field: "category", fieldType: "nominal" }, y: { field: "value" }, guides: false });
  const replacement = chart()
    .createCanvas({ width: 190, height: 150, margin: 30 })
    .createData({ values: [{ category: "A", value: 3 }] })
    .createBarPlot({ x: { field: "category", fieldType: "nominal" }, y: { field: "value" }, guides: false });
  return hconcat({
    id: "dashboard",
    programs: [{ id: "scatter", program: scatter }, { id: "detail", program: initial }],
    gap: 24
  }).replaceCompositionChild({ target: "detail", program: replacement });
}

test("checks composition slot state, concrete gap, and ink in every panel", () => {
  const valid = compositionProgram();
  expect(valid, ["composition:gap:24", "composition:slot-identity-preserved", "graphic:multi-panel-ink"]);

  const wrongGap = structuredClone(valid);
  const nestedCanvases = Object.values(wrongGap.graphicSpec.objects)
    .filter(graphic => graphic.type === "canvas" && Number.isFinite(graphic.properties?.x))
    .sort((left, right) => left.properties.x - right.properties.x);
  nestedCanvases[1].properties.x += 5;
  expect(wrongGap, ["composition:gap:24"], false);

  const missingSlot = structuredClone(valid);
  delete missingSlot.children.detail;
  expect(missingSlot, ["composition:slot-identity-preserved", "graphic:multi-panel-ink"], false);

  const emptyPanel = structuredClone(valid);
  emptyPanel.children.detail.graphicSpec.objects.barPlot.items = [];
  expect(emptyPanel, ["graphic:multi-panel-ink"], false);
});

function annotatedRegression() {
  return chart()
    .createCanvas({ width: 300, height: 200, margin: 40 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createRegression({ band: false })
    .editGraphics({ target: "pointsRegressionLines:0", property: "stroke", value: "black" })
    .createGraphics({ id: "rSquared", parent: "plot-main", type: "text" })
    .editGraphics({ target: "rSquared", property: "x", value: 150 })
    .editGraphics({ target: "rSquared", property: "y", value: 100 })
    .editGraphics({ target: "rSquared", property: "text", value: "R² = 0.91" })
    .editGraphics({ target: "rSquared", property: "fill", value: "#000000" })
    .editGraphics({ target: "rSquared", property: "fontSize", value: 12 })
    .editGraphics({ target: "rSquared", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "rSquared", property: "textAlign", value: "left" })
    .editGraphics({ target: "rSquared", property: "textBaseline", value: "middle" });
}

test("requires black R-squared text near a black regression line", () => {
  const valid = annotatedRegression();
  expect(valid, ["style:regression:black", "annotation:r-squared:black"]);

  const red = structuredClone(valid);
  red.graphicSpec.objects.rSquared.properties.fill = "red";
  expect(red, ["annotation:r-squared:black"], false);

  const far = structuredClone(valid);
  far.graphicSpec.objects.rSquared.properties.x = 1000;
  expect(far, ["annotation:r-squared:black"], false);

  const blueLine = structuredClone(valid);
  blueLine.graphicSpec.objects.pointsRegressionLines.items[0].properties.stroke = "#4c78a8";
  expect(blueLine, ["style:regression:black"], false);
});

test("reads orange no-stroke highlighting from the owned highlight config", () => {
  const base = chart()
    .createCanvas({ width: 200, height: 150, margin: 30 })
    .createData({ values: [{ x: 1, y: 2, origin: "Japan" }, { x: 2, y: 3, origin: "USA" }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  const valid = base.highlightMarks({
    target: "scatterPlot",
    select: { field: "origin", op: "eq", value: "Japan" },
    fill: "#c65d00"
  });
  expect(valid, ["style:highlight:orange-no-stroke"]);

  const stroked = structuredClone(valid);
  stroked.materializationConfigs.highlights.scatterPlotSelection.style.stroke = "black";
  expect(stroked, ["style:highlight:orange-no-stroke"], false);

  const red = base.highlightMarks({
    target: "scatterPlot",
    select: { field: "origin", op: "eq", value: "Japan" },
    fill: "#dc2626"
  });
  expect(red, ["style:highlight:orange-no-stroke"], false);
});

