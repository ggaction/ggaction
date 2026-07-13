import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function histogram() {
  return chart()
    .createCanvas({
      width: 300,
      height: 220,
      margin: { top: 20, right: 30, bottom: 40, left: 50 }
    })
    .createData({
      id: "values",
      values: [
        { value: 60 },
        { value: 100 },
        { value: 100 },
        { value: 200 },
        { value: 480 }
      ]
    })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "value", maxBins: 10 });
}

test("creates a default horizontal grid behind the histogram mark", () => {
  const before = histogram();
  const program = before.createGrid();
  const grid = program.graphicSpec.objects.horizontalGridLines;

  assert.deepEqual(program.semanticSpec.guides.grid, {
    horizontal: { scale: "y", coordinate: "main" }
  });
  assert.deepEqual(before.graphicSpec.order, ["canvas", "bars"]);
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "bars"
  ]);
  assert.equal(grid.children.length > 0, true);
  assert.equal(grid.children.every(child => child.properties.x1 === 50), true);
  assert.equal(grid.children.every(child => child.properties.x2 === 270), true);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createGrid");
  assert.deepEqual(node.children.map(child => child.op), [
    "createHorizontalGrid"
  ]);
  assert.deepEqual(node.children[0].children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createGraphics",
    "rematerializeHorizontalGrid"
  ]);
});

test("creates both directions with bin-aligned vertical grid values", () => {
  const program = histogram().createGrid({
    vertical: {
      color: "#cbd5e1",
      lineWidth: 2,
      strokeDash: [2, 2]
    }
  });
  const vertical = program.graphicSpec.objects.verticalGridLines;

  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "verticalGridLines",
    "bars"
  ]);
  assert.equal(vertical.children.length, 10);
  assert.deepEqual(
    vertical.children[0].properties.strokeDash,
    [2, 2]
  );
  assert.equal(vertical.children[0].properties.stroke, "#cbd5e1");
  assert.equal(vertical.children[0].properties.strokeWidth, 2);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createHorizontalGrid", "createVerticalGrid"]
  );
});

test("reuses existing axis tick values when grid values are omitted", () => {
  const program = histogram()
    .createAxes({ y: { ticksAndLabels: { values: [0, 1, 2] } } })
    .createGrid();
  const ticks = program.graphicSpec.objects.yAxisTicks.children;
  const grid = program.graphicSpec.objects.horizontalGridLines.children;

  assert.equal(grid.length, 3);
  assert.deepEqual(
    grid.map(child => child.properties.y1),
    ticks.map(child => child.properties.y1)
  );
});

test("rematerializes grid geometry after Canvas edits", () => {
  const before = histogram().createGrid({ vertical: true });
  const after = before.editCanvas({ width: 360, margin: 30 });

  assert.notEqual(
    after.graphicSpec.objects.horizontalGridLines.children[0].properties.x2,
    before.graphicSpec.objects.horizontalGridLines.children[0].properties.x2
  );
  assert.notEqual(
    after.graphicSpec.objects.verticalGridLines.children.at(-1).properties.x1,
    before.graphicSpec.objects.verticalGridLines.children.at(-1).properties.x1
  );
  assert.deepEqual(before.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "verticalGridLines",
    "bars"
  ]);
  assert.equal(before.graphicSpec.objects.canvas.properties.width, 300);
});

test("rematerializes grid values when a shared scale domain changes", () => {
  const before = chart()
    .createCanvas({ width: 300, height: 220, margin: 20 })
    .createData({ id: "first", values: [{ value: 0 }, { value: 10 }] })
    .createPointMark({ id: "firstPoints" })
    .encodeY({ field: "value" })
    .createGrid();
  const after = before
    .createData({ id: "second", values: [{ value: 0 }, { value: 100 }] })
    .createPointMark({ id: "secondPoints" })
    .encodeY({ field: "value" });

  assert.deepEqual(before.resolvedScales.y.domain, [0, 10]);
  assert.deepEqual(after.resolvedScales.y.domain, [0, 100]);
  assert.notEqual(
    after.graphicSpec.objects.horizontalGridLines,
    before.graphicSpec.objects.horizontalGridLines
  );
  const encodeY = after.trace.children.at(-1);
  const scaleAction = encodeY.children.find(
    child => child.op === "rematerializeScale"
  );
  assert.equal(
    scaleAction.children.some(
      child => child.op === "rematerializeHorizontalGrid"
    ),
    true
  );
});

test("validates aggregate and directional grid options", () => {
  const program = histogram();

  assert.throws(
    () => program.createGrid({ horizontal: false }),
    /at least one selected direction/
  );
  assert.throws(
    () => program.createGrid({ horizontal: "yes" }),
    /boolean or plain object/
  );
  assert.throws(
    () => program.createGrid({ horizontal: { count: 2, values: [0, 1] } }),
    /cannot use count and values together/
  );
  assert.throws(
    () => program.createGrid({ horizontal: { values: [999] } }),
    /inside the scale domain/
  );
  assert.throws(
    () => program.createGrid({ vertical: { strokeDash: [2] } }),
    /even-length array/
  );
  assert.throws(
    () => program.createGrid({ horizontal: { count: 0 } }),
    /positive integer/
  );
  assert.throws(
    () => program.createGrid({ horizontal: { values: [] } }),
    /non-empty finite number array/
  );
  assert.throws(
    () => program.createGrid({ horizontal: { color: "" } }),
    /non-empty string/
  );
  assert.throws(
    () => program.createGrid({ horizontal: { lineWidth: -1 } }),
    /non-negative/
  );
  assert.throws(
    () => program.createGrid({ extra: true }),
    /Unknown createGrid option/
  );

  const created = program.createGrid();
  assert.throws(() => created.createGrid(), /requires a missing grid/);
  assert.throws(() => program.rematerializeGrid(), /existing grid/);
  assert.throws(() => created.rematerializeGrid({ force: true }), /does not accept/);
  assert.equal(program.semanticSpec.guides.grid, undefined);
});
