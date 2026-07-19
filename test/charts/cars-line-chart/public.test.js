import assert from "node:assert/strict";
import test from "node:test";

import { createCarsLineChart } from "../../../examples/cars-line-chart/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsLineChartPrimitives } from "./primitive.program.js";

const cars = loadCars();

test("builds the public cars line-chart example with chart actions", () => {
  const program = createCarsLineChart(cars);

  assert.equal(program.semanticSpec.layers[0].mark.type, "line");
  assert.equal(program.graphicSpec.objects.trends.items.length, 3);
  assert.deepEqual(program.semanticSpec.guides.legend.series.channels, [
    "color",
    "strokeDash"
  ]);
  assert.equal(
    program.graphicSpec.objects.chartTitle.properties.text,
    "The trend of acceleration by year"
  );
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas", "createData", "createLinePlot", "createTitle"
  ]);
  assert.deepEqual(program.trace.children[2].children.map(node => node.op), [
    "createLineMark", "encodeX", "encodeY", "encodeColor",
    "encodeStrokeDash", "createGuides"
  ]);
});

test("exactly matches the canonical primitive baseline", () => {
  assertChartProgramsEquivalent({
    publicProgram: createCarsLineChart(cars),
    primitiveProgram: createCarsLineChartPrimitives(cars)
  });
});
