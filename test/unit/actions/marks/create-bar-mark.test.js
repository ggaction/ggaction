import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function dataProgram() {
  return chart().createData({
    id: "cars",
    values: [{ Displacement: 307, Origin: "USA" }]
  });
}

test("creates a semantic bar mark and empty rect collection", () => {
  const before = dataProgram();
  const program = before.createBarMark({ id: "bars" });

  assert.deepEqual(program.semanticSpec.layers, [
    { id: "bars", mark: { type: "bar" }, data: "cars" }
  ]);
  assert.deepEqual(program.graphicSpec.objects.bars, {
    type: "rect",
    children: []
  });
  assert.equal(program.context.currentData, "cars");
  assert.equal(program.context.currentMark, "bars");
  assert.deepEqual(before.semanticSpec.layers, []);
  assert.equal(before.graphicSpec.objects.bars, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createBarMark");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createGraphics"
  ]);
  assert.deepEqual(node.children[2].args, {
    id: "bars",
    type: "rect",
    length: 0
  });
});

test("uses an explicit dataset without changing currentData", () => {
  const program = dataProgram()
    .createData({ id: "other", values: [] })
    .createBarMark({ id: "bars", data: "cars" });

  assert.equal(program.semanticSpec.layers[0].data, "cars");
  assert.equal(program.context.currentData, "other");
  assert.equal(program.context.currentMark, "bars");
});

test("supports empty datasets because bar cardinality is unresolved", () => {
  const program = chart()
    .createData({ id: "empty", values: [] })
    .createBarMark({ id: "bars" });

  assert.equal(program.graphicSpec.objects.bars.children.length, 0);
});

test("validates bar mark options, ids, data, and conflicts", () => {
  const program = dataProgram();

  assert.throws(() => chart().createBarMark({ id: "bars" }), /requires data/);
  assert.throws(
    () => program.createBarMark({ id: "bars", data: "missing" }),
    /Unknown dataset/
  );
  assert.throws(
    () => program.createBarMark({ id: "bad id" }),
    /Bar mark id/
  );
  assert.throws(
    () => program.createBarMark({ id: "bars", shape: "rect" }),
    /Unknown createBarMark option/
  );

  const created = program.createBarMark({ id: "bars" });
  assert.throws(
    () => created.createBarMark({ id: "bars" }),
    /already exists/
  );
  const graphicConflict = program.createGraphics({
    id: "bars",
    type: "rect",
    length: 0
  });
  assert.throws(
    () => graphicConflict.createBarMark({ id: "bars" }),
    /Graphic "bars" already exists/
  );
});
