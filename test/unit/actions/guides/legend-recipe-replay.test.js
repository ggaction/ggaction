import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

const values = [
  { x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "A" },
  { x: 1, y: 3, g: "B" }, { x: 2, y: 4, g: "B" }
];
function points(create = chart) {
  return create().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
    .createData({ id: "data", values }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeShape({ field: "g" });
}
function addLine(program) {
  return program.createLineMark({ id: "lines" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeGroup({ field: "g" }).encodeColor({ field: "g" });
}
const types = program => program.guideConfigs.legend.series.symbol.layers.map(layer => layer.type);

test("automatic recipes converge across Full and Basic companion authoring order", () => {
  for (const create of [chart, basicChart]) {
    const base = points(create);
    const original = base.createLegend({ target: "points", border: true });
    const snapshot = JSON.stringify(original);
    const early = addLine(original);
    const late = addLine(base).createLegend({ target: "points", border: true });
    assert.deepEqual(types(early), ["line", "point"]);
    assert.deepEqual(early.graphicSpec, late.graphicSpec);
    assert.deepEqual(early.guideConfigs, late.guideConfigs);
    assert.equal(JSON.stringify(original), snapshot);
  }
});

test("automatic recipes remove stale companion lines after mark and encoding changes", () => {
  const base = points();
  const source = addLine(base).createLegend({ target: "points", border: true })
    .editLegend({ title: false, labels: { color: "purple" }, order: { values: ["B", "A"] } });
  const before = JSON.stringify(source);
  const removed = source.removeMark({ target: "lines" });
  assert.deepEqual(types(removed), ["point"]);
  assert.equal(removed.graphicSpec.objects.seriesLegendSymbolLines, undefined);
  assert.equal(removed.graphicSpec.objects.seriesLegendTitle, undefined);
  assert.equal(removed.guideConfigs.legend.series.labels.color, "purple");
  assert.deepEqual(removed.guideConfigs.legend.series.domain, ["B", "A"]);
  const unbound = source.removeEncoding({ target: "lines", channel: "color" });
  assert.deepEqual(types(unbound), ["point"]);
  const rebound = unbound.encodeColor({ target: "lines", field: "g" });
  assert.deepEqual(rebound.graphicSpec, source.graphicSpec);
  const separate = source.encodeColor({ target: "lines", field: "g", scale: { id: "otherColor" } });
  assert.deepEqual(types(separate), ["point"]);
  assert.equal(JSON.stringify(source), before);
});

test("explicit recipes remain stable through companion and scale replay", () => {
  const recipe = { layers: [{ type: "point", size: 7 }, { type: "line", length: 24, lineWidth: 4 }] };
  const source = addLine(points()).createLegend({ target: "points", symbol: recipe, border: true })
    .editLegend({ title: false, labels: { color: "purple" } });
  const removed = source.removeMark({ target: "lines" }).editCanvas({ width: 900 })
    .editScale({ id: "color", range: ["red", "blue"] });
  assert.deepEqual(removed.guideConfigs.legend.series.symbol, source.guideConfigs.legend.series.symbol);
  assert.equal(removed.guideConfigs.legend.series.inferredSymbol, false);
  assert.equal(removed.graphicSpec.objects.seriesLegendTitle, undefined);
  assert.deepEqual(removed.graphicSpec.objects.canvas.children.filter(id => id.startsWith("seriesLegend")),
    ["seriesLegendBackground", "seriesLegendSymbolPoints", "seriesLegendSymbolLines", "seriesLegendLabels"]);
  const reset = removed.editLegend({ symbol: "auto" });
  assert.deepEqual(types(reset), ["point"]);
  assert.equal(reset.graphicSpec.objects.seriesLegendSymbolLines, undefined);
});

test("automatic recipe replay preserves palette, styling and order across scale, filter and Canvas changes", () => {
  const source = addLine(points().createLegend({ target: "points", border: true }))
    .editLegend({ title: false, labels: { color: "purple" }, order: { values: ["B", "A"] } });
  const changed = source.editScale({ id: "color", range: ["red", "blue"] })
    .editLineMark({ target: "lines", strokeWidth: 5 })
    .filterMarks({ target: "lines", field: "g", op: "eq", value: "B" });
  assert.deepEqual(types(changed), ["line", "point"]);
  assert.deepEqual(changed.guideConfigs.legend.series.domain, ["B", "A"]);
  assert.deepEqual(changed.graphicSpec.objects.seriesLegendSymbolLines.items.map(item => item.properties.stroke), ["blue", "red"]);
  assert.equal(changed.graphicSpec.objects.seriesLegendTitle, undefined);
  assert.equal(changed.graphicSpec.objects.seriesLegendLabels.items[0].properties.fill, "purple");
  assert.deepEqual(changed.removeMark({ target: "lines" }).editCanvas({ width: 900 }).graphicSpec,
    changed.editCanvas({ width: 900 }).removeMark({ target: "lines" }).graphicSpec);
});
