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

test("infers bar position field types for string shorthand", () => {
  const program = base().createBarPlot({
    x: "category",
    y: "value",
    guides: false
  });
  const { x, y } = program.semanticSpec.layers[0].encoding;

  assert.equal(x.field, "category");
  assert.equal(x.fieldType, "nominal");
  assert.equal(y.field, "value");
  assert.equal(y.fieldType, "quantitative");
  assert.equal(y.aggregate, "mean");
  assert.equal(program.graphicSpec.objects.barPlot.items.length, 2);
});

test("infers horizontal shorthand through category-first child actions", () => {
  const source = base();
  const options = { x: "value", y: "category" };
  const program = source.createBarPlot(options);
  const explicit = source
    .createBarMark({ id: "barPlot" })
    .encodeY({ target: "barPlot", field: "category", fieldType: "nominal" })
    .encodeX({ target: "barPlot", field: "value", fieldType: "quantitative" })
    .createGuides();

  assert.equal(program.semanticSpec.layers[0].encoding.x.aggregate, "mean");
  assert.deepEqual(program.resolvedScales.x.domain, [0, 4]);
  assert.equal(program.graphicSpec.objects.barPlot.items.length, 2);
  assert.deepEqual(program.semanticSpec, explicit.semanticSpec);
  assert.deepEqual(program.graphicSpec, explicit.graphicSpec);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createBarMark", "encodeY", "encodeX", "createGuides"
  ]);
  assert.deepEqual(
    program.editCanvas({ width: 500 }).editBarMark({ opacity: 0.5 }).graphicSpec,
    explicit.editCanvas({ width: 500 }).editBarMark({ opacity: 0.5 }).graphicSpec
  );
  assert.equal(source.semanticSpec.layers.length, 0);
  assert.deepEqual(options, { x: "value", y: "category" });
});

test("infers horizontal measures opposite explicit ordinal and temporal categories", () => {
  for (const [fieldType, categories] of [
    ["ordinal", [1, 1, 2, 2]],
    ["temporal", ["2025-01-01", "2025-01-01", "2025-02-01", "2025-02-01"]]
  ]) {
    const source = base(rows.map((row, index) => ({ ...row, category: categories[index] })));
    const category = { field: "category", fieldType };
    const inferred = source.createBarPlot({ x: "value", y: category, guides: false });
    const explicit = source.createBarPlot({
      x: { field: "value", aggregate: "mean" }, y: category, guides: false
    });
    assert.equal(inferred.semanticSpec.layers[0].encoding.x.aggregate, "mean");
    assert.equal(inferred.semanticSpec.layers[0].encoding.y.fieldType, fieldType);
    assert.deepEqual(inferred.semanticSpec, explicit.semanticSpec);
    assert.deepEqual(inferred.graphicSpec, explicit.graphicSpec);
    assert.equal(inferred.graphicSpec.objects.barPlot.items.length, 2);
  }
});

test("rejects invalid horizontal role pairs without changing the source", () => {
  const source = base();
  const before = structuredClone({ semantic: source.semanticSpec, trace: source.trace });
  assert.throws(() => source.createBarPlot({ x: "category", y: "group" }),
    /requires a quantitative field opposite a categorical position/);
  assert.throws(() => source.createBarPlot({
    x: "value", y: { field: "category", fieldType: "nominal", aggregate: "sum" }
  }), /Categorical bar position does not support bin or aggregate/);
  assert.deepEqual({ semantic: source.semanticSpec, trace: source.trace }, before);
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

  assert.equal(layer.layout.mode, "group");
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

  assert.equal(program.semanticSpec.layers[0].layout.mode, "stack");
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

  assert.equal(overlay.semanticSpec.layers[0].layout.mode, "overlay");
  assert.equal(overlay.markConfigs.barPlot.barWidth.pixels, 14);
  assert.equal(diverging.semanticSpec.layers[0].layout.mode, "diverging");
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
  assert.equal(layer.layout.mode, "stack");
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
  assert.equal(layer.layout.mode, "fill");
  assert.equal(layer.layout.mode, "fill");
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

test("createHistogram forwards statistical weight to histogram encoding", () => {
  const program = base([
    { value: 1, weight: 1 },
    { value: 3, weight: 3 }
  ]).createHistogram({
    field: "value",
    binBoundaries: [1, 2, 3],
    weight: { field: "weight", kind: "frequency" },
    guides: false
  });
  assert.deepEqual(program.semanticSpec.layers[0].encoding.x.weight, {
    field: "weight",
    kind: "frequency"
  });
  assert.deepEqual(program.resolvedScales.y.domain, [0, 3]);
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

for (const vertical of [true, false]) {
  test(`raw ${vertical ? "vertical" : "horizontal"} bar facade matches explicit range actions without aggregating rows`, () => {
    const values = [{ category: "A", lo: 2, hi: 6 }, { category: "A", lo: 3, hi: 7 }, { category: "B", lo: 4, hi: 8 }];
    const source = base(values);
    const interval = { lower: "lo", upper: "hi", scale: { domain: [0, 10] } };
    const options = { x: vertical ? "category" : interval, y: vertical ? interval : "category",
      width: { pixels: 12 }, bar: { fill: "orange" }, guides: false };
    const saved = structuredClone(options);
    const p = source.createBarPlot(options);
    let explicit = source.createBarMark({ id: "barPlot", fill: "orange" });
    explicit = vertical
      ? explicit.encodeX({ field: "category", fieldType: "nominal" }).encodeYRange({ ...interval, fieldType: "quantitative" })
      : explicit.encodeY({ field: "category", fieldType: "nominal" }).encodeXRange({ ...interval, fieldType: "quantitative" });
    explicit = explicit.encodeBarWidth({ pixels: 12 });
    assert.deepEqual(p.semanticSpec, explicit.semanticSpec);
    assert.deepEqual(p.graphicSpec, explicit.graphicSpec);
    assert.equal(p.graphicSpec.objects.barPlot.items.length, 3);
    assert.equal(p.semanticSpec.layers[0].encoding[vertical ? "y" : "x"].aggregate, undefined);
    assert.deepEqual(p.editCanvas({ width: 500, height: 400 }).graphicSpec,
      explicit.editCanvas({ width: 500, height: 400 }).graphicSpec);
    assert.deepEqual(options, saved);
    assert.equal(source.semanticSpec.layers.length, 0);
    assert.ok(p.trace.children.at(-1).children.some(child => child.op === (vertical ? "encodeYRange" : "encodeXRange")));
  });
}

test("temporal interval bar facade shares a value scale with a raw line and retains guide ownership", () => {
  const p = base([{ date: "2024-01-01", lo: 2, hi: 6 }, { date: "2024-01-03", lo: 4, hi: 8 }])
    .createBarPlot({
      x: { field: "date", fieldType: "temporal" },
      y: { lower: "lo", upper: "hi", scale: { id: "amount" } },
      width: { pixels: 5 },
      guides: { axes: { x: { ticksAndLabels: { count: 2, labels: { format: "%m-%d" } } }, y: {} } }
    })
    .createLinePlot({
      x: { field: "date", fieldType: "temporal", scale: { id: "x" } },
      y: { field: "lo", scale: { id: "amount" } }, guides: false
    });
  assert.equal(p.semanticSpec.layers.length, 2);
  assert.equal(p.semanticSpec.layers[0].encoding.y.scale, p.semanticSpec.layers[1].encoding.y.scale);
  assert.equal(p.graphicSpec.objects.barPlot.items.length, 2);
  assert.equal(p.graphicSpec.objects.linePlot.items.length, 1);
  assert.ok(p.graphicSpec.objects.yAxisLabels.items.length > 0);
  assert.deepEqual(p.editCanvas({ width: 500 }).graphicSpec.objects.barPlot.items.map(item => item.properties.width), [5, 5]);
});

test("range facade rejects ambiguous bounds, transforms, and two ranged channels atomically", () => {
  const p = base([{ category: "A", lo: 2, hi: 6 }]);
  for (const y of [
    { lower: "lo" }, { upper: "hi" }, { lower: "lo", upper: "hi", field: "lo" },
    { lower: "lo", upper: "hi", aggregate: "mean" }, { lower: "lo", upper: "hi", fieldType: "temporal" }
  ]) assert.throws(() => p.createBarPlot({ x: "category", y }), /range|option/u);
  assert.throws(() => p.createBarPlot({ x: { lower: "lo", upper: "hi" }, y: { lower: "lo", upper: "hi" } }), /one range/u);
  assert.equal(p.semanticSpec.layers.length, 0);
});

test("five raw bullet layers stay five facade calls and preserve independent facet ranges", () => {
  const values = [
    { category: "A", lo: 2, hi: 6, panel: "first" },
    { category: "B", lo: 20, hi: 60, panel: "second" }
  ];
  let p = base(values);
  for (let index = 0; index < 5; index += 1) {
    p = p.createBarPlot({ id: `bullet-${index}`, x: { lower: "lo", upper: "hi" },
      y: "category", width: { pixels: 30 - index * 5 }, guides: false });
  }
  assert.equal(p.trace.children.filter(child => child.op === "createBarPlot").length, 5);
  assert.deepEqual(p.semanticSpec.layers.map(layer => layer.id), ["bullet-0", "bullet-1", "bullet-2", "bullet-3", "bullet-4"]);
  const faceted = p.facet({ field: "panel", scales: { x: "independent", y: "independent" } });
  const children = Object.values(faceted.children);
  assert.equal(children.length, 2);
  for (const child of children) {
    for (let index = 0; index < 5; index += 1) {
      const items = child.graphicSpec.objects[`bullet-${index}`].items;
      assert.equal(items.length, 1);
      assert.equal(items[0].properties.height, 30 - index * 5);
    }
  }
  assert.notDeepEqual(children[0].resolvedScales.x.domain, children[1].resolvedScales.x.domain);
});
