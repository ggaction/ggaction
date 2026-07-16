import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import {
  BOX_PLOT_FIELDS,
  createCarsBoxPlotReferenceValues,
  createCarsHorizontalMinmaxReferenceValues
} from "./reference-values.js";

test("locks independent Cars Tukey box summaries and outliers", () => {
  const values = createCarsBoxPlotReferenceValues(loadCars());

  assert.deepEqual(values.categories, ["USA", "Japan", "Europe"]);
  assert.deepEqual(values.scales.y.domain, [0, 50]);
  assert.deepEqual(
    values.summaries.map(row => ({
      origin: row.Origin,
      count: row[BOX_PLOT_FIELDS.count],
      q1: row[BOX_PLOT_FIELDS.q1],
      median: row[BOX_PLOT_FIELDS.median],
      q3: row[BOX_PLOT_FIELDS.q3],
      lower: row[BOX_PLOT_FIELDS.lowerWhisker],
      upper: row[BOX_PLOT_FIELDS.upperWhisker]
    })),
    [
      { origin: "USA", count: 249, q1: 15, median: 18.5, q3: 24, lower: 9, upper: 36.1 },
      { origin: "Japan", count: 79, q1: 25.7, median: 31.6, q3: 34.05, lower: 18, upper: 44.6 },
      { origin: "Europe", count: 70, q1: 24, median: 26.5, q3: 30.65, lower: 16.2, upper: 37.3 }
    ]
  );
  assert.deepEqual(values.outlierSourceIndices, [251, 316, 329, 332, 333, 337, 351, 386, 395, 402]);
  assert.deepEqual(
    values.outliers.reduce((counts, row) => ({
      ...counts,
      [row.Origin]: (counts[row.Origin] ?? 0) + 1
    }), {}),
    { Europe: 6, Japan: 1, USA: 3 }
  );
});

test("uses observed whiskers, linear quartiles, and source-order outliers", () => {
  const values = createCarsBoxPlotReferenceValues(loadCars());

  for (const summary of values.summaries) {
    assert.ok(summary[BOX_PLOT_FIELDS.lowerFence] <= summary[BOX_PLOT_FIELDS.lowerWhisker]);
    assert.ok(summary[BOX_PLOT_FIELDS.lowerWhisker] <= summary[BOX_PLOT_FIELDS.q1]);
    assert.ok(summary[BOX_PLOT_FIELDS.q1] <= summary[BOX_PLOT_FIELDS.median]);
    assert.ok(summary[BOX_PLOT_FIELDS.median] <= summary[BOX_PLOT_FIELDS.q3]);
    assert.ok(summary[BOX_PLOT_FIELDS.q3] <= summary[BOX_PLOT_FIELDS.upperWhisker]);
    assert.ok(summary[BOX_PLOT_FIELDS.upperWhisker] <= summary[BOX_PLOT_FIELDS.upperFence]);
  }
  assert.deepEqual(
    values.outlierSourceIndices,
    [...values.outlierSourceIndices].sort((left, right) => left - right)
  );
  assert.equal(values.boxes[0].width, 56);
  assert.deepEqual(values.medians.map(rule => rule.x2 - rule.x1), [56, 56, 56]);
  assert.deepEqual(values.boxColors, ["#4c78a8", "#f58518", "#e45756"]);
  assert.ok(values.outlierGraphics.every(graphic =>
    graphic.type === "path" && graphic.properties.fill === "#111111"
  ));
});

test("owns caller rows and rejects invalid measures or empty valid input", () => {
  const cars = loadCars();
  const values = createCarsBoxPlotReferenceValues(cars);
  const first = structuredClone(values.validCars[0]);

  cars[0].Origin = "changed";
  assert.deepEqual(values.validCars[0], first);
  assert.throws(
    () => createCarsBoxPlotReferenceValues([{ Origin: "USA", Miles_per_Gallon: "fast" }]),
    /finite Miles_per_Gallon/
  );
  assert.throws(
    () => createCarsBoxPlotReferenceValues([{ Origin: null, Miles_per_Gallon: null }]),
    /at least one valid row/
  );
});

test("locks independent Cars horizontal minmax summaries", () => {
  const values = createCarsHorizontalMinmaxReferenceValues(loadCars());

  assert.deepEqual(values.categories, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.scales.x.domain, [0, 250]);
  assert.deepEqual(
    values.summaries.map(row => ({
      origin: row.Origin,
      count: row[BOX_PLOT_FIELDS.count],
      q1: row[BOX_PLOT_FIELDS.q1],
      median: row[BOX_PLOT_FIELDS.median],
      q3: row[BOX_PLOT_FIELDS.q3],
      lower: row[BOX_PLOT_FIELDS.lowerWhisker],
      upper: row[BOX_PLOT_FIELDS.upperWhisker]
    })),
    [
      { origin: "USA", count: 250, q1: 88, median: 106, q3: 150, lower: 52, upper: 230 },
      { origin: "Europe", count: 71, q1: 69.5, median: 77, q3: 90.5, lower: 46, upper: 133 },
      { origin: "Japan", count: 79, q1: 67, median: 75, q3: 95, lower: 52, upper: 132 }
    ]
  );
});

test("maps horizontal bodies, minmax whiskers, and vertical medians", () => {
  const values = createCarsHorizontalMinmaxReferenceValues(loadCars());

  assert.equal(values.boxes.length, 3);
  assert.equal(values.whiskers.length, 3);
  assert.equal(values.medians.length, 3);
  assert.ok(values.whiskers.every(rule => rule.y1 === rule.y2));
  assert.ok(values.lowerCaps.every(rule => rule.x1 === rule.x2));
  assert.ok(values.upperCaps.every(rule => rule.x1 === rule.x2));
  assert.ok(values.medians.every(rule => rule.x1 === rule.x2));
  assert.ok(values.medians.every((rule, index) =>
    rule.y1 === values.boxes[index].y &&
    rule.y2 === values.boxes[index].y + values.boxes[index].height
  ));
});
