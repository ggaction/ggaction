import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function pointProgram() {
  return chart()
    .createData({ id: "cars", values: [{ x: 1, y: 2 }] })
    .createPointMark({ id: "points", data: "cars" });
}

test("createCoordinate stores a coordinate and attaches named layers", () => {
  const before = pointProgram();
  const program = before.createCoordinate({
    id: "main",
    type: "cartesian",
    layers: ["points"]
  });

  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.equal(program.semanticSpec.layers[0].coordinate, "main");
  assert.equal(before.semanticSpec.coordinates.length, 0);
  assert.equal(before.semanticSpec.layers[0].coordinate, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createCoordinate");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic"
  ]);
});

test("createCoordinate reuses an equivalent coordinate", () => {
  const once = pointProgram().createCoordinate({
    id: "main",
    type: "cartesian",
    layers: ["points"]
  });
  const twice = once.createCoordinate({
    id: "main",
    type: "cartesian",
    layers: ["points"]
  });

  assert.deepEqual(twice.semanticSpec, once.semanticSpec);
  assert.deepEqual(twice.trace.children.at(-1).children, []);
});

test("createCoordinate stores a Parallel coordinate resource", () => {
  const program = chart().createCoordinate({ id: "parallel", type: "parallel" });

  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "parallel", type: "parallel" }
  ]);
});

test("createCoordinate rejects conflicting definitions and layer references", () => {
  const program = pointProgram().createCoordinate({
    id: "main",
    type: "cartesian",
    layers: ["points"]
  });

  assert.throws(
    () => program.createCoordinate({ id: "main", type: "polar" }),
    /already exists with type/
  );
  assert.throws(
    () => program.createCoordinate({
      id: "other",
      type: "cartesian",
      layers: ["points"]
    }),
    /already uses coordinate/
  );
});

test("createCoordinate validates types, options, and layer ids", () => {
  const program = pointProgram();

  assert.throws(
    () => program.createCoordinate({ type: "radial" }),
    /Unknown coordinate type/
  );
  assert.throws(
    () => program.createCoordinate({ layers: ["missing"] }),
    /Unknown layer/
  );
  assert.throws(
    () => program.createCoordinate({ layers: "points" }),
    /must be an array/
  );
  assert.throws(
    () => program.createCoordinate({ extra: true }),
    /Unknown createCoordinate option/
  );
});

test("editSemantic accepts polar channel paths and validates coordinate types", () => {
  const program = pointProgram()
    .editSemantic({
      property: "layer[points].encoding.theta.field",
      value: "x"
    })
    .editSemantic({
      property: "layer[points].encoding.radius.scale",
      value: "radius"
    });

  assert.equal(program.semanticSpec.layers[0].encoding.theta.field, "x");
  assert.equal(program.semanticSpec.layers[0].encoding.radius.scale, "radius");
  assert.throws(
    () => program.editSemantic({
      property: "coordinate[main].type",
      value: "radial"
    }),
    /Unknown coordinate type/
  );
});
