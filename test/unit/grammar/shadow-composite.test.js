import assert from "node:assert/strict";
import test from "node:test";
import { compositeShadowPixels, planShadowComposite } from "../../../src/grammar/shadowComposite.js";
import { shadowReference } from "../../oracles/shadow.js";

const options = { width: 1, height: 1, color: "blue" };

test("composes literal source alpha over tinted shadow and leaves mark opacity outside", () => {
  const source = [255, 0, 0, 128], before = [...source];
  const same = compositeShadowPixels(source, options);
  assert.deepEqual([...same.rgba], [170, 0, 85, 192]);
  const shifted = compositeShadowPixels(source, { ...options, color: "rgba(0,0,255,.5)", offsetX: 1, offsetY: -1 });
  assert.deepEqual(shifted.bounds, { x: 0, y: -1, width: 2, height: 2 });
  assert.deepEqual([...shifted.rgba], [0,0,0,0, 0,0,255,64, 255,0,0,128, 0,0,0,0]);
  assert.deepEqual(source, before);
  same.rgba[0] = 0;
  assert.equal(compositeShadowPixels(source, options).rgba[0], 170);
  assert.ok(Object.isFrozen(shifted));
});

test("fractional offsets interpolate mask alpha and retain original source alignment", () => {
  const right = compositeShadowPixels([255, 0, 0, 255], { ...options, offsetX: .5 });
  assert.deepEqual([...right.rgba], [255,0,0,255, 0,0,255,128]);
  const left = compositeShadowPixels([255, 0, 0, 255], { ...options, offsetX: -.5 });
  assert.deepEqual([...left.rgba], [0,0,255,128, 255,0,0,255]);
  const corner = compositeShadowPixels([255, 0, 0, 255], { ...options, offsetX: .5, offsetY: .5 });
  assert.deepEqual([...corner.rgba], [255,0,0,255, 0,0,255,64, 0,0,255,64, 0,0,255,64]);
  const dense = compositeShadowPixels([255, 0, 0, 255], { ...options, offsetX: .5, pixelRatio: 2 });
  assert.deepEqual([...dense.rgba], [255,0,0,255, 0,0,255,255]);
  assert.deepEqual(dense.bounds, { x: 0, y: 0, width: 1, height: .5 });
});

test("uses independent two-dimensional Gaussian alpha and a literal opaque source center", () => {
  const result = compositeShadowPixels([255, 0, 0, 255], { ...options, blurRadius: 1 });
  const expected = shadowReference([255], 1, 1, .5).flatMap((alpha, index) =>
    index === 12 ? [255, 0, 0, 255] : alpha === 0 ? [0,0,0,0] : [0,0,255,alpha]);
  assert.deepEqual([...result.rgba], expected);
  const transparent = compositeShadowPixels([255, 0, 0, 0], { ...options, blurRadius: 1 });
  assert.ok(transparent.rgba.every(value => value === 0));
  assert.deepEqual([...compositeShadowPixels([25,50,75,128], { ...options, color: "transparent" }).rgba], [25,50,75,128]);
});

test("rejects closed, malformed, own-data and cumulative work limits before pixel inspection", () => {
  for (const value of [null, {}, { ...options, color: undefined }, { ...options, opacity: .5 },
    { ...options, offsetX: Number.MAX_VALUE }, { ...options, offsetY: 4096 },
    { ...options, width: 1000, height: 1000 }, { ...options, width: 800, height: 200, blurRadius: 8 }]) {
    assert.throws(() => planShadowComposite(value));
  }
  for (const rgba of [[], [0,0,0,256], [0,0,NaN,0], [0,0,.5,0], new Uint8Array(4), Array(4)]) {
    assert.throws(() => compositeShadowPixels(rgba, options));
  }
  let reads = 0;
  const source = [0,0,0,0]; Object.defineProperty(source, 0, { get() { reads++; return 1; } });
  assert.throws(() => compositeShadowPixels(source, { ...options, width: 4097 }), /dimension/);
  assert.throws(() => compositeShadowPixels(source, options), /accessors/);
  assert.equal(reads, 0);
  assert.ok(planShadowComposite(options).work > planShadowComposite(options).blur.work);
});
