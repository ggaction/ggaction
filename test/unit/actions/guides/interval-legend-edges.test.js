import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

function base(create = chart) {
  return create().createCanvas({ width: 1000, height: 800, margin: { left: 250, right: 250, top: 250, bottom: 250 } })
    .createData({ values: [{ x: 1, y: 1, m: 0 }, { x: 2, y: 2, m: 10 }] }).createPointMark()
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "m", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } });
}
const edges = ["left", "right", "top", "bottom"];

test("Full and Basic create interval legends at every edge", () => {
  for (const create of [chart, basicChart]) for (const position of edges) {
    const p = base(create).createLegend({ position, layout: "edge" });
    assert.equal(p.guideConfigs.legend.interval.position, position);
    assert.equal(p.graphicSpec.objects.colorLegendSymbols.items.length, 2);
    assert.equal(p.guideConfigs.legend.interval.direction, ["left", "right"].includes(position) ? "vertical" : "horizontal");
  }
});

test("interval edge edits and content revisions converge with direct creation and Canvas replay", () => {
  for (const from of edges) for (const position of edges) {
    const original = base().createLegend({ position: from, border: true });
    const actual = original.editLegend({ position });
    assert.deepEqual(actual.graphicSpec, base().createLegend({ position, border: true }).graphicSpec);
    assert.deepEqual(actual.editCanvas({ width: 1100 }).graphicSpec,
      original.editCanvas({ width: 1100 }).editLegend({ position }).graphicSpec);
    assert.deepEqual(actual.editLegend({ channels: ["color"], position }).graphicSpec, actual.graphicSpec);
    assert.deepEqual(actual.removeLegend().createLegend({ position, border: true }).graphicSpec, actual.graphicSpec);
  }
});

test("interval grids support columns, direction, alignment and inline titles", () => {
  const source = base().createLegend({ position: "top", columns: 1, titlePosition: "left" });
  const symbols = source.graphicSpec.objects.colorLegendSymbols.items;
  assert.equal(symbols[0].properties.x, symbols[1].properties.x);
  assert.ok(symbols[0].properties.y < symbols[1].properties.y);
  const hidden = source.editLegend({ title: false });
  assert.equal(hidden.graphicSpec.objects.colorLegendTitle, undefined);
  assert.ok(hidden.graphicSpec.objects.colorLegendSymbols.items[0].properties.x < symbols[0].properties.x);
  const right = source.editLegend({ position: "right", titlePosition: "top" });
  assert.equal(right.guideConfigs.legend.interval.columns, 1);
  for (const align of ["left", "center", "right"]) for (const direction of ["horizontal", "vertical"]) {
    const p = base().createLegend({ position: "bottom", align, direction, columns: 2 });
    assert.equal(p.guideConfigs.legend.interval.align, align);
  }
});

test("rejects incompatible interval layouts and invalid styles atomically", () => {
  const p = base().createLegend();
  const before = JSON.stringify(p);
  for (const patch of [{ position: "bad" }, { layout: "legacy-bottom" }, { layout: null }, { align: "bad" },
    { direction: "bad" }, { direction: "horizontal" }, { columns: 2 }, { position: "top", columns: 0 },
    { titlePosition: "left" }, { symbol: { stroke: 123 } }, { offset: -1 }]) {
    assert.throws(() => p.editLegend(patch), JSON.stringify(patch));
    assert.equal(JSON.stringify(p), before);
  }
  assert.throws(() => base().createLegend({ title: 123 }));
});

test("interval and opacity blocks share each edge lane with preserved borders", () => {
  for (const position of edges) {
    const source = base().encodeOpacity({ field: "m" }).createLegend({ channels: ["color"], position, border: true })
      .createLegend({ channels: ["opacity"], position, count: 2, border: true });
    assert.equal(source.guideConfigs.legend.interval.position, position);
    const border = source.graphicSpec.objects.colorLegendBackground.properties;
    assert.ok(border.width > 0 && border.height > 0);
    const resized = source.editCanvas({ width: 1200, height: 1000 });
    assert.deepEqual(resized.graphicSpec, resized.editCanvas({ width: 1200, height: 1000 }).graphicSpec);
    assert.deepEqual(source.editLegend({ channels: ["color"] }).graphicSpec,
      base().encodeOpacity({ field: "m" }).createLegend({ channels: ["color"], position, border: true }).graphicSpec);
  }
});
