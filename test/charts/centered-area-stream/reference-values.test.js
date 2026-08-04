import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../support/data.js";
import {
  CENTERED_AREA_JOBS,
  createCenteredAreaReferenceValues
} from "./reference-values.js";

test("aggregates actual Jobs rows at aligned year and occupation grain", () => {
  const jobs = loadJobs();
  const snapshot = structuredClone(jobs);
  const values = createCenteredAreaReferenceValues(jobs);

  assert.deepEqual(values.years, [
    1850, 1860, 1870, 1880, 1900, 1910, 1920, 1930,
    1940, 1950, 1960, 1970, 1980, 1990, 2000
  ]);
  assert.equal(values.rows.length, values.years.length * CENTERED_AREA_JOBS.length);
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

test("centers every non-negative partition while preserving thickness and order", () => {
  const values = createCenteredAreaReferenceValues(loadJobs());
  assert.deepEqual(values.series.map(series => series.job), CENTERED_AREA_JOBS);

  for (const year of values.years) {
    const partition = values.series.map(series =>
      series.values.find(value => value.year === year)
    );
    const total = partition.reduce((sum, value) => sum + value.count, 0);
    assert.equal(partition[0].lower, -total / 2);
    assert.equal(partition.at(-1).upper, total / 2);
    partition.forEach((value, index) => {
      assert.equal(value.upper - value.lower, value.count);
      if (index > 0) assert.equal(value.lower, partition[index - 1].upper);
    });
  }
});

test("rejects negative values and missing aligned partitions", () => {
  const jobs = loadJobs();
  const negative = jobs.map(row => row.job === "Farmer" && row.year === 1850
    ? { ...row, count: -1 }
    : row
  );
  assert.throws(
    () => createCenteredAreaReferenceValues(negative),
    /non-negative counts/
  );
  const missing = jobs.filter(row => !(row.job === "Nurse" && row.year === 1850));
  assert.throws(
    () => createCenteredAreaReferenceValues(missing),
    /missing Nurse at 1850/
  );
});
