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

test("interval:false preserves polynomial predictions and rejects invalid degrees atomically", () => {
  const source = chart().createData({ id: "source", values: [
    { x: 0, y: 1 }, { x: 1, y: 4 }, { x: 2, y: 9 }, { x: 3, y: 16 }
  ] });
  const before = JSON.stringify(source);
  for (const degree of [undefined, 2]) {
    const fit = source.createRegressionData({
      id: "fit", x: "x", y: "y", method: "polynomial", interval: false,
      ...(degree === undefined ? {} : { degree }), predict: { values: [0, 0.5, 2, 3] }
    }).semanticSpec.datasets.at(-1);
    assert.deepEqual(fit.values.map(row => row.x), [0, 0.5, 2, 3]);
    fit.values.forEach((row, index) => {
      assert.ok(Math.abs(row.y - [1, 2.25, 9, 16][index]) < 1e-10);
      assert.deepEqual(Object.keys(row), ["x", "y"]);
    });
  }
  for (const degree of [0, -1, 1.5, 33]) {
    assert.throws(() => source.createRegressionData({
      id: "invalid", x: "x", y: "y", method: "polynomial", degree, interval: false
    }), /degree/);
    assert.equal(JSON.stringify(source), before);
  }
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

test("domain grids include both endpoints and interpolate every requested step", () => {
  const values = chart()
    .createData({ id: "source", values: rows.filter(row => row.group === "A") })
    .createRegressionData({
      id: "fit",
      x: "x",
      y: "y",
      interval: false,
      predict: { domain: [0, 3], steps: 4 }
    })
    .semanticSpec.datasets.at(-1).values;

  assert.deepEqual(values.map(row => row.x), [0, 1, 2, 3]);
  assert.deepEqual(values.map(row => row.y), [0, 2, 4, 6]);
});

test("LOESS predicts unobserved coordinates and missing rows produce an exclusion report", () => {
  const loess = chart()
    .createData({ id: "source", values: [
      { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }, { x: 3, y: 9 }
    ] })
    .createRegressionData({
      id: "fit",
      x: "x",
      y: "y",
      method: "loess",
      predict: { values: [0.5, 1.5, 2.5] }
    });
  assert.deepEqual(
    loess.semanticSpec.datasets.at(-1).values.map(row => row.x),
    [0.5, 1.5, 2.5]
  );
  assert.equal(
    loess.semanticSpec.datasets.at(-1).values.every(row => Number.isFinite(row.y)),
    true
  );

  const source = chart().createData({ id: "source", values: [
    { x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 5 }
  ] });
  const dropped = source.createRegressionData({
    id: "fit",
    x: "x",
    y: "y",
    interval: false,
    missing: "drop"
  });
  assert.deepEqual(
    dropped.materializationConfigs.calculations.datasets.fit.units,
    [{
      role: "fit",
      group: {},
      inputRows: 3,
      usedRows: 2,
      excludedRows: 1,
      excludedByReason: { "missing-value": 1 }
    }]
  );
  assert.throws(
    () => source.createRegressionData({
      id: "invalid",
      x: "x",
      y: "y",
      interval: false,
      missing: "error"
    }),
    /is missing at row 1/
  );
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
