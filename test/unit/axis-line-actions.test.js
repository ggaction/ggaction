import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

function encodedProgram() {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("creates inferred bottom and left axis lines", () => {
  const before = encodedProgram();
  const program = before.createXAxisLine().createYAxisLine();

  assert.deepEqual(program.semanticSpec.guides, {
    axis: { x: { scale: "x" }, y: { scale: "y" } }
  });
  assert.deepEqual(program.graphicSpec.objects.xAxisLine.properties, {
    x1: 10, y1: 110, x2: 190, y2: 110, stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(program.graphicSpec.objects.yAxisLine.properties, {
    x1: 10, y1: 110, x2: 10, y2: 10, stroke: "#334155", strokeWidth: 1
  });
  assert.equal(before.semanticSpec.guides.axis, undefined);
});

test("records create, edit, and primitive action hierarchy", () => {
  const program = encodedProgram().createXAxisLine({ color: "black", lineWidth: 2 });
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic", "createGraphics", "editXAxisLine"
  ]);
  assert.deepEqual(
    node.children[2].children.map(child => child.op),
    ["editGraphics", "editGraphics", "editGraphics", "editGraphics", "editGraphics", "editGraphics"]
  );
});

test("edits style while re-inferring geometry", () => {
  const created = encodedProgram().createXAxisLine();
  const edited = created.editXAxisLine({ color: "red", lineWidth: 3 });

  assert.equal(edited.graphicSpec.objects.xAxisLine.properties.stroke, "red");
  assert.equal(edited.graphicSpec.objects.xAxisLine.properties.strokeWidth, 3);
  assert.equal(created.graphicSpec.objects.xAxisLine.properties.stroke, "#334155");
});

test("validates positions, style, scale state, duplicates, and missing edits", () => {
  const program = encodedProgram();

  assert.throws(() => program.createXAxisLine({ position: "top" }), /Unsupported/);
  assert.throws(() => program.createYAxisLine({ position: "right" }), /Unsupported/);
  assert.throws(() => program.createXAxisLine({ lineWidth: -1 }), /non-negative/);
  assert.throws(() => program.createXAxisLine({ color: "" }), /non-empty/);
  assert.throws(() => program.createXAxisLine({ scale: "missing" }), /requires scale/);
  assert.throws(() => program.editXAxisLine(), /existing/);
  const created = program.createXAxisLine();
  assert.throws(() => created.createXAxisLine(), /missing x-axis line/);
});
