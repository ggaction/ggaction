import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { getDatasetSchema } from "../../../../src/inspection.js";

const numericSchema = {
  fields: [
    { name: "x", storageType: "number" },
    { name: "y", storageType: "number", nullable: true }
  ]
};

test("declared empty data validates fields independently from row presence", () => {
  const source = chart().createData({
    id: "source",
    values: [],
    schema: numericSchema
  });
  const filtered = source.filterData({
    id: "filtered",
    field: "x",
    range: { min: 0 }
  });

  assert.equal(filtered.semanticSpec.datasets.at(-1).values.length, 0);
  assert.equal(getDatasetSchema(source, { data: "source" }).schema.completeness, "known");
  assert.throws(
    () => source.filterData({ id: "invalid", field: "typo", range: { min: 0 } }),
    /does not contain field "typo"/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});

test("schema inference distinguishes legacy empty and known empty records", () => {
  const unknown = chart().createData({ id: "empty", values: [] });
  const known = chart().createData({ id: "record", values: [{}] });

  assert.deepEqual(getDatasetSchema(unknown, { data: "empty" }).schema, {
    version: 1,
    completeness: "unknown",
    origin: "inferred",
    fields: []
  });
  assert.deepEqual(getDatasetSchema(known, { data: "record" }).schema, {
    version: 1,
    completeness: "known",
    origin: "inferred",
    fields: []
  });
});

test("derived schemas reject fields removed by an upstream transform", () => {
  const source = chart().createData({
    id: "source",
    values: [{ group: "A", x: 1, y: 2 }, { group: "A", x: 2, y: 4 }]
  });
  const summary = source.createSummaryData({
    id: "summary",
    groupBy: "group",
    aggregates: [{ op: "mean", field: "y", as: "mean" }]
  });

  assert.deepEqual(
    getDatasetSchema(summary, { data: "summary" }).schema.fields.map(field => field.name),
    ["group", "mean"]
  );
  assert.throws(
    () => summary.filterData({ id: "invalid", source: "summary", field: "x", range: { min: 1 } }),
    /does not contain field "x"/
  );
  assert.equal(summary.semanticSpec.datasets.length, 2);
});

test("source revision rejects a removed field atomically", () => {
  const program = chart()
    .createCanvas()
    .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const before = JSON.stringify(program);

  assert.throws(
    () => program.reviseData({ source: "source", id: "revision", values: [{ x: 1 }] }),
    /does not contain field "y"/
  );
  assert.equal(JSON.stringify(program), before);
});

test("empty-domain preservation follows a validated source revision identity", () => {
  const program = chart()
    .createCanvas()
    .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }], schema: numericSchema })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { emptyDomain: "preserve" } })
    .encodeY({ field: "y", scale: { emptyDomain: "preserve" } });
  const xScale = program.semanticSpec.layers[0].encoding.x.scale;
  const yScale = program.semanticSpec.layers[0].encoding.y.scale;
  const domains = {
    x: program.resolvedScales[xScale].domain,
    y: program.resolvedScales[yScale].domain
  };

  const revised = program.reviseData({
    source: "source",
    id: "revision",
    values: []
  });

  assert.deepEqual(revised.resolvedScales[xScale].domain, domains.x);
  assert.deepEqual(revised.resolvedScales[yScale].domain, domains.y);
  assert.equal(revised.semanticSpec.layers[0].data, "revision");
  assert.equal(revised.graphicSpec.objects.points.items.length, 0);
});
