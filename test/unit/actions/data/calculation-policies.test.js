import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

test("summary identity policy distinguishes row count from valid numeric values", () => {
  const program = chart()
    .createData({ id: "source", values: [
      { group: "A", value: null },
      { group: "A", value: 2 },
      { group: "B", value: null },
      { group: "B", value: 4 },
      { group: "C", value: null },
      { group: "C", value: null }
    ] })
    .createSummaryData({
      id: "summary",
      groupBy: "group",
      aggregates: [
        { op: "count", as: "count" },
        { op: "valid", field: "value", as: "valid" },
        { op: "sum", field: "value", as: "sum" },
        { op: "mean", field: "value", as: "mean" },
        { op: "median", field: "value", as: "median" }
      ],
      missing: "drop",
      empty: "identity"
    });

  assert.deepEqual(program.semanticSpec.datasets.at(-1).values, [
    { group: "A", count: 2, valid: 1, sum: 2, mean: 2, median: 2 },
    { group: "B", count: 2, valid: 1, sum: 4, mean: 4, median: 4 },
    { group: "C", count: 2, valid: 0, sum: 0, mean: null, median: null }
  ]);
  const report = program.materializationConfigs.calculations.datasets.summary;
  assert.equal(report.owner.id, "summary");
  assert.deepEqual(report.inputs, [{ kind: "data", id: "source" }]);
  assert.deepEqual(
    report.units.find(unit => unit.group.group === "C" && unit.role === "mean"),
    {
      role: "mean",
      group: { group: "C" },
      inputRows: 2,
      usedRows: 0,
      excludedRows: 2,
      excludedByReason: { "missing-value": 2 }
    }
  );
});

test("bin missing policy reports exclusions and includes the final boundary", () => {
  const program = chart()
    .createData({ id: "source", values: [
      { value: 0 }, { value: 5 }, { value: 10 },
      { value: 15 }, { value: 20 }, { value: null }
    ] })
    .createBinData({
      id: "bins",
      field: "value",
      boundaries: [0, 10, 20],
      missing: "drop"
    });

  assert.deepEqual(program.semanticSpec.datasets.at(-1).values.map(row => row.count), [2, 3]);
  assert.deepEqual(program.materializationConfigs.calculations.datasets.bins.units, [{
    role: "count",
    group: {},
    inputRows: 6,
    usedRows: 5,
    excludedRows: 1,
    excludedByReason: { "missing-value": 1 }
  }]);
});

test("calculation reports follow derived revisions and are removed with owners", () => {
  const initial = chart()
    .createData({ id: "source", values: [{ value: 1 }, { value: null }, { value: 3 }] })
    .createSummaryData({
      id: "summary",
      aggregates: [{ op: "sum", field: "value", as: "sum" }],
      missing: "drop",
      empty: "identity"
    });
  const edited = initial.editSummaryData({
    target: "summary",
    aggregates: [{ op: "mean", field: "value", as: "mean" }]
  });
  const current = edited.materializationConfigs.data.summary.summary.current;

  assert.equal(edited.materializationConfigs.calculations.datasets.summary, undefined);
  assert.equal(edited.materializationConfigs.calculations.datasets[current].owner.id, current);
  assert.deepEqual(edited.materializationConfigs.calculations.datasets[current].inputs, [
    { kind: "data", id: "source" }
  ]);

  const removed = edited.removeData({ id: "summary" });
  assert.equal(removed.materializationConfigs.calculations?.datasets?.[current], undefined);
});

test("explicit missing:error rejects nullable statistical inputs atomically", () => {
  const source = chart().createData({
    id: "source",
    values: [{ value: 1 }, { value: null }]
  });
  assert.throws(
    () => source.createIntervalData({
      id: "interval",
      field: "value",
      missing: "error"
    }),
    /is missing/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});
