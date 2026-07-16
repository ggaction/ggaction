import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../../../src/index.js";
import { createMockCanvasContext } from "../../../../support/canvas.js";
import { loadCars } from "../../../../support/data.js";
import {
  createCarsOutliersOffPrimitives,
  createCarsStyledFactorPrimitives
} from "./primitive.program.js";
import {
  STYLED_FACTOR_STYLE,
  createCarsStyledFactorReferenceValues
} from "./reference-values.js";

function flattenActions(node) {
  return [node, ...(node.children ?? []).flatMap(flattenActions)];
}

test("authors the styled factor target through low-level edits", () => {
  const cars = loadCars();
  const values = createCarsStyledFactorReferenceValues(cars);
  const program = createCarsStyledFactorPrimitives(cars);
  const summary = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "boxPlotSummaryData"
  );

  assert.equal(summary.transform[0].factor, 1);
  assert.deepEqual(summary.values, values.summaries);
  assert.equal(program.semanticSpec.scales.some(scale => scale.id === "color"), false);
  assert.equal(program.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(program.graphicSpec.objects.boxPlot.items[0].properties.fill,
    STYLED_FACTOR_STYLE.boxFill);
  assert.equal(program.graphicSpec.objects.boxPlot.items[0].properties.width, 40);
  assert.equal(program.graphicSpec.objects.boxPlotMedian.items[0].properties.strokeWidth, 3);
  assert.equal(program.graphicSpec.objects.boxPlotOutliers.items.length, 25);
  assert.deepEqual(
    program.graphicSpec.objects.boxPlotOutliers.items.map(({ type, properties }) => ({
      type,
      properties
    })),
    values.outlierGraphics
  );

  const operations = flattenActions(program.trace).map(node => node.op);
  assert.equal(operations.includes("createBoxPlot"), false);
});

test("authors outliers-off without optional semantic or graphic resources", () => {
  const program = createCarsOutliersOffPrimitives(loadCars());
  const ids = {
    datasets: program.semanticSpec.datasets.map(dataset => dataset.id),
    layers: program.semanticSpec.layers.map(layer => layer.id),
    graphics: Object.keys(program.graphicSpec.objects)
  };

  assert.equal(ids.datasets.includes("boxPlotOutlierData"), false);
  assert.equal(ids.layers.includes("boxPlotOutliers"), false);
  assert.equal(ids.graphics.includes("boxPlotOutliers"), false);
  assert.equal(program.graphicSpec.order.includes("boxPlotOutliers"), false);
  assert.ok(program.graphicSpec.order.indexOf("boxPlotMedian") <
    program.graphicSpec.order.indexOf("xAxisLine"));

  const context = createMockCanvasContext();
  render(program, context);
  assert.ok(context.calls.some(call => call.op === "fillRect"));
  assert.equal(context.calls.some(call => call.op === "fill"), false);
});
