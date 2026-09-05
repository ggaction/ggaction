import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { findGraphicParent } from
  "../../../../src/grammar/schemas/graphicTree.js";

function encodedPoint() {
  return chart()
    .createCanvas({
      width: 400,
      height: 300,
      margin: { top: 60, right: 100, bottom: 50, left: 50 }
    })
    .createData({
      values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }]
    })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" });
}

test("owns grids and axes in plot draw order", () => {
  const program = encodedPoint().createGuides({ legend: false });
  const children = program.graphicSpec.objects["plot-main"].children;

  assert.deepEqual(children, [
    "horizontalGridLines",
    "point",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle"
  ]);
  for (const id of children) {
    assert.equal(findGraphicParent(program.graphicSpec, id)?.id, "plot-main");
  }
});

test("keeps legends before titles even when authored after them", () => {
  const titled = encodedPoint().createTitle({ text: "Example" });
  const program = titled.createLegend();
  const children = program.graphicSpec.objects.canvas.children;

  assert.deepEqual(children, [
    "plot-main",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle",
    "chartTitle"
  ]);
  for (const id of children.slice(1)) {
    assert.equal(findGraphicParent(program.graphicSpec, id)?.id, "canvas");
  }
  assert.deepEqual(titled.graphicSpec.objects.canvas.children, [
    "plot-main",
    "chartTitle"
  ]);
});

test("preserves guide attachment across Canvas rematerialization", () => {
  const original = encodedPoint()
    .createGuides()
    .createTitle({ text: "Example" });
  const before = {
    canvas: original.graphicSpec.objects.canvas.children,
    plot: original.graphicSpec.objects["plot-main"].children
  };
  const resized = original.editCanvas({ width: 440 });

  assert.deepEqual(resized.graphicSpec.objects.canvas.children, before.canvas);
  assert.deepEqual(resized.graphicSpec.objects["plot-main"].children, before.plot);
});
