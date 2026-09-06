import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { x: 1, y: 4, value: 10, cylinders: 4 },
  { x: 2, y: 3, value: 12, cylinders: 6 },
  { x: 3, y: 2, value: 18, cylinders: 8 },
  { x: 4, y: 1, value: 20, cylinders: 4 }
];

test("maps numeric ordinal point categories in first-appearance order", () => {
  const program = chart()
    .createCanvas({
      width: 340,
      height: 160,
      margin: { top: 20, right: 130, bottom: 20, left: 20 }
    })
    .createData({ id: "cars", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "cylinders",
      fieldType: "ordinal",
      scale: { palette: "reds" }
    })
    .createLegend();

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "cylinders",
    fieldType: "ordinal",
    scale: "color"
  });
  assert.deepEqual(program.resolvedScales.color.domain, [4, 6, 8]);
  assert.equal(new Set(
    program.graphicSpec.objects.points.items.map(item => item.properties.fill)
  ).size, 3);
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.items.map(
      item => item.properties.text
    ),
    ["4", "6", "8"]
  );
});

test("uses numeric ordinal categories as histogram stack partitions", () => {
  const program = chart()
    .createCanvas({
      width: 280,
      height: 180,
      margin: { top: 20, right: 70, bottom: 30, left: 35 }
    })
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "value", maxBins: 3 })
    .encodeColor({
      field: "cylinders",
      fieldType: "ordinal",
      scale: { palette: "reds" }
    })
    .createLegend();

  assert.equal(program.semanticSpec.layers[0].layout.mode, "stack");
  assert.deepEqual(program.resolvedScales.color.domain, [4, 6, 8]);
  assert.ok(program.graphicSpec.objects.bars.items.length > 0);
  assert.equal(
    new Set(program.graphicSpec.objects.bars.items.map(
      item => item.properties.fill
    )).size,
    3
  );
});

test("rejects non-categorical field types without mutating the source program", () => {
  const before = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });

  assert.throws(
    () => before.encodeColor({ field: "cylinders", fieldType: "ordered" }),
    /Unsupported color field type/
  );
  assert.equal(before.semanticSpec.layers[0].encoding.color, undefined);
});
