import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLegendSampling, readLegendSampling, resolveLegendSampleValues, validateSamplingAgainstScale } from "../../../src/grammar/legendSampling.js";

test("legend samples preserve exact endpoint and ordered value meaning independently of labels", () => {
  assert.deepEqual(resolveLegendSampleValues({ count: 5 }, { type: "linear", domain: [0, 1] }), [0, .25, .5, .75, 1]);
  assert.deepEqual(resolveLegendSampleValues({ count: 3 }, { type: "linear", domain: [9, 1] }), [9, 5, 1]);
  const values = [-0, .125, 1], prepared = normalizeLegendSampling({ values });
  assert.ok(Object.isFrozen(prepared)); assert.ok(Object.isFrozen(prepared.values));
  assert.ok(Object.is(prepared.values[0], -0));
  values[1] = .75;
  assert.deepEqual(prepared.values, [-0, .125, 1]);
  const sampled = resolveLegendSampleValues({ sampling: prepared }, { type: "linear", domain: [-1, 1] });
  assert.deepEqual(sampled, [-0, .125, 1]); assert.notEqual(sampled, prepared.values);
  assert.deepEqual(readLegendSampling(), { mode: "auto", count: 5 });
  assert.deepEqual(readLegendSampling({ sampling: { mode: "values", values: [1] }, count: 7 }), { mode: "values", values: [1], count: 7 });
});

test("legend exact sampling resets explicitly and rejects invalid values before scale mapping", () => {
  const previous = { sampling: normalizeLegendSampling({ values: [1, 10] }) };
  assert.deepEqual(normalizeLegendSampling({}, { previous }), previous.sampling);
  assert.notEqual(normalizeLegendSampling({}, { previous }).values, previous.sampling.values);
  assert.deepEqual(normalizeLegendSampling({ values: "auto" }, { previous, operation: "edit" }), { mode: "auto", count: 5 });
  assert.deepEqual(normalizeLegendSampling({ values: "auto", count: 3 }, { previous, operation: "edit" }), { mode: "auto", count: 3 });
  assert.throws(() => normalizeLegendSampling({ count: 3 }, { previous }), /cannot replace exact/);
  assert.throws(() => normalizeLegendSampling({ values: "auto" }), /creation uses omission/);
  assert.throws(() => normalizeLegendSampling({ values: [1], count: 3 }), /both count and exact/);
  for (const values of [null, [], [2, 1], [1, 1], [NaN], [Infinity], Array.from({ length: 101 }, (_, i) => i)]) {
    assert.throws(() => normalizeLegendSampling({ values }));
  }
  for (const count of [1, 2.5, Infinity, 100000000]) assert.throws(() => normalizeLegendSampling({ count }));
  assert.deepEqual(normalizeLegendSampling({ count: 2 }), { mode: "auto", count: 2 });
  assert.throws(() => validateSamplingAgainstScale(previous.sampling, { domain: [1] }), /finite quantitative/);
  assert.throws(() => validateSamplingAgainstScale({ mode: "values", values: [0] }, { type: "log", domain: [1, 10] }), /positive/);
  assert.throws(() => validateSamplingAgainstScale(previous.sampling, { type: "linear", domain: [2, 10] }), /outside/);
});
