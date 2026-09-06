import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function sourceProgram() {
  return chart().createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values: [
      { x: 1, y: 2, category: "A", row: "one" },
      { x: 2, y: 3, category: "B", row: "two" }
    ] });
}

test("filled mark creation and editing share the false stroke opt-out", () => {
  const source = sourceProgram();
  for (const [family, x, y] of [
    ["Point", { field: "x" }, { field: "y" }],
    ["Bar", { field: "category", fieldType: "nominal" }, { field: "y" }],
    ["Rect", { field: "category", fieldType: "nominal" }, { field: "row", fieldType: "nominal" }]
  ]) {
    const create = `create${family}Mark`;
    const edit = `edit${family}Mark`;
    const disabled = source[create]({ id: "marks", stroke: false });
    const edited = source[create]({ id: "marks" })[edit]({ stroke: false });
    const complete = program => program.encodeX(x).encodeY(y)
      .editCanvas({ width: 500 });
    const program = complete(disabled);
    assert.deepEqual(program.graphicSpec, complete(edited).graphicSpec, family);
    assert.equal(program.graphicSpec.objects.marks.items.length, 2);
    for (const item of program.graphicSpec.objects.marks.items) {
      assert.equal(item.properties.strokeWidth, 0, family);
    }
  }
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("facades pass false strokes to their existing child mark owners", () => {
  const source = sourceProgram();
  for (const [operation, id, options] of [
    ["createScatterPlot", "scatterPlot", { x: "x", y: "y", point: { stroke: false } }],
    ["createBarPlot", "barPlot", { x: "category", y: "y", bar: { stroke: false } }],
    ["createHistogram", "histogram", { field: "x", bar: { stroke: false } }]
  ]) {
    const program = source[operation]({ ...options, guides: false });
    assert.ok(program.graphicSpec.objects[id].items.length > 0, operation);
    assert.ok(program.graphicSpec.objects[id].items.every(item =>
      item.properties.strokeWidth === 0
    ), operation);
  }
});

test("stroke opt-out does not broaden unrelated appearance values", () => {
  const source = sourceProgram();
  const before = structuredClone(source);
  assert.throws(() => source.createPointMark({ stroke: true }), /non-empty string/);
  assert.throws(() => source.createBarMark({ stroke: 0 }), /non-empty string/);
  assert.throws(() => source.createScatterPlot({
    x: "x", y: "y", point: { outline: false }
  }), /Unknown createScatterPlot point option/);
  assert.throws(() => source.createAreaMark({ stroke: false }), /non-empty string/);
  assert.throws(() => source.createArcMark({ stroke: false }), /non-empty string/);
  assert.deepEqual(structuredClone(source), before);
});
