import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { GRADIENT_PLOT_FIELDS, createCarsGradientPlotReference } from "./fixture.js";
import { createCarsGradientPlotPrimitives } from "./primitive.program.js";

test("authors one gradient strip and median rule per Cars origin", () => {
  const cars = loadCars();
  const reference = createCarsGradientPlotReference(cars);
  const program = createCarsGradientPlotPrimitives(cars);
  const strips = program.graphicSpec.objects.gradientPlot.items;
  const centers = program.graphicSpec.objects.gradientPlotCenter.items;

  assert.equal(strips.length, 3);
  assert.equal(centers.length, 3);
  assert.deepEqual(
    strips.map(item => item.properties.fill),
    reference.profiles.map(profile => profile.fill)
  );
  assert.equal(centers.every(item => item.properties.strokeWidth === 1.5), true);
  assert.deepEqual(
    strips.map(item => item.properties.strokeWidth),
    [0, 0, 0]
  );
  assert.equal(new Set(
    strips.map(item => item.properties.fill.stops.at(-1).color)
  ).size, 3);
  assert.deepEqual(
    program.semanticSpec.layers[0].encoding.color,
    { field: "origin", fieldType: "nominal", scale: "color" }
  );
  assert.deepEqual(program.semanticSpec.layers.map(layer => layer.id), [
    "gradientPlot",
    "gradientPlotCenter"
  ]);
});

test("stores sampled profiles without embedding concrete paint in semantic data", () => {
  const program = createCarsGradientPlotPrimitives(loadCars());
  const dataset = program.semanticSpec.datasets.find(
    candidate => candidate.id === "carsAccelerationProfiles"
  );

  assert.equal(dataset.values.length, 3);
  assert.equal(dataset.values.every(row =>
    row[GRADIENT_PLOT_FIELDS.values].length === 64 &&
    row[GRADIENT_PLOT_FIELDS.intensities].length === 64 &&
    !Object.hasOwn(row, "fill") &&
    !Object.hasOwn(row, "paint") &&
    !Object.hasOwn(row, "color")
  ), true);
});

test("keeps caller data and previous programs immutable", () => {
  const cars = loadCars();
  const previous = createCarsGradientPlotPrimitives(cars);
  const next = previous.editGraphics({
    target: "gradientPlotCenter",
    property: "strokeWidth",
    value: 2
  });

  cars[0].Acceleration = -100;
  assert.equal(previous.graphicSpec.objects.gradientPlotCenter.items[0].properties.strokeWidth, 1.5);
  assert.equal(next.graphicSpec.objects.gradientPlotCenter.items[0].properties.strokeWidth, 2);
  assert.notEqual(
    previous.semanticSpec.datasets[0].values[0][GRADIENT_PLOT_FIELDS.values][0],
    -100
  );
});

test("keeps unapproved GradientPlot facades out of runtime state", () => {
  const program = createCarsGradientPlotPrimitives(loadCars());
  const declarations = readFileSync(
    new URL("../../../types/program.d.ts", import.meta.url),
    "utf8"
  );
  const inventory = JSON.parse(readFileSync(
    new URL("../../../agent_docs/contract/ACTION_INDEX.json", import.meta.url),
    "utf8"
  ));

  assert.equal(program.createGradientPlot, undefined);
  assert.equal(program.editGradientPlot, undefined);
  assert.doesNotMatch(declarations, /(?:create|edit)GradientPlot/);
  assert.deepEqual(
    inventory.plannedActions
      .filter(action => ["createGradientPlot", "editGradientPlot"].includes(action.name))
      .map(action => [action.name, action.status, action.readiness]),
    [
      ["createGradientPlot", "planned", "pending-parameter-review"],
      ["editGradientPlot", "planned", "pending-parameter-review"]
    ]
  );
  assert.equal(program.trace.children.some(node =>
    node.op === "createGradientPlot" || node.op === "editGradientPlot"
  ), false);
});
