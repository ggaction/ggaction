import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, g: "A", m: 4 }),
  Object.freeze({ x: 2, y: 3, g: "B", m: 9 }),
  Object.freeze({ x: 3, y: 4, g: "A", m: 16 }),
  Object.freeze({ x: 4, y: 5, g: "B", m: 25 })
]);

function base(create = chart) {
  return create().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
    .createData({ values: rows }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeShape({ field: "g" }).encodeSize({ field: "m" });
}

function represented(program) {
  return Object.entries(program.guideConfigs.legend ?? {}).flatMap(([kind, config]) =>
    config.channels ?? [kind]).sort();
}

test("Full and Basic create exactly the selected categorical and size content", () => {
  const selections = [["color"], ["shape"], ["size"], ["color", "shape"],
    ["color", "size"], ["shape", "size"], ["color", "shape", "size"]];
  for (const create of [chart, basicChart]) {
    const before = base(create);
    for (const channels of selections) {
      const options = Object.freeze({ target: "points", channels: Object.freeze(channels),
        ...(channels.includes("size") ? { count: 3 } : {}) });
      const actual = before.createLegend(options);
      assert.deepEqual(represented(actual), [...channels].sort());
      assert.deepEqual(actual.semanticSpec.layers, before.semanticSpec.layers);
      assert.deepEqual(actual.resolvedScales, before.resolvedScales);
      if (channels.includes("size")) assert.equal(actual.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
      if (channels.includes("color") && !channels.includes("shape")) {
        assert.deepEqual(actual.guideConfigs.legend.color.symbol.layers.map(layer => layer.type), ["swatch"]);
      }
      assert.equal(before.semanticSpec.guides.legend, undefined);
    }
  }
});

test("unselected shape and size encodings do not change an explicit color legend", () => {
  const before = base();
  const actual = before.createLegend({ channels: ["color"] });
  const independent = before.removeEncoding({ channel: "shape" }).removeEncoding({ channel: "size" })
    .createLegend({ channels: ["color"] });
  for (const id of ["colorLegendTitle", "colorLegendLabels", "colorLegendSymbols"]) {
    assert.deepEqual(actual.graphicSpec.objects[id], independent.graphicSpec.objects[id]);
  }
  const colorSize = before.removeEncoding({ channel: "shape" })
    .createLegend({ channels: ["color", "size"], count: 3 });
  assert.deepEqual(represented(colorSize), ["color", "size"]);
  assert.equal(colorSize.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
});

test("explicit point content supports top layout when size is not selected", () => {
  const before = base().editCanvas({ margin: { top: 150, right: 300, bottom: 60, left: 60 } });
  const actual = before.createLegend({ channels: ["color", "shape"], position: "top" });
  assert.equal(actual.guideConfigs.legend.series.position, "top");
  assert.equal(actual.guideConfigs.legend.size, undefined);
  assert.throws(() => before.createLegend({ channels: ["color", "shape", "size"], position: "top" }), /side position/);
});

test("omitted content retains inferred combined point and size creation", () => {
  const before = base();
  const implicit = before.createLegend();
  const explicit = before.createLegend({ channels: ["color", "shape", "size"] });
  assert.deepEqual(implicit.semanticSpec, explicit.semanticSpec);
  assert.deepEqual(implicit.graphicSpec, explicit.graphicSpec);
  assert.equal(implicit.guideConfigs.legend.series.inferredSymbol, true);
});

test("automatic symbol reset and encoding removal preserve recipe provenance", () => {
  const points = base();
  const matching = points.createLineMark({ id: "lines" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g", scale: { id: "color" } });
  const original = matching.createLegend({ target: "points", channels: ["color", "shape"] });
  assert.deepEqual(original.graphicSpec, matching.createLegend({ target: "points", channels: ["color", "shape"], symbol: "auto" }).graphicSpec);
  assert.equal(original.guideConfigs.legend.series.inferredSymbol, true);
  assert.deepEqual(original.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["line", "point"]);
  const recipe = Object.freeze({ layers: Object.freeze([Object.freeze({ type: "point", size: 7 })]) });
  const custom = original.editLegend({ symbol: recipe });
  assert.equal(custom.guideConfigs.legend.series.inferredSymbol, false);
  const reset = custom.editLegend({ symbol: "auto" });
  assert.equal(reset.guideConfigs.legend.series.inferredSymbol, true);
  assert.deepEqual(reset.graphicSpec, original.graphicSpec);
  const automaticRemoved = reset.removeEncoding({ target: "points", channel: "color" });
  assert.deepEqual(automaticRemoved.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["point"]);
  const customRemoved = custom.removeEncoding({ target: "points", channel: "color" });
  assert.equal(customRemoved.guideConfigs.legend.series.inferredSymbol, false);
  assert.equal(customRemoved.guideConfigs.legend.series.symbol.layers[0].size, 7);
  assert.equal(recipe.layers[0].size, 7);
  const reversed = original.editLegend({ symbol: { layers: [...original.guideConfigs.legend.series.symbol.layers].reverse() }, border: true });
  assert.deepEqual(reversed.graphicSpec.objects.canvas.children.filter(id => id.startsWith("seriesLegend")),
    ["seriesLegendBackground", "seriesLegendSymbolPoints", "seriesLegendSymbolLines", "seriesLegendLabels", "seriesLegendTitle"]);
  const fresh = matching.createLegend({ target: "points", channels: ["color", "shape"],
    symbol: { layers: [...original.guideConfigs.legend.series.symbol.layers].reverse() }, border: true });
  assert.deepEqual(reversed.graphicSpec, fresh.graphicSpec);
});

test("invalid channel sets and unselected sample count fail atomically", () => {
  const before = base();
  const snapshot = JSON.stringify(before);
  for (const channels of [[], ["color", "color"], ["size", "size"], ["unknown"], "color", null]) {
    assert.throws(() => before.createLegend({ channels }), /channel/i);
  }
  assert.throws(() => before.createLegend({ channels: ["shape"], count: 3 }), /size/);
  for (const count of [0, 1, 2.5, 10001]) {
    assert.throws(() => before.createLegend({ channels: ["color", "shape", "size"], count }), /count|limit/i);
  }
  assert.equal(JSON.stringify(before), snapshot);
});

test("complete scatter facades retain exact content in Full and Basic", () => {
  for (const create of [chart, basicChart]) {
    const actual = create().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
      .createData({ values: rows }).createScatterPlot({ id: "points", x: "x", y: "y",
        color: "g", shape: "g", size: "m", guides: { axes: false, grid: false,
          legend: { channels: ["color", "size"], count: 3 } } });
    assert.deepEqual(represented(actual), ["color", "size"]);
    assert.deepEqual(actual.graphicSpec, base(create).createLegend({ channels: ["color", "size"], count: 3 }).graphicSpec);
  }
});

test("combined size selection rejects ambiguous point owners", () => {
  const before = base().createPointMark({ id: "other" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeSize({ field: "m" });
  assert.throws(() => before.createLegend({ channels: ["color", "size"] }), /explicit target/);
  assert.throws(() => before.createLegend(), /explicit target/);
  const actual = before.createLegend({ target: "other", channels: ["color", "size"] });
  assert.equal(actual.guideConfigs.legend.color.target, "other");
  assert.equal(actual.guideConfigs.legend.size.target, "other");
});


test("point channel omission matches explicit content across Full and Basic authoring", () => {
  const selections = [["color"], ["shape"], ["size"], ["color", "shape"],
    ["color", "size"], ["shape", "size"], ["color", "shape", "size"]];
  for (const create of [chart, basicChart]) {
    for (const channels of selections) {
      let before = create().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
        .createData({ values: rows }).createPointMark({ id: "points" })
        .encodeX({ field: "x" }).encodeY({ field: "y" });
      if (channels.includes("color")) before = before.encodeColor({ field: "g" });
      if (channels.includes("shape")) before = before.encodeShape({ field: "g" });
      if (channels.includes("size")) before = before.encodeSize({ field: "m" });
      const explicit = before.createLegend({ channels });
      for (const actual of [before.createLegend(), before.createLegend({ target: "points" }),
        before.createGuides({ axes: false, grid: false, legend: {} })]) {
        assert.deepEqual(represented(actual), [...channels].sort());
        assert.deepEqual(actual.semanticSpec, explicit.semanticSpec);
        assert.deepEqual(actual.graphicSpec, explicit.graphicSpec);
        assert.deepEqual(actual.guideConfigs, explicit.guideConfigs);
      }
      const facade = create().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
        .createData({ values: rows }).createScatterPlot({ id: "points", x: "x", y: "y",
          ...(channels.includes("color") ? { color: "g" } : {}),
          ...(channels.includes("shape") ? { shape: "g" } : {}),
          ...(channels.includes("size") ? { size: "m" } : {}),
          guides: { axes: false, grid: false, legend: {} } });
      assert.deepEqual(facade.graphicSpec, explicit.graphicSpec);
      assert.deepEqual(represented(facade), [...channels].sort());
      assert.equal(before.semanticSpec.guides.legend, undefined);
    }
  }
});
