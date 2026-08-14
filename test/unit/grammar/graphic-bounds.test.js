import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveConcreteGraphicBounds,
  resolvePathCommandBounds
} from
  "../../../src/grammar/schemas/graphicBounds.js";

function pathSpec(commands, strokeWidth = 20) {
  return {
    objects: {
      path: {
        type: "path",
        properties: { commands, stroke: "black", strokeWidth }
      }
    },
    order: ["path"]
  };
}

test("includes an acute path miter without expanding unrelated sides", () => {
  const commands = [
    { op: "M", x: 40, y: 100 },
    { op: "L", x: 140, y: 100 },
    { op: "L", x: 140 - 50 * Math.sqrt(3), y: 150 }
  ];
  const bounds = resolveConcreteGraphicBounds(pathSpec(commands), "path");

  assert.equal(bounds.left, 30);
  assert.equal(bounds.top, 90);
  assert.equal(bounds.bottom, 160);
  assert.equal(
    Math.abs(bounds.right - (140 + 10 * (2 + Math.sqrt(3)))) < 1e-12,
    true
  );
});

test("falls back to the ordinary stroke extent beyond the Canvas miter limit", () => {
  const angle = 10 * Math.PI / 180;
  const commands = [
    { op: "M", x: 40, y: 100 },
    { op: "L", x: 140, y: 100 },
    {
      op: "L",
      x: 140 - 100 * Math.cos(angle),
      y: 100 + 100 * Math.sin(angle)
    }
  ];

  assert.equal(
    resolveConcreteGraphicBounds(pathSpec(commands), "path").right,
    150
  );
});

test("keeps cubic extrema finite across the full numeric range", () => {
  const maximum = Number.MAX_VALUE;
  const bounds = resolvePathCommandBounds([
    { op: "M", x: -maximum, y: 0 },
    {
      op: "C",
      x1: maximum,
      y1: 0,
      x2: maximum,
      y2: 0,
      x: -maximum,
      y: 0
    }
  ]);

  assert.deepEqual(bounds, {
    left: -maximum,
    right: maximum / 2,
    top: 0,
    bottom: 0
  });
  assert.equal(resolvePathCommandBounds([
    { op: "M", x: 0, y: 0 },
    { op: "C", x1: 1e-200, y1: 0, x2: 1e-200, y2: 0, x: 0, y: 0 }
  ]).right, 7.5e-201);
});

test("keeps extreme path directions finite and rejects overflowing ink bounds", () => {
  const maximum = Number.MAX_VALUE;
  const finite = resolveConcreteGraphicBounds(pathSpec([
    { op: "M", x: -maximum, y: 0 },
    { op: "L", x: maximum, y: 1 },
    { op: "L", x: 0, y: 2 }
  ], 2), "path");
  assert.equal(Object.values(finite).every(Number.isFinite), true);

  for (const [type, properties] of [
    ["circle", { x: maximum, y: 0, radius: maximum, strokeWidth: 2 }],
    ["rect", { x: maximum, y: 0, width: maximum, height: 1 }],
    ["line", { x1: 0, y1: 0, x2: maximum, y2: 1, strokeWidth: maximum }],
    ["text", { x: maximum, y: 0, text: "XX", fontSize: maximum }]
  ]) {
    assert.throws(
      () => resolveConcreteGraphicBounds({
        objects: { shape: { type, properties } },
        order: ["shape"]
      }, "shape"),
      /finite numeric range/
    );
  }

  assert.throws(() => resolveConcreteGraphicBounds({
    objects: {
      root: {
        type: "canvas",
        properties: { x: maximum, y: 0 },
        children: ["panel"]
      },
      panel: {
        type: "canvas",
        properties: { x: maximum, y: 0 },
        children: ["dot"]
      },
      dot: { type: "circle", properties: { x: 0, y: 0, radius: 1 } }
    },
    order: ["root"]
  }, "dot"), /finite numeric range/);
});
