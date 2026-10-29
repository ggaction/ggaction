import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = Object.freeze([
  Object.freeze({ country: "USA", gold: 10, silver: 20 }),
  Object.freeze({ country: "Canada", gold: 7, silver: 26 })
]);
const options = { field: "k", data: "long", columns: 2 };
const rawBase = () => chart().createCanvas({ width: 160, height: 320,
  margin: { left: 45, right: 10, top: 70, bottom: 50 } })
  .createData({ values: rows })
  .createFoldData({ id: "long", fields: ["gold", "silver"], as: { key: "k", value: "v" } });
const base = () => rawBase().createBarPlot({ x: "country", y: "v", guides: false });
const children = p => p.compositionSpec.children.map(id => p.children[id]);
const layerRows = c => c.semanticSpec.datasets.find(d => d.id === c.semanticSpec.layers[0].data).values;

test("explicit folded partitions preserve the wide source and exact numeric panel geometry", () => {
  const unit = base(), snapshot = serializeProgram(unit);
  const p = unit.facet(options);
  assert.deepEqual(p.compositionSpec.facet.values, ["gold", "silver"]);
  assert.equal(p.compositionSpec.facet.data, "long");
  const expected = [[10, 7], [20, 26]];
  for (const [i, child] of children(p).entries()) {
    assert.deepEqual(child.semanticSpec.datasets.find(d => d.id === "data").values, rows);
    assert.deepEqual(child.semanticSpec.datasets.find(d => d.id === "long"), unit.semanticSpec.datasets.find(d => d.id === "long"));
    assert.deepEqual(layerRows(child).map(r => [r.country, r.k, r.v]), expected[i].map((v, j) => [rows[j].country, i === 0 ? "gold" : "silver", v]));
    assert.deepEqual(child.resolvedScales.y.domain, [0, 30]);
    assert.equal(child.graphicSpec.objects.canvas.properties.width, 160);
    assert.equal(child.graphicSpec.objects.canvas.properties.height, 320);
    const marks = child.graphicSpec.objects.barPlot.items;
    for (const [j, value] of expected[i].entries()) {
      const y = 70 + (200 - 200 * (value / 30));
      assert.equal(marks[j].properties.x, j === 0 ? 52.35 : 104.85);
      assert.equal(marks[j].properties.width, 37.8);
      assert.equal(marks[j].properties.y, y);
      assert.equal(marks[j].properties.height, 270 - y);
    }
  }
  assert.equal(serializeProgram(unit), snapshot);
  assert.match(renderToSVG(p), /<svg/);
});

test("fold boundaries replay downstream computed and filtered datasets from each cell", () => {
  const unit = rawBase()
    .createComputedData({ id: "double", as: "twice", expression: {
      op: "multiply", left: { field: "v" }, right: { constant: 2 }
    } })
    .filterData({ id: "selected", field: "twice", range: { min: 15, max: 60 } })
    .createBarPlot({ x: "country", y: "twice", guides: false });
  const p = unit.facet(options);
  assert.deepEqual(children(p).map(c => layerRows(c).map(r => r.twice)), [[20], [40, 52]]);
  for (const child of children(p)) {
    const replayed = child.semanticSpec.datasets.filter(d => d.id.startsWith(child.compositionSpec?.id ?? "facet-cell"));
    assert.ok(replayed.some(d => d.transform?.[0]?.type === "computed"));
    assert.ok(replayed.some(d => d.transform?.[0]?.type === "filter"));
    assert.equal(child.semanticSpec.datasets.filter(d => d.transform?.[0]?.type === "fold").length, 1);
  }
});

test("fold partition layouts, source revisions and editable persistence retain the explicit boundary", () => {
  const p = base().facet(options), snapshot = serializeProgram(p);
  const edited = p.editCompositionLayout({ gap: 25, padding: 10 });
  assert.deepEqual(children(edited).map(c => layerRows(c).map(r => r.v)), [[10, 7], [20, 26]]);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
  const values = rows.map(r => ({ ...r, gold: r.gold * 2, silver: r.silver * 2 }));
  const revised = edited.reviseData({ source: "data", id: "updated", values });
  assert.deepEqual(children(revised).map(c => layerRows(c).map(r => r.v)), [[20, 14], [40, 52]]);
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
  assert.equal(serializeProgram(p), snapshot);
});

test("fold grid roles partition the materialized table in deterministic row and column order", () => {
  const unit = base(), p = unit.facetGrid({ data: "long", rows: { field: "country" }, columns: { field: "k" } });
  assert.deepEqual(children(p).map(c => layerRows(c).map(r => [r.country, r.k, r.v])), [
    [["USA", "gold", 10]], [["USA", "silver", 20]],
    [["Canada", "gold", 7]], [["Canada", "silver", 26]]
  ]);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("omitted anchors, noncommon folds and missing fields reject without modifying the source", () => {
  const unit = base(), snapshot = serializeProgram(unit);
  assert.throws(() => unit.facet({ field: "k" }), /missing from row/);
  assert.throws(() => unit.facet({ ...options, field: "absent" }), /missing from row/);
  assert.throws(() => unit.facet({ ...options, data: "missing" }), /does not exist/);
  assert.equal(serializeProgram(unit), snapshot);
  assert.doesNotThrow(() => unit.facet({ field: "country" }));
  const mixed = unit.createScatterPlot({ id: "raw", data: "data", x: { field: "gold", scale: { id: "raw-x" } }, y: { field: "silver", scale: { id: "y" } }, guides: false });
  const before = serializeProgram(mixed);
  assert.throws(() => mixed.facet(options), /not a common/);
  assert.equal(serializeProgram(mixed), before);
});

test("fold cell views retain duplicate observations and their original order", () => {
  const values = [rows[0], rows[0], rows[1]];
  const unit = chart().createCanvas({ width: 160, height: 320, margin: { left: 45, right: 10, top: 70, bottom: 50 } })
    .createData({ values }).createFoldData({ id: "long", fields: ["gold", "silver"], as: { key: "k", value: "v" } })
    .createBarPlot({ x: "country", y: "v", guides: false });
  const p = unit.facet(options);
  assert.deepEqual(children(p).map(c => layerRows(c).map(r => r.v)), [[10, 10, 7], [20, 20, 26]]);
  for (const c of children(p)) {
    assert.deepEqual(c.semanticSpec.datasets[0].values, values);
    assert.equal(c.semanticSpec.datasets.find(d => d.id === "long").values.length, 6);
  }
});

test("shared and independent position domains consume the partitioned fold values", () => {
  const unit = base();
  const shared = unit.facet(options);
  const independent = unit.facet({ ...options, scales: { y: "independent" } });
  assert.deepEqual(children(shared).map(c => c.resolvedScales.y.domain), [[0, 30], [0, 30]]);
  assert.deepEqual(children(independent).map(c => c.resolvedScales.y.domain), [[0, 10], [0, 30]]);
});

test("existing complete axes and shared categorical owners remain compatible with a fold boundary", () => {
  const unit = base().editCanvas({ width: 480, height: 400, margin: { left: 70, right: 150, top: 70, bottom: 60 } })
    .encodeColor({ field: "country" }).createGuides({});
  const p = unit.facet({ ...options, guides: { axes: "outer", legend: "shared" } });
  assert.equal(p.guideConfigs.legend.color.target, "barPlot");
  assert.deepEqual(children(p).map(c => layerRows(c).map(r => r.v)), [[10, 7], [20, 26]]);
  const edited = p.editCompositionLayout({ gap: 24 });
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
});

test("an edited fold can explicitly become the new partition snapshot without rewriting the old chart", () => {
  const unit = base(), before = serializeProgram(unit);
  const revised = unit.editFoldData({ target: "long", fields: ["silver", "gold"], dependents: "recompute" });
  const current = revised.semanticSpec.datasets.findLast(d => d.transform?.[0]?.type === "fold");
  const p = revised.facet({ ...options, data: current.id });
  assert.deepEqual(p.compositionSpec.facet.values, ["silver", "gold"]);
  assert.deepEqual(children(p).map(c => layerRows(c).map(r => r.v)), [[20, 26], [10, 7]]);
  assert.equal(serializeProgram(unit), before);
});
