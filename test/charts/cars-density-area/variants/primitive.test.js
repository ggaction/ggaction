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
  createEpanechnikovKernelCarsDensityArea,
  createWrappedBottomTitleCarsDensityArea
} from "../../../../examples/cars-density-area/program.js";
import {
  createCarsDensityAreaPrimitives,
  renderCarsDensityAreaPrimitives
} from "../primitive.program.js";
import { createAreaOutlineEditPrimitives } from "./primitive-programs.js";
import {
  createCountNormalizationPrimitives,
  createDensityRevisionPrimitives,
  createEpanechnikovKernelPrimitives,
  createWrappedBottomTitlePrimitives
} from "./primitive-programs.js";
import { createCarsDensityAreaValues } from "../reference-values.js";
import { wrappedBottomTitleTarget } from "./title-reference.js";

const cars = loadCars();

test("authors the density area outline target with low-level graphic edits", () => {
  const baseline = createCarsDensityAreaPrimitives(cars);
  const program = createAreaOutlineEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsDensityAreaPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(
    program.graphicSpec.objects.densities.items.map(child => ({
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
  const areas = program.graphicSpec.objects.densities.items;
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
    program.graphicSpec.objects.yAxisLabels.items.map(
      child => child.properties.text
    ),
    expected.axes.y.ticks.map(tick => tick.label)
  );
  assert.equal(
    program.graphicSpec.objects.horizontalGridLines.items.length,
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
    normalization: "count",
    resolved: {
      bandwidth: 0.9,
      extent: [8, 24.8]
    }
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

test("authors a wrapped bottom title as concrete text children", () => {
  const program = createWrappedBottomTitlePrimitives(cars);
  const target = wrappedBottomTitleTarget;
  const title = program.graphicSpec.objects.chartTitle;
  const subtitle = program.graphicSpec.objects.chartSubtitle;
  const context = createMockCanvasContext();

  renderCarsDensityAreaPrimitives(program, context);

  assert.equal(program.graphicSpec.objects.canvas.properties.height, target.height);
  assert.deepEqual(program.semanticSpec.title, {
    text: target.options.text,
    subtitle: target.options.subtitle
  });
  assert.deepEqual(title.items.map(child => child.properties.text),
    target.title.lines);
  assert.deepEqual(title.items.map(child => child.properties.y), target.title.y);
  assert.deepEqual(subtitle.items.map(child => child.properties.text),
    target.subtitle.lines);
  assert.deepEqual(subtitle.items.map(child => child.properties.y),
    target.subtitle.y);
  assert.deepEqual(
    target.title.y.slice(1).map((value, index) => value - target.title.y[index]),
    Array(target.title.y.length - 1).fill(target.options.lineHeight)
  );
  assert.deepEqual(
    target.subtitle.y.slice(1).map(
      (value, index) => value - target.subtitle.y[index]
    ),
    [target.options.lineHeight]
  );
  assert.equal(
    target.longTokenFallback.lines.join(""),
    target.longTokenFallback.text
  );
  assert.equal(target.longTokenFallback.lines.every(line => line.length > 0), true);
  assert.equal(title.items.every(child =>
    child.properties.x === target.title.x &&
    child.properties.textAlign === "center" &&
    child.properties.rotation === 0
  ), true);
  assert.equal(subtitle.items.every(child =>
    child.properties.x === target.subtitle.x &&
    child.properties.textAlign === "center" &&
    child.properties.rotation === 0
  ), true);
  const xAxisTitle = program.graphicSpec.objects.xAxisTitle.properties;
  assert.equal(
    target.occupiedBounds.y > xAxisTitle.y + xAxisTitle.fontSize / 2,
    true
  );
  assert.equal(
    target.occupiedBounds.y + target.occupiedBounds.height < target.height,
    true
  );
  assert.deepEqual(
    findCanvasCalls(context, "fillText")
      .filter(call => [...target.title.lines, ...target.subtitle.lines]
        .includes(call.args[0]))
      .map(call => call.args[0]),
    [...target.title.lines, ...target.subtitle.lines]
  );
  assert.equal(program.trace.children.some(node => node.op === "editTitle"), false);
});

test("matches the approved wrapped title primitive with createTitle", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createWrappedBottomTitlePrimitives(cars),
    publicProgram: createWrappedBottomTitleCarsDensityArea(cars)
  });
});
