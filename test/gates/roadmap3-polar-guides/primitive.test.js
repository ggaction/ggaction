import assert from "node:assert/strict";
import test from "node:test";

import { walkGraphicDrawOrder } from "../../../src/grammar/schemas/graphicTree.js";
import { loadCars } from "../../support/data.js";
import { createCarsPolarGuideReference } from "./reference-values.js";
import { createCarsPolarGuidePrimitives } from "./primitive.program.js";

function operations(node) {
  return node.children.flatMap(child => [child.op, ...operations(child)]);
}

test("authors the Polar guide Gate target through graphical primitives", () => {
  const rows = loadCars();
  const values = createCarsPolarGuideReference(rows);
  const program = createCarsPolarGuidePrimitives(rows);
  const drawOrder = [];
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => drawOrder.push(id));

  assert.deepEqual(program.semanticSpec.guides, {});
  assert.equal(program.semanticSpec.coordinates[0].type, "polar");
  assert.deepEqual(program.graphicSpec.objects.thetaAxisLine.properties.commands, values.thetaAxisCommands);
  assert.equal(program.graphicSpec.objects.radialGridCircles.items.length, 4);
  assert.equal(program.graphicSpec.objects.thetaGridLines.items.length, 6);
  assert.equal(program.graphicSpec.objects.thetaAxisLabels.items.length, 6);
  assert.equal(program.graphicSpec.objects.radialAxisLabels.items.length, 5);
  assert.deepEqual(drawOrder, [
    "canvas",
    "plot-main",
    "radialGridCircles",
    "thetaGridLines",
    "point",
    "thetaAxisLine",
    "thetaAxisTicks",
    "thetaAxisLabels",
    "thetaAxisTitle",
    "radialAxisLine",
    "radialAxisTicks",
    "radialAxisLabels",
    "radialAxisTitle"
  ]);
});

test("keeps every future Polar guide action out of the primitive trace", () => {
  const program = createCarsPolarGuidePrimitives(loadCars());
  const trace = operations(program.trace);

  for (const operation of [
    "createGuides",
    "createAxes",
    "createThetaAxis",
    "createRadialAxis",
    "createThetaGrid",
    "createRadialGrid"
  ]) {
    assert.equal(trace.includes(operation), false, operation);
  }
});

test("owns caller data and keeps concrete guide geometry finite", () => {
  const rows = loadCars();
  const program = createCarsPolarGuidePrimitives(rows);
  const before = program.semanticSpec.datasets[0].values[0].Horsepower;
  rows[0].Horsepower = -1;

  assert.equal(program.semanticSpec.datasets[0].values[0].Horsepower, before);
  for (const id of ["thetaGridLines", "radialAxisTicks"]) {
    for (const item of program.graphicSpec.objects[id].items) {
      for (const value of Object.values(item.properties)) {
        if (typeof value === "number") assert.equal(Number.isFinite(value), true);
      }
    }
  }
});
