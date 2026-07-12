import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

function dataProgram() {
  return chart().createData({
    id: "cars",
    values: [{ Year: "1970-01-01", Acceleration: 12 }]
  });
}

test("creates a semantic line mark and empty path collection", () => {
  const before = dataProgram();
  const program = before.createLineMark({ id: "trends" });

  assert.deepEqual(program.semanticSpec.layers, [
    { id: "trends", mark: { type: "line" }, data: "cars" }
  ]);
  assert.deepEqual(program.graphicSpec.objects.trends, {
    type: "path",
    children: []
  });
  assert.equal(program.context.currentData, "cars");
  assert.equal(program.context.currentMark, "trends");
  assert.deepEqual(before.semanticSpec.layers, []);
  assert.equal(before.graphicSpec.objects.trends, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createLineMark");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createGraphics"
  ]);
  assert.deepEqual(node.children[2].args, {
    id: "trends",
    type: "path",
    length: 0
  });
});

test("uses an explicit dataset without changing currentData", () => {
  const program = dataProgram()
    .createData({ id: "other", values: [] })
    .createLineMark({ id: "trends", data: "cars" });

  assert.equal(program.semanticSpec.layers[0].data, "cars");
  assert.equal(program.context.currentData, "other");
  assert.equal(program.context.currentMark, "trends");
});

test("supports empty datasets because series cardinality is unresolved", () => {
  const program = chart()
    .createData({ id: "empty", values: [] })
    .createLineMark({ id: "trends" });

  assert.equal(program.graphicSpec.objects.trends.children.length, 0);
});

test("validates line mark options, ids, data, and conflicts", () => {
  const program = dataProgram();

  assert.throws(() => chart().createLineMark({ id: "trends" }), /requires data/);
  assert.throws(
    () => program.createLineMark({ id: "trends", data: "missing" }),
    /Unknown dataset/
  );
  assert.throws(
    () => program.createLineMark({ id: "bad id" }),
    /Line mark id/
  );
  assert.throws(
    () => program.createLineMark({ id: "trends", shape: "path" }),
    /Unknown createLineMark option/
  );

  const created = program.createLineMark({ id: "trends" });
  assert.throws(
    () => created.createLineMark({ id: "trends" }),
    /already exists/
  );
  const graphicConflict = program.createGraphics({
    id: "trends",
    type: "path",
    length: 0
  });
  assert.throws(
    () => graphicConflict.createLineMark({ id: "trends" }),
    /Graphic "trends" already exists/
  );
});
