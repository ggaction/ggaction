import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";

import { chart, render } from "../../src/index.js";

function base() {
  return chart()
    .createCanvas({ width: 400, height: 300, margin: 30 })
    .createData({ values: [
      { x: 50, y: 50, label: "Alpha long label" },
      { x: 50, y: 51, label: "Beta long label" },
      { x: 51, y: 50, label: "Gamma long label" }
    ] })
    .createScatterPlot({
      id: "points",
      x: { field: "x", scale: { domain: [0, 100] } },
      y: { field: "y", scale: { domain: [0, 100] } },
      guides: false
    });
}

function labels(program) {
  return program
    .createTextMark({ id: "labels", fontSize: 14, dx: 8, baseline: "middle" })
    .encodeText({ field: "label" })
    .layoutLabels({
      target: "labels", axis: "y", maxDisplacement: 70, padding: 4,
      leader: { stroke: "#ff0000", strokeWidth: 6 }
    });
}

function grid(program) {
  return program.createHorizontalGrid({
    scale: "y", values: [50, 51], color: "#00ff00", lineWidth: 8
  });
}

function pixels(program) {
  const context = createCanvas(400, 300).getContext("2d");
  render(program, context);
  return context.getImageData(0, 0, 400, 300).data;
}

test("keeps crossing label leaders above grids across creation and refresh order", () => {
  const initial = base();
  const before = JSON.stringify(initial);
  const leadersFirst = grid(labels(initial));
  const original = JSON.stringify(leadersFirst);
  const expectedPixels = pixels(leadersFirst);
  let redPixels = 0;
  for (let index = 0; index < expectedPixels.length; index += 4) {
    if (expectedPixels[index] === 255 && expectedPixels[index + 1] === 0 &&
        expectedPixels[index + 2] === 0 && expectedPixels[index + 3] === 255) redPixels += 1;
  }
  assert.ok(redPixels > 50, "the fixture must contain visible leader strokes");
  assert.deepEqual(leadersFirst.graphicSpec.objects["plot-main"].children, [
    "horizontalGridLines", "labels-label-leaders", "points", "labels"
  ]);
  for (const other of [
    labels(grid(initial)),
    leadersFirst.editCanvas({ width: 400 }),
    leadersFirst.editScale({ id: "y", domain: [0, 100] })
  ]) {
    assert.deepEqual(other.graphicSpec, leadersFirst.graphicSpec);
    assert.deepEqual(pixels(other), expectedPixels);
  }
  assert.equal(JSON.stringify(initial), before);
  assert.equal(JSON.stringify(leadersFirst), original);
});
