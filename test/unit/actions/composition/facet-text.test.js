import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = [{ group: "A", x: 0, y: 0, label: "area=10" }, { group: "A", x: 1, y: 1 },
  { group: "B", x: 10, y: 20, label: "area=20" }, { group: "B", x: 12, y: 24 }];
function base(values = rows) {
  return chart().createCanvas({ width: 400, height: 300, margin: 70 })
    .createData({ id: "rows", values })
    .createScatterPlot({ id: "points", x: { field: "x", scale: { id: "x" } }, y: { field: "y", scale: { id: "y" } } })
    .filterData({ id: "labels", source: "rows", field: "label", oneOf: ["area=10", "area=20"] })
    .createTextMark({ id: "labels", data: "labels", align: "center", baseline: "middle" })
    .encodeChannels({ target: "labels", channels: {
      x: { field: "x", scale: { id: "x" } }, y: { field: "y", scale: { id: "y" } }, text: { field: "label" }
    } });
}

test("faceted data text replays filtered rows and shares each panel's resolved positions", () => {
  for (const policy of ["shared", "independent"]) {
    const source = base();
    const p = source.facet({ field: "group", data: "rows", columns: 2,
      scales: { x: policy, y: policy }, guides: { axes: "outer" } });
    const children = Object.values(p.children);
    assert.equal(children.length, 2);
    for (const [index, child] of children.entries()) {
      const labels = child.graphicSpec.objects.labels.items;
      const point = child.graphicSpec.objects.points.items[0].properties;
      assert.equal(labels.length, 1);
      assert.equal(labels[0].properties.text, index === 0 ? "area=10" : "area=20");
      assert.equal(labels[0].properties.x, point.x);
      assert.equal(labels[0].properties.y, point.y);
      const layer = child.semanticSpec.layers.find(l => l.id === "labels");
      const data = child.semanticSpec.datasets.find(d => d.id === layer.data);
      assert.deepEqual(data.values.map(r => r.group), [index === 0 ? "A" : "B"]);
    }
    assert.equal(source.graphicSpec.objects.labels.items.length, 2);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});

test("a panel with no matching annotation keeps its points and has no text items", () => {
  const p = base(rows.map(r => r.group === "B" ? { ...r, label: undefined } : r))
    .facet({ field: "group", columns: 2 });
  const second = Object.values(p.children)[1];
  assert.equal(second.graphicSpec.objects.points.items.length, 2);
  assert.equal(second.graphicSpec.objects.labels?.items.length ?? 0, 0);
});

test("text-only Cartesian panels are supported while incomplete text is rejected", () => {
  const p = chart().createCanvas().createData({ values: rows.filter(r => r.label) })
    .createTextMark({ id: "labels" }).encodeChannels({ target: "labels", channels: {
      x: { field: "x" }, y: { field: "y" }, text: { field: "label" }
    } }).facet({ field: "group" });
  assert.deepEqual(Object.values(p.children).map(c => c.graphicSpec.objects.labels.items[0].properties.text), ["area=10", "area=20"]);
  assert.throws(() => chart().createCanvas().createData({ values: rows }).createTextMark()
    .encodeX({ field: "x" }).encodeY({ field: "y" }).facet({ field: "group" }), /requires a text encoding/);
});

test("facet source and scale edits refresh text without changing the previous program", () => {
  const source = base();
  const p = source.facet({ field: "group", columns: 2 });
  const snapshot = serializeProgram(p);
  const edited = p.editFacetScales({ x: "independent", y: "independent" });
  assert.deepEqual(edited.graphicSpec, source.facet({ field: "group", columns: 2,
    scales: { x: "independent", y: "independent" } }).graphicSpec);
  const replacement = base(rows.map(r => r.label ? { ...r, x: r.x + 1 } : r));
  const updated = p.editFacetSource({ program: replacement });
  assert.deepEqual(updated.graphicSpec, replacement.facet({ field: "group", columns: 2 }).graphicSpec);
  assert.equal(serializeProgram(p), snapshot);
});
