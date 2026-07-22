import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", shape: "one", amount: 4, alpha: 0.2 }),
  Object.freeze({ x: 2, y: 5, group: "B", shape: "two", amount: 9, alpha: 0.6 }),
  Object.freeze({ x: 3, y: 3, group: "C", shape: "three", amount: 16, alpha: 1 })
]);

const lineRows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", amount: 4 }),
  Object.freeze({ x: 2, y: 5, group: "A", amount: 4 }),
  Object.freeze({ x: 1, y: 3, group: "B", amount: 12 }),
  Object.freeze({ x: 2, y: 6, group: "B", amount: 12 })
]);

function pointBase() {
  return chart()
    .createCanvas({
      width: 680,
      height: 380,
      margin: { top: 40, right: 240, bottom: 60, left: 60 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function compositeProgram() {
  return pointBase()
    .encodeColor({ field: "group", fieldType: "nominal" })
    .encodeShape({ field: "group" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "alpha" })
    .createLegend({
      target: "points",
      channels: ["color", "shape"],
      count: 3,
      labels: { color: "#0f172a" },
      titleStyle: { color: "#111827" }
    })
    .createLegend({ target: "points", channels: ["opacity"], count: 4 });
}

function strokeWidthProgram() {
  return chart()
    .createCanvas({
      width: 520,
      height: 260,
      margin: { top: 30, right: 180, bottom: 50, left: 60 }
    })
    .createData({ id: "rows", values: lineRows })
    .createLineMark({ id: "lines" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "amount", scale: { range: [1, 7] } })
    .createLegend({ target: "lines", channels: ["strokeWidth"] });
}

test("hides, restores, and re-infers a stroke-width title", () => {
  const original = strokeWidthProgram();
  const hidden = original.editLegend({ target: "lines", title: false });
  assert.equal(hidden.graphicSpec.objects.strokeWidthLegendTitle, undefined);
  assert.equal(hidden.guideConfigs.legend.strokeWidth.titleVisible, false);

  const custom = hidden.editLegend({ title: "Custom width" });
  assert.equal(custom.semanticSpec.guides.legend.strokeWidth.title, "Custom width");
  assert.equal(
    custom.graphicSpec.objects.strokeWidthLegendTitle.properties.text,
    "Custom width"
  );
  const inferred = custom.editLegend({ title: "auto" });
  assert.equal(inferred.semanticSpec.guides.legend.strokeWidth.title, "amount");
  assert.equal(inferred.guideConfigs.legend.strokeWidth.inferredTitle, true);
  assert.ok(original.graphicSpec.objects.strokeWidthLegendTitle);
});

test("validates stroke-width edits before changing stored state", () => {
  const program = strokeWidthProgram();
  const options = Object.freeze({ labels: Object.freeze({ color: "#123456" }) });
  const edited = program.editLegend(options);
  assert.equal(options.labels.color, "#123456");
  assert.equal(program.guideConfigs.legend.strokeWidth.labels.color, "#334155");
  assert.equal(edited.guideConfigs.legend.strokeWidth.labels.color, "#123456");

  for (const invalid of [
    { position: "right" },
    { symbol: "auto" },
    { border: true },
    { count: 1 },
    { labels: { fontSize: 0 } },
    { titleStyle: { color: "" } }
  ]) {
    assert.throws(
      () => program.editLegend(invalid),
      /does not accept|at least 2|positive|non-empty/
    );
  }
  assert.equal(program.guideConfigs.legend.strokeWidth.count, 5);
  assert.equal(program.trace.children.at(-1).op, "createLegend");
});

test("routes compatible focused stroke-width edits through editLegend", () => {
  const program = strokeWidthProgram()
    .editLegendLabels({ color: "#123456" })
    .editLegendTitle({ title: "Weight", fontWeight: 700 })
    .editLegendSymbols({ count: 4 });
  assert.equal(program.guideConfigs.legend.strokeWidth.count, 4);
  assert.equal(
    program.graphicSpec.objects.strokeWidthLegendLabels.items[0].properties.fill,
    "#123456"
  );
  assert.equal(
    program.graphicSpec.objects.strokeWidthLegendTitle.properties.fontWeight,
    700
  );
  assert.throws(
    () => program.editLegendLayout({ offset: 10 }),
    /stroke-width legend does not accept offset/
  );
});

test("removes one complete composite block and preserves retained blocks", () => {
  const program = compositeProgram();
  const sizeBefore = program.guideConfigs.legend.size;
  const removed = program.removeLegend({
    target: "points",
    channels: ["color", "shape"]
  });

  assert.equal(removed.guideConfigs.legend.series, undefined);
  assert.equal(removed.semanticSpec.guides.legend.series, undefined);
  assert.equal(removed.graphicSpec.objects.seriesLegendSymbolPoints, undefined);
  assert.ok(removed.guideConfigs.legend.size);
  assert.equal(removed.guideConfigs.legend.size.count, sizeBefore.count);
  assert.equal(removed.guideConfigs.legend.size.inheritAppearance, false);
  assert.ok(removed.graphicSpec.objects.sizeLegendSymbols);
  assert.ok(removed.guideConfigs.legend.opacity);
  assert.ok(removed.graphicSpec.objects.opacityLegendSymbols);
  assert.ok(removed.semanticSpec.layers[0].encoding.color);
  assert.ok(removed.semanticSpec.layers[0].encoding.shape);
  assert.ok(removed.resolvedScales.color);
  assert.ok(program.graphicSpec.objects.seriesLegendSymbolPoints);

  const recreated = removed.createLegend({
    target: "points",
    channels: ["color", "shape"]
  });
  assert.ok(recreated.guideConfigs.legend.series);
  assert.equal(recreated.guideConfigs.legend.size.count, sizeBefore.count);
  assert.ok(recreated.graphicSpec.objects.seriesLegendSymbolPoints);
  assert.ok(recreated.graphicSpec.objects.sizeLegendSymbols);
});

test("removes size or opacity independently and rematerializes what remains", () => {
  const program = compositeProgram();
  const withoutSize = program.removeLegend({ channels: ["size"] });
  assert.equal(withoutSize.guideConfigs.legend.size, undefined);
  assert.equal(withoutSize.semanticSpec.guides.legend.size, undefined);
  assert.equal(withoutSize.graphicSpec.objects.sizeLegendSymbols, undefined);
  assert.ok(withoutSize.graphicSpec.objects.seriesLegendSymbolPoints);
  assert.ok(withoutSize.graphicSpec.objects.opacityLegendSymbols);

  const withoutOpacity = program.removeLegend({ channels: ["opacity"] });
  assert.equal(withoutOpacity.guideConfigs.legend.opacity, undefined);
  assert.equal(withoutOpacity.semanticSpec.guides.legend.opacity, undefined);
  assert.equal(withoutOpacity.graphicSpec.objects.opacityLegendSymbols, undefined);
  assert.ok(withoutOpacity.graphicSpec.objects.seriesLegendSymbolPoints);
  assert.ok(withoutOpacity.graphicSpec.objects.sizeLegendSymbols);
});

test("requires complete combined channel sets and validates selectors atomically", () => {
  const program = compositeProgram();
  const invalidChannels = Object.freeze(["color"]);
  for (const channels of [
    invalidChannels,
    [],
    ["color", "color"],
    ["strokeWidth"],
    ["missing"],
    "color"
  ]) {
    assert.throws(
      () => program.removeLegend({ channels }),
      /combined block|at least one|duplicate|no complete block|Unsupported|must be an array/
    );
  }
  assert.deepEqual(invalidChannels, ["color"]);
  assert.ok(program.guideConfigs.legend.series);
  assert.ok(program.guideConfigs.legend.size);
  assert.ok(program.guideConfigs.legend.opacity);
});

test("keeps omitted channels as whole-target removal compatibility", () => {
  const program = compositeProgram();
  const omitted = program.removeLegend({ target: "points" });
  const explicit = program.removeLegend({
    target: "points",
    channels: ["color", "shape", "size", "opacity"]
  });
  assert.deepEqual(omitted.semanticSpec, explicit.semanticSpec);
  assert.deepEqual(omitted.materializationConfigs, explicit.materializationConfigs);
  assert.deepEqual(omitted.graphicSpec, explicit.graphicSpec);
});

test("selectively removes standalone color, gradient, interval, and stroke-width blocks", () => {
  const programs = [
    {
      kind: "color",
      channel: "color",
      program: pointBase()
        .encodeColor({ field: "group", fieldType: "nominal" })
        .createLegend({ channels: ["color"] })
    },
    {
      kind: "gradient",
      channel: "color",
      program: pointBase()
        .encodeColor({ field: "amount", fieldType: "quantitative" })
        .createLegend({ channels: ["color"] })
    },
    {
      kind: "interval",
      channel: "color",
      program: pointBase()
        .encodeColor({
          field: "amount",
          fieldType: "quantitative",
          scale: { type: "quantize", range: ["#eff6ff", "#60a5fa", "#1e3a8a"] }
        })
        .createLegend({ channels: ["color"] })
    },
    {
      kind: "strokeWidth",
      channel: "strokeWidth",
      program: strokeWidthProgram()
    }
  ];

  for (const { kind, channel, program } of programs) {
    const encoding = program.semanticSpec.layers.find(
      layer => layer.id === (kind === "strokeWidth" ? "lines" : "points")
    ).encoding[channel];
    const removed = program.removeLegend({ channels: [channel] });
    assert.equal(removed.guideConfigs.legend?.[kind], undefined, kind);
    assert.deepEqual(
      removed.semanticSpec.layers.find(
        layer => layer.id === (kind === "strokeWidth" ? "lines" : "points")
      ).encoding[channel],
      encoding,
      kind
    );
  }
});

test("preserves existing target ambiguity when channels are supplied", () => {
  const points = pointBase()
    .encodeColor({ field: "group", fieldType: "nominal" })
    .createLegend({ target: "points", channels: ["color"] });
  const program = points
    .createData({ id: "lineRows", values: lineRows })
    .createLineMark({ id: "lines", data: "lineRows" })
    .encodeX({ target: "lines", field: "x" })
    .encodeY({ target: "lines", field: "y" })
    .encodeGroup({ target: "lines", field: "group" })
    .encodeStrokeWidth({
      target: "lines",
      field: "amount",
      scale: { id: "lineWidth", range: [1, 7] }
    })
    .createLegend({ target: "lines", channels: ["strokeWidth"] });

  assert.throws(
    () => program.removeLegend({ channels: ["strokeWidth"] }),
    /requires target when the legend is ambiguous/
  );
  const removed = program.removeLegend({
    target: "lines",
    channels: ["strokeWidth"]
  });
  assert.ok(removed.guideConfigs.legend.color);
  assert.equal(removed.guideConfigs.legend.strokeWidth, undefined);
});

test("rematerializes a retained block on another target with the same semantic kind", () => {
  const program = pointBase()
    .encodeColor({ field: "group", fieldType: "nominal" })
    .createLegend({ target: "points", channels: ["color"] })
    .createPointMark({ id: "quantitative" })
    .encodeX({ target: "quantitative", field: "x" })
    .encodeY({ target: "quantitative", field: "y" })
    .encodeColor({
      target: "quantitative",
      field: "amount",
      fieldType: "quantitative",
      scale: { id: "amountColor", type: "sequential" }
    })
    .createLegend({ target: "quantitative", channels: ["color"] });

  const removed = program.removeLegend({
    target: "points",
    channels: ["color"]
  });
  assert.equal(removed.guideConfigs.legend.color, undefined);
  assert.ok(removed.guideConfigs.legend.gradient);
  assert.ok(removed.graphicSpec.objects.colorGradientStrips);
  assert.equal(removed.semanticSpec.guides.legend.color.scale, "amountColor");

  const wholeRemoved = program.removeLegend({ target: "points" });
  assert.equal(wholeRemoved.guideConfigs.legend.color, undefined);
  assert.ok(wholeRemoved.guideConfigs.legend.gradient);
  assert.equal(
    wholeRemoved.semanticSpec.guides.legend.color.scale,
    "amountColor"
  );
});
