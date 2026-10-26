import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = [
  { category: "A", value: 1 }, { category: "A", value: 2 }, { category: "A", value: 9 },
  { category: "B", value: 10 }, { category: "B", value: 20 }, { category: "B", value: 30 }
];
const owner = p => Object.values(p.markConfigs).find(config => config.raincloudPlot)?.raincloudPlot;
const dataset = (p, id) => p.semanticSpec.datasets.find(data => data.id === id);
function base(options = {}) {
  return chart().createCanvas({ plot: { width: 300, height: 300 }, margin: 100 })
    .createData({ id: "data", values: rows })
    .createRaincloudPlot({ id: "plot", category: "category", value: "value", color: "category", guides: false, ...options });
}

for (const options of [{}, { density: false }, { summary: false }, { points: false },
  { summary: { type: "interval", extent: "stdev" }, points: { type: "strip" } }]) {
  test(`fixed and categorical parent colors update enabled components ${JSON.stringify(options)}`, () => {
    const before = base(options), snapshot = JSON.stringify(before);
    const p = before.encodeColor({ target: "plot", value: "#101010" });
    assert.deepEqual(owner(p).color, { value: "#101010" });
    for (const id of owner(p).ownedChildIds) {
      const layer = p.semanticSpec.layers.find(layer => layer.id === id);
      assert.equal(layer.encoding.color, undefined);
      assert.ok(p.graphicSpec.objects[id].items.every(item => item.properties.fill === "#101010"));
    }
    const replayed = p.editCanvas({ plot: { width: 330, height: 330 } }).createGuides({ axes: false, grid: false });
    for (const id of owner(replayed).ownedChildIds) {
      assert.ok(replayed.graphicSpec.objects[id].items.every(item => item.properties.fill === "#101010"));
    }
    assert.equal(JSON.stringify(before), snapshot);
    const mapped = p.encodeColor({ target: "plot", field: "category", scale: { range: ["red", "blue"] } });
    for (const id of owner(mapped).ownedChildIds) {
      assert.equal(mapped.semanticSpec.layers.find(layer => layer.id === id).encoding.color.field, "category");
    }
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  });
}

test("parent observation filtering recomputes density, box statistics and raw points together", () => {
  const before = base(), snapshot = JSON.stringify(before);
  const p = before.filterMarks({ target: "plot", field: "value", op: "lte", value: 10 });
  assert.deepEqual(dataset(p, owner(p).source).values, rows.slice(0, 4));
  assert.equal(p.graphicSpec.objects.plotPoints.items.length, 4);
  assert.equal(p.graphicSpec.objects.plotCloud.items.length, 2);
  assert.notDeepEqual(p.graphicSpec.objects.plotSummary, before.graphicSpec.objects.plotSummary);
  assert.equal(p.trace.children.at(-1).op, "filterMarks");
  assert.equal(JSON.stringify(before), snapshot);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  const styled = p.encodeColor({ target: "plot", value: "red" }).editRaincloudPlot({ target: "plot", side: "after" });
  assert.deepEqual(owner(styled).sourceFilter, owner(p).sourceFilter);
  const restored = styled.removeMarkFilter({ target: "plot" });
  assert.equal(owner(restored).source, "data");
  assert.equal(restored.graphicSpec.objects.plotPoints.items.length, 6);
  assert.equal(owner(restored).sourceFilter, undefined);
  assert.deepEqual(owner(restored).color, { value: "red" });
});

test("parent filter composition, replacement and ranked grouped selection preserve the raw population", () => {
  const p = base().filterMarks({ target: "plot", field: "category", op: "eq", value: "A" });
  assert.throws(() => p.filterMarks({ target: "plot", field: "value", op: "gte", value: 2 }), /replace.*compose/);
  const composed = p.filterMarks({ target: "plot", field: "value", op: "gte", value: 2, mode: "compose" });
  assert.deepEqual(dataset(composed, owner(composed).source).values, rows.slice(1, 3));
  const replaced = composed.filterMarks({ target: "plot", field: "category", op: "eq", value: "B", mode: "replace" });
  assert.deepEqual(dataset(replaced, owner(replaced).source).values, rows.slice(3));
  const ranked = base().filterMarks({ target: "plot", field: "value", op: "max", count: 2, groupBy: "category" });
  assert.deepEqual(dataset(ranked, owner(ranked).source).values, [rows[1], rows[2], rows[4], rows[5]]);
  assert.throws(() => base().filterMarks({ target: "plot", channel: "y", op: "gte", value: 2 }), /observation field/);
});

test("named raw-point child filtering stays display-only", () => {
  const before = base();
  const p = before.filterMarks({ target: "plotPoints", field: "category", op: "eq", value: "A" });
  assert.equal(p.graphicSpec.objects.plotPoints.items.length, 3);
  assert.deepEqual(p.graphicSpec.objects.plotCloud, before.graphicSpec.objects.plotCloud);
  assert.deepEqual(p.graphicSpec.objects.plotSummary, before.graphicSpec.objects.plotSummary);
  assert.equal(owner(p).source, "data");
});

test("parent filter recipes replay independently inside facet children", () => {
  const p = base().filterMarks({ target: "plot", field: "value", op: "gte", value: 2 })
    .facet({ field: "category", data: "data", columns: 2 });
  assert.deepEqual(Object.values(p.children).map(child => child.graphicSpec.objects.plotPoints.items.length), [2, 3]);
  for (const child of Object.values(p.children)) {
    const configured = owner(child);
    assert.equal(configured.sourceFilter.selectors[0].value, 2);
    assert.ok(dataset(child, configured.source).values.every(row => row.value >= 2));
  }
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});


test("changing the category role carries its inherited color mapping to the new field", () => {
  const p = chart().createCanvas({ plot: { width: 300, height: 300 }, margin: 100 })
    .createData({ id: "data", values: rows.map((row, i) => ({ ...row, cohort: i % 2 ? "F" : "M" })) })
    .createRaincloudPlot({ id: "plot", category: "category", value: "value", color: "category", guides: false });
  const q = p.editRaincloudPlot({ target: "plot", category: "cohort" });
  assert.equal(owner(q).category.field, "cohort");
  assert.equal(owner(q).color.field, "cohort");
  for (const id of owner(q).ownedChildIds) {
    assert.equal(q.semanticSpec.layers.find(layer => layer.id === id).encoding.color.field, "cohort");
  }
  assert.deepEqual(q.resolvedScales[owner(q).color.scale.id].domain, ["M", "F"]);
  const fixed = p.encodeColor({ target: "plot", value: "red" }).editRaincloudPlot({ target: "plot", category: "cohort" });
  assert.deepEqual(owner(fixed).color, { value: "red" });
  assert.throws(() => p.editRaincloudPlot({ target: "plot", category: "cohort", color: "category" }), /category field/);
});

function referencesBase() {
  return chart().createCanvas({ plot: { width: 300, height: 300 }, margin: 100 })
    .createData({ id: "data", values: [
      { category: "A", value: 1, revised: 10 }, { category: "A", value: 3, revised: 30 },
      { category: "B", value: 5, revised: 50 }, { category: "B", value: 7, revised: 70 }
    ] })
    .createRaincloudPlot({ id: "plot", category: "category", value: "value", color: "category", guides: false })
    .createStatisticalReference({ id: "mean", source: "plotCloud", axis: "y",
      groupBy: "category", statistic: { op: "mean" }, strokeWidth: 5, strokeDash: "dashed" })
    .createMarkLabels({ id: "meanLabels", source: "mean", field: "value" })
    .createStatisticalReference({ id: "band", source: "plotPoints", axis: "y",
      statistics: [{ op: "quantile", p: .25 }, { op: "quantile", p: .75 }], opacity: .2 });
}
const referenceRows = (p, id) => dataset(p, p.markConfigs[id].statisticalReference.dataId).values;

test("Raincloud role edits retain dependent references, labels, styles and overlay order", () => {
  const before = referencesBase(), snapshot = serializeProgram(before);
  const p = before.editRaincloudPlot({ target: "plot", value: "revised" });
  assert.deepEqual(referenceRows(p, "mean"), [{ group: "A", value: 20 }, { group: "B", value: 60 }]);
  assert.deepEqual(referenceRows(p, "band"), [{ lower: 25, upper: 55 }]);
  assert.equal(p.markConfigs.mean.strokeWidth, 5);
  assert.deepEqual(p.markConfigs.mean.strokeDash, before.markConfigs.mean.strokeDash);
  assert.equal(p.markConfigs.band.opacity, .2);
  assert.equal(p.graphicSpec.objects.mean.items.length, 2);
  assert.equal(p.graphicSpec.objects.meanLabels.items.length, 2);
  assert.deepEqual(p.graphicSpec.objects.meanLabels.items.map(item => item.properties.text), ["20", "60"]);
  const order = p.graphicSpec.objects["plot-main"].children;
  for (const source of owner(p).ownedChildIds) assert.ok(order.indexOf("mean") > order.indexOf(source));
  assert.ok(order.indexOf("meanLabels") > order.indexOf("mean"));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.equal(serializeProgram(before), snapshot);
});

test("Raincloud parent filters recalculate retained references and removing the filter restores them", () => {
  const before = referencesBase();
  const p = before.filterMarks({ target: "plot", field: "category", op: "eq", value: "A" });
  assert.deepEqual(referenceRows(p, "mean"), [{ group: "A", value: 2 }]);
  assert.deepEqual(referenceRows(p, "band"), [{ lower: 1.5, upper: 2.5 }]);
  const restored = p.removeMarkFilter({ target: "plot" });
  assert.deepEqual(referenceRows(restored, "mean"), referenceRows(before, "mean"));
  assert.deepEqual(referenceRows(restored, "band"), referenceRows(before, "band"));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("Raincloud reference roles follow orientation and survive disabling their original component", () => {
  const p = referencesBase().editRaincloudPlot({ target: "plot", orientation: "horizontal" })
    .editRaincloudPlot({ target: "plot", density: false, points: false, value: "revised" });
  for (const id of ["mean", "band"]) {
    assert.equal(p.markConfigs[id].statisticalReference.axis, "x");
    assert.equal(p.markConfigs[id].statisticalReference.source, "plotSummary");
  }
  assert.deepEqual(referenceRows(p, "mean"), [{ group: "A", value: 20 }, { group: "B", value: 60 }]);
  assert.deepEqual(referenceRows(p, "band"), [{ lower: 25, upper: 55 }]);
  assert.equal(p.semanticSpec.layers.find(layer => layer.id === "mean").encoding.y, undefined);
  assert.equal(p.graphicSpec.objects.mean.items.length, 2);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

for (const options of [{}, { density: false }, { summary: false }, { points: false },
  { summary: { type: "interval", extent: "stdev" }, points: { type: "strip" } }]) {
  test(`categorical palettes survive Raincloud owner rebuilds ${JSON.stringify(options)}`, () => {
    const before = base({ ...options, guides: { axes: false, grid: false, legend: {} } });
    const snapshot = serializeProgram(before);
    let previous = before;
    for (const palette of ["tableau10", "set1", "dark2"]) {
      const p = previous.encodeColor({ target: "plot", field: "category", scale: { palette } });
      const colorId = owner(p).color.scale.id;
      assert.equal(colorId, "plotColor");
      assert.deepEqual(p.semanticSpec.scales.find(scale => scale.id === colorId).range, { palette });
      const expected = p.resolvedScales[colorId].range;
      for (const id of owner(p).ownedChildIds) {
        assert.equal(p.semanticSpec.layers.find(layer => layer.id === id).encoding.color.scale, colorId);
        assert.deepEqual([...new Set(p.graphicSpec.objects[id].items.map(item => item.properties.fill))], expected.slice(0, 2));
      }
      assert.equal(Object.keys(p.guideConfigs.legend).length, 1);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
      previous = p;
    }
    const fixed = base(options).encodeColor({ target: "plot", value: "red" });
    const mapped = fixed.encodeColor({ target: "plot", field: "category", scale: { palette: "set1" } });
    assert.deepEqual(mapped.resolvedScales.plotColor.range, previous.encodeColor({ target: "plot", field: "category", scale: { palette: "set1" } }).resolvedScales.plotColor.range);
    assert.throws(() => before.encodeColor({ target: "plot", field: "category", scale: { palette: "missing-palette" } }), /palette/i);
    assert.equal(serializeProgram(before), snapshot);
  });
}
