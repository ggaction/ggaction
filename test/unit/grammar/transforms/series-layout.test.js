import assert from "node:assert/strict";
import test from "node:test";

import {
  layoutSeriesPartition,
  resolveSeriesLayoutDomainValues,
  validateColorLayout
} from "../../../../src/grammar/seriesLayout.js";
import {
  deriveCenteredAreaSeries,
  layoutDensityAreaSeries
} from
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

test("lays out a non-negative stack symmetrically around zero", () => {
  assert.deepEqual(layoutSeriesPartition([2, 0, 3], "center"), [
    { index: 0, value: 2, start: -2.5, end: -0.5 },
    { index: 2, value: 3, start: -0.5, end: 2.5 }
  ]);
  assert.deepEqual(layoutSeriesPartition([0, 0], "center"), []);
  assert.throws(
    () => layoutSeriesPartition([1, -1], "center"),
    /center layout requires non-negative/
  );
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
    resolveSeriesLayoutDomainValues(partitions, "center"),
    [-2.5, -0.5, -0.5, 2.5, -2.5, 1.5, 1.5, 2.5]
  );
  assert.deepEqual(
    resolveSeriesLayoutDomainValues([[0, 0], [2, 0]], "center"),
    [0, -1, 1]
  );
  assert.deepEqual(
    resolveSeriesLayoutDomainValues([[3, -2], [1, -4]], "diverging"),
    [0, 3, 0, -2, 0, 1, 0, -4]
  );
});

test("validates layout vocabulary and numeric inputs", () => {
  assert.equal(validateColorLayout("overlay"), "overlay");
  assert.equal(validateColorLayout("center"), "center");
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
  const centered = layoutDensityAreaSeries(derived, "center");

  assert.deepEqual(stacked.series[1].values, [
    { x: 0, lower: 1, upper: 2 },
    { x: 1, lower: 3, upper: 4 }
  ]);
  assert.deepEqual(filled.series[0].values, [
    { x: 0, lower: 0, upper: 0.5 },
    { x: 1, lower: 0, upper: 0.75 }
  ]);
  assert.deepEqual(centered.series[0].values, [
    { x: 0, lower: -1, upper: 0 },
    { x: 1, lower: -2, upper: 1 }
  ]);
  assert.deepEqual(centered.series[1].values, [
    { x: 0, lower: 0, upper: 1 },
    { x: 1, lower: 1, upper: 2 }
  ]);
  assert.throws(
    () => layoutDensityAreaSeries(derived, "group"),
    /do not support "group"/
  );
  assert.equal(Object.isFrozen(stacked.series[0].values), true);
});

test("keeps zero-thickness centered area series on the current stack boundary", () => {
  const derived = {
    mode: "y-density",
    series: [
      { key: { group: "A" }, values: [{ x: 0, y: 2 }, { x: 1, y: 1 }] },
      { key: { group: "B" }, values: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
      { key: { group: "C" }, values: [{ x: 0, y: 4 }, { x: 1, y: 3 }] }
    ]
  };
  const centered = layoutDensityAreaSeries(derived, "center");
  assert.deepEqual(centered.series[1].values, [
    { x: 0, lower: -1, upper: -1 },
    { x: 1, lower: -1, upper: -1 }
  ]);
});

test("derives aligned raw area rows into centered lower and upper series", () => {
  const rows = [
    { x: 0, group: "A", value: 2 },
    { x: 1, group: "A", value: 4 },
    { x: 0, group: "B", value: 1 },
    { x: 1, group: "B", value: 2 }
  ];
  const layer = {
    id: "stream",
    mark: { type: "area" },
    encoding: {
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "value", fieldType: "quantitative", stack: "center" },
      group: { field: "group", fieldType: "nominal" },
      color: { field: "group", fieldType: "nominal", layout: "center" }
    }
  };
  const derived = deriveCenteredAreaSeries(rows, layer);

  assert.equal(derived.mode, "y-center");
  assert.deepEqual(derived.xValues, [0, 1]);
  assert.deepEqual(derived.yValues, [-1.5, 0.5, -3, 1, 0.5, 1.5, 1, 3]);
  assert.deepEqual(derived.series[0].values, [
    { x: 0, y: 2, lower: -1.5, upper: 0.5 },
    { x: 1, y: 4, lower: -3, upper: 1 }
  ]);
  assert.deepEqual(derived.series[1].values, [
    { x: 0, y: 1, lower: 0.5, upper: 1.5 },
    { x: 1, y: 2, lower: 1, upper: 3 }
  ]);
  assert.equal(Object.isFrozen(derived.series[0].values), true);
});

test("rejects incomplete or duplicate centered area topology", () => {
  const layer = {
    id: "stream",
    mark: { type: "area" },
    encoding: {
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "value", fieldType: "quantitative", stack: "center" },
      group: { field: "group", fieldType: "nominal" }
    }
  };
  assert.throws(
    () => deriveCenteredAreaSeries([
      { x: 0, group: "A", value: 1 },
      { x: 1, group: "A", value: 2 },
      { x: 0, group: "B", value: 3 }
    ], layer),
    /one aligned value/
  );
  assert.throws(
    () => deriveCenteredAreaSeries([
      { x: 0, group: "A", value: 1 },
      { x: 0, group: "A", value: 2 }
    ], layer),
    /duplicate group\/x rows/
  );
});
