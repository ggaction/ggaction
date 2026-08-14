import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveLinearGradientCoordinates,
  validateFillPaint
} from "../../../src/grammar/paint.js";

const verticalPaint = Object.freeze({
  type: "linear-gradient",
  from: Object.freeze({ x: 0.5, y: 1 }),
  to: Object.freeze({ x: 0.5, y: 0 }),
  stops: Object.freeze([
    Object.freeze({ offset: 0, color: "#eff6ff" }),
    Object.freeze({ offset: 0.5, color: "#60a5fa" }),
    Object.freeze({ offset: 0.5, color: "#2563eb" }),
    Object.freeze({ offset: 1, color: "#1e3a8a" })
  ])
});

test("validates solid and backend-neutral linear gradient fills", () => {
  assert.equal(validateFillPaint("#2563eb"), "#2563eb");
  assert.equal(validateFillPaint(verticalPaint), verticalPaint);
});

test("resolves normalized endpoints inside final item bounds", () => {
  assert.deepEqual(
    resolveLinearGradientCoordinates(verticalPaint, {
      left: 20,
      right: 60,
      top: 10,
      bottom: 110
    }),
    {
      from: { x: 40, y: 110 },
      to: { x: 40, y: 10 }
    }
  );
});

test("resolves finite gradient endpoints across the full numeric range", () => {
  const maximum = Number.MAX_VALUE;
  const paint = {
    ...verticalPaint,
    from: { x: 0.25, y: 0 },
    to: { x: 0.75, y: 1 }
  };

  assert.deepEqual(
    resolveLinearGradientCoordinates(paint, {
      left: -maximum,
      right: maximum,
      top: -maximum,
      bottom: maximum
    }),
    {
      from: { x: -maximum / 2, y: -maximum },
      to: { x: maximum / 2, y: maximum }
    }
  );
});

test("rejects malformed paint shapes before rendering", () => {
  for (const [value, message] of [
    ["", /non-empty string/],
    [{ ...verticalPaint, type: "radial-gradient" }, /Unsupported fill paint type/],
    [{ ...verticalPaint, extra: true }, /non-empty string or linear gradient/],
    [{ ...verticalPaint, from: { x: -0.1, y: 1 } }, /from\.x/],
    [{ ...verticalPaint, to: verticalPaint.from }, /from and to must differ/],
    [{ ...verticalPaint, stops: [{ offset: 0, color: "red" }] }, /at least two/],
    [{
      ...verticalPaint,
      stops: [
        { offset: 0.7, color: "red" },
        { offset: 0.2, color: "blue" }
      ]
    }, /nondecreasing/],
    [{
      ...verticalPaint,
      stops: [
        { offset: 0, color: "red", opacity: 0.5 },
        { offset: 1, color: "blue" }
      ]
    }, /plain \{ offset, color \}/]
  ]) {
    assert.throws(() => validateFillPaint(value), message);
  }
});
