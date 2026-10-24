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

test("creates finite increasing edges across the full finite range", () => {
  const result = deriveBin2DRows([
    { x: -1e308, y: 0 },
    { x: 1e308, y: 1 }
  ], transform({ bins: { x: 2, y: 1 } }));

  assert.deepEqual(result.resolved.edges, {
    x: [-1e308, 0, 1e308],
    y: [0, 1]
  });
  assert.equal(
    Object.values(result.resolved.edges).flat().every(Number.isFinite),
    true
  );
});

test("rejects bin counts that the finite extent cannot represent", () => {
  assert.throws(
    () => deriveBin2DRows(
      [{ x: 1e15, y: 0 }, { x: 1e15 + 1, y: 1 }],
      transform({ bins: { x: 100, y: 1 } })
    ),
    /x extent cannot represent 100 distinct bins/
  );
  assert.throws(
    () => deriveBin2DRows(
      [{ x: 5e-324, y: 0 }, { x: 1e-323, y: 1 }],
      transform({ bins: { x: 2, y: 1 } })
    ),
    /x extent cannot represent 2 distinct bins/
  );
});

test("resolves large source extents without variadic numeric calls", () => {
  const rows = Array.from({ length: 150_000 }, (_, index) => ({
    x: index % 2,
    y: index % 3
  }));
  const result = deriveBin2DRows(rows, transform({ bins: 1 }));

  assert.deepEqual(result.resolved.extent, { x: [0, 1], y: [0, 2] });
  assert.equal(result.resolved.eligibleCount, rows.length);
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
    () => transform({ bins: { x: 10_001, y: 1 } }),
    /axes support at most 10000 bins/
  );
  assert.throws(
    () => transform({ bins: { x: 10_000, y: 101 } }),
    /grids support at most 1000000 cells/
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

test("keeps default edge assignment byte-identical and stores only explicit step", () => {
  assert.equal(JSON.stringify(transform()), JSON.stringify(transform({ assignment: "edges" })));
  assert.equal(Object.hasOwn(transform(), "assignment"), false);
  assert.equal(transform({ assignment: "step" }).assignment, "step");
  for (const assignment of [null, false, 0, "auto", {}, []]) {
    assert.throws(() => transform({ assignment }), /assignment must be "edges" or "step"/);
  }
  assert.throws(() => validateBin2DTransform({ ...transform(), assignment: "edges" }), /Stored 2D bin assignment/);
});

function assignmentResult(rows, assignment, overrides = {}) {
  return deriveBin2DRows(rows, transform({
    bins: { x: 50, y: 48 }, extent: { x: [-5, 5], y: [-4.8, 4.8] }, members: true, assignment,
    as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count", members: "members" }, ...overrides
  }));
}

test("step assignment distinguishes rounded boundaries without moving values away from them", () => {
  const rows = [{ x: -4.89, y: -4.67 }, { x: 0.6, y: 0.6 }, { x: 4.94, y: 4.67 }];
  const edges = assignmentResult(rows, "edges");
  const step = assignmentResult(rows, "step");
  assert.deepEqual(edges.values[1], { x0: 0.40000000000000036, x1: 0.6000000000000005,
    y0: 0.5999999999999996, y1: 0.7999999999999998, count: 1, members: [1] });
  assert.deepEqual(step.values[1], { x0: 0.6000000000000005, x1: 0.8000000000000007,
    y0: 0.5999999999999996, y1: 0.7999999999999998, count: 1, members: [1] });
  assert.deepEqual(edges.resolved.edges, step.resolved.edges);
  const below = assignmentResult([{ x: 0.6 - 1e-12, y: 0.6 - 1e-12 }], "step");
  assert.equal(below.values[0].x0, edges.values[1].x0);
  assert.equal(below.values[0].y0, 0.39999999999999947);
});

for (const assignment of ["edges", "step"]) {
  test(`${assignment} conserves finite members, exact boundaries and row-major order`, () => {
    const rows = [{ x: -2, y: -2 }, { x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 },
      { x: 0, y: 0 }, { x: null, y: 0 }, { x: Infinity, y: 0 }, { x: 0, y: NaN }];
    const result = assignmentResult(rows, assignment, { bins: 4, extent: { x: [-2, 2], y: [-2, 2] }, includeEmpty: true });
    assert.equal(result.values.length, 16);
    assert.deepEqual(result.values.filter(row => row.count).map(row => row.members), [[0], [1], [2, 5], [3, 4]]);
    assert.equal(result.values.reduce((n, row) => n + row.count, 0), 6);
    assert.deepEqual(result.values.map(row => [row.x0, row.y0]), Array.from({ length: 16 }, (_, i) => [-2 + i % 4, -2 + Math.floor(i / 4)]));
    assert.throws(() => assignmentResult([{ x: 6, y: 0 }], assignment), /extent must contain every eligible value/);
    assert.throws(() => assignmentResult([{ x: null, y: 0 }], assignment), /at least one row/);
    assert.throws(() => assignmentResult([{ x: 5e-324, y: 0 }, { x: 1e-323, y: 1 }], assignment,
      { bins: { x: 2, y: 1 }, extent: undefined }), /cannot represent/);
  });
}

test("step assignment handles full finite range, single bins and the maximum axis count", () => {
  for (const bins of [1, 2, 10_000]) {
    const result = assignmentResult([{ x: -1e308, y: -1e308 }, { x: 0, y: 0 }, { x: 9e307, y: 9e307 }, { x: 1e308, y: 1e308 }], "step",
      { bins: { x: bins, y: 1 }, extent: { x: [-1e308, 1e308], y: [-1e308, 1e308] } });
    assert.equal(result.values.reduce((n, row) => n + row.count, 0), 4);
    assert.equal(result.values[0].x0, -1e308);
    assert.equal(result.values.at(-1).x1, 1e308);
    assert.equal(result.resolved.edges.x.every(Number.isFinite), true);
  }
  assert.equal(transform({ assignment: "step", bins: { x: 10_000, y: 100 } }).bins.x, 10_000);
  assert.throws(() => transform({ assignment: "step", bins: { x: 10_000, y: 101 } }), /at most 1000000 cells/);
});

test("step policy applies independently to either axis and exact stored edges", () => {
  const definition = transform({ assignment: "step", bins: { x: 1, y: 50 }, extent: { x: [0, 1], y: [-5, 5] }, members: true });
  const result = deriveBin2DRows([{ x: 0, y: 0.6 }, { x: 1, y: 0.6000000000000005 }, { x: 0.5, y: 0.6 - 1e-12 }], definition);
  assert.equal(result.values.length, 2);
  assert.deepEqual(result.values.map(row => row.__cells_members), [[2], [0, 1]]);
  const tiny = assignmentResult([{ x: -Number.MIN_VALUE, y: 0 }, { x: 0, y: 0.5 }, { x: Number.MIN_VALUE, y: 1 }], "step",
    { bins: { x: 2, y: 1 }, extent: { x: [-Number.MIN_VALUE, Number.MIN_VALUE], y: [0, 1] } });
  assert.deepEqual(tiny.values.map(row => row.members), [[0], [1, 2]]);
});
