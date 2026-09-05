import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsRegressionScatterplotValues } from
  "../../../charts/cars-regression-scatterplot/reference-values.js";

const values = [
  { x: 0, y: 2, group: "A", amount: 4 },
  { x: 10, y: 8, group: "B", amount: 16 }
];

function base() {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values })
    .createPointMark({ id: "points" });
}

function encoded(program) {
  return program
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeSize({ field: "amount", scale: { range: [25, 100] } })
    .encodeShape({ field: "group" })
    .encodeOpacity({ value: 0.4 });
}

test("constant opacity removes only the target owner's opacity legend", () => {
  const source = base()
    .editCanvas({ width: 400, height: 300, margin: { left: 20, right: 150, top: 20, bottom: 20 } })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeOpacity({ field: "amount" })
    .createOpacityLegend();
  for (const shared of [false, true]) {
    let other = source.createPointMark({ id: "other", data: "data" })
      .encodeX({ field: "x" }).encodeY({ field: "y" });
    if (shared) other = other.encodeOpacity({ field: "amount" });
    const snapshot = JSON.stringify(other);
    const after = other.encodeOpacity({ target: "other", value: 0.5 });
    assert.equal(after.guideConfigs.legend.opacity.target, "points");
    assert.deepEqual(after.guideConfigs.legend.opacity, source.guideConfigs.legend.opacity);
    assert.equal(after.graphicSpec.objects.other.items[0].properties.opacity, 0.5);
    assert.equal(after.encodeOpacity({ target: "points", value: 0.5 }).guideConfigs.legend?.opacity, undefined);
    assert.equal(JSON.stringify(other), snapshot);
  }
});

test("combines point size, shape, color, and opacity in one collection", () => {
  const program = encoded(base());
  const children = program.graphicSpec.objects.points.items;

  assert.deepEqual(program.semanticSpec.layers[0].encoding.size, {
    field: "amount", fieldType: "quantitative", scale: "size"
  });
  assert.deepEqual(program.semanticSpec.layers[0].encoding.shape, {
    field: "group", fieldType: "nominal", scale: "shape"
  });
  assert.deepEqual(program.resolvedScales.size, {
    type: "linear", domain: [4, 16], range: [25, 100]
  });
  assert.equal(program.graphicSpec.objects.points.type, "collection");
  assert.equal(children[0].type, "circle");
  assert.equal(children[0].properties.radius, Math.sqrt(25 / Math.PI));
  assert.equal(children[1].type, "rect");
  assert.equal(children[1].properties.width, 10);
  assert.equal(children[1].properties.x, 185);
  assert.equal(children[1].properties.opacity, 0.4);
});

test("is independent of appearance encoding call order", () => {
  const expected = encoded(base());
  const reordered = base()
    .encodeOpacity({ value: 0.4 })
    .encodeShape({ field: "group" })
    .encodeSize({ field: "amount", scale: { range: [25, 100] } })
    .encodeColor({ field: "group" })
    .encodeY({ field: "y" })
    .encodeX({ field: "x" });

  assert.deepEqual(reordered.semanticSpec.layers, expected.semanticSpec.layers);
  assert.deepEqual(reordered.semanticSpec.coordinates, expected.semanticSpec.coordinates);
  assert.deepEqual(
    [...reordered.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)),
    [...expected.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id))
  );
  assert.deepEqual(reordered.graphicSpec, expected.graphicSpec);
});

test("replaces an existing constant opacity through the same assignment", () => {
  const before = base().encodeOpacity({ value: 0.4 });
  const after = before.encodeOpacity({ value: 0.8 });

  assert.deepEqual(
    before.graphicSpec.objects.points.items.map(
      child => child.properties.opacity
    ),
    [0.4, 0.4]
  );
  assert.deepEqual(
    after.graphicSpec.objects.points.items.map(
      child => child.properties.opacity
    ),
    [0.8, 0.8]
  );
  assert.equal(after.trace.children.at(-1).op, "encodeOpacity");
});

test("assigns and reassigns field-driven opacity atomically", () => {
  const constant = base().encodeOpacity({ value: 0.4 });
  const field = constant.encodeOpacity({
    field: "amount",
    scale: { range: [0.2, 1] }
  });
  const reassigned = field.encodeOpacity({ field: "x" });
  const restored = reassigned.encodeOpacity({ value: 0.6 });

  assert.equal(field.markConfigs.points?.opacity, undefined);
  assert.deepEqual(field.semanticSpec.layers[0].encoding.opacity, {
    field: "amount",
    fieldType: "quantitative",
    scale: "opacity"
  });
  assert.deepEqual(
    field.graphicSpec.objects.points.items.map(child => child.properties.opacity),
    [0.2, 1]
  );
  assert.equal(reassigned.semanticSpec.layers[0].encoding.opacity.field, "x");
  assert.deepEqual(reassigned.resolvedScales.opacity.domain, [0, 10]);
  assert.equal(restored.semanticSpec.layers[0].encoding?.opacity, undefined);
  assert.deepEqual(
    restored.graphicSpec.objects.points.items.map(child => child.properties.opacity),
    [0.6, 0.6]
  );
  assert.deepEqual(
    constant.graphicSpec.objects.points.items.map(child => child.properties.opacity),
    [0.4, 0.4]
  );
});

test("supports explicit descending opacity ranges and policies", () => {
  const program = base().encodeOpacity({
    field: "amount",
    scale: { range: [1, 0.2], clamp: true, reverse: true }
  });

  assert.deepEqual(program.semanticSpec.scales[0], {
    id: "opacity",
    type: "linear",
    domain: "auto",
    range: [1, 0.2],
    clamp: true,
    reverse: true
  });
  assert.deepEqual(program.resolvedScales.opacity.range, [0.2, 1]);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(child => child.properties.opacity),
    [0.2, 1]
  );
});

test("rematerializes centered mixed point geometry after Canvas edits", () => {
  const before = encoded(base());
  const after = before.editCanvas({ width: 300, height: 180, margin: 20 });
  const square = after.graphicSpec.objects.points.items[1];

  assert.equal(square.properties.x, 275);
  assert.equal(square.properties.y, 15);
  assert.equal(
    after.trace.children.at(-1).children.some(
      child => child.op === "rematerializePointMark"
    ),
    true
  );
});

test("records field encodings and validates appearance contracts", () => {
  const size = base().encodeSize({ field: "amount" });
  const node = size.trace.children.at(-1);
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeScale",
    "rematerializePointMark"
  ]);
  assert.throws(
    () => base().encodeSize({ field: "group" }),
    /finite number/
  );
  assert.throws(
    () => base().encodeShape({ field: "amount", fieldType: "quantitative" }),
    /requires a nominal field/
  );
  assert.throws(
    () => base().encodeOpacity({ value: 2 }),
    /from 0 to 1/
  );
  assert.throws(
    () => base().encodeOpacity({}),
    /exactly one/
  );
  assert.throws(
    () => base().encodeOpacity({ value: 0.5, field: "amount" }),
    /exactly one/
  );
  assert.throws(
    () => base().encodeOpacity({ field: "group" }),
    /finite number/
  );
  assert.throws(
    () => base().encodeOpacity({
      field: "amount",
      scale: { range: [-0.1, 1] }
    }),
    /from 0 to 1/
  );
  assert.throws(
    () => base().encodeRadius({ value: 3 }).encodeSize({ field: "amount" }),
    /constant radius/
  );
});

test("materializes all twelve shapes in marks and a shape-only legend", () => {
  const shapes = [
    "circle", "square", "diamond", "triangle-up", "triangle-down",
    "triangle-left", "triangle-right", "plus", "cross", "star",
    "hexagon", "wye"
  ];
  const rows = shapes.map((shape, index) => ({
    x: index,
    y: index,
    shape
  }));
  const program = chart()
    .createCanvas({
      width: 520,
      height: 400,
      margin: { top: 20, right: 170, bottom: 40, left: 40 }
    })
    .createData({ id: "shapes", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeRadius({ value: 5 })
    .encodeShape({ field: "shape", scale: { range: shapes } })
    .createLegend({ channels: ["shape"] });

  assert.deepEqual(program.resolvedScales.shape.range, shapes);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(child => child.type),
    ["circle", "rect", ...Array(10).fill("path")]
  );
  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendSymbolPoints.items.map(
      child => child.type
    ),
    ["circle", "rect", ...Array(10).fill("path")]
  );

  const overflowRows = [...rows, { x: 12, y: 12, shape: "thirteenth" }];
  assert.throws(
    () => chart()
      .createCanvas({ width: 200, height: 120, margin: 10 })
      .createData({ id: "overflow", values: overflowRows })
      .createPointMark({ id: "points" })
      .encodeShape({ field: "shape" }),
    /one distinct shape per domain value/
  );
  assert.throws(
    () => base().encodeShape({ field: "group", scale: { range: ["circle", "circle"] } }),
    /unique supported point shapes/
  );
});

test("matches the regression scatterplot primitive point collection", () => {
  const cars = JSON.parse(fs.readFileSync("./data/cars.json", "utf8"));
  const expected = createCarsRegressionScatterplotValues(cars);
  const program = chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .filterData({
      id: "selectedCars",
      field: "Origin",
      oneOf: ["Japan", "USA"]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
    .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeSize({ field: "Acceleration" })
    .encodeShape({ field: "Origin" })
    .encodeOpacity({ value: 0.27 });

  assert.deepEqual(
    program.graphicSpec.objects.points.items,
    expected.pointChildren.map((child, index) => ({
      id: `points:${index}`,
      type: child.type,
      properties: child.properties
    }))
  );
});
