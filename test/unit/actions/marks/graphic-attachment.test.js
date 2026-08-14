import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { findGraphicParent } from
  "../../../../src/grammar/schemas/graphicTree.js";

function attachedMarks() {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "rows", values: [{ x: 1, y: 2 }] })
    .createPointMark({ id: "points" })
    .createLineMark({ id: "lines" })
    .createAreaMark({ id: "areas" })
    .createBarMark({ id: "bars" })
    .createRuleMark({ id: "rules" });
}

test("attaches every ordinary mark to the canonical plot", () => {
  const program = attachedMarks();
  const markIds = ["points", "lines", "areas", "bars", "rules"];

  assert.deepEqual(program.graphicSpec.order, ["canvas"]);
  assert.deepEqual(program.graphicSpec.objects.canvas.children, ["plot-main"]);
  assert.deepEqual(program.graphicSpec.objects["plot-main"].children, markIds);
  for (const id of markIds) {
    assert.equal(findGraphicParent(program.graphicSpec, id)?.id, "plot-main");
    const createNode = program.trace.children
      .find(node => node.args.id === id)
      .children.find(node => node.op === "createGraphics");
    assert.equal(createNode.args.parent, "plot-main");
  }
});

test("keeps incomplete marks attached across encoding and edit materialization", () => {
  const created = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: [{ x: 1 }, { x: 2 }] })
    .createPointMark();
  const encoded = created.encodeX({ field: "x" });
  const edited = encoded.editPointMark({ fill: "red" });

  assert.deepEqual(created.graphicSpec.objects["plot-main"].children, ["point"]);
  assert.deepEqual(encoded.graphicSpec.objects["plot-main"].children, ["point"]);
  assert.deepEqual(edited.graphicSpec.objects["plot-main"].children, ["point"]);
  assert.equal(findGraphicParent(edited.graphicSpec, "point")?.id, "plot-main");
  assert.deepEqual(created.graphicSpec.objects.point.items, [
    { id: "point:0", properties: {} },
    { id: "point:1", properties: {} }
  ]);
  assert.deepEqual(
    edited.graphicSpec.objects.point.items.map(item => item.properties.fill),
    ["red", "red"]
  );
});

test("preserves no-canvas mark and explicit extension top-level compatibility", () => {
  const noCanvas = chart()
    .createData({ values: [] })
    .createPointMark();
  const extension = attachedMarks().createGraphics({
    id: "extension-note",
    type: "text"
  });

  assert.deepEqual(noCanvas.graphicSpec.order, ["point"]);
  assert.deepEqual(extension.graphicSpec.order, ["canvas", "extension-note"]);
  assert.equal(findGraphicParent(extension.graphicSpec, "extension-note"), undefined);
});

test("rejects an incomplete or malformed canonical Canvas hierarchy", () => {
  const missingPlot = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .createData({ values: [] });
  assert.throws(
    () => missingPlot.createPointMark(),
    /requires the canonical plot container/
  );

  const detachedPlot = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .createGraphics({ id: "plot-main", type: "collection" })
    .createData({ values: [] });
  assert.throws(
    () => detachedPlot.createPointMark(),
    /must be attached to the canvas/
  );
});

test("inserts a later ordinary mark below existing axes", () => {
  const guided = chart()
    .createCanvas({ width: 300, height: 220, margin: 60 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createGuides();
  const layered = guided.createPointMark({ id: "overlay" });

  assert.deepEqual(layered.graphicSpec.objects["plot-main"].children, [
    "horizontalGridLines",
    "point",
    "overlay",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle"
  ]);
});
