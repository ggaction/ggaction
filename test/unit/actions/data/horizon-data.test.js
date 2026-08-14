import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const OUTPUT = Object.freeze({
  x: "areaHorizonX",
  lower: "areaHorizonLower",
  upper: "areaHorizonUpper",
  group: "areaHorizonGroup",
  color: "areaHorizonColor",
  sign: "areaHorizonSign",
  band: "areaHorizonBand",
  segment: "areaHorizonSegment"
});

function horizon(program, overrides = {}) {
  return program.createHorizonData({
    id: "areaHorizonData",
    source: "source",
    x: { field: "x", fieldType: "quantitative" },
    y: { field: "y", fieldType: "quantitative" },
    as: OUTPUT,
    ...overrides
  });
}

test("creates immutable Horizon provenance and generated rows", () => {
  const rows = [{ x: 0, y: -5 }, { x: 10, y: 5 }];
  const source = chart().createData({ id: "source", values: rows });
  const program = horizon(source, { bands: 2, extent: 6 });
  const dataset = program.semanticSpec.datasets[1];

  assert.equal(dataset.source, "source");
  assert.deepEqual(dataset.transform[0].resolved, {
    extents: [{ extent: 6, bandHeight: 3 }]
  });
  assert.equal(dataset.transform[0].bands, 2);
  assert.equal(dataset.transform[0].baseline, 0);
  assert.deepEqual(dataset.transform[0].palette, {
    positive: { name: "blues" },
    negative: { name: "reds" }
  });
  assert.equal(dataset.values.length, 8);
  assert.equal(Object.isFrozen(dataset.values), true);
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeHorizonData"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(child => child.op),
    ["editSemantic", "editSemantic"]
  );
});

test("materializes finite extreme crossings and rejects unrepresentable folds atomically", () => {
  const crossingSource = chart().createData({
    id: "source",
    values: [
      { x: -1e308, y: -1e308 },
      { x: 1e308, y: 1e308 }
    ]
  });
  const crossed = horizon(crossingSource);
  assert.equal(
    crossed.semanticSpec.datasets[1].values
      .filter(row => row.areaHorizonUpper === 0)
      .every(row => row.areaHorizonX === 0),
    true
  );

  const overflowSource = chart().createData({
    id: "source",
    values: [{ x: 0, y: 1e308 }]
  });
  assert.throws(
    () => horizon(overflowSource, { baseline: -1e308 }),
    /Horizon signed deviation is outside the finite numeric range/
  );
  assert.equal(overflowSource.semanticSpec.datasets.length, 1);
});

test("does not retain caller-owned Horizon source or option objects", () => {
  const rows = [{ x: 0, y: -2 }, { x: 1, y: 2 }];
  const palette = { positive: "blues", negative: "reds" };
  const program = horizon(
    chart().createData({ id: "source", values: rows }),
    { palette }
  );

  rows[0].y = 999;
  palette.positive = "greens";
  assert.equal(program.semanticSpec.datasets[0].values[0].y, -2);
  assert.deepEqual(program.semanticSpec.datasets[1].transform[0].palette, {
    positive: { name: "blues" },
    negative: { name: "reds" }
  });
});

test("validates Horizon data creation and materialization ownership", () => {
  const source = chart().createData({
    id: "source",
    values: [{ x: 0, y: -2 }, { x: 1, y: 2 }]
  });
  assert.throws(
    () => source.createHorizonData({
      id: "horizon",
      source: "source",
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "y", fieldType: "quantitative" },
      as: OUTPUT,
      extra: true
    }),
    /Unknown createHorizonData option/
  );
  assert.throws(
    () => source.materializeHorizonData({ id: "missing" }),
    /Unknown derived dataset/
  );
  const filtered = source.createDerivedData({
    id: "filtered",
    source: "source",
    transform: [{ type: "filter", field: "x", oneOf: [0] }]
  });
  assert.throws(
    () => filtered.materializeHorizonData({ id: "filtered" }),
    /requires one horizon transform/
  );
  const materialized = horizon(source);
  assert.throws(
    () => materialized.materializeHorizonData({ id: "areaHorizonData" }),
    /already materialized/
  );
});
