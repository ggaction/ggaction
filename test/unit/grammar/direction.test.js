import assert from "node:assert/strict";
import test from "node:test";

import {
  centeredDirectionalSegment,
  directionVector
} from "../../../src/grammar/direction.js";

function close(actual, expected, tolerance = 1e-10) {
  assert.equal(Math.abs(actual - expected) <= tolerance, true);
}

function segmentLength(segment) {
  return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
}

test("uses direct clockwise degrees with zero pointing up", () => {
  const expected = [
    [0, 0, -1],
    [90, 1, 0],
    [180, 0, 1],
    [270, -1, 0]
  ];
  for (const [degrees, x, y] of expected) {
    const vector = directionVector(degrees);
    close(vector.x, x);
    close(vector.y, y);
  }
});

test("keeps centered segment length and midpoint invariant", () => {
  for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315, -45, 405]) {
    const segment = centeredDirectionalSegment({
      x: 12,
      y: 18,
      degrees,
      length: 14
    });
    close((segment.x1 + segment.x2) / 2, 12);
    close((segment.y1 + segment.y2) / 2, 18);
    close(segmentLength(segment), 14);
  }
});

test("rejects invalid directional geometry", () => {
  assert.throws(() => directionVector(Infinity), /finite/);
  assert.throws(
    () => centeredDirectionalSegment({ x: 0, y: 0, length: 0 }),
    /positive/
  );
  assert.throws(
    () => centeredDirectionalSegment({ x: NaN, y: 0, length: 2 }),
    /finite/
  );
});
