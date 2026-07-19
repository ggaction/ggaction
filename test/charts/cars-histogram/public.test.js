import assert from "node:assert/strict";
import test from "node:test";

import { createCarsHistogram } from "../../../examples/cars-histogram/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadCars } from "../../support/data.js";
import { createCarsHistogramPrimitives } from "./primitive.program.js";

const cars = loadCars();

test("builds the public cars histogram with chart actions", () => {
  const program = createCarsHistogram(cars);
  const bars = program.graphicSpec.objects.bars;
  const title = program.graphicSpec.objects.chartTitle.properties;
  const subtitle = program.graphicSpec.objects.chartSubtitle.properties;

  assert.equal(program.semanticSpec.layers[0].mark.type, "bar");
  assert.equal(program.semanticSpec.layers[0].encoding.x.bin.maxBins, 10);
  assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, "count");
  assert.equal(program.semanticSpec.layers[0].encoding.y.stack, "zero");
  assert.equal(bars.items.length, 15);
  assert.equal(program.semanticSpec.guides.grid.horizontal.scale, "y");
  assert.equal(
    program.graphicSpec.objects.colorLegendTitle.properties.x,
    216
  );
  assert.equal(
    program.graphicSpec.objects.colorLegendTitle.properties.y > 330,
    true
  );
  assert.equal(title.text, "Displacement distribution");
  assert.equal(subtitle.text, "by country");
  assert.equal(title.x, 226);
  assert.equal(subtitle.x, 226);
  assert.equal(title.textAlign, "center");
  assert.equal(subtitle.textAlign, "center");
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas", "createData", "createHistogram", "createTitle"
  ]);
  assert.deepEqual(program.trace.children[2].children.map(node => node.op), [
    "createBarMark", "encodeHistogram", "encodeColor", "createGuides"
  ]);
});

test("matches the complete histogram primitive baseline", () => {
  assertChartProgramsEquivalent({
    publicProgram: createCarsHistogram(cars),
    primitiveProgram: createCarsHistogramPrimitives(cars)
  });
});
