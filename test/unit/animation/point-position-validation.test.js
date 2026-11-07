import assert from "node:assert/strict";
import test from "node:test";
import { validatePointAnimationPosition as validate } from "../../../src/grammar/animation/pointState.js";

const identity = { role: "body", lineage: { rowKeys: ["a"] } };
const node = value => ({ type: "circle", properties: { x: value, y: value } });
const endpoint = () => ({ value: 2, scale: { type: "linear", domain: [0, 10], range: [0, 100] } });

test("stored point validation preserves exact continuous mappings and caller ownership", () => {
  const cases = [
    ["linear", [0, 10], 2, 20, {}], ["time", [0, 10], 2, 20, {}],
    ["log", [1, 100], 10, 50, { base: 10 }], ["pow", [0, 10], 5, 25, { exponent: 2 }],
    ["sqrt", [0, 100], 25, 50, {}], ["symlog", [0, Math.expm1(2)], Math.expm1(1), 50, { constant: 1 }]
  ];
  for (const [type, domain, value, expected, parameters] of cases) {
    for (const reverse of [false, true]) {
      const p = { value, scale: { type, domain: reverse ? [...domain].reverse() : [...domain], range: [0, 100], ...parameters } };
      const before = structuredClone(p), actual = reverse ? 100 - expected : expected;
      assert.equal(validate({ x: p, y: p }, identity, node(actual)), undefined);
      assert.deepEqual(p, before);
      assert.equal(Object.isFrozen(p.scale.domain), false);
      assert.throws(() => validate({ x: p, y: p }, identity, node(actual + 1)), /meaning differs/);
      p.value = domain[1] * 2 + 1; p.scale.clamp = true;
      assert.equal(validate({ x: p, y: p }, identity, node(reverse ? 0 : 100)), undefined);
    }
  }
});

test("stored point validation accepts degenerate mapping and preserves signed zero inputs", () => {
  const p = endpoint(); p.scale.domain = [5, 5];
  assert.equal(validate({ x: p, y: p }, identity, node(50)), undefined);
  assert.throws(() => validate({ x: p, y: p }, identity, node(0)), /meaning differs/);
  p.value = -0; p.scale.domain = [0, 1]; p.scale.range = [-0, 100];
  assert.equal(validate({ x: p, y: p }, identity, node(-0)), undefined);
  assert.ok(Object.is(p.value, -0)); assert.ok(Object.is(p.scale.range[0], -0));
});

test("stored point validation rejects malformed endpoints before reading later getters", () => {
  let reads = 0;
  const bad = { scale: endpoint().scale, get value() { reads++; throw Error("getter ran"); } };
  const x = endpoint(); x.value = NaN;
  assert.throws(() => validate({ x, y: bad }, identity, node(20)), { name: "TypeError", message: "Animation position value must be finite." });
  assert.throws(() => validate({ x: endpoint(), y: bad }, identity, node(20)), /accessors are not supported/);
  assert.equal(reads, 0);
  for (const [change, expected] of [
    [p => { p.scale.domain = [, 1]; }, /must be dense/],
    [p => { p.scale.clamp = 1; }, /clamp must be boolean/],
    [p => { p.scale.extra = 1; }, /Unknown animation position scale property/],
    [p => { p.scale.type = "log"; p.scale.base = 1; }, /base must not equal 1/]
  ]) {
    const p = endpoint(); change(p);
    assert.throws(() => validate({ x: p, y: p }, identity, node(20)), expected);
  }
  assert.equal(validate({ reason: "anonymous" }, undefined, node(0)), undefined);
  assert.throws(() => validate({ reason: "anonymous" }, identity, node(0)), /fallback identity/);
  assert.throws(() => validate({ x: endpoint(), y: endpoint() }, undefined, node(20)), /exact one-row body identity/);
});
