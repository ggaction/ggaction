import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { createBin2DReference } from "../../oracles/bin2d.js";
import { loadCars } from "../../support/data.js";
import {
  BINNED_HEATMAP_FIELDS,
  BINNED_HEATMAP_LAYOUT
} from "./fixture.js";

test("public createBin2DData exactly matches the independent Cars oracle", () => {
  const cars = loadCars();
  const expected = createBin2DReference(cars, {
    id: "carsWeightMpg",
    x: "Weight_in_lbs",
    y: "Miles_per_Gallon",
    bins: BINNED_HEATMAP_LAYOUT.bins,
    extent: {
      x: BINNED_HEATMAP_LAYOUT.xExtent,
      y: BINNED_HEATMAP_LAYOUT.yExtent
    },
    includeEmpty: true,
    members: true,
    as: { ...BINNED_HEATMAP_FIELDS, members: "members" }
  });
  const program = chart()
    .createData({ id: "cars", values: cars })
    .createBin2DData({
      id: "carsWeightMpg",
      x: "Weight_in_lbs",
      y: "Miles_per_Gallon",
      bins: BINNED_HEATMAP_LAYOUT.bins,
      extent: {
        x: BINNED_HEATMAP_LAYOUT.xExtent,
        y: BINNED_HEATMAP_LAYOUT.yExtent
      },
      includeEmpty: true,
      members: true,
      as: { ...BINNED_HEATMAP_FIELDS, members: "members" }
    });
  const actual = program.semanticSpec.datasets[1];

  assert.deepEqual(actual.values, expected.rows);
  assert.deepEqual(actual.transform[0].resolved, {
    extent: expected.extent,
    edges: expected.edges,
    eligibleCount: expected.eligibleCount,
    occupiedCount: expected.occupiedCount
  });
  assert.equal(actual.values.reduce((sum, row) => sum + row.count, 0), 398);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeBin2DData"]
  );
});
