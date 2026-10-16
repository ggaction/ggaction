import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = Object.freeze([
  Object.freeze({ year: "2000-01-01", otherYear: "2005-01-01", value: 10 }),
  Object.freeze({ year: "2000-01-01", otherYear: "2005-01-01", value: 14 }),
  Object.freeze({ year: "2001-01-01", otherYear: "2006-01-01", value: 20 }),
  Object.freeze({ year: "2002-01-01", otherYear: "2007-01-01", value: 16 })
]);

function sharedProgram() {
  return chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createLineMark({ id: "trend" });
}

function assertAligned(program) {
  const bars = program.graphicSpec.objects.bars.items;
  const commands = program.graphicSpec.objects.trend.items[0].properties.commands;
  assert.equal(commands.length, bars.length);
  bars.forEach((bar, index) => {
    assert.ok(Math.abs(
      bar.properties.x + bar.properties.width / 2 - commands[index].x
    ) < 1e-9);
    assert.equal(bar.properties.y, commands[index].y);
  });
}

test("keeps shared temporal centers aligned through Canvas and scale edits", () => {
  const original = sharedProgram();
  const resized = original.editCanvas({ width: 500 });
  const reversed = original.editScale({ id: "x", reverse: true });

  assertAligned(original);
  assertAligned(resized);
  assertAligned(reversed);
  assert.notEqual(
    resized.graphicSpec.objects.bars.items[0].properties.x,
    original.graphicSpec.objects.bars.items[0].properties.x
  );
  assert.ok(
    reversed.graphicSpec.objects.bars.items[0].properties.x >
    reversed.graphicSpec.objects.bars.items.at(-1).properties.x
  );
  assertAligned(original);
  const explicit = original.editScale({ id: "x", range: [60, 300] });
  assert.deepEqual(explicit.resolvedScales.x.range, [60, 300]);
  assertAligned(explicit);
  assertAligned(explicit.editScale({ id: "x", reverse: true }));
});

test("keeps temporal bar geometry finite across a full explicit range", () => {
  const program = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows.slice(0, 3) })
    .createBarMark()
    .encodeX({
      field: "year",
      fieldType: "temporal",
      scale: { range: [-1e308, 1e308] }
    })
    .encodeY({ field: "value", aggregate: "mean" });
  assert.equal(
    program.graphicSpec.objects.bar.items.every(item =>
      [item.properties.x, item.properties.width].every(Number.isFinite)
    ),
    true
  );
  assert.equal(program.resolvedScales.x.bandwidth, 1e308);
});

test("preserves explicitly independent temporal and quantitative scales", () => {
  const independent = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal", scale: { id: "barX" } })
    .encodeY({ field: "value", aggregate: "mean", scale: { id: "barY" } })
    .createLineMark({ id: "trend", data: "data" })
    .encodeX({
      target: "trend",
      field: "year",
      fieldType: "temporal",
      scale: { id: "lineX" }
    })
    .encodeY({
      target: "trend",
      field: "value",
      aggregate: "mean",
      scale: { id: "lineY" }
    });

  assert.deepEqual(
    independent.semanticSpec.scales.map(scale => scale.id),
    ["barX", "barY", "lineX", "lineY"]
  );
  assert.equal(independent.graphicSpec.objects.trend.items.length, 1);
});

test("aligns rule and text annotations on a shared temporal bar scale", () => {
  const barsOnly = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
  const bandwidth = barsOnly.resolvedScales.x.bandwidth;
  const events = Object.freeze([
    Object.freeze({ year: "2001-01-01", value: 10, label: "Exact" }),
    Object.freeze({ year: "2001-07-01", value: 10, label: "Between" })
  ]);
  const annotated = barsOnly
    .createData({ id: "events", values: events })
    .createRuleMark({ id: "eventRules", data: "events" })
    .encodeX({
      target: "eventRules",
      field: "year",
      fieldType: "temporal",
      scale: { id: "x" }
    })
    .createTextMark({ id: "eventLabels", data: "events" })
    .encodeX({
      target: "eventLabels",
      field: "year",
      fieldType: "temporal",
      scale: { id: "x" }
    })
    .encodeY({
      target: "eventLabels",
      field: "value",
      fieldType: "quantitative",
      scale: { id: "y" }
    })
    .encodeText({ target: "eventLabels", field: "label" });

  const bar = annotated.graphicSpec.objects.bars.items[1].properties;
  const barCenter = bar.x + bar.width / 2;
  const rule = annotated.graphicSpec.objects.eventRules.items[0].properties;
  const text = annotated.graphicSpec.objects.eventLabels.items[0].properties;

  assert.equal(annotated.resolvedScales.x.bandwidth, bandwidth);
  assert.ok(Math.abs(rule.x1 - barCenter) < 1e-9);
  assert.ok(Math.abs(rule.x2 - barCenter) < 1e-9);
  assert.ok(Math.abs(text.x - barCenter) < 1e-9);
});

test("rejects a shared temporal scale with different field meaning", () => {
  const independentLine = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createLineMark({ id: "trend", data: "data" });

  assert.throws(
    () => independentLine.encodeX({
      target: "trend",
      field: "otherYear",
      fieldType: "temporal",
      scale: { id: "x" }
    }),
    /requires compatible bar, line, rule, or text consumers of one field/
  );
  assert.equal(
    independentLine.semanticSpec.layers.find(layer => layer.id === "trend").encoding,
    undefined
  );
});

test("owns source rows instead of exposing a mutable data refresh path", () => {
  const mutableRows = rows.map(row => ({ ...row }));
  const program = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: mutableRows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createLineMark({ id: "trend" });
  const before = program.graphicSpec;

  mutableRows[0].value = 999;
  mutableRows.push({ year: "2003-01-01", otherYear: "2008-01-01", value: 30 });

  assert.equal(program.semanticSpec.datasets[0].values[0].value, 10);
  assert.equal(program.semanticSpec.datasets[0].values.length, rows.length);
  assert.equal(program.graphicSpec, before);
  assertAligned(program);
});


const day = 24 * 60 * 60 * 1000;
const start = Date.UTC(2000, 0, 1);
const pixelRows = Object.freeze([
  Object.freeze({ time: start, value: 10 }),
  Object.freeze({ time: start + 2 * day, value: 20 })
]);

function pixelWidthProgram(horizontal = false, widthFirst = false) {
  const category = horizontal ? "y" : "x";
  const measure = horizontal ? "x" : "y";
  let p = chart()
    .createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ values: pixelRows })
    .createBarMark({ id: "bars" });
  if (widthFirst) p = p.encodeBarWidth({ pixels: 5 });
  p = p[category === "x" ? "encodeX" : "encodeY"]({
    field: "time", fieldType: "temporal", temporalUnit: "timestamp",
    scale: { domain: [start - day, start + 3 * day], nice: false }
  })[measure === "x" ? "encodeX" : "encodeY"]({
    field: "value", scale: { domain: [0, 20], nice: false }
  });
  return widthFirst ? p : p.encodeBarWidth({ pixels: 5 });
}

function categoryCenters(p, horizontal = false) {
  return p.graphicSpec.objects.bars.items.map(({ properties: item }) =>
    horizontal ? item.y + item.height / 2 : item.x + item.width / 2
  );
}

for (const horizontal of [false, true]) {
  test(`keeps explicit pixel-width temporal centers on the full ${horizontal ? "vertical" : "horizontal"} plot range`, () => {
    const p = pixelWidthProgram(horizontal);
    const first = pixelWidthProgram(horizontal, true);
    const axis = horizontal ? "y" : "x";
    const expectedRange = horizontal ? [250, 50] : [50, 350];
    const expectedCenters = horizontal ? [200, 100] : [125, 275];
    assert.deepEqual(p.resolvedScales[axis].range, expectedRange);
    assert.deepEqual(categoryCenters(p, horizontal), expectedCenters);
    assert.deepEqual(first.graphicSpec, p.graphicSpec);
    assert.equal(p.graphicSpec.objects.bars.items.every(({ properties: r }) =>
      (horizontal ? r.height : r.width) === 5), true);
    const reversed = p.editScale({ id: axis, reverse: true });
    assert.deepEqual(categoryCenters(reversed, horizontal), [...expectedCenters].reverse());
    const resized = p.editCanvas(horizontal ? { height: 400 } : { width: 500 });
    assert.deepEqual(categoryCenters(resized, horizontal), horizontal ? [275, 125] : [150, 350]);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert.deepEqual(categoryCenters(p, horizontal), expectedCenters);
  });
}

test("refreshes shared line and axis consumers when temporal width switches modes", () => {
  const band = pixelWidthProgram().encodeBarWidth({ band: 0.72 })
    .createLineMark({ id: "trend" })
    .createXAxis({ ticksAndLabels: { values: [start, start + 2 * day] }, title: false });
  const originalGraphic = band.graphicSpec;
  assertAligned(band);
  assert.deepEqual(categoryCenters(band), [150, 250]);
  const pixels = band.encodeBarWidth({ target: "bars", pixels: 5 });
  assertAligned(pixels);
  assert.deepEqual(categoryCenters(pixels), [125, 275]);
  const ticks = pixels.graphicSpec.objects.xAxisTicks.items;
  assert.deepEqual(ticks.map(item => item.properties.x1), [125, 275]);
  const restoredBand = pixels.encodeBarWidth({ target: "bars", band: 0.72 });
  assert.deepEqual(restoredBand.graphicSpec, originalGraphic);
  assert.deepEqual(band.graphicSpec, originalGraphic);
});

test("retains an explicit temporal range without applying pixel-width compensation twice", () => {
  const p = pixelWidthProgram().editScale({ id: "x", range: [60, 300] });
  assert.deepEqual(p.resolvedScales.x.range, [60, 300]);
  assert.deepEqual(categoryCenters(p), [120, 240]);
  assert.deepEqual(p.editCanvas({ width: 600 }).resolvedScales.x.range, [60, 300]);
  assert.deepEqual(p.encodeBarWidth({ band: 0.5 }).resolvedScales.x.range, [60, 300]);
});

test("refreshes temporal rule and text positions after pixel-width selection", () => {
  const band = pixelWidthProgram().encodeBarWidth({ band: 0.72 })
    .createRuleMark({ id: "events", data: "data" })
    .encodeX({ target: "events", field: "time", fieldType: "temporal", temporalUnit: "timestamp", scale: { id: "x" } })
    .createTextMark({ id: "labels", data: "data" })
    .encodeX({ target: "labels", field: "time", fieldType: "temporal", temporalUnit: "timestamp", scale: { id: "x" } })
    .encodeY({ target: "labels", field: "value", scale: { id: "y" } })
    .encodeText({ target: "labels", field: "value" });
  const p = band.encodeBarWidth({ target: "bars", pixels: 5 });
  assert.deepEqual(p.graphicSpec.objects.events.items.map(item => item.properties.x1), [125, 275]);
  assert.deepEqual(p.graphicSpec.objects.labels.items.map(item => item.properties.x), [125, 275]);
  assert.deepEqual(band.graphicSpec.objects.events.items.map(item => item.properties.x1), [150, 250]);
});

test("retains inferred slots while any shared temporal bar consumer uses band width", () => {
  const pixels = pixelWidthProgram();
  const mixed = pixels.createBarMark({ id: "second", data: "data" })
    .encodeY({ target: "second", field: "value", scale: { id: "y" } })
    .encodeX({ target: "second", field: "time", fieldType: "temporal", temporalUnit: "timestamp", scale: { id: "x" } });
  assert.deepEqual(mixed.resolvedScales.x.range, [100, 300]);
  const bothPixels = mixed.encodeBarWidth({ target: "second", pixels: 8 });
  assert.deepEqual(bothPixels.resolvedScales.x.range, [50, 350]);
  assert.deepEqual(categoryCenters(bothPixels), [125, 275]);
  assert.deepEqual(bothPixels.graphicSpec.objects.second.items.map(item =>
    item.properties.x + item.properties.width / 2), [125, 275]);
  const bandAgain = bothPixels.encodeBarWidth({ target: "second", band: 0.5 });
  assert.deepEqual(bandAgain.resolvedScales.x.range, [100, 300]);
  assert.deepEqual(categoryCenters(bandAgain), [150, 250]);
});
