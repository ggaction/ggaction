import assert from "node:assert/strict";
import test from "node:test";

import {
  CURVE_INTERPOLATIONS,
  buildCurvePathCommands,
  validateCurveInterpolation
} from "../../../src/grammar/curveCommands.js";

const points = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 3, y: 3 }),
  Object.freeze({ x: 6, y: 0 })
]);

test("exposes and validates the exact eight-value curve vocabulary", () => {
  assert.deepEqual(CURVE_INTERPOLATIONS, [
    "linear", "step", "step-before", "step-after",
    "basis", "cardinal", "monotone", "natural"
  ]);
  assert.equal(validateCurveInterpolation("natural"), "natural");
  assert.throws(
    () => validateCurveInterpolation("smooth"),
    /Unsupported curve interpolation/
  );
  assert.equal(Object.isFrozen(CURVE_INTERPOLATIONS), true);
});

test("builds exact linear and step-family command fixtures", () => {
  assert.deepEqual(buildCurvePathCommands(points), [
    { op: "M", x: 0, y: 0 },
    { op: "L", x: 3, y: 3 },
    { op: "L", x: 6, y: 0 }
  ]);
  assert.deepEqual(buildCurvePathCommands(points, "step"), [
    { op: "M", x: 0, y: 0 },
    { op: "L", x: 1.5, y: 0 },
    { op: "L", x: 1.5, y: 3 },
    { op: "L", x: 3, y: 3 },
    { op: "L", x: 4.5, y: 3 },
    { op: "L", x: 4.5, y: 0 },
    { op: "L", x: 6, y: 0 }
  ]);
  assert.deepEqual(buildCurvePathCommands(points, "step-before"), [
    { op: "M", x: 0, y: 0 },
    { op: "L", x: 0, y: 3 },
    { op: "L", x: 3, y: 3 },
    { op: "L", x: 3, y: 0 },
    { op: "L", x: 6, y: 0 }
  ]);
  assert.deepEqual(buildCurvePathCommands(points, "step-after"), [
    { op: "M", x: 0, y: 0 },
    { op: "L", x: 3, y: 0 },
    { op: "L", x: 3, y: 3 },
    { op: "L", x: 6, y: 3 },
    { op: "L", x: 6, y: 0 }
  ]);
});

test("builds exact basis and cardinal cubic command fixtures", () => {
  assert.deepEqual(buildCurvePathCommands(points, "basis"), [
    { op: "M", x: 0, y: 0 },
    { op: "C", x1: 1 / 6, y1: 1 / 6, x2: 1 / 3, y2: 1 / 3, x: 0.5, y: 0.5 },
    { op: "C", x1: 1, y1: 1, x2: 2, y2: 2, x: 3, y: 2 },
    { op: "C", x1: 4, y1: 2, x2: 5, y2: 1, x: 5.5, y: 0.5 },
    {
      op: "C",
      x1: 5.5 + 0.5 / 3,
      y1: 0.5 - 0.5 / 3,
      x2: 5.5 + 1 / 3,
      y2: 0.5 - 1 / 3,
      x: 6,
      y: 0
    }
  ]);
  assert.deepEqual(buildCurvePathCommands(points, "cardinal"), [
    { op: "M", x: 0, y: 0 },
    { op: "C", x1: 0.5, y1: 0.5, x2: 2, y2: 3, x: 3, y: 3 },
    { op: "C", x1: 4, y1: 3, x2: 5.5, y2: 0.5, x: 6, y: 0 }
  ]);
});

test("builds exact monotone and natural cubic command fixtures", () => {
  assert.deepEqual(buildCurvePathCommands(points, "monotone"), [
    { op: "M", x: 0, y: 0 },
    { op: "C", x1: 1, y1: 1, x2: 2, y2: 3, x: 3, y: 3 },
    { op: "C", x1: 4, y1: 3, x2: 5, y2: 1, x: 6, y: 0 }
  ]);
  assert.deepEqual(buildCurvePathCommands(points, "natural"), [
    { op: "M", x: 0, y: 0 },
    { op: "C", x1: 1, y1: 1.5, x2: 2, y2: 3, x: 3, y: 3 },
    { op: "C", x1: 4, y1: 3, x2: 5, y2: 1.5, x: 6, y: 0 }
  ]);
});

test("falls back for short smooth series and validates monotone ordering", () => {
  const pair = [{ x: 0, y: 1 }, { x: 2, y: 3 }];
  const linear = buildCurvePathCommands(pair);
  for (const curve of ["basis", "cardinal", "monotone", "natural"]) {
    assert.deepEqual(buildCurvePathCommands(pair, curve), linear);
  }
  assert.throws(
    () => buildCurvePathCommands([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 2 }
    ], "monotone"),
    /strictly increasing x/
  );
  assert.throws(
    () => buildCurvePathCommands([{ x: 0, y: 0 }], "linear"),
    /at least two finite/
  );
});

test("owns every generated command without retaining caller points", () => {
  const caller = [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 1 }];
  const commands = buildCurvePathCommands(caller, "monotone");
  caller[0].x = 99;

  assert.equal(commands[0].x, 0);
  assert.equal(Object.isFrozen(commands), true);
  assert.equal(commands.every(Object.isFrozen), true);
});
