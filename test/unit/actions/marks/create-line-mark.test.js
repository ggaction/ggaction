import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function dataProgram() {
  return chart().createData({
    id: "cars",
    values: [{ Year: "1970-01-01", Acceleration: 12, Origin: "USA" }]
  });
}

test("creates a semantic line mark and empty path collection", () => {
  const before = dataProgram();
  const program = before.createLineMark();

  assert.deepEqual(program.semanticSpec.layers, [
    { id: "line", mark: { type: "line" }, data: "cars" }
  ]);
  assert.deepEqual(program.graphicSpec.objects.line, {
    type: "path",
    items: []
  });
  assert.equal(program.context.currentData, "cars");
  assert.equal(program.context.currentMark, "line");
  assert.deepEqual(before.semanticSpec.layers, []);
  assert.equal(before.graphicSpec.objects.line, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createLineMark");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createGraphics"
  ]);
  assert.deepEqual(node.children[2].args, {
    id: "line",
    type: "path",
    length: 0
  });
  assert.deepEqual(node.args, {});
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

  assert.equal(program.graphicSpec.objects.trends.items.length, 0);
});

test("stores explicit curve and stroke appearance for later materialization", () => {
  const program = dataProgram().createLineMark({
    id: "trends",
    curve: "step",
    stroke: "#7c3aed",
    strokeWidth: 0,
    opacity: 0.5
  });

  assert.deepEqual(program.markConfigs.trends, {
    curve: "step",
    strokeWidth: 0,
    stroke: "#7c3aed",
    opacity: 0.5
  });
  assert.deepEqual(dataProgram().createLineMark({ id: "trends" }).markConfigs.trends, {});
  assert.equal(program.trace.children.at(-1).children.at(-1).op, "editLineMark");
  assert.throws(
    () => dataProgram()
      .createLineMark({ id: "colored", stroke: "#7c3aed" })
      .encodeColor({ field: "Origin" }),
    /cannot replace constant appearance/
  );
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
  assert.throws(
    () => program.createLineMark({ id: "trends", scales: false }),
    /Unknown createLineMark option/
  );
  assert.throws(
    () => program.createLineMark({ id: "trends", curve: "smooth" }),
    /Unsupported curve interpolation/
  );
  assert.throws(
    () => program.createLineMark({ id: "trends", opacity: 2 }),
    /from 0 to 1/
  );

  const created = program.createLineMark({ id: "trends" });
  assert.throws(
    () => created.createLineMark(),
    /requires an explicit line mark id because its default is ambiguous/
  );
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

test("cardinal tension reaches grouped paths through facade, edits, resize, and persistence", async () => {
  const { serializeProgram, deserializeProgram } = await import("../../../../src/persistence.js");
  const values = [0, 3, 6].flatMap(x => [
    { x, y: x === 3 ? 3 : 0, group: "A" },
    { x, y: x === 3 ? 4 : 1, group: "B" }
  ]);
  const base = chart().createCanvas({ width: 500, height: 400, margin: 50 }).createData({ values });
  const p = base.createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false,
    line: { curve: "cardinal", tension: 0.9 } });
  const snapshot = serializeProgram(p);
  assert.equal(p.markConfigs.linePlot.tension, 0.9);
  assert.equal(p.graphicSpec.objects.linePlot.items.length, 2);
  const q = p.editLineMark({ tension: 0.5 });
  assert.notDeepEqual(q.graphicSpec.objects.linePlot.items, p.graphicSpec.objects.linePlot.items);
  const restored = deserializeProgram(snapshot).editCanvas({ width: 600 });
  assert.equal(restored.markConfigs.linePlot.tension, 0.9);
  assert.equal(restored.graphicSpec.objects.linePlot.items.length, 2);
  assert.deepEqual(deserializeProgram(snapshot).graphicSpec, p.graphicSpec);
  const linear = q.editLineMark({ curve: "linear" });
  assert.equal(linear.markConfigs.linePlot.tension, undefined);
  assert.ok(linear.graphicSpec.objects.linePlot.items.every(item => item.properties.commands.slice(1).every(c => c.op === "L")));
  assert.throws(() => p.editLineMark({ curve: "basis", tension: 0.5 }), /requires cardinal/u);
  assert.throws(() => base.createLineMark({ tension: 0.5 }), /requires cardinal/u);
  assert.equal(serializeProgram(p), snapshot);
});
