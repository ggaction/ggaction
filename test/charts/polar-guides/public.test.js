import assert from "node:assert/strict";
import test from "node:test";

import { createCarsPolarGuides } from
  "../../../examples/polar-guides/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsPolarGuidePrimitives } from "./primitive.program.js";

const cars = loadCars();

test("builds the approved Polar guide chart with the shortest public chain", () => {
  const program = createCarsPolarGuides(cars);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createPointMark",
    "encodeTheta",
    "encodeR",
    "encodeColor",
    "encodePointRadius",
    "createGuides"
  ]);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createAxes", "createGrid"]
  );
});

test("exactly matches the approved Polar guide primitive", () => {
  assertChartProgramsEquivalent({
    publicProgram: createCarsPolarGuides(cars),
    primitiveProgram: createCarsPolarGuidePrimitives(cars)
  });
});
