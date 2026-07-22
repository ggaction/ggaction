import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 2, low: 1, high: 3, group: "A", amount: 4 }),
  Object.freeze({ x: 10, y: 8, low: 6, high: 9, group: "B", amount: 16 })
]);

function pointBase(options = {}) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points", ...options })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });
}

test("removes a primary position, its paired endpoint, and orphaned guides", () => {
  const before = chart()
    .createCanvas({ width: 240, height: 160, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createAreaMark({ id: "band" })
    .encodeX({ field: "x" })
    .encodeYRange({ lower: "low", upper: "high" })
    .createAxes()
    .createGrid({ horizontal: true, vertical: true });
  const options = { channel: "y" };
  const after = before.removeEncoding(options);
  const layer = after.semanticSpec.layers[0];

  assert.equal(layer.encoding.y, undefined);
  assert.equal(layer.encoding.y2, undefined);
  assert.notEqual(layer.encoding.x, undefined);
  assert.equal(after.semanticSpec.guides.axis?.y, undefined);
  assert.equal(after.semanticSpec.guides.grid?.horizontal, undefined);
  assert.notEqual(after.semanticSpec.guides.axis?.x, undefined);
  assert.equal(after.graphicSpec.objects.band.items.length, 0);
  assert.notEqual(after.semanticSpec.scales.find(scale => scale.id === "y"), undefined);
  assert.deepEqual(options, { channel: "y" });
  assert.notEqual(before.semanticSpec.layers[0].encoding.y2, undefined);

  const restored = after
    .encodeY({ target: "band", field: "low", scale: { id: "y" } })
    .encodeY2({ target: "band", field: "high" });
  assert.equal(restored.graphicSpec.objects.band.items.length, 1);
});

test("preserves a shared axis and grid while another primary consumer remains", () => {
  const before = pointBase()
    .createPointMark({ id: "other", data: "rows" })
    .encodeX({ target: "other", field: "x", scale: { id: "x" } })
    .encodeY({ target: "other", field: "y", scale: { id: "y" } })
    .createAxes()
    .createGrid({ horizontal: true, vertical: true });
  const after = before.removeEncoding({ target: "points", channel: "x" });

  assert.notEqual(after.semanticSpec.guides.axis?.x, undefined);
  assert.notEqual(after.semanticSpec.guides.grid?.vertical, undefined);
  assert.equal(after.graphicSpec.objects.points.items.length, 0);
  assert.equal(after.graphicSpec.objects.other.items.length, rows.length);
});

test("removes appearance encodings and only their matching legend blocks", () => {
  const withLegends = pointBase()
    .encodeColor({ target: "points", field: "group" })
    .encodeShape({ target: "points", field: "group" })
    .encodeSize({ target: "points", field: "amount" })
    .createLegend({ target: "points" });
  const withoutShape = withLegends.removeEncoding({ channel: "shape" });
  const withoutSize = withoutShape.removeEncoding({ channel: "size" });

  assert.deepEqual(withoutShape.guideConfigs.legend.color.channels, ["color"]);
  assert.notEqual(withoutShape.guideConfigs.legend.size, undefined);
  assert.equal(withoutShape.semanticSpec.layers[0].encoding.shape, undefined);
  assert.equal(withoutSize.guideConfigs.legend.size, undefined);
  assert.notEqual(withoutSize.guideConfigs.legend.color, undefined);
  assert.notEqual(withoutSize.semanticSpec.scales.find(scale => scale.id === "size"), undefined);

  const withoutColor = withoutSize.removeEncoding({ channel: "color" });
  assert.equal(withoutColor.guideConfigs.legend?.color, undefined);
  assert.equal(withoutColor.semanticSpec.layers[0].encoding.color, undefined);
});

test("removes grouped-bar color companions and restores normalized baseline policy", () => {
  const grouped = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ values: [
      { category: "A", group: "g1", value: 2 },
      { category: "A", group: "g2", value: 3 }
    ] })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value", aggregate: "sum", stack: null })
    .encodeColor({ field: "group", layout: "group" });
  const ungrouped = grouped.removeEncoding({ channel: "color" });

  assert.equal(ungrouped.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(ungrouped.semanticSpec.layers[0].encoding.xOffset, undefined);
  assert.equal(ungrouped.markConfigs.bars?.xOffset, undefined);
  assert.equal(ungrouped.graphicSpec.objects.bars.items.length, 1);

  const normalized = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ values: [
      { value: 1, group: "g1" },
      { value: 2, group: "g2" }
    ] })
    .createBarMark({ id: "hist" })
    .encodeHistogram({ field: "value" })
    .encodeColor({ field: "group", layout: "fill" });
  const baseline = normalized.removeEncoding({ channel: "color" });
  assert.equal(baseline.semanticSpec.layers[0].encoding.y.stack, "zero");
  assert.equal(baseline.graphicSpec.objects.hist.items.length > 0, true);
});

test("removes field opacity and stroke-width legends without deleting scales", () => {
  const opacity = chart()
    .createCanvas({
      width: 760,
      height: 460,
      margin: { top: 30, right: 150, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", fieldType: "quantitative" })
    .encodeY({ field: "y" })
    .encodeOpacity({ field: "amount" })
    .createLegend({ target: "points", channels: ["opacity"] });
  const noOpacity = opacity.removeEncoding({ channel: "opacity" });
  assert.equal(noOpacity.guideConfigs.legend?.opacity, undefined);
  assert.equal(noOpacity.semanticSpec.layers[0].encoding.opacity, undefined);
  assert.notEqual(noOpacity.semanticSpec.scales.find(scale => scale.id === "opacity"), undefined);

  const width = chart()
    .createCanvas({
      width: 760,
      height: 460,
      margin: { top: 30, right: 150, bottom: 60, left: 70 }
    })
    .createData({ values: rows })
    .createRuleMark({ id: "rules" })
    .encodeX({ field: "x", fieldType: "quantitative" })
    .encodeStrokeWidth({ field: "amount" })
    .createLegend({ target: "rules", channels: ["strokeWidth"] });
  const noWidth = width.removeEncoding({ channel: "strokeWidth" });
  assert.equal(noWidth.guideConfigs.legend?.strokeWidth, undefined);
  assert.equal(noWidth.semanticSpec.layers[0].encoding.strokeWidth, undefined);
  assert.equal(noWidth.graphicSpec.objects.rules.items.every(
    item => item.properties.strokeWidth === 2
  ), true);
});

test("validates target, channel, missing state, ambiguity, and selection dependencies", () => {
  const base = pointBase().encodeColor({ field: "group" });
  assert.throws(
    () => base.removeEncoding({ channel: "pathOrder" }),
    /Unsupported removable encoding channel/
  );
  assert.throws(
    () => base.removeEncoding({ target: "missing", channel: "color" }),
    /Unknown encoding target/
  );
  assert.throws(
    () => base.removeEncoding({ target: "points", channel: "size" }),
    /has no size encoding/
  );
  assert.throws(
    () => base.removeEncoding({ channel: "color", extra: true }),
    /Unknown removeEncoding option/
  );

  const ambiguous = base
    .createPointMark({ id: "other", data: "rows" })
    .encodeColor({ target: "other", field: "group", scale: { id: "color" } })
    ._clone({ context: {} });
  assert.throws(
    () => ambiguous.removeEncoding({ channel: "color" }),
    /target is ambiguous/
  );

  const selected = base.selectMarks({
    id: "by-color",
    target: "points",
    channel: "color",
    op: "eq",
    value: "A"
  });
  assert.throws(
    () => selected.removeEncoding({ channel: "color" }),
    /selection "by-color" references that channel/
  );
  assert.notEqual(selected.semanticSpec.layers[0].encoding.color, undefined);
});

test("replays highlights after a retained-channel removal", () => {
  const highlighted = pointBase()
    .encodeColor({ field: "group" })
    .encodeSize({ field: "amount" })
    .highlightMarks({
      target: "points",
      select: { field: "group", op: "eq", value: "A" },
      stroke: "black",
      strokeWidth: 3,
      dimOthers: { opacity: 0.2 }
    });
  const after = highlighted.removeEncoding({ channel: "size" });
  const items = after.graphicSpec.objects.points.items;

  assert.equal(items.some(item =>
    item.properties.stroke === "black" && item.properties.strokeWidth === 3
  ), true);
  assert.equal(items.some(item => item.properties.opacity === 0.2), true);
  assert.notEqual(after.materializationConfigs.highlights, undefined);
});

test("covers secondary, offset, series, text, and Polar channel removal", () => {
  const ranged = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createAreaMark({ id: "band" })
    .encodeXRange({ lower: "low", upper: "high" })
    .encodeY({ field: "y" });
  for (const channel of ["x2", "x"]) {
    const removed = ranged.removeEncoding({ target: "band", channel });
    assert.equal(removed.semanticSpec.layers[0].encoding[channel], undefined);
    assert.equal(removed.graphicSpec.objects.band.items.length, 0);
  }

  const grouped = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ values: [
      { category: "A", group: "g1", value: 2 },
      { category: "A", group: "g2", value: 3 }
    ] })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value", aggregate: "sum", stack: null })
    .encodeColor({ field: "group", layout: "group" });
  const noOffset = grouped.removeEncoding({ channel: "xOffset" });
  assert.equal(noOffset.semanticSpec.layers[0].encoding.xOffset, undefined);
  assert.equal(noOffset.graphicSpec.objects.bars.items.length, 0);
  const recovered = noOffset.encodeXOffset({ field: "group" });
  assert.equal(recovered.graphicSpec.objects.bars.items.length, 2);

  const series = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ values: [
      { x: 0, y: 1, group: "A" },
      { x: 1, y: 2, group: "A" },
      { x: 0, y: 3, group: "B" },
      { x: 1, y: 4, group: "B" }
    ] })
    .createLineMark({ id: "line" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeDash({ field: "group" });
  const noDash = series.removeEncoding({ channel: "strokeDash" });
  const noGroup = noDash.removeEncoding({ channel: "group" });
  assert.equal(noDash.semanticSpec.layers[0].encoding.strokeDash, undefined);
  assert.equal(noGroup.semanticSpec.layers[0].encoding.group, undefined);
  assert.equal(noGroup.graphicSpec.objects.line.items.length, 1);

  const text = pointBase()
    .createTextMark({ id: "labels" })
    .encodeText({ target: "labels", field: "group" });
  const noText = text.removeEncoding({ channel: "text" });
  assert.equal(noText.semanticSpec.layers[1].encoding.text, undefined);
  assert.equal(noText.graphicSpec.objects.labels.items.length, 0);
  assert.equal(
    noText.encodeText({ target: "labels", field: "group" })
      .graphicSpec.objects.labels.items.length,
    rows.length
  );

  const polar = chart()
    .createCanvas({ width: 240, height: 240, margin: 30 })
    .createData({ values: [
      { angle: "A", distance: 1 },
      { angle: "B", distance: 2 }
    ] })
    .createPointMark({ id: "polar" })
    .encodeTheta({ field: "angle", fieldType: "nominal" })
    .encodeR({ field: "distance" });
  for (const channel of ["theta", "radius"]) {
    const removed = polar.removeEncoding({ target: "polar", channel });
    assert.equal(removed.semanticSpec.layers[0].encoding[channel], undefined);
    assert.equal(removed.graphicSpec.objects.polar.items.length, 0);
  }
});

test("covers vertical offset and direct y2 removal", () => {
  const horizontal = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ values: [
      { category: "A", group: "g1", value: 2 },
      { category: "A", group: "g2", value: 3 }
    ] })
    .createBarMark({ id: "bars" })
    .encodeY({ field: "category", fieldType: "ordinal" })
    .encodeX({ field: "value", aggregate: "sum", stack: null })
    .encodeColor({ field: "group", layout: "group" });
  const noOffset = horizontal.removeEncoding({ channel: "yOffset" });
  assert.equal(noOffset.semanticSpec.layers[0].encoding.yOffset, undefined);
  assert.equal(noOffset.graphicSpec.objects.bars.items.length, 0);

  const band = chart()
    .createCanvas({ width: 260, height: 180, margin: 30 })
    .createData({ values: rows })
    .createAreaMark({ id: "band" })
    .encodeX({ field: "x" })
    .encodeYRange({ lower: "low", upper: "high" });
  const noY2 = band.removeEncoding({ channel: "y2" });
  assert.equal(noY2.semanticSpec.layers[0].encoding.y2, undefined);
  assert.equal(noY2.graphicSpec.objects.band.items.length, 0);
});

test("does not restore removed appearance through later Canvas, scale, or data edits", () => {
  const encoded = pointBase()
    .encodeSize({ field: "amount", scale: { id: "point-size" } });
  const removed = encoded.removeEncoding({ channel: "size" });
  const resized = removed.editCanvas({ width: 300 });
  const rescaled = resized.editScale({ id: "point-size", range: [100, 400] });
  const filtered = rescaled.filterMarks({
    target: "points",
    field: "group",
    op: "eq",
    value: "A"
  });

  for (const program of [removed, resized, rescaled, filtered]) {
    assert.equal(program.semanticSpec.layers[0].encoding.size, undefined);
    assert.equal(program.graphicSpec.objects.points.items.every(
      item => item.properties.radius === 3
    ), true);
  }
  assert.notEqual(filtered.semanticSpec.scales.find(
    scale => scale.id === "point-size"
  ), undefined);
});
