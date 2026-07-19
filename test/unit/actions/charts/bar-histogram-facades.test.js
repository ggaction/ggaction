import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ category: "A", value: 2, group: "one" }),
  Object.freeze({ category: "A", value: 4, group: "two" }),
  Object.freeze({ category: "B", value: 3, group: "one" }),
  Object.freeze({ category: "B", value: 5, group: "two" })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values });
}

test("creates the shortest aggregate bar plot with stable defaults", () => {
  const source = base();
  const program = source.createBarPlot({
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" }
  });
  const actionNode = program.trace.children.at(-1);

  assert.equal(program.semanticSpec.layers[0].id, "barPlot");
  assert.equal(program.semanticSpec.layers[0].mark.type, "bar");
  assert.equal(program.graphicSpec.objects.barPlot.items.length, 2);
  assert.deepEqual(actionNode.children.map(child => child.op), [
    "createBarMark", "encodeX", "encodeY", "createGuides"
  ]);
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("forwards grouped bar layout, width, and appearance without retaining input", () => {
  const options = {
    id: "bars",
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean", scale: { zero: true } },
    color: { field: "group", layout: "group", scale: { palette: "tableau10" } },
    width: { band: 0.72 },
    bar: { opacity: 0.8, stroke: "#111111", strokeWidth: 1 },
    guides: false
  };
  const program = base().createBarPlot(options);
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.encoding.color.layout, "group");
  assert.equal(layer.encoding.xOffset.field, "group");
  assert.equal(program.graphicSpec.objects.bars.items.length, 4);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createBarMark", "encodeX", "encodeY", "encodeColor", "encodeBarWidth"
  ]);
  options.width.band = 0.2;
  options.bar.opacity = 0.1;
  assert.equal(program.markConfigs.bars.barWidth.band, 0.72);
  assert.equal(program.graphicSpec.objects.bars.items[0].properties.opacity, 0.8);
});

test("supports horizontal stacked bars through existing position and color policy", () => {
  const program = base().createBarPlot({
    x: { field: "value", aggregate: "mean" },
    y: { field: "category", fieldType: "ordinal" },
    color: { field: "group", layout: "stack" },
    guides: false
  });

  assert.equal(program.semanticSpec.layers[0].encoding.x.stack, "zero");
  assert.equal(program.graphicSpec.objects.barPlot.items.length, 4);
  assert.equal(
    program.graphicSpec.objects.barPlot.items.every(item =>
      item.properties.width >= 0 && item.properties.height >= 0
    ),
    true
  );
});

test("reuses overlay, diverging, and fixed-pixel bar policies", () => {
  const overlay = base().createBarPlot({
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" },
    color: { field: "group", layout: "overlay" },
    width: { pixels: 14 },
    guides: false
  });
  const diverging = base([
    { category: "A", value: -2, group: "one" },
    { category: "A", value: 3, group: "two" }
  ]).createBarPlot({
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" },
    color: { field: "group", layout: "diverging" },
    guides: false
  });

  assert.equal(overlay.semanticSpec.layers[0].encoding.color.layout, "overlay");
  assert.equal(overlay.markConfigs.barPlot.barWidth.pixels, 14);
  assert.equal(diverging.semanticSpec.layers[0].encoding.color.layout, "diverging");
  assert.equal(diverging.graphicSpec.objects.barPlot.items.length, 2);
});

test("rejects invalid bar facade options atomically", () => {
  const source = base();
  const position = {
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" }
  };

  assert.throws(
    () => source.createBarPlot({ ...position, width: { target: "other", band: 0.7 } }),
    /target is owned by the chart facade/
  );
  assert.throws(
    () => source.createBarPlot({ ...position, color: { field: "group", layout: "unknown" } }),
    /Unsupported color layout/
  );
  assert.equal(source.semanticSpec.layers.length, 0);
  assert.equal(source.trace.children.length, 2);
});

test("creates the shortest histogram through one atomic encoding child", () => {
  const source = base();
  const program = source.createHistogram({ field: "value" });
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.id, "histogram");
  assert.deepEqual(layer.encoding.x.bin, { maxBins: 10 });
  assert.equal(layer.encoding.y.aggregate, "count");
  assert.equal(layer.encoding.y.stack, "zero");
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createBarMark", "encodeHistogram", "createGuides"
  ]);
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("forwards histogram bin, stack, color, appearance, and guide options", () => {
  const options = {
    id: "bins",
    field: "value",
    binBoundaries: [0, 3, 6],
    stack: "normalize",
    xScale: { nice: false, zero: false },
    color: { field: "group", layout: "fill" },
    bar: { opacity: 0.7 },
    guides: false
  };
  const program = base().createHistogram(options);
  const layer = program.semanticSpec.layers[0];

  assert.deepEqual(layer.encoding.x.bin, { boundaries: [0, 3, 6] });
  assert.equal(layer.encoding.y.stack, "normalize");
  assert.equal(layer.encoding.color.layout, "fill");
  assert.equal(program.graphicSpec.objects.bins.items[0].properties.opacity, 0.7);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createBarMark", "encodeHistogram", "encodeColor"
  ]);
  options.binBoundaries[1] = 4;
  options.bar.opacity = 0.1;
  assert.deepEqual(layer.encoding.x.bin, { boundaries: [0, 3, 6] });
  assert.equal(program.graphicSpec.objects.bins.items[0].properties.opacity, 0.7);
});

test("supports histogram step bins and validates the atomic bin contract", () => {
  const maxBins = base().createHistogram({
    field: "value",
    maxBins: 2,
    guides: false
  });
  const step = base().createHistogram({
    field: "value",
    binStep: 2,
    guides: false
  });
  assert.deepEqual(maxBins.semanticSpec.layers[0].encoding.x.bin, { maxBins: 2 });
  assert.deepEqual(step.semanticSpec.layers[0].encoding.x.bin, { step: 2 });

  const source = base();
  assert.throws(
    () => source.createHistogram({ field: "value", maxBins: 5, binStep: 2 }),
    /accepts only one of maxBins, binStep, or binBoundaries/
  );
  assert.throws(
    () => source.createHistogram({ field: "" }),
    /createHistogram field must be a non-empty string/
  );
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("uses explicit/current data and requires explicit IDs after stable conflicts", () => {
  const source = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ id: "first", values: rows })
    .createData({ id: "second", values: rows });
  const current = source.createHistogram({ field: "value", guides: false });
  const explicit = source.createBarPlot({
    id: "chosen",
    data: "first",
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" },
    guides: false
  });

  assert.equal(current.semanticSpec.layers[0].data, "second");
  assert.equal(explicit.semanticSpec.layers[0].data, "first");
  assert.throws(
    () => current.createHistogram({ field: "value", guides: false }),
    /requires an explicit createhistogram id/
  );
});
