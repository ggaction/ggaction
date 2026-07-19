import assert from "node:assert/strict";
import test from "node:test";

import { walkGraphicDrawOrder } from "../../../src/grammar/schemas/graphicTree.js";
import {
  loadCars,
  loadGapminder,
  loadNightingaleRose
} from "../../support/data.js";
import {
  createCarsDonutReference,
  createGapminderWeightedDonutReference,
  createGapminderRadialBarReference,
  createNightingaleRoseReference
} from "./reference-values.js";
import {
  createCarsOriginDonutPrimitives,
  createGapminderWeightedDonutPrimitives,
  createGapminderRadialBarPrimitives,
  createNightingaleRosePrimitives
} from "./primitive.program.js";

test("authors weighted Gapminder sectors from an independent population sum", () => {
  const rows = loadGapminder();
  const values = createGapminderWeightedDonutReference(rows);
  const program = createGapminderWeightedDonutPrimitives(rows);

  assert.equal(program.semanticSpec.datasets[0].values.length, 62);
  assert.deepEqual(program.graphicSpec.objects.arc.items.map(
    item => item.properties.commands
  ), values.sectors.map(sector => sector.commands));
  assert.deepEqual(program.graphicSpec.objects.arc.items.map(
    item => item.properties.fill
  ), values.sectors.map(sector => sector.fill));
  assert.equal(values.sectors.at(-1).endTheta, 360);
});

function operations(node) {
  return node.children.flatMap(child => [child.op, ...operations(child)]);
}

function drawOrder(program) {
  const order = [];
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => order.push(id));
  return order;
}

test("authors the Cars Origin donut as three closed concrete paths", () => {
  const rows = loadCars();
  const values = createCarsDonutReference(rows);
  const program = createCarsOriginDonutPrimitives(rows);

  assert.deepEqual(program.graphicSpec.objects.arc.items.map(
    item => item.properties.commands
  ), values.sectors.map(sector => sector.commands));
  assert.deepEqual(program.graphicSpec.objects.arc.items.map(
    item => item.properties.fill
  ), values.sectors.map(sector => sector.fill));
  assert.deepEqual(drawOrder(program), [
    "canvas",
    "plot-main",
    "arc",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle"
  ]);
});

test("authors larger-first Nightingale overlays and omits zero-area paths", () => {
  const rows = loadNightingaleRose();
  const values = createNightingaleRoseReference(rows);
  const program = createNightingaleRosePrimitives(rows);

  assert.equal(program.semanticSpec.datasets[0].values.length, 36);
  assert.equal(program.graphicSpec.objects.arc.items.length, 32);
  assert.deepEqual(program.graphicSpec.objects.arc.items.map(
    item => item.properties.commands
  ), values.sectors.map(sector => sector.commands));
  assert.deepEqual(program.graphicSpec.objects.thetaAxisLabels.items.map(
    item => item.properties.text
  ), values.thetaLabels.map(label => label.text));
  assert.deepEqual(drawOrder(program), [
    "canvas",
    "plot-main",
    "radialGridCircles",
    "arc",
    "thetaAxisLine",
    "thetaAxisTicks",
    "thetaAxisLabels",
    "radialAxisLine",
    "radialAxisTicks",
    "radialAxisLabels",
    "radialAxisTitle",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle"
  ]);
});

test("authors one Gapminder radial bar for each selected 2005 country", () => {
  const rows = loadGapminder();
  const values = createGapminderRadialBarReference(rows);
  const program = createGapminderRadialBarPrimitives(rows);

  assert.equal(program.semanticSpec.datasets[0].values.length, 12);
  assert.deepEqual(program.graphicSpec.objects.arc.items.map(
    item => item.properties.commands
  ), values.sectors.map(sector => sector.commands));
  assert.deepEqual(program.graphicSpec.objects.colorLegendLabels.items.map(
    item => item.properties.text
  ), ["0", "1", "2", "3", "4", "5"]);
  assert.deepEqual(drawOrder(program), [
    "canvas",
    "plot-main",
    "radialGridCircles",
    "arc",
    "thetaAxisLine",
    "thetaAxisTicks",
    "thetaAxisLabels",
    "thetaAxisTitle",
    "radialAxisLine",
    "radialAxisTicks",
    "radialAxisLabels",
    "radialAxisTitle",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle"
  ]);
});

test("keeps post-Gate arc actions out of every primitive trace", () => {
  const programs = [
    createGapminderWeightedDonutPrimitives(loadGapminder()),
    createCarsOriginDonutPrimitives(loadCars()),
    createNightingaleRosePrimitives(loadNightingaleRose()),
    createGapminderRadialBarPrimitives(loadGapminder())
  ];
  for (const program of programs) {
    const trace = operations(program.trace);
    for (const operation of [
      "editArcMark",
      "encodeTheta",
      "encodeR",
      "encodeColor",
      "createGuides",
      "rematerializeArcMark"
    ]) {
      assert.equal(trace.includes(operation), false, operation);
    }
  }
});

test("owns input rows and stores only final path geometry", () => {
  const rows = loadNightingaleRose();
  const program = createNightingaleRosePrimitives(rows);
  const before = program.semanticSpec.datasets[0].values[0].value;
  rows[0].value = 99;

  assert.equal(program.semanticSpec.datasets[0].values[0].value, before);
  for (const item of program.graphicSpec.objects.arc.items) {
    assert.deepEqual(
      Object.keys(item.properties).sort(),
      ["commands", "fill", "opacity", "stroke", "strokeDash", "strokeWidth"]
    );
    assert.equal(item.properties.commands.at(-1).op, "Z");
  }
});
