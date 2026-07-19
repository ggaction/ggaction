import assert from "node:assert/strict";
import test from "node:test";

import { createCarsOriginDonut } from
  "../../../examples/cars-origin-donut/program.js";
import { createGapminderRadialBars } from
  "../../../examples/gapminder-radial-bars/program.js";
import { createGapminderPopulationDonut } from
  "../../../examples/gapminder-population-donut/program.js";
import { createNightingaleRoseChart } from
  "../../../examples/nightingale-rose-chart/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import {
  loadCars,
  loadGapminder,
  loadNightingaleRose
} from "../../support/data.js";
import {
  createCarsOriginDonutPrimitives,
  createGapminderWeightedDonutPrimitives,
  createGapminderRadialBarPrimitives,
  createNightingaleRosePrimitives
} from "./primitive.program.js";

test("matches the weighted Gapminder donut primitive exactly", () => {
  const rows = loadGapminder();
  const program = createGapminderPopulationDonut(rows);

  assertChartProgramsEquivalent({
    primitiveProgram: createGapminderWeightedDonutPrimitives(rows),
    publicProgram: program
  });
  assert.equal(program.semanticSpec.datasets[0].values.length, 62);
  assert.equal(program.graphicSpec.objects.arc.items.length, 6);
});

test("matches the approved Cars donut primitive exactly", () => {
  const rows = loadCars();
  const program = createCarsOriginDonut(rows);

  assertChartProgramsEquivalent({
    primitiveProgram: createCarsOriginDonutPrimitives(rows),
    publicProgram: program
  });
  assert.equal(program.graphicSpec.objects.arc.items.length, 3);
});

test("matches the approved Nightingale rose primitive exactly", () => {
  const rows = loadNightingaleRose();
  const program = createNightingaleRoseChart(rows);

  assertChartProgramsEquivalent({
    primitiveProgram: createNightingaleRosePrimitives(rows),
    publicProgram: program
  });
  assert.equal(program.graphicSpec.objects.arc.items.length, 32);
});

test("matches the approved Gapminder radial-bar primitive exactly", () => {
  const rows = loadGapminder();
  const program = createGapminderRadialBars(rows);

  assertChartProgramsEquivalent({
    primitiveProgram: createGapminderRadialBarPrimitives(rows),
    publicProgram: program
  });
  assert.equal(program.graphicSpec.objects.arc.items.length, 12);
});

test("records arc materialization under the public action hierarchy", () => {
  const program = createNightingaleRoseChart(loadNightingaleRose());
  const theta = program.trace.children.find(node => node.op === "encodeTheta");
  const radius = program.trace.children.find(node => node.op === "encodeR");
  const color = program.trace.children.find(node => node.op === "encodeColor");

  assert.equal(theta.children.some(node => node.op === "rematerializeArcMark"), false);
  assert.equal(radius.children.some(node => node.op === "rematerializeArcMark"), true);
  assert.equal(color.children.some(node => node.op === "rematerializeArcMark"), true);
});
