import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../support/data.js";
import { createHorizontalGroupedBarValues } from "./reference-values.js";

test("derives deterministic horizontal grouped-bar aggregates and scales", () => {
  const values = createHorizontalGroupedBarValues(loadJobs());

  assert.equal(values.rows.length, 7650);
  assert.deepEqual(values.years, [
    1850, 1860, 1870, 1880, 1900, 1910, 1920, 1930,
    1940, 1950, 1960, 1970, 1980, 1990, 2000
  ]);
  assert.deepEqual(values.groups, ["men", "women"]);
  assert.equal(values.cells.length, 30);
  assert.deepEqual(values.cells[0], {
    year: 1850,
    sex: "men",
    mean: 0.0038838175045594462,
    count: 255
  });
  assert.deepEqual(values.cells.at(-1), {
    year: 2000,
    sex: "women",
    mean: 0.0018797553829098255,
    count: 255
  });
  assert.deepEqual(values.scales.x, {
    domain: [0, 0.004],
    range: [82, 620],
    step: 0.001
  });
  assert.deepEqual(values.scales.yOffset, {
    domain: ["men", "women"],
    range: [0, 32.4],
    step: 16.2,
    bandwidth: 16.2,
    start: 0
  });
});

test("places every grouped bar inside one non-overlapping year slot", () => {
  const values = createHorizontalGroupedBarValues(loadJobs());

  for (const year of values.years) {
    const rects = values.rects.filter(rect => rect.year === year);
    assert.equal(rects.length, 2);
    const category = values.years.indexOf(year);
    const start = values.bounds.y + category * values.scales.y.step;
    const end = start + values.scales.y.step;
    assert.equal(rects.every(rect => rect.y >= start && rect.y + rect.height <= end), true);
    assert.equal(rects[0].y + rects[0].height <= rects[1].y, true);
  }
  assert.equal(values.rects.every(rect => rect.x === values.bounds.x), true);
  assert.equal(values.rects.every(rect => rect.width >= 0), true);
  assert.equal(values.rects.every(rect => rect.x + rect.width <= 620), true);
});

test("validates horizontal grouped-bar layout inputs independently", () => {
  const rows = loadJobs();
  assert.throws(
    () => createHorizontalGroupedBarValues(rows, { band: 0 }),
    /band must be greater/
  );
  assert.throws(
    () => createHorizontalGroupedBarValues(rows, { paddingInner: 1 }),
    /paddingInner/
  );
  assert.throws(
    () => createHorizontalGroupedBarValues([], {}),
    /at least one valid job row/
  );
});
