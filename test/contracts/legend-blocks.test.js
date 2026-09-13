import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function state(program) {
  return JSON.stringify({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    materializationConfigs: program.materializationConfigs,
    resolvedScales: program.resolvedScales,
    context: program.context,
    trace: program.trace
  });
}

function pointBase() {
  return chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 140, right: 240, bottom: 140, left: 90 }
    })
    .createData({
      id: "values",
      values: [
        { x: 0, y: 0, group: "A", value: 0 },
        { x: 1, y: 1, group: "B", value: 50 },
        { x: 2, y: 0, group: "C", value: 100 }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function combined() {
  return pointBase()
    .encodeColor({ field: "group" })
    .encodeShape({ field: "group" })
    .encodeSize({
      field: "value",
      scale: { domain: [0, 100], range: [0, 100 * Math.PI] }
    })
    .createLegend({ target: "points", channels: ["color", "shape", "size"] });
}

function itemProperties(program, id) {
  return program.graphicSpec.objects[id].items.map(item => item.properties);
}

function strokeWidthLegend() {
  return chart()
    .createCanvas({ width: 760, height: 500, margin: { top: 100, right: 240, bottom: 100, left: 90 } })
    .createData({ values: [
      { x: 0, y: 0, group: "A", value: 0 },
      { x: 1, y: 1, group: "A", value: 0 },
      { x: 0, y: 1, group: "B", value: 100 },
      { x: 1, y: 0, group: "B", value: 100 }
    ] })
    .createLineMark({ id: "lines" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "value", scale: { domain: [0, 100], range: [0, 10] } })
    .createLegend({ target: "lines", channels: ["strokeWidth"] });
}

test("edits separate categorical and sampled blocks by stable channel identity", () => {
  const original = combined();
  const originalState = state(original);
  const options = deepFreeze({
    target: "points",
    channel: "size",
    title: "규모",
    values: [10, 50, 100],
    gap: 36,
    text: { fontSize: 14, color: "#334455" },
    symbol: { fill: "#f97316", stroke: "#111827", strokeWidth: 2, opacity: 0.6 }
  });
  const edited = original.editLegendBlock(options)
    .editLegendBlock({ target: "points", channel: "color", title: "분류" });

  assert.deepEqual(edited.guideConfigs.legend.size.blockOverrides, {
    '["size"]': {
      title: "규모",
      gap: 36,
      text: { fontSize: 14, color: "#334455" },
      symbol: { fill: "#f97316", stroke: "#111827", strokeWidth: 2, opacity: 0.6 }
    }
  });
  assert.deepEqual(edited.guideConfigs.legend.size.sampling.values, [10, 50, 100]);
  assert.equal(edited.graphicSpec.objects.sizeLegendTitle.properties.text, "규모");
  assert.deepEqual(itemProperties(edited, "sizeLegendLabels").map(item => item.text),
    ["10", "50", "100"]);
  assert.deepEqual(itemProperties(edited, "sizeLegendSymbols").map(item => item.radius),
    [Math.sqrt(10), Math.sqrt(50), 10]);
  assert.equal(itemProperties(edited, "sizeLegendLabels")[0].fontSize, 14);
  assert.equal(itemProperties(edited, "sizeLegendSymbols")[0].fill, "#f97316");
  assert.equal(edited.graphicSpec.objects.seriesLegendTitle.properties.text, "분류");
  assert.deepEqual(edited.semanticSpec.scales, original.semanticSpec.scales);
  assert.deepEqual(edited.graphicSpec.objects.points, original.graphicSpec.objects.points);
  assert.equal(state(original), originalState);
  assert.equal(Object.isFrozen(options.symbol), true);
});

test("treats every member of one merged block as the same selector", () => {
  const edited = combined()
    .editLegendBlock({ target: "points", channel: "color", title: "A" })
    .editLegendBlock({ target: "points", channel: "shape", title: "B" });
  assert.deepEqual(edited.guideConfigs.legend.series.blockOverrides, {
    '["color","shape"]': { title: "B" }
  });
  assert.equal(edited.graphicSpec.objects.seriesLegendTitle.properties.text, "B");
});

test("replaces symbol patches completely and removes stale concrete properties", () => {
  const original = combined();
  const categorical = original
    .editLegendBlock({
      target: "points",
      channel: "shape",
      symbol: { stroke: "#dc2626", strokeWidth: 4, opacity: 0.25 }
    })
    .editLegendBlock({
      target: "points",
      channel: "color",
      symbol: { opacity: 0.8 }
    });
  const basePoints = itemProperties(original, "seriesLegendSymbolPoints");
  for (const [index, item] of itemProperties(categorical, "seriesLegendSymbolPoints").entries()) {
    assert.equal(item.stroke, basePoints[index].stroke);
    assert.equal(item.strokeWidth, basePoints[index].strokeWidth);
    assert.equal(item.opacity, 0.8);
  }

  const sizeCleared = original
    .editLegendBlock({
      target: "points",
      channel: "size",
      symbol: { fill: "#f97316", stroke: "#111827", strokeWidth: 3, opacity: 0.4 }
    })
    .editLegendBlock({ target: "points", channel: "size", symbol: {} });
  assert.deepEqual(sizeCleared.graphicSpec, original.graphicSpec);
  assert.equal(sizeCleared.guideConfigs.legend.size.blockOverrides, undefined);
});

test("edits sampled, interval, and gradient families through one block contract", () => {
  const opacity = pointBase()
    .encodeOpacity({ field: "value", scale: { domain: [0, 100], range: [0, 1] } })
    .createLegend({ target: "points", channels: ["opacity"] })
    .editLegendBlock({
      target: "points",
      channel: "opacity",
      title: "Confidence",
      values: [0, 25, 100],
      gap: 18,
      text: { color: "#334155", fontSize: 13 },
      symbol: { size: 100 * Math.PI, fill: "#f8fafc", stroke: "#0f172a", strokeWidth: 2 }
    });
  assert.deepEqual(itemProperties(opacity, "opacityLegendSymbols").map(item => item.radius),
    [10, 10, 10]);
  assert.deepEqual(itemProperties(opacity, "opacityLegendSymbols").map(item => item.opacity),
    [0, 0.25, 1]);
  assert.equal(itemProperties(opacity, "opacityLegendSymbols")[0].strokeWidth, 2);
  assert.equal(itemProperties(opacity, "opacityLegendLabels")[0].fill, "#334155");

  const width = strokeWidthLegend().editLegendBlock({
    target: "lines",
    channel: "strokeWidth",
    values: [0, 50, 100],
    symbol: { stroke: "#7c3aed", opacity: 0.5 }
  });
  assert.deepEqual(itemProperties(width, "strokeWidthLegendSymbols").map(item => item.strokeWidth),
    [0, 5, 10]);
  assert.equal(itemProperties(width, "strokeWidthLegendSymbols")[0].stroke, "#7c3aed");
  assert.equal(itemProperties(width, "strokeWidthLegendSymbols")[0].opacity, 0.5);

  const intervalBase = pointBase()
    .encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale: { type: "quantize", domain: [0, 100], range: ["blue", "red"] }
    })
    .createLegend({ target: "points", channels: ["color"] });
  const interval = intervalBase.editLegendBlock({
    target: "points",
    channel: "color",
    symbol: { stroke: "#111827", strokeWidth: 3, opacity: 0.7 }
  });
  assert.equal(itemProperties(interval, "colorLegendSymbols")[0].stroke, "#111827");
  assert.equal(itemProperties(interval, "colorLegendSymbols")[0].strokeWidth, 3);
  assert.equal(itemProperties(interval, "colorLegendSymbols")[0].opacity, 0.7);
  assert.deepEqual(interval
    .editLegendBlock({ target: "points", channel: "color", symbol: {} }).graphicSpec,
  intervalBase.graphicSpec);

  const gradientBase = pointBase()
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({ target: "points", channels: ["color"] });
  const gradient = gradientBase.editLegendBlock({
    target: "points",
    channel: "color",
    gap: 24,
    text: { color: "#15803d", fontWeight: 700 }
  });
  assert.equal(itemProperties(gradient, "colorGradientLabels")[0].fill, "#15803d");
  assert.equal(gradient.graphicSpec.objects.colorGradientStrips.items[0].properties.y,
    gradientBase.graphicSpec.objects.colorGradientStrips.items[0].properties.y + 12);
  assert.throws(() => gradientBase.editLegendBlock({
    target: "points", channel: "color", symbol: { opacity: 0.5 }
  }), /gradient.*symbol|symbol.*gradient/iu);
});

test("matches lower-level graphics and decoded pixels for a block-only symbol edit", async () => {
  const original = combined();
  const publicProgram = original.editLegendBlock({
    target: "points",
    channel: "size",
    symbol: { fill: "#f97316", opacity: 1 }
  });
  const primitiveProgram = original
    .editGraphics({ target: "sizeLegendSymbols", property: "fill", value: "#f97316" })
    .editGraphics({ target: "sizeLegendSymbols", property: "opacity", value: 1 });
  assertChartProgramsEquivalent({
    primitiveProgram,
    publicProgram,
    compareSemanticSpec: false
  });
  const options = {
    width: 760,
    height: 600,
    pixelRatio: 1,
    colors: ["#f97316"],
    minimumInkPixels: 20
  };
  const primitivePixels = await assertRenderedPNG(primitiveProgram, {
    ...options,
    name: "legend-block-symbol-primitive"
  });
  const publicPixels = await assertRenderedPNG(publicProgram, {
    ...options,
    name: "legend-block-symbol-user-facing"
  });
  assert.equal(publicPixels.pixelHash, primitivePixels.pixelHash);
});

test("stores categorical order in the existing semantic order owner", () => {
  const original = combined();
  const edited = original.editLegendBlock({
    target: "points",
    channel: "shape",
    order: ["C", "A", "B"]
  });
  assert.deepEqual(edited.semanticSpec.guides.legend.series.order, {
    values: ["C", "A", "B"]
  });
  assert.deepEqual(edited.guideConfigs.legend.series.domain, ["C", "A", "B"]);
  assert.deepEqual(itemProperties(edited, "seriesLegendLabels").map(item => item.text),
    ["C", "A", "B"]);
  assert.equal(Object.hasOwn(
    edited.guideConfigs.legend.series.blockOverrides ?? {},
    "order"
  ), false);
});

test("preserves compatible overrides and rejects ambiguous structural transitions", () => {
  const compatible = pointBase()
    .encodeColor({ field: "group" })
    .encodeShape({ field: "group" })
    .createLegend({ target: "points", channels: ["color"] })
    .editLegendBlock({ target: "points", channel: "color", text: { color: "red" } })
    .editLegend({ target: "points", channels: ["color", "shape"] });
  assert.deepEqual(compatible.guideConfigs.legend.series.blockOverrides, {
    '["color","shape"]': { text: { color: "red" } }
  });
  assert.equal(itemProperties(compatible, "seriesLegendLabels")[0].fill, "red");

  const titled = pointBase()
    .encodeColor({ field: "group" })
    .encodeShape({ field: "group" })
    .createLegend({ target: "points", channels: ["color"] })
    .editLegendBlock({ target: "points", channel: "color", title: "Custom" });
  const titledState = state(titled);
  assert.throws(
    () => titled.editLegend({ target: "points", channels: ["color", "shape"] }),
    /transition.*title/iu
  );
  assert.equal(state(titled), titledState);

  const conflicting = pointBase()
    .encodeColor({ field: "group" })
    .encodeStroke({ field: "group" })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["stroke"] })
    .editLegendBlock({ target: "points", channel: "color", text: { color: "red" } })
    .editLegendBlock({ target: "points", channel: "stroke", text: { color: "blue" } });
  const conflictState = state(conflicting);
  assert.throws(
    () => conflicting.editLegend({ target: "points", channels: ["color", "stroke"] }),
    /transition.*block override/iu
  );
  assert.equal(state(conflicting), conflictState);

  const ordered = pointBase()
    .encodeColor({ field: "group" })
    .encodeStroke({ field: "group" })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "points", channels: ["stroke"] })
    .editLegendBlock({
      target: "points", channel: "color", order: ["A", "B", "C"]
    })
    .editLegendBlock({
      target: "points", channel: "stroke", order: ["C", "B", "A"]
    });
  const orderedState = state(ordered);
  assert.throws(
    () => ordered.editLegend({ target: "points", channels: ["color", "stroke"] }),
    /transition.*order/iu
  );
  assert.equal(state(ordered), orderedState);
});

test("migrates compatible block style across color families and rejects incompatible content", () => {
  const gradient = pointBase()
    .encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale: { id: "color", type: "sequential", domain: [0, 100], range: ["blue", "red"] }
    })
    .createLegend({ target: "points", channels: ["color"] })
    .editLegendBlock({
      target: "points",
      channel: "color",
      gap: 24,
      text: { color: "#7c3aed", fontSize: 14 }
    });
  const interval = gradient.editScale({
    id: "color",
    type: "quantize",
    domain: [0, 100],
    range: ["blue", "red"]
  });
  assert.deepEqual(interval.guideConfigs.legend.interval.blockOverrides, {
    '["color"]': { gap: 24, text: { color: "#7c3aed", fontSize: 14 } }
  });
  assert.equal(itemProperties(interval, "colorLegendLabels")[0].fill, "#7c3aed");
  const restored = interval.editScale({
    id: "color",
    type: "sequential",
    domain: [0, 100],
    range: ["blue", "red"]
  });
  assert.deepEqual(restored.guideConfigs.legend.gradient.blockOverrides,
    gradient.guideConfigs.legend.gradient.blockOverrides);

  const titled = gradient.editLegendBlock({
    target: "points",
    channel: "color",
    title: "Custom"
  });
  const before = state(titled);
  assert.throws(() => titled.editScale({
    id: "color",
    type: "quantize",
    domain: [0, 100],
    range: ["blue", "red"]
  }), /transition.*title/iu);
  assert.equal(state(titled), before);
});

test("drops removed block state and keeps retained state through replay", () => {
  const edited = combined().editLegendBlock({
    target: "points",
    channel: "size",
    title: "Mass",
    values: [10, 50, 100],
    text: { color: "purple" },
    gap: 30
  });
  const replayed = edited
    .editLegendLayout({ target: "points", position: "top" })
    .editCanvas({ width: 800 })
    .applyTheme({ theme: "dark" });
  assert.equal(replayed.graphicSpec.objects.sizeLegendTitle.properties.text, "Mass");
  assert.equal(itemProperties(replayed, "sizeLegendLabels")[0].fill, "purple");
  assert.deepEqual(replayed.guideConfigs.legend.size.sampling.values, [10, 50, 100]);

  const removed = replayed.removeLegend({ target: "points", channels: ["size"] });
  assert.equal(removed.guideConfigs.legend.size, undefined);
  const recreated = removed.createLegend({ target: "points", channels: ["size"] });
  assert.equal(recreated.graphicSpec.objects.sizeLegendTitle.properties.text, "value");
  assert.equal(recreated.guideConfigs.legend.size.blockOverrides, undefined);
  assert.equal(recreated.guideConfigs.legend.size.sampling.mode, "auto");

  const titleRestored = combined()
    .editLegendBlock({ target: "points", channel: "shape", title: "" })
    .editLegendBlock({ target: "points", channel: "color", title: "Groups" });
  const children = titleRestored.graphicSpec.objects.canvas.children;
  assert.equal(children.indexOf("seriesLegendTitle"),
    children.indexOf("seriesLegendLabels") + 1);
  assert.equal(children.indexOf("seriesLegendTitle") < children.indexOf("sizeLegendSymbols"), true);
});

test("keeps block title visibility authoritative over root title edits", () => {
  const base = pointBase()
    .encodeColor({ field: "group" })
    .createLegend({ target: "points", channels: ["color"] });
  const visible = base
    .editLegendBlock({ target: "points", channel: "color", title: "Block title" })
    .editLegend({ target: "points", title: false })
    .editCanvas({ width: 800 });
  assert.equal(visible.graphicSpec.objects.colorLegendTitle.properties.text, "Block title");

  const hidden = base
    .editLegendBlock({ target: "points", channel: "color", title: "" })
    .editLegend({ target: "points", title: "auto" })
    .editCanvas({ width: 800 });
  assert.equal(hidden.graphicSpec.objects.colorLegendTitle, undefined);
});

test("rejects invalid block requests atomically", () => {
  const original = combined();
  const before = state(original);
  const invalid = [
    { target: "points", channel: "size", symbol: { size: 10 } },
    { target: "points", channel: "color", values: [10] },
    { target: "points", channel: "opacity", title: "Missing" },
    { target: "sizeLegendLabels", channel: "size", title: "Graphic" },
    { target: "points", channel: "size", gap: -1 },
    { target: "points", channel: "size", text: { fontSize: 0 } },
    { target: "points", channel: "size", symbol: { opacity: 2 } },
    { target: "points", channel: "shape", order: ["A", "B"] },
    { target: "points", channel: "shape", order: ["A", "B", "B"] },
    { target: "points", channel: "shape", order: ["A", "B", null] },
    { target: "points", channel: "size", labelMap: [] },
    { target: "points", channel: "size" }
  ];
  for (const options of invalid) {
    assert.throws(() => original.editLegendBlock(options));
    assert.equal(state(original), before);
  }
});

test("keeps editLegendBlock on the Full surface only", () => {
  assert.equal(typeof chart().editLegendBlock, "function");
  assert.equal(basicChart().editLegendBlock, undefined);
});
