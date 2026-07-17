import { graphicDrawOrder } from "../../../support/graphic-tree.js";
import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import {
  createCarsRegressionScatterplot,
  createLeftLegendCarsRegressionScatterplot
} from "../../../../examples/cars-regression-scatterplot/program.js";
import { createLeftLegendPrimitives } from
  "../../../charts/cars-regression-scatterplot/variants/primitive-programs.js";
import { assertChartProgramsEquivalent } from
  "../../../support/chart-equivalence.js";
import { loadCars } from "../../../support/data.js";

const cars = loadCars();
const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, category: "A", value: 8 }),
  Object.freeze({ x: 2, y: 4, category: "B", value: 12 }),
  Object.freeze({ x: 3, y: 6, category: "A", value: 16 })
]);

function continuousProgram(channel) {
  let program = chart()
    .createCanvas({
      width: 760,
      height: 460,
      margin: { top: 90, right: 170, bottom: 90, left: 170 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  program = channel === "color"
    ? program.encodeColor({ field: "value", fieldType: "quantitative" })
    : program.encodeOpacity({ field: "value" });
  return program.createLegend({ channels: [channel] });
}

test("matches the approved left composite and size legend primitive", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createLeftLegendPrimitives(cars),
    publicProgram: createLeftLegendCarsRegressionScatterplot(cars)
  });
});

test("partially edits one combined legend and preserves earlier state", () => {
  const before = createLeftLegendCarsRegressionScatterplot(cars);
  const beforeSpec = structuredClone(before.graphicSpec);
  const after = before.editLegend({
    target: "points",
    count: 3,
    title: "Country",
    labels: { fontSize: 11 },
    titleStyle: { fontWeight: 800 },
    border: { color: "#111827" }
  });

  assert.deepEqual(before.graphicSpec, beforeSpec);
  assert.equal(after.semanticSpec.guides.legend.series.title, "Country");
  assert.equal(after.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
  assert.equal(after.graphicSpec.objects.seriesLegendLabels.items[0]
    .properties.fontSize, 11);
  assert.equal(after.graphicSpec.objects.sizeLegendLabels.items[0]
    .properties.fontSize, 11);
  assert.equal(after.graphicSpec.objects.seriesLegendTitle.properties.fontWeight, 800);
  assert.equal(after.graphicSpec.objects.sizeLegendTitle.properties.fontWeight, 800);
  assert.equal(after.graphicSpec.objects.seriesLegendBackground.properties.stroke,
    "#111827");
  assert.deepEqual(after.trace.children.at(-1).children.map(node => node.op), [
    "editSemantic",
    "rematerializeLegend"
  ]);
});

test("hides, restores, and re-infers a categorical legend title", () => {
  const custom = createLeftLegendCarsRegressionScatterplot(cars)
    .editLegend({ title: "Country" });
  const hidden = custom.editLegend({ title: false });
  const restored = hidden.editLegend({ title: "auto" });

  assert.equal(hidden.graphicSpec.objects.seriesLegendTitle, undefined);
  assert.equal(hidden.semanticSpec.guides.legend.series.title, "Country");
  assert.equal(restored.semanticSpec.guides.legend.series.title, "Origin");
  assert.equal(restored.graphicSpec.objects.seriesLegendTitle.properties.text, "Origin");
  assert.equal(restored.guideConfigs.legend.series.inferredTitle, true);
});

test("reconciles categorical symbol recipes without stale graphics", () => {
  const program = createLeftLegendCarsRegressionScatterplot(cars).editLegend({
    symbol: {
      layers: [{
        type: "swatch",
        width: 18,
        height: 12,
        stroke: "#ffffff",
        strokeWidth: 0
      }]
    }
  });

  assert.equal(program.graphicSpec.objects.seriesLegendSymbolLines, undefined);
  assert.equal(program.graphicSpec.objects.seriesLegendSymbolPoints, undefined);
  assert.ok(program.graphicSpec.objects.seriesLegendSymbolSwatches);
  assert.equal(
    graphicDrawOrder(program).indexOf("seriesLegendSymbolSwatches") <
      graphicDrawOrder(program).indexOf("seriesLegendLabels"),
    true
  );
});

test("edits gradient and opacity legend-specific options", () => {
  const gradient = continuousProgram("color").editLegend({
    count: 3,
    gradient: { length: 80, thickness: 16 },
    title: "Magnitude",
    labels: { color: "#475569" },
    border: true
  });
  assert.equal(gradient.graphicSpec.objects.colorGradientLabels.items.length, 3);
  assert.equal(gradient.guideConfigs.legend.gradient.gradient.length, 80);
  assert.equal(gradient.semanticSpec.guides.legend.color.title, "Magnitude");
  assert.ok(gradient.graphicSpec.objects.colorGradientBackground);

  const opacity = continuousProgram("opacity").editLegend({
    count: 4,
    itemGap: 22,
    symbol: { type: "point", radius: 5, fill: "#334155" },
    title: false
  });
  assert.equal(opacity.graphicSpec.objects.opacityLegendSymbols.items.length, 4);
  assert.equal(opacity.graphicSpec.objects.opacityLegendSymbols.items[0]
    .properties.radius, 5);
  assert.equal(opacity.graphicSpec.objects.opacityLegendTitle, undefined);
});

test("converges across legend and Canvas edit order", () => {
  const start = createLeftLegendCarsRegressionScatterplot(cars);
  const canvas = {
    margin: { top: 40, right: 60, bottom: 70, left: 210 }
  };
  const legend = { offset: 90, count: 4, labels: { fontSize: 11 } };
  const legendThenCanvas = start.editLegend(legend).editCanvas(canvas);
  const canvasThenLegend = start.editCanvas(canvas).editLegend(legend);

  assert.deepEqual(legendThenCanvas.semanticSpec, canvasThenLegend.semanticSpec);
  assert.deepEqual(legendThenCanvas.graphicSpec, canvasThenLegend.graphicSpec);
});

test("validates selectors, edits, kind options, and left margin atomically", () => {
  const left = createLeftLegendCarsRegressionScatterplot(cars);
  const right = createCarsRegressionScatterplot(cars);
  const gradient = continuousProgram("color");

  assert.throws(() => left.editLegend(), /at least one change/);
  assert.throws(() => left.editLegend({ unknown: true }), /Unknown editLegend option/);
  assert.throws(() => left.editLegend({ target: "missing", count: 3 }),
    /Unknown legend target/);
  assert.throws(() => left.editLegend({ count: 1 }), /at least 2/);
  assert.throws(() => left.editLegend({ direction: "horizontal" }),
    /vertical direction/);
  assert.throws(() => gradient.editLegend({ columns: 2 }),
    /does not accept columns/);
  assert.throws(() => right.editLegend({ position: "left" }),
    /left-margin space/);
  assert.ok(right.graphicSpec.objects.seriesLegendTitle);
});

test("requires an explicit target when independent legends are ambiguous", () => {
  const program = chart()
    .createCanvas({ width: 800, height: 500, margin: 150 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "colorPoints" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({ target: "colorPoints", channels: ["color"] })
    .createPointMark({ id: "opacityPoints" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeOpacity({ field: "value" })
    .createLegend({ target: "opacityPoints", channels: ["opacity"] });

  assert.throws(() => program.editLegend({ count: 3 }), /target.*ambiguous/);
  const edited = program.editLegend({ target: "opacityPoints", count: 3 });
  assert.equal(edited.graphicSpec.objects.opacityLegendSymbols.items.length, 3);
  assert.equal(edited.graphicSpec.objects.colorGradientLabels.items.length, 5);
});

test("edits focused legend components through nested editLegend calls", () => {
  const before = createLeftLegendCarsRegressionScatterplot(cars);
  const beforeConfig = structuredClone(before.guideConfigs.legend);
  const edited = before
    .editLegendLayout({ target: "points", offset: 84, itemGap: 30 })
    .editLegendLabels({ target: "points", color: "#475569", fontSize: 11 })
    .editLegendTitle({ target: "points", color: "#0f172a", fontWeight: 700 })
    .editLegendSymbols({ target: "points", count: 4 })
    .editLegendBorder({ target: "points", border: { padding: 9 } });

  assert.equal(edited.guideConfigs.legend.series.offset, 84);
  assert.equal(edited.graphicSpec.objects.seriesLegendLabels.items[0].properties.fill,
    "#475569");
  assert.equal(edited.graphicSpec.objects.seriesLegendTitle.properties.fontWeight, 700);
  assert.equal(edited.graphicSpec.objects.sizeLegendSymbols.items.length, 4);
  assert.equal(edited.guideConfigs.legend.series.border.padding, 9);
  for (const node of edited.trace.children.slice(-5)) {
    assert.deepEqual(node.children.map(child => child.op), ["editLegend"]);
  }
  assert.deepEqual(before.guideConfigs.legend, beforeConfig);
});

test("validates focused legend component boundaries", () => {
  const program = createLeftLegendCarsRegressionScatterplot(cars);
  assert.throws(() => program.editLegendLayout(), /at least one component change/);
  assert.throws(
    () => program.editLegendLabels({ offset: 4 }),
    /Unknown editLegendLabels option/
  );
  assert.throws(
    () => program.editLegendBorder({ border: { padding: -1 } }),
    /non-negative/
  );
});
