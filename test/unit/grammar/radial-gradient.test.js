import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRadialGradient, radialGradientCircle } from "../../../src/grammar/radialGradient.js";
import { validateGradientStops, validateFillPaint } from "../../../src/grammar/paint.js";
import { radialOffset, referenceCircle } from "../../oracles/radial-gradient.js";

const stops = [{ offset: 0, color: "#fef3c7" }, { offset: 0.5, color: "#14b8a6" },
  { offset: 0.5, color: "rgba(15,118,110,0.5)" }, { offset: 1, color: "#243447" }];
const example = { center: { x: 30, y: 40 }, focal: { x: 12, y: 16 }, radius: 50, stops };

test("normalizes private radial geometry and preserves ordered hard stops without mutation", () => {
  const caller = structuredClone(example), before = structuredClone(caller), actual = normalizeRadialGradient(caller);
  assert.deepEqual(actual, example); assert.deepEqual(caller, before);
  assert.ok(Object.isFrozen(actual)); assert.ok(Object.isFrozen(actual.center)); assert.ok(Object.isFrozen(actual.stops[0]));
  caller.stops[0].color = "red"; caller.center.x = 100;
  assert.equal(actual.stops[0].color, "#fef3c7"); assert.equal(actual.center.x, 30);
  assert.deepEqual(normalizeRadialGradient({ center: { x: -0, y: -0 }, radius: 1, stops }).focal, { x: 0, y: 0 });
  assert.equal(validateGradientStops(stops), stops);
  assert.throws(() => validateFillPaint({ type: "radial-gradient", ...example }), /center.x/);
});

test("anchors the cone circles and independent ray intersection with literal values", () => {
  assert.deepEqual(radialGradientCircle(example, 0), { x: 12, y: 16, radius: 0 });
  assert.deepEqual(radialGradientCircle(example, 0.5), { x: 21, y: 28, radius: 25 });
  assert.deepEqual(radialGradientCircle(example, 1), { x: 30, y: 40, radius: 50 });
  const centered = { center: { x: 0, y: 0 }, focal: { x: 0, y: 0 }, radius: 10 };
  assert.equal(radialOffset(centered, { x: 3, y: 4 }), 0.5);
  assert.equal(radialOffset(centered, { x: 0, y: 0 }), 0);
  assert.equal(radialOffset(centered, { x: 12, y: 16 }), 2);
  const offset = { ...centered, focal: { x: -5, y: 0 } };
  assert.equal(radialOffset(offset, { x: 2.5, y: 0 }), 0.5);
  const edge = { ...centered, focal: { x: -10, y: 0 } };
  assert.equal(radialOffset(edge, { x: -5, y: 0 }), 0.25);
  assert.equal(radialOffset(edge, { x: -11, y: 0 }), null);
});

test("preserves nested-circle containment and translation/scale invariants", () => {
  for (const focal of [{ x: 30, y: 40 }, { x: 12, y: 16 }, { x: 0, y: 0 }]) {
    const value = { ...example, focal };
    let previous = radialGradientCircle(value, 0);
    for (let index = 0; index <= 20; index++) {
      const t = index / 20, actual = radialGradientCircle(value, t), expected = referenceCircle(value, t);
      for (const key of ["x", "y", "radius"]) assert.ok(Math.abs(actual[key] - expected[key]) < 1e-12);
      assert.ok(Math.hypot(actual.x - previous.x, actual.y - previous.y) + previous.radius <= actual.radius + 1e-12);
      previous = actual;
      if (t === 0) continue;
      for (const angle of [0, 0.4, 1.8, 3, 4.7]) {
        const point = { x: actual.x + actual.radius * Math.cos(angle), y: actual.y + actual.radius * Math.sin(angle) };
        assert.ok(Math.abs(radialOffset(value, point) - t) < 1e-10);
        const transform = point => ({ x: point.x * 3 + 100, y: point.y * 3 - 250 });
        assert.ok(Math.abs(radialOffset({ center: transform(value.center), focal: transform(value.focal), radius: value.radius * 3 }, transform(point)) - t) < 1e-10);
      }
    }
  }
});

test("handles finite extremes without overflowing distance or circle interpolation", () => {
  const maximum = Number.MAX_VALUE, minimum = Number.MIN_VALUE;
  assert.deepEqual(radialGradientCircle({ center: { x: maximum, y: maximum }, focal: { x: maximum, y: maximum }, radius: maximum, stops }, 0.5),
    { x: maximum, y: maximum, radius: maximum / 2 });
  assert.doesNotThrow(() => normalizeRadialGradient({ center: { x: 0, y: 0 }, focal: { x: minimum, y: 0 }, radius: minimum, stops }));
  assert.throws(() => normalizeRadialGradient({ center: { x: 0, y: 0 }, focal: { x: minimum, y: minimum }, radius: minimum, stops }), /focal/);
  assert.throws(() => normalizeRadialGradient({ center: { x: -maximum, y: 0 }, focal: { x: maximum, y: 0 }, radius: maximum, stops }), /focal/);
});

test("rejects malformed options, geometry, budgets and stops before evaluation", () => {
  for (const value of [undefined, null, [], {}, { ...example, extra: 1 }, { ...example, focal: undefined },
    { ...example, center: { x: 1 } }, { ...example, center: { x: 1, y: 2, z: 3 } },
    { ...example, focal: { x: Infinity, y: 0 } }, ...[0, -1, NaN, Infinity].map(radius => ({ ...example, radius })),
    { ...example, radius: 29 }, { ...example, stops: [] }, { ...example, stops: [stops[0]] },
    { ...example, stops: [stops[1], stops[0]] }, { ...example, stops: [{ offset: -0.1, color: "red" }, stops[3]] },
    { ...example, stops: [{ offset: 0, color: "" }, stops[3]] }, { ...example, stops: [{ ...stops[0], alpha: 1 }, stops[3]] },
    { ...example, stops: new Array(10_000_001) }, { ...example, stops: new Array(2) }]) assert.throws(() => normalizeRadialGradient(value));
  for (const value of [-1, 1.1, NaN, Infinity, undefined]) assert.throws(() => radialGradientCircle(example, value));
});

test("rejects accessors and exotic properties without invoking caller code", () => {
  let reads = 0;
  for (const value of [Object.defineProperty({ ...example }, "center", { get() { reads++; return example.center; }, enumerable: true }),
    { ...example, center: Object.defineProperty({ y: 0 }, "x", { get() { reads++; return 0; }, enumerable: true }) },
    { ...example, stops: [Object.defineProperty({ offset: 0 }, "color", { get() { reads++; return "red"; }, enumerable: true }), stops[3]] },
    { ...example, [Symbol()]: 1 }, Object.defineProperty({ ...example }, "hidden", { value: 1 }),
    { ...example, stops: Object.assign([...stops], { extra: 1 }) }]) assert.throws(() => normalizeRadialGradient(value));
  assert.equal(reads, 0);
});
