import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveConcreteGraphicBounds,
  resolvePathCommandBounds
} from
  "../../../src/grammar/schemas/graphicBounds.js";

function pathSpec(commands, strokeWidth = 20, details = {}) {
  return {
    objects: {
      path: {
        type: "path",
        properties: { commands, stroke: "black", strokeWidth, ...details }
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

  assert.equal(bounds.left, 40);
  assert.equal(bounds.top, 90);
  assert.equal(
    Math.abs(bounds.bottom - (150 + 5 * Math.sqrt(3))) < 1e-12,
    true
  );
  assert.equal(
    Math.abs(bounds.right - (140 + 10 * (2 + Math.sqrt(3)))) < 1e-12,
    true
  );
});

test("falls back to a bevel when the requested miter limit is exceeded", () => {
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

  const limited = resolveConcreteGraphicBounds(
    pathSpec(commands, 20, { miterLimit: 2 }),
    "path"
  );
  const extended = resolveConcreteGraphicBounds(
    pathSpec(commands, 20, { miterLimit: 20 }),
    "path"
  );
  assert.equal(limited.right < extended.right, true);
  assert.equal(extended.right > 190, true);
});

test("uses exact butt, round, and square bounds for straight lines", () => {
  const bounds = lineCap => resolveConcreteGraphicBounds({
    objects: {
      line: {
        type: "line",
        properties: {
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 0,
          stroke: "black",
          strokeWidth: 4,
          lineCap
        }
      }
    },
    order: ["line"]
  }, "line");

  assert.deepEqual(bounds("butt"), {
    left: 0,
    right: 10,
    top: -2,
    bottom: 2
  });
  for (const cap of ["round", "square"]) {
    assert.deepEqual(bounds(cap), {
      left: -2,
      right: 12,
      top: -2,
      bottom: 2
    });
  }
});

test("handles zero-length line caps without non-finite geometry", () => {
  const bounds = lineCap => resolveConcreteGraphicBounds({
    objects: {
      line: {
        type: "line",
        properties: {
          x1: 5,
          y1: 7,
          x2: 5,
          y2: 7,
          stroke: "black",
          strokeWidth: 4,
          lineCap
        }
      }
    },
    order: ["line"]
  }, "line");
  assert.deepEqual(bounds("butt"), { left: 5, right: 5, top: 7, bottom: 7 });
  for (const cap of ["round", "square"]) {
    assert.deepEqual(bounds(cap), { left: 3, right: 7, top: 5, bottom: 9 });
  }
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
    ["circle", { x: maximum, y: 0, radius: maximum, stroke: "black", strokeWidth: 2 }],
    ["rect", { x: maximum, y: 0, width: maximum, height: 1, stroke: "black", strokeWidth: 2 }],
    ["line", {
      x1: 0,
      y1: 0,
      x2: maximum,
      y2: 1,
      stroke: "black",
      strokeWidth: maximum,
      lineCap: "square"
    }],
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
