import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import { createCarsBoxPlotPrimitives } from "./primitive.program.js";
import {
  BOX_PLOT_FIELDS,
  createCarsBoxPlotReferenceValues
} from "./reference-values.js";

function flattenActions(node) {
  return [node, ...(node.children ?? []).flatMap(flattenActions)];
}

test("authors the canonical Cars Tukey box plot with raw primitives", () => {
  const cars = loadCars();
  const values = createCarsBoxPlotReferenceValues(cars);
  const program = createCarsBoxPlotPrimitives(cars);
  const summary = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "boxPlotSummaryData"
  );
  const body = program.semanticSpec.layers.find(layer => layer.id === "boxPlot");

  assert.deepEqual(summary.values, values.summaries);
  assert.equal(body.mark.type, "bar");
  assert.equal(body.encoding.x.field, "Origin");
  assert.equal(body.encoding.y.field, BOX_PLOT_FIELDS.q1);
  assert.equal(body.encoding.y2.field, BOX_PLOT_FIELDS.q3);
  assert.deepEqual(
    program.graphicSpec.objects.boxPlot.children.map(child => child.properties),
    values.boxes.map((box, index) => ({
      ...box,
      fill: values.boxColors[index],
      opacity: 1,
      stroke: values.boxColors[index],
      strokeWidth: 1.5
    }))
  );
  assert.equal(program.graphicSpec.objects.boxPlotOutliers.children.length, 10);
  assert.deepEqual(
    program.graphicSpec.objects.boxPlotOutliers.children.map(({ type, properties }) => ({
      type,
      properties
    })),
    values.outlierGraphics
  );
  assert.ok(program.graphicSpec.objects.boxPlotOutliers.children.every(child =>
    child.type === "path" && child.properties.fill === "#111111"
  ));

  const order = program.graphicSpec.order;
  assert.ok(order.indexOf("horizontalGridLines") < order.indexOf("boxPlotWhisker"));
  assert.ok(order.indexOf("boxPlotWhisker") < order.indexOf("boxPlot"));
  assert.ok(order.indexOf("boxPlot") < order.indexOf("boxPlotMedian"));
  assert.ok(order.indexOf("boxPlotMedian") < order.indexOf("boxPlotOutliers"));
  assert.ok(order.indexOf("boxPlotOutliers") < order.indexOf("xAxisLine"));
  assert.ok(order.indexOf("xAxisLine") < order.indexOf("chartTitle"));

  const operations = flattenActions(program.trace).map(node => node.op);
  assert.equal(operations.includes("createBoxPlot"), false);
  assert.equal(operations.includes("createBoxSummaryData"), false);
  assert.equal(operations.includes("createBoxOutlierData"), false);
});

test("keeps all primitive children concrete and renderable", () => {
  const program = createCarsBoxPlotPrimitives(loadCars());
  for (const id of [
    "boxPlotWhisker",
    "boxPlotWhiskerLowerCap",
    "boxPlotWhiskerUpperCap",
    "boxPlotMedian"
  ]) {
    for (const child of program.graphicSpec.objects[id].children) {
      assert.ok(["x1", "y1", "x2", "y2"].every(property =>
        Number.isFinite(child.properties[property])
      ));
    }
  }
  for (const child of program.graphicSpec.objects.boxPlot.children) {
    assert.ok(["x", "y", "width", "height"].every(property =>
      Number.isFinite(child.properties[property])
    ));
  }

  const context = createMockCanvasContext();
  render(program, context);
  assert.ok(context.calls.some(call => call.op === "fillRect"));
  assert.equal(context.calls.some(call => call.op === "arc"), false);
  assert.ok(context.calls.some(call => call.op === "fillText"));
});
