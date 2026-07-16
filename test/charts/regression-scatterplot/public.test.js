import assert from "node:assert/strict";
import test from "node:test";

import { createCarsRegressionScatterplot } from
  "../../../examples/cars-regression-scatterplot/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsRegressionScatterplotPrimitives } from
  "./primitive.program.js";

const expectedTopLevelActions = [
  "createCanvas",
  "createData",
  "createPointMark",
  "encodeX",
  "encodeY",
  "encodeColor",
  "encodeSize",
  "encodeShape",
  "encodeOpacity",
  "filterMarks",
  "createRegression",
  "createGuides"
];

test("builds the final public regression scatterplot contract", () => {
  const program = createCarsRegressionScatterplot(loadCars());

  assert.deepEqual(
    program.semanticSpec.layers.map(layer => ({
      id: layer.id,
      mark: layer.mark.type,
      data: layer.data,
      coordinate: layer.coordinate
    })),
    [
      { id: "points", mark: "point", data: "pointsFilteredData", coordinate: "main" },
      {
        id: "pointsRegressionBands",
        mark: "area",
        data: "pointsRegressionData",
        coordinate: "main"
      },
      {
        id: "pointsRegressionLines",
        mark: "line",
        data: "pointsRegressionData",
        coordinate: "main"
      }
    ]
  );
  assert.deepEqual(
    program.semanticSpec.datasets.map(dataset => [
      dataset.id,
      dataset.source,
      dataset.values.length
    ]),
    [
      ["cars", undefined, 406],
      ["pointsFilteredData", "cars", 333],
      ["pointsRegressionData", "pointsFilteredData", 73]
    ]
  );
  assert.deepEqual(program.trace.children.map(node => node.op), expectedTopLevelActions);

  const regression = program.trace.children.find(node => node.op === "createRegression");
  assert.deepEqual(regression.children.map(node => node.op), [
    "createRegressionData",
    "createRegressionBand",
    "createRegressionLine"
  ]);
  const guides = program.trace.children.find(node => node.op === "createGuides");
  assert.deepEqual(guides.children.map(node => node.op), [
    "createAxes",
    "createGrid",
    "createLegend"
  ]);
  assert.deepEqual(program.actionStack, []);
});

test("exactly matches the canonical primitive baseline", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    publicProgram: createCarsRegressionScatterplot(cars),
    primitiveProgram: createCarsRegressionScatterplotPrimitives(cars)
  });
});

test("owns caller data without mutating the input", () => {
  const cars = loadCars();
  const before = structuredClone(cars);
  const program = createCarsRegressionScatterplot(cars);

  assert.deepEqual(cars, before);
  cars[0].Displacement = -999;
  assert.deepEqual(program.semanticSpec.datasets[0].values, before);
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[2].values), true);
  assert.equal(
    Object.isFrozen(
      program.graphicSpec.objects.pointsRegressionBands.children[0].properties
    ),
    true
  );
});
