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

test("stores the CI method and handles grouped sample boundaries", () => {
  const source = chart().createData({
    values: [
      { group: "A", value: 1 },
      { group: "A", value: 2 },
      { group: "A", value: 3 },
      { group: "A", value: null },
      { group: "B", value: 5 },
      { group: "B", value: 5 },
      { group: "C", value: 1 },
      { group: "D", value: null }
    ]
  });
  const student = source.createIntervalData({
    id: "student",
    field: "value",
    groupBy: "group"
  }).semanticSpec.datasets[1];
  const normal = source.createIntervalData({
    id: "normal",
    field: "value",
    groupBy: "group",
    method: "normal"
  }).semanticSpec.datasets[1];

  assert.deepEqual(student.transform[0], {
    type: "interval",
    field: "value",
    groupBy: ["group"],
    center: "mean",
    extent: "ci",
    method: "student-t",
    level: 0.95,
    as: {
      center: "__student_center",
      lower: "__student_lower",
      upper: "__student_upper"
    }
  });
  assert.deepEqual(student.values.map(row => row.group), ["A", "B"]);
  assert.ok(Math.abs(student.values[0].__student_upper - 4.48413771175) < 1e-12);
  assert.equal(student.values[1].__student_upper, 5);
  assert.ok(Math.abs(normal.values[0].__normal_upper - 3.131606527612) < 1e-12);
  assert.equal(normal.transform[0].method, "normal");
});

test("validates CI method and level independently", () => {
  const source = chart().createData({ values: [{ value: 1 }, { value: 2 }] });
  assert.throws(
    () => source.createIntervalData({
      id: "badMethod", field: "value", method: "bootstrap"
    }),
    /Unsupported Interval CI method/
  );
  assert.throws(
    () => source.createIntervalData({ id: "badLevel", field: "value", level: 0 }),
    /Interval CI level must be between 0 and 1/
  );
  assert.throws(
    () => source.createIntervalData({
      id: "notCi", field: "value", extent: "stderr", method: "normal"
    }),
    /supported only for ci extent/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});
