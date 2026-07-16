import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", lower: 2, upper: 6, middle: 4 }),
  Object.freeze({ group: "B", lower: 4, upper: 8, middle: 5 })
]);

function rangedBar() {
  return chart()
    .createCanvas({ width: 150, height: 150 })
    .createData({ values: rows })
    .createBarMark({ id: "range" })
    .encodeX({ target: "range", field: "group", fieldType: "nominal" })
    .encodeY({ target: "range", field: "lower" })
    .encodeY2({ target: "range", field: "upper" })
    .encodeBarWidth({ target: "range", band: 0.5 });
}

test("materializes a nominal-category ranged bar and removes stale aggregate state", () => {
  const program = rangedBar();
  const layer = program.semanticSpec.layers[0];
  const rectangles = program.graphicSpec.objects.range.children;

  assert.equal(layer.encoding.y.aggregate, undefined);
  assert.equal(layer.encoding.y.stack, undefined);
  assert.equal(layer.encoding.y2.field, "upper");
  assert.equal(rectangles.length, 2);
  assert.deepEqual(
    rectangles.map(rect => rect.properties.width),
    rectangles.map(() => program.resolvedScales.x.bandwidth * 0.5)
  );
  assert.ok(rectangles.every(rect => rect.properties.height > 0));
  assert.deepEqual(rectangles.map(rect => rect.properties.opacity), [1, 1]);
});

test("supports atomic range encoding, pixel width, and Canvas rematerialization", () => {
  const base = chart()
    .createCanvas({ width: 150, height: 150 })
    .createData({ values: rows })
    .createBarMark({ id: "range" })
    .encodeX({ target: "range", field: "group", fieldType: "ordinal" });
  const ranged = base
    .encodeYRange({ target: "range", lower: "lower", upper: "upper" })
    .encodeBarWidth({ target: "range", pixels: 18 });
  const resized = ranged.editCanvas({ width: 250 });

  assert.deepEqual(
    ranged.trace.children.at(-2).children.map(node => node.op),
    ["encodeY", "encodeY2"]
  );
  assert.deepEqual(
    ranged.graphicSpec.objects.range.children.map(rect => rect.properties.width),
    [18, 18]
  );
  assert.deepEqual(
    resized.graphicSpec.objects.range.children.map(rect => rect.properties.width),
    [18, 18]
  );
  assert.notDeepEqual(
    resized.graphicSpec.objects.range.children.map(rect => rect.properties.x),
    ranged.graphicSpec.objects.range.children.map(rect => rect.properties.x)
  );
});

test("spans a median rule across the rematerialized box body", () => {
  const body = rangedBar();
  let program = body
    .createRuleMark({ id: "median", data: "data" })
    .encodeX({ target: "median", field: "group", fieldType: "nominal", scale: { id: "x" } })
    .encodeY({ target: "median", field: "middle", fieldType: "quantitative", scale: { id: "y" } });
  program = program
    ._withMarkConfig("median", {
      ...program.materializationConfigs.marks.median,
      boxSpanOwner: "range"
    })
    .rematerializeRuleMark({ id: "median" });

  const rectangles = program.graphicSpec.objects.range.children;
  const medians = program.graphicSpec.objects.median.children;
  assert.deepEqual(
    medians.map(line => [line.properties.x1, line.properties.x2]),
    rectangles.map(rect => [rect.properties.x, rect.properties.x + rect.properties.width])
  );

  const resized = program.editCanvas({ width: 250 });
  assert.deepEqual(
    resized.graphicSpec.objects.median.children.map(line => [line.properties.x1, line.properties.x2]),
    resized.graphicSpec.objects.range.children.map(rect => [
      rect.properties.x,
      rect.properties.x + rect.properties.width
    ])
  );
});
