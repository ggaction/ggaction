import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const base = () => chart().createCanvas({ width: 300, height: 220, margin: 60 })
  .createData({ values: [
    { row: "R1", group: "A", x: 1, y: 2 }, { row: "R2", group: "B", x: 2, y: 3 }
  ] }).createScatterPlot({ x: "x", y: "y", guides: false });
const common = { fontSize: 16, fontFamily: "serif", color: "red", offset: 12 };

test("initial facet headers match explicit common and role edits", () => {
  for (const [action, args] of [["facet", { field: "group" }],
    ["facetGrid", { rows: { field: "row" }, columns: { field: "group" } }],
    ["repeatCharts", { channel: "y", fields: ["x", "y"] }]]) {
    const source = base();
    const column = { side: action === "facetGrid" ? "bottom" : "right", color: "blue" };
    const actual = source[action]({ ...args, headers: { ...common, column } });
    const expected = source[action](args).editFacetHeaders(common)
      .editFacetHeaders({ ...column, role: "column" });
    assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
    assert.deepEqual(actual.materializationConfigs.facets, expected.materializationConfigs.facets);
    assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
    assert.deepEqual(actual.editCompositionLayout({ gap: 15 }).graphicSpec,
      expected.editCompositionLayout({ gap: 15 }).graphicSpec);
  }
});

test("initial header choices keep precedence over themes and source replay", () => {
  const source = base().applyTheme({ theme: "dark" });
  const result = source.facet({ field: "group", headers: common }).applyTheme({ theme: "light" });
  const headers = result.materializationConfigs.facets.facet.headers;
  assert.equal(headers.common.color, "red");
  assert.equal(headers.common.fontFamily, "serif");
  const revised = result.editFacetSource({ program: base() });
  assert.equal(revised.materializationConfigs.facets.facet.headers.common.color, "red");
});

test("invalid initial header intent leaves the source unchanged", () => {
  const source = base();
  const before = serializeProgram(source);
  for (const headers of [null, { fontSize: 0 }, { side: "right" }, { row: { color: "red" } },
    { column: { role: "row" } }, { column: { side: "inside" } }]) {
    assert.throws(() => source.facet({ field: "group", headers }));
    assert.equal(serializeProgram(source), before);
  }
  assert.throws(() => source.facetGrid({ rows: { field: "row" }, columns: { field: "group" },
    headers: { column: { side: "right" } } }));
});
