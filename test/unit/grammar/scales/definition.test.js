import assert from "node:assert/strict";
import test from "node:test";

import {
  hasOrdinalDomain,
  isColorScaleType,
  isContinuousColorScaleType,
  isContinuousPositionScaleType,
  isDiscretePositionScaleType,
  isDiscretizedColorScaleType,
  normalizeScaleDefinition,
  validateOrdinalDomain,
  validateScaleDomain,
  validateScaleRange
} from "../../../../src/grammar/scales/index.js";

test("classifies scale roles through canonical predicates", () => {
  assert.equal(isContinuousPositionScaleType("log"), true);
  assert.equal(isContinuousPositionScaleType("time"), true);
  assert.equal(isDiscretePositionScaleType("band"), true);
  assert.equal(hasOrdinalDomain("ordinal"), true);
  assert.equal(hasOrdinalDomain("point"), true);
  assert.equal(isContinuousColorScaleType("sequential"), true);
  assert.equal(isDiscretizedColorScaleType("threshold"), true);
  assert.equal(isColorScaleType("quantile"), true);
  assert.equal(isColorScaleType("linear"), false);
});

test("normalizes shared scale policies without retaining stale type state", () => {
  const normalized = normalizeScaleDefinition({
    type: "log",
    previous: {
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: true,
      clamp: true
    },
    patch: {},
    retainCoreOnTypeChange: true,
    retainCompatibleOnTypeChange: true,
    validateDomain: (_type, value) => validateScaleDomain(value),
    validateRange: (_type, value) => validateScaleRange(value)
  });

  assert.deepEqual(normalized, {
    type: "log",
    domain: "auto",
    range: "auto",
    nice: true,
    clamp: true,
    base: 10
  });
  assert.throws(
    () => normalizeScaleDefinition({
      type: "band",
      patch: { paddingInner: 1 },
      validateDomain: (_type, value) => validateOrdinalDomain(value),
      validateRange: (_type, value) => validateScaleRange(value)
    }),
    /paddingInner/
  );
});
