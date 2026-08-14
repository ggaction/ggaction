import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "A", value: 3 }),
  Object.freeze({ group: "B", value: 4 }),
  Object.freeze({ group: "B", value: 8 })
]);

test("creates immutable interval provenance and concrete summary rows", () => {
  const base = chart().createData({ values: rows });
  const program = base.createIntervalData({
    id: "summary",
    field: "value",
    groupBy: "group",
    extent: "stderr"
  });
  const summary = program.semanticSpec.datasets[1];

  assert.deepEqual(summary, {
    id: "summary",
    source: "data",
    transform: [{
      type: "interval",
      field: "value",
      groupBy: ["group"],
      center: "mean",
      extent: "stderr",
      as: {
        center: "__summary_center",
        lower: "__summary_lower",
        upper: "__summary_upper"
      }
    }],
    values: [
      { group: "A", __summary_center: 2, __summary_lower: 1, __summary_upper: 3 },
      { group: "B", __summary_center: 6, __summary_lower: 4, __summary_upper: 8 }
    ]
  });
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeIntervalData"]
  );
});

test("supports custom output fields, grouping arrays, and IQR", () => {
  const program = chart()
    .createData({ id: "source", values: rows })
    .createIntervalData({
      id: "quartiles",
      source: "source",
      field: "value",
      groupBy: ["group"],
      center: "median",
      extent: "iqr",
      as: { center: "median", lower: "q1", upper: "q3" }
    });

  assert.deepEqual(program.semanticSpec.datasets[1].values, [
    { group: "A", median: 2, q1: 1.5, q3: 2.5 },
    { group: "B", median: 6, q1: 5, q3: 7 }
  ]);
});

test("validates options and leaves the source program unchanged", () => {
  const base = chart().createData({ values: rows });

  assert.throws(
    () => base.createIntervalData({ id: "summary", field: "value", groupBy: "group", extent: "bad" }),
    /Unsupported interval extent/
  );
  assert.throws(
    () => base.createIntervalData({ id: "summary", field: "value", groupBy: ["group", "group"] }),
    /unique/
  );
  assert.throws(
    () => base.createIntervalData({ id: "summary", field: "value", groupBy: "group", unknown: true }),
    /Unknown createIntervalData option/
  );
  assert.equal(base.semanticSpec.datasets.length, 1);
});

test("rejects unrepresentable interval endpoints atomically", () => {
  const base = chart().createData({
    values: [{ value: -1e308 }, { value: 1e308 }]
  });
  assert.throws(
    () => base.createIntervalData({
      id: "summary",
      field: "value",
      center: "mean",
      extent: "ci",
      level: 0.95
    }),
    /Interval (lower|upper) endpoint is outside the finite numeric range/
  );
  assert.equal(base.semanticSpec.datasets.length, 1);
});
