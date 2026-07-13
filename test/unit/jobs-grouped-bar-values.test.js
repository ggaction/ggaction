import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createJobsGroupedBarValues } from "../programs/jobsGroupedBarValues.js";

const jobs = JSON.parse(
  readFileSync(new URL("../../data/jobs.json", import.meta.url), "utf8")
);
const layout = {
  width: 720,
  height: 460,
  margin: { top: 40, right: 140, bottom: 70, left: 80 },
  band: 0.72
};

test("derives deterministic grouped means and concrete bar geometry", () => {
  const values = createJobsGroupedBarValues(jobs, layout);

  assert.equal(values.validJobs.length, 7650);
  assert.deepEqual(values.years, [
    1850, 1860, 1870, 1880, 1900, 1910, 1920, 1930,
    1940, 1950, 1960, 1970, 1980, 1990, 2000
  ]);
  assert.deepEqual(values.sexes, ["men", "women"]);
  assert.equal(values.cells.length, 30);
  assert.equal(values.rects.length, 30);
  assert.equal(values.cells.every(cell => cell.count === 255), true);
  assert.equal(values.cells[0].mean, 0.0038838175045594462);
  assert.deepEqual(values.scales.y.domain, [0, 0.004]);
  assert.equal(values.rects.every(rect => rect.width === 12), true);
  assert.equal(values.rects.every(rect => rect.height >= 0), true);

  const firstGroup = values.rects.filter(rect => rect.year === 1850);
  assert.equal(firstGroup[0].x + firstGroup[0].width <= firstGroup[1].x, true);
  assert.equal(
    firstGroup.every(rect =>
      rect.x >= layout.margin.left &&
      rect.x + rect.width <= layout.margin.left + values.scales.x.bandwidth
    ),
    true
  );
});

test("validates grouped bar fixture inputs and omits missing cells", () => {
  const missing = jobs.filter(row => !(row.year === 1850 && row.sex === "women"));
  const values = createJobsGroupedBarValues(missing, layout);
  assert.equal(values.rects.some(rect => rect.year === 1850 && rect.sex === "women"), false);

  assert.throws(
    () => createJobsGroupedBarValues([], layout),
    /at least one valid job row/
  );
  assert.throws(
    () => createJobsGroupedBarValues(jobs, { ...layout, band: 0 }),
    /greater than 0/
  );
});
