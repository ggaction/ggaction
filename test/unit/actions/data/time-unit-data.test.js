import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", date: "2024-01-17", value: 2 }),
  Object.freeze({ group: "A", date: "2024-02-29T12:00:00Z", value: 4 }),
  Object.freeze({ group: "B", date: "2024-04-08", value: 6 }),
  Object.freeze({ group: "B", date: "2024-06-30", value: 8 })
]);

function sourceProgram() {
  return chart().createData({ id: "source", values: rows });
}

test("creates immutable UTC time-unit provenance and materialized values", () => {
  const source = sourceProgram();
  const program = source.createTimeUnitData({
    id: "monthly",
    field: "date",
    unit: "month",
    as: "month"
  });
  const dataset = program.semanticSpec.datasets[1];

  assert.deepEqual(dataset, {
    id: "monthly",
    source: "source",
    transform: [{
      type: "timeUnit",
      field: "date",
      unit: "month",
      as: "month"
    }],
    values: [
      { group: "A", date: "2024-01-17", value: 2, month: Date.UTC(2024, 0, 1) },
      { group: "A", date: "2024-02-29T12:00:00Z", value: 4, month: Date.UTC(2024, 1, 1) },
      { group: "B", date: "2024-04-08", value: 6, month: Date.UTC(2024, 3, 1) },
      { group: "B", date: "2024-06-30", value: 8, month: Date.UTC(2024, 5, 1) }
    ]
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeTimeUnitData"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(node => node.op),
    ["editSemantic"]
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.equal(Object.hasOwn(rows[0], "month"), false);
});

test("uses explicit or current source and feeds an ordinary temporal encoding", () => {
  const explicit = sourceProgram().createTimeUnitData({
    id: "quarterly",
    source: "source",
    field: "date",
    unit: "quarter",
    as: "quarter"
  });
  const chartProgram = explicit
    .createCanvas({ width: 400, height: 260, margin: 40 })
    .createPointMark({ id: "points", data: "quarterly" })
    .encodeX({ target: "points", field: "quarter", fieldType: "temporal" })
    .encodeY({ target: "points", field: "value", fieldType: "quantitative" });

  assert.deepEqual(
    explicit.semanticSpec.datasets[1].values.map(row => row.quarter),
    [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1), Date.UTC(2024, 3, 1), Date.UTC(2024, 3, 1)]
  );
  assert.equal(chartProgram.graphicSpec.objects.points.items.length, 4);
  assert.deepEqual(chartProgram.resolvedScales.x.domain, [
    Date.UTC(2024, 0, 1),
    Date.UTC(2024, 3, 1)
  ]);
});

test("replays the canonical materializer and rederives after facet partitioning", () => {
  const transform = {
    type: "timeUnit",
    field: "date",
    unit: "month",
    as: "month"
  };
  const replayed = sourceProgram().replayDerivedData({
    id: "cellMonths",
    source: "source",
    transform
  });
  assert.deepEqual(
    replayed.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeTimeUnitData"]
  );

  const base = sourceProgram()
    .createTimeUnitData({
      id: "monthly",
      field: "date",
      unit: "month",
      as: "month"
    })
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createPointMark({ id: "points", data: "monthly" })
    .encodeX({ target: "points", field: "month", fieldType: "temporal" })
    .encodeY({ target: "points", field: "value", fieldType: "quantitative" });
  const faceted = base.facet({
    field: "group",
    data: "source",
    guides: { legend: false }
  });

  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const layerData = child.semanticSpec.layers[0].data;
    const monthly = child.semanticSpec.datasets.find(dataset =>
      dataset.id === layerData
    );
    assert.ok(monthly);
    assert.equal(monthly.transform[0].type, "timeUnit");
    assert.equal(monthly.values.length, 2);
  }
});

test("rejects invalid calls atomically and owns caller options", () => {
  const source = sourceProgram();
  const options = { id: "daily", field: "date", unit: "day", as: "day" };
  const created = source.createTimeUnitData(options);
  options.as = "changed";

  assert.equal(created.semanticSpec.datasets[1].transform[0].as, "day");
  assert.throws(
    () => created.createTimeUnitData({
      id: "daily", field: "date", unit: "day", as: "another"
    }),
    /Dataset "daily" already exists/
  );
  assert.throws(
    () => source.createTimeUnitData({
      id: "collision", field: "date", unit: "day", as: "value"
    }),
    /output field "value" already exists/
  );
  assert.throws(
    () => source.createTimeUnitData({
      id: "invalid", field: "date", unit: "week", as: "week"
    }),
    /Unsupported time unit/
  );
  assert.throws(
    () => source.createTimeUnitData({
      id: "unknown", source: "missing", field: "date", unit: "day", as: "day"
    }),
    /Unknown source dataset "missing"/
  );
  assert.throws(
    () => chart().createTimeUnitData({
      id: "missing", field: "date", unit: "day", as: "day"
    }),
    /Source dataset id/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});
