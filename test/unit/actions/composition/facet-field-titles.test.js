import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveTextBounds } from "../../../../src/core/textMetrics.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { createRegionChart } from "../../../../examples/facet-header-rotation/program.js";
import { createFacetFieldTitles } from "../../../../examples/facet-field-titles/program.js";

const items = p => p.graphicSpec.objects[`${p.compositionSpec.id}-headers`].items;
const config = p => p.materializationConfigs.facets[p.compositionSpec.id].headers;
const close = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const unit = () => createRegionChart().editCanvas({ margin: 80 });
const facet = (side = "left", title = { text: "Region" }, extra = {}) => unit().facet({
  field: "region", columns: 1, ...extra, headers: { column: { side, offset: 40, ...(title === undefined ? {} : { title }) } }
});

test("initial and edited title resolve identically, merge immutably and remove cleanly", () => {
  const old = unit().facet({ field: "region", columns: 1, headers: { column: { side: "left", offset: 40 } } });
  const before = serializeProgram(old), patch = { text: "Region" };
  const p = old.editFacetHeaders({ role: "column", title: patch });
  assert.deepEqual(p.graphicSpec, facet().graphicSpec);
  patch.text = "caller mutation";
  assert.equal(config(p).column.title.text, "Region");
  assert.equal(serializeProgram(old), before);
  const changed = p.editFacetHeaders({ role: "column", title: { fontSize: 14 } });
  assert.equal(config(changed).column.title.text, "Region");
  assert.equal(config(p).column.title.fontSize, undefined);
  assert.deepEqual(p.editFacetHeaders({ role: "column", title: false }).graphicSpec, old.graphicSpec);
});

for (const side of ["left", "right", "top", "bottom"]) {
  for (const spacing of ["plot", "canvas"]) {
    for (const align of ["start", "center", "end"]) {
      test(`${side} ${spacing} field title aligns to the complete occupied plot span at ${align}`, () => {
        const p = facet(side, { text: "Region", align, alongOffset: 3 }, { spacing, gap: 200 });
        const { layout, plots } = resolveFacetProgramLayout(p);
        const horizontal = ["top", "bottom"].includes(side);
        const starts = layout.children.map((cell, i) => horizontal ? cell.x + plots[i].x : cell.y + plots[i].y);
        const ends = layout.children.map((cell, i) => horizontal ? cell.x + plots[i].x + plots[i].width : cell.y + plots[i].y + plots[i].height);
        const b = resolveTextBounds(items(p).at(-1).properties);
        const a = horizontal ? b.left : b.top, z = horizontal ? b.right : b.bottom;
        if (align === "start") close(a, Math.min(...starts) + 3);
        if (align === "end") close(z, Math.max(...ends) + 3);
        if (align === "center") close((a + z) / 2, (Math.min(...starts) + Math.max(...ends)) / 2 + 3);
        assert.equal(items(p).length, 3);
      });
    }
  }
}

test("explicit rotated title reuses a sufficient existing margin exactly once", () => {
  const p = createFacetFieldTitles();
  assert.deepEqual(p.graphicSpec.objects.canvas.properties, { width: 215, height: 195, background: "white" });
  assert.deepEqual(resolveFacetProgramLayout(p).layout.children.map(c => [c.x, c.y]), [[0, 0], [0, 85]]);
  assert.deepEqual(items(p).at(-1).properties, {
    x: 10, y: 92.5, text: "Region", fill: "#0f172a", fontSize: 12, fontFamily: "sans-serif",
    fontWeight: 400, textAlign: "center", textBaseline: "middle", rotation: -Math.PI / 2
  });
});

test("title supports structured rotation, style inheritance, override and zero", () => {
  const p = facet("top", { text: "Region", rotation: { value: 45, unit: "degrees" },
    fontSize: 11, color: "red", fontFamily: "serif", fontWeight: 700 }, { gap: 100 });
  assert.equal(config(p).column.title.rotation, Math.PI / 4);
  assert.equal(items(p).at(-1).properties.fill, "red");
  const reset = p.editFacetHeaders({ role: "column", title: { rotation: 0 } });
  assert.equal(items(reset).at(-1).properties.rotation, 0);
});

test("invalid title shapes, roles, values and empty edits reject atomically", () => {
  const p = createFacetFieldTitles(), before = serializeProgram(p);
  for (const title of [null, undefined, true, "Region", {}, { text: "" },
    { text: "A\u2028B" }, { text: undefined }, { fontSize: 0 }, { fontSize: Infinity },
    { fontFamily: "" }, { fontWeight: NaN }, { fontWeight: {} }, { color: "" },
    { offset: -1 }, { align: "left" }, { alongOffset: Infinity }, { rotation: NaN },
    { rotation: { value: 1, unit: "turns" } }, { padding: 1 }]) {
    assert.throws(() => p.editFacetHeaders({ role: "column", title }));
    assert.equal(serializeProgram(p), before);
  }
  assert.throws(() => p.editFacetHeaders({ title: { text: "Region" } }), /explicit/);
  assert.throws(() => p.editFacetHeaders({ role: "row", title: { text: "Region" } }), /grid/);
  assert.throws(() => unit().facet({ field: "region", headers: { title: { text: "Region" } } }));
  assert.throws(() => facet("left", { fontSize: 12 }), /text/);
});

test("title collision, insufficient along span and overflow reject without mutating ancestors", () => {
  const p = createFacetFieldTitles(), before = serializeProgram(p);
  for (const title of [{ offset: 35, alongOffset: -42.5 }, { alongOffset: 1000 }, { text: "Region".repeat(50) }]) {
    assert.throws(() => p.editFacetHeaders({ role: "column", title }), /space|text|Canvas/);
    assert.equal(serializeProgram(p), before);
  }
});

test("layout, source, metrics, theme and editable persistence retain the title", () => {
  const p = createFacetFieldTitles();
  const variants = [p.editCompositionLayout({ gap: 30 }), p.editFacetSource({ program: createRegionChart()
    .editCanvas({ margin: { left: 80, top: 20, right: 15, bottom: 30 } }) }),
    p.applyTheme({ theme: "dark" }), p.applyTextMetrics({ profile: { schemaVersion: 1, id: "title-font", measurements: [
      { text: "Region", fontFamily: "sans-serif", fontSize: 12, fontWeight: 400, fontStyle: "normal", width: 40 }
    ] } }), deserializeProgram(serializeProgram(p))];
  for (const current of variants) {
    assert.deepEqual(config(current).column.title, { text: "Region", offset: 64 });
    assert.equal(items(current).at(-1).properties.text, "Region");
    assert.equal(current.semanticSpec.datasets[0].values.length, 6);
  }
  assert.deepEqual(variants.at(-1).graphicSpec, p.graphicSpec);
});

test("editable persistence rejects malformed stored titles and normalized angles", () => {
  const p = createFacetFieldTitles();
  for (const title of [false, { text: "Region", rotation: { value: 90, unit: "degrees" } },
    { text: "Region", rotation: Infinity }, { text: "Region", alongOffset: NaN },
    { text: "Region", offset: -1 }, { text: "Region", unknown: 1 }]) {
    const current = p.materializationConfigs.facets.facet;
    const invalid = p._withMaterializationConfig(["facets", "facet"], { ...current,
      headers: { ...current.headers, column: { ...current.headers.column, title } } });
    assert.throws(() => serializeProgram(invalid));
  }
});

test("row and column grid titles each occur once, including sparse cells and repetition", () => {
  const base = chart().createCanvas({ plot: { width: 100, height: 60 }, margin: 60 })
    .createData({ values: [{ row: "A", group: "X", x: 1, y: 2 }, { row: "B", group: "Y", x: 2, y: 3 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  const grid = base.facetGrid({ rows: { field: "row" }, columns: { field: "group" },
    headers: { row: { title: { text: "Group" } }, column: { title: { text: "Series" } } } });
  assert.deepEqual(items(grid).slice(-2).map(x => x.properties.text), ["Series", "Group"]);
  const repeat = base.repeatCharts({ channel: "y", fields: ["x", "y"],
    headers: { column: { title: { text: "Measurements" } } } });
  assert.equal(items(repeat).at(-1).properties.text, "Measurements");
  assert.deepEqual(deserializeProgram(serializeProgram(grid)).graphicSpec, grid.graphicSpec);
});

test("field and chart titles coexist and equivalent layout edits converge", () => {
  const p = facet("top", { text: "Region" });
  const titled = p.createTitle({ text: "Trends" });
  assert.equal(titled.semanticSpec.title.text, "Trends");
  assert.equal(items(titled).at(-1).properties.text, "Region");
  const a = p.editCompositionLayout({ gap: 90 }).editFacetHeaders({ role: "column", title: { fontSize: 14 } });
  const b = p.editFacetHeaders({ role: "column", title: { fontSize: 14 } }).editCompositionLayout({ gap: 90 });
  assert.deepEqual(a.graphicSpec, b.graphicSpec);
});

test("explicit field-title colors survive a theme while inherited paint follows its owner", () => {
  const p = facet("left", { text: "Region", color: "#0f172a", fontFamily: "sans-serif" });
  const themed = p.applyTheme({ theme: "dark" });
  assert.equal(items(themed).at(-1).properties.fill, "#0f172a");
  assert.equal(config(themed).column.title.color, "#0f172a");
  assert.equal(items(themed).at(-1).properties.fontFamily, "sans-serif");
  assert.notEqual(items(themed)[0].properties.fill, items(p)[0].properties.fill);
  const inherited = facet().applyTheme({ theme: "dark" });
  assert.equal(items(inherited).at(-1).properties.fill, items(inherited)[0].properties.fill);
});
