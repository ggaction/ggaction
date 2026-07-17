import assert from "node:assert/strict";
import test from "node:test";

import {
  createCarsPolarScatterplot,
  createFashionTsnePolarPoints
} from "../../../examples/polar-points/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars, loadFashionTsne } from "../../support/data.js";
import {
  createCarsPolarScatterplotPrimitives,
  createFashionTsnePolarPointPrimitives
} from "./primitive.program.js";

const cars = loadCars();
const fashionRows = loadFashionTsne();

test("builds both Polar point charts with the approved public chains", () => {
  const carsProgram = createCarsPolarScatterplot(cars);
  const fashionProgram = createFashionTsnePolarPoints(fashionRows);

  assert.deepEqual(carsProgram.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createPointMark",
    "encodeTheta",
    "encodeR",
    "encodeColor",
    "encodePointRadius"
  ]);
  assert.deepEqual(fashionProgram.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createPointMark",
    "encodeTheta",
    "encodeR",
    "encodeColor",
    "encodePointRadius"
  ]);
  assert.equal(carsProgram.semanticSpec.layers[0].coordinate, "polar");
  assert.equal(fashionProgram.semanticSpec.scales.find(
    scale => scale.id === "radius"
  ).zero, false);
});

test("exactly matches both approved Polar point primitives", () => {
  assertChartProgramsEquivalent({
    publicProgram: createCarsPolarScatterplot(cars),
    primitiveProgram: createCarsPolarScatterplotPrimitives(cars)
  });
  assertChartProgramsEquivalent({
    publicProgram: createFashionTsnePolarPoints(fashionRows),
    primitiveProgram: createFashionTsnePolarPointPrimitives(fashionRows)
  });
});
