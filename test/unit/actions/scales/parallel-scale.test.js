import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const rows = Object.freeze([
  Object.freeze({ id: "first", a: 5, b: 5, grade: "low" }),
  Object.freeze({ id: "second", a: 10, b: 10, grade: "high" })
]);

function base(dimensions = [
  { field: "a", scale: { domain: [0, 10], range: [100, 0] } },
  { field: "b", scale: { domain: [0, 10], range: [100, 0] } }
], guides = false) {
  return chart()
    .createCanvas({ width: 180, height: 140, margin: 20 })
    .createData({ id: "values", values: rows })
    .createParallelCoordinates({
      id: "lines", data: "values", dimensions, key: "id", guides
    });
}

function commands(program, item = 0) {
  return program.graphicSpec.objects.lines.items[item].properties.commands;
}

test("edits one Parallel dimension by field identity and rematerializes its path", () => {
  const before = base();
  const options = Object.freeze({
    target: "lines", dimension: "a", domain: Object.freeze([0, 20])
  });
  const after = before.editParallelScale(options);
  const dimensions = after.semanticSpec.layers[0].encoding.parallel.dimensions;
  const aScale = dimensions.find(dimension => dimension.field === "a").scale;
  const bScale = dimensions.find(dimension => dimension.field === "b").scale;

  assert.equal(commands(before)[0].y, 50);
  assert.equal(commands(after)[0].y, 75);
  assert.equal(commands(after)[0].x, commands(before)[0].x);
  assert.equal(commands(after)[1].y, commands(before)[1].y);
  assert.deepEqual(
    after.semanticSpec.scales.find(scale => scale.id === aScale).domain,
    [0, 20]
  );
  assert.deepEqual(
    after.semanticSpec.scales.find(scale => scale.id === bScale).domain,
    [0, 10]
  );
  assert.equal(after.trace.children.at(-1).op, "editParallelScale");
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["editScale"]
  );
  assert.equal(commands(before)[0].y, 50);
});

test("resolves the same field after dimension reordering and refreshes axes", () => {
  const before = base(undefined, { legend: false });
  const reordered = before.encodeParallelCoordinates({
    target: "lines",
    dimensions: [
      { field: "b", scale: { domain: [0, 10], range: [100, 0] } },
      { field: "a", scale: { domain: [0, 10], range: [100, 0] } }
    ],
    key: "id"
  });
  const after = reordered.editParallelScale({
    target: "lines", dimension: "a", reverse: true
  });
  const dimensions = after.semanticSpec.layers[0].encoding.parallel.dimensions;
  const a = dimensions.find(dimension => dimension.field === "a");

  assert.equal(a.scale, "lines-parallel-1");
  assert.equal(
    after.semanticSpec.scales.find(scale => scale.id === a.scale).reverse,
    true
  );
  assert.notDeepEqual(
    after.graphicSpec.objects.parallelAxisLabels,
    reordered.graphicSpec.objects.parallelAxisLabels
  );
  assert.equal(commands(after)[1].y, 50);
  assert.equal(commands(after, 1)[1].y, 100);
});

test("supports ordinal dimension edits through the existing point-scale policy", () => {
  const before = base([
    { field: "a", scale: { domain: [0, 10], range: [100, 0] } },
    {
      field: "grade", fieldType: "ordinal",
      scale: { domain: ["low", "high"], range: [100, 0] }
    }
  ]);
  const after = before.editParallelScale({
    target: "lines", dimension: "grade", domain: ["high", "low"], reverse: true
  });
  const scaleId = after.semanticSpec.layers[0].encoding.parallel.dimensions[1].scale;

  assert.deepEqual(
    after.semanticSpec.scales.find(scale => scale.id === scaleId).domain,
    ["high", "low"]
  );
  assert.equal(
    after.semanticSpec.scales.find(scale => scale.id === scaleId).reverse,
    true
  );
});

test("rejects missing, wrong-family, incompatible, and empty edits atomically", () => {
  const parallel = base([
    { field: "a", scale: { domain: [0, 10] } },
    { field: "grade", fieldType: "ordinal", scale: { domain: ["low", "high"] } }
  ]);
  const cartesian = chart()
    .createCanvas()
    .createData({ values: [{ x: 1, y: 2 }] })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });

  assertAtomicFailures(parallel, [
    { operation: () => parallel.editParallelScale({ target: "lines", dimension: "missing", reverse: true }) },
    { operation: () => parallel.editParallelScale({ target: "lines", dimension: "grade", type: "log", domain: [1, 10] }) },
    { operation: () => parallel.editParallelScale({ target: "lines", dimension: "a" }) },
    { operation: () => parallel.editParallelScale({ dimension: "a", reverse: true }) },
    { operation: () => parallel.editParallelScale({ target: "lines", dimension: "a", padding: 0.2 }) }
  ]);
  assertAtomicFailures(cartesian, [{
    operation: () => cartesian.editParallelScale({
      target: "points", dimension: "x", reverse: true
    })
  }]);
});
