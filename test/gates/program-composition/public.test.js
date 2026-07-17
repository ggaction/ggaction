import assert from "node:assert/strict";
import test from "node:test";

import { loadCars, loadGapminder, loadJobs } from "../../support/data.js";
import {
  createNestedDashboardPublic,
  createUnequalHorizontalPublic
} from "./public.program.js";
import { createCompositionGateValues } from "./reference-values.js";

const cars = loadCars();
const jobs = loadJobs();
const gapminder = loadGapminder();

test("builds the approved horizontal dashboard with hconcat", () => {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  const program = createUnequalHorizontalPublic(cars, jobs, gapminder);

  assert.equal(program.compositionSpec.direction, "horizontal");
  assert.deepEqual(program.compositionSpec.children, ["main", "detail"]);
  assert.equal(program.graphicSpec.objects.canvas.properties.width, values.overview.width);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, values.overview.height);
  assert.equal(program.graphicSpec.objects.canvas.children.length, 2);
  assert.deepEqual(program.trace.children.map(node => node.op), ["hconcat"]);
});

test("builds the approved nested dashboard with vconcat", () => {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  const program = createNestedDashboardPublic(cars, jobs, gapminder);

  assert.equal(program.compositionSpec.direction, "vertical");
  assert.deepEqual(program.compositionSpec.children, ["overview", "trend"]);
  assert.equal(program.children.overview.compositionSpec.direction, "horizontal");
  assert.equal(program.graphicSpec.objects.canvas.properties.width, values.nested.width);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, values.nested.height);
  assert.deepEqual(program.trace.children[0].children.map(node => node.op), [
    "useProgram", "useProgram", "materializeComposition"
  ]);
});
