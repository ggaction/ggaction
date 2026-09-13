import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const DETAILS = Object.freeze({
  lineCap: "round",
  lineJoin: "bevel",
  miterLimit: 4
});

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 2, y2: 0, category: "A", value: 2 }),
  Object.freeze({ x: 1, y: 4, y2: 1, category: "B", value: 4 })
]);

function base() {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "values", values: rows });
}

function assertDetails(properties) {
  assert.equal(properties.lineCap, DETAILS.lineCap);
  assert.equal(properties.lineJoin, DETAILS.lineJoin);
  assert.equal(properties.miterLimit, DETAILS.miterLimit);
}

test("stores and rematerializes stroke details for every strokable public mark", () => {
  const programs = [
    base()
      .createPointMark({ id: "mark", stroke: "black", ...DETAILS })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" }),
    base()
      .createTickMark({ id: "mark", ...DETAILS })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" }),
    base()
      .createLineMark({ id: "mark", ...DETAILS })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" }),
    base()
      .createAreaMark({ id: "mark", stroke: "black", ...DETAILS })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeY2({ field: "y2" }),
    base()
      .createRuleMark({ id: "mark", ...DETAILS })
      .encodeX({ datum: 0.5, fieldType: "quantitative" }),
    base()
      .createArcMark({ id: "mark", ...DETAILS })
      .encodeTheta({ field: "value" })
  ];

  for (const program of programs) {
    assertDetails(program.markConfigs.mark);
    assert.ok(program.graphicSpec.objects.mark.items.length > 0);
    for (const item of program.graphicSpec.objects.mark.items) {
      assertDetails(item.properties);
    }
    const resized = program.editCanvas({ width: 280 });
    assertDetails(resized.markConfigs.mark);
    for (const item of resized.graphicSpec.objects.mark.items) {
      assertDetails(item.properties);
    }
  }
});

test("rounds Rect items through deterministic paths and returns to homogeneous rects", () => {
  const rounded = base()
    .createRectMark({
      id: "cells",
      cornerRadius: 50,
      stroke: "black",
      ...DETAILS
    })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "category", fieldType: "nominal" });
  const owner = rounded.graphicSpec.objects.cells;
  const ids = owner.items.map(item => item.id);

  assert.equal(owner.type, "collection");
  assert.equal(owner.items.every(item => item.type === "path"), true);
  assert.equal(owner.items.every(item => item.properties.commands.length === 10), true);
  assertDetails(owner.items[0].properties);
  assert.equal(rounded.markConfigs.cells.cornerRadius, 50);

  const reset = rounded.editRectMark({ target: "cells", cornerRadius: 0 });
  assert.equal(reset.graphicSpec.objects.cells.type, "rect");
  assert.deepEqual(reset.graphicSpec.objects.cells.items.map(item => item.id), ids);
  assert.equal(reset.graphicSpec.objects.cells.items.every(
    item => item.properties.commands === undefined
  ), true);
  assertDetails(reset.graphicSpec.objects.cells.items[0].properties);
  assert.equal(reset.markConfigs.cells.cornerRadius, 0);

  const restored = reset.editRectMark({ target: "cells", cornerRadius: 50 });
  assert.equal(restored.graphicSpec.objects.cells.type, "collection");
  assert.deepEqual(restored.graphicSpec.objects.cells.items.map(item => item.id), ids);
  assert.equal(restored.graphicSpec.objects.cells.items.every(
    item => item.type === "path" && item.properties.commands.length === 10
  ), true);
});

test("rounds Bar items, preserves item identity, and restores the rect owner", () => {
  const rounded = base()
    .createBarMark({
      id: "bars",
      cornerRadius: 12,
      stroke: "black",
      ...DETAILS
    })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" });
  const owner = rounded.graphicSpec.objects.bars;
  const ids = owner.items.map(item => item.id);

  assert.equal(owner.type, "collection");
  assert.equal(owner.items.every(item => item.type === "path"), true);
  assert.equal(owner.items.every(item => item.properties.commands.length === 10), true);
  assertDetails(owner.items[0].properties);
  assert.deepEqual(rounded.markConfigs.bars.barAppearance, {
    cornerRadius: 12,
    stroke: "black",
    ...DETAILS
  });

  const reset = rounded.editBarMark({ target: "bars", cornerRadius: 0 });
  assert.equal(reset.graphicSpec.objects.bars.type, "rect");
  assert.deepEqual(reset.graphicSpec.objects.bars.items.map(item => item.id), ids);
  assert.equal(reset.graphicSpec.objects.bars.items.every(
    item => item.properties.commands === undefined
  ), true);
  assertDetails(reset.graphicSpec.objects.bars.items[0].properties);
});

test("preserves requested stroke details while an outline is disabled", () => {
  const styled = base()
    .createPointMark({ id: "points", stroke: "black", ...DETAILS })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const disabled = styled.editPointMark({ target: "points", stroke: false });
  const restored = disabled.editPointMark({ target: "points", stroke: "black" });

  assertDetails(disabled.markConfigs.points);
  assertDetails(disabled.graphicSpec.objects.points.items[0].properties);
  assert.equal(disabled.graphicSpec.objects.points.items[0].properties.stroke, "transparent");
  assertDetails(restored.markConfigs.points);
  assertDetails(restored.graphicSpec.objects.points.items[0].properties);
});

test("rejects invalid and unsupported shape details before resolving targets", () => {
  const program = base();
  const before = JSON.stringify(program);

  for (const [invoke, ErrorClass, message] of [
    [() => program.createLineMark({ lineCap: "flat" }), Error, /createLineMark lineCap/],
    [() => program.createAreaMark({ lineJoin: "sharp" }), Error, /createAreaMark lineJoin/],
    [() => program.createRuleMark({ miterLimit: 0 }), RangeError, /miterLimit/],
    [() => program.createTickMark({ miterLimit: Number.NaN }), TypeError, /miterLimit/],
    [() => program.createBarMark({ cornerRadius: -1 }), RangeError, /cornerRadius/],
    [() => program.createRectMark({ cornerRadius: Infinity }), TypeError, /cornerRadius/],
    [() => program.createPointMark({ cornerRadius: 2 }), Error, /Unknown createPointMark option/],
    [() => program.createTextMark({ lineJoin: "round" }), Error, /Unknown createTextMark option/]
  ]) {
    assert.throws(invoke, error => {
      assert.equal(error instanceof ErrorClass, true);
      assert.match(error.message, message);
      return true;
    });
    assert.equal(JSON.stringify(program), before);
  }
});

test("keeps rounded Bar and Rect marks compatible with later encodings", () => {
  const bar = base()
    .createBarMark({ id: "bars", cornerRadius: 8, ...DETAILS })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" })
    .encodeColor({ field: "category", layout: "group" });
  const rect = base()
    .createRectMark({ id: "cells", cornerRadius: 8, ...DETAILS })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "category", fieldType: "nominal" })
    .encodeColor({ field: "value", fieldType: "quantitative" });

  for (const [program, id] of [[bar, "bars"], [rect, "cells"]]) {
    assert.equal(program.graphicSpec.objects[id].type, "collection");
    assert.equal(program.graphicSpec.objects[id].items.every(
      item => item.type === "path" && item.properties.commands.length === 10
    ), true);
    assertDetails(program.graphicSpec.objects[id].items[0].properties);
  }
});

test("derives selections, highlights, and source-owned labels from rounded rectangles", () => {
  for (const [kind, program] of [
    ["Bar", base()
      .createBarMark({ id: "mark", cornerRadius: 9, ...DETAILS })
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value" })],
    ["Rect", base()
      .createRectMark({ id: "mark", cornerRadius: 9, ...DETAILS })
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "category", fieldType: "nominal" })]
  ]) {
    const labelled = program.createTextMark({
      id: "labels",
      source: "mark",
      text: "label"
    });
    const highlighted = program
      .selectMarks({ id: "largest", target: "mark", field: "value", op: "max" })
      .highlightMarks({ selection: "largest", color: "#dc2626" });

    assert.equal(labelled.graphicSpec.objects.labels.items.length, rows.length, kind);
    assert.equal(labelled.graphicSpec.objects.labels.items.every(item =>
      Number.isFinite(item.properties.x) && Number.isFinite(item.properties.y)
    ), true, kind);
    assert.equal(highlighted.graphicSpec.objects.mark.type, "collection", kind);
    assert.equal(highlighted.graphicSpec.objects.mark.items.every(item =>
      item.type === "path" && item.properties.commands.length === 10
    ), true, kind);
    assertDetails(highlighted.graphicSpec.objects.mark.items.at(-1).properties);
    assert.equal(
      highlighted.graphicSpec.objects.mark.items.at(-1).properties.fill,
      "#dc2626",
      kind
    );
  }
});

test("inherits detailed source style into inferred categorical legends", () => {
  const rounded = base()
    .editCanvas({
      width: 500,
      margin: { top: 40, right: 140, bottom: 60, left: 60 }
    })
    .createBarMark({
      id: "bars",
      cornerRadius: 7,
      stroke: "black",
      ...DETAILS
    })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" })
    .encodeColor({ field: "category", layout: "group" })
    .createLegend({ target: "bars", channels: ["color"] });
  const symbols = rounded.graphicSpec.objects.colorLegendSymbols;

  assert.equal(rounded.guideConfigs.legend.color.inferredSymbol, true);
  assert.equal(symbols.type, "collection");
  assert.equal(symbols.items.every(item =>
    item.type === "path" && item.properties.commands.length === 10
  ), true);
  assertDetails(symbols.items[0].properties);

  const overridden = rounded.editLegendBlock({
    target: "bars",
    channel: "color",
    symbol: { stroke: "#111827" }
  });
  assert.equal(
    overridden.graphicSpec.objects.colorLegendSymbols.items[0].properties.stroke,
    "#111827"
  );
  assertDetails(
    overridden.graphicSpec.objects.colorLegendSymbols.items[0].properties
  );

  const reset = overridden.editBarMark({ target: "bars", cornerRadius: 0 });
  assert.equal(reset.graphicSpec.objects.colorLegendSymbols.type, "rect");
  assert.equal(
    reset.graphicSpec.objects.colorLegendSymbols.items[0].properties.commands,
    undefined
  );
  assert.equal(
    reset.graphicSpec.objects.colorLegendSymbols.items[0].properties.stroke,
    "#111827"
  );
  assertDetails(reset.graphicSpec.objects.colorLegendSymbols.items[0].properties);
});

test("inherits line details into series legends without extending legend recipes", () => {
  const legendRows = [
    { x: 0, y: 1, category: "A" },
    { x: 1, y: 2, category: "A" },
    { x: 0, y: 3, category: "B" },
    { x: 1, y: 4, category: "B" }
  ];
  const source = chart()
    .createCanvas({
      width: 500,
      height: 300,
      margin: { top: 40, right: 140, bottom: 60, left: 60 }
    })
    .createData({ id: "values", values: legendRows });
  const line = source
    .createLineMark({ id: "lines", ...DETAILS })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "category" })
    .encodeColor({ field: "category" })
    .createLegend({ target: "lines", channels: ["color"] });

  assertDetails(line.graphicSpec.objects.seriesLegendSymbols.items[0].properties);
  for (const symbol of [
    { cornerRadius: 2 },
    { lineCap: "round" }
  ]) {
    assert.throws(
      () => source
        .createBarMark({ id: "bars" })
        .encodeX({ field: "category", fieldType: "nominal" })
        .encodeY({ field: "y" })
        .encodeColor({ field: "category", layout: "group" })
        .createLegend({ symbol }),
      /Unknown createLegend\.symbol option/
    );
  }
});
