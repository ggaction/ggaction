import assert from "node:assert/strict";
import test from "node:test";
import { animationFrameTimes } from "../../../src/grammar/animation/frameTimes.js";

test("explicit export times preserve milliseconds and endpoint choices in an owned array", () => {
  const input = [-0, 125, 500, 1000];
  const actual = animationFrameTimes(1000, {timesMs: input});
  assert.deepEqual(actual, [0, 125, 500, 1000]);
  assert.notEqual(actual, input);
  assert.ok(Object.isFrozen(actual));
  assert.ok(Object.is(input[0], -0));
  input[1] = 999;
  assert.equal(actual[1], 125);
  assert.deepEqual(animationFrameTimes(0, {timesMs: [0]}), [0]);
});

test("fps export derives every time from its integer frame index without adding an off-grid endpoint", () => {
  assert.deepEqual(animationFrameTimes(1000, {fps: 4}), [0, 250, 500, 750, 1000]);
  assert.deepEqual(animationFrameTimes(1100, {fps: 4}), [0, 250, 500, 750, 1000]);
  assert.deepEqual(animationFrameTimes(1000, {fps: 2.5}), [0, 400, 800]);
  assert.deepEqual(animationFrameTimes(0, {fps: 60}), [0]);
  const times = animationFrameTimes(1000, {fps: 30});
  assert.equal(times.length, 31);
  assert.equal(times[1], 100 / 3);
  assert.equal(times[15], 500);
  assert.equal(times[30], 1000);
  assert.ok(times.every((time, index) => time >= 0 && time <= 1000 && (index === 0 || time > times[index - 1])));
});

test("export validates exclusive own-data options before invoking accessors", () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, "timesMs", {enumerable: true, get() {calls++; return [0];}});
  const array = Object.defineProperty([], 0, {enumerable: true, get() {calls++; return 0;}});
  for (const value of [null, undefined, [], {}, {timesMs: [0], fps: 2}, {other: 1}, accessor,
    Object.create({timesMs: [0]}), {timesMs: array}, {timesMs: [, 1]}, {timesMs: Object.assign([0], {extra: 1})}]) {
    assert.throws(() => animationFrameTimes(1000, value));
  }
  assert.equal(calls, 0);
});

test("export rejects empty, duplicate, unsorted, outside and invalid numeric times", () => {
  for (const timesMs of [[], [0, 0], [-0, 0], [1, 0], [-1], [1001], [NaN], [Infinity], ["1"]]) {
    assert.throws(() => animationFrameTimes(1000, {timesMs}), /frame times/);
  }
  for (const fps of [0, -1, NaN, Infinity, "24", undefined]) {
    assert.throws(() => animationFrameTimes(1000, {fps}), /fps/);
  }
  for (const duration of [-1, NaN, Infinity, "1000"]) {
    assert.throws(() => animationFrameTimes(duration, {fps: 24}), /duration/);
  }
});

test("frame requests are bounded before allocation and retain finite numeric extremes", () => {
  assert.equal(animationFrameTimes(9999, {fps: 1000}).length, 10000);
  assert.throws(() => animationFrameTimes(10000, {fps: 1000}), /must not exceed 10000/);
  assert.throws(() => animationFrameTimes(10000, {timesMs: Array.from({length: 10001}, (_, i) => i)}), /must not exceed 10000/);
  assert.throws(() => animationFrameTimes(Number.MAX_VALUE, {fps: Number.MAX_VALUE}), /must not exceed/);
  assert.deepEqual(animationFrameTimes(Number.MAX_VALUE, {fps: Number.MIN_VALUE}), [0]);
  assert.deepEqual(animationFrameTimes(0, {fps: Number.MAX_VALUE}), [0]);
  const times = animationFrameTimes(1.1e307, {fps: 1e-304});
  assert.equal(times.length, 2);
  assert.ok(times.every(Number.isFinite));
  // A rounded quotient must not manufacture a time past the exact duration.
  assert.deepEqual(animationFrameTimes(14.285714285714283, {fps: 70}), [0]);
  assert.deepEqual(animationFrameTimes(14.285714285714285, {fps: 70}), [0, 14.285714285714285]);
});
