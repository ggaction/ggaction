import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 10, y: 10 })
]);

function base() {
  return chart()
    .createCanvas({ width: 200, height: 100, margin: 10 })
    .createData({ id: "rows", values: rows });
}

function complete() {
  return base()
    .createTickMark({ id: "ticks" })
    .encodeX({ target: "ticks", field: "x" })
    .encodeY({ target: "ticks", field: "y" });
}

function length(item) {
  const { x1, y1, x2, y2 } = item.properties;
  return Math.hypot(x2 - x1, y2 - y1);
}

test("creates the default Tick identity, config, and incomplete graphics", () => {
  const before = base();
  const program = before.createTickMark();

  assert.deepEqual(program.semanticSpec.layers, [
    { id: "tick", mark: { type: "tick" }, data: "rows" }
  ]);
  assert.deepEqual(program.graphicSpec.objects.tick, {
    type: "line",
    items: []
  });
  assert.deepEqual(program.markConfigs.tick, {
    length: 14,
    stroke: "#4c78a8",
    strokeWidth: 2,
    opacity: 1
  });
  assert.deepEqual(before.semanticSpec.layers, []);
  assert.equal(program.context.currentMark, "tick");
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["editSemantic", "editSemantic", "createGraphics"]
  );
});

test("materializes one centered vertical line only after x and y are complete", () => {
  const created = base().createTickMark({ id: "ticks" });
  const withX = created.encodeX({ field: "x" });
  const completeProgram = withX.encodeY({ field: "y" });
  const items = completeProgram.graphicSpec.objects.ticks.items;

  assert.equal(created.graphicSpec.objects.ticks.items.length, 0);
  assert.equal(withX.graphicSpec.objects.ticks.items.length, 0);
  assert.equal(items.length, 2);
  for (const item of items) {
    assert.equal(item.properties.x1, item.properties.x2);
    assert.equal(length(item), 14);
    assert.equal(
      (item.properties.y1 + item.properties.y2) / 2 >= 10,
      true
    );
  }
  assert.deepEqual(created.semanticSpec.layers[0].encoding, undefined);
});

test("converges for x/y authoring order and Canvas rematerialization", () => {
  const xThenY = complete();
  const yThenX = base()
    .createTickMark({ id: "ticks" })
    .encodeY({ target: "ticks", field: "y" })
    .encodeX({ target: "ticks", field: "x" });
  const resized = xThenY.editCanvas({ width: 260 });

  assert.deepEqual(yThenX.graphicSpec, xThenY.graphicSpec);
  assert.equal(resized.graphicSpec.objects.ticks.items[1].properties.x1, 250);
  assert.equal(xThenY.graphicSpec.objects.ticks.items[1].properties.x1, 190);
  assert.equal(length(resized.graphicSpec.objects.ticks.items[1]), 14);
});

test("edits Tick length and appearance immutably", () => {
  const before = complete();
  const after = before.editTickMark({
    length: 22,
    stroke: "#111827",
    strokeWidth: 3,
    opacity: 0.45
  });
  const resized = after.editCanvas({ height: 140 });

  assert.deepEqual(after.markConfigs.ticks, {
    length: 22,
    stroke: "#111827",
    strokeWidth: 3,
    opacity: 0.45
  });
  for (const program of [after, resized]) {
    assert.equal(program.graphicSpec.objects.ticks.items.every(item =>
      length(item) === 22 &&
      item.properties.stroke === "#111827" &&
      item.properties.strokeWidth === 3 &&
      item.properties.opacity === 0.45
    ), true);
  }
  assert.equal(length(before.graphicSpec.objects.ticks.items[0]), 14);
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["rematerializeTickMark"]
  );
});

test("inherits one compatible Cartesian source and rejects ambiguity", () => {
  const point = base()
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const inherited = point.createTickMark({ id: "ticks" });

  assert.deepEqual(inherited.semanticSpec.layers[1].encoding, {
    x: { field: "x", fieldType: "quantitative", scale: "x" },
    y: { field: "y", fieldType: "quantitative", scale: "y" }
  });
  assert.equal(inherited.graphicSpec.objects.ticks.items.length, 2);

  const ambiguous = point
    .createPointMark({ id: "other", data: "rows" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    ._clone({ context: { currentData: "rows" } });
  assert.throws(
    () => ambiguous.createTickMark({ id: "ticks" }),
    /Layered mark inference is ambiguous/
  );
});

test("supports explicit create appearance and generic removal", () => {
  const created = base()
    .createTickMark({
      id: "rug",
      length: 20,
      stroke: "#2563eb",
      strokeWidth: 1.5,
      opacity: 0.3
    })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const removed = created.removeMark();

  assert.equal(created.trace.children[2].children.at(-1).op, "editTickMark");
  assert.deepEqual(removed.semanticSpec.layers, []);
  assert.equal(removed.graphicSpec.objects.rug, undefined);
  assert.equal(removed.markConfigs.rug, undefined);
  assert.equal(removed.semanticSpec.datasets[0].id, "rows");
  assert.equal(created.graphicSpec.objects.rug.items.length, 2);
});

test("validates create/edit options, targets, and resource identity", () => {
  const program = base();
  assert.throws(() => chart().createTickMark(), /requires data/);
  assert.throws(
    () => program.createTickMark({ data: "missing" }),
    /Unknown dataset/
  );
  assert.throws(() => program.createTickMark({ length: 0 }), /positive/);
  assert.throws(() => program.createTickMark({ stroke: "" }), /non-empty/);
  assert.throws(() => program.createTickMark({ strokeWidth: -1 }), /non-negative/);
  assert.throws(() => program.createTickMark({ opacity: 2 }), /from 0 to 1/);
  assert.throws(
    () => program.createTickMark({ unknown: true }),
    /Unknown createTickMark option/
  );

  const created = program.createTickMark({ id: "ticks" });
  assert.throws(() => created.createTickMark(), /explicit tick mark id/);
  assert.throws(
    () => created.createTickMark({ id: "ticks" }),
    /already exists/
  );
  assert.throws(() => created.editTickMark({}), /requires length/);
  assert.throws(
    () => created.editTickMark({ target: "missing", length: 10 }),
    /Unknown tick mark/
  );

  const ambiguous = created
    .createTickMark({ id: "other", data: "rows" })
    ._clone({ context: {} });
  assert.throws(
    () => ambiguous.editTickMark({ length: 10 }),
    /target is ambiguous/
  );
});
