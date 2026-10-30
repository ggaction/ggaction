import assert from "node:assert/strict";
import test from "node:test";
import { cartesianPosition as position, normalizeCartesianPosition, prepareCartesianPosition as prepare, sampleCartesianPosition as sample } from "../../../src/grammar/animation/cartesianPosition.js";
const band = range => ({ type: "band", domain: [1, "1", "b"], range, paddingInner: .2, paddingOuter: .1, align: .5 });

test("categorical animation preserves typed domain identity and native band geometry through resize", () => {
  const source = position("1", band([0, 300])), target = position("1", band([0, 600]));
  const plan = prepare(source, target), before = structuredClone(plan);
  const mid = sample(plan, .5);
  assert.equal(mid.position, 225); assert.equal(mid.resolvedScale.bandwidth, 120); assert.equal(mid.resolvedScale.step, 150);
  assert.equal(sample(plan, 0).position, 150); assert.equal(sample(plan, 1).position, 300);
  assert.ok(Object.isFrozen(source.scale.domain)); assert.deepEqual(plan, before);
  for (const type of ["ordinal", "point"]) {
    const simple = range => position(1, { type, domain: [1, "1"], range });
    assert.equal(sample(prepare(simple([0, 100]), simple([0, 300])), .5).position, 50);
  }
});

test("categorical reorder, typed key change, padding policy and direction changes have exact fallbacks", () => {
  const from = position(1, band([0, 300]));
  assert.equal(prepare(from, position("1", band([0, 300]))).reason, "ordinal-domain");
  assert.equal(prepare(from, position(1, { ...band([0, 300]), domain: ["1", 1, "b"] })).reason, "ordinal-domain");
  assert.equal(prepare(from, position(1, { ...band([0, 300]), paddingInner: .5 })).reason, "scale-parameters");
  assert.equal(prepare(from, position(1, band([300, 0]))).reason, "scale-direction");
  assert.equal(prepare(from, position(1, { type: "linear", domain: [0, 10], range: [0, 300] })).reason, "scale-type");
});

test("continuous Cartesian positions retain native value-space logarithmic mapping", () => {
  const log = { type: "log", domain: [1, 100], range: [0, 200] };
  const mid = sample(prepare(position(1, log), position(100, log)), .5);
  assert.equal(mid.value, 50.5); assert.ok(Math.abs(mid.position - 100 * Math.log10(50.5)) < 1e-10);
});

test("closed discrete descriptors reject getters, invalid values and forged prepared state", () => {
  let reads = 0;
  assert.throws(() => normalizeCartesianPosition({ get value() { reads++; return 1; }, scale: band([0, 100]) }), /accessors/);
  assert.equal(reads, 0);
  for (const scale of [{ ...band([0, 1]), extra: 1 }, { ...band([0, 1]), range: [0, Infinity] }, { ...band([0, 1]), domain: [1, 1] }, { ...band([0, 1]), paddingInner: 1 }]) assert.throws(() => normalizeCartesianPosition({ value: 1, scale }));
  assert.throws(() => position("missing", band([0, 100])));
  assert.throws(() => sample({ kind: "other" }, .5));
  const plan = prepare(position(1, band([0, 100])), position(1, band([0, 200])));
  assert.throws(() => sample({ ...plan, extra: 1 }, .5)); assert.throws(() => sample(plan, NaN));
});
