import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { linearCommandPoints } from "../../../support/path.js";

const rows = Object.freeze([
  Object.freeze({ id: "north", x: 0, y: 0, angle: 0, group: "A" }),
  Object.freeze({ id: "east", x: 10, y: 10, angle: 90, group: "B" })
]);

function base() {
  return chart()
    .createCanvas({ width: 100, height: 100, margin: 10 })
    .createData({ id: "rows", values: rows });
}

function tick() {
  return base()
    .createTickMark({ id: "ticks" })
    .encodeX({ target: "ticks", field: "x" })
    .encodeY({ target: "ticks", field: "y" });
}

function triangle() {
  return base()
    .createPointMark({ id: "points", shape: "triangle-up" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });
}

function segmentLength(item) {
  const { x1, y1, x2, y2 } = item.properties;
  return Math.hypot(x2 - x1, y2 - y1);
}

function polygonArea(item) {
  const points = linearCommandPoints(item.properties.commands);
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

test("assigns direct field degrees to centered Tick endpoints", () => {
  const before = tick();
  const encoded = before.encodeAngle({ field: "angle" });
  const [north, east] = encoded.graphicSpec.objects.ticks.items;

  assert.deepEqual(encoded.semanticSpec.layers[0].encoding.angle, {
    field: "angle",
    fieldType: "quantitative"
  });
  assert.equal(north.properties.x1, north.properties.x2);
  assert.equal(east.properties.y1, east.properties.y2);
  assert.equal(segmentLength(north), 14);
  assert.equal(segmentLength(east), 14);
  assert.equal(before.semanticSpec.layers[0].encoding.angle, undefined);
});

test("rotates point paths clockwise while preserving equal area", () => {
  const encoded = triangle().encodeAngle({ field: "angle" });
  const [north, east] = encoded.graphicSpec.objects.points.items;
  const northTip = linearCommandPoints(north.properties.commands)[0];
  const eastTip = linearCommandPoints(east.properties.commands)[0];

  assert.equal(encoded.graphicSpec.objects.points.type, "collection");
  assert.equal(northTip.y < 90, true);
  assert.equal(eastTip.x > 90, true);
  assert.equal(Math.abs(polygonArea(north) - polygonArea(east)) < 1e-9, true);
});

test("reassigns constant and field angle atomically and removes to baseline", () => {
  const field = tick().encodeAngle({ field: "angle" });
  const constant = field.encodeAngle({ value: -45 });
  const reassigned = constant.encodeAngle({ field: "angle" });
  const removed = reassigned.removeEncoding({ channel: "angle" });

  assert.deepEqual(constant.semanticSpec.layers[0].encoding.angle, { datum: -45 });
  assert.deepEqual(reassigned.graphicSpec, field.graphicSpec);
  assert.equal(removed.semanticSpec.layers[0].encoding.angle, undefined);
  assert.equal(removed.graphicSpec.objects.ticks.items.every(item =>
    item.properties.x1 === item.properties.x2
  ), true);
  assert.deepEqual(field.semanticSpec.layers[0].encoding.angle, {
    field: "angle",
    fieldType: "quantitative"
  });
});

test("preserves direction through Canvas, filter, facet, and highlight replay", () => {
  const encoded = tick().encodeAngle({ field: "angle" });
  const highlighted = encoded.highlightMarks({
    select: { field: "id", op: "eq", value: "east" },
    stroke: "#dc2626"
  });
  const resized = highlighted.editCanvas({ width: 120 });
  const filtered = encoded.filterMarks({
    target: "ticks",
    field: "id",
    op: "eq",
    value: "east"
  });
  const faceted = encoded.facet({ field: "group", columns: 2 });

  assert.equal(resized.graphicSpec.objects.ticks.items[1].properties.y1,
    resized.graphicSpec.objects.ticks.items[1].properties.y2);
  assert.equal(resized.graphicSpec.objects.ticks.items[1].properties.stroke,
    "#dc2626");
  assert.equal(filtered.graphicSpec.objects.ticks.items.length, 1);
  assert.equal(filtered.graphicSpec.objects.ticks.items[0].properties.y1,
    filtered.graphicSpec.objects.ticks.items[0].properties.y2);
  assert.deepEqual(
    Object.values(faceted.children).map(child =>
      child.semanticSpec.layers[0].encoding.angle.field
    ),
    ["angle", "angle"]
  );
});

test("rejects invalid angle assignments and unsupported marks without mutation", () => {
  const original = tick();
  const invalidRows = chart()
    .createCanvas({ width: 100, height: 100, margin: 10 })
    .createData({ values: [{ x: 1, y: 1, angle: null }] })
    .createTickMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const line = base()
    .createLineMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });

  assert.throws(() => original.encodeAngle({}), /exactly one/);
  assert.throws(
    () => original.encodeAngle({ value: 0, field: "angle" }),
    /exactly one/
  );
  assert.throws(() => original.encodeAngle({ value: Infinity }), /finite/);
  assert.throws(
    () => original.encodeAngle({ field: "angle", fieldType: "nominal" }),
    /quantitative/
  );
  assert.throws(() => invalidRows.encodeAngle({ field: "angle" }), /finite number/);
  assert.throws(() => line.encodeAngle({ value: 45 }), /point or Tick mark/);
  assert.equal(original.semanticSpec.layers[0].encoding.angle, undefined);
});
