import assert from "node:assert/strict";
import test from "node:test";

import {
  layoutSeriesPartition,
  resolveSeriesLayoutDomainValues,
  validateColorLayout
} from "../../../../src/grammar/seriesLayout.js";
import { layoutDensityAreaSeries } from
  "../../../../src/grammar/areaSeries.js";

test("lays out overlay and grouped values from one baseline", () => {
  for (const layout of ["group", "overlay"]) {
    assert.deepEqual(layoutSeriesPartition([2, 1, 3], layout, { baseline: 1 }), [
      { index: 0, value: 2, start: 1, end: 2 },
      { index: 2, value: 3, start: 1, end: 3 }
    ]);
  }
});

test("lays out absolute and normalized non-negative stacks", () => {
  assert.deepEqual(layoutSeriesPartition([2, 0, 3], "stack"), [
    { index: 0, value: 2, start: 0, end: 2 },
    { index: 2, value: 3, start: 2, end: 5 }
  ]);
  assert.deepEqual(layoutSeriesPartition([2, 0, 3], "fill"), [
    { index: 0, value: 2, start: 0, end: 0.4 },
    { index: 2, value: 3, start: 0.4, end: 1 }
  ]);
  assert.deepEqual(layoutSeriesPartition([0, 0], "fill"), []);
  assert.throws(() => layoutSeriesPartition([1, -1], "stack"), /non-negative/);
  assert.throws(() => layoutSeriesPartition([1, -1], "fill"), /non-negative/);
});

test("accumulates positive and negative values independently", () => {
  assert.deepEqual(layoutSeriesPartition([3, -2, 4, -1, 0], "diverging"), [
    { index: 0, value: 3, start: 0, end: 3 },
    { index: 1, value: -2, start: 0, end: -2 },
    { index: 2, value: 4, start: 3, end: 7 },
    { index: 3, value: -1, start: -2, end: -3 }
  ]);
});

test("resolves layout domain inputs from complete partitions", () => {
  const partitions = [[2, 3], [4, 1]];
  assert.deepEqual(resolveSeriesLayoutDomainValues(partitions, "fill"), [0, 1]);
  assert.deepEqual(
    resolveSeriesLayoutDomainValues(partitions, "overlay"),
    [0, 2, 3, 0, 4, 1]
  );
  assert.deepEqual(
    resolveSeriesLayoutDomainValues(partitions, "group"),
    [0, 2, 3, 0, 4, 1]
  );
  assert.deepEqual(
    resolveSeriesLayoutDomainValues(partitions, "stack"),
    [0, 2, 2, 5, 0, 4, 4, 5]
  );
  assert.deepEqual(
    resolveSeriesLayoutDomainValues([[3, -2], [1, -4]], "diverging"),
    [0, 3, 0, -2, 0, 1, 0, -4]
  );
});

test("validates layout vocabulary and numeric inputs", () => {
  assert.equal(validateColorLayout("overlay"), "overlay");
  assert.throws(() => validateColorLayout("center"), /Unsupported color layout/);
  assert.throws(() => layoutSeriesPartition([1, NaN], "stack"), /finite numbers/);
  assert.throws(
    () => layoutSeriesPartition([1], "overlay", { baseline: NaN }),
    /baseline/
  );
});

test("aligns density series into stacked and normalized area bounds", () => {
  const derived = {
    mode: "y-density",
    series: [
      { key: { group: "A" }, values: [{ x: 0, y: 1 }, { x: 1, y: 3 }] },
      { key: { group: "B" }, values: [{ x: 0, y: 1 }, { x: 1, y: 1 }] }
    ]
  };
  const stacked = layoutDensityAreaSeries(derived, "stack");
  const filled = layoutDensityAreaSeries(derived, "fill");

  assert.deepEqual(stacked.series[1].values, [
    { x: 0, lower: 1, upper: 2 },
    { x: 1, lower: 3, upper: 4 }
  ]);
  assert.deepEqual(filled.series[0].values, [
    { x: 0, lower: 0, upper: 0.5 },
    { x: 1, lower: 0, upper: 0.75 }
  ]);
  assert.throws(
    () => layoutDensityAreaSeries(derived, "group"),
    /do not support "group"/
  );
  assert.equal(Object.isFrozen(stacked.series[0].values), true);
});
