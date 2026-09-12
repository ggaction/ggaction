import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { group: "A", value: 1, rank: 2 },
  { group: "B", value: 5, rank: 1 },
  { group: "A", value: 3, rank: 1 },
  { group: "B", value: null, rank: 2 }
];

test("createSummaryData materializes stable grouped multi-aggregate rows", () => {
  const source = chart().createData({ id: "source", values: rows });
  const program = source.createSummaryData({
    id: "summary",
    groupBy: "group",
    aggregates: [
      { op: "count", as: "rows" },
      { op: "mean", field: "value", as: "meanValue" },
      { op: "missing", field: "value", as: "missingValue" },
      { op: { op: "first", orderBy: "rank" }, field: "value", as: "firstValue" }
    ],
    members: "members"
  });

  assert.deepEqual(program.semanticSpec.datasets[1], {
    id: "summary",
    source: "source",
    transform: [{
      type: "summary",
      groupBy: ["group"],
      aggregates: [
        { op: "count", as: "rows" },
        { op: "mean", field: "value", as: "meanValue" },
        { op: "missing", field: "value", as: "missingValue" },
        {
          op: { op: "first", orderBy: "rank", order: "ascending" },
          field: "value",
          as: "firstValue"
        }
      ],
      members: "members"
    }],
    values: [
      {
        group: "A",
        rows: 2,
        meanValue: 2,
        missingValue: 0,
        firstValue: 3,
        members: [rows[0], rows[2]]
      },
      {
        group: "B",
        rows: 2,
        meanValue: 5,
        missingValue: 1,
        firstValue: 5,
        members: [rows[1], rows[3]]
      }
    ]
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeSummaryData"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "source", values: rows }]);
});

test("createSummaryData defines empty and ungrouped grain deterministically", () => {
  const empty = chart()
    .createData({ id: "source", values: [] })
    .createSummaryData({
      id: "summary",
      aggregates: [{ op: "count", as: "rows" }]
    });
  assert.deepEqual(empty.semanticSpec.datasets[1].values, [{ rows: 0 }]);

  const groupedEmpty = chart()
    .createData({ id: "source", values: [] })
    .createSummaryData({
      id: "summary",
      groupBy: "group",
      aggregates: [{ op: "count", as: "rows" }]
    });
  assert.deepEqual(groupedEmpty.semanticSpec.datasets[1].values, []);
});

test("createSummaryData rejects invalid fields, types, aliases, and shapes atomically", () => {
  const source = chart().createData({ id: "source", values: rows });
  const snapshot = JSON.stringify(source);
  const invalid = [
    [{ aggregates: [] }, /non-empty array/],
    [{ groupBy: ["group", "group"], aggregates: [{ op: "count", as: "n" }] }, /unique/],
    [{ aggregates: [{ op: "count", field: "value", as: "n" }] }, /does not accept a field/],
    [{ aggregates: [{ op: "mean", as: "m" }] }, /field must be/],
    [{ aggregates: [{ op: "mean", field: "missing", as: "m" }] }, /does not contain aggregate field/],
    [{ groupBy: "group", aggregates: [{ op: "count", as: "group" }] }, /collides/],
    [{ aggregates: [{ op: "mean", field: "group", as: "m" }] }, /numeric or missing/],
    [{ aggregates: [{ op: "count", as: "n" }], members: "n" }, /collides/],
    [{ aggregates: [{ op: "bogus", field: "value", as: "n" }] }, /Unsupported aggregate/],
    [{ aggregates: [{ op: "count", as: "n", extra: true }] }, /Unknown summary aggregate/],
    [{ aggregates: [{ op: "count", as: "n" }], extra: true }, /Unknown createSummaryData option/]
  ];
  invalid.forEach(([options, error], index) => {
    assert.throws(
      () => source.createSummaryData({ id: `bad${index}`, ...options }),
      error
    );
  });
  assert.equal(JSON.stringify(source), snapshot);
});

test("createSummaryData owns caller options and binds to compatible marks", () => {
  const groupBy = ["group"];
  const aggregates = [{ op: "sum", field: "value", as: "total" }];
  const summarized = chart()
    .createCanvas()
    .createData({ id: "source", values: rows })
    .createSummaryData({ id: "summary", groupBy, aggregates })
    .createPointMark({ id: "points", data: "summary" })
    .encodeX({ target: "points", field: "group", fieldType: "nominal" })
    .encodeY({ target: "points", field: "total", fieldType: "quantitative" });
  groupBy[0] = "changed";
  aggregates[0].as = "changed";
  assert.deepEqual(summarized.semanticSpec.datasets[1].transform[0].groupBy, ["group"]);
  assert.equal(summarized.graphicSpec.objects.points.items.length, 2);
});

test("createSummaryData computes frequency and reliability weighted statistics", () => {
  const values = [
    { x: 1, w: 1 },
    { x: 3, w: 3 }
  ];
  const aggregates = [
    { op: "count", as: "count" },
    { op: "sum", field: "x", as: "sum" },
    { op: "mean", field: "x", as: "mean" },
    { op: "varianceP", field: "x", as: "varianceP" },
    { op: "variance", field: "x", as: "variance" },
    { op: "stderr", field: "x", as: "stderr" },
    { op: { op: "quantile", probability: 0.25 }, field: "x", as: "q25" },
    { op: "median", field: "x", as: "median" }
  ];
  const source = chart().createData({ id: "source", values });
  const frequency = source.createSummaryData({
    id: "frequency",
    aggregates,
    weight: { field: "w", kind: "frequency" },
    members: "members"
  }).semanticSpec.datasets[1];
  const reliability = source.createSummaryData({
    id: "reliability",
    aggregates,
    weight: { field: "w", kind: "reliability" }
  }).semanticSpec.datasets[1];

  assert.equal(frequency.values[0].count, 4);
  assert.equal(frequency.values[0].sum, 10);
  assert.equal(frequency.values[0].mean, 2.5);
  assert.ok(Math.abs(frequency.values[0].varianceP - 0.75) < 1e-12);
  assert.equal(frequency.values[0].variance, 1);
  assert.equal(frequency.values[0].stderr, 0.5);
  assert.equal(frequency.values[0].q25, 2.5);
  assert.equal(frequency.values[0].median, 3);
  assert.deepEqual(frequency.values[0].members, values);
  assert.equal(reliability.values[0].count, 4);
  assert.equal(reliability.values[0].sum, 10);
  assert.equal(reliability.values[0].mean, 2.5);
  assert.ok(Math.abs(reliability.values[0].varianceP - 0.75) < 1e-12);
  assert.ok(Math.abs(reliability.values[0].variance - 2) < 1e-12);
  assert.ok(
    Math.abs(reliability.values[0].stderr - Math.sqrt(1.25)) < 1e-12
  );
  assert.equal(reliability.values[0].q25, 1);
  assert.equal(reliability.values[0].median, 3);
  assert.deepEqual(frequency.transform[0].weight, {
    field: "w",
    kind: "frequency"
  });
});

test("reliability weight scaling preserves shape statistics and scales mass", () => {
  const summarize = multiplier => chart()
    .createData({ id: "source", values: [
      { x: 1, w: multiplier },
      { x: 3, w: 3 * multiplier }
    ] })
    .createSummaryData({
      id: "summary",
      aggregates: [
        { op: "count", as: "count" },
        { op: "sum", field: "x", as: "sum" },
        { op: "mean", field: "x", as: "mean" },
        { op: "varianceP", field: "x", as: "varianceP" },
        { op: "variance", field: "x", as: "variance" },
        { op: "stderr", field: "x", as: "stderr" }
      ],
      weight: { field: "w", kind: "reliability" }
    }).semanticSpec.datasets[1].values[0];
  const original = summarize(1);
  const scaled = summarize(10);

  assert.equal(scaled.count, original.count * 10);
  assert.equal(scaled.sum, original.sum * 10);
  assert.equal(scaled.mean, original.mean);
  assert.equal(scaled.varianceP, original.varianceP);
  assert.equal(scaled.variance, original.variance);
  assert.equal(scaled.stderr, original.stderr);
});

test("weighted sum accepts finite cancellation without requiring finite total mass", () => {
  const summarized = chart()
    .createData({ id: "source", values: [
      { x: 1, w: 1e308 },
      { x: -1, w: 1e308 }
    ] })
    .createSummaryData({
      id: "summary",
      aggregates: [
        { op: "sum", field: "x", as: "sum" },
        { op: "mean", field: "x", as: "mean" }
      ],
      weight: { field: "w", kind: "reliability" }
    });

  assert.deepEqual(summarized.semanticSpec.datasets[1].values, [{
    sum: 0,
    mean: 0
  }]);
});

test("createSummaryData validates every weighted row and excludes zero-weight members", () => {
  const valid = [
    { group: "A", x: 1, w: 1 },
    { group: "A", x: 1000, w: 0 },
    { group: "A", x: 3, w: 3 }
  ];
  const summarized = chart()
    .createData({ id: "source", values: valid })
    .createSummaryData({
      id: "summary",
      groupBy: "group",
      aggregates: [{ op: "mean", field: "x", as: "mean" }],
      weight: { field: "w", kind: "frequency" },
      members: "members"
    });
  assert.deepEqual(summarized.semanticSpec.datasets[1].values, [{
    group: "A",
    mean: 2.5,
    members: [valid[0], valid[2]]
  }]);

  const create = values => chart().createData({ id: "source", values });
  assert.throws(() => create([{ x: 1, w: 0 }]).createSummaryData({
    id: "bad", aggregates: [{ op: "mean", field: "x", as: "mean" }],
    weight: { field: "w", kind: "frequency" }
  }), /positive total weight/);
  assert.throws(() => create([{ x: 1, w: 0.5 }]).createSummaryData({
    id: "bad", aggregates: [{ op: "count", as: "count" }],
    weight: { field: "w", kind: "frequency" }
  }), /safe integers/);
  assert.throws(() => create([{ x: Number.NaN, w: 0 }, { x: 1, w: 1 }])
    .createSummaryData({
      id: "bad", aggregates: [{ op: "mean", field: "x", as: "mean" }],
      weight: { field: "w", kind: "frequency" }
    }), /finite number at row 0/);
  assert.throws(() => create([
    { x: 1, w: Number.MAX_SAFE_INTEGER }, { x: 2, w: 1 }
  ]).createSummaryData({
    id: "bad", aggregates: [{ op: "count", as: "count" }],
    weight: { field: "w", kind: "frequency" }
  }), /total weight must be a safe integer/);
  assert.throws(() => create([{ x: 1, w: 1 }, { x: 2, w: 1 }])
    .createSummaryData({
      id: "bad",
      aggregates: [{ op: "ciLower", field: "x", as: "lower" }],
      weight: { field: "w", kind: "reliability" }
    }), /does not support statistical weight/);
});
