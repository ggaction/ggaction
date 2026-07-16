import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { BOX_FIELDS } from "../../../../src/grammar/boxPlot.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "A", value: 2 }),
  Object.freeze({ group: "A", value: 3 }),
  Object.freeze({ group: "A", value: 20 })
]);

test("creates immutable box summary and outlier provenance through wrapped data actions", () => {
  const base = chart().createData({ values: rows });
  const summary = base.createBoxSummaryData({
    id: "summary",
    category: "group",
    field: "value"
  });
  const completed = summary.createBoxOutlierData({
    id: "outliers",
    source: "data",
    category: "group",
    field: "value"
  });

  assert.deepEqual(completed.semanticSpec.datasets[1], {
    id: "summary",
    source: "data",
    transform: [{
      type: "boxSummary",
      category: "group",
      field: "value",
      method: "linear",
      factor: 1.5,
      as: BOX_FIELDS
    }],
    values: [{
      group: "A",
      [BOX_FIELDS.q1]: 1.75,
      [BOX_FIELDS.median]: 2.5,
      [BOX_FIELDS.q3]: 7.25,
      [BOX_FIELDS.lowerWhisker]: 1,
      [BOX_FIELDS.upperWhisker]: 3,
      [BOX_FIELDS.lowerFence]: -6.5,
      [BOX_FIELDS.upperFence]: 15.5,
      [BOX_FIELDS.count]: 4
    }]
  });
  assert.deepEqual(completed.semanticSpec.datasets[2].values, [
    { group: "A", value: 20 }
  ]);
  assert.deepEqual(
    completed.trace.children.at(-2).children.map(node => node.op),
    ["createDerivedData", "materializeBoxSummaryData"]
  );
  assert.deepEqual(
    completed.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeBoxOutlierData"]
  );
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.equal(Object.isFrozen(completed.semanticSpec.datasets[1].values[0]), true);
});

test("validates box data options without changing the source program", () => {
  const base = chart().createData({ values: rows });
  assert.throws(
    () => base.createBoxSummaryData({ id: "summary", category: "group", field: "value", factor: -1 }),
    /positive and finite/
  );
  assert.throws(
    () => base.createBoxSummaryData({ id: "summary", category: "group", field: "value", unknown: true }),
    /Unknown createBoxSummaryData option/
  );
  assert.equal(base.semanticSpec.datasets.length, 1);
});

test("creates minmax summary provenance without classifying outliers", () => {
  const program = chart()
    .createData({ values: rows })
    .createBoxSummaryData({
      id: "summary",
      category: "group",
      field: "value",
      whisker: "minmax"
    });
  const summary = program.semanticSpec.datasets[1];

  assert.equal(summary.transform[0].whisker, "minmax");
  assert.equal(Object.hasOwn(summary.transform[0], "factor"), false);
  assert.equal(summary.values[0][BOX_FIELDS.lowerWhisker], 1);
  assert.equal(summary.values[0][BOX_FIELDS.upperWhisker], 20);
  assert.throws(
    () => chart().createData({ values: rows }).createBoxSummaryData({
      id: "invalid",
      category: "group",
      field: "value",
      whisker: "minmax",
      factor: 1
    }),
    /do not accept factor/
  );
});
