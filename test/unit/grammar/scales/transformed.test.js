import assert from "node:assert/strict";
import test from "node:test";

import {
  SCALE_ROLES,
  SCALE_TYPES_BY_ROLE,
  mapTransformedValues,
  normalizeTransformParameters,
  resolveMappingRange,
  resolveTransformedDomain,
  transformedTicks,
  validateCompleteScaleType,
  validateScaleTypeForRole,
  validateTransformedDomain
} from "../../../../src/grammar/scales.js";

test("separates scale types by semantic consumer role", () => {
  assert.deepEqual(
    SCALE_TYPES_BY_ROLE[SCALE_ROLES.quantitativePosition],
    ["linear", "log", "pow", "sqrt", "symlog"]
  );
  assert.deepEqual(SCALE_TYPES_BY_ROLE[SCALE_ROLES.temporalPosition], ["time"]);
  assert.deepEqual(SCALE_TYPES_BY_ROLE[SCALE_ROLES.bandPosition], ["band"]);
  assert.deepEqual(SCALE_TYPES_BY_ROLE[SCALE_ROLES.pointPosition], ["point"]);
  assert.deepEqual(SCALE_TYPES_BY_ROLE[SCALE_ROLES.discreteAppearance], ["ordinal"]);
  assert.deepEqual(
    SCALE_TYPES_BY_ROLE[SCALE_ROLES.discretizedColor],
    ["quantize", "quantile", "threshold"]
  );
  assert.equal(validateCompleteScaleType("sequential"), "sequential");
  assert.equal(
    validateScaleTypeForRole("log", SCALE_ROLES.quantitativePosition),
    "log"
  );
  assert.throws(
    () => validateScaleTypeForRole("ordinal", SCALE_ROLES.bandPosition),
    /not valid for band-position/
  );
  assert.throws(
    () => validateCompleteScaleType("localTime"),
    /Unsupported scale type/
  );
});

test("normalizes only the parameter owned by each transformed type", () => {
  assert.deepEqual(normalizeTransformParameters("log"), { base: 10 });
  assert.deepEqual(normalizeTransformParameters("pow"), { exponent: 1 });
  assert.deepEqual(normalizeTransformParameters("sqrt"), { exponent: 0.5 });
  assert.deepEqual(normalizeTransformParameters("symlog"), { constant: 1 });
  assert.deepEqual(normalizeTransformParameters("linear"), {});
  assert.throws(
    () => normalizeTransformParameters("log", { base: 1 }),
    /must not equal 1/
  );
  assert.throws(
    () => normalizeTransformParameters("pow", { exponent: 0 }),
    /positive finite/
  );
  assert.throws(
    () => normalizeTransformParameters("sqrt", { exponent: 2 }),
    /does not support exponent/
  );
  assert.throws(
    () => normalizeTransformParameters("symlog", { constant: -1 }),
    /positive finite/
  );
});

test("maps positive and negative logarithmic domains and rejects zero crossing", () => {
  assert.deepEqual(
    mapTransformedValues([1, 10, 100], [1, 100], [0, 1], { type: "log" }),
    [0, 0.5, 1]
  );
  assert.deepEqual(
    mapTransformedValues([-100, -10, -1], [-100, -1], [0, 1], {
      type: "log"
    }),
    [0, 0.5, 1]
  );
  assert.deepEqual(
    mapTransformedValues([1, 2, 4], [1, 4], [0, 100], {
      type: "log",
      base: 2
    }),
    [0, 50, 100]
  );
  assert.throws(
    () => validateTransformedDomain("log", [-1, 1]),
    /strictly positive or strictly negative/
  );
});

test("uses sign-preserving power, sqrt and symmetric symlog mappings", () => {
  assert.deepEqual(
    mapTransformedValues([-2, -1, 0, 1, 2], [-2, 2], [-1, 1], {
      type: "pow",
      exponent: 2
    }),
    [-1, -0.25, 0, 0.25, 1]
  );
  assert.deepEqual(
    mapTransformedValues([-4, -1, 0, 1, 4], [-4, 4], [-2, 2], {
      type: "sqrt"
    }),
    [-2, -1, 0, 1, 2]
  );
  const symlog = mapTransformedValues([-9, 0, 9], [-9, 9], [-1, 1], {
    type: "symlog",
    constant: 1
  });
  assert.ok(Math.abs(symlog[0] + 1) < 1e-12);
  assert.equal(symlog[1], 0);
  assert.ok(Math.abs(symlog[2] - 1) < 1e-12);
});

test("applies clamp, reverse and unknown without changing the domain", () => {
  assert.deepEqual(
    mapTransformedValues([-5, 5, 15, null], [0, 10], [0, 100], {
      clamp: true,
      reverse: true,
      unknown: -1
    }),
    [100, 50, 0, -1]
  );
  assert.deepEqual(resolveMappingRange([0, 100], { reverse: true }), [100, 0]);
  assert.throws(
    () => mapTransformedValues([null], [0, 10], [0, 100]),
    /invalid value/
  );
});

test("resolves automatic domains with explicit precedence, zero and nice", () => {
  assert.deepEqual(resolveTransformedDomain({
    type: "log",
    values: [3, 95],
    nice: true
  }), [1, 100]);
  assert.deepEqual(resolveTransformedDomain({
    type: "sqrt",
    values: [3, 8.2],
    zero: true,
    nice: true
  }), [0, 10]);
  assert.deepEqual(resolveTransformedDomain({
    type: "pow",
    domain: [3, 8],
    values: [0, 100],
    zero: true,
    nice: true,
    exponent: 2
  }), [3, 8]);
  assert.throws(
    () => resolveTransformedDomain({
      type: "log",
      values: [1, 10],
      zero: true
    }),
    /does not support zero/
  );
});

test("creates deterministic transformed ticks and frozen results", () => {
  const logTicks = transformedTicks("log", [1, 10000], 5);
  assert.deepEqual(logTicks, [1, 10, 100, 1000, 10000]);
  assert.ok(Object.isFrozen(logTicks));
  assert.deepEqual(
    transformedTicks("log", [-1000, -1], 4),
    [-1000, -100, -10, -1]
  );
  assert.deepEqual(
    transformedTicks("sqrt", [0, 10], 5),
    [0, 2, 4, 6, 8, 10]
  );
});
