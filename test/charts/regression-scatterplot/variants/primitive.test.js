import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import { assertChartProgramsEquivalent } from
  "../../../support/chart-equivalence.js";
import { createComponentEditCarsRegressionScatterplot } from
  "../../../../examples/cars-regression-scatterplot/program.js";
import {
  createCarsRegressionScatterplotPrimitives,
  renderCarsRegressionScatterplotPrimitives
} from "../primitive.program.js";
import { createCarsRegressionScatterplotValues } from "../reference-values.js";
import {
  createComparisonFilterPrimitives,
  createComponentEditPrimitives,
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
      dataset => dataset.id === "selectedCars"
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
