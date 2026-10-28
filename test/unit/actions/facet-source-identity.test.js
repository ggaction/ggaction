import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { ChartProgram } from "../../../src/ChartProgram.js";
import { serializeProgram } from "../../../src/persistence.js";

const rows = [{ id: "a", x: 1, y: 2, group: "A" }, { id: "b", x: 2, y: 4, group: "B" }];
const source = id => chart().createCanvas().createData({ id, values: rows, keyField: "id" })
  .createPointMark({ id: "points", data: id }).encodeX({ field: "x" }).encodeY({ field: "y" });

test("facet source replacement follows one live logical ancestor through a physical revision", () => {
  const base = source("rows"), faceted = base.facet({ field: "group" }), old = serializeProgram(faceted);
  const values = rows.map(row => ({ ...row, y: row.y * 3 }));
  for (const options of [
    { action: { method: "reviseData", options: { source: "rows", id: "next", values } } },
    { program: base.reviseData({ source: "rows", id: "next", values }) }
  ]) {
    const revised = faceted.editFacetSource(options);
    assert.equal(revised.compositionSpec.facet.data, "next");
    assert.deepEqual(Object.values(revised.children).map(child => child.semanticSpec.datasets
      .find(dataset => dataset.id === child.semanticSpec.layers[0].data).values[0].y), [6, 12]);
  }
  assert.equal(serializeProgram(faceted), old);
});

test("facet replacement rejects absent or multiple logical ancestors without choosing a revision", () => {
  const faceted = source("rows").facet({ field: "group" }), old = serializeProgram(faceted);
  assert.throws(() => faceted.editFacetSource({ program: source("unrelated") }), /one common partition dataset/);
  const derived = chart().createCanvas().createData({ id: "other", values: rows })
    .filterData({ id: "filtered", source: "other", field: "x", oneOf: [1, 2] })
    .createPointMark({ id: "points", data: "filtered" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  // A malformed imported alias graph must not resolve to the first or newest candidate.
  const ambiguous = new ChartProgram({ ...derived, semanticSpec: { ...derived.semanticSpec,
    datasets: derived.semanticSpec.datasets.map(dataset => ({ ...dataset, logicalId: "rows" })) } });
  assert.throws(() => faceted.editFacetSource({ program: ambiguous }), /one common partition dataset/);
  assert.equal(serializeProgram(faceted), old);
});
