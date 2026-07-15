import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../../support/data.js";
import {
  createMeanConfidenceIntervalReference
} from "../../../support/interval-reference.js";

const T_975 = new Map([
  [70, 1.994437111771186],
  [72, 1.9934635666618716],
  [78, 1.9908470688116904],
  [249, 1.9695368676395824],
  [253, 1.9693848042198945]
]);

function tCritical(degreesOfFreedom, confidence) {
  assert.equal(confidence, 0.95);
  const value = T_975.get(degreesOfFreedom);
  assert.notEqual(value, undefined, `Missing t critical for df=${degreesOfFreedom}.`);
  return value;
}

function assertApproximately(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}.`
  );
}

test("locks the cars Origin acceleration confidence intervals independently", () => {
  const intervals = createMeanConfidenceIntervalReference(loadCars(), {
    field: "Acceleration",
    groupBy: "Origin",
    criticalValue: tCritical
  });

  assert.deepEqual(intervals.map(row => row.Origin), ["USA", "Europe", "Japan"]);
  assert.deepEqual(intervals.map(row => row.count), [254, 73, 79]);
  assert.deepEqual(intervals.map(row => row.degreesOfFreedom), [253, 72, 78]);

  const expected = [
    [14.94251968503937, 2.8045423258909348, 14.595961849124864, 15.289077520953876],
    [16.82191780821918, 3.010917476236478, 16.119418784340315, 17.524416832098044],
    [16.172151898734175, 1.954936992155407, 15.73426987255325, 16.6100339249151]
  ];
  intervals.forEach((row, index) => {
    assertApproximately(row.mean, expected[index][0]);
    assertApproximately(row.sampleStdev, expected[index][1]);
    assertApproximately(row.lower, expected[index][2]);
    assertApproximately(row.upper, expected[index][3]);
  });
});

test("locks the horizontal horsepower interval target", () => {
  const intervals = createMeanConfidenceIntervalReference(loadCars(), {
    field: "Horsepower",
    groupBy: "Origin",
    criticalValue: tCritical
  });

  assert.deepEqual(intervals.map(row => row.count), [250, 71, 79]);
  const expected = [
    [119.9, 114.9187322751494, 124.88126772485062],
    [81, 76.07353506027606, 85.92646493972394],
    [79.83544303797468, 75.84415992764842, 83.82672614830095]
  ];
  intervals.forEach((row, index) => {
    assertApproximately(row.mean, expected[index][0]);
    assertApproximately(row.lower, expected[index][1]);
    assertApproximately(row.upper, expected[index][2]);
  });
});

test("preserves group order, omits undersized groups, and owns no input", () => {
  const rows = [
    { group: "B", value: 3 },
    { group: "A", value: 1 },
    { group: "B", value: 7 },
    { group: "A", value: null },
    { group: "C", value: 5 }
  ];
  const before = structuredClone(rows);
  const intervals = createMeanConfidenceIntervalReference(rows, {
    field: "value",
    groupBy: "group",
    criticalValue: () => 12.706204736432095
  });

  assert.deepEqual(rows, before);
  assert.deepEqual(intervals.map(row => row.group), ["B"]);
  assert.equal(intervals[0].count, 2);
  assert.equal(intervals[0].mean, 5);
  assert.ok(intervals[0].lower < intervals[0].mean);
  assert.ok(intervals[0].mean < intervals[0].upper);
  assertApproximately(
    intervals[0].upper - intervals[0].mean,
    intervals[0].mean - intervals[0].lower
  );
});

test("validates the independent reference inputs", () => {
  assert.throws(
    () => createMeanConfidenceIntervalReference({}, {}),
    /rows must be an array/
  );
  assert.throws(
    () => createMeanConfidenceIntervalReference([], {
      field: "value",
      groupBy: [],
      criticalValue: () => 1
    }),
    /groupBy must contain unique non-empty field names/
  );
  assert.throws(
    () => createMeanConfidenceIntervalReference([], {
      field: "value",
      groupBy: "group",
      confidence: 1,
      criticalValue: () => 1
    }),
    /confidence must be between 0 and 1/
  );
  assert.throws(
    () => createMeanConfidenceIntervalReference([
      { group: "A", value: 1 },
      { group: "A", value: 2 }
    ], {
      field: "value",
      groupBy: "group",
      criticalValue: () => NaN
    }),
    /criticalValue must return a positive finite number/
  );
});
