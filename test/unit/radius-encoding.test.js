import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

function createPointProgram() {
  return chart()
    .createData({ id: "cars", values: [{ value: 1 }, { value: 2 }] })
    .createPointMark({ id: "points" });
}

test("broadcasts a constant radius without changing semantic state", () => {
  const before = createPointProgram();
  const program = before.encodeRadius({ value: 3 });

  assert.equal(program.semanticSpec, before.semanticSpec);
  assert.equal(program.resolvedScales, before.resolvedScales);
  assert.deepEqual(
    program.graphicSpec.objects.points.children.map(
      child => child.properties.radius
    ),
    [3, 3]
  );
  assert.equal(before.graphicSpec.objects.points.children[0].properties.radius, undefined);
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
    program.graphicSpec.objects.points.children.map(
      child => child.properties.radius
    ),
    [0, 0]
  );
});

test("validates radius values, options, and targets", () => {
  const program = createPointProgram();

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
});
