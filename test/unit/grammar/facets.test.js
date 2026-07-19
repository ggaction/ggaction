import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { resolveFacetDefinition } from "../../../src/grammar/facets/index.js";

const rows = [
  { x: 1, y: 4, group: "Japan" },
  { x: 2, y: 3, group: "USA" },
  { x: 3, y: 2, group: "Japan" },
  { x: 4, y: 1, group: "Europe" }
];

function pointProgram(values = rows) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("resolves direct-source facet values in first-appearance order", () => {
  const definition = resolveFacetDefinition(pointProgram().semanticSpec, {
    field: "group"
  });

  assert.deepEqual(definition, {
    id: "facet",
    data: "cars",
    field: "group",
    values: ["Japan", "USA", "Europe"],
    dependencies: {
      field: "group",
      anchor: "cars",
      replay: [],
      layers: [{ id: "points", data: "cars" }]
    },
    cells: [
      { id: "facet-cell-1", data: "facet-cell-1-data", value: "Japan" },
      { id: "facet-cell-2", data: "facet-cell-2-data", value: "USA" },
      { id: "facet-cell-3", data: "facet-cell-3-data", value: "Europe" }
    ]
  });
  assert.equal(Object.isFrozen(definition), true);
  assert.equal(Object.isFrozen(definition.cells), true);
  assert.equal(JSON.stringify(definition.cells.map(cell => cell.id)).includes("Japan"), false);
});

test("preserves an explicit observed facet order without mutating its input", () => {
  const values = ["Europe", "Japan"];
  const definition = resolveFacetDefinition(pointProgram().semanticSpec, {
    field: "group",
    values
  });

  values.reverse();
  assert.deepEqual(definition.values, ["Europe", "Japan"]);
  assert.deepEqual(definition.cells.map(cell => cell.value), ["Europe", "Japan"]);

  const named = resolveFacetDefinition(pointProgram().semanticSpec, {
    id: "originFacet",
    field: "group"
  });
  assert.equal(named.cells[0].id, "originFacet-cell-1");
  assert.equal(named.cells[0].data, "originFacet-cell-1-data");
});

test("supports complete histogram and aggregate bar sources", () => {
  const histogram = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "x", maxBins: 3 });
  const aggregate = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "group", fieldType: "ordinal" })
    .encodeY({ field: "y", aggregate: "mean" });

  assert.deepEqual(
    resolveFacetDefinition(histogram.semanticSpec, { field: "group" }).values,
    ["Japan", "USA", "Europe"]
  );
  assert.deepEqual(
    resolveFacetDefinition(aggregate.semanticSpec, { field: "group" }).values,
    ["Japan", "USA", "Europe"]
  );
});

test("supports row-preserving anchors and rejects unsupported or incomplete sources", () => {
  const transformed = pointProgram().filterData({
    id: "selected",
    source: "cars",
    field: "group",
    oneOf: ["Japan"]
  });
  const rebound = transformed.editSemantic({
    property: "layer[points].data",
    value: "selected"
  });
  const definition = resolveFacetDefinition(rebound.semanticSpec, {
    field: "group"
  });
  assert.equal(definition.data, "selected");
  assert.deepEqual(definition.values, ["Japan"]);

  const unsupported = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "line" });
  assert.throws(
    () => resolveFacetDefinition(unsupported.semanticSpec, { field: "group" }),
    /complete materializable Cartesian mark/
  );

  const incompleteBar = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" });
  assert.throws(
    () => resolveFacetDefinition(incompleteBar.semanticSpec, { field: "group" }),
    /complete histogram, aggregate, or ranged bar/
  );
});

test("rejects invalid facet fields, values, and explicit dataset mismatches", () => {
  const program = pointProgram();
  assert.throws(
    () => resolveFacetDefinition(program.semanticSpec, {}),
    /non-empty field/
  );
  assert.throws(
    () => resolveFacetDefinition(program.semanticSpec, { field: "missing" }),
    /Facet field "missing" is missing/
  );
  assert.throws(
    () => resolveFacetDefinition(program.semanticSpec, {
      field: "group",
      values: ["Japan", "Japan"]
    }),
    /must be unique/
  );
  assert.throws(
    () => resolveFacetDefinition(program.semanticSpec, {
      field: "group",
      values: ["Japan", "Mars"]
    }),
    /not present/
  );
  assert.throws(
    () => resolveFacetDefinition(program.semanticSpec, {
      data: "missing",
      field: "group"
    }),
    /partition dataset "missing" does not exist/
  );
});
