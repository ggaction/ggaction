import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../support/data.js";

import {
  CENTER_AREA_JOBS,
  createCenterAreaReferenceValues
} from "./reference-values.js";

test("aggregates the actual Jobs fixture at aligned year and occupation grain", () => {
  const jobs = loadJobs();
  const snapshot = structuredClone(jobs);
  const values = createCenterAreaReferenceValues(jobs);

  assert.deepEqual(values.years, [
    1850, 1860, 1870, 1880, 1900, 1910, 1920, 1930,
    1940, 1950, 1960, 1970, 1980, 1990, 2000
  ]);
  assert.equal(values.rows.length, values.years.length * CENTER_AREA_JOBS.length);
  assert.deepEqual(
    values.rows.filter(row => row.year === 1850).map(row => row.count),
    [2_433_461, 193_355, 2_929, 33_146, 808]
  );
  assert.deepEqual(
    values.rows.filter(row => row.year === 2000).map(row => row.count),
    [752_503, 10_037_698, 12_984_890, 5_862_851, 3_908_701]
  );
  assert.deepEqual(jobs, snapshot);
});

test("preserves series thickness and order while changing only the baseline", () => {
  const values = createCenterAreaReferenceValues(loadJobs());
  assert.deepEqual(values.zero.series.map(series => series.job), CENTER_AREA_JOBS);
  assert.deepEqual(values.center.series.map(series => series.job), CENTER_AREA_JOBS);

  for (const year of values.years) {
    const zero = values.zero.series.map(series =>
      series.values.find(value => value.year === year)
    );
    const center = values.center.series.map(series =>
      series.values.find(value => value.year === year)
    );
    const total = zero.reduce((sum, value) => sum + value.count, 0);
    assert.equal(zero[0].lower, 0);
    assert.equal(zero.at(-1).upper, total);
    assert.equal(center[0].lower, -total / 2);
    assert.equal(center.at(-1).upper, total / 2);
    zero.forEach((value, index) => {
      assert.equal(value.upper - value.lower, value.count);
      assert.equal(center[index].upper - center[index].lower, value.count);
      assert.equal(center[index].lower - zero[index].lower, -total / 2);
    });
  }
});

test("rejects negative selected values and missing aligned partitions", () => {
  const jobs = loadJobs();
  const negative = jobs.map(row => row.job === "Farmer" && row.year === 1850
    ? { ...row, count: -1 }
    : row
  );
  assert.throws(
    () => createCenterAreaReferenceValues(negative),
    /non-negative counts/
  );
  const missing = jobs.filter(row => !(row.job === "Nurse" && row.year === 1850));
  assert.throws(
    () => createCenterAreaReferenceValues(missing),
    /missing Nurse at 1850/
  );
});
