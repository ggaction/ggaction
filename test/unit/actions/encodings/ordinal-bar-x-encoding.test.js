import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function barProgram(values = [
  { year: 1850 },
  { year: 1860 },
  { year: 1850 },
  { year: 1870 }
]) {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" });
}

test("encodes an ordinal bar x field with the shortest valid call", () => {
  const before = barProgram();
  const program = before.encodeX({ field: "year", fieldType: "ordinal" });

  assert.deepEqual(program.semanticSpec.layers, [{
    id: "bars",
    mark: { type: "bar" },
    data: "jobs",
    coordinate: "main",
    encoding: {
      x: { field: "year", fieldType: "ordinal", scale: "x" }
    }
  }]);
  assert.deepEqual(program.semanticSpec.scales, [{
    id: "x",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  }]);
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.deepEqual(program.resolvedScales.x, {
    type: "ordinal",
    domain: [1850, 1860, 1870],
    range: [60, 380],
    step: 320 / 3,
    bandwidth: 320 / 3
  });
  assert.deepEqual(program.graphicSpec.objects.bars.children, []);
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeX");
  assert.deepEqual(node.children.map(child => child.op), [
    "createCoordinate",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeScale"
  ]);
});

test("supports explicit ordinal scale identity, order, and reversed range", () => {
  const program = barProgram().encodeX({
    field: "year",
    fieldType: "ordinal",
    coordinate: "plot",
    scale: {
      id: "year",
      domain: [1870, 1860, 1850],
      range: [300, 0]
    }
  });

  assert.equal(program.semanticSpec.layers[0].coordinate, "plot");
  assert.equal(program.semanticSpec.layers[0].encoding.x.scale, "year");
  assert.deepEqual(program.resolvedScales.year, {
    type: "ordinal",
    domain: [1870, 1860, 1850],
    range: [300, 0],
    step: -100,
    bandwidth: 100
  });
});

test("validates ordinal bar x options before changing the program", () => {
  const program = barProgram();

  assert.throws(
    () => program.encodeX({ field: "year" }),
    /requires bin/
  );
  assert.throws(
    () => program.encodeX({ field: "year", fieldType: "ordinal", bin: {} }),
    /does not support bin/
  );
  assert.throws(
    () => program.encodeX({
      field: "year",
      fieldType: "ordinal",
      scale: { nice: true }
    }),
    /does not support nice/
  );
  assert.throws(
    () => program.encodeX({
      field: "year",
      fieldType: "ordinal",
      scale: { zero: false }
    }),
    /does not support zero/
  );
  assert.throws(
    () => program.encodeX({ field: "missing", fieldType: "ordinal" }),
    /nominal value/
  );
  assert.throws(
    () => program.encodeX({
      field: "year",
      fieldType: "ordinal",
      scale: { domain: [1850] }
    }),
    /outside the ordinal domain/
  );
  assert.equal(program.semanticSpec.layers[0].encoding, undefined);
});
