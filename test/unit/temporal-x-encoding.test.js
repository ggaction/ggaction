import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

const rows = [
  { year: "1970-03-20" },
  { year: "1981-08-01" }
];

function createLineProgram(values = rows) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values })
    .createLineMark({ id: "trends" });
}

test("encodes a temporal x field and resolves a nice time scale", () => {
  const before = createLineProgram();
  const program = before.encodeX({
    field: "year",
    fieldType: "temporal",
    scale: { nice: true }
  });

  assert.deepEqual(program.semanticSpec.layers[0], {
    id: "trends",
    mark: { type: "line" },
    data: "cars",
    coordinate: "main",
    encoding: {
      x: { field: "year", fieldType: "temporal", scale: "x" }
    }
  });
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "time", domain: "auto", range: "auto", nice: true }
  ]);
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.deepEqual(program.resolvedScales.x, {
    type: "time",
    domain: [Date.UTC(1970, 0, 1), Date.UTC(1982, 0, 1)],
    range: [20, 220]
  });
  assert.deepEqual(program.graphicSpec.objects.trends.children, []);
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);
  assert.equal(before.semanticSpec.layers[0].coordinate, undefined);
  assert.deepEqual(before.resolvedScales, {});
});

test("records temporal encodeX as nested wrapped actions", () => {
  const program = createLineProgram().encodeX({
    field: "year",
    fieldType: "temporal",
    scale: { nice: true }
  });
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
  assert.deepEqual(
    node.children[4].children.map(child => child.op),
    ["editSemantic", "editSemantic", "editSemantic", "editSemantic"]
  );
  assert.deepEqual(node.children[5].children, []);
});

test("keeps an explicit time domain unchanged when nice is true", () => {
  const domain = [Date.UTC(1970, 2, 1), Date.UTC(1981, 7, 1)];
  const program = createLineProgram().encodeX({
    field: "year",
    fieldType: "temporal",
    scale: { domain, range: [10, 110], nice: true }
  });

  assert.deepEqual(program.semanticSpec.scales[0].domain, domain);
  assert.deepEqual(program.resolvedScales.x.domain, domain);
  assert.deepEqual(program.resolvedScales.x.range, [10, 110]);
});

test("validates temporal x fields and scale policies", () => {
  assert.throws(
    () => createLineProgram([{ year: "not-a-date" }]).encodeX({
      field: "year",
      fieldType: "temporal"
    }),
    /temporal string or finite timestamp/
  );
  assert.throws(
    () => createLineProgram().encodeX({
      field: "year",
      fieldType: "temporal",
      scale: { type: "linear" }
    }),
    /Unsupported temporal scale type/
  );
  assert.throws(
    () => createLineProgram().encodeX({
      field: "year",
      fieldType: "temporal",
      scale: { zero: false }
    }),
    /does not support zero/
  );
  assert.throws(
    () => createLineProgram().encodeX({
      field: "year",
      fieldType: "temporal",
      scale: { nice: 1 }
    }),
    /nice must be a boolean/
  );
  assert.throws(
    () => createLineProgram().encodeY({
      field: "year",
      fieldType: "temporal"
    }),
    /currently supports temporal x only/
  );
});

test("rejects conflicting policies on a shared time scale", () => {
  const program = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "first" })
    .encodeX({
      target: "first",
      field: "year",
      fieldType: "temporal",
      scale: { id: "shared", nice: true }
    })
    .createLineMark({ id: "second", data: "cars" });

  assert.throws(
    () => program.encodeX({
      target: "second",
      field: "year",
      fieldType: "temporal",
      scale: { id: "shared", nice: false }
    }),
    /already exists with a different definition/
  );
});
