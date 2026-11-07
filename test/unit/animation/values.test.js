import assert from "node:assert/strict";
import test from "node:test";
import {
  ANIMATION_COLOR_VERSION, easeProgress, interpolateNumber, interpolatePositiveScale,
  interpolateRGBA, interpolateRotation, transitionProgress, transitionSampleState
} from "../../../src/grammar/animation/values.js";

const close = (actual, expected, tolerance = 1e-12) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`
);

test("transition time clamps and zero-duration transitions commit exactly at zero", () => {
  assert.deepEqual([-10, 0, 250, 500, 750, 1000, 1200].map(t => transitionProgress(t, 1000)), [0, 0, .25, .5, .75, 1, 1]);
  assert.deepEqual([-1, -Number.MIN_VALUE, 0, 1].map(t => transitionProgress(t, 0)), [0, 0, 1, 1]);
  assert.equal(transitionProgress(Number.MAX_VALUE, Number.MIN_VALUE), 1);
  assert.equal(transitionProgress(-Number.MAX_VALUE, Number.MIN_VALUE), 0);
});

test("linear and cubic-in-out easing agree with independent literal anchors", () => {
  const times = [0, .25, .5, .75, 1];
  assert.deepEqual(times.map(t => easeProgress(t, "linear")), times);
  assert.deepEqual(times.map(t => easeProgress(t)), [0, .0625, .5, .9375, 1]);
  assert.deepEqual(times.map(t => interpolateNumber(10, 30, t)), [10, 15, 20, 25, 30]);
  for (let i = 0; i <= 100; i++) {
    const u = i / 100;
    close(easeProgress(u) + easeProgress(1 - u), 1);
    assert.ok(easeProgress(u) >= 0 && easeProgress(u) <= 1);
    if (i) assert.ok(easeProgress(u) >= easeProgress((i - 1) / 100));
  }
});

test('sample endpoint admission follows raw time through easing and division rounding', () => {
  for (const [time,duration,side] of [[-1,100,'from'],[0,100,'from'],[100,100,'to'],[101,100,'to'],[-Number.MIN_VALUE,0,'from'],[0,0,'to'],[1,0,'to']]) {
    const state=transitionSampleState(time,duration,'linear');assert.equal(state.side,side);assert.equal(state.progress,side==='from'?0:1);
  }
  for (const [time,duration,easing] of [[99.9999,100,'cubic-in-out'],[Number.MIN_VALUE,Number.MAX_VALUE,'linear'],[Number.MIN_VALUE,100,'cubic-in-out'],[50,100,'linear']]) {
    const state=transitionSampleState(time,duration,easing);assert.equal(state.side,undefined);assert.ok(state.progress>0&&state.progress<1);
  }
  assert.equal(transitionSampleState(50,100,'linear').progress,.5);
  for(const [time,duration,easing]of[[NaN,100,'linear'],[0,-1,'linear'],[0,100,'future']])assert.throws(()=>transitionSampleState(time,duration,easing));
});

test("linear interpolation preserves exact signed endpoints and bounded extreme values", () => {
  assert.ok(Object.is(interpolateNumber(-0, 3, 0), -0));
  assert.ok(Object.is(interpolateNumber(3, -0, 1), -0));
  assert.equal(interpolateNumber(-Number.MAX_VALUE, Number.MAX_VALUE, .5), 0);
  assert.equal(interpolateNumber(Number.MIN_VALUE, Number.MIN_VALUE, .5), Number.MIN_VALUE);
  for (const from of [-Number.MAX_VALUE, -1, 0, 1, Number.MAX_VALUE]) {
    for (const to of [-Number.MAX_VALUE, -1, 0, 1, Number.MAX_VALUE]) {
      for (const t of [.01, .25, .5, .75, .99]) {
        const value = interpolateNumber(from, to, t);
        assert.ok(Number.isFinite(value));
        assert.ok(value >= Math.min(from, to) && value <= Math.max(from, to));
      }
    }
  }
});

test("positive scale interpolation follows logarithmic distance without ratio overflow", () => {
  close(interpolatePositiveScale(1, 100, .5), 10);
  close(interpolatePositiveScale(1, 10000, .25), 10);
  assert.equal(interpolatePositiveScale(Number.MIN_VALUE, Number.MAX_VALUE, 0), Number.MIN_VALUE);
  assert.equal(interpolatePositiveScale(Number.MIN_VALUE, Number.MAX_VALUE, 1), Number.MAX_VALUE);
  assert.ok(Number.isFinite(interpolatePositiveScale(Number.MIN_VALUE, Number.MAX_VALUE, .5)));
  for (const value of [Number.MIN_VALUE, 150, 150.00000000000003, Number.MAX_VALUE]) {
    for (const t of [.01, .5, .99]) assert.equal(interpolatePositiveScale(value, value, t), value);
  }
  for (const t of [0, .1, .25, .5, .75, 1]) close(interpolatePositiveScale(4, 64, t) * interpolatePositiveScale(64, 4, t), 256, 1e-10);
});

test("rotation follows the short seam and selects positive direction for exact half-turns", () => {
  close(interpolateRotation(17 * Math.PI / 18, -17 * Math.PI / 18, .5), Math.PI);
  close(interpolateRotation(-17 * Math.PI / 18, 17 * Math.PI / 18, .5), -Math.PI);
  assert.equal(interpolateRotation(0, Math.PI, .5), Math.PI / 2);
  assert.equal(interpolateRotation(0, -Math.PI, .5), Math.PI / 2);
  assert.equal(interpolateRotation(0, -Math.PI, 1), -Math.PI);
  assert.equal(interpolateRotation(-4 * Math.PI, 0, .5), -4 * Math.PI);
  assert.ok(Number.isFinite(interpolateRotation(Number.MAX_VALUE, -Number.MAX_VALUE, .5)));
  assert.ok(Object.is(interpolateRotation(-0, 1, 0), -0));
});

test("premultiplied linear-light color preserves transparent fade chroma and gamma anchors", () => {
  assert.equal(ANIMATION_COLOR_VERSION, "premultiplied-linear-srgb@1");
  const red = [1, 0, 0, 1], transparent = [0, 0, 0, 0];
  const fade = interpolateRGBA(transparent, red, .5);
  close(fade[0], 1); assert.deepEqual(fade.slice(1), [0, 0, .5]);
  const mixed = interpolateRGBA(red, [0, 0, 1, 1], .5);
  close(mixed[0], .7353569830524495); close(mixed[2], .7353569830524495);
  assert.equal(mixed[1], 0); assert.equal(mixed[3], 1);
  assert.deepEqual(interpolateRGBA([1, 0, 0, 0], [0, 1, 0, 0], .5), [0, 0, 0, 0]);
  const alphaMixed = interpolateRGBA([1, 0, 0, .25], [0, 0, 1, .75], .5);
  close(alphaMixed[0], .5370987304831942); close(alphaMixed[2], .8808250210902997); assert.equal(alphaMixed[3], .5);
});

test("color endpoints are exact independent immutable snapshots", () => {
  const from = [.01, .4, .8, 0], to = [.8, .2, .001, 1];
  for (const [t, expected] of [[0, from], [1, to]]) {
    const result = interpolateRGBA(from, to, t);
    assert.deepEqual(result, expected); assert.notEqual(result, expected); assert.ok(Object.isFrozen(result));
  }
  const saved = structuredClone([from, to]);
  for (const t of [.1, .2, .5, .9]) interpolateRGBA(from, to, t);
  assert.deepEqual([from, to], saved);
});

test("premultiplied color stays finite and normalized across opacity and transfer-function boundaries", () => {
  const channels = [0, .0001, .003, .04, .25, .5, .8, 1];
  const alphas = [0, Number.MIN_VALUE, 1e-10, .1, .5, 1];
  for (const from of channels) for (const to of channels) {
    for (const a of alphas) for (const b of alphas) {
      for (const t of [.001, .1, .3, .5, .7, .9, .999]) {
        const value = interpolateRGBA([from, from, from, a], [to, to, to, b], t);
        assert.ok(value.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 1));
        assert.ok(Object.isFrozen(value));
      }
    }
  }
});

test("numeric interpolation rejects malformed endpoints, progress, easing and RGBA accessors", () => {
  for (const value of [NaN, Infinity, -Infinity, "1", null, undefined]) {
    assert.throws(() => transitionProgress(value, 1)); assert.throws(() => transitionProgress(0, value));
    for (const fn of [interpolateNumber, interpolatePositiveScale, interpolateRotation]) {
      assert.throws(() => fn(value, 1, .5)); assert.throws(() => fn(1, value, .5));
    }
  }
  assert.throws(() => transitionProgress(0, -1));
  for (const progress of [-.1, 1.1, NaN]) {
    assert.throws(() => easeProgress(progress));
    for (const fn of [interpolateNumber, interpolatePositiveScale, interpolateRotation]) assert.throws(() => fn(1, 2, progress));
    assert.throws(() => interpolateRGBA([1, 0, 0, 1], [0, 0, 1, 1], progress));
  }
  for (const value of [0, -1]) {
    assert.throws(() => interpolatePositiveScale(value, 1, 0));
    assert.throws(() => interpolatePositiveScale(1, value, 1));
  }
  assert.throws(() => easeProgress(.5, "unknown"));
  for (const color of [null, {}, [0, 0, 1], [0, 0, 1, 1, 1], [0, 0, 1, -1], [0, 0, 1, NaN], [2, 0, 1, 1], new Uint8Array(4)]) {
    assert.throws(() => interpolateRGBA(color, [0, 0, 0, 1], .5));
    assert.throws(() => interpolateRGBA([0, 0, 0, 1], color, .5));
  }
  let calls = 0;
  const color = [0, 0, 0, 1]; Object.defineProperty(color, 0, { enumerable: true, get() { calls++; return 0; } });
  assert.throws(() => interpolateRGBA(color, [0, 0, 0, 1], .5), /accessors/); assert.equal(calls, 0);
});
