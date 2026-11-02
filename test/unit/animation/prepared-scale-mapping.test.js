import assert from "node:assert/strict";
import test from "node:test";
import { cloneAndFreeze, isOwned } from "../../../src/core/immutable.js";
import { mapContinuousScaleValues as vector, prepareContinuousScaleScalar as prepare, mapPreparedContinuousScaleValue as sample } from "../../../src/grammar/scales/mapping.js";
import { mapLinearValues, prepareLinearScalar } from "../../../src/grammar/scales/continuous.js";
import { mapTransformedValues, prepareTransformedScalar } from "../../../src/grammar/scales/transformed.js";
import { createPositionPreparationContext, preparePositionInterpolation, samplePositionInterpolation } from "../../../src/grammar/animation/positions.js";

const scale = (overrides = {}) => ({ type: "linear", domain: [0, 10], range: [0, 100], ...overrides });
const outcome = run => { try { return { value: run() }; } catch (error) { return { error: [error.name, error.message] }; } };

test("prepared scalars retain signed zero, extremes, clamp and all continuous transform results", () => {
  const cases = [
    [scale(), [[0, 0], [5, 50], [10, 100], [-5, -50]]],
    [scale({ type: "time" }), [[0, 0], [5, 50], [10, 100]]],
    [scale({ type: "log", domain: [1, 100], base: 10 }), [[1, 0], [10, 50], [100, 100]]],
    [scale({ type: "pow", exponent: 2 }), [[0, 0], [5, 25], [10, 100]]],
    [scale({ type: "sqrt", domain: [0, 100] }), [[0, 0], [25, 50], [100, 100]]],
    [scale({ type: "symlog", domain: [-3, 3], constant: 1 }), [[-3, 0], [0, 50], [3, 100]]]
  ];
  for (const [input, entries] of cases) {
    const token = prepare(input);
    for (const [value, expected] of entries) assert.ok(Math.abs(sample(token, value) - expected) < 1e-12);
  }
  for (const type of ["linear", "time", "log", "pow", "sqrt", "symlog"]) {
    for (const domain of [[-10, 10], [10, -10], [0, 0], [-0, 0], [1, 100], [-100, -1], [1, 1 + Number.EPSILON], [-Number.MAX_VALUE, Number.MAX_VALUE], [Number.MIN_VALUE, 1]]) {
      for (const range of [[0, 100], [100, 0], [-0, 0], [0, -0], [-Number.MAX_VALUE, Number.MAX_VALUE]]) {
        for (const clamp of [false, true]) {
          const input = { type, domain, range, clamp }, prepared = outcome(() => prepare(input));
          for (const value of [-Number.MAX_VALUE, -10, -Number.MIN_VALUE, -0, 0, Number.MIN_VALUE, 1, 10, 100, Number.MAX_VALUE, NaN, Infinity, null, undefined]) {
            assert.deepEqual(prepared.error ? prepared : outcome(() => sample(prepared.value, value)), outcome(() => vector([value], input)[0]));
          }
        }
      }
    }
  }
});

test("prepared scale tokens snapshot data and reject accessors, extra fields and copied authority", () => {
  const input = scale(), token = prepare(input);
  input.domain[1] = 20; input.range[1] = 2000;
  assert.equal(sample(token, 5), 50);
  assert.deepEqual(Reflect.ownKeys(token), []); assert.ok(Object.isFrozen(token));
  for (const fake of [{}, { ...token }, Object.freeze({}), cloneAndFreeze({}), undefined, null, 0, Symbol("token")]) {
    assert.throws(() => sample(fake, 5), /exact private token/);
  }
  for (const invalid of [null, {}, { domain: [0, 1], range: [0, 1] }, { type: "linear", range: [0, 1] }, { type: "linear", domain: [0, 1] },
    scale({ type: "ordinal" }), scale({ unknown: 0 }), scale({ base: 2 }), scale({ radialMapping: {} }), scale({ clamp: null }), scale({ clamp: "yes" }), scale({ clamp: undefined }),
    scale({ domain: [, 1] }), scale({ range: Object.assign([0, 1], { extra: 1 }) }), scale({ domain: [0] }), scale({ range: [0, Infinity] }),
    scale({ type: "log", domain: [1, 10], base: 1 }), scale({ type: "pow", exponent: 0 }), scale({ type: "symlog", constant: 0 })]) assert.throws(() => prepare(invalid));
  let reads = 0;
  for (const key of ["type", "domain", "range", "clamp", "unknown"]) {
    const input = scale(); Object.defineProperty(input, key, { enumerable: true, get() { reads++; return 1; } });
    assert.throws(() => prepare(input), /accessors/);
  }
  for (const key of ["domain", "range"]) {
    const input = scale(); Object.defineProperty(input[key], "0", { enumerable: true, get() { reads++; return 1; } });
    assert.throws(() => prepare(input), /accessors/);
  }
  assert.equal(reads, 0);
  const inherited = Object.create({ type: "linear" }); inherited.domain = [0, 1]; inherited.range = [0, 1];
  assert.throws(() => prepare(inherited), /plain object/);
});

test("scalar owner constructors preserve validation and copy mutable transform parameters", () => {
  assert.equal(prepareLinearScalar([0, 1], [0, 100])(.5), 50);
  assert.equal(prepareLinearScalar([1, 1], [0, 100])(1), 50);
  assert.throws(() => prepareLinearScalar([0], [0, 1]), /Resolved domain/);
  assert.throws(() => prepareLinearScalar([0, 1], [0]), /Resolved range/);
  assert.throws(() => prepareLinearScalar([0, 1], [0, 1], "yes"), /clamp/);
  assert.throws(() => prepareLinearScalar([1, 1], [0, 1])(NaN), /finite numbers/);
  const options = { type: "pow", exponent: 2 }, domain = [0, 10], range = [0, 100];
  const scalar = prepareTransformedScalar(domain, range, options);
  options.exponent = 4; domain[1] = 100; range[1] = 1000;
  assert.equal(scalar(5), 25);
  assert.throws(() => prepareTransformedScalar([0, 1], [0, 1], { type: "pow", clamp: "yes" }), /clamp/);
  assert.throws(() => prepareTransformedScalar([0, 1], [0, 1], { type: "log" }), /strictly/);
  assert.throws(() => prepareTransformedScalar([1, 10], [0, 1], { type: "log", base: 1 }), /base/);
  assert.throws(() => prepareTransformedScalar([1, 10], [0, 1], { type: "log" })(0), /invalid value/);
});

test("ordinary vector mapping keeps unknown getters and validation order", () => {
  for (const domain of [[0, 10], [1, 1]]) {
    const events = [], options = { get clamp() { events.push("clamp"); return false; }, get unknown() { events.push("unknown"); return events.length; } };
    assert.deepEqual(mapLinearValues([5, undefined, NaN], domain, [0, 100], options), [50, 2, 3]);
    assert.deepEqual(events, ["clamp", "unknown", "unknown"]);
  }
  const linearOptions = { get clamp() { return "invalid"; } };
  assert.throws(() => mapLinearValues([NaN], [], [], linearOptions), /Resolved domain/);
  assert.throws(() => mapLinearValues([NaN], [0, 1], [], linearOptions), /Resolved range/);
  assert.throws(() => mapLinearValues([NaN], [0, 1], [0, 1], linearOptions), /clamp/);
  const sneaky = [undefined]; sneaky.every = () => true;
  assert.throws(() => mapLinearValues(sneaky, [0, 1], [0, 1]), /finite numbers/);
  const events = [], options = { type: "pow", get clamp() { events.push("clamp"); return false; }, get reverse() { events.push("reverse"); return false; }, get unknown() { events.push("unknown"); return "missing"; } };
  assert.deepEqual(mapTransformedValues([undefined, 5, NaN], [0, 10], [0, 100], options), ["missing", 50, "missing"]);
  assert.deepEqual(events, ["clamp", "reverse", "unknown"]);
  assert.throws(() => mapTransformedValues(null, [], [], { clamp: "bad" }), /array/);
  assert.throws(() => mapTransformedValues([], [], [], { clamp: "bad" }), /clamp/);
  assert.throws(() => mapTransformedValues([NaN], [], [], { type: "pow", exponent: 0 }), /exponent/);
  assert.throws(() => mapTransformedValues([NaN], [0, 1], [], { type: "pow" }), /range/);
});

test("sampled position records stay core-owned while caller copies remain untrusted", () => {
  for (const type of ["linear", "time", "log", "pow", "sqrt", "symlog"]) {
    const endpoint = value => ({ value, scale: { type, domain: [1, 10], range: [0, 100], clamp: false } });
    const plan = preparePositionInterpolation(endpoint(2), endpoint(8), createPositionPreparationContext());
    const copied = structuredClone(plan), frozen = Object.freeze({ ...plan, to: structuredClone(plan.to) });
    for (const input of [plan, copied, frozen]) for (const progress of [0, .25, .5, .75, 1]) {
      const result = samplePositionInterpolation(input, progress);
      for (const value of [result, result.scale, result.scale.domain, result.scale.range]) assert.ok(isOwned(value));
      assert.deepEqual(result, samplePositionInterpolation(plan, progress));
    }
    assert.equal(isOwned(copied.from.scale), false); assert.equal(isOwned(frozen.to.scale), false);
    copied.from.scale.domain[0] = NaN; frozen.to.scale.domain[0] = NaN;
    assert.throws(() => samplePositionInterpolation(copied, .5)); assert.throws(() => samplePositionInterpolation(frozen, .5));
  }
});
