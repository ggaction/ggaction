import assert from "node:assert/strict";
import test from "node:test";

import {
  createCarsScatterplotPrimitives,
  createCarsScatterplotPrimitiveValues
} from "../programs/carsScatterplotPrimitives.js";
import { loadCars } from "../fixtures/data.js";

const cars = loadCars();

test("precomputes point, tick, and label values for the axes program", () => {
  const values = createCarsScatterplotPrimitiveValues(cars);

  assert.equal(values.validCars.length, 392);
  assert.deepEqual(values.bounds, {
    left: 70,
    right: 610,
    top: 30,
    bottom: 340
  });
  assert.deepEqual(values.xTicks.labels, ["50", "100", "150", "200"]);
  assert.deepEqual(values.yTicks.labels, ["10", "20", "30", "40"]);
  assert.equal(values.x.every(Number.isFinite), true);
  assert.equal(values.y.every(Number.isFinite), true);
  assert.equal(values.xTicks.positions.every(Number.isFinite), true);
  assert.equal(values.yTicks.positions.every(Number.isFinite), true);
});

test("derives plot bounds from canvas dimensions and margins", () => {
  const values = createCarsScatterplotPrimitiveValues(cars, {
    width: 800,
    height: 500,
    margin: { top: 40, right: 50, bottom: 70, left: 80 }
  });

  assert.deepEqual(values.bounds, {
    left: 80,
    right: 750,
    top: 40,
    bottom: 430
  });
});

test("authors axes in a separate concrete scatterplot program", () => {
  const program = createCarsScatterplotPrimitives(cars);

  assert.equal(program.graphicSpec.objects.points.children.length, 392);
  assert.equal(program.graphicSpec.objects.xTicks.children.length, 4);
  assert.equal(program.graphicSpec.objects.yTicks.children.length, 4);
  assert.equal(program.graphicSpec.objects.xLabels.children.length, 4);
  assert.equal(program.graphicSpec.objects.yLabels.children.length, 4);
  assert.equal(program.graphicSpec.objects.xTitle.properties.text, "Horsepower");
  assert.equal(
    program.graphicSpec.objects.yTitle.properties.rotation,
    -Math.PI / 2
  );
});
