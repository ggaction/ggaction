import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveFacetProgramLayout } from
  "../../../../src/materialization/facets.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 10, z: 100, row: "A", column: "X", group: "g1" }),
  Object.freeze({ x: 2, y: 20, z: 200, row: "A", column: "Z", group: "g2" }),
  Object.freeze({ x: 3, y: 30, z: 300, row: "B", column: "X", group: "g1" }),
  Object.freeze({ x: 4, y: 40, z: 400, row: "B", column: "Y", group: "g2" }),
  Object.freeze({ x: 5, y: 50, z: 500, row: "B", column: "Z", group: "g1" })
]);

function scatter(values = rows) {
  return chart()
    .createCanvas({
      width: 360,
      height: 240,
      margin: { top: 50, right: 80, bottom: 70, left: 70 }
    })
    .createData({ values })
    .createScatterPlot({
      id: "points",
      x: "x",
      y: "y",
      color: "group"
    });
}

test("exposes explicit one-field facet order through the public action", () => {
  const program = scatter().facet({ field: "row", values: ["B", "A"] });

  assert.deepEqual(program.compositionSpec.facet.values, ["B", "A"]);
  assert.deepEqual(
    program.graphicSpec.objects["facet-headers"].items.map(item => item.properties.text),
    ["B", "A"]
  );
});

test("keeps observed row-column pairs in their actual grid coordinates", () => {
  const program = scatter().facetGrid({
    id: "matrix",
    rows: { field: "row", values: ["B", "A"] },
    columns: { field: "column", values: ["Z", "Y", "X"] },
    combinations: "observed"
  });
  const cells = program.compositionSpec.facet.grid.cells;
  const layout = resolveFacetProgramLayout(program).layout;

  assert.deepEqual(cells.map(cell => [cell.row, cell.column]), [
    [0, 0], [0, 1], [0, 2], [1, 0], [1, 2]
  ]);
  assert.equal(program.compositionSpec.columns, 3);
  assert.deepEqual(layout.children.map(child => [child.row, child.column]), [
    [0, 0], [0, 1], [0, 2], [1, 0], [1, 2]
  ]);
  assert.ok(layout.children[4].x > layout.children[3].x);
  assert.deepEqual(
    program.graphicSpec.objects["matrix-headers"].items.map(item => item.properties.text),
    ["B · Z", "B · Y", "B · X", "A · Z", "A · X"]
  );
  const relaid = program.editCompositionLayout({ gap: 24 });
  assert.deepEqual(
    resolveFacetProgramLayout(relaid).layout.children.map(child => [child.row, child.column]),
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]]
  );
  assert.throws(
    () => program.editCompositionLayout({ columns: 2 }),
    /columns must match the declared column domain/
  );
});

test("materializes full combinations with an explicit blank child", () => {
  const program = scatter().facetGrid({
    id: "matrix",
    rows: { field: "row" },
    columns: { field: "column" },
    combinations: "full"
  });
  const empty = program.compositionSpec.facet.grid.cells.find(cell => cell.empty);

  assert.deepEqual([empty.rowValue, empty.columnValue], ["A", "Y"]);
  assert.equal(program.children[empty.id].semanticSpec.layers.length, 0);
  assert.equal(program.children[empty.id].graphicSpec.objects.canvas.type, "canvas");
  assert.equal(program.compositionSpec.children.length, 6);
  assert.equal(program.graphicSpec.objects["matrix-headers"].items.length, 6);
});

test("replays a grid source recipe while preserving policy and parent styling", () => {
  const original = scatter()
    .facetGrid({
      id: "matrix",
      rows: { field: "row" },
      columns: { field: "column" },
      combinations: "full",
      scales: { x: "independent" }
    })
    .editFacetHeaders({ color: "#123456" })
    .createTitle({ text: "Matrix" });
  const revisedRows = rows.map(row => Object.freeze({ ...row, x: row.x + 10 }));
  const revised = original.editFacetSource({ program: scatter(revisedRows) });

  assert.deepEqual(revised.compositionSpec.children, original.compositionSpec.children);
  assert.equal(revised.compositionSpec.facet.scales.x, "independent");
  assert.equal(revised.semanticSpec.title.text, "Matrix");
  assert.equal(
    revised.graphicSpec.objects["matrix-headers"].items[0].properties.fill,
    "#123456"
  );
  assert.deepEqual(
    revised.children["matrix-row-1-column-1"].resolvedScales.x.domain,
    [11, 11]
  );
  assert.equal(original.children["matrix-row-1-column-1"].resolvedScales.x.domain[0], 1);
  assert.equal(revised.trace.children.at(-1).op, "editFacetSource");
});

test("repeats one Cartesian position with independent or shared domains", () => {
  const independent = scatter().repeatCharts({
    id: "metrics",
    target: "points",
    channel: "x",
    fields: ["x", "y", "z"],
    columns: 2
  });
  const shared = scatter().repeatCharts({
    id: "metrics",
    target: "points",
    channel: "x",
    fields: ["x", "y", "z"],
    scales: { x: "shared" },
    guides: { legend: "shared" }
  });

  assert.deepEqual(
    Object.values(independent.children).map(child => child.resolvedScales.x.domain),
    [[1, 5], [10, 50], [100, 500]]
  );
  assert.deepEqual(
    Object.values(shared.children).map(child => child.resolvedScales.x.domain),
    [[1, 500], [1, 500], [1, 500]]
  );
  assert.deepEqual(shared.compositionSpec.facet.repeat, {
    target: "points", channel: "x", fields: ["x", "y", "z"]
  });
  assert.equal(shared.graphicSpec.objects["metrics-legend"].type, "collection");
  const relinked = independent.editFacetScales({ x: "shared" });
  assert.deepEqual(
    Object.values(relinked.children).map(child => child.resolvedScales.x.domain),
    [[1, 500], [1, 500], [1, 500]]
  );
  assert.throws(
    () => independent.editFacetGuides({ axes: "outer" }),
    /does not promote axes/
  );
});

test("replays repeat fields on a revised unit program", () => {
  const original = scatter().repeatCharts({
    id: "metrics",
    target: "points",
    channel: "x",
    fields: ["x", "z"]
  });
  const revisedRows = rows.map(row => Object.freeze({
    ...row,
    x: row.x * 2,
    z: row.z * 2
  }));
  const revised = original.editFacetSource({ program: scatter(revisedRows) });

  assert.deepEqual(
    Object.values(revised.children).map(child => child.resolvedScales.x.domain),
    [[2, 10], [200, 1000]]
  );
  assert.deepEqual(revised.compositionSpec.children, original.compositionSpec.children);
});

test("rejects malformed grid, repeat, and source revisions atomically", () => {
  const base = scatter();
  const graphics = base.graphicSpec;
  const trace = base.trace;

  assert.throws(
    () => base.facetGrid({ rows: { field: "row" }, columns: { field: "row" } }),
    /must be different/
  );
  assert.throws(
    () => base.facetGrid({
      rows: { field: "row" }, columns: { field: "column" }, combinations: "all"
    }),
    /observed.*full/
  );
  assert.throws(
    () => base.repeatCharts({ channel: "theta", fields: ["x"] }),
    /channel must be/
  );
  assert.throws(
    () => base.repeatCharts({ channel: "x", fields: ["x", "x"] }),
    /must be unique/
  );
  const derived = chart()
    .createCanvas()
    .createData({ id: "source", values: rows })
    .createSummaryData({
      id: "summary",
      groupBy: "group",
      aggregates: [{ op: "mean", field: "x", as: "x" }]
    })
    .createPointMark({ id: "summaryPoint", data: "summary" })
    .encodeX({ target: "summaryPoint", field: "x" })
    .encodeY({ target: "summaryPoint", field: "x" });
  assert.throws(
    () => derived.repeatCharts({ channel: "x", fields: ["x"] }),
    /derived dataset dependency/
  );
  assert.throws(
    () => base.repeatCharts({ channel: "x", fields: ["x"], guides: { axes: "outer" } }),
    /does not promote axes/
  );
  const faceted = base.facetGrid({
    rows: { field: "row" }, columns: { field: "column" }
  });
  assert.throws(
    () => faceted.editFacetSource({ program: chart() }),
    /at least one materializable layer/
  );
  assert.equal(base.graphicSpec, graphics);
  assert.equal(base.trace, trace);
});
