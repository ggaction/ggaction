import assert from "node:assert/strict";
import test from "node:test";

import { visualVariants } from "./manifest.js";

const FOCUSED_ACTIONS = Object.freeze([
  "editLegendLayout",
  "editLegendLabels",
  "editLegendTitle",
  "editLegendSymbols",
  "editLegendBorder",
  "editXAxis",
  "editYAxis",
  "editGrid",
  "editErrorBar",
  "editErrorBand",
  "editErrorBandBoundary",
  "editBoxPlot",
  "editRegression",
  "removeXAxis",
  "removeYAxis",
  "removeGrid",
  "removeLegend",
  "removeTitle",
  "removeMark"
]);

function actionOperations(node) {
  return node.children.flatMap(child => [
    child.op,
    ...actionOperations(child)
  ]);
}

function variant(id) {
  return visualVariants.find(candidate => candidate.variant === id);
}

test("keeps every approved primitive baseline independent from its public facade", () => {
  assert.equal(visualVariants.length, 11);
  for (const target of visualVariants) {
    const program = target.primitive();
    const operations = actionOperations(program.trace);
    for (const action of FOCUSED_ACTIONS) {
      assert.equal(operations.includes(action), false, `${target.variant}: ${action}`);
    }
    assert.equal(program.graphicSpec.objects.canvas.type, "canvas");
  }
});

test("locks mark and scale appearance targets", () => {
  const point = variant("point-create-and-palette-edit").primitive();
  assert.equal(point.graphicSpec.objects.points.items[0].properties.opacity, 0.48);
  assert.equal(point.graphicSpec.objects.points.items[0].properties.stroke, "white");
  assert.equal(point.graphicSpec.objects.points.items[0].properties.strokeWidth, 1.25);

  const bar = variant("bar-create-appearance").primitive();
  assert.equal(bar.graphicSpec.objects.bars.items[0].properties.opacity, 0.78);
  assert.equal(bar.graphicSpec.objects.bars.items[0].properties.stroke, "#0f172a");
  assert.equal(bar.graphicSpec.objects.bars.items[0].properties.strokeWidth, 1.25);

  const line = variant("line-create-edit-appearance").primitive();
  assert.equal(line.graphicSpec.objects.trends.items[0].properties.stroke, "#7c3aed");
  assert.equal(line.graphicSpec.objects.trends.items[0].properties.opacity, 0.55);
});

test("locks focused guide and composite component targets", () => {
  const legend = variant("focused-legend-components").primitive();
  assert.equal(legend.graphicSpec.objects.seriesLegendBackground.properties.stroke, "#94a3b8");
  assert.equal(legend.graphicSpec.objects.seriesLegendLabels.items[0].properties.fill, "#475569");
  assert.equal(legend.graphicSpec.objects.sizeLegendSymbols.items.length, 5);

  const guides = variant("cartesian-guide-facades").primitive();
  assert.equal(
    guides.graphicSpec.objects.xAxisLine.properties.y1,
    guides.graphicSpec.objects.xAxisLine.properties.y2
  );
  assert.equal(
    guides.graphicSpec.objects.horizontalGridLines.items[0].properties.stroke,
    "#cbd5e1"
  );
  assert.deepEqual(
    guides.graphicSpec.objects.horizontalGridLines.items[0].properties.strokeDash,
    [4, 4]
  );

  const errorBar = variant("owner-edit").primitive();
  assert.equal(errorBar.graphicSpec.objects.errorBar.items[0].properties.stroke, "#d9485f");
  assert.equal(errorBar.graphicSpec.objects.errorBar.items[0].properties.strokeWidth, 3);
  assert.deepEqual(errorBar.graphicSpec.objects.errorBar.items[0].properties.strokeDash, [8, 4]);
});

test("locks error band, regression, and box plot owner targets", () => {
  const errorBand = visualVariants.find(target =>
    target.chart === "gapminder-error-band"
  ).primitive();
  assert.equal(errorBand.graphicSpec.objects.errorBand.items[0].properties.fill, "#7dd3fc");
  assert.equal(
    errorBand.graphicSpec.objects.errorBandLowerBoundary.items[0].properties.stroke,
    "#0369a1"
  );
  assert.equal(
    errorBand.graphicSpec.objects.errorBandUpperBoundary.items[0].properties.strokeWidth,
    2
  );

  const regression = visualVariants.find(target =>
    target.chart === "cars-regression-scatterplot" && target.variant === "owner-edit"
  ).primitive();
  const transform = regression.semanticSpec.datasets.find(
    dataset => dataset.id === "pointsRegressionData"
  ).transform[0];
  assert.equal(transform.method, "polynomial");
  assert.equal(transform.degree, 2);
  assert.equal(
    regression.graphicSpec.objects.pointsRegressionBands.items[0].properties.fill,
    "#a78bfa"
  );

  const box = visualVariants.find(target =>
    target.chart === "cars-box-plot"
  ).primitive();
  const summary = box.semanticSpec.datasets.find(
    dataset => dataset.id === "boxPlotSummaryData"
  );
  assert.equal(summary.transform[0].factor, 1);
  assert.equal(box.graphicSpec.objects.boxPlot.items[0].properties.fill, "#f28e2b");
});

test("removes owned guide and mark state while preserving visible consumers", () => {
  const guides = variant("remove-guides-and-title").primitive();
  assert.deepEqual(guides.semanticSpec.guides, {});
  assert.deepEqual(guides.semanticSpec.title, {});
  assert.equal(guides.titleConfig, undefined);
  assert.equal(guides.graphicSpec.objects.horizontalGridLines, undefined);
  assert.equal(guides.graphicSpec.objects.colorLegendSymbols, undefined);
  assert.equal(guides.graphicSpec.objects.chartTitle, undefined);
  assert.equal(guides.graphicSpec.objects.bars.type, "rect");

  const mark = variant("remove-point-mark").primitive();
  assert.deepEqual(
    mark.semanticSpec.layers.find(layer => layer.id === "point"),
    { id: "point" }
  );
  assert.equal(mark.semanticSpec.layers.some(layer => layer.id === "bar"), true);
  assert.equal(mark.graphicSpec.objects.point, undefined);
  assert.equal(mark.graphicSpec.objects.bar.type, "rect");
  assert.equal(mark.semanticSpec.datasets.some(dataset => dataset.id === "data"), true);
  assert.equal(mark.semanticSpec.scales.some(scale => scale.id === "x"), true);
});
