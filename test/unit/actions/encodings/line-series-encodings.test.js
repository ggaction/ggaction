import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { DASH10, TABLEAU10 } from "../../../../src/grammar/scales/index.js";

const rows = [
  { year: "2020-01-01", value: 2, origin: "A", cylinders: 4 },
  { year: "2021-01-01", value: 10, origin: "A", cylinders: 4 },
  { year: "2020-01-01", value: 6, origin: "B", cylinders: 6 },
  { year: "2021-01-01", value: 14, origin: "B", cylinders: 6 }
];

function createMeanLine(values = rows) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
}

function createLegendMeanLine(values = rows) {
  return chart()
    .createCanvas({
      width: 420,
      height: 180,
      margin: { top: 20, right: 140, bottom: 20, left: 20 }
    })
    .createData({ id: "data", values })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
}

test("encodes nominal line color and materializes one stroke per series", () => {
  const before = createMeanLine();
  const program = before.encodeColor({
    field: "origin",
    scale: { palette: "tableau10" }
  });
  const paths = program.graphicSpec.objects.trends.items;

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.semanticSpec.scales[2], {
    id: "color",
    type: "ordinal",
    domain: "auto",
    range: { palette: "tableau10" }
  });
  assert.deepEqual(program.resolvedScales.color, {
    type: "ordinal",
    domain: ["A", "B"],
    range: TABLEAU10
  });
  assert.equal(paths.length, 2);
  assert.deepEqual(
    paths.map(path => path.properties.stroke),
    TABLEAU10.slice(0, 2)
  );
  assert.deepEqual(
    paths.map(path => path.properties.strokeDash),
    [[], []]
  );
  assert.equal(before.graphicSpec.objects.trends.items.length, 1);
  assert.equal(before.semanticSpec.layers[0].encoding.color, undefined);
});

test("encodes nominal stroke dash with the built-in ten-pattern range", () => {
  const program = createMeanLine()
    .encodeColor({ field: "origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "origin" });
  const paths = program.graphicSpec.objects.trends.items;

  assert.deepEqual(program.semanticSpec.layers[0].encoding.strokeDash, {
    field: "origin",
    fieldType: "nominal",
    scale: "strokeDash"
  });
  assert.deepEqual(program.semanticSpec.scales[3], {
    id: "strokeDash",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  });
  assert.deepEqual(program.resolvedScales.strokeDash, {
    type: "ordinal",
    domain: ["A", "B"],
    range: DASH10
  });
  assert.deepEqual(
    paths.map(path => path.properties.strokeDash),
    DASH10.slice(0, 2)
  );
  assert.deepEqual(
    paths.map(path => path.properties.stroke),
    TABLEAU10.slice(0, 2)
  );
});

test("records line series encodings through wrapped materialization actions", () => {
  const color = createMeanLine().encodeColor({ field: "origin" });
  const colorNode = color.trace.children.at(-1);
  const dashed = color.encodeStrokeDash({ field: "origin" });
  const dashNode = dashed.trace.children.at(-1);

  assert.equal(colorNode.op, "encodeColor");
  assert.deepEqual(colorNode.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeLineMark"
  ]);
  assert.deepEqual(
    colorNode.children.at(-1).children
      .filter(child => child.op === "rematerializeScale")
      .map(child => child.args.id),
    ["x", "y", "color"]
  );
  assert.equal(dashNode.op, "encodeStrokeDash");
  assert.deepEqual(dashNode.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeLineMark"
  ]);
  assert.deepEqual(
    dashNode.children.at(-1).children
      .filter(child => child.op === "rematerializeScale")
      .map(child => child.args.id),
    ["x", "y", "color", "strokeDash"]
  );
});

test("converges across equivalent curve, group, color, and dash call orders", () => {
  const earlyCurve = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends", curve: "step" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "median" })
    .encodeColor({ field: "origin" })
    .encodeStrokeDash({ field: "origin" })
    .encodeGroup({ field: "origin" });
  const lateCurve = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "median" })
    .encodeGroup({ field: "origin" })
    .encodeStrokeDash({ field: "origin" })
    .encodeColor({ field: "origin" })
    .editLineMark({ curve: "step" });

  assert.deepEqual(lateCurve.graphicSpec, earlyCurve.graphicSpec);
  assert.deepEqual(lateCurve.resolvedScales, earlyCurve.resolvedScales);
  assert.deepEqual(lateCurve.markConfigs, earlyCurve.markConfigs);
  assert.deepEqual(
    lateCurve.semanticSpec.layers[0],
    earlyCurve.semanticSpec.layers[0]
  );
});

test("supports explicit dash ranges and cycles automatic patterns", () => {
  const explicit = createMeanLine().encodeStrokeDash({
    field: "origin",
    scale: { range: [[], [5, 2]] }
  });
  const manyRows = Array.from({ length: 11 }, (_, index) => [
    { year: "2020-01-01", value: index, origin: `C${index}` },
    { year: "2021-01-01", value: index + 1, origin: `C${index}` }
  ]).flat();
  const cycled = createMeanLine(manyRows).encodeStrokeDash({ field: "origin" });

  assert.deepEqual(
    explicit.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeDash
    ),
    [[], [5, 2]]
  );
  assert.equal(cycled.graphicSpec.objects.trends.items.length, 11);
  assert.deepEqual(
    cycled.graphicSpec.objects.trends.items[10].properties.strokeDash,
    DASH10[0]
  );
});

test("resolves named dash ranges while preserving semantic names", () => {
  const program = createMeanLine().encodeStrokeDash({
    field: "origin",
    scale: { range: ["solid", "dashed", "dotted", "dashdot"] }
  });

  assert.deepEqual(program.semanticSpec.scales.at(-1).range, [
    "solid", "dashed", "dotted", "dashdot"
  ]);
  assert.deepEqual(program.resolvedScales.strokeDash.range, [
    [], [6, 4], [1, 3], [6, 3, 1, 3]
  ]);
  assert.deepEqual(
    program.graphicSpec.objects.trends.items.map(
      child => child.properties.strokeDash
    ),
    [[], [6, 4]]
  );
});

test("atomically replaces field dash with a constant and removes its legend", () => {
  const field = createLegendMeanLine()
    .encodeStrokeDash({ field: "origin", scale: { id: "originDash" } })
    .createLegend();
  const constant = field.encodeStrokeDash({ value: "dotted" });

  assert.deepEqual(constant.semanticSpec.layers[0].encoding.strokeDash, {
    datum: "dotted"
  });
  assert.equal(
    constant.semanticSpec.scales.some(scale => scale.id === "originDash"),
    true
  );
  assert.equal(constant.semanticSpec.guides.legend, undefined);
  assert.equal(constant.guideConfigs.legend, undefined);
  assert.equal(
    constant.graphicSpec.order.some(id => id.startsWith("seriesLegend")),
    false
  );
  assert.equal(constant.graphicSpec.objects.trends.items.length, 1);
  assert.deepEqual(
    constant.graphicSpec.objects.trends.items[0].properties.strokeDash,
    [1, 3]
  );
  assert.deepEqual(
    constant.trace.children.at(-1).children.map(child => child.op),
    [
      "clearStrokeDashEncoding",
      "editSemantic",
      "removeCategoricalLegend",
      "rematerializeLineMark"
    ]
  );
  const clearNode = constant.trace.children.at(-1).children[0];
  assert.deepEqual(clearNode.children.map(child => child.op), ["editSemantic"]);
  assert.deepEqual(clearNode.children[0].args, {
    property: "layer[trends].encoding.strokeDash",
    remove: true
  });
  const removeNode = constant.trace.children.at(-1).children[2];
  assert.equal(removeNode.children[0].op, "editSemantic");
  assert.equal(
    removeNode.children.filter(child => child.op === "editGraphics").length > 0,
    true
  );
  assert.deepEqual(field.semanticSpec.guides.legend.series.channels, ["strokeDash"]);
});

test("preserves a combined legend when dash becomes constant", () => {
  const before = createLegendMeanLine()
    .encodeColor({ field: "origin" })
    .encodeStrokeDash({ field: "origin" })
    .createLegend({
      title: "Series",
      labels: { color: "#123456" }
    });
  const after = before.encodeStrokeDash({ value: [2, 5] });

  assert.deepEqual(after.semanticSpec.guides.legend.series, {
    channels: ["color"],
    scales: ["color"],
    title: "Series"
  });
  assert.equal(after.guideConfigs.legend.series.title, "Series");
  assert.equal(after.guideConfigs.legend.series.labels.color, "#123456");
  assert.deepEqual(
    after.graphicSpec.objects.seriesLegendSymbols.items.map(
      child => child.properties.strokeDash
    ),
    [[], []]
  );
  assert.deepEqual(
    after.graphicSpec.objects.trends.items.map(
      child => child.properties.strokeDash
    ),
    [[2, 5], [2, 5]]
  );
});

test("reassigns dash and group fields without retaining stale bindings", () => {
  const dashed = createLegendMeanLine()
    .encodeStrokeDash({ field: "origin", scale: { id: "originDash" } })
    .createLegend({ labels: { color: "#123456" } })
    .encodeStrokeDash({ field: "cylinders" });
  const grouped = createMeanLine()
    .encodeGroup({ field: "origin" })
    .encodeGroup({ field: "cylinders" });

  assert.deepEqual(dashed.semanticSpec.layers[0].encoding.strokeDash, {
    field: "cylinders",
    fieldType: "nominal",
    scale: "strokeDash"
  });
  assert.deepEqual(
    dashed.semanticSpec.scales.map(scale => scale.id),
    ["x", "y", "originDash", "strokeDash"]
  );
  assert.equal(dashed.semanticSpec.guides.legend.series.title, "cylinders");
  assert.equal(dashed.guideConfigs.legend.series.labels.color, "#123456");
  assert.deepEqual(grouped.semanticSpec.layers[0].encoding.group, {
    field: "cylinders",
    fieldType: "nominal"
  });
  assert.equal(grouped.graphicSpec.objects.trends.items.length, 2);
});

test("rejects incompatible line series fields and invalid constant dash", () => {
  const color = createMeanLine().encodeColor({ field: "origin" });
  const group = createMeanLine().encodeGroup({ field: "origin" });
  const dash = createMeanLine().encodeStrokeDash({ field: "origin" });

  assert.throws(
    () => color.encodeGroup({ field: "cylinders" }),
    /must match color field/
  );
  assert.throws(
    () => group.encodeStrokeDash({ field: "cylinders" }),
    /must match group field/
  );
  assert.throws(
    () => dash.encodeColor({ field: "cylinders" }),
    /must match strokeDash field/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({}),
    /exactly one/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ field: "origin", value: "solid" }),
    /exactly one/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ value: "unknown" }),
    /Unknown stroke dash style/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ value: [2] }),
    /even-length/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ value: [0, 0] }),
    /nonzero even-length/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ value: "solid", scale: {} }),
    /does not accept/
  );
  assert.deepEqual(color.semanticSpec.layers[0].encoding.color.field, "origin");
});

test("reapplies semantic series styles after Canvas geometry changes", () => {
  const encoded = createMeanLine()
    .encodeColor({ field: "origin" })
    .encodeStrokeDash({ field: "origin" });
  const manuallyChanged = encoded
    .editGraphics({ target: "trends", property: "stroke", value: "black" })
    .editGraphics({
      target: "trends",
      property: "strokeDash",
      value: [[1, 1], [1, 1]]
    });
  const resized = manuallyChanged.editCanvas({ width: 440 });

  assert.deepEqual(
    resized.graphicSpec.objects.trends.items.map(path => path.properties.stroke),
    TABLEAU10.slice(0, 2)
  );
  assert.deepEqual(
    resized.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeDash
    ),
    DASH10.slice(0, 2)
  );

  const constant = encoded
    .encodeStrokeDash({ value: "dashdot" })
    .editCanvas({ width: 460 });
  assert.deepEqual(
    constant.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeDash
    ),
    [[6, 3, 1, 3], [6, 3, 1, 3]]
  );

  const reassigned = createMeanLine()
    .encodeStrokeDash({ field: "origin", scale: { id: "originDash" } })
    .encodeStrokeDash({ field: "cylinders" })
    .editCanvas({ width: 480 });
  assert.deepEqual(
    reassigned.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeDash
    ),
    DASH10.slice(0, 2)
  );
});

test("validates line series encoding options and ranges", () => {
  assert.throws(
    () => createMeanLine().encodeColor({
      field: "origin",
      scale: { palette: "tableau10", range: ["red"] }
    }),
    /both palette and range/
  );
  assert.throws(
    () => createMeanLine().encodeColor({
      field: "origin",
      scale: { palette: "unknown" }
    }),
    /Unknown palette/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({
      field: "origin",
      scale: { range: [[3]] }
    }),
    /even-length/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ field: "missing" }),
    /nominal value/
  );
  assert.throws(
    () => chart()
      .createCanvas({ width: 240, height: 160, margin: 20 })
      .createData({ id: "data", values: rows })
      .createPointMark({ id: "points" })
      .encodeStrokeDash({ field: "origin" }),
    /line or rule mark requires an eligible layer/
  );
});
