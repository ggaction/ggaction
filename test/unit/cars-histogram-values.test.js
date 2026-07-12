import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createCarsHistogramValues } from "../programs/carsHistogramValues.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("derives deterministic bins, stacks, and concrete histogram values", () => {
  const values = createCarsHistogramValues(cars, {
    width: 720,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 },
    maxBins: 7
  });

  assert.equal(values.validCars.length, 406);
  assert.deepEqual(values.origins, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.scales.x, {
    domain: [0, 500],
    range: [80, 660],
    step: 100
  });
  assert.deepEqual(values.scales.y, {
    domain: [0, 150],
    range: [330, 80]
  });
  assert.deepEqual(values.bins.map(bin => bin.total), [98, 137, 68, 81, 22]);
  assert.deepEqual(values.bins.map(bin => bin.counts), [
    { USA: 18, Europe: 33, Japan: 47 },
    { USA: 65, Europe: 40, Japan: 32 },
    { USA: 68, Europe: 0, Japan: 0 },
    { USA: 81, Europe: 0, Japan: 0 },
    { USA: 22, Europe: 0, Japan: 0 }
  ]);
  assert.equal(values.rects.length, 9);
  assert.deepEqual(
    values.rects.slice(0, 3).map(rect => ({
      origin: rect.origin,
      count: rect.count,
      start: rect.stackStart,
      end: rect.stackEnd
    })),
    [
      { origin: "USA", count: 18, start: 0, end: 18 },
      { origin: "Europe", count: 33, start: 18, end: 51 },
      { origin: "Japan", count: 47, start: 51, end: 98 }
    ]
  );
  assert.deepEqual(
    values.grid.horizontal.map(line => line.y1),
    values.axes.y.ticks.map(tick => tick.position)
  );
});

test("validates histogram fixture inputs and empty valid data", () => {
  const options = {
    width: 720,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 },
    maxBins: 7
  };

  assert.throws(() => createCarsHistogramValues({}, options), /array/);
  assert.throws(
    () => createCarsHistogramValues([], options),
    /at least one valid/
  );
  assert.throws(
    () => createCarsHistogramValues(cars, { ...options, maxBins: 0 }),
    /positive integer/
  );
});
