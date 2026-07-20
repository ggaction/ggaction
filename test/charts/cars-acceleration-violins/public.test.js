import assert from "node:assert/strict";
import test from "node:test";

import { createCarsAccelerationViolins } from
  "../../../examples/cars-acceleration-violins/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsViolinPrimitives } from "./primitive.program.js";

const cars = loadCars();

test("builds the public Cars violin plot through one aggregate action", () => {
  const program = createCarsAccelerationViolins(cars);
  const create = program.trace.children.find(node => node.op === "createViolinPlot");
  const density = create.children.find(node => node.op === "encodeDensity");

  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createViolinPlot",
    "createTitle"
  ]);
  assert.deepEqual(create.children.map(node => node.op), [
    "createAreaMark",
    "configureAreaStrokeFromFill",
    "encodeDensity",
    "encodeColor",
    "createGuides"
  ]);
  for (const operation of [
    "createCategoricalDensityData",
    "editSemantic",
    "encodeX",
    "encodeY",
    "encodeGroup",
    "rematerializeAreaMark"
  ]) {
    assert.match(JSON.stringify(density), new RegExp(`\\"op\\":\\"${operation}\\"`));
  }
  assert.equal(program.graphicSpec.objects.violins.items.length, 3);
  assert.equal(program.semanticSpec.guides.legend, undefined);
});

test("matches the approved full and split primitive programs exactly", () => {
  for (const split of [false, true]) {
    assertChartProgramsEquivalent({
      publicProgram: createCarsAccelerationViolins(cars, { split }),
      primitiveProgram: createCarsViolinPrimitives(cars, { split }),
      compareSemanticSpec: false
    });
  }
});

test("owns caller data and leaves the earlier program unchanged", () => {
  const input = loadCars();
  const before = structuredClone(input);
  const program = createCarsAccelerationViolins(input);

  input[0].Acceleration = -999;
  assert.deepEqual(program.semanticSpec.datasets[0].values, before);
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[1].values), true);
  assert.equal(Object.isFrozen(program.graphicSpec.objects.violins.items), true);
});
