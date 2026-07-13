import assert from "node:assert/strict";
import test from "node:test";

import { createCarsRegressionScatterplot } from
  "../../examples/cars-regression-scatterplot/program.js";
import { render } from "../../src/index.js";
import { loadCars } from "../fixtures/data.js";
import { createMockCanvasContext } from "../helpers/mockCanvasContext.js";
import { createCarsRegressionScatterplotPrimitives } from
  "../programs/carsRegressionScatterplotPrimitives.js";

const expectedTopLevelActions = [
  "createCanvas",
  "createData",
  "filterData",
  "createPointMark",
  "encodeX",
  "encodeY",
  "encodeColor",
  "encodeSize",
  "encodeShape",
  "encodeOpacity",
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
      { id: "points", mark: "point", data: "selectedCars", coordinate: "main" },
      {
        id: "regressionBands",
        mark: "area",
        data: "regressionData",
        coordinate: "main"
      },
      {
        id: "regressionLines",
        mark: "line",
        data: "regressionData",
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
      ["selectedCars", "cars", 333],
      ["regressionData", "selectedCars", 73]
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

test("matches the primitive graphicSpec and renderer calls exactly", () => {
  const cars = loadCars();
  const program = createCarsRegressionScatterplot(cars);
  const primitive = createCarsRegressionScatterplotPrimitives(cars);
  const publicContext = createMockCanvasContext();
  const primitiveContext = createMockCanvasContext();

  assert.deepEqual(program.graphicSpec, primitive.graphicSpec);
  render(program, publicContext);
  render(primitive, primitiveContext);
  assert.deepEqual(publicContext.calls, primitiveContext.calls);
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
    Object.isFrozen(program.graphicSpec.objects.regressionBands.children[0].properties),
    true
  );
});
