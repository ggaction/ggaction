import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJSON, sameCanonicalJSON } from "../../../src/core/contentDigest.js";

const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);

test("structural canonical equality agrees with comparing canonical texts", () => {
  const cases = [
    [0, -0], [NaN, null], [Infinity, null], [1, "1"], ["a", "a"], [true, 1], [undefined, () => 1], [undefined, null],
    [[], [undefined]], [[], [() => 1]], [[], [null]], [[undefined], [undefined, undefined]], [[1, , 2], [1, undefined, 2]],
    [{ a: undefined }, {}], [{ a: undefined }, { a: Symbol("s") }], [{ a: 1, b: 2 }, { b: 2, a: 1 }], [{ a: [1] }, { a: [1, 2] }],
    [[1], { 0: 1 }], [{ a: { b: [NaN] } }, { a: { b: [null] } }], ["[1]", [1]], [{}, []]
  ];
  for (const [a, b] of cases) {
    assert.equal(sameCanonicalJSON(a, b), same(a, b), `${String(canonicalJSON(a))} vs ${String(canonicalJSON(b))}`);
    assert.equal(sameCanonicalJSON(b, a), same(a, b));
  }
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const atoms = [null, true, false, 0, -0, 1, 1.5, NaN, Infinity, "", "a", "null", undefined, () => 1];
  const value = depth => {
    const roll = random();
    if (depth > 3 || roll < .5) return atoms[Math.floor(random() * atoms.length)];
    if (roll < .75) { const array = []; array.length = Math.floor(random() * 3); for (let i = 0; i < array.length; i++) if (random() < .85) array[i] = value(depth + 1); return array; }
    return Object.fromEntries(["a", "b", "c"].filter(() => random() < .5).map(key => [key, value(depth + 1)]));
  };
  for (let i = 0; i < 20000; i++) { const a = value(0), b = value(0); assert.equal(sameCanonicalJSON(a, b), same(a, b)); }
});
