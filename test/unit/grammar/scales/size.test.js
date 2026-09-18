import assert from "node:assert/strict";
import test from "node:test";

import {
  discretizedSizeIndex,
  mapSizeValues,
  normalizeSizeScaleDefinition,
  resolveSizeScale
} from "../../../../src/grammar/scales/index.js";

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("maps continuous size scales in transformed-domain area space", () => {
  const log = resolveSizeScale({
    type: "log",
    domain: [1, 100],
    range: [4 * Math.PI, 100 * Math.PI],
    values: [1, 10, 100]
  });
  const logAreas = mapSizeValues([1, 10, 100], log);
  close(logAreas[0], 4 * Math.PI);
  close(logAreas[1], 52 * Math.PI);
  close(logAreas[2], 100 * Math.PI);

  const power = resolveSizeScale({
    type: "pow", exponent: 2, domain: [1, 9], range: [0, 80], values: [5]
  });
  close(mapSizeValues([5], power)[0], 24);
  const squareRoot = resolveSizeScale({
    type: "sqrt", domain: [1, 9], range: [0, 100], values: [4]
  });
  close(mapSizeValues([4], squareRoot)[0], 50);

  const reversed = resolveSizeScale({
    type: "linear", domain: [0, 10], range: [4, 100], reverse: true,
    values: [0, 5, 10]
  });
  assert.deepEqual(mapSizeValues([0, 5, 10], reversed), [100, 52, 4]);
  assert.equal(Object.isFrozen(reversed), true);
  assert.equal(Object.isFrozen(reversed.range), true);
});

test("resolves every discrete size bucket with stable upper-bound semantics", () => {
  const quantize = resolveSizeScale({
    type: "quantize", domain: [0, 12], range: [1, 4, 9],
    values: [0, 4, 8, 12]
  });
  assert.deepEqual(quantize.thresholds, [4, 8]);
  assert.deepEqual(mapSizeValues([-1, 0, 3.9, 4, 7.9, 8, 12, 13], quantize),
    [1, 1, 1, 4, 4, 9, 9, 9]);

  const quantile = resolveSizeScale({
    type: "quantile", domain: [0, 0, 0, 10], range: [1, 2, 3, 4],
    values: [0, 0, 0, 10]
  });
  assert.deepEqual(quantile.thresholds, [0, 0, 2.5]);
  assert.deepEqual(mapSizeValues([0, 2.5, 10], quantile), [3, 4, 4]);

  const threshold = resolveSizeScale({
    type: "threshold", domain: [10, 20], range: [2, 4, 8],
    values: [9, 10, 19, 20]
  });
  assert.deepEqual(mapSizeValues([9, 10, 19, 20], threshold), [2, 4, 4, 8]);
  assert.equal(discretizedSizeIndex(20, threshold.thresholds), 2);
});

test("normalizes size family migrations without retaining stale parameters", () => {
  const previous = Object.freeze({
    type: "log", domain: Object.freeze([1, 100]), range: "auto",
    base: 2, clamp: true, reverse: true
  });
  const squareRoot = normalizeSizeScaleDefinition({
    previous,
    patch: { type: "sqrt" }
  });
  assert.deepEqual(squareRoot, {
    type: "sqrt", domain: [1, 100], range: "auto", clamp: true, reverse: true
  });
  assert.equal(Object.hasOwn(squareRoot, "base"), false);

  const discrete = normalizeSizeScaleDefinition({
    previous: squareRoot,
    patch: { type: "quantile", domain: "auto", range: [4, 9, 16] }
  });
  assert.deepEqual(discrete, {
    type: "quantile", domain: "auto", range: [4, 9, 16], reverse: true
  });
  assert.equal(Object.hasOwn(discrete, "clamp"), false);
  assert.deepEqual(previous, {
    type: "log", domain: [1, 100], range: "auto",
    base: 2, clamp: true, reverse: true
  });
});

test("rejects invalid size definitions and mapped values", () => {
  for (const [operation, pattern] of [
    [() => normalizeSizeScaleDefinition({ patch: { type: "pow" } }), /explicit exponent/],
    [() => normalizeSizeScaleDefinition({ patch: { type: "log", domain: [0, 10] } }), /strictly positive/],
    [() => normalizeSizeScaleDefinition({ patch: { type: "sqrt", domain: [-1, 10] } }), /non-negative/],
    [() => normalizeSizeScaleDefinition({ patch: { type: "quantize", range: [4, 2] } }), /nondecreasing/],
    [() => normalizeSizeScaleDefinition({ patch: { type: "threshold", domain: [2, 2], range: [1, 2, 3] } }), /strictly increasing/],
    [() => normalizeSizeScaleDefinition({
      previous: { type: "linear", domain: "auto", range: "auto" },
      patch: { type: "quantile", range: [1, 2] }
    }), /explicit domain/],
    [() => resolveSizeScale({
      type: "threshold", domain: [1, 2], range: [1, 2], values: [1]
    }), /exactly one more/],
    [() => mapSizeValues([-1], {
      type: "log", domain: [1, 10], range: [1, 2]
    }), /strictly positive/]
  ]) {
    assert.throws(operation, pattern);
  }
});


test("ordinal size preserves category identity, appearance order and equal-area values", () => {
  const values = [10, "10", false, 10];
  const scale = resolveSizeScale({ type: "ordinal", values });
  assert.deepEqual(scale.domain, [10, "10", false]);
  assert.deepEqual(mapSizeValues(values, scale), [24, 110, 196, 24]);
  assert.deepEqual(values, [10, "10", false, 10]);
  assert.ok(Object.isFrozen(scale.domain));
  assert.ok(Object.isFrozen(scale.range));
  const singleton = resolveSizeScale({ type: "ordinal", values: ["only"] });
  assert.deepEqual(mapSizeValues(["only"], singleton), [110]);
});

test("ordinal size uses explicit order, cyclic area ranges, reversal and unknown fallback", () => {
  const scale = resolveSizeScale({
    type: "ordinal", domain: ["B", "A", "C"], range: [81, 0],
    reverse: true, unknown: 9, values: ["A", "B", "C", null, "missing"]
  });
  assert.deepEqual(scale.domain, ["B", "A", "C"]);
  assert.deepEqual(mapSizeValues(["A", "B", "C", null, "missing"], scale),
    [81, 0, 0, 9, 9]);
  assert.deepEqual(resolveSizeScale({
    type: "ordinal", domain: ["A"], range: [0], values: []
  }).range, [0]);
  assert.throws(() => resolveSizeScale({
    type: "ordinal", domain: ["A"], values: ["B"]
  }), /outside the ordinal domain/);
});

test("ordinal size rejects invalid categories and areas without numeric coercion", () => {
  for (const values of [[null], [{}], [NaN]]) {
    assert.throws(() => resolveSizeScale({ type: "ordinal", values }), /nominal/);
  }
  for (const range of [[], [-1], [Infinity], ["24"]]) {
    assert.throws(() => resolveSizeScale({ type: "ordinal", values: ["A"], range }));
  }
  assert.throws(() => resolveSizeScale({
    type: "ordinal", domain: ["A", "A"], values: ["A"]
  }), /unique nominal/);
  assert.throws(() => resolveSizeScale({ type: "ordinal", values: [] }), /no values/);
  assert.throws(() => resolveSizeScale({
    type: "ordinal", values: ["A"], clamp: true
  }), /does not support clamp/);
});
