import assert from "node:assert/strict";
import test from "node:test";

import {
  createBinBoundariesCarsHistogram,
  createBinStepCarsHistogram,
  createFieldReassignmentCarsHistogram
} from "../../../../examples/cars-histogram/program.js";
import { assertChartProgramsEquivalent } from "../../../support/chart-equivalence.js";
import { loadCars } from "../../../support/data.js";
import { createCarsHistogramValues } from "../reference-values.js";
import {
  createBinBoundariesPrimitives,
  createBinStepPrimitives,
  createFieldReassignmentPrimitives
} from "./primitive-programs.js";

const cars = loadCars();
const layout = {
  width: 432,
  height: 460,
  margin: { top: 80, right: 60, bottom: 130, left: 80 }
};

test("locks the exact-step histogram primitive target", () => {
  const values = createCarsHistogramValues(cars, { ...layout, binStep: 60 });
  const program = createBinStepPrimitives(cars);

  assert.deepEqual(values.bins.map(bin => [bin.start, bin.end]), [
    [60, 120], [120, 180], [180, 240], [240, 300],
    [300, 360], [360, 420], [420, 480]
  ]);
  assert.deepEqual(values.bins.map(bin => bin.total), [139, 89, 47, 28, 72, 22, 9]);
  assert.equal(values.bins.reduce((sum, bin) => sum + bin.total, 0), 406);
  assert.equal(values.rects.length, 12);
  assert.deepEqual(values.scales.y.domain, [0, 150]);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.x.bin, { step: 60 });
  assert.deepEqual(
    program.graphicSpec.objects.bars.children.map(child => child.properties),
    values.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fill: rect.fill,
      stroke: "white",
      strokeWidth: 0.5
    }))
  );
});

test("locks irregular boundaries and interval assignment", () => {
  const boundaries = [50, 100, 150, 225, 300, 400, 500];
  const values = createCarsHistogramValues(cars, {
    ...layout,
    binBoundaries: boundaries
  });
  const program = createBinBoundariesPrimitives(cars);

  assert.deepEqual(values.bins.map(bin => [bin.start, bin.end]), [
    [50, 100], [100, 150], [150, 225],
    [225, 300], [300, 400], [400, 500]
  ]);
  assert.deepEqual(values.bins.map(bin => bin.total), [98, 104, 41, 60, 81, 22]);
  assert.equal(values.bins.reduce((sum, bin) => sum + bin.total, 0), 406);
  assert.equal(values.rects.length, 12);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.x.bin, { boundaries });
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => Number(child.properties.text)
    ),
    boundaries
  );
});

test("assigns the last upper boundary and omits empty-bin rectangles", () => {
  const values = createCarsHistogramValues([
    { Displacement: 0, Origin: "A" },
    { Displacement: 3, Origin: "A" }
  ], {
    ...layout,
    binBoundaries: [0, 1, 2, 3]
  });

  assert.deepEqual(values.bins.map(bin => bin.total), [1, 0, 1]);
  assert.equal(values.rects.length, 2);
  assert.equal(values.rects.some(rect => rect.bin === 1), false);
  assert.equal(values.rects.at(-1).bin, 2);
});

test("locks complete histogram field reassignment while preserving grouping", () => {
  const values = createCarsHistogramValues(cars, {
    ...layout,
    field: "Horsepower",
    maxBins: 8
  });
  const program = createFieldReassignmentPrimitives(cars);
  const encoding = program.semanticSpec.layers[0].encoding;

  assert.equal(values.validCars.length, 400);
  assert.deepEqual(values.bins.map(bin => bin.total), [16, 153, 120, 40, 49, 13, 9]);
  assert.equal(values.bins.reduce((sum, bin) => sum + bin.total, 0), 400);
  assert.equal(values.rects.length, 15);
  assert.equal(encoding.x.field, "Horsepower");
  assert.equal(encoding.y.field, "Horsepower");
  assert.deepEqual(encoding.x.bin, { maxBins: 8 });
  assert.deepEqual(encoding.color, {
    field: "Origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.semanticSpec.guides.axis, {
    x: { scale: "x", coordinate: "main", title: "Horsepower" },
    y: { scale: "y", coordinate: "main", title: "count(Horsepower)" }
  });
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.children.map(
      child => child.properties.text
    ),
    ["USA", "Europe", "Japan"]
  );
});

test("keeps future histogram actions out of Gate A primitive traces", () => {
  for (const program of [
    createBinStepPrimitives(cars),
    createBinBoundariesPrimitives(cars),
    createFieldReassignmentPrimitives(cars)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    assert.equal(operations.includes("encodeHistogram"), false);
    assert.equal(operations.includes("encodeX"), false);
    assert.equal(operations.includes("encodeY"), false);
  }
});

test("matches approved histogram primitives with public action flows", () => {
  const pairs = [
    [createBinStepPrimitives(cars), createBinStepCarsHistogram(cars)],
    [createBinBoundariesPrimitives(cars), createBinBoundariesCarsHistogram(cars)],
    [
      createFieldReassignmentPrimitives(cars),
      createFieldReassignmentCarsHistogram(cars)
    ]
  ];

  for (const [primitiveProgram, publicProgram] of pairs) {
    assertChartProgramsEquivalent({ publicProgram, primitiveProgram });
  }
  assert.deepEqual(
    pairs[2][1].trace.children.map(node => node.op),
    [
      "createCanvas",
      "createData",
      "createBarMark",
      "encodeHistogram",
      "encodeColor",
      "createGuides",
      "createTitle",
      "encodeHistogram"
    ]
  );
});
