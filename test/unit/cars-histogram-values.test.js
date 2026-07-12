import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createCarsHistogramValues } from "../programs/carsHistogramValues.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("derives deterministic bins, stacks, and concrete histogram values", () => {
  const values = createCarsHistogramValues(cars, {
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 },
    maxBins: 10
  });

  assert.equal(values.validCars.length, 406);
  assert.deepEqual(values.origins, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.scales.x, {
    domain: [50, 500],
    range: [80, 372],
    step: 50
  });
  assert.deepEqual(values.scales.y, {
    domain: [0, 150],
    range: [330, 80]
  });
  assert.deepEqual(
    values.bins.map(bin => bin.total),
    [98, 104, 33, 40, 28, 44, 37, 18, 4]
  );
  assert.deepEqual(values.bins.map(bin => bin.counts), [
    { USA: 18, Europe: 33, Japan: 47 },
    { USA: 40, Europe: 36, Japan: 28 },
    { USA: 25, Europe: 4, Japan: 4 },
    { USA: 40, Europe: 0, Japan: 0 },
    { USA: 28, Europe: 0, Japan: 0 },
    { USA: 44, Europe: 0, Japan: 0 },
    { USA: 37, Europe: 0, Japan: 0 },
    { USA: 18, Europe: 0, Japan: 0 },
    { USA: 4, Europe: 0, Japan: 0 }
  ]);
  assert.equal(values.rects.length, 15);
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
  assert.equal(values.legend.title.x, 216);
  assert.equal(
    values.legend.items[0].x + values.legend.width / 2,
    216
  );
});

test("validates histogram fixture inputs and empty valid data", () => {
  const options = {
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 },
    maxBins: 10
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
