import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

function completePointProgram() {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({
      id: "rows",
      values: [
        { x: 0, y: 0, group: "a" },
        { x: 10, y: 10, group: "b" }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeRadius({ value: 3 });
}

function pathArea(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

test("edits a constant point shape into normalized diamond paths", () => {
  const before = completePointProgram();
  const after = before.editPointMark({ shape: "diamond" });
  const children = after.graphicSpec.objects.points.children;

  assert.equal(before.graphicSpec.objects.points.type, "circle");
  assert.equal(after.graphicSpec.objects.points.type, "collection");
  assert.equal(after.markConfigs.points.shape, "diamond");
  assert.equal(children.every(child => child.type === "path"), true);
  assert.equal(children.every(child => child.properties.closed === true), true);
  assert.equal(
    children.every(child =>
      Math.abs(pathArea(child.properties.points) - Math.PI * 3 ** 2) < 1e-9
    ),
    true
  );
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["rematerializePointMark"]
  );
});

test("supports every constant shape and preserves equal logical area", () => {
  const base = completePointProgram();
  for (const shape of [
    "circle", "square", "diamond", "triangle-up", "triangle-down",
    "triangle-left", "triangle-right", "plus", "cross", "star",
    "hexagon", "wye"
  ]) {
    const program = base.editPointMark({ target: "points", shape });
    const child = program.graphicSpec.objects.points.children[0];
    const type = child.type ?? program.graphicSpec.objects.points.type;
    const area = type === "circle"
      ? Math.PI * child.properties.radius ** 2
      : type === "rect"
        ? child.properties.width * child.properties.height
        : pathArea(child.properties.points);
    assert.equal(Math.abs(area - Math.PI * 3 ** 2) < 1e-9, true, shape);
  }
});

test("rejects missing, invalid, ambiguous, and field-driven shape edits", () => {
  const base = completePointProgram();
  assert.throws(() => base.editPointMark({}), /requires shape/);
  assert.throws(() => base.editPointMark({ shape: "triangle" }), /Unsupported/);
  assert.throws(
    () => base.editPointMark({ target: "missing", shape: "circle" }),
    /Unknown point mark/
  );
  assert.throws(
    () => base.encodeShape({ field: "group" }).editPointMark({ shape: "circle" }),
    /cannot be combined/
  );

  const ambiguous = base
    .createPointMark({ id: "other", data: "rows" })
    ._clone({ context: {} });
  assert.throws(
    () => ambiguous.editPointMark({ shape: "circle" }),
    /Point mark id/
  );
  assert.equal(base.markConfigs.points.shape, "circle");
  assert.equal(base.graphicSpec.objects.points.type, "circle");
});
