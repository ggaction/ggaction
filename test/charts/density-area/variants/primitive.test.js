import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import { assertChartProgramsEquivalent } from
  "../../../support/chart-equivalence.js";
import { createAreaOutlineEditCarsDensityArea } from
  "../../../../examples/cars-density-area/program.js";
import {
  createCountNormalizationCarsDensityArea,
  createDensityRevisionCarsDensityArea,
  createEpanechnikovKernelCarsDensityArea
} from "../../../../examples/cars-density-area/program.js";
import {
  createCarsDensityAreaPrimitives,
  renderCarsDensityAreaPrimitives
} from "../primitive.program.js";
import { createAreaOutlineEditPrimitives } from "./primitive-programs.js";
import {
  createCountNormalizationPrimitives,
  createDensityRevisionPrimitives,
  createEpanechnikovKernelPrimitives
} from "./primitive-programs.js";
import { createCarsDensityAreaValues } from "../reference-values.js";

const cars = loadCars();

test("authors the density area outline target with low-level graphic edits", () => {
  const baseline = createCarsDensityAreaPrimitives(cars);
  const program = createAreaOutlineEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsDensityAreaPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(child => ({
      opacity: child.properties.opacity,
      stroke: child.properties.stroke,
      strokeWidth: child.properties.strokeWidth
    })),
    Array.from({ length: 3 }, () => ({
      opacity: 0.35,
      stroke: "#334155",
      strokeWidth: 1.5
    }))
  );
  const outlinedStrokes = findCanvasCalls(context, "stroke").filter(
    call => call.strokeStyle === "#334155" && call.lineWidth === 1.5
  );
  assert.equal(outlinedStrokes.length, 3);
  for (const stroke of outlinedStrokes) {
    assert.equal(stroke.globalAlpha, 0.35);
  }
});

test("matches the area outline primitive with the public edit action", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createAreaOutlineEditPrimitives(cars),
    publicProgram: createAreaOutlineEditCarsDensityArea(cars)
  });
});

function densityTransform(program) {
  const layer = program.semanticSpec.layers.find(item => item.id === "densities");
  const dataset = program.semanticSpec.datasets.find(item => item.id === layer.data);
  return { layer, dataset, transform: dataset.transform[0] };
}

function assertDensityGraphicTarget(program, expected) {
  const areas = program.graphicSpec.objects.densities.children;
  assert.equal(areas.length, expected.areas.length);
  assert.deepEqual(
    areas.map(area => area.properties.commands),
    expected.areas.map(area => [
      { op: "M", ...area.points[0] },
      ...area.points.slice(1).map(point => ({ op: "L", ...point })),
      { op: "Z" }
    ])
  );
  assert.deepEqual(
    program.graphicSpec.objects.yAxisLabels.children.map(
      child => child.properties.text
    ),
    expected.axes.y.ticks.map(tick => tick.label)
  );
  assert.equal(
    program.graphicSpec.objects.horizontalGridLines.children.length,
    expected.grid.horizontal.length
  );
}

test("authors the Epanechnikov kernel target from independent values", () => {
  const program = createEpanechnikovKernelPrimitives(cars);
  const expected = createCarsDensityAreaValues(cars, {
    kernel: "epanechnikov"
  });
  const { dataset, transform } = densityTransform(program);

  assert.equal(transform.kernel, "epanechnikov");
  assert.equal(transform.normalization, "unit");
  assert.deepEqual(dataset.values, expected.densityRows);
  assert.deepEqual(expected.scales.y.domain, [0, 0.3]);
  assertDensityGraphicTarget(program, expected);
});

test("authors the count-normalized magnitude and rematerialized guides", () => {
  const program = createCountNormalizationPrimitives(cars);
  const expected = createCarsDensityAreaValues(cars, {
    normalization: "count"
  });
  const { dataset, transform } = densityTransform(program);

  assert.equal(transform.kernel, "gaussian");
  assert.equal(transform.normalization, "count");
  assert.deepEqual(dataset.values, expected.densityRows);
  assert.deepEqual(expected.scales.y.domain, [0, 40]);
  assert.deepEqual(
    expected.groups.map(group => group.values.length),
    [254, 73, 79]
  );
  assertDensityGraphicTarget(program, expected);
});

test("authors a deterministic triangular count density revision target", () => {
  const program = createDensityRevisionPrimitives(cars);
  const expected = createCarsDensityAreaValues(cars, {
    bandwidth: 0.9,
    kernel: "triangular",
    normalization: "count"
  });
  const { layer, dataset, transform } = densityTransform(program);

  assert.equal(layer.data, "densitiesDensityDataRevision1");
  assert.deepEqual(
    program.semanticSpec.datasets.map(item => item.id),
    ["cars", "densitiesDensityDataRevision1"]
  );
  assert.deepEqual(transform, {
    type: "density",
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.9,
    extent: "auto",
    steps: 100,
    as: ["Acceleration_value", "Acceleration_density"],
    resolve: "shared",
    kernel: "triangular",
    normalization: "count"
  });
  assert.deepEqual(dataset.values, expected.densityRows);
  assertDensityGraphicTarget(program, expected);
  assert.ok(!program.trace.children.some(node =>
    ["encodeDensity", "editDensity"].includes(node.op)
  ));
});

test("matches every approved density primitive with its public action flow", () => {
  for (const [primitiveProgram, publicProgram] of [
    [
      createEpanechnikovKernelPrimitives(cars),
      createEpanechnikovKernelCarsDensityArea(cars)
    ],
    [
      createCountNormalizationPrimitives(cars),
      createCountNormalizationCarsDensityArea(cars)
    ],
    [
      createDensityRevisionPrimitives(cars),
      createDensityRevisionCarsDensityArea(cars)
    ]
  ]) {
    assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  }
});
