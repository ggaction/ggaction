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
