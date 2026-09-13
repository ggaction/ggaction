import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 10, row: "A", column: "X" }),
  Object.freeze({ x: 2, y: 20, row: "A", column: "Y" }),
  Object.freeze({ x: 3, y: 30, row: "B", column: "X" }),
  Object.freeze({ x: 4, y: 40, row: "B", column: "Y" })
]);

function unit(values = rows) {
  return chart()
    .createCanvas({
      width: 200,
      height: 140,
      margin: { top: 30, right: 20, bottom: 30, left: 30 }
    })
    .createData({ values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function grid() {
  return unit().facetGrid({
    id: "matrix",
    rows: { field: "row" },
    columns: { field: "column" },
    combinations: "full"
  });
}

function text(program) {
  return program.graphicSpec.objects[`${program.compositionSpec.id}-headers`]
    .items.map(item => item.properties.text);
}

function state(program) {
  return JSON.stringify({
    graphicSpec: program.graphicSpec,
    compositionSpec: program.compositionSpec,
    materializationConfigs: program.materializationConfigs,
    children: program.children,
    trace: program.trace
  });
}

test("keeps common display labels in legacy cell headers", () => {
  const original = grid();
  const children = original.children;
  const mapped = original.editFacetHeaders({
    labelMap: [
      { value: "A", label: "공통 A" },
      { value: "X", label: "공통 X" }
    ]
  });

  assert.equal(mapped.materializationConfigs.facets.matrix.headers.mode, "legacy");
  assert.deepEqual(text(mapped), [
    "공통 A · 공통 X", "공통 A · Y", "B · 공통 X", "B · Y"
  ]);
  assert.equal(mapped.children, children);
  assert.deepEqual(mapped.compositionSpec.facet.grid.cells.map(cell => [
    cell.rowValue, cell.columnValue
  ]), [["A", "X"], ["A", "Y"], ["B", "X"], ["B", "Y"]]);
  assert.deepEqual(text(original), ["A · X", "A · Y", "B · X", "B · Y"]);
});

test("separates row and column role maps with deterministic strip placement", () => {
  const common = grid().editFacetHeaders({
    labelMap: [{ value: "A", label: "공통 A" }]
  });
  const role = common
    .editFacetHeaders({
      role: "row",
      labelMap: [{ value: "A", label: "행 A" }]
    })
    .editFacetHeaders({
      role: "column",
      labelMap: [{ value: "X", label: "열 X" }]
    });
  const items = role.graphicSpec.objects["matrix-headers"].items;

  assert.equal(role.materializationConfigs.facets.matrix.headers.mode, "roles");
  assert.deepEqual(text(role), ["열 X", "Y", "행 A", "B"]);
  assert.deepEqual(items.map(item => [
    item.properties.textAlign,
    item.properties.textBaseline
  ]), [
    ["center", "middle"], ["center", "middle"],
    ["right", "middle"], ["right", "middle"]
  ]);
  assert.ok(role.graphicSpec.objects.canvas.properties.width >
    common.graphicSpec.objects.canvas.properties.width);
  assert.ok(role.graphicSpec.objects.canvas.properties.height >
    common.graphicSpec.objects.canvas.properties.height);

  const commonFallback = role.editFacetHeaders({ role: "row", labelMap: "auto" });
  assert.deepEqual(text(commonFallback), ["열 X", "Y", "공통 A", "B"]);
  const rawFallback = commonFallback.editFacetHeaders({ labelMap: "auto" });
  assert.deepEqual(text(rawFallback), ["열 X", "Y", "A", "B"]);
  assert.equal(role.materializationConfigs.facets.matrix.headers.row.labelMap[0].label, "행 A");
});

test("moves role strips to right and bottom without changing facet identity", () => {
  const original = grid();
  const children = original.children;
  const moved = original
    .editFacetHeaders({ role: "row", side: "right", align: "end" })
    .editFacetHeaders({ role: "column", side: "bottom", align: "start" });
  const items = moved.graphicSpec.objects["matrix-headers"].items.map(
    item => item.properties
  );

  assert.equal(moved.children, children);
  assert.deepEqual(text(moved), ["X", "Y", "A", "B"]);
  assert.ok(items[0].y > moved.children["matrix-row-2-column-1"]
    .graphicSpec.objects.canvas.properties.height);
  assert.equal(items[0].textAlign, "left");
  assert.equal(items[2].textAlign, "left");
  assert.equal(items[2].textBaseline, "bottom");
  assert.deepEqual(moved.compositionSpec.facet.grid.cells,
    original.compositionSpec.facet.grid.cells);
});

test("treats one-field facet headers as per-cell column roles", () => {
  const original = unit().facet({ field: "row", columns: 1 });
  const mapped = original.editFacetHeaders({
    role: "column",
    side: "bottom",
    align: "start",
    labelMap: [{ value: "A", label: "Alpha" }]
  });

  assert.deepEqual(text(mapped), ["Alpha", "B"]);
  assert.ok(mapped.graphicSpec.objects["facet-headers"].items[1].properties.y >
    mapped.graphicSpec.objects["facet-headers"].items[0].properties.y);
  assert.equal(mapped.graphicSpec.objects["facet-headers"].items[0]
    .properties.textAlign, "left");
  assert.throws(
    () => original.editFacetHeaders({ role: "row" }),
    /row role requires a row-column facet grid/
  );
});

test("keeps empty mapped role items while removing their layout reservation", () => {
  const original = grid();
  const hidden = original
    .editFacetHeaders({
      labelMap: ["A", "B", "X", "Y"].map(value => ({ value, label: "" }))
    })
    .editFacetHeaders({ role: "column" });

  assert.deepEqual(text(hidden), ["", "", "", ""]);
  assert.deepEqual(hidden.materializationConfigs.facets.matrix.headers.common.labelMap,
    ["A", "B", "X", "Y"].map(value => ({ value, label: "" })));
  assert.deepEqual(
    hidden.materializationConfigs.facets.matrix.headers.column,
    { side: "top" }
  );
  assert.equal(hidden.graphicSpec.objects.canvas.properties.width,
    original.graphicSpec.objects.canvas.properties.width);
  assert.equal(hidden.graphicSpec.objects.canvas.properties.height,
    original.graphicSpec.objects.canvas.properties.height);
});

test("preserves role header policy through layout and source replay", () => {
  const original = unit()
    .applyTheme({ theme: "dark" })
    .facetGrid({
      id: "matrix",
      rows: { field: "row" },
      columns: { field: "column" },
      combinations: "full"
    })
    .editFacetHeaders({ role: "row", labelMap: [{ value: "A", label: "행 A" }] })
    .editFacetHeaders({ role: "column", side: "bottom" });
  const relaid = original.editCompositionLayout({ gap: 24 });
  const revisedRows = rows.map(value => Object.freeze({ ...value, x: value.x + 10 }));
  const replayed = original.editFacetSource({ program: unit(revisedRows) });

  assert.deepEqual(text(relaid), ["X", "Y", "행 A", "B"]);
  assert.equal(
    relaid.materializationConfigs.theme.frames.at(-1).name,
    "dark"
  );
  assert.deepEqual(text(replayed), ["X", "Y", "행 A", "B"]);
  assert.equal(replayed.materializationConfigs.facets.matrix.headers.mode, "roles");
  assert.equal(replayed.materializationConfigs.facets.matrix.headers.column.side, "bottom");
  assert.deepEqual(replayed.compositionSpec.facet.grid.cells.map(cell => cell.id),
    original.compositionSpec.facet.grid.cells.map(cell => cell.id));
});

test("promotes categorical legend display maps without changing facet partitions", () => {
  const source = unit()
    .editCanvas({
      width: 520,
      height: 360,
      margin: { top: 70, right: 180, bottom: 90, left: 70 }
    })
    .encodeColor({ field: "row" })
    .createLegend({ target: "points", channels: ["color"] })
    .editLegendBlock({
      target: "points",
      channel: "color",
      labelMap: [{ value: "A", label: "Alpha" }]
    });
  const faceted = source.facet({
    field: "column",
    guides: { legend: "shared" }
  });

  assert.deepEqual(
    faceted.graphicSpec.objects.colorLegendLabels.items.map(item =>
      item.properties.text
    ),
    ["Alpha", "B"]
  );
  assert.deepEqual(faceted.compositionSpec.facet.values, ["X", "Y"]);
  assert.deepEqual(faceted.guideConfigs.legend.color.blockOverrides, {
    '["color"]': {
      labelMap: [{ value: "A", label: "Alpha" }]
    }
  });

  const matrix = source.facetGrid({
    rows: { field: "row" },
    columns: { field: "column" },
    guides: { legend: "shared" }
  })
    .editFacetHeaders({ role: "row", side: "right" })
    .editFacetHeaders({ role: "column", side: "bottom" });
  assert.ok(matrix.graphicSpec.objects.colorLegendLabels);
  assert.deepEqual(text(matrix), ["X", "Y", "A", "B"]);
  assert.equal(matrix.graphicSpec.objects.canvas.properties.width >
    faceted.graphicSpec.objects.canvas.properties.width, true);
});

test("rejects ambiguous, incompatible, and duplicate header requests atomically", () => {
  const original = grid();
  const before = state(original);
  for (const options of [
    { side: "top" },
    { role: "all", side: "left" },
    { role: "row", side: "top" },
    { role: "column", side: "left" },
    { align: "middle" },
    { role: "all" },
    {
      labelMap: [
        { value: 0, label: "zero" },
        { value: -0, label: "negative zero" }
      ]
    }
  ]) {
    assert.throws(() => original.editFacetHeaders(options));
    assert.equal(state(original), before);
  }
});
