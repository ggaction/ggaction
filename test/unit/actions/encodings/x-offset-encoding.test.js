import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 2, sex: "men" },
  { year: 1850, perc: 4, sex: "women" },
  { year: 1860, perc: 8, sex: "men" },
  { year: 1860, perc: 10, sex: "women" }
];

function aggregateBarProgram() {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" });
}

function groupedBarProgram() {
  return aggregateBarProgram()
    .encodeColor({ field: "sex", layout: "group" });
}

test("encodes a nominal xOffset inside each ordinal x band", () => {
  const before = aggregateBarProgram();
  const program = before.encodeXOffset({ field: "sex" });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.xOffset, {
    field: "sex",
    fieldType: "nominal",
    scale: "xOffset"
  });
  assert.deepEqual(program.semanticSpec.scales[2], {
    id: "xOffset",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  });
  assert.deepEqual(program.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["men", "women"],
    range: [0, 160],
    step: 80,
    start: 0,
    bandwidth: 80,
    paddingInner: 0,
    paddingOuter: 0
  });
  assert.deepEqual(program.markConfigs.bars.xOffset, {
    paddingInner: 0,
    paddingOuter: 0
  });
  assert.equal(program.graphicSpec.objects.bars.items.length, 4);
  assert.equal(before.semanticSpec.layers[0].encoding.xOffset, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeXOffset");
  assert.equal(node.children.find(child => child.op === "layoutSeries").args.mode, "group");
});

test("supports explicit xOffset domain order and reversed range", () => {
  const program = aggregateBarProgram().encodeXOffset({
    field: "sex",
    scale: {
      id: "group",
      domain: ["women", "men"],
      range: [100, 0]
    }
  });

  assert.deepEqual(program.resolvedScales.group, {
    type: "ordinal",
    domain: ["women", "men"],
    range: [100, 0],
    step: -50,
    start: 100,
    bandwidth: 50,
    paddingInner: 0,
    paddingOuter: 0
  });
});

test("applies inner and outer padding to automatic group slots", () => {
  const program = groupedBarProgram()
    .encodeBarWidth()
    .encodeXOffset({
      field: "sex",
      paddingInner: 0.2,
      paddingOuter: 0.1
    });

  assert.deepEqual(program.markConfigs.bars.xOffset, {
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  assert.deepEqual(program.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["men", "women"],
    range: [0, 160],
    step: 80,
    start: 8,
    bandwidth: 64,
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  assert.deepEqual(
    program.graphicSpec.objects.bars.items.map(
      child => Number(child.properties.width.toFixed(6))
    ),
    [46.08, 46.08, 46.08, 46.08]
  );
});

test("preserves padding across same-field scale edits and supports reversed ranges", () => {
  const padded = groupedBarProgram().encodeXOffset({
    field: "sex",
    paddingInner: 0.2,
    paddingOuter: 0.1,
    scale: { range: [100, 0] }
  });
  const edited = padded.encodeXOffset({
    field: "sex",
    scale: { range: [80, 0] }
  });

  assert.deepEqual(padded.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["men", "women"],
    range: [100, 0],
    step: -50,
    start: 95,
    bandwidth: 40,
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  assert.deepEqual(edited.markConfigs.bars.xOffset, {
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  assert.equal(edited.resolvedScales.xOffset.step, -40);
  assert.equal(edited.resolvedScales.xOffset.bandwidth, 32);
});

test("converges when width and offset padding are authored in either order", () => {
  const padding = {
    field: "sex",
    paddingInner: 0.2,
    paddingOuter: 0.1
  };
  const first = groupedBarProgram()
    .encodeBarWidth({ pixels: 14 })
    .encodeXOffset(padding);
  const second = groupedBarProgram()
    .encodeXOffset(padding)
    .encodeBarWidth({ pixels: 14 });

  assert.deepEqual(first.semanticSpec, second.semanticSpec);
  assert.deepEqual(first.graphicSpec, second.graphicSpec);
  assert.deepEqual(first.materializationConfigs, second.materializationConfigs);
});

test("rejects conflicting padding policies on one shared offset scale", () => {
  let program = chart()
    .createCanvas({ width: 420, height: 300 })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "left" })
    .encodeX({ target: "left", field: "year", fieldType: "ordinal", scale: { id: "leftX" } })
    .encodeY({ target: "left", field: "perc", scale: { id: "leftY" } })
    .encodeColor({ target: "left", field: "sex", layout: "group", scale: { id: "leftColor" } })
    .encodeBarWidth({ target: "left" })
    .createBarMark({ id: "right" })
    .encodeX({ target: "right", field: "year", fieldType: "ordinal", scale: { id: "rightX" } })
    .encodeY({ target: "right", field: "perc", scale: { id: "rightY" } })
    .encodeColor({ target: "right", field: "sex", layout: "group", scale: { id: "rightColor" } })
    .encodeBarWidth({ target: "right" });

  assert.throws(
    () => program.encodeXOffset({
      target: "right",
      field: "sex",
      paddingInner: 0.2
    }),
    /one shared padding policy/
  );
  assert.deepEqual(program.markConfigs.right.xOffset, {
    paddingInner: 0,
    paddingOuter: 0
  });
});

test("rematerializes an automatic xOffset range after Canvas edits", () => {
  const program = aggregateBarProgram().encodeXOffset({ field: "sex" });
  const edited = program.editCanvas({ width: 620 });

  assert.deepEqual(edited.resolvedScales.x.range, [60, 580]);
  assert.deepEqual(edited.resolvedScales.xOffset.range, [0, 260]);
  assert.equal(edited.resolvedScales.xOffset.bandwidth, 130);
  assert.deepEqual(program.resolvedScales.xOffset.range, [0, 160]);
});

test("dodges point rows within categorical x slots and tracks parent scale edits", () => {
  const base = chart()
    .createCanvas({
      width: 400,
      height: 300,
      margin: { top: 20, right: 20, bottom: 40, left: 40 }
    })
    .createData({ values: [
      { category: "A", model: "one", value: 1 },
      { category: "A", model: "two", value: 2 },
      { category: "B", model: "one", value: 3 },
      { category: "B", model: "two", value: 4 }
    ] })
    .createPointMark()
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value" })
    .encodeXOffset({
      field: "model",
      paddingInner: 0.2,
      paddingOuter: 0.1
    });
  const resized = base.editCanvas({ width: 600 });
  const repadded = base.editScale({ id: "x", padding: 1 });

  assert.deepEqual(
    base.graphicSpec.objects.point.items.map(item => item.properties.x),
    [82.5, 167.5, 252.5, 337.5]
  );
  assert.deepEqual(base.resolvedScales.xOffset.range, [0, 170]);
  assert.deepEqual(
    resized.graphicSpec.objects.point.items.map(item => item.properties.x),
    [107.5, 242.5, 377.5, 512.5]
  );
  assert.deepEqual(resized.resolvedScales.xOffset.range, [0, 270]);
  assert.deepEqual(repadded.resolvedScales.xOffset.range, [0, 340 / 3]);
  assert.notDeepEqual(
    repadded.graphicSpec.objects.point.items.map(item => item.properties.x),
    base.graphicSpec.objects.point.items.map(item => item.properties.x)
  );
});

test("supports explicit reversed point offset ranges and rejects numeric parents", () => {
  const rows = [
    { category: "A", model: "one", value: 1 },
    { category: "A", model: "two", value: 2 }
  ];
  const categorical = chart()
    .createCanvas({ width: 300, height: 200 })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value" });
  const reversed = categorical.encodeXOffset({
    field: "model",
    scale: { range: [100, 0] }
  });
  const x = reversed.graphicSpec.objects.point.items.map(
    item => item.properties.x
  );

  assert.equal(x[0] > x[1], true);
  assert.throws(
    () => chart()
      .createCanvas({ width: 300, height: 200 })
      .createData({ values: rows })
      .createPointMark()
      .encodeX({ field: "value" })
      .encodeY({ field: "value" })
      .encodeXOffset({ field: "model" }),
    /x category encoding/
  );
});

test("validates xOffset prerequisites, fields, and scale options", () => {
  const program = aggregateBarProgram();

  assert.throws(() => program.encodeXOffset(), /non-empty string/i);
  assert.throws(
    () => program.encodeXOffset({ field: "missing" }),
    /nominal value/
  );
  for (const paddingInner of [-1, 1, Infinity, NaN]) {
    assert.throws(
      () => groupedBarProgram().encodeXOffset({ field: "sex", paddingInner }),
      /paddingInner/
    );
  }
  for (const paddingOuter of [-1, Infinity, NaN]) {
    assert.throws(
      () => groupedBarProgram().encodeXOffset({ field: "sex", paddingOuter }),
      /paddingOuter/
    );
  }
  assert.throws(
    () => groupedBarProgram().encodeXOffset({
      field: "sex",
      paddingOuter: Number.MAX_VALUE
    }),
    /positive bandwidth/
  );
  assert.throws(
    () => groupedBarProgram().encodeXOffset({ field: "other" }),
    /nominal value/
  );
  assert.throws(
    () => program.encodeXOffset({ field: "sex", fieldType: "quantitative" }),
    /Unsupported categorical field type/
  );
  assert.throws(
    () => program.encodeXOffset({ field: "sex", scale: { type: "linear" } }),
    /Unsupported color scale type/
  );
  assert.throws(
    () => program.encodeXOffset({ field: "sex", scale: { domain: ["men"] } }),
    /outside the ordinal domain/
  );

  const incomplete = chart()
    .createCanvas({ width: 200, height: 200 })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" });
  assert.throws(
    () => incomplete.encodeXOffset({ field: "sex" }),
    /complete bar with a x category encoding/
  );
  assert.equal(program.semanticSpec.layers[0].encoding.xOffset, undefined);
});
