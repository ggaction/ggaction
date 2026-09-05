import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

function points() {
  return chart().createCanvas({ width: 1000, height: 900, margin: { left: 300, right: 300, top: 140, bottom: 150 } })
    .createData({ values: [{ x: 1, y: 2, g: "A", m: 4 }, { x: 2, y: 3, g: "B", m: 16 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeShape({ field: "g" }).encodeSize({ field: "m" });
}

function represented(program) {
  return Object.entries(program.guideConfigs.legend ?? {}).flatMap(([kind, config]) => config.channels ?? [kind]).sort();
}

function categorical(program) {
  return program.guideConfigs.legend?.series ?? program.guideConfigs.legend?.color;
}

test("partial legend channel removal preserves mark meaning and remaining blocks", () => {
  const source = points().createLegend({ count: 3 });
  for (const channels of [["shape"], ["color"], ["color", "size"], ["shape", "size"]]) {
    const options = Object.freeze({ channels: Object.freeze(channels) });
    const actual = source.removeLegend(options);
    assert.deepEqual(represented(actual), ["color", "shape", "size"].filter(channel => !channels.includes(channel)));
    assert.deepEqual(actual.semanticSpec.layers, source.semanticSpec.layers);
    assert.deepEqual(actual.semanticSpec.scales, source.semanticSpec.scales);
    assert.deepEqual(actual.resolvedScales, source.resolvedScales);
    assert.deepEqual(actual.graphicSpec.objects.points, source.graphicSpec.objects.points);
    assert.deepEqual(categorical(actual).channels, channels.includes("color") ? ["shape"] : ["color"]);
    assert.deepEqual(categorical(actual).symbol.layers.map(layer => layer.type), channels.includes("color") ? ["point"] : ["swatch"]);
    if (!channels.includes("size")) assert.deepEqual(actual.guideConfigs.legend.size, source.guideConfigs.legend.size);
  }
  assert.deepEqual(represented(source), ["color", "shape", "size"]);
});

test("content revisions retain hidden/custom titles, order, layout, styles and recipe provenance", () => {
  for (const position of ["right", "left", "top", "bottom"]) {
    const base = points();
    const source = base.createLegend({ channels: ["color", "shape"], position,
      labels: { color: "#7c3aed", fontWeight: 700 }, title: "Groups", order: { values: ["B", "A"] },
      border: { padding: 3 }, ...(position === "bottom" ? { layout: "legacy-bottom" } : {}) })
      .editLegend({ title: false });
    const removed = source.removeLegend({ channels: ["shape"] });
    const config = removed.guideConfigs.legend.color;
    assert.equal(config.titleVisible, false);
    assert.equal(config.title, "Groups");
    assert.equal(config.inferredTitle, false);
    assert.equal(config.inferredSymbol, true);
    assert.equal(config.position, position);
    assert.equal(config.layout, categorical(source).layout);
    assert.deepEqual(config.labels, categorical(source).labels);
    assert.deepEqual(config.border, categorical(source).border);
    assert.deepEqual(config.domain, ["B", "A"]);
    assert.deepEqual(removed.semanticSpec.guides.legend.color.order, { values: ["B", "A"] });
    assert.equal(removed.graphicSpec.objects.colorLegendTitle, undefined);
    const replay = removed.editCanvas({ width: 1100 }).editScale({ id: "color", range: ["red", "blue"] });
    assert.equal(replay.graphicSpec.objects.colorLegendTitle, undefined);
    assert.deepEqual(replay.graphicSpec.objects.colorLegendSymbols.items.map(item => item.properties.fill), ["blue", "red"]);
    assert.equal(replay.editLegend({ title: "auto" }).graphicSpec.objects.colorLegendTitle.properties.text, "g");
  }
  const recipe = { layers: [{ type: "point", size: 7 }, { type: "line", length: 24 }] };
  const custom = points().createLegend({ channels: ["color", "shape"], symbol: recipe });
  const revised = custom.removeLegend({ channels: ["shape"] });
  assert.deepEqual(categorical(revised).symbol, categorical(custom).symbol);
  assert.equal(categorical(revised).inferredSymbol, false);
});

test("encoding removal uses the same content revision without restoring a hidden title", () => {
  const source = points().createLegend().editLegend({ title: false });
  for (const channel of ["color", "shape"]) {
    const actual = source.removeEncoding({ channel });
    const expected = source.removeLegend({ channels: [channel] });
    assert.deepEqual(categorical(actual), categorical(expected));
    assert.equal(categorical(actual).titleVisible, false);
    const prefix = channel === "color" ? "seriesLegend" : "colorLegend";
    assert.equal(actual.graphicSpec.objects[`${prefix}Title`], undefined);
    assert.equal(actual.editCanvas({ width: 1100 }).graphicSpec.objects[`${prefix}Title`], undefined);
    assert.equal(actual.semanticSpec.layers[0].encoding[channel], undefined);
    assert.ok(source.semanticSpec.layers[0].encoding[channel]);
  }
});

test("line color and dash can be removed independently without changing encoded lines", () => {
  const base = chart().createCanvas({ width: 800, height: 500, margin: { right: 250 } })
    .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 4, g: "A" }, { x: 1, y: 3, g: "B" }, { x: 2, y: 5, g: "B" }] })
    .createLineMark({ id: "lines" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeStrokeDash({ field: "g" });
  const source = base.createLegend();
  for (const channel of ["color", "strokeDash"]) {
    const actual = source.removeLegend({ channels: [channel] });
    const remaining = ["color", "strokeDash"].filter(value => value !== channel);
    assert.deepEqual(actual.graphicSpec, base.createLegend({ channels: remaining }).graphicSpec);
    assert.deepEqual(actual.semanticSpec.layers, source.semanticSpec.layers);
  }
});

test("missing mixed requests fail without removing matching content or changing its trace", () => {
  const source = points().createLegend();
  const before = JSON.stringify(source);
  assert.throws(() => source.removeLegend({ channels: ["shape", "opacity"] }), /no .*block/);
  assert.equal(JSON.stringify(source), before);
  const removed = source.removeLegend({ channels: ["color"] }).removeLegend({ channels: ["shape"] });
  assert.deepEqual(represented(removed), ["size"]);
  assert.equal(removed.guideConfigs.legend.series, undefined);
  assert.equal(removed.guideConfigs.legend.color, undefined);
});
