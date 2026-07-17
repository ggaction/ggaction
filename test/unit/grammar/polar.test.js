import assert from "node:assert/strict";
import test from "node:test";

import {
  polarToCartesian,
  resolvePolarFrame,
  resolvePolarScaleRange,
  validateRadialRange,
  validateThetaRange
} from "../../../src/grammar/polar.js";

const bounds = Object.freeze({ x: 20, y: 40, width: 200, height: 120 });

test("resolves a centered Polar frame from the limiting plot dimension", () => {
  const frame = resolvePolarFrame(bounds);
  assert.deepEqual(frame, {
    centerX: 120,
    centerY: 100,
    availableRadius: 60
  });
  assert.equal(Object.isFrozen(frame), true);
});

test("maps public degrees clockwise from 12 o'clock", () => {
  const frame = resolvePolarFrame(bounds);
  const cases = [
    [0, { x: 120, y: 40 }],
    [90, { x: 180, y: 100 }],
    [180, { x: 120, y: 160 }],
    [270, { x: 60, y: 100 }],
    [360, { x: 120, y: 40 }]
  ];
  for (const [theta, expected] of cases) {
    const actual = polarToCartesian({ theta, radius: 60, frame });
    assert.equal(Math.abs(actual.x - expected.x) < 1e-10, true);
    assert.equal(Math.abs(actual.y - expected.y) < 1e-10, true);
  }
});

test("resolves and validates Polar scale ranges", () => {
  assert.deepEqual(resolvePolarScaleRange("auto", "theta", bounds), [0, 360]);
  assert.deepEqual(resolvePolarScaleRange("auto", "radius", bounds), [0, 60]);
  assert.deepEqual(resolvePolarScaleRange([300, 20], "theta", bounds), [300, 20]);
  assert.deepEqual(resolvePolarScaleRange([50, 0], "radius", bounds), [50, 0]);
  assert.deepEqual(validateThetaRange([-180, 180]), [-180, 180]);
  assert.deepEqual(validateRadialRange([0, 60], 60), [0, 60]);
  assert.throws(() => validateThetaRange([0, 361]), /must not exceed 360/);
  assert.throws(() => validateRadialRange([-1, 20]), /non-negative/);
  assert.throws(() => validateRadialRange([0, 61], 60), /fit within/);
});

test("rejects invalid Polar geometry without producing partial values", () => {
  assert.throws(
    () => resolvePolarFrame({ x: 0, y: 0, width: -1, height: 10 }),
    /non-negative graphical bounds/
  );
  assert.throws(
    () => polarToCartesian({
      theta: 0,
      radius: 61,
      frame: resolvePolarFrame(bounds)
    }),
    /exceeds the available radius/
  );
});
