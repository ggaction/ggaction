import assert from "node:assert/strict";
import test from "node:test";
import { isOwned } from "../../../src/core/immutable.js";
import { createPositionPreparationContext as context, preparePositionInterpolation as prepare,
  samplePositionInterpolation as sample } from "../../../src/grammar/animation/positions.js";

const endpoint = (value, scale = {}) => ({ value, scale: { type: "linear", domain: [0, 10], range: [0, 100], ...scale } });

test("position preparation contexts require exact opaque tokens and retain caller boundaries", () => {
  const token = context(), from = endpoint(2), to = endpoint(8);
  assert.ok(Object.isFrozen(token)); assert.deepEqual(Object.keys(token), []);
  for (const forged of [null, {}, { ...token }, Object.freeze({}), 1, () => {}]) {
    assert.throws(() => prepare(from, to, forged), /exact private context/);
  }
  const first = prepare(from, to, token), second = prepare(endpoint(3, { clamp: false }), endpoint(7), token);
  assert.equal(first.from.scale, second.from.scale);
  assert.equal(first.from.scale, first.to.scale);
  assert.equal(isOwned(from.scale), false); assert.equal(isOwned(from.scale.domain), false);
  assert.equal(Object.isFrozen(from.scale.domain), false);
  from.scale.domain[0] = NaN;
  assert.throws(() => prepare(from, to, token), /finite/);
  let reads = 0;
  const hostile = { value: 2, scale: { get type() { reads++; return "linear"; } } };
  assert.throws(() => prepare(hostile, to, token), /accessors/); assert.equal(reads, 0);
  const frozen = Object.freeze(endpoint(2));
  prepare(frozen, to, token);
  assert.equal(isOwned(frozen.scale), false);
  assert.equal(isOwned(frozen.scale.domain), false);
});

test("closed scale interning separates every normalized numeric and transform policy", () => {
  const token = context();
  const variants = [
    {}, { type: "time" }, { clamp: true }, { domain: [-0, 10] },
    { range: [-0, 100] }, { domain: [0, 20] }, { range: [0, 200] },
    { type: "pow", exponent: 2 }, { type: "pow", exponent: 3 },
    { type: "log", domain: [1, 10], base: 2 }, { type: "log", domain: [1, 10], base: 10 },
    { type: "symlog", constant: 2 }, { type: "symlog", constant: 3 }, { type: "sqrt" }
  ];
  for (const [index, scale] of variants.entries()) {
    const plan = prepare(endpoint(2, scale), endpoint(8, scale), token);
    const same = prepare(endpoint(3, scale), endpoint(7, scale), token);
    assert.equal(plan.from.scale, same.from.scale);
    const ordinary = prepare(endpoint(2, scale), endpoint(8, scale));
    for (const progress of [0, .25, .5, .75, 1]) assert.deepEqual(sample(plan, progress), sample(ordinary, progress), `policy ${index}`);
  }
  const signed = context();
  const plus = prepare(endpoint(2), endpoint(8), signed);
  const minus = prepare(endpoint(2, { domain: [-0, 10] }), endpoint(8, { domain: [-0, 10] }), signed);
  assert.notEqual(plus.from.scale, minus.from.scale);
  assert.equal(Object.is(minus.from.scale.domain[0], -0), true);
});

test("four-entry preparation contexts evict without reducing supported scale diversity", () => {
  const token = context(), plans = [];
  const make = index => prepare(endpoint(index + .2, { domain: [index, index + 1] }), endpoint(index + .8, { domain: [index, index + 1] }), token);
  for (let index = 0; index < 4; index++) plans.push(make(index));
  assert.equal(make(0).from.scale, plans[0].from.scale);
  // Failed endpoint preparation cannot displace a successful entry.
  assert.throws(() => prepare(endpoint(NaN, { domain: [20, 30] }), endpoint(22, { domain: [20, 30] }), token));
  assert.equal(make(0).from.scale, plans[0].from.scale);
  const fifth = make(4); assert.equal(sample(fifth, .5).position, 50);
  assert.notEqual(make(0).from.scale, plans[0].from.scale);
  for (let index = 5; index < 20; index++) assert.ok(Math.abs(sample(make(index), .5).position - 50) < 1e-10);
});

test("exact scale pairs share one successful progress while mapping every row value", () => {
  const token = context();
  const a = prepare(endpoint(2), endpoint(8, { domain: [0, 20] }), token);
  const b = prepare(endpoint(4), endpoint(6, { domain: [0, 20] }), token);
  const first = sample(a, .25), other = sample(b, .25);
  assert.equal(first.scale, other.scale);
  assert.equal(first.value, 3.5); assert.equal(other.value, 4.5);
  assert.ok(Math.abs(first.position - 28) < 1e-12); assert.ok(Math.abs(other.position - 36) < 1e-12);
  const moved = sample(a, .5); assert.notEqual(moved.scale, first.scale);
  assert.equal(sample(b, .5).scale, moved.scale);
  const revisited = sample(a, .25);
  assert.notEqual(revisited.scale, first.scale); assert.deepEqual(revisited, first);
  assert.equal(sample(a, 0).scale, a.from.scale); assert.equal(sample(a, 1).scale, a.to.scale);
  const copied = structuredClone(a), frozen = Object.freeze({ ...a });
  assert.deepEqual(sample(copied, .25), first); assert.deepEqual(sample(frozen, .25), first);
  assert.notEqual(sample(copied, .25).scale, revisited.scale);
  assert.equal(isOwned(copied.from.scale), false);
});

test("failed value mappings and collapsed domains publish no partial sampled scale slot", () => {
  const token = context(), huge = Number.MAX_VALUE;
  const bad = prepare(endpoint(huge, { domain: [0, 1], range: [0, 1] }), endpoint(0, { domain: [0, 1], range: [0, huge] }), token);
  const good = prepare(endpoint(0, { domain: [0, 1], range: [0, 1] }), endpoint(0, { domain: [0, 1], range: [0, huge] }), token);
  const narrow = prepare(endpoint(1, { domain: [1, 1 + Number.EPSILON] }), endpoint(1, { domain: [1 - Number.EPSILON / 2, 1] }), token);
  const set = WeakMap.prototype.set; let publications = 0;
  WeakMap.prototype.set = function(key, value) {
    if (value !== null && typeof value === "object" && Object.hasOwn(value, "progress") && Object.hasOwn(value, "scale")) publications++;
    return set.call(this, key, value);
  };
  try {
    assert.deepEqual(sample(bad, .5), { kind: "crossfade", reason: "nonfinite-position" });
    assert.deepEqual(sample(narrow, .5), { kind: "crossfade", reason: "collapsed-domain" });
    assert.equal(publications, 0);
    assert.equal(sample(good, .5).position, 0); assert.equal(publications, 1);
    assert.deepEqual(sample(bad, .5), { kind: "crossfade", reason: "nonfinite-position" });
    assert.equal(publications, 1);
    for (const progress of [-1, NaN, 1.1]) assert.throws(() => sample(good, progress));
    assert.equal(publications, 1);
  } finally { WeakMap.prototype.set = set; }
});

test("scale interning adds no optional inherited parameter reads", () => {
  const token = context(), input = endpoint(2); const counts = [];
  for (const active of [undefined, token, token]) {
    let reads = 0;
    Object.defineProperty(Object.prototype, "base", { configurable: true, get() { reads++; return undefined; } });
    try { prepare(input, endpoint(8), active); } finally { delete Object.prototype.base; }
    counts.push(reads);
  }
  assert.equal(counts[1], counts[0]); assert.equal(counts[2], counts[0]);
});
