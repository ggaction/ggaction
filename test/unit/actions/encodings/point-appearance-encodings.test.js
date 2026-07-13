import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import { createCarsRegressionScatterplotValues } from
  "../../../fixtures/carsRegressionScatterplotValues.js";

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

test("combines point size, shape, color, and opacity in one collection", () => {
  const program = encoded(base());
  const children = program.graphicSpec.objects.points.children;

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

test("rematerializes centered mixed point geometry after Canvas edits", () => {
  const before = encoded(base());
  const after = before.editCanvas({ width: 300, height: 180, margin: 20 });
  const square = after.graphicSpec.objects.points.children[1];

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
    () => base().encodeRadius({ value: 3 }).encodeSize({ field: "amount" }),
    /constant radius/
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
    program.graphicSpec.objects.points.children,
    expected.pointChildren.map((child, index) => ({
      id: `points:${index}`,
      type: child.type,
      properties: child.properties
    }))
  );
});
