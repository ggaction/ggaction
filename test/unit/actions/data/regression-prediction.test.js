import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const rows = [
  { group: "A", x: 1, y: 2 },
  { group: "A", x: 2, y: 4 },
  { group: "A", x: 3, y: 6 },
  { group: "B", x: 1, y: 3 },
  { group: "B", x: 2, y: 5 },
  { group: "B", x: 3, y: 7 }
];

test("interval:false fits two-point linear data without inventing bounds", () => {
  const program = chart()
    .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createRegressionData({ id: "fit", x: "x", y: "y", interval: false });
  const fit = program.semanticSpec.datasets.at(-1);

  assert.deepEqual(fit.values, [{ x: 1, y: 2 }, { x: 2, y: 4 }]);
  assert.deepEqual(fit.schema.fields.map(field => field.name), ["x", "y"]);
  assert.equal(Object.hasOwn(fit.values[0], "__regression_ci_lower"), false);
});

test("explicit prediction grids are evaluated independently for each group", () => {
  const program = chart()
    .createData({ id: "source", values: rows })
    .createRegressionData({
      id: "fit",
      x: "x",
      y: "y",
      groupBy: "group",
      interval: false,
      predict: { values: [1, 1.5, 2] }
    });
  const values = program.semanticSpec.datasets.at(-1).values;

  assert.deepEqual(values.filter(row => row.group === "A").map(row => row.y), [2, 3, 4]);
  assert.deepEqual(values.filter(row => row.group === "B").map(row => row.y), [3, 4, 5]);
});

test("invalid prediction grids and interval sample requirements fail atomically", () => {
  const source = chart().createData({ id: "source", values: rows });
  for (const predict of [
    { values: [1, 1] },
    { values: [2, 1] },
    { domain: [1, 2], steps: 1 },
    { values: [1, 2], domain: [1, 2], steps: 2 }
  ]) {
    assert.throws(
      () => source.createRegressionData({ id: "fit", x: "x", y: "y", interval: false, predict })
    );
  }
  assert.throws(
    () => chart()
      .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createRegressionData({ id: "fit", x: "x", y: "y", interval: "mean" }),
    /at least three rows/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});
