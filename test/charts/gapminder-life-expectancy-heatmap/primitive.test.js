import assert from "node:assert/strict";
import test from "node:test";

import { walkGraphicDrawOrder } from "../../../src/grammar/schemas/graphicTree.js";
import { loadGapminder } from "../../support/data.js";
import { createGapminderHeatmapPrimitives } from "./primitive.program.js";
import { createHeatmapReference } from "./reference-values.js";

function operations(node) {
  return node.children.flatMap(child => [child.op, ...operations(child)]);
}

test("authors the Gate J-C heatmap from explicit concrete primitives", () => {
  const rows = loadGapminder();
  const values = createHeatmapReference(rows);
  const program = createGapminderHeatmapPrimitives(rows);

  assert.deepEqual(
    program.graphicSpec.objects.rect.items.map(item => item.properties.fill),
    values.cells.map(cell => cell.fill)
  );
  assert.deepEqual(
    program.graphicSpec.objects.text.items.map(item => item.properties.text),
    values.cells.map(cell => cell.label)
  );
  assert.equal(program.graphicSpec.objects.colorGradientStrips.items.length, 60);
  assert.equal(program.semanticSpec.layers.length, 2);
  assert.equal(operations(program.trace).includes("createRectMark"), false);
});

test("draws cells and labels before axes, legend, and chart title", () => {
  const order = [];
  walkGraphicDrawOrder(
    createGapminderHeatmapPrimitives(loadGapminder()).graphicSpec,
    ({ id }) => order.push(id)
  );

  assert.deepEqual(order, [
    "canvas",
    "plot-main",
    "rect",
    "text",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "colorGradientStrips",
    "colorGradientTicks",
    "colorGradientLabels",
    "colorGradientTitle",
    "chartTitle"
  ]);
});
