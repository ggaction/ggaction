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
} from "../../../../src/grammar/scales/index.js";

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

test("rejects transformed extrapolation outside the finite numeric range", () => {
  assert.throws(() => mapTransformedValues(
    [2], [0, 1], [0, Number.MAX_VALUE], { type: "pow" }
  ), /finite numeric range/);
  assert.throws(() => mapTransformedValues(
    [1e308], [1, 10], [0, Number.MAX_VALUE], { type: "log" }
  ), /finite numeric range/);
});

test("preserves range endpoints when transformed interpolation would cancel", () => {
  for (const type of ["log", "pow", "symlog"]) {
    const domain = type === "log" ? [1, 10] : [0, 10];
    assert.deepEqual(
      mapTransformedValues(domain, domain, [-1e100, -1], { type }),
      [-1e100, -1]
    );
    assert.deepEqual(
      mapTransformedValues(type === "log" ? [0.1, 11] : [-1, 11], domain, [-1e100, -1], {
        type,
        clamp: true,
        unknown: null
      }),
      [-1e100, -1]
    );
  }
});

test("keeps extreme transformed parameters finite and endpoint preserving", () => {
  for (const exponent of [Number.MIN_VALUE, 1e308]) {
    const mapped = mapTransformedValues([1, 1.5, 2], [1, 2], [0, 100], {
      type: "pow",
      exponent
    });
    assert.equal(mapped.every(Number.isFinite), true);
    assert.equal(mapped[0], 0);
    assert.equal(mapped.at(-1), 100);
    assert.equal(mapped[0] <= mapped[1] && mapped[1] <= mapped[2], true);
  }

  assert.deepEqual(
    mapTransformedValues([-1, 0, 1], [-1, 1], [0, 100], {
      type: "symlog",
      constant: Number.MIN_VALUE
    }),
    [0, 50, 100]
  );

  const tinySymlog = mapTransformedValues(
    [1e-200, 1e-150, 1e-100],
    [1e-200, 1e-100],
    [0, 100],
    { type: "symlog", constant: Number.MAX_VALUE }
  );
  assert.equal(tinySymlog.every(Number.isFinite), true);
  assert.equal(tinySymlog[0], 0);
  assert.equal(tinySymlog.at(-1), 100);
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
    type: "log",
    values: [2, 10],
    nice: true,
    base: 0.5
  }), [2, 16]);
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
  for (const values of [
    [Number.MIN_VALUE, 1e-300],
    [-1, -Number.MIN_VALUE]
  ]) {
    const resolved = resolveTransformedDomain({
      type: "log",
      values,
      nice: true,
      base: 10
    });
    assert.equal(resolved.every(Number.isFinite), true);
    assert.equal(resolved.includes(0), false);
    assert.equal(resolved[0] <= values[0], true);
    assert.equal(resolved[1] >= values[1], true);
  }
  assert.throws(
    () => resolveTransformedDomain({
      type: "log",
      values: [1, 10],
      zero: true
    }),
    /does not support zero/
  );
});

test("pads automatic constant transformed domains without changing explicit policy", () => {
  const cases = [
    { type: "log", value: 7 },
    { type: "log", value: -7 },
    { type: "pow", value: 7, exponent: 2 },
    { type: "pow", value: 0, exponent: 2 },
    { type: "pow", value: -7, exponent: 2 },
    { type: "sqrt", value: 7 },
    { type: "sqrt", value: 0 },
    { type: "sqrt", value: -7 },
    { type: "symlog", value: 7, constant: 2 },
    { type: "symlog", value: 0, constant: 2 },
    { type: "symlog", value: -7, constant: 2 }
  ];

  for (const { value, ...options } of cases) {
    const domain = resolveTransformedDomain({
      ...options,
      values: [value, value]
    });
    assert.equal(Object.isFrozen(domain), true);
    assert.equal(domain.every(Number.isFinite), true);
    assert.equal(domain[0] < domain[1], true);
    assert.equal(domain[0] <= value && domain[1] >= value, true);

    const [mapped] = mapTransformedValues([value], domain, [0, 100], options);
    assert.equal(Number.isFinite(mapped), true);
    assert.ok(Math.abs(mapped - 50) < 1e-10);
  }

  assert.deepEqual(resolveTransformedDomain({
    type: "log",
    values: [7]
  }), [3.5, 14]);
  assert.deepEqual(resolveTransformedDomain({
    type: "log",
    values: [-7]
  }), [-14, -3.5]);
  assert.deepEqual(resolveTransformedDomain({
    type: "pow",
    values: [7],
    zero: true,
    exponent: 2
  }), [0, 7]);
  assert.throws(
    () => resolveTransformedDomain({ type: "log", values: [0] }),
    /strictly positive or strictly negative/
  );
  assert.throws(
    () => resolveTransformedDomain({ type: "sqrt", domain: [7, 7], values: [] }),
    /must be distinct/
  );
});

test("keeps padded constant transformed domains finite at numeric limits", () => {
  for (const type of ["log", "pow", "sqrt", "symlog"]) {
    for (const value of [
      Number.MIN_VALUE,
      Number.MAX_VALUE,
      -Number.MIN_VALUE,
      -Number.MAX_VALUE
    ]) {
      const options = type === "pow"
        ? { exponent: 2 }
        : type === "symlog" ? { constant: 2 } : {};
      const domain = resolveTransformedDomain({ type, values: [value], ...options });
      assert.equal(domain.every(Number.isFinite), true);
      assert.equal(domain[0] < domain[1], true);
      assert.equal(domain[0] <= value && domain[1] >= value, true);
      assert.equal(
        mapTransformedValues([value], domain, [0, 100], { type, ...options })
          .every(Number.isFinite),
        true
      );
    }
  }
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
    transformedTicks("log", [1, 16], 5, { base: 0.5 }),
    [1, 2, 4, 8, 16]
  );
  assert.deepEqual(
    transformedTicks("sqrt", [0, 10], 5),
    [0, 2, 4, 6, 8, 10]
  );

  const denseLogTicks = transformedTicks("log", [1, 2], 5, {
    base: 1 + Number.EPSILON
  });
  assert.equal(denseLogTicks.length <= 5, true);
  assert.equal(denseLogTicks.every(Number.isFinite), true);
  assert.equal(denseLogTicks.every(
    (value, index) => index === 0 || value > denseLogTicks[index - 1]
  ), true);
  assert.equal(denseLogTicks[0], 1);
  assert.equal(denseLogTicks.at(-1), 2);

  const boundedLogTicks = transformedTicks(
    "log",
    [1, 2],
    Number.MAX_SAFE_INTEGER,
    { base: 1 + Number.EPSILON }
  );
  assert.equal(boundedLogTicks.length <= 10_000, true);
  assert.equal(boundedLogTicks.every(Number.isFinite), true);
});
