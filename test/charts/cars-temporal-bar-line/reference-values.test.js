import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { createCarsTemporalBarLineValues } from "./reference-values.js";

test("computes independent yearly acceleration means", () => {
  const values = createCarsTemporalBarLineValues(loadCars());

  assert.deepEqual(values.summaries.map(summary => summary.year), [
    1970, 1971, 1972, 1973, 1974, 1975,
    1976, 1977, 1978, 1979, 1980, 1982
  ]);
  assert.deepEqual(values.summaries.map(summary => summary.count), [
    35, 29, 28, 40, 27, 30, 34, 28, 36, 29, 29, 61
  ]);
  assert.equal(values.summaries[0].mean, 12.714285714285714);
  assert.equal(values.summaries[10].mean, 16.93448275862069);
  assert.equal(values.summaries.at(-1).mean, 16.460655737704922);
});

test("preserves temporal gaps and one shared center mapping", () => {
  const values = createCarsTemporalBarLineValues(loadCars());
  const index1979 = values.points.findIndex(point => point.year === 1979);
  const index1980 = values.points.findIndex(point => point.year === 1980);
  const index1982 = values.points.findIndex(point => point.year === 1982);
  const oneYear = values.points[index1980].x - values.points[index1979].x;
  const twoYears = values.points[index1982].x - values.points[index1980].x;

  assert.ok(twoYears > oneYear * 1.9);
  values.bars.forEach((bar, index) => {
    assert.ok(Math.abs(bar.x + bar.width / 2 - values.points[index].x) < 1e-9);
    assert.equal(bar.y, values.points[index].y);
    assert.equal(values.lineCommands[index].x, values.points[index].x);
    assert.equal(values.lineCommands[index].y, values.points[index].y);
  });
});

test("validates reference inputs without importing production materializers", () => {
  assert.throws(
    () => createCarsTemporalBarLineValues(),
    /requires rows/
  );
  assert.throws(
    () => createCarsTemporalBarLineValues([{ Year: "bad", Acceleration: 1 }]),
    /valid Year/
  );
  assert.throws(
    () => createCarsTemporalBarLineValues([{ Year: "1970-01-01", Acceleration: 1 }]),
    /at least two years/
  );
});
