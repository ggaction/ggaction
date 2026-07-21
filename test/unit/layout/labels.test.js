import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LABEL_LAYOUT,
  enumerateLabelOffsets,
  normalizeLabelLayoutPolicy,
  resolveLabelLayout,
  resolveLabelLeader
} from "../../../src/layout/labels.js";

const boundary = Object.freeze({ left: 0, right: 100, top: 0, bottom: 50 });

test("normalizes the closed label-layout policy and leader appearance", () => {
  assert.deepEqual(DEFAULT_LABEL_LAYOUT, {
    axis: "both",
    padding: 3,
    maxDisplacement: 48,
    bounds: "plot",
    leader: false
  });
  assert.deepEqual(normalizeLabelLayoutPolicy({
    axis: "x",
    leader: { stroke: "#111827", strokeDash: [3, 2] }
  }), {
    axis: "x",
    padding: 3,
    maxDisplacement: 48,
    bounds: "plot",
    leader: {
      stroke: "#111827",
      strokeWidth: 1,
      strokeDash: [3, 2],
      opacity: 1
    }
  });
  assert.throws(
    () => normalizeLabelLayoutPolicy({ axis: "radial" }),
    /Unsupported label layout axis/
  );
  assert.throws(
    () => normalizeLabelLayoutPolicy({ leader: { width: 2 } }),
    /Unknown label leader option/
  );
  assert.throws(
    () => normalizeLabelLayoutPolicy({ padding: -1 }),
    /must be a non-negative/
  );
});

test("enumerates deterministic bounded offsets for each supported axis", () => {
  assert.deepEqual(
    enumerateLabelOffsets({ axis: "both", padding: 3, maxDisplacement: 6 })
      .slice(0, 5)
      .map(({ x, y }) => ({ x, y })),
    [
      { x: 0, y: 0 },
      { x: 0, y: -3 },
      { x: 0, y: 3 },
      { x: 3, y: 0 },
      { x: -3, y: 0 }
    ]
  );
  assert.equal(
    enumerateLabelOffsets({ axis: "x", padding: 2, maxDisplacement: 4 })
      .every(offset => offset.y === 0),
    true
  );
  assert.equal(
    enumerateLabelOffsets({ axis: "y", padding: 2, maxDisplacement: 4 })
      .every(offset => offset.x === 0),
    true
  );
});

test("keeps separated labels fixed and resolves a stable overlap", () => {
  const separated = resolveLabelLayout({
    items: [
      { id: "a", x: 10, y: 10, sourceX: 10, sourceY: 10, text: "A", fontSize: 10 },
      { id: "b", x: 70, y: 40, sourceX: 70, sourceY: 40, text: "B", fontSize: 10 }
    ],
    bounds: boundary
  });
  assert.deepEqual(separated.items.map(item => [item.dx, item.dy]), [[0, 0], [0, 0]]);
  assert.deepEqual(separated.warnings, []);

  const overlapping = resolveLabelLayout({
    items: [
      { id: "a", x: 40, y: 20, sourceX: 40, sourceY: 20, text: "Wide", fontSize: 10 },
      { id: "b", x: 40, y: 20, sourceX: 40, sourceY: 20, text: "Wide", fontSize: 10 }
    ],
    bounds: boundary,
    maxDisplacement: 20
  });
  assert.equal(overlapping.overlapBefore, 1);
  assert.equal(overlapping.overlapAfter, 0);
  assert.deepEqual(overlapping.items[0].dx, 0);
  assert.equal(overlapping.items[1].distance <= 20, true);
  assert.equal(Object.isFrozen(overlapping), true);
  assert.equal(Object.isFrozen(overlapping.items), true);
});

test("returns deterministic warnings and best effort for impossible layouts", () => {
  const impossible = resolveLabelLayout({
    items: [
      { id: "a", x: 5, y: 5, sourceX: 5, sourceY: 5, text: "Wide", fontSize: 20 },
      { id: "b", x: 5, y: 5, sourceX: 5, sourceY: 5, text: "Wide", fontSize: 20 }
    ],
    padding: 3,
    maxDisplacement: 0,
    bounds: { left: 0, right: 20, top: 0, bottom: 10 }
  });
  assert.deepEqual(impossible.warnings.map(warning => warning.code), [
    "overlap", "bounds"
  ]);
  assert.deepEqual(impossible.warnings[0].pairs, [["a", "b"]]);
  assert.deepEqual(impossible.warnings[1].items, ["a", "b"]);
});

test("allows empty materialized data and resolves leader endpoints", () => {
  assert.deepEqual(resolveLabelLayout({ items: [], bounds: boundary }), {
    items: [],
    overlapBefore: 0,
    overlapAfter: 0,
    warnings: []
  });
  const resolved = resolveLabelLayout({
    items: [
      { id: "a", x: 30, y: 25, sourceX: 10, sourceY: 25, text: "A", fontSize: 10 }
    ],
    axis: "x",
    bounds: boundary
  }).items[0];
  assert.equal(resolveLabelLeader(resolved), undefined);

  const moved = {
    ...resolved,
    x: 50,
    dx: 20,
    bounds: { left: 50, right: 56, top: 20, bottom: 30 }
  };
  assert.deepEqual(resolveLabelLeader(moved), {
    id: "a",
    x1: 10,
    y1: 25,
    x2: 50,
    y2: 25
  });
});

test("rejects malformed bounds and item identity", () => {
  assert.throws(
    () => resolveLabelLayout({ items: [], bounds: { left: 0, right: 0, top: 0, bottom: 2 } }),
    /ordered finite bounds/
  );
  assert.throws(
    () => resolveLabelLayout({
      items: [
        { id: "same", x: 1, y: 1, sourceX: 1, sourceY: 1, text: "A", fontSize: 10 },
        { id: "same", x: 2, y: 2, sourceX: 2, sourceY: 2, text: "B", fontSize: 10 }
      ],
      bounds: boundary
    }),
    /unique non-empty ids/
  );
});
