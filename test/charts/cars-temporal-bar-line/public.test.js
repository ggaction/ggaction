import assert from "node:assert/strict";
import test from "node:test";

import { createCarsTemporalBarLine } from
  "../../../examples/cars-temporal-bar-line/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsTemporalBarLinePrimitives } from "./primitive.program.js";

test("builds the approved temporal bar-line chart through public actions", () => {
  const program = createCarsTemporalBarLine(loadCars());
  const bars = program.semanticSpec.layers.find(layer => layer.id === "bars");
  const trend = program.semanticSpec.layers.find(layer => layer.id === "trend");

  assert.deepEqual(trend.encoding, {
    x: { field: "Year", fieldType: "temporal", scale: "x" },
    y: {
      field: "Acceleration",
      fieldType: "quantitative",
      scale: "y",
      aggregate: "mean"
    }
  });
  assert.equal(trend.encoding.x.scale, bars.encoding.x.scale);
  assert.equal(trend.encoding.y.scale, bars.encoding.y.scale);
  assert.equal(trend.encoding.y.stack, undefined);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createBarMark",
    "encodeX",
    "encodeY",
    "createLineMark",
    "createGuides",
    "createTitle"
  ]);
});

test("matches the approved primitive graphicSpec exactly", () => {
  const rows = loadCars();
  assertChartProgramsEquivalent({
    publicProgram: createCarsTemporalBarLine(rows),
    primitiveProgram: createCarsTemporalBarLinePrimitives(rows),
    compareSemanticSpec: false
  });
});
