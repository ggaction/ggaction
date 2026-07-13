import assert from "node:assert/strict";
import test from "node:test";

import { createCarsLineChart } from "../../examples/cars-line-chart/program.js";
import { loadCars } from "../fixtures/data.js";
import { createCarsLineChartPrimitives } from "../programs/carsLineChartPrimitives.js";

const cars = loadCars();

test("builds the public cars line-chart example with chart actions", () => {
  const program = createCarsLineChart(cars);

  assert.equal(program.semanticSpec.layers[0].mark.type, "line");
  assert.equal(program.graphicSpec.objects.trends.children.length, 3);
  assert.deepEqual(program.semanticSpec.guides.legend.series.channels, [
    "color",
    "strokeDash"
  ]);
  assert.equal(
    program.graphicSpec.objects.chartTitle.properties.text,
    "The trend of acceleration by year"
  );
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createLineMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeStrokeDash",
    "createGuides",
    "createTitle"
  ]);
});

test("matches the primitive line-series cardinality", () => {
  const program = createCarsLineChart(cars);
  const primitive = createCarsLineChartPrimitives(cars);

  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(path => path.properties.points.length),
    primitive.graphicSpec.objects.trends.children.map(path => path.properties.points.length)
  );
});
