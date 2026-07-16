import assert from "node:assert/strict";
import test from "node:test";

import {
  createBinBoundariesCarsHistogram,
  createBinStepCarsHistogram,
  createFieldReassignmentCarsHistogram,
  createNormalizedStackCarsHistogram
} from "../../../../examples/cars-histogram/program.js";
import { assertChartProgramsEquivalent } from "../../../support/chart-equivalence.js";
import { loadCars } from "../../../support/data.js";
import { createCarsHistogramValues } from "../reference-values.js";
import {
  createBinBoundariesPrimitives,
  createBinStepPrimitives,
  createFieldReassignmentPrimitives,
  createNormalizedStackPrimitives
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
    program.graphicSpec.objects.bars.items.map(child => child.properties),
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
    program.graphicSpec.objects.xAxisLabels.items.map(
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
    scale: "color",
    layout: "stack"
  });
  assert.deepEqual(program.semanticSpec.guides.axis, {
    x: { scale: "x", coordinate: "main", title: "Horsepower" },
    y: { scale: "y", coordinate: "main", title: "count(Horsepower)" }
  });
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.items.map(
      child => child.properties.text
    ),
    ["USA", "Europe", "Japan"]
  );
});

test("locks normalized histogram partitions and the unit y domain", () => {
  const values = createCarsHistogramValues(cars, {
    ...layout,
    maxBins: 10,
    stack: "normalize"
  });
  const program = createNormalizedStackPrimitives(cars);
  const encoding = program.semanticSpec.layers[0].encoding;

  assert.deepEqual(values.scales.y.domain, [0, 1]);
  assert.equal(values.rects.every(rect => rect.value >= 0), true);
  for (const bin of values.bins.filter(bin => bin.total > 0)) {
    const partition = values.rects.filter(rect => rect.bin === bin.index);
    assert.ok(Math.abs(partition.at(-1).stackEnd - 1) < 1e-12);
    assert.equal(
      partition.reduce((sum, rect) => sum + rect.count, 0),
      bin.total
    );
  }
  assert.equal(encoding.y.stack, "normalize");
  assert.equal(encoding.color.layout, "fill");
  assert.deepEqual(
    program.graphicSpec.objects.yAxisLabels.items.map(
      child => Number(child.properties.text)
    ),
    [0, 0.2, 0.4, 0.6, 0.8, 1]
  );
  assert.equal(
    program.graphicSpec.order.indexOf("horizontalGridLines") <
      program.graphicSpec.order.indexOf("bars"),
    true
  );
  assert.equal(
    program.graphicSpec.order.indexOf("bars") <
      program.graphicSpec.order.indexOf("colorLegendSymbols"),
    true
  );
  assert.deepEqual(
    program.graphicSpec.objects.bars.items.map(child => child.properties),
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

test("omits empty normalized bins without synthesizing placeholders", () => {
  const values = createCarsHistogramValues([
    { Displacement: 0, Origin: "A" },
    { Displacement: 3, Origin: "B" }
  ], {
    ...layout,
    binBoundaries: [0, 1, 2, 3],
    stack: "normalize"
  });

  assert.deepEqual(values.bins.map(bin => bin.total), [1, 0, 1]);
  assert.equal(values.rects.some(rect => rect.bin === 1), false);
  assert.deepEqual(values.rects.map(rect => rect.stackEnd), [1, 1]);
});

test("keeps future histogram actions out of approved primitive traces", () => {
  for (const program of [
    createBinStepPrimitives(cars),
    createBinBoundariesPrimitives(cars),
    createFieldReassignmentPrimitives(cars),
    createNormalizedStackPrimitives(cars)
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
    [createNormalizedStackPrimitives(cars), createNormalizedStackCarsHistogram(cars)],
    [
      createFieldReassignmentPrimitives(cars),
      createFieldReassignmentCarsHistogram(cars)
    ]
  ];

  for (const [primitiveProgram, publicProgram] of pairs) {
    assertChartProgramsEquivalent({ publicProgram, primitiveProgram });
  }
  assert.deepEqual(
    pairs[3][1].trace.children.map(node => node.op),
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
