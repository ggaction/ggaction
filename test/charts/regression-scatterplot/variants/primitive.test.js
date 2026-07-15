import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import { assertChartProgramsEquivalent } from
  "../../../support/chart-equivalence.js";
import {
  createComparisonFilterCarsRegressionScatterplot,
  createComponentEditCarsRegressionScatterplot,
  createLoessCarsRegressionScatterplot,
  createPolynomialCarsRegressionScatterplot,
  createPredictionIntervalCarsRegressionScatterplot,
  createRangeFilterCarsRegressionScatterplot
} from
  "../../../../examples/cars-regression-scatterplot/program.js";
import {
  createCarsRegressionScatterplotPrimitives,
  renderCarsRegressionScatterplotPrimitives
} from "../primitive.program.js";
import { createCarsRegressionScatterplotValues } from "../reference-values.js";
import {
  createComparisonFilterPrimitives,
  createComponentEditPrimitives,
  createLoessRegressionPrimitives,
  createPolynomialRegressionPrimitives,
  createPredictionIntervalPrimitives,
  createRangeFilterPrimitives
} from "./primitive-programs.js";

const cars = loadCars();

test("authors regression component edit targets with low-level graphic edits", () => {
  const baseline = createCarsRegressionScatterplotPrimitives(cars);
  const program = createComponentEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsRegressionScatterplotPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(
    program.graphicSpec.objects.pointsRegressionBands.children.map(child => ({
      fill: child.properties.fill,
      opacity: child.properties.opacity,
      stroke: child.properties.stroke,
      strokeWidth: child.properties.strokeWidth
    })),
    Array.from({ length: 2 }, () => ({
      fill: "#475569",
      opacity: 0.12,
      stroke: "#111827",
      strokeWidth: 1.5
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.pointsRegressionLines.children.map(
      child => child.properties.strokeWidth
    ),
    [5, 5]
  );
  assert.equal(findCanvasCalls(context, "stroke").filter(
    call => call.strokeStyle === "#111827" && call.lineWidth === 1.5
  ).length, 2);
  assert.equal(findCanvasCalls(context, "stroke").filter(
    call => call.lineWidth === 5
  ).length, 2);
});

test("matches component primitives with regression edit actions", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createComponentEditPrimitives(cars),
    publicProgram: createComponentEditCarsRegressionScatterplot(cars)
  });
});

test("authors comparison and range filter targets with primitive state", () => {
  const variants = [{
    program: createComparisonFilterPrimitives(cars),
    filter: {
      field: "Horsepower",
      predicate: { op: "gte", value: 150 }
    },
    count: 71,
    groups: ["USA"]
  }, {
    program: createRangeFilterPrimitives(cars),
    filter: {
      field: "Displacement",
      range: { min: 100, max: 300, inclusive: true }
    },
    count: 205,
    groups: ["Europe", "Japan", "USA"]
  }];

  for (const { program, filter, count, groups } of variants) {
    const expected = createCarsRegressionScatterplotValues(cars, { filter });
    const selected = program.semanticSpec.datasets.find(
      dataset => dataset.id === "pointsFilteredData"
    );
    const regression = program.semanticSpec.datasets.find(
      dataset => dataset.id === "pointsRegressionData"
    );

    assert.deepEqual(selected.transform, [{ type: "filter", ...filter }]);
    assert.deepEqual(selected.values, expected.filteredRows);
    assert.equal(selected.values.length, count);
    assert.deepEqual(
      [...new Set(selected.values.map(row => row.Origin))],
      groups
    );
    assert.deepEqual(regression.values, expected.regressionRows);
    assert.equal(program.graphicSpec.objects.points.children.length, count);
    assert.equal(
      program.graphicSpec.objects.pointsRegressionLines.children.length,
      groups.length
    );
    assert.equal(
      program.graphicSpec.objects.pointsRegressionBands.children.length,
      groups.length
    );
    assert.ok(!program.trace.children.some(node => node.op === "filterData"));
  }
});

test("matches filter primitives with public filterMark modes", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createComparisonFilterPrimitives(cars),
    publicProgram: createComparisonFilterCarsRegressionScatterplot(cars)
  });
  assertChartProgramsEquivalent({
    primitiveProgram: createRangeFilterPrimitives(cars),
    publicProgram: createRangeFilterCarsRegressionScatterplot(cars)
  });
});

test("authors polynomial, LOESS, and prediction targets as raw primitives", () => {
  const polynomial = createPolynomialRegressionPrimitives(cars);
  const loess = createLoessRegressionPrimitives(cars);
  const prediction = createPredictionIntervalPrimitives(cars);

  assert.deepEqual(
    polynomial.semanticSpec.datasets[2].transform[0],
    createCarsRegressionScatterplotValues(cars, {
      method: "polynomial",
      degree: 2
    }).regressionTransform
  );
  assert.deepEqual(
    loess.semanticSpec.datasets[2].transform[0],
    createCarsRegressionScatterplotValues(cars, {
      method: "loess",
      span: 0.55
    }).regressionTransform
  );
  assert.deepEqual(
    prediction.semanticSpec.datasets[2].transform[0],
    createCarsRegressionScatterplotValues(cars, {
      interval: "prediction"
    }).regressionTransform
  );
  assert.ok(polynomial.graphicSpec.objects.pointsRegressionBands);
  assert.ok(prediction.graphicSpec.objects.pointsRegressionBands);
  assert.equal(loess.graphicSpec.objects.pointsRegressionBands, undefined);
  assert.deepEqual(
    loess.semanticSpec.layers.map(layer => layer.id),
    ["points", "pointsRegressionLines"]
  );
  assert.ok(!loess.trace.children.some(node =>
    JSON.stringify(node.args).includes("pointsRegressionBands")
  ));
  for (const program of [polynomial, loess, prediction]) {
    assert.ok(!program.trace.children.some(node => node.op === "createRegression"));
  }
});

test("matches regression method primitives with public action flows", () => {
  assertChartProgramsEquivalent({
    primitiveProgram: createPolynomialRegressionPrimitives(cars),
    publicProgram: createPolynomialCarsRegressionScatterplot(cars)
  });
  assertChartProgramsEquivalent({
    primitiveProgram: createLoessRegressionPrimitives(cars),
    publicProgram: createLoessCarsRegressionScatterplot(cars)
  });
  assertChartProgramsEquivalent({
    primitiveProgram: createPredictionIntervalPrimitives(cars),
    publicProgram: createPredictionIntervalCarsRegressionScatterplot(cars)
  });
});
