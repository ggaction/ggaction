import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { inspectProgram } from "../../../../src/inspection.js";

function source() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({
      values: [
        { x: 1, y: 2 },
        { x: null, y: 3 },
        { x: 4, y: 5 }
      ]
    });
}

test("independent item missing:skip uses one eligible set for domains and graphics", () => {
  const program = source()
    .createPointMark({ id: "points", missing: "skip" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });

  assert.deepEqual(program.resolvedScales.x.domain, [1, 4]);
  assert.equal(program.graphicSpec.objects.points.items.length, 2);
  assert.deepEqual(program.semanticSpec.layers[0].mark, {
    type: "point",
    missing: "skip"
  });
  const inspection = inspectProgram(program, {
    target: { kind: "mark", id: "points" }
  }).views[0];
  assert.equal(inspection.rawRows, 3);
  assert.deepEqual(
    inspection.flags.find(flag => flag.reason === "missing-skipped"),
    { reason: "missing-skipped", count: 1 }
  );
});

test("independent item missing:error rejects the first missing encoded field atomically", () => {
  const before = source().createPointMark({ id: "points", missing: "error" });
  assert.throws(
    () => before.encodeX({ target: "points", field: "x" }),
    /field "x" is missing at row 1/
  );
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);
  assert.equal(before.graphicSpec.objects.points.items.length, 3);
});

test("series and aggregate mark families keep their distinct missing contracts", () => {
  assert.throws(
    () => source().createAreaMark({ missing: "skip" }),
    /Area missing must be "error" or "break"/
  );
  assert.throws(
    () => source().createArcMark({ missing: "skip" }),
    /Unknown createArcMark option/
  );
});
