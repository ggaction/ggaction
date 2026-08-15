import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { linearCommandPoints } from "../../../support/path.js";

function createPointProgram() {
  return chart()
    .createData({ id: "cars", values: [{ value: 1 }, { value: 2 }] })
    .createPointMark({ id: "points" });
}

function completePointProgram(shape) {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({
      id: "rows",
      values: [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    })
    .createPointMark({ id: "points", shape })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });
}

function pathArea(commands) {
  const points = linearCommandPoints(commands);
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function pointArea(child, parentType) {
  const type = child.type ?? parentType;
  if (type === "circle") return Math.PI * child.properties.radius ** 2;
  if (type === "rect") return child.properties.width * child.properties.height;
  return pathArea(child.properties.commands);
}

test("broadcasts a constant radius without changing semantic state", () => {
  const before = createPointProgram();
  const program = before.encodeRadius({ value: 3 });

  assert.equal(program.semanticSpec, before.semanticSpec);
  assert.equal(program.resolvedScales, before.resolvedScales);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(
      child => child.properties.radius
    ),
    [3, 3]
  );
  assert.equal(before.graphicSpec.objects.points.items[0].properties.radius, undefined);
});

test("records encodeRadius with one graphical child action", () => {
  const program = createPointProgram().encodeRadius({ value: 4 });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "encodeRadius");
  assert.deepEqual(node.args, { value: 4 });
  assert.deepEqual(
    node.children.map(child => child.op),
    ["rematerializePointMark"]
  );
});

test("supports an explicit point target", () => {
  const program = createPointProgram().encodeRadius({
    target: "points",
    value: 0
  });

  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(
      child => child.properties.radius
    ),
    [0, 0]
  );
});

test("replaces an existing constant radius through the same assignment", () => {
  const before = createPointProgram().encodeRadius({ value: 3 });
  const after = before.encodeRadius({ value: 6 });

  assert.deepEqual(
    before.graphicSpec.objects.points.items.map(
      child => child.properties.radius
    ),
    [3, 3]
  );
  assert.deepEqual(
    after.graphicSpec.objects.points.items.map(
      child => child.properties.radius
    ),
    [6, 6]
  );
  assert.equal(after.trace.children.at(-1).op, "encodeRadius");
});

test("replaces constant radius across circle, diamond, and square geometry", () => {
  for (const shape of ["circle", "diamond", "square"]) {
    const initial = completePointProgram(shape).encodeRadius({ value: 3 });
    const replaced = initial.encodePointRadius({ value: 6 });
    const initialGraphic = initial.graphicSpec.objects.points;
    const replacedGraphic = replaced.graphicSpec.objects.points;

    assert.equal(initial.markConfigs.points.radius, 3, `${shape} initial config`);
    assert.equal(replaced.markConfigs.points.radius, 6, `${shape} replaced config`);
    assert.equal(initialGraphic.items.every(child =>
      Math.abs(pointArea(child, initialGraphic.type) - Math.PI * 3 ** 2) < 1e-9
    ), true, `${shape} initial area`);
    assert.equal(replacedGraphic.items.every(child =>
      Math.abs(pointArea(child, replacedGraphic.type) - Math.PI * 6 ** 2) < 1e-9
    ), true, `${shape} replaced area`);
    assert.equal(replaced.trace.children.at(-1).op, "encodePointRadius");
    assert.deepEqual(
      replaced.trace.children.at(-1).children.map(child => child.op),
      ["encodeRadius"]
    );
  }
});

test("keeps an explicit radius through point-shape edit and reassignment", () => {
  const circle = completePointProgram("circle").encodeRadius({ value: 3 });
  const square = circle.editPointMark({ target: "points", shape: "square" });
  const resizedSquare = square.encodeRadius({ target: "points", value: 5 });
  const diamond = resizedSquare.editPointMark({ target: "points", shape: "diamond" });

  for (const [label, program, radius] of [
    ["circle", circle, 3],
    ["square", square, 3],
    ["resized square", resizedSquare, 5],
    ["diamond", diamond, 5]
  ]) {
    const graphic = program.graphicSpec.objects.points;
    assert.equal(graphic.items.every(child =>
      Math.abs(pointArea(child, graphic.type) - Math.PI * radius ** 2) < 1e-9
    ), true, label);
  }
});

test("validates radius values, options, and targets", () => {
  const program = completePointProgram("square").encodeRadius({ value: 4 });
  const before = JSON.stringify({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    markConfigs: program.markConfigs,
    trace: program.trace
  });

  assert.throws(() => program.encodeRadius(), /non-negative finite value/);
  assert.throws(
    () => program.encodeRadius({ value: -1 }),
    /non-negative finite value/
  );
  assert.throws(
    () => program.encodeRadius({ value: 3, extra: true }),
    /Unknown encodeRadius option/
  );
  assert.throws(
    () => program.encodeRadius({ target: "missing", value: 3 }),
    /Unknown point mark/
  );
  assert.equal(JSON.stringify({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    markConfigs: program.markConfigs,
    trace: program.trace
  }), before);
});
