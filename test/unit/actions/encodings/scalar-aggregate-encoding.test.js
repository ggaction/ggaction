import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { SCALAR_AGGREGATE_OPERATIONS } from "../../../../src/grammar/aggregate.js";

const lineRows = [
  { year: "2020-01-01", value: 1, category: "A" },
  { year: "2020-01-01", value: 3, category: "B" },
  { year: "2020-01-01", value: 100, category: "B" },
  { year: "2021-01-01", value: 2, category: "A" },
  { year: "2021-01-01", value: 6, category: "A" },
  { year: "2021-01-01", value: 8, category: "B" }
];

function xEncodedLine(rows = lineRows) {
  return chart()
    .createCanvas({ width: 280, height: 180, margin: 20 })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" });
}

test("materializes every scalar aggregate through encodeY", () => {
  for (const aggregate of SCALAR_AGGREGATE_OPERATIONS) {
    const program = xEncodedLine().encodeY({ field: "value", aggregate });

    assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, aggregate);
    assert.equal(program.graphicSpec.objects.trends.items.length, 1);
    assert.equal(
      program.graphicSpec.objects.trends.items[0].properties.commands.every(
        command => Number.isFinite(command.x) && Number.isFinite(command.y)
      ),
      true,
      aggregate
    );
  }
});

test("supports nominal count operations with a quantitative output scale", () => {
  for (const aggregate of ["count", "distinct", "valid", "missing"]) {
    const program = xEncodedLine().encodeY({
      field: "category",
      fieldType: "nominal",
      aggregate
    });

    assert.equal(program.semanticSpec.layers[0].encoding.y.fieldType, "nominal");
    assert.equal(program.semanticSpec.scales[1].type, "linear");
    assert.equal(program.resolvedScales.y.type, "linear");
  }
});

test("omits incomplete aggregate groups without synthesizing points", () => {
  const rows = [
    { year: "2020-01-01", value: 1 },
    { year: "2021-01-01", value: null },
    { year: "2022-01-01", value: 5 }
  ];
  const program = xEncodedLine(rows).encodeY({ field: "value", aggregate: "mean" });
  const commands = program.graphicSpec.objects.trends.items[0].properties.commands;

  assert.equal(commands.length, 2);
  assert.deepEqual(
    commands.map(command => command.x),
    [20, 260]
  );
});

test("replaces aggregate semantics and rematerializes inferred guide text atomically", () => {
  const mean = xEncodedLine()
    .encodeY({ field: "value", aggregate: "mean", scale: { nice: true } })
    .createGuides();
  const median = mean.encodeY({ field: "value", aggregate: "median" });

  assert.equal(mean.semanticSpec.layers[0].encoding.y.aggregate, "mean");
  assert.equal(mean.semanticSpec.guides.axis.y.title, "mean(value)");
  assert.equal(median.semanticSpec.layers[0].encoding.y.aggregate, "median");
  assert.equal(median.semanticSpec.guides.axis.y.title, "median(value)");
  assert.equal(
    median.graphicSpec.objects.yAxisTitle.properties.text,
    "median(value)"
  );
  assert.notDeepEqual(
    median.graphicSpec.objects.horizontalGridLines.items.map(child => child.properties.y1),
    mean.graphicSpec.objects.horizontalGridLines.items.map(child => child.properties.y1)
  );
  assert.notDeepEqual(
    median.graphicSpec.objects.yAxisLabels.items.map(child => child.properties.text),
    mean.graphicSpec.objects.yAxisLabels.items.map(child => child.properties.text)
  );

  const custom = mean
    .editYAxisTitle({ text: "Custom summary" })
    .encodeY({
      field: "value",
      aggregate: { op: "quantile", probability: 0.25 }
    });
  assert.equal(custom.semanticSpec.guides.axis.y.title, "Custom summary");
  assert.equal(custom.graphicSpec.objects.yAxisTitle.properties.text, "Custom summary");

  const quantile = median.encodeY({
    field: "value",
    aggregate: { op: "quantile", probability: 0.75 }
  });
  assert.deepEqual(
    quantile.semanticSpec.layers[0].encoding.y.aggregate,
    { op: "quantile", probability: 0.75 }
  );
  assert.equal(
    quantile.semanticSpec.guides.axis.y.title,
    "quantile(value, 0.75)"
  );
});

test("normalizes parameterized aggregates and isolates caller-owned objects", () => {
  const rows = [
    { year: "2020-01-01", value: 10, rank: 2 },
    { year: "2020-01-01", value: 20, rank: 1 },
    { year: "2021-01-01", value: 30, rank: 2 },
    { year: "2021-01-01", value: 40, rank: 1 }
  ];
  const aggregate = { op: "first", orderBy: "rank" };
  const encoded = xEncodedLine(rows).encodeY({ field: "value", aggregate });
  const program = encoded.createGuides();

  aggregate.op = "last";
  aggregate.orderBy = "other";
  assert.deepEqual(
    program.semanticSpec.layers[0].encoding.y.aggregate,
    { op: "first", orderBy: "rank", order: "ascending" }
  );
  assert.equal(
    program.semanticSpec.guides.axis.y.title,
    "first(value, rank ascending)"
  );
  assert.equal(
    program.graphicSpec.objects.yAxisTitle.properties.text,
    "first(value, rank ascending)"
  );
  assert.equal(encoded.trace.children.at(-1).op, "encodeY");
  assert.deepEqual(encoded.actionStack, []);
});

test("supports ordered direction, last selection, and incomplete-group omission", () => {
  const rows = [
    { year: "2020-01-01", value: 1, rank: null },
    { year: "2021-01-01", value: 2, rank: 1 },
    { year: "2021-01-01", value: 3, rank: 2 },
    { year: "2022-01-01", value: 4, rank: 1 },
    { year: "2022-01-01", value: 5, rank: 2 }
  ];
  const program = xEncodedLine(rows).encodeY({
    field: "value",
    aggregate: {
      op: "last",
      orderBy: "rank",
      order: "descending"
    }
  });

  assert.deepEqual(
    program.semanticSpec.layers[0].encoding.y.aggregate,
    { op: "last", orderBy: "rank", order: "descending" }
  );
  assert.equal(
    program.graphicSpec.objects.trends.items[0].properties.commands.length,
    2
  );
});

test("rejects invalid parameterized aggregates without changing the earlier program", () => {
  const base = xEncodedLine().encodeY({ field: "value", aggregate: "mean" });
  const before = base.semanticSpec;

  for (const aggregate of [
    { op: "quantile", probability: -0.1 },
    { op: "quantile", probability: 1.1 },
    { op: "first", orderBy: "" },
    { op: "last", orderBy: "category", order: "sideways" }
  ]) {
    assert.throws(
      () => base.encodeY({ field: "value", aggregate }),
      /aggregate|probability|orderBy|order/i
    );
    assert.strictEqual(base.semanticSpec, before);
    assert.equal(base.semanticSpec.layers[0].encoding.y.aggregate, "mean");
  }

  assert.throws(
    () => xEncodedLine().encodeY({
      field: "category",
      fieldType: "nominal",
      aggregate: { op: "quantile", probability: 0.5 }
    }),
    /does not support field type/
  );
});

test("materializes scalar aggregate grouped bars at the final category grain", () => {
  const rows = [
    { year: 2020, group: "A", value: 1 },
    { year: 2020, group: "A", value: 5 },
    { year: 2020, group: "B", value: 8 },
    { year: 2021, group: "A", value: 2 },
    { year: 2021, group: "B", value: 4 },
    { year: 2021, group: "B", value: 10 }
  ];
  const program = chart()
    .createCanvas({ width: 420, height: 300, margin: 40 })
    .createData({ id: "data", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "value", aggregate: "median" })
    .encodeColor({ field: "group", layout: "group" })
    .encodeBarWidth();

  assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, "median");
  assert.deepEqual(program.resolvedScales.y.domain, [0, 8]);
  assert.equal(program.graphicSpec.objects.bars.items.length, 4);
  assert.equal(
    program.graphicSpec.objects.bars.items.every(child =>
      Number.isFinite(child.properties.x) && Number.isFinite(child.properties.y)
    ),
    true
  );
});

test("materializes parameterized grouped bars at the final category grain", () => {
  const rows = [
    { year: 2020, group: "A", value: 1, rank: 2 },
    { year: 2020, group: "A", value: 5, rank: 1 },
    { year: 2020, group: "B", value: 8, rank: 1 },
    { year: 2021, group: "A", value: 2, rank: 1 },
    { year: 2021, group: "B", value: 4, rank: 2 },
    { year: 2021, group: "B", value: 10, rank: 1 }
  ];
  const program = chart()
    .createCanvas({ width: 420, height: 300, margin: 40 })
    .createData({ id: "data", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({
      field: "value",
      aggregate: { op: "first", orderBy: "rank" }
    })
    .encodeColor({ field: "group", layout: "group" })
    .encodeBarWidth();

  assert.deepEqual(
    program.semanticSpec.layers[0].encoding.y.aggregate,
    { op: "first", orderBy: "rank", order: "ascending" }
  );
  assert.deepEqual(program.resolvedScales.y.domain, [0, 10]);
  assert.equal(program.graphicSpec.objects.bars.items.length, 4);
});
