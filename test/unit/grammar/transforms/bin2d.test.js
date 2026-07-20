import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBin2DRows,
  normalizeBin2DTransform,
  requestedBin2DTransform,
  validateBin2DTransform
} from "../../../../src/grammar/bin2d.js";

function transform(options = {}) {
  return normalizeBin2DTransform({
    id: "cells",
    x: "x",
    y: "y",
    ...options
  });
}

test("normalizes defaults and namespaced output fields", () => {
  assert.deepEqual(transform(), {
    type: "bin2d",
    x: "x",
    y: "y",
    bins: { x: 10, y: 10 },
    extent: { x: "auto", y: "auto" },
    includeEmpty: false,
    members: false,
    as: {
      x0: "__cells_x0",
      x1: "__cells_x1",
      y0: "__cells_y0",
      y1: "__cells_y1",
      count: "__cells_count"
    }
  });
  assert.deepEqual(transform({ bins: 4 }).bins, { x: 4, y: 4 });
});

test("assigns boundaries once and preserves deterministic row-major order", () => {
  const definition = transform({
    bins: { x: 2, y: 2 },
    extent: { x: [0, 2], y: [0, 2] },
    includeEmpty: true,
    members: true,
    as: {
      x0: "x0", x1: "x1", y0: "y0", y1: "y1",
      count: "count", members: "members"
    }
  });
  const result = deriveBin2DRows([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: null, y: 1 },
    { x: 1, y: "invalid" }
  ], definition);

  assert.deepEqual(result.values, [
    { x0: 0, x1: 1, y0: 0, y1: 1, count: 1, members: [0] },
    { x0: 1, x1: 2, y0: 0, y1: 1, count: 2, members: [1, 2] },
    { x0: 0, x1: 1, y0: 1, y1: 2, count: 1, members: [3] },
    { x0: 1, x1: 2, y0: 1, y1: 2, count: 0, members: [] }
  ]);
  assert.deepEqual(result.resolved, {
    extent: { x: [0, 2], y: [0, 2] },
    edges: { x: [0, 1, 2], y: [0, 1, 2] },
    eligibleCount: 4,
    occupiedCount: 3
  });
  assert.equal(result.values.reduce((sum, row) => sum + row.count, 0), 4);
});

test("resolves automatic extents and omits empty cells by default", () => {
  const result = deriveBin2DRows([
    { x: -1, y: 10 },
    { x: 1, y: 20 }
  ], transform({ bins: { x: 2, y: 2 } }));

  assert.deepEqual(result.resolved.extent, { x: [-1, 1], y: [10, 20] });
  assert.equal(result.values.length, 2);
  assert.equal(result.resolved.occupiedCount, 2);
});

test("removes resolved revision state before replay", () => {
  const definition = transform({ bins: 2 });
  const result = deriveBin2DRows([{ x: 0, y: 0 }, { x: 1, y: 1 }], definition);
  const materialized = { ...definition, resolved: result.resolved };

  validateBin2DTransform(materialized);
  assert.deepEqual(requestedBin2DTransform(materialized), definition);
});

test("rejects invalid bins, extents, fields, and silent data loss", () => {
  assert.throws(() => transform({ bins: 0 }), /x bins must be a positive integer/);
  assert.throws(
    () => transform({ bins: { x: 2 } }),
    /y bins must be a positive integer/
  );
  assert.throws(
    () => transform({ extent: { x: [1, 1] } }),
    /x extent must be two increasing finite numbers/
  );
  assert.throws(
    () => transform({ members: false, as: { members: "rows" } }),
    /requires members: true/
  );
  assert.throws(
    () => deriveBin2DRows(
      [{ x: 0, y: 0 }, { x: 3, y: 1 }],
      transform({ extent: { x: [0, 2] } })
    ),
    /x extent must contain every eligible value/
  );
  assert.throws(
    () => deriveBin2DRows([{ x: 1, y: 1 }], transform()),
    /x extent must have positive span/
  );
  assert.throws(
    () => deriveBin2DRows([{ x: null, y: "missing" }], transform()),
    /at least one row with finite x and y/
  );
});
