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

test("rejects an unrepresentable bucket without changing source data or trace", () => {
  const source = chart().createData({ values: [{ date: -8640000000000000 }] });
  const before = JSON.stringify(source);
  assert.throws(() => source.createTimeUnitData({
    id: "bucketed", field: "date", unit: "year", as: "bucket"
  }), /bucket start is outside/);
  assert.equal(JSON.stringify(source), before);
});

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
      id: "invalid", field: "date", unit: "decade", as: "week"
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

test("creates UTC and regional calendar weeks and nominal weekdays", () => {
  const source = chart().createData({ id: "source", values: [{
    date: "2024-01-03T12:00:00Z"
  }] });
  const utc = source.createTimeUnitData({
    id: "utcWeek", field: "date", unit: "week", as: "week"
  });
  const seoul = source.createTimeUnitData({
    id: "seoulWeek", field: "date", unit: "week", as: "week",
    timeZone: "Asia/Seoul"
  });
  const weekday = source.createTimeUnitData({
    id: "weekday", field: "date", unit: "weekday", as: "weekday",
    timeZone: "UTC"
  });
  assert.equal(utc.semanticSpec.datasets[1].values[0].week,
    Date.parse("2024-01-01T00:00:00Z"));
  assert.equal(seoul.semanticSpec.datasets[1].values[0].week,
    Date.parse("2023-12-31T15:00:00Z"));
  assert.equal(weekday.semanticSpec.datasets[1].values[0].weekday, 3);
  assert.deepEqual(utc.semanticSpec.datasets[1].transform[0], {
    type: "timeUnit", field: "date", unit: "week", as: "week",
    weekStartsOn: 1, weekRule: "calendar"
  });
});

test("resolves DST gaps, folds, non-hour offsets, and skipped dates", () => {
  const cases = [
    ["2024-03-10T12:00:00Z", "day", "America/New_York", "2024-03-10T05:00:00Z"],
    ["2024-03-11T12:00:00Z", "day", "America/New_York", "2024-03-11T04:00:00Z"],
    ["2024-11-03T05:30:00Z", "hour", "America/New_York", "2024-11-03T05:00:00Z"],
    ["2024-11-03T06:30:00Z", "hour", "America/New_York", "2024-11-03T05:00:00Z"],
    ["2024-10-05T15:45:00Z", "hour", "Australia/Lord_Howe", "2024-10-05T15:30:00Z"],
    ["2024-01-01T00:00:00Z", "day", "Asia/Kolkata", "2023-12-31T18:30:00Z"],
    ["2011-12-30T12:00:00Z", "day", "Pacific/Apia", "2011-12-30T10:00:00Z"]
  ];
  for (const [date, unit, timeZone, expected] of cases) {
    const program = chart()
      .createData({ id: "source", values: [{ date }] })
      .createTimeUnitData({ id: "bucket", field: "date", unit, as: "bucket", timeZone });
    assert.equal(program.semanticSpec.datasets[1].values[0].bucket, Date.parse(expected));
  }
});

test("keeps explicit zones in provenance and rejects week-policy conflicts", () => {
  const source = chart().createData({ id: "source", values: [{ date: "2024-01-01" }] });
  const zoned = source.createTimeUnitData({
    id: "zoned", field: "date", unit: "month", as: "month", timeZone: "UTC"
  });
  assert.equal(zoned.semanticSpec.datasets[1].transform[0].timeZone, "UTC");
  const invalid = [
    [{ unit: "week", weekRule: "iso", weekStartsOn: 0 }, /ISO weeks require/],
    [{ unit: "weekday", weekRule: "calendar" }, /require unit week/],
    [{ unit: "day", weekStartsOn: 1 }, /require unit week/],
    [{ unit: "day", timeZone: "Not\/A_Zone" }, /Unsupported time zone/]
  ];
  invalid.forEach(([options, error], index) => {
    assert.throws(() => source.createTimeUnitData({
      id: `invalid${index}`, field: "date", as: "bucket", ...options
    }), error);
  });
});
