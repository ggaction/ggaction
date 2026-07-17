import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function pointGrid() {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes({
      x: { ticksAndLabels: { values: [0, 5, 10] } },
      y: { ticksAndLabels: { values: [0, 5, 10] } }
    })
    .createGrid({ vertical: true });
}

test("edits horizontal and vertical grid policies through wrapped rematerialization", () => {
  const before = pointGrid();
  const horizontal = before.editHorizontalGrid({ count: 3 });
  const edited = horizontal.editVerticalGrid({ values: [0, 10] });

  assert.equal(horizontal.guideConfigs.grid.horizontal.mode, "count");
  assert.equal(horizontal.guideConfigs.grid.horizontal.count, 3);
  assert.equal(horizontal.guideConfigs.grid.horizontal.inferredValues, false);
  assert.equal(edited.guideConfigs.grid.vertical.mode, "values");
  assert.deepEqual(edited.guideConfigs.grid.vertical.values, [0, 10]);
  assert.equal(edited.graphicSpec.objects.verticalGridLines.items.length, 2);
  assert.deepEqual(
    horizontal.trace.children.at(-1).children.map(child => child.op),
    ["rematerializeHorizontalGrid"]
  );
  assert.deepEqual(before.guideConfigs.grid.horizontal.values, [0, 5, 10]);
  assert.equal(before.graphicSpec.objects.verticalGridLines.items.length, 3);
});

test("restores current axis inference with values auto", () => {
  const before = pointGrid();
  const explicit = before.editHorizontalGrid({ values: [0, 10] });
  const restored = explicit.editHorizontalGrid({ values: "auto" });

  assert.equal(explicit.graphicSpec.objects.horizontalGridLines.items.length, 2);
  assert.equal(restored.guideConfigs.grid.horizontal.inferredValues, true);
  assert.equal(restored.guideConfigs.grid.horizontal.mode, "values");
  assert.deepEqual(restored.guideConfigs.grid.horizontal.values, [0, 5, 10]);
  assert.equal(restored.graphicSpec.objects.horizontalGridLines.items.length, 3);
});

test("merges only requested appearance and matches raw primitive graphics", () => {
  const before = pointGrid();
  const options = {
    values: [0, 10],
    color: "#94a3b8",
    lineWidth: 2,
    strokeDash: [4, 2]
  };
  const edited = before.editHorizontalGrid(options);
  const bounds = { left: 20, right: 220 };
  const y = [140, 20];
  const primitive = before
    .editGraphics({ target: "horizontalGridLines", property: "length", value: 2 })
    .editGraphics({ target: "horizontalGridLines", property: "x1", value: bounds.left })
    .editGraphics({ target: "horizontalGridLines", property: "y1", value: y })
    .editGraphics({ target: "horizontalGridLines", property: "x2", value: bounds.right })
    .editGraphics({ target: "horizontalGridLines", property: "y2", value: y })
    .editGraphics({ target: "horizontalGridLines", property: "stroke", value: options.color })
    .editGraphics({ target: "horizontalGridLines", property: "strokeWidth", value: options.lineWidth })
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeDash",
      value: [options.strokeDash, options.strokeDash]
    });

  assert.deepEqual(edited.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(edited.semanticSpec, before.semanticSpec);
  assert.equal(edited.guideConfigs.grid.horizontal.color, options.color);
  assert.equal(edited.guideConfigs.grid.horizontal.lineWidth, options.lineWidth);
  assert.deepEqual(edited.guideConfigs.grid.horizontal.strokeDash, options.strokeDash);
  assert.deepEqual(before.guideConfigs.grid.horizontal.strokeDash, []);
  options.values.push(5);
  options.strokeDash.push(8, 8);
  assert.deepEqual(edited.guideConfigs.grid.horizontal.values, [0, 10]);
  assert.deepEqual(edited.guideConfigs.grid.horizontal.strokeDash, [4, 2]);
});

test("converges across grid edits, Canvas edits, and scale edits", () => {
  const before = pointGrid();
  const gridOptions = { count: 4, color: "#cbd5e1", strokeDash: [2, 2] };
  const canvasOptions = { width: 300, margin: 30 };
  const first = before
    .editHorizontalGrid(gridOptions)
    .editCanvas(canvasOptions)
    .editScale({ id: "y", domain: [0, 20] });
  const second = before
    .editScale({ id: "y", domain: [0, 20] })
    .editCanvas(canvasOptions)
    .editHorizontalGrid(gridOptions);

  assert.deepEqual(first.semanticSpec, second.semanticSpec);
  assert.deepEqual(first.graphicSpec, second.graphicSpec);
  assert.deepEqual(first.guideConfigs.grid, second.guideConfigs.grid);
});

test("validates existing resources, edit options, and values atomically", () => {
  const withoutGrid = chart()
    .createCanvas({ width: 200, height: 120, margin: 20 })
    .createData({ id: "data", values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const program = pointGrid();

  assert.throws(() => withoutGrid.editHorizontalGrid({ count: 2 }), /existing horizontal grid/);
  assert.throws(() => program.editHorizontalGrid(), /at least one option/);
  assert.throws(() => program.editVerticalGrid({ scale: "x" }), /Unknown editVerticalGrid option/);
  assert.throws(
    () => program.editHorizontalGrid({ count: 2, values: [0, 10] }),
    /cannot use count and values together/
  );
  assert.throws(() => program.editHorizontalGrid({ count: 0 }), /positive integer/);
  assert.throws(() => program.editHorizontalGrid({ values: "automatic" }), /must be "auto"/);
  assert.throws(() => program.editHorizontalGrid({ values: [] }), /non-empty finite/);
  assert.throws(() => program.editHorizontalGrid({ values: [20] }), /inside the scale domain/);
  assert.throws(() => program.editHorizontalGrid({ color: "" }), /non-empty string/);
  assert.throws(() => program.editHorizontalGrid({ lineWidth: -1 }), /non-negative/);
  assert.throws(() => program.editHorizontalGrid({ strokeDash: [2] }), /even-length/);
  assert.deepEqual(program.guideConfigs.grid.horizontal.values, [0, 5, 10]);
});

test("edits selected grid directions through one aggregate facade", () => {
  const before = pointGrid();
  const edited = before.editGrid({
    horizontal: { color: "#cbd5e1", strokeDash: [4, 2] },
    vertical: { lineWidth: 2 }
  });
  const node = edited.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "editHorizontalGrid", "editVerticalGrid"
  ]);
  assert.equal(edited.guideConfigs.grid.horizontal.color, "#cbd5e1");
  assert.equal(edited.guideConfigs.grid.vertical.lineWidth, 2);
  assert.notEqual(edited.guideConfigs.grid, before.guideConfigs.grid);
});

test("validates aggregate grid patches before editing either direction", () => {
  const program = pointGrid();
  const initialColor = program.guideConfigs.grid.horizontal.color;
  assert.throws(() => program.editGrid(), /requires horizontal or vertical/);
  assert.throws(() => program.editGrid({ horizontal: false }), /plain object/);
  assert.throws(
    () => program.editGrid({ horizontal: { color: "red" }, vertical: { count: 0 } }),
    /positive integer/
  );
  assert.equal(program.guideConfigs.grid.horizontal.color, initialColor);
});
