import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

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

  assert.throws(() => program.createXAxisLine({ position: "left" }), /Unsupported/);
  assert.throws(() => program.createYAxisLine({ position: "top" }), /Unsupported/);
  assert.throws(() => program.createXAxisLine({ lineWidth: -1 }), /non-negative/);
  assert.throws(() => program.createXAxisLine({ color: "" }), /non-empty/);
  assert.throws(() => program.createXAxisLine({ scale: "missing" }), /requires scale/);
  assert.throws(() => program.editXAxisLine(), /existing/);
  const created = program.createXAxisLine();
  assert.throws(() => created.createXAxisLine(), /missing x-axis line/);
});

test("creates and rematerializes top and right axis lines", () => {
  const created = encodedProgram()
    .createXAxisLine({ position: "top" })
    .createYAxisLine({ position: "right" });

  assert.deepEqual(created.graphicSpec.objects.xAxisLine.properties, {
    x1: 10, y1: 10, x2: 190, y2: 10, stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(created.graphicSpec.objects.yAxisLine.properties, {
    x1: 190, y1: 110, x2: 190, y2: 10, stroke: "#334155", strokeWidth: 1
  });
  assert.equal(created.guideConfigs.axis.x.line.position, "top");
  assert.equal(created.guideConfigs.axis.y.line.position, "right");

  const resized = created.editCanvas({ width: 300, height: 180, margin: 20 });
  assert.equal(resized.graphicSpec.objects.xAxisLine.properties.y1, 20);
  assert.equal(resized.graphicSpec.objects.yAxisLine.properties.x1, 280);
});

test("rematerializes axis lines after Canvas bounds change", () => {
  const created = encodedProgram().createXAxisLine().createYAxisLine();
  const resized = created.editCanvas({ width: 300, height: 180, margin: 20 });
  const node = resized.trace.children.at(-1);

  assert.deepEqual(resized.graphicSpec.objects.xAxisLine.properties, {
    x1: 20, y1: 160, x2: 280, y2: 160, stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(resized.graphicSpec.objects.yAxisLine.properties, {
    x1: 20, y1: 160, x2: 20, y2: 20, stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(
    node.children.map(child => child.op),
    [
      "editGraphics",
      "editGraphics",
      "rematerializeScale",
      "rematerializeScale",
      "rematerializePointMark",
      "editXAxisLine",
      "editYAxisLine"
    ]
  );
});

test("rematerializes an explicit-range axis baseline after margin change", () => {
  const created = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0 }, { x: 10 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { range: [30, 170] } })
    .createXAxisLine();
  const resized = created.editCanvas({ margin: 20 });

  assert.deepEqual(resized.graphicSpec.objects.xAxisLine.properties, {
    x1: 30, y1: 100, x2: 170, y2: 100, stroke: "#334155", strokeWidth: 1
  });
  assert.equal(
    resized.trace.children.at(-1).children.at(-1).op,
    "editXAxisLine"
  );
});
