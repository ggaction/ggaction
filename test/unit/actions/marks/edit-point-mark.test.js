import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { linearCommandPoints } from "../../../support/path.js";

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
  assert.equal(children.every(child => child.properties.commands.at(-1).op === "Z"), true);
  assert.equal(
    children.every(child =>
      Math.abs(pathArea(linearCommandPoints(child.properties.commands)) - Math.PI * 3 ** 2) < 1e-9
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
        : pathArea(linearCommandPoints(child.properties.commands));
    assert.equal(Math.abs(area - Math.PI * 3 ** 2) < 1e-9, true, shape);
  }
});

test("edits persistent point opacity and outline appearance", () => {
  const base = completePointProgram();
  const styled = base.editPointMark({
    opacity: 0.72,
    stroke: "#ffffff",
    strokeWidth: 0.6
  });
  const rematerialized = styled.editCanvas({ width: 240 });

  assert.deepEqual(styled.markConfigs.points, {
    shape: "circle",
    radius: 3,
    opacity: 0.72,
    stroke: "#ffffff",
    strokeWidth: 0.6
  });
  for (const program of [styled, rematerialized]) {
    assert.equal(program.graphicSpec.objects.points.children.every(child =>
      child.properties.opacity === 0.72 &&
      child.properties.stroke === "#ffffff" &&
      child.properties.strokeWidth === 0.6
    ), true);
  }
});

test("keeps path shapes incomplete until position and size are all available", () => {
  const base = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ values: [{ group: "a", value: 2 }] })
    .createPointMark({ shape: "diamond" });
  const withX = base.encodeX({ field: "group", fieldType: "nominal" });
  const complete = withX
    .encodeY({ field: "value" })
    .encodeRadius({ value: 3 });

  assert.deepEqual(withX.graphicSpec.objects.point.children[0], {
    id: "point:0",
    type: "path",
    properties: { fill: "#4c78a8" }
  });
  assert.equal(
    complete.graphicSpec.objects.point.children[0].properties.commands.at(-1).op,
    "Z"
  );
});

test("rejects missing, invalid, ambiguous, and field-driven shape edits", () => {
  const base = completePointProgram();
  assert.throws(() => base.editPointMark({}), /requires shape, opacity, stroke/);
  assert.throws(() => base.editPointMark({ shape: "triangle" }), /Unsupported/);
  assert.throws(
    () => base.editPointMark({ target: "missing", shape: "circle" }),
    /Unknown point mark/
  );
  assert.throws(
    () => base.encodeShape({ field: "group" }).editPointMark({ shape: "circle" }),
    /cannot be combined/
  );
  assert.throws(() => base.editPointMark({ opacity: 2 }), /from 0 to 1/);
  assert.throws(() => base.editPointMark({ strokeWidth: 1 }), /active stroke/);

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
