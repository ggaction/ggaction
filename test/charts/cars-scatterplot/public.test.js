import assert from "node:assert/strict";
import test from "node:test";

import { createCarsScatterplot } from "../../../examples/cars-scatterplot/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsScatterplotPrimitives } from "./primitive.program.js";

const cars = loadCars();

test("builds the public cars scatterplot with chart actions", () => {
  const program = createCarsScatterplot(cars);
  const layer = program.semanticSpec.layers[0];

  assert.equal(program.semanticSpec.datasets[0].values.length, 392);
  assert.equal(layer.mark.type, "point");
  assert.equal(layer.encoding.x.field, "Horsepower");
  assert.equal(layer.encoding.y.field, "Miles_per_Gallon");
  assert.equal(layer.encoding.color.field, "Origin");
  assert.equal(program.graphicSpec.objects.points.items.length, 392);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas", "createData", "createScatterPlot"
  ]);
  assert.deepEqual(program.trace.children[2].children.map(node => node.op), [
    "createPointMark", "encodeX", "encodeY", "encodeColor", "createGuides"
  ]);
});

test("owns public scatterplot input", () => {
  const input = structuredClone(cars);
  const program = createCarsScatterplot(input);
  const stored = program.semanticSpec.datasets[0].values[0].Horsepower;

  input[0].Horsepower = -999;

  assert.equal(program.semanticSpec.datasets[0].values[0].Horsepower, stored);
});

test("exactly matches the canonical primitive baseline", () => {
  assertChartProgramsEquivalent({
    publicProgram: createCarsScatterplot(cars),
    primitiveProgram: createCarsScatterplotPrimitives(cars)
  });
});
